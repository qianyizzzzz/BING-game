import assert from "node:assert/strict";
import { test } from "node:test";
import { addPlayerToGame, advanceActionWindow, createGame, createPlayer, getActiveSkillCount, getAllSkills, getSkill, startGame,
  submitActionWindowSkill, submitPlayerAction, validateAction, validateActionWindowSkill,
  type ActionSubmission, type DamageEvent, type GameState, type SkillAction } from "../packages/shared/src";
import { absorbBigCardAbility } from "../packages/shared/src/engine/bigCards";
import { applyCurtainDarkness, changeCurtainVeils, curtainDiscardQuote, curtainSoundMarks, curtainVeilCount, grantCurtainRebirth,
  revivalByRebirth } from "../packages/shared/src/engine/curtain";
import { CURTAIN_DARK_ID, CURTAIN_ENCORE_ID, CURTAIN_FINALE_ID, CURTAIN_INTERLUDE_ID, CURTAIN_OPEN_ID, CURTAIN_PRELUDE_ID,
  CURTAIN_REFLECT_PIERCE, CURTAIN_VEIL_ID } from "../packages/shared/src/engine/curtainIds";
import { isLightBigCardSkill, isAttributeSkillSuppressed } from "../packages/shared/src/engine/effectCategories";
import { appendSkillInstances } from "../packages/shared/src/engine/skillInventory";

const cake = { type: "gain_cake" } as const;
const defend = (defense: "small" | "youtiao" | "rebound", targetId?: string) =>
  ({ type: "defense", defense, ...(targetId ? { targetId } : {}) } as const);
const cast = (skillId: string, targetId?: string): SkillAction => ({ type: "skill", skillId, stacks: 1, targetId });

function drain(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && i < 60; i++) state = advanceActionWindow(state);
  return state;
}

function setup(): GameState {
  let state = createGame("演员", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false, initialHp: 18 });
  state = addPlayerToGame(state, createPlayer("观众"));
  state = addPlayerToGame(state, createPlayer("旁观者"));
  state.players[0]!.bigCards = [{ instanceId: "curtain", cardId: "10542" }];
  return drain(startGame(state));
}

function turn(state: GameState, a: ActionSubmission, b: ActionSubmission = cake, c: ActionSubmission = cake): GameState {
  state.players[0]!.cakes = 20;
  for (const [index, action] of [a, b, c].entries()) {
    const id = state.players[index]!.id;
    const validation = validateAction(state, id, action);
    assert.equal(validation.ok, true, validation.error);
    state = submitPlayerAction(state, id, action).state;
  }
  return drain(state);
}

test("四份治愈术，光绮按使用发放，音刻按实际未命中发放且中场不消耗", () => {
  let state = setup();
  const target = state.players[1]!.id;
  assert.equal(getActiveSkillCount(state.players[0], "1063"), 4);
  assert.equal(getActiveSkillCount(state.players[0], CURTAIN_VEIL_ID), 0);
  state = turn(state, cast(CURTAIN_OPEN_ID, target), defend("small"));
  assert.equal(curtainVeilCount(state.players[0]!), 1);
  state = turn(state, cast(CURTAIN_PRELUDE_ID, target), defend("youtiao"));
  assert.equal(curtainSoundMarks(state.players[1]), 1);
  state = turn(state, cast(CURTAIN_INTERLUDE_ID));
  assert.equal(curtainVeilCount(state.players[0]!), 2);
  assert.equal(curtainSoundMarks(state.players[1]), 1);
  state = turn(state, cast(CURTAIN_DARK_ID));
  state = turn(state, cast(CURTAIN_ENCORE_ID));
  assert.equal(curtainVeilCount(state.players[0]!), 4);
  assert.equal(getActiveSkillCount(state.players[0], CURTAIN_OPEN_ID), 0);
  assert.equal(state.players[0]!.buffs.find(({ id }) => id === CURTAIN_REFLECT_PIERCE)?.stacks, 1);
  state.players[1]!.hp = 1;
  state.players[1]!.cakes = 1;
  appendSkillInstances(state.players[1]!, ["1068"]);
  state = turn(state, { type: "attack", attackId: "sha", stacks: 3, targetId: target },
    defend("rebound", state.players[2]!.id));
  assert.equal(state.players[1]!.hp, 2, "绝对值仍应正常复活");
  assert.equal(state.players[2]!.hp, 12, "反弹未转移攻击");
  assert.equal(state.players[0]!.buffs.some(({ id }) => id === CURTAIN_REFLECT_PIERCE), false);
});

test("多属性致死每种发放一个可用于本次死亡的浴火重生，同批次不重复", () => {
  const state = setup();
  const owner = state.players[0]!;
  const events = [{ id: "same-batch", elements: ["fire", "ice"] }] as DamageEvent[];
  grantCurtainRebirth(state, owner, events);
  grantCurtainRebirth(state, owner, events);
  assert.deepEqual(owner.skillInventory?.filter(({ skillId }) => skillId === "1064").map(({ curtainRebirthElement }) =>
    curtainRebirthElement), ["fire", "ice"]);
  assert.equal(revivalByRebirth(owner, events), "free");
  assert.equal(revivalByRebirth(owner, [{ id: "other", element: "electric" }] as DamageEvent[]), undefined);
});

