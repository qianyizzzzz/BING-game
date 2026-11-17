import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, createGame, createPlayer, getActiveFusionCount, passActionWindow,
  startGame, submitActionWindowSkill, submitPlayerAction, toPublicGameState,
  type GameState, type PlayerAction, type SkillAction
} from "../packages/shared/src";
import { removeBigCardInstance } from "../packages/shared/src/engine/bigCards";
import { getMoveBlockReason } from "../packages/shared/src/engine/moveEligibility";
import { includeSevenStarLegacyWinners } from "../packages/shared/src/engine/sevenStar";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";
import {
  SEVEN_STAR_CARD, SEVEN_STAR_CHOOSE, SEVEN_STAR_IGNORE, SEVEN_STAR_MOVE_LOCK, SEVEN_STAR_PIERCE,
  SEVEN_STAR_TIANQUAN, SEVEN_STAR_TIANSHU, SEVEN_STAR_TIANXUAN, SEVEN_STAR_YAOGUANG, SEVEN_STAR_YUHENG,
  type SevenStarForm
} from "../packages/shared/src/engine/sevenStarIds";
import { withSkillsIgnored } from "../packages/shared/src/engine/skillIgnore";

const cake: PlayerAction = { type: "gain_cake" };
const skill = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });
const attack = (targetId: string, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks });

function table(form: SevenStarForm, players = 2) {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 1, initialHp: 18, firstTurnNoAttack: false });
  for (const name of ["乙", "丙"].slice(0, players - 1)) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ cardId: SEVEN_STAR_CARD, instanceId: "seven-star" }];
  state = startGame(state);
  state = submitActionWindowSkill(state, state.players[0]!.id, skill(SEVEN_STAR_CHOOSE, { cardForm: form }));
  return drain(state);
}

function drain(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; i < 80 && state.phase === "action_window" && !state.sevenStarLegacyResume && state.activeTimingPhase !== stop; i++)
    state = advanceActionWindow(state);
  return state;
}

function moves(state: GameState, declarations: PlayerAction[]) {
  for (const [index, action] of declarations.entries()) {
    const player = state.players[index]!;
    if (player.status === "alive" && !getMoveBlockReason(state, player)) state = submitPlayerAction(state, player.id, action).state;
  }
  return drain(state);
}

function doomed(state: GameState, index: number) {
  state.roundTurnNumber = Math.max(4, state.roundTurnNumber);
  const player = state.players[index]!;
  player.hp = 0;
  const card = player.bigCards!.find(({ cardId }) => cardId === SEVEN_STAR_CARD)!;
  card.sevenStarForms = { active: "yuheng", available: ["yuheng"] };
  return card;
}

function give(state: GameState, from: number, to: number) {
  const giver = state.players[from]!;
  const targetId = state.players[to]!.id;
  const view = toPublicGameState(state, giver.id).sevenStarLegacy;
  const choice = view?.choices.find((entry) => entry.targetId === targetId);
  assert.ok(choice, "玉衡需在胜负判定前提供目标");
  assert.equal(state.activeTimingPhase, "revival_action");
  return drain(submitActionWindowSkill(state, giver.id, skill(SEVEN_STAR_YUHENG, { targetId, bigCardInstanceId: choice.cardInstanceId })));
}

test("最后两人时玉衡先选择，传整卡并和普通胜者并列，放弃则只有对方获胜", () => {
  let state = table("yuheng");
  doomed(state, 0);
  const [a, b] = state.players;
  b!.cakes = 2;
  state = moves(state, [cake, attack(a!.id)]);
  assert.equal(state.phase, "action_window", JSON.stringify(state.eventLog.slice(-10)));
  assert.equal(state.players[0]!.status, "dead");
  assert.equal(state.victoryCounter, undefined);
  const passed = passActionWindow(state, a!.id);
  assert.deepEqual(passed.winnerIds, [b!.id]);
  state = give(state, 0, 1);
  assert.deepEqual(new Set(state.winnerIds), new Set([a!.id, b!.id]));
  assert.equal(state.players[1]!.bigCards!.find(({ cardId }) => cardId === SEVEN_STAR_CARD)?.sevenStarForms?.available.length, 7);
});

test("玉衡可二次传承，失去、封锁和无视对应副本时切断上游", () => {
  let state = table("yuheng", 3);
  doomed(state, 0);
  const [a, b, c] = state.players;
  b!.cakes = 2;
  state = give(moves(state, [cake, attack(a!.id), cake]), 0, 1);
  const inherited = doomed(state, 1);
  state.players[2]!.cakes = 2;
  state = moves(state, [cake, cake, attack(b!.id)]);
  assert.equal(state.phase, "action_window");
  const all = give(state, 1, 2);
  assert.deepEqual(new Set(all.winnerIds), new Set([a!.id, b!.id, c!.id]));

  const ignored = withSkillsIgnored(all.players[1], { all: true }, () => includeSevenStarLegacyWinners(all, [c!.id]));
  assert.deepEqual(new Set(ignored), new Set([b!.id, c!.id]));
  const lost = structuredClone(all);
  removeBigCardInstance(lost, b!.id, inherited.instanceId);
  assert.deepEqual(new Set(includeSevenStarLegacyWinners(lost, [c!.id])), new Set([b!.id, c!.id]));
  const sealed = structuredClone(all);
  sealed.players[1]!.bigCards!.find(({ instanceId }) => instanceId === inherited.instanceId)!.junengDisabled = true;
  assert.deepEqual(new Set(includeSevenStarLegacyWinners(sealed, [c!.id])), new Set([b!.id, c!.id]));
});

