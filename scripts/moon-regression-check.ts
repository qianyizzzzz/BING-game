import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, createGame, createPlayer, startGame, submitPlayerAction,
  type GameState, type PlayerAction
} from "../packages/shared/src";
import { isNaturalMoonAboveHorizon } from "../packages/shared/src/engine/moon";
import { MOON_SHADOW_LOCK } from "../packages/shared/src/engine/moonCombat";
import { MOON_CARD_ID, MOON_GRIEF_ID, MOON_PUNISH_ID, MOON_SHADOW_ID } from "../packages/shared/src/engine/moonIds";
import { getDefenseTotal } from "../packages/shared/src/engine/starDragon";

const cake = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const youtiao = { type: "defense", defense: "youtiao" } as const;
const move = (skillId: string): PlayerAction => ({ type: "skill", skillId, stacks: 1 });

function drain(state: GameState): GameState {
  for (let index = 0; state.phase === "action_window" && index < 80; index++) state = advanceActionWindow(state);
  assert.notEqual(state.phase, "action_window", `结算未离开 ${state.activeTimingPhase}`);
  return state;
}

function game(abilityId: string): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ cardId: MOON_CARD_ID, instanceId: "moon", onlyAbilityId: abilityId }];
  state = drain(startGame(state));
  for (const player of state.players) player.cakes = 36;
  return state;
}

function submit(state: GameState, moves: PlayerAction[]): GameState {
  for (const [index, player] of state.players.entries()) {
    if (state.phase !== "collecting_actions" || player.status !== "alive" || state.pendingActions[player.id]) continue;
    state = submitPlayerAction(state, player.id, moves[index] ?? cake).state;
  }
  return drain(state);
}

function naturalMoon(): number {
  const times = Array.from({ length: 24 }, (_, hour) => Date.UTC(2026, 10, 12, hour));
  const at = times.find(isNaturalMoonAboveHorizon);
  assert.notEqual(at, undefined);
  return at!;
}

test("月怮出招后解除自身不良，群攻由石头防", (context) => {
  context.mock.method(Date, "now", naturalMoon);
  let state = game(MOON_GRIEF_ID);
  const [source, guarded, hit] = state.players;
  source!.buffs.push({ id: "burning:test", stateType: "burning", name: "烧伤", stacks: 1, expiresAtTurn: state.turnNumber + 2 });
  state = submit(state, [move(MOON_GRIEF_ID), stone, cake, stone]);
  assert.ok(!state.players[0]!.buffs.some((buff) => buff.stateType === "burning"));
  assert.equal(state.players[1]!.hp, 18);
  assert.equal(state.players[2]!.hp, 13);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === guarded!.id && event.defense === "stone"));
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === hit!.id && event.attackName === "月怮"));
});

test("月影可油条防并受不良免疫，命中者接下来三回合不能出招", (context) => {
  context.mock.method(Date, "now", naturalMoon);
  let state = game(MOON_SHADOW_ID);
  const [caster, guarded, locked, immune] = state.players;
  const castTurn = state.turnNumber;
  immune!.buffs.push({ id: "temp_negative_status_immunity", name: "免疫不良", stacks: 1, expiresAtTurn: castTurn });
  state = submit(state, [move(MOON_SHADOW_ID), youtiao, cake, cake]);
  assert.ok(!state.players[1]!.buffs.some((buff) => buff.stateType === MOON_SHADOW_LOCK));
  assert.ok(!state.players[3]!.buffs.some((buff) => buff.stateType === MOON_SHADOW_LOCK));
  const lock = state.players[2]!.buffs.find((buff) => buff.stateType === MOON_SHADOW_LOCK);
  assert.equal(lock?.expiresAtTurn, castTurn + 4);
  for (let offset = 1; offset <= 3; offset++) {
    assert.equal(state.turnNumber, castTurn + offset);
    assert.throws(() => submitPlayerAction(state, locked!.id, cake), /月影生效期间不能出招/);
    assert.deepEqual(state.pendingActions[locked!.id]?.actions, []);
    state = submit(state, [cake, cake, cake, cake]);
  }
  assert.equal(state.turnNumber, castTurn + 4);
  assert.doesNotThrow(() => submitPlayerAction(state, locked!.id, cake));
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.sourceId === caster!.id &&
    event.targetId === guarded!.id && event.defense === "youtiao"));
});

test("月罚穿过长期无敌和金钟罩，普通反弹可防，命中是退游点攻击", (context) => {
  context.mock.method(Date, "now", naturalMoon);
  let state = game(MOON_PUNISH_ID);
  const [caster, hit, guarded] = state.players;
  hit!.buffs.push({ id: "temp_absolute_invulnerable", name: "绝对无敌", stacks: 1, expiresAtTurn: state.turnNumber },
    { id: "jin_zhong_zhao", name: "金钟罩", sourcePlayerId: caster!.id, stacks: 1 },
    { id: "defense_value", name: "防御值", stacks: 20 });
  guarded!.buffs.push({ id: "defense_value", name: "防御值", stacks: 10 });
  state = submit(state, [move(MOON_PUNISH_ID), cake, { type: "defense", defense: "rebound", targetId: caster!.id }, cake]);
  assert.equal(state.players[1]!.defeatLevel, 2);
  assert.equal(state.players[2]!.status, "alive");
  assert.ok(state.players[1]!.buffs.some((buff) => buff.id === "jin_zhong_zhao" && buff.stacks === 1));
  for (const player of state.players) {
    assert.equal(player.cakes, 0);
    assert.deepEqual(getDefenseTotal(player), []);
  }
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === hit!.id &&
    event.pointDefeatLevel === 2 && event.attackDamage === true));
});

test("两份相向的月罚按退游等级对撞抵消", (context) => {
  context.mock.method(Date, "now", naturalMoon);
  let state = game(MOON_PUNISH_ID);
  const [first, second] = state.players;
  second!.bigCards = [{ cardId: MOON_CARD_ID, instanceId: "second-moon", onlyAbilityId: MOON_PUNISH_ID }];
  const rebound = { type: "defense", defense: "rebound", targetId: first!.id } as const;
  state = submit(state, [move(MOON_PUNISH_ID), move(MOON_PUNISH_ID), rebound, rebound]);
  assert.equal(state.players[0]!.status, "alive");
  assert.equal(state.players[1]!.status, "alive");
  assert.ok(state.eventLog.some((event) => event.type === "clash" &&
    [event.attackerAId, event.attackerBId].includes(first!.id) &&
    [event.attackerAId, event.attackerBId].includes(second!.id) && event.result.includes("等级相同")));
});
