import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, beginActionPrompt, createGame, createPlayer,
  getActiveSkillCount, getAllSkills, isSkillBlockedByJingu, startGame, submitActionWindowSkill, submitPlayerAction,
  type GameState, type PlayerAction
} from "../packages/shared/src";
import {
  DEAD_REALM_CARD_ID, DEAD_REALM_DODGE_ID, DEAD_REALM_FALLBACK_ID, DEAD_REALM_GUARD_ID, DEAD_REALM_RECOVERY_ID
} from "../packages/shared/src/engine/deadRealmIds";
import { SOUL_DEATH_HISTORY, hasOrdinaryDeathHistory } from "../packages/shared/src/engine/soulPact";
import { RAGE_STATE as TIANLIE_RAGE } from "../packages/shared/src/engine/tianlie";
import { DIVINE_DOOM_ID, DIVINE_EXIT_ID, DIVINE_FLAME_ID, DIVINE_REVERSAL_CARD_ID, DIVINE_RIFT_ID } from "../packages/shared/src/engine/divineReversalIds";

const cake = { type: "gain_cake" } as const;
const sha = (targetId: string, stacks: number): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks });
const owner = (state: GameState) => state.players[0]!;

function drain(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && i < 60; i++) state = advanceActionWindow(state);
  return state;
}

function game(ability = DEAD_REALM_CARD_ID): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, initialHp: 18, firstTurnNoAttack: false });
  for (const name of ["乙", "丙"]) state = addPlayerToGame(state, createPlayer(name));
  owner(state).bigCards = [{ instanceId: "dead-realm", cardId: DEAD_REALM_CARD_ID,
    ...(ability === DEAD_REALM_CARD_ID ? {} : { onlyAbilityId: ability }) }];
  state = drain(startGame(state));
  for (const player of state.players) player.cakes = 60;
  return state;
}

function turn(state: GameState, ...moves: PlayerAction[]): GameState {
  for (const [index, player] of state.players.entries()) {
    if (player.status === "alive") state = submitPlayerAction(state, player.id, moves[index] ?? cake).state;
  }
  return drain(state);
}

function odds<T>(sample: number, run: () => T): T {
  const original = Math.random;
  let calls = 0;
  Math.random = () => sample + (++calls % 1000) * 1e-8;
  try { return run(); } finally { Math.random = original; }
}

function recordDeath(state: GameState, index: number): void {
  state.players[index]!.buffs.push({ id: SOUL_DEATH_HISTORY, name: "曾经死亡", stacks: 1 });
}

function dodgeChecks(state: GameState) {
  return state.eventLog.flatMap((event) => event.type === "system" &&
    event.probabilityChecks?.skillId === DEAD_REALM_DODGE_ID ? [event.probabilityChecks] : []);
}

test("生死的界限按 1/3 判定，必中和非攻击法术跳过回避", () => {
  let state = game(DEAD_REALM_DODGE_ID);
  const id = owner(state).id;
  state = odds(0.33, () => turn(state, cake, sha(id, 2)));
  assert.equal(owner(state).hp, 18);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" &&
    event.protectionName === "生死的界限" && event.blockKind === "dodge"));
  assert.deepEqual(dodgeChecks(state).map(({ chance, attempts, successes }) => [chance, attempts[0]?.coefficient, successes[0]?.coefficient]),
    [[1 / 3, 1, 1]]);
  state = odds(0.34, () => turn(state, cake, sha(id, 2)));
  assert.equal(owner(state).hp, 16);
  assert.equal(dodgeChecks(state).length, 2, "同一份攻击回避失败后不会重新掷骰");
  assert.deepEqual(dodgeChecks(state)[1]?.successes, []);
  state.players[1]!.buffs.push({ id: TIANLIE_RAGE, stateType: TIANLIE_RAGE, name: "狂化", stacks: 1 });
  state.players[1]!.cakes = 3;
  state = odds(0.01, () => turn(state, cake, sha(id, 2)));
  assert.equal(owner(state).hp, 14);
  appendSkillInstances(state.players[2]!, ["1034"]);
  beginActionPrompt(state, "turn_before_action");
  state = drain(submitActionWindowSkill(state, state.players[2]!.id,
    { type: "skill", skillId: "1034", stacks: 1, targetIds: [id, state.players[1]!.id] }));
  assert.ok(owner(state).hp < 14);
  assert.equal(dodgeChecks(state).length, 2);
});

