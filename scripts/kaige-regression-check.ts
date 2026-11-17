import assert from "node:assert/strict";
import { test } from "node:test";
import {
  absorbBigCardAbility, addPlayerToGame, advanceActionWindow, appendSkillInstances, beginActionPrompt, bigCardHasAbility, createGame, createPlayer,
  createRoomPreset, enterActionWindow, getActiveFusionCount, getActiveSkillCount, getFusionSkillId, getPlayerInitialHp, getVisibleStatusOverview,
  guessPlayerSkill, parseRoomPreset, passActionWindow,
  skipActionWindowsUntilTurnAction, startGame,
  submitActionWindowSkill, submitPlayerAction, toPublicGameState, type GameState, type PlayerAction, type SkillTimingPhase
} from "@bing/shared";
import { addSpareLife, advanceKaigeStage, hasKaigeAbility, kaigeGrantSource, removeKaigeGrants } from "../packages/shared/src/engine/kaige";
import { getLifeEffects } from "../packages/shared/src/engine/lifeEffects";
import { combatValue } from "../packages/shared/src/engine/combatValues";
import { setPlayerHpValue } from "../packages/shared/src/engine/infiniteValues";
import { hasNegativeStatusImmunity } from "../packages/shared/src/engine/negativeStatuses";

const at = (state: GameState, index = 0) => state.players[index]!;
const cake = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const attack = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });

function drain(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let i = 0; i < 80 && state.phase === "action_window"; i++) {
    if (state.activeTimingPhase === stop) return state.actionWindowMode === "prompt" ? enterActionWindow(state, at(state).id) : state;
    state = advanceActionWindow(state);
  }
  return state;
}

function game(cards = [["10520"], [], []], revealed = false): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 3, firstTurnNoAttack: false });
  for (let i = 1; i < cards.length; i++) state = addPlayerToGame(state, createPlayer(`玩家${i}`));
  for (const [index, player] of state.players.entries()) {
    player.bigCards = cards[index]!.map((cardId, i) => ({ cardId, instanceId: `card-${index}-${i}`,
      ...(revealed && cardId === "10520" ? { publiclyRevealed: true } : {}) }));
    player.cakes = 30;
  }
  return startGame(state);
}

function turn(state: GameState, moves: PlayerAction[], stop?: SkillTimingPhase): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  for (const [i, player] of state.players.entries()) if (player.status === "alive" && !state.pendingActions[player.id])
    state = submitPlayerAction(state, player.id, moves[i] ?? stone).state;
  return drain(state, stop);
}

function stage(state: GameState, index: number): void {
  const player = at(state);
  advanceKaigeStage(state, player, { cardInstanceId: player.bigCards![0]!.instanceId, stage: index });
  player.spareLives = player.spareLives!.filter((life) => getLifeEffects(life).some((effect) => effect.kind === "kaige" && effect.stage > index));
}

test("七条0血命、24血上限、命序技能和隐藏信息", () => {
  const state = game();
  const player = at(state);
  assert.equal(player.hp, 0);
  assert.deepEqual(player.spareLives?.map((life) => [getLifeEffects(life).find((effect) => effect.kind === "kaige")?.stage, life.hp]),
    [[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0]]);
  assert.equal(getActiveFusionCount(player, "虚无"), 1);
  assert.equal(getActiveFusionCount(player, "空之轨迹"), 1);
  assert.equal(getActiveFusionCount(player, "帝灵之境"), 1);
  assert.equal(getActiveSkillCount(player, "1098"), 1);
  setPlayerHpValue(player, combatValue(40));
  assert.equal(player.hp, 24);
  const opponentView = toPublicGameState(state, at(state, 1).id).players[0]!;
  assert.equal(opponentView.kaigeLife, undefined);
  assert.equal(opponentView.spareLives, undefined);
  const ownView = toPublicGameState(state, player.id);
  const lifeRows = getVisibleStatusOverview(ownView, player.id)?.lives;
  assert.deepEqual(lifeRows?.[0], { label: "血量上限", value: "24 血" });
  assert.equal(lifeRows?.[1]?.value, "24 血 · 虚无");
  assert.equal(lifeRows?.[2]?.value, "0 血 · 元素");
  assert.deepEqual(getVisibleStatusOverview(toPublicGameState(state, at(state, 1).id), player.id)?.lives,
    [{ label: "当前命", value: "24 血" }]);
  stage(state, 3);
  assert.equal(getActiveFusionCount(player, "虚无"), 0);
  for (const skill of ["无尽战刃", "破军", "末世"]) assert.equal(getActiveFusionCount(player, skill), 1);
});

