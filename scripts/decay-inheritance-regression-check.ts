import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, BLADE_DOUBLE_EDGE_ID, BLADE_MAINTENANCE_IDS,
  BROKEN_BLADE_CARD_ID, createGame, createPlayer, enterActionWindow, getActiveSkillCount, getBrokenBlade,
  getBigCard, getFusionSkillId, grantInitializedSkill, maintainBrokenBlade, selectBrokenBladeDoubleEdge, startGame,
  submitActionWindowSkill, submitPlayerAction, validateAction, validateActionWindowSkill, type SkillAction
} from "../packages/shared/src";
import { getDecayMarkCount } from "../packages/shared/src/engine/decayHp";
import { ANNIHILATION_FUSION_ID, ANNIHILATION_MARK, DECAY_CARD_ID, DECAY_CONVERSION_ID, DECAY_HALF_ID, DECAY_INHERIT_ID,
  DECAY_MARK } from "../packages/shared/src/engine/decayIds";
import { settleDecayConversions } from "../packages/shared/src/engine/decayInheritance";
import { absorbBigCardAbility, detachBigCardAbility, grantFreshBigCard } from "../packages/shared/src/engine/bigCards";
import { bigCardHasAbility } from "../packages/shared/src/bigCards/abilities";
import { TOTEM_CARD_ID, TOTEM_CHOOSE_ID, TOTEM_CREATE_ID } from "../packages/shared/src/engine/totemIds";
import { TIGER_CARD, TIGER_LOSS, TIGER_RESTORE, TIGER_SLASH, TIGER_SWITCH } from "../packages/shared/src/engine/netherTigerIds";
import { DEAD_REALM_CARD_ID, DEAD_REALM_FALLBACK_ID } from "../packages/shared/src/engine/deadRealmIds";
import { SHADOW_CARD_ID, SHADOW_COMBO_ID } from "../packages/shared/src/engine/shadowIds";
import { THORN_DANCE_CARD_ID, THORN_DANCE_ID } from "../packages/shared/src/engine/thornDanceIds";
import { CURTAIN_CARD_ID, CURTAIN_ENCORE_ID } from "../packages/shared/src/engine/curtainIds";

function fixture(playerCount = 4) {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 2, firstTurnNoAttack: false });
  for (let index = 1; index < playerCount; index++) state = addPlayerToGame(state, createPlayer(`玩家${index}`));
  return state;
}

test("吸取破败之道的衰败后直接解锁，原版仍以自身伤害解锁且使用仍需付费", (context) => {
  let state = fixture();
  state.players[0]!.bigCards = [{ cardId: DECAY_CARD_ID, instanceId: "decay" }];
  state = startGame(state);
  while (state.phase === "action_window") state = advanceActionWindow(state);
  const [owner, recipient, target] = state.players;
  assert.equal(getActiveSkillCount(owner, DECAY_HALF_ID), 0);
  const clauses = getBigCard(DECAY_CARD_ID)!.abilities;
  context.mock.method(Math, "random", () => (clauses.findIndex(({ id }) => id === DECAY_HALF_ID) + 0.5) / clauses.length);
  assert.ok(absorbBigCardAbility(state, recipient!, owner!));
  const action: SkillAction = { type: "skill", skillId: DECAY_HALF_ID, targetId: target!.id, stacks: 1 };
  assert.equal(getActiveSkillCount(recipient, DECAY_HALF_ID), 1);
  assert.equal(validateAction(state, recipient!.id, action).ok, false);
  recipient!.cakes = 50;
  assert.equal(validateAction(state, recipient!.id, action).ok, true);
});

