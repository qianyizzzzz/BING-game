export const SWARM_CARD_ID = "10543";
export const SWARM_INHERIT_ID = "1054301";
export const SWARM_BEETLE_ID = "1054302";
export const SWARM_FLY_ID = "1054303";
export const SWARM_HOPPER_ID = "1054304";
export const SWARM_QUEEN_ID = "1054305";
export const SWARM_RETURN_ID = "1054306";

export const VETERAN_FUSION_ID = "4010";
export const VETERAN_DECENCY_ID = "4010_decency";
export const VETERAN_SHATTER_ID = "4010_shatter";
export const VETERAN_SHATTER_USES = "veteran_shatter_uses";

export const SWARM_INSECTS = ["beetle", "fly", "hopper", "queen"] as const;
export type SwarmInsect = typeof SWARM_INSECTS[number];
export const SWARM_INSECT_LABELS: Record<SwarmInsect, string> = { beetle: "甲虫", fly: "飞虫", hopper: "跳虫", queen: "虫后" };
export type SwarmAllocation = Partial<Record<SwarmInsect, number>>;
