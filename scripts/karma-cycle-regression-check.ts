import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer,
  getSkillUseLimit, startGame, submitPlayerAction, toPublicGameState, validateAction, type DefeatLevel, type GameState, type SkillAction
} from "../packages/shared/src";
import { createBaseEvent } from "../packages/shared/src/engine/gameFactory";
import { KARMA_CARD_ID, KARMA_CYCLE_ID, KARMA_SONG_ID } from "../packages/shared/src/engine/karmaCycleIds";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";
import { getDestroyPowerRemainingUses, getFlashDodgeCooldownCount, getFusionSkillId } from "../packages/shared/src/skills/fusion";
import { SAKURA_RAIN_ID } from "../packages/shared/src/bigCards/abilities";

const cycle: SkillAction = { type: "skill", skillId: KARMA_CYCLE_ID, stacks: 1, bigCardInstanceId: "karma-cycle" };

function advance(state: GameState): GameState {
  for (let i = 0; i < 120 && state.phase === "action_window"; i++) state = advanceActionWindow(state);
  return state;
}

function setup(...names: string[]): GameState {
  let state = createGame("甲", { maxPlayers: names.length + 2, skillMode: "big_test_select", skillCount: 4, initialHp: 30, firstTurnNoAttack: false });
  for (const name of ["乙", ...names]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ instanceId: "karma-cycle", cardId: KARMA_CARD_ID, onlyAbilityId: KARMA_CYCLE_ID },
    { instanceId: "karma-song", cardId: KARMA_CARD_ID, onlyAbilityId: KARMA_SONG_ID }];
  state = advance(startGame(state));
  state.players[0]!.cakes = 20;
  return state;
}

function cast(state: GameState, action: SkillAction): GameState {
  const [owner, ...otherPlayers] = state.players;
  state = submitPlayerAction(state, owner!.id, action).state;
  for (const player of otherPlayers) if (player.status === "alive")
    state = submitPlayerAction(state, player.id, { type: "gain_cake" }).state;
  return advance(state);
}

function defeat(state: GameState, index: number, level: DefeatLevel, sourceIndex?: number, sourceAbilityId?: string): void {
  const player = state.players[index]!;
  player.status = "dead";
  player.defeatLevel = level;
  player.hp = -1;
  state.eventLog.push({ ...createBaseEvent(state, "player_died"), type: "player_died", playerId: player.id,
    defeatLevel: level, ...(sourceIndex !== undefined ? { sourceId: state.players[sourceIndex]!.id } : {}),
    ...(sourceAbilityId ? { sourceAbilityId } : {}) });
}

function giveExpandedLimits(state: GameState, index: number): void {
  const player = state.players[index]!;
  appendSkillInstances(player, ["1044", "1102"]);
  grantInitializedSkill(state, player.id, getFusionSkillId("烽火赤壁"), "测试");
  player.buffs.push(
    { id: "limited_use_balance:1012", name: "额外次数", stacks: 3 },
    { id: "destroy_power_cooldown:test", name: "毁灭之力冷却", stacks: 1, expiresAtRound: state.roundNumber + 2 },
    { id: "flash_dodge_cooldown:test", name: "闪现冷却", stacks: 1, expiresAtRound: state.roundNumber + 3 }
  );
}

