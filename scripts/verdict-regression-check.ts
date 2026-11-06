import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ELECTROMAGNETIC_CANNON_ID, FOUR_EMPTINESS_ID, JUNENG_CARD_ID, JUNENG_ELEMENT, MORE_TRIES_ID, SLOT_MACHINE_ID, VERDICT_ACTION_ID, VERDICT_CARD_ID,
  addPlayerToGame, advanceActionWindow, appendSkillInstances, applySkillFusion, beginActionPrompt,
  createGame, createPlayer, getActiveFusionCount, getActiveSkillCount, getFusionRecipe, getFusionSkillId, startGame,
  submitActionWindowSkill, submitPlayerAction, submitPointGameAction, toPublicGameState,
  type GameState, type PlayerAction, type SkillAction, type SkillTimingPhase
} from "@bing/shared";
import { grantInitializedSkill, getReadySlotMachines, getSlotMachineSpin } from "../packages/shared/src/engine/skillAcquisition";
import { replaceSkillInstanceAt } from "../packages/shared/src/engine/skillInventory";
import { getBlindSkillChoices } from "../packages/shared/src/engine/blindSkillRemoval";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";

const cake = { type: "gain_cake" } as const;
const cast = (skillId: string, extra: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...extra });
const drain = (initial: GameState, stop?: SkillTimingPhase): GameState => {
  let state = initial;
  for (let i = 0; i < 80 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++) {
    state = advanceActionWindow(state);
  }
  return state;
};

function fixture(secondCard = false): GameState {
  let state = createGame("A", { skillMode: "big_test_select", firstTurnNoAttack: false });
  for (const name of ["B", "C"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ instanceId: "verdict-a", cardId: VERDICT_CARD_ID }];
  if (secondCard) state.players[1]!.bigCards = [{ instanceId: "verdict-b", cardId: VERDICT_CARD_ID }];
  state = drain(startGame(state));
  for (const player of state.players) { player.hp = 100; player.cakes = 20; }
  return state;
}

function submit(state: GameState, actions: PlayerAction[]): GameState {
  for (const [index, player] of state.players.entries()) {
    const result = submitPlayerAction(state, player.id, actions[index] ?? cake);
    state = result.state;
  }
  return state;
}

function verdict(state: GameState): GameState {
  return submit(state, [cast(VERDICT_ACTION_ID, { targetId: state.players[1]!.id })]);
}

function move(state: GameState, index: number, choice: "rock" | "paper" | "scissors"): GameState {
  const playerId = state.players[index]!.id;
  const game = toPublicGameState(state, playerId).pointGame!;
  assert.ok(game);
  return submitPointGameAction(state, playerId, { kind: "move", gameId: game.id, round: game.round, move: choice });
}

test("裁决暂停主游戏并隐藏双方出拳，平局重猜，胜方吸血且在回合末重开", () => {
  let state = fixture();
  const { roundNumber, turnNumber } = state;
  const [a, b] = state.players;
  state = drain(verdict(state), "turn_reveal_check");
  assert.equal(state.roundNumber, roundNumber);
  assert.equal(state.turnNumber, turnNumber);
  const first = toPublicGameState(state, a!.id).pointGame!;
  state = move(state, 0, "rock");
  const opponentView = toPublicGameState(state, b!.id).pointGame!;
  assert.deepEqual(opponentView.submittedPlayerIds, [a!.id]);
  assert.ok(!JSON.stringify(opponentView).includes("rock"));
  state = move(state, 1, "rock");
  assert.equal(toPublicGameState(state, a!.id).pointGame!.round, 2);
  assert.throws(() => submitPointGameAction(state, a!.id, { kind: "move", gameId: first.id, round: first.round, move: "paper" }));
  state = move(move(state, 0, "paper"), 1, "rock");
  state = drain(state);
  assert.equal(state.roundNumber, roundNumber + 1);
  assert.equal(state.players[0]!.hp, 120);
  assert.equal(state.players[1]!.hp, 90);
  assert.equal(state.players[2]!.hp, 90);
  assert.equal(state.players[0]!.bigCards![0]!.verdictProgress?.wins, 1);
  assert.ok(state.players[0]!.verdictShadowInstanceId);
});

test("裁决落败照样重开，仅给未参与玩家施加下一轮技能失效", () => {
  let state = fixture();
  const round = state.roundNumber;
  state = drain(verdict(state), "turn_reveal_check");
  state = drain(move(move(state, 0, "rock"), 1, "paper"));
  assert.equal(state.roundNumber, round + 1);
  assert.equal(state.players[0]!.bigCards![0]!.verdictProgress?.losses, 1);
  assert.ok(!state.players[0]!.buffs.some((buff) => buff.name === "御秽裁决·技能失效"));
  assert.ok(!state.players[1]!.buffs.some((buff) => buff.name === "御秽裁决·技能失效"));
  assert.ok(state.players[2]!.buffs.some((buff) => buff.name === "御秽裁决·技能失效"));
});

