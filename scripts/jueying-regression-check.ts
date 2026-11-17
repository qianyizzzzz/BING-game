import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, beginActionPrompt, createGame, createPlayer,
  getActiveFusionCount, getAllSkills, getBigCard, getSkillUseLimit, restorePlayerInitialState, startGame, submitActionWindowSkill,
  submitPlayerAction, submitVictoryCounter, toPublicGameState, type GameState, type PlayerAction
} from "@bing/shared";
import { getAttackFieldBlocker } from "../packages/shared/src/engine/attackFields";
import { BASE_ATTACKS, getStackedAttackStats } from "../packages/shared/src/engine/attacks";
import { resolveOrdinaryHealing } from "../packages/shared/src/engine/healing";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";

const cake = { type: "gain_cake" } as const;
const shadow = (state: GameState) => state.players[0]!;
const player = (state: GameState, index: number) => state.players[index]!;
const cast = (skillId: string) => ({ type: "skill", skillId, stacks: 1 } as const);
const used = (state: GameState, index: number) => player(state, index).buffs.find(({ id }) => id === "skill_used:1092")?.stacks ?? 0;

function drain(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && !state.victoryCounter && i < 80; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(otherCard?: string): GameState {
  let state = createGame("暗", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  shadow(state).bigCards = [{ cardId: "10513", instanceId: "shadow" }];
  if (otherCard) player(state, 1).bigCards = [{ cardId: otherCard, instanceId: "other" }];
  state = drain(startGame(state));
  for (const actor of state.players) { actor.hp = 100; actor.cakes = 100; }
  return state;
}

function play(state: GameState, ...actions: PlayerAction[]): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  for (const [index, actor] of state.players.entries()) if (actor.status === "alive")
    state = submitPlayerAction(state, actor.id, actions[index] ?? cake).state;
  return drain(state);
}

function declareVictory(state: GameState, index: number, id = "instant_win:bailian"): GameState {
  player(state, index).buffs.push({ id, name: "测试技能胜利", stacks: 1 });
  beginActionPrompt(state, "turn_before_action");
  return advanceActionWindow(state);
}

test("绝影逆魂标为已实现，第二和第三条的两种说明均省去先制", () => {
  const card = getBigCard("10513")!;
  assert.equal(card.implementationStatus, "implemented");
  for (const ability of card.abilities.slice(1, 3)) {
    assert.doesNotMatch(ability.description, /先制/);
    assert.ok(ability.implementedRules);
    assert.doesNotMatch(ability.implementedRules, /先制|部分实现/);
  }
});

test("发放真实技能；自己的攻击无视两种光暗场域；阻止点退游与直接退游，各增加2次逆转", () => {
  let state = fixture("10510");
  for (const fusion of ["暗影之魂", "逆转星移", "弹力球"]) assert.equal(getActiveFusionCount(shadow(state), fusion), 1);
  assert.ok(shadow(state).skills.includes("1005") && shadow(state).skills.includes("1043"));
  const sha = getStackedAttackStats(BASE_ATTACKS.sha, 1);
  assert.equal(getAttackFieldBlocker(state, player(state, 1).id, sha)?.skillId, "1043");
  assert.equal(getAttackFieldBlocker(state, shadow(state).id, sha), undefined);
  shadow(state).hp = 2;
  beginActionPrompt(state, "turn_before_action");
  state = drain(submitActionWindowSkill(state, player(state, 1).id, cast("1106")));
  assert.equal(shadow(state).status, "alive");
  assert.equal(shadow(state).hp, 2);
  assert.equal(getSkillUseLimit(shadow(state), "1092"), 3);
  player(state, 1).cakes = 100;
  const paper = getAllSkills().find(({ name }) => name === "卷子")!.id;
  appendSkillInstances(player(state, 1), [paper]);
  state = play(state, cake, { ...cast(paper), targetId: shadow(state).id });
  assert.equal(shadow(state).status, "alive");
  assert.equal(shadow(state).hp, 2);
  assert.equal(getSkillUseLimit(shadow(state), "1092"), 5);
});

test("存活时禁止他人普通回血与初始快照恢复；本条自身必定成立时也限制自己", () => {
  const state = fixture("10502");
  const other = player(state, 1);
  assert.equal(resolveOrdinaryHealing(state, other.id, 3, false)?.suppressed, true);
  assert.equal(resolveOrdinaryHealing(state, shadow(state).id, 3, false)?.suppressed, false);
  assert.equal(restorePlayerInitialState(state, other), false);
  shadow(state).buffs.push({ id: "test_must_resolve", name: "必定成立", stacks: 1,
    sourceAbilityId: "1051302", moveResolution: { mustResolve: true } });
  assert.equal(resolveOrdinaryHealing(state, shadow(state).id, 3, false)?.suppressed, true);
  assert.equal(restorePlayerInitialState(state, shadow(state)), false);
});

test("死亡期间群攻攻击无效，群体法伤照常；累计10回血后满血重开，下一轮夺取并结算逆转", () => {
  let state = fixture("10504");
  Object.assign(shadow(state), { status: "dead", defeatLevel: 1, hp: -1 });
  const firstHp = player(state, 2).hp;
  state = play(state, cake, { type: "attack", attackId: "wan_jian", stacks: 1 });
  assert.equal(player(state, 2).hp, firstHp);
  changeElementAmount(player(state, 1), "聚", 2);
  state = play(state, cake, cast("1050404"));
  assert.equal(player(state, 2).hp, firstHp - 20);
  assert.equal(shadow(state).status, "dead");
  appendSkillInstances(player(state, 1), ["1013"]);
  appendSkillInstances(player(state, 2), ["1013"]);
  const beforeRevival = state.roundNumber;
  beginActionPrompt(state, "turn_before_action");
  state = drain(submitActionWindowSkill(state, player(state, 1).id, cast("1013")));
  assert.equal(shadow(state).status, "alive");
  assert.equal(shadow(state).hp, 18);
  assert.equal(state.roundNumber, beforeRevival + 1);
  assert.equal(shadow(state).buffs.find(({ stateType }) => stateType === "jueying_harvest")?.expiresAtRound, state.roundNumber + 1);
  const otherHp = player(state, 2).hp;
  beginActionPrompt(state, "turn_before_action");
  state = drain(submitActionWindowSkill(state, player(state, 2).id, cast("1013")));
  assert.equal(player(state, 2).hp, otherHp);
  assert.equal(shadow(state).hp, 32);
  assert.equal(getSkillUseLimit(shadow(state), "1092"), 4);
});

test("技能胜利可转移，原投入退回；新目标累计5次逆转后判第六阶失败，余下玩家继续", () => {
  let state = fixture();
  for (const [index, count] of [[0, 1], [2, 3], [3, 2]] as const)
    appendSkillInstances(player(state, index), Array(count).fill("1092"));
  state = declareVictory(state, 1);
  assert.equal(state.activeTimingPhase, "victory_counter_action");
  const old = state.victoryCounter!.claims[0]!.id;
  state = submitVictoryCounter(state, player(state, 2).id, { kind: "contribute", claimId: old, count: 3 });
  assert.equal(toPublicGameState(state, player(state, 3).id).victoryCounter!.claims[0]!.contributions[player(state, 2).id], 3);
  state = submitVictoryCounter(state, shadow(state).id, { kind: "transfer", claimId: old });
  const replacement = state.victoryCounter!.claims[0]!;
  assert.equal(replacement.playerId, shadow(state).id);
  assert.deepEqual(replacement.contributions, {});
  assert.equal(used(state, 0), 2);
  assert.equal(used(state, 2), 0);
  assert.throws(() => submitVictoryCounter(state, player(state, 3).id, { kind: "contribute", claimId: old, count: 2 }));
  state = submitVictoryCounter(state, player(state, 2).id, { kind: "contribute", claimId: replacement.id, count: 3 });
  state = submitVictoryCounter(state, player(state, 3).id, { kind: "contribute", claimId: replacement.id, count: 2 });
  assert.equal(shadow(state).defeatLevel, 6);
  assert.equal(restorePlayerInitialState(state, shadow(state)), false);
  assert.equal(player(state, 1).status, "alive");
  assert.equal(state.phase, "collecting_actions");
  assert.equal(used(state, 2), 3);
  assert.equal(used(state, 3), 2);
});

test("由追光者复活不发放绝影逆魂的首轮效果", () => {
  let state = fixture("10502");
  Object.assign(shadow(state), { status: "dead", defeatLevel: 1, hp: -1 });
  shadow(state).bigCards![0]!.jueyingDeathHealing = 8;
  const chaseLight = "1050203";
  const random = Math.random;
  Math.random = () => 0.1;
  try {
    beginActionPrompt(state, "turn_before_action");
    state = submitActionWindowSkill(state, player(state, 1).id, { ...cast(chaseLight), targetId: shadow(state).id });
  } finally {
    Math.random = random;
  }
  assert.equal(shadow(state).status, "alive");
  assert.ok(!shadow(state).buffs.some(({ stateType }) => stateType === "jueying_harvest"));
});

test("伤害判定中的回血触发绝影复活时，结算当前批次后直接重开", () => {
  let state = fixture();
  Object.assign(shadow(state), { status: "dead", defeatLevel: 1, hp: -1 });
  shadow(state).bigCards![0]!.jueyingDeathHealing = 8;
  appendSkillInstances(player(state, 1), ["1045"]);
  const round = state.roundNumber;
  for (const actor of state.players.slice(1)) {
    const action = actor.id === player(state, 1).id
      ? { type: "attack" as const, attackId: "sha" as const, stacks: 4, targetId: player(state, 2).id } : cake;
    state = submitPlayerAction(state, actor.id, action).state;
  }
  for (let i = 0; state.phase === "action_window" && state.roundNumber === round && i < 20; i++) {
    assert.notEqual(state.activeTimingPhase, "turn_end_action");
    state = advanceActionWindow(state);
  }
  assert.equal(shadow(state).status, "alive");
  assert.equal(state.roundNumber, round + 1);
  assert.equal(player(state, 2).hp, 96);
});

test("常规胜利和御秽裁决的不可逆转胜利均直接结算；普通技能胜利超时结算", () => {
  const normal = fixture();
  for (const actor of normal.players.slice(1)) Object.assign(actor, { status: "dead", defeatLevel: 1 });
  beginActionPrompt(normal, "turn_before_action");
  assert.equal(advanceActionWindow(normal).phase, "finished");
  const protectedGame = declareVictory(fixture(), 1, "instant_win:imperial_verdict");
  assert.equal(protectedGame.phase, "finished");
  assert.equal(protectedGame.victoryCounter, undefined);
  const waiting = declareVictory(fixture(), 1);
  assert.equal(waiting.phase, "action_window");
  const finished = advanceActionWindow(waiting);
  assert.deepEqual(finished.winnerIds, [player(waiting, 1).id]);
});