test("命宇轮回跨空间复活至必杀，仅重置成功者的次数和冷却", () => {
  let state = setup("丙", "丁", "戊", "己", "庚", "辛");
  state.roundNumber = 5;
  state.smallSpaces = { side: { name: "小空间", expiresAtRound: 10, cakeMultiplier: 1 } };
  state.players[2]!.spaceId = "side";
  defeat(state, 2, 4, 1, "1080202");
  defeat(state, 3, 1, 3, "1060705");
  defeat(state, 4, 1, 4, "1080202");
  defeat(state, 5, 3);
  state.players[5]!.buffs.push({ id: "no_revive", name: "禁止复活", stacks: 1 });
  defeat(state, 6, 5);
  defeat(state, 7, 2);
  state.players[7]!.bigCards = [{ cardId: "10531", instanceId: "sakura-rain", onlyAbilityId: SAKURA_RAIN_ID, initialized: true }];
  for (let index = 1; index < state.players.length; index++) giveExpandedLimits(state, index);
  assert.equal(getSkillUseLimit(state.players[2]!, "1012"), 6);
  assert.equal(getFlashDodgeCooldownCount(state.players[2]!, 5), 1);
  assert.equal(getDestroyPowerRemainingUses(state.players[2]!, 5), 0);
  state = cast(state, cycle);
  for (const index of [2, 7]) {
    const target = state.players[index]!;
    assert.equal(target.status, "alive");
    assert.equal(target.hp, 30);
    assert.equal(getSkillUseLimit(target, "1012"), 3);
    assert.equal(getFlashDodgeCooldownCount(target, state.roundNumber), 0);
    assert.equal(getDestroyPowerRemainingUses(target, state.roundNumber), 1);
    assert.ok(state.eventLog.some((event) => event.type === "heal" && event.targetId === target.id && event.recoveryKind === "revival"));
  }
  assert.equal(state.players[2]!.spaceId, "side");
  assert.equal(getSkillUseLimit(state.players[7]!, SAKURA_RAIN_ID), 1);
  for (const index of [3, 4, 5, 6]) assert.equal(state.players[index]!.status, "dead");
  for (const index of [1, 3, 4, 5, 6]) assert.equal(getSkillUseLimit(state.players[index]!, "1012"), 6);
});

test("轮回改卡可以选暗置整卡，与复活独立且保持私密", () => {
  let state = setup("丙", "丁");
  const [owner, live, retired, other] = state.players;
  const privateAction = { ...cycle, karmaCardChanges: [
    { cardInstanceId: "live-slot", replacementCardId: "10504" },
    { cardInstanceId: "hidden-slot", replacementCardId: "10501" }
  ] };
  state.openingBigCardDeal = { allowDuplicateAcrossPlayers: false, pool: ["10501", "10504"] };
  live!.bigCards = [{ cardId: "10502", instanceId: "live-slot", initialized: true }];
  retired!.bigCards = [{ cardId: "10502", instanceId: "hidden-slot", initialized: true },
    { cardId: "10503", instanceId: "child-only", initialized: true, onlyAbilityId: "1050302" }];
  defeat(state, 2, 5);
  assert.equal(validateAction(state, owner!.id, privateAction).ok, false);
  state = cast(state, { type: "skill", skillId: KARMA_SONG_ID, stacks: 1, bigCardInstanceId: "karma-song" });
  assert.equal(state.players[0]!.karmaReincarnation, true);
  assert.deepEqual(toPublicGameState(state, owner!.id).karmaCardChoices?.find(({ instanceId }) => instanceId === "hidden-slot"),
    { playerId: retired!.id, instanceId: "hidden-slot", number: 1 });
  assert.equal(toPublicGameState(state, other!.id).karmaCardChoices, undefined);
  assert.equal(validateAction(state, owner!.id, { ...cycle, karmaCardChanges: [
    { cardInstanceId: "live-slot", replacementCardId: "10502" }
  ] }).ok, false);
  assert.equal(validateAction(state, owner!.id, privateAction).ok, true);
  state = cast(state, privateAction);
  assert.equal(state.players[1]!.bigCards![0]!.cardId, "10504");
  assert.equal(state.players[2]!.bigCards![0]!.cardId, "10501");
  assert.equal(state.players[2]!.bigCards![1]!.instanceId, "child-only");
  assert.equal(state.players[2]!.status, "dead");
  const publicState = toPublicGameState(state, other!.id);
  assert.ok(!JSON.stringify(publicState.eventLog).includes("hidden-slot"));
  assert.ok(!publicState.players.find(({ id }) => id === retired!.id)?.bigCards?.some(({ cardId }) => cardId === "10501"));
});
