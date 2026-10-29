import assert from "node:assert/strict";
import { addPlayerToGame, advanceActionWindow, applyAttackModifiers, BASE_ATTACKS,
  COMMON_FUSION_SKILL_ID, createGame, createId, createPlayer, decomposeSkill, enterActionWindow,
  FUSION_RECIPES, getActiveSkillCount, getAllSkills, getAvailableFusionRecipes,
  getFusionRecipe, getOwnedSkillIds, getSkill, getSkillAttackStats, getSkillCardIds, getSkillUseLimit,
  getDestroyPowerCooldownCount, getFlashDodgeCooldownCount, getDamageRedirectLimit, validateAction, validateActionWindowSkill,
  getAttackActionCost, getTurnSkillActionCost, getFusionSkillId, getAbsoluteGuardCost, getActionAttackTargetIds,
  chooseWitherNumber, getWitherNumber, getNextWitherSelectionIndex, getAttackFieldBlocker,
  getHuiyueCooldownCount, isHuiyueActive,
  getSmallSkillIds, getStackedAttackStats, guessPlayerSkill, isFusionImplemented,
  isFusionPreparation, reconcileSkillFusions, recordSkillUse, startGame,
  submitActionWindowSkill, submitPlayerAction, toPublicGameState,
  GameState, PlayerState, PlayerAction, SkillAction } from "@bing/shared";
import { enumerateLegalAiActions } from "../apps/server/src/ai";

const skill = (name: string) => {
  const found = getAllSkills().find((item) => item.name === name);
  assert.ok(found, `Missing skill: ${name}`);
  return found.id;
};
const recipe = (name: string) => {
  const found = FUSION_RECIPES.find((item) => item.skill.name === name);
  assert.ok(found, `Missing fusion: ${name}`);
  return found;
};
const fusionAction = (name: string): SkillAction => ({ type: "skill", skillId: COMMON_FUSION_SKILL_ID,
  stacks: 1, targetSkillId: recipe(name).skill.id, fusionRequestId: createId("fusion_request") });
function game(names: string[]) {
  let state = createGame("A", { firstTurnNoAttack: false, skillMode: "test_select", skillCount: Math.max(2, names.length) });
  state = addPlayerToGame(state, createPlayer("B"));
  state.players[0]!.skills = names.map(skill);
  return startGame(state);
}
const owner = (state: GameState) => state.players[0]!;
function endWindow(state: GameState): GameState {
  const next = structuredClone(state);
  next.phase = "action_window";
  next.activeTimingPhase = "turn_end_action";
  next.actionWindowMode = "active";
  next.actionWindowPassPlayerIds = [];
  next.actionWindowPlayerIds = [];
  return next;
}
function collecting(state: GameState): GameState {
  let next = state;
  for (let guard = 0; next.phase === "action_window" && guard < 30; guard++) next = advanceActionWindow(next);
  assert.equal(next.phase, "collecting_actions");
  return next;
}
let passed = 0;
function check(name: string, run: () => void) {
  run();
  passed++;
  console.log(`ok - ${name}`);
}

check("72 recipes import with stable distinct IDs, normalized materials, and separate small-skill pool", () => {
  assert.equal(FUSION_RECIPES.length, 72);
  assert.equal(getAllSkills().length, 120);
  assert.equal(getAllSkills({ includeFusions: true }).length, 192);
  assert.equal(new Set(FUSION_RECIPES.map((item) => item.skill.id)).size, 72);
  for (const item of FUSION_RECIPES) {
    assert.ok(!getSmallSkillIds().includes(item.skill.id));
    for (const pair of item.materialOptions) {
      assert.equal(pair.length, 2);
      for (const material of pair) assert.ok(getSmallSkillIds().includes(material));
    }
  }
  assert.ok(recipe("天火之狱").materialOptions[0]!.includes(skill("地狱主宰")));
  assert.ok(recipe("贤者的庇护").materialOptions[0]!.includes(skill("神之庇护")));
  assert.equal(FUSION_RECIPES.filter((item) => isFusionImplemented(item.skill.id)).length, 49);
});

check("duplicate materials need two copies; four-choose-two has six legal pairs", () => {
  assert.ok(!getAvailableFusionRecipes(owner(game(["沙子"]))).some((item) => item.skill.name === "沙皇"));
  assert.ok(getAvailableFusionRecipes(owner(game(["沙子", "沙子"]))).some((item) => item.skill.name === "沙皇"));
  assert.equal(recipe("猥琐小叔叔").materialOptions.length, 6);
});

check("opening fusion is free, repeatable, shares the steal-choice window, and covers two slots", () => {
  let state = game(["神罩", "鬼罩", "毒箭雨", "冰箭雨"]);
  const original = structuredClone(state);
  assert.equal(isFusionPreparation(state), true);
  state = submitPlayerAction(state, owner(state).id, fusionAction("幻境双罩")).state;
  state = submitPlayerAction(state, owner(state).id, fusionAction("生死符")).state;
  assert.equal(owner(state).cakes, 0);
  assert.equal(owner(state).skillFusions?.length, 2);
  assert.equal(getSkillCardIds(owner(state)).length, 2);
  assert.equal(toPublicGameState(state, owner(state).id).players[0]!.skillSlotCount, 4);
  assert.deepEqual(state.pendingActions, {});
  assert.equal(state.turnNumber, original.turnNumber);
  assert.deepEqual(owner(original).skillFusions, undefined);
  assert.equal(state.activeTimingPhase, "round_pre_interval_action");
  assert.ok(state.actionWindowDeadlineAt! >= original.actionWindowDeadlineAt!);
});

check("preparation pass prevents late free fusion and unsupported effects cannot be formed", () => {
  const state = game(["神罩", "鬼罩"]);
  state.actionWindowPassPlayerIds.push(owner(state).id);
  assert.throws(() => submitPlayerAction(state, owner(state).id, fusionAction("幻境双罩")), /结束开局准备/);
  const unsupported = game(["沙子", "沙子"]);
  assert.throws(() => submitPlayerAction(unsupported, owner(unsupported).id, fusionAction("沙皇")), /尚未开放/);
});

check("a repeated request cannot fuse a second pair even when four duplicate materials exist", () => {
  const initial = game(["神罩", "鬼罩", "神罩", "鬼罩"]);
  const action = fusionAction("幻境双罩");
  let state = submitPlayerAction(initial, owner(initial).id, action).state;
  assert.throws(() => submitPlayerAction(state, owner(state).id, action), /已经处理/);
  assert.equal(owner(state).skillFusions?.length, 1);
  state = submitPlayerAction(state, owner(state).id, fusionAction("幻境双罩")).state;
  assert.equal(owner(state).skillFusions?.length, 2);
  assert.equal(getSkillUseLimit(owner(state), skill("神罩")), 10);
});

check("ordinary fusion waits for reveal, costs two cakes, and occupies the complete action", () => {
  let state = collecting(game(["神罩", "鬼罩"]));
  owner(state).cakes = 2;
  const a = owner(state).id;
  const b = state.players[1]!.id;
  state = submitPlayerAction(state, a, fusionAction("幻境双罩")).state;
  assert.equal(owner(state).skillFusions, undefined);
  assert.equal(owner(state).cakes, 2);
  assert.throws(() => submitPlayerAction(state, a, { type: "gain_cake" }), /已经提交/);
  state = submitPlayerAction(state, b, { type: "gain_cake" }).state;
  assert.equal(owner(state).cakes, 0);
  assert.equal(owner(state).skillFusions?.length, 1);
  const publicState = toPublicGameState(state, b);
  const reveal = publicState.eventLog.findLast((event) => event.type === "turn_revealed");
  assert.ok(reveal?.type === "turn_revealed");
  const publicAction = reveal.actions[a]!.actions[0]!;
  assert.equal(publicAction.type, "skill");
  assert.ok(!JSON.stringify(publicAction).includes(recipe("幻境双罩").skill.id));
  assert.ok(!JSON.stringify(publicAction).includes("fusionRequestId"));
  if (publicState.revealedActions) assert.ok(!JSON.stringify(publicState.revealedActions[a]).includes("targetSkillId"));
});

check("fusion rejects insufficient cakes, a mixed action plan, and forged material selection", () => {
  const state = collecting(game(["神罩", "鬼罩"]));
  assert.throws(() => submitPlayerAction(state, owner(state).id, fusionAction("幻境双罩")), /2饼/);
  owner(state).cakes = 2;
  assert.throws(() => submitPlayerAction(state, owner(state).id, { actions: [fusionAction("幻境双罩"), { type: "gain_cake" }] }));
  const forged = fusionAction("幻境双罩");
  forged.materialSkillIds = [skill("神罩"), skill("神罩")];
  assert.throws(() => submitPlayerAction(state, owner(state).id, forged), /素材/);
});

check("decomposition is allowed only at turn end, is free, and cannot target another player", () => {
  let state = game(["神罩", "鬼罩"]);
  state = submitPlayerAction(state, owner(state).id, fusionAction("幻境双罩")).state;
  const id = owner(state).skillFusions![0]!.id;
  assert.throws(() => decomposeSkill(state, owner(state).id, id), /回合末/);
  const end = endWindow(state);
  assert.throws(() => decomposeSkill(end, end.players[1]!.id, id), /自己持有/);
  const next = decomposeSkill(end, owner(end).id, id);
  assert.equal(owner(next).cakes, 0);
  assert.equal(owner(next).skillFusions?.length, 0);
  assert.equal(next.turnNumber, end.turnNumber);
  assert.equal(next.activeTimingPhase, "turn_end_action");
  assert.throws(() => decomposeSkill(next, owner(next).id, id), /自己持有/);
});

check("one normal-shield and four ghost-shield uses decompose to two and zero remaining", () => {
  let state = game(["神罩", "鬼罩"]);
  recordSkillUse(owner(state), skill("神罩"));
  for (let i = 0; i < 4; i++) recordSkillUse(owner(state), skill("鬼罩"));
  owner(state).buffs.push({ id: "destroy_power_cooldown", name: "冷却", stacks: 2 },
    { id: `sealed_skill:${skill("神罩")}`, name: "封印", stacks: 1 });
  const counters = structuredClone(owner(state).buffs);
  state = submitPlayerAction(state, owner(state).id, fusionAction("幻境双罩")).state;
  assert.deepEqual(owner(state).buffs, counters);
  assert.equal(getSkillUseLimit(owner(state), skill("鬼罩")), 5);
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  assert.equal(getSkillUseLimit(owner(state), skill("神罩"))! - 1, 2);
  assert.equal(Math.max(0, getSkillUseLimit(owner(state), skill("鬼罩"))! - 4), 0);
  assert.deepEqual(owner(state).buffs, counters);
});

check("fused shield limits are enforced by the real action-window validator", () => {
  let state = game(["神罩", "鬼罩"]);
  state = submitPlayerAction(state, owner(state).id, fusionAction("幻境双罩")).state;
  state.activeTimingPhase = "turn_change_action";
  for (let i = 0; i < 5; i++) state = submitActionWindowSkill(state, owner(state).id,
    { type: "skill", skillId: skill("神罩"), stacks: 1 });
  assert.throws(() => submitActionWindowSkill(state, owner(state).id,
    { type: "skill", skillId: skill("神罩"), stacks: 1 }), /次数上限/);
});

check("electric fusion adds a use only to electric shock and keeps spent uses", () => {
  let state = game(["雷电法术", "电击法术"]);
  recordSkillUse(owner(state), skill("电击法术"));
  state = submitPlayerAction(state, owner(state).id, fusionAction("交流电")).state;
  assert.equal(getSkillUseLimit(owner(state), skill("电击法术")), 2);
  assert.equal(getSkillUseLimit(owner(state), skill("雷电法术")), 2);
  assert.equal(owner(state).buffs.find((buff) => buff.id === `skill_used:${skill("电击法术")}`)?.stacks, 1);
});

check("one ice-fire eye use charges both underlying limited skills", () => {
  const player = owner(game(["火烧大地", "霜落大地"]));
  recordSkillUse(player, recipe("冰火两仪眼").skill.id);
  for (const name of ["火烧大地", "霜落大地"]) {
    assert.equal(player.buffs.find((buff) => buff.id === `skill_used:${skill(name)}`)?.stacks, 1);
  }
});

check("decomposition clears only its own ice-fire and solar-lava marks, retaining ice-rain", () => {
  const state = endWindow(game(["火烧大地", "霜落大地"]));
  const player = owner(state);
  player.skillFusions = [{ id: "fusion_marks_a", skillId: recipe("冰火两仪眼").skill.id,
    materialSkillIds: [skill("火烧大地"), skill("霜落大地")] }];
  const mark = (id: string, sourceFusionId: string, fusionMarkKind: "ice_fire" | "solar_lava" | "ice_rain") =>
    ({ id, name: id, stacks: 2, sourceFusionId, fusionMarkKind });
  player.buffs.push(mark("own_ice_fire", "fusion_marks_a", "ice_fire"), mark("own_lava", "fusion_marks_a", "solar_lava"),
    mark("other_lava", "fusion_marks_b", "solar_lava"), mark("ice_rain", "fusion_marks_a", "ice_rain"),
    { id: "lava_mark", name: "其他熔岩", stacks: 1 });
  const next = decomposeSkill(state, player.id, "fusion_marks_a");
  assert.deepEqual(owner(next).buffs.map((buff) => buff.id),
    player.buffs.filter((buff) => !["own_ice_fire", "own_lava"].includes(buff.id)).map((buff) => buff.id));
});

check("guessing a material reveals only that material; guessing a fusion reveals that fusion independently", () => {
  let state = game(["神罩", "鬼罩"]);
  state = submitPlayerAction(state, owner(state).id, fusionAction("幻境双罩")).state;
  const a = owner(state).id;
  const b = state.players[1]!.id;
  const before = toPublicGameState(state, b).players[0]!;
  assert.equal(before.skillFusions, undefined);
  assert.equal(before.fusionRequestIds, undefined);
  assert.deepEqual(before.skills, []);
  assert.ok(!JSON.stringify(toPublicGameState(state, b).eventLog).includes("幻境双罩"));
  state = guessPlayerSkill(endWindow(state), b, a, skill("神罩"));
  assert.deepEqual(toPublicGameState(state, b).players[0]!.skills, [skill("神罩")]);
  state = guessPlayerSkill(state, b, a, recipe("幻境双罩").skill.id);
  assert.deepEqual(toPublicGameState(state, b).players[0]!.skills, [skill("神罩"), recipe("幻境双罩").skill.id]);
  assert.equal(toPublicGameState(state, b).players[0]!.skillFusions, undefined);
  assert.ok(getOwnedSkillIds(owner(state)).includes(recipe("幻境双罩").skill.id));
});

