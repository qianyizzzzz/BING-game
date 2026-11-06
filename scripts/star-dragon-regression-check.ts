import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DRAGON_BLOOD_FIELD_ID, DRAGON_DANCE_ID, GATHER_STAR_ID, STAR_ELEMENT, STAR_RESIST_ID, STAR_RESONANCE_ID, STAR_STRIKE_ID,
  DRAGON_DISAPPEAR_ID, DRAGON_DOMINION_ID, DRAGON_HEIR_ID, FENTIAN_ATTACK_ID, INFINITY_VALUE, RETIRE_VALUE,
  combatValue, formatCombatValue, subtractCombatValues, toPublicGameState,
  addPlayerToGame, advanceActionWindow, appendSkillInstances, applyNegativeStatus, beginActionPrompt,
  createGame, createPlayer, enterActionWindow, getActiveFusionCount, getElementAmount, getFusionSkillId, getPlayerInitialHp, getRootFusions, getSkillUseLimit,
  previewPlayerAttackStats, startGame, submitActionWindowSkill, submitPlayerAction, type GameState, type PlayerAction,
  type SkillAction, type SkillTimingPhase
} from "@bing/shared";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { borrowBigCards, settleDragonRoundChanges } from "../packages/shared/src/engine/bigCards";
import { isStarResistible } from "../packages/shared/src/engine/starDragon";

const owner = (state: GameState) => state.players[0]!;
const cake = { type: "gain_cake" } as const;
const cast = (skillId: string, extra: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...extra });

function drain(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let i = 0; i < 100 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(cardId: string, hp = 30): GameState {
  let state = createGame("A", { skillMode: "big_test_select", firstTurnNoAttack: false, skillCount: 2 });
  for (const name of ["B", "C"]) state = addPlayerToGame(state, createPlayer(name));
  owner(state).bigCards = [{ cardId, instanceId: "card-a" }];
  state = drain(startGame(state));
  for (const player of state.players) { player.hp = hp; player.cakes = 20; }
  return state;
}

function turn(state: GameState, actions: PlayerAction[], stop: SkillTimingPhase = "turn_end_action"): GameState {
  state = drain(state);
  for (const [index, player] of state.players.entries()) {
    if (!state.pendingActions[player.id] && player.status === "alive") state = submitPlayerAction(state, player.id, actions[index] ?? cake).state;
  }
  return drain(state, stop);
}

const defense = (state: GameState, index: number) => state.players[index]!.buffs.find(({ id }) => id === "defense_value")?.stacks ?? 0;

test("开局按来源发放逆转星移、外星人和两份独立烽火赤壁、雷电法术", () => {
  const star = fixture("10506");
  assert.equal(getActiveFusionCount(owner(star), "外星人"), 1);
  assert.equal(getActiveFusionCount(owner(star), "逆转星移"), 1);
  assert.equal(getSkillUseLimit(owner(star), "skill_93_50224"), 4);
  const dragon = fixture("10507");
  const fire = getFusionSkillId("烽火赤壁");
  assert.equal(getRootFusions(owner(dragon)).filter(({ skillId }) => skillId === fire).length, 2);
  assert.equal(owner(dragon).skillInventory?.filter(({ skillId }) => skillId === "skill_35_16792").length, 2);
  assert.equal(new Set(owner(dragon).skillInventory?.map(({ instanceId }) => instanceId)).size, 6);
});

test("出星获得独立元素与无敌，共振在其他人合计30防御时清空并加30", () => {
  let state = fixture("10506");
  state = turn(state, [cast(GATHER_STAR_ID), { type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id }, cake]);
  assert.equal(owner(state).hp, 30);
  assert.equal(getElementAmount(owner(state), STAR_ELEMENT), 1);
  state = drain(state);
  for (const [index, stacks] of [12, 18].entries()) state.players[index + 1]!.buffs.push({ id: "defense_value", name: "防御值", stacks });
  state = turn(state, [cast(STAR_RESONANCE_ID), cake, cake]);
  assert.deepEqual([defense(state, 0), defense(state, 1), defense(state, 2)], [30, 0, 0]);
  assert.equal(getElementAmount(owner(state), STAR_ELEMENT), 0);
});

test("异星共振可选抵御非伤害退游，消费来自其他来源的全部防御值", () => {
  let state = fixture("10506");
  owner(state).hp = 1;
  owner(state).buffs.push({ id: "defense_value", name: "防御值", stacks: 3 });
  appendSkillInstances(state.players[1]!, ["skill_107_53513"]);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, state.players[1]!.id, cast("skill_107_53513"));
  const retire = state.pendingDamageItems?.find((item) => item.targetId === owner(state).id && item.directDefeat);
  assert.ok(retire);
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  state = submitActionWindowSkill(state, owner(state).id, cast(STAR_RESIST_ID, { targetDamageId: retire.id }));
  assert.equal(owner(state).status, "alive");
  assert.equal(owner(state).hp, 1);
  assert.equal(defense(state, 0), 0);
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.targetId === owner(state).id));
});

