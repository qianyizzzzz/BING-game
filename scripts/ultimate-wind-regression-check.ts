import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getActiveFusionCount, getCakeGainAmount,
  getFusionSkillId, getSkillAttackStats, grantInitializedSkill,
  HURRICANE_CAKES_ID, startGame, submitActionWindowSkill, submitPlayerAction, ULTIMATE_WIND_CARD_ID, WIND_ELEMENT,
  VERDICT_ACTION_ID, WIND_EYE_ID, WIND_HASTE_ID, WIND_PURSUIT_ID, WIND_SCOUT_ID, WIND_SHIELD_ID, WIND_SHUFFLE_ID, WIND_STAR_ID, WIND_TRACK_ID,
  type GameState, type PlayerAction, type SkillAction, type SkillTimingPhase
} from "@bing/shared";
import { changeElementAmount, getElementAmount } from "../packages/shared/src/engine/elementResources";
import { getDefenseTotal } from "../packages/shared/src/engine/starDragon";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const cast = (skillId: string, options: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...options });
const sha = (targetId: string, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", stacks, targetId });

function advance(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && i < 80; i++) {
    state = advanceActionWindow(state);
  }
  return state;
}

function setup(opponentCard?: string) {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 4, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  const [a, b, c, d] = state.players.map(({ id }) => id) as [string, string, string, string];
  state.players[0]!.bigCards = [{ cardId: ULTIMATE_WIND_CARD_ID, instanceId: "wind-test" }];
  if (opponentCard) state.players[1]!.bigCards = [{ cardId: opponentCard, instanceId: "scout-target" }];
  state = advance(startGame(state));
  for (const player of state.players) { player.hp = 30; player.cakes = 30; }
  return { state, a, b, c, d };
}

function reveal(state: GameState, moves: Record<string, PlayerAction>): GameState {
  state = advance(state);
  for (const { id, status } of state.players) if (status === "alive") state = submitPlayerAction(state, id, moves[id] ?? cake).state;
  return state;
}

const player = (state: GameState, id: string) => state.players.find((item) => item.id === id)!;

test("每轮积风、风盾与累计防御值进度", () => {
  let { state, a } = setup();
  assert.equal(getElementAmount(player(state, a), WIND_ELEMENT), 1);
  assert.equal(getActiveFusionCount(player(state, a), "风之轻灵"), 1);
  changeElementAmount(player(state, a), WIND_ELEMENT, 5);
  for (let i = 0; i < 2; i++) state = advance(reveal(state, { [a]: cast(WIND_SHIELD_ID) }));
  assert.equal(getDefenseTotal(player(state, a))[0]?.coefficient, 8);
  assert.equal(getElementAmount(player(state, a), WIND_ELEMENT), 5);
});

test("飓风付饼，两个小防各自防住，火烧大地逐份共享", () => {
  let { state, a, b, c, d } = setup();
  appendSkillInstances(player(state, d), ["1012"]);
  state = advance(reveal(state, { [a]: cast(HURRICANE_CAKES_ID, { targetIds: [b, c] }), [b]: small, [c]: small }), "turn_end_action");
  assert.equal(player(state, a).cakes, 25);
  assert.ok([b, c].every((id) => player(state, id).buffs.some((buff) => buff.stateType === "hurricane_link")));
  state = advance(state, "round_pre_interval_action");
  if (state.activeTimingPhase !== "round_pre_interval_action") {
    state = advance(reveal(state, { [d]: sha(a) }), "turn_end_action");
    state = advance(state, "round_pre_interval_action");
  }
  state = submitActionWindowSkill(state, d, cast("1012"));
  assert.deepEqual([b, c].map((id) => player(state, id).hp), [28, 28]);
});

test("风王之瞳反普通杀，每份招式奖励一次", () => {
  let { state, a, b } = setup();
  changeElementAmount(player(state, a), WIND_ELEMENT, 3);
  state = advance(reveal(state, { [a]: cast(WIND_EYE_ID), [b]: sha(a, 2) }), "turn_end_action");
  assert.equal(player(state, b).hp, 28);
  assert.equal(player(state, a).hp, 30);
  assert.equal(getElementAmount(player(state, a), WIND_ELEMENT), 3);
  assert.equal(getDefenseTotal(player(state, a))[0]?.coefficient, 1);
});

