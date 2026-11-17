export const ERA_CARD = "10608";
export const ERA_INHERIT = "1060801";
export const ERA_AREA = "1060802";
export const ERA_LIFE = "1060803";
export const ERA_CONFLICT = "1060804";
export const ERA_CONTROL = "1060805";
export const ERA_FIRE = "1060806";
export const ERA_DAMAGE = "1060807";
export const ERA_EXTEND = "1060808";
export const ERA_RESTART = "1060809";
export const ERA_CHOOSE_TARGETS = "era_choose_targets";

export const ERA_FIELD_NAMES = {
  [ERA_AREA]: "灵动纪元",
  [ERA_LIFE]: "生灵纪元",
  [ERA_CONFLICT]: "抗争纪元",
  [ERA_CONTROL]: "神控纪元",
  [ERA_FIRE]: "天火纪元",
  [ERA_DAMAGE]: "罗刹纪元"
};

export type EraFieldId = keyof typeof ERA_FIELD_NAMES;

export function isEraFieldId(id: string): id is EraFieldId {
  return Object.hasOwn(ERA_FIELD_NAMES, id);
}