test("依赖整张卡的子技能仍归吸取者持有，但没有独立效果", () => {
  const state = startGame(fixture());
  const player = state.players[0]!;
  const inert = [[DEAD_REALM_CARD_ID, DEAD_REALM_FALLBACK_ID], [SHADOW_CARD_ID, SHADOW_COMBO_ID],
    [THORN_DANCE_CARD_ID, THORN_DANCE_ID], [CURTAIN_CARD_ID, CURTAIN_ENCORE_ID],
    ...[TIGER_SWITCH, TIGER_LOSS, TIGER_RESTORE].map((id) => [TIGER_CARD, id]),
    ...getBigCard(TOTEM_CARD_ID)!.abilities.map(({ id }) => [TOTEM_CARD_ID, id])];
  for (const [cardId, onlyAbilityId] of inert) {
    const card = grantFreshBigCard(state, player, { instanceId: "source", cardId: cardId!, onlyAbilityId });
    assert.ok(bigCardHasAbility(card, onlyAbilityId!));
    assert.equal(getActiveSkillCount(player, onlyAbilityId!), 0, onlyAbilityId);
  }
  assert.equal(getActiveSkillCount(player, TOTEM_CREATE_ID), 0);
  assert.equal(getActiveSkillCount(player, TOTEM_CHOOSE_ID), 0);
  const claw = grantFreshBigCard(state, player, { instanceId: "source", cardId: TIGER_CARD, onlyAbilityId: TIGER_SLASH });
  assert.equal(claw.tigerForms, undefined);
  assert.equal(getActiveSkillCount(player, TIGER_SLASH), 1);
});

test("1055902实际发放四融合寂灭，移走子技能时同步移除对应素材", () => {
  let state = fixture(2);
  state.players[0]!.bigCards = [{ cardId: DECAY_CARD_ID, instanceId: "decay" }];
  state = startGame(state);
  const player = state.players[0]!;
  const [card] = player.bigCards!;
  const fusion = player.skillFusions?.find(({ skillId }) => skillId === ANNIHILATION_FUSION_ID);
  assert.ok(fusion);
  assert.equal(fusion.sourceBigCardInstanceId, card!.instanceId);
  assert.equal(fusion.materialFusionIds?.length, 2);
  assert.equal(getActiveSkillCount(player, BLADE_DOUBLE_EDGE_ID), 1);
  assert.ok(detachBigCardAbility(player, card!, DECAY_INHERIT_ID));
  assert.equal(player.skillFusions?.length, 0);
  assert.equal(getActiveSkillCount(player, BLADE_DOUBLE_EDGE_ID), 0);
});

test("技能转化持续检测新获得的血之哀并保留其他素材", () => {
  let state = fixture();
  state.players[0]!.bigCards = [{ cardId: DECAY_CARD_ID, instanceId: "decay" }];
  state = startGame(state);
  const [owner, opponent, other, isolated] = state.players;
  isolated!.spaceId = "alone";
  appendSkillInstances(owner!, ["1011"]);
  appendSkillInstances(opponent!, ["1011", "1011"]);
  grantInitializedSkill(state, other!.id, getFusionSkillId("制裁之刃"), "测试", false);
  appendSkillInstances(isolated!, ["1011"]);
  settleDecayConversions(state);
  assert.equal(getActiveSkillCount(owner, DECAY_CONVERSION_ID), 0);
  assert.equal(opponent!.skills.filter((id) => id === "1011").length, 2);

  owner!.bigCards![0]!.decayUnlocked = true;
  settleDecayConversions(state);
  assert.equal(getDecayMarkCount(owner, ANNIHILATION_MARK), 1);
  assert.equal(getDecayMarkCount(opponent, DECAY_MARK), 2);
  assert.equal(getDecayMarkCount(other, DECAY_MARK), 1);
  assert.equal(other!.skillFusions?.length, 0);
  assert.deepEqual(other!.skills, ["1045"]);
  assert.equal(getDecayMarkCount(isolated, DECAY_MARK), 0);
  assert.deepEqual(isolated!.skills, ["1011"]);

  appendSkillInstances(opponent!, ["1011"]);
  settleDecayConversions(state);
  settleDecayConversions(state);
  assert.equal(getDecayMarkCount(opponent, DECAY_MARK), 3);
  assert.equal(opponent!.skills.includes("1011"), false);
});

test("两个破败之道持有者互相转化，并各得第三人寂灭的一层印记", () => {
  let state = fixture();
  for (let index = 0; index < 2; index++) state.players[index]!.bigCards = [{ cardId: DECAY_CARD_ID, instanceId: `decay${index}` }];
  state = startGame(state);
  const [first, second, third, isolated] = state.players;
  for (const owner of [first!, second!]) owner.bigCards![0]!.decayUnlocked = true;
  for (const player of [third!, isolated!]) {
    grantInitializedSkill(state, player.id, ANNIHILATION_FUSION_ID, "测试", false);
    appendSkillInstances(player, ["1030"]);
  }
  isolated!.spaceId = "alone";
  settleDecayConversions(state);
  for (const owner of [first!, second!]) {
    assert.equal(getDecayMarkCount(owner, ANNIHILATION_MARK), 2);
    assert.equal(owner.skillFusions?.length, 0);
    assert.deepEqual(owner.skills, []);
  }
  assert.equal(third!.skillFusions?.length, 0);
  assert.deepEqual(third!.skills, ["1030"]);
  assert.equal(getActiveSkillCount(isolated, ANNIHILATION_FUSION_ID), 1);
});

