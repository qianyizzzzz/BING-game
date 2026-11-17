type Outcomes = readonly [boolean, boolean, boolean];

/** Control the three dice without replacing the randomness used for event IDs. */
export function withSixStarOutcomes<T>(outcomes: readonly Outcomes[], run: () => T): T {
  const previous = Math.random;
  let index = 0;
  Math.random = () => {
    if (!new Error().stack?.split("\n")[2]?.includes("rollSixStarArray")) return previous();
    const checks = outcomes[Math.min(Math.floor(index / 3), outcomes.length - 1)] ?? [false, false, false];
    return checks[index++ % 3] ? 0 : 0.999999;
  };
  try { return run(); } finally { Math.random = previous; }
}
