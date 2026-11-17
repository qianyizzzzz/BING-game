import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, enterActionWindow,
  getMoveBlockReason, STAR_WHEEL_RELEASE, STAR_WHEEL_REVERSE, startGame, submitActionWindowSkill, submitPlayerAction, validateActionWindowSkill,
  type GameState, type PlayerAction, type PlayerState, type SkillAction, type SkillTimingPhase
} from "../packages/shared/src";
import { QIANQIU_CARD_ID, RAGING_WAVES_ID, ULTIMATE_WIND_CARD_ID, WIND_ELEMENT, WIND_SHUFFLE_ID } from "../packages/shared/src/bigCards/abilities";
import { PIG_ID, ZOO_CARD_ID } from "../packages/shared/src/engine/beastTraits";
import { DEMON_LEGION_LOCK } from "../packages/shared/src/engine/demonIds";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { MOON_SHADOW_LOCK } from "../packages/shared/src/engine/moonCombat";
import { SHADOW_ACTION_LOCK } from "../packages/shared/src/engine/shadowDance";
import { exileToSoulSpace } from "../packages/shared/src/engine/soulPact";
import { HUIYUE_BUFF_ID } from "../packages/shared/src/skills/fusion";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const selfDestruct = { type: "defense", defense: "self_destruct" } as const;
const burningEarth = { type: "skill", skillId: "1012", stacks: 1 } as const;
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", stacks: 1, targetId });

function advance(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let count = 0; state.phase === "action_window" && count < 80; count++) {
    if (state.activeTimingPhase === stop) return state;
    state = advanceActionWindow(state);
  }
  assert.equal(state.phase, "collecting_actions");
  return state;
}

function fixture(cards: string[][] = []): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", firstTurnNoAttack: false, initialHp: 30 });
  for (const name of ["乙", "丙"]) state = addPlayerToGame(state, createPlayer(name));
  state.players.forEach((player, index) => {
    player.bigCards = (cards[index] ?? []).map((cardId) => ({ cardId, instanceId: `${index}:${cardId}` }));
  });
  return advance(startGame(state), "turn_before_action");
}

function submit(state: GameState, moves: Record<string, PlayerAction> = {}): GameState {
  const turn = state.turnNumber;
  for (const { id } of state.players) {
    if (state.phase !== "collecting_actions" || state.turnNumber !== turn) break;
    if (!state.pendingActions[id]) state = submitPlayerAction(state, id, moves[id] ?? cake).state;
  }
  return state;
}