check("life-death talisman retains poison and ice modifiers and adds pierce rebound", () => {
  let state = game(["毒箭雨", "冰箭雨"]);
  const originalAttack = applyAttackModifiers(state, owner(state).id, getStackedAttackStats(BASE_ATTACKS.wan_jian, 1));
  state = submitPlayerAction(state, owner(state).id, fusionAction("生死符")).state;
  const stats = applyAttackModifiers(state, owner(state).id, getStackedAttackStats(BASE_ATTACKS.wan_jian, 1));
  assert.ok(stats.traits.includes("pierce_rebound"));
  assert.ok(stats.elements.includes("ice"));
  assert.ok(stats.elements.includes("poison"));
  const next = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  const normal = applyAttackModifiers(next, owner(next).id, getStackedAttackStats(BASE_ATTACKS.wan_jian, 1));
  assert.deepEqual(normal, originalAttack);
});

check("sealing the fusion does not reset counters and disables its added effects", () => {
  let state = game(["毒箭雨", "冰箭雨"]);
  state = submitPlayerAction(state, owner(state).id, fusionAction("生死符")).state;
  owner(state).buffs.push({ id: `sealed_skill:${recipe("生死符").skill.id}`, name: "封印", stacks: 1 });
  assert.equal(getActiveSkillCount(owner(state), skill("毒箭雨")), 0);
  const stats = applyAttackModifiers(state, owner(state).id, getStackedAttackStats(BASE_ATTACKS.wan_jian, 1));
  assert.ok(!stats.traits.includes("pierce_rebound"));
  const next = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  for (const material of ["毒箭雨", "冰箭雨"]) {
    assert.equal(getActiveSkillCount(owner(next), skill(material)), 0);
  }
});

check("removing a material removes its cover without consuming unrelated skills", () => {
  let state = game(["神罩", "鬼罩", "毒箭雨"]);
  state = submitPlayerAction(state, owner(state).id, fusionAction("幻境双罩")).state;
  owner(state).skills = owner(state).skills.filter((id) => id !== skill("神罩"));
  reconcileSkillFusions(owner(state));
  assert.equal(owner(state).skillFusions?.length, 0);
  assert.deepEqual(getSkillCardIds(owner(state)), [skill("鬼罩"), skill("毒箭雨")]);
});

check("covered materials cannot bypass turn-end decomposition through voluntary discard", () => {
  let state = game(["神罩", "鬼罩"]);
  state = submitPlayerAction(state, owner(state).id, fusionAction("幻境双罩")).state;
  assert.throws(() => submitPlayerAction(state, owner(state).id,
    { type: "discard_skill", targetSkillId: skill("神罩") }), /不能直接丢弃/);
});

check("replacement and partial-retention recipes describe which original effects stay active", () => {
  assert.deepEqual(recipe("虚幻").retainedMaterialIds, []);
  assert.deepEqual(recipe("反伤刺甲").retainedMaterialIds, [skill("藤甲")]);
  assert.deepEqual(recipe("辉月").retainedMaterialIds, [skill("神之庇护")]);
  const state = game(["换防", "幻防"]);
  owner(state).skillFusions = [{ id: "future_virtual", skillId: recipe("虚幻").skill.id,
    materialSkillIds: [skill("换防"), skill("幻防")] }];
  state.activeTimingPhase = "turn_change_action";
  state.actionWindowMode = "active";
  assert.throws(() => submitActionWindowSkill(state, owner(state).id,
    { type: "skill", skillId: skill("换防"), stacks: 1 }), /融合替代/);
});

check("decomposing and fusing again cannot refill an exhausted bonus allowance", () => {
  let state = game(["神罩", "鬼罩"]);
  state = submitPlayerAction(state, owner(state).id, fusionAction("幻境双罩")).state;
  for (let i = 0; i < 5; i++) recordSkillUse(owner(state), skill("神罩"));
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  state.phase = "collecting_actions";
  state.activeTimingPhase = "turn_action";
  state.pendingActions = {};
  owner(state).cakes = 2;
  state = submitPlayerAction(state, owner(state).id, fusionAction("幻境双罩")).state;
  state = submitPlayerAction(state, state.players[1]!.id, { type: "gain_cake" }).state;
  assert.equal(getSkillUseLimit(owner(state), skill("神罩")), 5);
  assert.equal(owner(state).buffs.find((buff) => buff.id === `skill_used:${skill("神罩")}`)?.stacks, 5);
});

const EFFECT_BATCH = ["极寒风暴", "毁灭之盾", "神之子", "泣血之刃", "末世", "风语之森",
  "血魔之怒", "神界炼魂", "宗师之力", "魔女斗篷"];

function effectGame(name: string, extraSkills: string[] = [], playerCount = 3): GameState {
  const materials = recipe(name).materialOptions[0]!;
  let state = createGame("A", { firstTurnNoAttack: false, skillMode: "test_select", skillCount: 2 + extraSkills.length });
  for (const name of ["B", "C", "D", "E", "F"].slice(0, playerCount - 1)) state = addPlayerToGame(state, createPlayer(name));
  owner(state).skills = [...materials, ...extraSkills.map(skill)];
  state = startGame(state);
  state = submitPlayerAction(state, owner(state).id, fusionAction(name)).state;
  for (const player of state.players) player.hp = 40;
  return state;
}

function revealEffectTurn(initial: GameState, action: PlayerAction,
  opponentActions: PlayerAction[] = []): GameState {
  let state = collecting(initial);
  owner(state).cakes = 40;
  const actions = [action, ...opponentActions];
  for (const [index, player] of state.players.entries()) {
    state = submitPlayerAction(state, player.id, actions[index] ?? { type: "gain_cake" }).state;
  }
  assert.equal(state.activeTimingPhase, "turn_change_action");
  return state;
}

function settleEffectTurn(initial: GameState): GameState {
  let state = initial;
  for (let guard = 0; state.phase === "action_window" && state.activeTimingPhase !== "turn_end_action" && guard < 30; guard++) {
    state = advanceActionWindow(state);
  }
  assert.ok(state.phase === "finished" || state.activeTimingPhase === "turn_end_action");
  return state;
}

const cast = (name: string): SkillAction => ({ type: "skill", skillId: skill(name), stacks: 1 });
const useCount = (player: PlayerState, name: string) =>
  player.buffs.find((buff) => buff.id === `skill_used:${skill(name)}`)?.stacks ?? 0;
const defenseValue = (state: GameState) => owner(state).buffs.find((buff) => buff.id === "defense_value")?.stacks ?? 0;

check("all ten new effects can fuse through the real preparation channel", () => {
  for (const name of EFFECT_BATCH) {
    const state = effectGame(name);
    assert.equal(owner(state).skillFusions?.[0]?.skillId, recipe(name).skill.id);
    assert.equal(getSkillCardIds(owner(state)).length, 1);
    assert.equal(getSkillUseLimit(owner(state), skill("狂风骤雪")), name === "极寒风暴" ? 2 : 0);
  }
});

check("extreme cold applies two distinct two-point hits to each enemy and preserves its two-use allowance", () => {
  let state = effectGame("极寒风暴");
  state = settleEffectTurn(revealEffectTurn(state, cast("狂风骤雪")));
  for (const target of state.players.slice(1)) {
    assert.deepEqual(state.eventLog.filter((event) => event.type === "damage" && event.targetId === target.id)
      .map((event) => event.amount), [2, 2]);
    assert.equal(target.hp, 36);
  }
  assert.equal(useCount(owner(state), "狂风骤雪"), 1);
  const next = decomposeSkill(state, owner(state).id, owner(state).skillFusions![0]!.id);
  assert.equal(useCount(owner(next), "狂风骤雪"), 1);
  const normal = settleEffectTurn(revealEffectTurn(next, cast("狂风骤雪")));
  assert.equal(normal.players[1]!.hp, 34);
  assert.equal(useCount(owner(normal), "狂风骤雪"), 2);
  assert.throws(() => revealEffectTurn(normal, cast("狂风骤雪")), /次数上限/);
});

check("extreme cold remains blockable by youtiao and reversal preserves its two-hit stats", () => {
  let state = effectGame("极寒风暴");
  const b = state.players[1]!.id;
  state = settleEffectTurn(revealEffectTurn(state, cast("狂风骤雪"), [{ type: "defense", defense: "youtiao" }]));
  assert.equal(state.players[1]!.hp, 40);
  assert.equal(state.eventLog.filter((event) => event.type === "damage" && event.targetId === b).length, 0);
  let reversed = effectGame("极寒风暴");
  reversed.players[1]!.skills = [skill("逆转")];
  reversed = revealEffectTurn(reversed, cast("狂风骤雪"));
  reversed = submitActionWindowSkill(reversed, reversed.players[1]!.id, cast("逆转"));
  reversed = settleEffectTurn(reversed);
  assert.equal(owner(reversed).hp, 32);
  assert.equal(reversed.eventLog.filter((event) => event.type === "damage" && event.targetId === owner(reversed).id).length, 4);
});

check("destruction shield makes all-out strike level zero, limits backlash to one, and retains rear shield", () => {
  let state = effectGame("毁灭之盾");
  const stats = applyAttackModifiers(state, owner(state).id, getSkillAttackStats(skill("全力一击"), 1)!);
  assert.equal(stats.level, 0);
  assert.equal(getActiveSkillCount(owner(state), skill("后盾")), 1);
  state = settleEffectTurn(revealEffectTurn(state,
    { ...cast("全力一击"), targetId: state.players[1]!.id }, [{ type: "defense", defense: "small" }]));
  assert.equal(owner(state).hp, 39);
  const original = decomposeSkill(state, owner(state).id, owner(state).skillFusions![0]!.id);
  assert.equal(applyAttackModifiers(original, owner(original).id, getSkillAttackStats(skill("全力一击"), 1)!).level, -1);
  const next = settleEffectTurn(revealEffectTurn(original,
    { ...cast("全力一击"), targetId: original.players[1]!.id }, [{ type: "defense", defense: "small" }]));
  assert.equal(owner(next).hp, 36);
});

check("son of god uses absolute HP times three plus six for both positive HP and revival, without refilling", () => {
  for (const hp of [2, -2]) {
    let state = endWindow(effectGame("神之子"));
    owner(state).hp = hp;
    if (hp < 0) {
      state.activeTimingPhase = "revival_action";
      owner(state).buffs.push({ id: "pending_death", name: "濒死", stacks: 1 });
    }
    state = submitActionWindowSkill(state, owner(state).id, cast("天佑之魂"));
    assert.equal(owner(state).hp, 12);
    assert.equal(useCount(owner(state), "天佑之魂"), 1);
    const next = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
    assert.throws(() => submitActionWindowSkill(next, owner(next).id, cast("天佑之魂")), /次数上限/);
  }
});

check("enhanced bloodthirst floors each attack's healing and leaves extra unfused copies at their base rate", () => {
  for (const name of ["泣血之刃", "末世"]) {
    let state = effectGame(name, ["嗜血"]);
    owner(state).hp = 10;
    state = settleEffectTurn(revealEffectTurn(state,
      { type: "attack", attackId: "sha", stacks: 7, targetId: state.players[1]!.id }));
    assert.equal(owner(state).hp, 14); // floor(7/2) + floor(7/4)
    const original = decomposeSkill(state, owner(state).id, owner(state).skillFusions![0]!.id);
    const next = settleEffectTurn(revealEffectTurn(original,
      { type: "attack", attackId: "sha", stacks: 7, targetId: original.players[1]!.id }));
    assert.equal(owner(next).hp, 16); // two original copies: 2 * floor(7/4)
  }
});

check("blood-weeping blade wins at the fourth revenge while its unfused material still needs five", () => {
  for (const fused of [true, false]) {
    let state = effectGame("泣血之刃");
    if (!fused) state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
    owner(state).buffs.push({ id: "revenge_hit_count", name: "复仇计数", stacks: 3 },
      { id: `revenge_target:${state.players[1]!.id}`, name: "复仇目标", stacks: 1 });
    state = settleEffectTurn(revealEffectTurn(state,
      { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[1]!.id }));
    assert.equal(owner(state).buffs.find((buff) => buff.id === "revenge_hit_count")?.stacks, 4);
    assert.equal(owner(state).buffs.some((buff) => buff.id === "instant_win:revenge"), fused);
    if (fused) {
      assert.equal(state.phase, "finished");
      assert.ok(state.winnerIds.includes(owner(state).id));
    }
  }
});

check("both cooldown fusions shorten an existing ledger and decomposition restores its remaining baseline", () => {
  for (const name of ["末世", "宗师之力"]) {
    let state = effectGame(name);
    owner(state).buffs.push({ id: "destroy_power_cooldown:old", name: "冷却", stacks: 1, expiresAtRound: 3 });
    assert.equal(getDestroyPowerCooldownCount(owner(state), 1), 1);
    assert.equal(getDestroyPowerCooldownCount(owner(state), 2), 0);
    const before = structuredClone(owner(state).buffs);
    state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
    assert.deepEqual(owner(state).buffs, before);
    assert.equal(getDestroyPowerCooldownCount(owner(state), 2), 1);
    assert.equal(getDestroyPowerCooldownCount(owner(state), 3), 0);
  }
});

check("cooldown validator accepts the next round but rejects a second use in the same round", () => {
  for (const name of ["末世", "宗师之力"]) {
    let state = effectGame(name);
    owner(state).buffs.push({ id: "destroy_power_cooldown:old", name: "冷却", stacks: 1, expiresAtRound: 3 });
    state.roundNumber = 2;
    state = revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[1]!.id });
    state = enterActionWindow(state, owner(state).id);
    const action: SkillAction = { ...cast("毁灭之力"), switchActionIndex: 0, attackStatModifier: "power_plus_1_level_minus_1" };
    const validation = validateActionWindowSkill(state, owner(state).id, action);
    assert.equal(validation.ok, true, `${name}: ${validation.error}`);
    state = submitActionWindowSkill(state, owner(state).id, action);
    assert.throws(() => submitActionWindowSkill(state, owner(state).id, action), /冷却/);
    assert.equal(owner(state).buffs.find((buff) => buff.id === "destroy_power_cooldown:old")?.expiresAtRound, 3);
    assert.ok(owner(state).buffs.some((buff) => buff.id.startsWith("destroy_power_cooldown:") && buff.expiresAtRound === 4));
  }
});

check("master's power ignores earth-breaking only for the attack modified by destruction power", () => {
  for (const modify of [true, false]) {
    let state = effectGame("宗师之力");
    state = revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: modify ? 1 : 3, targetId: state.players[1]!.id });
    if (modify) state = submitActionWindowSkill(state, owner(state).id,
      { ...cast("毁灭之力"), attackStatModifier: "power_plus_2_level_minus_2", switchActionIndex: 0 });
    state = settleEffectTurn(state);
    assert.equal(state.players[1]!.hp, modify ? 37 : 40);
  }
});

