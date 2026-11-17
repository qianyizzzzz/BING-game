import assert from "node:assert/strict";
import { test } from "node:test";
import { addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getActiveSkillCount,
  getCakeGainAmount, getSkill, startGame, submitActionWindowSkill, submitPlayerAction, submitVictoryCounter, validateActionWindowSkill,
  type GameState, type PlayerAction, type SkillAction } from "../packages/shared/src";
import { getCheatSharpDamageUses } from "../packages/shared/src/engine/cheatServer";
import { CHEAT_ABSOLUTE_ID, CHEAT_BACKLASH_ID, CHEAT_CARD_ID, CHEAT_GATHER_ID, CHEAT_GATHER_STATE, CHEAT_GREED_ID,
  CHEAT_NOGLUES_ID, CHEAT_NOGLUES_STATE, CHEAT_SHARP_DAMAGE_ID, CHEAT_SHARP_ID, CHEAT_TRANSFER_ID, CHEAT_VICTORY_ID,
  CHEAT_WARP_ID, CHEAT_WARP_STATE } from "../packages/shared/src/engine/cheatServerIds";
import { getCheatServerUseOptions } from "../packages/shared/src/engine/cheatServerUses";
import { stateHasCategory } from "../packages/shared/src/engine/effectCategories";

const skill = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });
const cake = { type: "gain_cake" } as const;

function advance(state: GameState): GameState {
  for (let i = 0; i < 80 && state.phase === "action_window" && !state.victoryCounter; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 2, initialHp: 30, firstTurnNoAttack: false });
  for (const name of ["乙", "丙"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ cardId: CHEAT_CARD_ID, instanceId: "cheats" }];
  state = advance(startGame(state));
  for (const player of state.players) player.cakes = 30;
  return state;
}

function playTurn(state: GameState, moves: PlayerAction[] = []): GameState {
  for (const [index, player] of state.players.entries())
    if (player.status === "alive") state = submitPlayerAction(state, player.id, moves[index] ?? cake).state;
  return state;
}

test("七条整局限次都有标签，通过常规窗口单独支付次数", () => {
  let state = fixture();
  const ownerId = state.players[0]!.id;
  for (const [id, uses] of [[CHEAT_GATHER_ID, 1], [CHEAT_SHARP_ID, 4], [CHEAT_NOGLUES_ID, 2], [CHEAT_WARP_ID, 3],
    [CHEAT_ABSOLUTE_ID, 4], [CHEAT_GREED_ID, 3], [CHEAT_TRANSFER_ID, 3]] as const) {
    assert.ok(getSkill(id)?.typeTags.includes("限定技"));
    assert.equal(getSkill(id)?.play?.usesPerGame, uses);
  }
  state = submitPlayerAction(state, ownerId, skill(CHEAT_GATHER_ID)).state;
  assert.equal(state.pendingActions[ownerId], undefined);
  const gathering = state.players[0]!.buffs.find(({ stateType }) => stateType === CHEAT_GATHER_STATE)!;
  assert.ok(gathering);
  assert.equal(gathering.expiresAtRound, state.roundNumber + 5);
  assert.equal(stateHasCategory(gathering, "positive"), false);
  assert.equal(validateActionWindowSkill(state, ownerId, skill(CHEAT_GATHER_ID)).ok, false);
  state = advance(playTurn(state, [cake, { type: "attack", attackId: "sha", stacks: 1, targetId: ownerId }]));
  assert.equal(state.players[0]!.hp, 30);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.protectionName === "The gathering·无敌"));
});

