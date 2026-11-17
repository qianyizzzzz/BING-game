import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, attackLevelValue, combatValue, createGame,
  createPlayer, getSkillAttackStats, isSeaGodReturnReady, startGame, submitActionWindowSkill, submitPlayerAction,
  validateAction, type GameState, type PlayerAction, type SkillAction
} from "../packages/shared/src";
import { removeStateCategory, stateHasCategory } from "../packages/shared/src/engine/effectCategories";
import {
  SEA_GOD_ABSOLUTE_STATE, SEA_GOD_CARD_ID, SEA_GOD_DUSK_ID, SEA_GOD_RETURN_ID, SEA_GOD_TRIDENT_ID, SEA_GOD_WAVES_ID,
  SEA_GOD_WAVES_STATE
} from "../packages/shared/src/engine/seaGodIds";

const cake = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const skill = (skillId: string, targetId?: string): SkillAction => ({
  type: "skill", skillId, stacks: 1, ...(targetId ? { targetId } : {})
});
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", stacks: 1, targetId });

function drain(state: GameState): GameState {
  for (let i = 0; i < 80 && state.phase === "action_window"; i++) state = advanceActionWindow(state);
  return state;
}

function setup(...abilities: string[]): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, initialHp: 30, firstTurnNoAttack: false });
  state = addPlayerToGame(state, createPlayer("乙"));
  state = addPlayerToGame(state, createPlayer("丙"));
  state.players[0]!.bigCards = abilities.map((id) => ({ instanceId: id, cardId: SEA_GOD_CARD_ID, onlyAbilityId: id }));
  state = drain(startGame(state));
  for (const player of state.players) player.cakes = 5;
  return state;
}

function submit(state: GameState, ...moves: PlayerAction[]): GameState {
  for (const [index, { id }] of state.players.entries())
    state = submitPlayerAction(state, id, moves[index] ?? cake).state;
  return state;
}

test("无定风波是无限三次方级非攻击，反弹只挡且会消耗限定次数", () => {
  let state = setup(SEA_GOD_WAVES_ID);
  const [caster, target, other] = state.players;
  const stats = getSkillAttackStats(SEA_GOD_WAVES_ID, 1)!;
  assert.equal(stats.nonAttackMove, true);
  assert.deepEqual(attackLevelValue(stats), combatValue(1, 3));
  state = drain(submit(state, skill(SEA_GOD_WAVES_ID, target!.id),
    { type: "defense", defense: "rebound", targetId: other!.id }));
  assert.equal(state.players[0]!.bigCards![0]!.abilityUses?.[SEA_GOD_WAVES_ID], 1);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.defense === "rebound" &&
    event.sourceId === caster!.id && event.targetId === target!.id && event.attackName === "无定风波"));
  assert.ok(state.players.every((player) => !player.buffs.some((buff) => buff.stateType === SEA_GOD_WAVES_STATE)));
  assert.ok(!state.eventLog.some((event) => event.type === "attack_reflected" && event.attackName === "无定风波"));
  state.players[0]!.bigCards![0]!.abilityUses![SEA_GOD_WAVES_ID] = 8;
  assert.equal(validateAction(state, caster!.id, skill(SEA_GOD_WAVES_ID, target!.id)).ok, false);
});

test("无定风波的不良从下一回合生效，照常支付但使出招无效，可解除", () => {
  let state = setup(SEA_GOD_WAVES_ID);
  const [caster, target, other] = state.players;
  const round = state.roundNumber;
  const initialTurn = state.turnNumber;
  state = drain(submit(state, skill(SEA_GOD_WAVES_ID, target!.id), sha(other!.id)));
  assert.equal(state.players[2]!.hp, 29);
  const afflicted = state.players[1]!;
  const status = afflicted.buffs.find((buff) => buff.stateType === SEA_GOD_WAVES_STATE);
  assert.ok(status && stateHasCategory(status, "negative"));
  assert.equal(status.expiresAtRound, round + 4);
  assert.equal(status.moveBlockedFromTurn, initialTurn + 1);
  afflicted.cakes = 2;
  assert.equal(validateAction(state, target!.id, sha(caster!.id)).ok, true);
  state = drain(submit(state, cake, sha(caster!.id)));
  assert.equal(state.players[1]!.cakes, 1);
  assert.equal(state.players[0]!.hp, 30);
  assert.ok(state.eventLog.some((event) => event.type === "system" && event.message.includes("因无定风波无效")));
  removeStateCategory(state.players[1]!, "negative");
  state = drain(submit(state, cake, sha(caster!.id)));
  assert.equal(state.players[0]!.hp, 29);
});

