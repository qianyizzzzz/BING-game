import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, controlledDemons, createGame, createPlayer, getCombatSeatNumbers, getSkillAttackStats, getTablePlayers, getVisibleStatusOverview,
  startGame, submitActionWindowSkill, submitPlayerAction, toPublicGameState, validateActionWindowSkill,
  type DamageEvent, type GameState, type PlayerAction, type SkillAction, type SkillTimingPhase
} from "../packages/shared/src";
import { isHound, participantCount } from "../packages/shared/src/engine/beastTraits";
import { combatValue } from "../packages/shared/src/engine/combatValues";
import { demonDamageAfterReduction, empowerDemonAttack } from "../packages/shared/src/engine/demons";
import { DEMON_EVIL_HOUND_ID, DEMON_FEAR_HOUND_ID } from "../packages/shared/src/engine/demonIds";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { getSkillPlay } from "../packages/shared/src/skills/registry";

const cake = { type: "gain_cake" } as const;
const attack = (targetId: string, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", stacks, targetId });
const skill = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });

function find(state: GameState, id: string) {
  const player = state.players.find((entry) => entry.id === id);
  assert.ok(player, `缺少玩家或傀儡 ${id}`);
  return player;
}

function summons(state: GameState, kind: string) {
  return state.players.filter((player) => player.summon?.kind === kind);
}

function advance(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let index = 0; state.phase === "action_window" && index < 80; index++) {
    if (state.activeTimingPhase === stop) return state;
    state = advanceActionWindow(state);
  }
  assert.notEqual(state.phase, "action_window", "行动阶段没有正常结束");
  return state;
}

function fixture() {
  let state = createGame("召唤师", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false, initialHp: 500 });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  const [owner, target, other, last] = state.players.map(({ id }) => id);
  state.players[0]!.bigCards = [{ cardId: "10551", instanceId: "demon-card" }];
  state = startGame(state);
  assert.equal(state.phase, "action_window");
  for (const player of state.players) player.cakes = 300;
  return { state, owner: owner!, target: target!, other: other!, last: last! };
}

function turn(state: GameState, moves: Record<string, PlayerAction> = {}, stop?: SkillTimingPhase): GameState {
  state = advance(state);
  assert.equal(state.phase, "collecting_actions");
  const players = state.players.filter((player) => player.status === "alive" && !player.summon);
  for (const { id } of players) {
    if (state.phase !== "collecting_actions") break;
    if (state.pendingActions[id]) continue;
    const before = state.turnNumber;
    const result = submitPlayerAction(state, id, moves[id] ?? cake);
    state = result.state;
    assert.ok(state.phase !== "collecting_actions" || state.turnNumber !== before || state.pendingActions[id], `出招未提交 ${id}`);
  }
  return advance(state, stop);
}

const damageFrom = (state: GameState, start: number, sourceId: string) =>
  state.eventLog.slice(start).filter((event): event is DamageEvent => event.type === "damage" && event.sourceId === sourceId);

test("同一阶段可以召唤不同恶魔，面前造物不挤座次，双恐惧猎犬在目标两侧", () => {
  let { state, owner, target, other } = fixture();
  const table = getTablePlayers(state).map(({ id }) => id);
  state = submitActionWindowSkill(state, owner, skill("1055102"));
  state = submitActionWindowSkill(state, owner, skill("1055103"));
  state = submitActionWindowSkill(state, owner, skill("1055104", { targetId: target }));
  state = submitActionWindowSkill(state, owner, skill("1055105", { targetId: other }));
  const [imp] = summons(state, "imp");
  const [walker] = summons(state, "voidwalker");
  const dogs = summons(state, "fear_hound");
  const [evil] = summons(state, "evil_hound");
  assert.ok(imp && walker && evil);
  assert.deepEqual([imp.hp, walker.hp, evil.hp, ...dogs.map(({ hp }) => hp)], [15, 100, 45, 30, 30]);
  assert.deepEqual([imp, walker, evil].map((player) => player.summon?.tableFrontPlayerId), [owner, owner, other]);
  assert.ok([imp, walker, evil, ...dogs].every((player) => player.entityClasses?.includes("demon")));
  assert.ok([evil, ...dogs].every((player) => isHound(player)));
  assert.deepEqual(getTablePlayers(state).map(({ id }) => id), table);
  assert.equal(participantCount(state.players), 4);
  const seats = getCombatSeatNumbers(state);
  const targetSeat = seats.get(target)!;
  assert.deepEqual(dogs.map(({ id }) => seats.get(id)).sort((a, b) => a! - b!), [targetSeat - 1, targetSeat + 1]);
  assert.ok([imp, walker, evil].every(({ id }) => !seats.has(id)));
});

