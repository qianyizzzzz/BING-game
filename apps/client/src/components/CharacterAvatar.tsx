import { CSSProperties } from "react";
import { Bot, UserRound } from "lucide-react";
import { CharacterAnimationState } from "../lib/tableFeedback";

interface CharacterAvatarProps {
  animation?: CharacterAnimationState;
  animationKey?: string;
  avatarUrl?: string | undefined;
  className?: string;
  dead?: boolean;
  kind?: "human" | "ai" | "spectator";
  name: string;
  style?: CSSProperties | undefined;
}

export function CharacterAvatar({
  animation = "idle",
  animationKey,
  avatarUrl,
  className = "",
  dead = false,
  kind = "human",
  name,
  style
}: CharacterAvatarProps) {
  return (
    <div
      key={animationKey}
      className={[
        "character-avatar-shell",
        `character-animation-${animation}`,
        dead ? "character-avatar-dead" : "",
        className
      ].join(" ")}
      style={style}
    >
      <span className="character-stand-base" aria-hidden="true" />
      <div className="character-avatar-core" role="img" aria-label={`${name} 站姿角色`}>
        <span className="character-cape" aria-hidden="true" />
        <span className="character-head">
          <span className="character-ear character-ear-left" aria-hidden="true" />
          <span className="character-ear character-ear-right" aria-hidden="true" />
          {avatarUrl ? (
            <img alt="" src={avatarUrl} />
          ) : kind === "ai" ? (
            <Bot className="h-7 w-7" aria-hidden="true" />
          ) : (
            <UserRound className="h-7 w-7" aria-hidden="true" />
          )}
        </span>
        <span className="character-scarf" aria-hidden="true" />
        <span className="character-torso" aria-hidden="true" />
        <span className="character-arm character-arm-left" aria-hidden="true" />
        <span className="character-arm character-arm-right" aria-hidden="true" />
        <span className="character-leg character-leg-left" aria-hidden="true" />
        <span className="character-leg character-leg-right" aria-hidden="true" />
        <span className="character-boot character-boot-left" aria-hidden="true" />
        <span className="character-boot character-boot-right" aria-hidden="true" />
      </div>
      <span className="character-avatar-shadow" aria-hidden="true" />
    </div>
  );
}
