export const JUDGMENT_RANKS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"] as const;
export type JudgmentRank = typeof JUDGMENT_RANKS[number];
export const JUDGMENT_RANK_LABELS: Readonly<Record<JudgmentRank, string>> = {
  I: "小技能", II: "二融合", III: "三融合", IV: "四融合", V: "王者", VI: "至尊", VII: "言灵", VIII: "无上", IX: "神装", X: "未知"
};

/** Numeric ranks are accepted when reading earlier rooms and replays. */
export function readJudgmentRank(rank: JudgmentRank | number): JudgmentRank {
  return typeof rank === "number" ? JUDGMENT_RANKS[rank - 1] ?? "I" : rank;
}

export function judgmentRankAtLeast(rank: JudgmentRank, threshold: JudgmentRank): boolean {
  return JUDGMENT_RANKS.indexOf(rank) >= JUDGMENT_RANKS.indexOf(threshold);
}

export function nextJudgmentRank(rank: JudgmentRank): JudgmentRank {
  return JUDGMENT_RANKS[JUDGMENT_RANKS.indexOf(rank) + 1] ?? rank;
}
