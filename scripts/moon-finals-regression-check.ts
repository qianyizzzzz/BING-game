import assert from "node:assert/strict";
import { test } from "node:test";
import { addPlayerToGame, advanceActionWindow, createGame, createPlayer, getFusionSkillId, grantInitializedSkill,
  startGame, submitActionWindowSkill, submitPlayerAction, type GameState, type PlayerAction } from "../packages/shared/src";
import { applyAttackModifiers, getSkillAttackStats } from "../packages/shared/src/skills/registry";
import { BASE_ATTACKS } from "../packages/shared/src/engine/attacks";
import { attackLevelValue, combatValue, INFINITY_VALUE } from "../packages/shared/src/engine/combatValues";
import { MOON_CARD_ID, MOON_DANCE_ID, MOON_RITUAL_ID, MOON_TIDE_ID } from "../packages/shared/src/engine/moonIds";
import { MOON_DANCE_BLESSING, MOON_DANCE_CHANNEL } from "../packages/shared/src/engine/moonDance";
import { summonMoon } from "../packages/shared/src/engine/moon";
import { TIANMANG_ABSORB_STATE } from "../packages/shared/src/engine/tianmang";
import { CHAOS_GUARD } from "../packages/shared/src/engine/chaos";
import { STAR_WHEEL_CARD, STAR_WHEEL_RELEASE } from "../packages/shared/src/engine/starWheelIds";
import { getStoredDamages, setStoredDamages } from "../packages/shared/src/engine/storedDamage";

const cake = { type: "gain_cake" } as const;
const skill = (skillId: string): PlayerAction => ({ type: "skill", skillId, stacks: 1 });
const rebound = (targetId: string): PlayerAction => ({ type: "defense", defense: "rebound", targetId });

function advance(state: GameState): GameState {
  for (let step = 0; step < 50 && state.phase === "action_window"; step++) state = advanceActionWindow(state);
  assert.notEqual(state.phase, "action_window");
  return state;
}

function game(abilityId: string, players = 4): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁", "戊"].slice(0, players - 1)) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ cardId: MOON_CARD_ID, instanceId: "moon-source", onlyAbilityId: abilityId }];
  state = advance(startGame(state));
  state.players[0]!.cakes = 200;
  assert.ok(summonMoon(state, state.players[0]!));
  return state;
}

function reveal(state: GameState, ...actions: PlayerAction[]): GameState {
  for (const [index, player] of state.players.entries()) {
    if (state.phase === "collecting_actions" && player.status === "alive" && !player.summon && !state.pendingActions[player.id])
      state = submitPlayerAction(state, player.id, actions[index] ?? cake).state;
  }
  return state;
}

test("月华舞礼自动占用第二、第三回合主出招，完成后仅给自己和所属傀儡附加永久良好", () => {
  let state = game(MOON_DANCE_ID);
  const ownerId = state.players[0]!.id;
  const puppet = createPlayer("直属小鬼");
  puppet.summon = { kind: "imp", ownerId, targetId: state.players[1]!.id, firstTurn: 1, expiresAtTurn: 100 };
  state.players.push(puppet);
  state.pendingActions[puppet.id] = { actions: [] };
  state.players[3]!.buffs.push({ id: `puppet_of:${ownerId}`, name: "归属傀儡", stacks: 1, sourcePlayerId: ownerId });
  state = advance(reveal(state, skill(MOON_DANCE_ID)));
  assert.equal(state.players[0]!.cakes, 168);
  for (let turn = 2; turn <= 3; turn++) {
    assert.equal(state.turnNumber, turn);
    assert.ok(state.players[0]!.buffs.some(({ id }) => id === MOON_DANCE_CHANNEL));
    assert.deepEqual(state.pendingActions[ownerId]?.actions.map((action) => action.type === "skill" ? action.skillId : action.type), [MOON_DANCE_ID]);
    assert.throws(() => submitPlayerAction(state, ownerId, cake), /提交|出招/);
    assert.throws(() => submitPlayerAction(state, ownerId, { type: "defense", defense: "self_destruct" }), /占用本回合主出招/);
    assert.equal(state.players[0]!.buffs.some(({ stateType }) => stateType === MOON_DANCE_BLESSING), false);
    state = advance(reveal(state));
  }
  assert.equal(state.turnNumber, 4);
  assert.ok(state.players[0]!.buffs.some(({ stateType }) => stateType === MOON_DANCE_BLESSING));
  assert.ok(state.players.find(({ id }) => id === puppet.id)?.buffs.some(({ stateType }) => stateType === MOON_DANCE_BLESSING));
  assert.ok(state.players[3]!.buffs.some(({ stateType }) => stateType === MOON_DANCE_BLESSING));
  assert.ok(state.players.slice(1, 3).every(({ buffs }) => !buffs.some(({ stateType }) => stateType === MOON_DANCE_BLESSING)));
  assert.equal(state.players[0]!.cakes, 169);
  assert.equal(state.players[0]!.hp, 30);
  assert.equal(state.roundNumber, 1);
  assert.deepEqual(attackLevelValue(applyAttackModifiers(state, ownerId, BASE_ATTACKS.sha)), INFINITY_VALUE);
  const attack = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
  state = advance(reveal(state, cake, attack(ownerId), attack(state.players[3]!.id)));
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === ownerId &&
    event.protectionName === "月华舞礼"));
  assert.equal(state.roundNumber, 1, "对两名友军的攻击均应被舞礼挡下");
  state = advance(reveal(state, cake, attack(ownerId), cake, attack(state.players[2]!.id)));
  assert.equal(state.roundNumber, 2);
  assert.ok(state.players[0]!.spareLives?.some(({ hp }) => hp === 18));
});

