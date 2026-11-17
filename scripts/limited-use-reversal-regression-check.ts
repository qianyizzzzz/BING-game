import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame } from "../packages/shared/src/engine/gameFactory";
import { getDestroyPowerCooldownCount, getDestroyPowerRemainingUses, getFlashFamilySlots, getFusionSkillId } from "../packages/shared/src/skills/fusion";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";
import { getSkillPlay, getSkillUseLimit } from "../packages/shared/src/skills/registry";
import { bigCardHasAbilityUses, GOD_KING_JUDGMENT_ID, GOD_KING_RULES_ID, HEALING_ART_ID, PURPLE_FORESIGHT_ID,
  PURPLE_INSIGHT_ID, SACRED_BEAST_ID, SOUL_SINK_ID } from "../packages/shared/src/bigCards/abilities";
import { DEMON_IMP_ID } from "../packages/shared/src/engine/demonIds";
import { demonSummonBalance } from "../packages/shared/src/engine/demons";
import { availableSacredBeasts, closeSacredBeasts, openSacredBeast } from "../packages/shared/src/engine/honghuang";
import { captureInitialPlayerStates, restorePlayerInitialState } from "../packages/shared/src/engine/initialPlayerState";
import { getBigCardLimitedRemaining, getPeriodicUses, getSkillUseBalanceAdjustment, invertPeriodicUses } from "../packages/shared/src/engine/limitedUseBalance";
import { invertLimitedSkillUses, zeroLimitedSkillUses } from "../packages/shared/src/engine/limitedUseReversal";
import { purpleForesightUses, purpleInsightUses } from "../packages/shared/src/engine/purpleEye";
import { applySakuraSpring } from "../packages/shared/src/engine/sakura";
import { addSandGrantUses } from "../packages/shared/src/engine/sand";
import { SHADOW_LEAVE_ID } from "../packages/shared/src/engine/shadowIds";
import { SEA_GOD_CARD_ID, SEA_GOD_RETURN_ID } from "../packages/shared/src/engine/seaGodIds";
import { getSeaGodReturnReadyAt, isSeaGodReturnReady, spendSeaGodReturnUse } from "../packages/shared/src/engine/seaGodMoves";
import { activateTianlieRage, hasTianlieRage, tianlieTemporaryUses } from "../packages/shared/src/engine/tianlie";
import { getDueXieyuSources, XIEYU_SKILL_ID } from "../packages/shared/src/engine/xieling";

test("整局次数可变为负数，新增次数要先填平，初始恢复与春之歌照常", () => {
  const state = createGame("甲", { skillMode: "big_test_select" });
  const player = state.players[0]!;
  player.skills.push(HEALING_ART_ID);
  const base = getSkillPlay(HEALING_ART_ID)!.usesPerGame!;
  player.bigCards = [{ cardId: "10553", instanceId: "shadow", onlyAbilityId: SHADOW_LEAVE_ID }];
  const card = player.bigCards[0]!;
  captureInitialPlayerStates(state);
  invertLimitedSkillUses(state, player);
  assert.equal(getSkillUseLimit(player, HEALING_ART_ID), -base);
  assert.equal(player.buffs.some(({ id }) => id === `skill_used:${HEALING_ART_ID}`), false);
  assert.equal(getBigCardLimitedRemaining(card, SHADOW_LEAVE_ID, 1), -1);
  assert.equal(bigCardHasAbilityUses(card, SHADOW_LEAVE_ID), false);
  card.abilityUseBonuses = { [SHADOW_LEAVE_ID]: 1 };
  assert.equal(getBigCardLimitedRemaining(card, SHADOW_LEAVE_ID, 1), 0);
  assert.equal(bigCardHasAbilityUses(card, SHADOW_LEAVE_ID), false);
  card.abilityUseBonuses[SHADOW_LEAVE_ID] = 2;
  assert.equal(bigCardHasAbilityUses(card, SHADOW_LEAVE_ID), true);
  applySakuraSpring(state, player);
  assert.equal(getSkillUseLimit(player, HEALING_ART_ID), base);
  assert.equal(restorePlayerInitialState(state, player), true);
  assert.equal(getSkillUseBalanceAdjustment(player, HEALING_ART_ID), 0);
  assert.equal(player.bigCards?.[0]?.abilityUseBalanceAdjustments, undefined);
});

test("周期两次反转为负二，下个周期恢复到零，再下周期恢复使用", () => {
  const state = createGame("甲");
  const player = state.players[0]!;
  invertPeriodicUses(player, "test", 1, 2, 6, 2);
  assert.equal(getPeriodicUses(player, "test", 1, 2), -2);
  assert.equal(getPeriodicUses(player, "test", 7, 2), 0);
  assert.equal(getPeriodicUses(player, "test", 13, 2), 2);
});