test("抵御可拦截无视伤害免疫的无限伤害和退游点伤害", () => {
  for (const [amountValue, retirement] of [[INFINITY_VALUE, false], [RETIRE_VALUE, true]] as const) {
    let state = fixture("10506");
    owner(state).buffs.push({ id: "defense_value", name: "防御值", stacks: 4 });
    state.pendingDamageItems = [{ id: "packet", targetId: owner(state).id, amount: 9999, amountValue,
      bypassDamageImmunity: true, ...(retirement ? { pointDefeatLevel: 2 } : {}) }];
    beginActionPrompt(state, "turn_damage_modify");
    state = enterActionWindow(state, owner(state).id);
    state = submitActionWindowSkill(state, owner(state).id, cast(STAR_RESIST_ID, { targetDamageId: "packet" }));
    assert.equal(owner(state).hp, 30);
    assert.equal(defense(state, 0), 0);
    assert.ok(!state.pendingDamageItems?.length);
  }
});

test("异星共振令斗转星移的转移伤害乘以符号无限", () => {
  let state = fixture("10506");
  state.pendingDamageItems = [{ id: "packet", targetId: owner(state).id, amount: 2 }];
  beginActionPrompt(state, "turn_damage_modify");
  state = enterActionWindow(state, owner(state).id);
  state = submitActionWindowSkill(state, owner(state).id, cast("skill_94_627", {
    targetDamageId: "packet", targetId: state.players[1]!.id
  }));
  assert.ok(state.eventLog.some((event) => event.type === "system" && event.message.includes("2∞ 点伤害")) ||
    state.pendingDamageItems?.some((item) => item.amountValue && formatCombatValue(item.amountValue) === "2∞"));
});

test("毁灭星辰击保留真实攻击，压制原攻击者的群攻技能并按来源保护不良", () => {
  let state = fixture("10506");
  changeElementAmount(owner(state), STAR_ELEMENT, 2);
  appendSkillInstances(state.players[1]!, ["skill_98_7182", "skill_82_45540"]);
  state = turn(state, [cast(STAR_STRIKE_ID), cast("skill_82_45540"), cake]);
  assert.equal(state.players[1]!.hp, 20);
  assert.equal(state.players[2]!.hp, 20);
  assert.equal(owner(state).hp, 30);
  const attacker = state.players[1]!.id;
  assert.ok(state.players[1]!.buffs.some(({ stateType }) => stateType === "star_group_attack_disabled"));
  assert.equal(applyNegativeStatus(state, owner(state).id, "frozen", () => assert.fail("immune"), attacker), false);
  assert.equal(applyNegativeStatus(state, owner(state).id, "frozen", () => {}, state.players[2]!.id), true);
});

test("魂耀九州将焚天君燚拉成群攻后，群攻失效也取消清场", () => {
  let state = fixture("10506");
  owner(state).bigCards!.push({ cardId: "10502", instanceId: "card-light", initialized: true });
  state.players[1]!.bigCards = [{ cardId: "10501", instanceId: "card-fire", initialized: true }];
  changeElementAmount(owner(state), STAR_ELEMENT, 2);
  state = turn(state, [cast(STAR_STRIKE_ID), cast(FENTIAN_ATTACK_ID, { targetId: owner(state).id }), cake]);
  assert.equal(state.players[2]!.cakes, 21);
  assert.ok(state.players[1]!.buffs.some(({ stateType }) => stateType === "star_group_attack_disabled"));
  assert.ok(!state.eventLog.some((event) => event.type === "system" && event.message.includes("焚天君燚在命中判定清除")));
});

test("狂龙之舞在付款后也检查自己为零饼，并阻挡来自他人的主动技能攻击", () => {
  let state = fixture("10507");
  owner(state).cakes = 2;
  appendSkillInstances(state.players[1]!, ["skill_82_45540"]);
  state = turn(state, [cast(DRAGON_DANCE_ID), cast("skill_82_45540", { targetId: owner(state).id }), cake]);
  assert.equal(owner(state).cakes, 4);
  assert.equal(defense(state, 0), 3);
  assert.equal(owner(state).hp, 30);
  assert.ok(owner(state).buffs.some(({ stateType }) => stateType === "dragon_active_immunity"));
});

