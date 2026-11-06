import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMMON_FUSION_SKILL_ID, FUSION_RECIPES, INFINITY_VALUE, addPlayerToGame, advanceActionWindow, beginActionPrompt,
  appendSkillInstances, applyNegativeStatus, createGame, createId, createPlayer, decomposeSkill, ensureSkillInventory, getActiveFusionCount,
  getAllSkills, getAvailableFusionRecipes, getDestructionModifiers, getDestroyPowerCooldownCount, getFlashDodgeCooldownCount, getFusionMaterialSelection, getFusionMaterials, getFusionRecipe,
  getFusionSkillId, getFusionTier, getRootFusions, getSkillUseLimit, getStackedAttackStats, BASE_ATTACKS, getAttackFieldBlocker,
  getSkillAttackStats, getTurnSkillActionCost, getManualDemonDomainCount, getActiveSkillCount, getDamageRedirectLimit,
  grantInitializedSkill, removeBigCardInstance, submitActionWindowSkill, INFINITE_DAMAGE,
  getAttackMarkCount, STAR_RAGE_ID, STAR_RAGE_MARK_ID, STAR_RAGE_SIX_STAR,
  previewPlayerAttackStats, reconcileSkillFusions, removeSkillInstanceAt, startGame, submitPlayerAction, toPublicGameState,
  type GameState, type PlayerAction, type SkillAction
} from "@bing/shared";

const named = (name: string) => getAllSkills({ includeFusions: true }).find((skill) => skill.name === name)!.id;
const cake = { type: "gain_cake" } as const;
const action = (name: string, targetId?: string): SkillAction =>
  ({ type: "skill", skillId: named(name), stacks: 1, ...(targetId ? { targetId } : {}) });
const attack = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", stacks: 1, targetId });
const owner = (state: GameState) => state.players[0]!;

function fixture(skills: string[]): GameState {
  let state = createGame("A", { skillMode: "test_select", skillCount: 12, firstTurnNoAttack: false });
  for (const name of ["B", "C"]) state = addPlayerToGame(state, createPlayer(name));
  owner(state).skills = skills.map(named);
  return startGame(state);
}

function fuse(state: GameState, name: string, materialIds?: string[]): GameState {
  return fuseById(state, getFusionSkillId(name), materialIds);
}

function fuseById(state: GameState, id: string, materialIds?: string[]): GameState {
  return submitPlayerAction(state, owner(state).id, {
    type: "skill", skillId: COMMON_FUSION_SKILL_ID, stacks: 1, targetSkillId: id,
    fusionRequestId: createId("fusion_request"), ...(materialIds ? { fusionMaterialInstanceIds: materialIds } : {})
  }).state;
}

function drain(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; i < 60 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++) state = advanceActionWindow(state);
  return state;
}

function turn(state: GameState, actions: PlayerAction[]): GameState {
  state = drain(state);
  for (const [index, player] of state.players.entries()) {
    if (player.status === "alive" && !state.pendingActions[player.id]) state = submitPlayerAction(state, player.id, actions[index] ?? cake).state;
  }
  return drain(state, "turn_end_action");
}

test("48 条配方按实际槽数入库，只有实现完整的条目开放", () => {
  const triples = FUSION_RECIPES.filter((recipe) => recipe.tier === 3);
  assert.equal(triples.length, 48);
  assert.equal(triples.filter((recipe) => getAllSkills({ includeFusions: true }).some((skill) => skill.id === recipe.skill.id && skill.implemented)).length, 25);
});

test("暗影之魂初始有两次暗影盾，只在暗影狙击使人退游时加次", () => {
  for (const cakes of [0, 2]) {
    let state = drain(fuse(fuse(fixture(["狙击枪", "古淀刀", "暗影盾"]), "暗影狙击"), "暗影之魂"));
    assert.equal(getSkillUseLimit(owner(state), named("暗影盾")), 2);
    owner(state).cakes = 1;
    state.players[1]!.skills = [named("全力一击")];
    state.players[1]!.cakes = cakes;
    state = turn(state, [attack(state.players[1]!.id), action("全力一击", state.players[2]!.id), { type: "defense", defense: "small" }]);
    assert.equal(state.players[1]!.defeatLevel ?? 0, cakes === 0 ? 2 : 0);
    assert.equal(getSkillUseLimit(owner(state), named("暗影盾")), cakes === 0 ? 3 : 2);
  }
});

test("毁灭之魂升级全力一击和变招，且沿用毁灭之力的轮次冷却", () => {
  let state = drain(fuse(fuse(fixture(["全力一击", "后盾", "毁灭之力"]), "毁灭之盾"), "毁灭之魂"));
  assert.deepEqual(getSkillAttackStats(named("全力一击"), 1, owner(state))?.levelValue, INFINITY_VALUE);
  assert.equal(getDestructionModifiers(owner(state)).length, 6);
  state = submitPlayerAction(state, owner(state).id, action("全力一击", state.players[1]!.id)).state;
  for (const player of state.players.slice(1)) state = submitPlayerAction(state, player.id, cake).state;
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, {
    ...action("毁灭之力"), attackStatModifier: "power_times_3_level_to_zero" }), /必须选择/);
  state = submitActionWindowSkill(state, owner(state).id, { ...action("毁灭之力"), attackStatModifier: "power_times_6_level_to_zero" });
  assert.deepEqual(previewPlayerAttackStats(state, owner(state).id).stats[0]?.powerValue, [{ exponent: 1, coefficient: 6 }]);
  assert.equal(getDestroyPowerCooldownCount(owner(state), state.roundNumber), 1);
  assert.equal(getDestroyPowerCooldownCount(owner(state), state.roundNumber + 1), 0);
});

