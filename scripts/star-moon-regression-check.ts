import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getActiveSkillCount, getCakeGainAmount,
  getFusionSkillId, startGame, submitActionWindowSkill, submitPlayerAction, toPublicGameState, validateAction,
  MOON_ELEMENT, STAR_ELEMENT, STAR_MOON_BURST, STAR_MOON_CARD_ID, STAR_MOON_CHOOSE_CARD, STAR_MOON_DANCE, STAR_MOON_FREE_HUIYUE,
  STAR_MOON_GATHER_MOON, STAR_MOON_GATHER_STAR, STAR_MOON_GLEAM, STAR_MOON_HUIYUE_STOCK, STAR_MOON_PIERCE,
  STAR_MOON_RIVER, STAR_MOON_SLOW, STAR_MOON_TEMPORARY_CARD, SUN_MOON_STARS_FUSION, type GameState, type PlayerAction
} from "../packages/shared/src";
import { changeElementAmount, getElementAmount } from "../packages/shared/src/engine/elementResources";
import { validateFusionAction } from "../packages/shared/src/engine/fusion";

const cake = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const cast = (skillId: string, targetId?: string) => ({ type: "skill", skillId, stacks: 1, ...(targetId ? { targetId } : {}) } as const);
const kill = (targetId: string, stacks = 1) => ({ type: "attack", attackId: "sha", stacks, targetId } as const);

function advance(state: GameState, phase?: GameState["activeTimingPhase"]): GameState {
  for (let count = 0; state.phase === "action_window" && state.activeTimingPhase !== phase && count < 70; count++) {
    state = advanceActionWindow(state);
  }
  return state;
}

function fixture(ability?: string): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", initialHp: 40, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ instanceId: "star-moon", cardId: STAR_MOON_CARD_ID, ...(ability ? { onlyAbilityId: ability } : {}) }];
  state = advance(startGame(state));
  state.players.forEach((player) => { player.cakes = 12; });
  return state;
}

function turn(state: GameState, ...actions: PlayerAction[]): GameState {
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) {
    if (player.status !== "alive" || state.phase !== "collecting_actions") continue;
    const submitted = submitPlayerAction(state, player.id, actions[index] ?? cake);
    assert.equal(submitted.error, undefined);
    state = submitted.state;
  }
  return state;
}

test("1饼分别获得星或月，异星共振共用星库存，双元素校验两种库存", () => {
  let state = fixture();
  const id = state.players[0]!.id;
  state = advance(turn(state, cast(STAR_MOON_GATHER_STAR)));
  state = advance(turn(state, cast(STAR_MOON_GATHER_MOON)));
  assert.equal(state.players[0]!.cakes, 10);
  assert.equal(getElementAmount(state.players[0], STAR_ELEMENT), 1);
  assert.equal(getElementAmount(state.players[0], MOON_ELEMENT), 1);
  changeElementAmount(state.players[0]!, STAR_ELEMENT, 1);
  assert.equal(validateAction(state, id, cast(STAR_MOON_DANCE)).ok, false);
  changeElementAmount(state.players[0]!, MOON_ELEMENT, 1);
  assert.equal(validateAction(state, id, cast(STAR_MOON_DANCE)).ok, true);
});

test("第一轮即发六芒星和免费辉月，免费辉月可在变招使用且不扣常规冷却", () => {
  let state = fixture();
  const owner = state.players[0]!;
  const stock = (game: GameState) => game.players[0]!.buffs.find(({ stateType }) => stateType === STAR_MOON_HUIYUE_STOCK)?.stacks ?? 0;
  assert.equal(stock(state), 1);
  assert.equal(getActiveSkillCount(owner, "1107"), 2);
  assert.ok(owner.skillInventory?.some(({ skillId, judgmentRank }) => skillId === "1107" && judgmentRank === "IV"));
  assert.ok(owner.skillFusions?.some(({ skillId, judgmentRank }) => skillId === SUN_MOON_STARS_FUSION && (!judgmentRank || judgmentRank === "IV")));
  const opponent = state.players[1]!.id;
  state = advance(turn(state, cast("1081", opponent)), "turn_change_action");
  state = submitActionWindowSkill(state, owner.id, cast(STAR_MOON_FREE_HUIYUE));
  assert.equal(stock(state), 0);
  assert.ok(state.players[0]!.buffs.some((buff) => buff.id === "huiyue_stasis" && buff.sourceJudgmentRank === "IV"));
  assert.ok(!state.players[0]!.buffs.some(({ name }) => name === "闪现冷却"));
  state = advance(state);
  assert.ok(state.players[0]!.buffs.some(({ id }) => id === "sun_moon_shining"));
});

