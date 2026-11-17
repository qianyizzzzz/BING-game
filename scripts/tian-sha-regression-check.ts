import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, createGame, createPlayer, getActiveFusionCount, getActiveSkillCount,
  startGame, submitActionWindowSkill, submitPlayerAction, type GameState, type PlayerAction
} from "../packages/shared/src";
import { bigCardHasAbility, TIANMANG_ABSORB_ID } from "../packages/shared/src/bigCards/abilities";
import { detachBigCardAbility } from "../packages/shared/src/engine/bigCards";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";
import { SEVEN_STAR_CARD } from "../packages/shared/src/engine/sevenStarIds";
import { canUseRawSkillInstance, getFusionSkillId } from "../packages/shared/src/skills/fusion";
import { TIAN_SHA_CARD, TIAN_SHA_FINALE, TIAN_SHA_POWER, TIAN_SHA_STAR_BREAK, TIAN_SHA_SWORD, TIAN_SHA_VERDICT } from "../packages/shared/src/engine/tianShaIds";
import { tianShaIgnoresMove } from "../packages/shared/src/engine/tianSha";
import { TIANMANG_ABSORB_STATE } from "../packages/shared/src/engine/tianmang";

const cake: PlayerAction = { type: "gain_cake" };
const stone: PlayerAction = { type: "defense", defense: "stone" };
const kill = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", stacks: 1, targetId });
const skill = (skillId: string, targetId?: string) => ({ type: "skill" as const, skillId, stacks: 1, ...(targetId ? { targetId } : {}) });

function drain(state: GameState): GameState {
  for (let step = 0; step < 80 && state.phase === "action_window"; step++) state = advanceActionWindow(state);
  return state;
}

