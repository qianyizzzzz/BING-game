import assert from "node:assert/strict";
import { test } from "node:test";
import { addPlayerToGame, addSpectatorToGame, appendSkillInstances, createGame, createPlayer, getRandomBigCardIds, startGame, toPublicGameState } from "../packages/shared/src";
import { restorePlayerInitialState, updateInitialPlayerSnapshot } from "../packages/shared/src/engine/initialPlayerState";
import { restartGameFromYuan } from "../packages/shared/src/engine/yuanRestart";
import { getActiveFusionCount } from "../packages/shared/src/skills/fusion";
import { KAIGE_CARD_ID } from "../packages/shared/src/bigCards/abilities";
import type { GameState } from "../packages/shared/src/types";

function withRolls<T>(rolls: number[], action: () => T): T {
  const previous = Math.random;
  let index = 0;
  let fallback = 114193;
  Math.random = () => rolls[index++] ?? (fallback = (Math.imul(fallback, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  try { return action(); } finally { Math.random = previous; }
}

function startSelected(allowDuplicateBigCards: boolean): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 3, initialHp: 19,
    firstTurnNoAttack: false, allowDuplicateBigCards, bigCardPackIds: ["royal"] });
  state = addPlayerToGame(state, createPlayer("乙", "ai"));
  state.players[0]!.bigCards = [
    { cardId: "10554", instanceId: "yuan-original" },
    { cardId: "10501", instanceId: "owner-draw" },
    { cardId: "10601", instanceId: "owner-keep" }
  ];
  state.players[1]!.bigCards = [
    { cardId: "10502", instanceId: "other-draw" },
    { cardId: "10553", instanceId: "other-keep" },
    { cardId: "10508", instanceId: "other-tail" }
  ];
  return startGame(state);
}

test("太虚之初从开局快照复原房间，在原卡池按 50%／25% 重抽，保留发动卡及未选中的槽", () => {
  let state = startSelected(false);
  const roomId = state.id;
  const sourceId = state.ownerId;
  const otherId = state.players[1]!.id;
  assert.ok(updateInitialPlayerSnapshot(state, sourceId, (initial) => {
    initial.hp = 27;
    initial.cakes = 5;
    initial.buffs.push({ id: "test_custom_initial", name: "自定义初始状态", stacks: 1 });
    appendSkillInstances(initial, ["1014"]);
  }));
  const spectator = createPlayer("旁观", "spectator");
  state = addSpectatorToGame(state, spectator);
  state.players[0]!.name = "改名后的甲";
  state.players[0]!.connected = false;
  state.players[0]!.cakes = 8;
  state.players[0]!.hp = 1;
  state.players[0]!.bigCards = [{ cardId: "10554", instanceId: "yuan-original", initialized: true }];
  state.players[1]!.defeatLevel = 3;
  state.players[1]!.status = "dead";
  state.players[1]!.bigCards = [{ cardId: "10801", instanceId: "acquired-after-opening" }];
  state.players.push(createPlayer("临时造物", "ai"));
  state.phase = "resolving";
  state.roundNumber = 9;
  state.roundTurnNumber = 6;
  state.turnNumber = 31;
  state.smallSpaces = { temporary: { name: "临时空间", expiresAtRound: 12, cakeMultiplier: 1 } };
  state.pendingActions = { [sourceId]: { actions: [{ type: "gain_cake" }] } };
  state.pendingDamageItems = [];
  state.config.bigCardPackIds = ["supreme"]; // The original frozen pool must win over a later config value.
  const result = withRolls([0.4, 0.5, 0.24, 0.25, 0.8, 0.24, 0.3],
    () => restartGameFromYuan(state, sourceId, "yuan-original"));
  assert.ok(result);
  assert.equal(state.id, roomId);
  assert.equal(state.ownerId, sourceId);
  assert.equal(state.phase, "action_window");
  assert.equal(state.activeTimingPhase, "opening_action");
  assert.deepEqual([state.roundNumber, state.roundTurnNumber, state.turnNumber], [1, 1, 1]);
  assert.equal(state.actionWindowDeadlineAt! - state.updatedAt <= 300_000, true);
  assert.deepEqual(Object.keys(state.pendingActions), []);
  assert.equal(state.smallSpaces, undefined);
  assert.equal(state.pendingDamageItems, undefined);
  assert.deepEqual(state.players.map(({ id }) => id), [sourceId, otherId, spectator.id]);
  assert.deepEqual(state.players.map(({ hp, cakes, status }) => [hp, cakes, status]),
    [[27, 5, "alive"], [19, 0, "alive"], [0, 0, "dead"]]);

  const [source, other] = state.players;
  assert.equal(source?.connected, false);
  assert.equal(source?.name, "改名后的甲");
  assert.ok(source?.buffs.some(({ id }) => id === "test_custom_initial"));
  assert.ok(source?.skills.includes("1014"));
  assert.equal(source?.bigCards?.[0]?.instanceId, "yuan-original");
  assert.equal(source?.bigCards?.[2]?.instanceId, "owner-keep");
  assert.equal(other?.bigCards?.[1]?.instanceId, "other-keep");
  assert.equal(other?.bigCards?.[2]?.instanceId, "other-tail");
  assert.notEqual(source?.bigCards?.[1]?.instanceId, "owner-draw");
  assert.notEqual(other?.bigCards?.[0]?.instanceId, "other-draw");
  const replacements = [source?.bigCards?.[1]?.cardId, other?.bigCards?.[0]?.cardId];
  assert.ok(replacements.every((cardId) => cardId && /^105(?:0[1-9]|[12]\d|30)$/.test(cardId)));
  assert.notEqual(replacements[0], replacements[1]);
  assert.equal(getActiveFusionCount(source, "天火之狱"), 0);
  assert.equal(getActiveFusionCount(other, "末世"), 1);
  assert.equal(Object.hasOwn(toPublicGameState(state, sourceId), "openingBigCardDeal"), false);
  assert.equal(toPublicGameState(state, sourceId).players[1]?.bigCards?.length, 0);

  const hand = structuredClone(source?.bigCards);
  source!.bigCards = [];
  assert.ok(restorePlayerInitialState(state, source!));
  assert.deepEqual(source!.bigCards, hand);
});

