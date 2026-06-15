export interface CharacterProfile {
  id: string;
  name: string;
  archetype: string;
  description: string;
  avatarUrl: string;
  modelUrl: string;
  lod1ModelUrl: string;
  actionPoseUrls: CharacterActionPoseUrls;
  accent: string;
  secondary: string;
}

export type CharacterActionPose = "idle" | "attack" | "defend" | "skill" | "hit" | "down";
export type CharacterActionPoseUrls = Record<CharacterActionPose, string>;

export const DEFAULT_CHARACTER_ID = "ember-guardian";

export const CHARACTER_ROSTER: CharacterProfile[] = [
  {
    id: "ember-guardian",
    name: "阿歪",
    archetype: "稳一点",
    description: "眼神总慢半拍，出手却不乱。适合喜欢防守、反制和等别人先露馅的玩家。",
    avatarUrl: "/assets/characters/ember-guardian/portrait.png",
    modelUrl: "/assets/characters/ember-guardian/ember-guardian.glb",
    lod1ModelUrl: "/assets/characters/ember-guardian/ember-guardian-lod1.glb",
    actionPoseUrls: buildActionPoseUrls("ember-guardian"),
    accent: "#f97316",
    secondary: "#7f1d1d"
  },
  {
    id: "jade-trickster",
    name: "小六",
    archetype: "会变招",
    description: "目光总往旁边飘，手里的牌也不太老实。适合喜欢试组合、骗节奏和临场改主意的玩家。",
    avatarUrl: "/assets/characters/jade-trickster/portrait.png",
    modelUrl: "/assets/characters/jade-trickster/jade-trickster.glb",
    lod1ModelUrl: "/assets/characters/jade-trickster/jade-trickster-lod1.glb",
    actionPoseUrls: buildActionPoseUrls("jade-trickster"),
    accent: "#14b8a6",
    secondary: "#134e4a"
  },
  {
    id: "violet-duelist",
    name: "扁嘴",
    archetype: "敢出手",
    description: "一脸不服气，决定倒是很快。适合喜欢单点进攻、制造压迫感的玩家。",
    avatarUrl: "/assets/characters/violet-duelist/portrait.png",
    modelUrl: "/assets/characters/violet-duelist/violet-duelist.glb",
    lod1ModelUrl: "/assets/characters/violet-duelist/violet-duelist-lod1.glb",
    actionPoseUrls: buildActionPoseUrls("violet-duelist"),
    accent: "#8b5cf6",
    secondary: "#312e81"
  },
  {
    id: "solar-chef",
    name: "锅巴",
    archetype: "会攒饼",
    description: "嘴边总有碎屑，算账倒很细。适合喜欢攒资源、做运营和等好机会的玩家。",
    avatarUrl: "/assets/characters/solar-chef/portrait.png",
    modelUrl: "/assets/characters/solar-chef/solar-chef.glb",
    lod1ModelUrl: "/assets/characters/solar-chef/solar-chef-lod1.glb",
    actionPoseUrls: buildActionPoseUrls("solar-chef"),
    accent: "#facc15",
    secondary: "#854d0e"
  },
  {
    id: "crimson-mender",
    name: "慢慢",
    archetype: "会照看",
    description: "看起来很慌，实际上很会补位。适合喜欢回复、保护和把队友捞回来的玩家。",
    avatarUrl: "/assets/characters/crimson-mender/portrait.png",
    modelUrl: "/assets/characters/crimson-mender/crimson-mender.glb",
    lod1ModelUrl: "/assets/characters/crimson-mender/crimson-mender-lod1.glb",
    actionPoseUrls: buildActionPoseUrls("crimson-mender"),
    accent: "#fb7185",
    secondary: "#881337"
  },
  {
    id: "iron-oracle",
    name: "老盯",
    archetype: "爱观察",
    description: "话不多，眼睛很忙。适合喜欢读局、控节奏和后发制人的玩家。",
    avatarUrl: "/assets/characters/iron-oracle/portrait.png",
    modelUrl: "/assets/characters/iron-oracle/iron-oracle.glb",
    lod1ModelUrl: "/assets/characters/iron-oracle/iron-oracle-lod1.glb",
    actionPoseUrls: buildActionPoseUrls("iron-oracle"),
    accent: "#64748b",
    secondary: "#1e293b"
  }
];

export function getCharacterById(characterId: string | undefined): CharacterProfile {
  return (
    CHARACTER_ROSTER.find((character) => character.id === characterId) ??
    CHARACTER_ROSTER[0]!
  );
}

export function getCharacterByAvatarUrl(avatarUrl: string | undefined): CharacterProfile | undefined {
  const normalized = avatarUrl?.split("?")[0];
  if (!normalized) {
    return undefined;
  }
  return CHARACTER_ROSTER.find((character) => character.avatarUrl === normalized);
}

export function getCharacterBySeatIndex(index: number): CharacterProfile {
  return CHARACTER_ROSTER[index % CHARACTER_ROSTER.length] ?? CHARACTER_ROSTER[0]!;
}

function buildActionPoseUrls(characterId: string): CharacterActionPoseUrls {
  const basePath = `/assets/characters/${characterId}`;
  return {
    idle: `${basePath}/action-idle.png`,
    attack: `${basePath}/action-attack.png`,
    defend: `${basePath}/action-defend.png`,
    skill: `${basePath}/action-skill.png`,
    hit: `${basePath}/action-hit.png`,
    down: `${basePath}/action-down.png`
  };
}