test("风袭将正负整局限定次数归零，清空额外次数并保留周期次数", () => {
  const state = createGame("甲", { skillMode: "big_test_select" });
  const player = state.players[0]!;
  player.skills.push("1012", HEALING_ART_ID, "1044", "1102");
  player.bigCards = [{ cardId: "10553", instanceId: "shadow", onlyAbilityId: SHADOW_LEAVE_ID },
    { cardId: "10527", instanceId: "soul", onlyAbilityId: SOUL_SINK_ID },
    { cardId: "10530", instanceId: "purple", onlyAbilityId: PURPLE_FORESIGHT_ID },
    { cardId: "10522", instanceId: "god", onlyAbilityId: GOD_KING_RULES_ID,
      abilityUseBonuses: { [GOD_KING_JUDGMENT_ID]: 4 } }];
  const [shadow, soul, purple, god] = player.bigCards;
  shadow!.abilityUseBalanceAdjustments = { [SHADOW_LEAVE_ID]: -3 };
  captureInitialPlayerStates(state);
  activateTianlieRage(state, player);
  addSandGrantUses(player, "1012", 3, "火烧大地");
  assert.ok(tianlieTemporaryUses(player, SOUL_SINK_ID) > 0);
  assert.equal(getBigCardLimitedRemaining(shadow!, SHADOW_LEAVE_ID, 1), -2);

  zeroLimitedSkillUses(state, player);
  assert.equal(getSkillUseLimit(player, "1012"), 0);
  assert.equal(getSkillUseLimit(player, HEALING_ART_ID), 0);
  assert.equal(getBigCardLimitedRemaining(shadow!, SHADOW_LEAVE_ID, 1), 0);
  assert.equal(getBigCardLimitedRemaining(soul!, SOUL_SINK_ID, 2), 0);
  assert.equal(getBigCardLimitedRemaining(god!, GOD_KING_JUDGMENT_ID, 0), 0);
  assert.equal(tianlieTemporaryUses(player, SOUL_SINK_ID), 0);
  assert.equal(hasTianlieRage(player), true);
  assert.equal(getDestroyPowerRemainingUses(player, state.roundNumber), 1);
  assert.ok((getFlashFamilySlots(player, state.roundNumber)[0]?.ready ?? Infinity) <= state.roundNumber);
  assert.equal(purpleForesightUses(state.roundNumber, purple!), 1);

  assert.equal(soul!.abilityUses?.[SOUL_SINK_ID], 2);
  soul!.abilityUses![SOUL_SINK_ID]!--;
  assert.equal(getBigCardLimitedRemaining(soul!, SOUL_SINK_ID, 2), 1);
  addSandGrantUses(player, "1012", 1, "火烧大地");
  assert.equal(getSkillUseLimit(player, "1012"), 1);
  assert.equal(restorePlayerInitialState(state, player), true);
  assert.equal(getSkillUseLimit(player, HEALING_ART_ID), 1);
});

test("风袭清空封锁下的融合、融合增益和暂时丢失的子技能次数", () => {
  const state = createGame("甲", { skillMode: "big_test_select" });
  const player = state.players[0]!;
  const eyes = getFusionSkillId("冰火两仪眼");
  const wind = getFusionSkillId("风之轻灵");
  grantInitializedSkill(state, player.id, eyes, "测试");
  grantInitializedSkill(state, player.id, wind, "测试");
  player.bigCards = [{ cardId: "10527", instanceId: "soul", onlyAbilityId: SOUL_SINK_ID, temporarilyLostAbilityIds: [SOUL_SINK_ID] }];
  assert.equal(getSkillUseLimit(player, eyes), 2);
  assert.equal(getSkillUseLimit(player, "1014"), 3);
  player.buffs.push({ id: "sealed_skill:" + eyes, name: "封印", stacks: 1 }, { id: "collapse_until_round:2", name: "沦陷", stacks: 1 });
  assert.equal(getSkillUseLimit(player, eyes), 0);
  zeroLimitedSkillUses(state, player);
  player.buffs = player.buffs.filter(({ name }) => name !== "封印" && name !== "沦陷");
  delete player.bigCards[0]!.temporarilyLostAbilityIds;
  assert.equal(getSkillUseLimit(player, eyes), 0);
  assert.equal(getSkillUseLimit(player, "1014"), 0);
  assert.equal(getBigCardLimitedRemaining(player.bigCards[0]!, SOUL_SINK_ID, 2), 0);
});

test("风袭清空已封存和当前开启的神兽限定技次数，关闭时分别结算各副本", () => {
  for (const closedBeforeWind of [true, false]) {
    const state = createGame("甲", { skillMode: "big_test_select" });
    const player = state.players[0]!;
    player.bigCards = [{ cardId: "10518", instanceId: "beasts", onlyAbilityId: SACRED_BEAST_ID }];
    grantInitializedSkill(state, player.id, "1024", "独立暗影盾");
    openSacredBeast(state, player, "tortoise");
    assert.equal(getSkillUseLimit(player, "1024"), 2);
    if (closedBeforeWind) closeSacredBeasts(state, [player]);
    zeroLimitedSkillUses(state, player);
    if (!closedBeforeWind) closeSacredBeasts(state, [player]);
    state.roundNumber = 7;
    openSacredBeast(state, player, "tortoise");
    const used = player.buffs.find(({ id }) => id === "skill_used:1024")?.stacks ?? 0;
    assert.equal(getSkillUseLimit(player, "1024"), used);
    assert.equal(player.bigCards[0]?.sacredBeasts?.tortoise?.used?.["1024"], 1);
  }
});