test("永久攻等与防御值增加，法伤机会独立于开挂，Iseedeadpeople 保留目标防御值", () => {
  let state = fixture();
  const [ownerId, targetId] = state.players.map(({ id }) => id) as [string, string, string];
  state = submitActionWindowSkill(state, ownerId, skill(CHEAT_SHARP_ID));
  assert.equal(getCheatSharpDamageUses(state.players[0]), 2);
  assert.equal(state.players[0]!.buffs.find(({ id }) => id === "defense_value")?.stacks, 5);
  state.players[1]!.buffs.push({ id: "defense_value", name: "防御值", stacks: 10 });
  state = advance(submitActionWindowSkill(state, ownerId, skill(CHEAT_SHARP_DAMAGE_ID, { targetId })));
  assert.equal(getCheatSharpDamageUses(state.players[0]), 1);
  assert.equal(state.players[0]!.hp, 30);
  assert.equal(state.players[1]!.hp, 29);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceAbilityId === CHEAT_SHARP_DAMAGE_ID && event.spellDamage));
  state.players[0]!.cakes = 1;
  state = advance(playTurn(state, [{ type: "attack", attackId: "sha", stacks: 1, targetId }]));
  assert.equal(state.players[1]!.hp, 27);
  assert.equal(state.players[1]!.buffs.find(({ id }) => id === "defense_value")?.stacks, 10);
});

test("Noglues 只作用同空间，不良被免疫仍获得暗置完整卡，届期移除副本", () => {
  let state = fixture();
  const [ownerId, targetId] = state.players.map(({ id }) => id) as [string, string, string];
  const initialRound = state.roundNumber;
  state.players[1]!.bigCards = [{ cardId: "10504", instanceId: "target-card", initialized: true }];
  state.players[1]!.buffs.push({ id: "temp_negative_status_immunity", name: "免疫不良", stacks: 1, expiresAtTurn: state.turnNumber });
  state.players[2]!.bigCards = [{ cardId: "10502", instanceId: "other-space-card", initialized: true }];
  state.smallSpaces = { side: { name: "小空间", expiresAtRound: initialRound + 20, cakeMultiplier: 1 } };
  state.players[2]!.spaceId = "side";
  assert.equal(validateActionWindowSkill(state, ownerId, skill(CHEAT_NOGLUES_ID, { cheatCardInstanceId: "other-space-card" })).ok, false);
  state = submitActionWindowSkill(state, ownerId, skill(CHEAT_NOGLUES_ID, { cheatCardInstanceId: "target-card" }));
  const copy = state.players[0]!.bigCards?.find(({ cardId }) => cardId === "10504");
  assert.equal(copy?.borrowedUntilRound, initialRound + 5);
  assert.equal(state.players[1]!.bigCards?.[0]?.instanceId, "target-card");
  assert.ok(state.players.every((player) => !player.buffs.some(({ stateType }) => stateType === CHEAT_NOGLUES_STATE)));
  state.players[1]!.buffs = [];
  state = advance(submitActionWindowSkill(state, ownerId, skill(CHEAT_NOGLUES_ID, { cheatCardInstanceId: "target-card" })));
  const disabled = state.players[1]!.buffs.find(({ stateType }) => stateType === CHEAT_NOGLUES_STATE)!;
  assert.ok(stateHasCategory(disabled, "negative"));
  assert.equal(disabled.expiresAtRound, initialRound + 3);
  assert.ok(!state.players[2]!.buffs.some(({ stateType }) => stateType === CHEAT_NOGLUES_STATE));
  assert.equal(getActiveSkillCount(state.players[1], "1050401"), 0);
  for (let i = 0; i < 8 && state.roundNumber < initialRound + 5; i++) {
    state.players[0]!.cakes = 1;
    state = advance(playTurn(state, [{ type: "attack", attackId: "sha", stacks: 1, targetId }]));
  }
  assert.equal(state.roundNumber, initialRound + 5);
  assert.ok(!state.players[0]!.bigCards?.some(({ cardId }) => cardId === "10504"));
  assert.ok(!state.players[1]!.buffs.some(({ stateType }) => stateType === CHEAT_NOGLUES_STATE));
});