test("火球打成普通死亡后，新获得的火系浴火重生当场救回持卡者", () => {
  let state = setup();
  const [owner, rival] = state.players;
  const fireball = getAllSkills().find(({ name }) => name === "火球")!;
  owner!.hp = 1;
  rival!.cakes = 20;
  appendSkillInstances(rival!, [fireball.id]);
  state = turn(state, cake, cast(fireball.id, owner!.id));
  assert.equal(state.players[0]!.status, "alive");
  assert.equal(state.players[0]!.hp, 18);
  assert.equal(state.players[0]!.skillInventory?.filter(({ curtainRebirthElement }) => curtainRebirthElement === "fire").length, 1);
  assert.ok(state.eventLog.some((event) => event.type === "heal" && event.targetId === owner!.id && event.recoveryKind === "revival"));
});

test("每份光绮可独立被吸取，不可弃置的其他复活技阻止发动", () => {
  const state = setup();
  const [owner, recipient] = state.players;
  changeCurtainVeils(owner!, 2);
  const random = Math.random;
  try {
    Math.random = () => 0.9999;
    assert.equal(absorbBigCardAbility(state, recipient!, owner!), true);
  } finally {
    Math.random = random;
  }
  assert.equal(curtainVeilCount(owner!), 1);
  assert.equal(curtainVeilCount(recipient!), 1);
  assert.equal(curtainDiscardQuote(owner!).count, 5);
  owner!.buffs.push({ id: "no_discard", name: "防弃置", stacks: 1, immuneEffectCategories: ["skill_discard"] });
  assert.equal(validateAction(state, owner!.id, cast(CURTAIN_FINALE_ID, recipient!.id)).ok, false);
  assert.ok(getSkill("1063")?.typeTags.includes("复活技"));
  assert.ok(getSkill("1052006")?.typeTags.includes("复活技"));
});

test("终招主出招在75光绮时只被反弹防住，仍弃置并耗尽施术者的命", () => {
  let state = setup();
  const [owner, target, other] = state.players;
  changeCurtainVeils(owner!, 75);
  target!.cakes = 1;
  state = turn(state, cast(CURTAIN_FINALE_ID, target!.id), defend("rebound", other!.id));
  assert.equal(state.players[0]!.status, "dead");
  assert.equal(state.players[1]!.status, "alive");
  assert.equal(state.players[2]!.status, "alive");
  assert.equal(curtainVeilCount(state.players[0]!), 0);
});

test("回合前窗口释放立即减命，尚未亮招视为无防御", () => {
  let state = setup();
  const [owner, target] = state.players;
  const action = cast(CURTAIN_FINALE_ID, target!.id);
  assert.equal(validateActionWindowSkill(state, owner!.id, action).ok, true);
  state = drain(submitActionWindowSkill(state, owner!.id, action));
  assert.equal(state.players[0]!.status, "dead");
  assert.equal(state.players[1]!.status, "dead");
});

test("回合末窗口读取本回合已经亮出的反弹，挡下终招但不转移", () => {
  let state = setup();
  const [owner, target, other] = state.players;
  changeCurtainVeils(owner!, 75);
  target!.cakes = 1;
  for (const [index, action] of [cake, defend("rebound", other!.id), cake].entries())
    state = submitPlayerAction(state, state.players[index]!.id, action).state;
  for (let step = 0; state.phase === "action_window" && state.activeTimingPhase !== "turn_end_action" && step < 60; step++)
    state = advanceActionWindow(state);
  assert.equal(state.activeTimingPhase, "turn_end_action");
  state = drain(submitActionWindowSkill(state, owner!.id, cast(CURTAIN_FINALE_ID, target!.id)));
  assert.equal(state.players[0]!.status, "dead");
  assert.equal(state.players[1]!.status, "alive");
  assert.equal(state.players[2]!.status, "alive");
});

test("终招达到1000份光绮时无视出招防御，三层音刻阻止复活", () => {
  let state = setup();
  const [owner, target, other] = state.players;
  changeCurtainVeils(owner!, 1000);
  target!.cakes = 1;
  target!.buffs.push({ id: "curtain_sound_mark", name: "音刻印记", stacks: 3 });
  appendSkillInstances(target!, ["1063"]);
  state = turn(state, cast(CURTAIN_FINALE_ID, target!.id), defend("rebound", other!.id));
  assert.equal(state.players[1]!.status, "dead");
  assert.ok(state.players[1]!.buffs.some(({ id }) => id === "curtain_recovery_block"));
});

test("光系按大卡属性识别，虹之泉只计首尾和光之白", () => {
  const state = setup();
  applyCurtainDarkness(state);
  assert.equal(isAttributeSkillSuppressed(state.players[1], getSkill("1050203")), true);
  assert.equal(isLightBigCardSkill("1065401"), true);
  assert.equal(isLightBigCardSkill("1065409"), true);
  assert.equal(isLightBigCardSkill("1065411"), true);
  assert.equal(isLightBigCardSkill("1065402"), false);
  assert.equal(isLightBigCardSkill("1063"), false);
});
