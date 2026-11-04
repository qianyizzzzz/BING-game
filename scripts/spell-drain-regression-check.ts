import assert from "node:assert/strict";
import {
  GameState, PlayerAction, SkillAction, ActionSubmission, FUSION_RECIPES, COMMON_FUSION_SKILL_ID, createId, createGame,
  createPlayer, addPlayerToGame, startGame, submitPlayerAction, submitActionWindowSkill, advanceActionWindow,
  getAllSkills, getFusionSkillId, previewPlayerAttackStats
} from "@bing/shared";
const skill = (name: string) => { const item = getAllSkills().find((s) => s.name === name); assert.ok(item, name); return item.id; };
const gain: PlayerAction = { type: "gain_cake" };
const cast = (name: string, extra: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId: skill(name), stacks: 1, ...extra });
function fixture(loadouts: string[][]): GameState {
  let s = createGame("A", { skillMode: "test_select", skillCount: 12, firstTurnNoAttack: false });
  for (let i = 1; i < loadouts.length; i++) s = addPlayerToGame(s, createPlayer(String.fromCharCode(65 + i)));
  s.players.forEach((p, i) => { p.skills = loadouts[i]!.flatMap((name) =>
    FUSION_RECIPES.find((r) => r.skill.name === name)?.materialOptions[0] ?? [skill(name)]); });
  s = startGame(s);
  for (let i = 0; i < loadouts.length; i++) for (const name of loadouts[i]!) {
    if (!FUSION_RECIPES.some((r) => r.skill.name === name)) continue;
    s = submitPlayerAction(s, s.players[i]!.id, { type: "skill", skillId: COMMON_FUSION_SKILL_ID, stacks: 1,
      targetSkillId: getFusionSkillId(name), fusionRequestId: createId("spell_drain") }).state;
  }
  s.players.forEach((p) => { p.hp = 30; p.cakes = 30; }); return s;
}
function collect(s: GameState): GameState {
  for (let i = 0; s.phase === "action_window" && i < 150; i++) s = advanceActionWindow(s);
  assert.equal(s.phase, "collecting_actions"); return s;
}
function reveal(s: GameState, actions: ActionSubmission[] = []): GameState {
  s = collect(s);
  for (let i = 0; i < s.players.length; i++) s = submitPlayerAction(s, s.players[i]!.id, actions[i] ?? gain).state;
  return s;
}
function end(s: GameState): GameState {
  for (let i = 0; s.phase === "action_window" && s.activeTimingPhase !== "turn_end_action" && i < 150; i++) s = advanceActionWindow(s);
  assert.equal(s.activeTimingPhase, "turn_end_action"); return s;
}
function finishRound(s: GameState): GameState {
  for (let i = 0; s.roundNumber === 3 && s.phase === "action_window" && i < 150; i++) s = advanceActionWindow(s);
  assert.equal(s.roundNumber, 4); return s;
}
function due(s: GameState, domain: string, targets = [1, 1, 1]): GameState {
  s = collect(s); s.roundNumber = 3;
  s = end(reveal(s, [{ type: "attack", attackId: "sha", stacks: 1, targetId: s.players[2]!.id }]));
  if (domain === "魔域") s = submitActionWindowSkill(s, s.players[0]!.id,
    { type: "skill", skillId: getFusionSkillId(domain), stacks: 1, targetIds: targets.map((i) => s.players[i]!.id) });
  else s = submitActionWindowSkill(s, s.players[0]!.id, cast("邪域", { targetId: s.players[targets[0]!]!.id }));
  return s;
}
const heals = (s: GameState, name: string) => s.eventLog.filter((e) => e.type === "heal" && e.reason === name);
const damage = (s: GameState, name: string) => s.eventLog.filter((e) => e.type === "damage" && e.attackName === name);
const totalHeal = (s: GameState, name: string) => heals(s, name).reduce((sum, e) => sum + e.amount, 0);
let passed = 0; const failures: string[] = [];
function check(name: string, run: () => void) {
  try { run(); passed++; console.log(`ok - ${name}`); }
  catch (error) { failures.push(name); console.error(`not ok - ${name}\n${error instanceof Error ? error.stack : error}`); }
}

