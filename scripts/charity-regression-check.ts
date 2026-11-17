import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, CHARITY_LINK_ID, CHARITY_QUICK_ID, createGame,
  createPlayer, DRAGON_DISAPPEAR_ID, enterActionWindow, getAllSkills, getPlayerInitialHp, HEALING_ART_ID, startGame, submitActionWindowSkill,
  submitPlayerAction, submitRetirementCounter, toPublicGameState, validateActionWindowSkill, type GameState, type PlayerAction
} from "../packages/shared/src";
import { addCombatValues, combatValue, RETIRE_VALUE } from "../packages/shared/src/engine/combatValues";
import { ignoresNegativeStatuses } from "../packages/shared/src/engine/effectCategories";
import { getPlayerHpValue, setPlayerHpValue } from "../packages/shared/src/engine/infiniteValues";
import { applyFrozenStatus } from "../packages/shared/src/engine/negativeStatuses";

const gain = { type: "gain_cake" } as const;
const paper = getAllSkills().find(({ name }) => name === "卷子")!.id;
const p = (state: GameState, index = 0) => state.players[index]!;

function drain(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && i < 50; i++)
    state = advanceActionWindow(state);
  return state;
}

function fixture(index = 0): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  p(state, index).bigCards = [{ instanceId: "charity", cardId: "10535" }];
  state = drain(startGame(state));
  for (const player of state.players) player.cakes = 50;
  return state;
}

function reveal(state: GameState, ...actions: Array<PlayerAction | undefined>): GameState {
  for (const [i, player] of state.players.entries()) if (player.status === "alive")
    state = submitPlayerAction(state, player.id, actions[i] ?? gain).state;
  return state;
}

function roll<T>(value: number, fn: () => T): T {
  const prior = Math.random;
  Math.random = () => value;
  try { return fn(); } finally { Math.random = prior; }
}

test("天命可在收招期间主动回满，也可先回到开局再支付治愈术次数", () => {
  let state = fixture();
  const id = p(state).id;
  assert.equal(p(state).skills.filter((skill) => skill === HEALING_ART_ID).length, 1);
  p(state).hp = 2;
  state = roll(.5, () => submitActionWindowSkill(state, id, { type: "skill", skillId: HEALING_ART_ID, stacks: 1 }));
  assert.equal(p(state).hp, 18);
  assert.equal(p(state).bigCards![0]!.charityHealingRefunds, 1);
  state = drain(state);
  p(state).hp = 3;
  p(state).cakes = 9;
  state = roll(.99, () => submitActionWindowSkill(state, id, { type: "skill", skillId: HEALING_ART_ID,
    stacks: 1, charityRestoreInitial: true }));
  assert.equal(p(state).hp, 18);
  assert.equal(p(state).cakes, 0);
  assert.equal(p(state).bigCards![0]!.grantedSkillUses?.[HEALING_ART_ID], 1);
  assert.equal(p(state).bigCards![0]!.charityHealingRefunds, undefined);
});

test("同批只记最后一笔实际伤害，速愈同一笔可重复，每轮至多五次且不重开", () => {
  let state = fixture();
  const target = p(state, 1).id;
  state = drain(reveal(state, gain, gain, { type: "attack", attackId: "qin", targetId: target, stacks: 1 },
    { type: "attack", attackId: "sha", targetId: target, stacks: 2 }));
  assert.deepEqual(p(state, 1).lastSettledDamage?.amount, combatValue(2));
  const round = state.roundNumber;
  const before = p(state, 1).hp;
  p(state).cakes = 6;
  const action = { type: "skill", skillId: CHARITY_QUICK_ID, stacks: 1, targetId: target } as const;
  for (let i = 0; i < 5; i++) state = submitActionWindowSkill(state, p(state).id, action);
  assert.equal(p(state, 1).hp, before + 10);
  assert.equal(p(state).cakes, 1);
  assert.equal(state.roundNumber, round);
  assert.equal(validateActionWindowSkill(state, p(state).id, action).ok, false);
});

