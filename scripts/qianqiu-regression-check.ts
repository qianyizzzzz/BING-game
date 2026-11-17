import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ENDURING_SEA_ID, FENTIAN_CARD_ID, LAVA_ARMOR_ID, QIANQIU_CARD_ID, QIANQIU_RESPONSE_ID, RAGING_WAVES_ID, THOUSAND_WAVES_ID,
  addPlayerToGame, advanceActionWindow, appendSkillInstances, beginActionPrompt, createGame, createPlayer, enterActionWindow, getActiveFusionCount,
  getFusionSkillId, getQianqiuDefenseGains, previewPlayerAttackStats, startGame, submitActionWindowSkill, submitPlayerAction, validateActionWindowSkill,
  type GameState, type PlayerAction, type SkillAction, type SkillTimingPhase
} from "@bing/shared";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";

const cake = { type: "gain_cake" } as const;
const defense = (kind: "small" | "youtiao" | "stone"): PlayerAction => ({ type: "defense", defense: kind });
const cast = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });
const p = (state: GameState, index = 0) => state.players[index]!;
const shields = (state: GameState) => p(state).buffs.filter((buff) => buff.damageShieldLimit);
const defenseValue = (state: GameState) => p(state).buffs.find((buff) => buff.id === "defense_value")?.stacks ?? 0;

function drain(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && i < 70; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(extra: string[][] = []): GameState {
  let state = createGame("A", { skillMode: "big_test_select", skillCount: 3, firstTurnNoAttack: false });
  for (const name of ["B", "C"]) state = addPlayerToGame(state, createPlayer(name));
  state.players.forEach((player, index) => {
    player.bigCards = [...(index === 0 ? [QIANQIU_CARD_ID] : []), ...(extra[index] ?? [])]
      .map((cardId, n) => ({ cardId, instanceId: `card-${index}-${n}` }));
  });
  state = drain(startGame(state));
  for (const player of state.players) { player.hp = 100; player.cakes = 40; }
  return state;
}

function reveal(state: GameState, actions: PlayerAction[]): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) {
    if (player.status === "alive" && !state.pendingActions[player.id]) state = submitPlayerAction(state, player.id, actions[index] ?? cake).state;
  }
  return state;
}

function respond(state: GameState, target = 1): GameState {
  const gain = getQianqiuDefenseGains(state, p(state))[0];
  assert.ok(gain, state.activeTimingPhase);
  return submitActionWindowSkill(state, p(state).id, cast(QIANQIU_RESPONSE_ID, { targetId: p(state, target).id, defenseGainId: gain.id }));
}

test("变招获得防御值可立即响应，目标出防御时回合末无伤", () => {
  let state = fixture();
  appendSkillInstances(p(state), ["1024"]);
  state = reveal(state, [cake, defense("small"), cake]);
  state = submitActionWindowSkill(state, p(state).id, cast("1024"));
  state = respond(state);
  assert.equal(getQianqiuDefenseGains(state, p(state)).length, 0);
  state = drain(state, "turn_end_action");
  assert.equal(p(state).hp, 99);
  state = advanceActionWindow(state);
  assert.equal(p(state, 1).hp, 100);
  assert.equal(defenseValue(state), 8);
});

test("命中点获得防御值，即使没有待处理伤害也打开变伤响应，回合末命中后返还防御值", () => {
  let state = fixture([[FENTIAN_CARD_ID]]);
  state = drain(reveal(state, [cast(LAVA_ARMOR_ID), cake, cake]), "turn_damage_modify");
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  state = drain(respond(state), "turn_end_action");
  assert.equal(p(state, 1).hp, 100);
  state = advanceActionWindow(state);
  assert.equal(p(state, 1).hp, 96);
  assert.equal(p(state).hp, 99);
  assert.equal(defenseValue(state), 8);
});

