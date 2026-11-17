import assert from "node:assert/strict";
import { test } from "node:test";
import { addPlayerToGame, advanceActionWindow, createGame, createPlayer, getAllSkills, previewPlayerAttackStats, startGame,
  submitActionWindowSkill, submitPlayerAction, type GameState, type PlayerAction } from "../packages/shared/src";
import { BASE_ATTACKS, getStackedAttackStats } from "../packages/shared/src/engine/attacks";
import { applyColdLight, coldLightUses } from "../packages/shared/src/engine/nineTribulations";
import { NINE_COLD, NINE_TRIBULATIONS_CARD } from "../packages/shared/src/engine/nineTribulationsIds";
import { attackLevelValue, attackPowerValue, getPointDamageDefeatLevel, INFINITY_VALUE, RETIRE_VALUE,
  VANISH_VALUE, withAttackLevel, withAttackPower } from "../packages/shared/src/engine/combatValues";
import { restoreLimitedSkillUsesToInitial, zeroLimitedSkillUses } from "../packages/shared/src/engine/limitedUseReversal";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";

const cake: PlayerAction = { type: "gain_cake" };
const attack = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });

function drain(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; i < 100 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++) state = advanceActionWindow(state);
  return state;
}

function table(players = 2): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 1, initialHp: 18, firstTurnNoAttack: false });
  for (const name of ["乙", "丙"].slice(0, players - 1)) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ cardId: NINE_TRIBULATIONS_CARD, instanceId: "nine" }];
  return drain(startGame(state));
}

function turn(state: GameState, declarations: PlayerAction[], stop?: GameState["activeTimingPhase"]): GameState {
  const participants = state.players.filter(({ status }) => status === "alive");
  for (const [index, declaration] of declarations.entries()) state = submitPlayerAction(state, participants[index]!.id, declaration).state;
  return drain(state, stop);
}

test("一点寒光分别改攻值或等级，退游两次升消失、消失四次升必杀", () => {
  const original = getStackedAttackStats(BASE_ATTACKS.sha, 1);
  let stats = withAttackLevel(withAttackPower(original, INFINITY_VALUE), RETIRE_VALUE);
  stats = applyColdLight(stats, "power");
  assert.equal(getPointDamageDefeatLevel(stats), 2);
  stats = applyColdLight(stats, "power");
  assert.deepEqual(attackPowerValue(stats), RETIRE_VALUE);
  stats = applyColdLight(stats, "power");
  assert.equal(getPointDamageDefeatLevel(stats), 3);
  for (let index = 0; index < 3; index++) stats = applyColdLight(stats, "power");
  assert.equal(getPointDamageDefeatLevel(stats), 3);
  stats = applyColdLight(stats, "power");
  assert.equal(getPointDamageDefeatLevel(stats), 4);
  assert.deepEqual(attackLevelValue(stats), RETIRE_VALUE);
  stats = applyColdLight(applyColdLight(stats, "level"), "level");
  assert.deepEqual(attackLevelValue(stats), VANISH_VALUE);
});

test("一点寒光在同一变招阶段刷新后可再次使用，次数归零效果不干预", () => {
  let state = table();
  state.players[0]!.cakes = 4;
  const [source, target] = state.players;
  state = turn(state, [attack(target!.id), cake], "turn_change_action");
  assert.equal(state.activeTimingPhase, "turn_change_action");
  const cast = () => submitActionWindowSkill(state, source!.id, { type: "skill", skillId: NINE_COLD, stacks: 1,
    switchActionIndex: 0, coldLightField: "power" });
  state = cast();
  assert.throws(cast, /一点寒光次数已用完/);
  restoreLimitedSkillUsesToInitial(state, state.players[0]!);
  zeroLimitedSkillUses(state, state.players[0]!);
  state = cast();
  assert.equal(getPointDamageDefeatLevel(previewPlayerAttackStats(state, source!.id).stats[0]), 2);
  state = drain(state);
  assert.equal(state.players[1]!.defeatLevel, 2);
});

test("劫难之地首回合不触发，随后按现有饼数伤害、还原饼且不重开，承受第9次后容量乘三", () => {
  let state = table();
  state = turn(state, [cake, cake]);
  assert.deepEqual(state.players.map(({ hp, cakes }) => [hp, cakes]), [[18, 1], [18, 1]]);
  state.players[0]!.bigCards![0]!.nineTribulationWounds = 8;
  const round = state.roundNumber;
  state = turn(state, [cake, cake]);
  assert.deepEqual(state.players.map(({ hp, cakes }) => [hp, cakes]), [[16, 1], [16, 1]]);
  assert.equal(state.roundNumber, round);
  assert.equal(coldLightUses(state.players[0]!.bigCards![0]!, state.turnNumber), 3);
});