test("出招阶段随时召唤，保留玩家已提交的主出招", () => {
  let { state, owner, target } = fixture();
  state = advance(state);
  const move = attack(target);
  state = submitPlayerAction(state, owner, move).state;
  assert.deepEqual(state.pendingActions[owner]?.actions, [move]);
  state = submitActionWindowSkill(state, owner, skill("1055102"));
  assert.equal(state.phase, "collecting_actions");
  assert.deepEqual(state.pendingActions[owner]?.actions, [move]);
  assert.equal(summons(state, "imp").length, 1);
  state = turn(state);
  assert.equal(find(state, target).hp, 499);
});

test("两种猎犬在行动窗口选择一个目标，出招阶段也能召唤", () => {
  let { state, owner, target, other } = fixture();
  for (const id of [DEMON_FEAR_HOUND_ID, DEMON_EVIL_HOUND_ID]) {
    assert.equal(getSkillPlay(id)?.targetMode, "single");
    assert.equal(validateActionWindowSkill(state, owner, skill(id)).ok, false);
    assert.equal(validateActionWindowSkill(state, owner, skill(id, { targetId: owner })).ok, false);
  }
  state = advance(state, "turn_before_action");
  state = submitActionWindowSkill(state, owner, skill(DEMON_FEAR_HOUND_ID, { targetId: target }));
  assert.deepEqual(summons(state, "fear_hound").map((hound) => hound.summon?.targetId), [target, target]);

  state = advance(state);
  state.junengTargetLock = { targetId: other, expiresAtRound: state.roundNumber + 1 };
  state = submitActionWindowSkill(state, owner, skill(DEMON_EVIL_HOUND_ID, { targetId: target }));
  assert.equal(summons(state, "evil_hound")[0]?.summon?.targetId, other);
});

test("回合初召唤的小鬼和恶魔卫士可以当场下令并在本回合出招", () => {
  let { state, owner, target } = fixture();
  const impSummon = skill("1055102");
  state = submitActionWindowSkill(state, owner, impSummon);
  const earlierImp = summons(state, "imp")[0]!;
  state = advance(state, "turn_before_action");
  assert.equal(state.activeTimingPhase, "turn_before_action");
  assert.equal(validateActionWindowSkill(state, owner,
    skill("1055102_order", { demonId: earlierImp.id, demonOrder: "fireball", targetId: target })).ok, false);

  state = submitActionWindowSkill(state, owner, impSummon);
  state = submitActionWindowSkill(state, owner, skill("1055106", { demonPlacement: "front" }));
  const imp = summons(state, "imp").find(({ id }) => id !== earlierImp.id);
  const [guard] = summons(state, "guard");
  assert.ok(imp && guard);
  const publicState = toPublicGameState(state, owner);
  assert.deepEqual(controlledDemons(publicState, owner, "1055102_order").map(({ id }) => id), [imp.id]);
  assert.deepEqual(controlledDemons(publicState, owner, "1055106_order").map(({ id }) => id), [guard.id]);
  state = submitActionWindowSkill(state, owner, skill("1055102_order", {
    demonId: imp.id, demonOrder: "fireball", targetId: target
  }));
  state = submitActionWindowSkill(state, owner, skill("1055106_order", { demonId: guard.id, demonOrder: "power" }));
  state = submitActionWindowSkill(state, owner, skill("1055106_order", { demonId: guard.id, demonOrder: "whirlwind" }));
  const start = state.eventLog.length;
  state = turn(state, {}, "turn_before_action");
  assert.ok(damageFrom(state, start, imp.id).some(({ targetId, amount, attackName }) =>
    targetId === target && amount === 4 && attackName === "火球"));
  assert.ok(damageFrom(state, start, guard.id).some(({ targetId, amount, attackName }) =>
    targetId === target && amount === 100 && attackName === "旋风斩"));
  assert.equal(damageFrom(state, start, earlierImp.id).length, 0);
});

