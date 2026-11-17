import { RAW_BIG_CARD_CATALOG } from "../bigCards/generatedCatalog";
import { bigCardHasAbility, EMPTY_CITY_CARD_ID, EMPTY_CITY_GUARD_ID, EMPTY_CITY_ILLUSION_ID, KUIJI_CARD_ID, KUIJI_SKILL_GRANTS } from "../bigCards/abilities";
import { RAW_SKILL_CATALOG } from "../skills/generatedSkillCatalog";
import { FUSION_RECIPES } from "../skills/generatedFusionCatalog";
import { HIGHER_FUSION_RECIPES } from "../skills/generatedHigherFusionCatalog";
import type { AttackStats, BuffState, GameState, PlayerState, SkillId } from "../types";
import { attackPowerValue, compareCombatValues, INFINITY_VALUE } from "./combatValues";

type SkillOwner = {
  bigCards?: PlayerState["bigCards"] | undefined;
  skillInventory?: PlayerState["skillInventory"] | undefined;
  skillFusions?: PlayerState["skillFusions"] | undefined;
  emptyCitySkillsSuspended?: true;
};

const recoveryCardPrefix = "empty_city_recovery:";
const spaceTimeCards = new Set(RAW_BIG_CARD_CATALOG.filter(({ attribute }) => attribute === "时" || attribute === "空").map(({ id }) => id));
const spaceTimeSmallSkills = new Set(RAW_SKILL_CATALOG.filter(({ description }) => /回到.{0,8}状态|恢复至.{1,8}轮前|进入小空间/.test(description)).map(({ id }) => id));
const allowedCard = (id: string) => id === EMPTY_CITY_CARD_ID || spaceTimeCards.has(id);
const fusionSkills = [...FUSION_RECIPES, ...HIGHER_FUSION_RECIPES].map(({ skill }) => skill);
const spaceTimeFusionIds = new Set(fusionSkills.filter(({ name }) => ["空之轨迹", "天空之城", "时光倒流"].includes(name)).map(({ id }) => id));
export const emptyCitySpaceTimeFusions: readonly SkillId[] = [...spaceTimeFusionIds];

export type EmptyCityRecovery = {
  kind: "death" | "departure";
  original: Pick<PlayerState, "skills" | "skillInventory" | "skillFusions" | "bigCards" | "revealedSkillIds">;
  useLedger: BuffState[];
};

export function isEmptyCitySkillSuspended(owner: object | undefined, id: SkillId): boolean {
  const player = owner as SkillOwner | undefined;
  if (!player?.emptyCitySkillsSuspended) return false;
  const copies = [...player.skillInventory ?? [], ...player.skillFusions ?? []].filter((skill) => skill.skillId === id);
  return copies.length ? !copies.some((skill) => emptyCitySkillSourceAllowed(player, id, skill.sourceBigCardInstanceId)) :
    !emptyCitySkillSourceAllowed(player, id);
}

export function emptyCitySkillSourceAllowed(player: SkillOwner, id: SkillId, sourceId?: string): boolean {
  if (!player.emptyCitySkillsSuspended) return true;
  if (/^[12]\d{6}(?:_|$)/.test(id)) return allowedCard(id.slice(0, 5));
  if (sourceId) {
    const parent = player.bigCards?.find(({ instanceId }) => instanceId === sourceId || sourceId.startsWith(instanceId + ":"));
    if (parent) return allowedCard(parent.cardId);
  }
  return spaceTimeSmallSkills.has(id) || spaceTimeFusionIds.has(id);
}

export function beginEmptyCityRecovery(state: GameState, player: PlayerState, kind: EmptyCityRecovery["kind"]): void {
  if (player.emptyCityRecovery) return;
  const guarded = player.bigCards?.some((card) => !card.junengDisabled && bigCardHasAbility(card, EMPTY_CITY_GUARD_ID));
  const { skills, skillInventory, skillFusions, bigCards, revealedSkillIds } = player;
  const useLedger = player.buffs.filter(isSkillLedger);
  player.emptyCityRecovery = { kind, original: { skills, revealedSkillIds,
    ...(skillInventory ? { skillInventory } : {}), ...(skillFusions ? { skillFusions } : {}), ...(bigCards ? { bigCards } : {}) }, useLedger };
  delete player.emptyCityBodySpaceId;
  delete player.emptyCityBody;
  if (guarded) player.emptyCityPhantomDefeat = true;
  player.buffs = player.buffs.filter((buff) => !isSkillLedger(buff));
  const inherited = new Set(KUIJI_SKILL_GRANTS.flatMap((grant) => "skillId" in grant ? [grant.skillId as string] : []));
  player.skills = [...RAW_SKILL_CATALOG.filter(({ fusion }) => !fusion), ...fusionSkills]
    .filter(({ id }) => !inherited.has(id)).map(({ id }) => id);
  player.skillInventory = player.skills.map((skillId, i) => ({ skillId, instanceId: `${recoveryCardPrefix}${player.id}:small:${i}` }));
  player.skillFusions = [];
  player.revealedSkillIds = [...revealedSkillIds];
  player.bigCards = RAW_BIG_CARD_CATALOG.filter((card) => card.sourceGroup !== "隐藏至尊").map(({ id: cardId }) => ({
    cardId, instanceId: `${recoveryCardPrefix}${player.id}:${cardId}`, initialized: cardId !== KUIJI_CARD_ID,
    ...(guarded && !allowedCard(cardId) ? { junengDisabled: true } : {})
  }));
  refreshEmptyCitySuspension(state);
}

