import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, createGame, createPlayer, getActiveSkillCount, getActiveFusionCount, getFusionSkillId,
  grantInitializedSkill, guessPlayerSkill, isBigCardAbilityIgnored, getSkill, passActionWindow,
  previewPlayerAttackStats, PURPLE_EYE_CARD_ID, PURPLE_FORESIGHT_ID, PURPLE_INSIGHT_ID, PURPLE_LIGHT_ID, PURPLE_SCALE_ID,
  startGame, submitActionWindowSkill, submitPlayerAction, toPublicGameState, type GameState, type PlayerAction,
  type SkillAction, type SkillTimingPhase
} from "@bing/shared";

const cake = { type: "gain_cake" } as const;
const skill = (skillId: string, options: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...options });
const seat = (state: GameState, index: number) => state.players[index]!;
const attack = (targetId: string, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", stacks, targetId });

function fixture(cards: string[][]): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 3, firstTurnNoAttack: false });
  cards.slice(1).forEach((_, index) => { state = addPlayerToGame(state, createPlayer(`玩家${index + 2}`)); });
  cards.forEach((ids, index) => {
    seat(state, index).bigCards = ids.map((cardId, copy) => ({ cardId, instanceId: `${index}-${copy}-${cardId}` }));
  });
  return startGame(state);
}

function until(state: GameState, phase: SkillTimingPhase): GameState {
  for (let guard = 0; guard < 35 && state.activeTimingPhase !== phase && state.phase === "action_window"; guard++) state = advanceActionWindow(state);
  assert.equal(state.activeTimingPhase, phase);
  return state;
}

function moves(state: GameState, plans: PlayerAction[]): GameState {
  for (const [index, player] of state.players.entries()) state = submitPlayerAction(state, player.id, plans[index] ?? cake).state;
  return state;
}

test("纵观只对新暴露的完整卡施加法伤", () => {
  let state = fixture([[PURPLE_EYE_CARD_ID], ["10529", "10529"], []]);
  assert.equal(getActiveSkillCount(seat(state, 0), "1108"), 1);
  const [a, b] = state.players.map(({ id }) => id);
  state = moves(until(state, "turn_action"), [cake, cake, cake]);
  state = until(state, "turn_end_action");
  for (let i = 0; i < 3; i++) state = guessPlayerSkill(state, a!, b!, "10529");
  assert.equal(seat(state, 1).hp, 14);
  assert.equal(state.eventLog.filter((event) => event.type === "damage" && event.attackName === "纵观").length, 2);
});

test("入微只让本人知晓，暂时失去后保留原技能使用记录", () => {
  let state = until(fixture([[PURPLE_EYE_CARD_ID], ["10529"], []]), "round_before_action");
  const [a, b, c] = state.players.map(({ id }) => id);
  state.roundNumber = 3;
  const original = Math.random;
  try { Math.random = () => 0; state = submitActionWindowSkill(state, a!, skill(PURPLE_INSIGHT_ID, { targetId: b! })); }
  finally { Math.random = original; }
  assert.equal(toPublicGameState(state, a).purpleInsight?.abilityId, "1052901");
  assert.equal(toPublicGameState(state, b).purpleInsight, undefined);
  assert.equal(toPublicGameState(state, c).purpleInsight, undefined);
  assert.equal(toPublicGameState(state, a).players[1]?.bigCards?.length, 0);
  seat(state, 1).bigCards![0]!.abilityUses = { "1052901": 1 };
  state = submitActionWindowSkill(state, a!, skill(PURPLE_INSIGHT_ID, { purpleInsightChoice: "lose" }));
  assert.equal(getActiveSkillCount(seat(state, 1), "1052901"), 0);
  assert.equal(seat(state, 1).bigCards![0]!.abilityUses?.["1052901"], 1);
  state.roundNumber = 8;
  state = until(advanceActionWindow(state), "turn_before_action");
  assert.equal(getActiveSkillCount(seat(state, 1), "1052901"), 1);
});

test("入微抽中圣灵凯歌的子技能时只在整张卡未公开的情况下触发消失", () => {
  for (const publiclyRevealed of [false, true]) {
    let state = until(fixture([[PURPLE_EYE_CARD_ID], ["10520"], []]), "round_before_action");
    const [a, b] = state.players.map(({ id }) => id);
    state.roundNumber = 3;
    if (publiclyRevealed) seat(state, 1).bigCards![0]!.publiclyRevealed = true;
    const original = Math.random;
    try { Math.random = () => 0; state = submitActionWindowSkill(state, a!, skill(PURPLE_INSIGHT_ID, { targetId: b! })); }
    finally { Math.random = original; }
    assert.equal(state.purpleInsights?.[a!]?.abilityId, "1052001");
    assert.equal(seat(state, 0).defeatLevel, publiclyRevealed ? undefined : 3);
  }
});

