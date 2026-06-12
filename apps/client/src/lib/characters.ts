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

export const CHARACTER_ROSTER: CharacterProfile[] = [
  {
    id: "ember-guardian",
    name: "烛火守卫",
    archetype: "稳健防御",
    description: "偏向防守和反制，座位动效以暖色护盾和重甲轮廓为主。",
    avatarUrl: "/assets/characters/ember-guardian/portrait.png",
    accent: "#f97316",
    secondary: "#7f1d1d"
  },
  {
    id: "jade-trickster",
    name: "青玉术士",
    archetype: "技能爆发",
    description: "适合技能流玩家，释放技能时使用青绿色符件和遗物光轨。",
    avatarUrl: "/assets/characters/jade-trickster/portrait.png",
    accent: "#14b8a6",
    secondary: "#134e4a"
  },
  {
    id: "violet-duelist",
    name: "紫曦剑客",
    archetype: "单体进攻",
    description: "强调出招节奏和单点压迫，攻击动画更干脆、更锐利。",
    avatarUrl: "/assets/characters/violet-duelist/portrait.png",
    accent: "#8b5cf6",
    secondary: "#312e81"
  },
  {
    id: "solar-chef",
    name: "日冕饼师",
    archetype: "资源运营",
    description: "围绕饼资源展开，待机和庆祝动画更温暖、有炉火感。",
    avatarUrl: "/assets/characters/solar-chef/portrait.png",
    accent: "#facc15",
    secondary: "#854d0e"
  },
  {
    id: "crimson-mender",
    name: "绯红医师",
    archetype: "回复支援",
    description: "强调回复、护盾和团队辅助，视觉上以药剂和红色脉冲为核心。",
    avatarUrl: "/assets/characters/crimson-mender/portrait.png",
    accent: "#fb7185",
    secondary: "#881337"
  },
  {
    id: "iron-oracle",
    name: "铁面观察者",
    archetype: "读局控制",
    description: "冷静读局，适合偏策略和观察的玩家，使用面具和仪表盘视觉语言。",
    avatarUrl: "/assets/characters/iron-oracle/portrait.png",
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
