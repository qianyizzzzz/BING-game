import { PlayerId, PlayerStatus } from "../types";

export interface LightningTargetPlayer {
  id: PlayerId;
  hp: number;
  status: PlayerStatus;
}

export interface LightningSpellTargetPlan<TPlayer extends LightningTargetPlayer> {
  lockedTargets: TPlayer[];
  selectableTargets: TPlayer[];
  requiredSelectableCount: number;
  targetCount: number;
}

export function getLightningSpellTargetPlan<TPlayer extends LightningTargetPlayer>(
  players: TPlayer[],
  sourceId: PlayerId
): LightningSpellTargetPlan<TPlayer> {
  const candidates = players
    .filter((player) => player.status === "alive" && player.id !== sourceId)
    .sort((a, b) => b.hp - a.hp);
  const targetCount = Math.min(2, candidates.length);
  if (targetCount === 0) {
    return {
      lockedTargets: [],
      selectableTargets: [],
      requiredSelectableCount: 0,
      targetCount: 0
    };
  }

  const highestHp = candidates[0]?.hp;
  const highest = candidates.filter((player) => player.hp === highestHp);
  if (highest.length >= 3) {
    return {
      lockedTargets: [],
      selectableTargets: highest,
      requiredSelectableCount: 2,
      targetCount
    };
  }

  if (highest.length === 2 || targetCount === 1) {
    return {
      lockedTargets: highest.slice(0, targetCount),
      selectableTargets: [],
      requiredSelectableCount: 0,
      targetCount
    };
  }

  const secondHp = candidates.find((player) => player.hp !== highestHp)?.hp;
  const second = candidates.filter((player) => player.hp === secondHp);
  if (second.length <= 1) {
    return {
      lockedTargets: [highest[0]!, ...second].slice(0, targetCount),
      selectableTargets: [],
      requiredSelectableCount: 0,
      targetCount
    };
  }

  return {
    lockedTargets: [highest[0]!],
    selectableTargets: second,
    requiredSelectableCount: 1,
    targetCount
  };
}

export function resolveLightningSpellTargetIds(
  players: LightningTargetPlayer[],
  sourceId: PlayerId,
  selectedTargetIds: PlayerId[]
): PlayerId[] | undefined {
  const plan = getLightningSpellTargetPlan(players, sourceId);
  const lockedIds = plan.lockedTargets.map((player) => player.id);
  const selectableIds = new Set(plan.selectableTargets.map((player) => player.id));
  const selectedIds = Array.from(new Set(selectedTargetIds.filter(Boolean)));

  if (plan.targetCount === 0) {
    return [];
  }

  if (plan.requiredSelectableCount === 0) {
    if (
      selectedIds.length > 0 &&
      (selectedIds.length !== lockedIds.length ||
        selectedIds.some((id) => !lockedIds.includes(id)))
    ) {
      return undefined;
    }
    return lockedIds;
  }

  if (selectedIds.some((id) => !lockedIds.includes(id) && !selectableIds.has(id))) {
    return undefined;
  }

  const selectedSelectableIds = selectedIds.filter((id) => selectableIds.has(id));
  if (selectedSelectableIds.length !== plan.requiredSelectableCount) {
    return undefined;
  }

  return [...lockedIds, ...selectedSelectableIds];
}
