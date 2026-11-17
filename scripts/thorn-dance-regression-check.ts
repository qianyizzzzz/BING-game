import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, enterActionWindow,
  getActiveFusionCount, getActiveSkillCount, getFusionSkillId, startGame, submitActionWindowSkill,
  submitPlayerAction, thornPierceChoices, toPublicGameState, validateActionWindowSkill,
  grantFreshBigCard, JUEYING_CARD_ID, JUEYING_RETIRE_ID, THORN_BIND_ID, THORN_DANCE_ID, THORN_INHERIT_ID, THORN_PIERCE_ID,
  THORN_STING_ID, WIND_SCOUT_ID, type GameState, type PlayerAction
} from "../packages/shared/src";
import { THORN_BIND, THORN_DEFENSE_DISABLED, THORN_DURATION, THORN_POISON, thornIgnoresElement } from "../packages/shared/src/engine/thornDance";
import { removeSkillInstanceAt } from "../packages/shared/src/engine/skillInventory";

const cake = { type: "gain_cake" } as const;
const defend = (defense: "small" | "youtiao" | "stone"): PlayerAction => ({ type: "defense", defense });
const skill = (skillId: string, targetId?: string, stacks = 1): PlayerAction => ({ type: "skill", skillId, targetId, stacks });
const attack = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", stacks: 1, targetId });

function drain(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && i < 100; i++) state = advanceActionWindow(state);
  return state;
}

function setup(ability?: string, count = 2): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false, initialHp: 18 });
  for (let i = 1; i < count; i++) state = addPlayerToGame(state, createPlayer(`玩家${i + 1}`));
  state.players[0]!.bigCards = [{ cardId: "10540", instanceId: "thorns", ...(ability ? { onlyAbilityId: ability } : {}) }];
  state = drain(startGame(state));
  state.players.forEach((player) => { player.cakes = 100; });
  return state;
}

function singleTargetDance(): GameState {
  const state = setup(undefined, 3);
  const source = state.players[0]!;
  removeSkillInstanceAt(source, source.skills.indexOf("1053"));
  return state;
}

function submit(state: GameState, ...actions: PlayerAction[]): GameState {
  for (const [index, { id }] of state.players.entries()) {
    const result = submitPlayerAction(state, id, actions[index] ?? cake);
    assert.equal(result.error, undefined);
    state = result.state;
  }
  return state;
}

test("绝影逆魂的永远之夜抹除舞，既不叠时长也不给未命中效果", () => {
  let state = setup(undefined, 3);
  const [source, night] = state.players;
  grantFreshBigCard(state, night!, { cardId: JUEYING_CARD_ID, instanceId: "night" }, { onlyAbilityId: JUEYING_RETIRE_ID });
  assert.equal(getActiveSkillCount(night, "1043"), 1);
  state = drain(submit(state, skill(THORN_DANCE_ID), cake, cake));
  assert.ok(state.eventLog.some((event) => event.type === "system" && event.message.includes("舞 被永远之夜抹除")));
  assert.equal(state.players.find(({ id }) => id === source!.id)?.buffs.some((buff) => buff.stateType === THORN_DURATION), false);
  assert.equal(state.players.some((player) => player.buffs.some((buff) => buff.stateType === THORN_POISON || buff.stateType === THORN_BIND)), false);
  assert.deepEqual(thornPierceChoices(state, source!.id), []);
});

test("传承发放实际融合，免疫四属性，物理伤害仍全额反伤", () => {
  let state = setup(THORN_INHERIT_ID);
  const [owner, target] = state.players;
  for (const name of ["反伤刺甲", "自然之灵"]) assert.equal(getActiveFusionCount(owner, name), 1);
  assert.equal(getActiveSkillCount(owner, "1053"), 1);
  for (const attribute of ["fire", "ice", "electric", "poison"] as const) assert.ok(thornIgnoresElement(owner, [attribute]));
  assert.ok(!thornIgnoresElement(owner, ["physical"]));
  state = drain(submit(state, cake, { ...attack(owner!.id), attackId: "qin" } as PlayerAction));
  assert.equal(state.players[0]!.hp, 15);
  assert.equal(state.players[1]!.hp, 15);
});

