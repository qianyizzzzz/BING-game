import assert from "node:assert/strict";
import {
  ActionSubmission, GameState, SkillAction, addPlayerToGame, advanceActionWindow,
  createGame, createPlayer, getAllSkills, getPlayerInitialHp, startGame,
  submitActionWindowSkill, submitPlayerAction
} from "@bing/shared";

const skill = (name: string) => {
  const found = getAllSkills().find((entry) => entry.name === name);
  assert.ok(found, `Missing skill: ${name}`);
  return found.id;
};
const cast = (name: string, extra: Partial<SkillAction> = {}): SkillAction =>
  ({ type: "skill", skillId: skill(name), stacks: 1, ...extra });
const gain = { type: "gain_cake" } as const;

function fixture(skills: string[][]): GameState {
  let state = createGame("A", { firstTurnNoAttack: false, skillMode: "test_select",
    skillCount: Math.max(1, ...skills.map((list) => list.length)) });
  for (let index = 1; index < skills.length; index++) state = addPlayerToGame(state, createPlayer(String.fromCharCode(65 + index)));
  state.players.forEach((player, index) => { player.skills = skills[index]!.map(skill); });
  return startGame(state);
}

function collecting(initial: GameState): GameState {
  let state = initial;
  for (let guard = 0; state.phase === "action_window" && guard < 40; guard++) state = advanceActionWindow(state);
  assert.equal(state.phase, "collecting_actions");
  return state;
}

function turn(initial: GameState, actions: ActionSubmission[]): GameState {
  let state = collecting(initial);
  for (const [index, player] of state.players.entries()) {
    state = submitPlayerAction(state, player.id, actions[index] ?? gain).state;
  }
  for (let guard = 0; state.phase === "action_window" && state.activeTimingPhase !== "turn_end_action" && guard < 40; guard++) {
    state = advanceActionWindow(state);
  }
  assert.ok(state.phase === "finished" || state.activeTimingPhase === "turn_end_action");
  return state;
}

