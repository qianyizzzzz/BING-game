import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, beginActionPrompt, createGame, createPlayer, enterActionWindow, getBigCard, getMoveBlockReason,
  startGame, submitActionWindowSkill, submitPlayerAction, validateAction, validateActionWindowSkill,
  type GameState, type PlayerAction, type SkillAction
} from "../packages/shared/src";
import { hasShadowDance } from "../packages/shared/src/engine/shadowCombo";
import { SHADOW_WOUND_STATE } from "../packages/shared/src/engine/shadowDance";
import { TIANLIE_STAT_MULTIPLIER } from "../packages/shared/src/engine/tianlie";
import { HONGHUANG_CARD_ID, MOUNTAIN_SEAL_ID, SKY_ABSOLUTE_ID } from "../packages/shared/src/bigCards/abilities";
import { SKY_ABSOLUTE_COVER } from "../packages/shared/src/engine/lingta";
import {
  SHADOW_BLADE_DANCE_ID, SHADOW_BLADE_ID, SHADOW_CARD_ID, SHADOW_COMBO_ID, SHADOW_FOLLOW_ID, SHADOW_LEAVE_ID,
  SHADOW_SHRIEK_ID, SHADOW_STANCE_ID, SHADOW_STOP_SHRIEK_ID, SHADOW_WIND_DANCE_ID
} from "../packages/shared/src/engine/shadowIds";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const skill = (skillId: string, targetId?: string): SkillAction => ({
  type: "skill", skillId, stacks: 1, ...(targetId ? { targetId } : {})
});
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", stacks: 1, targetId });

function drain(state: GameState): GameState {
  for (let i = 0; i < 60 && state.phase === "action_window"; i++) state = advanceActionWindow(state);
  assert.notEqual(state.phase, "action_window");
  return state;
}

function game(...abilities: string[]): GameState {
  let state = createGame("隐", { skillMode: "big_test_select", skillCount: 6, firstTurnNoAttack: false, initialHp: 18, allowDuplicateBigCards: true });
  state = addPlayerToGame(state, createPlayer("乙"));
  state = addPlayerToGame(state, createPlayer("丙"));
  state.players[0]!.bigCards = abilities.includes(SHADOW_COMBO_ID) ? [{ cardId: SHADOW_CARD_ID, instanceId: "shadow",
    lostAbilityIds: getBigCard(SHADOW_CARD_ID)!.abilities.map(({ id }) => id).filter((id) => !abilities.includes(id)) }] :
    abilities.map((onlyAbilityId) => ({ cardId: SHADOW_CARD_ID, instanceId: onlyAbilityId, onlyAbilityId }));
  return drain(startGame(state));
}

function submit(state: GameState, ...moves: Array<PlayerAction | undefined>): GameState {
  for (const [index, { id, status }] of state.players.entries()) {
    if (state.phase !== "collecting_actions" || status !== "alive" || state.pendingActions[id]) continue;
    state = submitPlayerAction(state, id, moves[index] ?? cake).state;
  }
  return state;
}

test("轮初影舞挡选人，亮招退出，隐刃被饼防住后仍重新进入；止隐只能使用一次", () => {
  const card = getBigCard(SHADOW_CARD_ID);
  assert.equal(card?.implementationStatus, "implemented");
  assert.equal(card.abilities.filter((ability) => ability.implementedRules).length, 10);
  let state = game(SHADOW_STANCE_ID, SHADOW_BLADE_ID, SHADOW_LEAVE_ID);
  const [owner, target] = state.players;
  assert.ok(hasShadowDance(owner!));
  owner!.cakes = 2;
  target!.cakes = 1;
  assert.equal(validateAction(state, target!.id, sha(owner!.id)).ok, false);
  state = submit(state, skill(SHADOW_BLADE_ID, target!.id), cake);
  assert.equal(state.activeTimingPhase, "turn_change_action");
  assert.equal(hasShadowDance(state.players[0]!), false);
  state = drain(state);
  assert.ok(hasShadowDance(state.players[0]!));
  assert.equal(state.players[1]!.hp, 18);
  beginActionPrompt(state, "turn_before_action");
  state = enterActionWindow(state, owner!.id);
  const leave = skill(SHADOW_LEAVE_ID);
  assert.equal(validateActionWindowSkill(state, owner!.id, leave).ok, true);
  const cakes = state.players[0]!.cakes;
  state = submitActionWindowSkill(state, owner!.id, leave);
  assert.equal(state.players[0]!.cakes, cakes + 6);
  assert.equal(hasShadowDance(state.players[0]!), false);
  assert.equal(validateActionWindowSkill(state, owner!.id, leave).ok, false);
});

