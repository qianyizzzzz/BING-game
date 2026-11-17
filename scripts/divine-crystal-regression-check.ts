import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, attackLevelValue, attackPowerValue, beginActionPrompt, combatValue,
  createGame, createPlayer, getActiveSkillCount, getAllSkills, getPointDamageDefeatLevel,
  INFINITY_VALUE, RETIRE_VALUE, VANISH_VALUE, startGame, submitActionWindowSkill,
  submitPlayerAction, validateAction, type ActionSubmission, type GameState, type SkillAction
} from "../packages/shared/src";
import {
  CRYSTAL_BOUNDARY_ID, CRYSTAL_CARD_ID, CRYSTAL_EQUALIZE_ID, CRYSTAL_GUARD_ID, CRYSTAL_INHERIT_ID,
  CRYSTAL_MARK_ID, CRYSTAL_SHIELD_BUFF, CRYSTAL_SHIELD_ID, CRYSTAL_SHIELD_LOCK,
  crystalGuardMarkCount, crystalShieldAvailable, lowerCrystalAttack
} from "../packages/shared/src/engine/divineCrystal";
import { DIVINE_BLIND_ID, DIVINE_CROSS_ID, DIVINE_REVERSAL_CARD_ID } from "../packages/shared/src/engine/divineReversalIds";
import { setPlayerHpValue } from "../packages/shared/src/engine/infiniteValues";
import { appendSkillInstances } from "../packages/shared/src/engine/skillInventory";
import type { AttackStats } from "../packages/shared/src/types";

const cake = { type: "gain_cake" } as const;
const sha = (targetId: string, stacks = 1) => ({ type: "attack", attackId: "sha", targetId, stacks } as const);
const cast = (skillId: string, targetId?: string): SkillAction => ({ type: "skill", skillId, stacks: 1, ...(targetId ? { targetId } : {}) });

function drain(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && i < 80; i++) state = advanceActionWindow(state);
  return state;
}

function setup(abilities: string[][]): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, initialHp: 18, firstTurnNoAttack: false });
  state = addPlayerToGame(state, createPlayer("乙"));
  state = addPlayerToGame(state, createPlayer("丙"));
  for (const [index, player] of state.players.entries()) {
    player.bigCards = (abilities[index] ?? []).map((id) => ({
      instanceId: player.id + id, cardId: id.startsWith(CRYSTAL_CARD_ID) ? CRYSTAL_CARD_ID : DIVINE_REVERSAL_CARD_ID, onlyAbilityId: id
    }));
  }
  state = drain(startGame(state));
  for (const player of state.players) player.cakes = 60;
  return state;
}

function turn(state: GameState, actions: ActionSubmission[], pauseAtDamage = false): GameState {
  for (const [index, action] of actions.entries()) {
    const id = state.players[index]!.id;
    const validation = validateAction(state, id, action);
    assert.equal(validation.ok, true, validation.error);
    state = submitPlayerAction(state, id, action).state;
  }
  for (let i = 0; state.phase === "action_window" && i < 80; i++) {
    if (pauseAtDamage && state.activeTimingPhase === "turn_damage_modify") return state;
    state = advanceActionWindow(state);
  }
  return state;
}

test("神族水晶实际发放；无等级烈光分别结算并保留倍率与禁复活", () => {
  let state = setup([[CRYSTAL_INHERIT_ID], [DIVINE_BLIND_ID, DIVINE_CROSS_ID]]);
  const [owner, rival] = state.players;
  assert.equal(getActiveSkillCount(owner, "1032"), 1);
  setPlayerHpValue(owner!, combatValue(3, 1));
  state = turn(state, [sha(rival!.id), sha(owner!.id), cake]);
  const damage = state.eventLog.filter((event) => event.type === "damage");
  assert.ok(damage.some((event) => event.sourceId === owner!.id && event.targetId === rival!.id));
  const crossed = damage.find((event) => event.sourceId === rival!.id && event.targetId === owner!.id);
  assert.deepEqual(crossed?.amountValue, INFINITY_VALUE);
  assert.equal(crossed?.blocksRevival, true);
  assert.equal(state.eventLog.some((event) => event.type === "clash"), false);
});

