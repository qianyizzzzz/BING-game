import { CSSProperties } from "react";
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

interface CharacterPortraitProps {
  avatarUrl?: string | undefined;
  className?: string;
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
  const mergedStyle = {
    ...style
  } as CSSProperties;

  return (
    <div
      key={animationKey}
      className={[
        "character-avatar-shell",
        `character-animation-${animation}`,
        dead ? "character-avatar-dead" : "",
        className
      ].join(" ")}
      style={mergedStyle}
    >
      <CharacterPortrait
        avatarUrl={avatarUrl}
        className="character-avatar-sticker"
        kind={kind}
        name={name}
      />
      <span className="character-avatar-shadow" aria-hidden="true" />
    </div>
  );
}

export function CharacterPortrait({
  avatarUrl,
  className = "",
  kind = "human",
  name,
  style
}: CharacterPortraitProps) {
  const portraitTone = portraitToneForName(name, kind);
  const monogram = name.trim().toUpperCase().startsWith("AI") ? "AI" : name.trim().slice(0, 1) || "?";
  return (
    <span
      className={["character-portrait-badge", className].join(" ")}
      role="img"
      aria-label={`${name} 手绘头像`}
      style={{
        "--portrait-a": portraitTone.a,
        "--portrait-b": portraitTone.b,
        "--portrait-c": portraitTone.c,
        ...style
      } as CSSProperties}
    >
      {avatarUrl ? (
        <img alt="" className="character-portrait-image" src={avatarUrl} />
      ) : (
        <>
          <span className="character-portrait-wash" aria-hidden="true" />
          <span className="character-portrait-neck" aria-hidden="true" />
          <span className="character-portrait-face" aria-hidden="true" />
          <span className="character-portrait-shadow" aria-hidden="true" />
          <span className="character-portrait-hair" aria-hidden="true" />
          <span className="character-portrait-brow character-portrait-brow-left" aria-hidden="true" />
          <span className="character-portrait-brow character-portrait-brow-right" aria-hidden="true" />
          <span className="character-portrait-eye character-portrait-eye-left" aria-hidden="true" />
          <span className="character-portrait-eye character-portrait-eye-right" aria-hidden="true" />
          <span className="character-portrait-nose" aria-hidden="true" />
          <span className="character-portrait-mouth" aria-hidden="true" />
          <span className="character-portrait-collar" aria-hidden="true" />
          <span className="character-portrait-initial" aria-hidden="true">{monogram}</span>
        </>
      )}
    </span>
  );
}

function portraitToneForName(name: string, kind: CharacterAvatarProps["kind"]): { a: string; b: string; c: string } {
  const seed = [...name].reduce((sum, char) => sum + char.charCodeAt(0), kind === "ai" ? 37 : 11);
  const hue = seed % 360;
  const companionHue = (hue + 42) % 360;
  return {
    a: `hsl(${hue} 42% 42%)`,
    b: `hsl(${companionHue} 48% 58%)`,
    c: kind === "ai" ? "hsl(178 32% 38%)" : "hsl(34 46% 55%)"
  };
}
