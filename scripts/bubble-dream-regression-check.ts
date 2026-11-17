import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, attackLevelValue, attackPowerValue, BUBBLE_AVENGER, BUBBLE_DESTINY, BUBBLE_DREAM_CARD,
  BUBBLE_ENHANCE, BUBBLE_FATE, BUBBLE_FINALE, BUBBLE_FORGET, BUBBLE_REBUILD, BUBBLE_REBUILD_STOCK,
  BUBBLE_VENGEANCE_STOCK, BUBBLE_WITCH, bubbleDreamEnhancement, bubbleDreamForcedTargets, bubbleDreamHitChoices, bubbleDreamStock,
  bubbleDreamStopsRestart, combatValue, createGame, createPlayer, getActiveSkillCount, previewPlayerAttackStats, startGame,
  submitActionWindowSkill, submitPlayerAction, validateAction, type GameState, type PlayerAction, type SkillAction
} from "../packages/shared/src";
import { YUAN_RESTART_ID } from "../packages/shared/src/engine/yuanIds";
import { getStatusOverview } from "../packages/shared/src/engine/statusOverview";

const pass = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", stacks: 1, targetId });
const use = (skillId: string, extra: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...extra });
const owner = (state: GameState) => state.players[0]!;
const card = (state: GameState) => owner(state).bigCards![0]!;

function advance(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; i < 60 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(second = false): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  owner(state).bigCards = [{ instanceId: "dream", cardId: BUBBLE_DREAM_CARD }];
  if (second) state.players[1]!.bigCards = [{ instanceId: "dream2", cardId: BUBBLE_DREAM_CARD }];
  return advance(startGame(state));
}

function turn(state: GameState, ...moves: Array<PlayerAction | undefined>): GameState {
  const ids = state.players.map(({ id }) => id);
  for (const [index, id] of ids.entries()) {
    if (state.phase !== "collecting_actions") break;
    const player = state.players.find((entry) => entry.id === id)!;
    if (player.status !== "alive" || state.pendingActions[id]) continue;
    player.cakes = 10;
    state = submitPlayerAction(state, id, moves[index] ?? pass).state;
  }
  return state;
}

test("宿命之地让群攻只打两位持有者，封锁不影响它", () => {
  const state = fixture(true);
  owner(state).buffs.push({ id: `sealed_skill:${BUBBLE_DESTINY}`, name: "封锁", stacks: 1 });
  const before = state.players.map(({ hp }) => hp);
  const resolved = advance(turn(state, pass, pass, { type: "attack", attackId: "wan_jian", stacks: 1 }));
  assert.deepEqual(resolved.players.map(({ hp }, index) => before[index]! - hp), [2, 2, 0, 0]);
  assert.equal(getActiveSkillCount(owner(resolved), BUBBLE_DESTINY), 1);
});