test("一去不返每份实例从使用轮起独立冷却三轮", () => {
  let state = setup(SEA_GOD_RETURN_ID);
  const caster = state.players[0]!;
  const target = state.players[1]!;
  const round = state.roundNumber;
  state = drain(submit(state, skill(SEA_GOD_RETURN_ID, target.id), stone));
  const owner = state.players[0]!;
  assert.equal(state.players[1]!.hp, 30);
  assert.equal(isSeaGodReturnReady(owner, round + 1), false);
  assert.equal(isSeaGodReturnReady(owner, round + 2), false);
  assert.equal(isSeaGodReturnReady(owner, round + 3), true);
  assert.equal(validateAction(state, caster.id, skill(SEA_GOD_RETURN_ID, target.id)).ok, false);
  assert.equal(owner.cakes, 5);
});

test("无定风波也使出招阶段提交的自爆无效", () => {
  let state = setup(SEA_GOD_WAVES_ID);
  const [caster, target] = state.players;
  state = drain(submit(state, skill(SEA_GOD_WAVES_ID, target!.id)));
  const round = state.roundNumber;
  state = drain(submit(state, cake, { type: "defense", defense: "self_destruct" }));
  assert.equal(state.roundNumber, round);
  assert.equal(state.players[0]!.hp, caster!.hp);
  assert.equal(state.players[1]!.hp, target!.hp);
  assert.ok(!state.eventLog.some((event) => event.type === "system" && event.message.includes("主动自爆")));
});

test("三叉戟被石头防住仍赋予良好绝对无敌，可清除", () => {
  let state = setup(SEA_GOD_TRIDENT_ID);
  const [caster, target, other] = state.players;
  const round = state.roundNumber;
  state = drain(submit(state, skill(SEA_GOD_TRIDENT_ID, target!.id), stone, sha(caster!.id)));
  const owner = state.players[0]!;
  const invulnerability = owner.buffs.find((buff) => buff.stateType === SEA_GOD_ABSOLUTE_STATE);
  assert.ok(invulnerability && stateHasCategory(invulnerability, "positive"));
  assert.equal(invulnerability.expiresAtRound, round + 4);
  assert.equal(owner.hp, 30);
  assert.equal(state.players[1]!.hp, 30);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.sourceId === other!.id &&
    event.blockKind === "invulnerable" && event.protectionName === "海神三叉戟·绝对无敌"));
  removeStateCategory(owner, "positive");
  state = drain(submit(state, cake, stone, sha(caster!.id)));
  assert.equal(state.players[0]!.hp, 29);
});

test("黄昏用饼和限定次数取得到下十二轮末的绝对无敌，逆转退还", () => {
  let state = setup(SEA_GOD_DUSK_ID);
  const [caster, target] = state.players;
  const reversalId = "1092";
  appendSkillInstances(target!, [reversalId]);
  const round = state.roundNumber;
  state = submit(state, skill(SEA_GOD_DUSK_ID));
  assert.equal(state.players[0]!.cakes, 3);
  assert.equal(state.players[0]!.bigCards![0]!.abilityUses?.[SEA_GOD_DUSK_ID], 1);
  state = drain(submitActionWindowSkill(state, target!.id, skill(reversalId)));
  assert.equal(state.players[0]!.cakes, 5);
  assert.equal(state.players[0]!.bigCards![0]!.abilityUses?.[SEA_GOD_DUSK_ID], 0);
  assert.ok(!state.players[0]!.buffs.some((buff) => buff.stateType === SEA_GOD_ABSOLUTE_STATE));
  state = drain(submit(state, skill(SEA_GOD_DUSK_ID), sha(caster!.id)));
  const owner = state.players[0]!;
  assert.equal(owner.hp, 30);
  assert.equal(owner.buffs.find((buff) => buff.stateType === SEA_GOD_ABSOLUTE_STATE)?.expiresAtRound, round + 13);
  owner.bigCards![0]!.abilityUses![SEA_GOD_DUSK_ID] = 3;
  assert.equal(validateAction(state, caster!.id, skill(SEA_GOD_DUSK_ID)).ok, false);
});
