import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, beginActionPrompt, createGame, createPlayer, getActiveFusionCount, getActiveSkillCount,
  getFusionSkillId, getSkillAttackStats, startGame, submitActionWindowSkill, submitPlayerAction, thunderBallCount,
  ANCIENT_ROAR_ID, ETERNAL_THUNDER_ID, THUNDER_BALL_ID, THUNDER_RITE_ID, ULTIMATE_WIND_CARD_ID, WIND_ELEMENT, WIND_EYE_ID,
  THUNDER_STORM_ID, YONGYAO_CARD_ID, type GameState, type PlayerAction, type SkillAction
} from "@bing/shared";
import { grantThunderBalls, THUNDER_RITE_STATE } from "../packages/shared/src/engine/thunderItems";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";
import { SKY_PLAYER_ID } from "../packages/shared/src/engine/sky";
import { attackLevelValue, attackPowerValue, INFINITY_VALUE, RETIRE_VALUE, scaleCombatValue } from "../packages/shared/src/engine/combatValues";
import { applyAttackStatModifierChoice } from "../packages/shared/src/engine/attackStatModifiers";

const cake = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const cast = (skillId: string, targets: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...targets });
const owner = (state: GameState) => state.players[0]!;
const rival = (state: GameState) => state.players[1]!;
const byName = (state: GameState, name: string) => state.eventLog.filter((event) => event.type === "damage" && event.attackName === name);

function drain(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && i < 80; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(secondCard?: string): GameState {
  let state = createGame("A", { skillMode: "big_test_select", skillCount: 2, firstTurnNoAttack: false });
  for (const name of ["B", "C"]) state = addPlayerToGame(state, createPlayer(name));
  owner(state).bigCards = [{ cardId: YONGYAO_CARD_ID, instanceId: "thunder-A" }];
  if (secondCard) rival(state).bigCards = [{ cardId: secondCard, instanceId: "thunder-B" }];
  state = drain(startGame(state));
  for (const player of state.players) { player.hp = 100; player.cakes = 40; }
  return state;
}

function act(state: GameState, ...actions: PlayerAction[]): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) {
    if (player.status === "alive" && !state.pendingActions[player.id])
      state = submitPlayerAction(state, player.id, actions[index] ?? cake).state;
  }
  return drain(state);
}

function roll<T>(chance: "low" | "high", play: () => T): T {
  const random = Math.random;
  Math.random = () => (chance === "low" ? 0.01 : 0.91) + random() * 0.01;
  try { return play(); } finally { Math.random = random; }
}

test("天雷真授予，电伤翻倍，每4点召天攻击所有最高血量者", () => {
  let state = fixture(YONGYAO_CARD_ID);
  assert.equal(getActiveFusionCount(owner(state), "天雷"), 1);
  assert.ok(getActiveSkillCount(owner(state), "1106"));
  assert.ok(getActiveSkillCount(owner(state), "1036"));
  rival(state).hp = 104;
  grantThunderBalls(state, rival(state), 1);
  owner(state).buffs.push({ id: "guidao_charge", name: "鬼道次数", stacks: 2 });
  const action = { ...cast("1036", { targetId: rival(state).id }), stacks: 2 };
  state = roll("high", () => act(state, action));
  assert.ok(byName(state, "鬼道").some((event) => event.amount === 4));
  const strikes = byName(state, "天雷");
  assert.equal(strikes.length, 2);
  assert.ok(strikes.every((event) => event.sourceId === SKY_PLAYER_ID && event.amount === 14));
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === SKY_PLAYER_ID && event.protectionName === "天"));
  assert.equal(state.players.length, 3);
});

test("独立天雷每累计4点电伤由天打7点，按该批伤害结算后的血量选目标", () => {
  let state = fixture();
  grantInitializedSkill(state, rival(state).id, getFusionSkillId("天雷"), "测试", false);
  rival(state).buffs.push({ id: "guidao_charge", name: "鬼道次数", stacks: 4 });
  state = roll("high", () => act(state, cake, { ...cast("1036", { targetId: owner(state).id }), stacks: 4 }));
  assert.deepEqual(byName(state, "天雷").map(({ targetId, sourceId, amount }) => [targetId, sourceId, amount]),
    [[state.players[2]!.id, SKY_PLAYER_ID, 7]]);
});