test("四连风唳亮招时已取消小防，锁定之后两回合；原本出石头仍能防", () => {
  for (const defense of [small, stone]) {
    let state = game(SHADOW_SHRIEK_ID, SHADOW_COMBO_ID);
    state.players[0]!.shadowCombo = 3;
    state.players[0]!.cakes = 1;
    state = submit(state, skill(SHADOW_SHRIEK_ID, state.players[1]!.id), defense);
    assert.equal(state.activeTimingPhase, "turn_change_action");
    const target = state.players[1]!;
    const isBlocked = defense === stone;
    assert.equal(state.turnMoveSuppression?.invalidated[target.id]?.includes(0) ?? false, !isBlocked);
    assert.equal(getMoveBlockReason(state, target), undefined);
    for (let offset = 1; offset <= 3; offset++) {
      const reason = getMoveBlockReason({ ...state, turnNumber: state.turnNumber + offset }, target);
      assert.equal(Boolean(reason), !isBlocked && offset < 3);
    }
    state = drain(state);
    assert.equal(state.players[0]!.cakes, isBlocked ? 0 : 1);
  }
});

test("普通风唳保留命中当回合已经发出的攻击，只禁止后续出招", () => {
  let state = game(SHADOW_SHRIEK_ID);
  const [owner, target, other] = state.players;
  owner!.cakes = 2;
  target!.cakes = 1;
  state = drain(submit(state, skill(SHADOW_SHRIEK_ID, target!.id), sha(other!.id)));
  assert.equal(state.players[2]!.hp, 17);
  assert.deepEqual(state.pendingActions[target!.id]?.actions, []);
  assert.throws(() => submitPlayerAction(state, target!.id, cake), /风唳/);
});

test("必定成立能抵抗四连风唳当回合的无效，但不能绕过后续禁止出招", () => {
  let state = game(SHADOW_SHRIEK_ID, SHADOW_COMBO_ID);
  const [owner, target, other] = state.players;
  owner!.shadowCombo = 3;
  owner!.cakes = target!.cakes = 1;
  target!.buffs.push({ id: "test-guaranteed-move", name: "必定成立", stacks: 1, attackActionIndex: 0,
    expiresAtTurn: state.turnNumber, moveResolution: { mustResolve: true } });
  state = submit(state, skill(SHADOW_SHRIEK_ID, target!.id), sha(other!.id));
  assert.ok(!state.turnMoveSuppression?.invalidated[target!.id]?.includes(0));
  state = drain(state);
  assert.equal(state.players[2]!.hp, 17);
  assert.deepEqual(state.pendingActions[target!.id]?.actions, []);
  assert.throws(() => submitPlayerAction(state, target!.id, cake), /风唳/);
});

test("唳止被有效出饼挡住；五连致死使目标消失，随后普通攻击仍照常结算", () => {
  let state = game(SHADOW_STOP_SHRIEK_ID, SHADOW_COMBO_ID);
  state.players[0]!.cakes = 3;
  state = drain(submit(state, skill(SHADOW_STOP_SHRIEK_ID, state.players[1]!.id), cake));
  assert.equal(state.players[1]!.hp, 18);
  state.players[0]!.shadowCombo = 4;
  state.players[0]!.cakes = 3;
  state.players[2]!.cakes = 1;
  const [owner, target, other] = state.players;
  state.pendingActions[target!.id] = { actions: [] };
  target!.bigCards = [{ cardId: HONGHUANG_CARD_ID, instanceId: "test-mountain-seal", onlyAbilityId: MOUNTAIN_SEAL_ID }];
  const firstEvent = state.eventLog.length;
  state = drain(submit(state, skill(SHADOW_STOP_SHRIEK_ID, target!.id), undefined, sha(owner!.id)));
  assert.equal(state.players[1]!.defeatLevel, 3);
  assert.equal(state.players[0]!.hp, 17);
  const events = state.eventLog.slice(firstEvent);
  const vanished = events.findIndex((event) => event.type === "player_died" && event.playerId === target!.id);
  const ordinary = events.findIndex((event) => event.type === "damage" && event.sourceId === other!.id);
  assert.ok(vanished >= 0 && ordinary > vanished, JSON.stringify(events));
});