check("master's power does not bypass decay or exempt another player's attack", () => {
  let state = effectGame("宗师之力");
  state.players[2]!.skills = [skill("衰竭")];
  state = revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[1]!.id });
  state = submitActionWindowSkill(state, owner(state).id,
    { ...cast("毁灭之力"), attackStatModifier: "power_plus_2_level_minus_2", switchActionIndex: 0 });
  state = settleEffectTurn(state);
  assert.equal(state.players[1]!.hp, 40);

  let other = effectGame("宗师之力");
  other.players[1]!.cakes = 3;
  other = revealEffectTurn(other,
    { type: "attack", attackId: "sha", stacks: 1, targetId: other.players[1]!.id },
    [{ type: "attack", attackId: "sha", stacks: 3, targetId: other.players[2]!.id }]);
  other = submitActionWindowSkill(other, owner(other).id,
    { ...cast("毁灭之力"), attackStatModifier: "power_plus_2_level_minus_2", switchActionIndex: 0 });
  other = settleEffectTurn(other);
  assert.equal(other.players[1]!.hp, 37);
  assert.equal(other.players[2]!.hp, 40);
});

check("a fused destruction copy does not shorten the cooldown of an extra unfused copy", () => {
  const state = effectGame("末世", ["毁灭之力"]);
  owner(state).buffs.push({ id: "destroy_power_cooldown:first", name: "冷却", stacks: 1, expiresAtRound: 3 },
    { id: "destroy_power_cooldown:second", name: "冷却", stacks: 1, expiresAtRound: 3 });
  assert.equal(getDestroyPowerCooldownCount(owner(state), 1), 2);
  assert.equal(getDestroyPowerCooldownCount(owner(state), 2), 1);
  owner(state).buffs.push({ id: "destroy_power_cooldown:third", name: "冷却", stacks: 1, expiresAtRound: 4 });
  assert.equal(getDestroyPowerCooldownCount(owner(state), 2), 2);
  assert.equal(getDestroyPowerCooldownCount(owner(state), 3), 0);
});

check("wind forest damages odd and even enemies once while preserving purification immunity and use limits", () => {
  let state = endWindow(effectGame("风语之森"));
  state.players[1]!.hp = 39;
  state = submitActionWindowSkill(state, owner(state).id, cast("净化之风"));
  assert.deepEqual(state.players.map((player) => player.hp), [40, 38, 39]);
  state = endWindow(state);
  state.players[2]!.skills = [skill("净化")];
  state = submitActionWindowSkill(state, owner(state).id, cast("净化之风"));
  assert.deepEqual(state.players.map((player) => player.hp), [40, 37, 39]);
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, cast("净化之风")), /次数上限/);
});

check("wind forest decomposition restores alternating parity without resetting the previous use", () => {
  let state = endWindow(effectGame("风语之森"));
  state = submitActionWindowSkill(state, owner(state).id, cast("净化之风"));
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  state.players[1]!.hp = 38;
  state.players[2]!.hp = 39;
  state = submitActionWindowSkill(state, owner(state).id, cast("净化之风"));
  assert.deepEqual(state.players.map((player) => player.hp), [40, 37, 39]);
});

check("blood demon gains six defense for the same one-HP payment and keeps the two-use limit", () => {
  let state = endWindow(effectGame("血魔之怒"));
  state = submitActionWindowSkill(state, owner(state).id, cast("血水屏障"));
  assert.equal(owner(state).hp, 39);
  assert.equal(defenseValue(state), 6);
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  state = submitActionWindowSkill(state, owner(state).id, cast("血水屏障"));
  assert.equal(owner(state).hp, 38);
  assert.equal(defenseValue(state), 10);
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, cast("血水屏障")), /次数上限/);
});

check("blood demon removes only coagulation's cake cap and retains interval and lifetime limits", () => {
  let state = effectGame("血魔之怒");
  state.roundNumber = 2;
  owner(state).buffs.push({ id: "damage_taken_round:1", name: "上一轮受伤", stacks: 9 });
  state = submitActionWindowSkill(state, owner(state).id, cast("凝血之力"));
  assert.equal(owner(state).buffs.find((buff) => buff.id === "coagulation_cake_round:2")?.stacks, 9);
  assert.equal(useCount(owner(state), "凝血之力"), 1);
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, cast("凝血之力")), /重复使用/);
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  state.roundNumber = 3;
  state.activeTimingPhase = "round_pre_interval_action";
  owner(state).buffs.push({ id: "damage_taken_round:2", name: "上一轮受伤", stacks: 9 });
  state = submitActionWindowSkill(state, owner(state).id, cast("凝血之力"));
  assert.equal(owner(state).buffs.find((buff) => buff.id === "coagulation_cake_round:3")?.stacks, 4);
  assert.equal(useCount(owner(state), "凝血之力"), 2);
});

check("divine soul adds one extra crystal level per fused copy, leaving extra crystals unchanged", () => {
  let state = effectGame("神界炼魂", ["神族水晶"]);
  const base = getStackedAttackStats(BASE_ATTACKS.sha, 2);
  assert.equal(applyAttackModifiers(state, owner(state).id, base).level, 5); // 2 + 2 + 1
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  assert.equal(applyAttackModifiers(state, owner(state).id, base).level, 4);
});

check("divine soul keeps attack progress and wins on attack twenty only below the original HP threshold", () => {
  for (const hp of [3, 4]) {
    let state = effectGame("神界炼魂");
    owner(state).hp = hp;
    owner(state).buffs.push({ id: "bailian_attack_count", name: "攻击次数", stacks: 19 });
    state = settleEffectTurn(revealEffectTurn(state,
      { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[1]!.id }));
    assert.equal(owner(state).buffs.find((buff) => buff.id === "bailian_attack_count")?.stacks, hp === 3 ? 20 : 19);
    assert.equal(owner(state).buffs.some((buff) => buff.id === "instant_win:bailian"), hp === 3);
    if (hp === 3) assert.ok(state.winnerIds.includes(owner(state).id));
  }
});

check("witch cloak enhances both shields and decomposition preserves previously granted defense and uses", () => {
  let state = endWindow(effectGame("魔女斗篷"));
  state = submitActionWindowSkill(state, owner(state).id, cast("暗影盾"));
  assert.equal(defenseValue(state), 10);
  state = submitActionWindowSkill(state, owner(state).id, cast("血水屏障"));
  assert.equal(defenseValue(state), 16);
  assert.equal(owner(state).hp, 39);
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  assert.equal(defenseValue(state), 16);
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, cast("暗影盾")), /次数上限/);
  state = submitActionWindowSkill(state, owner(state).id, cast("血水屏障"));
  assert.equal(defenseValue(state), 20);
});

check("sealing a fusion suppresses its new effects and seals survive decomposition", () => {
  for (const name of ["神界炼魂", "毁灭之盾", "极寒风暴"]) {
    let state = effectGame(name);
    owner(state).buffs.push({ id: `sealed_skill:${recipe(name).skill.id}`, name: "封印", stacks: 1 });
    const stats = applyAttackModifiers(state, owner(state).id, name === "毁灭之盾"
      ? getSkillAttackStats(skill("全力一击"), 1)! : getStackedAttackStats(BASE_ATTACKS.sha, 1));
    assert.equal(stats.level, name === "毁灭之盾" ? -1 : 1);
    state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
    for (const id of recipe(name).materialOptions[0]!) assert.equal(getActiveSkillCount(owner(state), id), 0);
  }
});

const NEXT_EFFECT_BATCH = ["烽火赤壁", "神域之种", "虚无", "空之轨迹", "霸者重装",
  "冰霜长矛", "水火双生", "雷霆之心", "逆转星移", "斗战胜佛"];

function closeEffectRound(state: GameState): GameState {
  const end = endWindow(state);
  end.turnResolutionStarted = true;
  end.turnHealthChanged = true;
  return advanceActionWindow(end);
}

function playSurvivorRound(initial: GameState): GameState {
  let state = collecting(initial);
  const living = state.players.filter((player) => player.status === "alive");
  assert.ok(living.length >= 2);
  living[0]!.cakes = 1;
  for (const [index, player] of living.entries()) state = submitPlayerAction(state, player.id,
    index === 0 ? { type: "attack", attackId: "sha", stacks: 1, targetId: living[1]!.id } : { type: "gain_cake" }).state;
  return advanceActionWindow(settleEffectTurn(state));
}

check("the second ten-effect batch forms real covers and registers the golden cudgel as an active skill", () => {
  for (const name of NEXT_EFFECT_BATCH) {
    const state = effectGame(name);
    assert.equal(getSkillCardIds(owner(state))[0], recipe(name).skill.id);
    assert.ok(isFusionImplemented(recipe(name).skill.id));
  }
  const state = effectGame("斗战胜佛");
  const stats = getSkillAttackStats(recipe("斗战胜佛").skill.id, 1)!;
  assert.equal(stats.name, "金箍棒");
  assert.equal(stats.cost, 3);
  assert.equal(stats.power, 999);
  assert.equal(stats.level, 3);
  assert.equal(stats.defenseTag, "any");
  assert.equal(getActiveSkillCount(owner(state), stats.id), 1);
  const stacked = getSkillAttackStats(recipe("斗战胜佛").skill.id, 2)!;
  assert.equal(stacked.power, 999);
  assert.equal(stacked.level, 6);
  assert.equal(stacked.cost, 6);
});

check("red cliffs adds two burning-earth uses without refilling already spent uses", () => {
  let state = game(["火烧大地", "净化之风"]);
  recordSkillUse(owner(state), skill("火烧大地"));
  state = submitPlayerAction(state, owner(state).id, fusionAction("烽火赤壁")).state;
  assert.equal(getSkillUseLimit(owner(state), skill("火烧大地")), 3);
  for (const player of state.players) player.hp = 40;
  state = endWindow(state);
  for (let i = 0; i < 2; i++) state = submitActionWindowSkill(state, owner(state).id, cast("火烧大地"));
  assert.equal(useCount(owner(state), "火烧大地"), 3);
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, cast("火烧大地")), /次数上限/);
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  assert.equal(getSkillUseLimit(owner(state), skill("火烧大地")), 1);
  assert.equal(useCount(owner(state), "火烧大地"), 3);
});

check("red cliffs purifying wind deals two one-point spell ticks to each odd or even enemy", () => {
  let state = endWindow(effectGame("烽火赤壁"));
  state.players[1]!.hp = 39;
  state = submitActionWindowSkill(state, owner(state).id, cast("净化之风"));
  assert.deepEqual(state.players.map((player) => player.hp), [40, 37, 38]);
  for (const target of state.players.slice(1)) assert.deepEqual(state.eventLog
    .filter((event) => event.type === "damage" && event.targetId === target.id).map((event) => event.amount), [1, 1]);
  assert.equal(useCount(owner(state), "净化之风"), 1);
  state = endWindow(state);
  state.players[2]!.skills = [skill("净化")];
  state = submitActionWindowSkill(state, owner(state).id, cast("净化之风"));
  assert.equal(state.players[2]!.hp, 38);
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, cast("净化之风")), /次数上限/);
});

check("divine seed protects the third turn but not the fourth and adds two final crystal levels", () => {
  for (const turn of [3, 4]) {
    let state = collecting(effectGame("神域之种"));
    assert.equal(applyAttackModifiers(state, owner(state).id, getStackedAttackStats(BASE_ATTACKS.sha, 1)).level, 3);
    state.roundTurnNumber = turn;
    state.players[1]!.cakes = 1;
    state = settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" },
      [{ type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id }]));
    assert.equal(owner(state).hp, turn === 3 ? 40 : 39);
  }
  let plain = effectGame("神域之种");
  plain = decomposeSkill(endWindow(plain), owner(plain).id, owner(plain).skillFusions![0]!.id);
  plain = collecting(plain);
  plain.roundTurnNumber = 3;
  plain.players[1]!.cakes = 1;
  assert.equal(applyAttackModifiers(plain, owner(plain).id, getStackedAttackStats(BASE_ATTACKS.sha, 1)).level, 2);
  plain = settleEffectTurn(revealEffectTurn(plain, { type: "gain_cake" },
    [{ type: "attack", attackId: "sha", stacks: 1, targetId: owner(plain).id }]));
  assert.equal(owner(plain).hp, 39);
});

check("fused crystal levels remain final bonuses after destruction power sets attack level to zero", () => {
  for (const name of ["神域之种", "神界炼魂"]) {
    let state = effectGame(name, ["毁灭之力"]);
    state.players[1]!.cakes = 1;
    state = revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[1]!.id },
      [{ type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id }]);
    state = submitActionWindowSkill(state, owner(state).id,
      { ...cast("毁灭之力"), switchActionIndex: 0, attackStatModifier: "power_times_3_level_to_zero" });
    state = settleEffectTurn(state);
    assert.equal(state.players[1]!.hp, 38);
  }
});

check("void and space trail shorten an existing flash cooldown without changing its baseline record", () => {
  for (const [name, wait] of [["虚无", 1], ["空之轨迹", 2]] as const) {
    let state = effectGame(name);
    owner(state).buffs.push({ id: "flash_dodge_cooldown:old", name: "冷却", stacks: 1, expiresAtRound: 4 });
    assert.equal(getFlashDodgeCooldownCount(owner(state), 1), 1);
    assert.equal(getFlashDodgeCooldownCount(owner(state), 1 + wait), 0);
    if (wait === 2) assert.equal(getFlashDodgeCooldownCount(owner(state), 2), 1);
    const ledger = structuredClone(owner(state).buffs);
    state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
    assert.deepEqual(owner(state).buffs, ledger);
    assert.equal(getFlashDodgeCooldownCount(owner(state), 1 + wait), 1);
    assert.equal(getFlashDodgeCooldownCount(owner(state), 4), 0);
  }
});

check("void can flash once in each consecutive round and cannot flash twice in one round", () => {
  let state = effectGame("虚无");
  for (const round of [1, 2, 3]) {
    state = endWindow(state);
    state.activeTimingPhase = "turn_change_action";
    state.roundNumber = round;
    state = submitActionWindowSkill(state, owner(state).id, cast("闪现"));
    assert.throws(() => submitActionWindowSkill(state, owner(state).id, cast("闪现")), /冷却/);
  }
  assert.equal(owner(state).buffs.filter((buff) => buff.id.startsWith("flash_dodge_cooldown:")).length, 3);
  assert.equal(getFlashDodgeCooldownCount(owner(state), 4), 0);
});

check("shortened flash cooldown applies only to fused copies when other copies remain unfused", () => {
  const state = effectGame("虚无", ["闪现"]);
  owner(state).buffs.push({ id: "flash_dodge_cooldown:a", name: "冷却", stacks: 1, expiresAtRound: 4 },
    { id: "flash_dodge_cooldown:b", name: "冷却", stacks: 1, expiresAtRound: 4 });
  assert.equal(getFlashDodgeCooldownCount(owner(state), 2), 1);
  owner(state).buffs.push({ id: "flash_dodge_cooldown:c", name: "冷却", stacks: 1, expiresAtRound: 5 });
  assert.equal(getFlashDodgeCooldownCount(owner(state), 2), 2);
  assert.equal(getFlashDodgeCooldownCount(owner(state), 3), 1);
  assert.equal(getFlashDodgeCooldownCount(owner(state), 4), 0);
});

