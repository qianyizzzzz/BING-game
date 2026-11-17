import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getActiveSkillCount, getCakeGainAmount, grantInitializedSkill,
  FENTIAN_ATTACK_ID, getFusionSkillId, getSkillUseLimit, SAND_CARD_ID, SAND_DESOLATION_ID, SAND_DUST_ID, SAND_ELEMENT, SAND_GRANTS_ID,
  SAND_NULLIFY_ID, SAND_STORM_ID, SAND_TOWER_ID, SAND_VORTEX_ID, SAND_WALTZ_ID, startGame, submitActionWindowSkill, submitPlayerAction,
  type GameState, type PlayerAction, type SkillAction, type SkillTimingPhase
} from "@bing/shared";
import { changeElementAmount, getElementAmount, getElementValue } from "../packages/shared/src/engine/elementResources";
import { getDefenseTotal } from "../packages/shared/src/engine/starDragon";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const youtiao = { type: "defense", defense: "youtiao" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const cast = (skillId: string, targetId?: string): SkillAction => ({ type: "skill", skillId, stacks: 1, ...(targetId ? { targetId } : {}) });
const sha = (targetId: string, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", stacks, targetId });

function advance(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && i < 100; i++) state = advanceActionWindow(state);
  return state;
}

function setup(opponentCard?: string, opening = false) {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 4, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  const [a, b, c, d] = state.players.map(({ id }) => id) as [string, string, string, string];
  state.players[0]!.bigCards = [{ cardId: SAND_CARD_ID, instanceId: "sand-test" }];
  if (opponentCard) state.players[1]!.bigCards = [{ cardId: opponentCard, instanceId: "other-card" }];
  state = startGame(state);
  if (!opening) state = advance(state);
  for (const player of state.players) { player.hp = 30; player.cakes = 30; }
  return { state, a, b, c, d };
}

function reveal(state: GameState, moves: Record<string, PlayerAction>): GameState {
  state = advance(state);
  for (const { id, status } of state.players) if (status === "alive") state = submitPlayerAction(state, id, moves[id] ?? cake).state;
  return state;
}

const player = (state: GameState, id: string) => state.players.find((item) => item.id === id)!;
const sand = (state: GameState, id: string) => getElementAmount(player(state, id), SAND_ELEMENT);
const grant = (state: GameState, id: string, amount: number) => changeElementAmount(player(state, id), SAND_ELEMENT, amount);

test("真实传承乱舞和沙子，其他玩家的沙子出招无效", () => {
  let { state, a, b } = setup(undefined, true);
  appendSkillInstances(player(state, b), ["1003"]);
  assert.equal(getActiveSkillCount(player(state, a), "1053"), 1);
  assert.equal(getActiveSkillCount(player(state, a), "1003"), 1);
  state = submitActionWindowSkill(state, b, { ...cast("1003"), targetSkillId: "1033" });
  assert.equal(getActiveSkillCount(player(state, b), "1033"), 0);
  assert.equal(player(state, b).status, "alive");
});

test("两份生效的沙子传承让双方的沙子互相失效", () => {
  let { state, a, b } = setup(SAND_CARD_ID, true);
  for (const id of [a, b]) {
    assert.equal(getActiveSkillCount(player(state, id), "1003"), 1);
    state = submitActionWindowSkill(state, id, { ...cast("1003"), targetSkillId: "1033" });
    assert.equal(getActiveSkillCount(player(state, id), "1033"), 0);
    assert.equal(player(state, id).status, "alive");
  }
});

test("万箭齐发群攻3且油条防，命中3点分别给两条积沙", () => {
  let { state, a, b, c, d } = setup();
  assert.equal(sand(state, a), 1);
  state = advance(reveal(state, { [a]: { type: "attack", attackId: "wan_jian", stacks: 1 }, [c]: youtiao, [d]: youtiao }), "turn_end_action");
  assert.equal(player(state, b).hp, 27);
  assert.equal(player(state, c).hp, 30);
  assert.equal(sand(state, a), 3);
  assert.equal(getActiveSkillCount(player(state, a), "1003"), 1);
});

test("尘沙起对最低血量并列者造成法伤，不重开", () => {
  let { state, a, b, c } = setup();
  player(state, b).hp = player(state, c).hp = 3;
  state = advance(reveal(state, { [a]: cast(SAND_DUST_ID) }));
  assert.deepEqual([b, c].map((id) => player(state, id).hp), [2, 2]);
  assert.equal(state.roundNumber, 1);
  const damage = state.eventLog.filter((event) => event.type === "damage" && event.attackName === "尘沙起");
  assert.equal(damage.length, 2);
  assert.ok(damage.every((event) => !event.attackDamage && event.amount === 1));
});

test("沙尘暴是同回合六段各2点攻击", () => {
  let { state, a, b, c, d } = setup();
  grant(state, a, 2);
  state = advance(reveal(state, { [a]: cast(SAND_STORM_ID, b), [c]: youtiao, [d]: youtiao }), "turn_end_action");
  assert.equal(player(state, b).hp, 18);
  assert.equal(state.eventLog.filter((event) => event.type === "damage" && event.targetId === b && event.attackName === "沙尘暴").length, 6);
});

test("沙化提供3、2、2、2次独立额外使用权限", () => {
  let { state, a, b } = setup();
  grant(state, a, 3);
  state = advance(reveal(state, { [a]: cast(SAND_GRANTS_ID) }));
  const ids = [getFusionSkillId("冰火两仪眼"), "1034", "1035", "1014"];
  assert.deepEqual(ids.map((id) => getSkillUseLimit(player(state, a), id)), [3, 2, 2, 2]);
  assert.ok(ids.every((id) => getActiveSkillCount(player(state, a), id) > 0));
  state = advance(reveal(state, { [a]: cast("1035", b) }), "turn_end_action");
  assert.equal(getSkillUseLimit(player(state, a), "1035"), 1);
  assert.ok(player(state, b).buffs.some((buff) => buff.id.startsWith("paralysis_next_action:")));
});

test("沙暴·天息使他人的攻击及对外非攻击招式无效，原攻击仍耗饼", () => {
  let { state, a, b, c, d } = setup();
  appendSkillInstances(player(state, c), ["1035"]);
  grant(state, a, 4);
  state = advance(reveal(state, { [a]: cast(SAND_NULLIFY_ID), [b]: sha(a), [c]: cast("1035", a), [d]: small }), "turn_end_action");
  assert.equal(player(state, b).cakes, 29);
  assert.equal(player(state, a).hp, 30);
  assert.equal(player(state, d).hp, 30);
  assert.ok(!player(state, a).buffs.some((buff) => buff.id.startsWith("paralysis_next_action:")));
});

test("流沙旋涡受乱舞扩展，石头防；延迟出招只付费一次", () => {
  let { state, a, b, c, d } = setup();
  grant(state, a, 5);
  state = advance(reveal(state, { [a]: cast(SAND_VORTEX_ID, b), [c]: stone }), "turn_end_action");
  assert.ok(player(state, b).buffs.some((buff) => buff.stateType === "sand_vortex"));
  assert.ok(player(state, d).buffs.some((buff) => buff.stateType === "sand_vortex"));
  assert.ok(!player(state, c).buffs.some((buff) => buff.stateType === "sand_vortex"));
  assert.equal(getCakeGainAmount(state, player(state, b)), 0);
  state = advance(reveal(state, { [b]: sha(a, 2), [c]: stone }), "turn_end_action");
  assert.equal(player(state, b).cakes, 29);
  assert.equal(player(state, a).hp, 30);
  state = advance(reveal(state, { [b]: cake, [c]: stone }), "turn_end_action");
  assert.equal(player(state, b).cakes, 29);
  assert.equal(player(state, a).hp, 28);
});

test("积沙成塔只按令防御值归零的最后一笔造成单次法伤", () => {
  let { state, a, b, c } = setup();
  grant(state, a, 6);
  state = advance(reveal(state, { [a]: cast(SAND_TOWER_ID) }), "turn_end_action");
  assert.equal(getDefenseTotal(player(state, a))[0]?.coefficient, 36);
  const defense = player(state, a).buffs.find((buff) => buff.id === "defense_value")!;
  defense.stacks = 6;
  state = advance(reveal(state, { [b]: sha(a, 4), [c]: sha(a, 3) }), "turn_end_action");
  assert.equal(player(state, a).hp, 29);
  assert.equal(player(state, b).hp, 30);
  assert.equal(player(state, c).hp, 20);
  const revenge = state.eventLog.filter((event) => event.type === "damage" && event.attackName === "积沙成塔");
  assert.equal(revenge.length, 1);
});

test("尘埃寂灭的指定退游可以用饼防，其他人承受群攻", () => {
  let { state, a, b, c, d } = setup();
  grant(state, a, 15);
  state = advance(reveal(state, { [a]: cast(SAND_DESOLATION_ID, b), [b]: cake }), "turn_end_action");
  assert.equal(player(state, b).status, "alive");
  assert.equal(player(state, b).hp, 30);
  assert.deepEqual([c, d].map((id) => player(state, id).defeatLevel), [1, 1]);
  assert.equal(getElementValue(player(state, a), SAND_ELEMENT).find((term) => term.exponent === 0)?.coefficient, 11);
});

test("风语之森版净化之风扣一份衍生次数，无视血量奇偶", () => {
  let { state, a, b, c, d } = setup();
  grant(state, a, 3);
  player(state, c).hp = 31;
  state = advance(reveal(state, { [a]: cast(SAND_GRANTS_ID), [d]: sha(a) }), "round_pre_interval_action");
  state = submitActionWindowSkill(state, a, cast("1014"));
  assert.equal(getSkillUseLimit(player(state, a), "1014"), 1);
  assert.deepEqual([b, c].map((id) => player(state, id).hp), [29, 30]);
});

test("流沙旋涡从挂上后第5回合末造成1点法伤", () => {
  let { state, a, b, c, d } = setup();
  grant(state, a, 5);
  state = advance(reveal(state, { [a]: cast(SAND_VORTEX_ID, b), [c]: stone, [d]: stone }));
  for (let i = 1; i <= 4; i++) {
    state = advance(reveal(state, {}));
    assert.equal(player(state, b).hp, 30);
  }
  state = advance(reveal(state, {}));
  assert.equal(player(state, b).hp, 29);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.attackName === "流沙旋涡"));
});

