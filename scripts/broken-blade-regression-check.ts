import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeBrokenBlades, addPlayerToGame, advanceActionWindow, amplifyBrokenBladeAttack, appendSkillInstances,
  BASE_ATTACKS, BLADE_DOUBLE_EDGE_ID, BLADE_INHERIT_ID, BLADE_MAINTENANCE_IDS, BLADE_QINGGANG_ID, BROKEN_BLADE_CARD_ID,
  BROKEN_BLADE_TIERS, canMaintainBrokenBlade, chooseBrokenBladeQinggang, createGame, createPlayer, getActiveSkillCount,
  getBrokenBlade, getBrokenBladeDoubleEdge, getFusionJudgmentRank, getFusionMaterials, getIndependentBrokenBladeSkillCount,
  getIndependentHeavenSwordCount, getStackedAttackStats, maintainBrokenBlade, readyBrokenBlades, spendBrokenBladeUse, startGame,
  submitActionWindowSkill, submitPlayerAction, type GameState, type PlayerAction
} from "@bing/shared";
import { queueBrokenBladeRoundBonus, recordBrokenBladeWounds, takeBrokenBladeRoundBonus } from "../packages/shared/src/engine/brokenBladeRewards";
import { attackPowerValue, combatValue, getPointDamageDefeatLevel, INFINITY_VALUE, RETIRE_VALUE, withAttackPower } from "../packages/shared/src/engine/combatValues";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { TOTEM_CARD_ID, TOTEM_CHOOSE_ID, TOTEM_KINDS } from "../packages/shared/src/engine/totemIds";

function fixture(opponents = 1) {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 2, firstTurnNoAttack: false });
  for (let i = 0; i < opponents; i++) state = addPlayerToGame(state, createPlayer(`对手${i + 1}`));
  state.players[0]!.bigCards = [{ cardId: BROKEN_BLADE_CARD_ID, instanceId: "blade" }];
  state = startGame(state);
  for (let step = 0; state.phase === "action_window" && step < 50; step++) state = advanceActionWindow(state);
  const player = state.players[0]!;
  const [card] = activeBrokenBlades(player);
  assert.ok(card);
  return { state, player, card };
}

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
function reveal(state: GameState, moves: PlayerAction[]): GameState {
  for (const [index, player] of state.players.entries()) {
    const result = submitPlayerAction(state, player.id, moves[index] ?? cake);
    assert.equal(result.error, undefined);
    state = result.state;
  }
  return state;
}
function advance(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let step = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && step < 50; step++)
    state = advanceActionWindow(state);
  return state;
}

test("青釭剑从独立实体扣次数，耗尽后保留独立青釭剑", () => {
  const { player, card } = fixture();
  assert.equal(getActiveSkillCount(player, BLADE_INHERIT_ID), 1);
  assert.equal(getActiveSkillCount(player, BLADE_QINGGANG_ID), 1);
  assert.equal(getIndependentBrokenBladeSkillCount(player, BLADE_QINGGANG_ID), 0);
  assert.equal(getFusionMaterials(player).some((entry) => entry.skillId === BLADE_QINGGANG_ID), false);
  assert.equal(chooseBrokenBladeQinggang(player, [], false, false, false, false), undefined);
  assert.equal(chooseBrokenBladeQinggang(player, ["1049"], false, false, false, false), card);
  assert.equal(chooseBrokenBladeQinggang(player, [], true, false, true, false), undefined);
  appendSkillInstances(player, [BLADE_QINGGANG_ID]);
  for (let count = 0; count < 10; count++) assert.equal(spendBrokenBladeUse(card), true);
  assert.equal(spendBrokenBladeUse(card), false);
  assert.equal(readyBrokenBlades(player).length, 0);
  assert.equal(getIndependentBrokenBladeSkillCount(player, BLADE_QINGGANG_ID), 1);
  assert.equal(getFusionMaterials(player).filter((entry) => entry.skillId === BLADE_QINGGANG_ID).length, 1);
});