test("鲜血金龙领域在提交时锁定总血量，分别走群攻、回血和单攻", () => {
  let state = fixture("10507", 17);
  state = submitPlayerAction(state, owner(state).id, cast(DRAGON_BLOOD_FIELD_ID)).state;
  state.players[2]!.hp = 100;
  const preview = previewPlayerAttackStats(state, owner(state).id).stats[0]!;
  assert.deepEqual([preview.power, preview.level, preview.defenseTag, preview.isArea], [9, 9, "youtiao", true]);
  state = turn(state, [cake, cake, cake]);
  assert.equal(state.players[1]!.hp, 8);
  assert.equal(state.players[2]!.hp, 91);

  state = turn(fixture("10507", 25), [cast(DRAGON_BLOOD_FIELD_ID), cake, cake]);
  assert.deepEqual(state.players.map(({ hp }) => hp), [40, 25, 25]);

  state = fixture("10507", 40);
  assert.throws(() => submitPlayerAction(state, owner(state).id, cast(DRAGON_BLOOD_FIELD_ID)), /必须指定/);
  state = turn(state, [cast(DRAGON_BLOOD_FIELD_ID, { targetId: state.players[1]!.id }), cake, cake]);
  assert.deepEqual(state.players.map(({ hp }) => hp), [40, 15, 40]);
});

test("异星共振按符号数值比较抵御上限", () => {
  for (const [offset, resistible] of [[1, true], [-1, false]] as const) {
    assert.equal(isStarResistible({ id: "d", targetId: "a", amount: 9999,
      amountValue: subtractCombatValues(INFINITY_VALUE, combatValue(offset)) }), resistible);
  }
});

test("星对每名攻击者各吸取一个大卡子技能，失去被拦截时不发放", () => {
  let state = fixture("10506");
  for (const [index, target] of state.players.slice(1).entries()) {
    target.bigCards = [{ instanceId: `target-${index}`, cardId: "10507", initialized: true,
      abilityUses: { [DRAGON_DISAPPEAR_ID]: 2 }, lostAbilityIds: ["1050702", "1050703", "1050704", "1050705", "1050706"] }];
    appendSkillInstances(target, ["skill_82_45540"]);
  }
  state.players[2]!.buffs.push({ id: "no-loss", name: "免技能失去", stacks: 1, immuneEffectCategories: ["skill_loss"] });
  const attack: PlayerAction = { type: "attack", attackId: "sha", targetId: owner(state).id, stacks: 1 };
  state = turn(state, [cast(GATHER_STAR_ID), attack, attack]);
  assert.deepEqual(owner(state).bigCards?.map((card) => card.onlyAbilityId), [undefined, DRAGON_DISAPPEAR_ID]);
  assert.equal(getSkillUseLimit(owner(state), DRAGON_DISAPPEAR_ID), 2);
  assert.ok(state.players[1]!.bigCards![0]!.lostAbilityIds?.includes(DRAGON_DISAPPEAR_ID));
  assert.ok(!state.players[2]!.bigCards![0]!.lostAbilityIds?.includes(DRAGON_DISAPPEAR_ID));
  assert.ok(state.players[1]!.skills.includes("skill_82_45540"));
});

test("龙卷残云使2血玩家直接消失，获得未公开且次数初始化的完整大卡", () => {
  let state = fixture("10507");
  const target = state.players[1]!;
  target.hp = 2;
  target.bigCards = [{ instanceId: "victim", cardId: "10507", initialized: true, abilityUses: { [DRAGON_DISAPPEAR_ID]: 1 } }];
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, owner(state).id, cast(DRAGON_DISAPPEAR_ID));
  assert.equal(state.players[1]!.defeatLevel, 3);
  assert.equal(state.players[1]!.hp, 2);
  assert.equal(state.players[1]!.bigCards![0]!.abilityUses?.[DRAGON_DISAPPEAR_ID], 1);
  assert.equal(getSkillUseLimit(owner(state), DRAGON_DISAPPEAR_ID), 3);
  assert.equal(owner(state).bigCards?.[1]?.publiclyRevealed, undefined);
  assert.equal(toPublicGameState(state, state.players[2]!.id).players[0]!.bigCards?.length, 0);
});

