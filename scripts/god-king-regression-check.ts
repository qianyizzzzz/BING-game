import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, ASURA_CARD_ID, ASURA_RAIN_ID, createGame, createPlayer, getBigCard,
  bloodQiNumber, getElementAmount,
  getSaintMoveMultiplier, GOD_KING_CARD_ID, GOD_KING_JUDGMENT_ID, GOD_KING_SAINT_ID, KAIGE_CARD_ID,
  SAND_CARD_ID, SAND_DUST_ID, SAND_ELEMENT, STAR_CARD_ID, TIANMANG_CARD_ID, TIANMANG_CONVERSION_ID, TIANMANG_ELEMENT, TIANMANG_GATHER_ID,
  ULTIMATE_WIND_CARD_ID, WIND_ELEMENT, WIND_SCOUT_ID, startGame, submitActionWindowSkill, submitPlayerAction, submitPointGameAction, toPublicGameState,
  type GameState, type PlayerAction, type PointGameMove
} from "@bing/shared";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const sha = (targetId: string) => ({ type: "attack", attackId: "sha", targetId, stacks: 1 }) as const;
const judgment = (targetId: string) => ({ type: "skill", skillId: GOD_KING_JUDGMENT_ID, targetId, stacks: 1 }) as const;
const card = (state: GameState) => state.players[0]!.bigCards!.find(({ cardId }) => cardId === GOD_KING_CARD_ID)!;

function opening({ collapse = false, kaige = false, lineup = [GOD_KING_CARD_ID] } = {}): GameState {
  let state = addPlayerToGame(createGame("甲", { skillMode: "big_test_select", skillCount: Math.max(3, lineup.length), firstTurnNoAttack: false }), createPlayer("乙"));
  state = addPlayerToGame(state, createPlayer("丙"));
  state.players[0]!.bigCards = lineup.map((cardId) => ({ cardId, instanceId: `test-${cardId}` }));
  if (kaige) state.players[0]!.bigCards.push({ cardId: KAIGE_CARD_ID, instanceId: "kaige" });
  state = startGame(state);
  if (collapse) {
    const player = state.players[1]!;
    appendSkillInstances(player, ["1009"]);
    state = submitActionWindowSkill(state, player.id, { type: "skill", skillId: "1009", stacks: 1 });
  }
  return advanceActionWindow(state);
}

function play(state: GameState, playerId: string, move: PointGameMove): GameState {
  const game = toPublicGameState(state, playerId).pointGame!;
  return submitPointGameAction(state, playerId, { kind: "move", gameId: game.id, round: game.round, move });
}

function drain(state: GameState): GameState {
  for (let n = 0; n < 40 && state.phase === "action_window" && !state.verdictTurn?.opening; n++) state = advanceActionWindow(state);
  return state;
}

function fixture(kaige = false, lineup = [GOD_KING_CARD_ID]): GameState {
  let state = opening({ kaige, lineup });
  const [a, b, c] = state.players.map(({ id }) => id);
  state = play(play(state, a!, "rock"), b!, "scissors");
  state = play(play(state, a!, "rock"), c!, "paper");
  return drain(state);
}

function turn(state: GameState, actions: PlayerAction[]): GameState {
  for (const [index, { id, status }] of state.players.entries()) {
    if (status === "alive") state = submitPlayerAction(state, id, actions[index] ?? cake).state;
  }
  return drain(state);
}