test("异星共振单独吸取凯歌的十条子技能", () => {
  for (let part = 1; part <= 10; part++) {
    const id = String(1052000 + part);
    const state = game([[], ["10520"], []]);
    const [recipient, owner] = state.players;
    const original = owner!.bigCards![0]!;
    original.onlyAbilityId = id;
    assert.equal(absorbBigCardAbility(state, recipient!, owner!), true);
    assert.equal(bigCardHasAbility(original, id), false);
    assert.equal(recipient!.hp, 18);
    assert.equal(recipient!.kaigeLife, undefined);
    if (part === 1) {
      assert.deepEqual(recipient!.spareLives?.map((life) => [life.hp, getLifeEffects(life)]), Array.from({ length: 7 }, () => [0, []]));
      assert.equal(hasKaigeAbility(recipient!, id), false);
    } else {
      assert.equal(recipient!.spareLives?.length ?? 0, 0);
      assert.equal(hasKaigeAbility(recipient!, id), part !== 10);
      if (part === 9) assert.equal(getActiveFusionCount(recipient!, "帝灵之境"), 1);
    }
  }
});

test("各模式的默认初始血量、沐浴圣光和预设读写", () => {
  for (const [skillMode, override, expected] of [
    ["none", 24, 6], ["small_intro", 11, 11], ["test_select", 12, 36],
    ["big_random", undefined, 18], ["big_test_select", 25, 25]
  ] as const) {
    let state = createGame("甲", { skillMode, skillCount: skillMode === "test_select" ? 1 : 0,
      ...(override === undefined ? {} : { initialHp: override }) });
    state = addPlayerToGame(state, createPlayer("乙"));
    if (skillMode === "test_select") state.players[0]!.skills = ["1066"];
    if (skillMode === "test_select") assert.equal(parseRoomPreset(createRoomPreset(toPublicGameState(state))).config.initialHp, 12);
    const random = Math.random;
    try {
      if (skillMode === "big_random") Math.random = () => 0; // Deal 焚天君燚, whose rules leave starting HP alone.
      state = startGame(state);
    } finally {
      Math.random = random;
    }
    assert.equal(state.players[0]!.hp, expected, skillMode);
    assert.equal(getPlayerInitialHp(state.players[0]), expected, skillMode);
  }
});

test("圣灵凯歌与凌踏九霄、绝影逆魂同持时，七次零血死亡各有独立复活响应", () => {
  let state = drain(game([["10520", "10519", "10513"], [], []]), "revival_action");
  assert.equal(getActiveSkillCount(at(state), "1068"), 1);
  for (let stageNumber = 1; stageNumber <= 7; stageNumber++) {
    const player = at(state);
    assert.equal(state.activeTimingPhase, "revival_action", `第${stageNumber}条命应有复活响应`);
    assert.equal(player.kaigeLife?.stage, stageNumber);
    assert.equal(player.spareLives?.length, 7 - stageNumber);
    assert.ok(!state.actionWindowPassPlayerIds.includes(player.id));
    if (stageNumber === 3) state = skipActionWindowsUntilTurnAction(state, player.id);
    else state = stageNumber % 2 ? passActionWindow(state, player.id) : advanceActionWindow(state);
    assert.notEqual(state.activeTimingPhase, "revival_action");
    if (stageNumber < 7) {
      assert.equal(at(state).kaigeLife?.stage, stageNumber + 1);
      for (let i = 0; i < 2 && state.activeTimingPhase !== "revival_action"; i++) {
        state = turn(state, [stone, stone, stone], "revival_action");
      }
    }
  }
  assert.equal(at(state).defeatLevel, 1);
  assert.equal(getActiveSkillCount(at(state), "1051303"), 1);
  assert.equal(state.eventLog.filter((event) => event.type === "system" && event.message.includes("进入复活阶段")).length, 7);
});

