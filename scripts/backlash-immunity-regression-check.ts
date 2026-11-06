import assert from "node:assert/strict";
import {
  GameState, PlayerAction, SkillAction, ActionSubmission, FUSION_RECIPES, COMMON_FUSION_SKILL_ID, createId, createGame,
  createPlayer, addPlayerToGame, startGame, submitPlayerAction, submitActionWindowSkill, advanceActionWindow,
  getAllSkills, getFusionSkillId
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
      targetSkillId: getFusionSkillId(name), fusionRequestId: createId("backlash_immunity") }).state;
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
  assert.ok(s.phase === "finished" || s.activeTimingPhase === "turn_end_action"); return s;
}
const sha = (s: GameState, stacks = 3, target = 1): PlayerAction => ({ type: "attack", attackId: "sha", stacks, targetId: s.players[target]!.id });
const rebound = (s: GameState, target = 0): PlayerAction => ({ type: "defense", defense: "rebound", targetId: s.players[target]!.id });
const damage = (s: GameState, i = 0) => s.eventLog.filter((e) => e.type === "damage" && e.targetId === s.players[i]!.id);
const buff = (s: GameState, id: string) => s.players[0]!.buffs.find((b) => b.id === id);
function dice<T>(roll: number, run: () => T): T {
  const previous = Math.random;
  Math.random = () => new Error().stack!.split("\n")[2]!.includes("addDamage") ? (roll - .5) / 12 : previous();
  try { return run(); } finally { Math.random = previous; }
}
let passed = 0; const failures: string[] = [];
function check(name: string, run: () => void) {
  try { run(); passed++; console.log(`ok - ${name}`); }
  catch (error) { failures.push(name); console.error(`not ok - ${name}\n${error instanceof Error ? error.stack : error}`); }
}

