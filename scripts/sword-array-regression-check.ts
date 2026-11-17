import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, createGame, createPlayer, getMoveBlockReason, getVisibleStatusOverview,
  startGame, submitPlayerAction, toPublicGameState, type GameState, type PlayerAction
} from "../packages/shared/src";
import { combatValue, INFINITY_VALUE } from "../packages/shared/src/engine/combatValues";
import { getPlayerHpValue, setPlayerHpValue } from "../packages/shared/src/engine/infiniteValues";
import { TIGER_CARD, tigerForms } from "../packages/shared/src/engine/netherTigerIds";
import { swordArrays } from "../packages/shared/src/engine/swordArray";
import { absorbBigCardAbility } from "../packages/shared/src/engine/bigCards";
import { getStoredDamages, setStoredDamages } from "../packages/shared/src/engine/storedDamage";
import { STAR_COPY_PLAYER_ID, SWORD_ARRAY_CARD_ID, SWORD_ARRAY_CLEAR_ID, SWORD_ARRAY_DEVOUR_ID, SWORD_ARRAY_EXECUTE_ID,
  SWORD_ARRAY_LIMIT_ID, SWORD_ARRAY_PLACE_ID } from "../packages/shared/src/engine/swordArrayIds";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const move = (skillId: string, targetId: string) => ({ type: "skill", skillId, targetId, stacks: 1 } as const);

function drain(state: GameState): GameState {
  for (let index = 0; state.phase === "action_window" && index < 80; index++) state = advanceActionWindow(state);
  assert.notEqual(state.phase, "action_window", `未退出 ${state.activeTimingPhase}`);
  return state;
}

function game(targetCard?: string): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ cardId: SWORD_ARRAY_CARD_ID, instanceId: "sword" }];
  if (targetCard) state.players[1]!.bigCards = [{ cardId: targetCard, instanceId: "target-card" }];
  return drain(startGame(state));
}

function submit(state: GameState, ...actions: PlayerAction[]): GameState {
  for (const [index, player] of state.players.entries()) {
    if (state.phase !== "collecting_actions" || player.status !== "alive" || state.pendingActions[player.id]) continue;
    state = submitPlayerAction(state, player.id, actions[index] ?? cake).state;
  }
  return drain(state);
}

test("剑阵归目标的其他物品，唯一锁失效后同一目标可持有多份且独立触发星流", (context) => {
  let state = game();
  const [owner, target, ...others] = state.players;
  owner!.cakes = 20;
  const place = move(SWORD_ARRAY_PLACE_ID, target!.id);
  state = submit(state, place);
  assert.equal(swordArrays(state.players[1]).length, 1);
  assert.equal(swordArrays(state.players[1])[0]?.sourcePlayerId, undefined);
  assert.deepEqual(getVisibleStatusOverview(toPublicGameState(state, owner!.id), target!.id)?.items[0],
    { label: "诛仙剑阵", value: "已布阵" });
  assert.throws(() => submitPlayerAction(state, owner!.id, place), /场上已有诛仙剑阵/);
  state.players[0]!.buffs.push({ id: `sealed_skill:${SWORD_ARRAY_LIMIT_ID}`, name: "唯一锁已封印", stacks: 1 });
  state = submit(state, place);
  assert.equal(swordArrays(state.players[1]).length, 2);
  context.mock.method(Math, "random", () => 1.5 / 9);
  state = submit(state, { type: "attack", attackId: "wan_jian", stacks: 1 });
  for (const opponent of [target!, ...others]) {
    const copies = state.eventLog.filter((event) => event.type === "damage" && event.targetId === opponent.id &&
      event.sourceId === STAR_COPY_PLAYER_ID);
    assert.equal(copies.length, 2, opponent.name);
  }
  assert.equal(state.players.length, 4);
});

test("吸来的布阵受他人的唯一锁制约，无主剑阵可被整卡拥有者触发", (context) => {
  let state = game();
  const [whole, holder, target, other] = state.players;
  whole!.cakes = holder!.cakes = 25;
  context.mock.method(Math, "random", () => 0);
  assert.ok(absorbBigCardAbility(state, holder!, whole!));
  assert.equal(holder!.bigCards?.[0]?.onlyAbilityId, SWORD_ARRAY_PLACE_ID);
  state = submit(state, cake, move(SWORD_ARRAY_PLACE_ID, target!.id));
  assert.equal(swordArrays(state.players[2]).length, 1);
  assert.throws(() => submitPlayerAction(state, holder!.id, move(SWORD_ARRAY_PLACE_ID, other!.id)), /场上已有诛仙剑阵/);
  const stock = [{ id: "sword-test-stock", amountValue: combatValue(5) }];
  setStoredDamages(state.players[2]!, stock);
  state = submit(state, cake, { type: "attack", attackId: "sha", stacks: 1, targetId: target!.id });
  assert.deepEqual(getStoredDamages(state.players[2]), stock);
  state.players[0]!.cakes = 1;
  state = submit(state, { type: "attack", attackId: "sha", stacks: 1, targetId: target!.id });
  assert.deepEqual(getStoredDamages(state.players[2]), []);
});