test("怒海狂涛换的是共同主值，后续可变招并与本回合出招共存", () => {
  let state = fixture();
  appendSkillInstances(p(state), ["1090"]);
  state = reveal(state, [cast(RAGING_WAVES_ID, { targetId: p(state, 1).id }), defense("small"), cake]);
  state = submitActionWindowSkill(state, p(state).id, cast("1090", { switchActionIndex: 0, attackStatModifier: "swap_power_level" }));
  assert.deepEqual(previewPlayerAttackStats(state, p(state).id).stats[0]?.damageParts, [9, 9, 9]);
  state = drain(state, "turn_end_action");
  assert.equal(p(state).hp, 110);
  assert.equal(p(state, 1).hp, 100);
  state = reveal(state, [cake, cake, cake]);
  const wave = previewPlayerAttackStats(state, p(state).id);
  assert.deepEqual(wave.stats[1]?.damageParts, [9, 9, 9]);
  assert.equal(wave.stats[1]?.level, 3);
  assert.equal(wave.stats[1]?.defenseTag, "youtiao");
  assert.equal(wave.costs[1], 0);
  state = drain(state, "turn_end_action");
  assert.equal(p(state, 1).hp, 73);
  assert.equal(defenseValue(state), 20);

  state = drain(state);
  p(state, 1).buffs.push({ id: "test-untargetable", name: "无法被选中", stacks: 1, preventsTargetSelection: true });
  state = drain(reveal(state, [cake, cake, cake]), "turn_end_action");
  assert.equal(p(state, 1).hp, 73);
  assert.equal(p(state).hp, 120);
});

test("怒海狂涛跨轮续击，第一回合禁攻只限制新提交的攻击", () => {
  let state = fixture();
  state = drain(reveal(state, [cake, cake, cake]));
  state.config.firstTurnNoAttack = true;
  state = drain(reveal(state, [cast(RAGING_WAVES_ID, { targetId: p(state, 1).id }), cake, cake]));
  assert.equal(state.roundNumber, 2);
  assert.equal(state.roundTurnNumber, 1);
  const continued = reveal(state, [cake, cake, cake]);
  assert.ok(continued.pendingActions[p(continued).id]?.actions.some((action) =>
    action.type === "skill" && action.skillId === RAGING_WAVES_ID && action.waveContinuationId));
  state = drain(continued);
  assert.equal(p(state, 1).hp, 82);
});

test("浪打千击四段伤害只计一次命中，实际伤害与防御值触发回合末响应", () => {
  let state = fixture();
  state = drain(reveal(state, [cast(THOUSAND_WAVES_ID), defense("small"), cake]), "turn_end_action");
  assert.equal(p(state).cakes, 38);
  assert.equal(p(state, 1).hp, 84);
  assert.equal(p(state, 2).hp, 100);
  assert.equal(p(state).hp, 108);
  assert.equal(defenseValue(state), 32);
  const gain = getQianqiuDefenseGains(state, p(state))[0];
  assert.ok(gain);
  state = enterActionWindow(state, p(state).id);
  const validation = validateActionWindowSkill(state, p(state).id, cast(QIANQIU_RESPONSE_ID, { targetId: p(state, 2).id, defenseGainId: gain.id }));
  assert.ok(validation.ok, JSON.stringify(validation));
});

test("护盾合计先归零退游点伤害，直接退游才消耗退游盾", () => {
  let state = fixture();
  appendSkillInstances(p(state, 1), ["1094", "1106"]);
  state = drain(reveal(state, [cast(ENDURING_SEA_ID), cast("1094", { targetId: p(state).id }), cake]), "turn_end_action");
  assert.equal(p(state).hp, 100);
  assert.equal(shields(state).length, 2);
  p(state).hp = 2;
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, p(state, 1).id, cast("1106"));
  assert.equal(p(state).status, "alive");
  assert.deepEqual(shields(state).map((buff) => buff.name), ["无限护盾"]);
  p(state).buffs.push({ id: "external-shield", name: "其他护盾", stateType: "shield", stacks: 1, damageShieldLimit: [] });
  state.roundNumber += 1;
  beginActionPrompt(state, "turn_before_action");
  assert.equal(shields(state).length, 0);
});

test("真实发放冰霜长矛，霜落穿透炽焰，焚天君燚的保护生效", () => {
  let state = fixture([[], [FENTIAN_CARD_ID]]);
  assert.equal(getActiveFusionCount(p(state), "冰霜长矛"), 1);
  grantInitializedSkill(state, p(state, 2).id, getFusionSkillId("炽焰"), "test", false);
  appendSkillInstances(p(state, 1), ["1012"]);
  appendSkillInstances(p(state, 2), ["1012"]);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, p(state).id, cast("1013"));
  assert.ok(p(state, 1).skills.includes("1012"));
  assert.ok(!p(state, 2).skills.includes("1012"));
});
