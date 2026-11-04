import assert from "node:assert/strict";
import { GameState, PlayerAction, SkillAction, FUSION_RECIPES, COMMON_FUSION_SKILL_ID, createId, createGame,
  createPlayer, addPlayerToGame, startGame, submitPlayerAction, submitActionWindowSkill, advanceActionWindow,
  getAllSkills, getFusionSkillId, getSkill, decomposeSkill, resolveOrdinaryHealing, INFINITE_DAMAGE, enterActionWindow } from "@bing/shared";
const skill = (name: string) => { const entry = getAllSkills().find((item) => item.name === name); assert.ok(entry, name); return entry.id; };
const gain: PlayerAction = { type: "gain_cake" };
const cast = (name: string, extra: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId: skill(name), stacks: 1, ...extra });
function fixture(loadouts: string[][], hp = 20): GameState {
  let s = createGame("A", { skillMode: "test_select", skillCount: 12, firstTurnNoAttack: false });
  for (let i = 1; i < loadouts.length; i++) s = addPlayerToGame(s, createPlayer(String.fromCharCode(65 + i)));
  s.players.forEach((player, index) => { player.skills = loadouts[index]!.flatMap((name) =>
    FUSION_RECIPES.find((recipe) => recipe.skill.name === name)?.materialOptions[0] ?? [skill(name)]); });
  s = startGame(s);
  for (let i = 0; i < loadouts.length; i++) for (const name of loadouts[i]!) {
    if (!FUSION_RECIPES.some((recipe) => recipe.skill.name === name)) continue;
    s = submitPlayerAction(s, s.players[i]!.id, { type: "skill", skillId: COMMON_FUSION_SKILL_ID, stacks: 1,
      targetSkillId: getFusionSkillId(name), fusionRequestId: createId("healing_fusion") }).state;
  }
  s.players.forEach((player) => { player.hp = hp; player.cakes = 30; }); return s;
}
function collect(s: GameState): GameState {
  for (let i = 0; s.phase === "action_window" && i < 100; i++) s = advanceActionWindow(s);
  assert.equal(s.phase, "collecting_actions"); return s;
}
function reveal(s: GameState, actions: PlayerAction[] = []): GameState {
  s = collect(s);
  for (let i = 0; i < s.players.length; i++) s = submitPlayerAction(s, s.players[i]!.id, actions[i] ?? gain).state;
  return s;
}
function end(s: GameState, stop = "turn_end_action"): GameState {
  for (let i = 0; s.phase === "action_window" && s.activeTimingPhase !== stop && i < 120; i++) s = advanceActionWindow(s);
  assert.ok(s.phase === "finished" || s.activeTimingPhase === stop); return s;
}
const sha = (s: GameState, target: number, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", stacks, targetId: s.players[target]!.id });
const hp = (s: GameState) => s.players.map((player) => player.hp);
const heals = (s: GameState, reason: string) => s.eventLog.filter((event) => event.type === "heal" && event.reason === reason);
let passed = 0; const failures: string[] = [];
function check(name: string, run: () => void) {
  try { run(); passed++; console.log(`ok - ${name}`); }
  catch (error) { failures.push(name); console.error(`not ok - ${name}\n${error instanceof Error ? error.stack : error}`); }
}

check("both recipes form real fusion covers and are released", () => {
  const s = fixture([["制裁之刃", "不死鸟之眼"], [], []]);
  for (const name of ["制裁之刃", "不死鸟之眼"]) {
    assert.equal(getSkill(getFusionSkillId(name))?.implemented, true);
    assert.ok(s.players[0]!.skillFusions?.some((fusion) => fusion.skillId === getFusionSkillId(name)));
  }
});
for (const copies of [1, 2]) check(`${copies} phoenix copies amplify forest healing without changing its timing`, () => {
  let s = fixture([[...Array(copies).fill("不死鸟之眼"), "森林的低吟"], [], []]);
  s = end(reveal(s, [cast("森林的低吟"), gain, gain]));
  assert.equal(s.players[0]!.hp, 20 + 3 * 2 ** copies);
});
check("scholar's forest bonus and phoenix both apply before any theft", () => {
  let s = fixture([["博学者之怒", "不死鸟之眼"], [], ["制裁之刃"]]);
  s = end(reveal(s, [cast("森林的低吟"), gain, gain])); assert.deepEqual(hp(s), [20, 20, 32]);
});
for (const originalBird of [false, true]) for (const claimantBird of [false, true]) check(`amplify then steal: original=${originalBird}, claimant=${claimantBird}`, () => {
  let s = fixture([["森林的低吟", ...(originalBird ? ["不死鸟之眼"] : [])], [],
    ["制裁之刃", ...(claimantBird ? ["不死鸟之眼"] : [])]]);
  s = end(reveal(s, [cast("森林的低吟"), gain, gain]));
  assert.deepEqual(hp(s), [20, 20, originalBird ? 26 : 23]);
  const event = heals(s, "森林的低吟").at(-1)!;
  assert.equal(event.targetId, s.players[2]!.id); assert.equal(event.originalTargetId, s.players[0]!.id);
});
check("a sole sanction holder's own healing doubles once and ignores another blood sorrow", () => {
  let s = fixture([["制裁之刃", "不死鸟之眼", "森林的低吟"], ["血之哀"], []]);
  s = end(reveal(s, [cast("森林的低吟"), gain, gain])); assert.deepEqual(hp(s), [26, 20, 20]);
});
check("multiple sanctions on the same player still have one claimant", () => {
  let s = fixture([["制裁之刃", "制裁之刃"], ["森林的低吟"], []]);
  s = end(reveal(s, [gain, cast("森林的低吟"), gain])); assert.deepEqual(hp(s), [23, 20, 20]);
});
check("different sanction owners cancel the added effects and suppress everyone's ordinary healing", () => {
  let s = fixture([["制裁之刃", "森林的低吟"], ["森林的低吟", "不死鸟之眼"], ["制裁之刃", "森林的低吟"]]);
  s = end(reveal(s, [cast("森林的低吟"), cast("森林的低吟"), cast("森林的低吟")]));
  assert.deepEqual(hp(s), [20, 20, 20]); assert.equal(heals(s, "森林的低吟").length, 0);
});
check("PoE suppresses the retained blood sorrow while multiple sanctions still do not steal", () => {
  let s = fixture([["制裁之刃"], ["破厄", "不死鸟之眼", "森林的低吟"], ["制裁之刃"]]);
  s = end(reveal(s, [gain, cast("森林的低吟"), gain])); assert.deepEqual(hp(s), [20, 26, 20]);
});
check("phoenix does not bypass ordinary blood-sorrow suppression", () => {
  let s = fixture([["不死鸟之眼", "森林的低吟"], ["血之哀"], []]);
  s = end(reveal(s, [cast("森林的低吟"), gain, gain])); assert.deepEqual(hp(s), [20, 20, 20]);
});
check("sealing one of two sanctions restores the other owner's claim", () => {
  let s = fixture([["制裁之刃"], ["森林的低吟"], ["制裁之刃"]]);
  s.players[2]!.buffs.push({ id: `sealed_skill:${getFusionSkillId("制裁之刃")}`, name: "封印", stacks: 1 });
  s = end(reveal(s, [gain, cast("森林的低吟"), gain])); assert.deepEqual(hp(s), [23, 20, 20]);
});
for (const mode of ["seal", "decompose"]) check(`phoenix ${mode} removes its multiplier`, () => {
  let s = fixture([["不死鸟之眼", "森林的低吟"], [], []]);
  if (mode === "seal") s.players[0]!.buffs.push({ id: `sealed_skill:${getFusionSkillId("不死鸟之眼")}`, name: "封印", stacks: 1 });
  else { s = end(reveal(s)); s = decomposeSkill(s, s.players[0]!.id, s.players[0]!.skillFusions![0]!.id); }
  s = end(reveal(s, [cast("森林的低吟"), gain, gain])); assert.equal(s.players[0]!.hp, 23);
});
for (const mode of ["seal", "decompose"]) check(`sanction ${mode} stops theft and restores the correct material behavior`, () => {
  let s = fixture([["制裁之刃"], ["森林的低吟"], []]);
  if (mode === "seal") s.players[0]!.buffs.push({ id: `sealed_skill:${getFusionSkillId("制裁之刃")}`, name: "封印", stacks: 1 });
  else { s = end(reveal(s)); s = decomposeSkill(s, s.players[0]!.id, s.players[0]!.skillFusions![0]!.id); }
  s = end(reveal(s, [gain, cast("森林的低吟"), gain])); assert.deepEqual(hp(s), [20, mode === "seal" ? 23 : 20, 20]);
});
for (const other of ["none", "blood", "sanction"]) check(`standing soul +6 is ordinary healing with ${other}`, () => {
  let s = fixture([["不死鸟之眼", "天佑之魂"], [], other === "none" ? [] : [other === "blood" ? "血之哀" : "制裁之刃"]]);
  s = end(reveal(s)); s = submitActionWindowSkill(s, s.players[0]!.id, cast("天佑之魂"));
  assert.deepEqual(hp(s), other === "none" ? [32, 20, 20] : other === "blood" ? [20, 20, 20] : [20, 20, 32]);
});
check("standing god-child conversion is unchanged; only its +6 is doubled and stolen", () => {
  let s = fixture([["不死鸟之眼", "神之子"], [], ["制裁之刃"]]);
  s = end(reveal(s)); s = submitActionWindowSkill(s, s.players[0]!.id, cast("天佑之魂"));
  assert.deepEqual(hp(s), [60, 20, 32]);
  assert.ok(heals(s, "天佑之魂").some((event) => event.recoveryKind === "conversion" && event.targetId === s.players[0]!.id));
});
for (const name of ["天佑之魂", "神之子", "治愈术"]) check(`${name} revival is neither doubled nor stolen`, () => {
  let s = fixture([["不死鸟之眼", name], [], ["制裁之刃"]]); s.players[0]!.hp = 1; s.players[0]!.cakes = 0;
  s = end(reveal(s, [gain, sha(s, 0, 3), gain]), "revival_action");
  assert.equal(s.players[0]!.hp, -2);
  s = end(submitActionWindowSkill(s, s.players[0]!.id, cast(name === "神之子" ? "天佑之魂" : name)));
  assert.equal(s.players[0]!.hp, name === "神之子" ? 12 : name === "治愈术" ? 6 : 8); assert.equal(s.players[2]!.hp, 20);
});
check("automatic fire rebirth retained by phoenix is still a full revival", () => {
  let s = fixture([["不死鸟之眼", "火焰刀"], [], ["制裁之刃"]]); s.players[0]!.hp = 1;
  s = end(reveal(s, [sha(s, 1), { type: "defense", defense: "rebound", targetId: s.players[0]!.id }, gain]));
  assert.deepEqual(hp(s), [6, 20, 20]);
});
check("absolute-value conversion bypasses phoenix and sanction", () => {
  let s = fixture([["不死鸟之眼", "绝对值"], [], ["制裁之刃"]]); s.players[0]!.hp = 1;
  s = end(reveal(s, [gain, sha(s, 0, 3), gain])); assert.deepEqual(hp(s), [2, 20, 20]);
});
check("balance sets HP rather than generating ordinary healing", () => {
  let s = fixture([["不死鸟之眼", "制衡"], ["不死鸟之眼"], ["制裁之刃"]]);
  s = end(reveal(s)); s.players[0]!.hp = 3; s.players[1]!.hp = 9; s.players[2]!.hp = 18;
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("制衡", { targetIds: [s.players[1]!.id, s.players[2]!.id] }));
  assert.deepEqual(hp(s), [10, 10, 10]); assert.equal(heals(s, "制衡").length, 0);
});
check("soul repair restores full HP without amplification or theft", () => {
  let s = fixture([["不死鸟之眼", "灵魂修复"], [], ["制裁之刃"]]); s.players[0]!.hp = 2;
  const fusion = s.players[0]!.skillFusions!.find((f) => f.skillId === getFusionSkillId("灵魂修复"))!;
  s.players[0]!.buffs.push({ id: `trauma_converge:3:fusion:${fusion.id}`, name: "灵魂修复", stacks: 1,
    sourceFusionId: fusion.id, traumaCakePaid: true });
  s = end(reveal(s, [gain, sha(s, 2), gain])); s = advanceActionWindow(s);
  assert.equal(s.players[0]!.hp, 6); assert.equal(s.players[2]!.hp, 19);
  assert.equal(heals(s, "灵魂修复").at(-1)?.recoveryKind, "full_restore");
});
for (const reason of ["圣域", "创伤聚合"]) check(`${reason} round-end recovery uses the common healing pipeline`, () => {
  let s = fixture([["不死鸟之眼", ...(reason === "圣域" ? ["圣域"] : [])], [], ["制裁之刃"]]);
  s = collect(s); s.roundNumber = 3;
  if (reason === "创伤聚合") s.players[0]!.buffs.push({ id: "trauma_converge:3", name: reason, stacks: 1, traumaCakePaid: true });
  s = end(reveal(s, [gain, sha(s, 2), gain])); s = advanceActionWindow(s);
  assert.equal(s.players[0]!.hp, 20); assert.equal(s.players[2]!.hp, 25);
  assert.equal(heals(s, reason).at(-1)?.amount, 6);
});
check("unactivated-skill discard healing is doubled before theft", () => {
  let s = fixture([["不死鸟之眼"], [], ["制裁之刃"]]);
  // Test-selected skills are exposed at start; add an unexposed spare card to exercise discard healing.
  s.players[0]!.skills.push(skill("神罩"));
  s = end(reveal(s)); s = enterActionWindow(s, s.players[0]!.id);
  s = submitPlayerAction(s, s.players[0]!.id, { type: "discard_skill", targetSkillId: skill("神罩") }).state;
  assert.deepEqual(hp(s), [20, 20, 22]);
  assert.equal(heals(s, "丢弃技能").at(-1)?.amount, 2);
});
check("death-scythe recovery is doubled before theft", () => {
  let s = fixture([["不死鸟之眼", "死神之镰"], [], ["制裁之刃"]]); s.players[1]!.hp = 2;
  s = end(reveal(s, [gain, gain, sha(s, 1, 4)])); assert.equal(s.players[2]!.hp, 25);
  assert.equal(heals(s, "死神之镰").at(-1)?.amount, 4);
});
check("bloodthirst rounds per attack before phoenix amplification and sanction theft", () => {
  let s = fixture([["不死鸟之眼", "嗜血"], [], ["制裁之刃"]]);
  s = end(reveal(s, [sha(s, 1, 4), gain, gain])); assert.deepEqual(hp(s), [20, 16, 22]);
});
check("red-lotus recovery is doubled and stolen once without repeating a zero-HP episode", () => {
  let s = fixture([["不死鸟之眼", "神隐红莲"], [], ["制裁之刃"]]); s.players[0]!.hp = 1;
  s = end(reveal(s, [gain, sha(s, 0), gain])); assert.deepEqual(hp(s), [0, 20, 22]);
  assert.equal(heals(s, "神隐红莲").length, 1);
});
check("six-star's ordinary +x+6 is amplified and stolen while its immunity stays on the caster", () => {
  let s = fixture([["不死鸟之眼", "六芒星"], [], ["制裁之刃"]]);
  s = end(reveal(s, [gain, sha(s, 0, 3), gain]), "turn_damage_modify");
  s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("六芒星")));
  assert.deepEqual(hp(s), [20, 20, 38]); assert.equal(heals(s, "六芒星").at(-1)?.amount, 18);
});
check("infinite healing remains serializable and transfers once without arithmetic infinity", () => {
  const s = fixture([["不死鸟之眼"], [], ["制裁之刃", "不死鸟之眼"]]);
  const plan = resolveOrdinaryHealing(s, s.players[0]!.id, INFINITE_DAMAGE, true, true)!;
  assert.equal(plan.amount, INFINITE_DAMAGE); assert.equal(plan.targetId, s.players[2]!.id); assert.equal(plan.infinite, true);
  assert.equal(plan.suppressed, false); assert.ok(JSON.stringify(plan).includes(String(INFINITE_DAMAGE)));
});
check("ordinary zero HP is alive: soul's +6 remains healable and stealable", () => {
  let s = fixture([["不死鸟之眼", "天佑之魂"], [], ["制裁之刃"]]);
  s = end(reveal(s)); s.players[0]!.hp = 0;
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("天佑之魂"));
  assert.deepEqual(hp(s), [0, 20, 32]);
});
check("absolute-value zero HP is a real revival: soul's +6 is not healing", () => {
  let s = fixture([["不死鸟之眼", "绝对值", "天佑之魂"], ["血水屏障"], ["制裁之刃"]]);
  s = end(reveal(s)); s.players[0]!.hp = 0; s.players[0]!.cakes = 0;
  s = submitActionWindowSkill(s, s.players[1]!.id, cast("血水屏障"));
  assert.equal(s.activeTimingPhase, "revival_action");
  s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("天佑之魂")));
  assert.deepEqual(hp(s), [6, 19, 20]);
});
console.log(`healing fusion checks: ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