test("无限之力开放无限乘法，并解除凝血之力的加饼上限", () => {
  let state = fuse(fuse(fixture(["破地之力", "毁灭之力", "凝血之力"]), "宗师之力"), "无限之力");
  state.roundNumber = 2;
  owner(state).buffs.push({ id: "damage_taken_round:1", name: "上一轮受伤", stacks: 9 });
  state = submitActionWindowSkill(state, owner(state).id, action("凝血之力"));
  assert.equal(owner(state).buffs.find((buff) => buff.id === "coagulation_cake_round:2")?.stacks, 9);
  assert.ok(getDestructionModifiers(owner(state)).includes("power_times_infinity"));
  state = drain(state);
  owner(state).cakes = 1;
  state = submitPlayerAction(state, owner(state).id, attack(state.players[1]!.id)).state;
  for (const player of state.players.slice(1)) state = submitPlayerAction(state, player.id, cake).state;
  state = submitActionWindowSkill(state, owner(state).id, { ...action("毁灭之力"), attackStatModifier: "power_times_infinity" });
  assert.deepEqual(previewPlayerAttackStats(state, owner(state).id).stats[0]?.powerValue, INFINITY_VALUE);
});

test("猥琐大叔叔补发独立副本，不能融合且分解只收回该副本", () => {
  let state = fuse(fuse(fixture(["日", "丁", "撸", "抠", "沙子", "沙子"]), "沙皇"), "猥琐大叔叔");
  const parent = getRootFusions(owner(state)).find((fusion) => fusion.skillId === "3002")!;
  const bonus = parent.acquisition!.bonusSkillInstanceId!;
  assert.equal(getActiveSkillCount(owner(state), named("抠")), 2);
  assert.equal(getTurnSkillActionCost(owner(state), action("抠")), 1);
  assert.equal(getFusionMaterials(owner(state)).some(({ instanceId }) => instanceId === bonus), false);
  assert.equal(getFusionMaterialSelection(owner(state), getFusionSkillId("抠皇"))?.length, 2);
  state = drain(state);
  owner(state).cakes = 1;
  owner(state).buffs.push({ id: "lu_growth", name: "撸成长", stacks: 3 });
  state = turn(state, [action("撸", state.players[1]!.id), cake, cake]);
  assert.equal(owner(state).buffs.find(({ id }) => id === "lu_growth")?.stacks, 4);
  state = decomposeSkill(state, owner(state).id, parent.id);
  assert.equal(getActiveSkillCount(owner(state), named("抠")), 1);
  assert.equal(getTurnSkillActionCost(owner(state), action("抠")), 2);
});

test("抠皇使用无限等级的破弹抠，与丁对撞获得一份沙子", () => {
  let state = fuse(fuse(fixture(["抠", "沙子", "沙子"]), "沙皇"), "抠皇");
  state.players[1]!.skills = [named("丁")];
  state = submitActionWindowSkill(state, owner(state).id, { ...action("沙子"), targetSkillId: named("丁") });
  assert.equal(owner(state).status, "alive");
  assert.equal(getActiveSkillCount(owner(state), named("丁")), 1);
  state = drain(state);
  const stats = getSkillAttackStats(named("抠"), 1, owner(state))!;
  assert.deepEqual(stats.levelValue, INFINITY_VALUE);
  assert.ok(stats.traits.includes("pierce_rebound"));
  for (const player of state.players) player.cakes = 6;
  state = turn(state, [action("抠", state.players[1]!.id), action("丁", owner(state).id), cake]);
  assert.equal(state.players[1]!.defeatLevel, 2);
  assert.equal(getFusionMaterials(owner(state)).filter(({ skillId }) => skillId === named("沙子")).length, 1);
});

test("逆转撤销对局中融合的大叔叔及补发副本，二次逆转恢复同一实例", () => {
  let state = drain(fixture(["日", "丁", "撸"]));
  owner(state).cakes = 2;
  for (const player of state.players.slice(1)) player.skills = [named("逆转")];
  state = fuseById(state, "3002");
  for (const player of state.players.slice(1)) state = submitPlayerAction(state, player.id, cake).state;
  const bonus = getRootFusions(owner(state))[0]!.acquisition!.bonusSkillInstanceId!;
  assert.equal(getActiveSkillCount(owner(state), named("抠")), 1);
  state = submitActionWindowSkill(state, state.players[1]!.id, action("逆转"));
  assert.equal(getActiveSkillCount(owner(state), named("抠")), 0);
  assert.equal(owner(state).cakes, 2);
  state = submitActionWindowSkill(state, state.players[2]!.id, action("逆转"));
  assert.equal(getActiveSkillCount(owner(state), named("抠")), 1);
  assert.equal(owner(state).cakes, 0);
  assert.equal(getRootFusions(owner(state))[0]!.acquisition?.bonusSkillInstanceId, bonus);
  assert.ok(owner(state).skillInventory?.some(({ instanceId }) => instanceId === bonus));
});

