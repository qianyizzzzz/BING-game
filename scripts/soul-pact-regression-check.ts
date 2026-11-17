import assert from "node:assert/strict";
import { test } from "node:test";
import { getLifeEffects } from "../packages/shared/src/engine/lifeEffects";
import { spawnHounds } from "../packages/shared/src/engine/beast";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getActiveSkillCount, getElementAmount,
  isSoulExiled, KAIGE_CARD_ID, passActionWindow, skipActionWindowsUntilTurnAction,
  SOUL_ELEMENT, SOUL_EXILE_ID, SOUL_EXTINGUISH_ID, SOUL_IGNORE_ID, SOUL_PACT_CARD_ID,
  SOUL_PACT_ID, SOUL_RESTORE_EXTINGUISH_ID, SOUL_SINK_ID, startGame, submitActionWindowSkill, submitPlayerAction,
  submitRetirementCounter, TIANMANG_CARD_ID, TIANMANG_ELEMENT, TIANMANG_FIELD_CLEANSE_ID, TIME_REWIND_ID, toPublicGameState,
  type GameState, type PlayerAction, type SkillAction, type SkillTimingPhase
} from "@bing/shared";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { restorePlayerInitialState } from "../packages/shared/src/engine/initialPlayerState";
import { getStatusOverview } from "../packages/shared/src/engine/statusOverview";
import { captureRoundStart, rewindPlayers } from "../packages/shared/src/engine/honghuang";
import { hasOrdinaryDeathHistory, recordSoulExit, SOUL_DEATH_HISTORY } from "../packages/shared/src/engine/soulPact";

const cake = { type: "gain_cake" } as const;
const attack = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
const cast = (skillId: string): SkillAction => ({ type: "skill", skillId, stacks: 1 });
const player = (state: GameState, id: string) => state.players.find((entry) => entry.id === id)!;
const soul = (state: GameState, id: string) => getElementAmount(player(state, id), SOUL_ELEMENT);
const addSoul = (state: GameState, id: string, amount: number) => changeElementAmount(player(state, id), SOUL_ELEMENT, amount);

function advance(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let i = 0; i < 100 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++)
    state = advanceActionWindow(state);
  return state;
}

function setup(victimSkills: string[] = [], victimCard?: string) {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 3, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁", "戊"]) state = addPlayerToGame(state, createPlayer(name));
  const [a, b, c, d, e] = state.players.map(({ id }) => id) as [string, string, string, string, string];
  player(state, a).bigCards = [{ cardId: SOUL_PACT_CARD_ID, instanceId: "soul-pact-test" }];
  if (victimCard) player(state, b).bigCards = [{ cardId: victimCard, instanceId: "victim-card" }];
  state = advance(startGame(state));
  if (victimSkills.length) appendSkillInstances(player(state, b), victimSkills);
  for (const entry of state.players) { entry.hp = 30; entry.cakes = 30; }
  return { state, a, b, c, d, e };
}

function reveal(state: GameState, moves: Record<string, PlayerAction>): GameState {
  state = advance(state);
  for (const { id } of state.players.filter((entry) => entry.status === "alive" && !entry.summon && !isSoulExiled(state, entry))) {
    state = submitPlayerAction(state, id, moves[id] ?? cake).state;
  }
  return state;
}

function markPriorDeath(state: GameState, id: string): void {
  player(state, id).buffs.push({ id: SOUL_DEATH_HISTORY, name: "曾死亡", stacks: 1, uncleansable: true });
}

test("传承真实发放，攻击致死清除多余命，死亡史随初始快照恢复", () => {
  let { state, a, b } = setup();
  for (const id of ["1005", "1067", "1063"]) assert.equal(getActiveSkillCount(player(state, a), id), 1);
  player(state, b).hp = 0;
  player(state, b).spareLives = [{ hp: 8 }, { hp: 9 }];
  state = advance(reveal(state, { [a]: attack(b) }), "turn_end_action");
  assert.equal(player(state, b).status, "dead");
  assert.equal(soul(state, a), 11);
  assert.equal(player(state, b).spareLives?.length, 0);
  assert.ok(hasOrdinaryDeathHistory(player(state, b)));
  assert.ok(getStatusOverview(state, player(state, b)).longTerm.some(({ label }) => label === "曾死亡"));
  assert.ok(restorePlayerInitialState(state, player(state, b)));
  assert.ok(!hasOrdinaryDeathHistory(player(state, b)));
});

