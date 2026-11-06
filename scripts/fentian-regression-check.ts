import assert from "node:assert/strict";
import {
  GameState, PlayerAction, SkillAction, createGame, createPlayer, addPlayerToGame, startGame, passActionWindow,
  submitPlayerAction, submitActionWindowSkill, getAllSkills, getSkill, getFusionSkillId, getActiveFusionCount,
  FENTIAN_ATTACK_ID, LAVA_ARMOR_ID, FENSHI_FLAMES_ID, getFatalDamageEvents, getActiveSkillCount,
  grantInitializedSkill, addBigCardStatus, appendSkillInstances, removeBigCardInstance, decomposeSkill,
  getSkillCardIds, registerStateDefinition, beginActionPrompt, getDestroyPowerCooldownCount, getSkillUseLimit,
  getSkillAttackStats, getTurnSkillActionCost,
  NEGATIVE_STATUS_IMMUNITY_BUFF_ID, createBaseEvent, toPublicGameState, previewPlayerAttackStats
} from "@bing/shared";
const id = (name: string) => getAllSkills().find((skill) => skill.name === name)!.id;
const p = (state: GameState, i = 0) => state.players[i]!;
const cast = (skillId: string, targetId?: string, targetIds?: string[]): SkillAction => ({ type: "skill", skillId, stacks: 1,
  ...(targetId ? { targetId } : {}), ...(targetIds ? { targetIds } : {}) });
function drain(state: GameState, stop?: string): GameState {
  for (let guard = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && guard < 70; guard++) {
    const next = state.players.find((player) => player.status === "alive" && player.kind !== "spectator" && !state.actionWindowPassPlayerIds.includes(player.id));
    if (!next) throw new Error(`Stalled at ${state.activeTimingPhase}`);
    state = passActionWindow(state, next.id);
  }
  return state;
}
function fixture(cards = ["10501"], extra: string[][] = [[], [], []]): GameState {
  let state = createGame("A", { skillMode: "big_test_select", skillCount: 3, firstTurnNoAttack: false });
  state = addPlayerToGame(state, createPlayer("B")); state = addPlayerToGame(state, createPlayer("C"));
  state.players.forEach((player, index) => { player.bigCards = (index === 0 ? cards : ["10504", "10509"]).map((cardId, n) => ({ instanceId: `card-${index}-${n}`, cardId })); });
  state = startGame(state);
  state.players.forEach((player, index) => { player.hp = 50; player.cakes = 50; appendSkillInstances(player, (extra[index] ?? []).map(id)); });
  return drain(state);
}
function turn(state: GameState, actions: PlayerAction[], stop?: string): GameState {
  state.players.forEach((player, index) => { if (player.status === "alive") state = submitPlayerAction(state, player.id, actions[index] ?? { type: "gain_cake" }).state; });
  return drain(state, stop);
}
const cake: PlayerAction = { type: "gain_cake" };
const small: PlayerAction = { type: "defense", defense: "small" };
let passed = 0, failed = 0;
function check(name: string, run: () => void) { try { run(); passed++; console.log(`ok - ${name}`); } catch (error) { failed++; console.error(`not ok - ${name}\n${error instanceof Error ? error.stack : error}`); } }
registerStateDefinition({ id: "fentian_test_positive", name: "测试良好", categories: ["positive"] });
registerStateDefinition({ id: "fentian_test_element", name: "测试元素", categories: ["element"] });

