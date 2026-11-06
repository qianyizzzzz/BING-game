import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ACTION_PROMPT_SECONDS, ACTION_WINDOW_SECONDS, SKILL_PREPARATION_SECONDS, ACTION_WINDOW_PHASES,
  GameState, SkillMode, addPlayerToGame, addSpectatorToGame, beginActionPrompt, beginBasicTurnAction,
  createGame, createPlayer, createRoomPreset, enterActionWindow, getAllSkills, getBigCard, getBigCards,
  getCurrentTurnLimitSeconds, getRandomBigCardIds, passActionWindow, startGame, toPublicGameState, validateAction
} from "@bing/shared";
import { RoomStore } from "../apps/server/src/roomStore";
import { MatchRecorder } from "../apps/server/src/matchRecorder";

function fixture(mode: SkillMode, count = 2): GameState {
  let state = createGame("A", { skillMode: mode, skillCount: count, turnTimeLimitSeconds: 75 });
  state = addPlayerToGame(state, createPlayer("B"));
  return addSpectatorToGame(state, createPlayer("观战", "spectator"));
}
function deadlineWithin(deadline: number | undefined, seconds: number) {
  assert.ok(deadline && deadline - Date.now() <= seconds * 1000 && deadline - Date.now() > seconds * 1000 - 1500,
    `Expected ${seconds}s, actual ${deadline ? deadline - Date.now() : "missing"}ms`);
}
let passed = 0;
function check(name: string, run: () => void) { run(); passed++; console.log(`ok - ${name}`); }

check("catalog retains all parent-child IDs and exact inherited description", () => {
  assert.equal(getBigCards().length, 246);
  assert.equal(getBigCards().reduce((n, card) => n + card.abilities.length, 0), 1716);
  assert.equal(new Set(getBigCards().flatMap((card) => card.abilities.map((ability) => ability.id))).size, 1716);
  assert.equal(getBigCard("10501")!.abilities[2]!.id, "1050103");
  assert.equal(getBigCard("10501")!.abilities[2]!.description, "你拥有天火之狱，炽焰，无视消除火系类技能。");
  assert.equal(getBigCard("20813")!.name, "缄默•魂之虹彩");
  assert.equal(getBigCard("20920")!.name, "千秋红尘录");
  assert.equal(getRandomBigCardIds().length, 202);
  assert.deepEqual(getBigCards().filter((card) => card.implemented).map(({ id }) => id),
    ["10501", "10502", "10503", "10504", "10505", "10506", "10507", "10508"]);
  assert.ok(!getAllSkills({ includeFusions: true }).some((skill) => /^\d{5,7}$/.test(skill.id)));
});

check("random mode deals only native big cards, no small skills or spectator cards", () => {
  const state = startGame(fixture("big_random", 6));
  for (const player of state.players.slice(0, 2)) {
    assert.equal(player.bigCards?.length, 6);
    assert.equal(new Set(player.bigCards!.map((card) => card.cardId)).size, 6);
    assert.ok(player.bigCards!.every((card) => getBigCard(card.cardId)?.kind === "native"));
    const fireCards = player.bigCards!.filter((card) => card.cardId === "10501").length;
    const lightCards = player.bigCards!.filter((card) => card.cardId === "10502").length;
    const iceCards = player.bigCards!.filter((card) => card.cardId === "10503").length;
    const cannonCards = player.bigCards!.filter((card) => card.cardId === "10504").length;
    const peekCards = player.bigCards!.filter((card) => card.cardId === "10505").length;
    const starCards = player.bigCards!.filter((card) => card.cardId === "10506").length;
    const dragonCards = player.bigCards!.filter((card) => card.cardId === "10507").length;
    const verdictCards = player.bigCards!.filter((card) => card.cardId === "10508").length;
    assert.equal(player.skills.length, fireCards * 6 + lightCards * 5 + iceCards * 9 + cannonCards * 5 + peekCards * 8 + starCards * 5 + dragonCards * 6 + verdictCards * 4);
  }
  assert.deepEqual(state.players[2]!.bigCards, []);
  assert.equal(new Set(state.players.flatMap((player) => player.bigCards!.map((card) => card.instanceId))).size, 12);
  assert.ok(state.eventLog.some((event) => event.type === "system" && event.message.includes("大卡10501至10508已实现")));
});

for (const mode of ["big_random", "big_test_select"] as const) {
  check(`${mode}: every prompt, preparation, active action window and turn lasts 300 seconds`, () => {
    let state = startGame(fixture(mode));
    deadlineWithin(state.actionWindowDeadlineAt, 300);
    for (const phase of ACTION_WINDOW_PHASES) {
      beginActionPrompt(state, phase, { promptSeconds: 1 });
      deadlineWithin(state.actionWindowDeadlineAt, 300);
      state = enterActionWindow(state, state.players[0]!.id);
      deadlineWithin(state.actionWindowDeadlineAt, 300);
    }
    beginBasicTurnAction(state);
    deadlineWithin(state.turnDeadlineAt, 300);
    assert.equal(getCurrentTurnLimitSeconds(state), 300);
    assert.equal(state.config.turnTimeLimitSeconds, 75, "Preserve the old-mode timer preference");
    assert.equal(validateAction(state, state.players[0]!.id, { type: "skill", skillId: "10501", stacks: 1 }).ok, false);
    assert.equal(validateAction(state, state.players[0]!.id, { type: "skill", skillId: "1050101", stacks: 1 }).ok, false);
  });
}

