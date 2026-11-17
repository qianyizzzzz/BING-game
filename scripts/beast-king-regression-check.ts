import assert from "node:assert/strict";
import { test } from "node:test";
import { addPlayerToGame, advanceActionWindow, createGame, createPlayer, startGame, submitPlayerAction,
  submitActionWindowSkill, getActiveSkillCount, validateAction, type GameState, type PlayerAction,
  HOUND_SUMMON_ID, BEAST_KILL_ID, BEAR_ROAR_ID, PIG_ID, getBigCard, grantFreshBigCard,
  getTablePlayers, getCombatSeatNumbers } from "../packages/shared/src";
import { getPlayerHpValue } from "../packages/shared/src/engine/infiniteValues";
import { hasPig, isAnimal, participantCount } from "../packages/shared/src/engine/beastTraits";
import { spawnHounds, applyFear, prepareBeastTurn, expireHounds, addBearRoar, isHoundPressureBlocked } from "../packages/shared/src/engine/beast";
import { canBypassTargetSelection } from "../packages/shared/src/engine/spaces";
import { negativeStatusesHaveNoEffect } from "../packages/shared/src/engine/effectCategories";
import { getBloodQi } from "../packages/shared/src/engine/asura";
import { getElementAmount } from "../packages/shared/src/engine/elementResources";

const cake = { type: "gain_cake" } as const;
const maxCards = (cards: string[]) => Math.max(1, cards.length);
function drain(state: GameState): GameState {
  for (let count = 0; state.phase === "action_window" && count < 80; count++) state = advanceActionWindow(state);
  assert.notEqual(state.phase, "action_window", "automatic windows must finish");
  return state;
}
function fixture(cards = ["10537"], count = 2): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: maxCards(cards), firstTurnNoAttack: false, initialHp: 18 });
  for (let i = 1; i < count; i++) state = addPlayerToGame(state, createPlayer(`玩家${i + 1}`));
  state.players[0]!.bigCards = cards.map((cardId, i) => ({ cardId, instanceId: `card-${i}` }));
  state = drain(startGame(state));
  state.players.forEach((player) => { player.cakes = 100; });
  return state;
}
function turn(state: GameState, action: PlayerAction, others: PlayerAction[] = []): GameState {
  const players = state.players.filter((player) => !player.summon && player.status === "alive");
  for (const [index, player] of players.entries()) if (!state.pendingActions[player.id])
    state = submitPlayerAction(state, player.id, index === 0 ? action : others[index - 1] ?? cake).state;
  return drain(state);
}

test("猎杀继承真实三千雷动，隐藏猪可被明确寻址", () => {
  const state = fixture();
  assert.equal(getActiveSkillCount(state.players[0], "1109"), 1);
  assert.equal(getBigCard("10537")?.implementationStatus, "implemented");
  assert.equal(getBigCard("10655")?.abilities[0]?.id, PIG_ID);
});

test("召唤两只独立36血猎犬，当回合攻击且不增加场上人数", () => {
  let state = fixture();
  const targetId = state.players[1]!.id;
  const initialTurn = state.turnNumber;
  state = turn(state, { type: "skill", skillId: HOUND_SUMMON_ID, stacks: 1, targetId });
  const dogs = state.players.filter((player) => player.summon);
  assert.equal(dogs.length, 2);
  assert.deepEqual(dogs.map((player) => player.hp), [36, 36]);
  assert.ok(dogs.every((player) => isAnimal(player) && player.summon!.expiresAtTurn === initialTurn + 10));
  assert.equal(participantCount(state.players), 2);
  assert.equal(state.players.find((player) => player.id === targetId)!.hp, 16);
  assert.ok(state.players.find((player) => player.id === targetId)!.buffs.some((buff) => buff.stateType === "beast_fear"));
  assert.ok(!Object.keys(state.pendingActions).some((id) => !state.players.some((player) => player.id === id)));
});

test("普通防御可防住兽王杀戮并触发免费猎犬，未防住成为猪", () => {
  let defended = fixture();
  const defendedTarget = defended.players[1]!.id;
  defended = turn(defended, { type: "skill", skillId: BEAST_KILL_ID, stacks: 1, targetId: defendedTarget }, [{ type: "defense", defense: "small" }]);
  assert.equal(defended.players.filter((player) => player.summon).length, 2);
  assert.equal(hasPig(defended.players.find((player) => player.id === defendedTarget)), false);
  let hit = fixture();
  const targetId = hit.players[1]!.id;
  hit.players[1]!.spareLives = [{ hp: 12 }];
  hit.players[1]!.skills = ["1066"];
  hit = turn(hit, { type: "skill", skillId: BEAST_KILL_ID, stacks: 1, targetId });
  const pig = hit.players.find((player) => player.id === targetId)!;
  assert.ok(hasPig(pig));
  assert.deepEqual(pig.spareLives, []);
  assert.deepEqual(getPlayerHpValue(pig), []);
  assert.equal(getActiveSkillCount(pig, "1066"), 0);
  assert.equal(validateAction(hit, pig.id, cake).ok, false);
});

