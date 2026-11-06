import assert from "node:assert/strict";
import {
  createGame, createPlayer, addPlayerToGame, startGame, createId, submitPlayerAction, submitActionWindowSkill,
  advanceActionWindow, decomposeSkill, getAllSkills, getFusionSkillId, FUSION_RECIPES, COMMON_FUSION_SKILL_ID,
  getActiveSkillCount, getSkillUseLimit, getOwnedSkillIds, getAvailableFusionRecipes, getAcquisitionSkillChoices,
  getSkill, toPublicGameState, guessPlayerSkill, chooseWitherNumber, recordSkillUse, getSmallSkillIds,
  revealSkillOnUse, revealSkillOnTrigger, resolveOrdinaryHealing,
  GameState, SkillAction, PlayerAction
} from "@bing/shared";
const skill = (name: string) => getAllSkills({ includeFusions: true }).find((s) => s.name === name)!.id;
const cast = (name: string, targetSkill?: string, targetId?: string): SkillAction => ({ type: "skill", skillId: skill(name), stacks: 1,
  ...(targetSkill ? { targetSkillId: skill(targetSkill) } : {}), ...(targetId ? { targetId } : {}) });
const fuse = (s: GameState, name: string, i = 0) => submitPlayerAction(s, s.players[i]!.id,
  { type: "skill", skillId: COMMON_FUSION_SKILL_ID, stacks: 1, targetSkillId: getFusionSkillId(name), fusionRequestId: createId("final_three") }).state;
function fixture(names: string[][], fusions: [string, number][] = []): GameState {
  let s = createGame("A", { skillMode: "test_select", skillCount: 15, firstTurnNoAttack: false });
  for (let i = 1; i < names.length; i++) s = addPlayerToGame(s, createPlayer(`B${i}`));
  s.players.forEach((p, i) => { p.skills = names[i]!.map(skill); }); s = startGame(s);
  for (const [name, i] of fusions) s = fuse(s, name, i);
  s.players.forEach((p) => { p.hp = 30; p.cakes = 30; }); return s;
}
const p = (s: GameState, i = 0) => s.players[i]!;
function end(s: GameState) { const n = structuredClone(s); n.phase = "action_window"; n.activeTimingPhase = "turn_end_action";
  n.actionWindowMode = "active"; n.actionWindowPassPlayerIds = []; return n; }
const use = (s: GameState, name: string, targetSkill?: string, target = 1) => submitActionWindowSkill(s, p(s).id, cast(name, targetSkill, p(s, target).id));
const decompose = (s: GameState, name: string) => decomposeSkill(end(s), p(s).id, p(s).skillFusions!.find((f) => f.skillId === skill(name))!.id);
const used = (s: GameState, name: string) => p(s).buffs.find((b) => b.id === `skill_used:${skill(name)}`)?.stacks ?? 0;
const revealed = (s: GameState, name: string, i = 0) => p(s, i).revealedSkillIds.includes(skill(name));
let passed = 0; const failures: string[] = [];
function check(name: string, run: () => void) { try { run(); passed++; console.log(`ok - ${name}`); }
  catch (error) { failures.push(name); console.error(`not ok - ${name}\n${error instanceof Error ? error.stack : error}`); } }