test("飓风共享寒冰剑的技能失效，接收者独立判定冰系免疫", () => {
  for (const protection of ["none", "ice", "fire"] as const) {
    let { state, a, b, c, d } = setup();
    appendSkillInstances(player(state, d), ["1017"]);
    state = advance(reveal(state, { [a]: cast(HURRICANE_CAKES_ID, { targetIds: [b, c] }), [b]: small, [c]: small }));
    if (protection === "ice") appendSkillInstances(player(state, c), ["1074"]);
    if (protection === "fire") {
      appendSkillInstances(player(state, d), ["1015"]);
      grantInitializedSkill(state, c, getFusionSkillId("自然之灵"), "测试", false);
    }
    state = reveal(state, { [d]: sha(b) });
    state = advance(submitActionWindowSkill(state, d, cast("1017")), "turn_end_action");
    const disabled = (id: string) => player(state, id).buffs.find((buff) => buff.id.startsWith("skill_disabled_until_round:"));
    assert.equal(disabled(b)?.sourcePlayerId, d);
    assert.equal(disabled(c)?.sourcePlayerId, protection === "ice" ? undefined : d);
    assert.equal(disabled(a), undefined);
  }
});

test("疾行在本回合结算后重开，下两轮出饼翻倍", () => {
  let { state, a } = setup();
  changeElementAmount(player(state, a), WIND_ELEMENT, 4);
  state = advance(reveal(state, { [a]: cast(WIND_HASTE_ID) }), "turn_end_action");
  assert.equal(state.roundNumber, 1);
  assert.equal(getCakeGainAmount(state, player(state, a)), 1);
  state = advance(state);
  assert.equal(state.roundNumber, 2);
  assert.equal(getCakeGainAmount(state, player(state, a)), 2);
});

test("风·探查只在圣灵凯歌尚未公开时触发知晓反制", () => {
  for (const publiclyRevealed of [false, true]) {
    let { state, a, b } = setup("10520");
    if (publiclyRevealed) player(state, b).bigCards![0]!.publiclyRevealed = true;
    changeElementAmount(player(state, a), WIND_ELEMENT, 4);
    state = advance(reveal(state, { [a]: cast(WIND_SCOUT_ID, { targetId: b }) }));
    assert.ok(state.peekBigCardsByViewer?.[a]?.includes("scout-target"));
    assert.equal(player(state, a).defeatLevel, publiclyRevealed ? undefined : 3);
  }
});

test("跟踪附着在攻击上，命中后开放直接死亡响应", () => {
  let { state, a, b } = setup();
  changeElementAmount(player(state, a), WIND_ELEMENT, 6);
  state = reveal(state, { [a]: sha(b) });
  state = submitActionWindowSkill(state, a, cast(WIND_TRACK_ID, { switchActionIndex: 0 }));
  state = advance(state, "turn_damage_modify");
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  assert.ok(player(state, b).buffs.some((buff) => buff.stateType === "wind_trace" && buff.sourcePlayerId === a));
  state = advance(submitActionWindowSkill(state, a, cast(WIND_PURSUIT_ID, { targetId: b })), "turn_end_action");
  assert.equal(player(state, b).status, "dead");
});

test("风暴之星仅参与实际致死时奖励风", () => {
  let { state, a, b } = setup();
  player(state, b).hp = 5;
  changeElementAmount(player(state, a), WIND_ELEMENT, 1);
  state = advance(reveal(state, { [a]: cast(WIND_STAR_ID, { targetId: b }) }), "turn_end_action");
  assert.equal(player(state, b).status, "dead");
  assert.equal(getElementAmount(player(state, a), WIND_ELEMENT), 6);
});

test("换位永久调整座位，攻击跟座位而费用和石头跟原玩家", () => {
  let { state, a, b, c, d } = setup();
  changeElementAmount(player(state, a), WIND_ELEMENT, 5);
  const before = Math.random;
  Math.random = () => new Error().stack?.includes("prepareWindSeatChange") ? 0 : before();
  try {
    state = advance(reveal(state, { [a]: cast(WIND_SHUFFLE_ID, { targetId: c }), [b]: sha(c, 2), [c]: stone }), "turn_end_action");
  } finally { Math.random = before; }
  assert.deepEqual(state.players.map(({ id }) => id), [b, c, d, a]);
  assert.equal(player(state, b).cakes, 28);
  assert.equal(player(state, c).hp, 30);
  assert.equal(player(state, d).hp, 28);
});