check("space trail returns after three round ends, permits two uses, and keeps spent uses after decomposition", () => {
  let state = effectGame("空之轨迹");
  for (let use = 1; use <= 2; use++) {
    assert.equal(getSkillUseLimit(owner(state), skill("过往时空")), 2);
    state = submitActionWindowSkill(state, owner(state).id, cast("过往时空"));
    assert.equal(owner(state).status, "dead");
    assert.equal(owner(state).buffs.find((buff) => buff.id === "small_space:past_time")?.stacks, 3);
    for (let round = 0; round < 3; round++) {
      state = playSurvivorRound(state);
      assert.equal(owner(state).status, round === 2 ? "alive" : "dead");
    }
    assert.equal(useCount(owner(state), "过往时空"), use);
  }
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  assert.equal(getSkillUseLimit(owner(state), skill("过往时空")), 1);
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, cast("过往时空")), /次数上限/);
});

check("overlord armor heals every round while an extra ordinary sanctuary still heals every third round", () => {
  for (const round of [1, 2, 3]) {
    let state = effectGame("霸者重装", ["圣域"]);
    state.roundNumber = round;
    state = closeEffectRound(state);
    assert.equal(owner(state).hp, round === 3 ? 46 : 43);
  }
  let state = effectGame("霸者重装");
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  state = closeEffectRound(state);
  assert.equal(owner(state).hp, 40);
});

check("overlord armor schedules four HP per fused trauma copy and three per ordinary copy with one cake each", () => {
  for (const decompose of [false, true]) {
    let state = effectGame("霸者重装", ["创伤聚合"]);
    state.players[1]!.cakes = 1;
    state = settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" },
      [{ type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id }]));
    assert.equal(owner(state).hp, 39);
    const queued = owner(state).buffs.filter((buff) => buff.id.startsWith("trauma_converge:4"));
    assert.equal(queued.reduce((sum, buff) => sum + buff.stacks, 0), 2);
    assert.ok(queued.some((buff) => buff.sourceFusionId));
    if (decompose) state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
    state = endWindow(state);
    state.roundNumber = 4;
    state.activeTimingPhase = "round_before_action";
    owner(state).cakes = 0;
    state = advanceActionWindow(state);
    assert.equal(owner(state).hp, 39);
    assert.equal(owner(state).cakes, 2);
    state = closeEffectRound(state);
    assert.equal(owner(state).hp, decompose ? 45 : 49); // Active armor also receives its three-HP sanctuary.
  }
});

check("overlord armor's new periodic healing remains suppressed by blood sorrow", () => {
  let state = effectGame("霸者重装");
  state.players[1]!.skills = [skill("血之哀")];
  state = closeEffectRound(state);
  assert.equal(owner(state).hp, 40);
});

check("frost spear doubles frostfall healing and retains the original fire-skill removal and use cap", () => {
  let state = endWindow(effectGame("冰霜长矛"));
  state.players[2]!.skills = [skill("火球")];
  state = submitActionWindowSkill(state, owner(state).id, cast("霜落大地"));
  assert.deepEqual(state.players.map((player) => player.hp), [48, 42, 40]);
  assert.deepEqual(state.players[2]!.skills, []);
  assert.equal(useCount(owner(state), "霜落大地"), 1);
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, cast("霜落大地")), /次数上限/);
});

check("water-fire twins makes sha three power and three levels with both elements before other bonuses", () => {
  let state = effectGame("水火双生");
  const stats = applyAttackModifiers(state, owner(state).id, getStackedAttackStats(BASE_ATTACKS.sha, 2));
  assert.equal(stats.power, 6);
  assert.equal(stats.level, 6);
  assert.deepEqual(new Set(stats.elements), new Set(["ice", "fire"]));
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  const normal = applyAttackModifiers(state, owner(state).id, getStackedAttackStats(BASE_ATTACKS.sha, 2));
  assert.equal(normal.power, 4);
  assert.equal(normal.level, 4);
  assert.deepEqual(normal.elements, ["fire"]);
});

check("both ice-blade fusions keep damage while suppressing skills and decomposition restores zero damage", () => {
  for (const name of ["水火双生", "冰霜长矛"]) {
    let state = effectGame(name);
    const b = state.players[1]!.id;
    state = revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: b });
    state = submitActionWindowSkill(state, owner(state).id, cast("寒冰剑"));
    state = settleEffectTurn(state);
    assert.equal(state.players[1]!.hp, name === "水火双生" ? 37 : 39);
    assert.ok(state.players[1]!.buffs.some((buff) => buff.id.startsWith("skill_disabled_until_round:")));
    state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
    const beforeHp = state.players[1]!.hp;
    state = revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: b });
    state = submitActionWindowSkill(state, owner(state).id, cast("寒冰剑"));
    state = settleEffectTurn(state);
    assert.equal(state.players[1]!.hp, beforeHp);
  }
});

check("thunder heart includes its caster in thunder wave and grants four HP instead of defense", () => {
  for (const extra of [false, true]) {
    let state = effectGame("雷霆之心", extra ? ["大地之心"] : []);
    state = settleEffectTurn(revealEffectTurn(state, cast("三千雷动")));
    assert.deepEqual(state.players.map((player) => player.hp), [44, 36, 36]);
    assert.equal(defenseValue(state), extra ? 4 : 0);
    state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
    state = settleEffectTurn(revealEffectTurn(state, cast("三千雷动")));
    assert.equal(owner(state).hp, 44);
  }
});

check("thunder heart converts electric-shock immunity to healing without also applying paralysis", () => {
  let state = effectGame("雷霆之心");
  state.players[1]!.skills = [skill("电击法术")];
  state = settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" },
    [{ ...cast("电击法术"), targetId: owner(state).id }]));
  assert.equal(owner(state).hp, 44);
  assert.equal(defenseValue(state), 0);
  assert.ok(!owner(state).buffs.some((buff) => buff.id.startsWith("paralysis_next_action:")));
});

check("thunder heart also converts electric retirement immunity and respects blood sorrow", () => {
  for (const sorrow of [false, true]) {
    let state = effectGame("雷霆之心");
    owner(state).hp = 3;
    state.players[1]!.skills = [skill("雷裂残阳")];
    if (sorrow) state.players[2]!.skills = [skill("血之哀")];
    state = endWindow(state);
    state = submitActionWindowSkill(state, state.players[1]!.id, cast("雷裂残阳"));
    assert.equal(owner(state).status, "alive");
    assert.equal(owner(state).hp, sorrow ? 3 : 7);
    assert.equal(defenseValue(state), 0);
  }
});

function damageWindow(initial: GameState): GameState {
  let state = initial;
  for (let guard = 0; state.phase === "action_window" && state.activeTimingPhase !== "turn_damage_modify" && guard < 20; guard++) {
    state = advanceActionWindow(state);
  }
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  return state;
}

check("reversal star opens the real damage window for infinite damage and redirects it once", () => {
  let state = effectGame("逆转星移");
  state.players[1]!.cakes = 14;
  state = damageWindow(revealEffectTurn(state, { type: "gain_cake" },
    [{ type: "attack", attackId: "miao_sha", stacks: 1, targetId: owner(state).id }]));
  assert.equal(getDamageRedirectLimit(owner(state)), 999);
  const damage = state.pendingDamageItems!.find((item) => item.targetId === owner(state).id)!;
  assert.equal(damage.amount, 999);
  const action = { ...cast("斗转星移"), targetId: state.players[2]!.id, targetDamageId: damage.id };
  state = submitActionWindowSkill(state, owner(state).id, action);
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, action));
  state = settleEffectTurn(state);
  assert.equal(owner(state).hp, 40);
  assert.ok(state.players[2]!.hp < 0);
  assert.equal(useCount(owner(state), "斗转星移"), 1);
});

check("reversal-star decomposition restores the three-damage limit while keeping remaining uses", () => {
  let state = endWindow(effectGame("逆转星移"));
  recordSkillUse(owner(state), skill("斗转星移"));
  state = decomposeSkill(state, owner(state).id, owner(state).skillFusions![0]!.id);
  assert.equal(getDamageRedirectLimit(owner(state)), 3);
  assert.equal(getSkillUseLimit(owner(state), skill("斗转星移")), 2);
  state.activeTimingPhase = "turn_damage_modify";
  state.pendingDamageItems = [{ id: "large_damage", targetId: owner(state).id, amount: 4, fromAttack: true, isLastHit: false }];
  assert.equal(validateActionWindowSkill(state, owner(state).id,
    { ...cast("斗转星移"), targetId: state.players[1]!.id, targetDamageId: "large_damage" }).ok, false);
  assert.equal(useCount(owner(state), "斗转星移"), 1);
});

check("golden cudgel costs three cakes, is blockable, and becomes a legal AI choice", () => {
  let state = collecting(effectGame("斗战胜佛"));
  const action: SkillAction = { type: "skill", skillId: recipe("斗战胜佛").skill.id, stacks: 1, targetId: state.players[1]!.id };
  owner(state).cakes = 2;
  assert.equal(validateAction(state, owner(state).id, action).ok, false);
  owner(state).cakes = 3;
  assert.equal(validateAction(state, owner(state).id, action).ok, true);
  assert.ok(enumerateLegalAiActions(state, owner(state), state.players.slice(1)).some((item) =>
    item.type === "skill" && item.skillId === action.skillId));
  state = settleEffectTurn(revealEffectTurn(state, action, [{ type: "defense", defense: "small" }]));
  assert.equal(owner(state).cakes, 37);
  assert.equal(state.players[1]!.hp, 40);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.attackName === "金箍棒"));
  const visible = toPublicGameState(state, state.players[1]!.id).players[0]!;
  assert.deepEqual(visible.skills, [recipe("斗战胜佛").skill.id]);
});

check("golden cudgel retains fire-eye rebound piercing and cannot be cast after decomposition or sealing", () => {
  let state = effectGame("斗战胜佛");
  const action: SkillAction = { type: "skill", skillId: recipe("斗战胜佛").skill.id, stacks: 1, targetId: state.players[1]!.id };
  state.players[1]!.cakes = 1;
  state = settleEffectTurn(revealEffectTurn(state, action,
    [{ type: "defense", defense: "rebound", targetId: owner(state).id }]));
  assert.equal(owner(state).hp, 40);
  assert.ok(state.players[1]!.hp < 0);
  let sealed = collecting(effectGame("斗战胜佛"));
  owner(sealed).cakes = 3;
  owner(sealed).buffs.push({ id: `sealed_skill:${action.skillId}`, name: "封印", stacks: 1 });
  assert.equal(validateAction(sealed, owner(sealed).id, { ...action, targetId: sealed.players[1]!.id }).ok, false);
  let decomposed = effectGame("斗战胜佛");
  decomposed = decomposeSkill(endWindow(decomposed), owner(decomposed).id, owner(decomposed).skillFusions![0]!.id);
  decomposed = collecting(decomposed);
  owner(decomposed).cakes = 3;
  assert.equal(validateAction(decomposed, owner(decomposed).id, { ...action, targetId: decomposed.players[1]!.id }).ok, false);
});

const CLEAR_EFFECT_BATCH = ["冰火两仪眼", "虚幻", "暗影狙击", "暗影战斧", "后羿•七日连珠", "圣灵觉醒", "阳光之夜",
  "破天圣剑", "破军", "无尽战刃", "天火之狱", "山崩地裂", "绝对天盾", "神域守护", "黑白板", "冰火双漩",
  "大抠天下", "回响之杖", "永夜之刃", "核战", "逐日之弓", "魔域"];
const fusionCast = (name: string, extra: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId: getFusionSkillId(name), stacks: 1, ...extra });
function revealWithResources(initial: GameState, actions: PlayerAction[]): GameState {
  let state = collecting(initial);
  for (const [index, player] of state.players.entries()) if (player.status === "alive") {
    state = submitPlayerAction(state, player.id, actions[index] ?? { type: "gain_cake" }).state;
  }
  return state;
}

check("all 22 clear recipes are playable while the disputed groups remain closed", () => {
  for (const name of CLEAR_EFFECT_BATCH) {
    const state = effectGame(name, [], 4);
    assert.equal(owner(state).skillFusions?.[0]?.skillId, getFusionSkillId(name));
    assert.equal(getSkillCardIds(owner(state)).length, 1);
  }
  for (const name of ["制裁之刃", "不死鸟之眼", "沙皇", "天魔舞", "杀级换", "六芒星阵", "博学者之怒", "帝灵之境",
    "反伤刺甲", "弹力球", "空城计", "名刀司命", "神隐双莲", "冰火狂暴曲", "阳炎之怒", "野蛮人", "贤者之书"]) {
    assert.equal(isFusionImplemented(getFusionSkillId(name)), false, name);
  }
});

check("ice-fire eye heals, removes both attributes, deals one bonus per affected player, and charges both materials", () => {
  let state = endWindow(effectGame("冰火两仪眼"));
  state.players[1]!.skills = [skill("火球"), skill("冰漩决")];
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, cast("火烧大地")), /融合替代/);
  state = submitActionWindowSkill(state, owner(state).id, fusionCast("冰火两仪眼"));
  assert.deepEqual(state.players.map((player) => player.hp), [44, 38, 39]);
  assert.deepEqual(state.players[1]!.skills, []);
  const damage = state.eventLog.findLast((event) => event.type === "damage" && event.targetId === state.players[1]!.id);
  assert.ok(damage?.type === "damage" && damage.elements?.includes("fire") && damage.elements.includes("ice"));
  state = submitActionWindowSkill(state, owner(state).id, fusionCast("冰火两仪眼"));
  for (const name of ["火烧大地", "霜落大地"]) assert.equal(useCount(owner(state), name), 2);
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, fusionCast("冰火两仪眼")), /次数上限/);
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, cast("霜落大地")), /次数上限/);
});

check("ice-fire eye inherits spent material uses and respects purification and holy realm", () => {
  let state = game(["火烧大地", "霜落大地"]);
  recordSkillUse(owner(state), skill("火烧大地"));
  state = submitPlayerAction(state, owner(state).id, fusionAction("冰火两仪眼")).state;
  assert.equal(getSkillUseLimit(owner(state), getFusionSkillId("冰火两仪眼")), 1);
  state = endWindow(state);
  state.players[1]!.skills = [skill("净化"), skill("火球")];
  state = submitActionWindowSkill(state, owner(state).id, fusionCast("冰火两仪眼"));
  assert.equal(state.players[1]!.hp, 6);
  assert.ok(state.players[1]!.skills.includes(skill("火球")));
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, fusionCast("冰火两仪眼")), /次数上限/);
  let holy = endWindow(effectGame("冰火两仪眼"));
  holy.players[1]!.skills = [skill("圣灵之境"), skill("火球")];
  holy = submitActionWindowSkill(holy, owner(holy).id, fusionCast("冰火两仪眼"));
  assert.equal(holy.players[1]!.hp, 40);
  assert.ok(holy.players[1]!.skills.includes(skill("火球")));
});

