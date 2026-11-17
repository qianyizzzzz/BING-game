import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getCakeGainAmount,
  getFreeMoveChoices, startGame, submitActionWindowSkill, submitPlayerAction, toPublicGameState,
  YIYUAN_CARD, YIYUAN_ETERNAL, YIYUAN_MIMIC, YIYUAN_REPEAT, YIYUAN_RESTORE, YIYUAN_STEP, YIYUAN_GOD,
  YIYUAN_CHANGE, YIYUAN_CHANGE_STATE, YIYUAN_GROWTH, YIYUAN_STEP_STATE, RAGING_WAVES_ID,
  type GameState, type PlayerAction
} from "../packages/shared/src";
import { applyNegativeStatus } from "../packages/shared/src/engine/negativeStatuses";

const cake = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const kill = (targetId: string) => ({ type: "attack", attackId: "sha", stacks: 1, targetId } as const);
const cast = (skillId: string, targetId?: string) => ({ type: "skill", skillId, stacks: 1, ...(targetId ? { targetId } : {}) } as const);
const reply = (yes: boolean) => ({ ...cast(YIYUAN_REPEAT), yiyuanRepeat: yes });
function advance(state: GameState, phase?: GameState["activeTimingPhase"]): GameState {
  for (let count = 0; state.phase === "action_window" && state.activeTimingPhase !== phase && count < 80; count++) state = advanceActionWindow(state);
  return state;
}
function table(ability: string): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", firstTurnNoAttack: false, initialHp: 50 });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ instanceId: "yiyuan", cardId: YIYUAN_CARD, onlyAbilityId: ability }];
  state = advance(startGame(state));
  state.players.forEach((player) => { player.cakes = 12; });
  return state;
}
function turn(state: GameState, ...actions: (PlayerAction | undefined)[]): GameState {
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) {
    if (player.status !== "alive" || state.phase !== "collecting_actions" || state.pendingActions[player.id]) continue;
    const submitted = submitPlayerAction(state, player.id, actions[index] ?? cake);
    assert.equal(submitted.error, undefined);
    state = submitted.state;
  }
  return state;
}

test("永恒分别收拒绝者的免费出招，答应者自动复刻，拒绝者两回合无效", () => {
  let state = table(YIYUAN_ETERNAL);
  const [owner, yes, no, other] = state.players;
  state = advance(turn(state, cast(YIYUAN_ETERNAL), stone, cake, stone), "turn_change_action");
  assert.ok(toPublicGameState(state, yes!.id).yiyuanRepeatChoice);
  assert.equal(toPublicGameState(state, owner!.id).yiyuanRepeatChoice, undefined);
  state = submitActionWindowSkill(state, yes!.id, reply(true));
  state = submitActionWindowSkill(state, no!.id, reply(false));
  state = submitActionWindowSkill(state, other!.id, reply(true));
  state = advance(state);
  assert.deepEqual(getFreeMoveChoices(state.players[0]).map(({ move }) => move), [cake]);
  assert.equal(state.players[2]!.cakes, 12);
  assert.deepEqual(state.pendingActions[yes!.id]?.actions, [stone]);
  state = advance(turn(state));
  assert.equal(state.players[2]!.cakes, 12);
});

test("永恒复刻攻击过轮时自爆，永恒持有者保留饼", () => {
  let state = table(YIYUAN_ETERNAL);
  const [owner, first, second, other] = state.players;
  state = advance(turn(state, cast(YIYUAN_ETERNAL), kill(other!.id), kill(other!.id)), "turn_change_action");
  for (const player of [first, second, other]) state = submitActionWindowSkill(state, player!.id, reply(true));
  state = advance(state);
  assert.ok(state.roundNumber >= 2);
  assert.ok(state.players[0]!.cakes >= 7);
  for (const player of state.players.slice(1, 3))
    assert.ok(player.buffs.some(({ id, stacks }) => id === "self_destruct_count" && stacks === 1));
});

test("复刻仍在续发的怒海狂涛时沿用旧攻击，不额外支付饼", () => {
  let state = table(YIYUAN_ETERNAL);
  const [, attacker, target, other] = state.players;
  attacker!.bigCards = [{ instanceId: "waves", cardId: "10509", onlyAbilityId: RAGING_WAVES_ID }];
  attacker!.cakes = 2;
  state = advance(turn(state, cast(YIYUAN_ETERNAL), cast(RAGING_WAVES_ID, target!.id),
    { type: "defense", defense: "small" }), "turn_change_action");
  for (const player of [attacker, target, other]) state = submitActionWindowSkill(state, player!.id, reply(true));
  state = advance(state);
  assert.equal(state.players[1]!.cakes, 0);
  assert.deepEqual(state.pendingActions[attacker!.id]?.actions, []);
  assert.ok(state.players[1]!.buffs.some(({ waveAttack }) => waveAttack?.skillId === RAGING_WAVES_ID));
  assert.ok(!state.players[1]!.buffs.some(({ id }) => id === "self_destruct_count"));
});

test("承诺复刻的攻击费用不足时，即使本轮未结束也要自爆", () => {
  let state = table(YIYUAN_ETERNAL);
  const [owner, attacker, target, other] = state.players;
  attacker!.cakes = 1;
  state = advance(turn(state, cast(YIYUAN_ETERNAL), kill(owner!.id), stone, stone), "turn_change_action");
  for (const player of [attacker, target, other]) state = submitActionWindowSkill(state, player!.id, reply(true));
  state = advance(state);
  assert.ok(state.players[1]!.buffs.some(({ id, stacks }) => id === "self_destruct_count" && stacks === 1));
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.targetId === owner!.id));
});

