import assert from "node:assert/strict";
import {
  GameState, PlayerAction, ActionSubmission, SkillAction, COMMON_FUSION_SKILL_ID, createGame,
  addPlayerToGame, createPlayer, createId, startGame, getAllSkills, getFusionSkillId, submitPlayerAction,
  submitActionWindowSkill, advanceActionWindow, decomposeSkill, getAttackMarkCount,
  getAttackMarkChoices, previewPlayerAttackStats, getActiveSkillCount, toPublicGameState, reconcileSkillFusions
} from "@bing/shared";
import { chooseAiActionWindowSkill } from "../apps/server/src/ai";

const fusionId = getFusionSkillId("冰火狂暴曲");
const skill = (name: string) => getAllSkills().find((entry) => entry.name === name)!.id;
const gain = { type: "gain_cake" } as const;
function fixture(extra: string[] = [], fused = true): GameState {
  let state = createGame("A", { firstTurnNoAttack: false, skillMode: "test_select", skillCount: 2 + extra.length });
  for (const name of ["B", "C"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.skills = ["熔岩之怒", "凛冬之怒", ...extra].map(skill);
  state = startGame(state);
  for (const player of state.players) player.hp = 40;
  return fused ? fuse(state) : state;
}
function fuse(state: GameState): GameState {
  return submitPlayerAction(state, state.players[0]!.id, { type: "skill", skillId: COMMON_FUSION_SKILL_ID,
    stacks: 1, targetSkillId: fusionId, fusionRequestId: createId("request") }).state;
}
function collecting(initial: GameState): GameState {
  let state = initial;
  for (let i = 0; state.phase === "action_window" && i < 40; i++) state = advanceActionWindow(state);
  assert.equal(state.phase, "collecting_actions");
  return state;
}
function reveal(initial: GameState, submission: ActionSubmission, opponent: PlayerAction = gain): GameState {
  let state = collecting(initial);
  for (const player of state.players) player.cakes = 30;
  const waiting = state.players.map((player, index) => ({ player, index })).filter(({ player }) => !state.pendingActions[player.id]);
  for (const { index, player } of waiting) state = submitPlayerAction(state, player.id,
    index === 0 ? submission : index === 1 ? opponent : gain).state;
  assert.equal(state.activeTimingPhase, "turn_change_action");
  return state;
}
function end(initial: GameState): GameState {
  let state = initial;
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== "turn_end_action" && i < 40; i++) state = advanceActionWindow(state);
  assert.equal(state.activeTimingPhase, "turn_end_action");
  return state;
}
function mark(state: GameState, stacks = 3) {
  state.players[0]!.buffs.push({ id: "ice_fire_mark", name: "冰火印记", stacks,
    sourceFusionId: state.players[0]!.skillFusions![0]!.id, fusionMarkKind: "ice_fire" });
  return state;
}
function attack(state: GameState, targetIndex = 1): PlayerAction {
  return { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[targetIndex]!.id };
}
function cast(state: GameState, stacks = 1, index?: number, skillId = fusionId): GameState {
  return submitActionWindowSkill(state, state.players[0]!.id, { type: "skill", skillId, stacks,
    ...(index !== undefined ? { switchActionIndex: index } : {}) });
}
const stats = (state: GameState) => previewPlayerAttackStats(state, state.players[0]!.id).stats;
const count = (state: GameState) => getAttackMarkCount(state.players[0]!, fusionId);
const frozen = (state: GameState, index = 1) => state.players[index]!.buffs.find((buff) => buff.id === "frozen");
let passed = 0;
function check(name: string, run: () => void) { run(); passed++; console.log(`ok - ${name}`); }

check("fusion clears both old marks, pending enhancements and partial defense counters", () => {
  const before = fixture([], false);
  for (const id of ["lava_mark", "winter_mark", "stone_defense_count", "youtiao_defense_count", "pending_lava_mark:0:raw", "pending_winter_mark"])
    before.players[0]!.buffs.push({ id, name: id, stacks: 2 });
  before.players[0]!.buffs.push({ id: "unrelated", name: "其他状态", stacks: 1 });
  const snapshot = structuredClone(before);
  const after = fuse(before);
  assert.deepEqual(after.players[0]!.buffs.filter((buff) => !buff.id.startsWith("skill_activated:")).map((buff) => buff.id), ["unrelated"]);
  assert.deepEqual(before, snapshot, "input is immutable");
  assert.equal(count(after), 0);
  assert.equal(getActiveSkillCount(after.players[0], skill("熔岩之怒")), 0);
  assert.equal(getActiveSkillCount(after.players[0], skill("凛冬之怒")), 0);
});

check("small, oil and stone share one persistent three-defense counter", () => {
  let state = fixture();
  for (const [index, defense] of (["small", "youtiao", "stone"] as const).entries()) {
    state = end(reveal(state, { type: "defense", defense }));
    assert.equal(count(state), index === 2 ? 1 : 0);
  }
  assert.ok(!state.players[0]!.buffs.some((buff) => ["lava_mark", "winter_mark"].includes(buff.id)));
});

check("marks cap at three and spending does not lose partial defense progress", () => {
  let state = mark(fixture(), 3);
  for (let i = 0; i < 4; i++) state = end(reveal(state, { type: "defense", defense: "small" }));
  assert.equal(count(state), 3);
  assert.equal(state.players[0]!.buffs.find((buff) => buff.id.startsWith("ice_fire_defense_count:"))?.stacks, 1);
  state = cast(reveal(state, attack(state)), 3);
  state = end(state);
  for (let i = 0; i < 2; i++) state = end(reveal(state, { type: "defense", defense: "stone" }));
  assert.equal(count(state), 1);
});

check("paid midgame fusion clears marks without transferring progress", () => {
  let state = collecting(fixture([], false));
  state.players[0]!.buffs.push({ id: "lava_mark", name: "熔岩印记", stacks: 3 });
  state.players[0]!.buffs.push({ id: "stone_defense_count", name: "计数", stacks: 2 });
  state = reveal(state, { type: "skill", skillId: COMMON_FUSION_SKILL_ID, stacks: 1, targetSkillId: fusionId, fusionRequestId: createId("request") });
  assert.equal(state.players[0]!.cakes, 28);
  assert.equal(count(state), 0);
  assert.ok(!state.players[0]!.buffs.some((buff) => buff.id === "lava_mark" || buff.id === "stone_defense_count"));
});

check("selecting the second attack leaves the first unchanged in preview and settlement", () => {
  let state = mark(fixture());
  state = reveal(state, { actions: [attack(state), attack(state, 2)] });
  const original = structuredClone(state);
  state = cast(state, 2, 1);
  assert.equal(stats(state)[0]!.power, 1);
  assert.equal(stats(state)[1]!.power, 3);
  assert.equal(stats(state)[1]!.level, 3);
  assert.ok(stats(state)[1]!.elements?.includes("fire") && stats(state)[1]!.elements?.includes("ice"));
  assert.equal(count(state), 1);
  const beforePreview = structuredClone(state);
  stats(state); toPublicGameState(state, state.players[0]!.id);
  assert.deepEqual(state, beforePreview, "previews must not spend or consume twice");
  state = end(state);
  assert.equal(state.players[1]!.hp, 39);
  assert.equal(state.players[2]!.hp, 37);
  assert.equal(frozen(state, 1), undefined);
  assert.equal(frozen(state, 2)?.expiresAtTurn, state.turnNumber + 2);
  assert.equal(count(original), 3);
});

check("separate spends can strengthen different attacks", () => {
  let state = mark(fixture());
  state = reveal(state, { actions: [attack(state), attack(state, 2)] });
  state = cast(cast(state, 1, 0), 2, 1);
  state = end(state);
  assert.equal(state.players[1]!.hp, 38);
  assert.equal(state.players[2]!.hp, 37);
  assert.equal(frozen(state, 1)?.stacks, 1);
  assert.equal(frozen(state, 2)?.stacks, 2);
  assert.equal(count(state), 0);
});

check("repeated spends on one attack accumulate instead of overwriting", () => {
  let state = mark(fixture());
  state = reveal(state, attack(state));
  state = cast(cast(state, 1), 2);
  assert.equal(stats(state)[0]!.power, 4);
  state = end(state);
  assert.equal(state.players[1]!.hp, 36);
  assert.equal(frozen(state)?.stacks, 3);
});

check("area attack copies both elements and freeze to each hit target", () => {
  let state = mark(fixture());
  state = reveal(state, { type: "attack", attackId: "wan_jian", stacks: 1 });
  state = end(cast(state, 2, 0));
  assert.equal(state.players[1]!.hp, 36);
  assert.equal(state.players[2]!.hp, 36);
  assert.equal(frozen(state, 1)?.stacks, 2);
  assert.equal(frozen(state, 2)?.stacks, 2);
});

check("mark attack selection rejects omissions, invalid slots, and non-attack plans atomically", () => {
  let state = mark(fixture());
  state = reveal(state, { actions: [attack(state), attack(state, 2)] });
  assert.throws(() => cast(state), /请选择/);
  for (const index of [-1, 2, 0.5, NaN, Infinity]) assert.throws(() => cast(state, 1, index), /自己本回合/);
  assert.equal(count(state), 3);
  const noAttack = reveal(mark(fixture()), gain);
  assert.throws(() => cast(noAttack), /没有.*攻击/);
  assert.equal(getAttackMarkChoices(noAttack, noAttack.players[0]!.id).length, 0);
  assert.throws(() => cast(state, 4, 0), /重数/);
});

check("cannot use marks outside turn-change or spend more than available", () => {
  let state = fixture();
  state = reveal(state, attack(state));
  assert.throws(() => cast(state), /印记不足/);
  state = mark(state, 1);
  assert.throws(() => cast(state, 2), /印记不足/);
  state = end(state);
  assert.throws(() => cast(state), /当前阶段/);
});

for (const name of ["熔岩之怒", "凛冬之怒"]) check(`${name} also supports selecting the second attack`, () => {
  let state = fixture([], false);
  const id = name === "熔岩之怒" ? "lava_mark" : "winter_mark";
  state.players[0]!.buffs.push({ id, name, stacks: 1 });
  state = reveal(state, { actions: [attack(state), attack(state, 2)] });
  state = cast(state, 1, 1, skill(name));
  assert.equal(stats(state)[0]!.power, 1);
  assert.equal(stats(state)[1]!.power, name === "熔岩之怒" ? 2 : 0);
  assert.equal(stats(state)[1]!.level, 2);
  state = end(state);
  assert.equal(state.players[1]!.hp, 39);
  assert.equal(state.players[2]!.hp, name === "熔岩之怒" ? 38 : 40);
});

check("fire immunity blocks both damage and freeze of the dual-attribute attack", () => {
  let state = mark(fixture());
  state.players[1]!.skills = [skill("圣灵之境")];
  state = reveal(state, attack(state));
  state = end(cast(state, 2));
  assert.equal(state.players[1]!.hp, 40);
  assert.equal(frozen(state), undefined);
});

check("negative immunity prevents freeze but still takes attack damage", () => {
  let state = mark(fixture());
  state = reveal(state, attack(state));
  state.players[1]!.buffs.push({ id: "temp_negative_status_immunity", name: "免疫不良", stacks: 1, expiresAtTurn: state.turnNumber });
  state = end(cast(state, 2));
  assert.equal(state.players[1]!.hp, 37);
  assert.equal(frozen(state), undefined);
});

check("successful defense prevents damage and on-hit freeze", () => {
  let state = mark(fixture(), 1);
  state = reveal(state, attack(state), { type: "defense", defense: "small" });
  state = end(cast(state));
  assert.equal(state.players[1]!.hp, 40);
  assert.equal(frozen(state), undefined);
});

check("decomposition clears only its own ice-fire marks and counters, and refusion starts empty", () => {
  let state = mark(fixture());
  state = end(reveal(state, { type: "defense", defense: "small" }));
  state.players[0]!.buffs.push({ id: "lava_mark", name: "其他熔岩印记", stacks: 2, sourceFusionId: "other" });
  state = decomposeSkill(state, state.players[0]!.id, state.players[0]!.skillFusions![0]!.id);
  assert.equal(count(state), 0);
  assert.ok(!state.players[0]!.buffs.some((buff) => buff.fusionMarkKind === "ice_fire"));
  assert.equal(state.players[0]!.buffs.find((buff) => buff.id === "lava_mark")?.stacks, 2);
  assert.equal(getActiveSkillCount(state.players[0], skill("熔岩之怒")), 1);
  state = reveal(state, { type: "skill", skillId: COMMON_FUSION_SKILL_ID, stacks: 1, targetSkillId: fusionId, fusionRequestId: createId("request") });
  assert.equal(count(state), 0);
  assert.ok(!state.players[0]!.buffs.some((buff) => buff.id.startsWith("ice_fire_defense_count:")));
});

check("removal of a material also cleans marks of the removed fusion", () => {
  const state = mark(fixture());
  state.players[0]!.skills.splice(0, 1);
  reconcileSkillFusions(state.players[0]!);
  assert.equal(state.players[0]!.skillFusions?.length, 0);
  assert.ok(!state.players[0]!.buffs.some((buff) => buff.fusionMarkKind === "ice_fire"));
});

check("AI uses a valid own attack selection and stops after spending marks", () => {
  let state = mark(fixture());
  state = reveal(state, { actions: [attack(state), attack(state, 2)] });
  for (let i = 0; i < 4; i++) {
    const choice = chooseAiActionWindowSkill(state, state.players[0]!.id);
    if (!choice) break;
    assert.equal(choice.skillId, fusionId);
    assert.ok([0, 1].includes(choice.switchActionIndex!));
    state = submitActionWindowSkill(state, state.players[0]!.id, choice);
  }
  assert.equal(count(state), 0);
  assert.equal(chooseAiActionWindowSkill(state, state.players[0]!.id), undefined);
});

check("a skill attack can be selected independently from a regular attack", () => {
  let state = mark(fixture(["火箭"]));
  state = reveal(state, { actions: [attack(state), { type: "skill", skillId: skill("火箭"), stacks: 1, targetId: state.players[2]!.id }] });
  const original = stats(state)[1]!.power;
  state = cast(state, 1, 1);
  assert.equal(stats(state)[0]!.power, 1);
  assert.equal(stats(state)[1]!.power, original + 1);
  state = end(state);
  assert.equal(state.players[2]!.hp, 40 - original - 1);
  assert.equal(frozen(state, 2)?.stacks, 1);
});

check("freeze blocks exactly the next x turns and then allows normal submission", () => {
  let state = mark(fixture());
  state = end(cast(reveal(state, attack(state)), 2));
  for (let i = 0; i < 2; i++) {
    state = collecting(state);
    assert.deepEqual(state.pendingActions[state.players[1]!.id], { actions: [] });
    state = end(reveal(state, { type: "defense", defense: "small" }));
  }
  state = collecting(state);
  assert.equal(state.pendingActions[state.players[1]!.id], undefined);
  assert.doesNotThrow(() => submitPlayerAction(state, state.players[1]!.id, gain));
});

check("decomposing one of two copies preserves the other copy's marks and progress", () => {
  let state = fuse(mark(fixture(["熔岩之怒", "凛冬之怒"])));
  const second = state.players[0]!.skillFusions![1]!;
  state.players[0]!.buffs.push({ id: "ice_fire_mark", name: "冰火印记", stacks: 2, sourceFusionId: second.id, fusionMarkKind: "ice_fire" });
  state = end(reveal(state, { type: "defense", defense: "stone" }));
  state = decomposeSkill(state, state.players[0]!.id, state.players[0]!.skillFusions![0]!.id);
  assert.equal(count(state), 2);
  assert.equal(state.players[0]!.buffs.find((buff) => buff.id === `ice_fire_defense_count:${second.id}`)?.stacks, 1);
});

check("sealed or disabled fusion cannot grant or apply mark enhancements", () => {
  let state = mark(fixture());
  state = cast(reveal(state, attack(state)), 2);
  state.players[0]!.buffs.push({ id: `sealed_skill:${fusionId}`, name: "封印", stacks: 1 });
  assert.equal(stats(state)[0]!.power, 1);
  state = end(state);
  assert.equal(state.players[1]!.hp, 39);
  assert.equal(frozen(state), undefined);
  state = end(reveal(state, { type: "defense", defense: "stone" }));
  assert.ok(!state.players[0]!.buffs.some((buff) => buff.id.startsWith("ice_fire_defense_count:")));
});

console.log(`ice-fire regression checks passed: ${passed}`);