test("烈弓已发动，神域魔晶仍让两个有等级的攻击相撞", () => {
  let state = setup([[CRYSTAL_INHERIT_ID]]);
  const [owner, rival] = state.players;
  appendSkillInstances(rival!, ["1059"]);
  for (const [index, action] of [sha(rival!.id), sha(owner!.id), cake].entries()) {
    state = submitPlayerAction(state, state.players[index]!.id, action).state;
  }
  assert.equal(state.activeTimingPhase, "turn_change_action");
  state = drain(submitActionWindowSkill(state, rival!.id, { ...cast("1059", owner!.id), switchActionIndex: 0 }));
  assert.ok(state.eventLog.some((event) => event.type === "clash"));
  assert.ok(!state.eventLog.some((event) => event.type === "system" && event.message.includes("交错而过")));
});

test("无等级攻击相遇时仍可被丁固定抵消", () => {
  let state = setup([[CRYSTAL_INHERIT_ID], [DIVINE_BLIND_ID, DIVINE_CROSS_ID]]);
  const [owner, rival] = state.players;
  const ding = getAllSkills().find(({ name }) => name === "丁")!.id;
  appendSkillInstances(owner!, [ding]);
  state = turn(state, [cast(ding, rival!.id), sha(owner!.id), cake]);
  assert.equal(state.players[0]!.hp, 18);
  assert.equal(state.players[1]!.hp, 18);
  assert.ok(state.eventLog.some((event) => event.type === "clash" && event.result.includes("固定抵消")));
});

test("魔晶使较低等级追平，擒的零级也能参与", () => {
  for (const attackId of ["sha", "qin"] as const) {
    let state = setup([[CRYSTAL_EQUALIZE_ID]]);
    const [owner, rival] = state.players;
    state = turn(state, [{ type: "attack", attackId, targetId: rival!.id, stacks: 1 }, sha(owner!.id, 3), cake]);
    assert.equal(state.players[0]!.hp, 18);
    assert.equal(state.players[1]!.hp, 18);
    assert.ok(state.eventLog.some((event) => event.type === "clash" && event.result.includes("等级相同")));
  }
});

test("神域之界只降攻值并保留等级；退游点伤害降为普通无限", () => {
  const base: AttackStats = { id: "sha", name: "杀", cost: 1, power: 1, level: 3, defenseTag: "small",
    traits: [], isArea: false, isSkill: false, stacks: 1 };
  assert.deepEqual(attackPowerValue(lowerCrystalAttack(base)), []);
  assert.deepEqual(attackPowerValue(lowerCrystalAttack({ ...base, powerValue: combatValue(3, 2) })), combatValue(3, 1));
  const lowered = lowerCrystalAttack({ ...base, powerValue: RETIRE_VALUE, traits: ["defeat_retire"], fixedPointPower: true });
  assert.deepEqual(attackPowerValue(lowered), INFINITY_VALUE);
  assert.deepEqual(attackLevelValue(lowered), combatValue(3));
  assert.equal(getPointDamageDefeatLevel(lowered), undefined);
  const loweredVanish = lowerCrystalAttack({ ...base, powerValue: VANISH_VALUE, traits: ["defeat_vanish"], fixedPointPower: true });
  assert.deepEqual(attackPowerValue(loweredVanish), RETIRE_VALUE);
  assert.equal(getPointDamageDefeatLevel(loweredVanish), 2);

  let state = setup([[CRYSTAL_BOUNDARY_ID]]);
  const [owner, rival] = state.players;
  state = turn(state, [sha(rival!.id), sha(owner!.id, 2), cake]);
  assert.equal(state.players[0]!.hp, 18);
  assert.equal(state.players[1]!.hp, 18);
});