test("风之轻灵的净化之风不限奇偶并分两段，过往时空改为两轮", () => {
  let state = fuse(fuse(fixture(["过往时空", "闪现", "净化之风"]), "空之轨迹"), "风之轻灵");
  assert.equal(getSkillUseLimit(owner(state), named("净化之风")), 3);
  assert.equal(getSkillUseLimit(owner(state), named("过往时空")), 3);
  state.players[1]!.hp = 7;
  state = submitActionWindowSkill(state, owner(state).id, action("净化之风"));
  assert.deepEqual(state.players.slice(1).map(({ hp }) => hp), [5, 4]);
  state = submitActionWindowSkill(state, owner(state).id, action("过往时空"));
  assert.equal(owner(state).buffs.find(({ id }) => id === "small_space:past_time")?.stacks, 2);
});

test("三元协奏曲挡卷子、回复6血，六层冰火印记强化攻等而不改属性", () => {
  let state = drain(fuse(fuse(fixture(["熔岩之怒", "凛冬之怒", "森林的低吟"]), "冰火狂暴曲"), "三元协奏曲"));
  owner(state).cakes = 3;
  state.players[1]!.cakes = 20;
  state.players[1]!.skills = [named("卷子")];
  state = turn(state, [action("三元协奏曲"), action("卷子", owner(state).id), cake]);
  assert.equal(owner(state).hp, 12);
  const marks = named("冰火狂暴曲");
  assert.equal(getAttackMarkCount(owner(state), marks), 6);
  state = drain(state);
  owner(state).cakes = 1;
  state = submitPlayerAction(state, owner(state).id, attack(state.players[1]!.id)).state;
  for (const player of state.players.slice(1)) state = submitPlayerAction(state, player.id, cake).state;
  state = submitActionWindowSkill(state, owner(state).id, { ...action("冰火狂暴曲"), stacks: 6 });
  const stats = previewPlayerAttackStats(state, owner(state).id).stats[0]!;
  assert.equal(stats.power, 7);
  assert.equal(stats.level, 7);
  assert.equal(stats.freezeTurns, 6);
  assert.deepEqual(stats.elements, ["physical"]);
});

test("星怒可花本回合的小防印记，两次逆转后也不退还已花掉的印记", () => {
  let state = drain(fuse(fuse(fixture(["熔岩之怒", "凛冬之怒", "六芒星"]), "冰火狂暴曲"), "星怒"));
  const [fusion] = getRootFusions(owner(state));
  owner(state).buffs.push({ id: STAR_RAGE_MARK_ID, name: "星印记", stacks: 2, sourceFusionId: fusion!.id });
  for (const player of state.players.slice(1)) player.skills = [named("逆转")];
  state = submitPlayerAction(state, owner(state).id, { type: "defense", defense: "small" }).state;
  for (const player of state.players.slice(1)) state = submitPlayerAction(state, player.id, cake).state;
  assert.equal(owner(state).buffs.find(({ id }) => id === STAR_RAGE_MARK_ID)?.stacks, 3);
  state = submitActionWindowSkill(state, owner(state).id, { ...action("星怒"), targetSkillId: STAR_RAGE_SIX_STAR });
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, { ...action("星怒"), targetSkillId: STAR_RAGE_ID }), /星印记/);
  for (const player of state.players.slice(1)) state = submitActionWindowSkill(state, player.id, action("逆转"));
  assert.ok(owner(state).buffs.some(({ id }) => id === "temp_six_star_immunity"));
  assert.equal(owner(state).buffs.some(({ id }) => id === STAR_RAGE_MARK_ID), false);
});

test("星怒法伤由天发出，保留受伤响应且不指定玩家来源", () => {
  let state = drain(fuse(fuse(fixture(["熔岩之怒", "凛冬之怒", "六芒星"]), "冰火狂暴曲"), "星怒"));
  const [fusion] = getRootFusions(owner(state));
  owner(state).buffs.push({ id: STAR_RAGE_MARK_ID, name: "星印记", stacks: 3, sourceFusionId: fusion!.id });
  for (const player of state.players.slice(1)) {
    player.hp = 20;
    player.skills = [named("复仇之刃")];
  }
  for (const player of state.players) state = submitPlayerAction(state, player.id, cake).state;
  state = drain(submitActionWindowSkill(state, owner(state).id, { ...action("星怒"), targetSkillId: STAR_RAGE_ID }), "turn_end_action");
  const target = state.players.find(({ hp }) => hp === 14)!;
  assert.ok(target.buffs.some(({ id }) => id.startsWith("damage_taken_round:")));
  assert.equal(target.buffs.some(({ id }) => id.startsWith("revenge_target:")), false);
  const [hit] = state.eventLog.filter((event) => event.type === "damage" && event.attackName === "星怒");
  assert.ok(hit?.type === "damage");
  assert.equal(hit.amount, 6);
  assert.equal(hit.sourceId, undefined);
});

