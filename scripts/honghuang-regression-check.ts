import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, ANCIENT_ROAR_ID, appendSkillInstances, availableSacredBeasts, createGame, createPlayer,
  ELECTROMAGNETIC_CANNON_ID, enterActionWindow, getActiveFusionCount, getActiveSkillCount, getElementAmount, getSkillUseLimit,
  getVisibleStatusOverview, HONGHUANG_ATTACK_ID, HONGHUANG_CARD_ID, INFINITY_VALUE, isSleeping, JUNENG_CARD_ID, JUNENG_ELEMENT,
  JUSHEN_ID, KUIJI_CARD_ID, SACRED_BEAST_ID, SELF_ISOLATION_ID, startGame, submitActionWindowSkill, submitPlayerAction,
  TIME_REWIND_ID, toPublicGameState, UTOPIA_FIELD_ID, UTOPIA_MOVE_ID, validateActionWindowSkill, XIELING_BODY_ID, XIELING_CARD_ID,
  XIELING_ELEMENT, type GameState, type PlayerAction, type SkillAction, type SkillTimingPhase
} from "@bing/shared";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";

const at = (state: GameState, n = 0) => state.players[n]!;
const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const cast = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });
const sha = (targetId: string, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks });

function drain(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let n = 0; state.phase === "action_window" && n < 80; n++) {
    if (state.activeTimingPhase === stop) {
      if (state.actionWindowMode === "prompt") state = enterActionWindow(state, at(state).id);
      break;
    }
    state = advanceActionWindow(state);
  }
  return state;
}

function game(cards = [[HONGHUANG_CARD_ID], [], [], []], stop?: SkillTimingPhase): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, firstTurnNoAttack: false });
  for (let n = 1; n < cards.length; n++) state = addPlayerToGame(state, createPlayer(`玩家 ${n}`));
  for (const [n, player] of state.players.entries()) player.bigCards = cards[n]!.map((cardId, index) => ({ cardId, instanceId: `card-${n}-${index}` }));
  state = startGame(state);
  for (const player of state.players) { player.cakes = 16; player.hp = 200; }
  return drain(state, stop);
}

function submit(state: GameState, moves: PlayerAction[], stop?: SkillTimingPhase): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  for (const [n, player] of state.players.entries()) if (player.status === "alive" && !state.pendingActions[player.id])
    state = submitPlayerAction(state, player.id, moves[n] ?? small).state;
  return drain(state, stop);
}

test("开局的山海封印立即阻止致死伤害，先制重开留到轮前轮间", () => {
  let state = game(undefined, "opening_action");
  const ownerId = at(state).id;
  at(state).hp = 0;
  appendSkillInstances(at(state), ["1047"]);
  state = submitActionWindowSkill(state, ownerId, cast("1047"));

  assert.equal(state.activeTimingPhase, "opening_action");
  assert.equal(state.roundNumber, 1);
  assert.equal(at(state).status, "alive");
  assert.equal(at(state).hp, 0);
  assert.equal(at(state).bigCards![0]!.mountainSealReadyRound, 9);
  assert.ok(!state.eventLog.some(({ type }) => type === "round_ended"));

  state = submitActionWindowSkill(state, ownerId, cast("1009"));
  state = advanceActionWindow(state);
  assert.equal(state.roundNumber, 2);
  assert.equal(state.eventLog.filter(({ type }) => type === "round_ended").length, 1);
  assert.equal(at(state).bigCards![0]!.mountainSealReadyRound, 9);
  assert.equal(state.openingRoundEffects, undefined);
});