test("逆转先交换裁决双方，原发动者拿沙子，胜负计入新发动者", () => {
  let state = fixture(true);
  const [a, b] = state.players;
  appendSkillInstances(b!, ["skill_93_50224"]);
  const sandBefore = a!.skills.filter((id) => id === "skill_4_65637").length;
  state = verdict(state);
  state = submitActionWindowSkill(state, b!.id, cast("skill_93_50224"));
  state = drain(state, "turn_reveal_check");
  const game = toPublicGameState(state, a!.id).pointGame!;
  assert.equal(game.sourceId, b!.id);
  assert.equal(game.targetId, a!.id);
  assert.equal(state.players[0]!.skills.filter((id) => id === "skill_4_65637").length, sandBefore + 1);
  state = drain(move(move(state, 1, "paper"), 0, "rock"));
  assert.equal(state.players[0]!.bigCards![0]!.verdictProgress, undefined);
  assert.equal(state.players[1]!.bigCards![0]!.verdictProgress?.wins, 1);
});

test("四连败移除大卡，额外的消除选择仅包括非化合态小技能", () => {
  let state = fixture();
  const [a, b] = state.players;
  a!.bigCards![0]!.verdictProgress = { wins: 0, losses: 3, streak: -3 };
  appendSkillInstances(b!, ["skill_34_1533"]);
  grantInitializedSkill(state, b!.id, getFusionSkillId("破军"), "测试", false);
  state = drain(verdict(state), "turn_reveal_check");
  state = move(move(state, 0, "rock"), 1, "paper");
  const view = toPublicGameState(state, a!.id);
  assert.equal(view.verdictRemovalPlayerId, a!.id);
  assert.deepEqual(state.players[0]!.bigCards, []);
  assert.equal(getActiveFusionCount(state.players[0]!, "四大皆空"), 1);
  const choices = view.blindSkillChoices!;
  assert.equal(choices.filter((slot) => slot.playerId === b!.id).length, 1);
  state = submitPointGameAction(state, a!.id, { kind: "remove", instanceIds: choices.map((slot) => slot.instanceId) });
  assert.equal(getActiveFusionCount(state.players[1]!, "破军"), 1);
});

test("第四场连胜立即获胜，同时发放多来几次和两次免费裁决", () => {
  let state = fixture();
  const a = state.players[0]!;
  a.bigCards![0]!.verdictProgress = { wins: 3, losses: 0, streak: 3 };
  state = drain(verdict(state), "turn_reveal_check");
  state = move(move(state, 0, "paper"), 1, "rock");
  assert.equal(state.phase, "finished");
  assert.deepEqual(state.winnerIds, [a.id]);
  assert.equal(getActiveFusionCount(state.players[0]!, "多来几次"), 1);
  assert.equal(state.players[0]!.buffs.find((buff) => buff.id === "free_imperial_verdict")?.stacks, 2);
});

test("普通杀剥掉酒和古淀刀加成，技能攻击保留酒", () => {
  let state = fixture();
  const targetId = state.players[0]!.id;
  appendSkillInstances(state.players[1]!, ["skill_34_1533", "skill_29_96125", "skill_82_45540"]);
  state = drain(submit(state, [{ type: "defense", defense: "small" }, { type: "attack", attackId: "sha", stacks: 1, targetId }]));
  assert.equal(state.players[0]!.hp, 100);
  state = drain(submit(state, [cake, cast("skill_82_45540", { targetId })]));
  assert.equal(state.players[0]!.hp, 98);
});

test("变伤阶段主动用技挡下当前普通攻击，并用剩余次数挡技能攻击和非攻击出招", () => {
  let state = fixture();
  const [a, b, c] = state.players;
  grantInitializedSkill(state, b!.id, FOUR_EMPTINESS_ID, "测试", false);
  appendSkillInstances(b!, ["skill_82_45540", "skill_36_14343"]);
  appendSkillInstances(c!, ["skill_34_1533"]);
  const choice = getBlindSkillChoices(state, b!.id, true).find((slot) => slot.playerId === c!.id)!;
  const sha = { type: "attack", attackId: "sha", stacks: 1, targetId: a!.id } as const;
  state = drain(submit(state, [cake, sha]), "turn_damage_modify");
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  assert.ok(state.pendingDamageItems?.some((item) => item.targetId === a!.id && item.ordinaryAttack));
  state = drain(submitActionWindowSkill(state, b!.id, cast(FOUR_EMPTINESS_ID, { removeSkillInstanceIds: [choice.instanceId] })));
  const remaining = () => state.players[0]!.buffs.find((buff) => buff.id === `verdict_guard:${b!.id}`)?.stacks ?? 0;
  assert.equal(state.players[0]!.hp, 100);
  assert.equal(remaining(), 3);
  state = drain(submit(state, [cake, cast("skill_82_45540", { targetId: a!.id })]));
  assert.equal(state.players[0]!.hp, 100);
  assert.equal(remaining(), 2);
  state = drain(submit(state, [cake, cast("skill_36_14343", { targetIds: [a!.id] })]));
  assert.equal(remaining(), 1);
  assert.ok(!state.players[0]!.buffs.some((buff) => buff.id.startsWith("paralysis")));
  const attacker = state.players[1]!;
  attacker.bigCards = [{ cardId: JUNENG_CARD_ID, instanceId: "cannon-b" }];
  changeElementAmount(attacker, JUNENG_ELEMENT, 2);
  state = drain(submit(state, [cake, cast(ELECTROMAGNETIC_CANNON_ID)]));
  assert.equal(remaining(), 0);
  assert.equal(state.players[0]!.hp, 100);
  assert.equal(state.players[2]!.hp, 80);
  state.players[1]!.cakes = 1;
  state = drain(submit(state, [cake, sha]));
  assert.equal(state.players[0]!.hp, 99);
});