test("刺的重数叠加毒伤，从命中当回合末起生效并覆盖下一轮", () => {
  let state = setup(THORN_STING_ID);
  const target = state.players[1]!;
  state = drain(submit(state, skill(THORN_STING_ID, target.id, 2)));
  assert.equal(state.players[1]!.hp, 14);
  assert.equal(state.roundNumber, 2);
  assert.equal(state.players[1]!.buffs.find((buff) => buff.stateType === THORN_POISON)?.expiresAtRound, 3);
  state = drain(submit(state, cake, cake));
  assert.equal(state.players[1]!.hp, 12);
  assert.equal(state.roundNumber, 2);
});

test("刺的毒伤禁止复活但仍可切换备用命", () => {
  let state = setup(THORN_STING_ID);
  const target = state.players[1]!;
  target.hp = 3;
  target.spareLives = [{ hp: 7 }];
  appendSkillInstances(target, ["1068"]);
  state = drain(submit(state, skill(THORN_STING_ID, target.id, 2)));
  assert.equal(state.players[1]!.hp, 7);
  assert.equal(state.players[1]!.spareLives?.length, 0);
  assert.ok(!state.players[1]!.buffs.some((buff) => buff.id === "no_revive"));
  state = setup(THORN_STING_ID);
  state.players[1]!.hp = 3;
  appendSkillInstances(state.players[1]!, ["1068"]);
  state = drain(submit(state, skill(THORN_STING_ID, state.players[1]!.id, 2)));
  assert.equal(state.players[1]!.status, "dead");
});

test("穿在变伤阶段只向攻击者展示合法选项，选择免费且让该防御出招失效", () => {
  let state = setup(THORN_PIERCE_ID);
  const [source, target] = state.players;
  state = drain(submit(state, skill(THORN_PIERCE_ID, target!.id)), "turn_damage_modify");
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  const choices = toPublicGameState(state, source!.id).thornPierceChoices!;
  assert.deepEqual(choices.map(({ label }) => label.split(" · ")[1]), ["小防", "油条", "石头"]);
  assert.equal(toPublicGameState(state, target!.id).thornPierceChoices?.length, 0);
  state = enterActionWindow(state, source!.id);
  const disable = { type: "skill", skillId: THORN_PIERCE_ID, stacks: 1, attackResponseId: choices[0]!.id } as const;
  assert.equal(validateActionWindowSkill(state, source!.id, { ...disable, attackResponseId: "fake/1031" }).ok, false);
  state = submitActionWindowSkill(state, source!.id, disable);
  assert.equal(state.players[0]!.cakes, 99);
  assert.equal(state.players[1]!.buffs.find((buff) => buff.id === `${THORN_DEFENSE_DISABLED}:small`)?.expiresAtRound, 3);
  state = drain(state);
  state.players[0]!.cakes = 1;
  state = drain(submit(state, attack(target!.id), defend("small")));
  assert.equal(state.players[1]!.hp, 16);
});

test("穿在三防失效后允许选择已暴露防御，隐藏防御和纯伤害技能仍不列出", () => {
  let state = setup(THORN_PIERCE_ID);
  const [source, target] = state.players;
  for (const defense of ["small", "youtiao", "stone"]) target!.buffs.push({ id: `${THORN_DEFENSE_DISABLED}:${defense}`,
    stateType: THORN_DEFENSE_DISABLED, name: defense, stacks: 1, expiresAtRound: 3 });
  appendSkillInstances(target!, ["1031", "1049", "1045"]);
  target!.revealedSkillIds = ["1049", "1045"];
  state = drain(submit(state, skill(THORN_PIERCE_ID, target!.id)), "turn_damage_modify");
  const choices = thornPierceChoices(state, source!.id);
  assert.equal(choices.length, 1);
  assert.match(choices[0]!.id, /\/1049$/);
  state = submitActionWindowSkill(enterActionWindow(state, source!.id), source!.id,
    { type: "skill", skillId: THORN_PIERCE_ID, stacks: 1, attackResponseId: choices[0]!.id });
  assert.equal(getActiveSkillCount(state.players[1], "1049"), 0);
  assert.equal(getActiveSkillCount(state.players[1], "1031"), 1);
});

