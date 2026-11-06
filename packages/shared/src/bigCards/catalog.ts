import { RAW_BIG_CARD_CATALOG } from "./generatedCatalog";
import { BigCardDefinition, BigCardId } from "./types";
import { DRAGON_CARD_ID, FENTIAN_CARD_ID, HUNYAO_CARD_ID, JIHAN_CARD_ID, JUNENG_CARD_ID, KUIJI_CARD_ID, STAR_CARD_ID, VERDICT_CARD_ID } from "./abilities";

const implementedCardIds = [FENTIAN_CARD_ID, HUNYAO_CARD_ID, JIHAN_CARD_ID, JUNENG_CARD_ID, KUIJI_CARD_ID, STAR_CARD_ID, DRAGON_CARD_ID, VERDICT_CARD_ID];

// Catalog availability is separate from rule implementation. Pending cards never grant effects.
const catalog: readonly BigCardDefinition[] = RAW_BIG_CARD_CATALOG.map((card) => ({
  ...card,
  implemented: implementedCardIds.includes(card.id),
  implementationStatus: implementedCardIds.includes(card.id) ? "implemented" : "pending"
}));
const byId = new Map(catalog.map((card) => [card.id, card]));

export function getBigCard(id: BigCardId): BigCardDefinition | undefined {
  return byId.get(id);
}

export function getBigCards(): readonly BigCardDefinition[] {
  return catalog;
}

/** Fusion cards are available for explicit testing, never dealt as native cards. */
export function getRandomBigCardIds(): BigCardId[] {
  return catalog.filter((card) => card.kind === "native").map((card) => card.id);
}

export function sanitizeBigCardIds(ids: readonly unknown[], maxCount: number): BigCardId[] {
  return ids.filter((id): id is string => typeof id === "string" && byId.has(id))
    .slice(0, Math.max(0, Math.floor(maxCount)));
}
