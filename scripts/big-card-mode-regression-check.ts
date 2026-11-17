import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ACTION_PROMPT_SECONDS, ACTION_WINDOW_SECONDS, SKILL_PREPARATION_SECONDS, ACTION_WINDOW_PHASES,
  CHEAT_CARD_ID, CHEAT_NOGLUES_ID, CHEAT_SHARP_BONUS, CHEAT_SHARP_ID, CHEAT_SHARP_STOCK, CHEAT_TRANSFER_ID,
  GameState, SkillMode, addPlayerToGame, addSpectatorToGame, beginActionPrompt, beginBasicTurnAction,
  createGame, createPlayer, createRoomPreset, enterActionWindow, getAllSkills, getBigCard, getBigCards, getSkill,
  readSkillRecordJson,
  getCurrentTurnLimitSeconds, getRandomBigCardIds, KARMA_CYCLE_ID, passActionWindow, startGame, toPublicGameState, validateAction
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
  assert.equal(getBigCards().reduce((n, card) => n + card.abilities.length, 0), 1717);
  assert.equal(new Set(getBigCards().flatMap((card) => card.abilities.map((ability) => ability.id))).size, 1717);
  assert.equal(getBigCard("10501")!.abilities[2]!.id, "1050103");
  assert.equal(getBigCard("10501")!.abilities[2]!.description, "你拥有天火之狱，炽焰，无视消除火系类技能。");
  assert.doesNotMatch(getBigCard("10502")!.abilities[1]!.description, /灼日之矢/);
  assert.doesNotMatch(getBigCard("10503")!.abilities[3]!.description, /先制/);
  assert.equal(getBigCard("20813")!.name, "缄默•魂之虹彩");
  assert.equal(getBigCard("20920")!.name, "千秋红尘录");
  assert.equal(getBigCard("10527")!.name, "亡·魂契渡灵");
  assert.equal(getRandomBigCardIds().length, 202);
  assert.deepEqual(getBigCards().filter((card) => card.implemented).map(({ id }) => id),
    ["10501", "10502", "10503", "10504", "10505", "10506", "10507", "10508", "10509", "10510", "10511", "10512", "10513", "10514", "10515", "10516", "10517", "10518", "10519", "10520", "10521", "10522", "10523", "10524", "10525", "10526", "10527", "10528", "10529", "10530", "10531", "10532", "10533", "10534", "10535", "10537", "10538", "10540", "10541", "10542", "10543", "10544", "10545", "10546", "10547", "10548", "10549", "10550", "10551", "10552", "10553", "10554", "10555", "10556", "10557", "10558", "10559", "10560", "10601", "10602", "10603", "10604", "10605", "10606", "10607", "10608", "10609", "10610", "10611", "10612", "10613", "10614", "10615", "10616", "10617"]);
  assert.equal(getBigCard("10601")!.implementationStatus, "partial");
  assert.equal(getBigCard("10602")!.implementationStatus, "implemented");
  assert.equal(getBigCard("10534")!.implementationStatus, "implemented");
  assert.ok(!getSkill("1053202")!.typeTags.includes("限定技"));
  assert.deepEqual(getBigCard("10815")!.abilities.find(({ id }) => id === "1081503")!.typeTags, []);
  assert.ok(!getAllSkills({ includeFusions: true }).some((skill) => /^\d{5,7}$/.test(skill.id)));
});

check("命宇轮回 hides unexposed card identities and keeps replacement decisions private", () => {
  let state = fixture("big_test_select", 3);
  const [caster, opponent, spectator] = state.players;
  state.players[0]!.bigCards = [{ instanceId: "karma", cardId: "10602" }];
  state.players[1]!.bigCards = [
    { instanceId: "hidden", cardId: "10501" },
    { instanceId: "revealed", cardId: "10502", publiclyRevealed: true },
    { instanceId: "ability", cardId: "10503", onlyAbilityId: "1050301" }
  ];
  state = startGame(state);
  state.players[0]!.karmaReincarnation = true;
  state.phase = "collecting_actions";
  state.players[1]!.bigCards!.find((card) => card.instanceId === "revealed")!.publiclyRevealed = true;
  const owner = toPublicGameState(state, caster!.id);
  assert.ok(owner.karmaReplacementIds!.includes("10504"));
  assert.deepEqual(owner.karmaCardChoices, [
    { playerId: opponent!.id, instanceId: "hidden", number: 1 },
    { playerId: opponent!.id, instanceId: "revealed", number: 2, visibleCardId: "10502" }
  ]);
  assert.equal(toPublicGameState(state, opponent!.id).karmaCardChoices, undefined);
  const changes = [{ cardInstanceId: "hidden", replacementCardId: "10504" }];
  state.pendingActions[caster!.id] = { actions: [{ type: "skill", skillId: KARMA_CYCLE_ID, stacks: 1, karmaCardChanges: changes }] };
  state.turnResolutionStarted = true;
  for (const viewer of [opponent, spectator]) {
    const move = toPublicGameState(state, viewer!.id).revealedActions![caster!.id]!.actions[0]!;
    assert.ok(!("karmaCardChanges" in move));
  }
  const seenByCaster = toPublicGameState(state, caster!.id).revealedActions![caster!.id]!.actions[0]!;
  assert.ok(seenByCaster.type === "skill" && seenByCaster.skillId === KARMA_CYCLE_ID);
  assert.deepEqual(seenByCaster.karmaCardChanges, changes);
});

