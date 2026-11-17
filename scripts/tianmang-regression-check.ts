import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, COMMON_FUSION_SKILL_ID, createGame, createPlayer,
  getActiveFusionCount, getActiveSkillCount, getAllSkills, getCakeGainAmount, getFusionMaterialSelection, getFusionSkillId,
  getBigCard, getSkill, getSkillUseLimit, getTurnSkillActionCost, JIHAN_ULTIMATE_ID, startGame, submitActionWindowSkill, submitPlayerAction,
  TIANMANG_ABSORB_ID, TIANMANG_ABSORB_INFINITE_ID, TIANMANG_CAKE_ID, TIANMANG_CARD_ID, TIANMANG_CLEANSE_ID,
  TIANMANG_CONVERSION_ID, TIANMANG_ELEMENT, TIANMANG_FIELD_CLEANSE_ID, TIANMANG_FUSION_ID, TIANMANG_GATHER_ID,
  TIANMANG_MIRROR_ID, TIANMANG_SAND_ID, type GameState, type PlayerAction, type SkillTimingPhase
} from "@bing/shared";
import { changeElementAmount, getElementAmount } from "../packages/shared/src/engine/elementResources";
import { loseBigCardAbility } from "../packages/shared/src/engine/bigCards";
import { openSacredBeast } from "../packages/shared/src/engine/honghuang";
import { getSixStarArrayChances } from "../packages/shared/src/engine/tianmang";
import { addCombatValues, compareCombatValues, combatValue } from "../packages/shared/src/engine/combatValues";
import { getPlayerHpValue } from "../packages/shared/src/engine/infiniteValues";
import { getStoredDamages, setStoredDamages } from "../packages/shared/src/engine/storedDamage";
import { withSixStarOutcomes } from "./six-star-test-dice";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const cast = (skillId: string, stacks = 1) => ({ type: "skill", skillId, stacks }) as const;
const sha = (state: GameState, target: number, stacks = 1) => ({ type: "attack", attackId: "sha",
  stacks, targetId: state.players[target]!.id }) as const;
const owner = (state: GameState) => state.players[0]!;
const hp = (state: GameState) => state.players.map((player) => player.hp);

function drain(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let i = 0; i < 50 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(secondHolder = false): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 4, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ cardId: TIANMANG_CARD_ID, instanceId: "mang-one" }];
  if (secondHolder) state.players[1]!.bigCards = [{ cardId: TIANMANG_CARD_ID, instanceId: "mang-two" }];
  state = drain(startGame(state));
  for (const player of state.players) { player.hp = 30; player.cakes = 50; }
  return state;
}

function reveal(state: GameState, moves: PlayerAction[]): GameState {
  state = drain(state);
  for (const [index, player] of state.players.entries()) {
    if (player.status === "alive") state = submitPlayerAction(state, player.id, moves[index] ?? cake).state;
  }
  return state;
}

test("实际发放六芒星阵，积芒按重数付费，生效回合无敌", () => {
  let state = fixture();
  assert.equal(getActiveFusionCount(owner(state), "六芒星阵"), 1);
  state = withSixStarOutcomes([], () => drain(reveal(state, [cast(TIANMANG_GATHER_ID, 2), sha(state, 0, 5)]), "turn_end_action"));
  assert.equal(owner(state).cakes, 44);
  assert.equal(getElementAmount(owner(state), TIANMANG_ELEMENT), 2);
  assert.equal(owner(state).hp, 30);
  assert.ok(loseBigCardAbility(owner(state), owner(state).bigCards![0]!, TIANMANG_CONVERSION_ID));
  assert.equal(getActiveFusionCount(owner(state), "六芒星阵"), 0);
});

test("仿生和自主创造按卡牌计次数，生成可融合的独立副本", () => {
  let state = fixture();
  for (const id of [TIANMANG_MIRROR_ID, TIANMANG_MIRROR_ID, TIANMANG_SAND_ID]) state = drain(reveal(state, [cast(id)]));
  assert.equal(getSkillUseLimit(owner(state), TIANMANG_MIRROR_ID), 0);
  assert.equal(getSkillUseLimit(owner(state), TIANMANG_SAND_ID), 0);
  assert.throws(() => submitPlayerAction(state, owner(state).id, cast(TIANMANG_MIRROR_ID)));
  assert.equal(owner(state).skillInventory?.filter(({ skillId }) => skillId === "1100").length, 2);
  assert.equal(owner(state).skillInventory?.filter(({ skillId }) => skillId === "1003").length, 1);
  appendSkillInstances(owner(state), ["1100"]);
  assert.ok(getFusionMaterialSelection(owner(state), getFusionSkillId("魔方")));
});

