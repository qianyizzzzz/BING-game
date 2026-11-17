export const TIAN_YE_CARD_ID = "10560";
export const TIAN_YE_ROLL_ID = "1056001";
export const TIAN_YE_SOARING_ID = "1056002";
export const TIAN_YE_PURGE_ID = "1056003";
export const TIAN_YE_FALL_ID = "1056004";
export const TIAN_YE_GALE_ID = "1056005";
export const TIAN_YE_CHOICE_ID = "1056006";

export const TIAN_YE_SOARING_STATE = "tianye_soaring";
export const TIAN_YE_PURGE_STATE = "tianye_purge";
export const TIAN_YE_FALL_STATE = "tianye_fall";
export const TIAN_YE_GALE_STATE = "tianye_gale";
export const TIAN_YE_CHOICE_STATE = "tianye_choice";
export const TIAN_YE_REBOUND_LOCK = "tianye_rebound_lock";

export const TIAN_YE_WINGS = [TIAN_YE_SOARING_ID, TIAN_YE_PURGE_ID, TIAN_YE_FALL_ID, TIAN_YE_GALE_ID, TIAN_YE_CHOICE_ID] as const;
export type TianyeWing = (typeof TIAN_YE_WINGS)[number];
export type TianyeWingChoice = Exclude<TianyeWing, typeof TIAN_YE_CHOICE_ID>;

export const TIAN_YE_WING_DETAILS = {
  [TIAN_YE_SOARING_ID]: { stateType: TIAN_YE_SOARING_STATE, name: "旋空之翼" },
  [TIAN_YE_PURGE_ID]: { stateType: TIAN_YE_PURGE_STATE, name: "破阵之翼" },
  [TIAN_YE_FALL_ID]: { stateType: TIAN_YE_FALL_STATE, name: "绝坠之翼" },
  [TIAN_YE_GALE_ID]: { stateType: TIAN_YE_GALE_STATE, name: "风袭之翼" },
  [TIAN_YE_CHOICE_ID]: { stateType: TIAN_YE_CHOICE_STATE, name: "天野之翼" }
} as const;