check("specified cards persist; opponents and spectators receive counts without private card IDs", () => {
  let state = fixture("big_test_select");
  state.players[0]!.bigCards = [{ instanceId: "one", cardId: "10501" }, { instanceId: "two", cardId: "20920" }];
  state.players[1]!.bigCards = [{ instanceId: "three", cardId: "20813" }];
  assert.equal(toPublicGameState(state, state.players[1]!.id).players[0]!.bigCards!.length, 2, "test lobby is shared");
  state = startGame(state);
  const own = toPublicGameState(state, state.players[0]!.id);
  assert.deepEqual(own.players[0]!.bigCards, state.players[0]!.bigCards);
  assert.deepEqual(own.players[1]!.bigCards, []);
  assert.equal(own.players[1]!.bigCardSlotCount, 1);
  const observer = toPublicGameState(state, state.players[2]!.id);
  assert.ok(observer.players.every((player) => !player.bigCards?.length));
  assert.equal(observer.players[0]!.bigCardSlotCount, 2);
  assert.equal(state.players[0]!.skills.length, 6, "Fentian grants both real inherited fusions after dealing");
  assert.equal(getBigCard("10501")!.implementationStatus, "implemented");
  assert.equal(getBigCard("10502")!.implementationStatus, "implemented");
  assert.equal(getBigCard("10503")!.implementationStatus, "implemented");
  for (let i = 0; state.phase === "action_window" && i < 12; i++) {
    for (const player of state.players.slice(0, 2)) if (state.phase === "action_window") state = passActionWindow(state, player.id);
  }
  assert.equal(state.phase, "collecting_actions");
  deadlineWithin(state.turnDeadlineAt, 300);
});

check("all three old modes preserve timing, allocation and public state without big-card fields", () => {
  for (const mode of ["none", "small_intro", "test_select"] as const) {
    let state = fixture(mode, mode === "none" ? 0 : 2);
    const existing = getAllSkills().find((skill) => skill.implemented && !skill.fusion)!;
    if (mode === "test_select") state.players[0]!.skills = [existing.id];
    state.players[0]!.bigCards = [{ instanceId: "injected", cardId: "10501" }];
    assert.ok(!("bigCards" in toPublicGameState(state, state.players[0]!.id).players[0]!));
    state = startGame(state);
    assert.ok(state.players.every((player) => player.bigCards === undefined));
    if (mode === "small_intro") assert.equal(state.players[0]!.skills.length, 2);
    if (mode === "test_select") assert.deepEqual(state.players[0]!.skills, [existing.id]);
    if (mode !== "none") deadlineWithin(state.actionWindowDeadlineAt, SKILL_PREPARATION_SECONDS);
    beginActionPrompt(state, "turn_before_action");
    deadlineWithin(state.actionWindowDeadlineAt, ACTION_PROMPT_SECONDS);
    state = enterActionWindow(state, state.players[0]!.id);
    deadlineWithin(state.actionWindowDeadlineAt, ACTION_WINDOW_SECONDS);
    beginBasicTurnAction(state);
    deadlineWithin(state.turnDeadlineAt, 75);
  }
});

check("server validates mode-specific selections, permissions, count changes, switching and resume", () => {
  const directory = path.resolve(`data-test/big-card-rules-${Date.now()}`);
  const store = new RoomStore(new MatchRecorder(directory));
  const { state: room, player: host } = store.createRoom("Host");
  const guest = store.joinRoom(room.id, "Guest").player;
  const ai = store.addAi(room.id).players.find((player) => player.kind === "ai")!;
  const observer = store.spectateRoom(room.id, "Observer").player;
  let state = store.updateSettings(room.id, host.id, { skillMode: "big_test_select", skillCount: 6, turnTimeLimitSeconds: 75 });
  assert.equal(state.config.skillMode, "big_test_select");
  assert.equal(state.config.skillCount, 6);
  const small = getAllSkills().find((skill) => skill.implemented && !skill.fusion)!.id;
  state = store.updatePlayerSkills(room.id, host.id, host.id, [small, "10501", "1050101", "20920", "10501"]);
  assert.deepEqual(state.players[0]!.bigCards!.map((card) => card.cardId), ["10501", "20920", "10501"]);
  assert.equal(new Set(state.players[0]!.bigCards!.map((card) => card.instanceId)).size, 3);
  store.updatePlayerSkills(room.id, guest.id, guest.id, ["20813"]);
  assert.throws(() => store.updatePlayerSkills(room.id, guest.id, host.id, ["10501"]), /自己/);
  assert.throws(() => store.updatePlayerSkills(room.id, guest.id, ai.id, ["10501"]), /房主/);
  assert.throws(() => store.updatePlayerSkills(room.id, observer.id, observer.id, ["10501"]), /观战/);
  store.updatePlayerSkills(room.id, host.id, ai.id, ["10502"]);
  state = store.updateSettings(room.id, host.id, { skillCount: 2 });
  assert.equal(state.players[0]!.bigCards!.length, 2);
  assert.deepEqual(store.resumePlayer(room.id, host.id).player.bigCards, state.players[0]!.bigCards);
  state = store.updateSettings(room.id, host.id, { skillMode: "test_select" });
  assert.equal(state.config.turnTimeLimitSeconds, 75);
  assert.ok(state.players.every((player) => player.bigCards === undefined));
  state = store.updatePlayerSkills(room.id, host.id, host.id, ["10501", small]);
  assert.deepEqual(state.players[0]!.skills, [small]);
  state = store.updateSettings(room.id, host.id, { skillMode: "big_random", skillCount: 3 });
  assert.ok(state.players.every((player) => player.skills.length === 0));
  assert.throws(() => store.updatePlayerSkills(room.id, host.id, host.id, ["10501"]), /测试自选/);
  state = store.start(room.id, host.id);
  deadlineWithin(state.actionWindowDeadlineAt, 300);
  assert.equal(state.players[0]!.bigCards!.length, 3);
  assert.ok(!store.publicState(room.id, guest.id).players[0]!.bigCards!.length);
  assert.throws(() => store.updateSettings(room.id, host.id, { skillMode: "none" }), /开始后/);
  fs.writeFileSync(path.join(directory, "result.json"), JSON.stringify({ passed: true }));
});

