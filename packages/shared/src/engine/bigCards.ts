import type { BuffState, DamageEvent, GameState, PlayerId, PlayerState, SkillAction } from "../types";
import { isBigSkillMode } from "../modes";
import { FENTIAN_INHERIT_ID, FENTIAN_FUSION_GRANTS, FENSHI_FLAMES_ID, HUNYAO_CARD_ID, HUNYAO_SKILL_GRANTS,
  JIHAN_INHERIT_ID, JIHAN_SKILL_GRANTS, JUNENG_INHERIT_ID, SELF_DESTRUCTER_DEATH_SKILL_ID, HUNYAO_LIGHT_ID,
  KUIJI_CARD_ID, KUIJI_INHERIT_ID, KUIJI_SKILL_GRANTS, KUISHI_ID, KUIJI_ULTIMATE_ID, STAR_INHERIT_ID, DRAGON_INHERIT_ID,
  DRAGON_DISAPPEAR_ID, VERDICT_INHERIT_ID, bigCardHasAbility, bigCardHasAbilityUses } from "../bigCards/abilities";
import type { BigCardInstance } from "../bigCards/types";
import { getBigCard } from "../bigCards/catalog";
import { createBaseEvent, createId, findPlayer, isPlayerSkillDisabled, queueZhuRiOpeningChoices } from "./gameFactory";
import { grantInitializedSkill } from "./skillAcquisition";
import { getFusionSkillId, getOwnedSkillIds, isFusionPreparation, reconcileSkillFusions } from "../skills/fusion";
import { ensureSkillInventory, removeSkillInstanceAt } from "./skillInventory";
import { applyNegativeStatus } from "./negativeStatuses";
import { ignoresNegativeStatuses, removeStateCategory } from "./effectCategories";
import { changeCakes } from "./cakeResources";
import { getSkillDamageSourceIds } from "./damageAttribution";

export function initializeBigCardRules(state: GameState): void {
  if (!isBigSkillMode(state.config.skillMode)) return;
  for (const player of state.players) {
    ensureSkillInventory(player);
    for (const card of player.bigCards ?? []) {
      if (card.initialized) continue;
      card.initialized = true;
      if (bigCardHasAbility(card, FENTIAN_INHERIT_ID)) {
        for (const name of FENTIAN_FUSION_GRANTS) grantInitializedSkill(state, player.id, getFusionSkillId(name),
          `焚天君燚获得${name}`, false, undefined, card.instanceId);
      }
      if (bigCardHasAbility(card, JIHAN_INHERIT_ID)) {
        for (const grant of JIHAN_SKILL_GRANTS) {
          if (grant.kind === "fusion") grantInitializedSkill(state, player.id, getFusionSkillId(grant.name),
            `极寒之拥获得${grant.name}`, false, undefined, card.instanceId);
        }
      }
      if (bigCardHasAbility(card, HUNYAO_LIGHT_ID)) {
        for (const grant of HUNYAO_SKILL_GRANTS) {
          grantInitializedSkill(state, player.id, grant.skillId,
            `魂耀九州获得${grant.name}`, false, undefined, card.instanceId);
        }
      }
      if (bigCardHasAbility(card, JUNENG_INHERIT_ID)) {
        for (const [name, id] of [
          ["毁灭之盾", getFusionSkillId("毁灭之盾")], ["末世", getFusionSkillId("末世")],
          ["自爆者死", SELF_DESTRUCTER_DEATH_SKILL_ID]
        ] as const) grantInitializedSkill(state, player.id, id, `聚能湮灭炮获得${name}`, false, undefined, card.instanceId);
      }
      if (bigCardHasAbility(card, KUIJI_INHERIT_ID)) {
        for (const grant of KUIJI_SKILL_GRANTS) {
          const id = "skillId" in grant ? grant.skillId : "fusion" in grant ? getFusionSkillId(grant.name) : undefined;
          if (id) grantInitializedSkill(state, player.id, id, `窥觊苍生获得${grant.name}`, false, undefined, card.instanceId);
        }
      }
      if (bigCardHasAbility(card, STAR_INHERIT_ID)) {
        for (const name of ["逆转星移", "外星人"]) grantInitializedSkill(state, player.id, getFusionSkillId(name),
          `异星共振获得${name}`, false, undefined, card.instanceId);
      }
      if (bigCardHasAbility(card, DRAGON_INHERIT_ID)) {
        for (let copy = 0; copy < 2; copy++) {
          grantInitializedSkill(state, player.id, getFusionSkillId("烽火赤壁"), "龙卷残云获得烽火赤壁", false, undefined, card.instanceId);
          grantInitializedSkill(state, player.id, "skill_35_16792", "龙卷残云获得雷电法术", false, undefined, card.instanceId);
        }
      }
      if (bigCardHasAbility(card, VERDICT_INHERIT_ID)) for (const name of ["沙皇", "制裁之刃"])
        grantInitializedSkill(state, player.id, getFusionSkillId(name), `御秽裁决获得${name}`, false, undefined, card.instanceId);
    }
  }
}