check("游戏开挂服务器 sends hidden card picks and transfer choices only to their owner", () => {
  let state = fixture("big_test_select", 3);
  const [caster, opponent, spectator] = state.players;
  caster!.bigCards = [{ instanceId: "cheat", cardId: CHEAT_CARD_ID }];
  opponent!.bigCards = [
    { instanceId: "hidden-cheat-choice", cardId: "10501" },
    { instanceId: "public-cheat-choice", cardId: "10502", publiclyRevealed: true },
    { instanceId: "child-cheat-choice", cardId: "10503", onlyAbilityId: "1050301" }
  ];
  state = startGame(state);
  state.phase = "collecting_actions";
  const active = state.players[0]!;
  active.buffs.push({ id: CHEAT_SHARP_BONUS, name: "Sharpandshiny", stacks: 1 },
    { id: CHEAT_SHARP_STOCK, name: "Sharpandshiny·法伤机会", stacks: 2 },
    { id: "limited_use_balance:1092", name: "次数变更", stacks: 1 });
  state.players[1]!.bigCards!.find(({ instanceId }) => instanceId === "public-cheat-choice")!.publiclyRevealed = true;
  const owner = toPublicGameState(state, active.id);
  assert.deepEqual(owner.cheatCardChoices, [
    { playerId: opponent!.id, instanceId: "hidden-cheat-choice", number: 1 },
    { playerId: opponent!.id, instanceId: "public-cheat-choice", number: 2, visibleCardId: "10502" }
  ]);
  assert.ok(owner.cheatTransferChoices?.some(({ id, remaining }) => id === `${CHEAT_SHARP_ID}:cheat` && remaining === 4));
  assert.ok(owner.statusOverview?.cardCounters.cheat?.[CHEAT_SHARP_ID]?.some((line) => line.includes("当前攻击 +1")));
  assert.ok(owner.statusOverview?.counted.some(({ label, value }) => label === "Sharpandshiny·法伤机会" && value === "剩 2 次"));
  state.pendingActions[active.id] = { actions: [
    { type: "skill", skillId: CHEAT_NOGLUES_ID, stacks: 1, cheatCardInstanceId: "hidden-cheat-choice" },
    { type: "skill", skillId: CHEAT_TRANSFER_ID, stacks: 1, cheatTransferFrom: "1092", cheatTransferTo: `${CHEAT_SHARP_ID}:cheat` }
  ] };
  state.turnResolutionStarted = true;
  for (const viewer of [opponent, spectator]) {
    const publicState = toPublicGameState(state, viewer!.id);
    assert.equal(publicState.cheatCardChoices, undefined);
    assert.equal(publicState.cheatTransferChoices, undefined);
    const [noglues, transfer] = publicState.revealedActions![active.id]!.actions;
    assert.ok(noglues && !("cheatCardInstanceId" in noglues));
    assert.ok(transfer && !("cheatTransferFrom" in transfer) && !("cheatTransferTo" in transfer));
    assert.ok(!publicState.players.find(({ id }) => id === active.id)?.buffs.some(({ id }) => id === "limited_use_balance:1092"));
  }
});

check("random mode deals only native big cards, no small skills or spectator cards", () => {
  const state = startGame(fixture("big_random", 6));
  for (const player of state.players.slice(0, 2)) {
    assert.equal(player.bigCards?.length, 6);
    assert.equal(new Set(player.bigCards!.map((card) => card.cardId)).size, 6);
    assert.ok(player.bigCards!.every((card) => getBigCard(card.cardId)?.kind === "native"));
    assert.equal(player.skillInventory?.length ?? 0, player.skills.length);
    assert.ok((player.skillInventory ?? []).every((skill) => player.bigCards!.some((card) =>
      skill.sourceBigCardInstanceId === card.instanceId || skill.sourceBigCardInstanceId?.startsWith(card.instanceId + ":"))));
  }
  assert.deepEqual(state.players[2]!.bigCards, []);
  assert.equal(new Set(state.players.flatMap((player) => player.bigCards!.map((card) => card.instanceId))).size, 12);
  const royalCards = getBigCards().filter((card) => card.rankCode === "05");
  const complete = royalCards.filter((card) => card.implementationStatus === "implemented").length;
  const partial = royalCards.filter((card) => card.implementationStatus === "partial").length;
  const pending = royalCards.filter((card) => card.implementationStatus === "pending").length;
  assert.ok(state.eventLog.some((event) => event.type === "system" &&
    event.message.includes(`王者正篇与番外已实现${complete}张，部分实现${partial}张，待实现${pending}张。`)));
});

