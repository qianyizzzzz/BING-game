import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, beginActionPrompt, createGame, createPlayer,
  getFusionSkillId, getReboundCakeCost, getTurnSkillActionCost, grantInitializedSkill, startGame, submitActionWindowSkill,
  submitPlayerAction, validateAction, type GameState, type PlayerAction, type SkillAction
} from "../packages/shared/src";
import { removeStateCategory } from "../packages/shared/src/engine/effectCategories";
import { changeElementAmount, getElementAmount } from "../packages/shared/src/engine/elementResources";
import { YOUKAI_CARD_ID, YOUKAI_ELEMENT, YOUKAI_RESOURCE_ID } from "../packages/shared/src/engine/youkaiIds";

const gain = { type: "gain_cake" } as const;

function advance(state: GameState): GameState {
  for (let index = 0; state.phase === "action_window" && index < 60; index++) state = advanceActionWindow(state);
  return state;
}

function game(): GameState {
  let state = createGame("妖", { skillMode: "big_test_select", firstTurnNoAttack: false });
  state = addPlayerToGame(state, createPlayer("乙"));
  state = addPlayerToGame(state, createPlayer("丙"));
  state.players[0]!.bigCards = [{ cardId: YOUKAI_CARD_ID, instanceId: "resource", onlyAbilityId: YOUKAI_RESOURCE_ID }];
  return advance(startGame(state));
}

function round(state: GameState, ...moves: PlayerAction[]): GameState {
  for (const [index, { id }] of state.players.entries())
    state = submitPlayerAction(state, id, moves[index] ?? gain).state;
  return advance(state);
}

test("积饼出招转为妖元，元素消除保留妖元", () => {
  let state = game();
  state = round(state, gain);
  const owner = state.players[0]!;
  assert.equal(owner.cakes, 0);
  assert.equal(getElementAmount(owner, YOUKAI_ELEMENT), 1);
  changeElementAmount(owner, "聚", 2);
  removeStateCategory(owner, "element");
  assert.equal(getElementAmount(owner, YOUKAI_ELEMENT), 1);
  assert.equal(getElementAmount(owner, "聚"), 0);
});

test("玩家可分配普通饼和妖元，并拒绝超额支付", () => {
  let state = game();
  const owner = state.players[0]!, target = state.players[1]!;
  owner.cakes = 1;
  changeElementAmount(owner, YOUKAI_ELEMENT, 2);
  const attack = { type: "attack", attackId: "sha", stacks: 2, targetId: target.id } as const;
  assert.equal(validateAction(state, owner.id, attack).ok, false);
  assert.equal(validateAction(state, owner.id, { ...attack, youkaiCakeSpent: 3 }).ok, false);
  const mixed = { ...attack, youkaiCakeSpent: 1 };
  assert.equal(validateAction(state, owner.id, mixed).ok, true);
  state = submitPlayerAction(state, owner.id, mixed).state;
  for (const { id } of state.players.slice(1))
    state = submitPlayerAction(state, id, { type: "defense", defense: "small" }).state;
  state = advance(state);
  assert.equal(state.players[0]!.cakes, 0);
  assert.equal(getElementAmount(state.players[0]!, YOUKAI_ELEMENT), 1);
});

test("普通反弹消耗普通饼和妖元，可在只持有妖元时使用", () => {
  for (const cakes of [0, 2]) {
    let state = game();
    const owner = state.players[0]!, target = state.players[1]!;
    owner.cakes = cakes;
    changeElementAmount(owner, YOUKAI_ELEMENT, 3);
    assert.equal(getReboundCakeCost(state, owner), cakes + 3);
    const action = { type: "defense", defense: "rebound", targetId: target.id } as const;
    assert.equal(validateAction(state, owner.id, action).ok, true);
    state = round(state, action);
    assert.equal(state.players[0]!.cakes, 0);
    assert.equal(getElementAmount(state.players[0]!, YOUKAI_ELEMENT), 0);
  }
});

test("妖元也可用于资源倍增技，返还为妖元", () => {
  let state = game();
  const owner = state.players[0]!;
  appendSkillInstances(owner, ["1060"]);
  changeElementAmount(owner, YOUKAI_ELEMENT, 2);
  const action = { type: "skill", skillId: "1060", stacks: 1, saintElement: YOUKAI_ELEMENT } as const;
  assert.equal(validateAction(state, owner.id, action).ok, true);
  state = round(state, action);
  assert.equal(getElementAmount(state.players[0]!, YOUKAI_ELEMENT), 3);
});