test("阶段技能触发无血量变化的最后一命死亡，超时后回到原行动阶段", () => {
  let state = game([["10520", "10519", "10513"], [], []]);
  stage(state, 7);
  appendSkillInstances(at(state, 1), ["1024"]);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, at(state, 1).id, { type: "skill", skillId: "1024", stacks: 1 });
  assert.equal(state.activeTimingPhase, "revival_action");
  assert.equal(at(state).status, "alive");
  assert.equal(state.turnHealthChanged, undefined);
  state = advanceActionWindow(state);
  assert.equal(at(state).defeatLevel, 1);
  assert.equal(state.activeTimingPhase, "turn_before_action");
  state = advanceActionWindow(state);
  assert.equal(state.phase, "collecting_actions");
});

test("复活技能先于备用命结算，成功时保留当前命", () => {
  let state = game([["10520", "10519", "10513"], [], []]);
  appendSkillInstances(at(state), ["1065"]);
  state = drain(state, "revival_action");
  assert.equal(at(state).spareLives?.length, 6);
  state = submitActionWindowSkill(state, at(state).id, { type: "skill", skillId: "1065", stacks: 1 });
  assert.equal(at(state).hp, 6);
  assert.equal(at(state).kaigeLife?.stage, 1);
  assert.equal(at(state).spareLives?.length, 6);
  assert.notEqual(state.activeTimingPhase, "revival_action");
});

test("自爆触发轮末死亡时，先完成复活响应，再换命和重开", () => {
  let state = game();
  const round = state.roundNumber;
  beginActionPrompt(state, "turn_before_action");
  state = submitPlayerAction(state, at(state).id, { type: "defense", defense: "self_destruct" }).state;
  assert.equal(state.activeTimingPhase, "revival_action");
  assert.equal(state.roundNumber, round);
  assert.equal(at(state).spareLives?.length, 6);
  state = passActionWindow(state, at(state).id);
  assert.equal(state.roundNumber, round + 1);
  assert.equal(at(state).kaigeLife?.stage, 2);
  assert.notEqual(state.activeTimingPhase, "revival_action");
});

test("点退游只消耗一条命，元素阶段插入命保持该阶段，最后一条照常退游", () => {
  let state = drain(game());
  appendSkillInstances(at(state, 1), ["1094", "1094", "1094"]);
  const paper: PlayerAction = { type: "skill", skillId: "1094", targetId: at(state).id, stacks: 1 };
  state = turn(state, [cake, paper]);
  assert.equal(at(state).kaigeLife?.stage, 2);
  assert.equal(at(state).hp, 0);
  assert.equal(getActiveFusionCount(at(state), "帝灵之境"), 0);
  assert.ok(addSpareLife(at(state), { hp: 3 }));
  // A direct retirement consumes the inserted life even though untyped point damage is reflected.
  appendSkillInstances(at(state, 1), ["1106"]);
  at(state, 1).cakes = 30;
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, at(state, 1).id, { type: "skill", skillId: "1106", stacks: 1 });
  assert.equal(at(state).kaigeLife?.stage, 2);
  assert.equal(at(state).hp, 3);
  stage(state, 7);
  removeKaigeGrants(at(state), [kaigeGrantSource(at(state).bigCards![0]!.instanceId, "1052009")]);
  at(state).hp = 2;
  appendSkillInstances(at(state, 2), ["1106"]);
  state = drain(state);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, at(state, 2).id, { type: "skill", skillId: "1106", stacks: 1 });
  assert.equal(at(state).defeatLevel, 2);
});

