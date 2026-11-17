import type { LifeEffect, PlayerState, SpareLife } from "../types";
import { KAIGE_CARD_ID, KAIGE_SHIELD_ID, KAIGE_STAGE_NAMES, bigCardHasAbility } from "../bigCards/abilities";
import { createId } from "./gameFactory";

export function getLifeEffects(life: Pick<SpareLife, "effects" | "kaigeLife" | "soulLife">): LifeEffect[] {
  const effects = life.effects ?? [];
  if (life.soulLife && !effects.some(({ kind }) => kind === "soul")) return [...effects, { ...life.soulLife, kind: "soul" }];
  if (life.kaigeLife && !effects.some(({ kind }) => kind === "kaige")) return [...effects, { ...life.kaigeLife, kind: "kaige" }];
  return effects;
}

export function lifeEffectLabel(effect: LifeEffect): string {
  switch (effect.kind) {
    case "kaige": return KAIGE_STAGE_NAMES[effect.stage - 1] ?? "圣灵凯歌";
    case "soul": return "换入时仅保留魂沉";
    case "red_lotus": return "浴火重生 · 普通死亡时获得一条满血命";
    case "starting_defense": return `换入时获得 ${effect.amount} 防御值`;
  }
}

/** Rebase life-bound effect sources so they no longer depend on the donor's inventory. */
export function portableLife(donor: PlayerState, life: SpareLife): SpareLife {
  const effects = getLifeEffects(life).map((effect): LifeEffect => {
    if (effect.kind === "starting_defense" || effect.kind === "red_lotus") return { ...effect };
    const card = donor.bigCards?.find(({ instanceId }) => instanceId === effect.cardInstanceId);
    switch (effect.kind) {
      case "soul":
        return { ...effect, cardInstanceId: createId("transferred_soul_life"), uses: { ...effect.uses, ...card?.abilityUses } };
      case "kaige":
        return { ...effect, cardInstanceId: createId("transferred_kaige_life"), transferredAbilities: effect.transferredAbilities?.slice() ??
          (card ? [`${KAIGE_CARD_ID}0${effect.stage + 1}`, KAIGE_SHIELD_ID].filter((id) => bigCardHasAbility(card, id)) : []) };
    }
  }).filter((effect) => effect.kind !== "kaige" || Boolean(effect.transferredAbilities?.length));
  return { hp: life.hp, ...(life.hpValue ? { hpValue: life.hpValue } : {}),
    ...(effects.length || life.effects ? { effects } : {}) };
}