test("快速创造提供出饼倍率，极速创造使常规融合的验证和实际扣费都为零", () => {
  let state = fixture();
  changeElementAmount(owner(state), TIANMANG_ELEMENT, 5);
  state = drain(reveal(state, [cast(TIANMANG_CAKE_ID)]));
  assert.equal(getCakeGainAmount(state, owner(state)), 3);
  const before = owner(state).cakes;
  state = drain(reveal(state, [cake]));
  assert.equal(owner(state).cakes - before, 3);
  state = drain(reveal(state, [cast(TIANMANG_FUSION_ID)]));
  appendSkillInstances(owner(state), ["1100", "1100", "1100"]);
  owner(state).cakes = 0;
  const fusion = { ...cast(COMMON_FUSION_SKILL_ID), targetSkillId: getFusionSkillId("魔方"), fusionRequestId: "tianmang_test_cube" };
  assert.equal(getTurnSkillActionCost(owner(state), fusion, state), 0);
  state = drain(reveal(state, [fusion]));
  assert.equal(getActiveFusionCount(owner(state), "魔方"), 1);
  assert.equal(owner(state).cakes, 0);
});

test("真净化清除可解除不良，三项概率加 1/6，技能失效期间不能施放", () => {
  let state = fixture();
  changeElementAmount(owner(state), TIANMANG_ELEMENT, 4);
  state = reveal(state, [small, sha(state, 2, 4)]);
  owner(state).buffs.push({ id: "burn_test", name: "烧伤", stateType: "burning", stacks: 1 },
    { id: "unremovable_test", name: "眩晕", stateType: "stunned", stacks: 1, uncleansable: true });
  owner(state).buffs.push({ id: "skill_disabled_until_round:1", name: "技能失效", stacks: 1 });
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, cast(TIANMANG_CLEANSE_ID)), /技能失效/);
  owner(state).buffs = owner(state).buffs.filter((buff) => !buff.id.startsWith("skill_disabled_until_round:"));
  state = submitActionWindowSkill(state, owner(state).id, cast(TIANMANG_CLEANSE_ID));
  assert.ok(!owner(state).buffs.some(({ id }) => id === "burn_test"));
  assert.ok(owner(state).buffs.some(({ id }) => id === "unremovable_test"));
  assert.ok(owner(state).buffs.some(({ stateType }) => stateType === "tianmang_limited_disabled"));
  assert.deepEqual(getSixStarArrayChances(owner(state), true), [1 / 2, 1 / 3, 1 / 3]);
  assert.equal(getElementAmount(owner(state), TIANMANG_ELEMENT), 2);
});

test("神净化解除五类额外状态，保留元素、限定记录、小空间及不可解除状态", () => {
  let state = fixture();
  changeElementAmount(owner(state), TIANMANG_ELEMENT, 7);
  const other = state.players[1]!;
  changeElementAmount(other, "星", 2);
  other.storedDamages = [{ id: "legacy-held-damage", amountValue: combatValue(3), spellDamage: true }];
  const preserved = ["skill_used:1024", "flash_dodge_cooldown:test", "element:星", "protected-status"];
  other.buffs.push({ id: "defense_value", name: "防御值", stacks: 5 },
    { id: "test_shield", name: "护盾", stacks: 1, stateType: "shield" },
    { id: "frozen", name: "冰冻", stacks: 1, moveBlockedFromTurn: state.turnNumber + 1 },
    { id: "free_ri", name: "免费日", stacks: 1 },
    { id: "cross_mark", name: "十字印记", stacks: 1 },
    { id: "test_item", name: "物品", stateType: "inventory_item", stacks: 1 },
    ...preserved.filter((id) => !id.startsWith("element:")).map((id) =>
      ({ id, name: id, stacks: 1, ...(id === "protected-status" ? { stateType: "burning", uncleansable: true as const } : {}) })));
  const remote = state.players[3]!;
  remote.spaceId = "other-space";
  state.smallSpaces = { [remote.spaceId]: { name: "自我封闭", kind: "self_isolation", expiresAtRound: 3, cakeMultiplier: 3 } };
  remote.buffs.push({ id: "defense_value", name: "防御值", stacks: 4 });
  setStoredDamages(remote, [{ id: "remote-held-damage", amountValue: combatValue(6), fromAttack: true }]);
  appendSkillInstances(owner(state), ["1028"]);
  state = drain(reveal(state, [cast(TIANMANG_FIELD_CLEANSE_ID)]), "turn_end_action");
  assert.deepEqual(state.players[1]!.buffs.map(({ id }) => id).sort(), [...preserved, "tianmang_locked_disabled"].sort());
  assert.equal(state.players[3]!.spaceId, "other-space");
  assert.ok(state.players[3]!.buffs.some(({ id }) => id === "defense_value"));
  assert.deepEqual(getStoredDamages(state.players[1]), []);
  assert.equal(getStoredDamages(state.players[3]).length, 1);
  assert.equal(getElementAmount(owner(state), TIANMANG_ELEMENT), 3);
  assert.ok(owner(state).buffs.some(({ stateType }) => stateType === "tianmang_locked_disabled"));
  assert.equal(getActiveSkillCount(owner(state), "1028"), 0);
  assert.deepEqual(getSixStarArrayChances(owner(state), true), [2 / 3, 1 / 2, 1 / 2]);
});

