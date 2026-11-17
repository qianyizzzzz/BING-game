import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, createGame, createPlayer, startGame, submitPlayerAction, submitActionWindowSkill,
  activeEraFields, ELECTROMAGNETIC_CANNON_ID, JUNENG_ELEMENT, ERA_AREA, ERA_CARD,
  ERA_CHOOSE_TARGETS, ERA_CONFLICT, ERA_CONTROL, ERA_DAMAGE,
  ERA_EXTEND, ERA_FIRE, ERA_LIFE, ERA_RESTART, ERA_TARGET_EDIT_LIMIT, getActiveFusionCount, getSkill, toPublicGameState,
  appendSkillInstances, getPlayerInitialHp, RED_LOTUS_CARD_ID, RED_LOTUS_FLAME, RED_LOTUS_NINE, RETIRE_VALUE,
  validateAction, validateActionWindowSkill, type GameState, type PlayerAction, type SkillAction
} from "../packages/shared/src";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { YUAN_VOID_ID } from "../packages/shared/src/engine/yuanIds";

const pass = { type: "gain_cake" } as const;
const sha = (targetId: string) => ({ type: "attack", attackId: "sha", stacks: 1, targetId }) as const;
const use = (skillId: string, extras: Partial<SkillAction> = {}): SkillAction =>
  ({ type: "skill", skillId, stacks: 1, ...extras });

function advance(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; i < 70 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++)
    state = advanceActionWindow(state);
  return state;
}

function fixture(): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 2, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  for (const [index, player] of state.players.entries()) {
    player.bigCards = [{ instanceId: `era-${index}`, cardId: ERA_CARD }];
    player.bigCards.push({ instanceId: `other-${index}`, cardId: "10509" });
  }
  return advance(startGame(state));
}

function turn(state: GameState, ...moves: PlayerAction[]): GameState {
  const players = state.players.map(({ id }) => id);
  for (const [index, id] of players.entries()) {
    if (state.phase !== "collecting_actions") break;
    const player = state.players.find((entry) => entry.id === id)!;
    if (player.status !== "alive" || state.pendingActions[id]) continue;
    player.cakes = 30;
    const action = moves[index] ?? pass;
    const validation = validateAction(state, id, action);
    assert.equal(validation.ok, true, JSON.stringify(validation));
    state = submitPlayerAction(state, id, action).state;
  }
  return state;
}

test("永恒与逆转星移开局授予，传承的永恒抗失效并在轮末保饼", () => {
  let state = fixture();
  const player = state.players[0]!;
  assert.equal(getActiveFusionCount(player, "逆转星移"), 1);
  assert.equal(getActiveFusionCount(player, "永恒"), 1);
  player.buffs.push({ id: "skill_disabled_until_round:test", name: "技能失效", stacks: 1, expiresAtRound: 9 });
  assert.equal(getActiveFusionCount(player, "永恒"), 1);
  assert.equal(getActiveFusionCount(player, "逆转星移"), 0);
  state = advance(turn(state, pass, sha(player.id)));
  assert.equal(state.roundNumber, 2);
  assert.ok(state.players[0]!.cakes > 0);
});

test("灵动把单攻拉成群攻，发动者无视自己受到的这一份", () => {
  let state = fixture();
  const [a, b, c] = state.players;
  state = advance(turn(state, use(ERA_AREA), sha(c!.id)));
  assert.equal(state.players[0]!.hp, a!.hp);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceId === b!.id && event.targetId === c!.id));
  assert.equal(state.players[3]!.hp, 17);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === a!.id && event.blockKind === "ignored" &&
    event.protectionName === "灵动纪元"));
});

test("电磁炮等非攻击群招也可被灵动无视，神控可将其改成指定目标", () => {
  let state = fixture();
  const [a, b, c, d] = state.players.map(({ id }) => id);
  const player = state.players[1]!;
  player.bigCards!.push({ instanceId: "cannon", cardId: "10504", onlyAbilityId: ELECTROMAGNETIC_CANNON_ID, initialized: true });
  changeElementAmount(player, JUNENG_ELEMENT, 4);
  const cast = [use(ERA_AREA), use(ELECTROMAGNETIC_CANNON_ID)];
  const unedited = advance(turn(structuredClone(state), ...cast));
  assert.equal(unedited.players[0]!.hp, 18);
  assert.equal(unedited.players[2]!.status, "dead");
  assert.equal(unedited.players[3]!.status, "dead");

  state = advance(turn(state, use(ERA_CONTROL), cast[1]!), "turn_change_action");
  state = advance(submitActionWindowSkill(state, a!, use(ERA_CHOOSE_TARGETS, {
    eraMoveSourceId: b!, eraMoveIndex: 0, targetIds: [c!]
  })));
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === c && event.spellDamage));
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.targetId === d && event.spellDamage));
});

