import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ANNIHILATION_CANNON_ID, ELECTROMAGNETIC_CANNON_ID, GATHER_ELEMENT_ID, JUNENG_CARD_ID, JUNENG_SHIELD_ID,
  JUSHEN_ID, RELEASE_DAMAGE_ID, SELF_DESTRUCTER_DEATH_SKILL_ID, STORE_DAMAGE_ID, FENTIAN_ATTACK_ID, JUNENG_RESPONSE_ID,
  INFINITY_VALUE, RETIRE_VALUE, addPlayerToGame, advanceActionWindow, appendSkillInstances, beginActionPrompt,
  createGame, createPlayer, enterActionWindow, formatCombatValue, getActiveFusionCount, getActiveSkillCount, getElementAmount,
  getPlayerHpValue, getSelectableJunengTarget, startGame, submitActionWindowSkill, submitPlayerAction,
  getSkillElementCost, getTurnSkillActionCost, previewPlayerAttackStats, toPublicGameState, validateAction, type GameState, type PlayerAction, type SkillAction
} from "@bing/shared";
import { scheduleJunengResponse, settleJunengRoundChanges } from "../packages/shared/src/engine/junengNumbers";
import { clearFentianBattlefield } from "../packages/shared/src/engine/bigCards";

const cake = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const small = { type: "defense", defense: "small" } as const;
const skill = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });
const sha = (targetId: string, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks });
const lightning = (targetId: string): PlayerAction => ({ type: "attack", attackId: "shan_dian", targetId, stacks: 1 });

function drain(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; i < 100 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(amount = 0, alsoFentian = false): GameState {
  let state = createGame("A", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false });
  for (const name of ["B", "C", "D"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ cardId: JUNENG_CARD_ID, instanceId: "juneng" }];
  if (alsoFentian) state.players[1]!.bigCards = [{ cardId: "10501", instanceId: "fentian" }];
  state = drain(startGame(state));
  for (const player of state.players) { player.hp = 30; player.cakes = 25; }
  if (amount) state.players[0]!.buffs.push({ id: "element:聚", stateType: "element_resource", stacks: amount, name: "聚" });
  return state;
}

function turn(state: GameState, actions: PlayerAction[], stop: GameState["activeTimingPhase"] = "turn_end_action"): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) {
    if (player.status === "alive" && !state.pendingActions[player.id]) {
      state = submitPlayerAction(state, player.id, actions[index] ?? cake).state;
    }
  }
  return drain(state, stop);
}

function boost(state: GameState): GameState {
  const owner = state.players[0]!;
  scheduleJunengResponse(state, owner, { id: "lightning", targetId: owner.id, amount: 4, fromAttack: true, element: "electric", attackKey: "hit" });
  state.roundNumber += 2;
  settleJunengRoundChanges(state);
  return state;
}

test("电系攻击实际扣血后整卡停一轮，再增强两轮，独立同名技能仍可用", () => {
  let state = fixture();
  const [owner, , other] = state.players;
  const initial = state.roundNumber;
  appendSkillInstances(owner!, [SELF_DESTRUCTER_DEATH_SKILL_ID]);
  state = drain(turn(state, [cake, lightning(owner!.id), cake, cake]));
  assert.equal(state.roundNumber, initial + 1);
  assert.equal(state.players[0]!.hp, 26);
  assert.ok(state.players[0]!.bigCards![0]!.junengDisabled);
  assert.equal(getActiveSkillCount(state.players[0], JUNENG_RESPONSE_ID), 0);
  assert.equal(getActiveSkillCount(state.players[0], SELF_DESTRUCTER_DEATH_SKILL_ID), 1);
  assert.equal(getActiveFusionCount(state.players[0], "毁灭之盾"), 0);
  assert.equal(validateAction(state, owner!.id, skill(GATHER_ELEMENT_ID)).ok, false);
  state.players[1]!.cakes = 1;
  state = drain(turn(state, [cake, sha(other!.id), cake, cake]));
  assert.equal(state.roundNumber, initial + 2);
  assert.equal(getActiveFusionCount(state.players[0], "毁灭之盾"), 1);
  state.players[0]!.cakes = 1;
  state = turn(state, [skill(GATHER_ELEMENT_ID), cake, cake, cake]);
  assert.equal(getElementAmount(state.players[0], "聚"), 2);
  assert.equal(state.players[0]!.cakes, 0);
  state.roundNumber = initial + 4;
  settleJunengRoundChanges(state);
  assert.equal(getTurnSkillActionCost(state.players[0]!, skill(GATHER_ELEMENT_ID)), 2);
});