test("治愈术升到退游，速愈只在恢复存活后补退游点血，伤害退游会扣去对应血量", () => {
  let state = fixture(1);
  p(state).bigCards = [{ instanceId: "quick", cardId: "10535", onlyAbilityId: CHARITY_QUICK_ID, initialized: true }];
  appendSkillInstances(p(state, 2), [paper, paper]);
  const sourceId = p(state).id;
  const targetId = p(state, 1).id;
  const paperMove = { type: "skill", skillId: paper, targetId, stacks: 1 } as const;
  state = drain(reveal(state, gain, gain, paperMove), "retirement_counter_action");
  const counter = toPublicGameState(state, targetId).retirementCounter!;
  assert.equal(counter.canUseHealingArt, true);
  assert.equal(p(state, 1).lastSettledDamage?.pointDefeatLevel, 2);
  assert.equal(validateActionWindowSkill(state, sourceId,
    { type: "skill", skillId: CHARITY_QUICK_ID, stacks: 1, targetId }).ok, false);
  state = roll(.99, () => submitRetirementCounter(state, targetId, { windowId: counter.id, kind: "healing_art" }));
  state = drain(state);
  assert.equal(p(state, 1).status, "alive");
  setPlayerHpValue(p(state, 1), combatValue(3));
  p(state).cakes = 2;
  state = submitActionWindowSkill(state, sourceId, { type: "skill", skillId: CHARITY_QUICK_ID, stacks: 1, targetId });
  assert.deepEqual(getPlayerHpValue(p(state, 1)), addCombatValues(RETIRE_VALUE, combatValue(3)));
  p(state, 2).cakes = 50;
  state = drain(reveal(state, gain, gain, paperMove));
  assert.equal(p(state, 1).status, "alive");
  assert.equal(p(state, 1).hp, 3);
});

test("献身慈爱减半当前及初始血量，组内普通治愈双向共享且不形成连锁", () => {
  let state = fixture();
  const ids = [p(state, 1).id, p(state, 2).id];
  state = drain(reveal(state, { type: "skill", skillId: CHARITY_LINK_ID, stacks: 1, targetIds: ids }));
  assert.equal(p(state).hp, 9);
  assert.equal(getPlayerInitialHp(p(state)), 9);
  assert.ok(ignoresNegativeStatuses(p(state)));
  assert.equal(applyFrozenStatus(state, p(state).id, 5, "round", ids[0]), true);
  assert.ok(p(state).buffs.some(({ id }) => id === "frozen"));
  p(state, 1).lastSettledDamage = { eventId: "recent", amount: combatValue(2) };
  p(state).cakes = 3;
  state = submitActionWindowSkill(state, p(state).id, { type: "skill", skillId: CHARITY_QUICK_ID, stacks: 1, targetId: ids[0]! });
  assert.deepEqual(state.players.map(({ hp }) => hp), [11, 20, 20, 18]);
  assert.equal(state.eventLog.filter((event) => event.type === "heal" && event.reason === "献身慈爱·共享治愈").length, 2);
});

test("三轮状态允许治愈术恢复消失，禁复活时关闭这一入口", () => {
  let state = fixture();
  p(state, 2).bigCards = [{ instanceId: "dragon", cardId: "10507", onlyAbilityId: DRAGON_DISAPPEAR_ID, initialized: true }];
  const ally = p(state, 1).id;
  state = drain(reveal(state, { type: "skill", skillId: CHARITY_LINK_ID, stacks: 1, targetIds: [ally] }));
  p(state).hp = 2;
  const target = p(state).id;
  const dragon = p(state, 2).id;
  state = enterActionWindow(reveal(state), dragon);
  const disappear = (snapshot: GameState) => submitActionWindowSkill(snapshot, dragon,
    { type: "skill", skillId: DRAGON_DISAPPEAR_ID, stacks: 1 });
  const blocked = structuredClone(state);
  p(blocked).buffs.push({ id: "no_revive", name: "禁止复活", stacks: 1 });
  const defeated = drain(disappear(blocked));
  assert.equal(p(defeated).defeatLevel, 3);
  assert.ok(!toPublicGameState(defeated, target).retirementCounter?.canUseHealingArt);
  state = drain(disappear(state), "retirement_counter_action");
  assert.equal(p(state).defeatLevel, 3);
  const counter = toPublicGameState(state, target).retirementCounter!;
  assert.equal(counter.canUseHealingArt, true);
  p(state, 1).hp = 3;
  state = roll(.9, () => submitRetirementCounter(state, target, { windowId: counter.id, kind: "healing_art" }));
  assert.equal(p(state).status, "alive");
  assert.equal(p(state).hp, 9);
  assert.equal(p(state, 1).hp, 3);
});