test("小防能挡住杀，宿命之地令单攻跳过闪现，接受忘却补正则完全无视并叠改造", () => {
  let state = fixture();
  const id = owner(state).id;
  const attack = sha(id);
  const hp = owner(state).hp;
  state = advance(turn(state, small, attack));
  assert.equal(owner(state).hp, hp);
  assert.equal(bubbleDreamHitChoices(state, id).length, 0);
  owner(state).buffs.push({ id: "temp_flash_dodge", name: "闪现", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
  state = advance(turn(state, pass, attack), "turn_damage_modify");
  const [option] = bubbleDreamHitChoices(state, id);
  assert.ok(option);
  state = submitActionWindowSkill(state, id, use(BUBBLE_FORGET, { attackResponseId: option.id }));
  assert.equal(bubbleDreamStock(owner(state), BUBBLE_REBUILD_STOCK), 1);
  assert.ok(getStatusOverview(state, owner(state)).counted.some(({ label, value }) => label === "改造" && value === "1 层 / 9"));
  assert.equal(owner(advance(state)).hp, hp);
});

test("实际受伤增加复仇者，命中清空并强制目标下一次攻击改向", () => {
  let state = fixture();
  const [a, b, c] = state.players;
  state = advance(turn(state, pass, sha(a!.id)));
  assert.equal(bubbleDreamStock(owner(state), BUBBLE_VENGEANCE_STOCK), 1);
  assert.ok(getStatusOverview(state, owner(state)).counted.some(({ label, value }) => label === "复仇者" && value === "1 层"));
  state = advance(turn(state, sha(b!.id)));
  assert.equal(bubbleDreamStock(owner(state), BUBBLE_VENGEANCE_STOCK), 0);
  assert.deepEqual(bubbleDreamForcedTargets(state.players[1]!), [a!.id]);
  const hp = state.players[2]!.hp;
  state = advance(turn(state, small, sha(c!.id)));
  assert.equal(state.players[2]!.hp, hp);
  assert.deepEqual(bubbleDreamForcedTargets(state.players[1]!), []);
});

test("多位失却的魔女先后命中时，后命中者成为下一次攻击的唯一目标", () => {
  let state = fixture(true);
  const [, second, target] = state.players;
  state = advance(turn(state, sha(target!.id), sha(target!.id)));
  assert.deepEqual(bubbleDreamForcedTargets(state.players[2]!), [second!.id]);
});

test("自我改造从下一回合起替换忘却补正，选定的攻等同时乘无限的幂并破弹", () => {
  let state = fixture();
  const id = owner(state).id;
  owner(state).buffs.push({ id: BUBBLE_REBUILD_STOCK, name: "改造", stacks: 2 });
  state = submitActionWindowSkill(state, id, use(BUBBLE_REBUILD));
  assert.equal(getActiveSkillCount(owner(state), BUBBLE_FINALE), 0);
  assert.equal(bubbleDreamStopsRestart(state), false);
  state = advance(turn(state));
  assert.equal(getActiveSkillCount(owner(state), BUBBLE_FINALE), 1);
  assert.equal(getActiveSkillCount(owner(state), BUBBLE_FORGET), 0);
  assert.equal(bubbleDreamStopsRestart(state), true);
  state = advance(turn(state, sha(state.players[1]!.id), small), "turn_change_action");
  state = submitActionWindowSkill(state, id, use(BUBBLE_ENHANCE, { switchActionIndex: 0 }));
  const stats = previewPlayerAttackStats(state, id).stats[0]!;
  assert.deepEqual(attackPowerValue(stats), combatValue(1, 2));
  assert.deepEqual(attackLevelValue(stats), combatValue(1, 2));
  assert.ok(stats.traits.includes("pierce_rebound"));
  assert.equal(bubbleDreamEnhancement(owner(state))?.stacks, 1);
  state = advance(turn(advance(state)));
  assert.equal(getActiveSkillCount(owner(state), BUBBLE_FORGET), 1);
  assert.equal(getActiveSkillCount(owner(state), BUBBLE_FINALE), 0);
  assert.equal(bubbleDreamEnhancement(owner(state))?.stacks, 1);
});

test("第七条令技能失效时第1条仍立即自必杀，出招反弹只挡不转", () => {
  let state = fixture();
  const [a, b] = state.players;
  card(state).bubbleDreamRebuild = { firstTurn: state.turnNumber, endTurn: state.turnNumber + 1, active: true };
  card(state).bubbleDreamTriggered = [BUBBLE_AVENGER, BUBBLE_WITCH, BUBBLE_DESTINY, BUBBLE_FORGET, BUBBLE_REBUILD];
  owner(state).buffs.push({ id: `sealed_skill:${BUBBLE_FATE}`, name: "封锁", stacks: 1 });
  owner(state).cakes = 10;
  const finale = use(BUBBLE_FINALE, { targetId: b!.id });
  assert.equal(validateAction(state, a!.id, finale).ok, true);
  state = advance(turn(state, finale, { type: "defense", defense: "rebound", targetId: state.players[2]!.id }));
  assert.equal(owner(state).defeatLevel, 4);
  assert.equal(state.players[1]!.status, "alive");
  assert.ok(state.eventLog.some((event) => event.type === "system" && event.message.includes("立即自必杀")));
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === b!.id && event.defense === "rebound"));
});

