import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getActiveSkillCount,
  getPlayerInitialHp, getSkill, KAIGE_CARD_ID, KAIGE_HOLY_ID, RED_LOTUS_CARD_ID, RED_LOTUS_DEATH_DUE, RED_LOTUS_FINALE, RED_LOTUS_FLAME,
  RED_LOTUS_HEART, RED_LOTUS_KARMA, RED_LOTUS_LIFE, RED_LOTUS_NINE, RED_LOTUS_RAIN, redLotusFlameCount,
  startGame, submitActionWindowSkill, submitPlayerAction, THUNDER_TRIBULATION_CARD_ID, validateActionWindowSkill,
  type GameState, type PlayerAction, type SkillAction
} from "../packages/shared/src";
import { getLifeEffects, portableLife } from "../packages/shared/src/engine/lifeEffects";
import { getStatusOverview } from "../packages/shared/src/engine/statusOverview";

const pass: PlayerAction = { type: "gain_cake" };
const stone: PlayerAction = { type: "defense", defense: "stone" };
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", stacks: 1, targetId });
const use = (skillId: string, extra: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...extra });
const owner = (state: GameState) => state.players[0]!;

function advance(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; i < 75 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(onlyAbilityId?: string): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁", "戊"]) state = addPlayerToGame(state, createPlayer(name));
  owner(state).bigCards = [{ instanceId: "red-lotus", cardId: RED_LOTUS_CARD_ID, ...(onlyAbilityId ? { onlyAbilityId } : {}) }];
  return advance(startGame(state));
}

function turn(state: GameState, ...moves: Array<PlayerAction | undefined>): GameState {
  const ids = state.players.map(({ id }) => id);
  for (const [index, id] of ids.entries()) {
    if (state.phase !== "collecting_actions") break;
    const player = state.players.find((entry) => entry.id === id)!;
    if (player.status !== "alive" || state.pendingActions[id]) continue;
    player.cakes = 10;
    state = submitPlayerAction(state, id, moves[index] ?? pass).state;
  }
  return state;
}

function flames(state: GameState, stacks: number) {
  owner(state).buffs = owner(state).buffs.filter(({ id }) => id !== RED_LOTUS_FLAME);
  owner(state).buffs.push({ id: RED_LOTUS_FLAME, name: "焰印记", stacks });
}

function ignoreSpell(state: GameState, index: number) {
  state.players[index]!.buffs.push({ id: "test-ignore-spell", name: "无视法伤", stacks: 1, ignoredDamageKinds: ["spell"] });
}

test("灼心之焰使普通攻击成为火系，群攻只产生一笔自己的火系法伤", () => {
  let state = fixture();
  const initial = owner(state).hp;
  const target = state.players[1]!.id;
  state = advance(turn(state, { type: "attack", attackId: "wan_jian", stacks: 1 }));
  assert.equal(owner(state).hp, initial - 1);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === target && event.attackDamage && event.element === "fire"));
  const backlash = state.eventLog.filter((event) => event.type === "damage" && event.sourceAbilityId === RED_LOTUS_HEART);
  assert.equal(backlash.length, 1);
  assert.ok(backlash.every((event) => event.spellDamage && !event.internalDamage && event.element === "fire"));
});

test("鎏光火雨以石头防，伤害免疫仍算命中，焰显示在印记且跨轮保留", () => {
  const state = fixture();
  for (const target of state.players.slice(1)) appendSkillInstances(target, ["1074"]);
  const resolved = advance(turn(state, use(RED_LOTUS_RAIN), stone));
  assert.equal(redLotusFlameCount(owner(resolved)), 3);
  assert.ok(resolved.roundNumber > state.roundNumber);
  const overview = getStatusOverview(resolved, owner(resolved));
  assert.ok(overview.marks.some((row) => row.label === "焰印记" && row.value === "3 层"));
  assert.ok(!overview.elements.some((row) => row.label.includes("焰")));
});

test("冠世莲华提供可转移的附带效果，换入后原命浴火重生且每次普通死亡都追加满血命", () => {
  let state = fixture();
  const id = owner(state).id;
  state = advance(turn(state, use(RED_LOTUS_LIFE)));
  const life = owner(state).spareLives?.[0]!;
  assert.equal(life.hp, 0);
  assert.deepEqual(getLifeEffects(portableLife(owner(state), life)), [{ kind: "red_lotus" }]);
  assert.equal(getActiveSkillCount(owner(state), "1064"), 0);
  owner(state).hp = 0;
  state = advance(turn(state, pass, sha(id)));
  assert.equal(owner(state).hp, 0);
  assert.equal(getActiveSkillCount(owner(state), "1064"), 1);
  assert.ok(getStatusOverview(state, owner(state)).lives[0]?.value.includes("普通死亡时获得一条满血命"));

  appendSkillInstances(state.players[1]!, ["1077"]);
  for (let expected = 1; expected <= 2; expected++) {
    owner(state).hp = 0;
    state = advance(turn(state, pass, use("1077", { targetId: id })));
    assert.equal(owner(state).hp, getPlayerInitialHp(owner(state)));
    assert.equal(owner(state).spareLives?.length, expected);
    assert.ok(owner(state).spareLives?.every((life) => life.hp === owner(state).hp && !getLifeEffects(life).length));
    assert.equal(getActiveSkillCount(owner(state), "1064"), 1);
  }
});

