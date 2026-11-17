import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getActiveSkillCount, getFusionSkillId,
  startGame, submitPlayerAction, type GameState, type PlayerAction,
} from "../packages/shared/src";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";
import { startYoukaiRitual } from "../packages/shared/src/engine/youkai";
import { YOUKAI_CARD_ID, YOUKAI_RITUAL_ID, YOUKAI_RITUAL_STATE, YOUKAI_SOUL_ID } from "../packages/shared/src/engine/youkaiIds";

const cake = { type: "gain_cake" } as const;
const sha = (targetId: string, stacks = 1) => ({ type: "attack", attackId: "sha", targetId, stacks } as const);

function drain(state: GameState): GameState {
  for (let index = 0; state.phase === "action_window" && index < 80; index++) state = advanceActionWindow(state);
  return state;
}

function game(): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, initialHp: 18, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ instanceId: "youkai-soul", cardId: YOUKAI_CARD_ID, onlyAbilityId: YOUKAI_SOUL_ID }];
  state = drain(startGame(state));
  for (const player of state.players) player.cakes = 20;
  return state;
}

function turn(state: GameState, ...moves: PlayerAction[]): GameState {
  for (const [index, player] of state.players.entries()) {
    if (player.status === "alive" && state.phase === "collecting_actions" && !state.pendingActions[player.id])
      state = submitPlayerAction(state, player.id, moves[index] ?? cake).state;
  }
  return drain(state);
}

test("夺魄吸纳在普通死亡结算后增加五层，吸取的是整份复活技", () => {
  let state = game();
  const target = state.players[1]!;
  target.hp = 1;
  appendSkillInstances(target, ["1063"]);
  target.buffs.push({ id: "skill_used:1063", name: "治愈术已使用", stacks: 1 });
  state = turn(state, sha(target.id, 2));
  assert.equal(state.players[1]!.defeatLevel, 1);
  assert.equal(state.players[0]!.youkaiLayers, 5);
  assert.equal(getActiveSkillCount(state.players[0]!, "1063"), 1);
  assert.equal(getActiveSkillCount(state.players[1]!, "1063"), 0);
  assert.ok(!state.players[0]!.buffs.some((buff) => buff.id === "skill_used:1063"));
});

test("夺魄吸纳按同批致死来源逐人发层，技能失去受限时没有技能转移", () => {
  let state = game();
  const target = state.players[1]!;
  target.hp = 3;
  appendSkillInstances(target, ["1063"]);
  target.buffs.push({ id: "keep-revival", name: "免疫失去技能", stacks: 1, immuneEffectCategories: ["skill_loss"] });
  state.players[2]!.bigCards = [{ instanceId: "other-youkai", cardId: YOUKAI_CARD_ID, onlyAbilityId: YOUKAI_SOUL_ID }];
  state = turn(state, sha(target.id, 2), cake, sha(target.id, 2));
  assert.equal(state.players[1]!.defeatLevel, 1);
  assert.equal(state.players[0]!.youkaiLayers, 5);
  assert.equal(state.players[2]!.youkaiLayers, 5);
  assert.equal(getActiveSkillCount(state.players[0]!, "1063"), 0);
  assert.equal(getActiveSkillCount(state.players[1]!, "1063"), 1);
  assert.equal(getActiveSkillCount(state.players[2]!, "1063"), 0);
});

test("夺魄吸纳在绝对值救回目标时没有击杀奖励", () => {
  let state = game();
  const target = state.players[1]!;
  target.hp = 1;
  appendSkillInstances(target, ["1068"]);
  state = turn(state, sha(target.id, 2));
  assert.equal(state.players[1]!.status, "alive");
  assert.equal(state.players[1]!.hp, 1);
  assert.equal(state.players[0]!.youkaiLayers ?? 0, 0);
});