test("吸来的诛灭保留必杀，完整卡在场只额外随机触发，独立太明无效果", (context) => {
  for (const withWhole of [false, true]) {
    let state = game();
    const [owner, target] = state.players;
    owner!.cakes = 30;
    state = submit(state, move(SWORD_ARRAY_PLACE_ID, target!.id));
    const caster = state.players[0]!;
    if (!withWhole) caster.bigCards = [];
    caster.bigCards!.push({ cardId: SWORD_ARRAY_CARD_ID, instanceId: "split-execute", onlyAbilityId: SWORD_ARRAY_EXECUTE_ID },
      { cardId: SWORD_ARRAY_CARD_ID, instanceId: "split-clear", onlyAbilityId: SWORD_ARRAY_CLEAR_ID });
    const stock = [{ id: "execute-test-stock", amountValue: combatValue(5) }];
    setStoredDamages(state.players[1]!, stock);
    const random = context.mock.method(Math, "random", () => 0);
    try {
      state = submit(state, { ...move(SWORD_ARRAY_EXECUTE_ID, target!.id), bigCardInstanceId: "split-execute" });
    } finally {
      random.mock.restore();
    }
    assert.equal(state.players[1]!.defeatLevel, 4);
    assert.deepEqual(getStoredDamages(state.players[1]), withWhole ? [] : stock);
    const results = state.eventLog.filter((event) => event.type === "system" && event.message.includes("诛仙剑阵触发"));
    assert.equal(results.length, Number(withWhole));
  }
});

test("唯一锁生效时同回合的两份布阵只结算第一份", () => {
  let state = game();
  const [first, second, firstTarget, secondTarget] = state.players;
  second!.bigCards = [{ cardId: SWORD_ARRAY_CARD_ID, instanceId: "second-sword" }];
  first!.cakes = second!.cakes = 2;
  state = submit(state, move(SWORD_ARRAY_PLACE_ID, firstTarget!.id), move(SWORD_ARRAY_PLACE_ID, secondTarget!.id));
  assert.equal(swordArrays(state.players[2]).length, 1);
  assert.equal(swordArrays(state.players[3]).length, 0);
  assert.equal(state.players[1]!.cakes, 1);
});

test("圣雷·超越命中后禁止目标在接下来的五个回合出招", (context) => {
  let state = game();
  const targetId = state.players[1]!.id;
  state.players[0]!.cakes = 5;
  state = submit(state, move(SWORD_ARRAY_PLACE_ID, targetId));
  const hitTurn = state.turnNumber;
  context.mock.method(Math, "random", () => 6.5 / 9);
  state = submit(state, { type: "attack", attackId: "sha", stacks: 1, targetId });
  for (let elapsed = 1; elapsed <= 5; elapsed++) {
    assert.equal(state.turnNumber, hitTurn + elapsed);
    assert.match(getMoveBlockReason(state, state.players[1]) ?? "", /眩晕/);
    state = submit(state);
  }
  assert.equal(getMoveBlockReason(state, state.players[1]), undefined);
});

test("洪涛在本次伤害结算前把已排队的普通伤害乘无限", (context) => {
  let state = game();
  const [owner, target] = state.players;
  owner!.cakes = 10;
  state = submit(state, move(SWORD_ARRAY_PLACE_ID, target!.id));
  setPlayerHpValue(state.players[1]!, combatValue(2, 1));
  context.mock.method(Math, "random", () => 8.5 / 9);
  state = submit(state, { type: "attack", attackId: "sha", stacks: 1, targetId: target!.id });
  assert.deepEqual(getPlayerHpValue(state.players[1]!), INFINITY_VALUE);
  const amplified = state.eventLog.find((event) => event.type === "damage" && event.targetId === target!.id &&
    event.attackDamage && !event.pointDefeatLevel);
  assert.ok(amplified?.type === "damage");
  assert.deepEqual(amplified.amountValue, INFINITY_VALUE);
});

test("诛灭可防，命中有阵目标时结算必杀点攻击并触发未封锁的子项", () => {
  let state = game(TIGER_CARD);
  const [owner, target] = state.players;
  owner!.cakes = 35;
  state = submit(state, move(SWORD_ARRAY_PLACE_ID, target!.id));
  setStoredDamages(state.players[1]!, [{ id: "test-stock", amountValue: combatValue(3), fromAttack: true }]);
  const cast = move(SWORD_ARRAY_EXECUTE_ID, target!.id);
  state.players[0]!.bigCards![0]!.lostAbilityIds = [SWORD_ARRAY_DEVOUR_ID];
  state = submit(state, cast, small);
  assert.equal(state.players[1]!.status, "alive");
  assert.equal(getStoredDamages(state.players[1]).length, 1);
  assert.equal(tigerForms(state.players[1]!.bigCards![0]!).cleared, undefined);
  state = submit(state, cast);
  const defeated = state.players[1]!;
  assert.equal(defeated.defeatLevel, 4);
  assert.equal(tigerForms(defeated.bigCards![0]!).cleared, true);
  assert.deepEqual(tigerForms(defeated.bigCards![0]!).available, []);
  assert.equal(swordArrays(defeated).length, 1);
  assert.deepEqual(getStoredDamages(defeated), []);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === target!.id &&
    event.attackDamage && event.pointDefeatLevel === 4 && event.attackName === "诛灭"));
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceId === STAR_COPY_PLAYER_ID &&
    event.targetId === target!.id && event.pointDefeatLevel === 4));
});