test("开局逐人猜拳，平局重试，记录对手关系和持有者的具体数值", () => {
  let state = opening();
  const [a, b, c] = state.players.map(({ id }) => id);
  const point = toPublicGameState(state, a).pointGame!;
  assert.equal(point.kind, "god_king");
  assert.equal(state.activeTimingPhase, "opening_action");
  assert.equal(point.targetId, b);
  assert.throws(() => play(state, c!, "rock"));
  state = play(state, a!, "rock");
  assert.deepEqual(toPublicGameState(state, b).pointGame?.submittedPlayerIds, [a]);
  assert.ok(!("moves" in toPublicGameState(state, b).pointGame!));
  state = play(state, b!, "rock");
  assert.equal(toPublicGameState(state, a).pointGame?.round, 2);
  state = play(play(state, a!, "rock"), b!, "scissors");
  assert.equal(toPublicGameState(state, a).pointGame?.targetId, c);
  state = play(play(state, a!, "rock"), c!, "paper");
  assert.deepEqual(card(state).godKingProgress?.results, { [b!]: "win", [c!]: "loss" });
  assert.equal(state.roundNumber, 1);
  assert.equal(state.turnNumber, 1);
  assert.equal(state.verdictTurn, undefined);
  const own = toPublicGameState(state, a);
  assert.ok(JSON.stringify(own.statusOverview).includes("1 胜 / 1 负"));
  assert.ok(JSON.stringify(own.statusOverview).includes("第 2 轮圣 ×4"));
  assert.ok(!toPublicGameState(state, b).players[0]!.bigCards?.some((entry) => entry.godKingProgress));
  assert.equal(getBigCard(GOD_KING_CARD_ID)?.implementationStatus, "implemented");
  assert.ok(getBigCard(GOD_KING_CARD_ID)?.abilities.every(({ implementedRules }) => Boolean(implementedRules)));
  assert.deepEqual(state.initialPlayerSnapshots?.[a!]?.bigCards?.[0]?.godKingProgress?.results,
    card(state).godKingProgress?.results);
});

test("整招计攻击次数，防住奖励审判，下一次攻击乘2并在对应回合加饼", () => {
  let state = fixture();
  const [, b] = state.players.map(({ id }) => id);
  state.players[0]!.cakes = 4;
  state = turn(state, [sha(b!), small, cake]);
  assert.equal(card(state).godKingProgress?.attacks, 1);
  assert.equal(card(state).godKingProgress?.misses, 1);
  assert.equal(card(state).abilityUseBonuses?.[GOD_KING_JUDGMENT_ID], 1);
  assert.equal(state.players[0]!.cakes, 5);
  state = turn(state, [sha(b!), cake, cake]);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === b && event.amount === 2));
  assert.equal(card(state).godKingProgress?.attacks, 2);
  assert.equal(state.players[0]!.hp, 24);
  assert.equal(state.roundNumber, 2);
  assert.equal(getSaintMoveMultiplier(state.players[0], GOD_KING_SAINT_ID), 4);
  state.players[0]!.cakes = 1;
  state = turn(state, [{ type: "skill", skillId: GOD_KING_SAINT_ID, stacks: 1 }, cake, cake]);
  assert.equal(state.players[0]!.cakes, 6);
});

test("群攻叠重只计一次攻击，两个目标分别未命中并按档位累加审判", () => {
  let state = fixture();
  state.players[0]!.cakes = 10;
  state = turn(state, [{ type: "attack", attackId: "wan_jian", stacks: 2 }, small, small]);
  assert.equal(card(state).godKingProgress?.attacks, 1);
  assert.equal(card(state).godKingProgress?.misses, 2);
  assert.equal(card(state).abilityUseBonuses?.[GOD_KING_JUDGMENT_ID], 3);
});

test("风、沙、王、异、血、芒同持时资源正常发放，满足资源要求的出招可提交", () => {
  let state = fixture(false, [ULTIMATE_WIND_CARD_ID, SAND_CARD_ID, GOD_KING_CARD_ID, STAR_CARD_ID, ASURA_CARD_ID, TIANMANG_CARD_ID]);
  const [a, b, c] = state.players.map(({ id }) => id);
  const openingView = toPublicGameState(state, a);
  assert.equal(getElementAmount(openingView.players[0], WIND_ELEMENT), 1);
  assert.equal(getElementAmount(openingView.players[0], SAND_ELEMENT), 1);
  state = turn(turn(turn(state, []), []), []);
  state = turn(state, [{ type: "skill", skillId: TIANMANG_GATHER_ID, stacks: 1 }, { ...sha(c!), stacks: 3 }, cake]);
  const viewer = toPublicGameState(state, a).players[0]!;
  assert.equal(getElementAmount(viewer, WIND_ELEMENT), 2);
  assert.equal(getElementAmount(viewer, SAND_ELEMENT), 2);
  assert.equal(getElementAmount(viewer, TIANMANG_ELEMENT), 1);
  assert.equal(bloodQiNumber(viewer), 3);
  for (const [skillId, targetId] of [[WIND_SCOUT_ID, b], [SAND_DUST_ID], [ASURA_RAIN_ID], [TIANMANG_CONVERSION_ID]]) {
    const result = submitPlayerAction(state, a!, { type: "skill", skillId: skillId!, stacks: 1, ...(targetId ? { targetId } : {}) });
    assert.ok(result.state.pendingActions[a!], skillId);
  }
});