export function hasFentianInheritance(state: Pick<GameState, "config">, player: PlayerState | undefined): boolean {
  return Boolean(isBigSkillMode(state.config.skillMode) && player?.bigCards?.some((card) => bigCardHasAbility(card, FENTIAN_INHERIT_ID)) &&
    !isPlayerSkillDisabled(player) && !player.buffs.some((buff) => buff.id.startsWith("collapse_until_round:") ||
      buff.id === `sealed_skill:${FENTIAN_INHERIT_ID}`));
}

export function bigAbilitySource(player: Pick<PlayerState, "bigCards">, action: Pick<SkillAction, "skillId" | "bigCardInstanceId">, requireUses = false): string | undefined {
  return player.bigCards?.find((card) => !card.junengDisabled && bigCardHasAbility(card, action.skillId) &&
    (!requireUses || bigCardHasAbilityUses(card, action.skillId)) &&
    (action.skillId !== KUISHI_ID || card.openingCopyAvailable) &&
    (!action.bigCardInstanceId || action.bigCardInstanceId === card.instanceId))?.instanceId;
}

export function canReceiveBigCard(player: PlayerState, effect: "skill_copy" | "skill_gain" | "skill_absorption"): boolean {
  return !player.buffs.some((buff) => buff.immuneEffectCategories?.includes(effect));
}

export function grantFreshBigCard(state: GameState, player: PlayerState, source: BigCardInstance,
  options: { publiclyRevealed?: true; onlyAbilityId?: string; borrowedUntilRound?: number } = {}): BigCardInstance {
  const onlyAbilityId = options.onlyAbilityId ?? source.onlyAbilityId;
  const copy: BigCardInstance = { instanceId: createId("big_card"), cardId: source.cardId, ...options,
    ...(onlyAbilityId ? { onlyAbilityId } : {}) };
  (player.bigCards ??= []).push(copy);
  initializeBigCardRules(state);
  if (bigCardHasAbility(copy, "1052001") && !player.buffs.some((buff) => buff.cannotGainSpareLives)) {
    const lives = player.spareLives ??= [];
    const limit = Math.min(...player.buffs.map((buff) => buff.lifeCountLimit ?? Infinity));
    const count = Math.max(0, Math.min(7, limit - 1 - lives.length));
    for (let index = 0; index < count; index++) lives.push({ hp: 0, sourceBigCardInstanceId: copy.instanceId });
  }
  return copy;
}

export function initializeOpeningPeek(state: GameState): void {
  for (const viewer of state.players) {
    const originals = viewer.bigCards?.filter((card) => card.cardId === KUIJI_CARD_ID);
    if (!originals?.length) continue;
    const knowledge = ((state.peekBigCardsByViewer ??= {})[viewer.id] ??= []);
    for (const card of originals) card.openingCopyAvailable = true;
    for (const owner of state.players) {
      if (owner.id === viewer.id) continue;
      for (const card of owner.bigCards ?? []) knowledge.push(card.instanceId);
      for (const id of getOwnedSkillIds(owner)) {
        const known = ((state.skillKnowledge[viewer.id] ??= {})[owner.id] ??= []);
        if (!known.includes(id)) known.push(id);
      }
    }
  }
}