test("焚天清掉塔的36防御值，造成一笔180点法伤", () => {
  let { state, a, b, c } = setup("10501");
  player(state, b).hp = 300;
  grant(state, a, 6);
  state = advance(reveal(state, { [a]: cast(SAND_TOWER_ID) }));
  state = advance(reveal(state, { [b]: cast(FENTIAN_ATTACK_ID, c) }), "turn_end_action");
  assert.equal(player(state, b).hp, 120);
  assert.equal(state.eventLog.filter((event) => event.type === "damage" && event.attackName === "积沙成塔").length, 1);
  assert.equal(getDefenseTotal(player(state, a)).length, 0);
});

test("沙暴·天息被变招取消后，其他玩家的攻击正常结算", () => {
  let { state, a, b, c } = setup();
  grant(state, a, 4);
  const huiyue = getFusionSkillId("辉月");
  grantInitializedSkill(state, a, huiyue, "测试", false);
  state = reveal(state, { [a]: cast(SAND_NULLIFY_ID), [b]: sha(c, 2) });
  state = submitActionWindowSkill(state, a, cast(huiyue));
  state = advance(state, "turn_end_action");
  assert.equal(player(state, c).hp, 28);
  assert.equal(player(state, b).cakes, 28);
});

test("沙暴舞天殇的无限群攻可以用反弹防住", () => {
  let { state, a, b, c, d } = setup();
  grant(state, a, 7);
  for (const id of [c, d]) player(state, id).buffs.push({ id: "sand_test_invulnerability", stateType: "gather_invulnerability",
    name: "无敌", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
  state = advance(reveal(state, { [a]: cast(SAND_WALTZ_ID), [b]: { type: "defense", defense: "rebound", targetId: a } }), "turn_end_action");
  assert.equal(player(state, b).hp, 30);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === b && event.defense === "rebound"));
});

for (const upgrade of [false, true]) test(`尘埃寂灭的单体是非伤害${upgrade ? "必杀" : "退游"}`, () => {
  let { state, a, b, c, d } = setup();
  grant(state, a, 15);
  for (const id of [c, d]) player(state, id).buffs.push({ id: "sand_test_invulnerability", stateType: "gather_invulnerability",
    name: "无敌", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
  const random = Math.random;
  Math.random = () => new Error().stack?.split("\n")[2]?.includes("resolveSandMoves") ? (upgrade ? 0.1 : 0.9) : random();
  try {
    state = advance(reveal(state, { [a]: cast(SAND_DESOLATION_ID, b), [b]: stone }), "turn_end_action");
  } finally { Math.random = random; }
  assert.equal(player(state, b).defeatLevel, upgrade ? 4 : 2);
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.targetId === b));
});
