import assert from "node:assert/strict";
import {
  GameState, PlayerAction, SkillAction, FUSION_RECIPES, COMMON_FUSION_SKILL_ID, createId, createGame,
  createPlayer, addPlayerToGame, startGame, submitPlayerAction, submitActionWindowSkill, advanceActionWindow,
  getAllSkills, getFusionSkillId, toPublicGameState, isAttackDamageItem
} from "@bing/shared";
import { formatEvent } from "../apps/client/src/lib/format";
import { buildBattleStepForEvent } from "../apps/client/src/lib/turnTimeline";

const skill = (name: string) => { const s = getAllSkills().find((item) => item.name === name); assert.ok(s, name); return s.id; };
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
      targetSkillId: getFusionSkillId(name), fusionRequestId: createId("scope_fusion") }).state;
  }
  s.players.forEach((p) => { p.hp = 30; p.cakes = 30; }); return s;
}
function collect(s: GameState): GameState {
  for (let i = 0; s.phase === "action_window" && i < 120; i++) s = advanceActionWindow(s);
  assert.equal(s.phase, "collecting_actions"); return s;
}
function reveal(s: GameState, actions: PlayerAction[] = []): GameState {
  s = collect(s);
  for (let i = 0; i < s.players.length; i++) s = submitPlayerAction(s, s.players[i]!.id, actions[i] ?? gain).state;
  return s;
}
function end(s: GameState): GameState {
  for (let i = 0; s.phase === "action_window" && s.activeTimingPhase !== "turn_end_action" && i < 120; i++) s = advanceActionWindow(s);
  assert.equal(s.activeTimingPhase, "turn_end_action"); return s;
}
function damageWindow(s: GameState): GameState {
  for (let i = 0; s.phase === "action_window" && s.activeTimingPhase !== "turn_damage_modify" && i < 50; i++) s = advanceActionWindow(s);
  assert.equal(s.activeTimingPhase, "turn_damage_modify"); return s;
}
const sha = (s: GameState, target = 1, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", stacks, targetId: s.players[target]!.id });
const rebound = (s: GameState, target = 0): PlayerAction => ({ type: "defense", defense: "rebound", targetId: s.players[target]!.id });
const count = (s: GameState, index: number, id: string) => s.players[index]!.buffs.find((b) => b.id === id)?.stacks ?? 0;
const marks = (s: GameState, i = 1) => [count(s, i, "huyou_mark"), count(s, i, "cross_mark")];
const damage = (s: GameState) => s.eventLog.filter((e) => e.type === "damage");
const backlash = (s: GameState) => damage(s).filter((e) => e.attackName === "抠反噬");
let passed = 0; const failures: string[] = [];
function check(name: string, run: () => void) {
  try { run(); passed++; console.log(`ok - ${name}`); }
  catch (error) { failures.push(name); console.error(`not ok - ${name}\n${error instanceof Error ? error.stack : error}`); }
}

for (const attack of ["杀", "火焰刀", "火球"]) check(`ordinary saint loses only actual ${attack} damage`, () => {
  let s = fixture([["圣"], attack === "杀" ? [] : [attack], []]);
  const action = attack === "火球" ? cast("火球", { targetId: s.players[0]!.id }) : sha(s, 0);
  s = end(reveal(s, [cast("圣"), action, gain]));
  assert.equal(s.players[0]!.hp, 30 - (attack === "杀" ? 1 : attack === "火焰刀" ? 2 : 4));
});
for (const saint of ["齐天大圣", "圣灵觉醒"]) check(`${saint} retains its own explicit zero-HP rule`, () => {
  let s = fixture([[saint], [], []]);
  const action = saint === "圣灵觉醒" ? { type: "skill", skillId: getFusionSkillId(saint), stacks: 1 } as SkillAction : cast(saint);
  s = end(reveal(s, [action, sha(s, 0), gain])); assert.equal(s.players[0]!.hp, 0);
});
for (const absolute of [false, true]) for (const stacks of [1, 2]) check(`kou pays one fixed backlash: absolute=${absolute}, stacks=${stacks}`, () => {
  let s = fixture([["抠"], absolute ? ["绝弹"] : [], []]);
  s = end(reveal(s, [cast("抠", { targetId: s.players[1]!.id, stacks }), rebound(s), gain]));
  assert.equal(s.players[0]!.hp, 27 - (absolute ? stacks : 0));
  assert.equal(backlash(s).length, 1); assert.equal(backlash(s)[0]!.amount, 3);
  assert.equal(backlash(s)[0]!.internalDamage, true);
});
check("kou backlash bypasses protection, keeps trauma and does not activate retaliation", () => {
  let s = fixture([["抠", "八卦阵", "神之庇护", "不死金身", "帝炎之境", "创伤聚合"], [], []]);
  s = end(reveal(s, [cast("抠", { targetId: s.players[1]!.id }), rebound(s), gain]));
  assert.deepEqual(s.players.map((p) => p.hp), [27, 30, 30]);
  assert.ok(s.players[0]!.buffs.some((b) => b.id.startsWith("trauma_converge:")));
  assert.equal(damage(s).filter((e) => e.attackName === "帝炎之境").length, 0);
});
check("kou does not pay backlash when rebound points to someone else", () => {
  let s = fixture([["抠"], ["绝弹"], []]);
  s = end(reveal(s, [cast("抠", { targetId: s.players[1]!.id }), rebound(s, 2), gain]));
  assert.deepEqual(s.players.map((p) => p.hp), [30, 30, 29]); assert.equal(backlash(s).length, 0);
});
check("a pierced rebound cannot trigger kou backlash", () => {
  let s = fixture([["抠", "火眼金睛"], [], []]);
  s = end(reveal(s, [cast("抠", { targetId: s.players[1]!.id }), rebound(s), gain]));
  assert.deepEqual(s.players.map((p) => p.hp), [30, 29, 30]); assert.equal(backlash(s).length, 0);
});
check("kou backlash along a two-rebound route is not paid twice", () => {
  let s = fixture([["抠"], ["绝弹"], ["绝弹"]]);
  s = end(reveal(s, [cast("抠", { targetId: s.players[1]!.id }), rebound(s, 2), rebound(s)]));
  assert.equal(s.players[0]!.hp, 26); assert.equal(backlash(s).length, 1);
});
check("kou's fixed backlash can be redirected as ordinary spell damage", () => {
  let s = fixture([["抠", "斗转星移"], [], ["八卦阵"]]);
  s = damageWindow(reveal(s, [cast("抠", { targetId: s.players[1]!.id }), rebound(s), gain]));
  const item = s.pendingDamageItems!.find((e) => e.attackName === "抠反噬")!;
  assert.equal(item.internalDamage, true); assert.equal(item.fromAttack, false);
  s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("斗转星移", { targetId: s.players[2]!.id, targetDamageId: item.id })));
  assert.deepEqual(s.players.map((p) => p.hp), [30, 30, 27]);
});
for (const fire of [false, true]) check(`cross-guard gains marks from attack damage, fire=${fire}`, () => {
  let s = fixture([fire ? ["火焰刀"] : [], ["十字守护"], []]); s = end(reveal(s, [sha(s)]));
  assert.deepEqual(marks(s), [1, 1]);
});
for (const name of ["火烧大地", "净化之风"]) check(`cross-guard gains no marks from ${name}`, () => {
  let s = fixture([[name], ["十字守护"], []]); s.players[1]!.hp = 29;
  s = end(reveal(s)); s = end(submitActionWindowSkill(s, s.players[0]!.id, cast(name)));
  assert.equal(s.players[1]!.hp, 28); assert.deepEqual(marks(s), [0, 0]);
});
check("non-attack backlash never grants cross-guard marks", () => {
  let s = fixture([["血水屏障", "十字守护"], [], []]); s = reveal(s);
  s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("血水屏障")));
  assert.equal(s.players[0]!.hp, 29); assert.deepEqual(marks(s, 0), [0, 0]);
});
check("a self-returned attack retains its attack origin for cross-guard acquisition", () => {
  let s = fixture([["十字守护"], [], []]); s = end(reveal(s, [sha(s), rebound(s), gain]));
  assert.equal(s.players[0]!.hp, 29); assert.deepEqual(marks(s, 0), [1, 1]);
});
for (const name of ["十字守护", "冰箭雨"]) for (const attack of [false, true]) check(`${name} accepts only attack damage: attack=${attack}`, () => {
  let s = fixture([attack ? [] : ["净化之风"], [name, "六芒星"], []]); s.players[1]!.hp = 29;
  if (name === "十字守护") s.players[1]!.buffs.push({ id: "huyou_mark", name: "护佑", stacks: 1 });
  else s.players[0]!.buffs.push({ id: `ice_rain:${s.players[1]!.id}`, name: "冰雨", stacks: 1 });
  s = attack ? damageWindow(reveal(s, [sha(s, 1, 3)])) : end(reveal(s));
  if (!attack) s = submitActionWindowSkill(s, s.players[0]!.id, cast("净化之风"));
  assert.equal(s.activeTimingPhase, "turn_damage_modify");
  const item = s.pendingDamageItems!.find((e) => e.targetId === s.players[1]!.id)!;
  assert.equal(isAttackDamageItem(item), attack);
  const action = cast(name, { targetDamageId: item.id });
  if (attack) {
    s = end(submitActionWindowSkill(s, s.players[1]!.id, action)); assert.equal(s.players[1]!.hp, 28);
    assert.equal(damage(s).filter((event) => event.targetId === s.players[1]!.id).length, 1,
      "reopening a window for another available skill must not restart attack settlement");
  } else {
    assert.throws(() => submitActionWindowSkill(s, s.players[1]!.id, action), /只能作用于攻击伤害/);
    s = end(s); assert.equal(s.players[1]!.hp, 28);
    if (name === "十字守护") assert.equal(count(s, 1, "huyou_mark"), 1);
    else assert.equal(count(s, 0, `ice_rain:${s.players[1]!.id}`), 1);
  }
});
check("cross mark can amplify adjacent attack damage but cannot amplify adjacent spell damage", () => {
  for (const attack of [true, false]) {
    let s = fixture([["十字守护"], attack ? [] : ["净化之风"], ["六芒星"]]); s.players[2]!.hp = 29;
    s.players[0]!.buffs.push({ id: "cross_mark", name: "十字", stacks: 1 });
    s = attack ? damageWindow(reveal(s, [gain, sha(s, 2, 2), gain])) : end(reveal(s));
    if (!attack) s = submitActionWindowSkill(s, s.players[1]!.id, cast("净化之风"));
    const item = s.pendingDamageItems!.find((e) => e.targetId === s.players[2]!.id)!;
    const action = cast("十字守护", { targetDamageId: item.id });
    if (attack) s = end(submitActionWindowSkill(s, s.players[0]!.id, action));
    else { assert.throws(() => submitActionWindowSkill(s, s.players[0]!.id, action), /只能作用于攻击伤害/); s = end(s); }
    assert.equal(s.players[2]!.hp, attack ? 25 : 28);
  }
});
check("ice-rain acquisition still follows a landed wan-jian attack", () => {
  let s = fixture([["冰箭雨"], [], []]); s = end(reveal(s, [{ type: "attack", attackId: "wan_jian", stacks: 1 }]));
  for (const i of [1, 2]) assert.equal(count(s, i, `ice_rain:${s.players[0]!.id}`), 1);
});
check("a self-returned attack cannot consume one's own ice-rain mark", () => {
  let s = fixture([["冰箭雨", "六芒星"], [], []]);
  s.players[0]!.buffs.push({ id: `ice_rain:${s.players[0]!.id}`, name: "自己的冰雨", stacks: 1 });
  s = damageWindow(reveal(s, [sha(s, 1, 3), rebound(s), gain]));
  const item = s.pendingDamageItems!.find((e) => e.targetId === s.players[0]!.id)!;
  assert.throws(() => submitActionWindowSkill(s, s.players[0]!.id, cast("冰箭雨", { targetDamageId: item.id })), /不能使用冰雨印记/);
});
check("non-attacking electric-shock action never grants damage-response marks", () => {
  let s = fixture([["电击法术"], ["十字守护"], []]);
  s = end(reveal(s, [cast("电击法术", { targetIds: [s.players[1]!.id] })]));
  assert.equal(s.players[1]!.hp, 30); assert.deepEqual(marks(s), [0, 0]);
});
check("backlash events use the new name in the log and battle timeline", () => {
  let s = fixture([["抠"], [], []]); s = end(reveal(s, [cast("抠", { targetId: s.players[1]!.id }), rebound(s), gain]));
  const event = backlash(s)[0]!; const state = toPublicGameState(s, s.players[0]!.id);
  assert.match(formatEvent(event, state), /3 点反噬伤害/);
  assert.match(buildBattleStepForEvent(event, state)!.description, /反噬伤害/);
});
console.log(`attack damage scope checks: ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