test("芥子提前锁定出招，只有发起者能看见，允许自爆", () => {
  for (const selfDestruct of [false, true]) {
    let state = until(fixture([[PURPLE_EYE_CARD_ID], [], []]), "turn_before_action");
    const [a, b, c] = state.players.map(({ id }) => id);
    state = submitActionWindowSkill(state, a!, skill(PURPLE_FORESIGHT_ID, { targetId: b! }));
    assert.deepEqual(toPublicGameState(state, b).purpleForesight, { mustSubmit: true });
    assert.throws(() => passActionWindow(state, b!), /提前提交/);
    const action = selfDestruct ? { type: "defense", defense: "self_destruct" } as const : cake;
    state = submitPlayerAction(state, b!, action).state;
    assert.deepEqual(toPublicGameState(state, a).purpleForesight, { targets: [{ targetId: b, plan: { actions: [action] } }] });
    assert.equal(toPublicGameState(state, c).purpleForesight, undefined);
    assert.equal(toPublicGameState(state, c).pendingActionPlayerIds.includes(b!), false);
    state = advanceActionWindow(state);
    if (selfDestruct) assert.equal(state.roundNumber, 2);
    else {
      assert.deepEqual(state.pendingActions[b!], { actions: [cake] });
      assert.throws(() => submitPlayerAction(state, b!, cake), /提前提交/);
    }
  }
});

test("浩瀚接受区间内的整数结果，也可改单有等级的出招", () => {
  for (const nonAttack of [false, true]) {
    let state = until(fixture([[PURPLE_EYE_CARD_ID], [], []]), "turn_action");
    const [a, b] = state.players.map(({ id }) => id);
    seat(state, 0).cakes = 12;
    if (nonAttack) seat(state, 0).skills.push("1035");
    state = moves(state, [nonAttack ? skill("1035", { targetId: b! }) : attack(b!, 4), cake, cake]);
    assert.throws(() => submitActionWindowSkill(state, a!, skill(PURPLE_SCALE_ID, { switchActionIndex: 0, purplePower: 1.5 })), /整数/);
    state = submitActionWindowSkill(state, a!, skill(PURPLE_SCALE_ID, { switchActionIndex: 0, purpleLevel: 2,
      ...(nonAttack ? {} : { purplePower: 3 }) }));
    const stats = previewPlayerAttackStats(state, a!, undefined, true).stats[0]!;
    assert.equal(stats.level, 2);
    assert.equal(stats.power, nonAttack ? 0 : 3);
  }
});

test("换防只对瀚海之力持有者失去效果，其他攻击照常被防住", () => {
  let state = until(fixture([[PURPLE_EYE_CARD_ID], [], []]), "turn_action");
  const [a, b, c] = state.players.map(({ id }) => id);
  state.players.forEach((player) => { player.cakes = 10; });
  seat(state, 1).skills.push("1087");
  state = moves(state, [attack(b!), { type: "defense", defense: "youtiao" }, attack(b!)]);
  state = submitActionWindowSkill(state, b!, skill("1087", { switchActionIndex: 0, switchToAction: { type: "defense", defense: "small" } }));
  state = until(state, "turn_end_action");
  const damage = state.eventLog.filter((event) => event.type === "damage" && event.targetId === b);
  assert.deepEqual(damage.map(({ sourceId }) => sourceId), [a]);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.sourceId === c));
});

test("瀚海之力的致死保留备用命和复活次数", () => {
  let state = until(fixture([[PURPLE_EYE_CARD_ID], [], []]), "turn_action");
  const b = seat(state, 1).id;
  seat(state, 0).cakes = 6;
  seat(state, 1).hp = 1;
  seat(state, 1).skills.push("1068", "1063");
  seat(state, 1).spareLives = [{ hp: 8 }];
  state = moves(state, [skill(PURPLE_LIGHT_ID, { targetId: b }), cake, cake]);
  state = until(state, "turn_end_action");
  assert.equal(seat(state, 1).status, "dead");
  assert.equal(seat(state, 1).spareLives?.length, 1);
  assert.equal(seat(state, 1).buffs.find((buff) => buff.id === "skill_used:1063"), undefined);
});