test("九天红焰只打同空间其他人，消耗全部印记，每次需要九层", () => {
  let state = fixture(RED_LOTUS_NINE);
  const id = owner(state).id;
  state.players[4]!.spaceId = "private";
  state.smallSpaces = { private: { name: "测试小空间", kind: "self_isolation", expiresAtRound: 10, cakeMultiplier: 1 } };
  appendSkillInstances(state.players[2]!, ["1074"]);
  flames(state, 8);
  assert.equal(validateActionWindowSkill(state, id, use(RED_LOTUS_NINE)).ok, false);
  flames(state, 12);
  state = advance(submitActionWindowSkill(state, id, use(RED_LOTUS_NINE)));
  assert.equal(redLotusFlameCount(owner(state)), 0);
  assert.equal(state.players[1]!.defeatLevel, 2);
  assert.equal(state.players[2]!.status, "alive");
  assert.equal(state.players[4]!.status, "alive");
  assert.equal(owner(state).status, "alive");
  assert.equal(validateActionWindowSkill(state, id, use(RED_LOTUS_NINE)).ok, false);
});

test("红莲天火按实际生效的免疫升为消失，整张万雷劫狱谷承受必杀，使用后废除终招", () => {
  let state = fixture();
  const id = owner(state).id;
  appendSkillInstances(state.players[2]!, ["1074"]);
  state.players[3]!.bigCards = [{ instanceId: "thunder", cardId: THUNDER_TRIBULATION_CARD_ID, initialized: true }];
  ignoreSpell(state, 4);
  state = submitActionWindowSkill(state, id, use(RED_LOTUS_FINALE));
  assert.equal(state.players[1]!.defeatLevel, 2);
  assert.equal(state.players[2]!.defeatLevel, 3);
  assert.equal(state.players[3]!.defeatLevel, 4);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceAbilityId === RED_LOTUS_FINALE && event.element === "fire"));
  assert.equal(owner(state).redLotusFinaleUsed, true);
  assert.ok(owner(state).bigCards?.[0]?.lostAbilityIds?.includes(RED_LOTUS_FINALE));
  assert.ok(owner(state).buffs.some(({ id }) => id === RED_LOTUS_DEATH_DUE));
  assert.ok(getSkill(RED_LOTUS_FINALE)?.typeTags.includes("限定技"));
});

test("红莲天火区分未生效的圣洁和实际持有的圣洁", () => {
  let state = fixture();
  const id = owner(state).id;
  state.players[1]!.bigCards = [{ instanceId: "dormant-holy", cardId: KAIGE_CARD_ID, initialized: true }];
  state.players[1]!.kaigeLife = { cardInstanceId: "dormant-holy", stage: 1 };
  state.players[2]!.bigCards = [{ instanceId: "active-holy", cardId: KAIGE_CARD_ID, onlyAbilityId: KAIGE_HOLY_ID, initialized: true }];
  ignoreSpell(state, 4);
  state = submitActionWindowSkill(state, id, use(RED_LOTUS_FINALE));
  assert.equal(state.players[1]!.defeatLevel, 2);
  assert.equal(state.players[2]!.defeatLevel, 3);
});

test("终招下回合初令自己普通死亡，火系判定可触发浴火重生", () => {
  let state = fixture();
  const id = owner(state).id;
  appendSkillInstances(owner(state), ["1064"]);
  for (let i = 1; i < state.players.length; i++) ignoreSpell(state, i);
  state = advance(submitActionWindowSkill(state, id, use(RED_LOTUS_FINALE)));
  const releaseTurn = state.turnNumber;
  assert.equal(owner(state).status, "alive");
  state = advance(turn(state));
  assert.ok(state.turnNumber > releaseTurn);
  assert.ok(state.eventLog.some((event) => event.type === "heal" && event.targetId === id && event.reason === "浴火重生"));
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.targetId === id && event.sourceAbilityId === RED_LOTUS_FINALE));
});

test("业火红莲每层焰只穿透一个适用免疫副本，不消耗焰", () => {
  let state = fixture();
  const target = state.players[1]!;
  owner(state).redLotusFinaleUsed = true;
  assert.equal(getActiveSkillCount(owner(state), RED_LOTUS_KARMA), 1);
  appendSkillInstances(target, ["1074", "1074"]);
  flames(state, 1);
  state = advance(turn(state, sha(target.id)));
  assert.equal(state.players[1]!.hp, target.hp);
  flames(state, 2);
  state = advance(turn(state, sha(target.id)));
  assert.equal(state.players[1]!.hp, target.hp - 1);
  assert.equal(redLotusFlameCount(owner(state)), 2);
});

test("业火红莲也能穿过变伤阶段结算的法伤免疫", () => {
  let state = fixture();
  const id = owner(state).id;
  const initialHp = state.players[1]!.hp;
  state.players[1]!.bigCards = [{ instanceId: "active-holy", cardId: KAIGE_CARD_ID, onlyAbilityId: KAIGE_HOLY_ID, initialized: true }];
  for (let i = 2; i < state.players.length; i++) ignoreSpell(state, i);
  owner(state).redLotusFinaleUsed = true;
  appendSkillInstances(owner(state), ["1012"]);
  flames(state, 1);
  state = advance(turn(state), "turn_end_action");
  state = advance(submitActionWindowSkill(state, id, use("1012")));
  assert.equal(state.players[1]!.hp, initialHp - 1);
  assert.equal(redLotusFlameCount(owner(state)), 1);
});
