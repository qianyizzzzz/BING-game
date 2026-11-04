import assert from "node:assert/strict";
import {
  GameState, PlayerAction, SkillAction, FUSION_RECIPES, COMMON_FUSION_SKILL_ID, createId, createGame,
  createPlayer, addPlayerToGame, startGame, submitPlayerAction, submitActionWindowSkill, advanceActionWindow,
  getAllSkills, getFusionSkillId
} from "@bing/shared";

const skill = (name: string) => {
  const entry = getAllSkills().find((item) => item.name === name); assert.ok(entry, name); return entry.id;
};
const gain: PlayerAction = { type: "gain_cake" };
const cast = (name: string, extra: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId: skill(name), stacks: 1, ...extra });
function fixture(loadouts: string[][]): GameState {
  let s = createGame("A", { skillMode: "test_select", skillCount: 8, firstTurnNoAttack: false });
  for (let i = 1; i < loadouts.length; i++) s = addPlayerToGame(s, createPlayer(String.fromCharCode(65 + i)));
  s.players.forEach((player, index) => {
    player.skills = loadouts[index]!.flatMap((name) =>
      FUSION_RECIPES.find((recipe) => recipe.skill.name === name)?.materialOptions[0] ?? [skill(name)]);
  });
  s = startGame(s);
  for (let i = 0; i < loadouts.length; i++) for (const name of loadouts[i]!) {
    if (!FUSION_RECIPES.some((recipe) => recipe.skill.name === name)) continue;
    s = submitPlayerAction(s, s.players[i]!.id, { type: "skill", skillId: COMMON_FUSION_SKILL_ID, stacks: 1,
      targetSkillId: getFusionSkillId(name), fusionRequestId: createId("bagua_fusion") }).state;
  }
  s.players.forEach((player) => { player.hp = 30; player.cakes = 30; }); return s;
}
function reveal(s: GameState, actions: PlayerAction[] = []): GameState {
  for (let i = 0; s.phase === "action_window" && i < 100; i++) s = advanceActionWindow(s);
  assert.equal(s.phase, "collecting_actions");
  for (let i = 0; i < s.players.length; i++) s = submitPlayerAction(s, s.players[i]!.id, actions[i] ?? gain).state;
  return s;
}
function normal<T>(run: () => T): T {
  const previous = Math.random; Math.random = () => .99;
  try { return run(); } finally { Math.random = previous; }
}
function end(s: GameState): GameState {
  return normal(() => {
    for (let i = 0; s.phase === "action_window" && s.activeTimingPhase !== "turn_end_action" && i < 100; i++) s = advanceActionWindow(s);
    assert.equal(s.activeTimingPhase, "turn_end_action"); return s;
  });
}
const sha = (s: GameState, stacks = 4, target = 1): PlayerAction => ({ type: "attack", attackId: "sha", stacks, targetId: s.players[target]!.id });
let passed = 0; const failures: string[] = [];
function check(name: string, run: () => void) {
  try { run(); passed++; console.log(`ok - ${name}`); }
  catch (error) { failures.push(name); console.error(`not ok - ${name}\n${error instanceof Error ? error.stack : error}`); }
}

for (const [defenses, reduction] of [
  [["八卦阵"], 1], [["六芒星阵"], 2], [["六芒星阵", "八卦阵"], 3]
] as const) {
  const label = defenses.join("+");
  check(`${label}: ordinary attacks retain their reduction`, () => {
    let s = fixture([[], [...defenses], []]); s = end(reveal(s, [sha(s)]));
    assert.equal(s.players[1]!.hp, 30 - Math.max(0, 4 - reduction));
  });
  check(`${label}: fire-blade sha remains an attack`, () => {
    let s = fixture([["火焰刀"], [...defenses], []]); s = end(reveal(s, [sha(s, 1)]));
    assert.equal(s.players[1]!.hp, 30 - Math.max(0, 2 - reduction));
  });
  check(`${label}: lava-enhanced sha remains an attack`, () => {
    let s = fixture([["熔岩之怒"], [...defenses], []]);
    s.players[0]!.buffs.push({ id: "lava_mark", name: "熔岩", stacks: 1 });
    s = reveal(s, [sha(s, 3)]);
    s = submitActionWindowSkill(s, s.players[0]!.id, cast("熔岩之怒", { switchActionIndex: 0 }));
    s = end(s);
    assert.equal(s.players[1]!.hp, 30 - (4 - reduction));
    assert.ok(s.eventLog.some((event) => event.type === "damage" && event.targetId === s.players[1]!.id && event.elements?.includes("fire")));
  });
  check(`${label}: native fireball direct hit is still attack damage`, () => {
    let s = fixture([["火球"], [...defenses], []]);
    s = end(reveal(s, [cast("火球", { targetId: s.players[1]!.id })]));
    assert.equal(s.players[1]!.hp, 30 - (4 - reduction));
  });
  check(`${label}: burning-earth fire spell is not reduced`, () => {
    let s = end(reveal(fixture([["火烧大地"], [...defenses], []])));
    s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("火烧大地")));
    assert.equal(s.players[1]!.hp, 29);
  });
  check(`${label}: non-elemental spell is not reduced`, () => {
    let s = fixture([["净化之风"], [...defenses], []]); s.players[1]!.hp = 29;
    s = end(reveal(s)); s = end(submitActionWindowSkill(s, s.players[0]!.id, cast("净化之风")));
    assert.equal(s.players[1]!.hp, 28);
  });
  check(`${label}: fire retaliation is not reduced`, () => {
    let s = fixture([[...defenses], ["帝炎之境"], []]); s = end(reveal(s, [sha(s)]));
    assert.equal(s.players[0]!.hp, 29); assert.equal(s.players[1]!.hp, 26);
  });
  check(`${label}: fireball splash is spell damage even beside a direct attack`, () => {
    let s = fixture([["火球"], [...defenses], [...defenses], []]);
    s = end(reveal(s, [cast("火球", { targetId: s.players[1]!.id })]));
    assert.equal(s.players[1]!.hp, 30 - (4 - reduction));
    assert.equal(s.players[2]!.hp, 29);
  });
}
console.log(`bagua checks: ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