test("开局变伤可声明重开，伤害照常结算，首轮入口统一生效", () => {
  let state = game([[], [KUIJI_CARD_ID], [JUNENG_CARD_ID], [XIELING_CARD_ID]], "opening_action");
  const [source, isolated, juneng, body] = state.players;
  appendSkillInstances(source!, ["1047"]);
  appendSkillInstances(isolated!, ["1009"]);
  changeElementAmount(juneng!, JUNENG_ELEMENT, 7);
  changeElementAmount(body!, XIELING_ELEMENT, 28);
  state = submitActionWindowSkill(state, isolated!.id, cast("1009"));
  state = submitActionWindowSkill(state, source!.id, cast("1047"));
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  assert.equal(state.damageModifyReturnPhase, "opening_action");

  state = submitActionWindowSkill(state, isolated!.id, cast(SELF_ISOLATION_ID));
  state = submitActionWindowSkill(state, juneng!.id, cast(JUSHEN_ID, { targetId: source!.id }));
  state = submitActionWindowSkill(state, body!.id, cast(XIELING_BODY_ID));
  assert.equal(state.roundNumber, 1);
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  assert.equal(at(state, 1).cakes, 13);
  assert.equal(getElementAmount(at(state, 2), JUNENG_ELEMENT), 0);
  assert.equal(getElementAmount(at(state, 3), XIELING_ELEMENT), 0);
  assert.equal(at(state, 1).spaceId, undefined);
  assert.equal(state.junengTargetLock, undefined);
  assert.ok(!at(state, 3).buffs.some(({ sourceAbilityId }) => sourceAbilityId === XIELING_BODY_ID));

  state = advanceActionWindow(state);
  assert.equal(state.roundNumber, 1);
  assert.equal(state.activeTimingPhase, "opening_action");
  assert.ok(at(state).hp < 200);
  assert.equal(at(state, 1).spaceId, undefined);

  state = advanceActionWindow(state);
  assert.equal(state.roundNumber, 2);
  assert.equal(state.eventLog.filter(({ type }) => type === "round_ended").length, 1);
  assert.deepEqual(state.junengTargetLock, { targetId: source!.id, expiresAtRound: 4 });
  assert.equal(state.smallSpaces?.[at(state, 1).spaceId!]?.expiresAtRound, 3);
  assert.equal(at(state, 3).buffs.find(({ sourceAbilityId }) => sourceAbilityId === XIELING_BODY_ID)?.expiresAtRound, 6);
  assert.ok(at(state).buffs.some(({ id }) => id === "collapse_until_round:2"));
  assert.ok(!at(state, 1).buffs.some(({ id }) => id === "collapse_until_round:2"));
});

test("洪荒传承发放真融合，玄武独立封存暗影盾使用次数", () => {
  let state = game(undefined, "round_before_action");
  assert.equal(getActiveFusionCount(at(state), "冰火狂暴曲"), 1);
  assert.equal(getActiveFusionCount(at(state), "甲骨文"), 1);
  assert.equal(getActiveSkillCount(at(state), "1009"), 1);
  assert.equal(getActiveFusionCount(at(state), "空之轨迹"), 1);
  const ownerId = at(state).id;
  state = submitActionWindowSkill(state, ownerId, cast(SACRED_BEAST_ID, { sacredBeast: "tortoise" }));
  assert.equal(getActiveFusionCount(at(state), "神隐斗篷"), 1);
  assert.ok(!availableSacredBeasts(at(state), 1).length);
  const before = getSkillUseLimit(at(state), "1024");
  assert.ok(before && before > 0);
  state = submit(state, [], "turn_change_action");
  state = submitActionWindowSkill(state, ownerId, cast("1024"));
  assert.equal(at(state).buffs.find((buff) => buff.id === "skill_used:1024")?.stacks, 1);
  state = drain(state);
  for (let round = 2; round <= 7; round++) {
    at(state, 2).cakes = 2;
    state = submit(state, [small, stone, sha(at(state, 1).id), small], "round_before_action");
    assert.equal(state.roundNumber, round);
    assert.equal(getActiveSkillCount(at(state), "1024"), 0);
    if (round < 7) assert.ok(!availableSacredBeasts(at(state), round).includes("tortoise"));
  }
  state = submitActionWindowSkill(state, ownerId, cast(SACRED_BEAST_ID, { sacredBeast: "tortoise" }));
  assert.equal(at(state).buffs.find((buff) => buff.id === "skill_used:1024")?.stacks, 1);
  const overview = getVisibleStatusOverview(toPublicGameState(state, ownerId), ownerId);
  assert.ok(overview?.special.some(({ label, value }) => label === "玄武" && value.includes("开启")));
  assert.ok(!overview?.items.some(({ label }) => label === "玄武"));
});

