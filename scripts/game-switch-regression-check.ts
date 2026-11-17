import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, createGame, createPlayer, GAME_SWITCH_ACTION_ID, GAME_SWITCH_CARD_ID,
  GOD_KING_CARD_ID, startGame, submitPlayerAction, submitPointGameAction, toPublicGameState,
  VERDICT_ACTION_ID, VERDICT_CARD_ID, type GameState, type GameSwitchMode, type PlayerAction, type PointGameMove
} from "@bing/shared";

const cake = { type: "gain_cake" } as const;
const switchTo = (gameSwitchMode: GameSwitchMode) => ({ type: "skill", skillId: GAME_SWITCH_ACTION_ID, stacks: 1, gameSwitchMode }) as const;
const bySeat = (state: GameState, seat: number) => state.players[seat]!;
const cardAt = (state: GameState, seat: number) => bySeat(state, seat).bigCards!.find((card) => card.cardId === GAME_SWITCH_CARD_ID)!;

function fixture(cards: string[][]): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 2, firstTurnNoAttack: false });
  cards.slice(1).forEach((_, index) => { state = addPlayerToGame(state, createPlayer(`玩家${index + 2}`)); });
  cards.forEach((ids, index) => { bySeat(state, index).bigCards = ids.map((cardId) => ({ cardId, instanceId: `${index}-${cardId}` })); });
  return startGame(state);
}

function drain(state: GameState): GameState {
  for (let i = 0; i < 30 && state.phase === "action_window" && !state.gameSwitch && !toPublicGameState(state).pointGame; i++)
    state = advanceActionWindow(state);
  return state;
}

function cast(state: GameState, moves: PlayerAction[]): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  const players = [...state.players].reverse();
  for (const player of players) state = submitPlayerAction(state, player.id, moves[state.players.findIndex(({ id }) => id === player.id)] ?? cake).state;
  return drain(state);
}

function fund(state: GameState, seat: number, cakes: number): void {
  bySeat(state, seat).cakes = cakes;
  const saved = state.preemptiveRestartSnapshot?.players[seat];
  if (saved) saved.cakes = cakes;
}

function point(state: GameState, seat: number, move: PointGameMove): GameState {
  const game = toPublicGameState(state).pointGame!;
  return submitPointGameAction(state, bySeat(state, seat).id, { kind: "move", gameId: game.id, round: game.round, move });
}

test("多项切换按座次启动，退回其他招式，猜拳只给被拉入者沙子", () => {
  let state = drain(fixture([[GAME_SWITCH_CARD_ID], [GAME_SWITCH_CARD_ID, VERDICT_CARD_ID], []]));
  const [a, b, c] = state.players.map(({ id }) => id);
  state.players.forEach((_, seat) => fund(state, seat, 8));
  const sands = bySeat(state, 1).skills.filter((id) => id === "1003").length;
  const turn = state.turnNumber;
  state = cast(state, [switchTo("rock_paper_scissors"), switchTo("basic_bing"), { type: "attack", attackId: "sha", stacks: 1, targetId: a! }]);
  assert.equal(state.gameSwitch?.mode, "rock_paper_scissors");
  assert.deepEqual(state.players.map(({ cakes }) => cakes), [4, 4, 8]);
  assert.deepEqual(state.pendingActions, {});
  assert.ok(!state.eventLog.some((event) => event.type === "damage"));
  assert.equal(bySeat(state, 1).skills.filter((id) => id === "1003").length, sands + 1);
  const deadline = state.gameSwitch.deadlineAt;
  state = point(point(point(state, 0, "rock"), 1, "paper"), 2, "scissors");
  assert.equal(toPublicGameState(state).pointGame?.round, 2);
  assert.equal(state.gameSwitch?.deadlineAt, deadline);
  state = point(point(point(state, 0, "rock"), 1, "scissors"), 2, "scissors");
  assert.equal(state.gameSwitch?.mode, "basic_bing");
  assert.deepEqual(state.gameSwitch.game.players.map(({ hp, cakes, skills }) => [hp, cakes, skills]),
    [[6, 0, []], [6, 0, []], [6, 0, []]]);
  const parentHp = state.players.map(({ hp }) => hp);
  for (const id of [a, b, c]) state = submitPlayerAction(state, id!, cake).state;
  assert.equal(toPublicGameState(state, a).basicGameSwitch?.players[0]?.cakes, 1);
  assert.deepEqual(state.players.map(({ hp }) => hp), parentHp);
  state.gameSwitch!.deadlineAt = 0;
  state = drain(advanceActionWindow(state));
  assert.equal(state.roundNumber, 2);
  assert.equal(state.turnNumber, turn);
  assert.equal(cardAt(state, 0).gameSwitchWins, 2);
  assert.equal(cardAt(state, 1).gameSwitchWins, 1);
  assert.deepEqual(cardAt(state, 0).gameSwitchWinsByMode, { rock_paper_scissors: 1, basic_bing: 1 });
});

