import assert from "node:assert/strict";
import { GameState, PlayerAction, SkillAction, FUSION_RECIPES, COMMON_FUSION_SKILL_ID, createId, createGame,
  createPlayer, addPlayerToGame, startGame, submitPlayerAction, submitActionWindowSkill, advanceActionWindow,
  getAllSkills, getFusionSkillId, decomposeSkill, toPublicGameState, RETALIATION_RESPONSE_LIMIT,
  getRetaliationResponseCount as used, takeRetaliationResponses as take } from "@bing/shared";

const skill = (name: string) => { const entry = getAllSkills().find((item) => item.name === name); assert.ok(entry, name); return entry.id; };
const gain: PlayerAction = { type: "gain_cake" };
const cast = (name: string, extra: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId: skill(name), stacks: 1, ...extra });
const flame = "skill_76_76044";
const armor = getFusionSkillId("反伤刺甲"), cloak = getFusionSkillId("红莲斗篷"), spirit = getFusionSkillId("帝灵之境");
function fixture(loadouts: string[][], hp = 6): GameState {
  let s = createGame("A", { skillMode: "test_select", skillCount: 12, firstTurnNoAttack: false });
  for (let i = 1; i < loadouts.length; i++) s = addPlayerToGame(s, createPlayer(String.fromCharCode(65 + i)));
  s.players.forEach((player, index) => { player.skills = loadouts[index]!.flatMap((name) =>
    FUSION_RECIPES.find((recipe) => recipe.skill.name === name)?.materialOptions[0] ?? [skill(name)]); });
  s = startGame(s);
  for (let i = 0; i < loadouts.length; i++) for (const name of loadouts[i]!) {
    if (!FUSION_RECIPES.some((recipe) => recipe.skill.name === name)) continue;
    s = submitPlayerAction(s, s.players[i]!.id, { type: "skill", skillId: COMMON_FUSION_SKILL_ID, stacks: 1,
      targetSkillId: getFusionSkillId(name), fusionRequestId: createId("response_fusion") }).state;
  }
  s.players.forEach((player) => { player.hp = hp; player.cakes = 30; }); return s;
}
function collect(s: GameState): GameState {
  for (let i = 0; s.phase === "action_window" && i < 100; i++) s = advanceActionWindow(s);
  assert.equal(s.phase, "collecting_actions"); return s;
}
function reveal(s: GameState, actions: PlayerAction[]): GameState {
  s = collect(s); s.players.forEach((player) => { player.cakes = 30; });
  for (let i = 0; i < s.players.length; i++) s = submitPlayerAction(s, s.players[i]!.id, actions[i] ?? gain).state;
  return s;
}
function end(s: GameState, revival = false): GameState {
  for (let i = 0; s.phase === "action_window" && s.activeTimingPhase !== "turn_end_action" &&
    !(revival && s.activeTimingPhase === "revival_action") && i < 100; i++) s = advanceActionWindow(s);
  assert.ok(s.phase === "finished" || s.activeTimingPhase === "turn_end_action" || (revival && s.activeTimingPhase === "revival_action"));
  return s;
}
function ball(s: GameState, index = 0): SkillAction { return cast("火球", { targetId: s.players[index]!.id }); }
const notices = (s: GameState) => s.eventLog.filter((event) => event.type === "system" && event.message.includes("本回合响应已达1000次"));
let passed = 0; const failures: string[] = [];
function check(name: string, run: () => void) {
  try { run(); passed++; console.log(`ok - ${name}`); }
  catch (error) { failures.push(name); console.error(`not ok - ${name}\n${error instanceof Error ? error.stack : error}`); }
}