check("thunder heart immunizes its own thunderstorm and awards ordinary +4 healing", () => {
  let s = fixture([["雷霆之心"], [], []]); s = end(reveal(s, [cast("三千雷动")]));
  assert.deepEqual(s.players.map((p) => p.hp), [34, 26, 26]); assert.equal(damage(s).length, 0);
  assert.equal(s.eventLog.filter((e) => e.type === "heal" && e.reason === "大地之心").length, 1);
});
check("earth heart immunizes a returned electric attack and grants defense value", () => {
  let s = fixture([["大地之心"], [], []]);
  s = end(reveal(s, [{ type: "attack", attackId: "shan_dian", stacks: 1, targetId: s.players[1]!.id }, rebound(s), gain]));
  assert.equal(s.players[0]!.hp, 30); assert.equal(buff(s, "defense_value")?.stacks, 4);
});
for (const immunity of ["圣灵之境", "自然之灵"]) check(`${immunity} immunizes a self-returned fire attack`, () => {
  let s = fixture([[immunity, "火焰刀"], [], []]); s = end(reveal(s, [sha(s, 1), rebound(s), gain]));
  assert.equal(s.players[0]!.hp, 30); assert.equal(damage(s).length, 0);
});
check("vine armor immunizes a returned physical sha", () => {
  let s = fixture([["藤甲"], [], []]); s = end(reveal(s, [sha(s), rebound(s), gain]));
  assert.equal(s.players[0]!.hp, 30); assert.equal(damage(s).length, 0);
});
check("fire backlash bypasses vine armor's non-immunity damage adjustment", () => {
  let s = fixture([["藤甲", "火焰刀"], [], []]); s = end(reveal(s, [sha(s, 1), rebound(s), gain]));
  assert.equal(s.players[0]!.hp, 28); assert.equal(damage(s)[0]!.amount, 2);
});
check("an armor-piercing sha retains its exception to vine armor immunity", () => {
  let s = fixture([["藤甲", "青釭剑"], [], []]); s = end(reveal(s, [sha(s), rebound(s), gain]));
  assert.equal(s.players[0]!.hp, 27);
});
check("golden body immunizes fatal attack backlash greater than one", () => {
  let s = fixture([["不死金身"], [], []]); s.players[0]!.hp = 2;
  s = end(reveal(s, [sha(s), rebound(s), gain])); assert.equal(s.players[0]!.hp, 2);
});
check("golden body still permits fatal one-point attack backlash", () => {
  let s = fixture([["不死金身"], [], []]); s.players[0]!.hp = 0;
  s = end(reveal(s, [sha(s, 1), rebound(s), gain])); assert.equal(s.players[0]!.hp, -1);
});
for (const protection of ["八卦阵", "神之庇护", "空城计", "temp_invulnerable", "temp_flash_dodge", "gold", "defense_pool", "temp_shield_normal"]) check(`${protection} cannot intercept attack backlash`, () => {
  let s = fixture([[protection.startsWith("temp_") || ["gold", "defense_pool"].includes(protection) ? "空" : protection], [], []]);
  if (protection.startsWith("temp_")) s.players[0]!.buffs.push({ id: protection, name: protection, stacks: 1, expiresAtTurn: s.turnNumber });
  if (protection === "gold") s.players[0]!.buffs.push({ id: "jin_zhong_zhao", name: "金钟罩", stacks: 1, sourcePlayerId: s.players[0]!.id });
  if (protection === "defense_pool") s.players[0]!.buffs.push({ id: "defense_value", name: "防御值", stacks: 10 });
  s = end(reveal(s, [sha(s), rebound(s), gain])); assert.equal(s.players[0]!.hp, 27);
  assert.equal(damage(s)[0]!.internalDamage, true);
  if (protection === "gold") assert.equal(buff(s, "jin_zhong_zhao")?.stacks, 1);
  if (protection === "defense_pool") assert.equal(buff(s, "defense_value")?.stacks, 10);
});
for (const roll of [1, 2, 3, 4, 12]) check(`six-star array D12=${roll} separates immunity from invulnerability on backlash`, () => {
  let s = fixture([["六芒星阵"], [], []]); s = reveal(s, [sha(s), rebound(s), gain]); s = dice(roll, () => end(s));
  assert.equal(s.players[0]!.hp, roll === 3 ? 39 : 27);
  assert.equal(s.eventLog.filter((e) => e.type === "system" && e.message.startsWith("六芒星阵D12")).length, 1);
  assert.equal(damage(s).length, roll === 3 ? 0 : 1);
});
check("existing invulnerability does not suppress the array's immunity roll against backlash", () => {
  let s = fixture([["六芒星阵"], [], []]);
  s.players[0]!.buffs.push({ id: "temp_invulnerable", name: "无敌", stacks: 1, expiresAtTurn: s.turnNumber });
  s = reveal(s, [sha(s), rebound(s), gain]); s = dice(3, () => end(s)); assert.equal(s.players[0]!.hp, 39);
});
check("active six-star immunizes fixed non-attack backlash and pays its recovery", () => {
  let s = fixture([["全力一击", "六芒星"], [], []]); s = reveal(s, [cast("全力一击", { targetId: s.players[1]!.id }), { type: "defense", defense: "small" }, gain]);
  for (let i = 0; s.activeTimingPhase !== "turn_damage_modify" && i < 50; i++) s = advanceActionWindow(s);
  assert.equal(s.pendingDamageItems!.find((e) => e.attackName === "全力一击反噬")!.internalDamage, true);
  s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("六芒星")));
  assert.equal(s.players[0]!.hp, 39); assert.equal(damage(s).length, 0);
});
for (const fused of [false, true]) check(`lightning body immunizes the larger returned attack: fused=${fused}`, () => {
  let s = fixture([[fused ? "电闪雷鸣" : "闪电护体"], [], []]);
  s = end(reveal(s, [{ actions: [sha(s, 1), sha(s, 3, 2)] }, rebound(s), rebound(s)]));
  assert.equal(s.players[0]!.hp, 29); assert.equal(damage(s).length, 1);
  assert.equal(buff(s, "guidao_charge")?.stacks ?? 0, fused ? 1 : 0);
});
check("lightning body compares returned attacks with other players' attacks", () => {
  let s = fixture([["电闪雷鸣"], [], []]);
  s = end(reveal(s, [sha(s), rebound(s), sha(s, 1, 0)]));
  assert.equal(s.players[0]!.hp, 29); assert.equal(buff(s, "guidao_charge")?.stacks, 1);
});
check("lightning body ignores a fixed backlash payment when counting attacks", () => {
  let s = fixture([["电闪雷鸣", "抠"], ["绝弹"], []]);
  s = end(reveal(s, [cast("抠", { targetId: s.players[1]!.id }), rebound(s), gain]));
  assert.equal(s.players[0]!.hp, 26); assert.equal(buff(s, "guidao_charge")?.stacks ?? 0, 0);
});
check("infinite returned scatter can be immunized and rewards infinite ghost charges", () => {
  let s = fixture([["电闪雷鸣"], ["散弹"], ["散弹"], []]);
  s = end(reveal(s, [sha(s, 1), rebound(s, 2), rebound(s, 1), gain]));
  assert.equal(s.players[0]!.hp, 29); assert.equal(damage(s).length, 1);
  assert.equal(buff(s, "guidao_charge")?.infinite, true);
});
check("an immunized returned attack cannot grant its original source an extra lu-growth hit", () => {
  let s = fixture([["电闪雷鸣", "撸"], ["绝弹"], ["绝弹"]]);
  s = end(reveal(s, [{ actions: [cast("撸", { targetId: s.players[1]!.id }), cast("撸", { stacks: 2, targetId: s.players[2]!.id })] }, rebound(s), rebound(s)]));
  assert.equal(s.players[0]!.hp, 29); assert.equal(buff(s, "lu_growth")?.stacks, 1); assert.equal(buff(s, "guidao_charge")?.stacks, 1);
});
for (const field of ["永远之夜", "破地之力", "衰竭"]) check(`${field} invalidates an attack before it can return as backlash`, () => {
  let s = fixture([[], [], [field]]);
  const action = field === "衰竭" ? { type: "attack", attackId: "qin", stacks: 1, targetId: s.players[1]!.id } as PlayerAction : sha(s, field === "破地之力" ? 3 : 1);
  s = end(reveal(s, [action, rebound(s), gain]));
  assert.equal(s.players[0]!.hp, 30); assert.equal(damage(s).length, 0);
  assert.ok(s.eventLog.some((e) => e.type === "system" && e.message.includes(`被${field}抹除`)));
});
check("an invalidated thunderstorm cannot award thunder-heart recovery for a nonexistent self hit", () => {
  let s = fixture([["雷霆之心"], [], ["破地之力"]]); s = end(reveal(s, [cast("三千雷动")]));
  assert.equal(s.players[0]!.hp, 30); assert.equal(s.eventLog.filter((e) => e.type === "heal").length, 0);
});
check("night invalidates kou before its fixed backlash can be generated", () => {
  let s = fixture([["抠"], [], ["永远之夜"]]);
  s = end(reveal(s, [cast("抠", { targetId: s.players[1]!.id }), rebound(s), gain]));
  assert.equal(s.players[0]!.hp, 30); assert.equal(damage(s).length, 0);
});
check("invalidated attacks do not count as lightning-body immunities or reward ghost charges", () => {
  let s = fixture([["电闪雷鸣"], [], ["永远之夜"]]);
  s = end(reveal(s, [{ actions: [sha(s, 1), sha(s, 3, 2)] }, rebound(s), rebound(s)]));
  assert.equal(s.players[0]!.hp, 30); assert.equal(buff(s, "guidao_charge")?.stacks ?? 0, 0);
});
check("cross guard cannot use damage reduction against backlash, even during an open reaction window", () => {
  let s = fixture([["十字守护", "六芒星"], [], []]); s.players[0]!.buffs.push({ id: "huyou_mark", name: "护佑", stacks: 1 });
  s = reveal(s, [sha(s), rebound(s), gain]);
  for (let i = 0; s.activeTimingPhase !== "turn_damage_modify" && i < 50; i++) s = advanceActionWindow(s);
  const item = s.pendingDamageItems!.find((e) => e.targetId === s.players[0]!.id)!;
  assert.throws(() => submitActionWindowSkill(s, s.players[0]!.id, cast("十字守护", { targetDamageId: item.id })), /反噬伤害不能使用护佑减伤/);
  s = end(s); assert.equal(s.players[0]!.hp, 27);
});
console.log(`backlash immunity checks: ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
