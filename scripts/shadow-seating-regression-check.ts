import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer,
  startGame, submitPlayerAction, validateAction, type GameState, type SkillAction
} from "../packages/shared/src";
import { participantCount } from "../packages/shared/src/engine/beastTraits";
import { loneStarFarthest } from "../packages/shared/src/engine/loneStar";
import {
  areCombatTargetsContiguous, getCombatFarthestPlayers, getCombatSeatDistance, getCombatSeatGroups, getCombatSeatNumbers, getTablePlayers,
  moveShadowSeat, shadowSeatChoices
} from "../packages/shared/src/engine/seating";
import { SHADOW_CARD_ID, SHADOW_STANCE_ID, SHADOW_WIND_DANCE_ID } from "../packages/shared/src/engine/shadowIds";
import { TIAN_YE_SOARING_STATE } from "../packages/shared/src/engine/tianyeIds";
import { getTotemTargets } from "../packages/shared/src/engine/totems";

function fixture(count = 4): GameState {
  let state = createGame("A", { skillMode: "big_test_select", firstTurnNoAttack: false });
  for (let i = 1; i < count; i++) state = addPlayerToGame(state, createPlayer(String.fromCharCode(65 + i)));
  state = drain(startGame(state));
  for (const player of state.players) player.cakes = 1;
  return state;
}

function drain(state: GameState): GameState {
  for (let steps = 0; state.phase === "action_window" && steps < 40; steps++) state = advanceActionWindow(state);
  assert.notEqual(state.phase, "action_window");
  return state;
}

test("暗色随行保持牌桌图层和人数，身后座次同主位，虚位不进入相邻与最远计算", () => {
  let state = fixture();
  const [a, b, c, d] = state.players;
  const visualOrder = getTablePlayers(state).map(({ id }) => id);
  assert.equal(moveShadowSeat(state, a!, c!, "behind"), true);
  assert.deepEqual(getTablePlayers(state).map(({ id }) => id), visualOrder);
  assert.equal(participantCount(state.players), 4);
  const groups = getCombatSeatGroups(state);
  assert.deepEqual(groups.map((group) => group.map(({ name }) => name)), [["B"], ["C", "A"], ["D"]]);
  assert.deepEqual([b, c, a, d].map((p) => getCombatSeatNumbers(state).get(p!.id)), [2, 3, 3, 4]);
  assert.deepEqual([c, a, d].map((p) => getCombatSeatDistance(groups, b!.id, p!.id)), [1, 1, 1]);
  assert.deepEqual(new Set(loneStarFarthest(state, a!)), new Set(loneStarFarthest(state, c!)));
  assert.deepEqual(new Set(loneStarFarthest(state, b!)), new Set([c!.id, a!.id, d!.id]));

  appendSkillInstances(b!, ["1098"]);
  for (const id of [a!.id, b!.id, c!.id, d!.id]) {
    const result = submitPlayerAction(state, id, id === b!.id ? { type: "gain_cake" } :
      { type: "attack", attackId: "sha", stacks: 1, targetId: b!.id });
    state = result.state;
  }
  state = drain(state);
  assert.equal(state.players.find(({ id }) => id === b!.id)!.hp, b!.hp);
  assert.equal(state.eventLog.filter((event) => event.type === "attack_blocked" && event.targetId === b!.id).length, 3);
});

test("跟到另一人身后形成三级座次，舞风插入令后方主座次递增，原位继续空着", () => {
  const state = fixture(5);
  const [a, b, c, d, e] = state.players;
  assert.equal(moveShadowSeat(state, a!, c!, "behind"), true);
  assert.equal(moveShadowSeat(state, e!, a!, "behind"), true);
  assert.deepEqual(shadowSeatChoices(state, b!, "behind").filter(({ primary }) => primary === 3)
    .map(({ player, behind }) => [player.name, behind]), [["C", 1], ["A", 2], ["E", 3]]);
  assert.equal(moveShadowSeat(state, a!, b!, "insert"), true);
  assert.deepEqual(shadowSeatChoices(state, d!, "behind").map(({ player, primary, behind }) =>
    [player.name, primary, behind]), [["B", 2, 1], ["A", 3, 1], ["C", 4, 1], ["E", 4, 2]]);
  e!.spaceId = "小空间";
  assert.deepEqual(getCombatSeatGroups(state, "小空间"), [[e]]);
  assert.equal(getCombatSeatDistance(getCombatSeatGroups(state), c!.id, e!.id), undefined);
});