test("外星人保留两次普通逆转，耗尽后分解也不刷新使用记录", () => {
  let state = fuse(fuse(fixture(["逆转", "斗转星移", "文明人"]), "逆转星移"), "外星人");
  const reversal = named("逆转");
  assert.equal(getSkillUseLimit(owner(state), reversal), 2);
  assert.equal(getActiveSkillCount(owner(state), named("斗转星移")), 0);
  assert.equal(getActiveSkillCount(owner(state), named("文明人")), 0);
  assert.equal(getActiveFusionCount(owner(state), "逆转星移"), 0);
  const reveal = (current: GameState) => {
    let next = drain(current);
    for (const player of next.players) next = submitPlayerAction(next, player.id, cake).state;
    assert.equal(next.activeTimingPhase, "turn_change_action");
    return next;
  };
  for (let i = 0; i < 2; i++) {
    state = reveal(state);
    state = submitActionWindowSkill(state, owner(state).id, action("逆转"));
    state = drain(state, "turn_end_action");
  }
  const third = reveal(state);
  assert.throws(() => submitActionWindowSkill(third, owner(third).id, action("逆转")), /次数上限/);
  state = decomposeSkill(state, owner(state).id, getRootFusions(owner(state))[0]!.id);
  assert.equal(getActiveFusionCount(owner(state), "逆转星移"), 1);
  assert.equal(getSkillUseLimit(owner(state), reversal), 1);
  assert.equal(owner(state).buffs.find((buff) => buff.id === `skill_used:${reversal}`)?.stacks, 2);
});

test("大卡可按来源发放外星人，独立的逆转与斗转星移照常生效", () => {
  const state = fixture(["逆转", "斗转星移"]);
  const player = owner(state);
  player.bigCards = [{ cardId: "10506", instanceId: "alien-source" }];
  grantInitializedSkill(state, player.id, getFusionSkillId("外星人"), "测试发放外星人", false, undefined, "alien-source");
  assert.equal(getSkillUseLimit(player, named("逆转")), 3);
  assert.equal(getActiveSkillCount(player, named("斗转星移")), 1);
  assert.equal(getDamageRedirectLimit(player), 3);
  grantInitializedSkill(state, player.id, getFusionSkillId("逆转星移"), "测试独立逆转星移", false);
  assert.equal(getSkillUseLimit(player, named("逆转")), 4);
  assert.equal(getActiveSkillCount(player, named("斗转星移")), 2);
  assert.equal(getDamageRedirectLimit(player), INFINITE_DAMAGE);
  removeBigCardInstance(state, player.id, "alien-source");
  assert.equal(getSkillUseLimit(player, named("逆转")), 2);
  assert.equal(getActiveSkillCount(player, named("斗转星移")), 2);
});

test("实战入口可选择指定二融合副本，覆盖后不能重复入料或单独分解，解开保留原实例和状态", () => {
  let state = fixture(["绝弹", "散弹", "绝弹", "散弹", "狂风骤雪"]);
  state = fuse(fuse(state, "弹力球"), "弹力球");
  const [first, second] = getRootFusions(owner(state));
  const raw = getFusionMaterials(owner(state)).find((material) => material.skillId === named("狂风骤雪"))!;
  owner(state).buffs.push({ id: "test_cooldown", name: "测试冷却", sourceFusionId: second!.id, stacks: 1, expiresAtRound: 4 });
  state = fuse(state, "大雪球", [second!.id, raw.instanceId]);
  const top = getRootFusions(owner(state)).find((fusion) => fusion.skillId === "3023")!;
  assert.deepEqual(top.materialFusionIds, [second!.id]);
  assert.equal(getActiveFusionCount(owner(state), "弹力球"), 2);
  assert.equal(getFusionMaterialSelection(owner(state), "3023"), undefined);
  const ownView = toPublicGameState(state, owner(state).id).players[0]!;
  assert.equal(getRootFusions(ownView).length, 2);
  assert.equal(toPublicGameState(state, state.players[1]!.id).players[0]!.skillInventory, undefined);
  owner(state).buffs.push({ id: "sealed_skill:3023", name: "封印", stacks: 1 });
  assert.equal(getActiveFusionCount(owner(state), "弹力球"), 1);
  state.activeTimingPhase = "turn_end_action";
  assert.throws(() => decomposeSkill(state, owner(state).id, second!.id), /覆盖/);
  state = decomposeSkill(state, owner(state).id, top.id);
  assert.deepEqual(getRootFusions(owner(state)).map((fusion) => fusion.id), [first!.id, second!.id]);
  assert.ok(owner(state).buffs.some((buff) => buff.id === "test_cooldown" && buff.sourceFusionId === second!.id));
  assert.ok(owner(state).buffs.some((buff) => buff.id === `sealed_skill:${getFusionSkillId("弹力球")}`));
});

