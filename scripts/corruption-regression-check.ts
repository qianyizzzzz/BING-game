import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer,
  getActiveSkillCount, getSkill, startGame, submitActionWindowSkill, submitPlayerAction,
  type ActionSubmission, type GameState, type SkillAction, type SkillTimingPhase
} from "../packages/shared/src";
import { getStatusOverview } from "../packages/shared/src/engine/statusOverview";
import { changeXielingMarks, getDueXieyuCount, getXieyuDrainValue, XIEYU_SKILL_ID } from "../packages/shared/src/engine/xieling";
import { XIELING_CARD_ID, XIELING_INHERIT_ID } from "../packages/shared/src/bigCards/abilities";
import { combatValue } from "../packages/shared/src/engine/combatValues";
import {
  CORRUPTION_CARD_ID, CORRUPTION_CLOUD_ID, CORRUPTION_CLOUD_ITEM, CORRUPTION_DOMAIN_ID,
  CORRUPTION_FIELD_ID, CORRUPTION_ROT_ID, CORRUPTION_ROT_STATE
} from "../packages/shared/src/engine/corruptionIds";

const cardInstanceId = "corruption-card";
const gainCake = { type: "gain_cake" } as const;
const at = (state: GameState, index = 0) => state.players[index]!;
const cast = (skillId: string, targetId?: string): SkillAction => ({
  type: "skill", skillId, stacks: 1, ...(targetId ? { targetId } : {})
});
const sha = (targetId: string) => ({ type: "attack", attackId: "sha", stacks: 1, targetId } as const);

function advanceWindows(state: GameState, stopAt?: SkillTimingPhase): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stopAt && i < 80; i++) {
    state = advanceActionWindow(state);
  }
  return state;
}

function game(ability?: string): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 1, initialHp: 18, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  at(state).bigCards = [{ cardId: CORRUPTION_CARD_ID, instanceId: cardInstanceId, ...(ability ? { onlyAbilityId: ability } : {}) }];
  state = advanceWindows(startGame(state));
  for (const player of state.players) player.cakes = 20;
  return state;
}

function submitTurn(state: GameState, moves: ActionSubmission[] = [], stopAt?: SkillTimingPhase): GameState {
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) {
    if (player.status === "alive") state = submitPlayerAction(state, player.id, moves[index] ?? gainCake).state;
  }
  return advanceWindows(state, stopAt);
}

function cloudIsListed(state: GameState, index = 0): boolean {
  return getStatusOverview(state, at(state, index)).items.some(({ label }) => label.includes("疾病云雾"));
}

function clouds(state: GameState, index: number) {
  return at(state, index).buffs.filter(({ itemKind }) => itemKind === CORRUPTION_CLOUD_ITEM);
}

test("疾病云雾授予有来源的邪域，每轮轮末触发一次", () => {
  let state = game(CORRUPTION_DOMAIN_ID);
  const owner = at(state);
  assert.equal(getActiveSkillCount(owner, XIEYU_SKILL_ID), 1);
  assert.ok(owner.skillInventory?.some(({ skillId, sourceBigCardInstanceId }) =>
    skillId === XIEYU_SKILL_ID && sourceBigCardInstanceId === cardInstanceId));
  assert.deepEqual([1, 2, 3].map((round) => getDueXieyuCount(owner, round)), [1, 1, 1]);
  appendSkillInstances(owner, [XIEYU_SKILL_ID]);
  assert.deepEqual([1, 2, 3].map((round) => getDueXieyuCount(owner, round)), [1, 1, 2]);

  state = submitTurn(state, [gainCake, sha(at(state, 2).id)]);
  const drains = state.eventLog.filter((event) =>
    event.type === "damage" && event.sourceId === owner.id && event.attackName === "邪域");
  assert.equal(drains.length, 1);
});

test("雾蚀界耗2饼群体吸1血，取消攻击者全部出招，且不受邪域专属增幅", () => {
  let state = game(CORRUPTION_FIELD_ID);
  const [owner, attacker, other, last] = state.players;
  at(state).hp = 10;
  at(state).bigCards!.push({ cardId: XIELING_CARD_ID, instanceId: "xieling-inherit", onlyAbilityId: XIELING_INHERIT_ID });
  changeXielingMarks(at(state), combatValue(15));
  assert.deepEqual(getXieyuDrainValue(at(state), state.roundNumber), combatValue(4));
  state = submitTurn(state, [cast(CORRUPTION_FIELD_ID),
    { actions: [sha(owner!.id), sha(other!.id)] }, sha(last!.id)]);
  assert.equal(at(state).hp, 13);
  assert.equal(at(state, 1).hp, 17);
  assert.equal(at(state, 2).hp, 17);
  assert.equal(at(state, 3).hp, 16);
  const damage = state.eventLog.filter((event) => event.type === "damage");
  assert.deepEqual(new Set(damage.filter((event) => event.sourceId === owner!.id && event.amount === 1)
    .map((event) => event.targetId)), new Set([attacker!.id, other!.id, last!.id]));
  assert.equal(damage.some((event) => event.attackName === "杀" && event.sourceId === attacker!.id), false);
  const spent = state.eventLog.filter((event) =>
    event.type === "cake_changed" && event.playerId === attacker!.id && event.reason === "招式消耗");
  assert.deepEqual(spent.map(({ before, after }) => before - after), [2]);
  const fieldCost = state.eventLog.filter((event) =>
    event.type === "cake_changed" && event.playerId === owner!.id && event.reason === "招式消耗");
  assert.deepEqual(fieldCost.map(({ before, after }) => before - after), [2]);
});