test("小鬼每三回合恢复三次，初始待命，火球锁定目标直到改令", () => {
  let { state, owner, target } = fixture();
  const summon = skill("1055102");
  for (let index = 0; index < 3; index++) state = submitActionWindowSkill(state, owner, summon);
  assert.equal(validateActionWindowSkill(state, owner, summon).ok, false);
  const [imp] = summons(state, "imp");
  assert.ok(imp);
  const order = skill("1055102_order", { demonId: imp.id, demonOrder: "fireball", targetId: target });
  assert.equal(validateActionWindowSkill(state, owner, order).ok, false);
  const start = state.eventLog.length;
  state = turn(state, {}, "turn_before_action");
  assert.equal(damageFrom(state, start, imp.id).length, 0);
  assert.equal(state.activeTimingPhase, "turn_before_action");
  assert.equal(validateActionWindowSkill(state, owner, summon).ok, false);
  state = submitActionWindowSkill(state, owner, order);
  const ordered = state.eventLog.length;
  state = turn(state, {}, "turn_before_action");
  assert.deepEqual(damageFrom(state, ordered, imp.id).filter(({ attackName }) => attackName === "火球").map(({ targetId }) => targetId), [target]);
  const next = state.eventLog.length;
  state = turn(state, {}, "turn_before_action");
  assert.deepEqual(damageFrom(state, next, imp.id).filter(({ attackName }) => attackName === "火球").map(({ targetId }) => targetId), [target]);
  for (let index = 0; index < 3; index++) state = submitActionWindowSkill(state, owner, summon);
  assert.equal(validateActionWindowSkill(state, owner, summon).ok, false);
  state = submitActionWindowSkill(state, owner, skill("1055102_order", { demonId: imp.id, demonOrder: "standby" }));
  const standby = state.eventLog.length;
  state = turn(state);
  assert.equal(damageFrom(state, standby, imp.id).length, 0);
});

test("恶魔深渊失效时已入场的恶魔留在场上，但不能同时再召唤", () => {
  let { state, owner } = fixture();
  state = submitActionWindowSkill(state, owner, skill("1055102"));
  const [imp] = summons(state, "imp");
  assert.ok(imp);
  find(state, owner).bigCards![0]!.lostAbilityIds = ["1055101"];
  assert.equal(validateActionWindowSkill(state, owner, skill("1055103")).ok, false);
  state = turn(state, {}, "turn_before_action");
  assert.equal(find(state, imp.id).status, "alive");
  assert.throws(() => submitActionWindowSkill(state, owner, skill("1055103")), /恶魔/);
});

test("虚空行者代受指向出招并自动发动南蛮入侵，群攻仍命中召唤师", () => {
  let { state, owner, target } = fixture();
  state = submitActionWindowSkill(state, owner, skill("1055103"));
  const [walker] = summons(state, "voidwalker");
  assert.ok(walker);
  assert.deepEqual(demonDamageAfterReduction(state, walker, combatValue(100)), combatValue(1));
  const start = state.eventLog.length;
  state = turn(state, { [target]: attack(owner, 4) }, "turn_before_action");
  assert.ok(state.eventLog.slice(start).some((event) => event.type === "clash" &&
    [event.attackerAId, event.attackerBId].includes(walker.id) && [event.attackerAId, event.attackerBId].includes(target)));
  assert.equal(find(state, owner).hp, 500);
  assert.ok(damageFrom(state, start, walker.id).some(({ attackName }) => attackName === "南蛮入侵"));
  const next = state.eventLog.length;
  find(state, target).cakes = 30;
  state = turn(state, { [target]: { type: "attack", attackId: "wan_jian", stacks: 1 } });
  assert.ok(damageFrom(state, next, target).some(({ targetId }) => targetId === owner));
});

test("恐惧猎犬命中挂四回合不可解除的恐惧，邪犬改写群攻目标且不挂恐惧", () => {
  let { state, owner, target, other } = fixture();
  state = submitActionWindowSkill(state, owner, skill("1055104", { targetId: target }));
  state = submitActionWindowSkill(state, owner, skill("1055105", { targetId: other }));
  const [evil] = summons(state, "evil_hound");
  assert.ok(evil);
  const hitTurn = state.turnNumber;
  state = turn(state, {}, "turn_before_action");
  assert.equal(find(state, target).hp, 480);
  assert.equal(find(state, other).hp, 490);
  assert.ok(find(state, target).buffs.some((buff) => buff.name === "恐惧" && buff.uncleansable && buff.expiresAtTurn === hitTurn + 5));
  assert.equal(find(state, other).buffs.some((buff) => buff.name === "恐惧"), false);
  find(state, other).cakes = 50;
  const start = state.eventLog.length;
  state = turn(state, { [other]: { type: "attack", attackId: "wan_jian", stacks: 20 } });
  const hits = damageFrom(state, start, other);
  assert.ok(hits.some(({ targetId }) => targetId === evil.id));
  assert.ok(hits.every(({ targetId }) => targetId === evil.id));
});

