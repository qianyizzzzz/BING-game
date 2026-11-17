import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, ANNIHILATION_CANNON_ID, appendSkillInstances, createGame, createPlayer, getFusionSkillId, JUNENG_ELEMENT,
  ETERNAL_BIND_ID, ETERNAL_PROGRESS_ID, ETERNAL_REPLACE_ID, ETERNAL_THOUGHT_ID, startGame, submitActionWindowSkill,
  submitPlayerAction, submitVictoryCounter, toPublicGameState, type GameState, type PlayerAction, type SkillAction
} from "../packages/shared/src";
import { clearPlayerBars, setPlayerBar } from "../packages/shared/src/engine/bars";
import { eternalBarId, eternalProgress, eternalReplacementUses, ETERNAL_GUARD, ETERNAL_UNAFFECTED } from "../packages/shared/src/engine/eternalThought";
import { captureRoundStart, rewindPlayers } from "../packages/shared/src/engine/honghuang";
import { negativeStatusesHaveNoEffect } from "../packages/shared/src/engine/effectCategories";
import { applyNegativeStatus } from "../packages/shared/src/engine/negativeStatuses";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";

const gain = { type: "gain_cake" } as const;
const cast = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });
const owner = (state: GameState, index = 0) => state.players[index]!;
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
const progress = (state: GameState) => eternalProgress(owner(state), "card-0-0");

function setProgress(state: GameState, value: number): void {
  setPlayerBar(owner(state), { id: eternalBarId("card-0-0"), kind: "progress", label: "静滞进度", value,
    sourceAbilityId: ETERNAL_PROGRESS_ID });
}

function drain(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; i < 50 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(cards = [["10532"], [], []]): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, firstTurnNoAttack: false });
  for (let i = 1; i < cards.length; i++) state = addPlayerToGame(state, createPlayer(`玩家 ${i}`));
  for (const [i, player] of state.players.entries()) {
    player.bigCards = cards[i]!.map((cardId, j) => ({ cardId, instanceId: `card-${i}-${j}` }));
  }
  state = drain(startGame(state));
  for (const player of state.players) { player.cakes = 10; player.hp = 20; }
  return state;
}

function reveal(state: GameState, ...moves: PlayerAction[]): GameState {
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) if (player.status === "alive")
    state = submitPlayerAction(state, player.id, moves[index] ?? gain).state;
  return drain(state, "turn_change_action");
}

function bind(state: GameState, move: PlayerAction, ...others: PlayerAction[]): GameState {
  state = reveal(state, move, ...others);
  return submitActionWindowSkill(state, owner(state).id, cast(ETERNAL_BIND_ID, { switchActionIndex: 0 }));
}

test("静滞按主空间在场者与实际伤害结算，清条不清次数", () => {
  let state = fixture([["10532"], [], [], []]);
  owner(state, 2).spaceId = "outside";
  owner(state, 3).status = "dead";
  owner(state, 3).defeatLevel = 1;
  state = drain(reveal(state, gain));
  assert.equal(progress(state), 2);
  state = drain(reveal(state, gain, sha(owner(state).id)));
  assert.equal(owner(state).hp, 19);
  assert.equal(progress(state), 2);
  setProgress(state, 10);
  owner(state).cakes = 1;
  state = drain(reveal(state, cast(ETERNAL_THOUGHT_ID)));
  clearPlayerBars(owner(state));
  assert.equal(progress(state), 0);
  assert.equal(eternalReplacementUses(owner(state), "card-0-0"), 1);
});

test("免费续发四重圣灵觉醒，保留重数并与正常出饼并行", () => {
  let state = fixture([["10532", "10514"], [], []]);
  const awakening = getFusionSkillId("圣灵觉醒");
  state = drain(bind(state, cast(awakening, { stacks: 4 })));
  assert.ok(state.eventLog.some((event) => event.type === "cake_changed" && event.playerId === owner(state).id &&
    event.turnNumber === 1 && event.after - event.before === 24));
  assert.equal(progress(state), 6);
  assert.match(toPublicGameState(state, owner(state).id).statusOverview!.continuations[0]!.value, /第 1 回合/);
  assert.throws(() => submitActionWindowSkill(reveal(state, gain), owner(state).id,
    cast(ETERNAL_BIND_ID, { switchActionIndex: 0 })), /静滞进度|当前/);
  owner(state).cakes = 0;
  state = drain(reveal(state, gain));
  assert.equal(owner(state).cakes, 25);
  assert.ok(state.eventLog.some((event) => event.type === "cake_changed" && event.playerId === owner(state).id &&
    event.turnNumber === 2 && event.after - event.before === 24));
});

test("永续反弹免费，正常出饼仍生效", () => {
  let state = fixture();
  const sourceId = owner(state, 1).id;
  state = drain(bind(state, { type: "defense", defense: "rebound", targetId: sourceId }));
  owner(state).cakes = 5;
  state = drain(reveal(state, gain, sha(owner(state).id)));
  assert.equal(owner(state).hp, 20);
  assert.equal(owner(state, 1).hp, 19);
  assert.ok(state.eventLog.some((event) => event.type === "cake_changed" &&
    event.playerId === owner(state).id && event.before === 5 && event.after === 6));
});