test("入微暂停继承的融合，暂获子技能会随良好到期", () => {
  for (const choice of ["lose", "gain"] as const) {
    let state = until(fixture([[PURPLE_EYE_CARD_ID], ["10501"], []]), "round_before_action");
    const [a, b] = state.players.map(({ id }) => id);
    state.roundNumber = 3;
    const original = Math.random;
    try { Math.random = () => 0.55; state = submitActionWindowSkill(state, a!, skill(PURPLE_INSIGHT_ID, { targetId: b! })); }
    finally { Math.random = original; }
    assert.equal(toPublicGameState(state, a).purpleInsight?.abilityId, "1050103");
    state = submitActionWindowSkill(state, a!, skill(PURPLE_INSIGHT_ID, { purpleInsightChoice: choice }));
    assert.equal(getActiveFusionCount(seat(state, 1), "炽焰"), choice === "lose" ? 0 : 1);
    assert.equal(getActiveFusionCount(seat(state, 0), "炽焰"), choice === "gain" ? 1 : 0);
    state.roundNumber = choice === "gain" ? 6 : 8;
    state = until(advanceActionWindow(state), "turn_before_action");
    assert.equal(getActiveFusionCount(seat(state, 0), "炽焰"), 0);
    assert.equal(getActiveFusionCount(seat(state, 1), "炽焰"), 1);
  }
});

test("瀚海之力绕过出招反弹、技能反弹和伤害反弹", () => {
  for (const reflect of ["move", "skill", "damage"] as const) {
    let state = until(fixture([[PURPLE_EYE_CARD_ID], [], []]), "turn_action");
    const [a, b, c] = state.players.map(({ id }) => id);
    state.players.forEach((player) => { player.cakes = 8; });
    if (reflect === "skill") seat(state, 1).buffs.push({ id: "test-rebound", stateType: "skill_rebound", name: "技能弹",
      stacks: 1, expiresAtTurn: state.turnNumber + 1 });
    if (reflect === "damage") grantInitializedSkill(state, b!, getFusionSkillId("反伤刺甲"), "测试", false);
    state = moves(state, [reflect === "damage" ? skill(PURPLE_LIGHT_ID, { targetId: b! }) : attack(b!),
      reflect === "move" ? { type: "defense", defense: "rebound", targetId: c! } : cake, cake]);
    state = until(state, "turn_end_action");
    assert.deepEqual(state.players.map(({ hp }) => hp), [18, reflect === "damage" ? 13 : 17, 18], reflect);
    assert.ok(!state.eventLog.some((event) => event.type === "attack_reflected" && event.sourceId === a));
  }
});

test("无视无视锁定只抵消类别无视", () => {
  const target = createPlayer("乙");
  const passive = getSkill("1053006")!;
  target.buffs.push({ id: "lock-ignore", name: "无视锁定技", stacks: 1, ignoredSkillTypeTags: ["锁定技"] });
  assert.equal(isBigCardAbilityIgnored(target, passive), true);
  assert.equal(isBigCardAbilityIgnored(target, passive, true), false);
  target.buffs.push({ id: "specific-ignore", name: "无视指定技能", stacks: 1, ignoredSkillIds: [passive.id] });
  assert.equal(isBigCardAbilityIgnored(target, passive, true), true);
});

test("只有瀚海之力持有者无视群攻附加的浩瀚数值", () => {
  let state = until(fixture([[PURPLE_EYE_CARD_ID], [PURPLE_EYE_CARD_ID], []]), "turn_action");
  const [a, b, c] = state.players.map(({ id }) => id);
  seat(state, 1).cakes = 10;
  state = moves(state, [cake, { type: "attack", attackId: "wan_jian", stacks: 1 }, cake]);
  const base = previewPlayerAttackStats(state, b!).stats[0]!.power;
  const boosted = base * 2;
  state = submitActionWindowSkill(state, b!, skill(PURPLE_SCALE_ID, { switchActionIndex: 0, purplePower: boosted }));
  state = until(state, "turn_end_action");
  const damage = state.eventLog.filter((event) => event.type === "damage" && event.sourceId === b);
  assert.equal(damage.find((event) => event.targetId === a)?.amount, base);
  assert.equal(damage.find((event) => event.targetId === c)?.amount, boosted);
});
