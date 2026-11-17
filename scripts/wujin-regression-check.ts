import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getActiveFusionCount, getFreeMoveChoices,
  getActionLabel, getElementAmount, getWujinReboundCount, startGame, submitPlayerAction, toPublicGameState, validateAction,
  type GameState, type PlayerAction
} from "@bing/shared";
import { getStatusOverview } from "../packages/shared/src/engine/statusOverview";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const sha = (targetId: string, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", stacks, targetId });
const owner = (state: GameState) => state.players[0]!;
const opponent = (state: GameState) => state.players[1]!;

function drain(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && i < 80; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(opponentCard?: string): GameState {
  let state = createGame("A", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false });
  for (const name of ["B", "C", "D"]) state = addPlayerToGame(state, createPlayer(name));
  owner(state).bigCards = [{ cardId: "10512", instanceId: "wujin" }];
  if (opponentCard) opponent(state).bigCards = [{ cardId: opponentCard, instanceId: "opponent" }];
  state = drain(startGame(state));
  for (const player of state.players) { player.hp = 100; player.cakes = 40; }
  return state;
}

function play(state: GameState, ...actions: PlayerAction[]): GameState {
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) {
    const action = actions[index] ?? cake;
    if (player.status !== "alive") continue;
    const validation = validateAction(state, player.id, action);
    assert.ok(validation.ok, JSON.stringify(validation));
    state = submitPlayerAction(state, player.id, action).state;
  }
  return drain(state);
}

test("无尽天垒开局获得实际的山河破碎和弹力球", () => {
  const state = fixture();
  assert.equal(getActiveFusionCount(owner(state), "山河破碎"), 1);
  assert.equal(getActiveFusionCount(owner(state), "弹力球"), 1);
  assert.equal(owner(state).skills.length, 5);
});

test("防住二重杀后仅储存招式与重数，免费重出可选新目标并再次获赠", () => {
  let state = fixture();
  owner(state).buffs.push({ id: "sealed_skill:1041", name: "封锁破地之力", stacks: 1 });
  appendSkillInstances(opponent(state), ["1015"]);
  state = play(state, small, sha(owner(state).id, 2));
  const choices = getFreeMoveChoices(owner(state));
  assert.equal(choices.length, 1);
  const [choice] = choices;
  assert.deepEqual(choice?.move, { type: "attack", attackId: "sha", stacks: 2 });
  assert.ok(getStatusOverview(state, owner(state)).counted.some(({ label, value }) =>
    label === `免费${getActionLabel(choice!.move)}` && value === "剩 1 次"));
  assert.deepEqual(getFreeMoveChoices(toPublicGameState(state, opponent(state).id).players[0]), []);
  owner(state).cakes = 0;
  assert.equal(validateAction(state, owner(state).id,
    { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[2]!.id, freeMoveId: choice!.id }).ok, false);
  const target = state.players[2]!;
  const hp = target.hp;
  state = play(state, { type: "attack", attackId: "sha", stacks: 2, targetId: target.id, freeMoveId: choice!.id });
  assert.equal(state.players[2]!.hp, hp - 2);
  const earned = getFreeMoveChoices(owner(state));
  assert.equal(earned[0]?.remaining, 1);
  assert.notEqual(earned[0]?.id, choice!.id);
});

test("万箭按命中目标逐一奖励，防住和无目标的出饼不奖励出招者", () => {
  let state = fixture();
  state = play(state, cake);
  assert.equal(getFreeMoveChoices(owner(state)).length, 0);
  state = play(state, { type: "attack", attackId: "wan_jian", stacks: 1 }, small);
  assert.deepEqual(getFreeMoveChoices(owner(state)).map(({ remaining, move }) => [remaining, move]),
    [[2, { type: "attack", attackId: "wan_jian", stacks: 1 }]]);
});

test("第四次反弹按实际出招计数，不需要有人攻击，也不扣饼", () => {
  let state = fixture();
  const rebound = (): PlayerAction => ({ type: "defense", defense: "rebound", targetId: opponent(state).id });
  for (let i = 0; i < 3; i++) {
    owner(state).cakes = 2;
    state = play(state, rebound());
    assert.equal(owner(state).cakes, 0);
  }
  owner(state).cakes = 3;
  state = play(state, rebound());
  assert.equal(getWujinReboundCount(owner(state)), 4);
  assert.equal(owner(state).cakes, 3);
  owner(state).cakes = 0;
  assert.equal(validateAction(state, owner(state).id, rebound()).ok, false);
  for (let i = 0; i < 3; i++) {
    owner(state).cakes = 1;
    state = play(state, rebound());
  }
  assert.equal(owner(state).cakes, 0);
  state = play(state, rebound());
  assert.equal(getWujinReboundCount(owner(state)), 8);
});

test("普通反弹只在最终目标结算，原目标没有防住奖励", () => {
  let state = fixture("10512");
  opponent(state).buffs.push({ id: "sealed_skill:1057", name: "封锁散弹", stacks: 1 });
  const terminal = state.players[2]!;
  state = play(state, sha(opponent(state).id), { type: "defense", defense: "rebound", targetId: terminal.id });
  assert.equal(state.players[2]!.hp, terminal.hp - 1);
  assert.deepEqual(getFreeMoveChoices(opponent(state)), []);
  assert.deepEqual(getFreeMoveChoices(owner(state)).map(({ remaining }) => remaining), [1]);
});

test("聚能湮灭炮可跨卡免代价重出并保留独立退游目标效果", () => {
  let state = fixture("10504");
  const skillId = "1050408";
  const granted = { id: "test-cannon", name: "免费出招", stacks: 1,
    freeMove: { type: "skill" as const, skillId, stacks: 1 } };
  owner(state).buffs.push(granted);
  owner(state).cakes = 0;
  assert.equal(getElementAmount(owner(state), "聚"), 0);
  assert.ok(!owner(state).bigCards?.some(({ cardId }) => cardId === "10504"));
  const targetId = opponent(state).id;
  state = play(state, { type: "skill", skillId, stacks: 1, targetIds: [targetId], freeMoveId: granted.id });
  assert.ok((opponent(state).defeatLevel ?? 0) >= 2);
  assert.equal(getElementAmount(owner(state), "聚"), 0);
  assert.ok(!getFreeMoveChoices(owner(state)).some(({ id }) => id === granted.id));
});