check("virtual defense replaces both material controls and charges one cake for each legal adjacent switch", () => {
  let state = revealEffectTurn(effectGame("虚幻"), { type: "defense", defense: "small" });
  owner(state).cakes = 3;
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, cast("换防")), /融合替代/);
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, fusionCast("虚幻", { switchToAction: { type: "defense", defense: "stone" } })));
  for (const defense of ["youtiao", "stone", "youtiao"] as const) state = submitActionWindowSkill(state, owner(state).id,
    fusionCast("虚幻", { switchToAction: { type: "defense", defense } }));
  assert.equal(owner(state).cakes, 0);
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, fusionCast("虚幻", { switchToAction: { type: "defense", defense: "small" } })), /饼不足/);
});

check("nuclear war stacks all discounts to zero, projects only the viewer's prices, and ends on decomposition", () => {
  let state = effectGame("核战", [], 4);
  const b = state.players[1]!;
  assert.equal(getAttackActionCost(state, owner(state), { type: "attack", attackId: "he_bao", stacks: 1 }), 0);
  assert.equal(getAttackActionCost(state, b, { type: "attack", attackId: "he_bao", stacks: 1 }), 3);
  b.skills = [skill("核反应堆")];
  assert.equal(getAttackActionCost(state, b, { type: "attack", attackId: "he_bao", stacks: 2 }), 0);
  assert.equal(getAttackActionCost(state, b, { type: "attack", attackId: "chao_he_bao", stacks: 2 }), 2);
  const view = toPublicGameState(state, b.id);
  assert.equal(view.players[1]!.attackCostOverrides?.he_bao, 0);
  assert.equal(view.players[0]!.attackCostOverrides, undefined);
  assert.equal(view.players[0]!.skillFusions, undefined);
  assert.ok(!JSON.stringify(view).includes(getFusionSkillId("核战")));
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  assert.equal(getAttackActionCost(state, owner(state), { type: "attack", attackId: "he_bao", stacks: 1 }), 3);
  assert.equal(getAttackActionCost(state, state.players[2]!, { type: "attack", attackId: "he_bao", stacks: 1 }), 6);
});

check("paid nuclear fusion cannot change other players' already-revealed action prices in settlement order", () => {
  let state = collecting(game(["核反应堆", "普天同庆"]));
  owner(state).hp = 40;
  owner(state).cakes = 2;
  state.players[1]!.cakes = 6;
  state = submitPlayerAction(state, owner(state).id, fusionAction("核战")).state;
  assert.equal(toPublicGameState(state, state.players[1]!.id).revealedActionCosts, undefined);
  assert.equal(toPublicGameState(state, state.players[1]!.id).revealedActionTargets, undefined);
  state = submitPlayerAction(state, state.players[1]!.id,
    { type: "attack", attackId: "he_bao", stacks: 1, targetId: owner(state).id }).state;
  assert.equal(state.players[1]!.cakes, 0);
  assert.equal(toPublicGameState(state, owner(state).id).revealedActionCosts?.[state.players[1]!.id]?.[0], 6);
});

check("multiple nuclear-war auras stack and stop contributing when their owner dies", () => {
  let state = effectGame("核战", [], 4);
  state.players[2]!.skills = [skill("核反应堆"), skill("普天同庆")];
  state = submitPlayerAction(state, state.players[2]!.id, fusionAction("核战")).state;
  assert.equal(getAttackActionCost(state, state.players[1]!, { type: "attack", attackId: "chao_he_bao", stacks: 1 }), 1);
  assert.equal(getAttackActionCost(state, owner(state), { type: "attack", attackId: "chao_he_bao", stacks: 1 }), 0);
  state.players[2]!.status = "dead";
  assert.equal(getAttackActionCost(state, state.players[1]!, { type: "attack", attackId: "chao_he_bao", stacks: 1 }), 4);
});

check("nuclear war has a legal zero-cake attack and hits the farthest seat", () => {
  let state = collecting(effectGame("核战", [], 6));
  assert.ok(enumerateLegalAiActions(state, owner(state), state.players.slice(1)).some((action) =>
    action.type === "attack" && action.attackId === "he_bao"));
  assert.equal(validateAction(state, owner(state).id, { type: "attack", attackId: "he_bao", stacks: 1 }).ok, true);
  state = settleEffectTurn(revealWithResources(state, [{ type: "attack", attackId: "he_bao", stacks: 1 }]));
  assert.equal(owner(state).cakes, 0);
  assert.ok(state.players.slice(1).every((player) => player.hp === 34));
});

check("universal gou pierces rebound and includes the farthest target", () => {
  let state = effectGame("大抠天下", [], 6);
  state.players[1]!.cakes = 1;
  state = settleEffectTurn(revealEffectTurn(state, { ...cast("抠"), targetId: state.players[1]!.id },
    [{ type: "defense", defense: "rebound", targetId: owner(state).id }]));
  assert.equal(owner(state).hp, 40);
  assert.ok(state.players.slice(1).every((player) => player.hp === 39));
});

check("ice-fire vortex enforces one to three consecutive targets, deals both elements and freezes two turns", () => {
  let state = effectGame("冰火双漩", [], 6);
  const ids = state.players.slice(1, 4).map((player) => player.id);
  const action = fusionCast("冰火双漩", { targetId: ids[0]!, targetIds: ids });
  const current = collecting(state);
  owner(current).cakes = 3;
  assert.equal(validateAction(current, owner(current).id, { ...action, targetIds: [ids[0]!, ids[2]!] }).ok, false);
  assert.equal(validateAction(current, owner(current).id, { ...action, targetIds: state.players.slice(1, 5).map((player) => player.id) }).ok, false);
  state = settleEffectTurn(revealEffectTurn(state, action));
  for (const target of state.players.slice(1, 4)) {
    assert.equal(target.hp, 36);
    assert.equal(target.buffs.find((buff) => buff.id === "frozen")?.stacks, 2);
    const damage = state.eventLog.find((event) => event.type === "damage" && event.targetId === target.id);
    assert.ok(damage?.type === "damage" && damage.elements?.includes("ice") && damage.elements.includes("fire"));
  }
  assert.ok(state.players.slice(4).every((player) => player.hp === 40));
});

check("mountain collapse costs three, is blocked by cake, and retires a stone defender", () => {
  for (const defense of ["cake", "stone"] as const) {
    let state = effectGame("山崩地裂");
    state = settleEffectTurn(revealEffectTurn(state, fusionCast("山崩地裂", { targetId: state.players[1]!.id }),
      [defense === "cake" ? { type: "gain_cake" } : { type: "defense", defense: "stone" }]));
    assert.equal(owner(state).cakes, 37);
    assert.equal(state.players[1]!.status, defense === "stone" ? "dead" : "alive");
    if (defense === "stone") assert.equal(state.players[1]!.defeatLevel, 2);
    else assert.equal(state.players[1]!.hp, 40);
  }
});

check("holy awakening spends x and gains four x, retaining the saint damage-to-zero rule", () => {
  let state = effectGame("圣灵觉醒");
  state.players[1]!.cakes = 1;
  state = settleEffectTurn(revealEffectTurn(state, fusionCast("圣灵觉醒", { stacks: 2 }),
    [{ type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id }]));
  assert.equal(owner(state).cakes, 46);
  assert.equal(owner(state).hp, 0);
});

check("black-white board wins immediately at three or fewer eligible players but not at four", () => {
  const short = effectGame("黑白板");
  assert.equal(short.phase, "finished");
  assert.deepEqual(short.winnerIds, [owner(short).id]);
  let state = effectGame("黑白板", [], 4);
  assert.notEqual(state.phase, "finished");
  state.players[3]!.status = "dead";
  state = advanceActionWindow(state);
  assert.equal(state.phase, "finished");
  assert.deepEqual(state.winnerIds, [owner(state).id]);
});

check("seven-day sun earns and explicitly spends free sun charges, without rewards on a blocked hit", () => {
  let state = effectGame("后羿•七日连珠");
  const action = { ...cast("日"), targetId: state.players[1]!.id };
  state = settleEffectTurn(revealEffectTurn(state, action));
  assert.equal(owner(state).buffs.find((buff) => buff.id === "free_ri")?.stacks, 1);
  state = collecting(state);
  owner(state).cakes = 0;
  assert.equal(getTurnSkillActionCost(owner(state), { ...action, freeStacks: 1 }), 0);
  assert.ok(enumerateLegalAiActions(state, owner(state), state.players.slice(1)).some((candidate) =>
    candidate.type === "skill" && candidate.skillId === action.skillId && candidate.freeStacks === 1));
  state = settleEffectTurn(revealWithResources(state, [{ ...action, freeStacks: 1 }, { type: "defense", defense: "youtiao" }]));
  assert.equal(owner(state).cakes, 0);
  assert.ok(!owner(state).buffs.some((buff) => buff.id === "free_ri" && buff.stacks > 0));
  state = collecting(state);
  assert.equal(validateAction(state, owner(state).id, { ...action, freeStacks: 1 }).ok, false);
});

check("a multi-target sun plan cannot spend the same free charge twice", () => {
  let state = collecting(effectGame("后羿•七日连珠"));
  owner(state).buffs.push({ id: "free_ri", name: "免费日", stacks: 1 });
  const result = validateAction(state, owner(state).id, { actions: state.players.slice(1).map((player) =>
    ({ ...cast("日"), targetId: player.id, freeStacks: 1 })) });
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /免费次数/);
});

check("demon domain permits repeated targets, absorbs three HP every third round, and replaces both materials", () => {
  let state = endWindow(effectGame("魔域"));
  assert.throws(() => submitActionWindowSkill(state, owner(state).id,
    fusionCast("魔域", { targetIds: [state.players[1]!.id, state.players[1]!.id, state.players[2]!.id] })), /第3x轮/);
  state.roundNumber = 3;
  const targets = [state.players[1]!.id, state.players[1]!.id, state.players[2]!.id];
  state = submitActionWindowSkill(state, owner(state).id, fusionCast("魔域", { targetIds: targets }));
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, fusionCast("魔域", { targetIds: targets })), /已经指定/);
  state = closeEffectRound(state);
  assert.deepEqual(state.players.map((player) => player.hp), [43, 38, 39]);
  assert.equal(getActiveSkillCount(owner(state), skill("圣域")), 0);
  assert.equal(getActiveSkillCount(owner(state), skill("邪域")), 0);
});

check("sunlight-night fields affect only their owner's attacks or incoming attacks and keep extra ordinary fields global", () => {
  for (const targetSelf of [false, true]) {
    let state = effectGame("阳光之夜", [], 4);
    state.players[1]!.cakes = 1;
    const victim = targetSelf ? owner(state).id : state.players[2]!.id;
    state = settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" },
      [{ type: "attack", attackId: "sha", stacks: 1, targetId: victim }]));
    assert.equal(state.players.find((player) => player.id === victim)!.hp, targetSelf ? 40 : 39);
  }
  let state = effectGame("阳光之夜", ["阳光普照"], 4);
  state.players[1]!.cakes = 6;
  state = settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" },
    [{ type: "attack", attackId: "he_bao", stacks: 1, targetId: state.players[2]!.id }]));
  assert.equal(state.players[2]!.hp, 40);
});

check("eternal-night blade counts revenge through night erasure without damage and decomposition removes that bonus", () => {
  for (const fused of [true, false]) {
    let state = effectGame("永夜之刃");
    if (!fused) state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
    owner(state).buffs.push({ id: "revenge_hit_count", name: "复仇次数", stacks: 4 },
      { id: `revenge_target:${state.players[1]!.id}`, name: "复仇目标", stacks: 1 });
    state = settleEffectTurn(revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[1]!.id }));
    assert.equal(state.players[1]!.hp, 40);
    assert.equal(owner(state).buffs.find((buff) => buff.id === "revenge_hit_count")?.stacks, fused ? 5 : 4);
    assert.equal(state.phase === "finished", fused);
  }
});

check("critical blade doubles finite attack damage on its server roll and skips spell damage", () => {
  for (const roll of [0.1, 0.9]) {
    let state = effectGame("无尽战刃");
    const random = Math.random;
    try {
      Math.random = () => roll;
      state = settleEffectTurn(revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[1]!.id }));
    } finally { Math.random = random; }
    assert.equal(state.players[1]!.hp, roll < 0.5 ? 38 : 39);
  }
  let spell = endWindow(effectGame("无尽战刃", ["火烧大地"]));
  const random = Math.random;
  try { Math.random = () => 0.1; spell = submitActionWindowSkill(spell, owner(spell).id, cast("火烧大地")); }
  finally { Math.random = random; }
  assert.equal(spell.players[1]!.hp, 39);
});

check("shadow axe heals a quarter rounded down per other-player damage event, excluding its owner's wounds", () => {
  for (const victimSelf of [false, true]) {
    let state = effectGame("暗影战斧");
    state.players[1]!.cakes = 7;
    state = settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" },
      [{ type: "attack", attackId: "sha", stacks: 7, targetId: victimSelf ? owner(state).id : state.players[2]!.id }]));
    assert.equal(owner(state).hp, victimSelf ? 33 : 41);
  }
});

check("shadow sniper retires a zero-cake last-hit victim but leaves a funded victim to ordinary damage", () => {
  for (const cakes of [0, 2]) {
    let state = effectGame("暗影狙击");
    state.players[1]!.cakes = cakes;
    state.players[1]!.skills = [skill("全力一击")];
    state = settleEffectTurn(revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[1]!.id },
      [{ ...cast("全力一击"), targetId: state.players[2]!.id }, { type: "defense", defense: "small" }]));
    assert.equal(state.players[1]!.status, cakes === 0 ? "dead" : "alive");
    if (cakes === 0) assert.equal(state.players[1]!.defeatLevel, 2);
  }
});

check("heaven-fire revives from non-fire fatal damage with three cakes and spends them", () => {
  let state = collecting(effectGame("天火之狱", ["全力一击"]));
  owner(state).hp = 1;
  owner(state).cakes = 3;
  state = settleEffectTurn(revealWithResources(state, [{ ...cast("全力一击"), targetId: state.players[1]!.id },
    { type: "defense", defense: "small" }]));
  assert.equal(owner(state).hp, 6);
  assert.equal(owner(state).status, "alive");
  assert.equal(owner(state).cakes, 0);
});

check("heaven-fire self revival keeps the fusion, its material skills, and the spent hell-overlord counter", () => {
  let state = endWindow(effectGame("天火之狱"));
  const skills = [...owner(state).skills];
  owner(state).hp = -2;
  owner(state).buffs.push({ id: "pending_death", name: "濒死", stacks: 1 });
  state.activeTimingPhase = "revival_action";
  state = submitActionWindowSkill(state, owner(state).id, { ...cast("地狱主宰"), targetId: owner(state).id });
  assert.equal(owner(state).hp, 6);
  assert.deepEqual(owner(state).skills, skills);
  assert.equal(owner(state).skillFusions?.length, 1);
  assert.equal(useCount(owner(state), "地狱主宰"), 1);
});