test("忘却补正满9层仍可响应，也可以跳过让同一份攻击正常造成伤害", () => {
  let state = fixture();
  const id = owner(state).id;
  owner(state).buffs.push({ id: BUBBLE_REBUILD_STOCK, name: "改造", stacks: 9 });
  const hp = owner(state).hp;
  state = advance(turn(state, pass, sha(id)), "turn_damage_modify");
  state = submitActionWindowSkill(state, id, use(BUBBLE_FORGET, { attackResponseId: bubbleDreamHitChoices(state, id)[0]!.id }));
  assert.equal(bubbleDreamStock(owner(state), BUBBLE_REBUILD_STOCK), 9);
  state = advance(state);
  assert.equal(owner(state).hp, hp);
  state = advance(turn(state, pass, sha(id)));
  assert.equal(owner(state).hp, hp - 1);
});

test("改造期间照常结算伤害、自爆惩罚和其他出招，但不会重开", () => {
  let state = fixture();
  const [a, b, c, d] = state.players;
  owner(state).buffs.push({ id: BUBBLE_REBUILD_STOCK, name: "改造", stacks: 2 });
  state = submitActionWindowSkill(state, a!.id, use(BUBBLE_REBUILD));
  state = advance(turn(state));
  const round = state.roundNumber;
  state = advance(turn(state, pass, { type: "defense", defense: "self_destruct" }, sha(d!.id)));
  assert.equal(state.roundNumber, round);
  assert.equal(state.players[1]!.hp, b!.hp - 1);
  assert.equal(state.players[2]!.id, c!.id);
  assert.equal(state.players[3]!.hp, d!.hp - 1);
});

test("终招先于别人的自爆，自己当场必杀后也保留已经发出的必杀", () => {
  let state = fixture();
  const [a, b, c] = state.players;
  card(state).bubbleDreamRebuild = { firstTurn: state.turnNumber, endTurn: state.turnNumber + 1, active: true };
  card(state).bubbleDreamTriggered = [BUBBLE_AVENGER, BUBBLE_WITCH, BUBBLE_DESTINY, BUBBLE_FORGET, BUBBLE_REBUILD];
  state.junengTargetLock = { targetId: c!.id, expiresAtRound: state.roundNumber + 1 };
  state = advance(turn(state, use(BUBBLE_FINALE, { targetId: b!.id }), pass, { type: "defense", defense: "self_destruct" }));
  assert.equal(state.players[0]!.defeatLevel, 4);
  assert.equal(state.players[1]!.defeatLevel, 4);
  assert.equal(state.players[2]!.hp, c!.hp - 1);
  assert.equal(a!.id, state.players[0]!.id);
});

test("复仇者穿过满足条件的神之庇护，失却的魔女在命中后清层", () => {
  let state = fixture();
  const target = state.players[1]!;
  owner(state).buffs.push({ id: BUBBLE_VENGEANCE_STOCK, name: "复仇者", stacks: 1 });
  appendSkillInstances(target, ["1031"]);
  state = advance(turn(state, sha(target.id)));
  assert.equal(state.players[1]!.hp, target.hp - 1);
  assert.equal(bubbleDreamStock(owner(state), BUBBLE_VENGEANCE_STOCK), 0);
});

test("改造在生效回合阻止太虚之初重开本局，其他出招照常结算", () => {
  let state = fixture();
  const [a, b, , d] = state.players;
  state.players[1]!.bigCards = [{ cardId: "10554", instanceId: "yuan", initialized: true }];
  owner(state).buffs.push({ id: BUBBLE_REBUILD_STOCK, name: "改造", stacks: 1 });
  state = submitActionWindowSkill(state, a!.id, use(BUBBLE_REBUILD));
  state = advance(turn(state));
  b!.cakes = 10;
  assert.equal(validateAction(state, b!.id, use(YUAN_RESTART_ID)).ok, true);
  const before = state.turnNumber;
  state = advance(turn(state, pass, use(YUAN_RESTART_ID), sha(d!.id)));
  assert.equal(state.turnNumber, before + 1);
  assert.equal(state.players[3]!.hp, d!.hp - 1);
});