export function findPeekCopyTarget(state: GameState, playerId: PlayerId, instanceId: string | undefined) {
  if (!instanceId || !state.peekBigCardsByViewer?.[playerId]?.includes(instanceId)) return undefined;
  return state.players.flatMap((player) => player.bigCards ?? []).find((card) => card.instanceId === instanceId);
}

export function copyPeekCard(state: GameState, player: PlayerState, action: SkillAction): void {
  const source = player.bigCards?.find((card) => card.instanceId === bigAbilitySource(player, action));
  const target = findPeekCopyTarget(state, player.id, action.targetBigCardInstanceId);
  if (!source || !target || !canReceiveBigCard(player, "skill_copy")) return;
  source.openingCopyAvailable = false;
  grantFreshBigCard(state, player, target, { publiclyRevealed: true });
  if (target.cardId === HUNYAO_CARD_ID && isFusionPreparation(state)) queueZhuRiOpeningChoices(state, player);
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
    message: `${player.name} 声明复制了 ${getBigCard(target.cardId)?.name ?? target.cardId}` });
}

export function loseKuijiUltimate(state: GameState, event: DamageEvent): void {
  if (event.sourceAbilityId !== KUIJI_ULTIMATE_ID || !event.sourceId) return;
  const player = findPlayer(state, event.sourceId);
  const card = player?.bigCards?.find((entry) => entry.instanceId === event.sourceBigCardInstanceId);
  if (!player || !card || card.lostAbilityIds?.includes(KUIJI_ULTIMATE_ID) ||
    player.buffs.some((buff) => buff.immuneEffectCategories?.includes("skill_loss"))) return;
  (card.lostAbilityIds ??= []).push(KUIJI_ULTIMATE_ID);
  addBigCardStatus(state, player.id, "kuiji_cake_growth", player.id, KUIJI_ULTIMATE_ID, card.instanceId,
    { name: "窥觊苍生·出饼×3" }, false);
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
    message: `${player.name} 永久失去「窥觊苍生」出招，获得出饼×3` });
}

export function addBigCardStatus(state: GameState, targetId: PlayerId, type: string, sourceId: PlayerId,
  abilityId: string, sourceInstanceId: string | undefined, extra: Partial<BuffState>, negative: boolean): void {
  const target = findPlayer(state, targetId);
  if (!target) return;
  const apply = (player: PlayerState) => player.buffs.push({ id: createId(type), stateType: type,
    name: ({ burning: "烧伤", limited_disabled: "限定技失效", control_disabled: "控制技失效",
      mitigation_disabled: "减伤与回避失效", skill_rebound: "熔岩天甲·技能反弹", fenshi_flames: "焚世烈焰", fenjin: "焚烬" } as Record<string, string>)[type] ?? type,
    stacks: 1, sourcePlayerId: sourceId, sourceAbilityId: abilityId,
    ...(sourceInstanceId ? { sourceBigCardInstanceId: sourceInstanceId } : {}), ...extra });
  if (negative) applyNegativeStatus(state, targetId, type, apply, sourceId); else apply(target);
}

export function clearFentianBattlefield(state: GameState, canAffect: (player: PlayerState) => boolean = () => true): void {
  for (const player of state.players.filter((p) => p.kind !== "spectator" && canAffect(p))) {
    changeCakes(state, player.id, 0, "焚天君燚清场");
    removeStateCategory(player, "positive");
    removeStateCategory(player, "element");
    player.buffs = player.buffs.filter((buff) => buff.id !== "defense_value");
  }
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: "焚天君燚在命中判定清除了全场（含自身）的良好状态、元素、饼与防御值" });
}

export function applyFentianHitStates(state: GameState, sourceId: PlayerId, targetId: PlayerId, instanceId?: string): void {
  addBigCardStatus(state, targetId, "burning", sourceId, "1050101", instanceId, { expiresAtTurn: state.turnNumber + 2 }, true);
  addBigCardStatus(state, targetId, "limited_disabled", sourceId, "1050101", instanceId, { expiresAtRound: state.roundNumber + 3 }, true);
  addBigCardStatus(state, targetId, "control_disabled", sourceId, "1050101", instanceId, { expiresAtRound: state.roundNumber + 2 }, true);
}

