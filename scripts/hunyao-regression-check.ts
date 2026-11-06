import assert from "node:assert/strict";
import {
  CHASE_LIGHT_ID, CHASE_SHADOW_ID, CHASE_SOUL_ID, ETERNAL_NIGHT_SKILL_ID, FENTIAN_ATTACK_ID, KUISHI_ID,
  GameState, HUNYAO_QUEUED_SHA, PlayerAction, RI_SKILL_ID, SUNSHINE_SKILL_ID, SkillTimingPhase,
  addPlayerToGame, appendSkillInstances, beginActionPrompt, createGame, createPlayer, getActiveSkillCount,
  getActiveFusionCount, getFusionSkillId, getHunyaoExpandedTargets, getStackedAttackStats, BASE_ATTACKS,
  grantInitializedSkill, getSkillUseLimit,
  passActionWindow, previewPlayerAttackStats, removeBigCardInstance, startGame,
  submitActionWindowSkill, submitPlayerAction, toPublicGameState, updateInitialPlayerSnapshot, restorePlayerInitialState
} from "@bing/shared";
import { changeCakes } from "../packages/shared/src/engine/cakeResources";

const cake: PlayerAction = { type: "gain_cake" };
const small: PlayerAction = { type: "defense", defense: "small" };
const holyBath = "skill_67_31717";
const player = (state: GameState, index = 0) => state.players[index]!;
const sha = (state: GameState, target: number): PlayerAction => ({
  type: "attack", attackId: "sha", targetId: player(state, target).id, stacks: 1
});

function advance(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let step = 0; step < 60 && state.phase === "action_window" && state.activeTimingPhase !== stop; step++) {
    const next = state.players.find((item) => item.status === "alive" && !state.actionWindowPassPlayerIds.includes(item.id));
    assert.ok(next, state.activeTimingPhase);
    state = passActionWindow(state, next.id);
  }
  return state;
}

function fixture(hostCards = ["10502"], guestCards: string[] = []): GameState {
  let state = createGame("A", { skillMode: "big_test_select", skillCount: 2, firstTurnNoAttack: false });
  for (const name of ["B", "C", "D"]) state = addPlayerToGame(state, createPlayer(name));
  for (const [index, ids] of [hostCards, guestCards].entries()) {
    player(state, index).bigCards = ids.map((cardId) => ({ instanceId: `card-${index}-${cardId}`, cardId }));
  }
  state = advance(startGame(state));
  for (const item of state.players) item.hp = 50;
  return state;
}

function turn(state: GameState, actions: PlayerAction[], stop: SkillTimingPhase = "turn_end_action"): GameState {
  for (const [index, item] of state.players.entries()) {
    if (item.status === "alive") state = submitPlayerAction(state, item.id, actions[index] ?? cake).state;
  }
  return advance(state, stop);
}

function defeat(state: GameState, index: number, level: 1 | 2 | 3 | 4 | 5): void {
  Object.assign(player(state, index), { status: "dead", defeatLevel: level, hp: -1 });
}

function pursue(state: GameState, skillId: string, index: number, random = 0.1): GameState {
  const original = Math.random;
  try {
    Math.random = () => random;
    return submitActionWindowSkill(state, player(state).id,
      { type: "skill", skillId, stacks: 1, targetId: player(state, index).id });
  } finally {
    Math.random = original;
  }
}

const hits = (state: GameState, attackName: string) => state.eventLog
  .filter((event) => event.type === "damage" && event.attackName === attackName)
  .map((event) => event.type === "damage" ? [event.targetId, event.amount] : []);

