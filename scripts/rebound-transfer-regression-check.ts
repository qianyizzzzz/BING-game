import assert from "node:assert/strict";
import { GameState, PlayerAction, SkillAction, FUSION_RECIPES, COMMON_FUSION_SKILL_ID, createId, createGame,
  createPlayer, addPlayerToGame, startGame, submitPlayerAction, submitActionWindowSkill, advanceActionWindow,
  getAllSkills, getFusionSkillId, toPublicGameState, getRetaliationResponseCount, INFINITE_DAMAGE,
  getAttackMarkCount, BASE_ATTACKS, getStackedAttackStats, resolveReboundAttacks } from "@bing/shared";
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
      targetSkillId: getFusionSkillId(name), fusionRequestId: createId("transfer_fusion") }).state;
  }
  s.players.forEach((player) => { player.hp = hp; player.cakes = 30; }); return s;
}
function collect(s: GameState): GameState {
  for (let i = 0; s.phase === "action_window" && i < 100; i++) s = advanceActionWindow(s);
  assert.equal(s.phase, "collecting_actions"); return s;
}
function reveal(s: GameState, actions: PlayerAction[]): GameState {
  s = collect(s);
  for (let i = 0; i < s.players.length; i++) s = submitPlayerAction(s, s.players[i]!.id, actions[i] ?? gain).state;
  return s;
}
function end(s: GameState): GameState {
  for (let i = 0; s.phase === "action_window" && s.activeTimingPhase !== "turn_end_action" && i < 100; i++) s = advanceActionWindow(s);
  assert.ok(s.phase === "finished" || s.activeTimingPhase === "turn_end_action"); return s;
}
const sha = (s: GameState, target = 1, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", stacks, targetId: s.players[target]!.id });
const rebound = (s: GameState, target = 2): PlayerAction => ({ type: "defense", defense: "rebound", targetId: s.players[target]!.id });
const buffs = (s: GameState, index: number, id: string) => s.players[index]!.buffs.find((buff) => buff.id === id)?.stacks ?? 0;
const damage = (s: GameState) => s.eventLog.filter((event) => event.type === "damage");
let passed = 0; const failures: string[] = [];
function check(name: string, run: () => void) {
  try { run(); passed++; console.log(`ok - ${name}`); }
  catch (error) { failures.push(name); console.error(`not ok - ${name}\n${error instanceof Error ? error.stack : error}`); }
}
check("A's attack redirected through B still hits C as A; C retaliates against A", () => {
  let s = fixture([[], [], ["帝炎之境", "复仇之刃"]]); s = end(reveal(s, [sha(s), rebound(s), gain]));
  assert.deepEqual(s.players.map((p) => p.hp), [19, 20, 19]);
  assert.ok(damage(s).some((e) => e.sourceId === s.players[0]!.id && e.targetId === s.players[2]!.id));
  assert.equal(buffs(s, 2, `revenge_target:${s.players[0]!.id}`), 1);
  assert.equal(buffs(s, 2, `revenge_target:${s.players[1]!.id}`), 0);
});
check("source life steal, guding and sniper apply after retargeting; B gets none", () => {
  let s = fixture([["嗜血", "古淀刀", "狙击枪"], ["嗜血", "古淀刀", "狙击枪"], ["帝炎之境"], []]);
  s.players[2]!.cakes = 1;
  s = end(reveal(s, [sha(s, 1, 4), rebound(s), sha(s, 3), gain]));
  assert.equal(s.players[2]!.hp, 4); assert.equal(s.players[0]!.hp, 23); assert.equal(s.players[1]!.hp, 20);
});
for (const name of ["钟", "连爆", "冰箭雨", "撸"]) for (const absolute of [false, true]) check(`${name}: ${absolute ? "absolute rebound redirects and grants A hit rewards" : "ordinary rebound blocks without a hit reward"}`, () => {
  let s = fixture([[name], absolute ? ["绝弹"] : [], []]);
  const action = name === "冰箭雨" ? { type: "attack", attackId: "wan_jian", stacks: 1 } as PlayerAction : cast(name, { targetId: s.players[1]!.id });
  s = end(reveal(s, [action, rebound(s), gain]));
  if (name === "冰箭雨") {
    assert.equal(buffs(s, 2, `ice_rain:${s.players[0]!.id}`), absolute ? 2 : 1);
  } else {
    const id = name === "钟" ? "jin_zhong_zhao" : name === "连爆" ? "free_lian_bao" : "lu_growth";
    assert.equal(buffs(s, 0, id), absolute ? 1 : 0); assert.equal(buffs(s, 1, id), 0);
  }
});
for (const protection of ["八卦阵", "藤甲", "不死金身", "神之庇护", "闪电护体", "反伤刺甲", "帝灵之境"]) check(`self-return respects immunity but bypasses other protection: ${protection}`, () => {
  let s = fixture([[protection], [], []]); s.players[0]!.hp = 2;
  s = end(reveal(s, [sha(s, 1, 3), rebound(s, 0), gain]));
  const immune = ["藤甲", "不死金身", "反伤刺甲"].includes(protection);
  assert.equal(s.players[0]!.hp, immune ? 2 : -1); assert.equal(s.players[1]!.hp, 20);
  assert.equal(damage(s).some((e) => e.internalDamage && e.sourceId === s.players[0]!.id && e.targetId === s.players[0]!.id && e.amount === 3), !immune);
});
check("internal attacks keep guding, fire blade and action-window modifiers but never sniper", () => {
  let s = fixture([["古淀刀", "狙击枪", "火焰刀", "毁灭之力"], [], []]); s.players[0]!.cakes = 1;
  s = reveal(s, [sha(s), rebound(s, 0), gain]);
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("毁灭之力", { switchActionIndex: 0, attackStatModifier: "power_times_3_level_to_zero" }));
  s = end(s); assert.equal(s.players[0]!.hp, 8);
});
check("internal injury records trauma and legacy but never invokes imperial flame", () => {
  let s = fixture([["帝炎之境", "创伤聚合", "遗计"], [], []]); s = end(reveal(s, [sha(s), rebound(s, 0), gain]));
  assert.equal(s.players[0]!.hp, 19); assert.ok(s.players[0]!.buffs.some((b) => b.id.startsWith("trauma_converge:")));
  assert.ok(s.players[0]!.buffs.some((b) => b.id.startsWith("took_damage_round:")));
  assert.equal(getRetaliationResponseCount(s, s.players[0]!.id, skill("帝炎之境")), 0);
});
check("internal zero HP keeps red-lotus healing without triggering the red cloak burn", () => {
  let s = fixture([["红莲斗篷"], [], []]); s.players[0]!.hp = 1;
  s = end(reveal(s, [sha(s), rebound(s, 0), gain])); assert.equal(s.players[0]!.hp, 1);
  assert.ok(!damage(s).some((e) => e.attackName === "火烧大地"));
});
check("blood-water barrier pays an internal injury through bagua and its own new defense", () => {
  let s = fixture([["血水屏障", "八卦阵", "帝炎之境"], [], []]);
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("血水屏障"));
  assert.equal(s.players[0]!.hp, 19); assert.equal(buffs(s, 0, "defense_value"), 4);
  assert.equal(getRetaliationResponseCount(s, s.players[0]!.id, skill("帝炎之境")), 0);
});
check("internal damage can be redirected and becomes ordinary spell damage unaffected by C's bagua", () => {
  let s = fixture([["斗转星移"], [], ["八卦阵"]]); s = reveal(s, [sha(s, 1, 3), rebound(s, 0), gain]);
  for (let i = 0; s.activeTimingPhase !== "turn_damage_modify" && i < 30; i++) s = advanceActionWindow(s);
  const item = s.pendingDamageItems!.find((e) => e.targetId === s.players[0]!.id)!; assert.equal(item.internalDamage, true);
  s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("斗转星移", { targetId: s.players[2]!.id, targetDamageId: item.id })));
  assert.deepEqual(s.players.map((p) => p.hp), [20, 20, 17]);
});
check("infinite scatter keeps source A; A's infinite self-injury cannot retaliate", () => {
  let s = fixture([["绝对值", "帝炎之境"], ["散弹"], ["散弹"], ["绝对值"]]);
  s = end(reveal(s, [sha(s), rebound(s, 2), rebound(s, 1), gain]));
  assert.ok(s.players[0]!.hpIsInfinite && s.players[0]!.hp > 0);
  assert.ok(damage(s).filter((e) => e.infiniteCopies).every((e) => e.sourceId === s.players[0]!.id));
  assert.equal(getRetaliationResponseCount(s, s.players[0]!.id, skill("帝炎之境")), 0);
});
check("reversal happens before scatter: B kills A, A/C/D rebound to B, so B takes internal damage", () => {
  let s = fixture([["逆转"], ["散弹"], [], []]); s = reveal(s, [sha(s), rebound(s, 0), gain, gain]);
  s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("逆转")));
  assert.deepEqual(s.players.map((p) => p.hp), [20, 19, 20, 20]);
  assert.ok(!damage(s).some((e) => e.infiniteCopies));
});
check("reversal preserves A's applied guding but never applies B's attack bonuses", () => {
  let s = fixture([["逆转", "古淀刀"], ["神族水晶", "狙击枪"], []]); s.players[1]!.cakes = 0;
  s = reveal(s, [sha(s), { type: "defense", defense: "small" }, gain]);
  s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("逆转")));
  assert.equal(s.players[0]!.hp, 18); assert.equal(s.players[1]!.hp, 20);
});
check("reversal refunds cancelled saint and forest costs; a second reversal restores both", () => {
  let s = fixture([["野蛮人"], ["圣"], ["森林的低吟"], []]);
  s = reveal(s, [gain, cast("圣"), cast("森林的低吟"), sha(s, 0)]);
  const paid = s.players.map((p) => p.cakes);
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("逆转"));
  assert.equal(s.activeTimingPhase, "turn_change_action"); assert.equal(s.players[1]!.cakes, 30); assert.equal(s.players[2]!.cakes, 30);
  assert.equal(Object.hasOwn(toPublicGameState(s, s.players[1]!.id), "reversalState"), false);
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("逆转"));
  assert.deepEqual(s.players.map((p) => p.cakes), paid);
  s = end(s); assert.ok(s.players[2]!.hp > 20); assert.equal(s.players[3]!.hp, 20);
});
check("reversal response window forbids spending the refund on zero-HP blue lotus", () => {
  let s = fixture([["逆转"], ["森林的低吟", "神隐青莲"], ["逆转"]]);
  s.players[1]!.hp = 0; s.players[1]!.cakes = 3;
  s = reveal(s, [gain, cast("森林的低吟"), gain]);
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("逆转"));
  assert.equal(s.reversalResponseOnly, true); assert.equal(s.players[1]!.cakes, 3);
  assert.throws(() => submitActionWindowSkill(s, s.players[1]!.id, cast("神隐青莲")), /只能使用逆转响应/);
  s = end(submitActionWindowSkill(s, s.players[2]!.id, cast("逆转")));
  assert.equal(s.players[1]!.cakes, 0); assert.equal(s.players[1]!.hp, 3);
});
check("even-numbered reversals restore actions without reopening ordinary changes", () => {
  let s = fixture([["野蛮人"], ["神隐青莲"], ["逆转"]]); s.players[1]!.hp = 0;
  s = reveal(s, [gain, gain, gain]);
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("逆转"));
  s = submitActionWindowSkill(s, s.players[2]!.id, cast("逆转"));
  assert.equal(s.reversalResponseOnly, true); assert.equal(s.activeTimingPhase, "turn_change_action");
  assert.throws(() => submitActionWindowSkill(s, s.players[1]!.id, cast("神隐青莲")), /只能使用逆转响应/);
});
check("reversal restores submitted forest protection but preserves separately paid limited skills", () => {
  let s = fixture([["野蛮人"], ["森林的低吟", "血水屏障"], []]);
  s = submitActionWindowSkill(s, s.players[1]!.id, cast("血水屏障"));
  s = reveal(s, [gain, cast("森林的低吟"), gain]);
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("逆转"));
  assert.equal(buffs(s, 1, "defense_value"), 4);
  assert.equal(buffs(s, 1, `skill_used:${skill("血水屏障")}`), 1);
  assert.ok(!s.players[1]!.buffs.some((b) => b.id === "temp_invulnerable"));
  s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("逆转")));
  assert.equal(buffs(s, 1, "defense_value"), 4);
  assert.equal(buffs(s, 1, `skill_used:${skill("血水屏障")}`), 1);
  assert.equal(s.players[1]!.hp, 22);
});
check("cancelled defenses do not grant lava marks, and a second reversal restores their count", () => {
  let s = fixture([["野蛮人"], ["熔岩之怒"], []]);
  for (let i = 0; i < 2; i++) s = end(reveal(s, [gain, { type: "defense", defense: "stone" }, gain]));
  s = reveal(s, [gain, { type: "defense", defense: "stone" }, gain]);
  assert.equal(getAttackMarkCount(s.players[1]!, skill("熔岩之怒")), 1);
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("逆转"));
  assert.equal(getAttackMarkCount(s.players[1]!, skill("熔岩之怒")), 0);
  s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("逆转")));
  assert.equal(getAttackMarkCount(s.players[1]!, skill("熔岩之怒")), 1);
});
for (const defense of ["small", "rebound"] as const) check(`all-out strike blocked by ${defense} pays internal backlash without bagua or retaliation`, () => {
  let s = fixture([["全力一击", "八卦阵", "帝炎之境"], [], []]);
  s = end(reveal(s, [cast("全力一击", { targetId: s.players[1]!.id }),
    defense === "rebound" ? rebound(s, 0) : { type: "defense", defense }, gain]));
  assert.equal(s.players[0]!.hp, 17); assert.equal(s.players[1]!.hp, 20);
  assert.ok(damage(s).some((e) => e.internalDamage && e.attackName === "全力一击反噬" && e.amount === 3));
});
check("holy realm immunizes a fire self-return", () => {
  let s = fixture([["火焰刀", "圣灵之境"], [], []]); s = end(reveal(s, [sha(s), rebound(s, 0), gain]));
  assert.equal(s.players[0]!.hp, 20);
});
check("distinct reversed declarations sharing a new source keep separate infinite attack families", () => {
  const s = fixture([[], ["散弹"], ["散弹"], []]), [a, b, c, d] = s.players;
  const attacks = [1, 2].map((stacks) => ({ key: `reversed:${stacks}`, reboundFamilyKey: `original:${stacks}`,
    sourceId: a!.id, targetId: b!.id, originalTargetId: b!.id, actionIndex: 0,
    stats: getStackedAttackStats(BASE_ATTACKS.sha, stacks), reflected: false }));
  const result = resolveReboundAttacks(s, attacks, { [a!.id]: { actions: [gain] }, [d!.id]: { actions: [gain] },
    [b!.id]: { actions: [rebound(s, 2)] }, [c!.id]: { actions: [rebound(s, 1)] } });
  assert.equal(result.length, 8); assert.ok(result.every((attack) => attack.sourceId === a!.id && attack.infiniteCopies));
  assert.deepEqual(new Set(result.map((attack) => attack.stats.power)), new Set([1, 2]));
});
check("infinite redirected lianbao grants infinite free uses only to the attacker", () => {
  let s = fixture([["绝对值", "连爆"], ["绝弹", "散弹"], ["绝弹", "散弹"], ["绝对值"]]);
  s = end(reveal(s, [cast("连爆", { targetId: s.players[1]!.id }), rebound(s, 2), rebound(s, 1), gain]));
  const free = s.players[0]!.buffs.find((buff) => buff.id === "free_lian_bao");
  assert.ok(free?.infinite); assert.equal(free.stacks, INFINITE_DAMAGE);
  for (const index of [1, 2]) assert.equal(buffs(s, index, "free_lian_bao"), 0);
});
for (const original of [true, false]) check(`reversed ice-rain uses ${original ? "the original bonus" : "no new source bonus"}`, () => {
  let s = fixture([["逆转", ...(original ? ["冰箭雨"] : [])], original ? [] : ["冰箭雨"], []]);
  s = reveal(s, [{ type: "attack", attackId: "wan_jian", stacks: 1 }, gain, gain]);
  s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("逆转")));
  assert.equal(buffs(s, 0, `ice_rain:${s.players[1]!.id}`), original ? 1 : 0);
  assert.equal(buffs(s, 0, `ice_rain:${s.players[2]!.id}`), original ? 1 : 0);
});
for (const original of [true, false]) check(`reversed fireball uses ${original ? "the original echo" : "no new source echo"}`, () => {
  let s = fixture([["逆转", ...(original ? ["回响之杖"] : ["火球"])], original ? [] : ["回响之杖"], [], [], []]);
  s = reveal(s, [cast("火球", { targetId: s.players[1]!.id }), gain, gain, gain, gain]);
  s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("逆转")));
  // Echo retains Putian: the original area shot reverses into four shots at A, each retaining its splash.
  assert.deepEqual(s.players.map((player) => player.hp), original ? [4, 14, 17, 17, 14] : [16, 20, 20, 20, 19]);
});
console.log(`rebound transfer checks: ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