test("荆棘乱舞的乱舞令猎犬撕咬对每名目标分别召唤两只", () => {
  let state = fixture(["10537", "10540"], 4);
  const [owner, ...enemies] = state.players;
  enemies[2]!.spaceId = "isolated";
  const move = { type: "skill", skillId: HOUND_SUMMON_ID, stacks: 1 } as const;
  assert.equal(validateAction(state, owner!.id, move).ok, true);
  state = turn(state, move);
  const dogs = state.players.flatMap((player) => player.summon ? [player.summon] : []);
  assert.equal(dogs.length, 4);
  for (const target of enemies.slice(0, 2)) assert.equal(dogs.filter((dog) => dog.targetId === target.id).length, 2);
});

test("显示座位固定，嵌套召唤共用造物区，死者与小空间各自结算座次", () => {
  const state = fixture(["10537"], 3);
  const [owner, first, second] = state.players;
  const [left, right] = spawnHounds(state, owner!, first!);
  const [innerLeft, innerRight] = spawnHounds(state, owner!, left!);
  assert.deepEqual(getTablePlayers(state).map(({ id }) => id), [owner!.id, first!.id, second!.id]);
  assert.deepEqual([left, innerLeft, innerRight, right].map((hound) => hound!.summon!.tableZoneAfterPlayerId),
    [owner!.id, owner!.id, owner!.id, first!.id]);
  let seats = getCombatSeatNumbers(state);
  assert.deepEqual([left, innerLeft, innerRight, right].map((hound) => seats.get(hound!.id)), [3, 2, 4, 6]);
  left!.status = "dead";
  first!.status = "dead";
  second!.spaceId = "isolated";
  seats = getCombatSeatNumbers(state);
  assert.equal(seats.has(left!.id), false);
  assert.equal(seats.has(first!.id), false);
  assert.equal(seats.get(second!.id), 1);
  assert.equal(seats.get(right!.id), 4);
  first!.status = "alive";
  assert.equal(getCombatSeatNumbers(state).get(first!.id), 4);
});

test("鹰眼提供独立的必定选中权限，恐惧可被无视且可解除", () => {
  const state = fixture();
  const target = state.players[1]!;
  target.buffs.push({ id: "untargetable", name: "无法被选中", stacks: 1, preventsTargetSelection: true });
  assert.equal(canBypassTargetSelection(state, state.players[0]!.id, target), true);
  applyFear(state, target, state.players[0]!.id, true);
  assert.ok(target.buffs.some((buff) => buff.stateType === "beast_fear" && !buff.uncleansable));
  delete state.pendingActions[target.id];
  const original = Math.random;
  try { Math.random = () => 0; prepareBeastTurn(state); }
  finally { Math.random = original; }
  assert.deepEqual(state.pendingActions[target.id]!.actions, [cake]);
  assert.equal(negativeStatusesHaveNoEffect(target), false);
});

test("猎犬后盾反弹普通攻击，自动行动不要求额外提交", () => {
  let state = fixture();
  const host = state.players[0]!, target = state.players[1]!;
  const dogs = spawnHounds(state, host, target);
  state = turn(state, cake, [{ type: "attack", attackId: "sha", stacks: 1, targetId: dogs[0]!.id }]);
  assert.equal(state.players.find((player) => player.id === dogs[0]!.id)!.hp, 36);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceId === target.id && event.targetId === target.id));
});

test("鹰眼只在突破选中或回避时取消出招防御，仍被无敌挡伤", () => {
  let state = fixture();
  const victim = state.players[1]!.id;
  state.players[1]!.buffs.push({ id: "untargetable", name: "不可选中", stacks: 1, preventsTargetSelection: true });
  state = turn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: victim }, [{ type: "defense", defense: "small" }]);
  assert.equal(state.players.find((player) => player.id === victim)!.hp, 17);
  let ordinary = fixture();
  const ordinaryVictim = ordinary.players[1]!.id;
  ordinary = turn(ordinary, { type: "attack", attackId: "sha", stacks: 1, targetId: ordinaryVictim }, [{ type: "defense", defense: "small" }]);
  assert.equal(ordinary.players[1]!.hp, 18);
  let invulnerable = fixture();
  const protectedId = invulnerable.players[1]!.id;
  invulnerable.players[1]!.buffs.push({ id: "temp_flash_dodge", name: "闪现", stacks: 1, expiresAtTurn: invulnerable.turnNumber + 1 },
    { id: "temp_invulnerable", name: "无敌", stacks: 1, expiresAtTurn: invulnerable.turnNumber });
  invulnerable = turn(invulnerable, { type: "attack", attackId: "sha", stacks: 1, targetId: protectedId });
  assert.equal(invulnerable.players[1]!.hp, 18);
});