test("剑主天地无视对手判定 I 的神之庇护，自身普通攻击照常命中", () => {
  let state = table();
  const [, target] = state.players;
  grantInitializedSkill(state, target!.id, "1031", "测试", false);
  state.players[0]!.cakes = 2;
  state = turn(state, [attack(target!.id), cake]);
  assert.equal(state.players[1]!.hp, 17);
});

test("剑主天地按实际判定等级保留提升到 V 的神之庇护", () => {
  let state = table();
  const [, target] = state.players;
  grantInitializedSkill(state, target!.id, "1031", "测试", false);
  target!.skillInventory!.find(({ skillId }) => skillId === "1031")!.judgmentRank = "V";
  state.players[0]!.cakes = 2;
  state = turn(state, [attack(target!.id), cake]);
  assert.equal(state.players[1]!.hp, 18);
});

test("劫难的增幅穿过上次挡下伤害的目标技能，技能本身保留", () => {
  let state = turn(table(), [cake, cake]);
  state.players[1]!.buffs.push({ id: "test-spell-guard", name: "法伤无视", stacks: 1, sourceAbilityId: "1060401",
    ignoredDamageKinds: ["spell"] });
  state = turn(state, [cake, cake]);
  assert.equal(state.players[1]!.hp, 18);
  assert.equal(state.players[0]!.bigCards![0]!.nineTribulationMisses?.[state.players[1]!.id], 1);
  state = turn(state, [cake, cake]);
  assert.equal(state.players[1]!.hp, 12);
  assert(state.players[1]!.buffs.some(({ id }) => id === "test-spell-guard"));
});

test("劫难只给未受伤的目标储存增幅", () => {
  let state = turn(table(3), [cake, cake, cake]);
  const protectedTarget = state.players[1]!;
  protectedTarget.buffs.push({ id: "spell-ignore", name: "法伤无视", stacks: 1, ignoredDamageKinds: ["spell"] });
  state = turn(state, [cake, cake, cake]);
  assert.deepEqual(state.players[0]!.bigCards![0]!.nineTribulationMisses, { [protectedTarget.id]: 1 });
  const target = state.players[1]!;
  target.buffs = target.buffs.filter(({ id }) => id !== "spell-ignore");
  state = turn(state, [cake, cake, cake]);
  assert.deepEqual(state.players.map(({ hp, cakes }) => [hp, cakes]), [[14, 1], [12, 2], [14, 1]]);
});

test("宿命轮回在死亡九轮后恢复初始快照，等待中胜负照常", () => {
  let state = table(3);
  const [owner] = state.players;
  owner!.hp = 0;
  state.players[1]!.cakes = 4;
  state = turn(state, [cake, attack(owner!.id), cake]);
  assert.equal(state.players[0]!.status, "dead");
  const due = state.players[0]!.bigCards![0]!.nineFateReturnRound!;
  assert.equal(due, 10);
  state.roundNumber = due - 1;
  state.players[1]!.cakes = 4;
  state = turn(state, [attack(state.players[2]!.id), cake]);
  assert.equal(state.roundNumber, due);
  assert.equal(state.players[0]!.status, "alive");
  assert.equal(state.players[0]!.hp, 18);
  assert(state.eventLog.some((event) => event.type === "heal" && event.reason === "宿命轮回"));

  let duel = table();
  duel.players[0]!.hp = 0;
  duel.players[1]!.cakes = 4;
  duel = turn(duel, [cake, attack(duel.players[0]!.id)]);
  assert.equal(duel.phase, "finished");
  assert.deepEqual(duel.winnerIds, [duel.players[1]!.id]);
});

test("退游也开启宿命轮回倒计时，轮初自动恢复至初始状态", () => {
  let state = table(3);
  const [owner, opponent] = state.players;
  const paper = getAllSkills().find(({ name }) => name === "卷子")!.id;
  grantInitializedSkill(state, opponent!.id, paper, "测试", false);
  opponent!.skillInventory!.find(({ skillId }) => skillId === paper)!.judgmentRank = "V";
  opponent!.cakes = 20;
  state = turn(state, [cake, { type: "skill", skillId: paper, stacks: 1, targetId: owner!.id }, cake]);
  assert.equal(state.players[0]!.defeatLevel, 2);
  const due = state.players[0]!.bigCards![0]!.nineFateReturnRound!;
  assert.equal(due, 10);
  state.roundNumber = due - 1;
  state.players[1]!.cakes = 4;
  state = turn(state, [attack(state.players[2]!.id), cake]);
  assert.equal(state.players[0]!.status, "alive");
  assert.equal(state.players[0]!.hp, 18);
});