check("opening grants the real v4 fusion and separate copies for repeated big cards", () => {
  const state = fixture(["10501", "10501"]);
  assert.equal(getFusionSkillId("天火之狱"), "fusion_c9faa8d601c6");
  assert.equal(getActiveFusionCount(p(state), "天火之狱"), 2);
  assert.equal(getActiveFusionCount(p(state), "炽焰"), 2);
  assert.equal(p(state).skills.length, 12);
  assert.equal(getSkillCardIds(p(state)).length, 4);
  assert.equal(new Set(p(state).skillInventory!.map((entry) => entry.instanceId)).size, 12);
  assert.equal(getActiveSkillCount(p(state), FENTIAN_ATTACK_ID), 2);
});
check("Blazing grants exactly two one-packet Burning Earth uses and removes unprotected ice skills", () => {
  let state = fixture(["10501"], [[], ["寒冰剑"], []]);
  const earth = id("火烧大地");
  assert.equal(getSkillUseLimit(p(state), earth), 2);
  for (let use = 0; use < 2; use++) {
    beginActionPrompt(state, "turn_before_action");
    state = submitActionWindowSkill(state, p(state).id, cast(earth));
  }
  beginActionPrompt(state, "turn_before_action");
  assert.throws(() => submitActionWindowSkill(state, p(state).id, cast(earth)), /次数上限/);
  assert.deepEqual(state.players.slice(1).map(({ hp }) => hp), [46, 46]);
  assert.equal(getActiveSkillCount(p(state, 1), id("寒冰剑")), 0);
  assert.equal(state.eventLog.filter((event) => event.type === "damage" && event.attackName === "火烧大地" && event.amount === 2).length, 4);
});
check("Blazing upgrades the fire blade and lava marks, and Fire Vortex can be paid with one cake", () => {
  let state = fixture();
  const vortex = id("火漩决");
  assert.equal(getSkillAttackStats(vortex, 1, p(state))?.cost, 1);
  assert.equal(getTurnSkillActionCost(p(state), cast(vortex)), 1);
  p(state).cakes = 1;
  state = turn(state, [cast(vortex, p(state, 1).id), cake, cake], "turn_end_action");
  assert.equal(p(state).cakes, 0);

  state = drain(state);
  p(state).cakes = 1;
  p(state).buffs.push({ id: "lava_mark", name: "熔岩印记", stacks: 1 });
  state = turn(state, [{ type: "attack", attackId: "sha", stacks: 1, targetId: p(state, 1).id }, cake, cake], "turn_change_action");
  const before = previewPlayerAttackStats(state, p(state).id).stats[0]!;
  assert.deepEqual([before.power, before.level], [3, 3]);
  state = submitActionWindowSkill(state, p(state).id, cast(id("熔岩之怒")));
  const after = previewPlayerAttackStats(state, p(state).id).stats[0]!;
  assert.deepEqual([after.power, after.level], [6, 6]);
});
check("clear at the hit point includes self, registered states, cakes and defense; negative/cooldown records survive", () => {
  let state = fixture();
  state.players.forEach((player) => player.buffs.push(
    { id: `positive-${player.id}`, stateType: "fentian_test_positive", name: "良好", stacks: 1 },
    { id: `element-${player.id}`, stateType: "fentian_test_element", name: "元素", stacks: 3 },
    { id: "defense_value", name: "防御值", stacks: 20 },
    { id: "cooldown-audit", name: "冷却记录", stacks: 1 }));
  state = turn(state, [cast(FENTIAN_ATTACK_ID, p(state, 1).id), small, cake], "turn_end_action");
  assert.ok(state.players.every((player) => player.cakes === 0 && !player.buffs.some((buff) => ["fentian_test_positive", "fentian_test_element"].includes(buff.stateType ?? "") || buff.id === "defense_value")));
  assert.ok(state.players.every((player) => player.buffs.some((buff) => buff.id === "cooldown-audit")));
  assert.deepEqual(state.eventLog.filter((event) => event.type === "damage" && event.targetId === p(state, 1).id).map((event) => event.type === "damage" ? event.amount : 0), [4, 3, 2]);
  assert.equal(p(state, 1).hp, 41);
  assert.equal(p(state, 1).buffs.filter((buff) => ["burning", "limited_disabled", "control_disabled"].includes(buff.stateType ?? "")).length, 3);
});
check("blocked attack still clears globally, but grants no hit states", () => {
  let state = fixture();
  state = turn(state, [cast(FENTIAN_ATTACK_ID, p(state, 1).id), { type: "defense", defense: "youtiao" }, cake], "turn_end_action");
  assert.equal(p(state, 1).hp, 50); assert.ok(!p(state, 1).buffs.some((buff) => buff.stateType === "burning"));
  assert.ok(state.players.every((player) => player.cakes === 0));
});
check("an invalidated declaration cannot clear the battlefield", () => {
  let state = fixture(["10501"], [[], [], ["破地之力"]]);
  state = turn(state, [cast(FENTIAN_ATTACK_ID, p(state, 1).id), cake, cake]);
  assert.equal(p(state).cakes, 46);
  assert.ok(!state.eventLog.some((event) => event.type === "system" && event.message.includes("在命中判定清除")));
});
check("three fire attack segments remain attack damage for bagua", () => {
  let state = fixture(["10501"], [[], ["八卦阵"], []]);
  state = turn(state, [cast(FENTIAN_ATTACK_ID, p(state, 1).id), cake, cake], "turn_end_action");
  assert.equal(p(state, 1).hp, 44);
});
check("unequal segments share one clash but each computes its own damage", () => {
  let state = fixture();
  state = turn(state, [cast(FENTIAN_ATTACK_ID, p(state, 1).id),
    { type: "attack", attackId: "sha", stacks: 5, targetId: p(state).id }, cake], "turn_end_action");
  const damage = state.eventLog.filter((event) => event.type === "damage" && event.attackName === "焚天君燚");
  assert.deepEqual(damage.map((event) => event.type === "damage" ? event.amount : 0), [2, 1.5, 1]);
});
check("destruction multiplies every segment and the actual hit matches its preview", () => {
  let state = fixture(["10501"], [["毁灭之力"], [], []]);
  state = turn(state, [cast(FENTIAN_ATTACK_ID, p(state, 1).id), cake, cake], "turn_change_action");
  state = submitActionWindowSkill(state, p(state).id, { ...cast(id("毁灭之力")), switchActionIndex: 0,
    attackStatModifier: "power_times_3_level_to_zero" });
  const preview = previewPlayerAttackStats(state, p(state).id).stats[0]!;
  assert.deepEqual(preview.damageParts, [12, 9, 6]); assert.equal(preview.level, 0);
  state = drain(state, "turn_end_action");
  assert.deepEqual(state.eventLog.filter((event) => event.type === "damage" && event.attackName === "焚天君燚")
    .map((event) => event.type === "damage" ? event.amount : 0), [12, 9, 6]);
});
check("level exchange changes only the primary segment and the shared level", () => {
  let state = fixture(["10501"], [["级换"], [], []]);
  state = turn(state, [cast(FENTIAN_ATTACK_ID, p(state, 1).id), cake, cake], "turn_change_action");
  state = submitActionWindowSkill(state, p(state).id, { ...cast(id("级换")), switchActionIndex: 0,
    attackStatModifier: "swap_power_level" });
  const preview = previewPlayerAttackStats(state, p(state).id).stats[0]!;
  assert.deepEqual(preview.damageParts, [10, 3, 2]); assert.equal(preview.level, 4);
  state = drain(state, "turn_end_action");
  assert.deepEqual(state.eventLog.filter((event) => event.type === "damage" && event.attackName === "焚天君燚")
    .map((event) => event.type === "damage" ? event.amount : 0), [10, 3, 2]);
});
check("destruction then a cost exchange uses only the primary segment and settles the difference", () => {
  let state = fixture(["10501"], [["毁灭之力"], [], []]);
  grantInitializedSkill(state, p(state).id, getFusionSkillId("杀级换"), "test", false);
  state = turn(state, [cast(FENTIAN_ATTACK_ID, p(state, 1).id), cake, cake], "turn_change_action");
  state = submitActionWindowSkill(state, p(state).id, { ...cast(id("毁灭之力")), switchActionIndex: 0,
    attackStatModifier: "power_times_3_level_to_zero" });
  state = submitActionWindowSkill(state, p(state).id, { ...cast(id("级换")), switchActionIndex: 0,
    attackStatModifier: "swap_cost_power" });
  const preview = previewPlayerAttackStats(state, p(state).id);
  assert.deepEqual(preview.stats[0]!.damageParts, [4, 9, 6]); assert.equal(preview.costs[0], 12);
  state = drain(state, "turn_end_action");
  assert.deepEqual(state.eventLog.filter((event) => event.type === "damage" && event.attackName === "焚天君燚")
    .map((event) => event.type === "damage" ? event.amount : 0), [4, 9, 6]);
  assert.ok(state.eventLog.some((event) => event.type === "cake_changed" && event.reason === "变招费用结算：补扣差额" && event.before - event.after === 8));
});
check("a source-specific golden bell blocks the entire segmented attack and all attached statuses", () => {
  let state = fixture();
  p(state, 1).buffs.push({ id: "jin_zhong_zhao", name: "金钟罩", stacks: 1, sourcePlayerId: p(state).id });
  state = turn(state, [cast(FENTIAN_ATTACK_ID, p(state, 1).id), cake, cake], "turn_end_action");
  assert.equal(p(state, 1).hp, 50);
  assert.ok(!p(state, 1).buffs.some((buff) => buff.stateType === "burning"));
});
check("skill reflection defeats Origin, reflects nuclear attacks, and ignores absolute/scatter upgrades", () => {
  let state = fixture();
  grantInitializedSkill(state, p(state).id, getFusionSkillId("弹力球"), "test", false);
  appendSkillInstances(p(state), [id("散弹"), id("绝弹")]);
  grantInitializedSkill(state, p(state, 1).id, getFusionSkillId("根源之目"), "test", false);
  state = turn(state, [cast(LAVA_ARMOR_ID), { type: "attack", attackId: "he_bao", stacks: 1, targetId: p(state).id }, cake], "revival_action");
  assert.equal(p(state).hp, 50);
  assert.ok(state.eventLog.some((event) => event.type === "attack_reflected" && event.sourceId === p(state, 1).id && event.reflectedTargetId === p(state, 1).id));
  assert.ok(!state.eventLog.some((event) => event.type === "system" && event.message.includes("无限散弹")));
});
check("skill reflection does not stop retirement-level attacks or non-attack electric shock", () => {
  let state = fixture(["10501"], [[], ["卷子"], []]);
  state = turn(state, [cast(LAVA_ARMOR_ID), cast(id("卷子"), p(state).id), cake], "revival_action");
  assert.ok(!state.eventLog.some((event) => event.type === "attack_reflected" && event.attackName === "卷子"));
  state = fixture(["10501"], [[], ["电击法术"], []]);
  state = turn(state, [cast(LAVA_ARMOR_ID), cast(id("电击法术"), p(state).id), cake], "turn_end_action");
  assert.ok(p(state).buffs.some((buff) => buff.id.startsWith("paralysis_next_action:")));
});
check("armor grants four defense and restricts selected players' reduction and evasion, not invulnerability", () => {
  let state = fixture(["10501"], [[], ["八卦阵", "闪现"], []]);
  state = turn(state, [cast(LAVA_ARMOR_ID, undefined, [p(state, 1).id]), cake, cake]);
  assert.equal(p(state).buffs.find((buff) => buff.id === "defense_value")?.stacks, 4);
  state.players.forEach((player, index) => { state = submitPlayerAction(state, player.id, index === 2 ? { type: "attack", attackId: "sha", stacks: 1, targetId: p(state, 1).id } : cake).state; });
  state = submitActionWindowSkill(state, p(state, 1).id, cast(id("闪现")));
  state = drain(state, "turn_end_action"); assert.equal(p(state, 1).hp, 49);
  state = fixture(); p(state, 1).buffs.push({ id: "temp_invulnerable", name: "无敌", stacks: 1, expiresAtTurn: state.turnNumber });
  state = turn(state, [cast(LAVA_ARMOR_ID, undefined, [p(state, 1).id]), cake,
    { type: "attack", attackId: "sha", stacks: 1, targetId: p(state, 1).id }], "turn_end_action");
  assert.equal(p(state, 1).hp, 50);
});
check("independent burning ticks include the hit turn and next turn, never restart a round or retaliate", () => {
  let state = fixture(["10501"], [[], ["帝炎之境", "遗计"], []]);
  for (let i = 0; i < 2; i++) addBigCardStatus(state, p(state, 1).id, "burning", p(state).id, FENTIAN_ATTACK_ID, p(state).bigCards![0]!.instanceId,
    { expiresAtTurn: state.turnNumber + 2 }, true);
  const round = state.roundNumber;
  state = turn(state, [cake, cake, cake]); assert.equal(p(state, 1).hp, 48); assert.equal(state.roundNumber, round);
  assert.equal(p(state).hp, 50);
  state = turn(state, [cake, cake, cake]); assert.equal(p(state, 1).hp, 46); assert.equal(state.roundNumber, round);
  state = turn(state, [cake, cake, cake]); assert.equal(p(state, 1).hp, 46);
  const burnEvents = state.eventLog.filter((event) => event.type === "damage" && event.attackName === "烧伤");
  assert.equal(burnEvents.length, 4); assert.ok(burnEvents.every((event) => event.type === "damage" && !event.sourceId && event.element === "fire"));
  assert.ok(p(state, 1).buffs.some((buff) => buff.id.startsWith("took_damage_round:")));
});
check("negative-status immunity prevents each new state but leaves existing burns", () => {
  let state = fixture();
  addBigCardStatus(state, p(state, 1).id, "burning", p(state).id, FENTIAN_ATTACK_ID, undefined, { expiresAtTurn: state.turnNumber + 2 }, true);
  p(state, 1).buffs.push({ id: NEGATIVE_STATUS_IMMUNITY_BUFF_ID, name: "免疫不良", stacks: 1, expiresAtTurn: state.turnNumber });
  state = turn(state, [cast(FENTIAN_ATTACK_ID, p(state, 1).id), cake, cake], "turn_end_action");
  assert.equal(p(state, 1).buffs.filter((buff) => buff.stateType === "burning").length, 1);
  assert.ok(!p(state, 1).buffs.some((buff) => buff.stateType === "limited_disabled" || buff.stateType === "control_disabled"));
});
check("limited/control failure spends uses and cooldown without producing an effect", () => {
  let state = fixture(["10501"], [[], ["卷子", "毁灭之力"], []]);
  state = turn(state, [cast(FENTIAN_ATTACK_ID, p(state, 1).id), cake, cake]);
  state = turn(state, [cake, cast(id("卷子"), p(state, 2).id), cake], "turn_end_action");
  assert.equal(p(state, 2).hp, 50);
  assert.equal(p(state, 1).buffs.find((buff) => buff.id === `skill_used:${id("卷子")}`)?.stacks, 1);
  state = drain(state); p(state, 1).cakes = 5;
  state.players.forEach((player, index) => { state = submitPlayerAction(state, player.id, index === 1 ? { type: "attack", attackId: "sha", stacks: 1, targetId: p(state, 2).id } : cake).state; });
  state = submitActionWindowSkill(state, p(state, 1).id, { ...cast(id("毁灭之力")), attackStatModifier: "power_plus_1_level_minus_1" });
  assert.equal(getDestroyPowerCooldownCount(p(state, 1), state.roundNumber), 1);
  state = drain(state, "turn_end_action"); assert.equal(p(state, 2).hp, 49);
});
check("fire-removing skill cannot affect Fentian's real inherited fusion", () => {
  let state = fixture(["10501"], [[], ["霜落大地"], []]);
  grantInitializedSkill(state, p(state, 2).id, getFusionSkillId("天火之狱"), "test", false);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, p(state, 1).id, cast(id("霜落大地")));
  assert.equal(getActiveFusionCount(p(state), "天火之狱"), 1);
  assert.equal(p(state).hp, 50);
  assert.equal(getActiveFusionCount(p(state, 2), "天火之狱"), 0);
});
check("standalone Blazing protects fire skills against Ice-Fire Eyes but takes the base spell damage", () => {
  let state = fixture();
  grantInitializedSkill(state, p(state, 1).id, getFusionSkillId("冰火两仪眼"), "test", false);
  grantInitializedSkill(state, p(state, 2).id, getFusionSkillId("炽焰"), "test", false);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, p(state, 1).id, cast(getFusionSkillId("冰火两仪眼")));
  assert.equal(getActiveFusionCount(p(state, 2), "炽焰"), 1);
  assert.equal(p(state, 2).hp, 49);
  assert.equal(p(state).hp, 50, "Fentian's separate inheritance still ignores the entire skill");
});
check("a fizzled paid control skill still triggers the separate pure-sky use response", () => {
  let state = fixture();
  grantInitializedSkill(state, p(state, 1).id, getFusionSkillId("纯净苍穹"), "test", false);
  addBigCardStatus(state, p(state, 1).id, "control_disabled", p(state).id, FENTIAN_ATTACK_ID, undefined, { expiresAtRound: state.roundNumber + 2 }, true);
  state.players.forEach((player, index) => { state = submitPlayerAction(state, player.id, index === 1 ? small : cake).state; });
  const before = p(state, 1).cakes;
  state = submitActionWindowSkill(state, p(state, 1).id, { ...cast(id("幻防")), switchActionIndex: 0,
    switchToAction: { type: "defense", defense: "youtiao" } });
  assert.equal(p(state, 1).cakes, before - 2);
  assert.ok(p(state, 1).buffs.some((buff) => buff.id === NEGATIVE_STATUS_IMMUNITY_BUFF_ID));
  assert.deepEqual(state.pendingActions[p(state, 1).id]!.actions, [small]);
  assert.ok(p(state, 1).buffs.some((buff) => buff.stateType === "control_disabled"));
});
check("removing a source card removes exactly its fusion or decomposed materials, retaining independent copies", () => {
  let state = fixture(["10501", "10501"]);
  grantInitializedSkill(state, p(state).id, getFusionSkillId("天火之狱"), "independent", false);
  const sourceId = p(state).bigCards![0]!.instanceId;
  const fusionId = p(state).skillFusions!.find((fusion) => fusion.sourceBigCardInstanceId === sourceId)!.id;
  beginActionPrompt(state, "turn_end_action"); state = decomposeSkill(state, p(state).id, fusionId);
  const blazing = p(state).skillFusions!.find((fusion) => fusion.sourceBigCardInstanceId === sourceId && fusion.skillId === "4004")!;
  state = decomposeSkill(state, p(state).id, blazing.id);
  removeBigCardInstance(state, p(state).id, sourceId, "burn");
  assert.equal(p(state).skills.length, 8); assert.equal(getActiveFusionCount(p(state), "天火之狱"), 2);
  assert.equal(getActiveFusionCount(p(state), "炽焰"), 1);
  assert.equal(p(state).bigCards!.length, 1);
  assert.ok(!p(state).skillInventory!.some((entry) => entry.sourceBigCardInstanceId === sourceId));
});
check("independent flames grant one fenjin each for joint fire participation and burn cards after automatic revival", () => {
  let state = fixture(["10501"], [[], ["浴火重生"], []]);
  state = turn(state, [cast(FENSHI_FLAMES_ID), cake, cake]);
  state = turn(state, [cast(FENSHI_FLAMES_ID), cake, cake]);
  assert.equal(p(state).buffs.filter((buff) => buff.stateType === "fenshi_flames").length, 2);
  p(state, 1).hp = 2;
  state = turn(state, [{ type: "attack", attackId: "huo_wu", stacks: 1, targetId: p(state, 1).id }, cake,
    { type: "attack", attackId: "qin", stacks: 1, targetId: p(state, 1).id }], "turn_end_action");
  assert.ok(p(state, 1).hp > 0); assert.equal(p(state, 1).bigCards!.length, 0);
  assert.ok(!p(state, 1).buffs.some((buff) => buff.stateType === "fenjin"));
  assert.equal(state.eventLog.filter((event) => event.type === "system" && event.removalKind === "burn").length, 2);
});
check("source-free burning can revive by fire but never earns the applier a fire kill", () => {
  let state = fixture(["10501"], [[], ["浴火重生"], []]);
  state = turn(state, [cast(FENSHI_FLAMES_ID), cake, cake]); p(state, 1).hp = 0;
  addBigCardStatus(state, p(state, 1).id, "burning", p(state).id, FENTIAN_ATTACK_ID, undefined, { expiresAtTurn: state.turnNumber + 2 }, true);
  state = turn(state, [cake, cake, cake]);
  assert.equal(p(state, 1).hp, 6); assert.equal(p(state, 1).bigCards!.length, 2);
  assert.ok(!state.eventLog.some((event) => event.type === "system" && event.removalKind === "burn"));
});
check("a turn-end burn resumes correctly after an active revival and cannot restart the round", () => {
  let state = fixture(["10501"], [[], ["治愈术"], []]);
  p(state, 1).hp = 0;
  addBigCardStatus(state, p(state, 1).id, "burning", p(state).id, FENTIAN_ATTACK_ID, undefined, { expiresAtTurn: state.turnNumber + 2 }, true);
  const round = state.roundNumber;
  state = turn(state, [cake, cake, cake], "revival_action");
  assert.ok(state.turnEndStatusPending); assert.equal(p(state, 1).hp, -1);
  state = submitActionWindowSkill(state, p(state, 1).id, cast(id("治愈术")));
  state = drain(state);
  assert.equal(p(state, 1).hp, 6); assert.equal(state.roundNumber, round);
  assert.equal(state.turnEndStatusPending, undefined); assert.equal(state.phase, "collecting_actions");
});
check("pure-sky immunity prevents newly applied fenjin without removing a card", () => {
  let state = fixture(["10501"], [[], ["浴火重生"], []]);
  state = turn(state, [cast(FENSHI_FLAMES_ID), cake, cake]); p(state, 1).hp = 1;
  p(state, 1).buffs.push({ id: NEGATIVE_STATUS_IMMUNITY_BUFF_ID, name: "免疫不良", stacks: 1, expiresAtTurn: state.turnNumber });
  state = turn(state, [{ type: "attack", attackId: "huo_wu", stacks: 2, targetId: p(state, 1).id }, cake, cake], "turn_end_action");
  assert.equal(p(state, 1).hp, 6); assert.equal(p(state, 1).bigCards!.length, 2);
  assert.ok(!p(state, 1).buffs.some((buff) => buff.stateType === "fenjin"));
});
check("independently cast flames survive removal of their source card and still award fenjin", () => {
  let state = fixture(["10501"], [[], ["浴火重生"], []]);
  state = turn(state, [cast(FENSHI_FLAMES_ID), cake, cake]);
  removeBigCardInstance(state, p(state).id, p(state).bigCards![0]!.instanceId);
  assert.equal(getActiveFusionCount(p(state), "天火之狱"), 0);
  assert.equal(p(state).buffs.filter((buff) => buff.stateType === "fenshi_flames").length, 1);
  p(state, 1).hp = 1;
  state = turn(state, [{ type: "attack", attackId: "huo_wu", stacks: 2, targetId: p(state, 1).id }, cake, cake], "turn_end_action");
  assert.equal(p(state, 1).hp, 6); assert.equal(p(state, 1).bigCards!.length, 1);
});
check("fenjin is consumed once after an active healing-skill revival", () => {
  let state = fixture(["10501"], [[], ["治愈术"], []]);
  state = turn(state, [cast(FENSHI_FLAMES_ID), cake, cake]); p(state, 1).hp = 1;
  state = turn(state, [{ type: "attack", attackId: "huo_wu", stacks: 2, targetId: p(state, 1).id }, cake, cake], "revival_action");
  assert.equal(p(state, 1).buffs.filter((buff) => buff.stateType === "fenjin").length, 1);
  p(state, 1).buffs.push({ id: NEGATIVE_STATUS_IMMUNITY_BUFF_ID, name: "后来获得的免疫不良", stacks: 1, expiresAtTurn: state.turnNumber });
  state = submitActionWindowSkill(state, p(state, 1).id, cast(id("治愈术")));
  assert.equal(p(state, 1).hp, 6); assert.equal(p(state, 1).bigCards!.length, 1);
  assert.ok(!p(state, 1).buffs.some((buff) => buff.stateType === "fenjin"));
});
check("Fentian's global clear removes its own flames before the same attack can award fenjin", () => {
  let state = fixture(["10501"], [[], ["浴火重生"], []]);
  state = turn(state, [cast(FENSHI_FLAMES_ID), cake, cake]); p(state, 1).hp = 1;
  state = turn(state, [cast(FENTIAN_ATTACK_ID, p(state, 1).id), cake, cake], "turn_end_action");
  assert.equal(p(state, 1).bigCards!.length, 2);
  assert.ok(!p(state).buffs.some((buff) => buff.stateType === "fenshi_flames"));
});
check("prior zero-HP damage is excluded from the next batch's soul-rend and fire death attribution", () => {
  let state = fixture(["10501"], [["裂魂"], ["浴火重生"], ["火烧大地"]]);
  p(state, 1).hp = 0;
  state.eventLog.push({ ...createBaseEvent(state, "damage"), type: "damage", sourceId: p(state).id, targetId: p(state, 1).id,
    amount: 4, element: "fire", attackName: "已结算的火球" });
  beginActionPrompt(state, "turn_end_action"); state.turnResolutionStarted = true;
  state = submitActionWindowSkill(state, p(state, 2).id, cast(id("火烧大地")));
  assert.equal(p(state, 1).hp, 6); assert.ok(!p(state, 1).buffs.some((buff) => buff.id === "no_revive"));
  assert.ok(getFatalDamageEvents(state, p(state, 1).id).every((event) => event.attackName !== "已结算的火球"));
  assert.ok(!("damageAttribution" in toPublicGameState(state, p(state).id)));
});
check("three-round flames and multi-round suppression expire at explicit round boundaries", () => {
  let state = fixture(); state = turn(state, [cast(FENSHI_FLAMES_ID), cake, cake]);
  const round = state.roundNumber;
  state.roundNumber = round + 2; beginActionPrompt(state, "round_pre_interval_action");
  assert.equal(p(state).buffs.filter((buff) => buff.stateType === "fenshi_flames").length, 1);
  state.roundNumber = round + 3; beginActionPrompt(state, "round_pre_interval_action");
  assert.equal(p(state).buffs.filter((buff) => buff.stateType === "fenshi_flames").length, 0);
});
console.log(`Fentian regression: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