test("神王每轮在第 y+1 回合初加饼，按轮内回合结算", () => {
  let state = fixture();
  const [a, b] = state.players.map(({ id }) => id);
  const rewards = (game: GameState) => game.eventLog.flatMap((event) => event.type === "cake_changed" && event.playerId === a &&
    event.reason === "神王审判·回合初加饼" ? [[event.roundNumber, event.turnNumber, event.after - event.before]] : []);
  assert.deepEqual(rewards(state), []);
  state = turn(state, []);
  assert.deepEqual(rewards(state), [[1, 2, 2]]);
  state = turn(state, [cake, cake, sha(b!)]);
  assert.equal(state.roundNumber, 2);
  assert.equal(state.roundTurnNumber, 1);
  assert.deepEqual(rewards(state), [[1, 2, 2]]);
  state = turn(state, []);
  assert.deepEqual(rewards(state), [[1, 2, 2], [2, 2, 2]]);
  assert.equal(card(state).godKingProgress?.lastCakeRewardRound, 2);
  assert.ok(JSON.stringify(toPublicGameState(state, a).statusOverview).includes("本轮已结算"));
});

test("开局声明沦陷时仍完成所有玩点，再执行一次重开", () => {
  let state = opening({ collapse: true });
  const [a, b, c] = state.players.map(({ id }) => id);
  state = play(play(state, a!, "rock"), b!, "scissors");
  assert.equal(state.roundNumber, 1);
  assert.equal(toPublicGameState(state, a).pointGame?.targetId, c);
  state = play(play(state, a!, "rock"), c!, "paper");
  assert.equal(state.roundNumber, 2);
  assert.equal(state.eventLog.filter((event) => event.type === "round_ended").length, 1);
  assert.deepEqual(card(state).godKingProgress?.results, { [b!]: "win", [c!]: "loss" });
});

test("攻击提交后目标丢失，仍计一次整招和一次未命中", () => {
  let state = fixture();
  const [a, b, c] = state.players.map(({ id }) => id);
  state.players[0]!.cakes = 2;
  state = submitPlayerAction(state, a!, sha(b!)).state;
  state = submitPlayerAction(state, b!, cake).state;
  state = submitPlayerAction(state, c!, cake).state;
  assert.equal(state.activeTimingPhase, "turn_change_action");
  state.players[1]!.buffs.push({ id: "test_lost_target", name: "无法被选中", stacks: 1, preventsTargetSelection: true });
  state = drain(state);
  assert.equal(card(state).godKingProgress?.attacks, 1);
  assert.equal(card(state).godKingProgress?.misses, 1);
  assert.equal(state.players[1]!.hp, 18);
});

test("审判命中才翻胜负并直接死亡，判定不记为伤害", () => {
  let state = fixture();
  const [, b] = state.players.map(({ id }) => id);
  assert.throws(() => turn(state, [judgment(b!), cake, cake]));
  card(state).abilityUseBonuses = { [GOD_KING_JUDGMENT_ID]: 2 };
  state = turn(state, [judgment(b!), small, cake]);
  assert.equal(state.players[1]!.status, "alive");
  assert.equal(card(state).godKingProgress?.results[b!], "win");
  state = turn(state, [judgment(b!), cake, cake]);
  assert.equal(state.players[1]!.defeatLevel, 1);
  assert.equal(card(state).godKingProgress?.results[b!], "loss");
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.targetId === b));
  assert.equal(card(state).abilityUses?.[GOD_KING_JUDGMENT_ID], 2);
});

