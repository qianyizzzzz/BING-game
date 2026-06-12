import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Cookie, FastForward, Plus, RotateCcw, Search, Send, Shield, Sparkles, Swords, Trash2 } from "lucide-react";
import {
  ActionSubmission,
  AttackId,
  AttackStatModifierChoice,
  ATTACK_ORDER,
  BASE_ATTACKS,
  canActionDefend,
  DamageEvent,
  DEFENSE_LABELS,
  DEFENSE_TAG_LABELS,
  DefenseKind,
  PlayerAction,
  PublicGameState,
  RETIRE_EFFECT_POWER,
  SkillId,
  SkillAction,
  getActionLabel,
  getActionSwitchChoicesForAction,
  getActiveSkillCount,
  getLightningSpellTargetPlan,
  getSkill,
  getSkillAttackStats,
  getSkillPlay,
  getSmallSkills,
  getStackedAttackStats,
  isPlayerInCollapse,
  isSkillBlockedByJingu,
  isActionSwitchSkillId,
  resolveLightningSpellTargetIds,
  skillHasTypeTag
} from "@bing/shared";

interface ActionPanelProps {
  state: PublicGameState;
  submitting: boolean;
  onSubmit: (action: ActionSubmission) => void;
  onEnterActionWindow: () => void;
  onPassActionWindow: () => void;
  onSkipToNextAction: () => void;
  onGuessSkill: (targetPlayerId: string, targetSkillId: SkillId) => void;
  onSubmitWindowSkill: (action: SkillAction) => void;
}

type Mode = "gain_cake" | "defense" | "attack" | "skill";
interface AttackRow {
  id: string;
  kind: "attack" | "skill";
  attackId: AttackId;
  skillId: SkillId;
  stacks: number;
  freeStacks?: number;
  targetId: string;
  extraTargetIds?: string[];
}
interface ActionSwitchOption {
  key: string;
  actionIndex: number;
  current: PlayerAction;
  action: NonNullable<SkillAction["switchToAction"]>;
  cost: number;
  label: string;
}
interface AttackStatModifierOption {
  key: string;
  actionIndex: number;
  current: PlayerAction;
  modifier: AttackStatModifierChoice;
  label: string;
}
interface DoubleEdgeOption {
  key: string;
  actionIndex: number;
  current: PlayerAction;
  targetId: string;
  label: string;
}
interface LiegongOption {
  key: string;
  actionIndex: number;
  current: PlayerAction;
  targetId: string;
  counter: PlayerAction;
  label: string;
}
interface AbsoluteGuardOption {
  key: string;
  sourceId: string;
  actionIndex: number;
  action: PlayerAction;
  mode: "area_to_self" | "single_to_area";
  cost: number;
  label: string;
}
const FIRST_ATTACK_ID = ATTACK_ORDER[0]!;
const DESTROY_POWER_MODIFIER_CHOICES: AttackStatModifierChoice[] = [
  "power_plus_1_level_minus_1",
  "power_minus_1_level_plus_1",
  "power_plus_2_level_minus_2",
  "power_minus_2_level_plus_2",
  "power_times_3_level_to_zero",
  "power_to_zero_level_times_4"
];
const ACTIVE_REVIVAL_SKILL_IDS = new Set<SkillId>([
  "skill_64_60978",
  "skill_66_82448",
  "skill_68_57581",
  "skill_112_59292"
]);
const ELECTRIC_SHOCK_SKILL_ID = "skill_36_14343";
const DOUBLE_EDGE_SWORD_SKILL_ID = "skill_31_80497";
const HELL_OVERLORD_SKILL_ID = "skill_112_59292";
const LIEGONG_SKILL_ID = "skill_60_57192";
const LIEGONG_CROSS_BUFF_PREFIX = "liegong_cross:";
const ABSOLUTE_GUARD_SKILL_ID = "skill_74_34920";
const ABSOLUTE_GUARD_BUFF_PREFIX = "absolute_guard:";
const LUANWU_SKILL_ID = "skill_54_99719";
const PUTIAN_TONGQING_SKILL_ID = "skill_98_7182";
const ICE_RAIN_SKILL_ID = "skill_20_63089";
const CROSS_GUARD_SKILL_ID = "skill_73_76567";
const XIEYU_SKILL_ID = "skill_72_53933";
const SHUNSHOU_STEAL_SKILL_ID = "skill_100_45717";
const SCATTER_REBOUND_SKILL_ID = "skill_58_88471";
const LU_ATTACK_SKILL_ID = "skill_81_59663";
const LIAN_BAO_SKILL_ID = "skill_87_44771";
const FLASH_DODGE_SKILL_ID = "skill_103_56259";
const FLASH_DODGE_COOLDOWN_BUFF_ID = "flash_dodge_cooldown";
const SIX_STAR_SKILL_ID = "skill_108_76133";
const SELF_DESTRUCTER_DEATH_SKILL_ID = "skill_102_5546";
const LATE_SELF_DESTRUCT_USED_BUFF_ID = "late_self_destruct_used";
const MULTI_TARGET_ATTACK_SKILL_IDS = new Set<SkillId>([
  ELECTRIC_SHOCK_SKILL_ID,
  "skill_79_36319",
  "skill_118_53580",
  "skill_119_78843"
]);
const CONTIGUOUS_MULTI_TARGET_SKILL_IDS = new Set<SkillId>([
  "skill_79_36319",
  "skill_118_53580",
  "skill_119_78843"
]);

function formatAttackPower(power: number): string {
  if (power >= RETIRE_EFFECT_POWER) {
    return "退游";
  }

  if (power >= 999) {
    return "∞";
  }

  return String(power);
}