test("毁灭和闪现经一个空周期后恢复", () => {
  const state = createGame("甲");
  const player = state.players[0]!;
  player.skills.push("1044", "1102");
  invertLimitedSkillUses(state, player);
  assert.equal(getDestroyPowerCooldownCount(player, 1), 1);
  assert.equal(getDestroyPowerCooldownCount(player, 3), 1);
  assert.equal(getDestroyPowerCooldownCount(player, 5), 0);
  assert.equal(getFlashFamilySlots(player, 1)[0]?.ready, 7);
  assert.equal(getFlashFamilySlots(player, 4)[0]?.ready, 7);
  assert.ok((getFlashFamilySlots(player, 7)[0]?.ready ?? Infinity) <= 7);
});

test("一去不返按卡记录周期，净灵·奇反的负次数先回到零", () => {
  const state = createGame("甲", { skillMode: "big_test_select" });
  const player = state.players[0]!;
  player.bigCards = ["first", "second"].map((instanceId) => ({
    cardId: SEA_GOD_CARD_ID, instanceId, onlyAbilityId: SEA_GOD_RETURN_ID
  }));
  assert.equal(spendSeaGodReturnUse(player, 1, "first"), "first");
  assert.equal(isSeaGodReturnReady(player, 1, "first"), false);
  assert.equal(isSeaGodReturnReady(player, 1, "second"), true);
  invertLimitedSkillUses(state, player);
  assert.equal(getSeaGodReturnReadyAt(player, 1, "first"), 4);
  assert.equal(getSeaGodReturnReadyAt(player, 1, "second"), 7);
  assert.equal(isSeaGodReturnReady(player, 4, "first"), true);
  assert.equal(isSeaGodReturnReady(player, 4, "second"), false);
  assert.equal(isSeaGodReturnReady(player, 7, "second"), true);
});

test("普通和强化毁灭之力分别按两轮和一轮补回同一个次数余额", () => {
  const state = createGame("甲", { skillMode: "big_test_select" });
  const player = state.players[0]!;
  grantInitializedSkill(state, player.id, getFusionSkillId("末世"), "测试");
  grantInitializedSkill(state, player.id, "1044", "测试");
  assert.equal(getDestroyPowerRemainingUses(player, 1), 2);
  invertLimitedSkillUses(state, player);
  assert.deepEqual([1, 2, 3, 4, 5].map((round) => getDestroyPowerRemainingUses(player, round)), [-2, -1, 1, 1, 2]);
});

test("累加式周期照常偿还芥子和恶魔召唤的负数", () => {
  const state = createGame("甲", { skillMode: "big_test_select" });
  const player = state.players[0]!;
  player.bigCards = [{ cardId: "10530", instanceId: "purple", onlyAbilityId: PURPLE_FORESIGHT_ID },
    { cardId: "10551", instanceId: "demon", onlyAbilityId: DEMON_IMP_ID }];
  const [purple, demon] = player.bigCards;
  invertLimitedSkillUses(state, player);
  assert.equal(purpleForesightUses(1, purple!), -1);
  assert.equal(purpleForesightUses(8, purple!), 0);
  assert.equal(purpleForesightUses(15, purple!), 1);
  assert.equal(demonSummonBalance(1, demon!, DEMON_IMP_ID), -3);
  assert.equal(demonSummonBalance(4, demon!, DEMON_IMP_ID), 0);
  assert.equal(demonSummonBalance(7, demon!, DEMON_IMP_ID), 3);
});

test("邪域按来源轮次补充，神兽按固定六轮区间补充", () => {
  const state = createGame("甲", { skillMode: "big_test_select" });
  const player = state.players[0]!;
  player.skills.push(XIEYU_SKILL_ID);
  player.bigCards = [{ cardId: "10518", instanceId: "beasts", onlyAbilityId: SACRED_BEAST_ID }];
  state.roundNumber = 6;
  assert.equal(getDueXieyuSources(player, 6).length, 1);
  assert.equal(availableSacredBeasts(player, 6).length, 4);
  invertLimitedSkillUses(state, player);
  assert.equal(getDueXieyuSources(player, 6).length, 0);
  assert.equal(getDueXieyuSources(player, 9).length, 0);
  assert.equal(getDueXieyuSources(player, 12).length, 1);
  assert.equal(availableSacredBeasts(player, 6).length, 0);
  assert.equal(availableSacredBeasts(player, 7).length, 0);
  assert.equal(availableSacredBeasts(player, 13).length, 4);
});

test("入微按第 3、6、9 轮的固定周期补充", () => {
  const state = createGame("甲");
  const player = state.players[0]!;
  const card = { cardId: "10530", instanceId: "purple", onlyAbilityId: PURPLE_INSIGHT_ID };
  player.bigCards = [card];
  state.roundNumber = 3;
  invertLimitedSkillUses(state, player);
  assert.equal(purpleInsightUses(3, player, card), -1);
  assert.equal(purpleInsightUses(6, player, card), 0);
  assert.equal(purpleInsightUses(9, player, card), 1);
});
