import assert from "node:assert/strict";
import { test } from "node:test";
import { addPlayerToGame, advanceActionWindow, beginActionPrompt, createGame, createPlayer, getAllSkills,
  startGame, submitActionWindowSkill, submitPlayerAction, validateAction,
  type ActionSubmission, type GameState, type SkillAction } from "../packages/shared/src";
import { combatValue, INFINITY_VALUE } from "../packages/shared/src/engine/combatValues";
import { setPlayerHpValue } from "../packages/shared/src/engine/infiniteValues";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { hasContinuationBlock } from "../packages/shared/src/engine/hunyao";
import { appendSkillInstances } from "../packages/shared/src/engine/skillInventory";
import { divineRiftRank } from "../packages/shared/src/engine/divineReversal";
import { DIVINE_BLIND_ID, DIVINE_CROSS_ID, DIVINE_DOOM_ID, DIVINE_EXIT_ID, DIVINE_FLAME_ID,
  DIVINE_REVERSAL_CARD_ID, DIVINE_RIFT_ID } from "../packages/shared/src/engine/divineReversalIds";

const cake = { type: "gain_cake" } as const;
const sha = (targetId: string, stacks = 1) => ({ type: "attack", attackId: "sha", targetId, stacks } as const);
const cast = (skillId: string, targetId?: string): SkillAction => ({ type: "skill", skillId, stacks: 1, ...(targetId ? { targetId } : {}) });

function drain(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && i < 80; i++) state = advanceActionWindow(state);
  return state;
}

function setup(abilities: string[]): GameState {
  let state = createGame("烈", { skillMode: "big_test_select", skillCount: 6, initialHp: 18, firstTurnNoAttack: false });
  state = addPlayerToGame(state, createPlayer("乙"));
  state = addPlayerToGame(state, createPlayer("丙"));
  state.players[0]!.bigCards = abilities.map((id) => ({ instanceId: id, cardId: DIVINE_REVERSAL_CARD_ID, onlyAbilityId: id }));
  state = drain(startGame(state));
  for (const player of state.players) player.cakes = 60;
  return state;
}

function turn(state: GameState, ...actions: ActionSubmission[]): GameState {
  for (const [index, action] of actions.entries()) {
    const id = state.players[index]!.id;
    const validation = validateAction(state, id, action);
    assert.equal(validation.ok, true, validation.error);
    state = submitPlayerAction(state, id, action).state;
  }
  return drain(state);
}

test("烈光令对攻交错，只放大自己的实际攻击伤害并阻止致死复活", () => {
  let state = setup([DIVINE_CROSS_ID]);
  const [owner, enemy, third] = state.players;
  appendSkillInstances(enemy!, ["1063"]);
  state = turn(state, sha(enemy!.id), sha(owner!.id), sha(enemy!.id));
  assert.equal(state.players[0]!.hp, 17);
  assert.equal(state.players[1]!.defeatLevel, 1);
  const hits = state.eventLog.filter((event) => event.type === "damage" && event.targetId === enemy!.id);
  assert.equal(hits.length, 2);
  const crossed = hits.find((event) => event.sourceId === owner!.id);
  assert.equal(crossed?.blocksRevival, true);
  assert.deepEqual(crossed?.amountValue, INFINITY_VALUE);
  assert.ok(hits.some((event) => event.sourceId === third!.id && event.amount === 1 && !event.blocksRevival));
});

test("盲目的无等级不会与一级对撞，选目标后后盾失效，八卦阵仍减伤", () => {
  let state = setup([DIVINE_BLIND_ID]);
  const [owner, enemy] = state.players;
  appendSkillInstances(owner!, ["1025", "1049"]);
  state = turn(state, sha(enemy!.id), sha(owner!.id, 2), sha(owner!.id, 2));
  assert.equal(state.players[1]!.hp, 17);
  assert.equal(state.players[0]!.hp, 16);
  assert.equal(state.eventLog.some((event) => event.type === "clash"), false);
  assert.equal(state.eventLog.some((event) => event.type === "attack_blocked" && event.protectionSkillId === "1025"), false);
});

test("盲目时出杀不能作为对方南蛮入侵的防御", () => {
  let state = setup([DIVINE_BLIND_ID]);
  const [, enemy] = state.players;
  state = turn(state, sha(enemy!.id), cake, { type: "attack", attackId: "nan_man", stacks: 1 });
  assert.ok(state.players[0]!.hp < 18);
});

test("盲目关闭所选目标招式本身附带的无敌", () => {
  let state = setup([DIVINE_BLIND_ID]);
  const [owner, enemy] = state.players;
  owner!.bigCards!.push({ instanceId: "heir", cardId: "10507", onlyAbilityId: "1050705" });
  state = turn(state, cast("1050705", enemy!.id), sha(owner!.id), cake);
  assert.equal(state.players[0]!.hp, 17);
  assert.ok(state.players[0]!.spareLives?.length);
});