test("瞬移首回合回避攻击，此后保留六回合良好，过轮延长一回合", () => {
  let state = table(YIYUAN_STEP);
  const [owner, , victim] = state.players;
  state = advance(turn(state, cast(YIYUAN_STEP), kill(owner!.id)));
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.protectionName === "一元·瞬移" && event.blockKind === "dodge"));
  assert.equal(getCakeGainAmount(state, state.players[0]), 3);
  const end = state.players[0]!.buffs.find(({ stateType }) => stateType === YIYUAN_STEP_STATE)?.expiresAtTurn;
  state = advance(turn(state, kill(victim!.id), kill(owner!.id)));
  assert.equal(state.players[0]!.hp, 50);
  assert.equal(state.players[0]!.buffs.find(({ stateType }) => stateType === YIYUAN_STEP_STATE)?.expiresAtTurn, end! + 1);
});

test("天变变招回满并解不良，反弹攻击和不良，跨轮不重复回血", () => {
  let state = table(YIYUAN_CHANGE);
  const [owner, attacker] = state.players;
  owner!.hp = 40;
  state = advance(turn(state, cake, kill(owner!.id)), "turn_change_action");
  const current = state.players[0]!;
  current.buffs.push({ id: "burning", stateType: "burning", name: "烧伤", stacks: 1 });
  state = submitActionWindowSkill(state, owner!.id, cast(YIYUAN_CHANGE));
  assert.ok(!state.players[0]!.buffs.some(({ id }) => id === "burning"));
  const applied = applyNegativeStatus(state, owner!.id, "frozen", (target) => {
    target.buffs.push({ id: "frozen", name: "冰冻", stacks: 1, expiresAtTurn: state.turnNumber + 2, moveBlockedFromTurn: state.turnNumber + 1 });
  }, attacker!.id);
  assert.equal(applied, false);
  assert.ok(state.players[1]!.buffs.some(({ id }) => id === "frozen"));
  state = advance(state);
  assert.equal(state.players[0]!.hp, 50);
  assert.equal(state.players[1]!.hp, 49);
  assert.ok(state.players[0]!.buffs.some(({ stateType }) => stateType === YIYUAN_CHANGE_STATE));
  state.players[0]!.hp = 45;
  state.players[0]!.cakes = 12;
  state.players[1]!.buffs = state.players[1]!.buffs.filter(({ id }) => id !== "frozen");
  state = advance(turn(state, kill(attacker!.id), stone));
  assert.equal(state.players[0]!.hp, 45);
  assert.equal(state.players[1]!.hp, 48);
});

test("幻化替换技能并重置次数，解除后还原原技能和原次数", () => {
  let state = table(YIYUAN_MIMIC);
  const [owner, target] = state.players;
  appendSkillInstances(owner!, ["1049"]);
  appendSkillInstances(target!, ["1063"]);
  owner!.buffs.push({ id: "skill_used:1049", name: "原技能次数", stacks: 1 });
  target!.buffs.push({ id: "skill_used:1063", name: "复制前已用", stacks: 1 });
  state = advance(turn(state, cast(YIYUAN_MIMIC, target!.id)));
  assert.deepEqual(state.players[0]!.skills, ["1063"]);
  assert.ok(!state.players[0]!.buffs.some(({ id }) => id === "skill_used:1063"));
  assert.equal(toPublicGameState(state, target!.id).players[0]!.yiyuanMimic, undefined);
  appendSkillInstances(state.players[0]!, ["1102"]);
  state.players[0]!.hp = 42;
  state = submitActionWindowSkill(state, owner!.id, cast(YIYUAN_RESTORE));
  assert.deepEqual(state.players[0]!.skills, ["1049"]);
  assert.equal(state.players[0]!.bigCards?.[0]?.cardId, YIYUAN_CARD);
  assert.equal(state.players[0]!.buffs.find(({ id }) => id === "skill_used:1049")?.stacks, 1);
  assert.equal(state.players[0]!.hp, 42);
});

test("幻化知晓未暴露的圣灵凯歌时，施术者承受消失", () => {
  let state = table(YIYUAN_MIMIC);
  const target = state.players[1]!;
  target.bigCards = [{ instanceId: "kaige", cardId: "10520" }];
  state = advance(turn(state, cast(YIYUAN_MIMIC, target.id)));
  assert.equal(state.players[0]!.defeatLevel, 3);
});

test("原神先移除再获得，保留可抵抗的技能并永久乘积饼速度", () => {
  let state = table(YIYUAN_GOD);
  const [, target, protectedPlayer] = state.players;
  target!.bigCards = [{ instanceId: "hidden", cardId: "10524" }];
  appendSkillInstances(target!, ["1049"]);
  appendSkillInstances(protectedPlayer!, ["1102"]);
  protectedPlayer!.buffs.push({ id: "test-protection", name: "免疫技能丢失", stacks: 1, immuneEffectCategories: ["skill_loss"] });
  state = advance(turn(state, cast(YIYUAN_GOD)));
  assert.ok(state.players[0]!.bigCards?.some(({ cardId }) => cardId === "10524"));
  assert.ok(state.players[0]!.skills.includes("1049"));
  assert.equal(state.players[1]!.bigCards?.length, 0);
  assert.deepEqual(state.players[2]!.skills, ["1102"]);
  assert.ok(state.players[0]!.buffs.some(({ stateType, uncleansable }) => stateType === YIYUAN_GROWTH && uncleansable));
  assert.equal(getCakeGainAmount(state, state.players[0]), 5);
});
