import { BuffState, GameState, PlayerId, PlayerState, PublicGameState, SkillAction, SkillId } from "../types";
import { getEnhancedChildFusionIds, getFusionRecipe, getFusionSkillId, isFusionActive } from "../skills/fusion";
import { getSkillPlay } from "../skills/registry";

export type AttackMarkKind = "lava" | "winter" | "ice_fire";
export const STAR_RAGE_ID = "3041";
export const STAR_RAGE_MARK_ID = "star_rage_mark";
export const STAR_RAGE_SIX_STAR = "skill_108_76133";

function starRageMarks(player: Pick<PlayerState, "skills" | "skillFusions" | "buffs">): BuffState[] {
  return player.buffs.filter((buff) => buff.id === STAR_RAGE_MARK_ID && player.skillFusions?.some((fusion) =>
    fusion.id === buff.sourceFusionId && fusion.skillId === STAR_RAGE_ID && isFusionActive(player, fusion)));
}

export function canSpendStarRageMarks(player: Pick<PlayerState, "skills" | "skillFusions" | "buffs">): boolean {
  return starRageMarks(player).some((buff) => buff.stacks >= 3);
}

export function spendStarRageMarks(player: PlayerState, turnNumber: number): void {
  const mark = starRageMarks(player).find((buff) => buff.stacks >= 3);
  if (!mark) return;
  player.buffs = player.buffs.filter((buff) => buff !== mark);
  player.buffs.push({ ...mark, id: "star_rage_spent", name: "本回合已花星印记", stacks: 1, expiresAtTurn: turnNumber });
}

export function recordStarRageDefenses(player: PlayerState, count: number): void {
  if (!count) return;
  for (const fusion of player.skillFusions ?? []) {
    if (fusion.skillId !== STAR_RAGE_ID || !isFusionActive(player, fusion)) continue;
    const mark = player.buffs.find((buff) => buff.id === STAR_RAGE_MARK_ID && buff.sourceFusionId === fusion.id);
    if (mark) mark.stacks = Math.min(3, mark.stacks + count);
    else player.buffs.push({ id: STAR_RAGE_MARK_ID, name: "星印记", stacks: Math.min(3, count), sourceFusionId: fusion.id });
  }
}

export function getAttackMarkKind(skillId: SkillId): AttackMarkKind | undefined {
  if (skillId === "skill_21_36332") return "lava";
  if (skillId === "skill_22_54978") return "winter";
  if (skillId === getFusionSkillId("冰火狂暴曲")) return "ice_fire";
  return undefined;
}

export function getAttackMarkCount(player: Pick<PlayerState, "buffs" | "skills" | "skillFusions">, skillId: SkillId): number | undefined {
  const kind = getAttackMarkKind(skillId);
  if (!kind) return undefined;
  return getAvailableMarks(player, kind).reduce((sum, buff) => sum + buff.stacks, 0);
}

export function getAttackMarkLimit(player: Pick<PlayerState, "buffs" | "skills" | "skillFusions">, skillId: SkillId): number {
  return getAttackMarkKind(skillId) === "ice_fire" && getEnhancedIceFireIds(player).size > 0 ? 6 : 3;
}

function getEnhancedIceFireIds(player: Pick<PlayerState, "buffs" | "skills" | "skillFusions">): Set<string> {
  return getEnhancedChildFusionIds(player, "三元协奏曲", getFusionSkillId("冰火狂暴曲"));
}

export function getAttackMarkCapacity(player: Pick<PlayerState, "buffs" | "skills" | "skillFusions">, skillId: SkillId, actionIndex: number): number {
  const kind = getAttackMarkKind(skillId);
  return Math.max(0, getAttackMarkLimit(player, skillId) - player.buffs.filter((buff) => buff.id.startsWith(`pending_${kind}_mark:`) && buff.attackActionIndex === actionIndex)
    .reduce((sum, buff) => sum + buff.stacks, 0));
}

function getAvailableMarks(player: Pick<PlayerState, "buffs" | "skills" | "skillFusions">, kind: AttackMarkKind): BuffState[] {
  return player.buffs.filter((buff) => buff.id === `${kind}_mark` && buff.stacks > 0 &&
    ((!buff.sourceFusionId && kind !== "ice_fire") || player.skillFusions?.some((fusion) => fusion.id === buff.sourceFusionId &&
      fusion.skillId === getFusionSkillId(kind === "ice_fire" ? "冰火狂暴曲" : "阳炎之怒") && isFusionActive(player, fusion))));
}