test("邪犬把群体非攻击出招的法伤也限于自身", () => {
  let { state, owner, target, other } = fixture();
  state = submitActionWindowSkill(state, owner, skill("1055105", { targetId: target }));
  const [evil] = summons(state, "evil_hound");
  assert.ok(evil);
  const caster = find(state, target);
  caster.bigCards = [{ cardId: "10504", instanceId: "cannon-card" }];
  changeElementAmount(caster, "聚", 2);
  const start = state.eventLog.length;
  state = turn(state, { [target]: skill("1050404") });
  assert.deepEqual(damageFrom(state, start, target).filter(({ attackName }) => attackName === "电磁炮")
    .map(({ targetId, amount }) => [targetId, amount]), [[evil.id, 20]]);
  assert.equal(find(state, owner).hp, 500);
  assert.equal(find(state, other).hp, 500);
});

test("恶魔卫士可摆在两侧，恶魔力量即时强化下一发旋风斩", () => {
  let { state, owner, target } = fixture();
  state = submitActionWindowSkill(state, owner, skill("1055106", { demonPlacement: "right" }));
  const [guard] = summons(state, "guard");
  assert.ok(guard);
  const seats = getCombatSeatNumbers(state);
  assert.equal(seats.get(guard.id), seats.get(owner)! + 1);
  state = turn(state, {}, "turn_before_action");
  const power = skill("1055106_order", { demonId: guard.id, demonOrder: "power" });
  const whirl = skill("1055106_order", { demonId: guard.id, demonOrder: "whirlwind" });
  state = submitActionWindowSkill(state, owner, power);
  assert.equal(validateActionWindowSkill(state, owner, power).ok, false);
  state = submitActionWindowSkill(state, owner, whirl);
  const start = state.eventLog.length;
  state = turn(state, {}, "turn_before_action");
  assert.ok(damageFrom(state, start, guard.id).some(({ targetId, amount, attackName }) => targetId === target && amount === 100 && attackName === "旋风斩"));
  assert.equal(validateActionWindowSkill(state, owner, power).ok, false);
  state = submitActionWindowSkill(state, owner, whirl);
  const next = state.eventLog.length;
  state = turn(state);
  assert.ok(damageFrom(state, next, guard.id).some(({ targetId, amount }) => targetId === target && amount === 10));
});

test("军团打击即使被指定目标防住仍禁止行动，两种出招共用冷却", () => {
  let { state, owner, target } = fixture();
  state = submitActionWindowSkill(state, owner, skill("1055106", { demonPlacement: "front" }));
  const [guard] = summons(state, "guard");
  assert.ok(guard);
  state = turn(state, {}, "turn_before_action");
  const fields = { demonId: guard.id, targetId: target };
  state = submitActionWindowSkill(state, owner, skill("1055106_order", { ...fields, demonOrder: "legion_area" }));
  const start = state.turnNumber;
  state = turn(state, { [target]: { type: "defense", defense: "youtiao" } }, "turn_before_action");
  assert.equal(find(state, target).hp, 500);
  assert.ok(find(state, target).buffs.some((buff) => buff.name.includes("军团打击")));
  assert.equal(validateActionWindowSkill(state, owner, skill("1055106_order", { ...fields, demonOrder: "legion_single" })).ok, false);
  for (let offset = 1; offset <= 4; offset++) {
    state = advance(state);
    assert.equal(state.turnNumber, start + offset);
    assert.deepEqual(state.pendingActions[target]?.actions, []);
    state = turn(state, {}, "turn_before_action");
  }
  state = advance(state);
  assert.equal(state.turnNumber, start + 5);
  assert.equal(state.pendingActions[target], undefined);
});