test("每阶可修复满次数或重铸为下一判定等级，真阶不限次数", () => {
  const { state, player, card } = fixture();
  for (const [tier, id] of BLADE_MAINTENANCE_IDS.entries()) {
    const current = BROKEN_BLADE_TIERS[tier]!;
    assert.equal(canMaintainBrokenBlade(player, id, card.instanceId), false);
    for (let use = 0; use < current.maxUses!; use++) assert.equal(spendBrokenBladeUse(card), true);
    assert.equal(canMaintainBrokenBlade(player, id, card.instanceId), true);
    assert.equal(maintainBrokenBlade(state, player, id, card.instanceId), true);
    assert.equal(getBrokenBlade(card).remaining, current.maxUses);
    for (let use = 0; use < current.maxUses!; use++) assert.equal(spendBrokenBladeUse(card), true);
    assert.equal(maintainBrokenBlade(state, player, `${id}_reforge`, card.instanceId), true);
    const next = BROKEN_BLADE_TIERS[tier + 1]!;
    const blade = getBrokenBlade(card);
    const fusion = player.skillFusions?.find((item) => item.id === blade.fusionInstanceId);
    assert.ok(fusion);
    assert.equal(getFusionJudgmentRank(fusion), next.rank);
    assert.equal(blade.remaining, next.maxUses);
    assert.equal(getIndependentHeavenSwordCount(player), 0);
    assert.equal(getActiveSkillCount(player, BLADE_DOUBLE_EDGE_ID), 1);
    assert.equal(getBrokenBladeDoubleEdge(player), card);
  }
  assert.equal(spendBrokenBladeUse(card), true);
  assert.equal(getBrokenBlade(card).remaining, null);
});

test("极阶将有限攻乘无限，原本无限升为退游点伤害", () => {
  const attack = getStackedAttackStats(BASE_ATTACKS.sha, 2);
  assert.deepEqual(attackPowerValue(amplifyBrokenBladeAttack(attack)), combatValue(2, 1));
  const retirement = amplifyBrokenBladeAttack(withAttackPower(attack, INFINITY_VALUE));
  assert.deepEqual(attackPowerValue(retirement), RETIRE_VALUE);
  assert.equal(getPointDamageDefeatLevel(retirement), 2);
  assert.equal(retirement.fixedPointPower, true);
});

test("群攻只有实际穿过保护的目标各扣一次，普通防御拦下的目标不扣", () => {
  let { state, player } = fixture(3);
  player.cakes = 10;
  for (const opponent of state.players.slice(1)) appendSkillInstances(opponent, ["1049"]);
  state = advance(reveal(state, [{ type: "attack", attackId: "wan_jian", stacks: 1 }, cake, cake, small]), "turn_end_action");
  assert.equal(getBrokenBlade(state.players[0]!.bigCards![0]!).remaining, 8);
  assert.deepEqual(state.players.slice(1).map((item) => item.hp), [16, 16, 18]);
});

test("对撞抵消与御秽剥离不扣青釭剑次数", () => {
  for (const strip of [false, true]) {
    let { state, player } = fixture(2);
    const opponent = state.players[1]!;
    appendSkillInstances(opponent, ["1049"]);
    if (strip) opponent.bigCards = [{ cardId: "10508", instanceId: "verdict" }];
    player.cakes = opponent.cakes = 1;
    const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
    state = advance(reveal(state, [sha(opponent.id), strip ? cake : sha(player.id), cake]), "turn_end_action");
    assert.equal(state.players[1]!.hp, 18);
    assert.equal(getBrokenBlade(state.players[0]!.bigCards![0]!).remaining, 10);
  }
});

test("火焰刀命中藤甲时青釭剑扣次并去掉藤甲加伤", () => {
  let { state, player } = fixture(2);
  const target = state.players[1]!;
  appendSkillInstances(player, ["1015"]);
  appendSkillInstances(target, ["1050"]);
  player.cakes = 1;
  state = advance(reveal(state, [{ type: "attack", attackId: "sha", targetId: target.id, stacks: 1 }, cake, cake]), "turn_end_action");
  assert.equal(state.players[1]!.hp, 16);
  assert.equal(getBrokenBlade(state.players[0]!.bigCards![0]!).remaining, 9);
});

