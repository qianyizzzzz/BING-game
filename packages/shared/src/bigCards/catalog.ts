import { RAW_BIG_CARD_CATALOG } from "./generatedCatalog";
import { THORN_DANCE_CARD_ID } from "../engine/thornDanceIds";
import { VACUUM_CARD_ID } from "../engine/vacuumIds";
import { SWARM_CARD_ID } from "../engine/swarmIds";
import { DIVINE_REVERSAL_CARD_ID } from "../engine/divineReversalIds";
import { CORRUPTION_CARD_ID } from "../engine/corruptionIds";
import { DEMON_CARD_ID } from "../engine/demonIds";
import { YOUKAI_CARD_ID } from "../engine/youkaiIds";
import { SHADOW_CARD_ID } from "../engine/shadowIds";
import { YUAN_CARD_ID } from "../engine/yuanIds";
import { SUN_CARD_ID } from "../engine/sunIds";
import { MOON_CARD_ID } from "../engine/moonIds";
import { SWORD_ARRAY_CARD_ID } from "../engine/swordArrayIds";
import { BROKEN_BLADE_CARD_ID } from "../engine/brokenBladeIds";
import { DECAY_CARD_ID } from "../engine/decayIds";
import { TIAN_YE_CARD_ID } from "../engine/tianyeIds";
import { SEA_GOD_CARD_ID } from "../engine/seaGodIds";
import { KARMA_CARD_ID } from "../engine/karmaCycleIds";
import { CHEAT_CARD_ID } from "../engine/cheatServerIds";
import { FIVE_ELEMENTS_CARD } from "../engine/fiveElementsIds";
import { HEXAGRAM_CARD } from "../engine/hexagramIds";
import { SEVEN_STAR_CARD } from "../engine/sevenStarIds";
import { TIAN_SHA_CARD } from "../engine/tianShaIds";
import { NINE_TRIBULATIONS_CARD } from "../engine/nineTribulationsIds";
import { ABYSS_CARD_ID, ASURA_CARD_ID, BIG_CARD_SKILLS, GAME_SWITCH_CARD_ID, GAME_SWITCH_PENALTY_DESCRIPTION, GAME_SWITCH_PENALTY_ID,
  SAND_CARD_ID, SOUL_PACT_CARD_ID, ULTIMATE_WIND_CARD_ID, PURPLE_EYE_CARD_ID, PURPLE_GUESS_ID, PURPLE_GUESS_DESCRIPTION,
  PURPLE_FORESIGHT_ID, PURPLE_FORESIGHT_DESCRIPTION, SAKURA_CARD_ID, ETERNAL_CARD_ID, TRIPLE_SEAL_CARD_ID, EMPTY_CITY_CARD_ID,
  CHARITY_CARD_ID, CHARITY_LINK_DESCRIPTION, CHARITY_LINK_ID } from "./abilities";
import { readSkillTypeTags } from "../skills/types";
import { BigCardDefinition, BigCardId } from "./types";
import { KURONG_CARD_ID, UTOPIA_CARD_ID, XIELING_BODY_ID, XIELING_CARD_ID } from "./abilities";
import { CHAOS_CARD_ID, GOD_KING_CARD_ID, HONGHUANG_CARD_ID, KAIGE_CARD_ID, LINGTA_CARD_ID, TIANMANG_CARD_ID } from "./abilities";
import { DRAGON_CARD_ID, FENTIAN_CARD_ID, HUNYAO_CARD_ID, JIHAN_CARD_ID, JUNENG_CARD_ID, KUIJI_CARD_ID, STAR_CARD_ID, VERDICT_CARD_ID, QIANQIU_CARD_ID, YONGYAO_CARD_ID, TIANLIE_CARD_ID, WUJIN_CARD_ID, JUEYING_CARD_ID, CHAOFAN_CARD_ID } from "./abilities";

const implementedCardIds = [FENTIAN_CARD_ID, HUNYAO_CARD_ID, JIHAN_CARD_ID, JUNENG_CARD_ID, KUIJI_CARD_ID, STAR_CARD_ID, DRAGON_CARD_ID, VERDICT_CARD_ID, QIANQIU_CARD_ID, YONGYAO_CARD_ID, WUJIN_CARD_ID, JUEYING_CARD_ID, CHAOFAN_CARD_ID, XIELING_CARD_ID, KURONG_CARD_ID, UTOPIA_CARD_ID, LINGTA_CARD_ID, KAIGE_CARD_ID, CHAOS_CARD_ID, GOD_KING_CARD_ID, TIANMANG_CARD_ID];
implementedCardIds.push(ULTIMATE_WIND_CARD_ID, SAND_CARD_ID, ASURA_CARD_ID, SOUL_PACT_CARD_ID, ABYSS_CARD_ID,
  GAME_SWITCH_CARD_ID, PURPLE_EYE_CARD_ID, SAKURA_CARD_ID, ETERNAL_CARD_ID, TRIPLE_SEAL_CARD_ID, EMPTY_CITY_CARD_ID, "10537", "10538", CHARITY_CARD_ID, THORN_DANCE_CARD_ID, VACUUM_CARD_ID, SWARM_CARD_ID, DIVINE_REVERSAL_CARD_ID, "10545", "10546", "10547", "10548", "10549", CORRUPTION_CARD_ID, DEMON_CARD_ID, YOUKAI_CARD_ID, SHADOW_CARD_ID, YUAN_CARD_ID, SUN_CARD_ID, MOON_CARD_ID, SWORD_ARRAY_CARD_ID);