test("风踪允许打到小空间内无法选中且回避中的目标，伤害翻倍", () => {
  let { state, a, b } = setup();
  const target = player(state, b);
  target.spaceId = "wind_test_space";
  state.smallSpaces = { wind_test_space: { name: "自我封闭", kind: "self_isolation", expiresAtRound: 5, cakeMultiplier: 3 } };
  target.buffs.push({ id: "wind_trace", name: "风踪印记", stateType: "wind_trace", stacks: 1, sourcePlayerId: a, expiresAtRound: 6 },
    { id: "untargetable", name: "无法被选中", stacks: 1, preventsTargetSelection: true },
    { id: "temp_flash_dodge", name: "闪现", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
  state = advance(reveal(state, { [a]: sha(b, 2) }), "turn_damage_modify");
  state = advance(state, "turn_end_action");
  assert.equal(player(state, b).hp, 26);
});

test("风之轻灵把两种暴风雪变成单回合六段攻2", () => {
  const { state, a, b } = setup();
  for (const id of ["1095", "1096"]) {
    assert.deepEqual(getSkillAttackStats(id, 1, player(state, a))?.damageParts, [2, 2, 2, 2, 2, 2]);
    assert.notEqual(getSkillAttackStats(id, 1, player(state, b))?.damageParts?.length, 6);
  }
});

test("飓风让霜落大地的两份回血分别共享", () => {
  let { state, a, b, c, d } = setup();
  appendSkillInstances(player(state, d), ["1013"]);
  for (const id of [b, c]) player(state, id).buffs.push({ id: "hurricane_test", name: "飓风", stateType: "hurricane_link",
    stacks: 1, expiresAtRound: 5 });
  state = advance(reveal(state, { [d]: sha(a) }), "round_pre_interval_action");
  state = submitActionWindowSkill(state, d, cast("1013"));
  assert.deepEqual([b, c].map((id) => player(state, id).hp), [32, 32]);
});

test("风之轻灵让净化之风在一次施放中分别造成六次法伤", () => {
  let { state, a, b, d } = setup();
  state = advance(reveal(state, { [d]: sha(a) }), "round_pre_interval_action");
  state = submitActionWindowSkill(state, a, cast("1014"));
  assert.equal(player(state, b).hp, 24);
  assert.equal(state.eventLog.filter((event) => event.type === "damage" && event.targetId === b && event.attackName === "净化之风").length, 6);
});

test("被无敌防住仍算命中，无伤害批次也打开风·追击窗口", () => {
  let { state, a, b } = setup();
  changeElementAmount(player(state, a), WIND_ELEMENT, 4);
  state = reveal(state, { [a]: sha(b) });
  player(state, b).buffs.push({ id: "temp_invulnerable", name: "无敌", stacks: 1, expiresAtTurn: state.turnNumber });
  state = submitActionWindowSkill(state, a, cast(WIND_TRACK_ID, { switchActionIndex: 0 }));
  state = advance(state, "turn_damage_modify");
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  assert.equal(state.pendingDamageItems?.length ?? 0, 0);
  state = advance(submitActionWindowSkill(state, a, cast(WIND_PURSUIT_ID, { targetId: b })), "turn_end_action");
  assert.equal(player(state, b).status, "dead");
});

test("换位先于御秽裁决玩点，费用仍由原提交者承担", () => {
  let { state, a, b, c, d } = setup("10508");
  changeElementAmount(player(state, a), WIND_ELEMENT, 5);
  const before = Math.random;
  Math.random = () => new Error().stack?.includes("prepareWindSeatChange") ? 0 : before();
  try {
    state = advance(reveal(state, { [a]: cast(WIND_SHUFFLE_ID, { targetId: c }), [b]: cast(VERDICT_ACTION_ID, { targetId: c }), [c]: stone }),
      "turn_reveal_check");
  } finally { Math.random = before; }
  assert.equal(player(state, b).cakes, 27);
  assert.equal(state.verdictTurn?.games[0]?.sourceId, c);
  assert.equal(state.verdictTurn?.games[0]?.targetId, d);
});