let passed = 0;
const failures: string[] = [];
function check(name: string, run: () => void): void {
  try {
    run();
    passed++;
    console.log(`ok - ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`not ok - ${name}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

check("bailian counts an attack at nine HP with an eighteen-HP holy-bath baseline", () => {
  let state = fixture([["百炼成神", "沐浴圣光"], []]);
  assert.equal(getPlayerInitialHp(state.players[0]!), 18);
  state.players[0]!.hp = 9;
  state.players[0]!.cakes = 1;
  state = turn(state, [
    { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[1]!.id },
    { type: "defense", defense: "small" }
  ]);
  assert.equal(state.players[0]!.buffs.find((buff) => buff.id === "bailian_attack_count")?.stacks ?? 0, 1);
});

check("bailian uses the inclusive half-initial-HP threshold and keeps its 25-attack win condition", () => {
  for (const [baths, threshold] of [[0, 3], [1, 9], [2, 27]] as const) {
    for (const qualifies of [true, false]) {
      let state = fixture([["百炼成神", ...Array<string>(baths).fill("沐浴圣光")], []]);
      state.players[0]!.hp = threshold + (qualifies ? 0 : 1);
      state.players[0]!.cakes = 1;
      state.players[0]!.buffs.push({ id: "bailian_attack_count", name: "百炼攻击计数", stacks: 24 });
      state = turn(state, [
        { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[1]!.id },
        { type: "defense", defense: "small" }
      ]);
      assert.equal(state.players[0]!.buffs.find((buff) => buff.id === "bailian_attack_count")?.stacks, qualifies ? 25 : 24);
      assert.equal(state.winnerIds.includes(state.players[0]!.id), qualifies);
    }
  }
});

check("same fate cannot reuse round-interval damage in a later undamaged turn", () => {
  let state = fixture([["同生共死"], ["火烧大地"], []]);
  state = submitActionWindowSkill(state, state.players[1]!.id, cast("火烧大地"));
  assert.equal(state.players[0]!.hp, 5);
  assert.equal(state.roundNumber, 1);
  state = turn(state, [gain, gain, gain]);
  assert.equal(state.roundNumber, 1);
  const targetHp = state.players[1]!.hp;
  state = submitActionWindowSkill(state, state.players[0]!.id, cast("同生共死", { targetId: state.players[1]!.id }));
  assert.equal(state.players[1]!.hp, targetHp);
});

check("same fate uses only current-turn damage while coagulation's round history remains intact", () => {
  let state = fixture([["同生共死"], ["火烧大地"], []]);
  state = submitActionWindowSkill(state, state.players[1]!.id, cast("火烧大地"));
  state.players[1]!.cakes = 2;
  state = turn(state, [gain,
    { type: "attack", attackId: "sha", stacks: 2, targetId: state.players[0]!.id }, gain]);
  assert.equal(state.players[0]!.hp, 3);
  assert.equal(state.players[0]!.buffs.find((buff) => buff.id === "damage_taken_round:1")?.stacks, 3);
  state = submitActionWindowSkill(state, state.players[0]!.id, cast("同生共死", { targetId: state.players[1]!.id }));
  assert.equal(state.players[1]!.hp, 4);
  assert.equal(state.players[0]!.buffs.find((buff) => buff.id === "damage_taken_round:1")?.stacks, 3);
});

check("same fate totals multiple current-turn sources and cannot carry their damage into the next turn", () => {
  let state = fixture([["同生共死"], [], []]);
  state.players[1]!.cakes = 1;
  state.players[2]!.cakes = 2;
  state = turn(state, [gain,
    { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[0]!.id },
    { type: "attack", attackId: "sha", stacks: 2, targetId: state.players[0]!.id }]);
  state = submitActionWindowSkill(state, state.players[0]!.id, cast("同生共死", { targetId: state.players[1]!.id }));
  assert.equal(state.players[1]!.hp, 3);
  const oldTurn = state.turnNumber;
  state = turn(state, [gain, gain, gain]);
  assert.equal(state.turnNumber, oldTurn + 1);
  assert.ok(!state.players[0]!.buffs.some((buff) => buff.id === `damage_taken_turn:${oldTurn}`));
  state = submitActionWindowSkill(state, state.players[0]!.id, cast("同生共死", { targetId: state.players[2]!.id }));
  assert.equal(state.players[2]!.hp, 6);
  assert.equal(state.players[0]!.buffs.find((buff) => buff.id === `skill_used:${skill("同生共死")}`)?.stacks, 2);
});

check("zhong retains one shield for each of two distinct targets", () => {
  let state = fixture([["钟"], [], []]);
  state.players[0]!.cakes = 2;
  const targetIds = state.players.slice(1).map((player) => player.id);
  state = turn(state, [{ actions: targetIds.map((targetId) => cast("钟", { targetId })) }, gain, gain]);
  const shields = state.players[0]!.buffs.filter((buff) => buff.id === "jin_zhong_zhao");
  assert.deepEqual(shields.map((buff) => buff.sourcePlayerId).sort(), [...targetIds].sort());
  assert.ok(shields.every((buff) => buff.stacks === 1));
});

check("repeated zhong hits against the same target still grant only one shield", () => {
  let state = fixture([["钟"], [], []]);
  state.players[0]!.cakes = 2;
  state = turn(state, [cast("钟", { stacks: 2, targetId: state.players[1]!.id }), gain, gain]);
  state = collecting(state);
  state.players[0]!.cakes = 1;
  state = turn(state, [cast("钟", { targetId: state.players[1]!.id }), gain, gain]);
  const shields = state.players[0]!.buffs.filter((buff) => buff.id === "jin_zhong_zhao");
  assert.equal(shields.length, 1);
  assert.equal(shields[0]!.sourcePlayerId, state.players[1]!.id);
  assert.equal(shields[0]!.stacks, 1);
});

check("zhong shields are consumed only by their own target and each blocks one attack", () => {
  let state = fixture([["钟"], [], []]);
  state.players[0]!.cakes = 2;
  state = turn(state, [{ actions: state.players.slice(1).map((player) => cast("钟", { targetId: player.id })) }, gain, gain]);
  state = collecting(state);
  state.players[1]!.cakes = 1;
  state = turn(state, [gain,
    { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[0]!.id }, gain]);
  assert.equal(state.players[0]!.hp, 6);
  assert.deepEqual(state.players[0]!.buffs.filter((buff) => buff.id === "jin_zhong_zhao").map((buff) => buff.sourcePlayerId), [state.players[2]!.id]);
  state = collecting(state);
  state.players[1]!.cakes = 2;
  state.players[2]!.cakes = 1;
  state = turn(state, [gain,
    { type: "attack", attackId: "sha", stacks: 2, targetId: state.players[0]!.id },
    { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[0]!.id }]);
  assert.equal(state.players[0]!.hp, 4);
  assert.ok(!state.players[0]!.buffs.some((buff) => buff.id === "jin_zhong_zhao"));
  assert.equal(state.eventLog.filter((event) => event.type === "attack_blocked" && event.protectionName === "金钟罩").length, 2);
});

check("zhong can block two different attackers in the same turn without spending another owner's shield", () => {
  let state = fixture([["钟"], ["钟"], []]);
  state.players[0]!.cakes = 2;
  state.players[1]!.cakes = 1;
  state = turn(state, [{ actions: state.players.slice(1).map((player) => cast("钟", { targetId: player.id })) },
    cast("钟", { targetId: state.players[2]!.id }), gain]);
  const otherShields = structuredClone(state.players[1]!.buffs.filter((buff) => buff.id === "jin_zhong_zhao"));
  state = collecting(state);
  state.players[1]!.cakes = 1;
  state.players[2]!.cakes = 1;
  state = turn(state, [gain,
    { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[0]!.id },
    { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[0]!.id }]);
  assert.equal(state.players[0]!.hp, 6);
  assert.ok(!state.players[0]!.buffs.some((buff) => buff.id === "jin_zhong_zhao"));
  assert.deepEqual(state.players[1]!.buffs.filter((buff) => buff.id === "jin_zhong_zhao"), otherShields);
});

console.log(`skill scope checks: ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