test("旋空占正无限座次，彼此及有限玩家均不相邻，有限座次仍环绕", () => {
  const state = fixture(5);
  const [a, b, c, d, e] = state.players;
  assert.ok(a && b && c && d && e);
  for (const player of [b, d]) player.buffs.push({ id: TIAN_YE_SOARING_STATE, stateType: TIAN_YE_SOARING_STATE,
    name: "旋空之翼", stacks: 1 });
  const seats = getCombatSeatGroups(state);
  assert.deepEqual(seats, [[a], [c], [e], [b], [d]]);
  assert.equal(getCombatSeatDistance(seats, a.id, b.id), Infinity);
  assert.equal(getCombatSeatDistance(seats, b.id, d.id), Infinity);
  assert.equal(getCombatSeatDistance(seats, b.id, b.id), 0);
  assert.equal(getCombatSeatDistance(seats, a.id, e.id), 1);
  assert.equal(getCombatSeatNumbers(state).get(b.id), Infinity);
  assert.deepEqual(getCombatFarthestPlayers(seats, a.id), [b, d]);
  assert.deepEqual(getCombatFarthestPlayers(seats, b.id), [a, c, e, d]);
  assert.equal(areCombatTargetsContiguous(state.players, [a.id, b.id]), false);
  assert.equal(areCombatTargetsContiguous(state.players, [b.id]), true);
  assert.equal(areCombatTargetsContiguous(state.players, [a.id, e.id]), true);
  appendSkillInstances(a, ["1078"]);
  assert.equal(validateAction(state, a.id, { type: "attack", attackId: "sha", stacks: 1, targetId: b.id }).ok, true);
  const rocket: SkillAction = { type: "skill", skillId: "1078", stacks: 1, targetId: b.id };
  assert.equal(validateAction(state, a.id, rocket).ok, true);
  assert.equal(validateAction(state, a.id, { ...rocket, targetIds: [b.id, c.id] }).ok, false);
  const totem = { id: "test-totem", ownerId: a.id, primaryTargetId: b.id, range: "both", kind: "flame",
    firstTurn: state.turnNumber, expiresAtTurn: state.turnNumber + 30 } as const;
  assert.deepEqual(getTotemTargets(state, totem), [b]);
  assert.deepEqual(getTotemTargets(state, { ...totem, primaryTargetId: a.id }), [e, a, c]);
  b.buffs = [];
  assert.equal(getCombatSeatNumbers(state).get(b.id), 2);
});

test("三连舞风允许选择限定技遮蔽的座次，但仍遵守其他无法被选中", () => {
  const state = fixture();
  const [owner, target] = state.players;
  owner!.bigCards = [{ cardId: SHADOW_CARD_ID, instanceId: "shadow" }];
  // This fixture represents a target-selection ward produced by any limited skill.
  target!.buffs.push({ id: "limited-ward", name: "限定技遮蔽", sourceAbilityId: "1094",
    stacks: 1, preventsTargetSelection: true });
  const move: SkillAction = { type: "skill", skillId: SHADOW_WIND_DANCE_ID, stacks: 1, targetId: target!.id, shadowMoveMode: "behind" };
  const listed = (combo?: number) => shadowSeatChoices(state, owner!, "behind", combo).some(({ player }) => player === target);
  assert.equal(listed(), false);
  assert.equal(validateAction(state, owner!.id, move).ok, false);
  owner!.shadowCombo = 2;
  assert.equal(listed(3), true);
  assert.equal(validateAction(state, owner!.id, move).ok, true);
  let settled = submitPlayerAction(state, owner!.id, move).state;
  for (const { id } of state.players.slice(1))
    settled = submitPlayerAction(settled, id, { type: "gain_cake" }).state;
  settled = drain(settled);
  assert.deepEqual(getCombatSeatGroups(settled).find((group) => group[0]?.id === target!.id)?.map(({ id }) => id),
    [target!.id, owner!.id]);

  target!.buffs.push({ id: "nonlimited-ward", name: "影舞", sourceAbilityId: SHADOW_STANCE_ID,
    stacks: 1, preventsTargetSelection: true });
  assert.equal(listed(3), false);
  assert.equal(validateAction(state, owner!.id, move).ok, false);
});