test("秒杀圣灵凯歌后，灵熄持有者可跳过同一次复活响应", () => {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false });
  for (const name of ["AI1", "AI2"]) state = addPlayerToGame(state, createPlayer(name, "ai"));
  const a = state.players[0]!.id;
  const b = state.players[1]!.id;
  player(state, a).bigCards = [{ cardId: SOUL_PACT_CARD_ID, instanceId: "soul-pact" }];
  player(state, b).bigCards = [{ cardId: KAIGE_CARD_ID, instanceId: "kaige" }];
  state = advance(startGame(state));
  player(state, a).cakes = 14;
  assert.equal(player(state, b).spareLives?.length, 6);
  state = advance(reveal(state, {
    [a]: { type: "attack", attackId: "miao_sha", stacks: 1, targetId: b }
  }), "revival_action");
  assert.equal(state.activeTimingPhase, "revival_action");
  assert.equal(player(state, b).spareLives?.length, 0);
  assert.equal(soul(state, a), 31);

  const skippedWhileWaiting = skipActionWindowsUntilTurnAction(state, a);
  assert.equal(skippedWhileWaiting.activeTimingPhase, "revival_action");
  assert.ok(skippedWhileWaiting.actionWindowPassPlayerIds.includes(a));
  assert.ok(!skippedWhileWaiting.actionWindowPassPlayerIds.includes(b));

  for (const useExtinguish of [false, true]) {
    let current = useExtinguish ? submitActionWindowSkill(state, a, cast(SOUL_EXTINGUISH_ID)) : state;
    current = passActionWindow(current, b);
    assert.ok(!current.actionWindowPassPlayerIds.includes(a));
    current = skipActionWindowsUntilTurnAction(current, a);
    assert.notEqual(current.activeTimingPhase, "revival_action");
    assert.equal(player(current, b).status, "dead");
    assert.equal(current.eventLog.filter((event) => event.type === "player_died" && event.playerId === b).length, 1);
    assert.equal(soul(current, a), useExtinguish ? 36 : 31);
  }
});

test("冥途无夜按技能获得顺序无视，结算后总共只消耗1魂", () => {
  for (const [skills, living] of [[["1063", "1068"], true], [["1068", "1063"], false]] as const) {
    let { state, a, b, c } = setup([...skills]);
    player(state, a).bigCards![0]!.abilityUses = { [SOUL_EXTINGUISH_ID]: 2 };
    player(state, b).hp = 0;
    addSoul(state, a, 1);
    state = advance(reveal(state, { [c]: attack(b) }), "turn_end_action");
    assert.equal(player(state, b).status === "alive", living);
    assert.equal(soul(state, a), 1, "原有1魂＋死亡1魂－忽略费用1魂");
  }
  let { state, a, b, c } = setup(["1068", "1063"]);
  player(state, a).bigCards![0]!.abilityUses = { [SOUL_EXTINGUISH_ID]: 2 };
  player(state, b).hp = 0;
  addSoul(state, a, 2);
  state = advance(reveal(state, { [c]: attack(b) }), "turn_end_action");
  assert.equal(player(state, b).status, "dead");
  assert.equal(soul(state, a), 2);
});

test("冥途无夜能抵消死者想无视裂魂的冥途无夜", () => {
  let { state, a, b } = setup(["1063"]);
  const owner = player(state, a);
  owner.bigCards![0]!.abilityUses = { [SOUL_EXTINGUISH_ID]: 2 };
  owner.bigCards![0]!.acquisitionOrder = 1;
  const victim = player(state, b);
  victim.bigCards = [{ instanceId: "counter-ignore", cardId: SOUL_PACT_CARD_ID, onlyAbilityId: SOUL_IGNORE_ID, acquisitionOrder: 2 }];
  victim.skillInventory![0]!.acquisitionOrder = 10;
  victim.hp = 0;
  addSoul(state, a, 1);
  addSoul(state, b, 1);
  state = advance(reveal(state, { [a]: attack(b) }), "turn_end_action");
  assert.equal(player(state, b).status, "dead");
  assert.ok(player(state, b).buffs.some((buff) => buff.id === "no_revive" && buff.name === "裂魂"));
  assert.equal(soul(state, a), 1);
  assert.equal(soul(state, b), 1);
});

