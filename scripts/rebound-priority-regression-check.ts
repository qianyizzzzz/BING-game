import assert from "node:assert/strict";
import {
  GameState, PlayerAction, SkillAction, COMMON_FUSION_SKILL_ID, createGame, createPlayer, createId,
  addPlayerToGame, startGame, advanceActionWindow, submitPlayerAction, submitActionWindowSkill,
  getAllSkills, getSkill, getSkillCardIds, getActiveSkillCount, getFusionSkillId, decomposeSkill,
  applyAttackModifiers, getStackedAttackStats, BASE_ATTACKS, getReboundInteraction
} from "@bing/shared";

const skill = (name: string) => {
  const found = getAllSkills().find((entry) => entry.name === name);
  assert.ok(found, name);
  return found.id;
};
const gain = { type: "gain_cake" } as const;
type Source = "plain" | "eye" | "origin";
type Target = "plain" | "absolute" | "ball";
type Attack = "杀" | "核爆" | "超核爆" | "卷子" | "暴风雪" | "钟" | "火箭";
const normal: Partial<Record<Attack, "sha" | "he_bao" | "chao_he_bao">> = { 杀: "sha", 核爆: "he_bao", 超核爆: "chao_he_bao" };
function fuse(state: GameState, index: number, name: string): GameState {
  return submitPlayerAction(state, state.players[index]!.id, { type: "skill", skillId: COMMON_FUSION_SKILL_ID,
    stacks: 1, targetSkillId: getFusionSkillId(name), fusionRequestId: createId("request") }).state;
}
function fixture(source: Source, target: Target, attack: Attack = "杀", extra: string[] = []): GameState {
  let state = createGame("A", { firstTurnNoAttack: false, skillMode: "test_select", skillCount: 6 });
  for (const name of ["B", "C", "D"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.skills = [...new Set([...(source === "origin" ? ["烈弓", "火眼金睛"] : source === "eye" ? ["火眼金睛"] : []),
    ...(!normal[attack] ? [attack] : []), ...extra])].map(skill);
  state.players[1]!.skills = (target === "ball" ? ["绝弹", "散弹"] : target === "absolute" ? ["绝弹"] : []).map(skill);
  state.players[2]!.skills = [];
  state.players[3]!.skills = [skill("逆转")];
  state = startGame(state);
  if (source === "origin") state = fuse(state, 0, "根源之目");
  if (target === "ball") state = fuse(state, 1, "弹力球");
  for (const player of state.players) { player.hp = 40; player.cakes = 40; }
  return state;
}
function collecting(initial: GameState): GameState {
  let state = initial;
  for (let i = 0; state.phase === "action_window" && i < 40; i++) state = advanceActionWindow(state);
  assert.equal(state.phase, "collecting_actions");
  return state;
}
function actionFor(state: GameState, name: Attack): PlayerAction {
  return normal[name] ? { type: "attack", attackId: normal[name]!, stacks: 1, targetId: state.players[1]!.id } :
    { type: "skill", skillId: skill(name), stacks: 1, targetId: state.players[1]!.id };
}
function reveal(initial: GameState, action: PlayerAction, defender?: PlayerAction): GameState {
  let state = collecting(initial);
  const actions = [action, defender ?? { type: "defense", defense: "rebound", targetId: state.players[2]!.id }, gain, gain] as PlayerAction[];
  for (const [index, player] of state.players.entries()) state = submitPlayerAction(state, player.id, actions[index]!).state;
  assert.equal(state.activeTimingPhase, "turn_change_action");
  return state;
}
function end(initial: GameState): GameState {
  let state = initial;
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== "turn_end_action" && i < 40; i++) state = advanceActionWindow(state);
  assert.ok(state.phase === "finished" || state.activeTimingPhase === "turn_end_action");
  return state;
}
function observed(state: GameState): "pierced" | "blocked" | "reflected" {
  if (state.eventLog.some((event) => event.type === "rebound_broken")) return "pierced";
  if (state.eventLog.some((event) => event.type === "attack_reflected")) return "reflected";
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === state.players[1]!.id));
  return "blocked";
}
let passed = 0;
const failures: string[] = [];
function check(name: string, run: () => void) {
  try { run(); passed++; console.log(`ok - ${name}`); }
  catch (error) { failures.push(name); console.error(`not ok - ${name}\n${error instanceof Error ? error.stack : error}`); }
}

for (const source of ["plain", "eye", "origin"] as const) for (const target of ["plain", "absolute", "ball"] as const) {
  for (const attack of ["杀", "核爆", "超核爆", "卷子", "暴风雪", "钟", "火箭"] as const) {
    check(`${source} ${attack} vs ${target}`, () => {
      let state = fixture(source, target, attack);
      state = end(reveal(state, actionFor(state, attack)));
      const expected = source === "origin" ? "pierced" : source === "eye" ?
        target === "ball" ? attack === "杀" ? "reflected" : "blocked" : "pierced" :
        target !== "plain" ? "reflected" : attack === "杀" ? "reflected" : ["暴风雪", "钟"].includes(attack) ? "blocked" : "pierced";
      assert.equal(observed(state), expected);
      if (expected === "blocked") {
        assert.ok(state.players.every((player) => player.hp === 40 && player.status === "alive"));
        assert.ok(!state.players[0]!.buffs.some((buff) => buff.id === "jin_zhong_zhao"));
      }
    });
  }
}