test("夺魄吸纳保留复活子技能的持有记录及其独立规则，照常转移复活融合", () => {
  for (const kind of ["big", "dependent", "fusion"] as const) {
    let state = game();
    const target = state.players[1]!;
    const id = kind === "fusion" ? getFusionSkillId("贤者的庇护") : kind === "big" ? "1054903" : "1054904";
    if (kind !== "fusion") target.bigCards = [{ instanceId: "revival-source", cardId: "10549", onlyAbilityId: id }];
    else grantInitializedSkill(state, target.id, id, "准备复活融合", false);
    target.buffs.push({ id: "direct_non_damage_death", name: "直接普通死亡", stacks: 1, sourcePlayerId: state.players[0]!.id });
    state = turn(state);
    assert.equal(state.players[1]!.defeatLevel, 1);
    assert.equal(state.players[0]!.youkaiLayers, 5);
    assert.equal(getActiveSkillCount(state.players[0]!, id), kind === "dependent" ? 0 : 1);
    if (kind !== "fusion") {
      assert.ok(state.players[0]!.bigCards?.some(({ onlyAbilityId }) => onlyAbilityId === id));
      assert.ok(state.players[1]!.bigCards?.[0]?.lostAbilityIds?.includes(id));
    }
    assert.equal(getActiveSkillCount(state.players[1]!, id), 0);
  }
});

function installRitual(state: GameState, playerIndex: number): void {
  const player = state.players[playerIndex]!;
  const instanceId = `ritual-${playerIndex}`;
  (player.bigCards ??= []).push({ instanceId, cardId: YOUKAI_CARD_ID, onlyAbilityId: YOUKAI_RITUAL_ID });
  startYoukaiRitual(state, player, instanceId);
}

test("未央鬼祭转移普通技能胜利，保护的胜利和多个鬼祭同时存在时保留原主", () => {
  for (const scenario of ["unprotected", "protected", "two-rituals"] as const) {
    let state = game();
    installRitual(state, 0);
    if (scenario === "two-rituals") installRitual(state, 2);
    const winner = state.players[1]!;
    winner.buffs.push({ id: scenario === "protected" ? "instant_win:imperial_verdict" : "instant_win:youkai-test",
      name: "技能胜利", stacks: 1 });
    state = turn(state);
    assert.equal(state.phase, "finished");
    assert.deepEqual(state.winnerIds, [scenario === "unprotected" ? state.players[0]!.id : winner.id]);
  }
});

test("唯一祭主也能转移常规胜利", () => {
  let state = game();
  installRitual(state, 0);
  const caster = state.players[0]!;
  state.smallSpaces = { retreat: { name: "自我封闭", kind: "self_isolation", cakeMultiplier: 3, expiresAtRound: 50 } };
  caster.spaceId = "retreat";
  for (const player of state.players.slice(2)) {
    player.status = "dead";
    player.defeatLevel = 1;
  }
  state = turn(state);
  assert.equal(state.phase, "finished");
  assert.deepEqual(state.winnerIds, [caster.id]);
});

test("未央鬼祭普通致死保留负血，并取消无伤害死亡且不触发夺魄吸纳", () => {
  let state = game();
  installRitual(state, 0);
  state.pendingDamageItems = [{ id: "ritual-ordinary-damage", sourceId: state.players[0]!.id,
    targetId: state.players[1]!.id, amount: 20 }];
  state.players[2]!.buffs.push({ id: "direct_non_damage_death", name: "无伤害死亡", stacks: 1, sourcePlayerId: state.players[0]!.id });
  state.activeTimingPhase = "turn_damage_modify";
  state.phase = "action_window";
  state.actionWindowMode = "active";
  state.actionWindowPlayerIds = state.players.map(({ id }) => id);
  state = drain(state);
  assert.equal(state.players[1]!.status, "alive");
  assert.equal(state.players[1]!.hp, -2);
  assert.equal(state.players[2]!.status, "alive");
  assert.equal(state.players[2]!.hp, 18);
  assert.ok(!state.players[2]!.buffs.some((buff) => buff.id === "direct_non_damage_death"));
  assert.equal(state.players[0]!.youkaiLayers ?? 0, 0);
  assert.ok(state.players[0]!.buffs.some((buff) => buff.stateType === YOUKAI_RITUAL_STATE));
});

test("未央鬼祭不抵挡直接退游，祭主实际退场后清除祭祀", () => {
  let state = game();
  installRitual(state, 0);
  state.pendingDamageItems = [{ id: "ritual-direct-retire", sourceId: state.players[1]!.id,
    targetId: state.players[0]!.id, amount: 1, pointDefeatLevel: 2, directDefeat: true }];
  state.activeTimingPhase = "turn_damage_modify";
  state.phase = "action_window";
  state.actionWindowMode = "active";
  state.actionWindowPlayerIds = state.players.map(({ id }) => id);
  state = drain(state);
  assert.equal(state.players[0]!.defeatLevel, 2);
  assert.ok(!state.players[0]!.buffs.some((buff) => buff.stateType === YOUKAI_RITUAL_STATE));
});