for (const small of [false, true]) for (const large of [false, true]) check(`sand emperor decomposition preserves consumed choices: small=${small}, fusion=${large}`, () => {
  let s = fixture([["沙子", "沙子"], [], []], [["沙皇", 0]]);
  if (small) s = use(s, "沙子", "八卦阵");
  if (large) s = use(s, "沙皇", "幻境双罩");
  if (small || large) assert.equal(revealed(s, "沙子"), true);
  assert.equal(revealed(s, "沙皇"), false);
  s = decompose(s, "沙皇");
  assert.equal(getActiveSkillCount(p(s), skill("沙子")), 2 - Number(small) - Number(large));
  assert.equal(getActiveSkillCount(p(s), skill("八卦阵")), Number(small));
  assert.equal(getActiveSkillCount(p(s), skill("幻境双罩")), Number(large));
  assert.equal(getActiveSkillCount(p(s), skill("神罩")), Number(large));
});
check("sand emperor's acquired fusion is a complete cover and can be decomposed", () => {
  let s = fixture([["沙子", "沙子"], [], []], [["沙皇", 0]]); s = use(s, "沙皇", "幻境双罩");
  assert.equal(getSkillUseLimit(p(s), skill("神罩")), 5);
  assert.ok(!getAvailableFusionRecipes(p(s)).some((r) => r.skill.name === "幻境双罩"));
  s = decompose(s, "幻境双罩"); assert.equal(getSkillUseLimit(p(s), skill("神罩")), 3);
  assert.ok(getAvailableFusionRecipes(p(s)).some((r) => r.skill.name === "幻境双罩"));
});
check("sand emperor has every other fusion choice but cannot select itself", () => {
  const s = fixture([["沙子", "沙子"], [], []], [["沙皇", 0]]);
  assert.equal(getAcquisitionSkillChoices(p(s), skill("沙皇")).length, 71);
  assert.throws(() => use(s, "沙皇", "沙皇"), /不能自我复制/);
});
for (const name of ["沙子", "沙皇"]) check(`${name} selection rejects the wrong pool`, () => {
  const s = fixture([["沙子", "沙子"], [], []], [["沙皇", 0]]);
  assert.throws(() => use(s, name, name === "沙子" ? "幻境双罩" : "八卦阵"), /只能选择/);
});
check("emperor duplicate check detects covered fusion ownership and exposes it", () => {
  let s = fixture([["沙子", "沙子"], ["神罩", "鬼罩"], []], [["沙皇", 0], ["幻境双罩", 1]]);
  s = use(s, "沙皇", "幻境双罩"); assert.equal(p(s).defeatLevel, 2); assert.equal(revealed(s, "幻境双罩", 1), true);
});
check("ordinary emperor sand also checks its own existing skill per v4 any-player rule", () => {
  let s = fixture([["沙子", "沙子", "八卦阵"], [], []], [["沙皇", 0]]);
  s = use(s, "沙子", "八卦阵"); assert.equal(p(s).defeatLevel, 2);
});
check("both emperor choices can be used only once before decomposition", () => {
  let s = fixture([["沙子", "沙子"], [], []], [["沙皇", 0]]);
  s = use(s, "沙皇", "幻境双罩"); assert.throws(() => use(s, "沙皇", "生死符"), /上限/);
  s = use(s, "沙子", "八卦阵"); assert.throws(() => use(s, "沙子", "藤甲"), /融合替代/);
});