test("雷暴先消耗并补充雷球，主招被油条防住仍结算法伤且排除自己", () => {
  let state = fixture();
  grantThunderBalls(state, owner(state), 8);
  state = roll("low", () => act(state, cast(THUNDER_STORM_ID, { targetId: rival(state).id }),
    { type: "defense", defense: "youtiao" }));
  assert.equal(thunderBallCount(owner(state)), 8);
  assert.equal(byName(state, "雷暴").length, 0);
  const burst = byName(state, "雷暴·法伤");
  assert.equal(burst.length, 2);
  assert.ok(burst.every((event) => event.amount === 10 && event.targetId !== owner(state).id));
});

test("雷祭跳过第一项适用的防御，第二项仍可保护目标", () => {
  for (const order of [["1031", "1074"], ["1074", "1031"]]) {
    let state = fixture();
    appendSkillInstances(rival(state), order);
    grantThunderBalls(state, owner(state), 10);
    state = act(state, cast(THUNDER_RITE_ID));
    assert.ok(owner(state).buffs.some((buff) => buff.stateType === THUNDER_RITE_STATE));
    owner(state).buffs.push({ id: "guidao_charge", name: "鬼道次数", stacks: 1 });
    state = roll("low", () => act(state, cast("1036", { targetId: rival(state).id })));
    assert.equal(rival(state).hp, 100);
    const protections = state.eventLog.flatMap((event) =>
      event.type === "attack_blocked" ? [event.protectionSkillId ?? event.protectionName] : []);
    const expected = order[1] === "1074" ? "圣灵之境" : "无敌";
    assert.ok(protections.includes(order[1]) || protections.includes(expected), JSON.stringify({ order, protections }));
  }
});

test("雷祭不让雷电法术穿透，且同名的两份神之庇护只跳过一份", () => {
  let state = fixture();
  appendSkillInstances(rival(state), ["1074"]);
  grantThunderBalls(state, owner(state), 10);
  state = act(state, cast(THUNDER_RITE_ID));
  beginActionPrompt(state, "turn_before_action");
  state = roll("low", () => drain(submitActionWindowSkill(state, owner(state).id,
    cast("1034", { targetIds: [rival(state).id, state.players[2]!.id] }))));
  assert.equal(rival(state).hp, 100);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.protectionName === "圣灵之境"));

  state = fixture();
  appendSkillInstances(rival(state), ["1031", "1031"]);
  grantThunderBalls(state, owner(state), 10);
  state = act(state, cast(THUNDER_RITE_ID));
  owner(state).buffs.push({ id: "guidao_charge", name: "鬼道次数", stacks: 1 });
  state = roll("low", () => act(state, cast("1036", { targetId: rival(state).id })));
  assert.equal(rival(state).hp, 100);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.blockKind === "invulnerable"));
});

test("雷祭按获得顺序穿透风王之瞳和太古的怒吼，未穿透的防护照常生效", () => {
  for (const { cardId, skillId } of [{ cardId: ULTIMATE_WIND_CARD_ID, skillId: WIND_EYE_ID },
    { cardId: "10518", skillId: ANCIENT_ROAR_ID }]) {
    for (const outcome of ["reflect", "hit", "immune"] as const) {
      let state = fixture(cardId);
      const targetId = rival(state).id;
      if (outcome === "immune") appendSkillInstances(rival(state), ["1074"]);
      grantThunderBalls(state, owner(state), 10);
      state = act(state, cast(THUNDER_RITE_ID));
      owner(state).buffs.push({ id: "guidao_charge", name: "鬼道次数", stacks: 1 });
      changeElementAmount(rival(state), WIND_ELEMENT, 3);
      state = roll(outcome === "reflect" ? "high" : "low", () =>
        act(state, cast("1036", { targetId }), cast(skillId)));
      const reflected = state.eventLog.some((event) => event.type === "attack_reflected" &&
        event.attackName === "鬼道" && event.originalTargetId === targetId);
      assert.equal(reflected, outcome === "reflect", `${skillId} ${outcome}`);
      assert.equal(byName(state, "鬼道").some((event) => event.targetId === targetId), outcome === "hit");
      if (outcome === "immune") assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" &&
        event.targetId === targetId && event.protectionName === "圣灵之境"));
    }
  }
});

