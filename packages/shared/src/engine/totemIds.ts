export const TOTEM_CARD_ID = "10546";
export const TOTEM_CREATE_ID = "1054601";
export const TOTEM_CHOOSE_ID = "1054601_choose";

export const TOTEM_KINDS = {
  flame: { id: "1054602", name: "烈焰图腾" },
  frost: { id: "1054603", name: "寒冰图腾" },
  storm: { id: "1054604", name: "风暴图腾" },
  earth: { id: "1054605", name: "地怒图腾" },
  sun: { id: "1054606", name: "耀日图腾" },
  moon: { id: "1054607", name: "影月图腾" },
  sky: { id: "1054608", name: "天空图腾" },
  ritual: { id: "1054609", name: "祭仪图腾" },
  poison: { id: "1054610", name: "剧毒图腾" },
  lightning: { id: "1054611", name: "闪电图腾" },
  wing: { id: "1054612", name: "飞翼图腾" },
  wave: { id: "1054613", name: "浪涛图腾" },
  wood: { id: "1054614", name: "木灵图腾" },
  void: { id: "1054615", name: "寂灭图腾" }
} as const;

export const TOTEM_RANGES = {
  center: "仅主目标",
  left: "主目标与左邻",
  right: "主目标与右邻",
  both: "主目标与两侧"
} as const;

export type TotemKind = keyof typeof TOTEM_KINDS;
export type TotemRange = keyof typeof TOTEM_RANGES;

export function isTotemCreation(skillId: string): boolean {
  return skillId === TOTEM_CREATE_ID || skillId === TOTEM_CHOOSE_ID;
}