test("被防住的电系攻击、非攻击法伤和纯储存释放不触发", () => {
  let state = fixture();
  const owner = state.players[0]!;
  state = turn(state, [{ type: "defense", defense: "youtiao" }, lightning(owner.id), cake, cake]);
  assert.equal(state.players[0]!.bigCards![0]!.junengResponse, undefined);
  for (const flags of [{ spellDamage: true, attackKey: "spell" }, { fromAttack: true }]) {
    scheduleJunengResponse(state, state.players[0]!, { id: "other", targetId: owner.id, amount: 4, element: "electric", ...flags });
  }
  assert.equal(state.players[0]!.bigCards![0]!.junengResponse, undefined);
});

test("确定稿倍率用于聚能盾、电磁炮、储存与湮灭炮，固定项及其他大卡维持原值", () => {
  let state = boost(fixture(12));
  const [owner] = state.players;
  assert.deepEqual([JUNENG_SHIELD_ID, ELECTROMAGNETIC_CANNON_ID, STORE_DAMAGE_ID, JUSHEN_ID, ANNIHILATION_CANNON_ID].map((skillId) =>
    getSkillElementCost(owner, { skillId })?.perStack), [1, 1, 1, 4, 7]);
  assert.equal(getTurnSkillActionCost(owner!, skill(FENTIAN_ATTACK_ID)), 4);
  const cannon = submitPlayerAction(state, owner!.id, skill(ANNIHILATION_CANNON_ID)).state;
  const stats = previewPlayerAttackStats(cannon, owner!.id).stats[0]!;
  assert.equal(formatCombatValue(stats.powerValue!), "2∞");
  assert.equal(formatCombatValue(stats.levelValue!), "2∞");

  state = turn(state, [skill(JUNENG_SHIELD_ID, { stacks: 2 }), sha(owner!.id, 10), sha(owner!.id, 13), cake]);
  assert.equal(getElementAmount(state.players[0], "聚"), 10);
  assert.equal(state.players[0]!.hp, 30);
  assert.equal(state.players[1]!.hp, 20);
  assert.equal(state.players[0]!.buffs.find((buff) => buff.id === "defense_value")?.stacks, 40);
  assert.equal(formatCombatValue(state.players[0]!.buffs.find((buff) => buff.skillAttackBlockLimit)!.skillAttackBlockLimit!), "40");

  state = boost(fixture(1));
  state = turn(state, [skill(ELECTROMAGNETIC_CANNON_ID), cake, cake, cake]);
  assert.equal(getElementAmount(state.players[0], "聚"), 0);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.attackName === "电磁炮" && event.amount === 40));
  assert.equal(formatCombatValue(state.players[0]!.buffs.find((buff) => buff.skillReflectLimit)!.skillReflectLimit!), "2∞");

  for (const retire of [false, true]) {
    state = boost(fixture(1));
    state.pendingDamageItems = [{ id: "packet", targetId: state.players[0]!.id,
      amount: 9999, amountValue: retire ? RETIRE_VALUE : INFINITY_VALUE, ...(retire ? { pointDefeatLevel: 2 } : {}) }];
    beginActionPrompt(state, "turn_damage_modify");
    state = enterActionWindow(state, state.players[0]!.id);
    state = submitActionWindowSkill(state, state.players[0]!.id, skill(STORE_DAMAGE_ID, { targetDamageId: "packet" }));
    assert.equal(formatCombatValue(state.players[0]!.storedDamages![0]!.amountValue), retire ? formatCombatValue(RETIRE_VALUE) : "6∞");
  }
});