check("999th/1000th boundary grants only the remaining response and reports the cap once", () => {
  const s = fixture([[], [], []]), id = s.players[0]!.id;
  assert.equal(take(s, id, flame, 999), 999); assert.equal(take(s, id, flame, 2), 1);
  assert.equal(take(s, id, flame), 0); assert.equal(used(s, id, flame), 1000); assert.equal(notices(s).length, 1);
});
check("different players and different skills have independent quotas", () => {
  const s = fixture([[], [], []]), a = s.players[0]!.id, b = s.players[1]!.id;
  take(s, a, flame, 1000); assert.equal(take(s, b, flame), 1);
  for (const id of [armor, cloak, spirit]) assert.equal(take(s, a, id, 1000), 1000);
  assert.equal(used(s, b, flame), 1);
});
check("turn boundaries refresh the quota; phase changes and round numbers alone do not", () => {
  let s = fixture([[], [], []]); s = collect(s); const id = s.players[0]!.id;
  take(s, id, flame, 1000); s.roundNumber += 1;
  assert.equal(take(s, id, flame), 0);
  s = end(reveal(s, [gain, gain, gain])); assert.equal(used(s, id, flame), 1000);
  s = collect(s); assert.equal(used(s, id, flame), 0); assert.equal(take(s, id, flame, 1000), 1000);
});
check("private response ledgers survive JSON but are not exposed in public state", () => {
  const s = fixture([[], [], []]); take(s, s.players[0]!.id, armor, 123);
  assert.equal(used(JSON.parse(JSON.stringify(s)), s.players[0]!.id, armor), 123);
  const publicState = toPublicGameState(s, s.players[1]!.id);
  assert.equal(Object.hasOwn(publicState, "retaliationResponses"), false);
});
check("ordinary finite armor chains retain the existing death result", () => {
  let s = fixture([["反伤刺甲"], ["反伤刺甲", "火球"], []]);
  s = end(reveal(s, [gain, ball(s), gain]));
  assert.deepEqual(s.players.slice(0, 2).map((player) => [player.hp, player.status]), [[-1, "dead"], [2, "alive"]]);
});
check("two armors with red lotus terminate at 1000 responses each and settle every queued hit", () => {
  let s = fixture([["反伤刺甲", "神隐红莲"], ["反伤刺甲", "神隐红莲", "火球"], []]);
  s = end(reveal(s, [gain, ball(s), gain]));
  for (const player of s.players.slice(0, 2)) { assert.equal(used(s, player.id, armor), 1000); assert.equal(player.hp, 1); }
  assert.equal(s.eventLog.filter((event) => event.type === "damage" && event.attackName === "反伤刺甲").length, 2000);
  assert.equal(s.pendingDamageItems?.length ?? 0, 0); assert.equal(notices(s).length, 2);
});
check("two imperial flames with red lotus also stop without a synthetic 256-wave window", () => {
  let s = fixture([["帝炎之境", "神隐红莲"], ["帝炎之境", "神隐红莲", "火球"], []]);
  s = end(reveal(s, [gain, ball(s), gain]));
  for (const player of s.players.slice(0, 2)) assert.equal(used(s, player.id, flame), 1000);
  assert.equal(s.pendingDamageItems?.length ?? 0, 0);
});
check("multiple copies of the same skill share the owner's remaining quota", () => {
  let s = fixture([["帝炎之境", "帝炎之境"], ["火球"], []]);
  take(s, s.players[0]!.id, flame, 999);
  s = end(reveal(s, [gain, ball(s), gain]));
  assert.equal(used(s, s.players[0]!.id, flame), 1000); assert.equal(s.players[1]!.hp, 5);
});
check("a response that is immune still spends one response", () => {
  let s = fixture([["帝炎之境"], ["圣灵之境", "火球"], []]);
  s = end(reveal(s, [gain, ball(s), gain]));
  assert.equal(used(s, s.players[0]!.id, flame), 1); assert.equal(s.players[1]!.hp, 6);
});
for (const name of ["帝炎之境", "反伤刺甲"] as const) check(`${name}: infinite scattered copies produce at most 1000 finite responses`, () => {
  let s = fixture([["绝对值", "火焰刀"], ["散弹"], ["散弹"], [name, "绝对值"]]);
  s = end(reveal(s, [{ type: "attack", attackId: "sha", stacks: 1, targetId: s.players[1]!.id },
    { type: "defense", defense: "rebound", targetId: s.players[2]!.id },
    { type: "defense", defense: "rebound", targetId: s.players[1]!.id }, gain]));
  assert.equal(used(s, s.players[3]!.id, name === "帝炎之境" ? flame : armor), 1000);
  const returns = s.eventLog.filter((event) => event.type === "damage" && event.attackName === name);
  assert.equal(returns.length, 1000);
  assert.ok(returns.every((event) => event.type === "damage" && !event.infiniteCopies && event.amount === 1 &&
    event.sourceId === s.players[3]!.id && event.targetId === s.players[0]!.id));
  for (const index of [0, 3]) { assert.equal(s.players[index]!.hpIsInfinite, true); assert.ok(s.players[index]!.hp > 0); }
  assert.equal(used(s, s.players[0]!.id, flame), 0);
});
check("red-cloak mutual burning now chains fully, counts a group burn once, and keeps basic healing", () => {
  let s = fixture([["红莲斗篷"], ["红莲斗篷"], []]);
  s.players[0]!.hp = 1; s.players[1]!.hp = 1; s.players[2]!.hp = 5000;
  s = end(reveal(s, [gain, { type: "attack", attackId: "sha", stacks: 1, targetId: s.players[0]!.id }, gain]));
  for (const player of s.players.slice(0, 2)) {
    assert.equal(used(s, player.id, cloak), 1000); assert.equal(player.hp, 1);
    assert.equal(s.eventLog.filter((event) => event.type === "damage" && event.sourceId === player.id && event.attackName === "火烧大地").length, 2000);
    assert.ok(!player.buffs.some((buff) => buff.id === `skill_used:${skill("火烧大地")}`));
  }
  assert.equal(s.players[2]!.hp, 3000); assert.equal(s.pendingDamageItems?.length ?? 0, 0);
});
check("reaching the cloak quota does not disable its red-lotus healing", () => {
  let s = fixture([["红莲斗篷"], [], []]); s.players[0]!.hp = 1;
  take(s, s.players[0]!.id, cloak, 1000);
  s = end(reveal(s, [gain, { type: "attack", attackId: "sha", stacks: 1, targetId: s.players[0]!.id }, gain]));
  assert.equal(s.players[0]!.hp, 1); assert.ok(!s.eventLog.some((event) => event.type === "damage" && event.attackName === "火烧大地"));
});
check("imperial spirits consume their own quotas even when every counter is immune", () => {
  let s = fixture([["帝灵之境"], ["帝灵之境", "火烧大地"], []], 20);
  s = end(reveal(s, [gain, gain, gain])); s = submitActionWindowSkill(s, s.players[1]!.id, cast("火烧大地"));
  assert.equal(used(s, s.players[0]!.id, spirit), 1000); assert.equal(used(s, s.players[1]!.id, spirit), 1000);
  assert.equal(s.players[0]!.hp, 20); assert.equal(s.players[1]!.hp, 20);
  assert.equal(s.pendingDamageItems?.length ?? 0, 0); assert.equal(notices(s).length, 2);
});
check("imperial spirit's retained flame shares its quota without revealing the fusion in cap notices", () => {
  let s = fixture([["帝灵之境"], ["火烧大地"], []]);
  take(s, s.players[0]!.id, spirit, 999);
  s = end(reveal(s, [gain, { type: "attack", attackId: "sha", stacks: 1, targetId: s.players[0]!.id }, gain]));
  assert.equal(used(s, s.players[0]!.id, spirit), 1000); assert.equal(used(s, s.players[0]!.id, flame), 0);
  assert.equal(s.players[1]!.hp, 5);
  assert.ok(notices(s).every((event) => !event.message.includes("帝灵之境") && event.message.includes("帝炎之境")));
  s = submitActionWindowSkill(s, s.players[1]!.id, cast("火烧大地"));
  assert.equal(s.players[0]!.hp, 5); assert.equal(s.players[1]!.hp, 5);
});
check("an independent flame copy keeps its own quota beside an exhausted imperial spirit", () => {
  let s = fixture([["帝灵之境", "帝炎之境"], [], []]); take(s, s.players[0]!.id, spirit, 1000);
  s = end(reveal(s, [gain, { type: "attack", attackId: "sha", stacks: 1, targetId: s.players[0]!.id }, gain]));
  assert.equal(used(s, s.players[0]!.id, spirit), 1000); assert.equal(used(s, s.players[0]!.id, flame), 1);
  assert.equal(s.players[1]!.hp, 5);
});
check("revival does not restore an exhausted armor quota", () => {
  let s = fixture([["反伤刺甲", "治愈术"], ["反伤刺甲", "火球", "火烧大地"], []]);
  take(s, s.players[0]!.id, armor, 997);
  s = end(reveal(s, [gain, ball(s), gain]), true); assert.equal(s.activeTimingPhase, "revival_action");
  assert.equal(used(s, s.players[0]!.id, armor), 1000);
  s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("治愈术")));
  assert.equal(used(s, s.players[0]!.id, armor), 1000);
  const before = s.players[1]!.hp;
  s = submitActionWindowSkill(s, s.players[1]!.id, cast("火烧大地"));
  assert.equal(s.players[1]!.hp, before);
});
check("decomposition leaves the same skill's response count intact", () => {
  let s = fixture([["反伤刺甲"], [], []]); take(s, s.players[0]!.id, armor, 1000);
  s = end(reveal(s, [gain, gain, gain]));
  s = decomposeSkill(s, s.players[0]!.id, s.players[0]!.skillFusions![0]!.id);
  assert.equal(used(s, s.players[0]!.id, armor), 1000);
});
check("preemptive round rollback cannot rewind response counts", () => {
  let s = fixture([["沦陷"], [], []]); s = reveal(s, [gain, gain, gain]);
  take(s, s.players[0]!.id, flame, 1000); const turn = s.turnNumber;
  s = submitActionWindowSkill(s, s.players[0]!.id, cast("沦陷"));
  assert.equal(s.turnNumber, turn); assert.equal(used(s, s.players[0]!.id, flame), 1000);
});
check("round-end domain chains use the ending turn's quotas and pay domain healing once", () => {
  let s = fixture([["帝炎之境", "神隐红莲", "邪域"], ["帝炎之境", "神隐红莲"], []]);
  s = collect(s); s.roundNumber = 3; s.players[0]!.hp = 1; s.players[1]!.hp = 1;
  s.players[0]!.buffs.push({ id: "xieyu_target", name: "目标", stacks: 1, sourcePlayerId: s.players[1]!.id });
  s = end(reveal(s, [{ type: "attack", attackId: "sha", stacks: 1, targetId: s.players[2]!.id }, gain, gain]));
  const turn = s.turnNumber;
  for (let i = 0; s.turnNumber === turn && s.phase === "action_window" && i < 50; i++) s = advanceActionWindow(s);
  assert.equal(s.retaliationResponses?.turnNumber, turn);
  for (const player of s.players.slice(0, 2)) assert.equal(s.retaliationResponses?.counts[player.id]?.[flame], 1000);
  assert.equal(s.eventLog.filter((event) => event.type === "heal" && event.reason === "邪域").length, 1);
  assert.equal(s.turnNumber, turn + 1); assert.equal(s.roundNumber, 4);
});
console.log(`retaliation response checks: ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