test("灵熄响应他人死亡，禁复活，加命切换后只保留魂沉及旧次数", () => {
  let { state, a, b, c } = setup(["1068"]);
  player(state, a).bigCards![0]!.abilityUses = { [SOUL_SINK_ID]: 1 };
  player(state, b).hp = 0;
  state = advance(reveal(state, { [c]: attack(b) }), "revival_action");
  assert.equal(state.activeTimingPhase, "revival_action");
  state = submitActionWindowSkill(state, a, cast(SOUL_EXTINGUISH_ID));
  state = advance(state);
  assert.equal(player(state, b).status, "dead");
  assert.ok(player(state, b).buffs.some((buff) => buff.id === "no_revive"));
  assert.equal(soul(state, a), 6);
  assert.ok(getLifeEffects(player(state, a).spareLives![0]!).some((effect) =>
    effect.kind === "soul" && effect.abilityId === SOUL_SINK_ID));
  addSoul(state, a, 10);
  state = submitPlayerAction(state, a, cast(SOUL_RESTORE_EXTINGUISH_ID)).state;
  assert.equal(player(state, a).bigCards![0]!.abilityUses?.[SOUL_EXTINGUISH_ID], 0);
  player(state, a).hp = 0;
  player(state, c).cakes = 1;
  state = advance(reveal(state, { [c]: attack(a) }));
  assert.equal(player(state, a).bigCards![0]!.onlyAbilityId, SOUL_SINK_ID);
  assert.equal(player(state, a).bigCards![0]!.abilityUses?.[SOUL_SINK_ID], 1);
  assert.equal(getActiveSkillCount(player(state, a), "1063"), 0);
  assert.ok(hasOrdinaryDeathHistory(player(state, a)));
});

test("魂沉只转换本回合退场，先走普通死亡流程且不将旧退场当作曾死亡", () => {
  let { state, a, b, c, d, e } = setup();
  const old = player(state, d);
  old.status = "dead"; old.defeatLevel = 3;
  recordSoulExit({ ...state, turnNumber: state.turnNumber - 1 }, old);
  const executed = player(state, e);
  executed.status = "dead"; executed.defeatLevel = 4;
  recordSoulExit(state, executed);
  appendSkillInstances(player(state, c), ["1094"]);
  state = advance(reveal(state, { [c]: { ...cast("1094"), targetId: b } }), "retirement_counter_action");
  assert.ok(state.retirementCounter?.soulResponderIds?.includes(a));
  assert.equal(player(state, b).defeatLevel, 2);
  assert.ok(!hasOrdinaryDeathHistory(player(state, b)));
  state = submitRetirementCounter(state, a, { windowId: state.retirementCounter!.id, kind: "soul_sink" });
  state = advance(state);
  assert.equal(player(state, b).defeatLevel, 1);
  assert.equal(player(state, e).defeatLevel, 1);
  assert.equal(player(state, d).defeatLevel, 3);
  assert.ok(hasOrdinaryDeathHistory(player(state, b)));
  assert.ok(!hasOrdinaryDeathHistory(player(state, d)));
  assert.equal(soul(state, a), 12);
});

test("猎犬同批到期只开一次魂沉窗口，转换两只后继续原定回合", () => {
  let { state, a, b, c } = setup();
  const nextTurn = state.turnNumber + 1;
  const hounds = spawnHounds(state, player(state, b), player(state, c));
  for (const hound of hounds) {
    hound.summon!.expiresAtTurn = nextTurn;
    state.pendingActions[hound.id] = { actions: [] };
  }

  state = advance(reveal(state, {}), "retirement_counter_action");
  assert.equal(state.turnNumber, nextTurn);
  assert.ok(state.retirementCounter?.soulResponderIds?.includes(a));
  assert.equal(toPublicGameState(state, a).retirementCounter?.canUseSoulSink, true);
  assert.ok(hounds.every(({ id }) => player(state, id).defeatLevel === 3));
  const windowId = state.retirementCounter!.id;

  const passed = advance(submitRetirementCounter(state, a, { windowId, kind: "pass" }));
  assert.equal(passed.phase, "collecting_actions");
  assert.equal(passed.turnNumber, nextTurn);
  assert.ok(hounds.every(({ id }) => player(passed, id).defeatLevel === 3));
  assert.equal(soul(passed, a), 0);

  state = advance(submitRetirementCounter(state, a, { windowId, kind: "soul_sink" }));
  assert.equal(state.phase, "collecting_actions");
  assert.equal(state.turnNumber, nextTurn);
  assert.ok(hounds.every(({ id }) => player(state, id).defeatLevel === 1 && hasOrdinaryDeathHistory(player(state, id))));
  assert.equal(soul(state, a), 12);
});