check("holy awakening at zero HP still takes damage, and later attacks can kill after the first attack sets zero", () => {
  for (const initialHp of [0, 40]) {
    let state = collecting(effectGame("圣灵觉醒"));
    owner(state).hp = initialHp;
    owner(state).cakes = 1;
    state.players[1]!.cakes = 1;
    state.players[2]!.cakes = 1;
    state = settleEffectTurn(revealWithResources(state, [fusionCast("圣灵觉醒"),
      { type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id },
      { type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id }]));
    assert.ok(owner(state).hp < 0);
  }
});

check("sky shield rounds cost down and may send a whole area attack to the sky", () => {
  let state = effectGame("绝对天盾");
  state.players[1]!.cakes = 2;
  state = revealEffectTurn(state, { type: "gain_cake" }, [{ type: "attack", attackId: "wan_jian", stacks: 1 }]);
  owner(state).cakes = 0;
  assert.equal(getAbsoluteGuardCost(owner(state), 2), 0);
  state = submitActionWindowSkill(state, owner(state).id,
    { ...cast("绝对守护"), targetId: state.players[1]!.id, switchActionIndex: 0, absoluteGuardToSky: true });
  const attacker = state.players[1]!;
  attacker.skills.push("skill_21_36332");
  attacker.buffs.push({ id: "pending_lava_mark", name: "待用熔岩印记", stacks: 2 });
  const beforeProjection = structuredClone(state);
  assert.deepEqual(getActionAttackTargetIds(state, attacker.id, state.pendingActions[attacker.id]!.actions[0]!), []);
  assert.deepEqual(toPublicGameState(state, owner(state).id).revealedActionTargets?.[attacker.id]?.[0], []);
  assert.deepEqual(state, beforeProjection, "public target previews must not consume attack marks");
  state = settleEffectTurn(state);
  assert.ok(state.players.every((player) => player.hp === 40));
  assert.equal(owner(state).cakes, 0);
});

check("divine guard charges a quarter rounded down and multiplies cross marks by three", () => {
  let state = effectGame("神域守护");
  assert.equal(getAbsoluteGuardCost(owner(state), 7), 1);
  owner(state).buffs.push({ id: "huyou_mark", name: "护佑", stacks: 1 }, { id: "cross_mark", name: "十字", stacks: 1 });
  state.players[1]!.cakes = 16;
  state = revealEffectTurn(state, { type: "gain_cake" }, [{ type: "attack", attackId: "wan_jian", stacks: 8 }]);
  state = damageWindow(state);
  const ownDamage = state.pendingDamageItems!.find((item) => item.targetId === owner(state).id)!;
  const otherDamage = state.pendingDamageItems!.find((item) => item.targetId === state.players[2]!.id)!;
  state = submitActionWindowSkill(state, owner(state).id, { ...cast("十字守护"), targetDamageId: ownDamage.id });
  assert.equal(state.pendingDamageItems!.find((item) => item.id === ownDamage.id)?.amount, 5);
  state = submitActionWindowSkill(state, owner(state).id, { ...cast("十字守护"), targetDamageId: otherDamage.id });
  const applied = state.eventLog.findLast((event) => event.type === "damage" && event.targetId === state.players[2]!.id);
  assert.equal(state.pendingDamageItems?.find((item) => item.id === otherDamage.id)?.amount ?? (applied?.type === "damage" ? applied.amount : undefined), 48);
});

check("heaven-breaking sword bypasses named shields but retains defense value and dark-shield immunity", () => {
  for (const protection of ["神罩", "闪现", "暗影盾"] as const) {
    let state = effectGame("破天圣剑");
    state.players[1]!.skills = [skill(protection)];
    state = revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: 3, targetId: state.players[1]!.id });
    state = submitActionWindowSkill(state, state.players[1]!.id, cast(protection));
    state = settleEffectTurn(state);
    assert.equal(state.players[1]!.hp, protection === "暗影盾" ? 40 : 37);
  }
  let state = effectGame("破天圣剑");
  state.players[1]!.buffs.push({ id: "defense_value", name: "防御值", stacks: 3 });
  state = settleEffectTurn(revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: 3, targetId: state.players[1]!.id }));
  assert.equal(state.players[1]!.hp, 40);
});

check("heaven-breaking double edge spends two HP to pierce rebound and rejects repeated purchase", () => {
  let state = effectGame("破天圣剑");
  state.players[1]!.cakes = 1;
  state = revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[1]!.id },
    [{ type: "defense", defense: "rebound", targetId: owner(state).id }]);
  const action: SkillAction = { ...cast("双刃剑"), switchActionIndex: 0, doubleEdgeMode: "pierce_rebound" };
  state = submitActionWindowSkill(state, owner(state).id, action);
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, action), /已经使用过/);
  state = settleEffectTurn(state);
  assert.equal(owner(state).hp, 38);
  assert.equal(state.players[1]!.hp, 39);
});

check("army breaker pays one HP for all defended area targets and adds damage only at the HP threshold", () => {
  let state = effectGame("破军");
  state.players[1]!.hp = 2;
  state = revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: 1 },
    [{ type: "defense", defense: "small" }, { type: "defense", defense: "small" }]);
  state = submitActionWindowSkill(state, owner(state).id,
    { ...cast("双刃剑"), switchActionIndex: 0, targetId: state.players[1]!.id, doubleEdgeMode: "ignore_all_defense" });
  state = settleEffectTurn(state);
  assert.equal(owner(state).hp, 39);
  assert.equal(state.players[1]!.hp, 1);
  assert.equal(state.players[2]!.hp, 38);
});

check("echo staff splashes two to neighbors and one to second neighbors, retaining stone splash defense", () => {
  let state = effectGame("回响之杖", [], 6);
  owner(state).buffs.push({ id: `sealed_skill:${skill("乱舞")}`, name: "封印", stacks: 1 });
  state = settleEffectTurn(revealEffectTurn(state, { ...cast("火球"), targetId: state.players[1]!.id }));
  assert.deepEqual(state.players.map((player) => player.hp), [40, 36, 38, 39, 40, 39]);
  let stone = effectGame("回响之杖", [], 6);
  owner(stone).buffs.push({ id: `sealed_skill:${skill("乱舞")}`, name: "封印", stacks: 1 });
  stone = settleEffectTurn(revealEffectTurn(stone, { ...cast("火球"), targetId: stone.players[1]!.id },
    [{ type: "gain_cake" }, { type: "defense", defense: "stone" }, { type: "defense", defense: "stone" }]));
  assert.equal(stone.players[2]!.hp, 40);
  assert.equal(stone.players[3]!.hp, 40);
});

check("sun-chasing bow reveals one material per opponent privately and grants two distinct choices", () => {
  let state = createGame("A", { firstTurnNoAttack: false, skillMode: "test_select", skillCount: 2 });
  for (const name of ["B", "C", "D"]) state = addPlayerToGame(state, createPlayer(name));
  owner(state).skills = [skill("顺手牵羊"), skill("普天同庆")];
  for (const [index, player] of state.players.slice(1).entries()) player.skills = [skill(["火球", "寒冰剑", "藤甲"][index]!)];
  state = startGame(state);
  state = submitPlayerAction(state, owner(state).id, fusionAction("逐日之弓")).state;
  assert.equal(state.pendingSkillChoices?.filter((choice) => choice.playerId === owner(state).id).length, 3);
  assert.equal(getSkillUseLimit(owner(state), skill("顺手牵羊")), 2);
  assert.ok(state.skillKnowledge[owner(state).id]?.[state.players[2]!.id]?.includes(skill("寒冰剑")));
  assert.ok(!JSON.stringify(toPublicGameState(state, state.players[1]!.id).pendingSkillChoices).includes(skill("寒冰剑")));
  for (let i = 0; i < 2; i++) {
    const choice = state.pendingSkillChoices!.find((choice) => choice.playerId === owner(state).id)!;
    state = submitActionWindowSkill(state, owner(state).id, { ...cast("顺手牵羊"), targetSkillId: choice.skillId });
  }
  assert.equal(useCount(owner(state), "顺手牵羊"), 2);
  assert.equal(owner(state).skills.length, 4);
  assert.ok(!toPublicGameState(state, state.players[1]!.id).players[0]!.buffs.some((buff) => buff.id.startsWith("shunshou_taken:")));
});

check("lightning fusion immunes larger attacks and grants one ghost charge per attack, not per stack", () => {
  for (const fused of [true, false]) {
    let state = effectGame("电闪雷鸣");
    if (!fused) owner(state).skillFusions = [];
    state.players[1]!.cakes = 1;
    state.players[2]!.cakes = 3;
    state = settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" }, [
      { type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id },
      { type: "attack", attackId: "sha", stacks: 3, targetId: owner(state).id }
    ]));
    assert.equal(owner(state).hp, 39);
    assert.equal(owner(state).buffs.find((buff) => buff.id === "guidao_charge")?.stacks ?? 0, fused ? 1 : 0);
    assert.deepEqual(state.eventLog.filter((event) => event.type === "damage" && event.targetId === owner(state).id).map((event) => event.amount), [1]);
    assert.equal(owner(state).buffs.find((buff) => buff.id === "damage_taken_round:1")?.stacks, 1);
    assert.equal(toPublicGameState(state, state.players[1]!.id).players[0]!.skillFusions, undefined);
    assert.ok(!JSON.stringify(toPublicGameState(state, state.players[1]!.id)).includes(getFusionSkillId("电闪雷鸣")));
  }
});

check("lightning immunity stops hit rewards, preserves ordinary ghost gains, and respects sealing", () => {
  let state = effectGame("电闪雷鸣");
  state.players[1]!.cakes = 1;
  state.players[2]!.cakes = 3;
  state.players[2]!.skills = [skill("连爆")];
  state = settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" }, [
    { type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id },
    { ...cast("连爆"), targetId: owner(state).id }
  ]));
  assert.equal(state.players[2]!.buffs.find((buff) => buff.id === "free_lian_bao")?.stacks ?? 0, 0);
  for (const sealed of [false, true]) {
    let shield = effectGame("电闪雷鸣");
    if (sealed) owner(shield).buffs.push({ id: `sealed_skill:${getFusionSkillId("电闪雷鸣")}`, name: "封印", stacks: 1 });
    shield.players[1]!.cakes = 3;
    shield = settleEffectTurn(revealEffectTurn(shield, { type: "defense", defense: "small" }, [
      { type: "attack", attackId: "sha", stacks: 3, targetId: owner(shield).id }
    ]));
    assert.equal(owner(shield).buffs.find((buff) => buff.id === "guidao_charge")?.stacks ?? 0, sealed ? 0 : 3);
  }
});

check("lightning body counts multi-hit attacks once, accepts infinity, and leaves spell damage untouched", () => {
  let state = endWindow(effectGame("电闪雷鸣"));
  state.activeTimingPhase = "turn_damage_modify";
  const targetId = owner(state).id;
  state.pendingDamageItems = [
    { id: "low", targetId, amount: 1, fromAttack: true, attackKey: "low-attack", attackPower: 1 },
    { id: "double-1", targetId, amount: 2, fromAttack: true, attackKey: "two-hit-attack", attackPower: 2 },
    { id: "double-2", targetId, amount: 2, fromAttack: true, attackKey: "two-hit-attack", attackPower: 2 },
    { id: "infinity", targetId, amount: 999, fromAttack: true, attackKey: "infinite-attack", attackPower: 999 },
    { id: "spell", targetId, amount: 3, fromAttack: false }
  ];
  state = advanceActionWindow(state);
  assert.equal(owner(state).hp, 36);
  assert.equal(owner(state).buffs.find((buff) => buff.id === "guidao_charge")?.stacks, 2);
});

check("lightning charge survives decomposition and the unenhanced shield still works", () => {
  let state = effectGame("电闪雷鸣");
  owner(state).buffs.push({ id: "guidao_charge", name: "鬼道次数", stacks: 2 });
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  state.players[1]!.cakes = 1;
  state.players[2]!.cakes = 3;
  state = settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" }, [
    { type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id },
    { type: "attack", attackId: "sha", stacks: 3, targetId: owner(state).id }
  ]));
  assert.equal(owner(state).hp, 39);
  assert.equal(owner(state).buffs.find((buff) => buff.id === "guidao_charge")?.stacks, 2);
});

function injuredSoulRepair(extraSkills: string[] = []): GameState {
  let state = effectGame("灵魂修复", extraSkills);
  owner(state).hp = 5;
  state.players[1]!.cakes = 1;
  return settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" }, [
    { type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id }
  ]));
}

function finishRoundBefore(initial: GameState, round: number): GameState {
  const state = endWindow(initial);
  state.roundNumber = round;
  state.activeTimingPhase = "round_before_action";
  owner(state).cakes = 0;
  return advanceActionWindow(state);
}

check("soul repair adds cakes next round-start but waits until that round's end to restore full HP", () => {
  let state = injuredSoulRepair();
  assert.equal(owner(state).hp, 4);
  assert.equal(getActiveSkillCount(owner(state), skill("治愈术")), 0);
  assert.equal(getActiveSkillCount(owner(state), skill("创伤聚合")), 0);
  state = endWindow(state);
  state.roundNumber = 2;
  state.activeTimingPhase = "round_pre_interval_action";
  owner(state).cakes = 0;
  state = advanceActionWindow(state);
  assert.equal(state.activeTimingPhase, "round_before_action");
  assert.equal(owner(state).hp, 4);
  assert.equal(owner(state).cakes, 0);
  state = advanceActionWindow(state);
  assert.equal(state.activeTimingPhase, "turn_before_action");
  assert.equal(owner(state).hp, 4);
  assert.equal(owner(state).cakes, 1);
  assert.ok(owner(state).buffs.some((buff) => buff.id.startsWith("trauma_converge:") && buff.traumaCakePaid));
  state = closeEffectRound(state);
  assert.equal(owner(state).hp, 6);
  assert.ok(state.eventLog.some((event) => event.type === "heal" && event.reason === "灵魂修复" && event.recoveryKind === "full_restore"));
  assert.ok(!owner(state).buffs.some((buff) => buff.id.startsWith("trauma_converge:")));
});

check("soul full restoration ignores blood sorrow while an extra ordinary trauma copy keeps three-round timing", () => {
  let state = injuredSoulRepair(["创伤聚合"]);
  state.players[1]!.skills = [skill("血之哀")];
  state = finishRoundBefore(state, 2);
  assert.equal(owner(state).hp, 4);
  assert.equal(owner(state).cakes, 1);
  state = closeEffectRound(state);
  assert.equal(owner(state).hp, 6);
  assert.ok(owner(state).buffs.some((buff) => buff.id === "trauma_converge:4"));
  state = finishRoundBefore(state, 4);
  assert.equal(owner(state).hp, 6);
  assert.equal(owner(state).cakes, 1);
  state = closeEffectRound(state);
  assert.equal(owner(state).hp, 6);
});

