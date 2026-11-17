import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, startGame,
  submitActionWindowSkill, submitPlayerAction, type GameState, type PlayerAction
} from "../packages/shared/src";
import {
  SEA_GOD_ABSOLUTE_STATE, SEA_GOD_CARD_ID, SEA_GOD_DUSK_ID, SEA_GOD_IGNORE_ID, SEA_GOD_TRIDENT_ID
} from "../packages/shared/src/engine/seaGodIds";
import { STAR_WHEEL_CARD, STAR_WHEEL_SEAL } from "../packages/shared/src/engine/starWheelIds";

const cake = { type: "gain_cake" } as const;
const reversal = { type: "skill", skillId: "1092", stacks: 1 } as const;
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
const rebound = (targetId?: string): PlayerAction => ({ type: "defense", defense: "rebound", ...(targetId ? { targetId } : {}) });
const at = (state: GameState, index: number) => state.players[index]!;

function advance(state: GameState, until: GameState["activeTimingPhase"] = "turn_action"): GameState {
  for (let i = 0; i < 80 && state.phase === "action_window" && state.activeTimingPhase !== until; i++)
    state = advanceActionWindow(state);
  return state;
}

function setup(...moves: string[]): GameState {
  let state = createGame("海神", { skillMode: "big_test_select", skillCount: 6, initialHp: 30, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  at(state, 0).bigCards = [SEA_GOD_IGNORE_ID, ...moves].map((id) => ({ cardId: SEA_GOD_CARD_ID, instanceId: id, onlyAbilityId: id }));
  state = advance(startGame(state));
  for (const player of state.players) player.cakes = 20;
  for (const player of state.players) appendSkillInstances(player, ["1092"]);
  return state;
}

function reveal(state: GameState, ...moves: PlayerAction[]): GameState {
  for (const [index, { id }] of state.players.entries())
    state = submitPlayerAction(state, id, moves[index] ?? cake).state;
  assert.equal(state.activeTimingPhase, "turn_change_action");
  return state;
}

function reverse(state: GameState, caster: number): GameState {
  return submitActionWindowSkill(state, at(state, caster).id, reversal);
}

test("对手逆转时，海神发出和接收的攻击保留原方向，其余攻击换向", () => {
  let state = setup();
  const [sea, b, c, d] = state.players;
  state = advance(reverse(reveal(state, sha(b!.id), cake, sha(sea!.id), sha(c!.id)), 1));
  assert.deepEqual(state.players.map((player) => player.hp), [29, 29, 30, 29]);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceId === c!.id && event.targetId === d!.id));
});

test("逆转群攻逐份交换目标，打向海神的部分仍按群攻结算", () => {
  let state = setup();
  const [sea, attacker, other] = state.players;
  state = advance(reverse(reveal(state, cake, { type: "attack", attackId: "wan_jian", stacks: 1 }), 2));
  assert.equal(at(state, 0).hp, 28);
  assert.equal(at(state, 1).hp, 26);
  assert.equal(at(state, 2).hp, 30);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceId === attacker!.id && event.targetId === sea!.id));
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceId === other!.id && event.targetId === attacker!.id));
});

test("海神保留非指向性出招、消耗和收益，第二次逆转只恢复被取消的出招", () => {
  let state = setup(SEA_GOD_DUSK_ID);
  const dusk = { type: "skill", skillId: SEA_GOD_DUSK_ID, stacks: 1 } as const;
  state = reverse(reveal(state, dusk, cake, cake, cake), 1);
  assert.equal(at(state, 0).cakes, 18);
  assert.equal(at(state, 0).bigCards![1]!.abilityUses?.[SEA_GOD_DUSK_ID], 1);
  assert.equal(at(state, 2).cakes, 20);
  state = reverse(state, 0);
  assert.equal(at(state, 0).cakes, 18);
  assert.equal(at(state, 2).cakes, 21);
  state = advance(state);
  assert.ok(at(state, 0).buffs.some((buff) => buff.stateType === SEA_GOD_ABSOLUTE_STATE));
  assert.equal(at(state, 0).bigCards![1]!.abilityUses?.[SEA_GOD_DUSK_ID], 1);
});