test("雷球反伤清除长期状态后再眩晕，保留印记", () => {
  let state = fixture();
  grantThunderBalls(state, owner(state), 4);
  rival(state).buffs.push({ id: "frozen_test", name: "测试长期状态", stateType: "burning", stacks: 1,
    expiresAtRound: state.roundNumber + 2 });
  rival(state).buffs.push({ id: "test_mark", name: "测试印记", stacks: 1, expiresAtRound: state.roundNumber + 2 });
  const inflictedAt = state.turnNumber;
  state = roll("low", () => act(state, cake, { type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id }));
  assert.ok(byName(state, "雷球·反伤").some((event) => event.targetId === rival(state).id && event.amount === 4));
  assert.equal(rival(state).buffs.some((buff) => buff.id === "frozen_test"), false);
  assert.ok(rival(state).buffs.some((buff) => buff.id === "test_mark"));
  assert.equal(rival(state).buffs.find((buff) => buff.stateType === "stunned")?.expiresAtTurn, inflictedAt + 3);
  assert.deepEqual(state.pendingActions[rival(state).id]?.actions, []);
});

test("永耀雷霆按石头、石头、无视破弹的反弹防御，并保存发招时的穿透判定", () => {
  for (const [pierce, ball] of [[false, true], [true, true], [false, false]]) {
    let state = fixture();
    if (ball) grantInitializedSkill(state, rival(state).id, getFusionSkillId("弹力球"), "测试", false);
    owner(state).buffs.push({ id: "rite", name: "雷祭", stateType: THUNDER_RITE_STATE, stacks: 1, expiresAtRound: state.roundNumber + 3 });
    grantThunderBalls(state, owner(state), 20);
    state = roll(pierce ? "low" : "high", () => act(state, cast(ETERNAL_THUNDER_ID, { targetId: rival(state).id }), stone));
    assert.equal(state.cannonDefenses?.[0]?.next, "stone");
    state = act(state, cake, stone);
    assert.equal(state.cannonDefenses?.[0]?.next, "rebound");
    rival(state).cakes = 5;
    state = roll(pierce ? "high" : "low", () => act(state, cake, { type: "defense", defense: "rebound", targetId: owner(state).id }));
    assert.equal(byName(state, "永耀雷霆").length, ball && !pierce ? 0 : 1);
    assert.equal(state.cannonDefenses?.length, 0);
  }
});

test("5无限和退游级为不同数值，退游换到攻击后成为固定点伤害", () => {
  const stats = getSkillAttackStats(ETERNAL_THUNDER_ID, 1)!;
  assert.deepEqual(attackPowerValue(stats), scaleCombatValue(INFINITY_VALUE, 5));
  assert.deepEqual(attackLevelValue(stats), RETIRE_VALUE);
  const exchanged = applyAttackStatModifierChoice(stats, "swap_power_level");
  assert.ok(exchanged.traits.includes("defeat_retire"));
  assert.deepEqual(attackPowerValue(applyAttackStatModifierChoice(exchanged, "power_plus_1_level_minus_1")), RETIRE_VALUE);
});

test("雷球独立到期，轮末结算只影响其他玩家", () => {
  let state = fixture();
  grantThunderBalls(state, owner(state), 1);
  state = act(state, cast(THUNDER_BALL_ID));
  assert.equal(thunderBallCount(owner(state)), 2);
  owner(state).buffs.find((buff) => buff.itemKind === "雷球")!.expiresAtRound = state.roundNumber + 1;
  state = roll("high", () => act(state, { type: "attack", attackId: "sha", stacks: 1, targetId: rival(state).id }));
  assert.equal(thunderBallCount(owner(state)), 1);
  const expiration = byName(state, "雷球·消失");
  assert.equal(expiration.length, 2);
  assert.ok(expiration.every((event) => event.amount === 1 && event.targetId !== owner(state).id));
});

test("轮末重新生成的雷球从下一轮起拥有完整三轮", () => {
  let state = fixture();
  grantThunderBalls(state, owner(state), 1);
  owner(state).buffs.find((buff) => buff.itemKind === "雷球")!.expiresAtRound = state.roundNumber + 1;
  state = roll("low", () => act(state, { type: "attack", attackId: "sha", stacks: 1, targetId: rival(state).id }));
  assert.equal(thunderBallCount(owner(state)), 1);
  assert.equal(owner(state).buffs.find((buff) => buff.itemKind === "雷球")?.expiresAtRound, state.roundNumber + 3);
});