test("Warpten 是良好，连续开挂照常叠加、转次数和加饼，再结算反噬", () => {
  let state = fixture();
  const ownerId = state.players[0]!.id;
  const cast = (action: SkillAction) => { state = advance(submitActionWindowSkill(state, ownerId, action)); };
  const originalTurn = state.turnNumber;
  cast(skill(CHEAT_WARP_ID));
  assert.equal(getCakeGainAmount(state, state.players[0]), 4);
  assert.ok(stateHasCategory(state.players[0]!.buffs.find(({ stateType }) => stateType === CHEAT_WARP_STATE)!, "positive"));
  cast(skill(CHEAT_WARP_ID));
  assert.equal(getCakeGainAmount(state, state.players[0]), 16);
  assert.equal(state.players[0]!.hp, 27);
  assert.equal(state.turnNumber, originalTurn);
  cast(skill(CHEAT_TRANSFER_ID, { cheatTransferFrom: `${CHEAT_WARP_ID}:cheats`, cheatTransferTo: `${CHEAT_GREED_ID}:cheats` }));
  const limits = getCheatServerUseOptions(state.players[0]!);
  assert.equal(limits.find(({ skillId }) => skillId === CHEAT_WARP_ID)?.remaining, 0);
  assert.equal(limits.find(({ skillId }) => skillId === CHEAT_GREED_ID)?.remaining, 4);
  const before = state.players[0]!.cakes;
  cast(skill(CHEAT_GREED_ID));
  assert.ok(state.eventLog.some((event) => event.type === "cake_changed" && event.reason === "Greedisgood" && event.before === before && event.after === before + 5));
  assert.equal(state.eventLog.filter((event) => event.type === "damage" && event.sourceAbilityId === CHEAT_BACKLASH_ID).length, 3);
  for (let i = 0; i < 3; i++) state = advance(playTurn(state));
  const hp = state.players[0]!.hp;
  cast(skill(CHEAT_GREED_ID));
  assert.equal(state.players[0]!.hp, hp);
});

test("Whosyourdaddy 只在变招阶段开启，20 饼胜利可被逆转", () => {
  let state = fixture();
  const ownerId = state.players[0]!.id;
  assert.equal(validateActionWindowSkill(state, ownerId, skill(CHEAT_ABSOLUTE_ID)).ok, false);
  state = playTurn(state, [cake, { type: "attack", attackId: "sha", stacks: 1, targetId: ownerId }]);
  assert.equal(state.activeTimingPhase, "turn_change_action");
  state = advance(submitActionWindowSkill(state, ownerId, skill(CHEAT_ABSOLUTE_ID)));
  assert.equal(state.players[0]!.hp, 30);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.protectionName === "Whosyourdaddy·绝对无敌"));
  appendSkillInstances(state.players[1]!, ["1092", "1092", "1092", "1092", "1092"]);
  const before = state.players[0]!.cakes;
  state = advance(submitActionWindowSkill(state, ownerId, skill(CHEAT_VICTORY_ID)));
  assert.ok(state.eventLog.some((event) => event.type === "cake_changed" && event.reason === "阶段技能消耗" &&
    event.before === before && event.after === before - 20));
  assert.equal(state.activeTimingPhase, "victory_counter_action");
  assert.equal(state.victoryCounter?.claims[0]?.playerId, ownerId);
  assert.equal(state.victoryCounter?.claims[0]?.protected, false);
});

test("胜利挂的反噬致死后，技能胜利仍成立并能被五次逆转取消", () => {
  let state = fixture();
  const [ownerId, opponentId] = state.players.map(({ id }) => id) as [string, string, string];
  state.players[0]!.hp = 2;
  appendSkillInstances(state.players[1]!, ["1092", "1092", "1092", "1092", "1092"]);
  state = submitActionWindowSkill(state, ownerId, skill(CHEAT_GREED_ID));
  state = advance(submitActionWindowSkill(state, ownerId, skill(CHEAT_VICTORY_ID)));
  assert.equal(state.players[0]!.hp, -1);
  assert.equal(state.players[0]!.status, "dead");
  assert.equal(state.victoryCounter?.claims[0]?.playerId, ownerId);
  const claim = state.victoryCounter!.claims[0]!;
  state = submitVictoryCounter(state, opponentId, { kind: "contribute", count: 5, claimId: claim.id });
  assert.equal(state.players[0]!.defeatLevel, 6);
  assert.equal(state.victoryCounter, undefined);
  assert.notEqual(state.phase, "finished");
});
