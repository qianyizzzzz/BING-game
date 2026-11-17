import assert from "node:assert/strict";
import { test } from "node:test";
import { addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getActiveSkillCount,
  startGame, submitActionWindowSkill, submitPlayerAction, type GameState, type PlayerAction } from "../packages/shared/src";
import { combatValue } from "../packages/shared/src/engine/combatValues";
import { getPlayerHpCapValue } from "../packages/shared/src/engine/infiniteValues";
import { getDecayMarkCount, grantDecayMarks } from "../packages/shared/src/engine/decayHp";
import { ANNIHILATION_MARK, DECAY_CARD_ID, DECAY_EXTREME_ID, DECAY_HALF_ID, DECAY_MARK, DECAY_SPREAD_ID } from "../packages/shared/src/engine/decayIds";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";

const cake = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;

function advance(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let n = 0; n < 40 && state.phase === "action_window" && state.activeTimingPhase !== stop; n++) state = advanceActionWindow(state);
  return state;
}

function fixture(unlocked = false, opponentCard?: string): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 2, firstTurnNoAttack: false, initialHp: 40 });
  state = addPlayerToGame(state, createPlayer("乙"));
  state = addPlayerToGame(state, createPlayer("丙"));
  state.players[0]!.bigCards = [{ cardId: DECAY_CARD_ID, instanceId: "decay", ...(unlocked ? { decayUnlocked: true } : {}) }];
  if (opponentCard) state.players[1]!.bigCards = [{ cardId: opponentCard, instanceId: "opponent" }];
  return advance(startGame(state));
}

function reveal(state: GameState, ...moves: PlayerAction[]): GameState {
  for (const [index, player] of state.players.entries()) {
    const result = submitPlayerAction(state, player.id, moves[index] ?? cake);
    assert.equal(result.error, undefined);
    state = result.state;
  }
  return state;
}

test("破败之道开局限制到24血，累计造成6点实际伤害解锁", () => {
  let state = fixture();
  const [owner, target] = state.players;
  assert.ok(state.players.every((player) => player.hp === 24));
  assert.equal(getActiveSkillCount(owner, DECAY_HALF_ID), 0);
  owner!.cakes = 3;
  state = advance(reveal(state, { type: "attack", attackId: "sha", stacks: 3, targetId: target!.id }), "turn_end_action");
  assert.equal(state.players[0]!.bigCards![0]!.decayUnlocked, true);
  assert.equal(getActiveSkillCount(state.players[0], DECAY_HALF_ID), 1);
});

test("技能攻击穿过聚能盾及防御值，防御值保留", () => {
  let state = fixture(false, "10504");
  const [owner, target] = state.players;
  appendSkillInstances(owner!, ["1081"]);
  owner!.cakes = 10;
  changeElementAmount(target!, "聚", 2);
  state = advance(reveal(state, { type: "skill", skillId: "1081", targetId: target!.id, stacks: 1 },
    { type: "skill", skillId: "1050403", bigCardInstanceId: "opponent", stacks: 1 }), "turn_end_action");
  assert.ok(state.players[1]!.hp < 24);
  assert.equal(state.players[0]!.hp, 24);
  assert.equal(state.players[1]!.buffs.find((buff) => buff.id === "defense_value")?.stacks, 10);
});

test("天芒六芒星后手不能转化技能攻击，独立的闪现仍可回避", (context) => {
  let roll = 0.71;
  context.mock.method(Math, "random", () => (roll += 0.00001));
  for (const flash of [false, true]) {
    let state = fixture(false, "10523");
    const [owner, target] = state.players;
    appendSkillInstances(owner!, ["1081"]);
    if (flash) appendSkillInstances(target!, ["1102"]);
    changeElementAmount(target!, "芒", 1);
    owner!.cakes = 10;
    state = reveal(state, { type: "skill", skillId: "1081", targetId: target!.id, stacks: 1 });
    if (flash) state = submitActionWindowSkill(state, target!.id, { type: "skill", skillId: "1102", stacks: 1 });
    else {
      state = advance(state, "turn_damage_modify");
      state = submitActionWindowSkill(state, target!.id, { type: "skill", skillId: "1052302", bigCardInstanceId: "opponent", stacks: 1 });
    }
    state = advance(state, "turn_end_action");
    assert.equal(state.players[1]!.hp < 24, !flash);
  }
});

test("衰败减半向下取整，石头防住时改为施加三层破败", () => {
  for (const blocked of [false, true]) {
    let state = fixture(true);
    const [owner, target] = state.players;
    owner!.cakes = 3;
    target!.hp = 19;
    state = advance(reveal(state, { type: "skill", skillId: DECAY_HALF_ID, bigCardInstanceId: "decay", targetId: target!.id, stacks: 1 },
      blocked ? stone : cake), "turn_end_action");
    assert.equal(state.players[1]!.hp, blocked ? 19 : 9);
    assert.equal(getDecayMarkCount(state.players[1], DECAY_MARK), blocked ? 3 : 0);
  }
});