test("改招先恢复玩家快照，仅保留此卡静滞进度，并更新快照及次数", () => {
  let state = fixture();
  state = drain(bind(state, gain));
  const firstCheckpoint = owner(state).eternalMoves!["card-0-0"]!.checkpointId;
  setProgress(state, 5100);
  state = drain(reveal(state, cast(ETERNAL_THOUGHT_ID)));
  state = drain(reveal(state, cast(ETERNAL_THOUGHT_ID)));
  assert.equal(eternalReplacementUses(owner(state), "card-0-0"), 2);
  owner(state).cakes = 8;
  setPlayerBar(owner(state), { id: "another", kind: "count", label: "另一条计数条", value: 42 });
  state = reveal(state, { type: "defense", defense: "small" });
  const before = progress(state);
  state = submitActionWindowSkill(state, owner(state).id, cast(ETERNAL_REPLACE_ID, { switchActionIndex: 0 }));
  assert.equal(owner(state).cakes, 11);
  assert.equal(progress(state), before);
  assert.ok(!owner(state).bars?.some(({ id }) => id === "another"));
  assert.equal(eternalReplacementUses(owner(state), "card-0-0"), 1);
  const move = owner(state).eternalMoves!["card-0-0"]!;
  assert.notEqual(move.checkpointId, firstCheckpoint);
  assert.equal(eternalReplacementUses(state.eternalCheckpoints![move.checkpointId]!.player, "card-0-0"), 1);
  assert.ok(!("eternalCheckpoints" in toPublicGameState(state, owner(state).id)));
});

test("本回合主出招所得机会可立即用于变招，时溯仍可恢复静滞进度", () => {
  let state = drain(bind(fixture(), gain));
  setProgress(state, 20);
  state = reveal(state, cast(ETERNAL_THOUGHT_ID));
  assert.equal(eternalReplacementUses(owner(state), "card-0-0"), 1);
  state = submitActionWindowSkill(state, owner(state).id, cast(ETERNAL_REPLACE_ID, { switchActionIndex: 0 }));
  assert.equal(eternalReplacementUses(owner(state), "card-0-0"), 0);
  assert.equal(progress(state), 20);
  delete state.roundStartSnapshots;
  captureRoundStart(state);
  state.roundNumber += 2;
  state.turnNumber += 2;
  setProgress(state, 50);
  rewindPlayers(state, cast("1051804", { targetId: owner(state).id }), owner(state).id);
  assert.equal(progress(state), 20);
});

test("不受不良影响保留已有状态并拦截新增状态，抵挡按实际伤害处理", () => {
  let state = fixture();
  setProgress(state, 2000);
  state = reveal(state, cast(ETERNAL_THOUGHT_ID), sha(owner(state).id));
  assert.ok(owner(state).buffs.some((buff) => buff.id === ETERNAL_GUARD));
  assert.ok(owner(state).buffs.some((buff) => buff.id === ETERNAL_UNAFFECTED));
  owner(state).buffs.push({ id: "sleep", stateType: "sleep", name: "睡眠", stacks: 1 });
  assert.ok(negativeStatusesHaveNoEffect(owner(state)));
  assert.equal(applyNegativeStatus(state, owner(state).id, "sleep", () => assert.fail("不应挂新状态")), false);
  state = drain(state);
  assert.equal(owner(state).hp, 20);
  assert.ok(owner(state).buffs.some(({ id }) => id === "sleep"));
  assert.ok(!negativeStatusesHaveNoEffect(owner(state)));
});

test("抵挡到必杀不拦聚能湮灭炮的非伤害必杀", () => {
  let state = fixture([["10532"], ["10504"], []]);
  setProgress(state, 1000);
  changeElementAmount(owner(state, 1), JUNENG_ELEMENT, 14);
  const random = Math.random;
  Math.random = () => 0;
  try {
    state = drain(reveal(state, cast(ETERNAL_THOUGHT_ID),
      cast(ANNIHILATION_CANNON_ID, { targetIds: [owner(state).id] })));
    assert.equal(owner(state).defeatLevel, 4);
  } finally {
    Math.random = random;
  }
});

test("冻结时即使其他玩家有逆转也立即获胜，计时器停止", () => {
  let state = fixture();
  setProgress(state, 9997);
  appendSkillInstances(owner(state, 1), ["1092"]);
  state = drain(reveal(state, gain));
  assert.equal(state.phase, "finished");
  assert.deepEqual(state.winnerIds, [owner(state).id]);
  assert.equal(state.actionWindowDeadlineAt, undefined);
  assert.equal(state.turnDeadlineAt, undefined);
});

test("进入新轮后仍用该轮回合的伤害事件判定静滞进度", () => {
  let state = fixture();
  state = drain(reveal(state, gain, sha(owner(state).id)));
  assert.equal(state.roundNumber, 2);
  assert.equal(progress(state), 0);
  owner(state, 1).cakes = 1;
  state = drain(reveal(state, gain, sha(owner(state).id)));
  assert.equal(progress(state), 0);
});

test("只有无视冻结者可反制，凑满五次后恢复主局", () => {
  let state = fixture([["10532"], [], [], []]);
  setProgress(state, 99996);
  for (const index of [1, 2]) appendSkillInstances(owner(state, index), Array(5).fill("1092"));
  owner(state, 1).buffs.push({ id: "ignore-freeze", name: "测试无视技能", stacks: 1, ignoredBigCardIds: ["10532"] });
  state = drain(reveal(state, gain), "victory_counter_action");
  assert.equal(state.activeTimingPhase, "victory_counter_action");
  assert.deepEqual(state.actionWindowPlayerIds, [owner(state, 1).id]);
  const claimId = state.victoryCounter!.claims[0]!.id;
  assert.throws(() => submitVictoryCounter(state, owner(state, 2).id, { kind: "contribute", claimId, count: 5 }), /不能反制/);
  state = drain(submitVictoryCounter(state, owner(state, 1).id, { kind: "contribute", claimId, count: 5 }));
  assert.equal(state.phase, "collecting_actions");
  assert.equal(owner(state).defeatLevel, 6);
  assert.equal(state.eternalFrozenPlayerIds, undefined);
});