test("元素返还伤害，仍承受反噬；圣洁免疫法伤", () => {
  let state = game();
  stage(state, 2);
  at(state).hp = 5;
  const attacker = at(state, 1);
  const before = attacker.hp;
  state = turn(state, [stone, attack(at(state).id)]);
  assert.equal(at(state).hp, 5);
  assert.equal(at(state, 1).hp, before - 2);
  const damage = state.eventLog.find((event) => event.type === "damage" && event.attackName === "圣灵凯歌·元素反伤");
  assert.ok(damage?.type === "damage" && damage.reflected);
  assert.ok(!state.eventLog.some((event) => event.type === "attack_reflected"));
  appendSkillInstances(at(state), ["1047"]);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, at(state).id, { type: "skill", skillId: "1047", stacks: 1 });
  assert.equal(at(state).hp, 4);
  stage(state, 7);
  assert.equal(getActiveFusionCount(at(state), "神域之种"), 1);
  assert.equal(getActiveFusionCount(at(state), "阳光之夜"), 1);
  removeKaigeGrants(at(state), [kaigeGrantSource(at(state).bigCards![0]!.instanceId, "1052009")]);
  appendSkillInstances(at(state, 1), ["1034"]);
  at(state, 1).cakes = 30;
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, at(state, 1).id, { type: "skill", skillId: "1034",
    targetIds: [at(state).id, at(state, 2).id], stacks: 1 });
  assert.equal(at(state).hp, 4);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.protectionName === "圣灵凯歌·圣洁"));
  appendSkillInstances(at(state), ["1047"]);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, at(state).id, { type: "skill", skillId: "1047", stacks: 1 });
  assert.equal(at(state).hp, 3);
});

test("生命每回合回血不重开，来源绑定的灵魂修复到期时回到12血", () => {
  let state = game();
  stage(state, 4);
  at(state).hp = 2;
  state = turn(state, [stone, stone]);
  assert.equal(state.roundNumber, 1);
  assert.equal(at(state).hp, 3);
  const fusion = at(state).skillFusions!.find((entry) => entry.skillId === getFusionSkillId("灵魂修复"))!;
  at(state).buffs.push({ id: "trauma_converge:3", name: "灵魂修复", sourceFusionId: fusion.id, stacks: 1 });
  at(state, 1).cakes = 30;
  state = turn(state, [stone, attack(at(state, 2).id), cake]);
  assert.equal(at(state).hp, 12);
});

test("轮回在全局第3轮结算，生者可换命，死者满血复活，退游者保留", () => {
  let state = game([["10520"], [], [], [], []]);
  stage(state, 5);
  state.roundNumber = 3;
  at(state, 1).spareLives = [{ hp: 4 }];
  at(state, 2).status = "dead"; at(state, 2).defeatLevel = 1; at(state, 2).hp = -1;
  at(state, 3).status = "dead"; at(state, 3).defeatLevel = 2;
  state = turn(state, [stone, attack(at(state, 4).id), stone, stone, cake]);
  assert.equal(at(state, 1).hp, 4);
  assert.equal(at(state, 1).status, "alive");
  assert.equal(at(state, 2).hp, 18);
  assert.equal(at(state, 2).status, "alive");
  assert.equal(at(state, 3).defeatLevel, 2);
  assert.equal(at(state, 4).defeatLevel, 1);
});

test("永恒保留轮末饼，挡焚天清饼而不保护防御值", () => {
  let state = game([["10520"], ["10501"], []]);
  stage(state, 6);
  const player = at(state);
  player.hp = 18;
  player.cakes = 7;
  player.buffs.push({ id: "defense_value", name: "防御值", stacks: 2 });
  assert.ok(hasNegativeStatusImmunity(player, state.turnNumber, state.roundNumber));
  state = turn(state, [stone, { type: "skill", skillId: "1050101", stacks: 1, targetId: at(state, 2).id }, cake]);
  assert.equal(at(state).cakes, 7);
  assert.ok(!at(state).buffs.some((buff) => buff.id === "defense_value"),
    JSON.stringify(state.eventLog.slice(-15).map((event) => event.type === "system" ? event.message : event.type)));
});

test("开局知晓令窥视或叶落彼岸的持有者消失，公开与猜中均不触发", () => {
  for (const id of ["10505", "10516"]) {
    const hidden = game([["10520"], [id], []]);
    assert.equal(at(hidden, 1).defeatLevel, 3);
    const publicCard = game([["10520"], [id], []], true);
    assert.equal(at(publicCard, 1).status, "alive");
  }
  let state = turn(game(), [stone, stone, stone], "turn_end_action");
  assert.throws(() => guessPlayerSkill(state, at(state, 1).id, at(state).id, "1098"), /大卡/);
  state = guessPlayerSkill(state, at(state, 1).id, at(state).id, "10520");
  assert.equal(at(state, 1).status, "alive");
  assert.equal(toPublicGameState(state, at(state, 2).id).players[0]!.bigCards?.[0]?.cardId, "10520");
});
