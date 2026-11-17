import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, CLOUD_BYPASS_ID, CLOUD_SEA_ID, cloudQuantity, cloudSeaCount,
  createGame, createPlayer, enterActionWindow, getActiveFusionCount, getDefenseTotal, getElementAmount,
  getFusionSkillId, HONGHUANG_ATTACK_ID, INFINITY_VALUE, LING_ELEMENT, LINGTA_CARD_ID, LINGTA_VICTORY_ID,
  SHENGLING_ID, SKY_ABSOLUTE_ID, SKY_STRIKE_ID, startGame, submitActionWindowSkill, submitPlayerAction,
  validateAction, type GameState, type PlayerAction, type SkillAction, type SkillTimingPhase
} from "@bing/shared";
import { changeCloudSeas, grantClouds, SKY_ABSOLUTE_COVER } from "../packages/shared/src/engine/lingta";
import { getElementValue, setElementValue } from "../packages/shared/src/engine/elementResources";
import { removeStateCategory } from "../packages/shared/src/engine/effectCategories";
import { LONE_STAR_PIERCE_ID } from "../packages/shared/src/engine/loneStarIds";

const at = (state: GameState, index = 0) => state.players[index]!;
const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const youtiao = { type: "defense", defense: "youtiao" } as const;
const sha = (targetId: string, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks });
const cast = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });

function drain(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let i = 0; i < 80 && state.phase === "action_window"; i++) {
    if (state.activeTimingPhase === stop) return state.actionWindowMode === "prompt" ? enterActionWindow(state, at(state).id) : state;
    state = advanceActionWindow(state);
  }
  return state;
}

function game(cards = [[LINGTA_CARD_ID], [], [], []]): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, firstTurnNoAttack: false });
  for (let i = 1; i < cards.length; i++) state = addPlayerToGame(state, createPlayer(`玩家${i}`));
  for (const [index, player] of state.players.entries()) {
    player.bigCards = cards[index]!.map((cardId, i) => ({ cardId, instanceId: `card-${index}-${i}` }));
    player.hp = 200;
    player.cakes = 20;
  }
  const started = drain(startGame(state));
  for (const player of started.players) { player.hp = 200; player.cakes = 20; }
  return started;
}

function turn(state: GameState, moves: PlayerAction[], stop?: SkillTimingPhase): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  for (const [i, player] of state.players.entries()) if (player.status === "alive" && !state.pendingActions[player.id])
    state = submitPlayerAction(state, player.id, moves[i] ?? small).state;
  return drain(state, stop);
}

function setLing(state: GameState, amount: number): void {
  setElementValue(at(state), LING_ELEMENT, [{ coefficient: amount, exponent: 0 }]);
}

test("云海挡下攻击时仍逐点判定，凌固定获得，高数值记录无限次", () => {
  const random = Math.random;
  let state = game();
  try {
    Math.random = () => .1;
    state = turn(state, [stone, sha(at(state).id, 2)]);
    assert.equal(getElementAmount(at(state), LING_ELEMENT), 2);
    assert.deepEqual(cloudQuantity(at(state)), [{ coefficient: 2, exponent: 0 }]);
    assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.protectionName === "云海·阳光之夜"));
    assert.equal(state.eventLog.filter((event) => event.type === "system" && event.probabilityChecks).length, 1);
  } finally {
    Math.random = random;
  }
  state = game([[LINGTA_CARD_ID], ["10518"], [], []]);
  state = turn(state, [stone, cast(HONGHUANG_ATTACK_ID)]);
  assert.deepEqual(getElementValue(at(state), LING_ELEMENT), INFINITY_VALUE);
  assert.deepEqual(cloudQuantity(at(state)), INFINITY_VALUE);
  const event = state.eventLog.find((item) => item.type === "system" && item.probabilityChecks);
  assert.ok(event?.type === "system");
  assert.deepEqual(event.probabilityChecks?.attempts, INFINITY_VALUE);
});

test("云海优先消耗最早到期的云", () => {
  let state = game();
  grantClouds(at(state), [{ coefficient: 7, exponent: 0 }], 0);
  grantClouds(at(state), [{ coefficient: 7, exponent: 0 }], 1);
  state = turn(state, [cast(CLOUD_SEA_ID)]);
  assert.equal(cloudSeaCount(at(state)), 1);
  assert.deepEqual(at(state).buffs.filter((buff) => buff.itemKind === "lingta_cloud").map((buff) => [buff.stacks, buff.expiresAtRound]), [[4, 5]]);
});

test("生成后三轮的轮末消散并回血", () => {
  let state = game();
  grantClouds(at(state), [{ coefficient: 1, exponent: 0 }], state.roundNumber);
  for (let round = 1; round <= 4; round++) {
    assert.equal(at(state).hp, 200);
    at(state, 1).cakes = 2;
    state = turn(state, [stone, sha(at(state, 2).id), stone, stone]);
  }
  assert.equal(state.roundNumber, 5);
  assert.equal(at(state).hp, 201);
  assert.deepEqual(cloudQuantity(at(state)), []);
});

test("盛凌在变招补出，按实际法伤给防御值，伤害本身不重开", () => {
  let state = game();
  setLing(state, 3);
  state = turn(state, [stone], "turn_change_action");
  state = submitActionWindowSkill(state, at(state).id, cast(SHENGLING_ID));
  state = drain(state);
  assert.equal(state.roundNumber, 1);
  assert.equal(getElementAmount(at(state), LING_ELEMENT), 0);
  assert.deepEqual(getDefenseTotal(at(state)), [{ coefficient: 35, exponent: 0 }]);
  assert.ok(state.players.slice(1).every((player) => player.hp === 195));
});