test("抗争优先于灵动，群攻只命中发出者自己", () => {
  let state = fixture();
  const b = state.players[1]!;
  state = advance(turn(state, use(ERA_CONFLICT), { type: "attack", attackId: "wan_jian", stacks: 1 }, use(ERA_AREA)));
  assert.deepEqual(state.players.map(({ hp }) => hp), [18, 16, 18, 18]);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceId === b.id && event.targetId === b.id && event.attackDamage));
});

test("两名神控可来回修改同一招，最后一次神控压过抗争与灵动", () => {
  let state = fixture();
  const [a, b, c, d] = state.players.map(({ id }) => id);
  state.eraFields = [
    { id: "area", skillId: ERA_AREA, sourceId: a!, expiresAtRound: 5 },
    { id: "conflict", skillId: ERA_CONFLICT, sourceId: a!, expiresAtRound: 5 },
    { id: "control", skillId: ERA_CONTROL, sourceId: c!, expiresAtRound: 5 }
  ];
  state = advance(turn(state, use(ERA_CONTROL), sha(c!)), "turn_change_action");
  assert.ok(toPublicGameState(state, a).eraTargetChoices?.some(({ sourceId }) => sourceId === b));
  assert.equal(toPublicGameState(state, b).eraTargetChoices, undefined);
  const edit = (ids: string[]) => use(ERA_CHOOSE_TARGETS, { eraMoveSourceId: b!, eraMoveIndex: 0, targetIds: ids });
  state = submitActionWindowSkill(state, a!, edit([c!]));
  state = submitActionWindowSkill(state, c!, edit([]));
  state = submitActionWindowSkill(state, a!, edit([d!]));
  assert.deepEqual(toPublicGameState(state, a).eraTargetChoices?.find(({ sourceId }) => sourceId === b)?.selectedIds, [d]);
  assert.equal("eraTargetEdits" in toPublicGameState(state, b), false);
  state = advance(state);
  assert.deepEqual(state.players.map(({ hp }) => hp), [18, 18, 18, 17]);
});

test("神控可以清空目标，全阶段共享修改上限", () => {
  let state = fixture();
  const [a, b, c] = state.players.map(({ id }) => id);
  state = advance(turn(state, use(ERA_CONTROL), sha(c!)), "turn_change_action");
  const edit = use(ERA_CHOOSE_TARGETS, { eraMoveSourceId: b!, eraMoveIndex: 0, targetIds: [] });
  state.eraTargetEdits = Array.from({ length: ERA_TARGET_EDIT_LIMIT - 1 }, () =>
    ({ controllerId: a!, sourceId: b!, moveIndex: 0, targetIds: [c!] }));
  state = submitActionWindowSkill(state, a!, edit);
  assert.equal(validateActionWindowSkill(state, a!, edit).ok, false);
  state = advance(state);
  assert.deepEqual(state.players.map(({ hp }) => hp), [18, 18, 18, 18]);
  assert.ok(state.eventLog.some((event) => event.type === "system" && event.message.includes("神控纪元目标丢失")));
});

test("虚元保留随机目标，不出现在神控选择列表", () => {
  let state = fixture();
  const [a, b] = state.players.map(({ id }) => id);
  state.players[1]!.bigCards!.push({ instanceId: "yuan", cardId: "10554", onlyAbilityId: YUAN_VOID_ID, initialized: true });
  state = advance(turn(state, use(ERA_CONTROL), use(YUAN_VOID_ID)), "turn_change_action");
  assert.ok(!toPublicGameState(state, a).eraTargetChoices?.some(({ sourceId }) => sourceId === b));
  state = advance(state);
  assert.equal(state.players.filter(({ spaceId }) => spaceId).length, 1);
  assert.equal(state.players[1]!.spaceId, undefined);
});

test("天火纪元当回合末伤害全体并授予天火之狱，局部空间互不影响", () => {
  let state = fixture();
  state.players[0]!.spaceId = state.players[1]!.spaceId = "era-room";
  state.smallSpaces = { "era-room": { name: "测试空间", kind: "dream_utopia", expiresAtRound: 8, cakeMultiplier: 1 } };
  state = advance(turn(state, use(ERA_FIRE)));
  assert.deepEqual(state.players.map(({ hp }) => hp), [17, 17, 18, 18]);
  assert.equal(state.roundNumber, 1);
  assert.equal(getActiveFusionCount(state.players[0], "天火之狱"), 1);
  assert.equal(activeEraFields(state, ERA_FIRE)[0]?.spaceId, "era-room");
});