check("v4 Eye wording is visible and both fusions preserve their material skills", () => {
  assert.ok(getSkill(skill("火眼金睛"))!.description.includes("无视绝弹"));
  const state = fixture("origin", "ball");
  assert.equal(getSkillCardIds(state.players[0]!).length, 1);
  assert.equal(getSkillCardIds(state.players[1]!).length, 1);
  for (const name of ["烈弓", "火眼金睛"]) assert.equal(getActiveSkillCount(state.players[0], skill(name)), 1);
  for (const name of ["绝弹", "散弹"]) assert.equal(getActiveSkillCount(state.players[1], skill(name)), 1);
});

check("decomposing Ball restores materials and Eye pierces their absolute rebound", () => {
  let state = fixture("eye", "ball", "钟");
  state = end(reveal(state, gain, gain));
  state = decomposeSkill(state, state.players[1]!.id, state.players[1]!.skillFusions![0]!.id);
  state = end(reveal(state, actionFor(state, "钟")));
  assert.equal(observed(state), "pierced");
  assert.equal(state.players[1]!.hp, 39);
});

check("decomposing Origin keeps Eye but loses the ability to bypass Ball", () => {
  let state = fixture("origin", "ball", "钟");
  state = end(reveal(state, gain, gain));
  state = decomposeSkill(state, state.players[0]!.id, state.players[0]!.skillFusions![0]!.id);
  state = end(reveal(state, actionFor(state, "钟")));
  assert.equal(observed(state), "blocked");
});

check("sealing Eye restores absolute rebound against an inherently piercing scroll", () => {
  let state = fixture("eye", "absolute", "卷子");
  state.players[0]!.buffs.push({ id: `sealed_skill:${skill("火眼金睛")}`, name: "封印", stacks: 1 });
  state = end(reveal(state, actionFor(state, "卷子")));
  assert.equal(observed(state), "reflected");
});

check("sealing Ball disables its added protection and covered materials", () => {
  let state = fixture("eye", "ball", "钟");
  state.players[1]!.buffs.push({ id: `sealed_skill:${getFusionSkillId("弹力球")}`, name: "封印", stacks: 1 });
  state = end(reveal(state, actionFor(state, "钟")));
  assert.equal(observed(state), "pierced");
});

check("sealing Origin disables both its new power and the covered Eye", () => {
  let state = fixture("origin", "ball", "卷子");
  state.players[0]!.buffs.push({ id: `sealed_skill:${getFusionSkillId("根源之目")}`, name: "封印", stacks: 1 });
  state = end(reveal(state, actionFor(state, "卷子")));
  assert.equal(observed(state), "reflected");
});

check("ordinary piercing does not acquire Eye's privilege against absolute rebound", () => {
  const state = fixture("plain", "absolute", "火箭");
  const stats = applyAttackModifiers(structuredClone(state), state.players[0]!.id, getStackedAttackStats(BASE_ATTACKS.he_bao, 1));
  assert.equal(stats.ignoreAbsoluteRebound, undefined);
  assert.equal(getReboundInteraction(state.players[1], stats), "reflected");
});

for (const source of ["eye", "origin"] as const) check(`${source} flags also apply to non-attack electric shock without adding attack damage`, () => {
  let state = fixture(source, "ball", "杀", ["电击法术", "酒"]);
  state = end(reveal(state, { type: "skill", skillId: skill("电击法术"), stacks: 1, targetIds: [state.players[1]!.id] }));
  assert.equal(state.players[1]!.hp, 40);
  const paralysis = state.players[1]!.buffs.some((buff) => buff.id.startsWith("paralysis_next_action:"));
  assert.equal(paralysis, source === "origin");
  assert.equal(observed(state), source === "origin" ? "pierced" : "blocked");
});

for (const source of ["eye", "origin"] as const) check(`reversal preserves the original ${source} privileges`, () => {
  let state = fixture(source, "plain", "卷子", ["绝弹", "散弹"]);
  state = fuse(state, 0, "弹力球");
  state = reveal(state, actionFor(state, "卷子"), { type: "defense", defense: "rebound", targetId: state.players[0]!.id });
  state = submitActionWindowSkill(state, state.players[3]!.id, { type: "skill", skillId: skill("逆转"), stacks: 1 });
  state = end(state);
  assert.ok(!state.eventLog.some((event) => event.type === "attack_reflected"));
  assert.equal(state.players[0]!.status, source === "origin" ? "dead" : "alive");
  if (source === "origin") assert.equal(state.players[0]!.defeatLevel, 2);
});

check("finite scatter copies continue through the next ordinary rebound", () => {
  let state = fixture("plain", "ball");
  state = reveal(state, actionFor(state, "杀"));
  state.pendingActions[state.players[2]!.id] = { actions: [{ type: "defense", defense: "rebound", targetId: state.players[3]!.id }] };
  state = end(state);
  assert.deepEqual(state.players.map((player) => player.hp), [39, 40, 40, 38]);
});

console.log(`rebound priority checks: ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