function table(cards: string[][], copiedStarBreak = false): GameState {
  const skillCount = Math.max(1, ...cards.map((hand) => hand.length));
  let state = createGame("甲", { skillMode: "big_test_select", skillCount, initialHp: 18, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"].slice(0, cards.length - 1)) state = addPlayerToGame(state, createPlayer(name));
  for (const [index, player] of state.players.entries()) player.bigCards = cards[index]!.map((cardId) => ({
    cardId, instanceId: `${cardId}:${index}`, ...(index === 0 && copiedStarBreak ? { onlyAbilityId: TIAN_SHA_STAR_BREAK } : {})
  }));
  state = drain(startGame(state));
  assert.equal(state.phase, "collecting_actions");
  state.roundTurnNumber = 4;
  for (const player of state.players) player.cakes = 6;
  return state;
}

function submit(state: GameState, index: number, move: PlayerAction): GameState {
  const result = submitPlayerAction(state, state.players[index]!.id, move);
  assert.equal(result.state.lastErrorByPlayerId?.[state.players[index]!.id], undefined);
  return result.state;
}

test("星宿破灭清除带星月属性的整卡，以及自身同名子技能和名称匹配的融合", () => {
  const starCardId = "10506";
  let state = table([[TIAN_SHA_CARD], [starCardId]]);
  const [owner, other] = state.players;
  const fusion = getFusionSkillId("日月星辰");
  grantInitializedSkill(state, other!.id, fusion, "测试", false);
  assert(getActiveFusionCount(other!, "日月星辰") > 0);
  state = submitActionWindowSkill(state, owner!.id, skill(TIAN_SHA_STAR_BREAK));
  const card = state.players[0]!.bigCards![0]!;
  assert(!bigCardHasAbility(card, TIAN_SHA_STAR_BREAK));
  assert(!bigCardHasAbility(card, TIAN_SHA_VERDICT));
  assert(bigCardHasAbility(card, TIAN_SHA_SWORD));
  assert(!state.players[1]!.bigCards?.some(({ cardId }) => cardId === starCardId));
  assert.equal(getActiveFusionCount(state.players[1]!, "日月星辰"), 0);
  assert(tianShaIgnoresMove(state.players[0], other!.id));
});

test("七星第九条挡下星宿破灭，保留整卡和星月融合", () => {
  let state = table([[TIAN_SHA_CARD], [SEVEN_STAR_CARD]]);
  const [owner, target] = state.players;
  state = submitActionWindowSkill(state, owner!.id, skill(TIAN_SHA_STAR_BREAK));
  assert(state.players[1]!.bigCards?.some(({ cardId }) => cardId === SEVEN_STAR_CARD));
  assert(getActiveFusionCount(state.players[1]!, "日月星辰") > 0);
  assert(!tianShaIgnoresMove(state.players[0], target!.id));
  assert(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === target!.id &&
    event.protectionName === "七星连珠·无视" && event.blockKind === "ignored"));
});

test("无视对手锁定技结算时仍按属性整张消除七星", () => {
  let state = table([[TIAN_SHA_CARD, "10601"], [SEVEN_STAR_CARD]]);
  state = submitActionWindowSkill(state, state.players[0]!.id, skill(TIAN_SHA_STAR_BREAK));
  assert(!state.players[1]!.bigCards?.some(({ cardId }) => cardId === SEVEN_STAR_CARD));
});

test("四人局天煞之力只穿过邻座的七星保护", () => {
  let state = table([[TIAN_SHA_CARD], [SEVEN_STAR_CARD], [SEVEN_STAR_CARD], []]);
  state = submitActionWindowSkill(state, state.players[0]!.id, skill(TIAN_SHA_STAR_BREAK));
  assert(!state.players[1]!.bigCards?.some(({ cardId }) => cardId === SEVEN_STAR_CARD));
  assert(state.players[2]!.bigCards?.some(({ cardId }) => cardId === SEVEN_STAR_CARD));
});

test("吸来的星宿破灭清空自身后永久无视自己的出招", () => {
  let state = table([[TIAN_SHA_CARD], []], true);
  const id = state.players[0]!.id;
  state = submitActionWindowSkill(state, id, skill(TIAN_SHA_STAR_BREAK));
  assert(tianShaIgnoresMove(state.players[0], id));
  assert.equal(getActiveSkillCount(state.players[0], TIAN_SHA_STAR_BREAK), 0);
  state = drain(submit(submit(state, 0, kill(id)), 1, cake));
  assert.equal(state.players[0]!.hp, 18);
  assert(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === id && event.blockKind === "ignored"));
});

test("天煞星决可以弃置仍持有的零次星宿破灭，石头可防", () => {
  let state = table([[TIAN_SHA_CARD], []]);
  state.players[0]!.bigCards![0]!.abilityUses = { [TIAN_SHA_STAR_BREAK]: 1 };
  const target = state.players[1]!.id;
  state = drain(submit(submit(state, 0, skill(TIAN_SHA_VERDICT, target)), 1, stone));
  const card = state.players[0]!.bigCards![0]!;
  assert(!bigCardHasAbility(card, TIAN_SHA_STAR_BREAK));
  assert(!bigCardHasAbility(card, TIAN_SHA_SWORD));
  assert.equal(state.players[1]!.hp, 18);
});

test("天煞孤影击由饼防，命中直接必杀且没有伤害事件", () => {
  for (const defense of [cake, stone]) {
    let state = table([[TIAN_SHA_CARD], []]);
    const target = state.players[1]!.id;
    state = drain(submit(submit(state, 0, skill(TIAN_SHA_FINALE, target)), 1, defense));
    assert.equal(state.players[0]!.bigCards?.length, 0);
    assert.equal(state.players[0]!.cakes, 5);
    assert.equal(state.players[1]!.status === "alive", defense === cake);
    assert(!state.eventLog.some((event) => event.type === "damage" && event.targetId === target));
  }
});