test("四融合可引用三融合实例，逐层分解；移除底层素材时只拆除受影响的覆盖链", () => {
  let state = fixture(["绝弹", "散弹", "狂风骤雪", "空", "绝弹", "散弹"]);
  state = fuse(fuse(fuse(state, "弹力球"), "弹力球"), "大雪球");
  const third = getRootFusions(owner(state)).find((fusion) => fusion.skillId === "3023")!;
  const extra = named("空");
  const parent = getFusionRecipe("3023")!;
  FUSION_RECIPES.push({ ...parent, tier: 4, skill: { ...parent.skill, id: "4999" },
    materialOptions: [["3023", extra]], retainedMaterialIds: ["3023", extra] });
  const ballId = getFusionSkillId("弹力球");
  FUSION_RECIPES.push({ ...parent, tier: 4, skill: { ...parent.skill, id: "4998" },
    materialOptions: [[ballId, ballId]], retainedMaterialIds: [ballId] });
  try {
    state = fuseById(state, "4999");
    const top = getRootFusions(owner(state)).find((fusion) => fusion.skillId === "4999")!;
    assert.deepEqual(top.materialFusionIds, [third.id]);
    state.activeTimingPhase = "turn_end_action";
    const decomposed = decomposeSkill(state, owner(state).id, top.id);
    assert.ok(getRootFusions(owner(decomposed)).some((fusion) => fusion.id === third.id));
    const child = owner(state).skillFusions!.find((fusion) => fusion.id === third.materialFusionIds![0])!;
    const rawIndex = owner(state).skillInventory!.findIndex((entry) => entry.instanceId === child.materialInstanceIds![0]);
    removeSkillInstanceAt(owner(state), rawIndex);
    reconcileSkillFusions(owner(state));
    assert.deepEqual(getRootFusions(owner(state)).map((fusion) => fusion.skillId), [getFusionSkillId("弹力球")]);

    let paired = fixture(["绝弹", "散弹", "绝弹", "散弹"]);
    paired = fuseById(fuse(fuse(paired, "弹力球"), "弹力球"), "4998");
    assert.equal(getRootFusions(owner(paired))[0]!.materialFusionIds?.length, 2);
  } finally {
    FUSION_RECIPES.splice(-2);
  }
});

test("v4 的 40 条四融合配方包含四种素材组合，炽焰、极寒、天空之城和破晓已开放", () => {
  const recipes = FUSION_RECIPES.filter(({ tier }) => tier === 4);
  const patterns = new Set(recipes.flatMap(({ materialOptions }) => materialOptions.map((ids) =>
    ids.map(getFusionTier).sort((a, b) => b - a).join("+"))));
  assert.equal(recipes.length, 40);
  assert.deepEqual(patterns, new Set(["1+1+1+1", "2+1+1", "2+2", "3+1"]));
  const skillList = getAllSkills({ includeFusions: true });
  assert.deepEqual(recipes.map(({ skill }) => skill.id).filter((id) => skillList.some((skill) => skill.id === id && skill.implemented)), ["4004", "4005", "4007", "4008", "4014", "4034"]);
});

test("天空之城保留双子融合，第三回合与第四回合的闪现均可挡卷子", () => {
  for (const roundTurn of [3, 4]) {
    let state = drain(fuse(fuse(fuse(fixture(["空", "遗计", "过往时空", "闪现"]), "空城计"), "空之轨迹"), "天空之城"));
    assert.equal(getActiveFusionCount(owner(state), "空城计"), 1);
    assert.equal(getActiveFusionCount(owner(state), "空之轨迹"), 1);
    state.roundTurnNumber = roundTurn;
    state.players[1]!.skills = [named("卷子")];
    state.players[1]!.cakes = 25;
    for (const [index, player] of state.players.entries()) {
      state = submitPlayerAction(state, player.id, index === 1 ? action("卷子", owner(state).id) : cake).state;
    }
    if (roundTurn === 4) {
      state = drain(state, "turn_change_action");
      state = submitActionWindowSkill(state, owner(state).id, action("闪现"));
    }
    state = drain(state, "turn_end_action");
    assert.equal(owner(state).status, "alive");
    const protection = roundTurn === 3 ? "天空之城" : "天空之城·闪现";
    assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.protectionName === protection));
  }
});

test("天空之城的过往时空返回时即使此前未受伤也触发强化遗计", () => {
  let state = drain(fuse(fuse(fuse(fixture(["空", "遗计", "过往时空", "闪现"]), "空城计"), "空之轨迹"), "天空之城"));
  state.players[2]!.hp = 30;
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, owner(state).id, action("过往时空"));
  assert.equal(owner(state).status, "dead");
  for (let round = 0; round < 3; round++) {
    state = drain(state);
    state.players[1]!.cakes = 1;
    state = drain(turn(state, [cake, attack(state.players[2]!.id), cake]));
  }
  assert.equal(owner(state).status, "alive");
  assert.equal(owner(state).cakes, 3);
});

