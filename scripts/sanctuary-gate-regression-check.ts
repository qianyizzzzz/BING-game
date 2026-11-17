import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getActiveSkillCount,
  getFusionSkillId, startGame, submitActionWindowSkill, submitPlayerAction,
  HOLY_POTENTIAL_FUSION_ID, SANCTUARY_AURA_ID, SANCTUARY_CARD_ID, SANCTUARY_GATE_ID, SANCTUARY_GATE_STATE,
  SANCTUARY_SWEEP_ID, SANCTUARY_WARD_ID, SANCTUARY_WARD_STATE, type GameState, type PlayerAction
} from "../packages/shared/src";
import { combatValue, INFINITY_VALUE, subtractCombatValues } from "../packages/shared/src/engine/combatValues";
import { getPlayerHpValue } from "../packages/shared/src/engine/infiniteValues";
import { LONE_STAR_CARD_ID, LONE_STAR_FINALE_ID } from "../packages/shared/src/engine/loneStarIds";
import { getOrdinaryDefenseTotal } from "../packages/shared/src/engine/starDragon";
import { validateActionWindowSkill } from "../packages/shared/src/engine/validation";

const cake = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const kill = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
const cast = (skillId: string, targetId?: string) => ({ type: "skill", skillId, stacks: 1, ...(targetId ? { targetId } : {}) } as const);

function advance(state: GameState, phase?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; i < 60 && state.phase === "action_window" && state.activeTimingPhase !== phase; i++)
    state = advanceActionWindow(state);
  return state;
}

function fixture(ability?: string, phase?: GameState["activeTimingPhase"], opponents = ["乙", "丙", "丁"]): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", firstTurnNoAttack: false, initialHp: 40 });
  for (const name of opponents) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ instanceId: "sanctuary", cardId: SANCTUARY_CARD_ID, ...(ability ? { onlyAbilityId: ability } : {}) }];
  state = advance(startGame(state), phase);
  for (const player of state.players) player.cakes = 12;
  return state;
}

function turn(state: GameState, ...actions: PlayerAction[]): GameState {
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) {
    if (player.status !== "alive" || state.phase !== "collecting_actions") continue;
    const response = submitPlayerAction(state, player.id, actions[index] ?? cake);
    assert.equal(response.error, undefined);
    state = response.state;
  }
  return state;
}

test("传承获得两个融合，保留沐浴圣光并发两次治愈术", () => {
  const state = fixture();
  const owner = state.players[0]!;
  assert.ok(owner.skillFusions?.some(({ skillId }) => skillId === HOLY_POTENTIAL_FUSION_ID));
  assert.ok(owner.skillFusions?.some(({ skillId }) => skillId === getFusionSkillId("圣灵觉醒")));
  assert.equal(getActiveSkillCount(owner, "1063"), 2);
  assert.equal(owner.hp, 120);
});

test("圣堂之门石头防，命中后只无效目标打向持有者的那一份", () => {
  let state = fixture(SANCTUARY_GATE_ID);
  const [owner, marked] = state.players;
  state = advance(turn(state, cast(SANCTUARY_GATE_ID, marked!.id), stone));
  assert.ok(!state.players[1]!.buffs.some(({ stateType }) => stateType === SANCTUARY_GATE_STATE));
  const placedOnRound = state.roundNumber;
  state = advance(turn(state, cast(SANCTUARY_GATE_ID, marked!.id)));
  assert.ok(state.players[1]!.buffs.some((buff) => buff.stateType === SANCTUARY_GATE_STATE &&
    buff.sourcePlayerId === owner!.id && buff.expiresAtRound === placedOnRound + 2));
  state = advance(turn(state, cake, { type: "attack", attackId: "wan_jian", stacks: 1 }));
  assert.equal(state.players[0]!.hp, 40);
  assert.ok(state.players[2]!.hp < 40);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === owner!.id &&
    event.protectionName === "圣堂之门" && event.blockKind === "invalid"));
});

test("璨灵圣光叠加次数，并免疫下一笔越过普通防御值的伤害", () => {
  let state = fixture(SANCTUARY_WARD_ID);
  const owner = state.players[0]!.id;
  state = advance(turn(state, cast(SANCTUARY_WARD_ID)));
  state.players[0]!.cakes = 12;
  state = advance(turn(state, cast(SANCTUARY_WARD_ID)));
  const ward = (game: GameState) => game.players[0]!.buffs.find(({ stateType }) => stateType === SANCTUARY_WARD_STATE)?.stacks ?? 0;
  assert.equal(ward(state), 2);
  assert.deepEqual(state.players[0]!.spareLives?.map(({ hp }) => hp), [0, 0]);
  assert.equal(getOrdinaryDefenseTotal(state.players[0]!)[0]?.coefficient, 40);
  state = advance(turn(state, cake, kill(owner)));
  assert.equal(ward(state), 2);
  state.players[1]!.cakes = 100;
  state = advance(turn(state, cake, { type: "attack", attackId: "sha", stacks: 60, targetId: owner }));
  assert.equal(ward(state), 1);
  assert.equal(state.players[0]!.hp, 40);
});

