import { getAllSkills } from "@bing/shared";

export interface SkillEffectAssetManifest {
  directory: string;
  keyframes: [string, string, string, string];
  mp4: string;
  poster: string;
  skillId: string;
  webm: string;
}

const EFFECT_ASSET_ROOT = "/assets/effects";

export const ALL_SKILL_EFFECT_ASSETS: Record<string, SkillEffectAssetManifest> =
  Object.fromEntries(
    getAllSkills().map((skill) => [skill.id, buildSkillEffectAssetManifest(skill.id)])
  );

export function getSkillEffectAssetManifest(
  skillId: string | undefined
): SkillEffectAssetManifest | undefined {
  if (!skillId) {
    return undefined;
  }

  return ALL_SKILL_EFFECT_ASSETS[skillId] ?? buildSkillEffectAssetManifest(skillId);
}

function buildSkillEffectAssetManifest(skillId: string): SkillEffectAssetManifest {
  const directory = `${EFFECT_ASSET_ROOT}/${skillId}`;
  return {
    directory,
    keyframes: [
      `${directory}/keyframe-01.png`,
      `${directory}/keyframe-02.png`,
      `${directory}/keyframe-03.png`,
      `${directory}/keyframe-04.png`
    ],
    mp4: `${directory}/effect.mp4`,
    poster: `${directory}/poster.png`,
    skillId,
    webm: `${directory}/effect.webm`
  };
}
