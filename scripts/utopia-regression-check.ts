import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, canAffectAcrossSpace, createGame, createPlayer, DREAM_ELEMENT, getActiveSkillCount,
  getDreamUnlockCount, getElementAmount, getFusionSkillId, getVisibleStatusOverview, isSleeping, startGame, submitPlayerAction, toPublicGameState,
  UTOPIA_CARD_ID, UTOPIA_FIELD_ID, UTOPIA_MOVE_ID, validateAction,
  type GameState, type PlayerAction, type SkillAction
} from "@bing/shared";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";

const cake = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const cast = (skillId: string, targets: string[] = []): SkillAction => ({
  type: "skill", skillId, stacks: 1,
  ...(targets.length ? { targetId: targets[0]!, targetIds: targets } : {})
});
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
const at = (state: GameState, index = 0) => state.players[index]!;

function drain(state: GameState): GameState {
  for (let n = 0; state.phase === "action_window" && n < 80; n++) state = advanceActionWindow(state);
  return state;
}

function game(count = 5, copies = [0]): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", firstTurnNoAttack: false });
  for (let index = 1; index < count; index++) state = addPlayerToGame(state, createPlayer(`玩家 ${index}`));
  for (const index of copies) at(state, index).bigCards = [{ cardId: UTOPIA_CARD_ID, instanceId: `dream-${index}` }];
  state = drain(startGame(state));
  for (const player of state.players) { player.cakes = 12; player.hp = 40; }
  return state;
}

function play(state: GameState, ...moves: PlayerAction[]): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) {
    if (player.status === "alive" && !state.pendingActions[player.id]) {
      const move = moves[index] ?? cake;
      const legality = validateAction(state, player.id, move);
      assert.ok(legality.ok, JSON.stringify({ move, legality }));
      state = submitPlayerAction(state, player.id, move).state;
    }
  }
  return drain(state);
}

test("一招两人各进独立梦境，只有持有者能跨梦境出招，群攻没有重复结算", () => {
  let state = game(5, [0, 1]);
  assert.equal(getElementAmount(at(state), DREAM_ELEMENT), 1, "第一轮轮前获得梦");
  const [a, b, c, d] = state.players.map(({ id }) => id);
  state = play(state, cast(UTOPIA_MOVE_ID, [b!, c!]));
  assert.ok(at(state, 1).spaceId && at(state, 2).spaceId);
  assert.notEqual(at(state, 1).spaceId, at(state, 2).spaceId);
  assert.equal(at(state, 1).hp, 39);
  assert.equal(at(state, 2).hp, 39);
  assert.equal(at(state).hp, 42);
  assert.ok(canAffectAcrossSpace(state, b!, c!));
  assert.ok(canAffectAcrossSpace(state, a!, c!));
  assert.ok(!canAffectAcrossSpace(state, d!, c!));
  for (const player of state.players) player.cakes = 8;
  assert.ok(!validateAction(state, d!, sha(c!)).ok);
  const crossDream = validateAction(state, b!, sha(c!));
  assert.ok(crossDream.ok, JSON.stringify(crossDream));
  assert.ok(getVisibleStatusOverview(toPublicGameState(state, b!), b!)?.space.some(({ value }) => value.includes("视为在梦中")));

  const { roundNumber, roundTurnNumber } = state;
  state = play(state, { type: "attack", attackId: "wan_jian", stacks: 1 });
  const hits = state.eventLog.filter((event) => event.type === "damage" && event.roundNumber === roundNumber &&
    event.turnNumber === roundTurnNumber && event.sourceId === a);
  assert.equal(hits.length, 4);
  assert.equal(new Set(hits.map((event) => event.type === "damage" && event.targetId)).size, 4);
  assert.ok(state.players.every(({ spaceId }) => !spaceId), "到期轮轮初返回主空间");
});

test("梦之乌托邦可选自己，能被出招反弹防住，也参与无限级对撞", () => {
  let state = game(5, [0, 1]);
  const a = at(state).id, b = at(state, 1).id, c = at(state, 2).id;
  state = play(state, cast(UTOPIA_MOVE_ID, [b, c]), cast(UTOPIA_MOVE_ID, [a]),
    { type: "defense", defense: "rebound", targetId: a });
  assert.ok(state.players.every((player) => !player.spaceId));
  assert.equal(at(state).hp, 40);
  assert.ok(state.eventLog.some((event) => event.type === "clash" && event.result.includes("互相抵消")));

  for (const player of state.players) player.cakes = 8;
  state = play(state, cast(UTOPIA_MOVE_ID, [a, b]));
  assert.ok(at(state).spaceId && at(state, 1).spaceId);
});

