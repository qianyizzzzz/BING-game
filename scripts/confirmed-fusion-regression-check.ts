import assert from "node:assert/strict";
import { createGame, createPlayer, addPlayerToGame, startGame, submitPlayerAction, submitActionWindowSkill,
  advanceActionWindow, FUSION_RECIPES, COMMON_FUSION_SKILL_ID, getAllSkills, getFusionSkillId, getAttackMarkCount,
  getActiveSkillCount, previewPlayerAttackStats, decomposeSkill, recordSkillUse, GameState, PlayerAction, SkillAction, getSkill,
  guessPlayerSkill } from "@bing/shared";
const skill = (name: string) => getAllSkills().find(s => s.name === name)!.id;
const gain = { type: "gain_cake" } as const;
const cast = (name: string): SkillAction => ({ type: "skill", skillId: skill(name), stacks: 1 });
function fixture(name: string, extra: string[] = []): GameState {
  const recipe = FUSION_RECIPES.find(r => r.skill.name === name)!;
  let s = createGame("A", { skillMode: "test_select", skillCount: 8, firstTurnNoAttack: false });
  for (const n of ["B", "C"]) s = addPlayerToGame(s, createPlayer(n));
  s.players[0]!.skills = [...recipe.materialOptions[0]!, ...extra.map(skill)];
  s = startGame(s);
  s = fuse(s, name);
  s.players.forEach(p => { p.hp = 20; p.cakes = 30; });
  return s;
}
function fuse(s: GameState, name: string, index = 0) {
  return submitPlayerAction(s, s.players[index]!.id, { type: "skill", skillId: COMMON_FUSION_SKILL_ID,
    stacks: 1, targetSkillId: getFusionSkillId(name), fusionRequestId: `fusion_test_${s.players[index]!.skillFusions?.length ?? 0}_${name.length}` }).state;
}
function collect(s: GameState) {
  for (let i = 0; s.phase === "action_window" && i < 80; i++) s = advanceActionWindow(s);
  assert.equal(s.phase, "collecting_actions"); return s;
}
function reveal(s: GameState, a: PlayerAction = gain, b: PlayerAction = gain, c: PlayerAction = gain) {
  s = collect(s); s.players.forEach(p => p.cakes = 30);
  for (const [i, p] of s.players.entries()) s = submitPlayerAction(s, p.id, [a,b,c][i]!).state;
  return s;
}
function end(s: GameState) {
  for (let i = 0; s.phase === "action_window" && s.activeTimingPhase !== "turn_end_action" && i < 200; i++) s = advanceActionWindow(s);
  assert.equal(s.activeTimingPhase, "turn_end_action"); return s;
}
function endWindow(s: GameState) { s = structuredClone(s); s.phase = "action_window"; s.activeTimingPhase = "turn_end_action"; s.actionWindowMode = "active"; s.actionWindowPassPlayerIds = []; return s; }
const sha = (s: GameState, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", stacks, targetId: s.players[0]!.id });
function random<T>(value: number, run: () => T): T { const old = Math.random; Math.random = () => value; try { return run(); } finally { Math.random = old; } }
let passed = 0;
function check(name: string, run: () => void) { run(); passed++; console.log(`ok - ${name}`); }

check("all eight confirmed recipes can form real covers", () => {
  for (const name of ["六芒星阵","博学者之怒","帝灵之境","反伤刺甲","神隐双莲","名刀司命","红莲斗篷","阳炎之怒"]) {
    const s = fixture(name); assert.equal(s.players[0]!.skillFusions![0]!.skillId, getFusionSkillId(name));
  }
});
check("six-star normal outcome uses enhanced bagua; extra unfused bagua stays at one", () => {
  let s = fixture("六芒星阵", ["八卦阵"]); s = reveal(s, gain, sha(s, 4));
  s = random(.99, () => end(s)); assert.equal(s.players[0]!.hp, 19);
});
check("six-star invulnerability blocks subsequent attacks in the same turn", () => {
  let s = fixture("六芒星阵"); s = reveal(s, gain, sha(s, 5), sha(s, 5));
  s = random(.01, () => end(s)); assert.equal(s.players[0]!.hp, 20);
});
check("automatic six-star heals without spending the limited material", () => {
  let s = fixture("六芒星阵"); recordSkillUse(s.players[0]!, skill("六芒星"));
  s = reveal(s, gain, sha(s, 4)); s = random(.20, () => end(s));
  assert.equal(s.players[0]!.hp, 28);
  assert.equal(s.players[0]!.buffs.find(b => b.id === `skill_used:${skill("六芒星")}`)!.stacks, 1);
});
check("six-star reflection sends damage back and prevents original damage", () => {
  let s = fixture("六芒星阵"); s = reveal(s, gain, sha(s, 4)); s = random(.28, () => end(s));
  assert.equal(s.players[0]!.hp,20); assert.equal(s.players[1]!.hp,16);
});
check("scholar doubles burning earth spell damage", () => {
  let s = endWindow(fixture("博学者之怒", ["火烧大地"]));
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("火烧大地"));
  assert.equal(s.players[1]!.hp,18); assert.equal(s.players[2]!.hp,18);
});
check("scholar doubles forest healing without doubling ordinary attacks", () => {
  let s = fixture("博学者之怒");
  s = end(reveal(s, cast("森林的低吟"))); assert.equal(s.players[0]!.hp,26);
  let a = fixture("博学者之怒"); a = end(reveal(a, { type:"attack",attackId:"sha",stacks:3,targetId:a.players[1]!.id }));
  assert.equal(a.players[1]!.hp,17);
});
check("imperial spirit immunizes a spell and returns one fire spell damage", () => {
  let s = fixture("帝灵之境"); s.players[1]!.skills=[skill("火烧大地")]; s=endWindow(s);
  s=submitActionWindowSkill(s,s.players[1]!.id,cast("火烧大地")); assert.equal(s.players[0]!.hp,20); assert.equal(s.players[1]!.hp,19);
});
check("two imperial spirits terminate with both sides immune", () => {
  let s=fixture("帝灵之境");s.players[1]!.skills=[...FUSION_RECIPES.find(r=>r.skill.name==="帝灵之境")!.materialOptions[0]!,skill("火烧大地")];s=fuse(s,"帝灵之境",1);s=endWindow(s);
  s=submitActionWindowSkill(s,s.players[1]!.id,cast("火烧大地"));assert.equal(s.players[0]!.hp,20);assert.equal(s.players[1]!.hp,20);
});
check("armor stops adding fire vulnerability and reflects rounded-up actual damage", () => {
  let s=fixture("反伤刺甲");s.players[1]!.skills=[skill("火球")];s=end(reveal(s,gain,{...cast("火球"),targetId:s.players[0]!.id}));
  assert.equal(s.players[0]!.hp,16);assert.equal(s.players[1]!.hp,18);
});
check("armor chains continue beyond eight waves and stop at death", () => {
  let s=fixture("反伤刺甲");s.players[1]!.skills=[...FUSION_RECIPES.find(r=>r.skill.name==="反伤刺甲")!.materialOptions[0]!,skill("火球")];s=fuse(s,"反伤刺甲",1);
  s=end(reveal(s,gain,{...cast("火球"),targetId:s.players[0]!.id}));
  assert.ok(s.players.some(p=>p.status!=="alive"));assert.ok(s.eventLog.filter(e=>e.type==="damage"&&e.attackName==="反伤刺甲").length>8);
});
check("twins trigger at exactly zero, replace both materials and schedule next-round cake", () => {
  let s=fixture("神隐双莲");s.players[0]!.hp=1;s=end(reveal(s,gain,sha(s)));
  assert.equal(s.players[0]!.hp,3);assert.ok(s.players[0]!.buffs.some(b=>b.id==="qinglian_cake_round:2"&&b.stacks===1));
  assert.equal(getActiveSkillCount(s.players[0]!,skill("神隐红莲")),0);
  let n=fixture("神隐双莲");n.players[0]!.hp=0;n=end(reveal(n,gain,sha(n)));assert.equal(n.players[0]!.status,"dead");
});
check("knife protects zero HP outside turns three to five, and never blocks spell damage", () => {
  for(const t of [2,3,5,6]) { let s=fixture("名刀司命");s.players[0]!.hp=0;s=collect(s);s.roundTurnNumber=t;
    s=end(reveal(s,gain,sha(s)));assert.equal(s.players[0]!.hp,t===3||t===5?-1:0); }
  let s=fixture("名刀司命");s.players[0]!.hp=0;s.players[1]!.skills=[skill("火烧大地")];s=endWindow(s);
  s=submitActionWindowSkill(s,s.players[1]!.id,cast("火烧大地"));assert.equal(s.players[0]!.hp,-1);
});
check("red cloak burns without spending a use and removes enemy ice skills", () => {
  let s=fixture("红莲斗篷");s.players[0]!.hp=1;s.players[2]!.skills=[skill("冰箭雨")];s=end(reveal(s,gain,sha(s)));
  assert.equal(s.players[0]!.hp,1);assert.equal(s.players[1]!.hp,19);assert.equal(s.players[2]!.hp,18);
  assert.equal(s.players[2]!.skills.length,0);assert.ok(!s.players[0]!.buffs.some(b=>b.id===`skill_used:${skill("火烧大地")}`));
});
check("solar combines stone and youtiao, spends marks for +2/+2, and clears only its own marks", () => {
  let s=fixture("阳炎之怒");
  for(const defense of ["stone","youtiao","stone"] as const) s=end(reveal(s,{type:"defense",defense}));
  assert.equal(getAttackMarkCount(s.players[0]!,skill("熔岩之怒")),1);
  s=reveal(s,{type:"attack",attackId:"sha",stacks:1,targetId:s.players[1]!.id});
  s=submitActionWindowSkill(s,s.players[0]!.id,cast("熔岩之怒"));
  const stats=previewPlayerAttackStats(s,s.players[0]!.id).stats[0]!;assert.equal(stats.power,3);assert.equal(stats.level,3);
  s=end(s);s.players[0]!.buffs.push({id:"lava_mark",name:"其他熔岩",stacks:2});
  s=decomposeSkill(s,s.players[0]!.id,s.players[0]!.skillFusions![0]!.id);assert.equal(getAttackMarkCount(s.players[0]!,skill("熔岩之怒")),2);
});
check("each blizzard damage hit performs its own probability check", () => {
  let s=fixture("六芒星阵");s.players[1]!.skills=[skill("暴风雪")];s=reveal(s,gain,{...cast("暴风雪"),targetId:s.players[0]!.id});
  s=random(.99,()=>end(s));assert.equal(s.eventLog.filter(e=>e.type==="system"&&e.message.startsWith("六芒星阵D12")).length,2);
});
check("a dying armor owner can revive before the chain continues", () => {
  let s=fixture("反伤刺甲",["治愈术"]);s.players[1]!.skills=[...FUSION_RECIPES.find(r=>r.skill.name==="反伤刺甲")!.materialOptions[0]!,skill("火球")];s=fuse(s,"反伤刺甲",1);
  s=reveal(s,gain,{...cast("火球"),targetId:s.players[0]!.id});
  for(let i=0;i<100&&s.activeTimingPhase!=="revival_action";i++)s=advanceActionWindow(s);
  assert.equal(s.activeTimingPhase,"revival_action");assert.ok(s.players[0]!.hp<0);
  s=submitActionWindowSkill(s,s.players[0]!.id,cast("治愈术"));s=end(s);
  assert.equal(s.players[0]!.status,"alive");assert.equal(s.players[1]!.status,"dead");
});
check("scholar doubles round-end domain damage and drain healing follows the actual damage", () => {
  let s=fixture("博学者之怒");s=collect(s);s.roundNumber=3;
  s=end(reveal(s,{type:"attack",attackId:"sha",stacks:1,targetId:s.players[2]!.id}));
  const before=s.players[1]!.hp;s=advanceActionWindow(s);
  assert.equal(s.players[1]!.hp,before-2);assert.equal(s.players[0]!.hp,22);
});
check("scholar amplifies reveal-watcher spell damage through the shared path", () => {
  let s=endWindow(fixture("博学者之怒",["传音入密"]));s.players[1]!.skills=[skill("连爆")];
  s=guessPlayerSkill(s,s.players[0]!.id,s.players[1]!.id,skill("连爆"));assert.equal(s.players[1]!.hp,16);
});
check("sealing or decomposing scholar removes only its added multiplier", () => {
  for(const mode of ["seal","decompose"]) {
    let s=endWindow(fixture("博学者之怒",["火烧大地"]));
    if(mode==="seal")s.players[0]!.buffs.push({id:`sealed_skill:${getFusionSkillId("博学者之怒")}`,name:"封印",stacks:1});
    else s=decomposeSkill(s,s.players[0]!.id,s.players[0]!.skillFusions![0]!.id);
    s=submitActionWindowSkill(s,s.players[0]!.id,cast("火烧大地"));assert.equal(s.players[1]!.hp,19);
  }
});
check("red cloak grants ten defense without refilling the shield use limit", () => {
  let s=endWindow(fixture("红莲斗篷"));s=submitActionWindowSkill(s,s.players[0]!.id,cast("暗影盾"));
  assert.equal(s.players[0]!.buffs.find(b=>b.id==="defense_value")?.stacks,10);
  s=decomposeSkill(s,s.players[0]!.id,s.players[0]!.skillFusions![0]!.id);
  assert.throws(()=>submitActionWindowSkill(s,s.players[0]!.id,cast("暗影盾")),/次数/);
});
check("round-end retaliation permits revival and resumes without repeating domain rewards", () => {
  let s=fixture("博学者之怒");s.players[1]!.skills=[...FUSION_RECIPES.find(r=>r.skill.name==="反伤刺甲")!.materialOptions[0]!,skill("治愈术")];s=fuse(s,"反伤刺甲",1);
  s=collect(s);s.roundNumber=3;s.players[1]!.hp=0;
  s.players[0]!.buffs.push({id:"xieyu_target",name:"目标",stacks:1,sourcePlayerId:s.players[1]!.id});
  s=end(reveal(s,{type:"attack",attackId:"sha",stacks:1,targetId:s.players[2]!.id}));s=advanceActionWindow(s);
  for(let i=0;i<20&&s.activeTimingPhase!=="revival_action";i++)s=advanceActionWindow(s);
  assert.equal(s.activeTimingPhase,"revival_action");s=submitActionWindowSkill(s,s.players[1]!.id,cast("治愈术"));
  assert.equal(s.roundNumber,4);assert.equal(s.turnNumber,2);assert.equal(s.players[1]!.status,"alive");assert.equal(s.players[1]!.hp,6);
  assert.equal(s.eventLog.filter(e=>e.type==="heal"&&e.reason==="邪域").length,1);
});
check("imperial spirit counters armor spells until the armor owner dies", () => {
  let s=fixture("帝灵之境");s.players[1]!.skills=[...FUSION_RECIPES.find(r=>r.skill.name==="反伤刺甲")!.materialOptions[0]!,skill("净化之风")];s=fuse(s,"反伤刺甲",1);
  s.players[0]!.hp=21;s.players[1]!.hp=3;s=endWindow(s);
  s=submitActionWindowSkill(s,s.players[1]!.id,cast("净化之风"));
  for(let i=0;i<50&&s.players[1]!.status==="alive";i++)s=advanceActionWindow(s);
  assert.equal(s.players[0]!.hp,21);assert.equal(s.players[1]!.status,"dead");
});
check("red cloak completes the burn chain up to each owner's response cap", () => {
  let s=fixture("红莲斗篷");s.players[1]!.skills=[...FUSION_RECIPES.find(r=>r.skill.name==="红莲斗篷")!.materialOptions[0]!];s=fuse(s,"红莲斗篷",1);
  s.players[0]!.hp=1;s.players[1]!.hp=1;s=end(reveal(s,gain,sha(s)));
  assert.equal(s.players[0]!.hp,1);assert.equal(s.players[1]!.hp,1);
  assert.equal(s.retaliationResponses?.counts[s.players[0]!.id]?.[getFusionSkillId("红莲斗篷")],1000);
  assert.equal(s.retaliationResponses?.counts[s.players[1]!.id]?.[getFusionSkillId("红莲斗篷")],1000);
  assert.ok(s.eventLog.filter(e=>e.type==="damage"&&e.attackName==="火烧大地").length>=2000);
});
console.log(`confirmed fusion checks: ${passed} passed`);