test("炽焰和极寒可以在小技能模式直接融合，分解不返还已用的限定次数", () => {
  let state = fixture(["火烧大地", "熔岩之怒", "火焰刀", "火漩决", "霜落大地", "凛冬之怒", "寒冰剑", "冰漩决"]);
  state = fuse(fuse(state, "炽焰"), "极寒");
  assert.equal(getRootFusions(owner(state)).length, 2);
  assert.equal(getSkillUseLimit(owner(state), named("火烧大地")), 2);
  assert.equal(getSkillUseLimit(owner(state), named("霜落大地")), 2);
  state = submitActionWindowSkill(state, owner(state).id, action("霜落大地"));
  state = turn(state, [cake, cake, cake]);
  const cold = getRootFusions(owner(state)).find(({ skillId }) => skillId === "4005")!;
  state = decomposeSkill(state, owner(state).id, cold.id);
  assert.equal(getSkillUseLimit(owner(state), named("霜落大地")), 1);
  assert.equal(owner(state).buffs.find(({ id }) => id === `skill_used:${named("霜落大地")}`)?.stacks, 1);
  assert.equal(getTurnSkillActionCost(owner(state), action("冰漩决")), 3);
  assert.equal(getTurnSkillActionCost(owner(state), action("火漩决")), 1);
});

test("破晓可用两份二融合合成，首发三重日攻6并保留素材效果", () => {
  let state = fixture(["日", "连爆", "顺手牵羊", "普天同庆"]);
  state = fuse(fuse(fuse(state, "后羿•七日连珠"), "逐日之弓"), "破晓");
  assert.equal(getRootFusions(owner(state))[0]?.skillId, "4034");
  assert.equal(getActiveFusionCount(owner(state), "后羿•七日连珠"), 1);
  assert.equal(getActiveFusionCount(owner(state), "逐日之弓"), 1);
  state = drain(state);
  owner(state).cakes = 3;
  state = submitPlayerAction(state, owner(state).id, { ...action("日"), stacks: 3 }).state;
  assert.equal(previewPlayerAttackStats(state, owner(state).id).stats[0]?.power, 6);
  state = turn(state, [cake, cake, cake]);
  assert.equal(owner(state).buffs.find(({ id }) => id === `skill_used:${named("日")}`)?.stacks, 3);
  assert.deepEqual(state.players.slice(1).map(({ hp }) => hp), [0, 0]);
});

for (const [recipeId, testId, skills, ingredientFusion, pattern] of [
  ["4007", "4997", ["空", "空", "空", "空"], undefined, "1+1+1+1"],
  ["4031", "4996", ["绝弹", "散弹", "卷子", "沙子"], "弹力球", "2+1+1"]
] as const) {
  test(`四融合 ${pattern} 以独立素材实例融合并原样分解`, () => {
    let state = fixture([...skills]);
    ensureSkillInventory(owner(state));
    if (ingredientFusion) state = fuse(state, ingredientFusion);
    const recipe = getFusionRecipe(recipeId)!;
    const materials = getFusionMaterialSelection(owner(state), recipeId)!;
    const instanceIds = materials.map(({ instanceId }) => instanceId);
    assert.equal(instanceIds.length, ingredientFusion ? 3 : 4);
    assert.ok(getAvailableFusionRecipes(owner(state)).includes(recipe));
    if (ingredientFusion) assert.throws(() => fuseById(state, recipeId, instanceIds), /效果尚未开放/);
    else assert.equal(getRootFusions(owner(fuseById(state, recipeId, instanceIds)))[0]?.skillId, recipeId);

    // Reuse the official material options with an enabled test-only effect.
    FUSION_RECIPES.push({ ...recipe, skill: { ...recipe.skill, id: testId, name: "大雪球" } });
    try {
      assert.throws(() => fuseById(state, testId, [instanceIds[0]!, instanceIds[0]!, ...instanceIds.slice(2)]), /素材/);
      if (ingredientFusion) {
        state = drain(state);
        owner(state).cakes = 3;
        state = fuseById(state, testId, instanceIds);
        state = turn(state, [cake, cake, cake]);
        assert.equal(owner(state).cakes, 1);
      } else {
        const startingCakes = owner(state).cakes;
        state = fuseById(state, testId, instanceIds);
        assert.equal(owner(state).cakes, startingCakes);
      }
      const [top] = getRootFusions(owner(state));
      assert.equal(top?.skillId, testId);
      assert.equal(getFusionTier(top!.skillId), 4);
      assert.deepEqual(top!.materialInstanceIds, materials.filter(({ kind }) => kind === "skill").map(({ instanceId }) => instanceId));
      assert.deepEqual(top!.materialFusionIds ?? [], materials.filter(({ kind }) => kind === "fusion").map(({ instanceId }) => instanceId));
      assert.deepEqual(getFusionMaterials(owner(state)).map(({ instanceId }) => instanceId), [top!.id]);
      assert.equal(getFusionMaterialSelection(owner(state), recipeId), undefined);
      if (ingredientFusion) {
        assert.throws(() => decomposeSkill(state, owner(state).id, instanceIds[0]!), /覆盖/);
      } else {
        assert.throws(() => decomposeSkill(state, owner(state).id, top!.id), /回合末/);
        state = turn(state, [cake, cake, cake]);
      }
      state = decomposeSkill(state, owner(state).id, top!.id);
      assert.deepEqual(getFusionMaterialSelection(owner(state), recipeId)?.map(({ instanceId }) => instanceId), instanceIds);
    } finally {
      FUSION_RECIPES.pop();
    }
  });
}