function applySleep(state: GameState, player: PlayerState): void {
  player.buffs.push({ id: "sleep", name: "睡眠", stateType: "sleep", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
}

test("各类限时禁止出招自动空过并拒绝手动出饼、自爆，到期后恢复提交", () => {
  const cases = [
    { name: "冰冻", id: "frozen", inclusive: true },
    { name: "眩晕", id: "test_stun", stateType: "stunned", inclusive: false },
    { name: "辉月", id: HUIYUE_BUFF_ID, inclusive: true },
    { name: "睡眠", id: "sleep", stateType: "sleep", inclusive: false },
    { name: "风唳", id: SHADOW_ACTION_LOCK, stateType: SHADOW_ACTION_LOCK, inclusive: false },
    { name: "月影", id: MOON_SHADOW_LOCK, stateType: MOON_SHADOW_LOCK, inclusive: false },
    { name: "军团打击", id: DEMON_LEGION_LOCK, stateType: DEMON_LEGION_LOCK, inclusive: false }
  ];
  for (const { name, id, stateType, inclusive } of cases) {
    let state = fixture();
    const player = state.players[1]!;
    const reason = new RegExp(name);
    player.buffs.push({ id, name, stateType, stacks: 1, expiresAtTurn: state.turnNumber + Number(!inclusive) });
    state = advance(state);
    assert.match(getMoveBlockReason(state, state.players[1]) ?? "", reason);
    assert.deepEqual(state.pendingActions[player.id]?.actions, [], name);
    assert.throws(() => submitPlayerAction(state, player.id, cake), reason);
    assert.throws(() => submitPlayerAction(state, player.id, selfDestruct), reason);

    state = advance(submit(state));
    assert.equal(state.pendingActions[player.id], undefined, name);
    assert.equal(state.players[1]!.cakes, 0, name);
    state = submitPlayerAction(state, player.id, cake).state;
    assert.deepEqual(state.pendingActions[player.id]?.actions, [cake], name);
  }
});

test("猪和流放地一直自动空过，不阻塞其他玩家", () => {
  for (const restriction of ["pig", "exile"] as const) {
    let state = fixture();
    const player = state.players[1]!;
    if (restriction === "pig") player.bigCards = [{ cardId: ZOO_CARD_ID, instanceId: "test-pig", onlyAbilityId: PIG_ID }];
    else exileToSoulSpace(state, player);
    state = advance(state);
    assert.ok(getMoveBlockReason(state, state.players[1]));
    assert.throws(() => submitPlayerAction(state, player.id, selfDestruct));
    const start = state.turnNumber;
    for (let count = 0; count < 2; count++) {
      assert.deepEqual(state.pendingActions[player.id]?.actions, []);
      state = advance(submit(state));
    }
    assert.equal(state.turnNumber, start + 2);
    assert.equal(state.players[1]!.cakes, 0);
  }
});

test("冰冻仍能发动阶段技能，睡眠和流放地不能", () => {
  for (const restriction of ["frozen", "sleep", "exile"] as const) {
    let state = fixture();
    const player = state.players[1]!;
    appendSkillInstances(player, [burningEarth.skillId]);
    state = enterActionWindow(state, player.id);
    const actor = state.players[1]!;
    if (restriction === "frozen") actor.buffs.push({ id: "frozen", name: "冰冻", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
    else if (restriction === "sleep") applySleep(state, actor);
    else exileToSoulSpace(state, actor);

    assert.equal(validateActionWindowSkill(state, player.id, burningEarth).ok, restriction === "frozen");
    if (restriction === "frozen") assert.doesNotThrow(() => submitActionWindowSkill(state, player.id, burningEarth));
  }
});

test("不受不良影响时冰冻、睡眠、风唳与军团打击不限制出招", () => {
  let state = fixture();
  const actor = state.players[1]!;
  actor.buffs.push({ id: "test_unaffected", name: "不受不良影响", stacks: 1, unaffectedByNegativeStatuses: true });
  for (const stateType of ["frozen", "sleep", SHADOW_ACTION_LOCK, DEMON_LEGION_LOCK]) {
    actor.buffs.push({ id: stateType, name: stateType, stateType, stacks: 1, expiresAtTurn: state.turnNumber + 2 });
  }
  state = advance(state);
  assert.equal(getMoveBlockReason(state, state.players[1]), undefined);
  assert.equal(state.pendingActions[actor.id], undefined);
  assert.deepEqual(submitPlayerAction(state, actor.id, cake).state.pendingActions[actor.id]?.actions, [cake]);
});

test("麻痹无固定招式时自动空过，有固定小防时正常防住杀", () => {
  for (const fixed of [false, true]) {
    let state = fixture();
    const [attacker, target] = state.players;
    const startHp = target!.hp;
    attacker!.cakes = 1;
    target!.buffs.push({ id: `paralysis_next_action:${fixed ? "small" : "none"}`, name: "麻痹", stacks: 1 });
    state = advance(state);
    assert.deepEqual(state.pendingActions[target!.id]?.actions, fixed ? [small] : []);
    assert.throws(() => submitPlayerAction(state, target!.id, selfDestruct), /麻痹/);
    state = advance(submit(state, { [attacker!.id]: sha(target!.id) }));
    assert.equal(state.players[1]!.hp, startHp - Number(!fixed));
  }
});

test("禁止出招挡下怒海狂涛自动续发", () => {
  let state = advance(fixture([[QIANQIU_CARD_ID]]));
  const [attacker, target] = state.players;
  attacker!.cakes = 2;
  const nextWindow = submit(state, {
    [attacker!.id]: { type: "skill", skillId: RAGING_WAVES_ID, stacks: 1, targetId: target!.id }
  });
  state = advance(nextWindow, "turn_before_action");
  assert.equal(state.players[1]!.hp, 21);
  applySleep(state, state.players[0]!);
  state = advance(submit(advance(state)));
  assert.equal(state.players[1]!.hp, 21);
});

test("逆转检查新的发出者，普通反弹仍可把攻击转给不能出招的目标", () => {
  let state = fixture();
  const [attacker, sleeper, reversalOwner] = state.players;
  attacker!.cakes = 1;
  reversalOwner!.cakes = 1;
  appendSkillInstances(reversalOwner!, ["1092"]);
  applySleep(state, sleeper!);
  state = advance(state);
  const revealed = submit(state, { [attacker!.id]: sha(sleeper!.id) });
  const reversed = submitActionWindowSkill(revealed, reversalOwner!.id, { type: "skill", skillId: "1092", stacks: 1 });
  assert.deepEqual(advance(reversed).players.map(({ hp }) => hp), [30, 30, 30]);

  const reflected = submit(state, {
    [attacker!.id]: sha(reversalOwner!.id),
    [reversalOwner!.id]: { type: "defense", defense: "rebound", targetId: sleeper!.id }
  });
  assert.deepEqual(advance(reflected).players.map(({ hp }) => hp), [30, 29, 30]);
});

test("释放封存招式时重新检查发出者的冰冻状态", () => {
  let state = advance(fixture([["10547"]]));
  const [keeper, attacker, recipient] = state.players;
  attacker!.cakes = 1;
  state = submit(state, { [attacker!.id]: sha(recipient!.id) });
  state = submitActionWindowSkill(state, keeper!.id, { type: "skill", skillId: STAR_WHEEL_REVERSE, stacks: 1 });
  state = advance(state, "turn_before_action");
  const sealed = state.starWheelMoves?.find(({ attacks }) => attacks.some(({ sourceId }) => sourceId === recipient!.id));
  assert.ok(sealed);
  const release: SkillAction = { type: "skill", skillId: STAR_WHEEL_RELEASE, stacks: 1, starWheelMoveIds: [sealed.id] };
  const normal = advance(submitActionWindowSkill(state, keeper!.id, release));
  assert.equal(normal.players[1]!.hp, 29);

  state.players[2]!.buffs.push({ id: "frozen", name: "冰冻", stacks: 1, expiresAtTurn: state.turnNumber });
  state = advance(submitActionWindowSkill(state, keeper!.id, release));
  assert.equal(state.players[1]!.hp, 30);
  assert.ok(!state.starWheelMoves?.some(({ id }) => id === sealed.id));
});

test("究影风啸天换位后，不能出招的玩家不会接手攻击", (context) => {
  const random = Math.random;
  context.mock.method(Math, "random", () => new Error().stack?.includes("prepareWindSeatChange") ? 0 : random());
  let state = fixture([[ULTIMATE_WIND_CARD_ID]]);
  const [wind, attacker, sleeper] = state.players;
  attacker!.cakes = 1;
  changeElementAmount(wind!, WIND_ELEMENT, 5);
  applySleep(state, sleeper!);
  state = advance(state);

  state = advance(submit(state, {
    [wind!.id]: { type: "skill", skillId: WIND_SHUFFLE_ID, stacks: 1, targetId: sleeper!.id },
    [attacker!.id]: sha(sleeper!.id)
  }), "turn_end_action");
  assert.deepEqual(state.players.map(({ id }) => id), [attacker!.id, sleeper!.id, wind!.id]);
  assert.equal(state.players[2]!.hp, 30);
  assert.equal(state.players[0]!.cakes, 0);
});