test("天火之狱的浴火重生在纪元期间无视通常的禁复活", () => {
  let state = fixture();
  const source = state.players[0]!;
  source.hp = 0;
  source.buffs.push({ id: "no_revive", name: "无法复活", stacks: 1 });
  state = advance(turn(state, use(ERA_FIRE)));
  assert.equal(state.players[0]!.status, "alive");
  assert.equal(state.players[0]!.hp, getPlayerInitialHp(source));
  assert.ok(state.eventLog.some((event) => event.type === "heal" && event.targetId === source.id && event.reason === "浴火重生"));
});

test("生灵按回合与轮末分别增命，罗刹按实际受伤添加等量血备用命", () => {
  let state = fixture();
  const c = state.players[2]!;
  state = advance(turn(state, use(ERA_LIFE), use(ERA_DAMAGE), pass, sha(c.id)));
  assert.deepEqual(state.players[0]!.spareLives?.map(({ hp }) => hp), [3, 18]);
  assert.deepEqual(state.players[1]!.spareLives?.map(({ hp }) => hp), [1, 3]);
  assert.deepEqual(state.players[2]!.spareLives?.map(({ hp }) => hp), [3]);
});

test("罗刹把恰为退游的实际点伤存成一条等量血备用命", () => {
  let state = fixture();
  const owner = state.players[0]!, caster = state.players[1]!, victim = state.players[2]!;
  caster.bigCards!.push({ instanceId: "red", cardId: RED_LOTUS_CARD_ID, onlyAbilityId: RED_LOTUS_NINE, initialized: true });
  appendSkillInstances(owner, ["1074"]);
  appendSkillInstances(state.players[3]!, ["1074"]);
  state = advance(turn(state, use(ERA_DAMAGE)));
  const now = state.players.find((p) => p.id === caster.id)!;
  now.buffs.push({ id: RED_LOTUS_FLAME, name: "焰印记", stacks: 9 });
  state = advance(submitActionWindowSkill(state, caster.id, use(RED_LOTUS_NINE)));
  assert.equal(state.players.find((p) => p.id === victim.id)?.defeatLevel, 2);
  assert.deepEqual(state.players[0]!.spareLives?.map(({ hpValue }) => hpValue), [RETIRE_VALUE]);
});

test("永恒纪元的×20可叠加，仅作用于之后开启的纪元", () => {
  let state = fixture();
  const player = state.players[0]!;
  state = advance(turn(state, use(ERA_LIFE)));
  const firstExpiry = activeEraFields(state, ERA_LIFE)[0]!.expiresAtRound;
  state = advance(turn(state, use(ERA_EXTEND), sha(player.id)));
  state = advance(turn(state, use(ERA_EXTEND)));
  assert.equal(state.players[0]!.hp, 18);
  assert.equal(activeEraFields(state, ERA_LIFE)[0]!.expiresAtRound, firstExpiry);
  state = advance(turn(state, use(ERA_FIRE)));
  assert.equal(activeEraFields(state, ERA_FIRE)[0]!.expiresAtRound, state.roundNumber + 2000);
});

test("新纪元按开局池重抽其他牌，保留本副本并消耗独立次数", () => {
  let state = fixture();
  const owner = state.players[0]!;
  state.openingBigCardDeal = { pool: ["10501", "10502", "10503", "10504", "10505", "10506", "10507", ERA_CARD],
    allowDuplicateAcrossPlayers: false };
  state = advance(turn(state, use(ERA_EXTEND)));
  state = submitActionWindowSkill(state, owner.id, use(ERA_RESTART));
  assert.equal(state.activeTimingPhase, "opening_action");
  assert.equal(state.roundNumber, 1);
  assert.equal(state.turnNumber, 1);
  assert.equal(state.players[0]!.eraDurationMultiplier, undefined);
  assert.equal(state.players[0]!.bigCards?.[0]?.eraRestartUsed, true);
  assert.equal(state.players[0]!.bigCards?.[0]?.instanceId, "era-0");
  assert.ok(state.players.every((p) => p.bigCards?.length === 2));
  assert.equal(new Set(state.players.flatMap((p) => p.bigCards?.map(({ cardId }) => cardId) ?? [])).size, 8);
  assert.equal(validateActionWindowSkill(state, owner.id, use(ERA_RESTART)).ok, false);
  assert.ok(!getSkill(ERA_RESTART)?.typeTags.includes("限定技"));
});
