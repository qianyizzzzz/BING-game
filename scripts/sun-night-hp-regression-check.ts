import assert from "node:assert/strict";
import {
  applyHealthAmounts, applyNightHpCap, canRecoverWithHpCap, clearNightHpCap, combatValue, createGame, createPlayer,
  formatCombatValue, getPlayerHpCapValue, getVisibleStatusOverview, INFINITY_VALUE, reduceNightHpCap,
  restorePlayerInitialState, setPlayerHpValue, startGame, toPublicGameState
} from "@bing/shared";

const capped = createPlayer("夜间");
setPlayerHpValue(capped, combatValue(10));
applyNightHpCap(capped);
applyHealthAmounts(capped, 3, 2);
assert.equal(capped.hp, 9);
assert.deepEqual(getPlayerHpCapValue(capped), combatValue(9));
applyHealthAmounts(capped, 3, 0);
applyHealthAmounts(capped, 0, 2);
assert.equal(capped.hp, 6);
assert.deepEqual(getPlayerHpCapValue(capped), combatValue(6));
clearNightHpCap(capped);
assert.equal(capped.hp, 6);
applyHealthAmounts(capped, 0, 2);
assert.equal(capped.hp, 8);

const zero = createPlayer("零血");
setPlayerHpValue(zero, combatValue(5));
applyNightHpCap(zero);
reduceNightHpCap(zero, combatValue(6));
assert.equal(zero.hp, -1);
assert.deepEqual(getPlayerHpCapValue(zero), combatValue(-1));
assert.equal(canRecoverWithHpCap(zero), false);
setPlayerHpValue(zero, combatValue(18));
assert.equal(zero.hp, -1);
applyHealthAmounts(zero, 1, 0);
assert.equal(zero.hp, -2);
assert.deepEqual(getPlayerHpCapValue(zero), combatValue(-2));
clearNightHpCap(zero);
assert.equal(canRecoverWithHpCap(zero), true);

const symbolic = createPlayer("无限血");
setPlayerHpValue(symbolic, INFINITY_VALUE);
applyNightHpCap(symbolic);
reduceNightHpCap(symbolic, combatValue(6));
assert.equal(formatCombatValue(getPlayerHpCapValue(symbolic)!), "∞−6");

let state = createGame("A", { skillMode: "big_test_select" });
state.players.push(createPlayer("B"));
state = startGame(state);
const player = state.players[0]!;
setPlayerHpValue(player, combatValue(4));
applyNightHpCap(player);
assert.equal(restorePlayerInitialState(state, player), true);
assert.equal(player.hp, 4);
const overview = getVisibleStatusOverview(toPublicGameState(state, player.id), player.id);
assert.deepEqual(overview?.lives[0], { label: "血量上限", value: "4 血" });
console.log("ok - night HP cap follows batched changes, limits restores and is visible in life status");
