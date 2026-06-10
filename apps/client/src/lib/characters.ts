export interface CharacterProfile {
  id: string;
  name: string;
  archetype: string;
  description: string;
  avatarUrl: string;
  accent: string;
  secondary: string;
}

export const DEFAULT_CHARACTER_ID = "ember-guardian";

// Temporary placeholder art lives in apps/client/public/assets/placeholders.
// Replace these SVGs with production character portraits at 256x256 or larger.
export const CHARACTER_ROSTER: CharacterProfile[] = [
  {
    id: "ember-guardian",
    name: "烬火守卫",
    archetype: "稳健防御",
    description: "偏向防守和反制，座位动效以暖色护盾为主。",
    avatarUrl: "/assets/placeholders/characters/ember-guardian.svg",
    accent: "#f97316",
    secondary: "#7f1d1d"
  },
  {
    id: "jade-trickster",
    name: "青玉术士",
    archetype: "技能爆发",
    description: "适合技能流玩家，释放技能时有青绿色光轨。",
    avatarUrl: "/assets/placeholders/characters/jade-trickster.svg",
    accent: "#14b8a6",
    secondary: "#134e4a"
  },
  {
    id: "violet-duelist",
    name: "紫曜剑客",
    archetype: "单体进攻",
    description: "强调出招节奏，攻击动画更干脆。",
    avatarUrl: "/assets/placeholders/characters/violet-duelist.svg",
    accent: "#8b5cf6",
    secondary: "#312e81"
  },
  {
    id: "solar-chef",
    name: "日冕饼师",
    archetype: "资源运营",
    description: "围绕饼资源展开，待机和庆祝动画更活泼。",
    avatarUrl: "/assets/placeholders/characters/solar-chef.svg",
    accent: "#facc15",
    secondary: "#854d0e"
  },
  {
    id: "crimson-mender",
    name: "绯红医师",
    archetype: "回复支援",
    description: "回复、护盾和团队辅助的占位角色。",
    avatarUrl: "/assets/placeholders/characters/crimson-mender.svg",
    accent: "#fb7185",
    secondary: "#881337"
  },
  {
    id: "iron-oracle",
    name: "铁面观测者",
    archetype: "AI 推荐",
    description: "冷静读局，适合偏策略和观察的玩家。",
    avatarUrl: "/assets/placeholders/characters/iron-oracle.svg",
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