check("soul repair decomposition restores the original remaining wait and does not refill healing-spell uses", () => {
  let state = injuredSoulRepair();
  recordSkillUse(owner(state), skill("治愈术"));
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  state = finishRoundBefore(state, 2);
  assert.equal(owner(state).hp, 4);
  assert.equal(owner(state).cakes, 0);
  state = finishRoundBefore(state, 4);
  assert.equal(owner(state).hp, 4);
  assert.equal(owner(state).cakes, 1);
  state = closeEffectRound(state);
  assert.equal(owner(state).hp, 7);
  assert.equal(useCount(owner(state), "治愈术"), 1);
  assert.equal(getSkillUseLimit(owner(state), skill("治愈术")), 1);
});

check("soul repair preserves holy-bath full HP, consumes each scheduled wound once, and cannot revive a corpse", () => {
  let state = injuredSoulRepair(["沐浴圣光"]);
  owner(state).hp = 1;
  state = finishRoundBefore(state, 2);
  assert.equal(owner(state).hp, 1);
  state = closeEffectRound(state);
  assert.equal(owner(state).hp, 18);
  state = finishRoundBefore(state, 4);
  assert.equal(owner(state).hp, 18);
  assert.equal(owner(state).cakes, 0);
  let corpse = injuredSoulRepair();
  owner(corpse).status = "dead";
  owner(corpse).hp = -2;
  corpse = finishRoundBefore(corpse, 2);
  corpse = closeEffectRound(corpse);
  assert.equal(owner(corpse).status, "dead");
  assert.equal(owner(corpse).hp, -2);
});

check("ordinary trauma pays cakes after round-before actions and heals at the third later round's end", () => {
  let state = game(["创伤聚合"]);
  state.players[1]!.cakes = 1;
  state = settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" }, [
    { type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id }
  ]));
  assert.equal(owner(state).hp, 5);
  for (const round of [2, 3]) {
    state = finishRoundBefore(state, round);
    assert.equal(owner(state).hp, 5);
    assert.equal(owner(state).cakes, 0);
    state = closeEffectRound(state);
    assert.equal(owner(state).hp, 5);
  }
  state = finishRoundBefore(state, 4);
  assert.equal(owner(state).hp, 5);
  assert.equal(owner(state).cakes, 1);
  state = closeEffectRound(state);
  assert.equal(owner(state).hp, 8);
});

check("two wounds create two next-round cake rewards and only one full recovery per scheduled trigger", () => {
  let state = effectGame("灵魂修复");
  owner(state).hp = 5;
  state.players[1]!.cakes = 1;
  state.players[2]!.cakes = 1;
  state = settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" }, [
    { type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id },
    { type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id }
  ]));
  assert.equal(owner(state).hp, 3);
  state = finishRoundBefore(state, 2);
  assert.equal(owner(state).hp, 3);
  assert.equal(owner(state).cakes, 2);
  state = closeEffectRound(state);
  assert.equal(owner(state).hp, 6);
  state = finishRoundBefore(state, 4);
  assert.equal(owner(state).hp, 6);
  assert.equal(owner(state).cakes, 0);
});

check("soul repair never heals at an ordinary turn end while its due round is still continuing", () => {
  let state = finishRoundBefore(injuredSoulRepair(), 2);
  const end = endWindow(state);
  end.turnResolutionStarted = true;
  end.turnHealthChanged = false;
  state = advanceActionWindow(end);
  assert.equal(state.roundNumber, 2);
  assert.equal(state.activeTimingPhase, "turn_after_interval_action");
  assert.equal(owner(state).hp, 4);
  assert.equal(owner(state).cakes, 1);
  state = closeEffectRound(state);
  assert.equal(owner(state).hp, 6);
});

check("decomposing after the early cake payout preserves it without paying again at the restored due round", () => {
  let state = finishRoundBefore(injuredSoulRepair(), 2);
  assert.equal(owner(state).cakes, 1);
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  state = closeEffectRound(state);
  assert.equal(owner(state).hp, 4);
  state = finishRoundBefore(state, 4);
  assert.equal(owner(state).cakes, 0);
  state = closeEffectRound(state);
  assert.equal(owner(state).hp, 7);
});

check("soul full recovery and sanctuary run at the same round-end point without erasing sanctuary's bonus", () => {
  let state = effectGame("灵魂修复", ["圣域"]);
  state.roundNumber = 2;
  owner(state).hp = 5;
  state.players[1]!.cakes = 1;
  state = settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" }, [
    { type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id }
  ]));
  state = finishRoundBefore(state, 3);
  assert.equal(owner(state).hp, 4);
  state = closeEffectRound(state);
  assert.equal(owner(state).hp, 9);
  const heals = state.eventLog.filter((event) => event.type === "heal" && event.targetId === owner(state).id && event.roundNumber === 3);
  assert.deepEqual(heals.map((event) => event.type === "heal" ? event.reason : ""), ["灵魂修复", "圣域"]);
});

check("full revival and absolute-value revival bypass blood sorrow without becoming ordinary healing", () => {
  for (const protection of ["治愈术", "天佑之魂", "绝对值", "浴火重生", "地狱主宰"] as const) {
    let state = collecting(game([protection]));
    owner(state).hp = 1;
    owner(state).cakes = 4;
    state.players[1]!.cakes = 3;
    state.players[1]!.skills = [skill("血之哀")];
    state = submitPlayerAction(state, owner(state).id, { type: "gain_cake" }).state;
    state = submitPlayerAction(state, state.players[1]!.id, { type: "attack", attackId: "sha", stacks: 3, targetId: owner(state).id }).state;
    for (let guard = 0; state.phase === "action_window" && !["revival_action", "turn_end_action"].includes(state.activeTimingPhase) && guard < 20; guard++) state = advanceActionWindow(state);
    if (["治愈术", "天佑之魂", "地狱主宰"].includes(protection)) {
      assert.equal(state.activeTimingPhase, "revival_action");
      state = submitActionWindowSkill(state, owner(state).id, { ...cast(protection), ...(protection === "地狱主宰" ? { targetId: owner(state).id } : {}) });
    }
    assert.equal(owner(state).status, "alive");
    assert.equal(owner(state).hp, protection === "绝对值" ? 2 : protection === "天佑之魂" ? 8 : 6);
    if (protection !== "绝对值") assert.ok(state.eventLog.some((event) => event.type === "heal" && event.reason === protection && event.recoveryKind === "revival"));
  }
});

check("wither accepts positive integer choices only during opening and preserves other players' completed preparation", () => {
  const original = game(["血之哀", "衰竭"]);
  original.actionWindowPassPlayerIds.push(original.players[1]!.id);
  const state = chooseWitherNumber(original, owner(original).id, 0, 2);
  assert.equal(getWitherNumber(owner(state)), 2);
  assert.equal(getWitherNumber(owner(original)), 1);
  assert.equal(owner(state).cakes, 0);
  assert.deepEqual(state.pendingActions, {});
  assert.ok(state.actionWindowPassPlayerIds.includes(state.players[1]!.id));
  for (const value of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "2", null]) {
    assert.throws(() => chooseWitherNumber(original, owner(original).id, 0, value as number), /正整数/);
  }
  for (const index of [-1, 0.5, 1000000]) assert.throws(() => chooseWitherNumber(original, owner(original).id, index, 2), /位置/);
  const passed = structuredClone(state);
  passed.actionWindowPassPlayerIds.push(owner(passed).id);
  assert.throws(() => chooseWitherNumber(passed, owner(passed).id, 0, 3), /结束开局准备/);
  const started = collecting(state);
  assert.throws(() => chooseWitherNumber(started, owner(started).id, 0, 3), /开局准备/);
});

function witherGame(value = 2, extras: string[] = []): GameState {
  const state = effectGame("枯萎", extras);
  return chooseWitherNumber(state, owner(state).id, 0, value);
}

check("wither matches final power or level by equality, never decimal digits or costs", () => {
  const state = witherGame();
  const source = state.players[1]!.id;
  const attack = getStackedAttackStats(BASE_ATTACKS.shan_dian, 3);
  assert.equal(attack.power, 12);
  assert.equal(attack.level, 12);
  assert.equal(getAttackFieldBlocker(state, source, attack), undefined);
  assert.ok(getAttackFieldBlocker(state, source, { ...attack, power: 2 }));
  assert.ok(getAttackFieldBlocker(state, source, { ...attack, level: 2 }));
  assert.equal(getAttackFieldBlocker(state, source, { ...attack, cost: 2 }), undefined);
  assert.ok(getAttackFieldBlocker(state, source, { ...attack, level: 0 }));
  assert.ok(getAttackFieldBlocker(state, source, { ...attack, power: 999 }));
});

check("the real resolver erases two sha but allows a twelve-power twelve-level triple lightning", () => {
  for (const [attackId, stacks, damage] of [["sha", 2, 0], ["shan_dian", 3, 12]] as const) {
    let state = witherGame();
    state.players[1]!.cakes = 12;
    state = settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" }, [
      { type: "attack", attackId, stacks, targetId: owner(state).id }
    ]));
    assert.equal(owner(state).hp, 40 - damage);
    if (damage === 0) {
      assert.ok(owner(state).revealedSkillIds.includes(skill("衰竭")));
      assert.ok(!owner(state).revealedSkillIds.includes(getFusionSkillId("枯萎")));
    }
  }
});

check("wither uses the modified qin level and leaves ordinary decay behavior intact", () => {
  for (const [skills, damage] of [[[], 0], [["神族水晶"], 3], [["朱雀羽扇"], 4], [["神族水晶", "朱雀羽扇"], 4]] as const) {
    let state = witherGame(7);
    state.players[1]!.skills = skills.map(skill);
    state.players[1]!.cakes = 1;
    state = settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" }, [
      { type: "attack", attackId: "qin", stacks: 1, targetId: owner(state).id }
    ]));
    assert.equal(owner(state).hp, 40 - damage);
  }
  let state = witherGame(2);
  state.players[1]!.skills = [skill("神族水晶")];
  state.players[1]!.cakes = 1;
  state = settleEffectTurn(revealEffectTurn(state, { type: "gain_cake" }, [
    { type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id }
  ]));
  assert.equal(owner(state).hp, 40);
  let costOnly = witherGame(1);
  costOnly.players[1]!.skills = [skill("朱雀羽扇"), skill("神族水晶")];
  costOnly.players[1]!.cakes = 1;
  costOnly = settleEffectTurn(revealEffectTurn(costOnly, { type: "gain_cake" }, [
    { type: "attack", attackId: "qin", stacks: 1, targetId: owner(costOnly).id }
  ]));
  assert.equal(owner(costOnly).hp, 36);
});

check("wither is global including its owner and retains blood sorrow's ordinary healing suppression", () => {
  let state = witherGame(2, ["酒", "霜落大地"]);
  state = settleEffectTurn(revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[1]!.id }));
  assert.equal(state.players[1]!.hp, 40);
  state = submitActionWindowSkill(endWindow(state), owner(state).id, cast("霜落大地"));
  assert.equal(owner(state).hp, 40);
  assert.equal(state.players[1]!.hp, 40);
});

check("opening choices alone have no aura and paid later fusion uses the locked choice", () => {
  let state = game(["血之哀", "衰竭"]);
  state = chooseWitherNumber(state, owner(state).id, 0, 2);
  const stats = getStackedAttackStats(BASE_ATTACKS.sha, 2);
  assert.equal(getAttackFieldBlocker(state, state.players[1]!.id, stats), undefined);
  state = collecting(state);
  owner(state).cakes = 2;
  state.players[1]!.cakes = 2;
  state = submitPlayerAction(state, owner(state).id, fusionAction("枯萎")).state;
  assert.equal(owner(state).skillFusions, undefined);
  state = submitPlayerAction(state, state.players[1]!.id, { type: "attack", attackId: "sha", stacks: 2, targetId: owner(state).id }).state;
  state = settleEffectTurn(state);
  assert.equal(owner(state).cakes, 0);
  assert.equal(owner(state).hp, 6);
  assert.equal(owner(state).skillFusions![0]!.witherSelectionIndex, 0);
  assert.equal(getWitherNumber(owner(state)), 2);
  assert.throws(() => chooseWitherNumber(state, owner(state).id, 0, 3), /开局准备/);
});

check("each wither copy has its own opening number and decomposition preserves the choices", () => {
  let state = game(["血之哀", "衰竭", "血之哀", "衰竭"]);
  state = chooseWitherNumber(state, owner(state).id, 0, 2);
  state = chooseWitherNumber(state, owner(state).id, 1, 3);
  state = submitPlayerAction(state, owner(state).id, fusionAction("枯萎")).state;
  state = submitPlayerAction(state, owner(state).id, fusionAction("枯萎")).state;
  assert.deepEqual(owner(state).skillFusions!.map((fusion) => fusion.witherSelectionIndex), [0, 1]);
  const stats = getStackedAttackStats(BASE_ATTACKS.shan_dian, 3);
  assert.ok(getAttackFieldBlocker(state, state.players[1]!.id, { ...stats, power: 2 }));
  assert.ok(getAttackFieldBlocker(state, state.players[1]!.id, { ...stats, power: 3 }));
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  assert.equal(getAttackFieldBlocker(state, state.players[1]!.id, { ...stats, power: 2 }), undefined);
  assert.ok(getAttackFieldBlocker(state, state.players[1]!.id, { ...stats, power: 3 }));
  assert.deepEqual(owner(state).witherSelections, [2, 3]);
  assert.equal(getNextWitherSelectionIndex(owner(state)), 0);
  state = collecting(state);
  owner(state).cakes = 2;
  state = submitPlayerAction(state, owner(state).id, fusionAction("枯萎")).state;
  state = submitPlayerAction(state, state.players[1]!.id, { type: "gain_cake" }).state;
  assert.deepEqual(owner(state).skillFusions!.map((fusion) => fusion.witherSelectionIndex), [1, 0]);
  assert.deepEqual(owner(state).witherSelections, [2, 3]);
});

check("wither's default is one and seals, material seals and death disable the extra field", () => {
  const initial = effectGame("枯萎");
  assert.equal(getWitherNumber(owner(initial)), 1);
  const stats = getStackedAttackStats(BASE_ATTACKS.sha, 1);
  assert.ok(getAttackFieldBlocker(initial, initial.players[1]!.id, stats));
  for (const seal of [getFusionSkillId("枯萎"), skill("衰竭")]) {
    const state = structuredClone(initial);
    owner(state).buffs.push({ id: `sealed_skill:${seal}`, name: "封印", stacks: 1 });
    assert.equal(getAttackFieldBlocker(state, state.players[1]!.id, stats), undefined);
  }
  owner(initial).status = "dead";
  assert.equal(getAttackFieldBlocker(initial, initial.players[1]!.id, stats), undefined);
});

