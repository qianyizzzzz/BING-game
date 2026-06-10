import {
  AttackElement,
  AttackStats,
  AttackTrait,
  DefenseTag,
  GameState,
  PlayerAction,
  PlayerId,
  SkillTimingPhase,
  SkillId,
  ValidationResult
} from "../types";

export type SkillCategory =
  | "raw"
  | "locked"
  | "limited"
  | "control"
  | "attack"
  | "king_card"
  | "passive";

export interface RawSkillDefinition {
  id: SkillId;
  name: string;
  fusion: string;
  timing?: string;
  exposureTiming?: SkillExposureTiming;
  attribute?: SkillAttribute;
  description: string;
  tags: string[];
  typeTags: SkillTypeTag[];
  sourceRow: number;
}

export type SkillExposureTiming =
  | "不暴露"
  | "使用时"
  | "触发时"
  | "开局"
  | "出“鬼道”时"
  | "胜利时";

export type SkillAttribute = "fire" | "ice" | "electric" | "poison";
export type SkillTypeTag = "锁定技" | "限定技" | "控制技";

export interface SkillContext {
  state: GameState;
  ownerId: PlayerId;
}

export interface SkillHooks {
  validateAction?: (
    context: SkillContext,
    action: PlayerAction
  ) => ValidationResult;
  modifyAttack?: (
    context: SkillContext,
    attack: AttackStats
  ) => AttackStats;
  beforeDamage?: (
    context: SkillContext,
    damage: number,
    sourceId?: PlayerId
  ) => number;
  afterTurnResolved?: (context: SkillContext) => GameState;
}

export type SkillPlayKind = "attack" | "resource" | "effect";
export type SkillTargetMode = "single" | "all" | "none";
export type SkillEffectId =
  | "zhong_shield"
  | "lian_bao_free"
  | "invulnerable_turn"
  | "shield_normal"
  | "shield_skill"
  | "flash_dodge"
  | "six_star"
  | "reverse_actions"
  | "past_time_space"
  | "hell_overlord"
  | "gain_defense_value"
  | "lava_mark"
  | "winter_mark"
  | "blizzard_double_hit"
  | "abs_plus"
  | "odd_hp_damage"
  | "even_hp_damage"
  | "highest_hp_damage"
  | "low_hp_execute"
  | "no_direct_effect"
  | "reroll_skill"
  | "sand_transform";

export interface SkillPlayDefinition {
  kind: SkillPlayKind;
  cost: number;
  maxStacks: number;
  targetMode: SkillTargetMode;
  usesPerGame?: number | undefined;
  power?: number | undefined;
  level?: number | undefined;
  defenseTag?: DefenseTag | undefined;
  traits?: AttackTrait[] | undefined;
  element?: AttackElement | undefined;
  resourceGainPerStack?: number | undefined;
  selfHeal?: number | undefined;
  selfDamage?: number | undefined;
  targetDamage?: number | undefined;
  allEnemyDamage?: number | undefined;
  selectedTargetCount?: number | undefined;
  hpThreshold?: number | undefined;
  effect?: SkillEffectId | undefined;
}

export interface SkillDefinition extends RawSkillDefinition {
  category: SkillCategory;
  implemented: boolean;
  timingPhases: SkillTimingPhase[];
  play?: SkillPlayDefinition;
  hooks: SkillHooks;
}