implementedCardIds.push(DECAY_CARD_ID, TIAN_YE_CARD_ID, KARMA_CARD_ID, CHEAT_CARD_ID, "10605", "10606", "10607", "10608", "10609", "10610", "10611", "10612");
implementedCardIds.push(FIVE_ELEMENTS_CARD, HEXAGRAM_CARD, SEVEN_STAR_CARD, TIAN_SHA_CARD);
const partialCardIds = [TIANLIE_CARD_ID, HONGHUANG_CARD_ID, "10542", BROKEN_BLADE_CARD_ID, SEA_GOD_CARD_ID, "10604", NINE_TRIBULATIONS_CARD];

// Catalog availability is separate from rule implementation. Pending cards never grant effects.
const catalog: readonly BigCardDefinition[] = RAW_BIG_CARD_CATALOG.filter((card) => card.sourceGroup !== "隐藏至尊").map((card) => ({
  ...card,
  abilities: card.abilities.map((ability) => ({ ...ability,
    description: card.id === FIVE_ELEMENTS_CARD ? BIG_CARD_SKILLS[ability.id]?.description ?? ability.description :
      ability.id === CHARITY_LINK_ID ? CHARITY_LINK_DESCRIPTION :
      ability.id === PURPLE_GUESS_ID ? PURPLE_GUESS_DESCRIPTION : ability.id === PURPLE_FORESIGHT_ID ? PURPLE_FORESIGHT_DESCRIPTION :
      ability.id === GAME_SWITCH_PENALTY_ID ? GAME_SWITCH_PENALTY_DESCRIPTION : ability.id === XIELING_BODY_ID ?
      ability.description.replace("无论你造成多少伤害均不重开此轮", "你造成的伤害和你的回血不会重开此轮") : ability.description,
    typeTags: BIG_CARD_SKILLS[ability.id]?.typeTags ?? readSkillTypeTags(ability.description)
  })),
  implemented: implementedCardIds.includes(card.id) || partialCardIds.includes(card.id),
  implementationStatus: partialCardIds.includes(card.id) ? "partial" : implementedCardIds.includes(card.id) ? "implemented" : "pending"
}));
const byId = new Map(catalog.map((card) => [card.id, card]));
// Support cards remain addressable for grants without entering selectable card pools.
for (const card of RAW_BIG_CARD_CATALOG.filter((entry) => entry.sourceGroup === "隐藏至尊"))
  byId.set(card.id, { ...card, implemented: true, implementationStatus: "partial" });

export function getBigCard(id: BigCardId): BigCardDefinition | undefined {
  return byId.get(id);
}

export function getBigCards(): readonly BigCardDefinition[] {
  return catalog;
}

export const BIG_CARD_PACKS = [
  { id: "royal", name: "王者卡", first: 10501, last: 10530 },
  { id: "royal_extra", name: "王者卡（番外）", first: 10531, last: 10560 },
  { id: "supreme", name: "至尊卡", first: 10601, last: 10625 },
  { id: "supreme_extra", name: "至尊卡（番外）", first: 10626, last: 10654 },
  { id: "word_spirit", name: "言灵卡", first: 10701, last: 10720 },
  { id: "word_spirit_extra", name: "言灵卡（番外）", first: 10721, last: 10748 },
  { id: "peerless", name: "无上卡", first: 10801, last: 10815 },
  { id: "peerless_extra", name: "无上卡（番外）", first: 10816, last: 10840 }
] as const;

export type BigCardPackId = (typeof BIG_CARD_PACKS)[number]["id"];

export function validateRandomBigCardSettings(config: {
  bigCardPackIds?: unknown;
  allowDuplicateBigCards?: unknown;
}): void {
  const { bigCardPackIds, allowDuplicateBigCards } = config;
  if (bigCardPackIds !== undefined && (!Array.isArray(bigCardPackIds) ||
    bigCardPackIds.length > BIG_CARD_PACKS.length ||
    !bigCardPackIds.every((id) => BIG_CARD_PACKS.some((pack) => pack.id === id)) ||
    new Set(bigCardPackIds).size !== bigCardPackIds.length)) {
    throw new Error("大卡包选择无效");
  }
  if (allowDuplicateBigCards !== undefined && typeof allowDuplicateBigCards !== "boolean") {
    throw new Error("允许重复的设置无效");
  }
}

/** Fusion cards are available for explicit testing, never dealt as native cards. */
export function getRandomBigCardIds(packIds?: readonly BigCardPackId[]): BigCardId[] {
  const packs = BIG_CARD_PACKS.filter((pack) => packIds === undefined || packIds.includes(pack.id));
  return catalog.filter((card) => card.kind === "native" &&
    packs.some((pack) => Number(card.id) >= pack.first && Number(card.id) <= pack.last))
    .map((card) => card.id);
}

export function sanitizeBigCardIds(ids: readonly unknown[], maxCount: number): BigCardId[] {
  return ids.filter((id): id is string => typeof id === "string" && byId.has(id))
    .slice(0, Math.max(0, Math.floor(maxCount)));
}