test("魔方需要三份镜像实例，失败或重复的素材请求不会扣除副本", () => {
  const initial = fixture(["镜像法术", "镜像法术", "镜像法术"]);
  const [first, second, third] = getFusionMaterials(owner(initial));
  assert.throws(() => fuse(initial, "魔方", [first!.instanceId, first!.instanceId, third!.instanceId]), /素材/);
  const state = fuse(initial, "魔方", [first!.instanceId, second!.instanceId, third!.instanceId]);
  assert.equal(getSkillUseLimit(owner(state), named("镜像法术")), 6);
  assert.equal(getRootFusions(owner(state))[0]!.materialInstanceIds?.length, 3);
  assert.equal(getSkillUseLimit(owner(initial), named("镜像法术")), 3);
});

test("大雪球实战命中造成冰伤和两回合冰冻，正常受油条防", () => {
  const initial = drain(fuse(fuse(fixture(["绝弹", "散弹", "狂风骤雪"]), "弹力球"), "大雪球"));
  owner(initial).cakes = 5;
  const [a, b] = initial.players;
  const hit = turn(initial, [action("大雪球", b!.id), cake, cake]);
  assert.equal(hit.players[1]!.hp, b!.hp - 2);
  assert.ok(hit.players[1]!.buffs.some((buff) => buff.id === "frozen" && buff.expiresAtTurn === hit.turnNumber + 2));
  const block = turn(initial, [action("大雪球", b!.id), { type: "defense", defense: "youtiao" }, cake]);
  assert.equal(block.players[1]!.hp, b!.hp);
  assert.equal(owner(hit).cakes, a!.cakes - 1);
});

test("天人合一持续免疫注册的不良状态；将进酒三份闪现各按一轮冷却", () => {
  let state = fuse(fuse(fixture(["绝对守护", "幻防", "净化"]), "纯净苍穹"), "天人合一");
  assert.equal(applyNegativeStatus(state, owner(state).id, "frozen", () => assert.fail("应免疫冰冻")), false);
  state = fuse(fixture(["闪现", "闪现", "闪现"]), "将进酒");
  owner(state).buffs.push({ id: "flash_dodge_cooldown:check", name: "闪现冷却", stacks: 1, expiresAtRound: 4 });
  assert.equal(getFlashDodgeCooldownCount(owner(state), 1), 1);
  assert.equal(getFlashDodgeCooldownCount(owner(state), 2), 0);
});

test("山河破碎强化山崩的无限值与破地边界，断绝穿无敌并翻倍", () => {
  const child = getFusionRecipe(getFusionSkillId("山崩地裂"))!.materialOptions[0]!.map((id) => getAllSkills().find((s) => s.id === id)!.name);
  let state = drain(fuse(fuse(fixture([...child, "破地之力"]), "山崩地裂"), "山河破碎"));
  owner(state).cakes = 5;
  state = submitPlayerAction(state, owner(state).id, action("山崩地裂", state.players[1]!.id)).state;
  const stats = previewPlayerAttackStats(state, owner(state).id).stats[0]!;
  assert.deepEqual(stats.powerValue, INFINITY_VALUE);
  assert.deepEqual(stats.levelValue, INFINITY_VALUE);
  for (const stacks of [2, 6]) assert.equal(getAttackFieldBlocker(state, state.players[1]!.id,
    getStackedAttackStats(BASE_ATTACKS.sha, stacks))?.name, "破地之力");

  const sword = getFusionRecipe(getFusionSkillId("破天圣剑"))!.materialOptions[0]!.map((id) => getAllSkills().find((s) => s.id === id)!.name);
  state = drain(fuse(fuse(fixture([...sword, "古淀刀"]), "破天圣剑"), "断绝"));
  owner(state).cakes = 2;
  state.players[1]!.buffs.push({ id: "temp_invulnerable", name: "无敌", stacks: 1, expiresAtTurn: state.turnNumber });
  const targetId = state.players[1]!.id;
  state = turn(state, [attack(targetId), cake, cake]);
  assert.equal(state.players[1]!.hp, 4);
});

test("金胸罩的命中奖励累加在实际神罩与鬼罩次数上", () => {
  let state = drain(fuse(fuse(fixture(["神罩", "鬼罩", "钟"]), "幻境双罩"), "金胸罩"));
  owner(state).cakes = 3;
  state = turn(state, [action("钟", state.players[1]!.id), cake, cake]);
  assert.equal(getSkillUseLimit(owner(state), named("神罩")), 6);
  assert.equal(getSkillUseLimit(owner(state), named("鬼罩")), 6);
});

test("炼狱使徒受到攻击伤害后对全场造成火系法伤，包含自己", () => {
  const material = getFusionRecipe(getFusionSkillId("天火之狱"))!.materialOptions[0]!.map((id) => getAllSkills().find((s) => s.id === id)!.name);
  let state = drain(fuse(fuse(fixture([...material, "帝炎之境"]), "天火之狱"), "炼狱使徒"));
  state.players[1]!.cakes = 3;
  state = turn(state, [cake, attack(owner(state).id), cake]);
  const hits = state.eventLog.filter((event) => event.type === "damage" && event.attackName === "炼狱使徒");
  assert.equal(hits.length, 3);
  assert.ok(hits.every((event) => event.type === "damage" && event.element === "fire" && !event.internalDamage));
});