test("增强期间再次触发按当时倍率排下一次周期，清场移除增强", () => {
  const state = boost(fixture());
  const owner = state.players[0]!;
  const round = state.roundNumber;
  scheduleJunengResponse(state, owner, { id: "lightning", targetId: owner.id, amount: 4, fromAttack: true, element: "electric", attackKey: "new-hit" });
  assert.deepEqual(owner.bigCards![0]!.junengResponse, { disabledRound: round + 1, duration: 4, multiplier: 4, divisor: 4 });
  state.roundNumber += 2;
  settleJunengRoundChanges(state);
  assert.equal(getSkillElementCost(owner, { skillId: JUSHEN_ID })?.perStack, 2);
  clearFentianBattlefield(state);
  assert.equal(getSkillElementCost(owner, { skillId: JUSHEN_ID })?.perStack, 7);
  state.roundNumber++;
  settleJunengRoundChanges(state);
  assert.equal(getSkillElementCost(owner, { skillId: JUSHEN_ID })?.perStack, 7);
});

test("聚神用向上取整后的费用重开，并将后续锁定时长从两轮增至四轮", () => {
  let state = boost(fixture(4));
  const round = state.roundNumber;
  const [owner, target] = state.players;
  delete state.preemptiveRestartSnapshot;
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, owner!.id, skill(JUSHEN_ID, { targetId: target!.id }));
  assert.equal(getElementAmount(state.players[0], "聚"), 0);
  assert.deepEqual(state.junengTargetLock, { targetId: target!.id, expiresAtRound: round + 5 });
});

test("增强只提高湮灭炮附带必杀的概率，石头饼反弹的顺序仍保留", () => {
  const random = Math.random;
  try {
    let draws = 0;
    Math.random = () => 0.4 + draws++ / 10_000_000;
    for (const enhanced of [false, true]) {
      let state = enhanced ? boost(fixture(7)) : fixture(14);
      state = turn(state, [skill(ANNIHILATION_CANNON_ID, { targetIds: [state.players[1]!.id] }), stone, stone, stone]);
      assert.equal(state.players[1]!.defeatLevel, enhanced ? 4 : 2);
      assert.equal(state.cannonDefenses?.find(({ attack }) => attack.targetId === state.players[2]!.id)?.next, "cake");
    }
  } finally {
    Math.random = random;
  }
});

test("开局实际发放三项继承；聚当回合挡攻击，元素跨轮保留并可被清场", () => {
  let state = fixture(0, true);
  const [a, b, c] = state.players;
  assert.equal(getActiveFusionCount(a, "毁灭之盾"), 1);
  assert.equal(getActiveFusionCount(a, "末世"), 1);
  assert.ok(a!.skills.includes(SELF_DESTRUCTER_DEATH_SKILL_ID));
  state = turn(state, [skill(GATHER_ELEMENT_ID), sha(a!.id), sha(b!.id), cake]);
  assert.equal(state.players[0]!.hp, 30);
  assert.equal(getElementAmount(state.players[0], "聚"), 1);
  const round = state.roundNumber;
  state = drain(state);
  assert.ok(state.roundNumber > round);
  assert.equal(getElementAmount(state.players[0], "聚"), 1);
  state.players[1]!.cakes = 10;
  state = turn(state, [cake, skill(FENTIAN_ATTACK_ID, { targetId: c!.id }), cake, cake]);
  assert.equal(getElementAmount(state.players[0], "聚"), 0);
});