test("天煞孤影击先于已声明的自爆，只有仍能自爆的人结算自爆", () => {
  let state = table([[TIAN_SHA_CARD], []]);
  const target = state.players[1]!.id;
  state = submit(state, 1, { type: "defense", defense: "self_destruct" });
  assert.equal(state.phase, "collecting_actions");
  state = drain(submit(state, 0, skill(TIAN_SHA_FINALE, target)));
  assert.equal(state.players[0]!.status, "alive");
  assert.equal(state.players[0]!.hp, 18);
  assert.equal(state.players[0]!.cakes, 5);
  assert.equal(state.players[1]!.status === "alive", false);
});

test("四人时天煞之力无视邻座的出招，命中其中一人即可将其退游", () => {
  let state = table([[TIAN_SHA_CARD], [], [], []]);
  const [owner, other] = state.players;
  assert.equal(getActiveFusionCount(owner!, "天煞孤星"), 1);
  const swordGrant = owner!.bigCards![0]!.inheritedSkillInstances![TIAN_SHA_SWORD]![0];
  const copyIndex = owner!.skillInventory!.findIndex(({ instanceId }) => instanceId === swordGrant);
  assert(copyIndex >= 0 && !canUseRawSkillInstance(owner!, copyIndex));
  state = drain(submit(submit(submit(submit(state, 0, kill(other!.id)), 1, kill(owner!.id)), 2, cake), 3, cake));
  assert.equal(state.players[0]!.hp, 18);
  assert.equal(state.players[1]!.status === "alive", false);
});

test("天煞星决在亮招后反弹普通攻击", () => {
  let state = table([[TIAN_SHA_CARD], [], []]);
  const [owner, defended, striker] = state.players;
  state = drain(submit(submit(submit(state, 0, skill(TIAN_SHA_VERDICT, defended!.id)), 1, stone), 2, kill(owner!.id)));
  assert.equal(state.players[0]!.hp, 18);
  assert(state.players[2]!.hp < 18);
  assert(state.eventLog.some((event) => event.type === "attack_reflected" && event.originalTargetId === owner!.id &&
    event.reflectedTargetId === striker!.id));
});

test("三人时天煞神剑按获取顺序忽略目标的防护，目标保留这些技能", () => {
  let state = table([[TIAN_SHA_CARD], [], []]);
  const target = state.players[1]!;
  grantInitializedSkill(state, target.id, "1050", "测试", false);
  grantInitializedSkill(state, target.id, "1049", "测试", false);
  grantInitializedSkill(state, target.id, "1067", "测试", false);
  state = drain(submit(submit(submit(state, 0, kill(target.id)), 1, cake), 2, cake));
  assert(state.players[1]!.hp < 18);
  for (const id of ["1050", "1049", "1067"]) assert(getActiveSkillCount(state.players[1], id));
});

test("天煞神剑阻止第三人的六芒星吸收本次伤害", () => {
  let state = table([[TIAN_SHA_CARD], [], []]);
  const [, target, absorber] = state.players;
  absorber!.buffs.push({ id: TIANMANG_ABSORB_STATE, stateType: TIANMANG_ABSORB_STATE, name: "真·六芒星", stacks: 1,
    sourceAbilityId: TIANMANG_ABSORB_ID, expiresAtTurn: state.turnNumber + 1 });
  state = drain(submit(submit(submit(state, 0, kill(target!.id)), 1, cake), 2, cake));
  assert.equal(state.players[1]!.hp, 17);
  assert.equal(state.players[2]!.hp, 18);
});

test("孤影绝城无视神之庇护，邻座以外的光神技能也不生效", () => {
  let state = table([[TIAN_SHA_CARD], [], [], []]);
  const owner = state.players[0]!;
  const target = state.players[2]!;
  detachBigCardAbility(owner, owner.bigCards![0]!, TIAN_SHA_POWER);
  state.roundTurnNumber = 2;
  grantInitializedSkill(state, target.id, "1031", "测试", false);
  state = drain(submit(submit(submit(submit(state, 0, kill(target.id)), 1, cake), 2, cake), 3, cake));
  assert.equal(state.players[2]!.hp, 17);
});