test("山海封印先核对减免，绝对值受到归零伤害会触发", () => {
  let state = game();
  const ownerId = at(state).id;
  at(state).hp = 1;
  at(state).buffs.push({ id: "defense_value", name: "防御值", stacks: 100 });
  state = submit(state, [stone, sha(ownerId)]);
  assert.ok(!state.eventLog.some((event) => event.type === "system" && event.message.includes("发动山海封印")));

  state = game();
  at(state).hp = 1;
  grantInitializedSkill(state, at(state).id, "1068", "测试绝对值");
  state = submit(state, [stone, sha(at(state).id)]);
  assert.equal(state.roundNumber, 2);
  assert.equal(at(state).status, "alive");
  assert.ok(state.eventLog.some((event) => event.type === "system" && event.message.includes("发动山海封印")));
  assert.equal(at(state).bigCards![0]!.mountainSealReadyRound, 9);
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.targetId === at(state).id));

  state = game();
  at(state).hp = 1;
  grantInitializedSkill(state, at(state, 1).id, "1094", "测试退游点伤害");
  state = submit(state, [cake, cast("1094", { targetId: at(state).id }), stone, stone]);
  assert.equal(at(state).defeatLevel, 2);
  assert.ok(!state.eventLog.some((event) => event.type === "system" && event.message.includes("发动山海封印")));
});

test("神隐斗篷只为未被打死的持有者回血，轮初发放饼和火烧大地", () => {
  let state = game(undefined, "round_before_action");
  const a = at(state).id;
  state = submitActionWindowSkill(state, a, cast(SACRED_BEAST_ID, { sacredBeast: "tortoise" }));
  at(state).hp = 4;
  state = submit(state, [stone, sha(a)]);
  assert.equal(at(state).hp, 6);
  assert.equal(at(state).cakes, 1);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.attackName === "火烧大地" &&
    event.sourceId === a && event.roundNumber === 2));

  state = game(undefined, "round_before_action");
  state = submitActionWindowSkill(state, at(state).id, cast(SACRED_BEAST_ID, { sacredBeast: "tortoise" }));
  at(state).hp = 4;
  at(state).bigCards![0]!.mountainSealReadyRound = 9;
  state = submit(state, [stone, sha(at(state).id, 5)]);
  assert.equal(at(state).status, "dead");
  assert.ok(!state.eventLog.some((event) => event.type === "heal" && event.reason === "神隐斗篷"));
});

test("时溯按选中人数恢复对应轮初，可选自己且两次用完", () => {
  let state = game();
  const a = at(state).id, b = at(state, 1).id, c = at(state, 2).id;
  state = submit(state, [small, stone, sha(b), small]);
  assert.equal(state.roundNumber, 2);
  assert.equal(at(state, 1).hp, 199);
  const one = cast(TIME_REWIND_ID, { targetId: a });
  assert.ok(!validateActionWindowSkill(state, a, one).ok);
  const pair = cast(TIME_REWIND_ID, { targetId: a, targetIds: [a, b] });
  at(state, 1).status = "dead";
  assert.ok(!validateActionWindowSkill(state, a, pair).ok);
  at(state, 1).status = "alive";
  state = submitActionWindowSkill(state, a, pair);
  assert.equal(state.roundNumber, 2);
  assert.equal(at(state, 1).hp, 200);
  assert.equal(at(state).bigCards![0]!.abilityUses?.[TIME_REWIND_ID], 1);
  assert.ok(!("roundStartSnapshots" in toPublicGameState(state, a)));
  at(state, 2).cakes = 2;
  state = submit(state, [small, stone, sha(b), small]);
  assert.equal(state.roundNumber, 3);
  state = submitActionWindowSkill(state, a, one);
  assert.equal(at(state).bigCards![0]!.abilityUses?.[TIME_REWIND_ID], 2);
  assert.ok(!validateActionWindowSkill(state, a, cast(TIME_REWIND_ID, { targetId: c })).ok);
});