test("阶段技用妖元支付时只扣所选妖元", () => {
  let state = game();
  const owner = state.players[0]!;
  appendSkillInstances(owner, ["1023"]);
  owner.hp = 0;
  owner!.cakes = 2;
  changeElementAmount(owner!, YOUKAI_ELEMENT, 12);
  beginActionPrompt(state, "turn_before_action");
  const action: SkillAction = { type: "skill", skillId: "1023", stacks: 1 };
  const price = getTurnSkillActionCost(owner!, action, state);
  assert.ok(price > 0);
  const eventStart = state.eventLog.length;
  state = submitActionWindowSkill(state, owner!.id, { ...action, youkaiCakeSpent: price });
  assert.equal(getElementAmount(state.players[0]!, YOUKAI_ELEMENT), 12 - price);
  assert.equal(state.eventLog.slice(eventStart).some((event) =>
    event.type === "cake_changed" && event.reason === "阶段技能消耗"), false);
});

test("辉月撤销出招时把普通饼和妖元退回原资源", () => {
  let state = game();
  const [owner, target, other] = state.players;
  owner!.cakes = 1;
  changeElementAmount(owner!, YOUKAI_ELEMENT, 2);
  const huiyue = getFusionSkillId("辉月");
  grantInitializedSkill(state, owner!.id, huiyue, "测试", false);
  state = submitPlayerAction(state, owner!.id,
    { type: "attack", attackId: "sha", stacks: 2, targetId: target!.id, youkaiCakeSpent: 1 }).state;
  state = submitPlayerAction(state, target!.id, gain).state;
  state = submitPlayerAction(state, other!.id, gain).state;
  assert.equal(state.activeTimingPhase, "turn_change_action");
  assert.equal(state.players[0]!.cakes, 0);
  assert.equal(getElementAmount(state.players[0]!, YOUKAI_ELEMENT), 1);
  state = submitActionWindowSkill(state, owner!.id, { type: "skill", skillId: huiyue, stacks: 1 });
  assert.equal(state.players[0]!.cakes, 1);
  assert.equal(getElementAmount(state.players[0]!, YOUKAI_ELEMENT), 2);
});

test("逆转收回积累的妖元，第二次逆转恢复原收益", () => {
  let state = game();
  const [owner, first, second] = state.players;
  appendSkillInstances(first!, ["1092"]);
  appendSkillInstances(second!, ["1092"]);
  for (const player of [owner!, first!, second!]) state = submitPlayerAction(state, player.id, gain).state;
  assert.equal(state.activeTimingPhase, "turn_change_action");
  assert.equal(getElementAmount(state.players[0]!, YOUKAI_ELEMENT), 1);
  const reverse = { type: "skill", skillId: "1092", stacks: 1 } as const;
  state = submitActionWindowSkill(state, first!.id, reverse);
  assert.equal(getElementAmount(state.players[0]!, YOUKAI_ELEMENT), 0);
  state = submitActionWindowSkill(state, second!.id, reverse);
  assert.equal(getElementAmount(state.players[0]!, YOUKAI_ELEMENT), 1);
});

test("非火伤致死时浴火重生先用普通饼，再用妖元补足", () => {
  let state = game();
  const [owner, attacker] = state.players;
  const initialHp = owner!.hp;
  appendSkillInstances(owner!, ["1064"]);
  owner!.hp = 1;
  owner!.cakes = 1;
  attacker!.cakes = 2;
  changeElementAmount(owner!, YOUKAI_ELEMENT, 4);
  state = round(state, { type: "defense", defense: "stone" },
    { type: "attack", attackId: "sha", stacks: 2, targetId: owner!.id });
  assert.equal(state.players[0]!.status, "alive");
  assert.equal(state.players[0]!.hp, initialHp);
  assert.equal(getElementAmount(state.players[0]!, YOUKAI_ELEMENT), 1);
  assert.ok(state.eventLog.some((event) => event.type === "cake_changed" &&
    event.reason === "浴火重生消耗" && event.before === 1 && event.after === 0));
});