function mirrorFixture(): GameState {
  let s = fixture([["镜像法术", "乱舞"], ["神罩", "鬼罩", "八卦阵"], []], [["天魔舞", 0], ["幻境双罩", 1]]);
  s = end(s); s = guessPlayerSkill(s, p(s).id, p(s, 1).id, skill("幻境双罩"));
  s = guessPlayerSkill(s, p(s).id, p(s, 1).id, skill("八卦阵")); return s;
}
for (const first of ["small", "fusion"]) check(`heaven dance copies both choices once in either order: ${first} first`, () => {
  let s = mirrorFixture();
  const sequence = first === "small" ? [["镜像法术", "八卦阵"], ["天魔舞", "幻境双罩"]] : [["天魔舞", "幻境双罩"], ["镜像法术", "八卦阵"]];
  for (const [name, target] of sequence) s = use(s, name!, target!);
  assert.equal(getActiveSkillCount(p(s), skill("八卦阵")), 1); assert.equal(getActiveSkillCount(p(s), skill("神罩")), 1);
  assert.equal(used(s, "镜像法术"), 1);
  assert.throws(() => use(s, "镜像法术", "八卦阵"), /上限/); assert.throws(() => use(s, "天魔舞", "幻境双罩"), /上限/);
  s = decompose(s, "天魔舞"); assert.equal(getActiveSkillCount(p(s), skill("八卦阵")), 1);
  assert.equal(getActiveSkillCount(p(s), skill("幻境双罩")), 1); assert.equal(used(s, "镜像法术"), 1);
  // Return to opening only to probe usage inheritance through a second cover.
  s.activeTimingPhase = "opening_action"; s.roundNumber = 1; s.turnNumber = 1; s = fuse(s, "天魔舞");
  assert.throws(() => use(s, "天魔舞", "幻境双罩"), /上限/); assert.throws(() => use(s, "镜像法术", "八卦阵"), /上限/);
});
for (const choice of ["small", "fusion"]) check(`decomposing dance after only ${choice} retains its copy and spends original mirror`, () => {
  let s = mirrorFixture(); s = use(s, choice === "small" ? "镜像法术" : "天魔舞", choice === "small" ? "八卦阵" : "幻境双罩");
  s = decompose(s, "天魔舞"); assert.equal(used(s, "镜像法术"), 1);
  assert.throws(() => use(s, "镜像法术", "八卦阵"), /上限/);
});
check("decomposing unused dance preserves an unused ordinary mirror", () => {
  const s = decompose(mirrorFixture(), "天魔舞"); assert.equal(used(s, "镜像法术"), 0);
  assert.equal(getSkillUseLimit(p(s), skill("镜像法术")), 1);
});
check("spent mirror cannot gain either extra chance through fusion", () => {
  let s = fixture([["镜像法术", "乱舞"], ["八卦阵"], []]); recordSkillUse(p(s), skill("镜像法术"));
  s = fuse(s, "天魔舞"); assert.throws(() => use(s, "天魔舞", "幻境双罩"), /上限/);
});
check("dance rejects hidden, ordinary and self fusion targets", () => {
  let s = fixture([["镜像法术", "乱舞"], ["神罩", "鬼罩", "镜像法术", "乱舞"], []], [["天魔舞", 0], ["幻境双罩", 1], ["天魔舞", 1]]);
  assert.throws(() => use(s, "天魔舞", "幻境双罩"), /看不到/);
  s = end(s); s = guessPlayerSkill(s, p(s).id, p(s, 1).id, skill("天魔舞"));
  assert.throws(() => use(s, "天魔舞", "天魔舞"), /不能自我复制/);
  assert.throws(() => use(mirrorFixture(), "天魔舞", "八卦阵"), /其他已暴露二融合/);
  assert.throws(() => use(mirrorFixture(), "镜像法术", "幻境双罩"), /普通镜像只能/);
});
check("guessed fusion is public and copied with fresh uses, no target seal or cooldown", () => {
  let s = mirrorFixture(); p(s, 1).buffs.push({ id: `sealed_skill:${skill("幻境双罩")}`, name: "封印", stacks: 1 });
  for (let i = 0; i < 5; i++) recordSkillUse(p(s, 1), skill("神罩"));
  s = use(s, "天魔舞", "幻境双罩"); assert.equal(getSkillUseLimit(p(s), skill("神罩")), 5); assert.equal(used(s, "神罩"), 0);
  assert.equal(getActiveSkillCount(p(s), skill("幻境双罩")), 1); assert.equal(revealed(s, "天魔舞"), false);
  assert.equal(revealed(s, "镜像法术"), true, "the enhanced mirror still exposes only the original mirror card");
  const observer = toPublicGameState(s, p(s, 2).id).players[0]!;
  assert.ok(observer.skills.includes(skill("幻境双罩"))); assert.ok(!observer.skills.includes(skill("天魔舞")));
  assert.ok(!JSON.stringify(toPublicGameState(s, p(s, 2).id)).includes(skill("天魔舞")), "private use logs cannot disclose the fusion");
});
check("copied four-choose-two fusion retains the target's actual pair, not the first catalog pair", () => {
  let s = fixture([["镜像法术", "乱舞"], ["丁", "抠"], []], [["天魔舞", 0], ["猥琐小叔叔", 1]]);
  s = end(s); s = guessPlayerSkill(s, p(s).id, p(s, 1).id, skill("猥琐小叔叔")); s = use(s, "天魔舞", "猥琐小叔叔");
  const copied = p(s).skillFusions!.find((f) => f.skillId === skill("猥琐小叔叔"))!;
  assert.deepEqual([...copied.materialSkillIds].sort(), [skill("丁"), skill("抠")].sort());
});
check("a fresh copied shield adds capacity without resetting an independent depleted copy", () => {
  let s = mirrorFixture(); p(s).skills.push(skill("神罩"));
  for (let i = 0; i < 3; i++) recordSkillUse(p(s), skill("神罩"));
  s = use(s, "天魔舞", "幻境双罩"); assert.equal(getSkillUseLimit(p(s), skill("神罩"))! - used(s, "神罩"), 5);
});
check("separate dances reserve separate original mirrors and give four choices, not infinite refresh", () => {
  let s = fixture([["镜像法术", "乱舞", "镜像法术", "乱舞"], ["神罩", "鬼罩", "八卦阵"], []], [["天魔舞", 0], ["天魔舞", 0], ["幻境双罩", 1]]);
  s = end(s); for (const name of ["八卦阵", "幻境双罩"]) s = guessPlayerSkill(s, p(s).id, p(s, 1).id, skill(name));
  for (let i = 0; i < 2; i++) s = use(s, "天魔舞", "幻境双罩");
  for (let i = 0; i < 2; i++) s = use(s, "镜像法术", "八卦阵");
  assert.equal(used(s, "镜像法术"), 2); assert.equal(getActiveSkillCount(p(s), skill("幻境双罩")), 2);
  assert.throws(() => use(s, "镜像法术", "八卦阵"), /上限/);
});