check("room preset restores the host and AI seats without replacing the guest's choices", () => {
  const directory = path.resolve(`data-test/room-preset-${Date.now()}`);
  const store = new RoomStore(new MatchRecorder(directory));
  const { state: room, player: host } = store.createRoom("Host");
  const guest = store.joinRoom(room.id, "Guest").player;
  const ai = store.addAi(room.id).players.find((player) => player.kind === "ai")!;
  store.updateSettings(room.id, host.id, { skillMode: "big_test_select", skillCount: 2, turnTimeLimitSeconds: 73 });
  store.updatePlayerSkills(room.id, host.id, host.id, ["10502"]);
  store.updatePlayerSkills(room.id, guest.id, guest.id, ["10507"]);
  store.updatePlayerSkills(room.id, host.id, ai.id, ["10503"]);
  const preset = createRoomPreset(store.publicState(room.id, host.id));
  const file = JSON.stringify(preset);
  assert.ok(!file.includes(guest.id) && !file.includes("10507") && !file.includes(room.id));
  assert.deepEqual(preset.aiSkills, [["10503"]]);
  store.addAi(room.id);
  store.updatePlayerSkills(room.id, host.id, host.id, ["10508"]);
  assert.throws(() => store.loadPreset(room.id, guest.id, preset), /只有房主/);
  assert.throws(() => store.loadPreset(room.id, host.id, { ...preset, aiSkills: [[], [], [], [], []] }), /座位/);
  assert.throws(() => store.loadPreset(room.id, host.id, {
    ...preset, config: { ...preset.config, skillMode: "small_intro" }, ownerSkills: [], aiSkills: [[]]
  }), /现有选择冲突/);
  const state = store.loadPreset(room.id, host.id, JSON.parse(file));
  assert.equal(state.config.turnTimeLimitSeconds, 73);
  assert.deepEqual(state.players.filter((player) => player.kind === "ai").map((player) => player.id), [ai.id]);
  assert.deepEqual(state.players.map((player) => player.bigCards?.map((card) => card.cardId)), [["10502"], ["10507"], ["10503"]]);
  store.start(room.id, host.id);
  assert.throws(() => store.loadPreset(room.id, host.id, preset), /开局前/);
});

check("implemented descriptions and private status counters are available to the card holder", () => {
  assert.match(getBigCard("10508")!.abilities[0]!.implementedRules!, /石头、剪刀或布/);
  const state = startGame(fixture("big_test_select"));
  const owner = state.players[0]!;
  owner.bigCards = [{ cardId: "10508", instanceId: "verdict", verdictProgress: { wins: 2, losses: 1, streak: 2 } }];
  owner.buffs.push(
    { id: "element:星", name: "星", stacks: 2, stateType: "element_resource" },
    { id: "defense_value", name: "防御值", stacks: 3 },
    { id: "ice_rain:attacker", name: "冰雨", stacks: 4 },
    { id: "trauma_converge:4", name: "创伤聚合", stacks: 2 }
  );
  const own = toPublicGameState(state, owner.id).statusOverview!;
  assert.deepEqual(own.elements, [{ label: "星", value: "2" }]);
  assert.deepEqual(own.defense[0], { label: "防御值", value: "3" });
  assert.deepEqual(own.marks, [{ label: "冰雨", value: "4" }]);
  assert.match(own.longTerm[0]!.value, /剩 3 轮/);
  assert.match(own.cardCounters.verdict!["1050803"]![0]!, /2 胜 \/ 1 负 · 2 连胜/);
  assert.ok(!toPublicGameState(state, state.players[1]!.id).statusOverview?.cardCounters.verdict);
});

console.log(`Big-card mode checks passed: ${passed}`);
