import { CSSProperties } from "react";
import { CheckCircle2, Cookie, HeartPulse, Skull, Sparkles, Timer, X } from "lucide-react";
import { DEFEAT_LEVEL_LABELS, INITIAL_HP, PlayerState, PublicGameState, getSkill } from "@bing/shared";
import { CharacterAvatar } from "./CharacterAvatar";
import { CHARACTER_ROSTER } from "../lib/characters";
import { SeatFeedback } from "../lib/tableFeedback";

export interface SeatPosition {
  x: number;
  y: number;
  angle: number;
}

interface PlayerSeatProps {
  canKick?: boolean;
  feedback: SeatFeedback;
  highlighted?: boolean;
  isActiveActor: boolean;
  isViewer: boolean;
  onKick?: ((playerId: string) => void) | undefined;
  player: PlayerState;
  position: SeatPosition;
  state: PublicGameState;
}

export function PlayerSeat({
  canKick = false,
  feedback,
  highlighted = false,
  isActiveActor,
  isViewer,
  onKick,
  player,
  position,
  state
}: PlayerSeatProps) {
  const submitted = state.pendingActionPlayerIds.includes(player.id);
  const passedActionWindow = state.actionWindowPassPlayerIds.includes(player.id);
  const dead = player.status === "dead";
  const defeatLabel = DEFEAT_LEVEL_LABELS[player.defeatLevel ?? 1];
  const pendingDeath =
    player.status === "alive" &&
    player.buffs.some((buff) => buff.id === "pending_death");
  const cakeText = player.cakes < 0 ? "?" : String(player.cakes);
  const hpPercent = Math.max(0, Math.min(100, (player.hp / INITIAL_HP) * 100));
  const skillCount = player.skillSlotCount ?? player.skills.length;
  const skillSlots = buildSkillSlots(player, skillCount);
  const visibleBuffs = getVisibleSeatBuffs(player.buffs);
  const fallbackCharacter = CHARACTER_ROSTER[stableIndex(player.id, CHARACTER_ROSTER.length)]!;
  const avatarUrl = player.avatarUrl ?? fallbackCharacter.avatarUrl;
  const cardOffset = seatCardOffset(position);

  return (
    <article
      className={[
        "poker-seat",
        isViewer ? "poker-seat-viewer" : "",
        isActiveActor ? "poker-seat-active" : "",
        submitted ? "poker-seat-submitted" : "",
        highlighted ? "poker-seat-highlighted" : "",
        pendingDeath ? "poker-seat-pending-death" : "",
        dead ? "poker-seat-dead" : "",
        feedback.tone ? `poker-seat-tone-${feedback.tone}` : ""
      ].join(" ")}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        "--seat-shift-x": `${cardOffset.x}px`,
        "--seat-shift-y": `${cardOffset.y}px`
      } as CSSProperties}
    >
      <div className="seat-identity-row">
        <CharacterAvatar
          animation={feedback.animation}
          animationKey={feedback.animationKey}
          avatarUrl={avatarUrl}
          dead={dead || pendingDeath}
          kind={player.kind}
          name={player.name}
        />
        <div className="min-w-0 flex-1">
          <div className="seat-name-line">
            <strong title={player.name}>{player.name}</strong>
            {isViewer ? <span>你</span> : null}
          </div>
          <div className="seat-status-line">
            {dead ? (
              <>
                <Skull className="h-3.5 w-3.5" aria-hidden="true" />
                {defeatLabel}
              </>
            ) : pendingDeath ? (
              <>
                <Skull className="h-3.5 w-3.5" aria-hidden="true" />
                已死亡
              </>
            ) : submitted ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                已出招
              </>
            ) : passedActionWindow ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                已放弃
              </>
            ) : isActiveActor ? (
              <>
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                行动中
              </>
            ) : (
              "待机"
            )}
          </div>
        </div>
        {canKick ? (
          <button
            aria-label={`踢出 ${player.name}`}
            className="seat-kick-button"
            onClick={() => onKick?.(player.id)}
            type="button"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="seat-resource-grid">
        <div className="seat-resource">
          <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" />
          <span>生命</span>
          <strong>{player.hp}</strong>
        </div>
        <div className="seat-resource">
          <Cookie className="h-3.5 w-3.5" aria-hidden="true" />
          <span>饼</span>
          <strong>{cakeText}</strong>
        </div>
        <div className="seat-resource">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>技能</span>
          <strong>{skillCount}</strong>
        </div>
      </div>

      <div className="seat-hp-track" aria-label={`生命值 ${player.hp}`}>
        <span style={{ width: `${hpPercent}%` }} />
      </div>

      {skillSlots.length > 0 ? (
        <div className="seat-skill-cards" aria-label={`${player.name} 的技能牌`}>
          {skillSlots.map((skillId, index) => {
            if (!skillId) {
              return (
                <span
                  key={`${player.id}-hidden-${index}`}
                  className="seat-skill-card seat-skill-card-face-down"
                  title="未暴露技能"
                >
                  ?
                </span>
              );
            }

            const skill = skillId ? getSkill(skillId) : undefined;
            const revealed = isSeatSkillFaceUp(state, player, skillId, isViewer);
            const flashEventId = latestSkillUseEventId(state, player.id, skillId);
            return (
              <span
                key={`${player.id}-${skillId ?? "hidden"}-${index}-${flashEventId ?? "idle"}`}
                className={[
                  "seat-skill-card",
                  revealed ? "seat-skill-card-face-up" : "seat-skill-card-face-down",
                  flashEventId ? "seat-skill-card-flash" : ""
                ].join(" ")}
                title={revealed ? skill?.name ?? skillId : "未暴露技能"}
              >
                {revealed ? skill?.name.slice(0, 2) ?? "技" : "?"}
              </span>
            );
          })}
        </div>
      ) : null}

      {feedback.label ? (
        <div className="seat-feedback-bubble">{feedback.label}</div>
      ) : null}

      {visibleBuffs.length > 0 ? (
        <div className="seat-buff-strip">
          {visibleBuffs.slice(0, 4).map((buff) => (
            <span key={`${buff.id}-${buff.name}`} title={seatBuffTitle(buff)}>
              {seatBuffLabel(buff)}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function getVisibleSeatBuffs(
  buffs: PlayerState["buffs"]
): PlayerState["buffs"] {
  const priority = (buff: PlayerState["buffs"][number]): number => {
    if (buff.id === "frozen") {
      return 0;
    }
    if (buff.id.startsWith("paralysis_next_action:")) {
      return 1;
    }
    if (buff.id.startsWith("sealed_skill:")) {
      return 2;
    }
    if (buff.id === "no_revive") {
      return 3;
    }
    if (buff.id.startsWith("collapse_until_round:")) {
      return 4;
    }
    if (buff.id.startsWith("skill_disabled_until_round:")) {
      return 5;
    }
    if (buff.id === "defense_value") {
      return 6;
    }
    if (buff.id.startsWith("small_space:")) {
      return 7;
    }
    if (buff.id.startsWith("puppet_of:")) {
      return 8;
    }
    return 99;
  };

  return buffs
    .filter((buff) => priority(buff) < 99)
    .sort((a, b) => priority(a) - priority(b));
}

function seatBuffLabel(buff: PlayerState["buffs"][number]): string {
  if (buff.id === "frozen") {
    return buff.stacks > 1 ? `冰冻${buff.stacks}` : "冰冻";
  }
  if (buff.id.startsWith("paralysis_next_action:")) {
    return "麻痹";
  }
  if (buff.id.startsWith("sealed_skill:")) {
    return "封锁";
  }
  if (buff.id === "no_revive") {
    return "禁复";
  }
  if (buff.id.startsWith("collapse_until_round:")) {
    return "沦陷";
  }
  if (buff.id.startsWith("skill_disabled_until_round:")) {
    return "失效";
  }
  if (buff.id === "defense_value") {
    return `防${buff.stacks}`;
  }
  if (buff.id === "small_space:past_time") {
    return `时空${buff.stacks}`;
  }
  if (buff.id.startsWith("puppet_of:")) {
    return "傀儡";
  }
  return buff.name.slice(0, 2);
}

function seatBuffTitle(buff: PlayerState["buffs"][number]): string {
  if (buff.id.startsWith("puppet_of:")) {
    return buff.name;
  }
  if (buff.id === "frozen") {
    return buff.stacks > 1 ? `冰冻 ${buff.stacks} 回合` : "冰冻";
  }
  const label = seatBuffLabel(buff);
  return buff.stacks > 1 ? `${label} x${buff.stacks}` : label;
}

function buildSkillSlots(player: PlayerState, skillCount: number): Array<string | undefined> {
  const slotCount = Math.min(3, Math.max(0, skillCount));
  return Array.from({ length: slotCount }, (_unused, index) => player.skills[index]);
}

function isSeatSkillFaceUp(
  state: PublicGameState,
  player: PlayerState,
  skillId: string,
  isViewer: boolean
): boolean {
  if (!isViewer) {
    return true;
  }

  if (player.revealedSkillIds.includes(skillId)) {
    return true;
  }

  return state.eventLog.some(
    (event) =>
      event.type === "turn_revealed" &&
      event.actions[player.id]?.actions.some(
        (action) => action.type === "skill" && action.skillId === skillId
      )
  );
}

function latestSkillUseEventId(
  state: PublicGameState,
  playerId: string,
  skillId: string
): string | undefined {
  for (let index = state.eventLog.length - 1; index >= 0; index -= 1) {
    const event = state.eventLog[index];
    if (!event) {
      continue;
    }

    if (
      event.type === "skill_used" &&
      event.playerId === playerId &&
      event.skillId === skillId
    ) {
      return event.id;
    }

    if (
      event.type === "turn_revealed" &&
      event.actions[playerId]?.actions.some(
        (action) => action.type === "skill" && action.skillId === skillId
      )
    ) {
      return event.id;
    }
  }

  return undefined;
}

function seatCardOffset(position: SeatPosition): { x: number; y: number } {
  const dx = position.x - 50;
  const dy = position.y - 50;
  const length = Math.hypot(dx, dy);
  if (length <= 0.001) {
    return { x: 0, y: 0 };
  }

  const distance = 66;
  return {
    x: (dx / length) * distance,
    y: (dy / length) * distance
  };
}

function stableIndex(value: string, modulo: number): number {
  if (modulo <= 0) {
    return 0;
  }

  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0) % modulo;
}