function isSkillLedger(buff: BuffState): boolean {
  return buff.id.startsWith("skill_used:") || buff.id.startsWith("skill_activated:");
}

export function endEmptyCityRecovery(state: GameState, player: PlayerState, recovered: boolean): void {
  const recovery = player.emptyCityRecovery;
  if (!recovery) return;
  const { skills, skillInventory, skillFusions, bigCards, revealedSkillIds } = recovery.original;
  player.skills = skills;
  player.revealedSkillIds = revealedSkillIds;
  if (skillInventory) player.skillInventory = skillInventory; else delete player.skillInventory;
  if (skillFusions) player.skillFusions = skillFusions; else delete player.skillFusions;
  if (bigCards) player.bigCards = bigCards; else delete player.bigCards;
  player.buffs = player.buffs.filter((buff) => !isSkillLedger(buff) &&
    !buff.sourceBigCardInstanceId?.startsWith(recoveryCardPrefix)).concat(recovery.useLedger);
  delete player.emptyCityRecovery;
  if (recovered) enterEmptyCityProjection(player);
  refreshEmptyCitySuspension(state);
}

export function enterEmptyCityProjection(player: PlayerState): void {
  if (player.emptyCityBody) return;
  delete player.emptyCityPhantomDefeat;
  player.emptyCityBodySpaceId ??= `empty_city_body:${player.id}`;
  const body = structuredClone(player);
  delete body.emptyCityBodySpaceId;
  delete body.emptyCityBodyDefeatId;
  delete body.emptyCitySkillsSuspended;
  body.id = player.emptyCityBodySpaceId;
  body.spaceId = body.id;
  body.emptyCityOwnerId = player.id;
  body.name = `${player.name}（本体）`;
  body.connected = false;
  body.buffs.push({ id: "empty_city_body_untargetable", name: "本体无法被选中", stacks: 1,
    preventsTargetSelection: true, uncleansable: true });
  player.emptyCityBody = body;
}

export function canRecoverEmptyCity(target: PlayerState, source: PlayerState | undefined, skillId: SkillId): boolean {
  if (target.emptyCityBodyDefeatId) return source?.id === target.id;
  if (!target.emptyCityPhantomDefeat) return true;
  return Boolean(source && !isEmptyCitySkillSuspended({ ...source, emptyCitySkillsSuspended: true }, skillId));
}

export function canRecoverEmptyCityWithLife(player: PlayerState, sourceId?: string): boolean {
  if (!player.emptyCityPhantomDefeat) return true;
  const cards = player.emptyCityRecovery?.original.bigCards ?? player.bigCards;
  return Boolean(sourceId && cards?.some(({ cardId, instanceId }) =>
    allowedCard(cardId) && (sourceId === instanceId || sourceId.startsWith(instanceId + ":"))));
}

export function hasEmptyCityProjection(player: PlayerState): boolean {
  return Boolean(player.emptyCityBodySpaceId && player.status === "alive" &&
    player.bigCards?.some((card) => bigCardHasAbility(card, EMPTY_CITY_ILLUSION_ID)));
}

export function emptyCityBodies(state: Pick<GameState, "players">): PlayerState[] {
  return state.players.flatMap((player) => hasEmptyCityProjection(player) && player.emptyCityBody ? [player.emptyCityBody] : []);
}

export function hasEmptyCityRecovery(state: Pick<GameState, "players">): boolean {
  return state.players.some((player) => player.emptyCityRecovery);
}

export function refreshEmptyCitySuspension(state: Pick<GameState, "players">): void {
  const suspended = state.players.some((player) => player.emptyCityRecovery && player.emptyCityPhantomDefeat);
  for (const player of state.players) {
    for (const actor of player.emptyCityBody ? [player, player.emptyCityBody] : [player]) {
      if (suspended) actor.emptyCitySkillsSuspended = true;
      else delete actor.emptyCitySkillsSuspended;
    }
  }
}


export function psychicPiercesDefenses(stats: AttackStats | undefined): boolean {
  return Boolean(stats?.psychicPierce && compareCombatValues(attackPowerValue(stats), INFINITY_VALUE) <= 0);
}