test("五连唳止与天绝护罩的无视抵消，护罩挡下攻击并消耗一层", () => {
  let state = game(SHADOW_STOP_SHRIEK_ID, SHADOW_COMBO_ID);
  const [owner, target] = state.players;
  owner!.cakes = 3;
  owner!.shadowCombo = 4;
  state.pendingActions[target!.id] = { actions: [] };
  target!.buffs.push({ id: "test-sky-cover", name: "天绝护罩", stateType: SKY_ABSOLUTE_COVER, stacks: 2,
    sourceAbilityId: SKY_ABSOLUTE_ID, expiresAtRound: state.roundNumber + 1 });

  state = drain(submit(state, skill(SHADOW_STOP_SHRIEK_ID, target!.id)));

  assert.equal(state.players[1]!.hp, 18);
  assert.equal(state.players[1]!.status, "alive");
  assert.equal(state.players[1]!.buffs.find(({ id }) => id === "test-sky-cover")?.stacks, 1);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === target!.id &&
    event.protectionName === "天绝护罩"));
});

test("优先伤害结束后，其余同批死亡一起判定，全部退场时无胜者", () => {
  let state = game(SHADOW_STOP_SHRIEK_ID, SHADOW_COMBO_ID);
  const [owner, target, other] = state.players;
  owner!.cakes = 2;
  owner!.shadowCombo = 4;
  state.pendingActions[target!.id] = { actions: [] };
  state.pendingDamageItems = [owner!, other!].map((player) => ({ id: `ordinary:${player.id}`, amount: 19,
    sourceId: other!.id, targetId: player.id, attackName: "普通批次", fromAttack: true }));
  state = drain(submit(state, skill(SHADOW_STOP_SHRIEK_ID, target!.id)));
  assert.equal(state.phase, "finished");
  assert.deepEqual(state.players.map((player) => player.defeatLevel), [1, 3, 1]);
  assert.deepEqual(state.winnerIds, []);
});

test("三连舞风的无敌无视限定攻击和限定技附加的破无敌数值，只保护舞风本人", () => {
  for (const direct of [true, false]) {
    let state = game(SHADOW_WIND_DANCE_ID, SHADOW_COMBO_ID);
    const [owner, enemy, other] = state.players;
    owner!.shadowCombo = 2;
    enemy!.cakes = 50;
    appendSkillInstances(enemy!, direct ? ["1053", "1094"] : ["1053"]);
    if (!direct) enemy!.buffs.push({ id: TIANLIE_STAT_MULTIPLIER + "0:shadow-test", name: "限定技攻值增幅",
      stacks: 2, sourceAbilityId: "1094" });
    const incoming: PlayerAction = direct ? skill("1094", owner!.id) :
      { type: "attack", attackId: "miao_sha", targetId: owner!.id, stacks: 1 };
    state = drain(submit(state, { ...skill(SHADOW_WIND_DANCE_ID, other!.id), shadowMoveMode: "insert" }, incoming));
    assert.equal(state.players[0]!.hp, 18);
    assert.equal(state.players[0]!.status, "alive");
    assert.equal(state.players[2]!.defeatLevel, direct ? 2 : 1);
    assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === owner!.id &&
      event.protectionName === "舞风·无敌"));
  }
});

test("刃舞不放大自身，暗色随行叠成六倍，被防住不消耗伤害增幅", () => {
  let state = game(SHADOW_BLADE_DANCE_ID, SHADOW_FOLLOW_ID);
  const [, target] = state.players;
  state.players[0]!.cakes = 2;
  state.players[1]!.hp = 150;
  state = drain(submit(state, skill(SHADOW_BLADE_DANCE_ID, target!.id)));
  assert.equal(state.players[1]!.hp, 120);
  state.players[0]!.cakes = 3;
  state = drain(submit(state, skill(SHADOW_FOLLOW_ID, target!.id)));
  assert.equal(state.players[0]!.buffs.filter(({ stateType }) => stateType === SHADOW_WOUND_STATE).length, 2);
  state.players[0]!.cakes = 1;
  state = drain(submit(state, sha(target!.id), small));
  assert.equal(state.players[1]!.hp, 120);
  assert.equal(state.players[0]!.buffs.filter(({ stateType }) => stateType === SHADOW_WOUND_STATE).length, 2);
  state.players[0]!.cakes = 1;
  state = drain(submit(state, sha(target!.id)));
  assert.equal(state.players[1]!.hp, 114);
  assert.equal(state.players[0]!.buffs.filter(({ stateType }) => stateType === SHADOW_WOUND_STATE).length, 0);
});
