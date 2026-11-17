import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, beginActionPrompt, createGame, createPlayer,
  getAllSkills, passActionWindow, startGame, submitActionWindowSkill, submitPlayerAction, submitRetirementCounter,
  toPublicGameState, type GameState
} from "@bing/shared";

const cake = { type: "gain_cake" } as const;
const paper = getAllSkills().find(({ name }) => name === "卷子")!.id;
const pastTime = getAllSkills().find(({ name }) => name === "过往时空")!.id;
const player = (state: GameState, index: number) => state.players[index]!;
const remainingUsed = (state: GameState, index: number) => player(state, index).buffs.find(({ id }) => id === "skill_used:1092")?.stacks ?? 0;

function drain(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && !state.retirementCounter && i < 80; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(count = 3, thirdPlayer = false): GameState {
  let state = addPlayerToGame(createGame("甲", { skillMode: "test_select", skillCount: 3, firstTurnNoAttack: false }), createPlayer("乙"));
  if (thirdPlayer) state = addPlayerToGame(state, createPlayer("丙"));
  state = drain(startGame(state));
  for (const actor of state.players) actor.cakes = 50;
  appendSkillInstances(player(state, 0), [paper]);
  for (const actor of state.players.slice(1)) appendSkillInstances(actor, Array(count).fill("1092"));
  return state;
}

function playPaper(state: GameState): GameState {
  state = submitPlayerAction(state, player(state, 0).id, { type: "skill", skillId: paper, stacks: 1, targetId: player(state, 1).id }).state;
  state = submitPlayerAction(state, player(state, 1).id, cake).state;
  return drain(state);
}

test("最后一名对手退游时先开放专属响应，进游花3次逆转并保留技能和状态", () => {
  let state = fixture();
  appendSkillInstances(player(state, 1), ["1066"]);
  player(state, 1).buffs.push(
    { id: "fenjin_test", name: "焚烬", stateType: "fenjin", stacks: 1 },
    { id: "no_revive", name: "裂魂", stacks: 1 }
  );
  const turn = state.turnNumber;
  const round = state.roundNumber;
  state = playPaper(state);
  const target = player(state, 1);
  assert.equal(state.activeTimingPhase, "retirement_counter_action");
  assert.equal(state.roundNumber, round);
  assert.equal(state.turnNumber, turn);
  assert.equal(target.defeatLevel, 2);
  assert.equal(state.winnerIds?.length ?? 0, 0);
  const own = toPublicGameState(state, target.id).retirementCounter!;
  assert.equal(own.remainingReversals, 3);
  assert.equal(toPublicGameState(state, player(state, 0).id).retirementCounter?.remainingReversals, 0);
  const action = { windowId: own.id, kind: "reenter" } as const;
  assert.throws(() => submitRetirementCounter(state, player(state, 0).id, action));
  const returned = submitRetirementCounter(state, target.id, action);
  assert.equal(player(returned, 1).hp, 18);
  assert.equal(player(returned, 1).status, "alive");
  assert.equal(player(returned, 1).defeatLevel, undefined);
  assert.ok(player(returned, 1).buffs.some(({ stateType }) => stateType === "fenjin"));
  assert.ok(player(returned, 1).skills.includes("1066"));
  assert.equal(remainingUsed(returned, 1), 3);
  assert.notEqual(returned.phase, "finished");
  assert.ok(returned.eventLog.some((event) => event.type === "heal" && event.targetId === target.id && event.recoveryKind === "reentry"));
  assert.throws(() => submitRetirementCounter(returned, target.id, action));
});

test("次数不足、进游受限、放弃和超时均保留退游结果", () => {
  const insufficient = playPaper(fixture(2));
  assert.equal(insufficient.phase, "finished");
  assert.equal(insufficient.retirementCounter, undefined);
  const limited = fixture();
  player(limited, 1).buffs.push({ id: "blocked_reentry", name: "禁止进游", stacks: 1, continuationBlocks: ["reentry"] });
  assert.equal(playPaper(limited).phase, "finished");
  for (const abandon of ["pass", "timeout"]) {
    const waiting = playPaper(fixture());
    const returned = abandon === "pass" ? passActionWindow(waiting, player(waiting, 1).id) : advanceActionWindow(waiting);
    assert.equal(returned.phase, "finished");
    assert.equal(player(returned, 1).defeatLevel, 2);
    assert.equal(remainingUsed(returned, 1), 0);
  }
});

test("同一批直接退游给各目标独立选择，一个进游不会关掉另一个窗口", () => {
  let state = fixture(3, true);
  appendSkillInstances(player(state, 0), ["1106"]);
  for (const target of state.players.slice(1)) target.hp = 2;
  const round = state.roundNumber;
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, player(state, 0).id, { type: "skill", skillId: "1106", stacks: 1 });
  const counter = state.retirementCounter!;
  assert.deepEqual(counter.playerIds, state.players.slice(1).map(({ id }) => id));
  assert.equal(state.roundNumber, round);
  const reentered = submitRetirementCounter(state, player(state, 1).id, { windowId: counter.id, kind: "reenter" });
  assert.deepEqual(reentered.retirementCounter?.playerIds, [player(state, 2).id]);
  const resumed = passActionWindow(reentered, player(state, 2).id);
  assert.equal(player(resumed, 1).status, "alive");
  assert.equal(player(resumed, 2).defeatLevel, 2);
  assert.equal(resumed.retirementCounter, undefined);
});

