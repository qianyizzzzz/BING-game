import { bigCardHasAbility } from "../bigCards/abilities";
import type { DamageEvent, GameState, PlayerState } from "../types";
import { addCombatValues, combatValue, compareCombatValues, fromLegacyCombatStat } from "./combatValues";
import { DECAY_CARD_ID, DECAY_INHERIT_ID, DECAY_UNLOCK_DAMAGE } from "./decayIds";
import { createBaseEvent, getActiveSkillCount, revealSkillOnTrigger } from "./gameFactory";

export function recordDecayDamage(state: GameState, player: PlayerState | undefined, event: DamageEvent): void {
  if (!player || player.id === event.targetId || !getActiveSkillCount(player, DECAY_INHERIT_ID)) return;
  const damage = event.amountValue ?? fromLegacyCombatStat(event.amount);
  if (compareCombatValues(damage, []) <= 0) return;
  for (const card of player.bigCards ?? []) {
    if (card.cardId !== DECAY_CARD_ID || card.junengDisabled || card.decayUnlocked || !bigCardHasAbility(card, DECAY_INHERIT_ID)) continue;
    card.decayDamage = addCombatValues(card.decayDamage ?? [], damage);
    if (compareCombatValues(card.decayDamage, combatValue(DECAY_UNLOCK_DAMAGE)) < 0) continue;
    card.decayUnlocked = true;
    revealSkillOnTrigger(state, player.id, DECAY_INHERIT_ID, "造成6点伤害，解锁破败之道");
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: player.id,
      message: `${player.name} 已解锁破败之道的后续效果` });
  }
}