test("龙子诞辰诀按反弹与散弹的声明目标分支，额外命在普通死亡时直接切换", () => {
  for (const scatter of [false, true]) {
    let state = fixture("10507");
    const target = state.players[1]!;
    const halfHp = Math.floor(getPlayerInitialHp(owner(state)) / 2);
    if (scatter) appendSkillInstances(target, ["skill_58_88471"]);
    state = turn(state, [cast(DRAGON_HEIR_ID, { targetId: target.id }),
      { type: "defense", defense: "rebound", ...(scatter ? {} : { targetId: owner(state).id }) }, cake]);
    assert.equal(owner(state).spareLives?.[0]?.hp, halfHp);
    assert.equal(state.players[1]!.hp, 30);
    state = drain(state);
    owner(state).hp = 0;
    state.players[1]!.cakes = 1;
    state = turn(state, [cake, { type: "attack", attackId: "sha", targetId: owner(state).id, stacks: 1 }, cake]);
    assert.equal(owner(state).status, "alive");
    assert.equal(owner(state).hp, halfHp);
    assert.equal(owner(state).spareLives?.length, 0);
    assert.ok(!state.eventLog.some((event) => event.type === "heal" && event.targetId === owner(state).id && event.recoveryKind === "revival"));
  }
  let state = fixture("10507");
  state = turn(state, [cast(DRAGON_HEIR_ID, { targetId: state.players[1]!.id }), cake, cake]);
  assert.equal(owner(state).spareLives?.[0]?.hp, 0);
  assert.equal(state.players[1]!.defeatLevel, 1);
});

test("霸龙初始化借来的副本，归还原次数；第三轮烽火加次且不良免疫拦截吸取", () => {
  let state = fixture("10507");
  state.players[1]!.bigCards = [{ cardId: "10507", instanceId: "victim", initialized: true, abilityUses: { [DRAGON_DISAPPEAR_ID]: 1 } }];
  state.players[2]!.bigCards = [{ cardId: "10520", instanceId: "immune", initialized: true }];
  appendSkillInstances(state.players[2]!, [getFusionSkillId("天人合一")]);
  state.players[2]!.buffs.push({ id: "temp_negative_status_immunity", name: "免疫不良", stacks: 1, expiresAtTurn: state.turnNumber });
  state = turn(state, [cast(DRAGON_DOMINION_ID), cake, cake]);
  assert.equal(state.players[1]!.bigCards?.length, 0);
  assert.equal(state.players[2]!.bigCards?.[0]?.instanceId, "immune");
  const copy = owner(state).bigCards?.find((card) => card.borrowedUntilRound)!;
  assert.ok(copy);
  assert.equal(copy.abilityUses?.[DRAGON_DISAPPEAR_ID], undefined);
  assert.equal(getSkillUseLimit(owner(state), DRAGON_DISAPPEAR_ID), 5);
  const originalRound = state.roundNumber;
  for (let use = 0; use < 2; use++) {
    beginActionPrompt(state, "turn_before_action");
    state = submitActionWindowSkill(state, owner(state).id, cast(DRAGON_DISAPPEAR_ID, { bigCardInstanceId: copy.instanceId }));
  }
  assert.equal(getSkillUseLimit(owner(state), DRAGON_DISAPPEAR_ID), 3);
  state.roundNumber = originalRound + 3;
  settleDragonRoundChanges(state);
  assert.equal(getSkillUseLimit(owner(state), "skill_13_68869"), 21);
  assert.equal(getSkillUseLimit(owner(state), "skill_15_64971"), 14);
  state.roundNumber = originalRound + 5;
  settleDragonRoundChanges(state);
  assert.equal(state.players[1]!.bigCards?.[0]?.instanceId, "victim");
  assert.equal(getSkillUseLimit(state.players[1]!, DRAGON_DISAPPEAR_ID), 1);
  assert.equal(getSkillUseLimit(owner(state), DRAGON_DISAPPEAR_ID), 3);
  assert.equal(getSkillUseLimit(owner(state), "skill_13_68869"), 15);
  assert.equal(getSkillUseLimit(owner(state), "skill_15_64971"), 10);
  borrowBigCards(state, owner(state), state.players[1]!);
  assert.equal(getSkillUseLimit(owner(state), DRAGON_DISAPPEAR_ID), 5);
  assert.ok(owner(state).bigCards?.some((card) => card.borrowedUntilRound && card.instanceId !== copy.instanceId &&
    card.abilityUses?.[DRAGON_DISAPPEAR_ID] === undefined));
});

test("吸取圣灵凯歌获得七条初始化的额外命，到期收回借来的命", () => {
  const state = fixture("10507");
  state.players[1]!.bigCards = [{ cardId: "10520", instanceId: "song", initialized: true }];
  state.players[1]!.spareLives = [{ hp: 4, sourceBigCardInstanceId: "song" }];
  borrowBigCards(state, owner(state), state.players[1]!);
  assert.equal(owner(state).spareLives?.length, 7);
  assert.deepEqual(state.players[1]!.spareLives, []);
  state.roundNumber += 5;
  settleDragonRoundChanges(state);
  assert.deepEqual(owner(state).spareLives, []);
  assert.deepEqual(state.players[1]!.spareLives, [{ hp: 4, sourceBigCardInstanceId: "song" }]);
});