test("太古的怒吼逐份反射电磁炮和梦境，其他目标照常", () => {
  let state = game([[HONGHUANG_CARD_ID], ["10504"], ["10517"], [], []]);
  const [a, b, c, d] = state.players.map(({ id }) => id);
  changeElementAmount(at(state, 1), JUNENG_ELEMENT, 2);
  state = submit(state, [cast(ANCIENT_ROAR_ID), cast(ELECTROMAGNETIC_CANNON_ID),
    cast(UTOPIA_MOVE_ID, { targetId: a, targetIds: [a!, d!] }), stone, stone]);
  assert.equal(at(state).hp, 220);
  assert.equal(at(state, 1).hp, 180);
  assert.ok(at(state, 2).spaceId && at(state, 3).spaceId);
  assert.ok(!at(state).spaceId);
  assert.equal(at(state).buffs.find((buff) => buff.stateType === "ancient_roar_duration")?.stacks, 2);
  assert.ok(state.eventLog.some((event) => event.type === "attack_reflected" && event.originalTargetId === a && event.reflectedTargetId === b));
  assert.ok(state.eventLog.some((event) => event.type === "attack_reflected" && event.originalTargetId === a && event.reflectedTargetId === c));
});

test("怒吼增幅让单回合技能自动续发，不重复扣梦或延长单次睡眠", () => {
  let state = game([[HONGHUANG_CARD_ID, "10517"], [], [], [], []]);
  at(state).buffs.push({ id: "roar-test", name: "太古的怒吼", stateType: "ancient_roar_duration", stacks: 3,
    expiresAtRound: state.roundNumber + 1 });
  changeElementAmount(at(state), "梦", 4);
  state = submit(state, [cast(UTOPIA_FIELD_ID), stone, stone, stone, stone]);
  const repeat = at(state).buffs.find((buff) => buff.roarContinuation)!;
  assert.equal(repeat.expiresAtTurn, repeat.roarContinuation!.firstTurn + 3);
  state = submit(state, [small, small, stone, stone, stone]);
  assert.ok(isSleeping(at(state, 1), state.turnNumber));
  assert.equal(at(state, 1).buffs.find((buff) => buff.stateType === "sleep")?.expiresAtTurn, state.turnNumber + 10);
});

test("洪荒狂怒五段、小防或油条、遇饼退游，强化改为2^x次并带退游点伤害", () => {
  let state = game([[HONGHUANG_CARD_ID], [], [], [], []]);
  const sourceId = at(state).id;
  const defender = at(state, 1).id, baker = at(state, 2).id, receiver = at(state, 3).id;
  at(state, 3).hpValue = [{ coefficient: 1, exponent: 2 }];
  at(state, 3).hp = 999;
  state = submit(state, [cast(HONGHUANG_ATTACK_ID), { type: "defense", defense: "youtiao" }, cake, stone, small]);
  assert.equal(at(state, 1).hp, 200);
  assert.equal(at(state, 2).defeatLevel, 2);
  const hits = state.eventLog.flatMap((event) => event.type === "damage" && event.targetId === receiver && event.sourceId === sourceId ?
    [event.amountValue] : []);
  assert.equal(hits.length, 5);
  assert.deepEqual(hits[4], INFINITY_VALUE);
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.targetId === defender));
  assert.ok(at(state).buffs.some((buff) => buff.waveAttack?.skillId === HONGHUANG_ATTACK_ID));

  state = game([[HONGHUANG_CARD_ID], [], [], [], []]);
  at(state).buffs.push({ id: "roar-test", name: "太古的怒吼", stateType: "ancient_roar_duration", stacks: 2,
    expiresAtRound: state.roundNumber + 1 });
  at(state, 1).buffs.push({ id: "temp_invulnerable", name: "普通无敌", stacks: 1, expiresAtTurn: state.turnNumber });
  state = submit(state, [cast(HONGHUANG_ATTACK_ID), stone, small, small, small]);
  const wave = at(state).buffs.find((buff) => buff.waveAttack?.skillId === HONGHUANG_ATTACK_ID)!;
  assert.equal(wave.expiresAtTurn, wave.waveAttack!.firstTurn + 4);
  assert.equal(at(state, 1).defeatLevel, 2);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === at(state, 1).id && event.pointDefeatLevel === 2));
});