test("神·净化提前关闭神兽，保留本段开启记录和封存的融合", () => {
  let state = fixture();
  const target = state.players[1]!;
  target.bigCards = [{ instanceId: "beast-card", cardId: "10518", initialized: true }];
  openSacredBeast(state, target, "tortoise");
  assert.equal(getActiveFusionCount(target, "神隐斗篷"), 1);
  changeElementAmount(owner(state), TIANMANG_ELEMENT, 4);
  state = drain(reveal(state, [cast(TIANMANG_FIELD_CLEANSE_ID)]), "turn_end_action");
  const affected = state.players[1]!;
  const beast = affected.bigCards![0]!.sacredBeasts!.tortoise!;
  assert.equal(state.roundNumber, 1);
  assert.equal(beast.active, false);
  assert.equal(beast.usedRound, 1);
  assert.ok(beast.stored?.fusions.some(({ skillId }) => skillId === getFusionSkillId("神隐斗篷")));
  assert.equal(getActiveFusionCount(affected, "神隐斗篷"), 0);
});

test("真·净化使对手当回合的限定技照付代价和次数但没有效果", () => {
  let state = fixture(true);
  changeElementAmount(owner(state), TIANMANG_ELEMENT, 2);
  state = drain(reveal(state, [cast(TIANMANG_CLEANSE_ID), cast(TIANMANG_MIRROR_ID)]), "turn_end_action");
  const opponent = state.players[1]!;
  assert.equal(opponent.cakes, 46);
  assert.equal(getSkillUseLimit(opponent, TIANMANG_MIRROR_ID), 1);
  assert.equal(getActiveSkillCount(opponent, "1100"), 0);
  assert.ok(opponent.buffs.some(({ id }) => id === "tianmang_limited_disabled"));
});

test("神·净化关闭对手八卦阵，且卡面标签与实际技能一致", () => {
  let state = fixture();
  appendSkillInstances(state.players[1]!, ["1028"]);
  changeElementAmount(owner(state), TIANMANG_ELEMENT, 4);
  state = drain(reveal(state, [cast(TIANMANG_FIELD_CLEANSE_ID), cake, sha(state, 1, 3)]), "turn_end_action");
  assert.equal(state.players[1]!.hp, 27);
  assert.equal(getActiveSkillCount(state.players[1], "1028"), 0);
  for (const [cardId, abilityId, tag] of [
    ["10526", "1052602", "锁定技"], ["10523", TIANMANG_MIRROR_ID, "限定技"], ["10526", "1052607", "控制技"]
  ] as const) {
    assert.ok(getBigCard(cardId)?.abilities.find(({ id }) => id === abilityId)?.typeTags?.includes(tag));
    assert.ok(getSkill(abilityId)?.typeTags.includes(tag));
  }
});