for (const mode of ["big_random", "big_test_select"] as const) {
  check(`${mode}: every prompt, preparation, active action window and turn lasts 300 seconds`, () => {
    const room = fixture(mode);
    if (mode === "big_random") room.config.bigCardPackIds = ["supreme"];
    let state = startGame(room);
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
  state = store.updateSettings(room.id, host.id, { skillMode: "big_random", skillCount: 3, bigCardPackIds: ["supreme"] });
  assert.ok(state.players.every((player) => player.skills.length === 0));
  assert.throws(() => store.updatePlayerSkills(room.id, host.id, host.id, ["10501"]), /测试自选/);
  state = store.start(room.id, host.id);
  deadlineWithin(state.actionWindowDeadlineAt, 300);
  assert.equal(state.players[0]!.bigCards!.length, 3);
  const known = state.peekBigCardsByViewer?.[guest.id] ?? [];
  const disclosed = state.players[0]!.bigCards!.filter((card) => card.publiclyRevealed || known.includes(card.instanceId));
  assert.deepEqual(store.publicState(room.id, guest.id).players[0]!.bigCards!.map(({ instanceId }) => instanceId),
    disclosed.map(({ instanceId }) => instanceId));
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
  owner.bigCards = [
    { cardId: "10508", instanceId: "verdict", verdictProgress: { wins: 2, losses: 1, streak: 2 } },
    { cardId: "10552", instanceId: "youkai" }
  ];
  owner.youkaiLayers = 21;
  owner.youkaiHalfRounds = 3;
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
  assert.deepEqual(own.cardCounters.youkai, { "1055202": ["妖力沉淀 21 层"], "1055205": ["连续半妖化 3/6 轮"] });
  const opponentCounters = toPublicGameState(state, state.players[1]!.id).statusOverview?.cardCounters;
  assert.ok(!opponentCounters?.verdict);
  assert.ok(!opponentCounters?.youkai);
});

check("v4 small skill IDs replace old IDs in the catalog, presets and saved records", () => {
  const skills = getAllSkills().filter((skill) => /^1\d{3}$/.test(skill.id));
  assert.equal(skills.length, 120);
  assert.equal(new Set(skills.map((skill) => skill.id)).size, 120);
  assert.equal(getSkill("1001")?.name, "空");
  assert.equal(getSkill("huo_yan_dao")?.id, "1015");
  assert.equal(getSkill("zhu_que_yu_shan")?.id, "1016");
  assert.equal(getSkill("skill_78_18866")?.id, "1077");

  const store = new RoomStore(new MatchRecorder(path.resolve(`data-test/legacy-skill-ids-${Date.now()}`)));
  const { state: room, player: host } = store.createRoom("Host");
  const config = { ...room.config, skillMode: "test_select", skillCount: 2 };
  const loaded = store.loadPreset(room.id, host.id, {
    version: 1, config, ownerSkills: ["skill_3_56718", "huo_yan_dao"], aiSkills: [["skill_78_18866"]]
  });
  assert.deepEqual(loaded.players.map(({ skills }) => skills), [["1002", "1015"], ["1077"]]);
  assert.deepEqual(createRoomPreset(store.publicState(room.id, host.id)).aiSkills, [["1077"]]);

  const oldRecord = {
    name: "huo_yan_dao",
    players: [{ skills: ["huo_yan_dao"], buffs: [{ id: "sealed_skill:skill_78_18866" }] }],
    action: { type: "skill", skillId: "skill_78_18866", targetSkillId: "zhu_que_yu_shan" },
    weights: { "skillAttack:huo_yan_dao:qin": 4, "skillAttack:1015:qin": 8, "skillAction:skill_78_18866": 9 }
  };
  const saved = readSkillRecordJson<typeof oldRecord>(JSON.stringify(oldRecord));
  assert.equal(saved.name, oldRecord.name);
  assert.deepEqual(saved.players, [{ skills: ["1015"], buffs: [{ id: "sealed_skill:1077" }] }]);
  assert.deepEqual(saved.action, { type: "skill", skillId: "1077", targetSkillId: "1016" });
  assert.deepEqual(saved.weights, { "skillAttack:1015:qin": 8, "skillAction:1077": 9 });
});

console.log(`Big-card mode checks passed: ${passed}`);