test("天绝可零饼发动，血量翻倍不重开，清除良好后保留护罩", () => {
  let state = game();
  at(state).cakes = 0;
  setLing(state, 10);
  changeCloudSeas(at(state), 4);
  state = submitActionWindowSkill(state, at(state).id, cast(SKY_ABSOLUTE_ID));
  state = turn(state, [stone]);
  assert.equal(state.roundNumber, 1);
  assert.equal(at(state).hp, 400);
  removeStateCategory(at(state), "positive");
  grantClouds(at(state), [{ coefficient: 1, exponent: 0 }], state.roundNumber);
  state = turn(state, [stone, sha(at(state).id)]);
  assert.equal(at(state).hp, 400);
  assert.equal(at(state).buffs.find((buff) => buff.stateType === SKY_ABSOLUTE_COVER)?.stacks, 9);
});

test("天绝护罩优先于星绝击的击穿，抵挡后照常消耗", () => {
  let state = game([[LINGTA_CARD_ID], [], ["10538"], []]);
  at(state).cakes = 0;
  setLing(state, 10);
  changeCloudSeas(at(state), 4);
  // 云海按云数验攻，让攻666的星绝击先进入命中判定。
  grantClouds(at(state), [{ coefficient: 666, exponent: 0 }], state.roundNumber);
  state = submitActionWindowSkill(state, at(state).id, cast(SKY_ABSOLUTE_ID));
  state = turn(state, [cake, stone, cast(LONE_STAR_PIERCE_ID, { targetId: at(state).id })], "turn_end_action");
  assert.equal(at(state).hp, 200);
  assert.equal(at(state).buffs.find((buff) => buff.stateType === SKY_ABSOLUTE_COVER)?.stacks, 9);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === at(state).id &&
    event.protectionName === "天绝护罩"));
});

test("天击按三回合依次小防、油条、石头，三次防住才减半", () => {
  let state = game();
  setLing(state, 31);
  changeCloudSeas(at(state), 8);
  state = submitActionWindowSkill(state, at(state).id, cast(SKY_ABSOLUTE_ID));
  state = submitActionWindowSkill(state, at(state).id, cast(CLOUD_BYPASS_ID));
  at(state).cakes = 1;
  const targetId = at(state, 1).id;
  state = turn(state, [cast(SKY_STRIKE_ID, { targetId }), small]);
  state = turn(state, [stone, youtiao]);
  state = turn(state, [stone, stone]);
  assert.equal(at(state, 1).status, "alive");
  assert.equal(getElementAmount(at(state), LING_ELEMENT), 10);
  assert.equal(cloudSeaCount(at(state)), 2);
  assert.ok(!at(state).buffs.some((buff) => buff.id === "free_sky_strike"));
});

test("首次命中的免费天击同时免饼和凌，仍要求天绝", () => {
  let state = game();
  setLing(state, 11);
  changeCloudSeas(at(state), 4);
  state = submitActionWindowSkill(state, at(state).id, cast(SKY_ABSOLUTE_ID));
  state = submitActionWindowSkill(state, at(state).id, cast(CLOUD_BYPASS_ID));
  at(state).cakes = 1;
  state = turn(state, [cast(SKY_STRIKE_ID, { targetId: at(state, 1).id }), stone]);
  assert.equal(at(state, 1).defeatLevel, 2);
  assert.equal(at(state).buffs.find((buff) => buff.id === "free_sky_strike")?.stacks, 1);
  const next = cast(SKY_STRIKE_ID, { targetId: at(state, 2).id, freeStacks: 1 });
  assert.ok(!validateAction(state, at(state).id, next).ok);
  setLing(state, 10);
  changeCloudSeas(at(state), 4);
  state = submitActionWindowSkill(state, at(state).id, cast(SKY_ABSOLUTE_ID));
  assert.equal(at(state).cakes, 0);
  assert.equal(getElementAmount(at(state), LING_ELEMENT), 0);
  assert.ok(validateAction(state, at(state).id, next).ok);
});

test("天幻实际授予，虚幻可用两种护罩换免费反弹；凌踏九霄直接获胜", () => {
  let state = game();
  assert.equal(getActiveFusionCount(at(state), "天•幻"), 1);
  state = turn(state, [small], "turn_change_action");
  const a = at(state).id, b = at(state, 1).id;
  const cakes = at(state).cakes;
  state = submitActionWindowSkill(state, a, cast(getFusionSkillId("虚幻"), {
    switchActionIndex: 0, switchToAction: { type: "defense", defense: "rebound", targetId: b }
  }));
  assert.equal(at(state).cakes, cakes);
  assert.equal(at(state).buffs.find((buff) => buff.id === "skill_used:1054")?.stacks, 1);
  assert.equal(at(state).buffs.find((buff) => buff.id === "skill_used:1055")?.stacks, 1);
  state = drain(state);
  assert.ok(!validateAction(state, a, cast(SKY_STRIKE_ID, { targetId: b })).ok);
  setLing(state, 36);
  changeCloudSeas(at(state), 9);
  state = submitActionWindowSkill(state, a, cast(LINGTA_VICTORY_ID));
  assert.deepEqual(state.winnerIds, [a]);
  assert.equal(state.victoryCounter, undefined);
});