test("消失档仍可回避，必杀档跳过回避", () => {
  const juanzi = getAllSkills().find(({ name }) => name === "卷子")!.id;
  for (const { lethalIncoming, roll, defeat } of [
    { lethalIncoming: false, roll: 0.1, defeat: undefined },
    { lethalIncoming: false, roll: 0.9, defeat: 3 },
    { lethalIncoming: true, roll: 0.1, defeat: 4 },
  ]) {
    let state = game(DEAD_REALM_DODGE_ID);
    const [defender, attacker, third] = state.players;
    appendSkillInstances(defender!, ["1031"]);
    appendSkillInstances(third!, [juanzi]);
    attacker!.bigCards = [DIVINE_DOOM_ID, DIVINE_FLAME_ID, DIVINE_RIFT_ID, DIVINE_EXIT_ID].map((id) =>
      ({ instanceId: id, cardId: DIVINE_REVERSAL_CARD_ID, onlyAbilityId: id }));
    beginActionPrompt(state, "round_before_action");
    state = drain(submitActionWindowSkill(state, attacker!.id, { type: "skill", skillId: DIVINE_FLAME_ID, stacks: 1 }));
    state = odds(roll, () => turn(state, cake, sha(defender!.id, 1), lethalIncoming
      ? { type: "skill", skillId: juanzi, stacks: 1, targetId: attacker!.id } : cake));
    assert.equal(owner(state).defeatLevel, defeat);
    assert.equal(dodgeChecks(state).length, lethalIncoming ? 0 : 1);
  }
});

test("同一份多段攻击只判定一次生死的界限", () => {
  let state = game(DEAD_REALM_DODGE_ID);
  appendSkillInstances(state.players[1]!, ["1095"]);
  state = odds(0.9, () => turn(state, cake,
    { type: "skill", skillId: "1095", stacks: 1, targetId: owner(state).id }));
  assert.equal(owner(state).hp, 14);
  assert.equal(dodgeChecks(state).length, 1);
});

test("生死的界限让自身无视禁锢和封印", () => {
  let state = game(DEAD_REALM_DODGE_ID);
  appendSkillInstances(owner(state), ["1050", "1044"]);
  owner(state).revealedSkillIds = ["1050"];
  appendSkillInstances(state.players[1]!, ["1004", "1007"]);
  assert.equal(isSkillBlockedByJingu(state, "1044", undefined, owner(state)), false);
  assert.equal(isSkillBlockedByJingu(state, "1044", undefined, state.players[2]!), true);
  state.players[1]!.cakes = 5;
  beginActionPrompt(state, "turn_before_action");
  state = drain(submitActionWindowSkill(state, state.players[1]!.id, {
    type: "skill", skillId: "1004", stacks: 1, targetId: owner(state).id, targetSkillId: "1050"
  }));
  assert.equal(getActiveSkillCount(owner(state), "1050"), 1);
  assert.equal(owner(state).buffs.some(({ id }) => id === "sealed_skill:1050"), false);
  owner(state).buffs.push({ id: "sealed_skill:1050", name: "先前的封印", stacks: 1 });
  assert.equal(getActiveSkillCount(owner(state), "1050"), 1);
});