test("真·双刃剑无视御秽并按其追加反噬", () => {
  let { state, player, card } = fixture(2);
  for (const id of BLADE_MAINTENANCE_IDS) {
    while (getBrokenBlade(card).remaining) assert.ok(spendBrokenBladeUse(card));
    assert.ok(maintainBrokenBlade(state, player, `${id}_reforge`, card.instanceId));
  }
  const target = state.players[1]!;
  target.bigCards = [{ cardId: "10508", instanceId: "verdict" }];
  player.cakes = 1;
  state = reveal(state, [{ type: "attack", attackId: "sha", targetId: target.id, stacks: 1 }, cake, cake]);
  state = submitActionWindowSkill(state, player.id, { type: "skill", skillId: BLADE_DOUBLE_EDGE_ID, stacks: 1,
    switchActionIndex: 0, targetId: target.id, doubleEdgeMode: "ignore_defense" });
  state = advance(state, "turn_end_action");
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === target.id));
  assert.deepEqual(state.eventLog.flatMap((event) => event.type === "damage" && event.targetId === player.id ? [event.amount] : []), [1, 1]);
});

test("受伤按实际逐笔记下轮饼，只有攻击伤害另外立即加饼", () => {
  let { state, player } = fixture(2);
  for (const opponent of state.players.slice(1)) opponent.cakes = 1;
  const sha: PlayerAction = { type: "attack", attackId: "sha", targetId: player.id, stacks: 1 };
  state = advance(reveal(state, [cake, sha, sha]), "turn_end_action");
  assert.equal(state.players[0]!.hp, 16);
  assert.equal(state.players[0]!.cakes, 3);
  state = advance(state);
  assert.equal(state.roundNumber, 2);
  assert.equal(state.players[0]!.cakes, 2);
});

test("伤害指数档位与多轮清饼强化分别结算", () => {
  const { state, player } = fixture();
  const event = { id: "wound", at: 0, roundNumber: 1, turnNumber: 1, type: "damage" as const, targetId: player.id, amount: 1 };
  recordBrokenBladeWounds(state, player, [
    { ...event, attackDamage: true, amountValue: combatValue(1) },
    { ...event, attackDamage: true, amountValue: INFINITY_VALUE },
    ...([2, 3, 4] as const).map((pointDefeatLevel) => ({ ...event, attackDamage: true as const, pointDefeatLevel })),
    event
  ]);
  assert.equal(player.cakes, 15);
  assert.equal(player.buffs.find(({ id }) => id === "broken_blade_cakes:2")?.stacks, 6);
  queueBrokenBladeRoundBonus(player, 2);
  queueBrokenBladeRoundBonus(player, 3);
  assert.equal(takeBrokenBladeRoundBonus(state, player), 6);
  assert.equal(player.cakes, 17);
  assert.equal(takeBrokenBladeRoundBonus(state, player), undefined);
});

test("轮末实际清饼为下一次攻击提供倍率和回饼", () => {
  let { state, player } = fixture(2);
  player.cakes = 2;
  state.players[1]!.cakes = 1;
  const attack = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
  state = advance(reveal(state, [cake, attack(player.id), cake]));
  assert.equal(state.roundNumber, 2);
  assert.equal(state.players[0]!.cakes, 1);
  const targetId = state.players[1]!.id;
  state = advance(reveal(state, [attack(targetId), cake, cake]), "turn_end_action");
  assert.equal(state.players[1]!.hp, 14);
  assert.equal(state.players[0]!.cakes, 1);
});