test("反弹只翻最终目标的记录，反给自己时直接死亡且不翻胜负", () => {
  for (const self of [false, true]) {
    let state = fixture();
    const [a, b, c] = state.players.map(({ id }) => id);
    const initial = { ...card(state).godKingProgress!.results };
    card(state).abilityUseBonuses = { [GOD_KING_JUDGMENT_ID]: 1 };
    state.players[1]!.cakes = 2;
    if (self) state.players[0]!.buffs.push({ id: "no_revive", name: "裂魂", stacks: 1 });
    state = turn(state, [judgment(b!), { type: "defense", defense: "rebound", targetId: self ? a! : c! }, cake]);
    assert.equal(state.players[self ? 0 : 2]!.defeatLevel, 1, JSON.stringify(state.eventLog.slice(-16)));
    assert.deepEqual(card(state).godKingProgress!.results, self ? initial : { ...initial, [c!]: "win" });
  }
});

test("审判与对向高等级攻击相互抵消，不翻胜负", () => {
  let state = fixture();
  const [a, b] = state.players.map(({ id }) => id);
  card(state).abilityUseBonuses = { [GOD_KING_JUDGMENT_ID]: 1 };
  state.players[1]!.cakes = 3;
  state = turn(state, [judgment(b!), { ...sha(a!), stacks: 3 }, cake]);
  assert.ok(state.players.every(({ status }) => status === "alive"));
  assert.equal(card(state).godKingProgress?.results[b!], "win");
  assert.ok(state.eventLog.some((event) => event.type === "clash" && event.result.includes("审判令双方攻击抵消")));
});

test("实际受伤按事件奖励，普通死亡回到15血但受裂魂限制，退游单次计数", () => {
  let state = fixture();
  const [a] = state.players.map(({ id }) => id);
  state.players[0]!.hp = 0;
  state.players[1]!.cakes = 2;
  state = turn(state, [cake, sha(a!), cake]);
  assert.ok(state.eventLog.some((event) => event.type === "heal" && event.recoveryKind === "revival" && event.reason === "神王审判"));
  assert.equal(card(state).godKingProgress?.deaths, 1);
  assert.equal(card(state).godKingProgress?.wounds, 1);
  assert.equal(card(state).abilityUseBonuses?.[GOD_KING_JUDGMENT_ID], 1);

  const attacker = state.players[1]!;
  appendSkillInstances(attacker, ["1094"]);
  attacker.cakes = 100;
  state = turn(state, [cake, { type: "skill", skillId: "1094", targetId: a!, stacks: 1 }, cake]);
  assert.equal(state.players[0]!.status, "alive");
  assert.equal(card(state).godKingProgress?.retirements, 1);
  assert.equal(card(state).godKingProgress?.wounds, 1);
  const target = state.players[0]!;
  target.hp = 0;
  delete target.hpValue;
  target.buffs.push({ id: "no_revive", name: "裂魂", stacks: 1 });
  state.players[1]!.cakes = 2;
  state = turn(state, [cake, sha(a!), cake]);
  assert.equal(state.players[0]!.defeatLevel, 1);
  assert.equal(card(state).godKingProgress?.deaths, 2);
});

test("与圣灵凯歌同持时先开放复活响应，审判只记一次死亡", () => {
  let state = fixture(true);
  const [a, b, c] = state.players.map(({ id }) => id);
  const lives = state.players[0]!.spareLives?.length;
  state.players[1]!.cakes = 2;
  state = submitPlayerAction(state, a!, cake).state;
  state = submitPlayerAction(state, b!, sha(a!)).state;
  state = submitPlayerAction(state, c!, cake).state;
  for (let n = 0; n < 20 && state.phase === "action_window" && state.activeTimingPhase !== "revival_action"; n++) {
    state = advanceActionWindow(state);
  }
  assert.equal(state.activeTimingPhase, "revival_action");
  assert.equal(card(state).godKingProgress?.deaths, 1);
  state = advanceActionWindow(state);
  assert.equal(state.players[0]!.hp, 15);
  assert.equal(state.players[0]!.spareLives?.length, lives);
  assert.equal(card(state).godKingProgress?.deaths, 1);
});