test("风·探查的无敌按防御技能提供给穿选择", () => {
  let state = setup(THORN_PIERCE_ID);
  const [source, target] = state.players;
  for (const defense of ["small", "youtiao", "stone"]) target!.buffs.push({ id: `${THORN_DEFENSE_DISABLED}:${defense}`,
    stateType: THORN_DEFENSE_DISABLED, name: defense, stacks: 1, expiresAtRound: 3 });
  grantFreshBigCard(state, target!, { cardId: "10524", instanceId: "wind" },
    { onlyAbilityId: WIND_SCOUT_ID, publiclyRevealed: true });
  state = drain(submit(state, skill(THORN_PIERCE_ID, target!.id)), "turn_damage_modify");
  const [choice] = thornPierceChoices(state, source!.id);
  assert.ok(choice?.id.endsWith(`/${WIND_SCOUT_ID}`));
  state = submitActionWindowSkill(enterActionWindow(state, source!.id), source!.id,
    { type: "skill", skillId: THORN_PIERCE_ID, stacks: 1, attackResponseId: choice.id });
  assert.equal(getActiveSkillCount(state.players[1], WIND_SCOUT_ID), 0);
});

test("缚叠加持续时长，攻击可以提交和付费但无效", () => {
  let state = setup(THORN_BIND_ID);
  const [source, target] = state.players;
  state = drain(submit(state, skill(THORN_BIND_ID, target!.id, 2)));
  assert.equal(state.players[1]!.buffs.find((buff) => buff.stateType === THORN_BIND)?.expiresAtRound, 4);
  state.players[1]!.cakes = 2;
  state = drain(submit(state, cake, attack(source!.id)));
  assert.equal(state.players[1]!.cakes, 1);
  assert.equal(state.players[0]!.hp, 18);
});

test("舞混合命中按每个目标计数，未命中的效果享受同招倍率并无视免疫不良", () => {
  let state = setup(undefined, 4);
  const [source, a, b, c] = state.players;
  for (const target of [b, c]) target!.buffs.push({ id: "temp_negative_status_immunity", name: "免疫不良", stacks: 1,
    expiresAtTurn: state.turnNumber });
  state = drain(submit(state, skill(THORN_DANCE_ID), cake, defend("small"), defend("stone")), "turn_damage_modify");
  assert.equal(state.players[0]!.buffs.find((buff) => buff.id === THORN_DURATION)?.stacks, 2);
  for (const target of [a, b, c]) {
    const settled = state.players.find(({ id }) => id === target!.id)!;
    assert.equal(settled.buffs.find((buff) => buff.stateType === THORN_POISON)?.expiresAtRound, 102);
    assert.equal(settled.buffs.find((buff) => buff.stateType === THORN_BIND)?.expiresAtRound, 102);
  }
  assert.equal(thornPierceChoices(state, source!.id).length, 9);
});

test("舞的单攻目标在提交后无法被选中，按一次未命中处理", () => {
  let state = singleTargetDance();
  const [source, target] = state.players;
  state = submitPlayerAction(state, source!.id, skill(THORN_DANCE_ID, target!.id)).state;
  state.players[1]!.buffs.push({ id: "lost-target", name: "无法被选中", stacks: 1,
    expiresAtTurn: state.turnNumber + 1, preventsTargetSelection: true });
  for (const { id } of state.players.slice(1)) state = submitPlayerAction(state, id, cake).state;
  state = drain(state, "turn_damage_modify");
  assert.equal(state.players[0]!.buffs.some((buff) => buff.stateType === THORN_DURATION), false);
  assert.equal(state.players[2]!.buffs.filter((buff) => buff.stateType === THORN_POISON).length, 1);
});

test("舞遇到永远之夜时，目标丢失也不给未命中奖励", () => {
  let state = singleTargetDance();
  const [source, target, night] = state.players;
  grantFreshBigCard(state, night!, { cardId: JUEYING_CARD_ID, instanceId: "night" }, { onlyAbilityId: JUEYING_RETIRE_ID });
  state = submitPlayerAction(state, source!.id, skill(THORN_DANCE_ID, target!.id)).state;
  state.players[1]!.buffs.push({ id: "lost-target", name: "无法被选中", stacks: 1,
    expiresAtTurn: state.turnNumber + 1, preventsTargetSelection: true });
  for (const { id } of state.players.slice(1)) state = submitPlayerAction(state, id, cake).state;
  state = drain(state);
  assert.equal(state.players.some((player) => player.buffs.some((buff) => buff.stateType === THORN_POISON || buff.stateType === THORN_BIND)), false);
});
