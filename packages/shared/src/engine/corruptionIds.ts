export const CORRUPTION_CARD_ID = "10550";
export const CORRUPTION_DOMAIN_ID = "1055001";
export const CORRUPTION_ROT_ID = "1055002";
export const CORRUPTION_FIELD_ID = "1055003";
export const CORRUPTION_CLOUD_ID = "1055004";
export const CORRUPTION_CLOUD_ITEM = "disease_cloud";
export const CORRUPTION_ROT_STATE = "corruption_rot";

export function isCorrupted(player: { buffs: ReadonlyArray<{ id: string }> }): boolean {
  return player.buffs.some((buff) => buff.id === CORRUPTION_ROT_STATE);
}
