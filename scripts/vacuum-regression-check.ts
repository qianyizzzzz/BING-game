import assert from "node:assert/strict";
import { test } from "node:test";
import { addPlayerToGame, advanceActionWindow, beginActionPrompt, createGame, createPlayer, enterActionWindow,
  ANNIHILATION_CANNON_ID, getActiveFusionCount, getTurnSkillActionCost, grantFreshBigCard,
  startGame, submitActionWindowSkill, submitPlayerAction, validateAction,
  validateActionWindowSkill, type ActionSubmission, type GameState, type SkillAction } from "../packages/shared/src";
import { activateVacuumDodge, antiCakeCount, changeAntiCakes, extraVacuumUses, vacuumCardRank, vacuumMode, vacuumOptions } from "../packages/shared/src/engine/vacuum";
import { ANTI_CAKE_MOVE_ID, VACUUM_CARD_ID, VACUUM_ENTER_ID, VACUUM_EXTRACT_ID, VACUUM_MAX_ID, VACUUM_PROGRESS, VACUUM_SPACE } from "../packages/shared/src/engine/vacuumIds";
import { ordinaryVictoryPlayers } from "../packages/shared/src/engine/gameFactory";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const cardId = "vacuum";
const cast = (skillId: string, extras: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...extras });
const hit = (targetId: string) => ({ type: "attack" as const, attackId: "sha" as const, stacks: 1, targetId });
const useVoid = (vacuumUse: "normal" | "extra") => cast("1102", { vacuumUse, bigCardInstanceId: cardId });

function drain(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && i < 100; i++) state = advanceActionWindow(state);
  return state;
}

function setup(count = 2): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false, initialHp: 18 });
  for (let index = 1; index < count; index++) state = addPlayerToGame(state, createPlayer(`玩家${index + 1}`));
  state.players[0]!.bigCards = [{ cardId: VACUUM_CARD_ID, instanceId: cardId }];
  return drain(startGame(state));
}

function submit(state: GameState, ...moves: ActionSubmission[]): GameState {
  for (const [index, { id }] of state.players.entries()) {
    if (state.players[index]!.status !== "alive") continue;
    const action = moves[index] ?? cake;
    assert.equal(validateAction(state, id, action).ok, true, validateAction(state, id, action).error);
    state = submitPlayerAction(state, id, action).state;
  }
  return state;
}

function use(state: GameState, option: "normal" | "extra"): GameState {
  const id = state.players[0]!.id;
  state = enterActionWindow(state, id);
  assert.equal(validateActionWindowSkill(state, id, useVoid(option)).ok, true);
  return submitActionWindowSkill(state, id, useVoid(option));
}

test("实际授予两项融合，真空涨落把耗空饼后的收益记入其他物品", () => {
  let state = setup();
  const [owner, rival] = state.players;
  assert.equal(getActiveFusionCount(owner, "四大皆空"), 1);
  assert.equal(getActiveFusionCount(owner, "虚无"), 1);
  assert.equal(vacuumMode(state, owner!), "vacuum");
  assert.equal(owner!.cakes, 1);
  state = drain(submit(state, hit(rival!.id), small));
  assert.equal(antiCakeCount(state.players[0]), 1);
  state = drain(submit(state, cast(ANTI_CAKE_MOVE_ID, { targetId: rival!.id }), cake));
  assert.equal(antiCakeCount(state.players[0]), 0);
  assert.equal(state.players[1]!.defeatLevel, 2);
});

test("连续完整三轮后进入绝对真空，实际扣血打断连续状态", () => {
  let state = setup(3);
  const [a, , c] = state.players;
  for (let i = 0; i < 3; i++) {
    state.players[1]!.cakes = 2;
    state = drain(submit(state, cake, hit(c!.id), cake));
  }
  assert.equal(state.roundNumber, 4);
  assert.equal(vacuumMode(state, state.players[0]!), "absolute");
  state.players[1]!.cakes = 2;
  state = drain(submit(state, cake, hit(a!.id), cake));
  assert.equal(state.roundNumber, 5);
  assert.equal(vacuumMode(state, state.players[0]!), "vacuum");
});

test("提取库存可累积，消耗额外次数才升阶，普通虚无退出真空", () => {
  let state = setup();
  for (let i = 0; i < 4; i++) {
    state.players[0]!.cakes = 3;
    state = drain(submit(state, cast(VACUUM_EXTRACT_ID), small));
  }
  assert.equal(extraVacuumUses(state.players[0]!, cardId), 4);
  assert.equal(vacuumCardRank(state, state.players[0]!, cardId), "II");
  state = submit(state, cake, small);
  for (let i = 0; i < 4; i++) state = use(state, "extra");
  assert.equal(vacuumCardRank(state, state.players[0]!, cardId), "III");
  assert.equal(extraVacuumUses(state.players[0]!, cardId), 0);
  assert.equal(vacuumMode(state, state.players[0]!), "vacuum");
  state = use(state, "normal");
  assert.equal(vacuumMode(state, state.players[0]!), undefined);
});

test("遁入虚空先制重开，空间计入人数、提取免费，并于该轮结束时返回", () => {
  let state = setup(3);
  const [a, , c] = state.players;
  state.players[0]!.cakes = 4;
  state.players[1]!.cakes = 1;
  state = drain(submit(state, cast(VACUUM_ENTER_ID), hit(a!.id), cake));
  const owner = state.players[0]!;
  assert.equal(owner.hp, 18);
  assert.equal(state.roundNumber, 2);
  assert.equal(state.smallSpaces?.[owner.spaceId!]?.kind, VACUUM_SPACE);
  assert.equal(ordinaryVictoryPlayers(state).length, 3);
  assert.equal(vacuumMode(state, owner), "absolute");
  assert.equal(getTurnSkillActionCost(owner, cast(VACUUM_EXTRACT_ID), state), 0);
  state.players[1]!.cakes = 1;
  state = drain(submit(state, cast(VACUUM_EXTRACT_ID), hit(c!.id), cake));
  assert.equal(state.players[0]!.spaceId, undefined);
  assert.equal(extraVacuumUses(state.players[0]!, cardId), 1);
});