test("天堂向左允许提交治愈术并扣次，复活无效", () => {
  let { state, player } = fixture(2);
  player.hp = 1;
  appendSkillInstances(player, ["1063"]);
  state.players[1]!.cakes = 2;
  const sha: PlayerAction = { type: "attack", attackId: "sha", targetId: player.id, stacks: 2 };
  state = advance(reveal(state, [cake, sha, cake]), "revival_action");
  assert.equal(state.activeTimingPhase, "revival_action");
  state = submitActionWindowSkill(state, player.id, { type: "skill", skillId: "1063", stacks: 1 });
  assert.ok(state.players[0]!.buffs.some((buff) => buff.id === "skill_used:1063" && buff.stacks > 0));
  assert.ok(state.eventLog.some((entry) => entry.type === "system" && entry.message.includes("而无效")));
  assert.equal(advance(state).players[0]!.status, "dead");
});

test("真·双刃剑保留固定反噬，并为实际穿过的防御技能追加反噬", () => {
  let { state, player, card } = fixture(2);
  for (const id of BLADE_MAINTENANCE_IDS) {
    while (getBrokenBlade(card).remaining) assert.ok(spendBrokenBladeUse(card));
    assert.ok(maintainBrokenBlade(state, player, `${id}_reforge`, card.instanceId));
  }
  player.cakes = 1;
  const target = state.players[1]!;
  appendSkillInstances(target, ["1049", "1031"]);
  state = reveal(state, [{ type: "attack", attackId: "sha", targetId: target.id, stacks: 1 }, cake, cake]);
  state = submitActionWindowSkill(state, player.id, { type: "skill", skillId: BLADE_DOUBLE_EDGE_ID, stacks: 1,
    switchActionIndex: 0, targetId: target.id, doubleEdgeMode: "ignore_defense" });
  state = advance(state, "turn_end_action");
  const wounds = state.eventLog.filter((event) => event.type === "damage" && event.targetId === player.id);
  assert.deepEqual(wounds.map(({ amount }) => amount), [1, 2]);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === target.id &&
    event.attackName === "杀" && attackPowerValue({ power: event.amount, powerValue: event.amountValue })[0]?.exponent === 1));
  assert.equal(getBrokenBlade(state.players[0]!.bigCards![0]!).remaining, null);
});

test("真·双刃剑穿过实际生效的天空与飞翼图腾，按图腾效果追加反噬", (context) => {
  for (const totemKind of ["sky", "wing"] as const) {
    let { state, player, card } = fixture(2);
    const target = state.players[1]!;
    target.bigCards = [{ cardId: TOTEM_CARD_ID, instanceId: "totem-card" }];
    target.cakes = 5;
    state = reveal(state, [cake, { type: "skill", skillId: TOTEM_CHOOSE_ID, stacks: 1,
      targetId: target.id, totemRange: "center", totemKind }, cake]);
    state = advance(state);
    player = state.players[0]!;
    card = activeBrokenBlades(player)[0]!;
    for (const id of BLADE_MAINTENANCE_IDS) {
      while (getBrokenBlade(card).remaining) assert.ok(spendBrokenBladeUse(card));
      assert.ok(maintainBrokenBlade(state, player, `${id}_reforge`, card.instanceId));
    }
    player.cakes = 1;
    state = reveal(state, [{ type: "attack", attackId: "sha", targetId: target.id, stacks: 1 }, cake, cake]);
    state = submitActionWindowSkill(state, player.id, { type: "skill", skillId: BLADE_DOUBLE_EDGE_ID,
      stacks: 1, switchActionIndex: 0, targetId: target.id, doubleEdgeMode: "ignore_defense" });
    const random = context.mock.method(Math, "random", () => 0.1);
    try {
      state = advance(state, "turn_end_action");
    } finally {
      random.mock.restore();
    }
    const wounds = state.eventLog.filter((event) => event.type === "damage" && event.targetId === player.id);
    assert.deepEqual(wounds.map(({ amount }) => amount), [1, 1], TOTEM_KINDS[totemKind].name);
    assert.ok(state.eventLog.some((event) => event.type === "damage" && event.attackDamage &&
      event.targetId === target.id && event.sourceId === player.id), TOTEM_KINDS[totemKind].name);
    assert.equal(state.totems?.length, 1);
  }
});