test("暴君吸取在场恶魔当前血量，存续时减免后来召唤恶魔受到的伤害", () => {
  let { state, owner, target } = fixture();
  state = submitActionWindowSkill(state, owner, skill("1055102"));
  state = submitActionWindowSkill(state, owner, skill("1055107"));
  const [tyrant] = summons(state, "tyrant");
  const [imp] = summons(state, "imp");
  assert.ok(tyrant && imp);
  assert.equal(find(state, owner).hp, 500);
  assert.equal(find(state, imp.id).hp, 12);
  // 自身也先被吸取，随后获得从所有恶魔实际吸到的 63 血。
  assert.equal(find(state, tyrant.id).hp, 303);
  state = submitActionWindowSkill(state, owner, skill("1055102"));
  const late = summons(state, "imp").find(({ id }) => id !== imp.id);
  assert.ok(late);
  assert.equal(late.hp, 15);
  assert.deepEqual(demonDamageAfterReduction(state, late, combatValue(62)), []);
  assert.deepEqual(demonDamageAfterReduction(state, late, combatValue(125)), combatValue(1));
  assert.equal(empowerDemonAttack(state, late, getSkillAttackStats("1077", 1)!).level, 25);
  const start = state.eventLog.length;
  state = turn(state, { [target]: attack(late.id, 63) }, "turn_before_action");
  assert.deepEqual(damageFrom(state, start, target).map(({ targetId, amount }) => [targetId, amount]), [[late.id, 1]]);
  assert.equal(damageFrom(state, start, tyrant.id).length, 0);
  find(state, target).hp = 2000;
  state = submitActionWindowSkill(state, owner, skill("1055102_order", { demonId: late.id, demonOrder: "fireball", targetId: target }));
  const fireball = state.eventLog.length;
  state = turn(state, {}, "turn_before_action");
  const empowered = damageFrom(state, fireball, late.id).find(({ targetId, attackName }) => targetId === target && attackName === "火球");
  assert.equal(empowered?.amount, 1058);
  find(state, tyrant.id).status = "dead";
  const base = state.eventLog.length;
  state = turn(state);
  assert.ok(damageFrom(state, base, late.id).some(({ targetId, amount, attackName }) => targetId === target && amount === 4 && attackName === "火球"));
});

test("暴君入场对每只恶魔的两成吸血分别向下取整，减伤后不足一点不扣血", () => {
  let { state, owner } = fixture();
  state = submitActionWindowSkill(state, owner, skill("1055102"));
  const [imp] = summons(state, "imp");
  assert.ok(imp);
  imp.hp = 19;
  state = submitActionWindowSkill(state, owner, skill("1055103"));
  const [walker] = summons(state, "voidwalker");
  assert.ok(walker);
  state = submitActionWindowSkill(state, owner, skill("1055107"));
  const [tyrant] = summons(state, "tyrant");
  assert.ok(tyrant);
  assert.equal(find(state, imp.id).hp, 16);
  assert.equal(find(state, walker.id).hp, 100);
  assert.equal(tyrant.hp, 303);
  assert.deepEqual(tyrant.summon?.tyrantDrain, combatValue(63));
});

test("暴君加成和减免相消时，一点伤害不会因浮点误差变成零", () => {
  let { state, owner } = fixture();
  state = submitActionWindowSkill(state, owner, skill("1055103"));
  state = submitActionWindowSkill(state, owner, skill("1055102"));
  state = submitActionWindowSkill(state, owner, skill("1055107"));
  const [walker] = summons(state, "voidwalker");
  const [imp] = summons(state, "imp");
  const [tyrant] = summons(state, "tyrant");
  assert.ok(walker && imp && tyrant?.summon);
  tyrant.summon.tyrantDrain = combatValue(98);
  const attack = empowerDemonAttack(state, walker, { ...getSkillAttackStats("1077", 1)!, power: 3, powerValue: combatValue(3) });
  assert.equal(attack.power, 98);
  assert.deepEqual(demonDamageAfterReduction(state, imp, attack.powerValue!), combatValue(1));
});

test("暴君的公开特殊状态显示实际吸血、倍率和受伤除数", () => {
  let { state, owner, target } = fixture();
  state = submitActionWindowSkill(state, owner, skill("1055102"));
  const [imp] = summons(state, "imp");
  assert.ok(imp);
  imp.hp = 5;
  state = submitActionWindowSkill(state, owner, skill("1055107"));
  const [tyrant] = summons(state, "tyrant");
  assert.ok(tyrant);
  const publicState = toPublicGameState(state, target);
  assert.deepEqual(getVisibleStatusOverview(publicState, tyrant.id)?.special, [{
    label: "暴君光环",
    value: "实际吸取 61 血 · 恶魔攻击 ×(61/3) · 小鬼火球额外攻等 ×12.2 · 恶魔受伤 ÷61"
  }]);
  assert.equal(getVisibleStatusOverview(publicState, owner)?.special.some(({ label }) => label === "暴君光环"), false);
  tyrant.status = "dead";
  assert.deepEqual(getVisibleStatusOverview(toPublicGameState(state, target), tyrant.id)?.special, []);
});