test("天梦领域先失去免疫不良再判睡眠，石头可防，受到实际伤害唤醒", () => {
  let state = game();
  const a = at(state).id, b = at(state, 1).id;
  const pureSky = getFusionSkillId("纯净苍穹");
  grantInitializedSkill(state, b, pureSky, "测试免疫");
  at(state, 1).buffs.push({ id: "temp_negative_status_immunity", name: "免疫不良", stacks: 1,
    expiresAtTurn: state.turnNumber, sourceAbilityId: pureSky });
  changeElementAmount(at(state), DREAM_ELEMENT, 5);
  state = play(state, cast(UTOPIA_FIELD_ID), sha(a), stone, stone, stone);
  assert.equal(at(state).hp, 40, "当回合绝对无敌");
  assert.equal(getActiveSkillCount(at(state, 1), pureSky), 0);
  assert.ok(isSleeping(at(state, 1), state.turnNumber));
  assert.ok(!isSleeping(at(state, 2), state.turnNumber));
  assert.deepEqual(state.pendingActions[b]?.actions, []);
  assert.ok(!validateAction(state, b, cake).ok);
  at(state).cakes = 8;
  state = play(state, sha(b));
  assert.equal(at(state, 1).hp, 39);
  assert.ok(!isSleeping(at(state, 1), state.turnNumber));
});

test("群攻不触发失技，单独的无视不良也不会被移除", () => {
  let state = game();
  const a = at(state).id;
  const pureSky = getFusionSkillId("纯净苍穹");
  grantInitializedSkill(state, at(state, 1).id, pureSky, "测试免疫");
  at(state, 1).buffs.push({ id: "temp_negative_status_immunity", name: "免疫不良", stacks: 1,
    expiresAtTurn: state.turnNumber, sourceAbilityId: pureSky });
  at(state, 2).buffs.push({ id: "dominion", name: "霸龙", stateType: "dragon_dominion_protection", stacks: 1,
    expiresAtRound: 10 });
  changeElementAmount(at(state), DREAM_ELEMENT, 5);
  state = play(state, cast(UTOPIA_FIELD_ID), { type: "attack", attackId: "wan_jian", stacks: 1 }, sha(a), stone, stone);
  assert.equal(getActiveSkillCount(at(state, 1), pureSky), 1);
  assert.ok(!isSleeping(at(state, 1), state.turnNumber));
  assert.ok(!isSleeping(at(state, 2), state.turnNumber));
});

test("梦自动兑换四个技能，圣倍增一次获得多梦只回血一次", () => {
  let state = game();
  const owner = at(state);
  changeElementAmount(owner, DREAM_ELEMENT, 18);
  state = play(state, sha(at(state, 1).id));
  assert.equal(getDreamUnlockCount(at(state)), 4);
  for (const id of ["1005", "1004", "1006", "1063"]) assert.equal(getActiveSkillCount(at(state), id), 1);
  const before = at(state).hp;
  const beforeRound = state.roundNumber;
  grantInitializedSkill(state, at(state).id, "1060", "测试圣");
  state = play(state, { ...cast("1060"), stacks: 2, saintElement: DREAM_ELEMENT });
  assert.equal(at(state).hp, before + 1);
  assert.equal(state.roundNumber, beforeRound);
});

test("主空间只剩一人时常规胜利优先，否则全员入梦立即胜利", () => {
  let state = game(3);
  const [a, b, c] = state.players.map(({ id }) => id);
  at(state, 1).buffs.push({ id: "sleep", stateType: "sleep", name: "睡眠", stacks: 10, expiresAtTurn: 20 });
  state.pendingActions[b!] = { actions: [] };
  state = play(state, cast(UTOPIA_MOVE_ID, [a!, c!]));
  assert.equal(state.phase, "finished");
  assert.deepEqual(state.winnerIds, [b]);
  assert.equal(state.victoryCounter, undefined);

  state = game(4);
  const expected = at(state).id;
  for (const player of state.players.slice(1)) {
    player.buffs.push({ id: "sleep", stateType: "sleep", name: "睡眠", stacks: 10, expiresAtTurn: 20 });
    state.pendingActions[player.id] = { actions: [] };
  }
  state = play(state, cast(UTOPIA_MOVE_ID, [expected]));
  assert.equal(state.phase, "finished");
  assert.deepEqual(state.winnerIds, [expected]);
  assert.equal(state.victoryCounter, undefined);

  state = game(2);
  const [owner, opponent] = state.players.map(({ id }) => id);
  state = play(state, cast(UTOPIA_MOVE_ID, [owner!, opponent!]));
  assert.ok(state.players.every(({ spaceId }) => spaceId), "全员进入梦境小空间");
  assert.deepEqual(state.winnerIds, [owner]);
  assert.equal(state.victoryCounter, undefined);
});