test("1芒版可在变伤把两笔伤害都转换并只加一次6血", () => {
  let state = fixture();
  changeElementAmount(owner(state), TIANMANG_ELEMENT, 1);
  state = withSixStarOutcomes([], () => drain(reveal(state, [cake, sha(state, 0, 4), sha(state, 0, 5)]), "turn_damage_modify"));
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  state = drain(submitActionWindowSkill(state, owner(state).id, cast(TIANMANG_CONVERSION_ID)), "turn_end_action");
  assert.equal(owner(state).hp, 41);
  assert.equal(getElementAmount(owner(state), TIANMANG_ELEMENT), 0);
});

test("独立三项都命中时先反弹，保留无敌但原目标不因该段回血", () => {
  let state = fixture();
  state = withSixStarOutcomes([[true, true, true]], () => drain(reveal(state, [cake, sha(state, 0, 4)]), "turn_end_action"));
  assert.equal(owner(state).hp, 30);
  assert.equal(state.players[1]!.hp, 26);
  assert.ok(owner(state).buffs.some(({ id }) => id === "six_star_array_invulnerability"));
  assert.equal(state.eventLog.filter((event) => event.type === "system" && event.probabilityChecks?.skillId === getFusionSkillId("六芒星阵")).length, 3);
});

test("单人吸收2与3后加25血，多人争同笔伤害时直接抵消", () => {
  for (const shared of [false, true]) {
    let state = fixture(shared);
    changeElementAmount(owner(state), TIANMANG_ELEMENT, 6);
    if (shared) changeElementAmount(state.players[1]!, TIANMANG_ELEMENT, 6);
    const first = shared ? cast(TIANMANG_ABSORB_INFINITE_ID) : sha(state, 3, 2);
    state = drain(reveal(state, [cast(TIANMANG_ABSORB_ID), first, sha(state, 3, 3), cake]));
    assert.deepEqual(hp(state), shared ? [30, 30, 30, 30] : [55, 30, 30, 30]);
  }
});

test("六芒星阵反弹换目标后恢复攻击者原有的酒增幅", () => {
  let state = fixture();
  changeElementAmount(owner(state), TIANMANG_ELEMENT, 3);
  appendSkillInstances(state.players[1]!, ["1033"]);
  state = withSixStarOutcomes([[false, false, true]], () =>
    drain(reveal(state, [cast(TIANMANG_ABSORB_ID), sha(state, 0, 4)])));
  assert.equal(state.players[1]!.hp, 30);
  assert.equal(owner(state).hp, 55);
});

test("神六芒星能吸收无限，真六芒星的上限严格低于无限", () => {
  let state = fixture(true);
  changeElementAmount(owner(state), TIANMANG_ELEMENT, 3);
  changeElementAmount(state.players[1]!, TIANMANG_ELEMENT, 6);
  state.players[2]!.bigCards = [{ cardId: "10503", instanceId: "jihan-ultimate", onlyAbilityId: JIHAN_ULTIMATE_ID }];
  state = drain(reveal(state, [cast(TIANMANG_ABSORB_ID), cast(TIANMANG_ABSORB_INFINITE_ID), cast(JIHAN_ULTIMATE_ID), cake]));
  assert.equal(owner(state).hp, 30);
  assert.equal(state.players[3]!.hp, 30);
  assert.equal(compareCombatValues(getPlayerHpValue(state.players[1]!), addCombatValues(combatValue(1, 2), combatValue(30))), 0);
});

test("技能免疫挡技能攻击和附加寒冰剑，普通杀仍按基础伤害吸收", () => {
  let state = fixture();
  const frost = getAllSkills().find(({ name }) => name === "寒冰剑")!.id;
  const spell = getAllSkills().find(({ name }) => name === "火球")!.id;
  changeElementAmount(owner(state), TIANMANG_ELEMENT, 3);
  appendSkillInstances(state.players[1]!, [frost]);
  appendSkillInstances(state.players[2]!, [spell]);
  state = reveal(state, [cast(TIANMANG_ABSORB_ID), sha(state, 0, 4),
    { ...cast(spell), targetId: owner(state).id }]);
  state = submitActionWindowSkill(state, state.players[1]!.id, cast(frost));
  state = withSixStarOutcomes([], () => drain(state, "turn_end_action"));
  assert.ok(!owner(state).buffs.some(({ id }) => id.startsWith("skill_disabled_until_round:")));
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.protectionName === "天芒·技能免疫"));
  state = drain(state);
  // Base 4-point sha, then the holder's own two-point reduction from 六芒星阵.
  assert.equal(owner(state).hp, 34);
});
