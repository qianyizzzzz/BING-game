import assert from "node:assert/strict";
import { test } from "node:test";
import { addPlayerToGame, createGame, createPlayer, victoryEligiblePlayers, type GameState } from "../packages/shared/src";
import { effectHasCategory } from "../packages/shared/src/engine/effectCategories";
import { captureInitialPlayerStates } from "../packages/shared/src/engine/initialPlayerState";
import { withSkillsIgnored } from "../packages/shared/src/engine/skillIgnore";
import { canAffectAcrossSpace, isSoulExiled } from "../packages/shared/src/engine/spaces";
import {
  applyYuanOrigin, applyYuanVoidEntries, grantYuanInvulnerability, grantYuanVoidDodge, hasYuanVoidDodge,
  queueYuanVoidSpace, randomYuanSkillDisappearance, yuanOtherTargets
} from "../packages/shared/src/engine/yuan";
import { YUAN_ORIGIN_ID, YUAN_RETURN_ID, YUAN_VOID_ID } from "../packages/shared/src/engine/yuanIds";

function game(): GameState {
  const state = createGame("元", { skillMode: "big_test_select" });
  return addPlayerToGame(addPlayerToGame(state, createPlayer("乙")), createPlayer("丙"));
}

test("初元先让完整大卡消失再恢复初始，可同时恢复施术者", () => {
  const state = game();
  const [source, target] = state.players;
  source!.hp = 18;
  target!.hp = 20;
  target!.bigCards = [{ cardId: "10501", instanceId: "whole" },
    { cardId: "10502", instanceId: "one-subskill", onlyAbilityId: "1050202" }];
  captureInitialPlayerStates(state);
  source!.hp = 4;
  target!.hp = 3;
  assert.deepEqual(applyYuanOrigin(state, source!, target, true), { targetRestored: true, sourceRestored: true });
  assert.equal(source!.hp, 18);
  assert.equal(target!.hp, 20);
  assert.deepEqual(target!.bigCards.map(({ instanceId }) => instanceId), ["whole", "one-subskill"]);
  const relevant = state.eventLog.filter((event) => event.type === "system" && (event.removalKind === "disappear" || /因初元恢复/.test(event.message)));
  assert.deepEqual(relevant.map(({ message }) => message), ["乙 的一张大卡消失", "乙 因初元恢复至初始", "元 因初元恢复至初始"]);
});

test("技能消失独立于失去、弃置和消除，免疫技能消失时仍恢复", () => {
  const state = game();
  const [source, target] = state.players;
  target!.bigCards = [{ cardId: "10501", instanceId: "whole" }];
  target!.hp = 20;
  captureInitialPlayerStates(state);
  target!.buffs.push({ id: "other-categories", name: "其他类别免疫", stacks: 1,
    immuneEffectCategories: ["skill_loss", "skill_discard", "remove_skills"] });
  assert.equal(effectHasCategory(YUAN_ORIGIN_ID, "skill_disappearance"), true);
  assert.equal(effectHasCategory(YUAN_ORIGIN_ID, "skill_loss"), false);
  assert.equal(randomYuanSkillDisappearance(state, source!, target!), true);
  assert.deepEqual(target!.bigCards, []);

  target!.bigCards = [{ cardId: "10501", instanceId: "whole" }];
  target!.hp = 4;
  target!.buffs.push({ id: "prevent-vanish", name: "技能消失免疫", stacks: 1, immuneEffectCategories: ["skill_disappearance"] });
  const logsBefore = state.eventLog.length;
  assert.deepEqual(applyYuanOrigin(state, source!, target, false), { targetRestored: true, sourceRestored: false });
  assert.equal(target!.hp, 20);
  assert.ok(!state.eventLog.slice(logsBefore).some((event) => event.type === "system" && event.removalKind === "disappear"));
});

test("虚元在本次伤害结算前只登记，移入后属于可行动且不计人数的独立小空间", () => {
  const state = game();
  const [source, target, other] = state.players;
  assert.deepEqual(yuanOtherTargets(state, source!).map(({ id }) => id), [target!.id, other!.id]);
  queueYuanVoidSpace(state, target!);
  queueYuanVoidSpace(state, target!);
  assert.equal(target!.spaceId, undefined);
  assert.deepEqual(state.yuanVoidEntries, { turnNumber: state.turnNumber, playerIds: [target!.id] });
  applyYuanVoidEntries(state);
  assert.equal(state.yuanVoidEntries, undefined);
  assert.equal(state.smallSpaces?.[target!.spaceId!]?.kind, "yuan_void");
  assert.equal(state.smallSpaces?.[target!.spaceId!]?.expiresAtRound, state.roundNumber + 5);
  assert.equal(state.smallSpaces?.[target!.spaceId!]?.cakeMultiplier, 1);
  assert.equal(isSoulExiled(state, target), false);
  assert.equal(canAffectAcrossSpace(state, source!.id, target!.id), false);
  assert.deepEqual(victoryEligiblePlayers(state).map(({ id }) => id), [source!.id, other!.id]);
});

test("归元无敌和虚元回避只在当前回合生效，并带各自的技能来源", () => {
  const state = game();
  const source = state.players[0]!;
  grantYuanInvulnerability(state, source);
  grantYuanVoidDodge(state, source);
  const invulnerability = source.buffs.find((buff) => buff.stateType === "gather_invulnerability");
  assert.equal(invulnerability?.sourceAbilityId, YUAN_RETURN_ID);
  assert.equal(invulnerability?.expiresAtTurn, state.turnNumber + 1);
  assert.equal(hasYuanVoidDodge(state, source), true);
  assert.equal(withSkillsIgnored(source, { skillId: YUAN_VOID_ID }, () => hasYuanVoidDodge(state, source)), false);
  state.turnNumber += 1;
  assert.equal(hasYuanVoidDodge(state, source), false);
});