test("极灭用上本次寂灭印记，并和对向杀分别结算", () => {
  let state = fixture(true);
  const [owner, target] = state.players;
  owner!.cakes = 3;
  target!.cakes = 1;
  grantDecayMarks(owner!, ANNIHILATION_MARK);
  state = advance(reveal(state, { type: "skill", skillId: DECAY_EXTREME_ID, bigCardInstanceId: "decay", targetId: target!.id, stacks: 1 },
    { type: "attack", attackId: "sha", targetId: owner!.id, stacks: 1 }), "turn_end_action");
  const event = state.eventLog.find((entry) => entry.type === "damage" && entry.attackName === "极灭");
  assert.ok(event?.type === "damage");
  assert.equal(event.amountValue?.[0]?.exponent, 2);
  assert.ok(state.eventLog.some((entry) => entry.type === "damage" && entry.attackName === "杀" && entry.targetId === owner!.id));
  assert.equal(getDecayMarkCount(state.players[0], ANNIHILATION_MARK), 2);
});

test("破败之道主出招给其他人破败，受伤时逐笔扣上限", () => {
  let state = fixture(true);
  const [owner, target, other] = state.players;
  owner!.cakes = 3;
  state = advance(reveal(state, { type: "skill", skillId: DECAY_SPREAD_ID, bigCardInstanceId: "decay", stacks: 1 }));
  assert.equal(getDecayMarkCount(state.players[0], ANNIHILATION_MARK), 1);
  assert.equal(getDecayMarkCount(state.players[1], DECAY_MARK), 1);
  assert.equal(getDecayMarkCount(state.players[2], DECAY_MARK), 1);
  state.players[0]!.cakes = state.players[2]!.cakes = 1;
  const hit: PlayerAction = { type: "attack", attackId: "sha", targetId: target!.id, stacks: 1 };
  state = advance(reveal(state, hit, cake, hit), "turn_end_action");
  assert.equal(getDecayMarkCount(state.players[0], ANNIHILATION_MARK), 2);
  assert.deepEqual(getPlayerHpCapValue(state.players[1]!), combatValue(20));
  assert.ok(state.players[1]!.hp < 20);
  assert.ok(state.eventLog.some((entry) => entry.type === "damage" && entry.sourceId === other!.id));
});

test("神域魔晶让负无限级的极灭重新进入对撞", () => {
  let state = fixture(true, "10548");
  const [owner, target] = state.players;
  owner!.cakes = 3;
  target!.cakes = 1;
  state = advance(reveal(state, { type: "skill", skillId: DECAY_EXTREME_ID, bigCardInstanceId: "decay", targetId: target!.id, stacks: 1 },
    { type: "attack", attackId: "sha", targetId: owner!.id, stacks: 1 }), "turn_end_action");
  assert.ok(state.eventLog.some((entry) => entry.type === "clash"));
  assert.match(state.eventLog.find((entry) => entry.type === "clash")?.result ?? "", /杀 等级更高/);
  assert.equal(state.eventLog.filter((entry) => entry.type === "damage" && entry.attackName === "极灭" && entry.targetId === target!.id).length, 0);
  assert.equal(getDecayMarkCount(state.players[0], ANNIHILATION_MARK), 1);
  assert.equal(getDecayMarkCount(state.players[1], DECAY_MARK), 1);
});

test("电磁炮按群体法伤出招触发，每招只加一层寂灭", () => {
  let state = fixture(true);
  const [owner] = state.players;
  owner!.bigCards!.push({ cardId: "10504", instanceId: "juneng" });
  changeElementAmount(owner!, "聚", 10);
  state = advance(reveal(state, { type: "skill", skillId: "1050404", bigCardInstanceId: "juneng", stacks: 1 }), "turn_end_action");
  assert.equal(getDecayMarkCount(state.players[0], ANNIHILATION_MARK), 1);
  assert.deepEqual(state.players.slice(1).map((player) => getPlayerHpCapValue(player)), [combatValue(23), combatValue(23)]);
  assert.ok(state.eventLog.some((entry) => entry.type === "damage" && entry.attackName === "电磁炮" && !entry.attackDamage));
});

test("反弹经过破败之道持有者时不挂破败，改到该持有者时才挂", () => {
  for (const redirectedToOwner of [false, true]) {
    let state = fixture(true);
    const [owner, attacker, other] = state.players;
    attacker!.cakes = 1;
    const reflected = redirectedToOwner ? other! : owner!;
    reflected.cakes = 1;
    const sha: PlayerAction = { type: "attack", attackId: "sha", targetId: reflected.id, stacks: 1 };
    const rebound: PlayerAction = { type: "defense", defense: "rebound", targetId: (redirectedToOwner ? owner : other)!.id };
    state = advance(reveal(state, redirectedToOwner ? cake : rebound, sha, redirectedToOwner ? rebound : cake), "turn_end_action");
    assert.equal(getDecayMarkCount(state.players[1], DECAY_MARK), redirectedToOwner ? 1 : 0);
  }
});
