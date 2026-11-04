import assert from "node:assert/strict";
import { createGame, createPlayer, addPlayerToGame, startGame, submitPlayerAction, submitActionWindowSkill,
  advanceActionWindow, getAllSkills, FUSION_RECIPES, COMMON_FUSION_SKILL_ID, getFusionSkillId,
  GameState, PlayerAction, SkillAction, getActiveSkillCount, getAttackMarkCount, decomposeSkill } from "@bing/shared";
const skill = (name: string) => name === "古锭刀" ? "skill_29_96125" : getAllSkills().find((entry) => entry.name === name)!.id;
const gain: PlayerAction = { type: "gain_cake" };
const cast = (name: string, extra: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId: skill(name), stacks: 1, ...extra });
function fixture(name: string, extras: string[] = [], playerCount = 3): GameState {
  let s = createGame("A", { skillMode: "test_select", skillCount: 10, firstTurnNoAttack: false });
  for (const name of ["B", "C", "D"].slice(0, playerCount - 1)) s = addPlayerToGame(s, createPlayer(name));
  s.players[0]!.skills = [...FUSION_RECIPES.find((entry) => entry.skill.name === name)!.materialOptions[0]!, ...extras.map(skill)];
  for (const player of s.players.slice(1)) player.skills = [];
  s = startGame(s);
  s = submitPlayerAction(s, s.players[0]!.id, { type: "skill", skillId: COMMON_FUSION_SKILL_ID, stacks: 1,
    targetSkillId: getFusionSkillId(name), fusionRequestId: `review_${name.length}_fusion` }).state;
  s.players.forEach((player) => { player.hp = 20; player.cakes = 30; }); return s;
}
function collect(s: GameState): GameState {
  for (let i = 0; s.phase === "action_window" && i < 80; i++) s = advanceActionWindow(s);
  assert.equal(s.phase, "collecting_actions"); return s;
}
function reveal(s: GameState, actions: PlayerAction[], prepare?: (s: GameState) => void): GameState {
  s = collect(s); s.players.forEach((player) => { player.cakes = 30; }); prepare?.(s);
  for (let i = 0; i < s.players.length; i++) s = submitPlayerAction(s, s.players[i]!.id, actions[i] ?? gain).state;
  return s;
}
function end(s: GameState): GameState {
  for (let i = 0; s.phase === "action_window" && s.activeTimingPhase !== "turn_end_action" && i < 100; i++) s = advanceActionWindow(s);
  return s;
}
const sha = (s: GameState, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", stacks, targetId: s.players[0]!.id });
function rolls<T>(sequence: number[], run: () => T): T {
  let index = 0; const original = Math.random;
  Math.random = () => new Error().stack!.split("\n")[2]!.includes("addDamage") ? ((sequence[Math.min(index++, sequence.length - 1)]! - .5) / 12) : original();
  try { return run(); } finally { Math.random = original; }
}
const results: Array<Record<string, unknown>> = [];
function check(name: string, run: () => unknown): void {
  try { results.push({ name, passed: true, actual: run() }); console.log(`ok - ${name}`); }
  catch (error) {
    results.push({ name, passed: false });
    console.error(`not ok - ${name}\n${error instanceof Error ? error.stack : String(error)}`);
  }
}
const hp = (s: GameState) => s.players.map((player) => player.hp);
check("D12=3: free six-star still heals 6 when bagua reduces one-sha damage to zero", () => {
  let s = fixture("六芒星阵"); s = reveal(s, [gain, sha(s), gain]); s = rolls([3], () => end(s));
  const actual = { hp: hp(s), dice: s.eventLog.filter((event) => event.type === "system" && event.message.startsWith("六芒星阵D12")) };
  assert.equal(s.players[0]!.hp, 26, JSON.stringify(actual)); return actual;
});
check("D12=4 then 12: the second blizzard damage tick must not disappear", () => {
  let s = fixture("六芒星阵"); s.players[1]!.skills = [skill("暴风雪"), skill("酒")];
  s = reveal(s, [gain, cast("暴风雪", { targetId: s.players[0]!.id }), gain]); s = rolls([4, 12], () => end(s));
  const actual = { hp: hp(s), damage: s.eventLog.filter((event) => event.type === "damage"), dice: s.eventLog.filter((event) => event.type === "system" && event.message.startsWith("六芒星阵D12")) };
  assert.deepEqual(hp(s), [19, 17, 20], JSON.stringify(actual)); return actual;
});
check("six-star automatic reflection does not add the reflector's guding damage multiplier", () => {
  function scenario(extra: string[]) {
    let s = fixture("六芒星阵", extra); s.players[1]!.skills = [skill("暴风雪"), skill("酒")];
    s = reveal(s, [gain, cast("暴风雪", { targetId: s.players[0]!.id }), gain], (state) => { state.players[1]!.cakes = 2; });
    return rolls([4], () => end(s));
  }
  const plain = scenario([]); const weapon = scenario(["古锭刀"]);
  const actual = { plain: hp(plain), withReflectorWeapon: hp(weapon) };
  assert.equal(weapon.players[1]!.hp, plain.players[1]!.hp, JSON.stringify(actual)); return actual;
});
check("ordinary absolute rebound control: reflector's guding does not increase damage", () => {
  function scenario(extra: string[]) {
    let s = fixture("六芒星阵", ["绝弹", ...extra]); s.players[1]!.skills = [skill("暴风雪"), skill("酒")];
    s = reveal(s, [{ type: "defense", defense: "rebound", targetId: s.players[1]!.id }, cast("暴风雪", { targetId: s.players[0]!.id }), gain], (state) => { state.players[1]!.cakes = 2; });
    return end(s);
  }
  const plain = scenario([]); const weapon = scenario(["古锭刀"]);
  assert.equal(weapon.players[1]!.hp, plain.players[1]!.hp); return { plain: hp(plain), weapon: hp(weapon) };
});
check("divine twins' ordinary +3 healing is suppressed by blood sorrow", () => {
  let s = fixture("神隐双莲"); s.players[0]!.hp = 1; s.players[2]!.skills = [skill("血之哀")];
  s = end(reveal(s, [gain, sha(s), gain])); const actual = { hp: hp(s), heals: s.eventLog.filter((event) => event.type === "heal") };
  assert.equal(s.players[0]!.hp, 0, JSON.stringify(actual)); return actual;
});
check("red lotus cloak's ordinary +1 healing is suppressed by blood sorrow", () => {
  let s = fixture("红莲斗篷"); s.players[0]!.hp = 1; s.players[2]!.skills = [skill("血之哀")];
  s = end(reveal(s, [gain, sha(s), gain])); const actual = { hp: hp(s), heals: s.eventLog.filter((event) => event.type === "heal") };
  assert.equal(s.players[0]!.hp, 0, JSON.stringify(actual)); return actual;
});
check("imperial spirit reflects adjacent fireball spell splash despite elemental immunity", () => {
  let s = fixture("帝灵之境", [], 4); s.players[1]!.skills = [skill("火球")];
  s = end(reveal(s, [gain, cast("火球", { targetId: s.players[3]!.id }), gain, gain]));
  const actual = { hp: hp(s), events: s.eventLog.filter((event) => ["damage", "attack_blocked"].includes(event.type)) };
  assert.equal(s.players[0]!.hp, 20); assert.equal(s.players[1]!.hp, 19, JSON.stringify(actual)); return actual;
});
check("six-star free healing considers the highest damage later in the same turn", () => {
  let s = fixture("六芒星阵"); s = reveal(s, [gain, sha(s, 4), sha(s, 10)]); s = rolls([3], () => end(s));
  const actual = { hp: hp(s), heals: s.eventLog.filter((event) => event.type === "heal") };
  assert.equal(s.players[0]!.hp, 34, JSON.stringify(actual)); return actual;
});
check("solar decomposition preserves an independent lava skill's marks", () => {
  let s = fixture("阳炎之怒", ["熔岩之怒"]);
  for (const defense of ["stone", "youtiao", "stone"] as const) s = end(reveal(s, [{ type: "defense", defense }, gain, gain]));
  s.players[0]!.buffs.push({ id: "lava_mark", name: "独立熔岩", stacks: 2 });
  s = decomposeSkill(s, s.players[0]!.id, s.players[0]!.skillFusions![0]!.id);
  assert.equal(getAttackMarkCount(s.players[0]!, skill("熔岩之怒")), 2); return hp(s);
});
check("sealing armor restores the material fire vulnerability instead of retaining enhancement", () => {
  let s = fixture("反伤刺甲"); s.players[0]!.buffs.push({ id: `sealed_skill:${getFusionSkillId("反伤刺甲")}`, name: "封印", stacks: 1 });
  assert.equal(getActiveSkillCount(s.players[0], skill("藤甲")), 0); return "sealed covered materials are inactive";
});
check("original red lotus now respects blood sorrow", () => {
  let s = fixture("神隐双莲"); s.players[0]!.skillFusions = []; s.players[0]!.hp = 1;
  s.players[2]!.skills = [skill("血之哀")]; s = end(reveal(s, [gain, sha(s), gain]));
  assert.equal(s.players[0]!.hp, 0); return hp(s);
});
check("original caster guding applies when the retargeted attack hits its zero-cake caster", () => {
  function scenario(withWeapon: boolean) {
    let s = fixture("六芒星阵", ["绝弹"]);
    s.players[1]!.skills = [skill("暴风雪"), skill("酒"), ...(withWeapon ? ["skill_29_96125"] : [])];
    s = reveal(s, [{ type: "defense", defense: "rebound", targetId: s.players[1]!.id }, cast("暴风雪", { targetId: s.players[0]!.id }), gain], (state) => { state.players[1]!.cakes = 2; });
    return end(s);
  }
  const plain = scenario(false), weapon = scenario(true);
  const actual = { sharedPriorPath: true, plain: hp(plain), originalCasterWeapon: hp(weapon) };
  assert.ok(weapon.players[1]!.hp < plain.players[1]!.hp, JSON.stringify(actual)); return actual;
});
check("six-star redirected clock hits its original caster and grants its shield", () => {
  let s = fixture("六芒星阵"); s.players[1]!.skills = [skill("钟")];
  s = reveal(s, [gain, cast("钟", { targetId: s.players[0]!.id }), gain]); s = rolls([4], () => end(s));
  assert.equal(s.players[1]!.hp, 19);
  assert.ok(s.players[1]!.buffs.some((buff) => buff.id === "jin_zhong_zhao" && buff.sourcePlayerId === s.players[1]!.id)); return hp(s);
});
check("six-star redirected lianbao grants its original caster a free use", () => {
  let s = fixture("六芒星阵"); s.players[1]!.skills = [skill("连爆")];
  s = reveal(s, [gain, cast("连爆", { targetId: s.players[0]!.id }), gain]); s = rolls([4], () => end(s));
  assert.ok(s.players[1]!.buffs.some((buff) => buff.id === "free_lian_bao")); return hp(s);
});
check("a partially reflected blizzard can still land its second frost-blade hit", () => {
  let s = fixture("六芒星阵"); s.players[1]!.skills = [skill("暴风雪"), skill("酒"), skill("寒冰剑")];
  s = reveal(s, [gain, cast("暴风雪", { targetId: s.players[0]!.id }), gain]);
  s = submitActionWindowSkill(s, s.players[1]!.id, cast("寒冰剑"));
  s = rolls([4, 12], () => end(s));
  assert.ok(s.players[0]!.buffs.some((buff) => buff.id.startsWith("skill_disabled_until_round:")));
  assert.ok(s.players[1]!.buffs.some((buff) => buff.id.startsWith("skill_disabled_until_round:")));
  assert.equal(s.players[0]!.hp, 20); assert.equal(s.players[1]!.hp, 20); return hp(s);
});
check("six-star immunity and incremental healing last through the turn-end action window", () => {
  let s = fixture("六芒星阵", ["冰箭雨"]); s.players[2]!.skills = [skill("火烧大地")];
  s = reveal(s, [gain, sha(s), gain]); s = rolls([3], () => end(s));
  assert.equal(s.players[0]!.hp, 26);
  s = submitActionWindowSkill(s, s.players[2]!.id, cast("火烧大地"));
  // Removing the ice skill makes this a 2-point spell; bagua cannot lower its healing basis.
  assert.equal(s.players[0]!.hp, 28);
  assert.ok(!s.eventLog.some((event) => event.type === "damage" && event.targetId === s.players[0]!.id)); return hp(s);
});
check("six-star immunity and its healing ledger expire before the next turn", () => {
  let s = fixture("六芒星阵"); s = reveal(s, [gain, sha(s), gain]); s = rolls([3], () => end(s));
  s = collect(s); assert.ok(!s.players[0]!.buffs.some((buff) => buff.id === "temp_six_star_immunity"));
  s = reveal(s, [gain, sha(s, 3), gain]); s = rolls([12], () => end(s));
  assert.equal(s.players[0]!.hp, 25); return hp(s);
});
check("blood sorrow suppression cannot be retroactively refunded by the six-star ledger", () => {
  let s = fixture("六芒星阵"); s.players[1]!.skills = [skill("火烧大地")]; s.players[2]!.skills = [skill("血之哀")];
  s = reveal(s, [gain, sha(s), gain]); s = rolls([3], () => end(s)); assert.equal(s.players[0]!.hp, 20);
  s.players[2]!.skills = [];
  s = submitActionWindowSkill(s, s.players[1]!.id, cast("火烧大地"));
  // The new 1-point spell raises the maximum from zero; only this new difference is paid.
  assert.equal(s.players[0]!.hp, 21);
  assert.equal(s.eventLog.filter((event) => event.type === "heal" && event.targetId === s.players[0]!.id)
    .reduce((sum, event) => sum + (event.type === "heal" ? event.amount : 0), 0), 1);
  return hp(s);
});
check("a six-star used during round-end damage cannot leak into the next turn", () => {
  let s = fixture("六芒星阵");
  s.players[2]!.skills = [...FUSION_RECIPES.find((recipe) => recipe.skill.name === "博学者之怒")!.materialOptions[0]!];
  s = submitPlayerAction(s, s.players[2]!.id, { type: "skill", skillId: COMMON_FUSION_SKILL_ID, stacks: 1,
    targetSkillId: getFusionSkillId("博学者之怒"), fusionRequestId: "review_roundend_scholar" }).state;
  s = collect(s); s.roundNumber = 3;
  s.players[2]!.buffs.push({ id: "xieyu_target", name: "领域目标", stacks: 1, sourcePlayerId: s.players[0]!.id });
  s = reveal(s, [gain, sha(s, 3), gain]); s = rolls([12], () => end(s));
  for (let i = 0; s.activeTimingPhase !== "turn_damage_modify" && i < 40; i++) s = advanceActionWindow(s);
  assert.equal(s.activeTimingPhase, "turn_damage_modify");
  const beforeCast = { round: s.roundNumber, turn: s.turnNumber, roundEnd: s.roundEndDamagePending, timing: s.activeTimingPhase };
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("六芒星"));
  const afterCast = { round: s.roundNumber, turn: s.turnNumber, roundEnd: s.roundEndDamagePending, timing: s.activeTimingPhase };
  s = collect(s); assert.equal(s.roundNumber, 4, JSON.stringify({ beforeCast, afterCast,
    events: s.eventLog.filter((event) => event.type === "round_ended" || event.type === "heal").slice(-8) }));
  assert.ok(!s.players[0]!.buffs.some((buff) => buff.id === "temp_six_star_immunity"));
  const before = s.players[0]!.hp;
  s = reveal(s, [gain, sha(s, 3), gain]); s = rolls([12], () => end(s));
  assert.equal(s.players[0]!.hp, before - 1); return hp(s);
});
check("six-star prices reveal-triggered spell damage before choosing its healing maximum", () => {
  let s = fixture("六芒星阵");
  s.players[2]!.skills = [...FUSION_RECIPES.find((recipe) => recipe.skill.name === "博学者之怒")!.materialOptions[0]!, skill("传音入密")];
  s = submitPlayerAction(s, s.players[2]!.id, { type: "skill", skillId: COMMON_FUSION_SKILL_ID, stacks: 1,
    targetSkillId: getFusionSkillId("博学者之怒"), fusionRequestId: "review_reveal_scholar" }).state;
  s = reveal(s, [gain, sha(s, 4), gain]);
  s = rolls([12], () => {
    for (let i = 0; s.activeTimingPhase !== "turn_damage_modify" && i < 30; i++) s = advanceActionWindow(s);
    return s;
  });
  assert.equal(s.activeTimingPhase, "turn_damage_modify");
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("六芒星"));
  // Scholar's 4-point transmission spell is not reduced by bagua, so recovery is 4+6.
  s = end(s); assert.equal(s.players[0]!.hp, 30); return hp(s);
});
check("suppressed red-cloak recovery triggers only once during one zero-HP episode", () => {
  let s = fixture("红莲斗篷"); s.players[0]!.hp = 1; s.players[2]!.skills = [skill("血之哀")];
  s = end(reveal(s, [gain, sha(s), gain]));
  const count = (state: GameState) => state.eventLog.filter((event) => event.type === "damage" && event.attackName === "火烧大地").length;
  assert.equal(count(s), 2); s = end(reveal(s, [gain, gain, gain]));
  assert.equal(s.players[0]!.hp, 0); assert.equal(count(s), 2); return hp(s);
});
console.log(`fusion review fixes: ${results.filter((result) => result.passed).length} passed, ${results.filter((result) => !result.passed).length} failed`);
if (results.some((result) => !result.passed)) process.exitCode = 1;