test("聚能盾按攻分别反弹和防住，电磁炮独立造成法伤", () => {
  let state = fixture(4);
  const [a, b] = state.players;
  state = turn(state, [skill(JUNENG_SHIELD_ID, { stacks: 2 }), sha(a!.id, 2), sha(a!.id, 7), cake]);
  assert.equal(getElementAmount(state.players[0], "聚"), 2);
  assert.equal(state.players[0]!.hp, 30);
  assert.equal(state.players[1]!.hp, 28);
  assert.equal(state.players[2]!.hp, 30);
  assert.equal(state.players[0]!.buffs.find((buff) => buff.id === "defense_value")?.stacks, 20);
  state = turn(state, [skill(ELECTROMAGNETIC_CANNON_ID), cake, cake, cake]);
  assert.equal(state.players.find((p) => p.id === b!.id)?.hp, 8);
  assert.equal(getElementAmount(state.players[0], "聚"), 0);
});

test("存下冰系攻击仍会结算命中效果；释放保持冰系攻击伤害", () => {
  let state = fixture(1);
  const [a, b, c] = state.players;
  appendSkillInstances(b!, ["skill_118_53580"]);
  state = turn(state, [cake, skill("skill_118_53580", { targetId: a!.id }), cake, cake], "turn_damage_modify");
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  const packet = state.pendingDamageItems!.find((item) => item.targetId === a!.id)!;
  assert.ok(packet.fromAttack);
  assert.equal(packet.element, "ice");
  state = submitActionWindowSkill(state, a!.id, skill(STORE_DAMAGE_ID, { targetDamageId: packet.id }));
  assert.equal(state.players[0]!.hp, 30);
  assert.ok(state.players[0]!.buffs.some((buff) => buff.id.startsWith("frozen") || buff.stateType === "freeze"));
  assert.equal(getElementAmount(state.players[0], "聚"), 0);
  assert.equal(toPublicGameState(state, b!.id).players[0]!.storedDamages, undefined);
  const stored = state.players[0]!.storedDamages![0]!;
  assert.equal(stored.element, "ice");
  assert.equal(stored.fromAttack, true);
  beginActionPrompt(state, "turn_end_action");
  state = submitActionWindowSkill(state, a!.id, skill(RELEASE_DAMAGE_ID, { targetId: c!.id, storedDamageId: stored.id }));
  state = drain(state);
  assert.equal(state.players[2]!.hp, 27);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.attackName === "释放伤害" && event.element === "ice"));
});

test("储存并释放无限与退游点伤害，保留数值档位", () => {
  for (const retire of [false, true]) {
    let state = fixture(1);
    const [a, , c] = state.players;
    state.pendingDamageItems = [{ id: "packet", targetId: a!.id, amount: 9999,
      amountValue: retire ? RETIRE_VALUE : INFINITY_VALUE, spellDamage: true, element: "ice",
      ...(retire ? { pointDefeatLevel: 2 as const } : {}) }];
    beginActionPrompt(state, "turn_damage_modify");
    state = enterActionWindow(state, a!.id);
    state = submitActionWindowSkill(state, a!.id, skill(STORE_DAMAGE_ID, { targetDamageId: "packet" }));
    const stored = state.players[0]!.storedDamages![0]!;
    assert.equal(formatCombatValue(stored.amountValue), retire ? formatCombatValue(RETIRE_VALUE) : "3∞");
    beginActionPrompt(state, "turn_before_action");
    state = submitActionWindowSkill(state, a!.id, skill(RELEASE_DAMAGE_ID, { targetId: c!.id, storedDamageId: stored.id }));
    state = drain(state);
    const event = state.eventLog.find((event) => event.type === "damage" && event.attackName === "释放伤害");
    assert.ok(event?.type === "damage");
    assert.equal(event.pointDefeatLevel, retire ? 2 : undefined);
    assert.equal(formatCombatValue(event.amountValue!), formatCombatValue(stored.amountValue));
  }
});