for (const scholar of [false, true]) for (const ice of [false, true]) check(`ice-fire eye is spell damage: scholar=${scholar}, ice=${ice}`, () => {
  let s = end(reveal(fixture([["冰火两仪眼", ...(scholar ? ["博学者之怒"] : [])], ice ? ["冰漩决", "八卦阵"] : ["八卦阵"], []])));
  s = end(submitActionWindowSkill(s, s.players[0]!.id, { type: "skill", skillId: getFusionSkillId("冰火两仪眼"), stacks: 1 }));
  const expected = (ice ? 2 : 1) * (scholar ? 2 : 1);
  assert.equal(s.players[1]!.hp, 30 - expected);
  assert.equal(damage(s, "冰火两仪眼").find((e) => e.targetId === s.players[1]!.id)?.amount, expected);
});
for (const name of ["邪域", "魔域"]) for (const scholar of [false, true]) check(`${name} heals its actual amplified spell damage: scholar=${scholar}`, () => {
  const loadout = name === "邪域" && scholar ? ["博学者之怒"] : [name, ...(scholar ? ["博学者之怒"] : [])];
  let s = fixture([loadout, ["八卦阵"], []]);
  // Scholar retains a separate evil-domain material; isolate demon-domain's three payments.
  if (name === "魔域" && scholar) s.players[0]!.buffs.push({ id: `sealed_skill:${skill("邪域")}`, name: "封印", stacks: 1 });
  s = finishRound(due(s, name));
  const hits = name === "魔域" ? 3 : 1, amount = scholar ? 2 : 1;
  assert.equal(s.players[1]!.hp, 30 - hits * amount); assert.equal(totalHeal(s, name), hits * amount);
  assert.equal(s.players[0]!.hp, 30 + hits * amount);
  assert.equal(damage(s, name).length, hits);
  const firstDamage = s.eventLog.findIndex((e) => e.type === "damage" && e.attackName === name);
  const firstHeal = s.eventLog.findIndex((e) => e.type === "heal" && e.reason === name);
  assert.ok(firstDamage < firstHeal, "drain healing must follow actual damage");
});
for (const name of ["邪域", "魔域"]) check(`${name} against imperial spirit never heals`, () => {
  let s = finishRound(due(fixture([[name], ["帝灵之境"], []]), name));
  assert.equal(s.players[1]!.hp, 30); assert.equal(totalHeal(s, name), 0); assert.equal(damage(s, name).length, 0);
  assert.equal(s.players[0]!.hp, name === "魔域" ? 27 : 29);
});
check("demon domain heals only the successful portion of its three targets", () => {
  let s = finishRound(due(fixture([["魔域"], ["帝灵之境"], []]), "魔域", [1, 1, 2]));
  assert.equal(totalHeal(s, "魔域"), 1); assert.equal(s.players[1]!.hp, 30); assert.equal(s.players[2]!.hp, 28);
});
for (const name of ["邪域", "魔域"]) check(`${name} canceled by six-star does not prepay or later repay healing`, () => {
  let s = due(fixture([[name], ["六芒星"], []]), name);
  for (let i = 0; s.activeTimingPhase !== "turn_damage_modify" && i < 80; i++) s = advanceActionWindow(s);
  assert.equal(s.activeTimingPhase, "turn_damage_modify"); assert.equal(totalHeal(s, name), 0);
  s = submitActionWindowSkill(s, s.players[1]!.id, cast("六芒星")); s = finishRound(s);
  assert.equal(totalHeal(s, name), 0); assert.equal(damage(s, name).length, 0);
});
check("redirected drain spell no longer heals the original drainer", () => {
  let s = due(fixture([["邪域"], ["斗转星移"], []]), "邪域");
  for (let i = 0; s.activeTimingPhase !== "turn_damage_modify" && i < 80; i++) s = advanceActionWindow(s);
  const item = s.pendingDamageItems!.find((e) => e.attackName === "邪域")!;
  s = submitActionWindowSkill(s, s.players[1]!.id, cast("斗转星移", { targetId: s.players[2]!.id, targetDamageId: item.id }));
  s = finishRound(s); assert.equal(totalHeal(s, "邪域"), 0); assert.equal(s.players[2]!.hp, 28);
});
check("phoenix doubles the successful drain heal after scholar doubles its damage", () => {
  let s = finishRound(due(fixture([["博学者之怒", "不死鸟之眼"], [], []]), "邪域"));
  assert.equal(damage(s, "邪域")[0]!.amount, 2); assert.equal(totalHeal(s, "邪域"), 4); assert.equal(s.players[0]!.hp, 34);
});
check("sanction claims the successful amplified drain heal without changing who damaged the target", () => {
  let s = finishRound(due(fixture([["博学者之怒"], [], ["制裁之刃"]]), "邪域"));
  assert.equal(totalHeal(s, "邪域"), 2); assert.equal(heals(s, "邪域")[0]!.targetId, s.players[2]!.id);
  assert.equal(damage(s, "邪域")[0]!.sourceId, s.players[0]!.id);
});
check("blood sorrow suppresses only the drain healing and not its spell damage", () => {
  let s = finishRound(due(fixture([["邪域"], [], ["血之哀"]]), "邪域"));
  assert.equal(damage(s, "邪域")[0]!.amount, 1); assert.equal(totalHeal(s, "邪域"), 0);
});
for (const index of [0, 1]) check(`grandmaster ignores earth break only for selected action ${index}`, () => {
  let s = fixture([["宗师之力"], [], []]);
  s = reveal(s, [{ actions: [
    { type: "attack", attackId: "sha", stacks: index === 0 ? 1 : 3, targetId: s.players[1]!.id },
    { type: "attack", attackId: "sha", stacks: index === 1 ? 1 : 3, targetId: s.players[2]!.id }
  ] }]);
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("毁灭之力", { switchActionIndex: index, attackStatModifier: "power_plus_2_level_minus_2" }));
  const preview = previewPlayerAttackStats(s, s.players[0]!.id);
  assert.equal(preview.stats[index]!.ignoreEarthBreak, true); assert.ok(!preview.stats[1 - index]!.ignoreEarthBreak);
  s = end(s); assert.equal(s.players[index + 1]!.hp, 27); assert.equal(s.players[2 - index]!.hp, 30);
});
for (const name of ["双刃剑", "破天圣剑", "破军"]) check(`${name} health payment is backlash through armor and immunity`, () => {
  let s = fixture([[name, "八卦阵", "神之庇护", "不死金身", "帝炎之境", "十字守护", "创伤聚合"], [], []]);
  const pierce = name === "破天圣剑";
  s = reveal(s, [{ type: "attack", attackId: "sha", stacks: 1, targetId: s.players[1]!.id },
    { type: "defense", defense: pierce ? "rebound" : "small", ...(pierce ? { targetId: s.players[0]!.id } : {}) }, gain]);
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("双刃剑", { switchActionIndex: 0, targetId: s.players[1]!.id,
    doubleEdgeMode: pierce ? "pierce_rebound" : name === "破军" ? "ignore_all_defense" : "ignore_defense" }));
  s = end(s);
  const event = damage(s, "双刃剑")[0]!; assert.ok(event); assert.equal(event.internalDamage, true); assert.equal(event.amount, pierce ? 2 : 1);
  assert.equal(s.players[0]!.hp, pierce ? 28 : 29); assert.equal(damage(s, "帝炎之境").length, 0);
  assert.ok(s.players[0]!.buffs.some((b) => b.id.startsWith("trauma_converge:")));
  assert.equal(s.players[0]!.buffs.find((b) => b.id === "huyou_mark")?.stacks ?? 0, 0);
});
check("double-edge backlash can be redirected without canceling the paid defense break", () => {
  let s = fixture([["双刃剑", "斗转星移"], [], ["八卦阵"]]);
  s = reveal(s, [{ type: "attack", attackId: "sha", stacks: 1, targetId: s.players[1]!.id },
    { type: "defense", defense: "small" }, gain]);
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("双刃剑", { switchActionIndex: 0, targetId: s.players[1]!.id }));
  for (let i = 0; s.activeTimingPhase !== "turn_damage_modify" && i < 80; i++) s = advanceActionWindow(s);
  assert.equal(s.activeTimingPhase, "turn_damage_modify");
  const item = s.pendingDamageItems!.find((e) => e.attackName === "双刃剑")!;
  assert.equal(item.internalDamage, true);
  s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("斗转星移", { targetId: s.players[2]!.id, targetDamageId: item.id })));
  assert.deepEqual(s.players.map((p) => p.hp), [30, 29, 29]);
});
console.log(`spell drain checks: ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