test("天枢群攻整招投一次，失败全招取消，成功穿小防但保留第二层防御值", (context) => {
  let state = table("tianshu", 3);
  const [a, b] = state.players;
  a!.cakes = 6;
  let sequence = 0;
  const dice = context.mock.method(Math, "random", () => 0.9 + ++sequence / 10000);
  state = moves(state, [{ type: "attack", attackId: "wan_jian", stacks: 1 }, cake, cake]);
  const rolls = state.eventLog.filter((event) => event.type === "system" && event.probabilityChecks?.skillId === SEVEN_STAR_TIANSHU);
  assert.equal(rolls.length, 1);
  assert.equal(state.players[1]!.hp, 18);
  assert.equal(state.players[2]!.hp, 18);
  dice.mock.restore();
  state = table("tianshu");
  const [caster, target] = state.players;
  context.mock.method(Math, "random", () => 0.4 + ++sequence / 10000);
  caster!.cakes = 4;
  target!.buffs.push({ id: "defense_value", name: "防御值", stacks: 1 });
  state = moves(state, [attack(target!.id, 2), { type: "defense", defense: "small" }]);
  assert.equal(state.players[1]!.hp, 17);
});

test("天璇只掷实际命中，成功整招无效，第九、十条在该形态也生效", (context) => {
  let state = table("tianxuan");
  const [a, b] = state.players;
  let seq = 0;
  context.mock.method(Math, "random", () => 0.4 + ++seq / 10000);
  b!.cakes = 2;
  state = moves(state, [cake, attack(a!.id)]);
  assert.equal(state.players[0]!.hp, 18);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.blockKind === "invalid" && event.protectionName === "天璇"));
  assert.ok(state.eventLog.some((event) => event.type === "system" && event.probabilityChecks?.skillId === SEVEN_STAR_TIANXUAN));
  assert.equal(getActiveFusionCount(state.players[0], "日月星辰"), 1);
  assert.equal(getActiveFusionCount(state.players[0], "星怒"), 1);
  assert.equal(state.players[0]!.bigCards![0]!.lostAbilityIds?.includes(SEVEN_STAR_IGNORE), undefined);
});

test("第九条常驻，无视属性攻击与限定技出招", () => {
  let state = table("tianji", 3);
  const [a, b, c] = state.players;
  state.roundTurnNumber = 5;
  b!.cakes = 3;
  grantInitializedSkill(state, b!.id, "1077", "测试火球", false);
  grantInitializedSkill(state, c!.id, "1094", "测试限定攻击", false);
  state = moves(state, [cake, skill("1077", { targetId: a!.id }), skill("1094", { targetId: a!.id })]);
  assert.equal(state.players[0]!.hp, 18);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === a!.id &&
    event.protectionName === "七星连珠·无视属性伤害"));
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === a!.id &&
    event.protectionName === "七星连珠·无视"));
});

test("天权锁后续主出招，摇光在主出招选形态并重开", () => {
  let state = table("tianquan");
  const [a, b] = state.players;
  a!.cakes = 3;
  state = moves(state, [skill(SEVEN_STAR_TIANQUAN, { targetId: b!.id }), cake]);
  assert.equal(state.players[1]!.cakes, 1);
  assert.equal(getMoveBlockReason(state, state.players[1]), "天权生效期间不能出招");
  assert.ok(state.players[1]!.buffs.some(({ id }) => id === SEVEN_STAR_MOVE_LOCK));

  state = table("yaoguang");
  const [caster, target] = state.players;
  const forms = caster!.bigCards![0]!.sevenStarForms!;
  forms.available = forms.available.filter((form) => form !== "tianxuan");
  caster!.cakes = 10;
  target!.cakes = 2;
  state = moves(state, [skill(SEVEN_STAR_YAOGUANG, { cardForm: "tianxuan" }), attack(caster!.id)]);
  assert.equal(state.players[0]!.hp, 18);
  assert.ok(state.players[0]!.bigCards![0]!.sevenStarForms!.available.includes("tianxuan"));
  assert.equal(state.roundNumber, 2);
});

test("开阳连续十回合获得一次破除技能，下一次攻击消耗", () => {
  let state = table("kaiyang");
  for (let turn = 0; turn < 10; turn++) state = moves(state, [cake, cake]);
  assert.equal(state.players[0]!.buffs.find(({ id }) => id === SEVEN_STAR_PIERCE)?.stacks, 1);
  const target = state.players[1]!;
  grantInitializedSkill(state, target.id, "1031", "测试防御", false);
  state = moves(state, [attack(target.id), cake]);
  assert.ok(!state.players[0]!.buffs.some(({ id }) => id === SEVEN_STAR_PIERCE));
});