test("雄风每层每回合掷一次，成功后拦下目标包含自己的出招", () => {
  let state = fixture();
  const host = state.players[0]!;
  addBearRoar(state, host, { type: "skill", skillId: BEAR_ROAR_ID, stacks: 1 });
  host.buffs.push({ id: "extra_roar", name: "雄风", stateType: "beast_bear_roar", stacks: 1 });
  state.turnNumber++;
  let rolls = 0;
  const original = Math.random;
  try { Math.random = () => (++rolls === 1 ? 0.1 : 0.9); prepareBeastTurn(state); prepareBeastTurn(state); }
  finally { Math.random = original; }
  assert.equal(rolls, 2);
  state = turn(state, cake, [{ type: "attack", attackId: "sha", stacks: 1, targetId: host.id }]);
  assert.equal(state.players[0]!.hp, 18);
  assert.ok(state.players[1]!.buffs.some((buff) => buff.stateType === "beast_fear"));
});

test("猎犬十回合到期且不因过轮重置，回合外压制只保护召唤者", () => {
  const state = fixture();
  const source = state.players[0]!, target = state.players[1]!;
  const dogs = spawnHounds(state, source, target);
  applyFear(state, target, source.id, true);
  state.activeTimingPhase = "turn_end_action";
  assert.equal(isHoundPressureBlocked(state, source.id, target.id), true);
  assert.equal(isHoundPressureBlocked(state, dogs[0]!.id, target.id), false);
  state.activeTimingPhase = "turn_damage_modify";
  assert.equal(isHoundPressureBlocked(state, source.id, target.id), false);
  state.roundNumber += 5;
  state.turnNumber = dogs[0]!.summon!.expiresAtTurn;
  expireHounds(state);
  assert.ok(dogs.every((dog) => dog.status === "dead" && dog.defeatLevel === 3));
});

test("群攻命中猎犬，独立死亡计入血气与魂的响应", () => {
  let state = fixture(["10537", "10526", "10527"], 3);
  const host = state.players[0]!, target = state.players[1]!;
  host.hp = 1000;
  const dogs = spawnHounds(state, host, target);
  for (const dog of dogs) dog.buffs = dog.buffs.filter((buff) => buff.id !== "hound_rebound");
  state = turn(state, cake, [{ type: "attack", attackId: "wan_jian", stacks: 20 }]);
  assert.ok(dogs.every((dog) => state.players.find((player) => player.id === dog.id)!.status === "dead"));
  assert.ok(dogs.every((dog) => state.eventLog.some((event) => event.type === "player_died" && event.playerId === dog.id)));
  assert.ok(getBloodQi(state.players.find((player) => player.id === host.id)!).length > 0);
  assert.ok(getElementAmount(state.players.find((player) => player.id === host.id)!, "魂") > 0);
});

test("无形之盾的两侧随猎犬移位，普天同庆按新座次计算最远目标", () => {
  let state = fixture(["10537"], 4);
  const host = state.players[0]!, protectedTarget = state.players[1]!;
  protectedTarget.skills = ["1098"];
  spawnHounds(state, host, protectedTarget);
  state = turn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: protectedTarget.id });
  assert.equal(state.players.find((player) => player.id === protectedTarget.id)!.hp, 17);
  assert.equal(state.eventLog.filter((event) => event.type === "attack_blocked" && event.targetId === protectedTarget.id && event.blockKind === "invulnerable").length, 2);

  let area = fixture(["10537"], 4);
  const source = area.players[0]!, target = area.players[1]!, oldFarthest = area.players[2]!.id;
  source.skills.push("1097");
  spawnHounds(area, source, target);
  area = turn(area, { type: "attack", attackId: "sha", stacks: 1, targetId: target.id });
  assert.equal(area.players.find((player) => player.id === oldFarthest)!.hp, 17);
  assert.equal(participantCount(area.players), 4);
});

test("动物目标未防住时承受非伤害必杀", () => {
  let state = fixture();
  const target = state.players[1]!;
  target.entityClasses = ["animal"];
  state = turn(state, { type: "skill", skillId: BEAST_KILL_ID, stacks: 1, targetId: target.id });
  assert.equal(state.players.find((player) => player.id === target.id)!.defeatLevel, 4);
  assert.equal(hasPig(state.players.find((player) => player.id === target.id)), false);
});

test("其他获取途径获得猪时同样执行初始化", () => {
  const state = fixture();
  const target = state.players[1]!;
  target.spareLives = [{ hp: 9 }];
  target.buffs.push({ id: "defense_value", name: "防御值", stacks: 10 });
  grantFreshBigCard(state, target, { cardId: "10655", instanceId: "borrowed-pig", onlyAbilityId: PIG_ID });
  assert.equal(target.hp, 0);
  assert.deepEqual(target.spareLives, []);
  assert.deepEqual(target.buffs, []);
  assert.ok(hasPig(target));
});

test("猎犬的后盾被移除后不再反弹", () => {
  let state = fixture();
  const host = state.players[0]!, target = state.players[1]!;
  const dogs = spawnHounds(state, host, target);
  dogs[0]!.skills = [];
  // Keep this check independent of the opposing sha attacks canceling each other.
  state.pendingActions[dogs[0]!.id] = { actions: [] };
  state = turn(state, cake, [{ type: "attack", attackId: "sha", stacks: 1, targetId: dogs[0]!.id }]);
  assert.equal(state.players.find((player) => player.id === dogs[0]!.id)!.hp, 35);
});