test("变招不熄月莹反弹攻击、清除不良，给攻击者永久半速并加星", () => {
  let state = fixture(STAR_MOON_GLEAM);
  const [owner, attacker] = state.players;
  changeElementAmount(owner!, MOON_ELEMENT, 2);
  state = advance(turn(state, cake, kill(owner!.id)), "turn_change_action");
  state.players[0]!.buffs.push({ id: "frozen", name: "冰冻", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
  state = advance(submitActionWindowSkill(state, owner!.id, cast(STAR_MOON_GLEAM)));
  assert.ok(!state.players[0]!.buffs.some(({ id }) => id === "frozen"));
  assert.equal(getElementAmount(state.players[0], STAR_ELEMENT), 1);
  assert.equal(getElementAmount(state.players[0], MOON_ELEMENT), 0);
  assert.equal(state.players[1]!.hp, 39);
  assert.ok(state.players[1]!.buffs.some(({ stateType, expiresAtRound }) => stateType === STAR_MOON_SLOW && expiresAtRound === undefined));
  assert.equal(getCakeGainAmount(state, state.players.find(({ id }) => id === attacker!.id)), 0.5);
  const marked = state.players[1]!;
  marked.buffs.push({ id: "rapid-creation", name: "快速创造", stateType: "tianmang_cake_growth", stacks: 1 });
  assert.equal(getCakeGainAmount(state, marked), 1.5);
  state = advance(turn(state));
  assert.equal(state.players[1]!.cakes, marked.cakes + 1.5);
});

test("日月星辰只累积融合所得奖励，六次后全场融合解除并禁用主动融合", () => {
  let state = fixture();
  const owner = state.players[0]!.id;
  const opponent = state.players[1]!.id;
  for (let count = 1; count <= 6; count++) {
    const player = state.players[0]!;
    player.cakes = 12;
    state.roundNumber = count * 4;
    player.buffs = player.buffs.filter(({ id }) => id !== "huiyue_stasis");
    if (!player.buffs.some(({ stateType }) => stateType === STAR_MOON_HUIYUE_STOCK)) player.buffs.push({
      id: STAR_MOON_HUIYUE_STOCK, stateType: STAR_MOON_HUIYUE_STOCK, name: "免费辉月", stacks: 1
    });
    state = advance(turn(state, cast("1081", opponent), stone), "turn_change_action");
    state = advance(submitActionWindowSkill(state, owner, cast(STAR_MOON_FREE_HUIYUE)));
    assert.equal(Boolean(state.fusionClosedByStarMoon), count === 6);
  }
  assert.ok(state.players.every((player) => !player.skillFusions?.length));
  assert.equal(validateFusionAction(state, owner, { ...cast("common_fusion"), targetSkillId: getFusionSkillId("辉月") }).ok, false);
});

test("璀璨星芒每招给一月，只有命中才封锁", () => {
  let state = fixture(STAR_MOON_BURST);
  changeElementAmount(state.players[0]!, STAR_ELEMENT, 2);
  appendSkillInstances(state.players[2]!, ["1049"]);
  state = advance(turn(state, cast(STAR_MOON_BURST), stone));
  assert.equal(getElementAmount(state.players[0], MOON_ELEMENT), 1);
  assert.ok(!state.players[1]!.buffs.some(({ sourceAbilityId }) => sourceAbilityId === STAR_MOON_BURST));
  assert.equal(getActiveSkillCount(state.players[2], "1049"), 0);
  assert.ok(state.players[2]!.buffs.some(({ sourceAbilityId, expiresAtRound }) => sourceAbilityId === STAR_MOON_BURST && expiresAtRound === 3));
});

test("月照星河支付两种元素，吸走良好并保留时长", () => {
  let state = fixture(STAR_MOON_RIVER);
  const [owner, target] = state.players;
  changeElementAmount(owner!, STAR_ELEMENT, 1);
  changeElementAmount(owner!, MOON_ELEMENT, 1);
  target!.buffs.push({ id: "wind_haste", stateType: "wind_haste", name: "风·疾行", stacks: 1, startsAtRound: 1, expiresAtRound: 5 });
  state = advance(turn(state, cast(STAR_MOON_RIVER, target!.id), kill(owner!.id)));
  assert.equal(state.players[0]!.hp, 40);
  assert.equal(state.players[1]!.hp, 39);
  assert.ok(!state.players[1]!.buffs.some(({ id }) => id === "wind_haste"));
  assert.equal(state.players[0]!.buffs.find(({ id }) => id === "wind_haste")?.expiresAtRound, 5);
  assert.equal(getElementAmount(state.players[0], MOON_ELEMENT), 0);
});

test("星月狂舞逐个命中目标私下选择整张大卡，未暴露卡不泄漏名称", () => {
  let state = fixture(STAR_MOON_DANCE);
  const [owner, first, second] = state.players;
  first!.bigCards = [{ instanceId: "hidden-first", cardId: "10501" }];
  second!.bigCards = [{ instanceId: "hidden-second", cardId: "10524" }];
  changeElementAmount(owner!, STAR_ELEMENT, 2);
  changeElementAmount(owner!, MOON_ELEMENT, 2);
  state = advance(turn(state, cast(STAR_MOON_DANCE), cake, cake, stone), "turn_damage_modify");
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  assert.deepEqual(toPublicGameState(state, owner!.id).starMoonCardChoices?.map(({ label }) => label), ["未暴露的大卡 1", "未暴露的大卡 1"]);
  assert.equal(toPublicGameState(state, first!.id).starMoonCardChoices, undefined);
  for (const picked of ["hidden-first", "hidden-second"])
    state = submitActionWindowSkill(state, owner!.id, { ...cast(STAR_MOON_CHOOSE_CARD), targetBigCardInstanceId: picked });
  assert.ok(state.players[0]!.buffs.filter(({ stateType }) => stateType === STAR_MOON_TEMPORARY_CARD).length === 2);
  assert.equal(state.players[1]!.bigCards?.[0]?.instanceId, "hidden-first");
  state = advance(state);
  assert.ok(!state.players[0]!.bigCards?.some(({ starMoonTemporary }) => starMoonTemporary));
});

test("穿透跳过八卦阵减伤和闪现，小防仍可防杀", () => {
  let state = fixture(STAR_MOON_PIERCE);
  const [owner, target, other] = state.players;
  appendSkillInstances(target!, ["1049", "1102"]);
  state = advance(turn(state, kill(target!.id, 2)), "turn_change_action");
  state = advance(submitActionWindowSkill(state, target!.id, cast("1102")));
  assert.equal(state.players[1]!.hp, 38);
  state.players[0]!.cakes = 12;
  state = advance(turn(state, kill(other!.id), cake, { type: "defense", defense: "small" }));
  assert.equal(state.players[2]!.hp, 40);
  assert.equal(state.players[0]!.id, owner!.id);
});