test("护佑转移给唯一持有者，可以一次用两层；十字印记留在原玩家", () => {
  let state = setup([[CRYSTAL_GUARD_ID]]);
  const [owner, original] = state.players;
  appendSkillInstances(original!, ["1072"]);
  original!.buffs.push({ id: CRYSTAL_MARK_ID, name: "护佑印记", stacks: 2 });
  state = turn(state, [cake, cake, sha(owner!.id, 8)], true);
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  assert.equal(crystalGuardMarkCount(state.players[0]), 2);
  assert.equal(crystalGuardMarkCount(state.players[1]), 0);
  const damage = state.pendingDamageItems!.find((item) => item.targetId === owner!.id)!;
  state = submitActionWindowSkill(state, owner!.id, { ...cast(CRYSTAL_GUARD_ID), targetDamageId: damage.id, crystalMarkCount: 2 });
  state = drain(state);
  assert.equal(crystalGuardMarkCount(state.players[0]), 0);
  assert.equal(state.players[0]!.hp, 16);
  state.players[2]!.cakes = 1;
  state = turn(state, [cake, cake, sha(original!.id)]);
  assert.equal(crystalGuardMarkCount(state.players[0]), 1);
  assert.equal(crystalGuardMarkCount(state.players[1]), 0);
  assert.equal(state.players[1]!.buffs.find(({ id }) => id === "cross_mark")?.stacks, 1);
});

test("同空间两位持有者时，新护佑消失，已有护佑和新十字保留", () => {
  let state = setup([[CRYSTAL_GUARD_ID], [CRYSTAL_GUARD_ID]]);
  const [owner, rival, third] = state.players;
  appendSkillInstances(third!, ["1072"]);
  third!.buffs.push({ id: CRYSTAL_MARK_ID, name: "护佑印记", stacks: 2 });
  state = turn(state, [sha(third!.id), cake, cake]);
  assert.equal(crystalGuardMarkCount(state.players.find(({ id }) => id === owner!.id)), 0);
  assert.equal(crystalGuardMarkCount(state.players.find(({ id }) => id === rival!.id)), 0);
  assert.equal(crystalGuardMarkCount(state.players[2]), 2);
  assert.equal(state.players[2]!.buffs.find(({ id }) => id === "cross_mark")?.stacks, 1);
});

test("魔晶盾只抵御攻击，雷电法术照常造成伤害", () => {
  let state = setup([[CRYSTAL_SHIELD_ID]]);
  const [owner, rival] = state.players;
  appendSkillInstances(rival!, ["1034"]);
  state = turn(state, [cast(CRYSTAL_SHIELD_ID), cake, cake]);
  beginActionPrompt(state, "turn_before_action");
  state = drain(submitActionWindowSkill(state, rival!.id, { ...cast("1034"), targetIds: [owner!.id, state.players[2]!.id] }));
  assert.ok(state.players[0]!.hp < 18);
  assert.equal(state.players[0]!.buffs.some(({ id }) => id === CRYSTAL_SHIELD_BUFF), true);
});

test("魔晶盾挡低等级攻击并保留，挡超无限等级的卷子后封锁三整轮", () => {
  let state = setup([[CRYSTAL_SHIELD_ID]]);
  const [owner, rival] = state.players;
  state = turn(state, [cast(CRYSTAL_SHIELD_ID), sha(owner!.id), cake]);
  const holder = state.players[0]!;
  assert.equal(holder.hp, 18);
  assert.equal(holder.buffs.some(({ id }) => id === CRYSTAL_SHIELD_BUFF), true);
  assert.equal(validateAction(state, owner!.id, cast(CRYSTAL_SHIELD_ID)).ok, false);
  const juanzi = getAllSkills().find(({ name }) => name === "卷子")!.id;
  appendSkillInstances(state.players.find(({ id }) => id === rival!.id)!, [juanzi]);
  const round = state.roundNumber;
  state = turn(state, [cake, cast(juanzi, owner!.id), cake]);
  assert.equal(state.players[0]!.status, "alive");
  assert.equal(state.players[0]!.hp, 18);
  assert.equal(state.players[0]!.buffs.some(({ id }) => id === CRYSTAL_SHIELD_BUFF), false);
  assert.equal(state.players[0]!.buffs.find(({ id }) => id === CRYSTAL_SHIELD_LOCK)?.expiresAtRound, round + 4);
  assert.equal(crystalShieldAvailable({ roundNumber: round + 3 }, state.players[0]!), false);
  assert.equal(crystalShieldAvailable({ roundNumber: round + 4 }, state.players[0]!), true);
});