/** Only the caster's revealed attacks can receive an offensive mark. */
export function getAttackMarkChoices(state: GameState | PublicGameState, playerId: PlayerId) {
  const plan = "pendingActions" in state ? state.pendingActions[playerId] : state.revealedActions?.[playerId];
  return (plan?.actions ?? []).flatMap((action, actionIndex) =>
    action.type === "attack" || (action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack")
      ? [{ actionIndex, action }] : []);
}

/** Spend now, bind to one attack slot, and accumulate repeated spends instead of overwriting them. */
export function queueAttackMarks(state: GameState, player: PlayerState, action: SkillAction): void {
  const kind = getAttackMarkKind(action.skillId);
  if (!kind) return;
  const actionIndex = action.switchActionIndex ?? getAttackMarkChoices(state, player.id)[0]?.actionIndex;
  if (actionIndex === undefined) throw new Error("当前没有可使用印记强化的攻击");
  let remaining = action.stacks;
  const enhanced = kind === "ice_fire" ? getEnhancedIceFireIds(player) : undefined;
  for (const mark of getAvailableMarks(player, kind)) {
    const spent = Math.min(remaining, mark.stacks);
    const id = `pending_${kind}_mark:${actionIndex}:${mark.sourceFusionId ?? "raw"}`;
    const pending = player.buffs.find((buff) => buff.id === id);
    if (pending) pending.stacks += spent;
    else player.buffs.push({ id, name: `${kind === "lava" ? "熔岩" : kind === "winter" ? "凛冬" : "冰火"}强化`,
      stacks: spent, attackActionIndex: actionIndex, expiresAtTurn: state.turnNumber,
      ...(kind === "ice_fire" ? { fusionMarkKind: "ice_fire" as const,
        markKeepsAttackElement: Boolean(mark.sourceFusionId && enhanced?.has(mark.sourceFusionId)) } : {}),
      ...(mark.fusionMarkKind === "solar_lava" ? { fusionMarkKind: "solar_lava" as const } : {}),
      ...(mark.sourceFusionId ? { sourceFusionId: mark.sourceFusionId } : {}) });
    mark.stacks -= spent;
    remaining -= spent;
    if (remaining === 0) break;
  }
  player.buffs = player.buffs.filter((buff) => buff.stacks > 0);
}

export function recordSolarDefenses(player: PlayerState, count: number): void {
  for (const fusion of player.skillFusions ?? []) {
    if (count <= 0 || !isFusionActive(player, fusion) || getFusionRecipe(fusion.skillId)?.skill.name !== "阳炎之怒") continue;
    const id = `solar_defense_count:${fusion.id}`;
    let counter = player.buffs.find((buff) => buff.id === id);
    if (!counter) { counter = { id, name: "阳炎防御计数", stacks: 0, sourceFusionId: fusion.id, fusionMarkKind: "solar_lava" }; player.buffs.push(counter); }
    counter.stacks += count;
    const gained = Math.floor(counter.stacks / 3);
    counter.stacks %= 3;
    if (!gained) continue;
    const mark = player.buffs.find((buff) => buff.id === "lava_mark" && buff.sourceFusionId === fusion.id);
    if (mark) mark.stacks = Math.min(3, mark.stacks + gained);
    else player.buffs.push({ id: "lava_mark", name: "阳炎熔岩印记", stacks: Math.min(3, gained), sourceFusionId: fusion.id, fusionMarkKind: "solar_lava" });
  }
}

/** Each cover owns its progress and marks, so decomposing one cannot erase another's progress. */
export function recordIceFireDefenses(player: PlayerState, count: number): void {
  if (count <= 0) return;
  const enhanced = getEnhancedIceFireIds(player);
  for (const fusion of player.skillFusions ?? []) {
    if (!isFusionActive(player, fusion) || getFusionRecipe(fusion.skillId)?.skill.name !== "冰火狂暴曲") continue;
    const id = `ice_fire_defense_count:${fusion.id}`;
    let counter = player.buffs.find((buff) => buff.id === id);
    if (!counter) {
      counter = { id, name: "冰火防御计数", stacks: 0, sourceFusionId: fusion.id, fusionMarkKind: "ice_fire" };
      player.buffs.push(counter);
    }
    counter.stacks += count;
    const gained = Math.floor(counter.stacks / 3);
    counter.stacks %= 3;
    if (gained === 0) continue;
    addIceFireMarks(player, fusion.id, gained, enhanced.has(fusion.id) ? 6 : 3);
  }
}

export function addIceFireMarks(player: PlayerState, fusionId: string, count: number, cap: number): void {
  const mark = player.buffs.find((buff) => buff.id === "ice_fire_mark" && buff.sourceFusionId === fusionId);
  if (mark) mark.stacks = Math.min(cap, mark.stacks + count);
  else player.buffs.push({ id: "ice_fire_mark", name: "冰火印记", stacks: Math.min(cap, count),
    sourceFusionId: fusionId, fusionMarkKind: "ice_fire" });
}