const checks: Array<[string, () => void]> = [
  ["单攻转为群攻，发出者不入列，魂耀持有者免除命中", () => {
    let state = fixture();
    player(state, 1).cakes = 1;
    state = turn(state, [cake, sha(state, 0)]);
    assert.deepEqual(hits(state, "杀"), [[player(state, 2).id, 1], [player(state, 3).id, 1]]);
  }],
  ["反弹来的单攻正常命中，发出者与其他玩家不被群攻", () => {
    let state = fixture();
    player(state, 1).cakes = player(state, 2).cakes = 3;
    state = turn(state, [cake, sha(state, 2), { type: "defense", defense: "rebound", targetId: player(state).id }]);
    assert.deepEqual(hits(state, "杀"), [[player(state).id, 1]]);
  }],
  ["打向自己的单攻不扩散，电击法术能给魂耀持有者挂麻痹", () => {
    let state = fixture();
    const host = player(state);
    assert.equal(getHunyaoExpandedTargets(state, host.id, getStackedAttackStats(BASE_ATTACKS.sha, 1), [host.id]), undefined);
    appendSkillInstances(player(state, 1), ["skill_36_14343", "skill_54_99719"]);
    player(state, 1).cakes = 10;
    state = turn(state, [cake, { type: "skill", skillId: "skill_36_14343", stacks: 1,
      targetIds: [host.id, player(state, 2).id] }]);
    assert.ok(player(state).buffs.some((buff) => buff.id.startsWith("paralysis_next_action:")));
    assert.ok(player(state, 2).buffs.some((buff) => buff.id.startsWith("paralysis_next_action:")));
    assert.ok(!player(state, 3).buffs.some((buff) => buff.id.startsWith("paralysis_next_action:")));
  }],
  ["阳光普照实际发放，日变成攻4的群攻，群攻等级三倍", () => {
    let state = fixture();
    assert.equal(getActiveSkillCount(player(state), SUNSHINE_SKILL_ID), 1);
    assert.equal(getActiveFusionCount(player(state), "破晓"), 1);
    assert.equal(getActiveSkillCount(player(state), RI_SKILL_ID), 1);
    appendSkillInstances(player(state, 1), [ETERNAL_NIGHT_SKILL_ID]);
    player(state).cakes = 2;
    const ri: PlayerAction = { type: "skill", skillId: RI_SKILL_ID, stacks: 1 };
    state = turn(state, [ri], "turn_change_action");
    const stats = previewPlayerAttackStats(state, player(state).id).stats[0]!;
    assert.equal(stats.power, 4);
    assert.equal(stats.level, 12);
    state = advance(state, "turn_end_action");
    assert.deepEqual(hits(state, "日"), [1, 2, 3].map((index) => [player(state, index).id, 4]));
  }],
  ["魂耀九州首发三重日攻15，下一重免费日攻7，群攻不额外计重", () => {
    let state = fixture();
    player(state).cakes = 3;
    const ri = { type: "skill", skillId: RI_SKILL_ID, stacks: 3 } as const;
    state = turn(state, [ri], "turn_change_action");
    const preview = previewPlayerAttackStats(toPublicGameState(state, player(state).id), player(state).id).stats[0]!;
    assert.equal(preview.power, 15);
    assert.equal(preview.level, 36);
    state = advance(state, "turn_end_action");
    assert.deepEqual(hits(state, "日").map(([, amount]) => amount), [15, 15, 15]);
    assert.equal(player(state).buffs.find(({ id }) => id === `skill_used:${RI_SKILL_ID}`)?.stacks, 3);
    state = advance(state);
    assert.equal(player(state).cakes, 0);
    state = turn(state, [{ ...ri, stacks: 1, freeStacks: 1 }], "turn_change_action");
    assert.equal(previewPlayerAttackStats(state, player(state).id).stats[0]?.power, 7);
    state = advance(state, "turn_end_action");
    assert.deepEqual(hits(state, "日").slice(-3).map(([, amount]) => amount), [7, 7, 7]);
    assert.equal(player(state).buffs.find(({ id }) => id === `skill_used:${RI_SKILL_ID}`)?.stacks, 4);
  }],
  ["获得破晓之前被油条防住的日仍计入，移除魂耀九州只收回它发放的破晓", () => {
    let state = fixture([]);
    appendSkillInstances(player(state), [RI_SKILL_ID]);
    player(state).cakes = 1;
    const ri = { type: "skill", skillId: RI_SKILL_ID, stacks: 1, targetId: player(state, 1).id } as const;
    state = turn(state, [ri, { type: "defense", defense: "youtiao" }]);
    assert.equal(hits(state, "日").length, 0);
    assert.equal(player(state).buffs.find(({ id }) => id === `skill_used:${RI_SKILL_ID}`)?.stacks, 1);
    grantInitializedSkill(state, player(state).id, getFusionSkillId("破晓"), "test", false);
    state = advance(state);
    player(state).cakes = 3;
    state = turn(state, [{ ...ri, stacks: 3 }], "turn_change_action");
    assert.equal(previewPlayerAttackStats(state, player(state).id).stats[0]?.power, 9);

    state = fixture();
    grantInitializedSkill(state, player(state).id, getFusionSkillId("破晓"), "independent", false);
    assert.equal(getActiveFusionCount(player(state), "破晓"), 2);
    removeBigCardInstance(state, player(state).id, player(state).bigCards![0]!.instanceId);
    assert.equal(getActiveFusionCount(player(state), "破晓"), 1);
    assert.equal(getActiveSkillCount(player(state), RI_SKILL_ID), 1);
  }],
  ["开局发放的破晓保留逐日之弓的全场选牌和开局暴露", () => {
    let state = createGame("A", { skillMode: "big_test_select", skillCount: 1 });
    for (const name of ["B", "C", "D"]) state = addPlayerToGame(state, createPlayer(name));
    ["10502", "10501", "10503", "10504"].forEach((cardId, index) => {
      player(state, index).bigCards = [{ cardId, instanceId: `card-${index}` }];
    });
    state = startGame(state);
    const host = player(state);
    assert.ok(host.revealedSkillIds.includes(getFusionSkillId("逐日之弓")));
    assert.ok(!host.revealedSkillIds.includes(getFusionSkillId("破晓")));
    assert.deepEqual(state.pendingSkillChoices?.filter(({ playerId }) => playerId === host.id).map(({ sourcePlayerId }) => sourcePlayerId),
      state.players.slice(1).map(({ id }) => id));
    assert.equal(getSkillUseLimit(host, "skill_100_45717"), 2);
  }],
  ["持有者的低攻和高攻分别绕过永远之夜、阳光普照，并保留普天同庆的群攻", () => {
    let state = fixture();
    appendSkillInstances(player(state, 1), [ETERNAL_NIGHT_SKILL_ID]);
    player(state).cakes = 10;
    state = turn(state, [sha(state, 1)]);
    assert.deepEqual(hits(state, "杀"), state.players.slice(1).map(({ id }) => [id, 1]));
    state = fixture();
    player(state).cakes = 10;
    state = turn(state, [{ ...sha(state, 1), stacks: 5 } as PlayerAction]);
    assert.deepEqual(hits(state, "杀"), state.players.slice(1).map(({ id }) => [id, 5]));
  }],
  ["追光等待常规复活结束，裂魂仍能阻止，成功后恢复初始血量", () => {
    let state = fixture();
    player(state).cakes = 3;
    player(state, 1).hp = -1;
    player(state, 1).buffs.push({ id: "pending_death", name: "待复活", stacks: 1 });
    beginActionPrompt(state, "revival_action");
    assert.throws(() => pursue(state, CHASE_LIGHT_ID, 1));
    defeat(state, 1, 1);
    beginActionPrompt(state, "turn_end_action");
    player(state, 1).buffs.push({ id: "no_revive", name: "裂魂", stacks: 1 });
    assert.throws(() => pursue(state, CHASE_LIGHT_ID, 1));
    player(state, 1).buffs = [{ id: "keep_me", name: "保留状态", stacks: 1 }];
    appendSkillInstances(player(state, 1), [holyBath]);
    state = pursue(state, CHASE_LIGHT_ID, 1);
    assert.equal(player(state, 1).hp, 18);
    assert.ok(player(state, 1).buffs.some((buff) => buff.id === "keep_me"));
    assert.ok(state.eventLog.some((event) => event.type === "heal" && event.recoveryKind === "revival"));
  }],
  ["追光只有独立的三魂无视成功时才能越过三魂限制", () => {
    let state = fixture();
    player(state).cakes = 3;
    defeat(state, 1, 1);
    player(state, 1).buffs.push({ id: "soul_lock", name: "三魂限制", stacks: 1, sourceAbilityId: "1051302", continuationBlocks: ["revival"] });
    beginActionPrompt(state, "turn_end_action");
    state = pursue(state, CHASE_LIGHT_ID, 1, 0.6);
    assert.equal(player(state, 1).status, "dead");
    state = pursue(state, CHASE_LIGHT_ID, 1, 0.1);
    assert.equal(player(state, 1).status, "alive");
  }],
  ["追影的进入游戏与追魂的重新出现均保留焚烬，不走复活", () => {
    let state = fixture();
    player(state).cakes = 10;
    for (const [index, level] of [[1, 2], [2, 3]] as const) {
      defeat(state, index, level);
      player(state, index).buffs.push({ id: `fenjin-${index}`, name: "焚烬", stateType: "fenjin", stacks: 1 });
    }
    player(state, 1).buffs.push({ id: "return_lock", name: "禁止返回", stacks: 1, continuationBlocks: ["reentry"] });
    beginActionPrompt(state, "turn_end_action");
    state = pursue(state, CHASE_SHADOW_ID, 1, 0.45);
    assert.equal(player(state, 1).status, "dead");
    state = pursue(state, CHASE_SHADOW_ID, 1);
    state = pursue(state, CHASE_SOUL_ID, 2);
    assert.deepEqual(state.eventLog.filter((event) => event.type === "heal").map((event) => event.type === "heal" && event.recoveryKind),
      ["reentry", "reappearance"]);
    assert.ok(state.players.slice(1, 3).every((item) => item.buffs.some((buff) => buff.stateType === "fenjin")));
    assert.ok(!player(state).buffs.some((buff) => buff.id === HUNYAO_QUEUED_SHA));
  }],
  ["追魂在回合前和变招发出可被小防挡住的杀，四阶五阶不可选", () => {
    for (const phase of ["turn_before_action", "turn_change_action"] as const) {
      let state = fixture();
      player(state).cakes = 10;
      defeat(state, 1, 4);
      defeat(state, 2, 5);
      beginActionPrompt(state, phase);
      assert.throws(() => pursue(state, CHASE_SOUL_ID, 1));
      assert.throws(() => pursue(state, CHASE_SOUL_ID, 2));
      defeat(state, 1, 3);
      player(state, 2).status = "alive";
      player(state, 2).hp = 50;
      delete player(state, 2).defeatLevel;
      if (phase === "turn_change_action") {
        state = advance(state);
        state = turn(state, [cake, cake, small, cake], "turn_change_action");
        defeat(state, 1, 3);
      }
      state = pursue(state, CHASE_SOUL_ID, 1);
      assert.ok(player(state).buffs.some((buff) => buff.id === HUNYAO_QUEUED_SHA));
      if (phase === "turn_before_action") state = turn(advance(state), [cake, cake, small, cake]);
      else state = advance(state, "turn_end_action");
      assert.ok(hits(state, "追魂者·杀").some(([target, amount]) => target === player(state, 3).id && amount === 1));
      assert.equal(player(state, 2).hp, 50);
    }
  }],
  ["出饼优先花掉其他来源，轮末清零与焚天清场都清空计数", () => {
    let state = fixture();
    for (let i = 0; i < 4; i++) state = advance(turn(state, [cake]));
    const host = player(state);
    assert.equal(host.actionCakes, 4);
    assert.equal(toPublicGameState(state, player(state, 1).id).players[0]!.actionCakes, undefined);
    changeCakes(state, host.id, host.cakes + 1, "独裁");
    state = turn(state, [{ type: "attack", attackId: "wan_jian", stacks: 1 }]);
    assert.equal(player(state).cakes, 3);
    assert.equal(player(state).actionCakes, 3);
    state = advance(state);
    assert.equal(player(state).actionCakes, 0);

    state = fixture(["10502"], ["10501"]);
    player(state, 1).cakes = 4;
    state = turn(state, [cake, { type: "skill", skillId: FENTIAN_ATTACK_ID, targetId: player(state, 2).id, stacks: 1 }]);
    assert.equal(player(state).actionCakes, 0);
  }],
  ["同次出饼增加多份就计入多份，其他来源的十个饼不触发恢复", () => {
    let state = fixture();
    const host = player(state);
    changeCakes(state, host.id, 3, "三倍出饼", "action");
    assert.equal(host.actionCakes, 3);
    changeCakes(state, host.id, 13, "其他来源");
    host.hp = -1;
    state = turn(state, [small]);
    assert.equal(player(state).status, "dead");
    assert.equal(player(state).actionCakes, 0);
    assert.equal(player(state).hunyaoAwakened, undefined);
  }],
  ["十个出饼积累触发初始快照，找回被消除的卡和融合，重置技能用量", () => {
    let state = fixture(["10502", "10501"]);
    for (let i = 0; i < 10; i++) state = advance(turn(state, [cake]));
    const host = player(state);
    removeBigCardInstance(state, host.id, host.bigCards!.find((card) => card.cardId === "10501")!.instanceId);
    host.buffs.push({ id: "skill_used:skill_101_4254", name: "镜像已使用", stacks: 1 });
    host.buffs.push({ id: "skill_used:skill_4_65637", name: "沙子已使用", stacks: 1 });
    host.hp = -1;
    state = turn(state, [cake]);
    assert.equal(player(state).hp, 6);
    assert.ok(player(state).hunyaoAwakened);
    assert.equal(player(state).actionCakes, 0);
    assert.equal(player(state).cakes, 0);
    assert.ok(!player(state).buffs.some((buff) => buff.id.startsWith("skill_used:")));
    assert.equal(getActiveFusionCount(player(state), "天火之狱"), 1);
    assert.ok(!("initialHunyaoPlayers" in toPublicGameState(state, host.id)));
    assert.ok(!("initialPlayerSnapshots" in toPublicGameState(state, host.id)));
    defeat(state, 1, 1);
    player(state).cakes = 2;
    state = pursue(state, CHASE_LIGHT_ID, 1, 0.99);
    assert.equal(player(state, 1).status, "alive");
  }],
  ["窥视复制的魂耀九州可以触发恢复，恢复后只保留快照里的大卡", () => {
    let state = createGame("A", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false });
    for (const name of ["B", "C"]) state = addPlayerToGame(state, createPlayer(name));
    player(state).bigCards = [{ cardId: "10505", instanceId: "initial-peek" }];
    player(state, 1).bigCards = [{ cardId: "10502", instanceId: "initial-light" }];
    state = startGame(state);
    const hostId = player(state).id;
    state = submitActionWindowSkill(state, hostId, { type: "skill", skillId: KUISHI_ID, stacks: 1, targetBigCardInstanceId: "initial-light" });
    state = advance(state);
    assert.deepEqual(player(state).bigCards?.map((card) => card.cardId), ["10505", "10502"]);
    changeCakes(state, hostId, 10, "出饼", "action");
    player(state).hp = -1;
    state = turn(state, [small]);
    assert.equal(player(state).status, "alive");
    assert.equal(player(state).hp, 6);
    assert.deepEqual(player(state).bigCards?.map((card) => card.cardId), ["10505"]);
    assert.equal(getActiveSkillCount(player(state), CHASE_LIGHT_ID), 0);
  }],
  ["更新开局快照不改动当前状态，重复恢复采用同一份更新后的快照", () => {
    const state = fixture();
    const host = player(state);
    assert.ok(updateInitialPlayerSnapshot(state, host.id, (draft) => {
      appendSkillInstances(draft, [holyBath]);
      draft.spareLives = [{ hp: 4 }];
    }));
    assert.equal(host.spareLives, undefined);
    assert.ok(!host.skills.includes(holyBath));
    for (let repeat = 0; repeat < 2; repeat++) {
      host.spareLives = [{ hp: 20 }, { hp: 8 }];
      assert.ok(restorePlayerInitialState(state, host));
      assert.deepEqual(host.spareLives, [{ hp: 4 }]);
      assert.equal(host.skills.filter((id) => id === holyBath).length, 1);
    }
  }]
];

let failed = 0;
for (const [name, run] of checks) {
  try {
    run();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${name}`, error);
  }
}
console.log(`Hunyao regression: ${checks.length - failed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