test("真·双刃剑救回被全场效果抹除的攻击，并追加对应反噬", () => {
  for (const [field, stacks] of [["1043", 1], ["1041", 3]] as const) {
    let { state, player, card } = fixture(2);
    for (const id of BLADE_MAINTENANCE_IDS) {
      while (getBrokenBlade(card).remaining) assert.ok(spendBrokenBladeUse(card));
      assert.ok(maintainBrokenBlade(state, player, `${id}_reforge`, card.instanceId));
    }
    player.cakes = stacks;
    const [, target, fieldOwner] = state.players;
    appendSkillInstances(fieldOwner!, [field]);
    state = reveal(state, [{ type: "attack", attackId: "sha", targetId: target!.id, stacks }, cake, cake]);
    state = submitActionWindowSkill(state, player.id, { type: "skill", skillId: BLADE_DOUBLE_EDGE_ID, stacks: 1,
      switchActionIndex: 0, targetId: target!.id, doubleEdgeMode: "ignore_defense" });
    state = advance(state, "turn_end_action");
    assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === target!.id && event.attackName === "杀"));
    assert.deepEqual(state.eventLog.flatMap((event) => event.type === "damage" && event.targetId === player.id ? [event.amount] : []), [1, 1]);
  }
});

test("毁灭星辰击的失效可由真·双刃剑对选中目标破除", () => {
  let { state, player, card } = fixture(2);
  for (const id of BLADE_MAINTENANCE_IDS) {
    while (getBrokenBlade(card).remaining) assert.ok(spendBrokenBladeUse(card));
    assert.ok(maintainBrokenBlade(state, player, `${id}_reforge`, card.instanceId));
  }
  player.bigCards!.push({ cardId: "10506", instanceId: "star" });
  player.buffs.push({ id: "star-disabled", stateType: "star_group_attack_disabled", name: "群攻技能失效", stacks: 1,
    expiresAtRound: state.roundNumber + 1, sourceAbilityId: "1050603", sourcePlayerId: state.players[2]!.id });
  changeElementAmount(player, "星", 2);
  const targetId = state.players[1]!.id;
  state = reveal(state, [{ type: "skill", skillId: "1050603", bigCardInstanceId: "star", stacks: 1 }, cake, cake]);
  state = submitActionWindowSkill(state, player.id, { type: "skill", skillId: BLADE_DOUBLE_EDGE_ID, stacks: 1,
    switchActionIndex: 0, targetId, doubleEdgeMode: "ignore_defense" });
  state = advance(state, "turn_end_action");
  const hits = state.eventLog.filter((event) => event.type === "damage" && event.attackName === "毁灭星辰击");
  assert.deepEqual(hits.map((event) => event.type === "damage" && event.targetId), [targetId]);
  assert.deepEqual(state.eventLog.flatMap((event) => event.type === "damage" && event.targetId === player.id ? [event.amount] : []), [1, 1]);
});

test("同一群攻破除同一项全场技能只额外反噬一次", () => {
  let { state, player, card } = fixture(2);
  for (const id of BLADE_MAINTENANCE_IDS) {
    while (getBrokenBlade(card).remaining) assert.ok(spendBrokenBladeUse(card));
    assert.ok(maintainBrokenBlade(state, player, `${id}_reforge`, card.instanceId));
  }
  player.cakes = 2;
  appendSkillInstances(state.players[2]!, ["1043"]);
  state = reveal(state, [{ type: "attack", attackId: "wan_jian", stacks: 1 }, cake, cake]);
  state = submitActionWindowSkill(state, player.id, { type: "skill", skillId: BLADE_DOUBLE_EDGE_ID, stacks: 1,
    switchActionIndex: 0, doubleEdgeMode: "pierce_rebound" });
  state = advance(state, "turn_end_action");
  assert.equal(state.eventLog.filter((event) => event.type === "damage" && event.sourceId === player.id && event.targetId !== player.id).length, 2);
  assert.deepEqual(state.eventLog.flatMap((event) => event.type === "damage" && event.targetId === player.id ? [event.amount] : []), [2, 1]);
});