for (const stage of [1, 2, 3]) test(`月华舞礼在第 ${stage} 回合出招无效即失败`, () => {
  let state = game(MOON_DANCE_ID);
  const ownerId = state.players[0]!.id;
  for (let turn = 1; turn <= 3; turn++) {
    state = reveal(state, ...(turn === 1 ? [skill(MOON_DANCE_ID)] : []));
    if (turn === stage) {
      assert.equal(state.activeTimingPhase, "turn_change_action");
      state.turnMoveSuppression = { turnNumber: state.turnNumber, invalidated: { [ownerId]: [0] }, skillEffects: {} };
    }
    state = advance(state);
  }
  assert.ok(!state.players[0]!.buffs.some(({ stateType }) => stateType === MOON_DANCE_BLESSING));
  assert.ok(!state.players[0]!.buffs.some(({ id }) => id === MOON_DANCE_CHANNEL));
  assert.equal(state.players[0]!.cakes, 168 + (3 - stage));
});

test("皓光之潮穿普通反弹和天芒技能免疫，受弹力球反弹及月亮的无法消失阻挡", () => {
  let state = game(MOON_TIDE_ID, 5);
  const [owner, ordinary, elastic, immune, protectedMoon] = state.players;
  ordinary!.cakes = 1;
  elastic!.cakes = 1;
  grantInitializedSkill(state, elastic!.id, getFusionSkillId("弹力球"), "测试", false);
  immune!.buffs.push({ id: TIANMANG_ABSORB_STATE, stateType: TIANMANG_ABSORB_STATE,
    name: "神·六芒星", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
  protectedMoon!.bigCards = [{ cardId: MOON_CARD_ID, instanceId: "other-moon", onlyAbilityId: MOON_RITUAL_ID }];
  assert.ok(summonMoon(state, protectedMoon!));
  state = advance(reveal(state, skill(MOON_TIDE_ID), rebound(owner!.id), rebound(owner!.id), cake, cake));
  assert.equal(state.players[1]!.defeatLevel, 3);
  assert.equal(state.players[2]!.status, "alive");
  assert.equal(state.players[3]!.defeatLevel, 3);
  assert.equal(state.players[4]!.status, "alive");
  assert.ok(!state.eventLog.some((event) => event.type === "attack_reflected" && event.attackName === "皓光之潮"));
});

test("无视弹力球可穿皓光之潮的唯一防法", () => {
  let state = game(MOON_TIDE_ID);
  const [owner, elastic] = state.players;
  elastic!.cakes = 1;
  grantInitializedSkill(state, owner!.id, getFusionSkillId("根源之目"), "测试", false);
  grantInitializedSkill(state, elastic!.id, getFusionSkillId("弹力球"), "测试", false);
  state = advance(reveal(state, skill(MOON_TIDE_ID), rebound(owner!.id)));
  assert.equal(state.players[1]!.defeatLevel, 3);
});

test("皓光之潮只清除长期状态，施术者自己的饼、防御值、其他物品和特殊状态保留", () => {
  let state = game(MOON_TIDE_ID, 3);
  const owner = state.players[0]!;
  state.junengTargetLock = { targetId: owner.id, expiresAtRound: state.roundNumber + 3 };
  setStoredDamages(owner, [{ id: "tide-test-stock", amountValue: combatValue(9), spellDamage: true }]);
  const otherLock = { targetId: state.players[2]!.id, expiresAtRound: state.roundNumber + 3 };
  state.smallSpaces = { isolated: { kind: "self_isolation", name: "自我封闭", cakeMultiplier: 3,
    expiresAtRound: state.roundNumber + 3, targetLock: otherLock } };
  owner.buffs.push({ id: "moon-test-long", stateType: "moon-test-long", name: "需清的长期状态", stacks: 1 },
    { id: "defense_value", name: "防御值", stacks: 4 },
    { id: "sun_puppet", stateType: "sun_puppet", name: "日的傀儡", stacks: 1 },
    { id: "moon-test-counted", stateType: CHAOS_GUARD, name: "无效技能次数", stacks: 5, expiresAtRound: 3 });
  for (const [i, target] of state.players.slice(1).entries()) {
    target.bigCards = [{ cardId: MOON_CARD_ID, instanceId: `moon-target-${i}`, onlyAbilityId: MOON_RITUAL_ID }];
    assert.ok(summonMoon(state, target));
    target.buffs.push({ id: "other-test-long", stateType: "other-test-long", name: "对手长期状态", stacks: 1 });
  }
  state.players[2]!.spaceId = "isolated";
  state = advance(reveal(state, skill(MOON_TIDE_ID)));
  assert.equal(state.roundNumber, 1);
  assert.equal(state.players[0]!.cakes, 80);
  const ids = new Set(state.players[0]!.buffs.map(({ id }) => id));
  assert.ok(!ids.has("moon-test-long"));
  assert.ok(ids.has("defense_value") && ids.has("summoned_moon") && ids.has("sun_puppet") && ids.has("moon-test-counted"));
  assert.ok(!state.players[1]!.buffs.some(({ id }) => id === "other-test-long"));
  assert.ok(state.players[2]!.buffs.some(({ id }) => id === "other-test-long"));
  assert.equal(state.junengTargetLock, undefined);
  assert.deepEqual(state.smallSpaces?.isolated?.targetLock, otherLock);
  assert.equal(getStoredDamages(state.players[0]).length, 1);
});

test("星移在回合末释放已封存皓光之潮时，仍结算消失和清场", () => {
  let state = game(MOON_TIDE_ID);
  const [source, keeper, target, witness] = state.players;
  keeper!.bigCards = [{ cardId: STAR_WHEEL_CARD, instanceId: "sealed-tide-keeper" }];
  witness!.buffs.push({ id: "witness-state", stateType: "witness-state", name: "旁观者长期状态", stacks: 1 });
  state.starWheelMoves = [{ id: "sealed-tide", keeperId: keeper!.id, round: state.roundNumber, label: "皓光之潮", effects: [],
    attacks: [{ key: "sealed-tide:hit", sourceId: source!.id, targetId: target!.id, originalTargetId: target!.id,
      actionIndex: 0, reflected: false, stats: getSkillAttackStats(MOON_TIDE_ID, 1)! }] }];
  state = reveal(state);
  for (let step = 0; step < 20 && state.phase === "action_window" && state.activeTimingPhase !== "turn_end_action"; step++)
    state = advanceActionWindow(state);
  assert.equal(state.activeTimingPhase, "turn_end_action");
  state = submitActionWindowSkill(state, keeper!.id, { type: "skill", skillId: STAR_WHEEL_RELEASE, stacks: 1, starWheelMoveIds: ["sealed-tide"] });
  assert.equal(state.players[2]!.defeatLevel, 3);
  assert.ok(!state.players[3]!.buffs.some(({ id }) => id === "witness-state"));
});