test("寂灭的双刃剑可独立发动，耗尽战刃仍可用", () => {
  let state = fixture(2);
  state.players[0]!.bigCards = [{ cardId: DECAY_CARD_ID, instanceId: "decay" }, { cardId: BROKEN_BLADE_CARD_ID, instanceId: "blade" }];
  state = startGame(state);
  for (let step = 0; state.phase === "action_window" && step < 50; step++) state = advanceActionWindow(state);
  const [owner, target] = state.players;
  const blade = owner!.bigCards!.find(({ instanceId }) => instanceId === "blade")!;
  blade.brokenBlade = { ...getBrokenBlade(blade), remaining: 0 };
  assert.equal(maintainBrokenBlade(state, owner!, `${BLADE_MAINTENANCE_IDS[0]}_reforge`, blade.instanceId), true);
  assert.equal(selectBrokenBladeDoubleEdge(owner!, "ignore_defense"), undefined);
  assert.equal(selectBrokenBladeDoubleEdge(owner!, "ignore_defense", blade.instanceId), blade);

  owner!.cakes = 1;
  state = submitPlayerAction(state, owner!.id, { type: "attack", attackId: "sha", targetId: target!.id, stacks: 1 }).state;
  state = submitPlayerAction(state, target!.id, { type: "defense", defense: "small" }).state;
  state = enterActionWindow(state, owner!.id);
  const action: SkillAction = { type: "skill", skillId: BLADE_DOUBLE_EDGE_ID, stacks: 1, targetId: target!.id, switchActionIndex: 0 };
  assert.equal(validateActionWindowSkill(state, owner!.id, action).ok, true);
  const used = submitActionWindowSkill(state, owner!.id, action);
  assert.equal(getBrokenBlade(used.players[0]!.bigCards!.find(({ instanceId }) => instanceId === "blade")!).remaining, 25);
  const latestBlade = state.players[0]!.bigCards!.find(({ instanceId }) => instanceId === "blade")!;
  latestBlade.brokenBlade = { ...getBrokenBlade(latestBlade), remaining: 0 };
  assert.equal(validateActionWindowSkill(state, owner!.id, action).ok, true);
  state = submitActionWindowSkill(state, owner!.id, action);
  assert.equal(getBrokenBlade(state.players[0]!.bigCards!.find(({ instanceId }) => instanceId === "blade")!).remaining, 0);
});

test("寂灭的双刃剑在同一变招阶段可依次处理不同的目标", () => {
  let state = fixture(3);
  state.players[0]!.bigCards = [{ cardId: DECAY_CARD_ID, instanceId: "decay" }];
  state = startGame(state);
  for (let step = 0; state.phase === "action_window" && step < 50; step++) state = advanceActionWindow(state);
  const [owner, first, second] = state.players;
  owner!.cakes = 2;
  state = submitPlayerAction(state, owner!.id, { type: "attack", attackId: "wan_jian", stacks: 1 }).state;
  for (const target of [first!, second!]) state = submitPlayerAction(state, target.id, { type: "defense", defense: "small" }).state;
  state = enterActionWindow(state, owner!.id);
  for (const target of [first!, second!]) {
    const action: SkillAction = { type: "skill", skillId: BLADE_DOUBLE_EDGE_ID, stacks: 1, targetId: target.id, switchActionIndex: 0 };
    assert.equal(validateActionWindowSkill(state, owner!.id, action).ok, true);
    state = submitActionWindowSkill(state, owner!.id, action);
  }
  const queued = state.players[0]!.buffs.filter(({ id }) => id.startsWith("double_edge_ignore_defense:0:"));
  assert.deepEqual(queued.map(({ sourcePlayerId }) => sourcePlayerId), [first!.id, second!.id]);
});
