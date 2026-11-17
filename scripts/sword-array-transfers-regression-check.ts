import assert from "node:assert/strict";
import { test } from "node:test";
import { addPlayerToGame, createGame, createPlayer } from "../packages/shared/src";
import { getFusionSkillId } from "../packages/shared/src/skills/fusion";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";
import { appendSkillInstances } from "../packages/shared/src/engine/skillInventory";
import { borrowBigCards, settleDragonRoundChanges } from "../packages/shared/src/engine/bigCards";
import { effectHasCategory } from "../packages/shared/src/engine/effectCategories";
import { SWORD_ARRAY_DEVOUR_ID } from "../packages/shared/src/engine/swordArrayIds";
import { devourSwordArrayCard, stealSwordArrayRevivalAndLives } from "../packages/shared/src/engine/swordArrayTransfers";

function fixture() {
  const state = addPlayerToGame(createGame("甲", { skillMode: "big_test_select" }), createPlayer("乙"));
  const [source, target] = state.players;
  return { state, source: source!, target: target! };
}

test("长生按取得时间从新到旧夺取多余命并初始化复活技，保留目标当前命", () => {
  const { state, source, target } = fixture();
  target.hp = 17;
  target.spareLives = [
    { hp: 5, acquiredOrder: 2 },
    { hp: 1, acquiredOrder: 1 },
    { hp: 9, acquiredOrder: 3, effects: [{ kind: "starting_defense", amount: 6 }] }
  ];
  appendSkillInstances(target, ["1065", "1066", "1065"]);
  target.buffs.push({ id: "skill_used:1065", name: "技能使用次数", stacks: 2 });
  target.bigCards = [{ cardId: "10549", instanceId: "returner", abilityUses: { "1054904": 1 } }];

  assert.equal(stealSwordArrayRevivalAndLives(state, source, target), true);
  assert.equal(target.hp, 17);
  assert.deepEqual(target.spareLives, []);
  assert.deepEqual(source.spareLives?.map(({ hp }) => hp), [9, 5, 1]);
  assert.deepEqual(source.spareLives?.[0]?.effects, [{ kind: "starting_defense", amount: 6 }]);
  assert.deepEqual(target.skills, ["1066"]);
  assert.deepEqual(source.skills, ["1065", "1065"]);
  assert.ok(!source.buffs.some((buff) => buff.id === "skill_used:1065"));
  assert.deepEqual(new Set(target.bigCards[0]?.lostAbilityIds), new Set(["1054903", "1054904"]));
  assert.deepEqual(new Set(source.bigCards?.map((card) => card.onlyAbilityId)), new Set(["1054903", "1054904"]));
  assert.ok(source.bigCards?.every((card) => card.abilityUses === undefined));
});

test("长生的夺命与夺技各自检查保护", () => {
  const { state, source, target } = fixture();
  target.spareLives = [{ hp: 4 }];
  appendSkillInstances(target, ["1065"]);
  target.buffs.push({ id: "protect_life", name: "免疫吸命", stacks: 1, immuneEffectCategories: ["life_absorption"] });
  assert.equal(stealSwordArrayRevivalAndLives(state, source, target), true);
  assert.deepEqual(target.spareLives, [{ hp: 4 }]);
  assert.deepEqual(source.skills, ["1065"]);
});

test("长生把复活融合连同素材整体移走并发放独立副本", () => {
  const { state, source, target } = fixture();
  const id = getFusionSkillId("贤者的庇护");
  const instanceId = grantInitializedSkill(state, target.id, id, "测试", false);
  const originals = target.skills.slice();
  assert.ok(instanceId);
  assert.equal(stealSwordArrayRevivalAndLives(state, source, target), true);
  assert.deepEqual(target.skillFusions, []);
  assert.deepEqual(target.skills, []);
  assert.deepEqual(source.skills, originals);
  assert.equal(source.skillFusions?.[0]?.skillId, id);
  assert.notEqual(source.skillFusions?.[0]?.id, instanceId);
});

test("吞天仅吞噬整卡，吸取免疫无效，吞噬免疫或技能失去免疫会保护目标", () => {
  const { state, source, target } = fixture();
  target.bigCards = [
    { cardId: "10549", instanceId: "fragment", onlyAbilityId: "1054904" },
    { cardId: "10555", instanceId: "full", abilityUses: { "1055506": 2 } }
  ];
  target.buffs.push({ id: "protect_absorption", name: "免疫吸取", stacks: 1, immuneEffectCategories: ["skill_absorption"] });
  assert.equal(effectHasCategory(SWORD_ARRAY_DEVOUR_ID, "skill_devour"), true);
  assert.equal(effectHasCategory(SWORD_ARRAY_DEVOUR_ID, "skill_absorption"), false);
  for (const category of ["skill_devour", "skill_loss"] as const) {
    target.buffs.push({ id: category, name: "保护", stacks: 1, immuneEffectCategories: [category] });
    assert.equal(devourSwordArrayCard(state, source, target), false);
    assert.equal(target.bigCards.length, 2);
    target.buffs.pop();
  }
  assert.equal(devourSwordArrayCard(state, source, target), true);
  assert.deepEqual(target.bigCards.map(({ instanceId }) => instanceId), ["fragment"]);
  assert.deepEqual(source.bigCards?.map(({ cardId, onlyAbilityId, abilityUses }) => [cardId, onlyAbilityId, abilityUses]), [
    ["10555", undefined, undefined]
  ]);
});

test("吞噬暂借大卡会转移借用副本，到期仍归还原持有者", () => {
  const fixtureState = fixture();
  const state = addPlayerToGame(fixtureState.state, createPlayer("丙"));
  const [source, borrower, owner] = state.players;
  owner!.bigCards = [{ cardId: "10555", instanceId: "original", abilityUses: { "1055506": 2 } }];
  assert.equal(borrowBigCards(state, borrower!, owner!), true);
  assert.equal(owner!.bigCards.length, 0);
  assert.equal(devourSwordArrayCard(state, source!, borrower!), true);
  assert.equal(borrower!.bigCards?.length, 0);
  const borrowed = source!.bigCards?.[0];
  assert.ok(borrowed?.borrowedUntilRound);
  assert.equal(state.borrowedBigCards?.[0]?.copyId, borrowed.instanceId);
  state.roundNumber = borrowed.borrowedUntilRound;
  settleDragonRoundChanges(state);
  assert.equal(source!.bigCards?.length, 0);
  assert.equal(owner!.bigCards[0]?.instanceId, "original");
  assert.equal(owner!.bigCards[0]?.abilityUses?.["1055506"], 2);
});