test("海神本人使用逆转时，其非指向性出招仍取消并退回消耗", () => {
  let state = setup(SEA_GOD_DUSK_ID);
  const dusk = { type: "skill", skillId: SEA_GOD_DUSK_ID, stacks: 1 } as const;
  state = advance(reverse(reveal(state, dusk), 0));
  assert.equal(at(state, 0).cakes, 20);
  assert.equal(at(state, 0).bigCards![1]!.abilityUses?.[SEA_GOD_DUSK_ID], 0);
  assert.ok(!at(state, 0).buffs.some((buff) => buff.stateType === SEA_GOD_ABSOLUTE_STATE));
});

test("海神的三叉戟保留原方向并使自己获得绝对无敌", () => {
  let state = setup(SEA_GOD_TRIDENT_ID);
  const [sea, target, caster] = state.players;
  state = advance(reverse(reveal(state, { type: "skill", skillId: SEA_GOD_TRIDENT_ID, stacks: 1, targetId: target!.id },
    { type: "defense", defense: "stone" }, sha(sea!.id)), 2));
  assert.ok(at(state, 0).buffs.some((buff) => buff.stateType === SEA_GOD_ABSOLUTE_STATE && buff.sourceAbilityId === SEA_GOD_TRIDENT_ID));
  assert.ok(!at(state, 1).buffs.some((buff) => buff.stateType === SEA_GOD_ABSOLUTE_STATE));
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.sourceId === caster!.id &&
    event.targetId === sea!.id && event.protectionName === "海神三叉戟·绝对无敌"));
});

test("指向海神的反弹保留原方向", () => {
  let state = setup();
  const [sea, defender, caster] = state.players;
  state = advance(reverse(reveal(state, sha(defender!.id), rebound(sea!.id)), 2));
  assert.ok(state.eventLog.some((event) => event.type === "attack_reflected" &&
    event.originalTargetId === defender!.id && event.reflectedTargetId === sea!.id && event.sourceId === sea!.id));
  assert.equal(at(state, 0).hp, 29);
  assert.equal(at(state, 1).hp, 30);
  assert.equal(at(state, 2).id, caster!.id);
});

test("散弹遇到逆转时保留指向海神的一份，其余反弹分别换向", () => {
  let state = setup();
  const [sea, defender, caster, other] = state.players;
  appendSkillInstances(defender!, ["1057"]);
  state = advance(reverse(reveal(state, sha(defender!.id), rebound(), cake, cake), 2));
  const rebounds = state.eventLog.filter((event) => event.type === "attack_reflected");
  assert.equal(rebounds.length, 1);
  assert.equal(rebounds[0]?.originalTargetId, defender!.id);
  assert.equal(rebounds[0]?.reflectedTargetId, sea!.id);
  assert.equal(at(state, 0).hp, 29);
  assert.equal(at(state, 2).hp, 30);
  assert.equal(at(state, 3).id, other!.id);
  assert.equal(at(state, 3).hp, 30);
});

test("星移飞轮封存时，涉及海神的招式按原方向存入", () => {
  let state = setup();
  const [sea, caster, other, last] = state.players;
  caster!.bigCards = [{ cardId: STAR_WHEEL_CARD, onlyAbilityId: STAR_WHEEL_SEAL, instanceId: "wheel" }];
  state = reverse(reveal(state, sha(caster!.id), cake, sha(sea!.id), sha(other!.id)), 1);
  const stored = state.starWheelMoves?.flatMap(({ attacks }) => attacks.map(({ sourceId, targetId }) => [sourceId, targetId]));
  assert.deepEqual(stored, [[sea!.id, caster!.id], [other!.id, sea!.id], [other!.id, last!.id]]);
});

test("对手封存时，海神自己的黄昏照常支付并结算", () => {
  let state = setup(SEA_GOD_DUSK_ID);
  const caster = at(state, 1);
  caster.bigCards = [{ cardId: STAR_WHEEL_CARD, onlyAbilityId: STAR_WHEEL_SEAL, instanceId: "wheel" }];
  state = reverse(reveal(state, { type: "skill", skillId: SEA_GOD_DUSK_ID, stacks: 1 }), 1);
  assert.equal(at(state, 0).cakes, 18);
  assert.equal(at(state, 0).bigCards![1]!.abilityUses?.[SEA_GOD_DUSK_ID], 1);
  state = advance(state);
  assert.ok(at(state, 0).buffs.some(({ stateType }) => stateType === SEA_GOD_ABSOLUTE_STATE));
});