export function ActionPanel({
  state,
  submitting,
  onSubmit,
  onEnterActionWindow,
  onPassActionWindow,
  onSkipToNextAction,
  onGuessSkill,
  onSubmitWindowSkill
}: ActionPanelProps) {
  const viewer = useMemo(
    () => state.players.find((player) => player.id === state.viewerPlayerId),
    [state.players, state.viewerPlayerId]
  );
  const enemies = useMemo(
    () => {
      const alive = state.players.filter((player) => player.status === "alive");
      if (!viewer) {
        return alive;
      }

      return [
        ...alive.filter((player) => player.id !== viewer.id),
        ...alive.filter((player) => player.id === viewer.id)
      ];
    },
    [state.players, viewer]
  );
  const balanceTargetOptions = useMemo(
    () => enemies.filter((player) => player.id !== viewer?.id),
    [enemies, viewer?.id]
  );
  const lightningTargetPlan = useMemo(
    () =>
      viewer
        ? getLightningSpellTargetPlan(state.players, viewer.id)
        : {
            lockedTargets: [],
            selectableTargets: [],
            requiredSelectableCount: 0,
            targetCount: 0
          },
    [state.players, viewer]
  );
  const lightningFirstTargetOptions = useMemo(() => {
    if (lightningTargetPlan.lockedTargets[0]) {
      return [lightningTargetPlan.lockedTargets[0]];
    }

    return lightningTargetPlan.selectableTargets;
  }, [lightningTargetPlan]);
  const lightningSecondTargetOptions = useMemo(() => {
    if (lightningTargetPlan.targetCount < 2) {
      return [];
    }

    if (lightningTargetPlan.lockedTargets[1]) {
      return [lightningTargetPlan.lockedTargets[1]];
    }

    return lightningTargetPlan.selectableTargets;
  }, [lightningTargetPlan]);
  const pendingDeathWindow =
    state.phase === "action_window" &&
    state.activeTimingPhase === "revival_action" &&
    state.players.some((player) => isPendingDeathPlayer(player));
  const viewerPendingDeath = Boolean(viewer && isPendingDeathPlayer(viewer));
  const viewerNoRevive = Boolean(viewer?.buffs.some((buff) => buff.id === "no_revive"));
  const fatalSourceOptions = useMemo(() => {
    if (!viewer) {
      return [];
    }

    const sourceIds = new Set(
      state.eventLog
        .filter(
          (event): event is DamageEvent =>
            event.type === "damage" &&
            event.targetId === viewer.id &&
            event.amount > 0 &&
            event.roundNumber === state.roundNumber &&
            event.turnNumber === state.roundTurnNumber &&
            Boolean(event.sourceId)
        )
        .map((event) => event.sourceId)
        .filter((sourceId): sourceId is string => Boolean(sourceId))
    );
    return state.players.filter((player) => sourceIds.has(player.id));
  }, [state.eventLog, state.players, state.roundNumber, state.turnNumber, viewer]);
  const hellOverlordTargetOptions = useMemo(() => {
    if (!viewer) {
      return [];
    }

    if (pendingDeathWindow && viewerPendingDeath) {
      return [viewer];
    }

    return state.players.filter(
      (player) =>
        player.id !== viewer.id &&
        player.status === "dead" &&
        player.defeatLevel === 1 &&
        !player.buffs.some((buff) => buff.id === "no_revive")
    );
  }, [pendingDeathWindow, state.players, viewer, viewerPendingDeath]);

  const [mode, setMode] = useState<Mode>("gain_cake");
  const [defense, setDefense] = useState<DefenseKind>("small");
  const [targetId, setTargetId] = useState(enemies[0]?.id ?? "");
  const [skillId, setSkillId] = useState<SkillId>("");
  const [discardSkillId, setDiscardSkillId] = useState<SkillId>("");
  const [skillStacks, setSkillStacks] = useState(1);
  const [skillTargetId, setSkillTargetId] = useState(enemies[0]?.id ?? "");
  const [skillExtraTargetIds, setSkillExtraTargetIds] = useState<string[]>([]);
  const [windowSkillId, setWindowSkillId] = useState<SkillId>("");
  const [windowSkillStacks, setWindowSkillStacks] = useState(1);
  const [windowSkillTargetId, setWindowSkillTargetId] = useState(enemies[0]?.id ?? "");
  const [windowSkillExtraTargetId, setWindowSkillExtraTargetId] = useState(enemies[1]?.id ?? "");
  const [windowTargetSkillId, setWindowTargetSkillId] = useState<SkillId>("");
  const [windowExposedSkillQuery, setWindowExposedSkillQuery] = useState("");
  const [windowSandSkillId, setWindowSandSkillId] = useState<SkillId>("");
  const [windowSandSkillQuery, setWindowSandSkillQuery] = useState("");
  const [windowGuessTargetId, setWindowGuessTargetId] = useState(enemies[0]?.id ?? "");
  const [windowGuessSkillId, setWindowGuessSkillId] = useState<SkillId>("");
  const [windowGuessSkillQuery, setWindowGuessSkillQuery] = useState("");
  const [windowDamageId, setWindowDamageId] = useState("");
  const [windowSwitchKey, setWindowSwitchKey] = useState("");
  const [windowAttackStatModifierKey, setWindowAttackStatModifierKey] = useState("");
  const [windowDoubleEdgeKey, setWindowDoubleEdgeKey] = useState("");
  const [windowLiegongKey, setWindowLiegongKey] = useState("");
  const [windowAbsoluteGuardKey, setWindowAbsoluteGuardKey] = useState("");
  const [attackRows, setAttackRows] = useState<AttackRow[]>([
    {
      id: "attack_1",
      kind: "attack",
      attackId: FIRST_ATTACK_ID,
      skillId: "",
      stacks: 1,
      targetId: enemies[0]?.id ?? ""
    }
  ]);

  const alreadySubmitted =
    Boolean(viewer?.id) && state.pendingActionPlayerIds.includes(viewer!.id);
  const canAct =
    state.phase === "collecting_actions" &&
    viewer?.status === "alive" &&
    !alreadySubmitted;
  const viewerHasScatterRebound = viewerCanUseSkill(state, viewer, SCATTER_REBOUND_SKILL_ID);
  const discardableSkills = useMemo(
    () =>
      (viewer?.skills ?? []).map((id, index) => ({
        id,
        index,
        skill: getSkill(id)
      })),
    [viewer?.skills]
  );

  const firstTurnAttackLocked =
    state.config.firstTurnNoAttack && state.roundTurnNumber === 1;
  const playableSkills = useMemo(
    () =>
      (viewer?.skills ?? [])
        .map((id) => {
          const skill = getSkill(id);
          const play = getSkillPlay(id);
          return skill && play ? { skill, play } : undefined;
        })
        .filter((item) => {
          if (!item || !viewer) {
            return false;
          }

          if (!viewerCanUseSkill(state, viewer, item.skill.id)) {
            return false;
          }

          if (
            pendingDeathWindow &&
            (!viewerPendingDeath ||
              !ACTIVE_REVIVAL_SKILL_IDS.has(item.skill.id))
          ) {
            return false;
          }

          const resourceStacks = getSkillResourceStacks(viewer, item.skill.id);
          if (resourceStacks !== undefined && resourceStacks <= 0) {
            return false;
          }

          return (
            !item.play.usesPerGame ||
            getSkillUseCount(viewer, item.skill.id) <
              item.play.usesPerGame * getActiveSkillCount(viewer, item.skill.id)
          );
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [pendingDeathWindow, state, viewer, viewerNoRevive, viewerPendingDeath]
  );
  const turnActionSkills = playableSkills.filter(({ skill }) =>
    skill.timingPhases.includes("turn_action")
  );
  const actionSkills = playableSkills.filter(
    ({ skill, play }) =>
      skill.timingPhases.includes("turn_action") &&
      play.kind === "attack" &&
      skill.id !== ELECTRIC_SHOCK_SKILL_ID
  );
  const nonAttackSkills = turnActionSkills.filter(
    ({ skill, play }) => play.kind !== "attack" || skill.id === ELECTRIC_SHOCK_SKILL_ID
  );
  const windowSkills = playableSkills.filter(
    ({ skill, play }) =>
      state.phase === "action_window" &&
      skill.timingPhases.includes(state.activeTimingPhase) &&
      (state.activeTimingPhase !== "turn_damage_modify" ||
        skill.id === "skill_94_627" ||
        skill.id === SIX_STAR_SKILL_ID ||
        skill.id === ICE_RAIN_SKILL_ID ||
        skill.id === CROSS_GUARD_SKILL_ID) &&
      (skill.id !== XIEYU_SKILL_ID ||
        (state.roundNumber % 3 === 0 &&
          viewer !== undefined &&
          viewer.buffs.filter((buff) => buff.id === "xieyu_target").length <
            getActiveSkillCount(viewer, XIEYU_SKILL_ID))) &&
      play.kind !== "attack"
  );
  const selectedSkill = nonAttackSkills.find((item) => item.skill.id === skillId) ?? nonAttackSkills[0];
  const selectedWindowSkill =
    windowSkills.find((item) => item.skill.id === windowSkillId) ?? windowSkills[0];
  const selectedWindowSkillPlay = selectedWindowSkill?.play;
  const isWindowActionSwitch =
    selectedWindowSkill ? isActionSwitchSkillId(selectedWindowSkill.skill.id) : false;
  const isWindowAttackStatModifier =
    selectedWindowSkill?.skill.id === "skill_45_30424" ||
    selectedWindowSkill?.skill.id === "skill_91_89631";
  const isWindowDoubleEdge = isDoubleEdgeSwordSkill(selectedWindowSkill?.skill);
  const isWindowLiegong = selectedWindowSkill?.skill.id === LIEGONG_SKILL_ID;
  const isWindowAbsoluteGuard = isAbsoluteGuardSkill(selectedWindowSkill?.skill);
  const isWindowSandTransform = selectedWindowSkill?.skill.id === "skill_4_65637";
  const isWindowDamageRedirect = selectedWindowSkill?.skill.id === "skill_94_627";
  const isWindowBalance = selectedWindowSkill?.skill.id === "skill_111_51056";
  const isWindowLightning = selectedWindowSkill?.skill.id === "skill_35_16792";
  const isWindowLishang = selectedWindowSkill?.skill.id === "skill_68_57581";
  const isWindowHellOverlord = selectedWindowSkill?.skill.id === HELL_OVERLORD_SKILL_ID;
  const isWindowIceRain = selectedWindowSkill?.skill.id === ICE_RAIN_SKILL_ID;
  const isWindowCrossGuard = selectedWindowSkill?.skill.id === CROSS_GUARD_SKILL_ID;
  const isWindowDamageMark = isWindowIceRain || isWindowCrossGuard;
  const isWindowShunshouSteal = selectedWindowSkill?.skill.id === SHUNSHOU_STEAL_SKILL_ID;
  const smallSkills = useMemo(
    () => getSmallSkills(),
    []
  );
  const filteredSandSkills = useMemo(() => {
    const normalized = windowSandSkillQuery.trim();
    const filtered = normalized
      ? smallSkills.filter((skill) =>
          searchSkillText(skill).includes(normalized)
        )
      : smallSkills;
    const selectedSkill = smallSkills.find((skill) => skill.id === windowSandSkillId);
    if (selectedSkill && !filtered.some((skill) => skill.id === selectedSkill.id)) {
      return [selectedSkill, ...filtered];
    }
    return filtered;
  }, [smallSkills, windowSandSkillId, windowSandSkillQuery]);
  const windowSwitchOptions = useMemo(
    () =>
      selectedWindowSkill && viewer
        ? buildActionSwitchOptions(state, viewer.id, selectedWindowSkill.skill.id)
        : [],
    [selectedWindowSkill, state, viewer]
  );
  const selectedWindowSwitch =
    windowSwitchOptions.find((option) => option.key === windowSwitchKey) ??
    windowSwitchOptions[0];
  const windowAttackStatModifierOptions = useMemo(
    () =>
      selectedWindowSkill && viewer
        ? buildAttackStatModifierOptions(state, viewer.id, selectedWindowSkill.skill.id)
        : [],
    [selectedWindowSkill, state, viewer]
  );
  const selectedWindowAttackStatModifier =
    windowAttackStatModifierOptions.find(
      (option) => option.key === windowAttackStatModifierKey
    ) ?? windowAttackStatModifierOptions[0];
  const windowDoubleEdgeOptions = useMemo(
    () =>
      viewer
        ? buildDoubleEdgeOptionsV2(state, viewer.id)
        : [],
    [state, viewer]
  );
  const selectedWindowDoubleEdge =
    windowDoubleEdgeOptions.find((option) => option.key === windowDoubleEdgeKey) ??
    windowDoubleEdgeOptions[0];
  const windowLiegongOptions = useMemo(
    () =>
      viewer
        ? buildLiegongOptions(state, viewer.id)
        : [],
    [state, viewer]
  );
  const selectedWindowLiegong =
    windowLiegongOptions.find((option) => option.key === windowLiegongKey) ??
    windowLiegongOptions[0];
  const windowAbsoluteGuardOptions = useMemo(
    () =>
      viewer
        ? buildAbsoluteGuardOptions(state, viewer.id)
        : [],
    [state, viewer]
  );
  const selectedWindowAbsoluteGuard =
    windowAbsoluteGuardOptions.find((option) => option.key === windowAbsoluteGuardKey) ??
    windowAbsoluteGuardOptions[0];
  const hasWindowAttackAction = Boolean(
    viewer &&
      state.revealedActions?.[viewer.id]?.actions.some((action) => isAttackLikeAction(action))
  );
  const selectedWindowTarget = state.players.find((player) => player.id === windowSkillTargetId);
  const exposedTargetSkills = (selectedWindowTarget?.skills ?? [])
    .map((id) => getSkill(id))
    .filter((skill): skill is NonNullable<ReturnType<typeof getSkill>> => Boolean(skill))
    .filter((skill) => {
      if (selectedWindowSkill?.skill.id === "skill_5_34881") {
        return skillHasTypeTag(skill, "锁定技");
      }
      if (isWindowLishang) {
        return smallSkills.some((smallSkill) => smallSkill.id === skill.id);
      }
      return true;
    });
  const filteredExposedTargetSkills = useMemo(() => {
    const normalized = windowExposedSkillQuery.trim();
    const filtered = normalized
      ? exposedTargetSkills.filter((skill) => searchSkillText(skill).includes(normalized))
      : exposedTargetSkills;
    const selectedSkill = exposedTargetSkills.find((skill) => skill.id === windowTargetSkillId);
    if (selectedSkill && !filtered.some((skill) => skill.id === selectedSkill.id)) {
      return [selectedSkill, ...filtered];
    }
    return filtered;
  }, [exposedTargetSkills, windowExposedSkillQuery, windowTargetSkillId]);
  const filteredGuessSkills = useMemo(() => {
    const normalized = windowGuessSkillQuery.trim();
    const filtered = normalized
      ? smallSkills.filter((skill) => searchSkillText(skill).includes(normalized))
      : smallSkills;
    const selectedSkill = smallSkills.find((skill) => skill.id === windowGuessSkillId);
    if (selectedSkill && !filtered.some((skill) => skill.id === selectedSkill.id)) {
      return [selectedSkill, ...filtered];
    }
    return filtered;
  }, [smallSkills, windowGuessSkillId, windowGuessSkillQuery]);
  const redirectableDamageOptions = useMemo(
    () => {
      if (!viewer?.id) {
        return [];
      }

      return (state.pendingDamageItems ?? []).filter(
        (item) =>
          item.targetId === viewer.id &&
          item.amount <= 3 &&
          !(item.redirectedByPlayerIds ?? []).includes(viewer.id)
      );
    },
    [state.pendingDamageItems, viewer?.id]
  );
  const iceRainDamageOptions = useMemo(() => {
    if (!viewer?.id) {
      return [];
    }

    return (state.pendingDamageItems ?? []).filter((item) => {
      if (
        item.targetId !== viewer.id ||
        item.amount <= 0 ||
        !item.sourceId ||
        item.damageModifierIds?.includes("ice_rain")
      ) {
        return false;
      }

      const source = state.players.find((player) => player.id === item.sourceId);
      return Boolean(
        source?.buffs.some((buff) => buff.id === `ice_rain:${viewer.id}` && buff.stacks > 0)
      );
    });
  }, [state.pendingDamageItems, state.players, viewer?.id]);
  const crossGuardDamageOptions = useMemo(() => {
    if (!viewer?.id) {
      return [];
    }

    const hasHuyou = Boolean(
      viewer.buffs.some((buff) => buff.id === "huyou_mark" && buff.stacks > 0)
    );
    const hasCross = Boolean(
      viewer.buffs.some((buff) => buff.id === "cross_mark" && buff.stacks > 0)
    );
    return (state.pendingDamageItems ?? []).filter((item) => {
      if (item.amount <= 0) {
        return false;
      }

      if (
        item.targetId === viewer.id &&
        hasHuyou &&
        !item.damageModifierIds?.includes("huyou")
      ) {
        return true;
      }

      return Boolean(
        hasCross &&
          !item.damageModifierIds?.includes("cross") &&
          areAdjacentPlayerIds(state, viewer.id, item.targetId)
      );
    });
  }, [state, viewer]);
  const damageMarkOptions = useMemo(
    () =>
      isWindowIceRain
        ? iceRainDamageOptions
        : isWindowCrossGuard
          ? crossGuardDamageOptions
          : [],
    [crossGuardDamageOptions, iceRainDamageOptions, isWindowCrossGuard, isWindowIceRain]
  );
  const shunshouChoiceOptions = useMemo(
    () =>
      (state.pendingSkillChoices ?? [])
        .filter((choice) => choice.kind === "steal_skill" && choice.playerId === viewer?.id)
        .map((choice) => {
          const skill = getSkill(choice.skillId);
          const source = state.players.find((player) => player.id === choice.sourcePlayerId);
          return skill
            ? {
                choice,
                skill,
                sourceName: source?.name ?? "未知玩家"
              }
            : undefined;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [state.pendingSkillChoices, state.players, viewer?.id]
  );
  const alreadyFailedSkillGuess = Boolean(
    viewer?.buffs.some((buff) => buff.id === `skill_guess_failed:${state.turnNumber}`)
  );
  const selectedSkillPlay = selectedSkill?.play;
  const selectedSkillStats =
    selectedSkillPlay?.kind === "attack" &&
    selectedSkill &&
    selectedSkill.skill.id !== ELECTRIC_SHOCK_SKILL_ID
      ? getSkillAttackStats(selectedSkill.skill.id, skillStacks)
      : undefined;
  const skillTargetIds =
    selectedSkill && isMultiTargetAttackSkill(selectedSkill.skill.id)
      ? Array.from(
          new Set(
            [skillTargetId, ...skillExtraTargetIds].filter(
              (id): id is string => Boolean(id)
            )
          )
        )
      : skillTargetId
        ? [skillTargetId]
        : [];
  const selectedSkillTargetError =
    selectedSkill && isMultiTargetAttackSkill(selectedSkill.skill.id)
      ? multiTargetSkillTargetErrorForIds(
          state,
          selectedSkill.skill.id,
          skillTargetIds
        )
      : undefined;
  const skillMaxStacks =
    selectedSkillPlay && viewer
      ? Math.max(
          1,
          Math.min(
            selectedSkillPlay.maxStacks,
            selectedSkillPlay.cost > 0
              ? Math.floor(viewer.cakes / selectedSkillPlay.cost)
              : selectedSkillPlay.maxStacks
          )
        )
      : 1;
  const skillCost = selectedSkillPlay ? selectedSkillPlay.cost * skillStacks : 0;
  const windowSkillMaxStacks =
    selectedWindowSkillPlay && viewer
      ? Math.max(
          1,
          Math.min(
            selectedWindowSkillPlay.maxStacks,
            getSkillResourceStacks(viewer, selectedWindowSkill.skill.id) ??
              selectedWindowSkillPlay.maxStacks,
            selectedWindowSkillPlay.cost > 0
              ? Math.floor(viewer.cakes / selectedWindowSkillPlay.cost)
              : selectedWindowSkillPlay.maxStacks
          )
        )
      : 1;
  const windowSkillCost = selectedWindowSwitch
    ? selectedWindowSwitch.cost
    : isWindowAbsoluteGuard && selectedWindowAbsoluteGuard
      ? selectedWindowAbsoluteGuard.cost
    : selectedWindowSkillPlay
      ? selectedWindowSkillPlay.cost * windowSkillStacks
      : 0;
  const attackCost = attackRows.reduce((sum, row) => {
    return sum + rowCost(row);
  }, 0);
  const attackCostTooHigh =
    mode === "attack" && viewer ? attackCost > viewer.cakes : false;
  const skillCostTooHigh =
    mode === "skill" && viewer ? skillCost > viewer.cakes : false;
  const reboundUnavailable =
    mode === "defense" && defense === "rebound" && (!viewer || viewer.cakes <= 0);
  const duplicatedTargets = new Set(
    attackRows.flatMap((row) => rowTargetIds(row)).filter(Boolean)
  ).size !== attackRows.flatMap((row) => rowTargetIds(row)).filter(Boolean).length;
  const hasAreaMixed =
    attackRows.length > 1 && attackRows.some((row) => rowIsArea(row));
  const hasInvalidMultiTargetSkillTargets = attackRows.some((row) =>
    Boolean(multiTargetSkillTargetError(state, row))
  );
  const missingTarget =
    (mode === "attack" &&
      attackRows.some((row) => !rowIsArea(row) && rowTargetIds(row).length === 0)) ||
    (mode === "defense" && defense === "rebound" && !viewerHasScatterRebound && !targetId) ||
    (mode === "skill" && selectedSkillPlay?.targetMode === "single" && !skillTargetId);
  const actionInvalid = Boolean(
    attackCostTooHigh ||
      skillCostTooHigh ||
      (mode === "skill" && (!selectedSkill || !selectedSkillPlay)) ||
      (mode === "skill" && Boolean(selectedSkillTargetError)) ||
      reboundUnavailable ||
      missingTarget ||
      duplicatedTargets ||
      hasAreaMixed ||
      hasInvalidMultiTargetSkillTargets
  );
  const selectedActionSummary = summarizeActionSelection({
    attackRows,
    defense,
    mode,
    selectedSkillName: selectedSkill?.skill.name,
    skillCost,
    skillStacks,
    skillTargetName: getPlayerName(state, skillTargetId),
    state,
    totalAttackCost: attackCost
  });
  const selectedActionCost =
    mode === "attack" ? attackCost : mode === "skill" ? skillCost : mode === "defense" && defense === "rebound" ? 1 : 0;
  const submitLabel =
    mode === "gain_cake"
      ? "提交：吃饼 +1"
      : mode === "defense"
        ? "提交：防御"
        : mode === "attack"
          ? "提交：攻击"
          : "提交：技能";
  const readinessLabel = alreadySubmitted
    ? "已提交，等待亮招"
    : actionInvalid
      ? "需要补全选择"
      : "可以提交";

  useEffect(() => {
    if (enemies[0] && !enemies.some((enemy) => enemy.id === targetId)) {
      setTargetId(enemies[0].id);
    }
    setAttackRows((rows) => {
      let changed = false;
      const nextRows = rows.map((row) => {
        const enemyIds = new Set(enemies.map((enemy) => enemy.id));
        const patch: Partial<AttackRow> = {};

        if (enemies[0] && !enemyIds.has(row.targetId)) {
          patch.targetId = enemies[0].id;
        }

        const extraTargetIds = (row.extraTargetIds ?? []).filter((id) =>
          enemyIds.has(id)
        );
        if (
          extraTargetIds.length !== (row.extraTargetIds ?? []).length ||
          (!isMultiTargetAttackSkill(row.skillId) && extraTargetIds.length > 0)
        ) {
          patch.extraTargetIds = isMultiTargetAttackSkill(row.skillId)
            ? extraTargetIds
            : [];
        }

        if (Object.keys(patch).length === 0) {
          return row;
        }

        changed = true;
        return { ...row, ...patch };
      });
      return changed ? nextRows : rows;
    });
    if (enemies[0] && !enemies.some((enemy) => enemy.id === skillTargetId)) {
      setSkillTargetId(enemies[0].id);
    }
    setSkillExtraTargetIds((current) => {
      const next = current.filter(
        (targetId) =>
          targetId !== skillTargetId &&
          enemies.some((enemy) => enemy.id === targetId)
      );
      return next.length === current.length ? current : next;
    });
    const windowTargetOptions = isWindowLightning
      ? lightningFirstTargetOptions
      : isWindowLishang
        ? fatalSourceOptions
        : isWindowHellOverlord
          ? hellOverlordTargetOptions
        : enemies;
    if (
      windowTargetOptions[0] &&
      !windowTargetOptions.some((enemy) => enemy.id === windowSkillTargetId)
    ) {
      setWindowSkillTargetId(windowTargetOptions[0].id);
    }
    if (enemies[1] && !enemies.some((enemy) => enemy.id === windowSkillExtraTargetId)) {
      setWindowSkillExtraTargetId(enemies[1].id);
    }
    if (enemies[0] && !enemies.some((enemy) => enemy.id === windowGuessTargetId)) {
      setWindowGuessTargetId(enemies[0].id);
    }
  }, [
    enemies,
    fatalSourceOptions,
    hellOverlordTargetOptions,
    isWindowHellOverlord,
    isWindowLishang,
    skillTargetId,
    targetId,
    windowGuessTargetId,
    windowSkillExtraTargetId,
    windowSkillTargetId
  ]);

  useEffect(() => {
    if (!selectedSkill && nonAttackSkills[0]) {
      setSkillId(nonAttackSkills[0].skill.id);
      setSkillStacks(1);
      return;
    }

    if (skillStacks > skillMaxStacks) {
      setSkillStacks(skillMaxStacks);
    }
  }, [nonAttackSkills, selectedSkill, skillMaxStacks, skillStacks]);

  useEffect(() => {
    const firstSkillId = discardableSkills[0]?.id ?? "";
    if (firstSkillId && !discardableSkills.some((item) => item.id === discardSkillId)) {
      setDiscardSkillId(firstSkillId);
    } else if (!firstSkillId && discardSkillId) {
      setDiscardSkillId("");
    }
  }, [discardSkillId, discardableSkills]);

  useEffect(() => {
    if (!selectedWindowSkill && windowSkills[0]) {
      setWindowSkillId(windowSkills[0].skill.id);
      setWindowSkillStacks(1);
      return;
    }

    if (windowSkillStacks > windowSkillMaxStacks) {
      setWindowSkillStacks(windowSkillMaxStacks);
    }

    if (isWindowBalance) {
      const firstBalanceTarget = balanceTargetOptions[0]?.id ?? "";
      const fallbackExtraTarget =
        balanceTargetOptions.find((player) => player.id !== windowSkillTargetId)?.id ?? "";
      if (firstBalanceTarget && !balanceTargetOptions.some((player) => player.id === windowSkillTargetId)) {
        setWindowSkillTargetId(firstBalanceTarget);
      }
      if (
        fallbackExtraTarget &&
        (!balanceTargetOptions.some((player) => player.id === windowSkillExtraTargetId) ||
          windowSkillExtraTargetId === windowSkillTargetId)
      ) {
        setWindowSkillExtraTargetId(fallbackExtraTarget);
      }
    }

    if (isWindowLightning) {
      const firstLightningTarget = lightningFirstTargetOptions[0]?.id ?? "";
      if (
        firstLightningTarget &&
        !lightningFirstTargetOptions.some((player) => player.id === windowSkillTargetId)
      ) {
        setWindowSkillTargetId(firstLightningTarget);
      }

      if (lightningSecondTargetOptions.length === 0) {
        if (windowSkillExtraTargetId) {
          setWindowSkillExtraTargetId("");
        }
      } else {
        const fallbackExtraTarget =
          lightningSecondTargetOptions.find((player) => player.id !== windowSkillTargetId)?.id ??
          lightningSecondTargetOptions[0]?.id ??
          "";
        if (
          fallbackExtraTarget &&
          (!lightningSecondTargetOptions.some((player) => player.id === windowSkillExtraTargetId) ||
            windowSkillExtraTargetId === windowSkillTargetId)
        ) {
          setWindowSkillExtraTargetId(fallbackExtraTarget);
        }
      }
    }

    if (isWindowDamageRedirect || isWindowDamageMark) {
      const activeDamageOptions = isWindowDamageRedirect
        ? redirectableDamageOptions
        : damageMarkOptions;
      const firstDamageId = activeDamageOptions[0]?.id ?? "";
      if (firstDamageId && !activeDamageOptions.some((item) => item.id === windowDamageId)) {
        setWindowDamageId(firstDamageId);
      } else if (!firstDamageId && windowDamageId) {
        setWindowDamageId("");
      }
    }

    if (isWindowShunshouSteal) {
      const firstSkillId = shunshouChoiceOptions[0]?.skill.id ?? "";
      if (
        firstSkillId &&
        !shunshouChoiceOptions.some((option) => option.skill.id === windowTargetSkillId)
      ) {
        setWindowTargetSkillId(firstSkillId);
      } else if (!firstSkillId && windowTargetSkillId) {
        setWindowTargetSkillId("");
      }
    }

    if (isWindowShunshouSteal) {
      // 顺手牵羊使用开局候选技能列表，不参与封印/镜像的已暴露技能同步。
    } else if (isWindowLishang) {
      if (windowTargetSkillId && !exposedTargetSkills.some((skill) => skill.id === windowTargetSkillId)) {
        setWindowTargetSkillId("");
      }
    } else if (exposedTargetSkills[0] && !exposedTargetSkills.some((skill) => skill.id === windowTargetSkillId)) {
      setWindowTargetSkillId(exposedTargetSkills[0].id);
    } else if (!exposedTargetSkills[0] && windowTargetSkillId) {
      setWindowTargetSkillId("");
    }

    if (smallSkills[0] && !smallSkills.some((skill) => skill.id === windowSandSkillId)) {
      setWindowSandSkillId(smallSkills[0].id);
    }

    if (smallSkills[0] && !smallSkills.some((skill) => skill.id === windowGuessSkillId)) {
      setWindowGuessSkillId(smallSkills[0].id);
    }

    if (
      selectedWindowSwitch &&
      !windowSwitchOptions.some((option) => option.key === windowSwitchKey)
    ) {
      setWindowSwitchKey(selectedWindowSwitch.key);
    }

    if (
      selectedWindowAttackStatModifier &&
      !windowAttackStatModifierOptions.some(
        (option) => option.key === windowAttackStatModifierKey
      )
    ) {
      setWindowAttackStatModifierKey(selectedWindowAttackStatModifier.key);
    }

    if (
      selectedWindowDoubleEdge &&
      !windowDoubleEdgeOptions.some((option) => option.key === windowDoubleEdgeKey)
    ) {
      setWindowDoubleEdgeKey(selectedWindowDoubleEdge.key);
    }

    if (
      selectedWindowLiegong &&
      !windowLiegongOptions.some((option) => option.key === windowLiegongKey)
    ) {
      setWindowLiegongKey(selectedWindowLiegong.key);
    }

    if (
      selectedWindowAbsoluteGuard &&
      !windowAbsoluteGuardOptions.some((option) => option.key === windowAbsoluteGuardKey)
    ) {
      setWindowAbsoluteGuardKey(selectedWindowAbsoluteGuard.key);
    }
  }, [
    balanceTargetOptions,
    exposedTargetSkills,
    isWindowBalance,
    isWindowDamageMark,
    isWindowDamageRedirect,
    isWindowLightning,
    isWindowLishang,
    isWindowShunshouSteal,
    lightningFirstTargetOptions,
    lightningSecondTargetOptions,
    damageMarkOptions,
    redirectableDamageOptions,
    shunshouChoiceOptions,
    smallSkills,
    selectedWindowSkill,
    selectedWindowAttackStatModifier,
    selectedWindowDoubleEdge,
    selectedWindowLiegong,
    selectedWindowAbsoluteGuard,
    selectedWindowSwitch,
    windowSkillMaxStacks,
    windowSkillStacks,
    windowSkills,
    windowGuessSkillId,
    windowDamageId,
    windowAttackStatModifierKey,
    windowAttackStatModifierOptions,
    windowDoubleEdgeKey,
    windowDoubleEdgeOptions,
    windowLiegongKey,
    windowLiegongOptions,
    windowAbsoluteGuardKey,
    windowAbsoluteGuardOptions,
    windowSandSkillId,
    windowSkillExtraTargetId,
    windowSkillTargetId,
    windowSwitchKey,
    windowSwitchOptions,
    windowTargetSkillId
  ]);

  useEffect(() => {
    if (state.phase !== "action_window") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "SELECT" ||
        target?.tagName === "TEXTAREA" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        onPassActionWindow();
      }

      if (event.key.toLowerCase() === "f" && state.actionWindowMode === "prompt") {
        event.preventDefault();
        onEnterActionWindow();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEnterActionWindow, onPassActionWindow, state.actionWindowMode, state.phase]);

  if (state.phase === "action_window") {
    const alreadyPassed = viewer?.id
      ? state.actionWindowPassPlayerIds.includes(viewer.id)
      : false;
    const showWindowSkillPanel = state.actionWindowMode === "active" || pendingDeathWindow;
    const canUseWindow =
      viewer?.status === "alive" &&
      !alreadyPassed &&
      (state.actionWindowMode === "active" || (pendingDeathWindow && viewerPendingDeath));
    const canSelfDestructBeforeTurn =
      viewer?.status === "alive" &&
      !alreadyPassed &&
      state.activeTimingPhase === "turn_before_action";
    const lateSelfDestructLimit = viewer
      ? 2 * getActiveSkillCount(viewer, SELF_DESTRUCTER_DEATH_SKILL_ID)
      : 0;
    const lateSelfDestructUsed =
      viewer?.buffs.find((buff) => buff.id === LATE_SELF_DESTRUCT_USED_BUFF_ID)?.stacks ?? 0;
    const lateSelfDestructRemaining = Math.max(
      0,
      lateSelfDestructLimit - lateSelfDestructUsed
    );
    const canLateSelfDestruct =
      viewer?.status === "alive" &&
      !alreadyPassed &&
      state.activeTimingPhase === "turn_change_action" &&
      lateSelfDestructRemaining > 0;
    const needsSkillTarget = selectedWindowSkill
      ? requiresExposedSkillTarget(selectedWindowSkill.skill)
      : false;
    const canGuessSkill =
      state.activeTimingPhase === "turn_end_action" &&
      canUseWindow &&
      !pendingDeathWindow;
    const showDiscardSkillControl =
      canUseWindow && !pendingDeathWindow && discardableSkills.length > 0;
    const canDiscardSkill = Boolean(
      showDiscardSkillControl &&
        discardSkillId &&
        discardableSkills.some((item) => item.id === discardSkillId)
    );
    const guessSkillInvalid = Boolean(
      !canGuessSkill ||
        alreadyFailedSkillGuess ||
        !windowGuessTargetId ||
        !windowGuessSkillId
    );
    const balanceTargetIds = [windowSkillTargetId, windowSkillExtraTargetId].filter(Boolean);
    const balanceTargetsInvalid = Boolean(
      isWindowBalance &&
        (balanceTargetIds.length !== 2 ||
          new Set(balanceTargetIds).size !== 2 ||
          balanceTargetIds.some(
            (targetId) => !balanceTargetOptions.some((player) => player.id === targetId)
          ))
    );
    const lightningTargetIds = [windowSkillTargetId, windowSkillExtraTargetId].filter(Boolean);
    const lightningResolvedTargetIds =
      viewer && isWindowLightning
        ? resolveLightningSpellTargetIds(state.players, viewer.id, lightningTargetIds)
        : undefined;
    const lightningTargetsInvalid = Boolean(
      isWindowLightning &&
        (!lightningResolvedTargetIds ||
          lightningResolvedTargetIds.length !== lightningTargetPlan.targetCount)
    );
    const windowSkillInvalid = Boolean(
        !canUseWindow ||
        !selectedWindowSkill ||
        !selectedWindowSkillPlay ||
        (isWindowActionSwitch && !selectedWindowSwitch) ||
        (isWindowAttackStatModifier && !selectedWindowAttackStatModifier) ||
        (isWindowDoubleEdge && !selectedWindowDoubleEdge && !hasWindowAttackAction) ||
        (isWindowLiegong && !selectedWindowLiegong) ||
        (isWindowAbsoluteGuard && !selectedWindowAbsoluteGuard) ||
        (!isWindowActionSwitch && selectedWindowSkillPlay.targetMode === "single" && !windowSkillTargetId) ||
        (!isWindowActionSwitch && needsSkillTarget && !windowSkillTargetId) ||
        (!isWindowActionSwitch && needsSkillTarget && !windowTargetSkillId) ||
        (!isWindowActionSwitch && isWindowSandTransform && !windowSandSkillId) ||
        (!isWindowActionSwitch && isWindowDamageRedirect && !windowDamageId) ||
        (!isWindowActionSwitch && isWindowDamageMark && !windowDamageId) ||
        (!isWindowActionSwitch && isWindowShunshouSteal && !windowTargetSkillId) ||
        (!isWindowActionSwitch && balanceTargetsInvalid) ||
        (!isWindowActionSwitch && lightningTargetsInvalid) ||
        (!isWindowActionSwitch &&
          isWindowLishang &&
          (!windowSkillTargetId ||
            !fatalSourceOptions.some((player) => player.id === windowSkillTargetId))) ||
        (!isWindowActionSwitch &&
          isWindowHellOverlord &&
          (!windowSkillTargetId ||
            !hellOverlordTargetOptions.some((player) => player.id === windowSkillTargetId))) ||
        (viewer && windowSkillCost > viewer.cakes)
    );

    return (
      <section className="surface-card action-board p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-gray-950">
              {pendingDeathWindow ? "复活阶段" : "行动阶段"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              第 {state.roundNumber} 轮 · 本轮第 {state.roundTurnNumber} 回合 · {phaseLabel(state.activeTimingPhase)}
            </p>
          </div>
          {alreadyPassed ? (
            <span className="status-pill border-emerald-200 bg-emerald-50 text-emerald-700">
              {pendingDeathWindow ? "已结束" : "已放弃"}
            </span>
          ) : null}
        </div>

        {!showWindowSkillPanel ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {state.activeTimingPhase === "turn_before_action" ? (
              <button
                className="btn-secondary justify-center border-rose-200 bg-rose-50 py-3 text-rose-700 hover:bg-rose-100 sm:col-span-2"
                disabled={submitting || !canSelfDestructBeforeTurn}
                onClick={() => onSubmit({ type: "defense", defense: "self_destruct" })}
                type="button"
              >
                自爆
              </button>
            ) : null}
            {state.activeTimingPhase === "turn_change_action" &&
            lateSelfDestructLimit > 0 ? (
              <button
                className="btn-secondary justify-center border-rose-200 bg-rose-50 py-3 text-rose-700 hover:bg-rose-100 sm:col-span-2"
                disabled={submitting || !canLateSelfDestruct}
                onClick={() => onSubmit({ type: "defense", defense: "self_destruct" })}
                type="button"
              >
                后期自爆（剩余 {lateSelfDestructRemaining}）
              </button>
            ) : null}
            <button
              className="btn-primary justify-center py-3"
              disabled={submitting || viewer?.status !== "alive"}
              onClick={onEnterActionWindow}
              type="button"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              行动
            </button>
            <button
              className="btn-secondary justify-center py-3"
              disabled={submitting || viewer?.status !== "alive" || alreadyPassed}
              onClick={onPassActionWindow}
              type="button"
            >
              不行动
            </button>
            <button
              className="btn-secondary justify-center py-3 sm:col-span-2"
              disabled={submitting || viewer?.status !== "alive" || alreadyPassed}
              onClick={onSkipToNextAction}
              type="button"
            >
              <FastForward className="h-4 w-4" aria-hidden="true" />
              跳过到下一次出招
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {state.activeTimingPhase === "turn_before_action" ? (
              <button
                className="btn-secondary w-full justify-center border-rose-200 bg-rose-50 py-3 text-rose-700 hover:bg-rose-100"
                disabled={submitting || !canSelfDestructBeforeTurn}
                onClick={() => onSubmit({ type: "defense", defense: "self_destruct" })}
                type="button"
              >
                自爆
              </button>
            ) : null}
            {state.activeTimingPhase === "turn_change_action" &&
            lateSelfDestructLimit > 0 ? (
              <button
                className="btn-secondary w-full justify-center border-rose-200 bg-rose-50 py-3 text-rose-700 hover:bg-rose-100"
                disabled={submitting || !canLateSelfDestruct}
                onClick={() => onSubmit({ type: "defense", defense: "self_destruct" })}
                type="button"
              >
                后期自爆（剩余 {lateSelfDestructRemaining}）
              </button>
            ) : null}
            {state.activeTimingPhase === "turn_end_action" ? (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-900">
                  <Search className="h-4 w-4" aria-hidden="true" />
                  技能猜测
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto]">
                  <TargetSelect
                    enemies={enemies}
                    targetId={windowGuessTargetId}
                    onChange={setWindowGuessTargetId}
                    label="猜测对象"
                  />
                  <label className="block text-sm font-medium text-gray-700">
                    小技能
                    <input
                      className="soft-input mt-1 w-full"
                      onChange={(event) => setWindowGuessSkillQuery(event.target.value)}
                      placeholder={`搜索 ${smallSkills.length} 个小技能`}
                      value={windowGuessSkillQuery}
                    />
                    <select
                      className="soft-input mt-1 w-full"
                      value={windowGuessSkillId}
                      onChange={(event) => setWindowGuessSkillId(event.target.value)}
                    >
                      {filteredGuessSkills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name} #{skill.sourceRow}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="btn-secondary self-end justify-center py-3 disabled:opacity-40"
                    disabled={submitting || guessSkillInvalid}
                    onClick={() => onGuessSkill(windowGuessTargetId, windowGuessSkillId)}
                    type="button"
                  >
                    <Search className="h-4 w-4" aria-hidden="true" />
                    猜测
                  </button>
                </div>
                {alreadyFailedSkillGuess ? (
                  <p className="mt-2 text-sm text-amber-700">
                    本回合已猜错，不能再次猜测。
                  </p>
                ) : null}
              </div>
            ) : null}
            {showDiscardSkillControl ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  丢弃技能
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <label className="block text-sm font-medium text-gray-700">
                    自身技能
                    <select
                      className="soft-input mt-1 w-full"
                      value={discardSkillId}
                      onChange={(event) => setDiscardSkillId(event.target.value)}
                    >
                      {discardableSkills.map((item) => (
                        <option key={`${item.id}:${item.index}`} value={item.id}>
                          {item.skill?.name ?? item.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="btn-secondary self-end justify-center py-3"
                    disabled={submitting || !canDiscardSkill}
                    onClick={() => {
                      if (!discardSkillId) {
                        return;
                      }
                      onSubmit({
                        type: "discard_skill",
                        targetSkillId: discardSkillId
                      });
                    }}
                    type="button"
                  >
                    丢弃
                  </button>
                </div>
              </div>
            ) : null}
            {windowSkills.length > 0 ? (
              <>
                <div className="grid gap-3 md:grid-cols-[1fr_96px_1fr]">
                  <label className="block text-sm font-medium text-gray-700">
                    技能
                    <select
                      className="soft-input mt-1 w-full"
                      value={selectedWindowSkill?.skill.id ?? ""}
                      onChange={(event) => {
                        setWindowSkillId(event.target.value);
                        setWindowSkillStacks(1);
                      }}
                    >
                      {windowSkills.map(({ skill, play }) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name} · {play.cost}饼
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    重数
                    <input
                      className="soft-input mt-1 w-full"
                      min={1}
                      max={windowSkillMaxStacks}
                      type="number"
                      value={windowSkillStacks}
                      onChange={(event) =>
                        setWindowSkillStacks(
                          Math.max(1, Math.min(windowSkillMaxStacks, Number(event.target.value)))
                        )
                      }
                    />
                  </label>
                  {isWindowDoubleEdge ? (
                    windowDoubleEdgeOptions.length > 0 ? (
                      <label className="block text-sm font-medium text-gray-700">
                        双刃剑目标
                        <select
                          className="soft-input mt-1 w-full"
                          value={selectedWindowDoubleEdge?.key ?? ""}
                          onChange={(event) => setWindowDoubleEdgeKey(event.target.value)}
                        >
                          {windowDoubleEdgeOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        当前没有可用目标
                      </div>
                    )
                  ) : isWindowLiegong ? (
                    windowLiegongOptions.length > 0 ? (
                      <label className="block text-sm font-medium text-gray-700">
                        烈弓交错
                        <select
                          className="soft-input mt-1 w-full"
                          value={selectedWindowLiegong?.key ?? ""}
                          onChange={(event) => setWindowLiegongKey(event.target.value)}
                        >
                          {windowLiegongOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        当前没有可交错的相向攻击
                      </div>
                    )
                  ) : isWindowAbsoluteGuard ? (
                    windowAbsoluteGuardOptions.length > 0 ? (
                      <label className="block text-sm font-medium text-gray-700">
                        绝对守护攻击
                        <select
                          className="soft-input mt-1 w-full"
                          value={selectedWindowAbsoluteGuard?.key ?? ""}
                          onChange={(event) => setWindowAbsoluteGuardKey(event.target.value)}
                        >
                          {windowAbsoluteGuardOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        当前没有本回合将要攻击你的攻击
                      </div>
                    )
                  ) : isWindowShunshouSteal ? (
                    shunshouChoiceOptions.length > 0 ? (
                      <label className="block text-sm font-medium text-gray-700">
                        可牵技能
                        <select
                          className="soft-input mt-1 w-full"
                          value={windowTargetSkillId}
                          onChange={(event) => setWindowTargetSkillId(event.target.value)}
                        >
                          {shunshouChoiceOptions.map((option) => (
                            <option key={option.choice.id} value={option.skill.id}>
                              {option.sourceName} · {option.skill.name} #{option.skill.sourceRow}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        当前没有可获得的候选技能
                      </div>
                    )
                  ) : selectedWindowSkillPlay?.targetMode === "single" || needsSkillTarget ? (
                    <>
                      <TargetSelect
                        enemies={
                          isWindowBalance
                            ? balanceTargetOptions
                            : isWindowLightning
                              ? lightningFirstTargetOptions
                              : isWindowLishang
                                ? fatalSourceOptions
                                : isWindowHellOverlord
                                  ? hellOverlordTargetOptions
                                : enemies
                        }
                        targetId={windowSkillTargetId}
                        onChange={setWindowSkillTargetId}
                        label={
                          needsSkillTarget
                            ? "技能持有者"
                            : isWindowLishang
                              ? "致死者"
                              : isWindowLightning
                                ? "雷电目标"
                                : "技能目标"
                        }
                      />
                      {isWindowBalance || (isWindowLightning && lightningSecondTargetOptions.length > 0) ? (
                        <TargetSelect
                          enemies={isWindowLightning ? lightningSecondTargetOptions : balanceTargetOptions}
                          targetId={windowSkillExtraTargetId}
                          onChange={setWindowSkillExtraTargetId}
                          label={isWindowLightning ? "雷电目标" : "技能目标"}
                        />
                      ) : null}
                    </>
                  ) : (
                    <div className="self-end rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
                      {selectedWindowSkillPlay?.targetMode === "all" ? "作用全体敌人" : "不需要目标"}
                    </div>
                  )}
                </div>
                {isWindowDamageRedirect ? (
                  <label className="block text-sm font-medium text-gray-700">
                    待转移伤害
                    <select
                      className="soft-input mt-1 w-full"
                      value={windowDamageId}
                      onChange={(event) => setWindowDamageId(event.target.value)}
                    >
                      {redirectableDamageOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {formatPendingDamageLabel(state, item)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {isWindowDamageMark ? (
                  <label className="block text-sm font-medium text-gray-700">
                    待处理伤害
                    <select
                      className="soft-input mt-1 w-full"
                      value={windowDamageId}
                      onChange={(event) => setWindowDamageId(event.target.value)}
                    >
                      {damageMarkOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {formatDamageMarkLabel(
                            state,
                            viewer?.id,
                            item,
                            isWindowIceRain ? "ice_rain" : "cross_guard"
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {isWindowActionSwitch ? (
                  windowSwitchOptions.length > 0 ? (
                    <label className="block text-sm font-medium text-gray-700">
                      切换出招
                      <select
                        className="soft-input mt-1 w-full"
                        value={selectedWindowSwitch?.key ?? ""}
                        onChange={(event) => setWindowSwitchKey(event.target.value)}
                      >
                        {windowSwitchOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      当前亮出的出招不能用这个技能切换。
                    </div>
                  )
                ) : null}
                {isWindowAttackStatModifier ? (
                  windowAttackStatModifierOptions.length > 0 ? (
                    <label className="block text-sm font-medium text-gray-700">
                      攻击属性变化
                      <select
                        className="soft-input mt-1 w-full"
                        value={selectedWindowAttackStatModifier?.key ?? ""}
                        onChange={(event) => setWindowAttackStatModifierKey(event.target.value)}
                      >
                        {windowAttackStatModifierOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      当前亮出的出招里没有可修改的攻击。
                    </div>
                  )
                ) : null}
                {needsSkillTarget ? (
                  <label className="block text-sm font-medium text-gray-700">
                    已暴露技能
                    <input
                      className="soft-input mt-1 w-full"
                      onChange={(event) => setWindowExposedSkillQuery(event.target.value)}
                      placeholder={`搜索 ${exposedTargetSkills.length} 个已暴露技能`}
                      value={windowExposedSkillQuery}
                    />
                    <select
                      className="soft-input mt-1 w-full"
                      value={windowTargetSkillId}
                      onChange={(event) => setWindowTargetSkillId(event.target.value)}
                    >
                      {filteredExposedTargetSkills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name} #{skill.sourceRow}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {isWindowLishang ? (
                  <label className="block text-sm font-medium text-gray-700">
                    丢弃技能
                    <input
                      className="soft-input mt-1 w-full"
                      onChange={(event) => setWindowExposedSkillQuery(event.target.value)}
                      placeholder={`搜索 ${exposedTargetSkills.length} 个已暴露小技能`}
                      value={windowExposedSkillQuery}
                    />
                    <select
                      className="soft-input mt-1 w-full"
                      value={windowTargetSkillId}
                      onChange={(event) => setWindowTargetSkillId(event.target.value)}
                    >
                      <option value="">不丢弃</option>
                      {filteredExposedTargetSkills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name} #{skill.sourceRow}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {isWindowSandTransform ? (
                  <label className="block text-sm font-medium text-gray-700">
                    沙子变化
                    <input
                      className="soft-input mt-1 w-full"
                      onChange={(event) => setWindowSandSkillQuery(event.target.value)}
                      placeholder={`搜索 ${smallSkills.length} 个小技能`}
                      value={windowSandSkillQuery}
                    />
                    <select
                      className="soft-input mt-1 w-full"
                      value={windowSandSkillId}
                      onChange={(event) => setWindowSandSkillId(event.target.value)}
                    >
                      {filteredSandSkills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name} #{skill.sourceRow}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-3">
                  <Stat label="消耗" value={`${windowSkillCost}饼`} />
                  <Stat label="阶段" value={phaseLabel(state.activeTimingPhase)} />
                  <Stat label="次数" value={selectedWindowSkillPlay?.usesPerGame ? "本局限定" : "可重复"} />
                </div>
                <p className="text-sm leading-6 text-gray-600">
                  {selectedWindowSkill?.skill.description}
                </p>
                <button
                  className="btn-primary w-full justify-center py-3 disabled:cursor-not-allowed disabled:bg-gray-300"
                  disabled={submitting || windowSkillInvalid}
                  onClick={() => {
                    if (!selectedWindowSkill) {
                      return;
                    }

                    if (
                      pendingDeathWindow &&
                      viewerNoRevive &&
                      ACTIVE_REVIVAL_SKILL_IDS.has(selectedWindowSkill.skill.id)
                    ) {
                      window.alert("因为致死者持有裂魂，所以你无法复活。");
                      return;
                    }

                    const action: SkillAction = {
                      type: "skill",
                      skillId: selectedWindowSkill.skill.id,
                      stacks: windowSkillStacks
                    };
                    if (isWindowActionSwitch && selectedWindowSwitch) {
                      action.switchActionIndex = selectedWindowSwitch.actionIndex;
                      action.switchToAction = selectedWindowSwitch.action;
                    }
                    if (isWindowAttackStatModifier && selectedWindowAttackStatModifier) {
                      action.switchActionIndex = selectedWindowAttackStatModifier.actionIndex;
                      action.attackStatModifier = selectedWindowAttackStatModifier.modifier;
                    }
                    if (isWindowDoubleEdge && selectedWindowDoubleEdge) {
                      action.switchActionIndex = selectedWindowDoubleEdge.actionIndex;
                      action.targetId = selectedWindowDoubleEdge.targetId;
                    } else if (isWindowDoubleEdge) {
                      action.switchActionIndex = 0;
                    }
                    if (isWindowLiegong && selectedWindowLiegong) {
                      action.switchActionIndex = selectedWindowLiegong.actionIndex;
                      action.targetId = selectedWindowLiegong.targetId;
                    }
                    if (isWindowAbsoluteGuard && selectedWindowAbsoluteGuard) {
                      action.switchActionIndex = selectedWindowAbsoluteGuard.actionIndex;
                      action.targetId = selectedWindowAbsoluteGuard.sourceId;
                    }
                    if (!isWindowActionSwitch && selectedWindowSkillPlay?.targetMode === "single") {
                      action.targetId = windowSkillTargetId;
                    }
                    if (!isWindowActionSwitch && isWindowDamageRedirect) {
                      action.targetDamageId = windowDamageId;
                    }
                    if (!isWindowActionSwitch && isWindowDamageMark) {
                      action.targetDamageId = windowDamageId;
                    }
                    if (!isWindowActionSwitch && isWindowShunshouSteal) {
                      action.targetSkillId = windowTargetSkillId;
                    }
                    if (!isWindowActionSwitch && isWindowBalance) {
                      action.targetIds = [windowSkillTargetId, windowSkillExtraTargetId];
                    }
                    if (!isWindowActionSwitch && isWindowLightning) {
                      action.targetIds = [windowSkillTargetId, windowSkillExtraTargetId].filter(Boolean);
                    }
                    if (!isWindowActionSwitch && isWindowLishang && windowTargetSkillId) {
                      action.targetSkillId = windowTargetSkillId;
                    }
                    if (!isWindowActionSwitch && needsSkillTarget) {
                      action.targetId = windowSkillTargetId;
                      action.targetSkillId = windowTargetSkillId;
                    }
                    if (!isWindowActionSwitch && isWindowSandTransform) {
                      action.targetSkillId = windowSandSkillId;
                    }
                    onSubmitWindowSkill(action);
                  }}
                  type="button"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  使用技能
                </button>
              </>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                当前阶段没有可主动使用的技能。
              </div>
            )}
            <button
              className="btn-secondary w-full justify-center py-3"
              disabled={submitting || alreadyPassed}
              onClick={onPassActionWindow}
              type="button"
            >
              结束行动
            </button>
            <button
              className="btn-secondary w-full justify-center py-3"
              disabled={submitting || alreadyPassed}
              onClick={onSkipToNextAction}
              type="button"
            >
              <FastForward className="h-4 w-4" aria-hidden="true" />
              跳过到下一次出招
            </button>
          </div>
        )}
      </section>
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canAct || submitting) {
      return;
    }

    if (mode === "gain_cake") {
      onSubmit({ type: "gain_cake" });
      return;
    }

    if (mode === "defense") {
      if (defense === "rebound") {
        onSubmit({
          type: "defense",
          defense,
          ...(viewerHasScatterRebound ? {} : { targetId })
        });
        return;
      }

      onSubmit({
        type: "defense",
        defense
      });
      return;
    }

    if (mode === "skill") {
      if (!selectedSkill || !selectedSkillPlay) {
        return;
      }

      if (selectedSkillPlay.targetMode === "single") {
        if (isMultiTargetAttackSkill(selectedSkill.skill.id)) {
          onSubmit({
            type: "skill",
            skillId: selectedSkill.skill.id,
            stacks: skillStacks,
            targetId: skillTargetId,
            targetIds: skillTargetIds
          });
          return;
        }

        onSubmit({
          type: "skill",
          skillId: selectedSkill.skill.id,
          stacks: skillStacks,
          targetId: skillTargetId
        });
        return;
      }

      onSubmit({
        type: "skill",
        skillId: selectedSkill.skill.id,
        stacks: skillStacks
      });
      return;
    }

    const actions = attackRows.map((row) => {
      if (row.kind === "skill") {
        const freeStacks =
          row.skillId === LIAN_BAO_SKILL_ID
            ? Math.min(row.stacks, row.freeStacks ?? 0, getFreeLianBaoStacks())
            : 0;
        const freePatch = freeStacks > 0 ? { freeStacks } : {};
        if (rowIsArea(row)) {
          return {
            type: "skill" as const,
            skillId: row.skillId,
            stacks: row.stacks,
            ...freePatch
          };
        }

        if (isMultiTargetAttackSkill(row.skillId)) {
          return {
            type: "skill" as const,
            skillId: row.skillId,
            stacks: row.stacks,
            ...freePatch,
            targetId: row.targetId,
            targetIds: rowTargetIds(row)
          };
        }

        return {
          type: "skill" as const,
          skillId: row.skillId,
          stacks: row.stacks,
          ...freePatch,
          targetId: row.targetId
        };
      }

      if (rowIsArea(row)) {
        return {
          type: "attack" as const,
          attackId: row.attackId,
          stacks: row.stacks
        };
      }

      return {
        type: "attack" as const,
        attackId: row.attackId,
        stacks: row.stacks,
        targetId: row.targetId
      };
    });

    if (actions.length === 0) {
      return;
    }

    if (actions.length === 1) {
      onSubmit(actions[0]!);
      return;
    }

    onSubmit({
      actions
    });
  }

  return (
    <section className="surface-card action-board p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-950">出招</h2>
          <p className="mt-1 text-sm text-gray-500">
            第 {state.roundNumber} 轮 · 本轮第 {state.roundTurnNumber} 回合
          </p>
        </div>
        {alreadySubmitted ? (
          <span className="status-pill border-emerald-200 bg-emerald-50 text-emerald-700">
            等待他人
          </span>
        ) : null}
      </div>

      <form className="action-form mt-4 space-y-4" onSubmit={submit}>
        <div className="action-mode-grid grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ModeButton
            active={mode === "gain_cake"}
            icon={<Cookie className="h-4 w-4" aria-hidden="true" />}
            label="吃饼"
            onClick={() => setMode("gain_cake")}
            testId="action-mode-gain-cake"
          />
          <ModeButton
            active={mode === "defense"}
            icon={<Shield className="h-4 w-4" aria-hidden="true" />}
            label="防御"
            onClick={() => setMode("defense")}
            testId="action-mode-defense"
          />
          <ModeButton
            active={mode === "attack"}
            disabled={firstTurnAttackLocked}
            icon={<Swords className="h-4 w-4" aria-hidden="true" />}
            label="攻击"
            onClick={() => setMode("attack")}
            testId="action-mode-attack"
          />
          <ModeButton
            active={mode === "skill"}
            disabled={nonAttackSkills.length === 0}
            icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
            label="技能"
            onClick={() => setMode("skill")}
            testId="action-mode-skill"
          />
        </div>

        {mode === "defense" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              防御
              <select
                className="soft-input mt-1 w-full"
                value={defense}
                onChange={(event) => setDefense(event.target.value as typeof defense)}
              >
                {(["small", "youtiao", "stone", "rebound", "self_destruct"] as const).map((item) => (
                  <option key={item} value={item}>
                    {DEFENSE_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            {defense === "rebound" && viewerHasScatterRebound ? (
              <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                散弹：群体反弹
              </div>
            ) : defense === "rebound" ? (
              <TargetSelect
                enemies={enemies}
                targetId={targetId}
                onChange={setTargetId}
                label="反弹目标"
              />
            ) : defense === "self_destruct" ? (
              <div className="self-end rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                自爆：无目标，本回合所有出招无效并进入轮末判定点
              </div>
            ) : null}
          </div>
        ) : null}

        {mode === "attack" ? (
          <div className="space-y-3">
            {attackRows.map((row, index) => {
              const stats = rowStats(row);
              const play = row.kind === "skill" ? getSkillPlay(row.skillId) : undefined;
              const isArea = rowIsArea(row);
              const maxStacks = rowMaxStacks(row);
              const lianBaoFreeMax =
                row.kind === "skill" && row.skillId === LIAN_BAO_SKILL_ID
                  ? Math.min(row.stacks, getFreeLianBaoStacks())
                  : 0;
              const extraTargetSlotCount =
                row.kind === "skill" ? getExtraTargetSlotCount(row.skillId) : 0;
              const targetError =
                row.kind === "skill" ? multiTargetSkillTargetError(state, row) : undefined;
              return (
                <div key={row.id} className="action-row">
                  <div
                    className={
                      row.kind === "skill" && row.skillId === LIAN_BAO_SKILL_ID
                        ? "grid gap-3 md:grid-cols-[1fr_96px_110px_1fr_auto]"
                        : "grid gap-3 md:grid-cols-[1fr_96px_1fr_auto]"
                    }
                  >
                    <label className="block text-sm font-medium text-gray-700">
                      攻击 / 技能
                      <select
                        className="soft-input mt-1 w-full"
                        value={rowValue(row)}
                        onChange={(event) => updateRowKind(row.id, event.target.value)}
                      >
                        <optgroup label="基础招式">
                          {ATTACK_ORDER.map((id) => {
                            const item = BASE_ATTACKS[id];
                            return (
                              <option key={id} value={`attack:${id}`}>
                                {item.name} · {item.cost}饼
                              </option>
                            );
                          })}
                        </optgroup>
                        {actionSkills.length > 0 ? (
                          <optgroup label="技能招式">
                            {actionSkills.map(({ skill, play }) => (
                              <option key={skill.id} value={`skill:${skill.id}`}>
                                {skill.name} · {play.cost}饼
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-gray-700">
                      重数
                      <input
                        className="soft-input mt-1 w-full"
                        min={1}
                        max={maxStacks}
                        type="number"
                        value={row.stacks}
                        onChange={(event) =>
                          updateAttackRow(row.id, {
                            stacks: Math.max(
                              1,
                              Math.min(maxStacks, Number(event.target.value))
                            )
                          })
                        }
                      />
                    </label>
                    {row.kind === "skill" && row.skillId === LIAN_BAO_SKILL_ID ? (
                      <label className="block text-sm font-medium text-gray-700">
                        免费重数
                        <select
                          className="soft-input mt-1 w-full"
                          value={Math.min(row.freeStacks ?? 0, lianBaoFreeMax)}
                          onChange={(event) =>
                            updateAttackRow(row.id, {
                              freeStacks: Math.max(
                                0,
                                Math.min(lianBaoFreeMax, Number(event.target.value))
                              )
                            })
                          }
                        >
                          {Array.from({ length: lianBaoFreeMax + 1 }, (_, value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {!isArea ? (
                      <div
                        className={
                          extraTargetSlotCount > 0
                            ? extraTargetSlotCount > 1
                              ? "grid gap-2 sm:grid-cols-3"
                              : "grid gap-2 sm:grid-cols-2"
                            : ""
                        }
                      >
                        <TargetSelect
                          enemies={enemies}
                          targetId={row.targetId}
                          onChange={(nextTargetId) =>
                            updateAttackRow(row.id, {
                              targetId: nextTargetId,
                              extraTargetIds: (row.extraTargetIds ?? []).filter(
                                (id) => id !== nextTargetId
                              )
                            })
                          }
                          label="攻击目标"
                        />
                        {Array.from(
                          { length: extraTargetSlotCount },
                          (_, extraIndex) => (
                            <TargetSelect
                              allowEmpty
                              enemies={extraTargetOptions(row, extraIndex)}
                              key={extraIndex}
                              targetId={(row.extraTargetIds ?? [])[extraIndex] ?? ""}
                              onChange={(nextTargetId) =>
                                updateAttackRowExtraTarget(row.id, extraIndex, nextTargetId)
                              }
                              label={`追加目标 ${extraIndex + 1}`}
                            />
                          )
                        )}
                      </div>
                    ) : (
                      <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        群攻全体
                      </div>
                    )}
                    <button
                      className="self-end rounded-lg border border-gray-200 bg-white p-2 text-gray-500 shadow-sm hover:border-red-200 hover:text-red-700 disabled:opacity-40"
                      disabled={attackRows.length === 1}
                      onClick={() => removeAttackRow(row.id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-4">
                    <Stat label="消耗" value={`${rowCost(row)}饼`} />
                    {stats ? (
                      <>
                        <Stat label="攻击" value={formatAttackPower(stats.power)} />
                        <Stat label="等级" value={String(stats.level)} />
                        <Stat label="防御" value={DEFENSE_TAG_LABELS[stats.defenseTag]} />
                      </>
                    ) : (
                      <>
                        <Stat label="类型" value={play?.kind === "effect" ? "效果" : "技能"} />
                        <Stat label="目标" value="单体" />
                        <Stat label="说明" value={getSkill(row.skillId)?.name ?? "技能"} />
                      </>
                    )}
                  </div>
                  {duplicatedTargets && index === 0 ? (
                    <p className="mt-2 text-sm text-red-600">
                      一回合里不能对同一个人做多个招式。
                    </p>
                  ) : null}
                  {targetError ? (
                    <p className="mt-2 text-sm text-red-600">
                      {targetError}
                    </p>
                  ) : null}
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-3">
              <button
                className="btn-secondary disabled:opacity-40"
                disabled={
                  attackRows.length >= enemies.length ||
                  attackRows.some((row) => rowIsArea(row))
                }
                onClick={addAttackRow}
                type="button"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                添加目标
              </button>
              <div className="text-sm font-medium text-gray-600">
                总消耗：{attackCost} 饼
              </div>
            </div>
            {hasAreaMixed ? (
              <p className="text-sm text-red-600">群攻招式必须单独使用。</p>
            ) : null}
          </div>
        ) : null}

        {mode === "skill" ? (
          <div className="action-row space-y-3">
            {nonAttackSkills.length > 0 ? (
              <>
                <div className="grid gap-3 md:grid-cols-[1fr_96px_1fr]">
                  <label className="block text-sm font-medium text-gray-700">
                    技能
                    <select
                      className="soft-input mt-1 w-full"
                      value={selectedSkill?.skill.id ?? ""}
                      onChange={(event) => {
                        setSkillId(event.target.value);
                        setSkillStacks(1);
                        setSkillExtraTargetIds([]);
                      }}
                    >
                      {nonAttackSkills.map(({ skill, play }) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name} · {play.cost}饼
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    重数
                    <input
                      className="soft-input mt-1 w-full"
                      min={1}
                      max={skillMaxStacks}
                      type="number"
                      value={skillStacks}
                      onChange={(event) =>
                        setSkillStacks(
                          Math.max(1, Math.min(skillMaxStacks, Number(event.target.value)))
                        )
                      }
                    />
                  </label>
                  {selectedSkill && isDoubleEdgeSwordSkill(selectedSkill.skill) ? (
                    <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      双刃剑请在变招阶段选择被防住的攻击目标
                    </div>
                  ) : selectedSkill && isAbsoluteGuardSkill(selectedSkill.skill) ? (
                    <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      绝对守护请在变招阶段选择本回合攻击你的攻击
                    </div>
                  ) : selectedSkillPlay?.targetMode === "single" ? (
                    <div
                      className={
                        selectedSkill && getExtraTargetSlotCount(selectedSkill.skill.id) > 0
                          ? "grid gap-2 sm:grid-cols-2"
                          : ""
                      }
                    >
                      <TargetSelect
                        enemies={enemies}
                        targetId={skillTargetId}
                        onChange={(nextTargetId) => {
                          setSkillTargetId(nextTargetId);
                          setSkillExtraTargetIds((current) =>
                            current.filter((id) => id !== nextTargetId)
                          );
                        }}
                        label="技能目标"
                      />
                      {selectedSkill
                        ? Array.from(
                            { length: getExtraTargetSlotCount(selectedSkill.skill.id) },
                            (_, extraIndex) => (
                              <TargetSelect
                                allowEmpty
                                enemies={skillExtraTargetOptions(extraIndex)}
                                key={extraIndex}
                                targetId={skillExtraTargetIds[extraIndex] ?? ""}
                                onChange={(nextTargetId) =>
                                  updateSkillExtraTarget(extraIndex, nextTargetId)
                                }
                                label={`追加目标 ${extraIndex + 1}`}
                              />
                            )
                          )
                        : null}
                    </div>
                  ) : (
                    <div className="self-end rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
                      {selectedSkillPlay?.targetMode === "all" ? "作用全体敌人" : "不需要目标"}
                    </div>
                  )}
                </div>
                <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-4">
                  <Stat label="消耗" value={`${skillCost}饼`} />
                  {selectedSkillPlay?.kind === "resource" ? (
                    <>
                      <Stat
                        label="获得"
                        value={`${(selectedSkillPlay.resourceGainPerStack ?? 0) * skillStacks}饼`}
                      />
                      <Stat label="类型" value="资源" />
                      <Stat label="目标" value="自身" />
                    </>
                  ) : selectedSkillStats ? (
                    <>
                      <Stat label="攻击" value={formatAttackPower(selectedSkillStats.power)} />
                      <Stat label="等级" value={String(selectedSkillStats.level)} />
                      <Stat label="防御" value={DEFENSE_TAG_LABELS[selectedSkillStats.defenseTag]} />
                    </>
                  ) : null}
                </div>
                {selectedSkillTargetError ? (
                  <p className="text-sm text-red-600">{selectedSkillTargetError}</p>
                ) : null}
                <p className="text-sm leading-6 text-gray-600">
                  {selectedSkill?.skill.description}
                </p>
              </>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                你当前没有资源/效果型主动技能。攻击型技能请在“攻击”面板里和基础招式一起选择。
              </div>
            )}
          </div>
        ) : null}

        {mode === "gain_cake" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900 shadow-sm">
            本回合获得 1 个饼。若对方使用超核爆，出饼也能作为“饼防”。
          </div>
        ) : null}

        <div
          className={[
            "action-summary-panel",
            actionInvalid ? "action-summary-panel-warning" : ""
          ].join(" ")}
        >
          <div>
            <span>当前选择</span>
            <strong>{selectedActionSummary}</strong>
          </div>
          <div className="action-summary-meta">
            <span>{readinessLabel}</span>
            <span>{selectedActionCost > 0 ? `消耗 ${selectedActionCost} 饼` : "无消耗"}</span>
          </div>
        </div>

        <button
          className="btn-primary action-submit-button w-full justify-center py-3 disabled:cursor-not-allowed disabled:bg-gray-300"
          data-testid="submit-action"
          disabled={!canAct || submitting || actionInvalid}
          type="submit"
        >
          {submitting ? (
            <RotateCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {submitLabel}
        </button>
      </form>
    </section>
  );

  function addAttackRow() {
    const usedTargets = new Set(attackRows.map((row) => row.targetId));
    const nextTarget = enemies.find((enemy) => !usedTargets.has(enemy.id)) ?? enemies[0];
    if (!nextTarget) {
      return;
    }

    setAttackRows((rows) => [
      ...rows,
      {
        id: `attack_${Date.now()}`,
        kind: "attack",
        attackId: FIRST_ATTACK_ID,
        skillId: "",
        stacks: 1,
        targetId: nextTarget.id
      }
    ]);
  }

  function updateAttackRow(id: string, patch: Partial<AttackRow>) {
    setAttackRows((rows) =>
      rows.map((row) => {
        if (row.id !== id) {
          return row;
        }

        const next = { ...row, ...patch };
        if (next.kind !== "skill" || next.skillId !== LIAN_BAO_SKILL_ID) {
          next.freeStacks = 0;
          return next;
        }

        next.freeStacks = Math.max(
          0,
          Math.min(next.stacks, getFreeLianBaoStacks(), next.freeStacks ?? 0)
        );
        return next;
      })
    );
  }

  function updateAttackRowExtraTarget(id: string, extraIndex: number, targetId: string) {
    setAttackRows((rows) =>
      rows.map((row) => {
        if (row.id !== id) {
          return row;
        }

        const extraTargetIds = [...(row.extraTargetIds ?? [])];
        if (targetId) {
          extraTargetIds[extraIndex] = targetId;
        } else {
          extraTargetIds.splice(extraIndex, 1);
        }

        return {
          ...row,
          extraTargetIds: extraTargetIds.filter(Boolean)
        };
      })
    );
  }

  function updateSkillExtraTarget(extraIndex: number, targetId: string) {
    setSkillExtraTargetIds((current) => {
      const next = [...current];
      if (targetId) {
        next[extraIndex] = targetId;
      } else {
        next.splice(extraIndex, 1);
      }
      return next.filter(Boolean);
    });
  }

  function removeAttackRow(id: string) {
    setAttackRows((rows) => rows.filter((row) => row.id !== id));
  }

  function updateRowKind(id: string, value: string) {
    const [kind, rawId] = value.split(":") as ["attack" | "skill", string];
    if (!rawId) {
      return;
    }

    if (kind === "skill") {
      updateAttackRow(id, {
        kind,
        skillId: rawId,
        stacks: 1,
        freeStacks: 0,
        extraTargetIds: []
      });
      return;
    }

    updateAttackRow(id, {
      kind: "attack",
      attackId: rawId as AttackId,
      stacks: 1,
      freeStacks: 0,
      extraTargetIds: []
    });
  }

  function rowValue(row: AttackRow): string {
    return row.kind === "skill" ? `skill:${row.skillId}` : `attack:${row.attackId}`;
  }

  function getFreeLianBaoStacks(): number {
    return viewer?.buffs.find((buff) => buff.id === "free_lian_bao")?.stacks ?? 0;
  }

  function rowStats(row: AttackRow) {
    if (row.kind === "skill") {
      const stats = getSkillAttackStats(row.skillId, row.stacks);
      if (stats && row.skillId === LU_ATTACK_SKILL_ID) {
        const growth = Math.min(
          3,
          Math.max(0, viewer?.buffs.find((buff) => buff.id === "lu_growth")?.stacks ?? 0)
        );
        return {
          ...stats,
          power: stats.power >= RETIRE_EFFECT_POWER ? stats.power : stats.power + growth * row.stacks,
          level: stats.level + growth * row.stacks
        };
      }
      return stats;
    }

    return getStackedAttackStats(BASE_ATTACKS[row.attackId], row.stacks);
  }

  function rowCost(row: AttackRow): number {
    if (row.kind === "skill") {
      const play = getSkillPlay(row.skillId);
      if (row.skillId === LIAN_BAO_SKILL_ID) {
        const freeStacks = Math.min(row.stacks, row.freeStacks ?? 0, getFreeLianBaoStacks());
        return (play?.cost ?? 0) * Math.max(0, row.stacks - freeStacks);
      }

      return (play?.cost ?? 0) * row.stacks;
    }

    return getEffectiveAttackCost(row.attackId, row.stacks);
  }

  function rowIsArea(row: AttackRow): boolean {
    if (viewerHasForcedAreaAttacks()) {
      return true;
    }

    if (row.kind === "skill") {
      return getSkillPlay(row.skillId)?.targetMode === "all";
    }

    return getStackedAttackStats(BASE_ATTACKS[row.attackId], row.stacks).isArea;
  }

  function viewerHasForcedAreaAttacks(): boolean {
    return Boolean(
      viewerCanUseSkill(state, viewer, LUANWU_SKILL_ID) ||
        viewerCanUseSkill(state, viewer, PUTIAN_TONGQING_SKILL_ID)
    );
  }

  function rowMaxStacks(row: AttackRow): number {
    if (!viewer) {
      return 1;
    }

    const play = row.kind === "skill" ? getSkillPlay(row.skillId) : undefined;
    const limit = play?.maxStacks ?? 20;
    const resourceStacks =
      row.kind === "skill" ? getSkillResourceStacks(viewer, row.skillId) : undefined;
    const cost =
      row.kind === "skill"
        ? play?.cost ?? 1
        : getEffectiveAttackCost(row.attackId, 1);
    if (row.kind === "skill" && row.skillId === LIAN_BAO_SKILL_ID && cost > 0) {
      return Math.max(
        1,
        Math.min(limit, Math.floor(viewer.cakes / cost) + getFreeLianBaoStacks())
      );
    }
    if (cost <= 0) {
      return Math.max(1, Math.min(limit, resourceStacks ?? limit));
    }

    return Math.max(1, Math.min(limit, resourceStacks ?? limit, Math.floor(viewer.cakes / cost)));
  }

  function getEffectiveAttackCost(attackId: AttackId, stacks: number): number {
    const stats = getStackedAttackStats(BASE_ATTACKS[attackId], stacks);
    const reactorCount = viewer ? getActiveSkillCount(viewer, "skill_80_20445") : 0;
    if (reactorCount > 0 && (attackId === "he_bao" || attackId === "chao_he_bao")) {
      return Math.max(0, stats.cost - 3 * reactorCount * stacks);
    }

    if (viewerCanUseSkill(state, viewer, PUTIAN_TONGQING_SKILL_ID) && attackId === "qin") {
      return stats.cost / 2;
    }

    return stats.cost;
  }

  function extraTargetOptions(row: AttackRow, extraIndex: number) {
    const excludedTargetIds = new Set([
      row.targetId,
      ...(row.extraTargetIds ?? []).filter((_, index) => index !== extraIndex)
    ]);
    return enemies.filter((enemy) => !excludedTargetIds.has(enemy.id));
  }

  function skillExtraTargetOptions(extraIndex: number) {
    const excludedTargetIds = new Set([
      skillTargetId,
      ...skillExtraTargetIds.filter((_, index) => index !== extraIndex)
    ]);
    return enemies.filter((enemy) => !excludedTargetIds.has(enemy.id));
  }
}

function rowTargetIds(row: AttackRow): string[] {
  if (row.kind === "skill" && isMultiTargetAttackSkill(row.skillId)) {
    return Array.from(
      new Set(
        [row.targetId, ...(row.extraTargetIds ?? [])].filter(
          (id): id is string => Boolean(id)
        )
      )
    );
  }

  return row.targetId ? [row.targetId] : [];
}

function isMultiTargetAttackSkill(skillId: SkillId): boolean {
  return MULTI_TARGET_ATTACK_SKILL_IDS.has(skillId);
}

function getMultiTargetLimit(skillId: SkillId): number {
  if (skillId === "skill_118_53580" || skillId === "skill_119_78843") {
    return 3;
  }

  if (skillId === "skill_36_14343" || skillId === "skill_79_36319") {
    return 2;
  }

  return 1;
}

function getExtraTargetSlotCount(skillId: SkillId): number {
  return Math.max(0, getMultiTargetLimit(skillId) - 1);
}

function multiTargetSkillTargetError(
  state: PublicGameState,
  row: AttackRow
): string | undefined {
  if (row.kind !== "skill" || !isMultiTargetAttackSkill(row.skillId)) {
    return undefined;
  }

  return multiTargetSkillTargetErrorForIds(state, row.skillId, rowTargetIds(row));
}

function multiTargetSkillTargetErrorForIds(
  state: PublicGameState,
  skillId: SkillId,
  targetIds: string[]
): string | undefined {
  if (!isMultiTargetAttackSkill(skillId)) {
    return undefined;
  }

  const limit = getMultiTargetLimit(skillId);
  if (targetIds.length < 1 || targetIds.length > limit) {
    return limit === 3
      ? "冰漩决和火漩决需要选择连续的 1 到 3 名目标。"
      : "这个技能需要选择 1 到 2 名目标。";
  }

  const aliveIds = state.players
    .filter((player) => player.status === "alive")
    .map((player) => player.id);
  if (targetIds.some((targetId) => !aliveIds.includes(targetId))) {
    return "目标不存在或已死亡。";
  }

  if (
    CONTIGUOUS_MULTI_TARGET_SKILL_IDS.has(skillId) &&
    !areContiguousTargetIds(aliveIds, targetIds)
  ) {
    return skillId === "skill_79_36319"
      ? "火箭的目标必须是座次连续的玩家。"
      : "冰漩决和火漩决的目标必须是座次连续的玩家。";
  }

  return undefined;
}

function areContiguousTargetIds(aliveIds: string[], targetIds: string[]): boolean {
  const uniqueTargetIds = Array.from(new Set(targetIds));
  if (uniqueTargetIds.length <= 1) {
    return true;
  }

  if (
    aliveIds.length < uniqueTargetIds.length ||
    uniqueTargetIds.some((targetId) => !aliveIds.includes(targetId))
  ) {
    return false;
  }

  const targetSet = new Set(uniqueTargetIds);
  for (let start = 0; start < aliveIds.length; start += 1) {
    const forward = Array.from(
      { length: uniqueTargetIds.length },
      (_, offset) => aliveIds[(start + offset) % aliveIds.length]!
    );
    const backward = Array.from(
      { length: uniqueTargetIds.length },
      (_, offset) => aliveIds[(start - offset + aliveIds.length) % aliveIds.length]!
    );
    if (
      forward.every((targetId) => targetSet.has(targetId)) ||
      backward.every((targetId) => targetSet.has(targetId))
    ) {
      return true;
    }
  }

  return false;
}

interface ModeButtonProps {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  testId?: string;
}

function summarizeActionSelection({
  attackRows,
  defense,
  mode,
  selectedSkillName,
  skillStacks,
  skillTargetName,
  state
}: {
  attackRows: AttackRow[];
  defense: DefenseKind;
  mode: Mode;
  selectedSkillName: string | undefined;
  skillCost: number;
  skillStacks: number;
  skillTargetName: string;
  state: PublicGameState;
  totalAttackCost: number;
}): string {
  if (mode === "gain_cake") {
    return "吃饼：本回合获得 1 饼";
  }

  if (mode === "defense") {
    return `防御：${DEFENSE_LABELS[defense]}`;
  }

  if (mode === "skill") {
    if (!selectedSkillName) {
      return "技能：请选择可用技能";
    }

    const target = skillTargetName ? ` -> ${skillTargetName}` : "";
    const stacks = skillStacks > 1 ? ` x${skillStacks}` : "";
    return `技能：${selectedSkillName}${stacks}${target}`;
  }

  if (attackRows.length === 0) {
    return "攻击：请选择攻击招式";
  }

  return attackRows
    .map((row) => {
      const name =
        row.kind === "skill"
          ? getSkill(row.skillId)?.name ?? "技能攻击"
          : BASE_ATTACKS[row.attackId]?.name ?? "攻击";
      const stacks = row.stacks > 1 ? ` x${row.stacks}` : "";
      const target = isAttackRowArea(row)
        ? "全体"
        : getPlayerName(state, row.targetId) || "未选目标";
      return `${name}${stacks} -> ${target}`;
    })
    .join(" / ");
}

function isAttackRowArea(row: AttackRow): boolean {
  if (row.kind === "skill") {
    return getSkillPlay(row.skillId)?.targetMode === "all";
  }

  return Boolean(BASE_ATTACKS[row.attackId]?.isArea);
}

function getPlayerName(state: PublicGameState, playerId: string): string {
  return state.players.find((player) => player.id === playerId)?.name ?? "";
}

function ModeButton({ active, disabled, icon, label, onClick, testId }: ModeButtonProps) {
  return (
    <button
      className={[
        "mode-button",
        active ? "mode-button-active" : "",
        disabled ? "cursor-not-allowed opacity-45" : ""
      ].join(" ")}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

interface TargetSelectProps {
  allowEmpty?: boolean;
  enemies: Array<{ id: string; name: string }>;
  targetId: string;
  label: string;
  onChange: (targetId: string) => void;
}

function TargetSelect({ allowEmpty = false, enemies, targetId, label, onChange }: TargetSelectProps) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <select
        className="soft-input mt-1 w-full"
        value={targetId}
        onChange={(event) => onChange(event.target.value)}
      >
        {allowEmpty ? <option value="">不追加</option> : null}
        {enemies.map((enemy) => (
          <option key={enemy.id} value={enemy.id}>
            {enemy.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-chip">
      <span className="block text-xs text-gray-400">{label}</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
}

function getSkillUseCount(
  player: PublicGameState["players"][number],
  skillId: SkillId
): number {
  return player.buffs.find((buff) => buff.id === `skill_used:${skillId}`)?.stacks ?? 0;
}

function getSkillResourceStacks(
  player: PublicGameState["players"][number],
  skillId: SkillId
): number | undefined {
  if (skillId === "skill_37_68416") {
    return player.buffs.find((buff) => buff.id === "guidao_charge")?.stacks ?? 0;
  }

  if (skillId === "skill_21_36332") {
    return player.buffs.find((buff) => buff.id === "lava_mark")?.stacks ?? 0;
  }

  if (skillId === "skill_22_54978") {
    return player.buffs.find((buff) => buff.id === "winter_mark")?.stacks ?? 0;
  }

  return undefined;
}

function viewerCanUseSkill(
  state: PublicGameState,
  player: PublicGameState["players"][number] | undefined,
  skillId: SkillId
): boolean {
  return Boolean(
    player?.skills.includes(skillId) &&
      (skillId !== "skill_24_71363" || player.hp === 0) &&
      (skillId !== "skill_45_30424" ||
        countActiveCooldowns(player, "destroy_power_cooldown", state.roundNumber) <
          getActiveSkillCount(player, skillId)) &&
      (skillId !== FLASH_DODGE_SKILL_ID ||
        countActiveCooldowns(player, FLASH_DODGE_COOLDOWN_BUFF_ID, state.roundNumber) <
          getActiveSkillCount(player, skillId)) &&
      !player.buffs.some((buff) => buff.id === `sealed_skill:${skillId}`) &&
      !isPlayerInCollapse(player) &&
      !isSkillBlockedByJingu(state, skillId)
  );
}

function countActiveCooldowns(
  player: PublicGameState["players"][number],
  cooldownIdPrefix: string,
  roundNumber: number
): number {
  return player.buffs.filter(
    (buff) =>
      buff.id.startsWith(cooldownIdPrefix) &&
      (buff.expiresAtRound === undefined || buff.expiresAtRound > roundNumber)
  ).length;
}

function isPendingDeathPlayer(player: PublicGameState["players"][number]): boolean {
  return (
    player.status === "alive" &&
    player.buffs.some((buff) => buff.id === "pending_death")
  );
}

function buildActionSwitchOptions(
  state: PublicGameState,
  playerId: string,
  skillId: SkillId
): ActionSwitchOption[] {
  const plan = state.revealedActions?.[playerId];
  if (!plan) {
    return [];
  }

  return plan.actions.flatMap((current, actionIndex) =>
    getActionSwitchChoicesForAction(skillId, current).map((choice) => ({
      key: `${actionIndex}:${switchActionKey(choice.action)}`,
      actionIndex,
      current,
      action: choice.action,
      cost: choice.cost,
      label: `${getActionLabel(current)} -> ${getActionLabel(choice.action)} / ${choice.cost}饼`
    }))
  );
}

function buildAttackStatModifierOptions(
  state: PublicGameState,
  playerId: string,
  skillId: SkillId
): AttackStatModifierOption[] {
  const plan = state.revealedActions?.[playerId];
  if (!plan) {
    return [];
  }

  const modifiers =
    skillId === "skill_91_89631"
      ? (["swap_power_level"] as AttackStatModifierChoice[])
      : skillId === "skill_45_30424"
        ? DESTROY_POWER_MODIFIER_CHOICES
        : [];

  return plan.actions.flatMap((current, actionIndex) => {
    if (!isAttackLikeAction(current)) {
      return [];
    }

    return modifiers.map((modifier) => ({
      key: `${actionIndex}:${modifier}`,
      actionIndex,
      current,
      modifier,
      label: `${getActionLabel(current)} -> ${attackStatModifierLabel(modifier)}`
    }));
  });
}

function buildDoubleEdgeOptions(
  state: PublicGameState,
  playerId: string
): DoubleEdgeOption[] {
  const plan = state.revealedActions?.[playerId];
  if (!plan) {
    return [];
  }

  return plan.actions.flatMap((current, actionIndex) => {
    if (!isAttackLikeAction(current)) {
      return [];
    }

    const targetId = "targetId" in current ? current.targetId : undefined;
    if (!targetId) {
      return [];
    }

    const targetPlan = state.revealedActions?.[targetId];
    const targetAction = targetPlan?.actions.find(
      (action) => action.type === "defense" || action.type === "gain_cake"
    );
    if (targetAction?.type !== "defense" || targetAction.defense === "rebound") {
      return [];
    }

    const stats = getActionAttackStats(current);
    if (!stats || !canActionDefend(targetAction, stats.defenseTag)) {
      return [];
    }

    const targetName =
      state.players.find((player) => player.id === targetId)?.name ?? "目标";
    return [
      {
        key: `${actionIndex}:${targetId}`,
        actionIndex,
        current,
        targetId,
        label: `${getActionLabel(current)} -> ${targetName} / 无视 ${getActionLabel(targetAction)}`
      }
    ];
  });
}

function getActionAttackStats(action: PlayerAction) {
  return action.type === "attack"
    ? getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks)
    : action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack"
      ? getSkillAttackStats(action.skillId, action.stacks)
      : undefined;
}

function buildDoubleEdgeOptionsV2(
  state: PublicGameState,
  playerId: string
): DoubleEdgeOption[] {
  const plan = state.revealedActions?.[playerId];
  if (!plan) {
    return [];
  }

  return plan.actions.flatMap((current, actionIndex) => {
    if (!isAttackLikeAction(current)) {
      return [];
    }

    const stats = getActionAttackStats(current);
    if (!stats) {
      return [];
    }

    return getDoubleEdgeTargetIdsForAction(state, playerId, current, stats).flatMap(
      (targetId) => {
        const targetAction = getDefensiveActionForDoubleEdgeOption(
          state,
          playerId,
          targetId
        );
        if (
          !targetAction ||
          targetAction.type === "attack" ||
          targetAction.type === "skill" ||
          (targetAction.type === "defense" && targetAction.defense === "rebound") ||
          isDoubleEdgeTargetQueued(state, playerId, actionIndex, targetId) ||
          !canActionDefend(targetAction, stats.defenseTag)
        ) {
          return [];
        }

        const targetName =
          state.players.find((player) => player.id === targetId)?.name ?? "目标";
        return [
          {
            key: `${actionIndex}:${targetId}`,
            actionIndex,
            current,
            targetId,
            label: `第 ${actionIndex + 1} 招 ${getActionLabel(current)} -> ${targetName} / 无视 ${getActionLabel(targetAction)}`
          }
        ];
      }
    );
  });
}

function buildLiegongOptions(
  state: PublicGameState,
  playerId: string
): LiegongOption[] {
  const plan = state.revealedActions?.[playerId];
  if (!plan) {
    return [];
  }

  return plan.actions.flatMap((current, actionIndex) => {
    if (!isAttackLikeAction(current)) {
      return [];
    }

    const stats = getActionAttackStats(current);
    if (!stats) {
      return [];
    }

    return getDoubleEdgeTargetIdsForAction(state, playerId, current, stats).flatMap(
      (targetId) => {
        if (isLiegongTargetQueued(state, playerId, actionIndex, targetId)) {
          return [];
        }

        const counter = getIncomingAttackForLiegong(state, targetId, playerId);
        if (!counter) {
          return [];
        }

        const targetName =
          state.players.find((player) => player.id === targetId)?.name ?? "目标";
        return [
          {
            key: `${actionIndex}:${targetId}`,
            actionIndex,
            current,
            targetId,
            counter,
            label: `第 ${actionIndex + 1} 招 ${getActionLabel(current)} 与 ${targetName} 的 ${getActionLabel(counter)} 交错`
          }
        ];
      }
    );
  });
}

function buildAbsoluteGuardOptions(
  state: PublicGameState,
  playerId: string
): AbsoluteGuardOption[] {
  return state.players.flatMap((source) => {
    const plan = state.revealedActions?.[source.id];
    if (!plan || source.id === playerId || source.status !== "alive") {
      return [];
    }

    return plan.actions.flatMap((action, actionIndex) => {
      if (!isAttackLikeAction(action) || isAbsoluteGuardQueued(state, source.id, actionIndex)) {
        return [];
      }

      const stats = getActionAttackStats(action);
      if (!stats) {
        return [];
      }

      const targetIds = getDoubleEdgeTargetIdsForAction(state, source.id, action, stats);
      if (!targetIds.includes(playerId)) {
        return [];
      }

      const mode =
        stats.isArea ||
        isActionForcedArea(state, source.id, action, stats) ||
        isImplicitAreaAction(action, stats)
        ? "area_to_self"
        : "single_to_area";
      const cost = Math.ceil(getActionCostForPlayer(state, source, action) / 2);
      return [
        {
          key: `${source.id}:${actionIndex}`,
          sourceId: source.id,
          actionIndex,
          action,
          mode,
          cost,
          label: `${source.name} 第 ${actionIndex + 1} 招 ${getActionLabel(action)} / ${mode === "area_to_self" ? "群攻改单攻" : "单攻改群攻"} / ${cost}饼`
        }
      ];
    });
  });
}

function isDoubleEdgeTargetQueued(
  state: PublicGameState,
  playerId: string,
  actionIndex: number,
  targetId: string
): boolean {
  const player = state.players.find((item) => item.id === playerId);
  const prefix = `double_edge_ignore_defense:${actionIndex}:${targetId}:`;
  return Boolean(player?.buffs.some((buff) => buff.id.startsWith(prefix)));
}

function isLiegongTargetQueued(
  state: PublicGameState,
  playerId: string,
  actionIndex: number,
  targetId: string
): boolean {
  const player = state.players.find((item) => item.id === playerId);
  const prefix = `${LIEGONG_CROSS_BUFF_PREFIX}${actionIndex}:${targetId}:`;
  return Boolean(player?.buffs.some((buff) => buff.id.startsWith(prefix)));
}

function isAbsoluteGuardQueued(
  state: PublicGameState,
  sourceId: string,
  actionIndex: number
): boolean {
  const source = state.players.find((item) => item.id === sourceId);
  const prefix = `${ABSOLUTE_GUARD_BUFF_PREFIX}${actionIndex}:`;
  return Boolean(source?.buffs.some((buff) => buff.id.startsWith(prefix)));
}

function isDoubleEdgeSwordSkill(skill?: { id: string; name?: string } | null): boolean {
  return skill?.id === DOUBLE_EDGE_SWORD_SKILL_ID || skill?.name === "双刃剑";
}

function isAbsoluteGuardSkill(
  skill?: { id: string; name?: string; sourceRow?: number } | null
): boolean {
  return (
    skill?.id === ABSOLUTE_GUARD_SKILL_ID ||
    skill?.name === "绝对守护" ||
    skill?.sourceRow === 74
  );
}

function getDoubleEdgeTargetIdsForAction(
  state: PublicGameState,
  playerId: string,
  action: PlayerAction,
  stats: NonNullable<ReturnType<typeof getActionAttackStats>>
): string[] {
  const alive = state.players.filter((player) => player.status === "alive");
  if (
    stats.isArea ||
    isActionForcedArea(state, playerId, action, stats) ||
    isImplicitAreaAction(action, stats)
  ) {
    const targetIds = alive.filter((player) => player.id !== playerId).map((player) => player.id);
    return filterPutianTongqingBlindSpotTargetIds(state, playerId, targetIds);
  }

  if (action.type === "skill" && MULTI_TARGET_ATTACK_SKILL_IDS.has(action.skillId)) {
    return Array.from(
      new Set([...(action.targetIds ?? []), action.targetId].filter(Boolean) as string[])
    );
  }

  return "targetId" in action && action.targetId ? [action.targetId] : [];
}

function isActionForcedArea(
  state: PublicGameState,
  sourceId: string,
  action: PlayerAction,
  stats: NonNullable<ReturnType<typeof getActionAttackStats>>
): boolean {
  const source = state.players.find((player) => player.id === sourceId);
  const isElectricShockAction =
    action.type === "skill" && action.skillId === ELECTRIC_SHOCK_SKILL_ID;
  return Boolean(
    !isElectricShockAction &&
      !stats.isArea &&
      (viewerCanUseSkill(state, source, LUANWU_SKILL_ID) ||
        viewerCanUseSkill(state, source, PUTIAN_TONGQING_SKILL_ID))
  );
}

function filterPutianTongqingBlindSpotTargetIds(
  state: PublicGameState,
  sourceId: string,
  targetIds: string[]
): string[] {
  const source = state.players.find((player) => player.id === sourceId);
  if (!viewerCanUseSkill(state, source, PUTIAN_TONGQING_SKILL_ID)) {
    return targetIds;
  }

  const farthest = getFarthestAlivePlayerIds(state, sourceId);
  if (farthest.size === 0) {
    return targetIds;
  }

  return targetIds.filter((targetId) => !farthest.has(targetId));
}

function getFarthestAlivePlayerIds(state: PublicGameState, sourceId: string): Set<string> {
  const alive = state.players.filter((player) => player.status === "alive");
  const sourceIndex = alive.findIndex((player) => player.id === sourceId);
  if (sourceIndex < 0 || alive.length <= 3) {
    return new Set();
  }

  const maxDistance = Math.floor(alive.length / 2);
  return new Set(
    alive
      .filter((player, index) => {
        if (player.id === sourceId) {
          return false;
        }
        const distance = Math.abs(index - sourceIndex);
        return Math.min(distance, alive.length - distance) === maxDistance;
      })
      .map((player) => player.id)
  );
}

function isImplicitAreaAction(
  action: PlayerAction,
  stats: NonNullable<ReturnType<typeof getActionAttackStats>>
): boolean {
  return Boolean(!stats.isArea && isAttackLikeAction(action) && !getPrimaryActionTargetId(action));
}

function getPrimaryActionTargetId(action: PlayerAction): string | undefined {
  return "targetId" in action ? action.targetId : undefined;
}

function getActionCostForPlayer(
  state: PublicGameState,
  source: PublicGameState["players"][number],
  action: PlayerAction
): number {
  if (action.type === "attack") {
    const stats = getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks);
    if (
      viewerCanUseSkill(state, source, "skill_80_20445") &&
      (action.attackId === "he_bao" || action.attackId === "chao_he_bao")
    ) {
      return Math.max(0, stats.cost - 3 * action.stacks);
    }

    if (viewerCanUseSkill(state, source, PUTIAN_TONGQING_SKILL_ID) && action.attackId === "qin") {
      return stats.cost / 2;
    }

    return stats.cost;
  }

  if (action.type === "skill") {
    if (action.skillId === LIAN_BAO_SKILL_ID) {
      const freeStacks = Math.min(
        action.stacks,
        action.freeStacks ?? 0,
        source.buffs.find((buff) => buff.id === "free_lian_bao")?.stacks ?? 0
      );
      return (getSkillPlay(action.skillId)?.cost ?? 0) * Math.max(0, action.stacks - freeStacks);
    }

    return (getSkillPlay(action.skillId)?.cost ?? 0) * action.stacks;
  }

  return 0;
}

function getDefensiveActionForDoubleEdgeOption(
  state: PublicGameState,
  sourceId: string,
  targetId: string
): PlayerAction | undefined {
  const actionWithIndex = getDefensiveActionWithIndex(state.revealedActions?.[targetId]);
  if (!actionWithIndex) {
    return undefined;
  }

  const source = state.players.find((player) => player.id === sourceId);
  if (!source?.skills.includes("skill_30_38815")) {
    return actionWithIndex.action;
  }

  return (
    getOriginalDefenseBeforeQinggangIgnoredSwitch(
      state,
      targetId,
      actionWithIndex.actionIndex
    ) ?? actionWithIndex.action
  );
}

function getIncomingAttackForLiegong(
  state: PublicGameState,
  sourceId: string,
  targetId: string
): PlayerAction | undefined {
  return state.revealedActions?.[sourceId]?.actions.find((action) => {
    if (!isAttackLikeAction(action)) {
      return false;
    }

    const stats = getActionAttackStats(action);
    return stats
      ? getDoubleEdgeTargetIdsForAction(state, sourceId, action, stats).includes(targetId)
      : false;
  });
}

function getDefensiveActionWithIndex(
  plan: NonNullable<PublicGameState["revealedActions"]>[string] | undefined
): { action: PlayerAction; actionIndex: number } | undefined {
  const actionIndex = plan?.actions.findIndex(
    (action) => action.type === "defense" || action.type === "gain_cake"
  );
  if (actionIndex === undefined || actionIndex < 0 || !plan) {
    return undefined;
  }

  const action = plan.actions[actionIndex];
  return action ? { action, actionIndex } : undefined;
}

function getOriginalDefenseBeforeQinggangIgnoredSwitch(
  state: PublicGameState,
  playerId: string,
  actionIndex: number
): PlayerAction | undefined {
  const switchEvent = state.eventLog.find(
    (event) =>
      event.type === "action_switched" &&
      event.playerId === playerId &&
      event.roundNumber === state.roundNumber &&
      event.turnNumber === state.turnNumber &&
      (event.skillId === "skill_88_62906" || event.skillId === "skill_89_99375") &&
      event.actionIndex === actionIndex &&
      event.before.type === "defense"
  );

  return switchEvent?.type === "action_switched" ? switchEvent.before : undefined;
}

function switchActionKey(action: NonNullable<SkillAction["switchToAction"]>): string {
  if (action.type === "defense") {
    return `defense:${action.defense}`;
  }

  return `attack:${action.attackId}:${action.stacks}:${action.targetId ?? ""}`;
}

function isAttackLikeAction(action: PlayerAction): boolean {
  return (
    action.type === "attack" ||
    (action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack")
  );
}

function attackStatModifierLabel(modifier: AttackStatModifierChoice): string {
  switch (modifier) {
    case "swap_power_level":
      return "攻击与等级交换";
    case "power_plus_1_level_minus_1":
      return "攻击+1，等级-1";
    case "power_minus_1_level_plus_1":
      return "攻击-1，等级+1";
    case "power_plus_2_level_minus_2":
      return "攻击+2，等级-2";
    case "power_minus_2_level_plus_2":
      return "攻击-2，等级+2";
    case "power_times_3_level_to_zero":
      return "攻击×3，等级变为0";
    case "power_to_zero_level_times_4":
      return "攻击变为0，等级×4";
    default:
      return "攻击属性变化";
  }
}

function requiresExposedSkillTarget(
  skill: NonNullable<ReturnType<typeof getSkill>>
): boolean {
  if (skill.id === "skill_4_65637" || skill.id === "skill_68_57581") {
    return false;
  }

  return (
    skill.id === "skill_5_34881" ||
    (skill.description.includes("暴露") && skill.description.includes("技能"))
  );
}

function searchSkillText(skill: {
  name: string;
  description: string;
  tags: string[];
  typeTags: string[];
  sourceRow: number;
}): string {
  return `${skill.name} ${skill.description} ${skill.tags.join(" ")} ${skill.typeTags.join(" ")} #${skill.sourceRow}`;
}

function formatPendingDamageLabel(
  state: PublicGameState,
  item: NonNullable<PublicGameState["pendingDamageItems"]>[number]
): string {
  const sourceName = item.sourceId
    ? state.players.find((player) => player.id === item.sourceId)?.name ?? "未知来源"
    : "系统";
  const elements = item.elements?.filter((element) => element !== "physical").join("/") ?? "";
  const suffix = elements ? ` · ${elements}` : "";
  return `${item.amount}点 · ${item.attackName ?? "伤害"} · 来源 ${sourceName}${suffix}`;
}

function formatDamageMarkLabel(
  state: PublicGameState,
  viewerId: string | undefined,
  item: NonNullable<PublicGameState["pendingDamageItems"]>[number],
  markKind: "ice_rain" | "cross_guard"
): string {
  if (markKind === "ice_rain") {
    return `冰雨：${formatPendingDamageLabel(state, item)}`;
  }

  if (viewerId && item.targetId === viewerId) {
    return `护佑：${formatPendingDamageLabel(state, item)}`;
  }

  const targetName = state.players.find((player) => player.id === item.targetId)?.name ?? "未知目标";
  return `十字：${targetName} · ${formatPendingDamageLabel(state, item)}`;
}

function areAdjacentPlayerIds(
  state: PublicGameState,
  playerId: string,
  otherPlayerId: string
): boolean {
  const alive = state.players.filter((player) => player.status === "alive");
  const index = alive.findIndex((player) => player.id === playerId);
  const otherIndex = alive.findIndex((player) => player.id === otherPlayerId);
  if (index === -1 || otherIndex === -1 || alive.length <= 1) {
    return false;
  }

  return (
    otherIndex === (index + 1) % alive.length ||
    otherIndex === (index - 1 + alive.length) % alive.length
  );
}

function phaseLabel(phase: PublicGameState["activeTimingPhase"]): string {
  switch (phase) {
    case "round_pre_interval_action":
      return "轮前轮间";
    case "round_before_action":
      return "轮前";
    case "turn_before_action":
      return "回合前";
    case "turn_change_action":
      return "变招阶段";
    case "turn_damage_modify":
      return "变伤阶段";
    case "revival_action":
      return "复活阶段";
    case "turn_end_action":
      return "回合末";
    case "turn_after_interval_action":
      return "回合后间隙";
    case "round_after_interval_action":
      return "轮后轮间";
    case "turn_action":
      return "出招";
    default:
      return "行动";
  }
}