check("wither choices and their setup log remain private, including hidden-cake projections", () => {
  const state = witherGame(73);
  for (const hide of [false, true]) {
    state.config.hideCakeCounts = hide;
    const self = toPublicGameState(state, owner(state).id);
    const other = toPublicGameState(state, state.players[1]!.id);
    assert.equal(self.players[0]!.witherSelections?.[0], 73);
    assert.equal(other.players[0]!.witherSelections, undefined);
    assert.equal(other.players[0]!.skillFusions, undefined);
    assert.ok(!JSON.stringify(other).includes("开局选数"));
    assert.ok(!JSON.stringify(other).includes(getFusionSkillId("枯萎")));
  }
});

function moonGame(extraSkills: string[] = []): GameState {
  const state = effectGame("辉月", extraSkills);
  state.roundTurnNumber = 3;
  return state;
}

check("moon replaces flash, retains divine protection, and cancels the revealed attack with an exact refund", () => {
  let state = moonGame();
  assert.equal(getActiveSkillCount(owner(state), skill("神之庇护")), 1);
  assert.equal(getActiveSkillCount(owner(state), skill("闪现")), 0);
  state = revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: 3, targetId: state.players[1]!.id });
  assert.equal(owner(state).cakes, 37);
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, cast("闪现")), /融合替代/);
  state = submitActionWindowSkill(state, owner(state).id, fusionCast("辉月"));
  assert.equal(owner(state).cakes, 40);
  assert.deepEqual(state.pendingActions[owner(state).id]?.actions, []);
  assert.deepEqual(state.turnActionCosts?.[owner(state).id], []);
  assert.ok(!owner(state).buffs.some((buff) => buff.id === "used_attack_round:1"));
  assert.ok(state.eventLog.some((event) => event.type === "action_cancelled" && event.playerId === owner(state).id));
  assert.ok(!JSON.stringify(toPublicGameState(state, state.players[1]!.id)).includes("turnActionReceipts"));
  state = settleEffectTurn(state);
  assert.equal(state.players[1]!.hp, 40);
});

check("moon reverses cake and saint gains and refunds cakes consumed by rebound", () => {
  for (const actionType of ["gain", "saint", "rebound"] as const) {
    let state = moonGame(actionType === "saint" ? ["圣"] : []);
    const action: PlayerAction = actionType === "gain" ? { type: "gain_cake" } : actionType === "saint" ? cast("圣") :
      { type: "defense", defense: "rebound", targetId: state.players[1]!.id };
    state = revealEffectTurn(state, action);
    state = submitActionWindowSkill(state, owner(state).id, fusionCast("辉月"));
    assert.equal(owner(state).cakes, 40);
    assert.deepEqual(state.pendingActions[owner(state).id]?.actions, []);
  }
});

check("moon refunds discounted and fractional prices without refunding unrelated window costs", () => {
  for (const [extra, action, expectedPaid] of [
    [["核反应堆"], { type: "attack", attackId: "he_bao", stacks: 1 }, 3],
    [["普天同庆"], { type: "attack", attackId: "qin", stacks: 1 }, 0.5]
  ] as const) {
    let state = moonGame([...extra]);
    state = revealEffectTurn(state, { ...action, targetId: state.players[1]!.id });
    assert.equal(owner(state).cakes, 40 - expectedPaid);
    state = submitActionWindowSkill(state, owner(state).id, fusionCast("辉月"));
    assert.equal(owner(state).cakes, 40);
  }
  let state = moonGame(["绝对守护"]);
  state.players[1]!.cakes = 2;
  state = revealEffectTurn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[1]!.id }, [
    { type: "attack", attackId: "sha", stacks: 2, targetId: owner(state).id }
  ]);
  state = submitActionWindowSkill(state, owner(state).id, { ...cast("绝对守护"), targetId: state.players[1]!.id, switchActionIndex: 0 });
  assert.equal(owner(state).cakes, 38);
  state = submitActionWindowSkill(state, owner(state).id, fusionCast("辉月"));
  assert.equal(owner(state).cakes, 39);
  assert.ok(state.players[1]!.buffs.some((buff) => buff.id.startsWith("absolute_guard:")));
});

check("cancelling a limited or resource attack restores its use and earned charges", () => {
  for (const name of ["卷子", "鬼道", "连爆"] as const) {
    let state = moonGame([name]);
    if (name === "鬼道") owner(state).buffs.push({ id: "guidao_charge", name: "鬼道次数", stacks: 1 });
    if (name === "连爆") owner(state).buffs.push({ id: "free_lian_bao", name: "免费连爆", stacks: 1 });
    state = revealEffectTurn(state, { ...cast(name), targetId: state.players[1]!.id, ...(name === "连爆" ? { freeStacks: 1 } : {}) });
    state = submitActionWindowSkill(state, owner(state).id, fusionCast("辉月"));
    if (name === "卷子") assert.equal(useCount(owner(state), name), 0);
    if (name === "鬼道") assert.equal(owner(state).buffs.find((buff) => buff.id === "guidao_charge")?.stacks, 1);
    if (name === "连爆") assert.equal(owner(state).buffs.find((buff) => buff.id === "free_lian_bao")?.stacks, 1);
    state = settleEffectTurn(state);
    assert.equal(state.players[1]!.status, "alive");
    assert.equal(state.players[1]!.hp, 40);
  }
});

check("moon suppresses the current and next turn then restores manual action on the third turn", () => {
  let state = moonGame();
  state.players[1]!.cakes = 3;
  state = revealEffectTurn(state, { type: "gain_cake" }, [
    { type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id }
  ]);
  const usedTurn = state.turnNumber;
  state = submitActionWindowSkill(state, owner(state).id, fusionCast("辉月"));
  assert.throws(() => submitActionWindowSkill(state, owner(state).id, fusionCast("辉月")), /冷却|已经使用/);
  state = collecting(settleEffectTurn(state));
  assert.equal(state.turnNumber, usedTurn + 1);
  assert.equal(owner(state).hp, 40);
  assert.ok(isHuiyueActive(owner(state), state.turnNumber));
  assert.deepEqual(state.pendingActions[owner(state).id]?.actions, []);
  assert.throws(() => submitPlayerAction(state, owner(state).id, { type: "gain_cake" }), /辉月/);
  assert.throws(() => submitPlayerAction(state, owner(state).id, { type: "defense", defense: "self_destruct" }), /辉月/);
  state = submitPlayerAction(state, state.players[1]!.id, { type: "attack", attackId: "sha", stacks: 1, targetId: owner(state).id }).state;
  state = submitPlayerAction(state, state.players[2]!.id, { type: "gain_cake" }).state;
  state = settleEffectTurn(state);
  assert.equal(owner(state).hp, 40);
  assert.ok(isHuiyueActive(owner(state), state.turnNumber));
  state = collecting(state);
  assert.equal(state.turnNumber, usedTurn + 2);
  assert.equal(isHuiyueActive(owner(state), state.turnNumber), false);
  assert.equal(state.pendingActions[owner(state).id], undefined);
  assert.equal(validateAction(state, owner(state).id, { type: "gain_cake" }).ok, true);
});

check("moon ignores armor-piercing flags and blocks infinite ordinary attack damage", () => {
  for (const armor of ["青釭剑", "破天圣剑", "infinite"] as const) {
    let state = moonGame();
    if (armor === "青釭剑") state.players[1]!.skills = [skill("青釭剑")];
    if (armor === "破天圣剑") {
      state.players[1]!.skills = [...recipe("破天圣剑").materialOptions[0]!];
      state = submitPlayerAction(state, state.players[1]!.id, fusionAction("破天圣剑")).state;
    }
    state.players[1]!.cakes = 14;
    state = revealEffectTurn(state, { type: "gain_cake" }, [
      { type: "attack", attackId: armor === "infinite" ? "miao_sha" : "sha", stacks: 1, targetId: owner(state).id }
    ]);
    state = submitActionWindowSkill(state, owner(state).id, fusionCast("辉月"));
    state = settleEffectTurn(state);
    assert.equal(owner(state).hp, 40);
    assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.protectionName === "辉月"));
  }
});

check("moon does not block spell damage and remains active when that damage ends a round", () => {
  let state = moonGame();
  state.players[1]!.skills = [skill("火烧大地")];
  state = revealEffectTurn(state, { type: "gain_cake" });
  state = submitActionWindowSkill(state, owner(state).id, fusionCast("辉月"));
  state = submitActionWindowSkill(state, state.players[1]!.id, cast("火烧大地"));
  state = settleEffectTurn(state);
  assert.equal(owner(state).hp, 39);
  state = collecting(state);
  assert.equal(state.roundNumber, 2);
  assert.ok(isHuiyueActive(owner(state), state.turnNumber));
  assert.deepEqual(state.pendingActions[owner(state).id]?.actions, []);
});

check("moon cannot prevent a retirement effect", () => {
  let state = moonGame();
  state.players[1]!.skills = [skill("卷子")];
  state = revealEffectTurn(state, { type: "gain_cake" }, [{ ...cast("卷子"), targetId: owner(state).id }]);
  state = submitActionWindowSkill(state, owner(state).id, fusionCast("辉月"));
  state = settleEffectTurn(state);
  assert.equal(owner(state).status, "dead");
  assert.equal(owner(state).defeatLevel, 2);
});

check("moon inherits an existing flash cooldown and decomposition restores its longer remaining baseline", () => {
  let state = game(["神之庇护", "闪现"]);
  owner(state).buffs.push({ id: "flash_dodge_cooldown:old", name: "闪现冷却", stacks: 1, expiresAtRound: 4 });
  state = submitPlayerAction(state, owner(state).id, fusionAction("辉月")).state;
  assert.equal(getHuiyueCooldownCount(owner(state), 1), 1);
  assert.equal(getHuiyueCooldownCount(owner(state), 2), 1);
  assert.equal(getHuiyueCooldownCount(owner(state), 3), 0);
  const record = structuredClone(owner(state).buffs);
  state = decomposeSkill(endWindow(state), owner(state).id, owner(state).skillFusions![0]!.id);
  assert.deepEqual(owner(state).buffs, record);
  assert.equal(getFlashDodgeCooldownCount(owner(state), 3), 1);
  assert.equal(getFlashDodgeCooldownCount(owner(state), 4), 0);
});

check("a cast moon has its own cooldown slot alongside an extra ordinary flash", () => {
  let state = moonGame(["闪现"]);
  state = revealEffectTurn(state, { type: "gain_cake" });
  state = submitActionWindowSkill(state, owner(state).id, fusionCast("辉月"));
  assert.equal(getHuiyueCooldownCount(owner(state), 1), 1);
  assert.equal(getFlashDodgeCooldownCount(owner(state), 1), 0);
  state = submitActionWindowSkill(state, owner(state).id, cast("闪现"));
  assert.equal(getFlashDodgeCooldownCount(owner(state), 1), 1);
  assert.equal(getHuiyueCooldownCount(owner(state), 2), 1);
  assert.equal(getHuiyueCooldownCount(owner(state), 3), 0);
  assert.equal(getFlashDodgeCooldownCount(owner(state), 3), 1);
  assert.equal(getFlashDodgeCooldownCount(owner(state), 4), 0);
});

check("moon cannot be used outside turn-change, while sealed, or through control prohibition", () => {
  for (const mode of ["timing", "seal", "jingu"] as const) {
    let state = moonGame();
    state = revealEffectTurn(state, { type: "gain_cake" });
    if (mode === "timing") state.activeTimingPhase = "turn_end_action";
    if (mode === "seal") owner(state).buffs.push({ id: `sealed_skill:${getFusionSkillId("辉月")}`, name: "封印", stacks: 1 });
    if (mode === "jingu") state.players[1]!.skills = [skill("禁锢")];
    assert.equal(validateActionWindowSkill(state, owner(state).id, fusionCast("辉月")).ok, false);
  }
});

check("decomposition does not erase an already-cast moon or let the player bypass its no-action turn", () => {
  let state = moonGame();
  state = revealEffectTurn(state, { type: "gain_cake" });
  state = submitActionWindowSkill(state, owner(state).id, fusionCast("辉月"));
  state = settleEffectTurn(state);
  state = decomposeSkill(state, owner(state).id, owner(state).skillFusions![0]!.id);
  state = collecting(state);
  assert.ok(isHuiyueActive(owner(state), state.turnNumber));
  assert.deepEqual(state.pendingActions[owner(state).id]?.actions, []);
  assert.equal(getFlashDodgeCooldownCount(owner(state), state.roundNumber), 1);
});

check("moon cancels every attack in a multi-target plan and refunds the complete paid sum", () => {
  let state = collecting(moonGame());
  owner(state).cakes = 10;
  state = submitPlayerAction(state, owner(state).id, { actions: [
    { type: "attack", attackId: "sha", stacks: 2, targetId: state.players[1]!.id },
    { type: "attack", attackId: "shan_dian", stacks: 1, targetId: state.players[2]!.id }
  ] }).state;
  state = submitPlayerAction(state, state.players[1]!.id, { type: "gain_cake" }).state;
  state = submitPlayerAction(state, state.players[2]!.id, { type: "gain_cake" }).state;
  assert.equal(owner(state).cakes, 4);
  state = submitActionWindowSkill(state, owner(state).id, fusionCast("辉月"));
  assert.equal(owner(state).cakes, 10);
  state = settleEffectTurn(state);
  assert.ok(state.players.every((player) => player.hp === 40));
});

check("moon remains active at the second turn's end-action window and leaves a late spell unblocked", () => {
  let state = moonGame();
  state.players[1]!.skills = [skill("火烧大地")];
  state = revealEffectTurn(state, { type: "gain_cake" });
  state = submitActionWindowSkill(state, owner(state).id, fusionCast("辉月"));
  state = collecting(settleEffectTurn(state));
  state = submitPlayerAction(state, state.players[1]!.id, { type: "gain_cake" }).state;
  state = submitPlayerAction(state, state.players[2]!.id, { type: "gain_cake" }).state;
  state = settleEffectTurn(state);
  assert.ok(isHuiyueActive(owner(state), state.turnNumber));
  state = submitActionWindowSkill(state, state.players[1]!.id, cast("火烧大地"));
  assert.equal(owner(state).hp, 39);
  assert.ok(state.players[2]!.hp < 40);
});

check("cancelling a fusion action removes its new cover while retaining the processed request ledger", () => {
  let state = collecting(moonGame(["神罩", "鬼罩"]));
  owner(state).cakes = 2;
  const action = fusionAction("幻境双罩");
  state = submitPlayerAction(state, owner(state).id, action).state;
  state = submitPlayerAction(state, state.players[1]!.id, { type: "gain_cake" }).state;
  state = submitPlayerAction(state, state.players[2]!.id, { type: "gain_cake" }).state;
  assert.equal(owner(state).skillFusions!.length, 2);
  state = submitActionWindowSkill(state, owner(state).id, fusionCast("辉月"));
  assert.equal(owner(state).skillFusions!.length, 1);
  assert.equal(owner(state).cakes, 2);
  assert.equal(getSkillUseLimit(owner(state), skill("神罩")), 3);
  assert.ok(owner(state).fusionRequestIds?.includes(action.fusionRequestId!));
});

console.log(`fusion checks passed (${passed})`);