test("四大皆空只公开已知名称，选中未暴露的素材会解除融合", () => {
  let state = fixture();
  const [a, b] = state.players;
  grantInitializedSkill(state, a!.id, FOUR_EMPTINESS_ID, "测试", false);
  const fusionId = getFusionSkillId("破军");
  grantInitializedSkill(state, b!.id, fusionId, "测试", false);
  assert.equal(getActiveFusionCount(b!, "破军"), 1);
  const bSkills = getBlindSkillChoices(state, a!.id, true).filter((slot) => slot.playerId === b!.id);
  assert.deepEqual(bSkills.map((slot) => slot.number), [1, 2]);
  assert.ok(bSkills.every((slot) => slot.visibleSkillId === undefined));
  assert.ok(!getBlindSkillChoices(state, a!.id, false).some((slot) => slot.playerId === b!.id));
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, a!.id, cast(FOUR_EMPTINESS_ID, { removeSkillInstanceIds: [bSkills[0]!.instanceId] }));
  assert.equal(state.players[1]!.skills.length, 1);
  assert.equal(getActiveFusionCount(state.players[1]!, "破军"), 0);
});

test("多来几次独立管理两组，重抽解开用到该组结果的融合", () => {
  let state = fixture();
  const player = state.players[0]!;
  grantInitializedSkill(state, player.id, MORE_TRIES_ID, "测试", false);
  const recipe = getFusionRecipe(getFusionSkillId("破军"))!;
  const result = [...recipe.materialOptions[0]!, "skill_34_1533"];
  const groups = player.skillFusions!.filter((item) => item.skillId === SLOT_MACHINE_ID);
  assert.equal(groups.length, 2);
  assert.ok(getSlotMachineSpin(player));
  for (const group of groups) {
    for (const [index, id] of group.materialInstanceIds!.entries()) {
      group.rerollCompletedSlotIds!.push(id);
      replaceSkillInstanceAt(player, player.skillInventory!.findIndex((slot) => slot.instanceId === id), result[index]!);
    }
  }
  assert.equal(getReadySlotMachines(player).length, 2);
  applySkillFusion(state, player.id, recipe.skill.id, undefined, groups[0]!.materialInstanceIds!.slice(0, 2));
  assert.equal(getActiveFusionCount(player, "破军"), 1);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, player.id, cast(SLOT_MACHINE_ID, { rerollFusionInstanceId: groups[0]!.id }));
  const next = state.players[0]!;
  assert.equal(getActiveFusionCount(next, "破军"), 0);
  assert.equal(getActiveFusionCount(next, "多来几次"), 1);
  assert.deepEqual(getReadySlotMachines(next).map((item) => item.id), [groups[1]!.id]);
  assert.equal(getActiveSkillCount(next, "skill_3_56718"), 3);
});

test("老虎机使用真正的再来一次入口，记录被抽取的物理槽位", () => {
  let state = fixture();
  const a = state.players[0]!;
  const machineId = grantInitializedSkill(state, a.id, SLOT_MACHINE_ID, "测试", false);
  const slot = getSlotMachineSpin(a)!;
  assert.equal(slot.fusion.id, machineId);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, a.id, cast("skill_3_56718"));
  const after = state.players[0]!;
  assert.deepEqual(after.skillFusions!.find((entry) => entry.id === machineId)!.rerollCompletedSlotIds, [slot.id]);
  assert.equal(after.skillInventory![slot.index]!.instanceId, slot.id);
  const view = toPublicGameState(state, state.players[1]!.id);
  assert.ok(!view.eventLog.some((event) => event.type === "system" && event.message.includes("再来一次变化")));
  assert.ok(!view.players[0]!.buffs.some((buff) => buff.id.startsWith("skill_transformed:")));
});