test("怒炎每轮轮前开关，回合初普通火系法伤不重开，命中附最终攻击值等量法伤", () => {
  let state = setup([DIVINE_FLAME_ID]);
  const [owner, enemy] = state.players;
  beginActionPrompt(state, "round_before_action");
  state = drain(submitActionWindowSkill(state, owner!.id, cast(DIVINE_FLAME_ID)));
  assert.equal(state.roundNumber, 1);
  assert.equal(state.players[0]!.hp, 17);
  setPlayerHpValue(state.players[1]!, combatValue(3, 1));
  state = turn(state, sha(enemy!.id), cake, cake);
  const hits = state.eventLog.filter((event) => event.type === "damage" && event.targetId === enemy!.id);
  assert.equal(hits.length, 2);
  assert.deepEqual(hits.find((event) => event.attackDamage)?.amountValue, INFINITY_VALUE);
  assert.deepEqual(hits.find((event) => !event.attackDamage && event.elements?.includes("fire"))?.amountValue, INFINITY_VALUE);
});

test("裂神按最终攻值升级伤害，亡命的无限攻打中神之庇护升为退游", () => {
  let state = setup([DIVINE_DOOM_ID, DIVINE_RIFT_ID]);
  const [, enemy] = state.players;
  appendSkillInstances(enemy!, ["1031"]);
  state = turn(state, { type: "attack", attackId: "wan_jian", stacks: 1 }, cake, cake);
  assert.equal(state.players[1]!.defeatLevel, 2);
  assert.equal(state.players[2]!.defeatLevel, 1);
  assert.equal(divineRiftRank(combatValue(1, 2)), 2);
  assert.equal(divineRiftRank(combatValue(1, 3)), 3);
  assert.equal(divineRiftRank(combatValue(1, 4)), 4);
});

test("裂神无视带无敌子技能对自己的其余效果", () => {
  let state = setup([DIVINE_RIFT_ID]);
  const enemy = state.players[1]!;
  enemy.bigCards = [{ instanceId: "dream", cardId: "10517", onlyAbilityId: "1051703" }];
  changeElementAmount(enemy, "梦", 5);
  state = turn(state, cake, cast("1051703"), cake);
  assert.equal(state.players[0]!.buffs.some((buff) => buff.stateType === "sleep"), false);
  assert.ok(state.players[2]!.buffs.some((buff) => buff.stateType === "sleep"));
});

test("裂神在怒炎、亡命和目标无敌叠加时造成消失点伤害，无归再提升为必杀", () => {
  for (const incoming of [false, true]) {
    let state = setup([DIVINE_DOOM_ID, DIVINE_FLAME_ID, DIVINE_RIFT_ID, DIVINE_EXIT_ID]);
    const [owner, protectedTarget, third] = state.players;
    appendSkillInstances(protectedTarget!, ["1031"]);
    beginActionPrompt(state, "round_before_action");
    state = drain(submitActionWindowSkill(state, owner!.id, cast(DIVINE_FLAME_ID)));
    const juanzi = getAllSkills().find(({ name }) => name === "卷子")!.id;
    appendSkillInstances(state.players[2]!, [juanzi]);
    state = turn(state, sha(protectedTarget!.id), cake, incoming ? cast(juanzi, owner!.id) : cake);
    assert.equal(state.players.find(({ id }) => id === protectedTarget!.id)?.defeatLevel, incoming ? 4 : 3,
      `对手 ${third!.name} 是否提供致死攻击 ${incoming}`);
  }
});

test("无归按攻值预判，不用等防御结算，绝对值时等于血量也触发", () => {
  let state = setup([DIVINE_EXIT_ID]);
  const [owner, enemy] = state.players;
  owner!.hp = 2;
  appendSkillInstances(owner!, ["1031", "1068"]);
  state = turn(state, sha(enemy!.id), cake, sha(owner!.id, 2));
  assert.equal(state.players[0]!.hp, 2, "神之庇护正常挡伤");
  assert.equal(state.players[1]!.defeatLevel, 1, "无归仍让攻击变为无限");
});

test("无归仍把被技能反弹的致死攻击计入预判", () => {
  let state = setup([DIVINE_EXIT_ID]);
  const [owner, enemy] = state.players;
  owner!.hp = 1;
  owner!.buffs.push({ id: "test_rebound", stateType: "skill_rebound", name: "技能反弹",
    stacks: 1, expiresAtTurn: state.turnNumber + 1, skillReflectLimit: INFINITY_VALUE });
  state = turn(state, sha(enemy!.id), cake, sha(owner!.id, 2));
  assert.equal(state.players[0]!.hp, 1);
  assert.equal(state.players[1]!.defeatLevel, 1);
});

test("无归的退游禁止所有恢复入口，亡命禁止普通复活", () => {
  const juanzi = getAllSkills().find(({ name }) => name === "卷子")!.id;
  let state = setup([DIVINE_EXIT_ID]);
  const [owner, enemy] = state.players;
  appendSkillInstances(enemy!, [juanzi]);
  state = turn(state, cake, cast(juanzi, owner!.id), cake);
  assert.equal(state.players[0]!.defeatLevel, 2);
  for (const kind of ["reentry", "reappearance", "initial_reset", "revival"] as const)
    assert.equal(hasContinuationBlock(state, state.players[0]!, kind, "all"), true);

  state = setup([DIVINE_DOOM_ID]);
  state.players[0]!.hp = 1;
  appendSkillInstances(state.players[0]!, ["1063"]);
  state = turn(state, cake, sha(state.players[0]!.id, 2), cake);
  assert.equal(state.players[0]!.defeatLevel, 1);
  assert.equal(hasContinuationBlock(state, state.players[0]!, "revival", "none"), true);
});