test("聚神先制重开、强制自打、不可选中与离场时卡手，原生群攻仍可用", () => {
  let state = fixture();
  const [a, b, c] = state.players;
  for (let i = 0; i < 7; i++) state = turn(state, [skill(GATHER_ELEMENT_ID), cake, cake, cake]);
  state = drain(state);
  const round = state.roundNumber;
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, a!.id, skill(JUSHEN_ID, { targetId: b!.id }));
  assert.equal(state.roundNumber, round + 1);
  assert.equal(state.junengTargetLock?.expiresAtRound, round + 3);
  assert.equal(getElementAmount(state.players[0], "聚"), 0);
  state = drain(state);
  state.players[1]!.cakes = 10;
  state = turn(state, [cake, sha(c!.id), cake, cake]);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceId === b!.id &&
    event.targetId === b!.id && event.internalDamage));
  state = drain(state);
  state.players[1]!.buffs.push({ id: "hidden", name: "无法被选中", stacks: 1, preventsTargetSelection: true });
  state.players[0]!.cakes = 10;
  assert.equal(getSelectableJunengTarget(state), undefined);
  assert.equal(validateAction(state, a!.id, sha(c!.id)).ok, false);
  assert.equal(validateAction(state, a!.id, { type: "attack", attackId: "wan_jian", stacks: 1 }).ok, true);
  state.players[1]!.status = "dead";
  assert.equal(validateAction(state, a!.id, sha(c!.id)).ok, false);
  state.roundNumber = round + 3;
  assert.equal(validateAction(state, a!.id, sha(c!.id)).ok, true);
});

test("聚神仅保留一个多目标招式目标", () => {
  let state = fixture();
  const [a, b, c, d] = state.players;
  appendSkillInstances(b!, ["skill_35_16792"]);
  state.junengTargetLock = { targetId: d!.id, expiresAtRound: state.roundNumber + 2 };
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, b!.id, skill("skill_35_16792", { targetIds: [a!.id, c!.id] }));
  state = drain(state);
  assert.equal(state.players[0]!.hp, 30);
  assert.equal(state.players[2]!.hp, 30);
  assert.equal(state.players[3]!.hp, 28);
});

test("湮灭炮发炮回合结算退游／必杀，逐步失败立即命中，完整序列防住", () => {
  let state = fixture(14);
  const [a, b, c, d] = state.players;
  appendSkillInstances(d!, ["skill_69_22138"]);
  const random = Math.random;
  Math.random = () => 0.1;
  try {
    state = turn(state, [skill(ANNIHILATION_CANNON_ID, { targetIds: [b!.id] }), stone, stone, small]);
  } finally { Math.random = random; }
  assert.equal(state.players[1]!.defeatLevel, 4);
  assert.equal(state.players[3]!.status, "dead");
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === d!.id && event.noReviveOrExtraLives));
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.targetId === b!.id));
  assert.deepEqual(toPublicGameState(state, c!.id).cannonDefenseSteps?.find((step) => step.targetId === c!.id)?.next, "cake");
  state = turn(state, [cake, cake, cake, cake]);
  assert.equal(state.cannonDefenses?.find((step) => step.attack.targetId === c!.id)?.next, "rebound");
  state = turn(state, [cake, cake, { type: "defense", defense: "rebound", targetId: a!.id }, cake]);
  assert.equal(formatCombatValue(getPlayerHpValue(state.players[2]!)), "30");
  assert.equal(state.cannonDefenses?.length, 0);

  state = fixture(14);
  state = turn(state, [skill(ANNIHILATION_CANNON_ID), stone, stone, stone]);
  state = turn(state, [cake, small, cake, cake]);
  assert.equal(state.players[1]!.status, "dead");
  assert.equal(state.players[2]!.hp, 30);
  state = turn(state, [cake, cake, stone, stone]);
  assert.equal(state.players[2]!.status, "dead");
});