/** A death candidate may be visited repeatedly while revival windows or reactions are processed. */
export function markFenjinForDeath(state: GameState, target: PlayerState, events: DamageEvent[]): void {
  if (!isBigSkillMode(state.config.skillMode)) return;
  const batch = events[0]?.id ?? "empty";
  for (const source of state.players) {
    if (!events.some((event) => getSkillDamageSourceIds(event).includes(source.id) &&
      (event.element === "fire" || event.elements?.includes("fire") || event.traits?.includes("fire")))) continue;
    for (const buff of source.buffs.filter((entry) => entry.stateType === "fenshi_flames" && (entry.expiresAtRound ?? 0) > state.roundNumber)) {
      const seen = `fenjin_death:${target.id}:${buff.id}:${batch}`;
      if (target.buffs.some((entry) => entry.id === seen)) continue;
      target.buffs.push({ id: seen, name: "本次焚烬施加已处理", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
      addBigCardStatus(state, target.id, "fenjin", source.id, FENSHI_FLAMES_ID, buff.sourceBigCardInstanceId, {}, true);
    }
  }
}

export function removeBigCardInstance(state: GameState, playerId: PlayerId, instanceId: string, reason: "burn" | "remove" = "remove"): void {
  const player = findPlayer(state, playerId);
  const card = player?.bigCards?.find((entry) => entry.instanceId === instanceId);
  if (!player || !card) return;
  detachBigCard(player, instanceId);
  const remaining = new Set(getOwnedSkillIds(player));
  player.revealedSkillIds = player.revealedSkillIds.filter((id) => remaining.has(id));
  for (const knowledge of Object.values(state.skillKnowledge)) if (knowledge?.[playerId]) knowledge[playerId] = knowledge[playerId]!.filter((id) => remaining.has(id));
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", removalKind: reason,
    message: `${player.name} 的大卡 ${getBigCard(card.cardId)?.name ?? card.cardId} 被${reason === "burn" ? "烧去" : "消除"}` });
}

function detachBigCard(player: PlayerState, instanceId: string, detachBoundState = false): void {
  const card = player.bigCards?.find((entry) => entry.instanceId === instanceId);
  player.bigCards = player.bigCards!.filter((entry) => entry.instanceId !== instanceId);
  if (card) adjustGrantedSkillUseLedger(player, card, -1);
  if (player.spareLives) player.spareLives = player.spareLives.filter((life) => life.sourceBigCardInstanceId !== instanceId);
  if (detachBoundState) {
    const fusionIds = new Set(player.skillFusions?.filter((fusion) => fusion.sourceBigCardInstanceId === instanceId).map((fusion) => fusion.id));
    player.buffs = player.buffs.filter((buff) => !(buff.sourceFusionId && fusionIds.has(buff.sourceFusionId)));
  }
  for (let i = (player.skillInventory?.length ?? 0) - 1; i >= 0; i--)
    if (player.skillInventory![i]!.sourceBigCardInstanceId === instanceId) removeSkillInstanceAt(player, i);
  reconcileSkillFusions(player);
}

function adjustGrantedSkillUseLedger(player: PlayerState, card: BigCardInstance, direction: -1 | 1): void {
  for (const [skillId, count] of Object.entries(card.grantedSkillUses ?? {})) {
    const id = `skill_used:${skillId}`;
    const buff = player.buffs.find((entry) => entry.id === id);
    if (buff) {
      buff.stacks += count * direction;
      if (buff.stacks <= 0) player.buffs = player.buffs.filter((entry) => entry !== buff);
    } else if (direction === 1) player.buffs.push({ id, name: "技能使用次数", stacks: count });
  }
}