test("单重主动云雾含自身延长，列在其他物品且从当回合开始直扣十一回合", () => {
  let state = game(CORRUPTION_CLOUD_ID);
  const round = state.roundNumber;
  state = submitTurn(state, [cast(CORRUPTION_CLOUD_ID)]);
  assert.equal(cloudIsListed(state), true);
  assert.deepEqual(state.players.map(({ hp }) => hp), [18, 17, 17, 17]);
  for (let i = 0; i < 9; i++) state = submitTurn(state);
  assert.equal(cloudIsListed(state), true);
  state = submitTurn(state);
  assert.equal(cloudIsListed(state), false);
  assert.deepEqual(state.players.map(({ hp }) => hp), [18, 7, 7, 7]);
  assert.equal(state.roundNumber, round);
  assert.equal(state.eventLog.some((event) => event.type === "damage"), false);
  state = submitTurn(state);
  assert.deepEqual(state.players.map(({ hp }) => hp), [18, 7, 7, 7]);
});

test("云雾可直接减到负血并造成普通死亡，本轮继续", () => {
  let state = game();
  const round = state.roundNumber;
  at(state, 1).hp = 0;
  state = submitTurn(state, [cast(CORRUPTION_CLOUD_ID)]);
  assert.equal(at(state, 1).hp, -1);
  assert.equal(at(state, 1).defeatLevel, 1);
  assert.equal(at(state, 1).buffs.some(({ id }) => id === CORRUPTION_ROT_STATE), false);
  assert.equal(state.roundNumber, round);
});

test("疾病云雾叠两重耗2饼，新生两团和另一空间的既有云雾都延长两回合", () => {
  let state = game(CORRUPTION_CLOUD_ID);
  at(state, 1).bigCards = [{ cardId: CORRUPTION_CARD_ID, instanceId: "remote-corruption",
    onlyAbilityId: CORRUPTION_CLOUD_ID }];
  at(state, 1).spaceId = "remote";
  at(state, 3).spaceId = "remote";
  state.smallSpaces = { remote: { name: "自我封闭", kind: "self_isolation", expiresAtRound: 3, cakeMultiplier: 1 } };
  state = submitTurn(state, [gainCake, cast(CORRUPTION_CLOUD_ID)]);
  assert.deepEqual(state.players.map(({ hp }) => hp), [18, 18, 18, 17]);
  const oldExpiry = clouds(state, 1)[0]?.expiresAtTurn;
  assert.ok(oldExpiry);
  assert.equal(getSkill("1055004_extend"), undefined);
  const turnNumber = state.turnNumber;
  const before = at(state).cakes;
  state = submitTurn(state, [{ ...cast(CORRUPTION_CLOUD_ID), stacks: 2 }]);
  assert.equal(at(state).cakes, before - 2);
  assert.deepEqual(clouds(state, 0).map(({ expiresAtTurn }) => expiresAtTurn), [turnNumber + 12, turnNumber + 12]);
  assert.equal(clouds(state, 1)[0]?.expiresAtTurn, oldExpiry + 2);
  assert.deepEqual(state.players.map(({ hp }) => hp), [18, 18, 16, 16]);
});

test("雾蚀界法伤造成普通死亡时触发腐烂，跳过多余命和死亡响应", () => {
  let state = game();
  const target = at(state, 1);
  target.hp = 0;
  target.spareLives = [{ hp: 8 }];
  appendSkillInstances(target, ["1063"]);
  state = submitTurn(state, [cast(CORRUPTION_FIELD_ID)], "revival_action");
  assert.notEqual(state.activeTimingPhase, "revival_action");
  assert.equal(at(state, 1).status, "dead");
  assert.equal(at(state, 1).defeatLevel, 1);
  assert.ok(at(state, 1).buffs.some(({ stateType }) => stateType === CORRUPTION_ROT_STATE));
  assert.equal(cloudIsListed(state, 1), true);
});

test("持有腐烂时，卡牌授予和独立邪域致死都触发腐烂", () => {
  for (const granted of [true, false]) {
    let state = game(granted ? undefined : CORRUPTION_ROT_ID);
    if (!granted) {
      appendSkillInstances(at(state), [XIEYU_SKILL_ID]);
      state.roundNumber = 3;
    }
    const target = at(state, 1);
    target.hp = 0;
    target.spareLives = [{ hp: 8 }];
    state = submitTurn(state, [gainCake, gainCake, sha(at(state, 3).id)], "turn_end_action");
    assert.equal(state.activeTimingPhase, "turn_end_action");
    state = advanceWindows(submitActionWindowSkill(state, at(state).id, cast(XIEYU_SKILL_ID, target.id)));
    assert.equal(at(state, 1).status, "dead");
    assert.equal(at(state, 1).buffs.some(({ stateType }) => stateType === CORRUPTION_ROT_STATE), true);
  }
});

test("雾蚀界只打到零血时，随后的云雾直扣致死不继承雾蚀界归因", () => {
  let state = game();
  at(state, 1).hp = 2;
  state = submitTurn(state, [cast(CORRUPTION_CLOUD_ID)]);
  assert.equal(at(state, 1).hp, 1);
  state = submitTurn(state, [cast(CORRUPTION_FIELD_ID)]);
  assert.equal(at(state, 1).status, "dead");
  assert.equal(at(state, 1).buffs.some(({ stateType }) => stateType === CORRUPTION_ROT_STATE), false);
});
