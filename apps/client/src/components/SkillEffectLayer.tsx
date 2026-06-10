import { CSSProperties } from "react";
import { TableEffect } from "../lib/tableFeedback";
import { SeatPosition } from "./PlayerSeat";

interface SkillEffectLayerProps {
  effects: TableEffect[];
  seatPositions: Record<string, SeatPosition>;
}

const CENTER_POSITION: SeatPosition = {
  x: 50,
  y: 50,
  angle: 0
};

const EFFECT_SPARKS = [
  { angle: -22, distance: 46, size: 5 },
  { angle: 38, distance: 58, size: 7 },
  { angle: 96, distance: 42, size: 4 },
  { angle: 162, distance: 54, size: 6 },
  { angle: 226, distance: 48, size: 5 },
  { angle: 294, distance: 62, size: 4 }
] as const;

const EFFECT_FRACTURES = [
  { angle: -18, length: 42, offset: -4 },
  { angle: 46, length: 34, offset: 6 },
  { angle: 118, length: 38, offset: -2 },
  { angle: 206, length: 30, offset: 5 }
] as const;

const EFFECT_DUST = [
  { angle: 18, distance: 30, size: 10 },
  { angle: 76, distance: 24, size: 7 },
  { angle: 144, distance: 34, size: 9 },
  { angle: 218, distance: 28, size: 6 },
  { angle: 302, distance: 36, size: 8 }
] as const;

export function SkillEffectLayer({
  effects,
  seatPositions
}: SkillEffectLayerProps) {
  const effectItems = effects.flatMap((effect) => {
    const source = effect.sourceId
      ? seatPositions[effect.sourceId] ?? CENTER_POSITION
      : CENTER_POSITION;
    const targets = effect.targetIds.length > 0
      ? effect.targetIds
      : [effect.sourceId ?? "center"];

    return targets.map((targetId, index) => {
      const target =
        targetId === effect.sourceId && effect.targetType === "self"
          ? source
          : seatPositions[targetId] ?? CENTER_POSITION;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      return {
        dx,
        dy,
        effect,
        key: `${effect.id}-${targetId}-${index}`,
        source,
        target
      };
    });
  });

  if (effectItems.length === 0) {
    return null;
  }

  return (
    <div className="skill-effect-layer" aria-hidden="true">
      <svg
        className="skill-effect-vectors"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {effectItems.map(({ dx, dy, effect, key, source, target }) => {
          if (Math.hypot(dx, dy) < 1.5) {
            return null;
          }

          return (
            <g key={`${key}-line`}>
              <line
                className={[
                  "skill-vector-line",
                  `skill-vector-line-${effect.type}`
                ].join(" ")}
                style={
                  {
                    "--effect-color": effect.color,
                    "--effect-duration": `${effect.duration}ms`
                  } as CSSProperties
                }
                vectorEffect="non-scaling-stroke"
                x1={source.x}
                x2={target.x}
                y1={source.y}
                y2={target.y}
              />
              <circle
                className="skill-vector-impact"
                cx={target.x}
                cy={target.y}
                r="1.45"
                style={
                  {
                    "--effect-color": effect.color,
                    "--effect-duration": `${effect.duration}ms`
                  } as CSSProperties
                }
              />
            </g>
          );
        })}
      </svg>

      {effectItems.map(({ dx, dy, effect, key, source, target }) => {
        const hasTravel = Math.hypot(dx, dy) >= 1.5;
        const style = {
          "--effect-color": effect.color,
          "--effect-duration": `${effect.duration}ms`,
          "--effect-x1": `${source.x}%`,
          "--effect-y1": `${source.y}%`,
          "--effect-x2": `${target.x}%`,
          "--effect-y2": `${target.y}%`
        } as CSSProperties;

        return (
          <span key={key} className="table-effect-item" style={style}>
            <span
              className={[
                "table-cast-seal",
                `table-cast-seal-${effect.type}`
              ].join(" ")}
            >
              <span />
              <span />
              <span />
            </span>
            {hasTravel ? (
              <span
                className={[
                  "table-projectile",
                  `table-projectile-${effect.type}`
                ].join(" ")}
              />
            ) : null}
            <span
              className={[
                "table-skill-effect",
                `table-skill-effect-${effect.type}`,
                effect.targetType === "all" ? "table-skill-effect-all" : ""
              ].join(" ")}
            >
              <em className="effect-depth-ring" aria-hidden="true" />
              {EFFECT_DUST.map((dust, dustIndex) => (
                <em
                  key={`${key}-dust-${dustIndex}`}
                  className="effect-dust"
                  aria-hidden="true"
                  style={
                    {
                      "--dust-angle": `${dust.angle}deg`,
                      "--dust-distance": `${dust.distance}px`,
                      "--dust-size": `${dust.size}px`
                    } as CSSProperties
                  }
                />
              ))}
              {EFFECT_FRACTURES.map((fracture, fractureIndex) => (
                <b
                  key={`${key}-fracture-${fractureIndex}`}
                  className="effect-fracture"
                  style={
                    {
                      "--fracture-angle": `${fracture.angle}deg`,
                      "--fracture-length": `${fracture.length}px`,
                      "--fracture-offset": `${fracture.offset}px`
                    } as CSSProperties
                  }
                />
              ))}
              <b className="effect-rune effect-rune-a" aria-hidden="true" />
              <b className="effect-rune effect-rune-b" aria-hidden="true" />
              <b className="effect-rune effect-rune-c" aria-hidden="true" />
              {EFFECT_SPARKS.map((spark, sparkIndex) => (
                <span
                  key={`${key}-spark-${sparkIndex}`}
                  className="effect-spark"
                  style={
                    {
                      "--spark-angle": `${spark.angle}deg`,
                      "--spark-distance": `${spark.distance}px`,
                      "--spark-size": `${spark.size}px`
                    } as CSSProperties
                  }
                />
              ))}
              {effect.label ? <i>{effect.label.slice(0, 6)}</i> : null}
            </span>
          </span>
        );
      })}
    </div>
  );
}
