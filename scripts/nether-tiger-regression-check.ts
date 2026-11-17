import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, beginActionPrompt, createGame, createPlayer, getActiveSkillCount,
  getActiveFusionCount, getVisibleStatusOverview, startGame, submitActionWindowSkill, submitPlayerAction, toPublicGameState, validateAction,
  type GameState, type PlayerAction, type SkillAction
} from "../packages/shared/src";
import { TIGER_CARD, TIGER_EXTINCTION, TIGER_EXTINCTION_MOVE, TIGER_FINAL, TIGER_LOCK, TIGER_STAB, TIGER_SWITCH,
  tigerMieThirds } from "../packages/shared/src/engine/netherTigerIds";
import { shapeTigerStab } from "../packages/shared/src/engine/attackStatModifiers";
import { appendSkillInstances } from "../packages/shared/src/engine/skillInventory";
import { getSkillAttackStats, getSkillUseLimit } from "../packages/shared/src/skills/registry";
import { INFINITY_VALUE, combatValue } from "../packages/shared/src/engine/combatValues";

const cake = { type: "gain_cake" } as const;
const hit = (targetId: string) => ({ type: "attack", attackId: "sha", stacks: 2, targetId } as const);
const cast = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });

function drain(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && i < 80; i++) state = advanceActionWindow(state);
  return state;
}

function setup(): GameState {
  let state = createGame("白虎", { skillMode: "big_test_select", skillCount: 3, initialHp: 18, firstTurnNoAttack: false });
  state = addPlayerToGame(state, createPlayer("乙"));
  state = addPlayerToGame(state, createPlayer("丙"));
  state.players[0]!.bigCards = [{ cardId: TIGER_CARD, instanceId: "tiger" }];
  return drain(startGame(state));
}

function turn(state: GameState, ...actions: PlayerAction[]): GameState {
  for (const [index, action] of actions.entries()) {
    const player = state.players[index]!;
    const check = validateAction(state, player.id, action);
    assert.equal(check.ok, true, check.error);
    state = submitPlayerAction(state, player.id, action).state;
  }
  return drain(state);
}

test("轮间切换形态，只启用当前形态的融合", () => {
  let state = setup();
  const owner = state.players[0]!;
  assert.equal(getActiveFusionCount(owner, "玄•幻"), 1);
  assert.equal(getActiveFusionCount(owner, "寂灭"), 0);
  beginActionPrompt(state, "round_pre_interval_action");
  state = submitActionWindowSkill(state, owner.id, cast(TIGER_SWITCH, { cardForm: "white", bigCardInstanceId: "tiger" }));
  assert.equal(state.players[0]!.bigCards![0]!.tigerForms!.active, "white");
  assert.equal(getActiveFusionCount(state.players[0], "玄•幻"), 0);
  assert.equal(getActiveFusionCount(state.players[0], "寂灭"), 1);
  const view = toPublicGameState(state, owner.id);
  const overview = getVisibleStatusOverview(view, owner.id);
  assert.ok(overview?.special.some(({ label, value }) => label === "幽冥白虎·形态" && value.includes("邪眸白虎 · 当前")));
  assert.ok(!overview?.items.some(({ label }) => label === "幽冥白虎·形态"));

  // A running server can still send the previous layout while serving the new frontend.
  const legacy = view.statusOverview!;
  const expectedSpecial = legacy.special;
  legacy.items.push(...expectedSpecial);
  Reflect.deleteProperty(legacy, "special");
  const regrouped = getVisibleStatusOverview(view, owner.id);
  assert.deepEqual(regrouped?.special, expectedSpecial);
  assert.ok(!regrouped?.items.some(({ label }) => label === "幽冥白虎·形态"));
});

test("两次普通死亡消耗两种形态，第三次保留负血且不触发死亡", () => {
  let state = setup();
  for (const form of ["white", "nether", "nether"]) {
    const owner = state.players[0]!;
    owner.hp = 1;
    state.players[1]!.cakes = 3;
    state = turn(state, cake, hit(owner.id), cake);
    assert.equal(state.players[0]!.bigCards![0]!.tigerForms!.active, form);
    assert.equal(state.players[0]!.status, "alive");
  }
  assert.equal(getActiveSkillCount(state.players[0], TIGER_LOCK), 1);
  assert.equal(state.players[0]!.hp, -1);
  assert.equal(state.eventLog.some((event) => event.type === "player_died" && event.playerId === state.players[0]!.id), false);
});