export function absorbBigCardAbility(state: GameState, recipient: PlayerState, owner: PlayerState): void {
  if (!canReceiveBigCard(recipient, "skill_absorption") || !canReceiveBigCard(owner, "skill_absorption")) return;
  const eligible = (owner.bigCards ?? []).flatMap((card) => {
    const definition = getBigCard(card.cardId);
    if (!definition || Number(definition.rankCode) > 8) return [];
    return definition.abilities.filter(({ id }) => bigCardHasAbility(card, id)).map(({ id }) => ({ card, id }));
  });
  const chosen = eligible[Math.floor(Math.random() * eligible.length)];
  if (!chosen || owner.buffs.some((buff) => buff.immuneEffectCategories?.includes("skill_loss"))) return;
  const { card, id } = chosen;
  (card.lostAbilityIds ??= []).push(id);
  if ([FENTIAN_INHERIT_ID, HUNYAO_LIGHT_ID, JIHAN_INHERIT_ID, JUNENG_INHERIT_ID, KUIJI_INHERIT_ID, STAR_INHERIT_ID, DRAGON_INHERIT_ID, VERDICT_INHERIT_ID].includes(id)) {
    adjustGrantedSkillUseLedger(owner, card, -1);
    delete card.grantedSkillUses;
    for (let i = (owner.skillInventory?.length ?? 0) - 1; i >= 0; i--)
      if (owner.skillInventory![i]!.sourceBigCardInstanceId === card.instanceId) removeSkillInstanceAt(owner, i);
    reconcileSkillFusions(owner);
  }
  if (id === "1052001" && owner.spareLives) owner.spareLives = owner.spareLives.filter((life) => life.sourceBigCardInstanceId !== card.instanceId);
  grantFreshBigCard(state, recipient, card, { onlyAbilityId: id });
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: recipient.id,
    message: `${recipient.name} 从 ${owner.name} 吸取了大卡子技能 ${id}` });
}