test("火•杀•换强化普通攻击并免杀换耗饼；甲骨文的卷子仅石头防", () => {
  let state = drain(fuse(fixture(["火焰刀", "朱雀羽扇", "杀换"]), "火•杀•换"));
  assert.equal(getTurnSkillActionCost(owner(state), action("杀换")), 0);
  owner(state).cakes = 4;
  state = submitPlayerAction(state, owner(state).id, attack(state.players[1]!.id)).state;
  const sha = previewPlayerAttackStats(state, owner(state).id).stats[0]!;
  assert.equal(sha.power, 3);
  assert.equal(sha.level, 3);
  assert.ok(sha.elements.includes("fire"));

  state = drain(fuse(fuse(fixture(["文明人", "逆转", "卷子"]), "野蛮人"), "甲骨文"));
  assert.equal(getSkillAttackStats(named("卷子"), 1, owner(state))?.defenseTag, "stone");
  const targetId = state.players[1]!.id;
  const blocked = turn(state, [action("卷子", targetId), { type: "defense", defense: "stone" }, cake]);
  assert.equal(blocked.players[1]!.status, "alive");
  const retired = turn(state, [action("卷子", targetId), { type: "defense", defense: "small" }, cake]);
  assert.equal(retired.players[1]!.defeatLevel, 2);
});

test("魔音贯耳让梵与钟成为破弹群攻，梵只扣一饼并在命中时追加法伤", () => {
  let state = drain(fuse(fixture(["梵", "传音入密", "钟"]), "魔音贯耳"));
  owner(state).cakes = 1;
  for (const name of ["钟", "梵"]) {
    const stats = getSkillAttackStats(named(name), 1, owner(state));
    assert.ok(stats?.isArea && stats.traits.includes("pierce_rebound"));
  }
  state = turn(state, [action("梵"), cake, cake]);
  assert.equal(owner(state).cakes, 0);
  assert.equal(state.eventLog.filter((event) => event.type === "damage" && event.attackName === "魔音贯耳·梵").length, 2);
});

test("流星雨火球无需指定目标，攻等 6，对石头造成退游点伤害", () => {
  const materials = getFusionRecipe(getFusionSkillId("山崩地裂"))!.materialOptions[0]!.map((id) => getAllSkills().find((s) => s.id === id)!.name);
  let state = drain(fuse(fuse(fixture([...materials, "火球"]), "山崩地裂"), "流星雨"));
  owner(state).cakes = 10;
  const stats = getSkillAttackStats(named("火球"), 1, owner(state))!;
  assert.deepEqual([stats.isArea, stats.power, stats.level, stats.defenseTag], [true, 6, 6, "youtiao"]);
  state = turn(state, [action("火球"), { type: "defense", defense: "stone" }, cake]);
  assert.equal(state.players[1]!.defeatLevel, 2);
});

test("圣宝五倍产饼与第三回合产饼；轮回吞噬用原吸血流程结算", () => {
  let state = drain(fuse(fuse(fixture(["圣", "齐天大圣", "圣水收集器"]), "圣灵觉醒"), "圣宝"));
  owner(state).cakes = 3;
  state = turn(state, [action("圣灵觉醒"), cake, cake]);
  assert.equal(owner(state).cakes, 7);
  state = drain(turn(state, [cake, cake, cake]));
  assert.equal(state.roundTurnNumber, 3);
  assert.equal(owner(state).cakes, 9);

  state = drain(fuse(fuse(fixture(["圣域", "邪域", "乱舞"]), "魔域"), "轮回吞噬"));
  assert.equal(getManualDemonDomainCount(owner(state)), 0);
  state.roundNumber = 3;
  state.players[1]!.cakes = 2;
  state = drain(turn(state, [cake, attack(owner(state).id), cake]));
  assert.equal(state.eventLog.filter((event) => event.type === "damage" && event.attackName === "魔域" && event.amount === 3).length, 2);
  assert.equal(state.eventLog.filter((event) => event.type === "heal" && event.reason === "魔域" && event.amount === 3).length, 2);
});

test("鲜血收割的嗜血、死神之镰和暗影战斧按实际伤害全额回血", () => {
  let state = drain(fuse(fuse(fixture(["死神之镰", "邪域", "嗜血"]), "暗影战斧"), "鲜血收割"));
  owner(state).cakes = 2;
  state.players[1]!.hp = 0;
  state = turn(state, [attack(state.players[1]!.id), cake, cake]);
  assert.equal(state.eventLog.find((event) => event.type === "heal" && event.reason === "暗影战斧")?.amount, 1);
  assert.equal(state.eventLog.find((event) => event.type === "heal" && event.reason === "嗜血")?.amount, 1);
  assert.equal(state.eventLog.find((event) => event.type === "heal" && event.reason === "死神之镰")?.amount, 1);
});