test("猎犬到期与重开同时发生，魂沉结束后仍进入原定轮前", () => {
  let { state, a, b, c } = setup();
  const nextRound = state.roundNumber + 1;
  const nextTurn = state.turnNumber + 1;
  for (const hound of spawnHounds(state, player(state, b), player(state, c))) {
    hound.summon!.expiresAtTurn = nextTurn;
    state.pendingActions[hound.id] = { actions: [] };
  }
  state = advance(reveal(state, { [a]: attack(b) }), "retirement_counter_action");
  assert.equal(state.retirementCounter?.resume.timing, "round_pre_interval_action");
  assert.equal(state.roundNumber, nextRound);
  state = submitRetirementCounter(state, a, { windowId: state.retirementCounter!.id, kind: "pass" });
  assert.equal(state.activeTimingPhase, "round_pre_interval_action");
  assert.equal(state.turnNumber, nextTurn);
});

test("悲音尽葬把存活的曾死亡者放到各自空间，后续无需他们出招", () => {
  let { state, a, b, c } = setup();
  markPriorDeath(state, b);
  markPriorDeath(state, c);
  addSoul(state, a, 20);
  state = advance(reveal(state, { [a]: cast(SOUL_EXILE_ID) }));
  assert.ok(isSoulExiled(state, player(state, b)));
  assert.ok(isSoulExiled(state, player(state, c)));
  assert.notEqual(player(state, b).spaceId, player(state, c).spaceId);
  assert.equal(player(state, b).status, "alive");
  assert.equal(player(state, b).defeatLevel, undefined);
  assert.throws(() => submitPlayerAction(state, b, cake), /流放地/);
  const next = advance(reveal(state, {}));
  assert.ok(next.turnNumber > state.turnNumber);
});

test("曾死亡状态的轮初回溯按快照恢复", () => {
  const { state, a, b } = setup();
  captureRoundStart(state);
  markPriorDeath(state, b);
  state.roundNumber = 3;
  rewindPlayers(state, { ...cast(TIME_REWIND_ID), targetId: b }, a);
  assert.ok(!hasOrdinaryDeathHistory(player(state, b)));
});

test("神·净化解除额外状态但保留曾死亡记录", () => {
  let { state, b } = setup([], TIANMANG_CARD_ID);
  markPriorDeath(state, b);
  changeElementAmount(player(state, b), TIANMANG_ELEMENT, 99);
  state = advance(reveal(state, { [b]: cast(TIANMANG_FIELD_CLEANSE_ID) }));
  assert.ok(hasOrdinaryDeathHistory(player(state, b)));
  assert.ok(getElementAmount(player(state, b), TIANMANG_ELEMENT) < 99);
});

test("魂契渡灵按获得途径初始化每人随机一张整卡，并仅结算当次死亡", () => {
  let { state, a, b } = setup(["1068"], "10524");
  markPriorDeath(state, a);
  markPriorDeath(state, b);
  addSoul(state, a, 50);
  player(state, a).buffs.push({ id: "copy_immune", name: "禁止复制", stacks: 1, immuneEffectCategories: ["skill_copy"] });
  player(state, b).bigCards![0]!.abilityUses = { "1052407": 1 };
  player(state, b).hp = -1;
  state = advance(reveal(state, { [a]: cast(SOUL_PACT_ID) }));
  assert.equal(player(state, a).status, "alive");
  assert.equal(player(state, b).status, "dead");
  assert.equal(player(state, b).bigCards?.[0]?.instanceId, "victim-card");
  const obtained = player(state, a).bigCards?.find(({ cardId }) => cardId === "10524");
  assert.ok(obtained && obtained.instanceId !== "victim-card");
  assert.equal(obtained.abilityUses?.["1052407"] ?? 0, 0);
});