export function borrowBigCards(state: GameState, recipient: PlayerState, owner: PlayerState): void {
  if (!owner.bigCards?.length || !canReceiveBigCard(recipient, "skill_absorption") || !canReceiveBigCard(owner, "skill_absorption")) return;
  applyNegativeStatus(state, owner.id, "temporary_skill_absorption", () => {
    const expiresAtRound = state.roundNumber + 5;
    let lastReturn = state.roundNumber;
    for (const card of [...owner.bigCards!]) {
      const inventory = owner.skillInventory?.filter((item) => item.sourceBigCardInstanceId === card.instanceId) ?? [];
      const fusions = owner.skillFusions?.filter((item) => item.sourceBigCardInstanceId === card.instanceId) ?? [];
      const fusionIds = new Set(fusions.map((item) => item.id));
      const buffs = owner.buffs.filter((item) => item.sourceFusionId && fusionIds.has(item.sourceFusionId));
      const spareLives = owner.spareLives?.filter((item) => item.sourceBigCardInstanceId === card.instanceId) ?? [];
      detachBigCard(owner, card.instanceId, true);
      const boundary = Math.min(expiresAtRound, card.borrowedUntilRound ?? expiresAtRound);
      lastReturn = Math.max(lastReturn, boundary);
      const copy = grantFreshBigCard(state, recipient, card, { borrowedUntilRound: boundary });
      (state.borrowedBigCards ??= []).push({ ownerId: owner.id, borrowerId: recipient.id, copyId: copy.instanceId,
        expiresAtRound: boundary, card, inventory, fusions, buffs, spareLives });
    }
    owner.buffs.push({ id: createId("temporary_skill_absorption"), stateType: "temporary_skill_absorption",
      name: "霸龙·大卡暂被吸取", stacks: 1, sourcePlayerId: recipient.id, expiresAtRound: lastReturn });
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${recipient.name} 以霸龙暂时吸取了 ${owner.name} 的大卡` });
  }, recipient.id);
}

export function settleDragonRoundChanges(state: GameState): void {
  for (const player of state.players) player.buffs = player.buffs.filter((buff) =>
    (buff.stateType !== "dragon_dominion_protection" && buff.stateType !== "temporary_skill_absorption") ||
    (buff.expiresAtRound ?? 0) > state.roundNumber);
  const loans = state.borrowedBigCards ?? [];
  const expired = loans.filter((entry) => entry.expiresAtRound <= state.roundNumber);
  for (const loan of expired) {
    const borrower = findPlayer(state, loan.borrowerId);
    if (borrower?.bigCards?.some((card) => card.instanceId === loan.copyId)) detachBigCard(borrower, loan.copyId, true);
    const owner = findPlayer(state, loan.ownerId);
    if (!owner || loan.skipReturn || (loan.card.borrowedUntilRound ?? Infinity) <= state.roundNumber) continue;
    (owner.bigCards ??= []).push(loan.card);
    ensureSkillInventory(owner);
    owner.skillInventory!.push(...loan.inventory);
    owner.skills.push(...loan.inventory.map((entry) => entry.skillId));
    (owner.skillFusions ??= []).push(...loan.fusions);
    (owner.spareLives ??= []).push(...loan.spareLives);
    owner.buffs.push(...loan.buffs.filter((buff) => (buff.expiresAtRound ?? Infinity) > state.roundNumber &&
      (buff.expiresAtTurn ?? Infinity) > state.turnNumber));
    adjustGrantedSkillUseLedger(owner, loan.card, 1);
    reconcileSkillFusions(owner);
  }
  if (expired.length) state.borrowedBigCards = loans.filter((entry) => entry.expiresAtRound > state.roundNumber);
  for (const bonus of state.pendingDragonFireBonuses ?? []) {
    if (bonus.dueRound > state.roundNumber) continue;
    const escrow = state.borrowedBigCards?.find((loan) => loan.ownerId === bonus.playerId && loan.card.instanceId === bonus.cardInstanceId);
    if (escrow) continue;
    const player = findPlayer(state, bonus.playerId);
    if (!player?.bigCards?.some((card) => card.instanceId === bonus.cardInstanceId)) continue;
    const fire = getFusionSkillId("烽火赤壁");
    const fusionId = player.skillFusions?.find((fusion) => fusion.skillId === fire &&
      fusion.sourceBigCardInstanceId === bonus.cardInstanceId)?.id ??
      grantInitializedSkill(state, player.id, fire, "霸龙补发烽火赤壁", false, undefined, bonus.cardInstanceId);
    if (!fusionId) continue;
    for (const [skillId, stacks] of [["skill_13_68869", 9], ["skill_15_64971", 6]] as const) {
      const id = `fusion_use_bonus:${skillId}`;
      const buff = player.buffs.find((entry) => entry.id === id && entry.sourceFusionId === fusionId);
      if (buff) buff.stacks += stacks;
      else player.buffs.push({ id, name: "霸龙·烽火赤壁加次", stacks, sourceFusionId: fusionId });
    }
  }
  if (state.pendingDragonFireBonuses) state.pendingDragonFireBonuses = state.pendingDragonFireBonuses.filter((bonus) =>
    bonus.dueRound > state.roundNumber || state.borrowedBigCards?.some((loan) => loan.ownerId === bonus.playerId && loan.card.instanceId === bonus.cardInstanceId));
}

export function extendDragonDisappear(card: BigCardInstance): void {
  const bonuses = card.abilityUseBonuses ??= {};
  bonuses[DRAGON_DISAPPEAR_ID] = (bonuses[DRAGON_DISAPPEAR_ID] ?? 0) + 1;
}

export function consumeFenjinAfterRevival(state: GameState, player: PlayerState): void {
  if (state.damageAttribution) state.damageAttribution[player.id] = [];
  if (ignoresNegativeStatuses(player)) return;
  const marks = player.buffs.filter((buff) => buff.stateType === "fenjin");
  if (!marks.length) return;
  player.buffs = player.buffs.filter((buff) => buff.stateType !== "fenjin");
  for (const mark of marks) {
    const cards = player.bigCards ?? [];
    if (!cards.length) break;
    const chosen = cards[Math.floor(Math.random() * cards.length)]!;
    removeBigCardInstance(state, player.id, chosen.instanceId, "burn");
  }
}