test("按开局跨玩家重复设置补发，测试牌池不够时保留无法补发的槽位", () => {
  for (const allowDuplicateBigCards of [true, false]) {
    const state = startSelected(allowDuplicateBigCards);
    state.openingBigCardDeal!.pool = ["10503"];
    assert.ok(withRolls([0, 0, 0, 0, 0], () => restartGameFromYuan(state, state.ownerId, "yuan-original")));
    const hands = state.players.map(({ bigCards }) => bigCards!.map(({ cardId }) => cardId));
    assert.deepEqual(hands, [
      ["10554", "10503", "10601"],
      [allowDuplicateBigCards ? "10503" : "10502", "10553", "10508"]
    ]);
  }
});

test("随机大技能模式只重抽选中的槽，重开不重新全员发牌", () => {
  const pool = getRandomBigCardIds(["royal_extra"]);
  let state = createGame("甲", { skillMode: "big_random", skillCount: 1, bigCardPackIds: ["royal_extra"],
    allowDuplicateBigCards: false });
  state = addPlayerToGame(state, createPlayer("乙"));
  const yuanIndex = pool.indexOf("10554");
  const shadowIndex = pool.filter((id) => id !== "10554").indexOf("10553");
  assert.ok(yuanIndex >= 0 && shadowIndex >= 0);
  state = withRolls([(yuanIndex + 0.1) / pool.length, (shadowIndex + 0.1) / (pool.length - 1)],
    () => startGame(state));
  const yuan = state.players[0]!.bigCards![0]!;
  const shadow = state.players[1]!.bigCards![0]!;
  assert.equal(yuan.cardId, "10554");
  assert.equal(shadow.cardId, "10553");

  assert.ok(withRolls([0.24, 0, 0.321], () => restartGameFromYuan(state, state.ownerId, yuan.instanceId)));
  assert.equal(state.players[0]!.bigCards![0]!.instanceId, yuan.instanceId);
  assert.equal(state.players[1]!.bigCards![0]!.cardId, pool.find((id) => id !== "10554"));
  assert.notEqual(state.players[1]!.bigCards![0]!.instanceId, shadow.instanceId);
  assert.notEqual(state.players[1]!.bigCards![0]!.instanceId, yuan.instanceId);
  assert.equal(state.activeTimingPhase, "opening_action");
});

test("重抽加入和移除圣灵凯歌时按新牌重算初始生命和多余命", () => {
  const state = startSelected(false);
  const rerollOtherFirst = [0.9, 0.9, 0.1, 0.9, 0.9, 0, 0.321];
  state.openingBigCardDeal!.pool = [KAIGE_CARD_ID];
  assert.ok(withRolls(rerollOtherFirst, () => restartGameFromYuan(state, state.ownerId, "yuan-original")));
  assert.equal(state.players[1]!.hp, 0);
  assert.equal(state.players[1]!.kaigeLife?.stage, 1);
  assert.equal(state.players[1]!.spareLives?.length, 6);

  state.openingBigCardDeal!.pool = ["10513"];
  assert.ok(withRolls(rerollOtherFirst, () => restartGameFromYuan(state, state.ownerId, "yuan-original")));
  assert.equal(state.players[1]!.hp, 19);
  assert.equal(state.players[1]!.kaigeLife, undefined);
  assert.equal(state.players[1]!.spareLives?.length, 0);
});
