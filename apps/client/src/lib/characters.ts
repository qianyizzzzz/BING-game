export interface CharacterProfile {
  id: string;
  name: string;
  avatarUrl: string;
  accent: string;
  secondary: string;
}

export const DEFAULT_CHARACTER_ID = "ember-guardian";

// These IDs are saved in player profiles.
export const CHARACTER_ROSTER: CharacterProfile[] = [
  {
    id: "ember-guardian",
    name: "火焰",
    avatarUrl: "/assets/characters/elements/fire.svg",
    accent: "#aa3f31",
    secondary: "#702b25"
  },
  {
    id: "jade-trickster",
    name: "寒冰",
    avatarUrl: "/assets/characters/elements/ice.svg",
    accent: "#236ba6",
    secondary: "#184777"
  },
  {
    id: "violet-duelist",
    name: "风暴",
    avatarUrl: "/assets/characters/elements/storm.svg",
    accent: "#146e66",
    secondary: "#124f49"
  },
  {
    id: "solar-chef",
    name: "大地",
    avatarUrl: "/assets/characters/elements/earth.svg",
    accent: "#795438",
    secondary: "#503622"
  },
  {
    id: "crimson-mender",
    name: "光明",
    avatarUrl: "/assets/characters/elements/light.svg",
    accent: "#e9bc48",
    secondary: "#926a20"
  },
  {
    id: "iron-oracle",
    name: "黑暗",
    avatarUrl: "/assets/characters/elements/dark.svg",
    accent: "#573d78",
    secondary: "#382450"
  }
];

export function getCharacterById(characterId: string | undefined): CharacterProfile {
  return CHARACTER_ROSTER.find((character) => character.id === characterId) ?? CHARACTER_ROSTER[0]!;
}

export function resolveCharacterAvatarUrl(
  avatarUrl: string | undefined,
  fallback: CharacterProfile
): string {
  if (!avatarUrl) {
    return fallback.avatarUrl;
  }

  const legacyPath = avatarUrl.split("?")[0];
  const character = CHARACTER_ROSTER.find(
    ({ id }) => legacyPath === `/assets/characters/${id}/portrait.png`
  );
  return character?.avatarUrl ?? avatarUrl;
}