test("过往时空的临时退游也可反制，进游后结束临时离场计时", () => {
  let state = fixture();
  appendSkillInstances(player(state, 1), [pastTime]);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, player(state, 1).id, { type: "skill", skillId: pastTime, stacks: 1 });
  const id = state.retirementCounter!.id;
  state = submitRetirementCounter(state, player(state, 1).id, { windowId: id, kind: "reenter" });
  assert.equal(player(state, 1).status, "alive");
  assert.ok(!player(state, 1).buffs.some(({ name }) => name.includes("小空间：过往时空")));
});

test("开局声明沦陷和过往时空，先完成部署，再合并重开一次", () => {
  let state = addPlayerToGame(createGame("甲", { skillMode: "test_select", skillCount: 6 }), createPlayer("乙"));
  state = addPlayerToGame(state, createPlayer("丙"));
  appendSkillInstances(player(state, 0), ["1009"]);
  appendSkillInstances(player(state, 1), [pastTime, pastTime, "1092", "1092", "1092"]);
  appendSkillInstances(player(state, 2), ["1099"]);
  state = startGame(state);
  const [collapseId, travelerId, thiefId] = state.players.map(({ id }) => id);
  assert.ok(state.pendingSkillChoices?.some(({ playerId }) => playerId === thiefId));

  state = submitActionWindowSkill(state, collapseId!, { type: "skill", skillId: "1009", stacks: 1 });
  state = submitActionWindowSkill(state, travelerId!, { type: "skill", skillId: pastTime, stacks: 1 });
  assert.throws(() => submitActionWindowSkill(state, travelerId!, { type: "skill", skillId: pastTime, stacks: 1 }), /已在开局声明暂时离场/);
  assert.equal(state.activeTimingPhase, "opening_action");
  assert.equal(state.roundNumber, 1);
  assert.equal(player(state, 1).status, "alive");
  assert.ok(!state.players.some((actor) => actor.buffs.some(({ id }) => id.startsWith("collapse_until_round:"))));
  assert.equal(player(state, 0).buffs.find(({ id }) => id === "skill_used:1009")?.stacks, 1);
  assert.equal(player(state, 1).buffs.find(({ id }) => id === `skill_used:${pastTime}`)?.stacks, 1);
  assert.equal(state.retirementCounter, undefined);
  assert.ok(!("openingRoundEffects" in toPublicGameState(state, thiefId)));

  state = advanceActionWindow(state);
  assert.equal(state.activeTimingPhase, "retirement_counter_action");
  assert.equal(state.roundNumber, 1);
  assert.deepEqual(state.retirementCounter?.playerIds, [travelerId]);
  assert.equal(player(state, 2).buffs.find(({ id }) => id === "skill_used:1099")?.stacks, 1);
  assert.ok(!state.pendingSkillChoices?.some(({ playerId }) => playerId === thiefId));

  state = passActionWindow(state, travelerId!);
  assert.equal(state.roundNumber, 2);
  assert.equal(state.turnNumber, 1);
  assert.equal(state.eventLog.filter(({ type }) => type === "round_ended").length, 1);
  assert.equal(state.openingRoundEffects, undefined);
  assert.equal(player(state, 1).defeatLevel, 2);
  assert.equal(player(state, 1).buffs.find(({ name }) => name.includes("小空间：过往时空"))?.stacks, 5);
  assert.ok(player(state, 2).buffs.some(({ id }) => id === "collapse_until_round:2"));
});