check("uncle offers only the two skills missing from its own materials", () => {
  let s = fixture([["撸", "日"], [], []], [["猥琐小叔叔", 0]]);
  assert.deepEqual(getAcquisitionSkillChoices(p(s), skill("猥琐小叔叔")).sort(), [skill("丁"), skill("抠")].sort());
  assert.throws(() => use(s, "猥琐小叔叔", "日"), /只能选择/);
  s = use(s, "猥琐小叔叔", "丁"); assert.equal(getActiveSkillCount(p(s), skill("丁")), 1);
  assert.equal(revealed(s, "丁"), false); assert.equal(revealed(s, "猥琐小叔叔"), false);
  assert.ok(!getAvailableFusionRecipes(p(s)).some((r) => r.skill.name === "猥琐小叔叔"));
  assert.throws(() => use(s, "猥琐小叔叔", "抠"), /只能选择|上限/);
  s = decompose(s, "猥琐小叔叔"); assert.equal(getActiveSkillCount(p(s), skill("丁")), 0); assert.equal(getActiveSkillCount(p(s), skill("日")), 1);
});
check("uncle's bonus and both covered ingredients cannot pair with independent material copies", () => {
  let s = fixture([["撸", "日", "抠"], [], []], [["猥琐小叔叔", 0]]); s = use(s, "猥琐小叔叔", "丁");
  assert.ok(!getAvailableFusionRecipes(p(s)).some((r) => r.skill.name === "猥琐小叔叔"));
});
check("uncle cannot choose after opening", () => {
  const s = end(fixture([["撸", "日"], [], []], [["猥琐小叔叔", 0]]));
  assert.throws(() => use(s, "猥琐小叔叔", "丁"), /开局准备|当前阶段/);
});
check("uncle material attacks expose themselves without exposing the cover", () => {
  const s = fixture([["撸", "日"], [], []], [["猥琐小叔叔", 0]]);
  revealSkillOnUse(s, p(s).id, skill("日"), "使用日"); assert.equal(revealed(s, "日"), true); assert.equal(revealed(s, "猥琐小叔叔"), false);
});
check("all fusion cards have exactly the explicitly specified exposure timing", () => {
  const expected: Record<string, string> = { "冰火两仪眼": "使用时", "制裁之刃": "触发时", "枯萎": "触发时", "斗战胜佛": "使用时",
    "山崩地裂": "使用时", "辉月": "使用时", "黑白板": "胜利时", "逐日之弓": "开局", "冰火双漩": "使用时", "纯净苍穹": "使用时", "核战": "开局" };
  for (const r of FUSION_RECIPES.filter((recipe) => (recipe.tier ?? 2) === 2))
    assert.equal(getSkill(r.skill.id)?.exposureTiming, expected[r.skill.name] ?? "不暴露", r.skill.name);
});
for (const name of ["核战", "逐日之弓"]) check(`${name} is declared when formed during opening`, () => {
  const materials = FUSION_RECIPES.find((r) => r.skill.name === name)!.materialOptions[0]!.map((id) => getSkill(id)!.name);
  const s = fixture([materials, [], []], [[name, 0]]); assert.equal(revealed(s, name), true);
});
check("black-white board exposes upon victory and not upon formation", () => {
  let s = fixture([["黑板", "白板", "沙子"], [], [], []], [["黑白板", 0]]); assert.equal(revealed(s, "黑白板"), false);
  p(s, 3).status = "dead";
  s = use(s, "沙子", "八卦阵"); assert.equal(s.phase, "finished"); assert.equal(revealed(s, "黑白板"), true);
});
check("sanction exposes only when taking another player's ordinary healing", () => {
  const s = fixture([["嗜血", "血之哀"], [], []], [["制裁之刃", 0]]);
  resolveOrdinaryHealing(s, p(s).id, 2, true); assert.equal(revealed(s, "制裁之刃"), false);
  resolveOrdinaryHealing(s, p(s, 1).id, 2, true); assert.equal(revealed(s, "制裁之刃"), true);
});
for (const stacks of [1, 2]) check(`wither exposes only its additional integer, not ordinary decay: stacks=${stacks}`, () => {
  let s = fixture([["血之哀", "衰竭"], [], []], [["枯萎", 0]]); s = chooseWitherNumber(s, p(s).id, 0, 2);
  while (s.phase === "action_window") s = advanceActionWindow(s);
  const attack: PlayerAction = { type: "attack", attackId: stacks === 1 ? "qin" : "sha", stacks, targetId: p(s, 2).id };
  for (let i = 0; i < 3; i++) s = submitPlayerAction(s, p(s, i).id, i === 1 ? attack : { type: "gain_cake" }).state;
  for (let n = 0; s.activeTimingPhase !== "turn_end_action" && s.phase === "action_window" && n < 50; n++) s = advanceActionWindow(s);
  assert.equal(revealed(s, "枯萎"), stacks === 2);
});
console.log(`final three fusion checks: ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
