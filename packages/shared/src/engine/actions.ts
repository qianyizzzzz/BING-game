import { PlayerAction } from "../types";

export const gainCakeAction = (): PlayerAction => ({
  type: "gain_cake"
});

export const smallDefenseAction = (): PlayerAction => ({
  type: "defense",
  defense: "small"
});

export const youtiaoDefenseAction = (): PlayerAction => ({
  type: "defense",
  defense: "youtiao"
});

export const stoneDefenseAction = (): PlayerAction => ({
  type: "defense",
  defense: "stone"
});

export const reboundAction = (targetId: string): PlayerAction => ({
  type: "defense",
  defense: "rebound",
  targetId
});