test("猜拳输家吸其余输家的血，赢家惩罚造成反噬，切入奖励命时给防御值", () => {
  for (const win of [false, true]) {
    let state = drain(fixture([[GAME_SWITCH_CARD_ID], [], []]));
    fund(state, 0, 4);
    state = cast(state, [switchTo("rock_paper_scissors")]);
    state = point(point(point(state, 0, win ? "rock" : "scissors"), 1, win ? "scissors" : "rock"), 2, "scissors");
    state = drain(state);
    assert.deepEqual(state.players.map(({ hp }) => hp), win ? [18, 14, 14] : [20, 18, 16]);
    if (!win) continue;
    assert.equal(bySeat(state, 0).spareLives?.[0]?.hp, 1);
    bySeat(state, 0).hp = 0;
    bySeat(state, 1).cakes = 1;
    state = drain(cast(state, [cake, { type: "attack", attackId: "sha", targetId: bySeat(state, 0).id, stacks: 1 }]));
    assert.equal(bySeat(state, 0).hp, 1);
    assert.ok(bySeat(state, 0).buffs.some(({ id, stacks }) => id === "defense_value" && stacks === 1));
  }
});

test("神王的猜拳计入同模式三胜，直接结算失败并按 k 发奖", () => {
  let state = drain(fixture([[GAME_SWITCH_CARD_ID, GOD_KING_CARD_ID], [], [], []]));
  for (let seat = 1; seat <= 3; seat++) state = point(point(state, 0, "rock"), seat, "scissors");
  assert.equal(state.phase, "finished");
  assert.equal(state.victoryCounter, undefined);
  assert.deepEqual(state.winnerIds, [bySeat(state, 0).id]);
  assert.ok(state.players.slice(1).every(({ defeatLevel }) => defeatLevel === 6));
  assert.deepEqual(bySeat(state, 0).spareLives?.map(({ hp }) => hp), [1, 4, 4, 9, 9, 9]);
});

test("御秽裁决和切换子局共用猜拳计数，超时只判剩余玩家获胜", () => {
  let state = drain(fixture([[GAME_SWITCH_CARD_ID, VERDICT_CARD_ID], [], []]));
  fund(state, 0, 4);
  state = cast(state, [{ type: "skill", skillId: VERDICT_ACTION_ID, targetId: bySeat(state, 1).id, stacks: 1 }]);
  state = drain(point(point(state, 0, "rock"), 1, "scissors"));
  assert.equal(cardAt(state, 0).gameSwitchWinsByMode?.rock_paper_scissors, 1);

  fund(state, 0, 4);
  state = cast(state, [switchTo("rock_paper_scissors")]);
  state = point(point(point(state, 0, "rock"), 1, "scissors"), 2, "rock");
  assert.equal(state.gameSwitch?.mode, "rock_paper_scissors");
  state.gameSwitch.deadlineAt = 0;
  state = drain(advanceActionWindow(state));
  assert.equal(cardAt(state, 0).gameSwitchWinsByMode?.rock_paper_scissors, 2);
  assert.equal(bySeat(state, 1).hp, 4);
  assert.equal(bySeat(state, 2).hp, 8);
});

test("无技能的饼到时存活者并列，同场达到三胜的持卡者一起获胜", () => {
  let state = fixture([[GAME_SWITCH_CARD_ID], [GAME_SWITCH_CARD_ID], []]);
  for (const seat of [0, 1]) cardAt(state, seat).gameSwitchWinsByMode = { basic_bing: 2 };
  state = drain(state);
  fund(state, 0, 4);
  state = cast(state, [switchTo("basic_bing")]);
  assert.equal(state.gameSwitch?.mode, "basic_bing");
  state.gameSwitch.deadlineAt = 0;
  state = advanceActionWindow(state);
  assert.deepEqual(state.winnerIds, state.players.slice(0, 2).map(({ id }) => id));
  assert.equal(bySeat(state, 2).defeatLevel, 6);
});