test("璨灵圣光能挡反噬和退游点伤害，直接必杀照常结算", () => {
  let state = fixture(SANCTUARY_WARD_ID, undefined, ["乙"]);
  const [owner, opponent] = state.players;
  appendSkillInstances(owner!, ["1083"]);
  appendSkillInstances(opponent!, ["1094"]);
  opponent!.bigCards = [{ instanceId: "lone-star", cardId: LONE_STAR_CARD_ID, onlyAbilityId: LONE_STAR_FINALE_ID }];
  const wardBlocks = (game: GameState) => game.eventLog.flatMap((event) => event.type === "attack_blocked" &&
    event.targetId === owner!.id && event.protectionName === "璨灵圣光" && event.blockKind === "immune" ? [event.attackName] : []);
  const refill = () => state.players.forEach((player) => { player.cakes = 100; });
  refill();
  state = advance(turn(state, cast(SANCTUARY_WARD_ID)));
  refill();
  state = advance(turn(state, cast("1083", opponent!.id), { type: "defense", defense: "rebound", targetId: owner!.id }));
  assert.deepEqual(wardBlocks(state), ["抠反噬"]);
  refill();
  state = advance(turn(state, cast(SANCTUARY_WARD_ID)));
  refill();
  state = advance(turn(state, cake, cast("1094", owner!.id)));
  assert.deepEqual(wardBlocks(state), ["抠反噬", "卷子"]);
  assert.equal(state.players[0]!.status, "alive");
  refill();
  state = advance(turn(state, cast(SANCTUARY_WARD_ID)));
  refill();
  state = advance(turn(state, cake, cast(LONE_STAR_FINALE_ID, owner!.id)));
  assert.equal(state.players[0]!.defeatLevel, 4);
  assert.deepEqual(wardBlocks(state), ["抠反噬", "卷子"]);
});

test("圣光气是回合前独立行动，本回合绝对无敌，当轮只改攻击值", () => {
  let state = fixture(SANCTUARY_AURA_ID, "turn_before_action");
  const [owner, attacker, target] = state.players;
  assert.equal(state.activeTimingPhase, "turn_before_action");
  for (let i = 0; i < 3; i++) state = submitActionWindowSkill(state, owner!.id, cast(SANCTUARY_AURA_ID));
  assert.equal(validateActionWindowSkill(state, owner!.id, cast(SANCTUARY_AURA_ID)).ok, false);
  state = advance(turn(advance(state), cake, kill(owner!.id), stone));
  assert.equal(state.players[0]!.hp, 40);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.sourceId === attacker!.id &&
    event.targetId === owner!.id && event.blockKind === "invulnerable"));
  state.players[0]!.cakes = 12;
  state = advance(turn(state, kill(target!.id)));
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === target!.id &&
    event.amountValue?.[0]?.exponent === 3));
});

test("圣影流光破的额外法伤只取符合属性的原目标，石头与反弹均不拦法伤", () => {
  let state = fixture(SANCTUARY_SWEEP_ID);
  const [owner, wind, dark, ordinary] = state.players;
  appendSkillInstances(wind!, ["1096"]);
  appendSkillInstances(dark!, ["1043", "1056"]);
  state = advance(turn(state, cast(SANCTUARY_SWEEP_ID), stone,
    { type: "defense", defense: "rebound", targetId: owner!.id }));
  const spell = state.eventLog.flatMap((event) =>
    event.type === "damage" && event.attackName === "圣影流光破·法伤" ? [event.targetId] : []);
  assert.deepEqual(spell.sort(), [wind!.id, dark!.id].sort());
  assert.ok(state.eventLog.some((event) => event.type === "attack_reflected" &&
    event.originalTargetId === dark!.id && event.reflectedTargetId === owner!.id));
  assert.deepEqual(getPlayerHpValue(state.players[1]!), subtractCombatValues(combatValue(40), INFINITY_VALUE));
  assert.equal(state.players.find(({ id }) => id === ordinary!.id)?.hp, 30);
});

test("圣影流光破对撞抵消仍结算两边的独立法伤", () => {
  let state = fixture(SANCTUARY_SWEEP_ID);
  const [owner, opponent] = state.players;
  opponent!.bigCards = [{ instanceId: "another-sanctuary", cardId: SANCTUARY_CARD_ID, onlyAbilityId: SANCTUARY_SWEEP_ID }];
  appendSkillInstances(owner!, ["1014"]);
  appendSkillInstances(opponent!, ["1014"]);
  state = advance(turn(state, cast(SANCTUARY_SWEEP_ID), cast(SANCTUARY_SWEEP_ID), stone, stone));
  assert.ok(state.eventLog.some((event) => event.type === "clash" && event.result.includes("互相抵消")));
  const spells = state.eventLog.flatMap((event) =>
    event.type === "damage" && event.attackName === "圣影流光破·法伤" ? [event.targetId] : []);
  assert.deepEqual(spells.sort(), [owner!.id, opponent!.id].sort());
});

test("整张大卡的属性可触发圣影流光破，闪现只躲攻击", () => {
  let state = fixture(SANCTUARY_SWEEP_ID);
  const target = state.players[1]!;
  target.bigCards = [{ instanceId: "fire-card", cardId: "10501" }];
  appendSkillInstances(target, ["1102"]);
  state = advance(turn(state, cast(SANCTUARY_SWEEP_ID), cake, stone, stone), "turn_change_action");
  state = advance(submitActionWindowSkill(state, target.id, cast("1102")));
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === target.id &&
    event.blockKind === "dodge" && event.attackName === "圣影流光破"));
  assert.deepEqual(getPlayerHpValue(state.players[1]!), subtractCombatValues(combatValue(40), INFINITY_VALUE));
});