test("幽冥刺使用整数攻值，保留负等级并在0时取得无限级", () => {
  const stats = getSkillAttackStats(TIGER_STAB, 1)!;
  assert.deepEqual(shapeTigerStab(cast(TIGER_STAB, { tigerPower: 0 }), stats).levelValue, INFINITY_VALUE);
  const negative = shapeTigerStab(cast(TIGER_STAB, { tigerPower: -4 }), stats);
  assert.deepEqual(negative.powerValue, combatValue(-4));
  assert.deepEqual(negative.levelValue, combatValue(-7));
});

test("白虎灭按目标发放次数，灭每次消耗1并返还1/3", () => {
  let state = setup();
  const owner = state.players[0]!;
  owner.bigCards![0]!.tigerForms!.active = "white";
  for (const enemy of state.players.slice(1)) enemy.hp = 100;
  owner.cakes = 3;
  state = turn(state, cast(TIGER_EXTINCTION), cake, { type: "defense", defense: "stone" });
  assert.equal(tigerMieThirds(state.players[0]!), 3);
  state = turn(state, cast(TIGER_EXTINCTION_MOVE, { targetId: state.players[1]!.id }), cake, { type: "defense", defense: "small" });
  assert.equal(tigerMieThirds(state.players[0]!), 1);
  assert.equal(validateAction(state, owner.id, cast(TIGER_EXTINCTION_MOVE, { targetId: state.players[1]!.id })).ok, false);
});

test("幽冥白虎的群退游可由普通反弹改目标", () => {
  let state = setup();
  const [owner, enemy, other] = state.players;
  owner!.bigCards![0]!.tigerForms = { active: "nether", available: [] };
  owner!.cakes = 6;
  enemy!.cakes = 1;
  state = turn(state, cast(TIGER_FINAL), { type: "defense", defense: "rebound", targetId: other!.id },
    { type: "defense", defense: "youtiao" });
  assert.equal(state.players[1]!.status, "alive");
  assert.ok(state.eventLog.some((event) => event.type === "attack_reflected" && event.originalTargetId === enemy!.id));
});

test("技能胜利只令幽冥白虎不判负，也不给它胜利反制窗口", () => {
  let state = setup();
  const [owner, enemy] = state.players;
  owner!.bigCards![0]!.tigerForms = { active: "nether", available: [] };
  appendSkillInstances(owner!, ["1092", "1092", "1092", "1092", "1092"]);
  enemy!.buffs.push({ id: "instant_win:test_tiger", name: "测试技能胜利", stacks: 1 });
  state = turn(state, cake, cake, cake);
  assert.deepEqual(state.winnerIds, [enemy!.id]);
  assert.deepEqual(state.skillVictoryUnaffectedPlayerIds, [owner!.id]);
  assert.equal(state.players[0]!.defeatLevel, undefined);
});

test("直接退游消耗当前普通形态，恢复初始血量且跳过退游反制", () => {
  let state = setup();
  const [owner, enemy] = state.players;
  enemy!.bigCards = [{ cardId: TIGER_CARD, instanceId: "borrowed", onlyAbilityId: TIGER_FINAL, initialized: true }];
  enemy!.cakes = 6;
  state = turn(state, cake, cast(TIGER_FINAL), { type: "defense", defense: "youtiao" });
  assert.equal(state.players[0]!.bigCards![0]!.tigerForms!.active, "white");
  assert.equal(state.players[0]!.hp, 18);
  assert.equal(state.players[0]!.defeatLevel, undefined);
  assert.equal(state.eventLog.some((event) => event.type === "player_died" && event.playerId === owner!.id), false);
});

test("消失同时消耗两种形态，遗迹在最终形态提供5次过往时空", () => {
  let state = setup();
  const [owner, enemy] = state.players;
  enemy!.bigCards = [{ cardId: "10507", instanceId: "dragon", onlyAbilityId: "1050701", initialized: true }];
  owner!.hp = 1;
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, enemy!.id, cast("1050701"));
  assert.deepEqual(state.players[0]!.bigCards![0]!.tigerForms, { active: "nether", available: [] });
  assert.equal(getSkillUseLimit(state.players[0]!, "1103"), 5);
});