test("变伤回避按判定阶消除法伤，只统计绝对真空下额外次数的双倍进度", () => {
  let state = setup();
  state.roundNumber = 4;
  state.players[0]!.skillFusions!.find((fusion) => fusion.sourceBigCardInstanceId === cardId && fusion.materialSkillIds.includes("1102"))!.judgmentRank = "V";
  const [owner] = state.players;
  state.pendingDamageItems = [
    { id: "spell-retire", targetId: owner!.id, amount: 1, spellDamage: true, pointDefeatLevel: 2 },
    { id: "spell-vanish", targetId: owner!.id, amount: 1, spellDamage: true, pointDefeatLevel: 3 },
    { id: "attack", targetId: owner!.id, amount: 1, fromAttack: true }
  ];
  beginActionPrompt(state, "turn_damage_modify");
  state = use(state, "normal");
  assert.deepEqual(state.pendingDamageItems?.map(({ id }) => id), ["spell-vanish", "attack"]);
  assert.equal(state.players[0]!.buffs.some((buff) => buff.id.startsWith(VACUUM_PROGRESS)), false);
  state.activeTimingPhase = "turn_change_action";
  state.players[0]!.buffs.push({ id: `vacuum_extra:${cardId}`, name: "额外虚无", stacks: 2 });
  activateVacuumDodge(state, state.players[0]!, cardId, "extra");
  activateVacuumDodge(state, state.players[0]!, cardId, "extra");
  assert.equal(vacuumCardRank(state, state.players[0]!, cardId), "VI");
});

test("变招时的 V 级虚无可回避炮击附带的非伤害退游，IV 级不能", () => {
  const originalRandom = Math.random;
  let calls = 0;
  try {
    Math.random = () => 0.4 + calls++ / 10_000_000;
    for (const rank of ["IV", "V"] as const) {
      let state = setup(3);
      const [a, b] = state.players;
      a!.skillFusions!.find((fusion) => fusion.materialSkillIds.includes("1102"))!.judgmentRank = rank;
      grantFreshBigCard(state, b!, { cardId: "10504", instanceId: "cannon" });
      changeElementAmount(b!, "聚", 14);
      state = submit(state, { type: "defense", defense: "stone" }, cast(ANNIHILATION_CANNON_ID, { targetIds: [a!.id] }),
        { type: "defense", defense: "stone" });
      state = drain(use(state, "normal"));
      assert.equal(state.players[0]!.defeatLevel, rank === "IV" ? 2 : undefined);
    }
  } finally {
    Math.random = originalRandom;
  }
});

test("浩渺真空的 X 仅持续本回合，回合末无饼时获得反饼", () => {
  let state = setup();
  state.roundNumber = 4;
  state.players[0]!.cakes = 2;
  state = submit(state, cast(VACUUM_MAX_ID), small);
  assert.equal(vacuumOptions(state, state.players[0]!)[0]!.rank, "X");
  state = use(state, "normal");
  assert.equal(vacuumMode(state, state.players[0]!), "absolute");
  state = drain(state);
  assert.equal(vacuumCardRank(state, state.players[0]!, cardId), "II");
  assert.equal(antiCakeCount(state.players[0]), 1);
});

test("单笔混付清空后自退游，取消原招，同回合两笔各自纯付正常结算", () => {
  let state = setup();
  state.roundNumber = 4;
  state.players[0]!.cakes = 5;
  changeAntiCakes(state.players[0]!, 3);
  const mixed = { ...hit(state.players[1]!.id), stacks: 2, antiCakeSpent: 1 };
  state = drain(submit(state, mixed, cake));
  assert.equal(state.players[0]!.defeatLevel, 2);
  assert.equal(state.players[0]!.cakes, 0);
  assert.equal(antiCakeCount(state.players[0]), 0);
  assert.equal(state.players[1]!.hp, 18);

  state = setup(3);
  state.roundNumber = 4;
  state.players[0]!.cakes = 1;
  changeAntiCakes(state.players[0]!, 1);
  state = drain(submit(state, { actions: [hit(state.players[1]!.id), { ...hit(state.players[2]!.id), antiCakeSpent: 1 }] }, cake, cake));
  assert.equal(state.players[0]!.status, "alive");
  assert.equal(state.players[1]!.hp, 17);
  assert.equal(state.players[2]!.hp, 17);
});

test("绝影逆魂无视混付的退游并获得逆转，混付招式仍退回", () => {
  let state = setup();
  const [a, b] = state.players;
  state.roundNumber = 4;
  a!.cakes = 5;
  changeAntiCakes(a!, 2);
  grantFreshBigCard(state, a!, { cardId: "10513", instanceId: "jueying", onlyAbilityId: "1051301" });
  state = drain(submit(state, { ...hit(b!.id), stacks: 2, antiCakeSpent: 1 }, cake));
  assert.equal(state.players[0]!.status, "alive");
  assert.equal(state.players[0]!.cakes, 0);
  assert.equal(antiCakeCount(state.players[0]), 0);
  assert.equal(state.players[1]!.hp, 18);
  assert.ok(state.eventLog.some((event) => event.type === "system" && event.message.includes("获得 2 次逆转")));
});