test("遍历死域按同批实际伤害归因，负血留场并在失效期内等待新致死", () => {
  let state = game(DEAD_REALM_GUARD_ID);
  owner(state).hp = 5;
  recordDeath(state, 1);
  const round = state.roundNumber;
  const id = owner(state).id;
  state = odds(0.01, () => turn(state, cake, sha(id, 4), sha(id, 2)));
  assert.equal(owner(state).status, "alive");
  assert.equal(owner(state).hp, -1);
  assert.equal(hasOrdinaryDeathHistory(owner(state)), false);
  assert.equal(owner(state).bigCards![0]!.deadRealmGuardReadyRound, round + 5);
  state = turn(state, cake, cake, cake);
  assert.equal(owner(state).status, "alive");
  state.players[1]!.cakes = 1;
  state = turn(state, cake, sha(id, 1));
  assert.equal(owner(state).defeatLevel, 1);
});

test("遍历死域拦住死亡过的来源造成的点伤害和直接退场，血量照旧", () => {
  for (const directDefeat of [false, true]) {
    let state = game(DEAD_REALM_GUARD_ID);
    recordDeath(state, 1);
    state.pendingDamageItems = [{ id: "retire", targetId: owner(state).id, sourceId: state.players[1]!.id,
      amount: 1, pointDefeatLevel: 2, ...(directDefeat ? { directDefeat: true } : {}) }];
    beginActionPrompt(state, "turn_damage_modify");
    state = odds(0.9, () => drain(state));
    assert.equal(owner(state).hp, 18);
    assert.equal(owner(state).status, "alive");
    assert.ok(state.eventLog.some((event) => event.type === "system" && event.probabilityChecks?.skillId === DEAD_REALM_GUARD_ID));
  }
});

test("死域归来者按普通伤害、退游点伤害和消失点伤害以0血返回", () => {
  for (const level of [1, 2, 3] as const) {
    let state = game(DEAD_REALM_RECOVERY_ID);
    owner(state).hp = 1;
    if (level === 1) state = odds(0.01, () => turn(state, cake, sha(owner(state).id, 2)));
    else {
      state.pendingDamageItems = [{ id: "point", targetId: owner(state).id, sourceId: state.players[1]!.id,
        amount: 1, pointDefeatLevel: level }];
      beginActionPrompt(state, "turn_damage_modify");
      state = odds(0.01, () => drain(state));
    }
    assert.equal(owner(state).status, "alive");
    assert.equal(owner(state).hp, 0);
    assert.ok(state.eventLog.some((event) => event.type === "heal" && event.reason === "死域归来者" &&
      event.recoveryKind === (level === 1 ? "revival" : level === 2 ? "reentry" : "reappearance")));
  }
});

test("补判成功回到初始血量并解除整卡锁定标签；非伤害退游没有判定", () => {
  let state = game();
  const juanzi = getAllSkills().find(({ name }) => name === "卷子")!.id;
  appendSkillInstances(state.players[1]!, [juanzi]);
  state.players[1]!.buffs.push({ id: TIANLIE_RAGE, stateType: TIANLIE_RAGE, name: "狂化", stacks: 1 });
  state = odds(0.3, () => turn(state, cake, { type: "skill", skillId: juanzi, stacks: 1, targetId: owner(state).id }));
  assert.equal(owner(state).hp, 18);
  assert.equal(owner(state).status, "alive");
  assert.equal(owner(state).bigCards![0]!.deadRealmUnlocked, true);
  owner(state).buffs.push({ id: "tianmang_locked_disabled", name: "锁定技失效", stacks: 1 });
  for (const id of [DEAD_REALM_DODGE_ID, DEAD_REALM_GUARD_ID, DEAD_REALM_RECOVERY_ID, DEAD_REALM_FALLBACK_ID])
    assert.equal(getActiveSkillCount(owner(state), id), 1);
  state.pendingDamageItems = [{ id: "direct", targetId: owner(state).id, sourceId: state.players[1]!.id,
    amount: 1, pointDefeatLevel: 2, directDefeat: true }];
  beginActionPrompt(state, "turn_damage_modify");
  state = odds(0.01, () => drain(state));
  assert.equal(owner(state).defeatLevel, 2);
});
