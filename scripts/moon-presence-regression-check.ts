import assert from "node:assert/strict";
import { test } from "node:test";
import { addPlayerToGame, advanceActionWindow, createGame, createPlayer, getFusionSkillId, getVisibleStatusOverview,
  startGame, submitActionWindowSkill, submitPlayerAction, toPublicGameState, type GameState, type PlayerAction } from "../packages/shared/src";
import { hasMoon, isNaturalMoonAboveHorizon } from "../packages/shared/src/engine/moon";
import { MOON_CARD_ID, MOON_CHANT_ID, MOON_HUIYUE_ID, MOON_LONGING_ID, MOON_PRAISE_ID, MOON_RITUAL_ID } from "../packages/shared/src/engine/moonIds";
import { SUN_CARD_ID, SUN_RETURN_ID } from "../packages/shared/src/engine/sunIds";
import { STAR_WHEEL_CARD, STAR_WHEEL_SHIFT } from "../packages/shared/src/engine/starWheelIds";

const moonAbove = Date.parse("2000-01-07T11:00:00+08:00");
const moonBelow = Date.parse("2000-01-07T22:00:00+08:00");
const cake: PlayerAction = { type: "gain_cake" };
const defense: PlayerAction = { type: "defense", defense: "small" };
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
const cast = (skillId: string, targetId?: string): PlayerAction =>
  ({ type: "skill", skillId, stacks: 1, ...(targetId ? { targetId } : {}) });

function drain(state: GameState): GameState {
  for (let index = 0; index < 60 && state.phase === "action_window"; index++) state = advanceActionWindow(state);
  assert.notEqual(state.phase, "action_window", `未离开 ${state.activeTimingPhase}`);
  return state;
}

function game(ability: string, other?: { cardId: string; onlyAbilityId: string }): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ cardId: MOON_CARD_ID, onlyAbilityId: ability, instanceId: "moon" }];
  if (other) state.players[1]!.bigCards = [{ ...other, instanceId: "other" }];
  return drain(startGame(state));
}

function submit(state: GameState, moves: PlayerAction[]): GameState {
  for (const [index, { id, status }] of state.players.entries()) {
    if (state.phase === "collecting_actions" && status === "alive")
      state = submitPlayerAction(state, id, moves[index] ?? cake).state;
  }
  return state;
}

test("获得两张独立辉月，使用时增加当回合绝对无敌", () => {
  let state = game(MOON_HUIYUE_ID);
  const owner = state.players[0]!;
  const huiyue = getFusionSkillId("辉月");
  assert.equal(owner.skillFusions?.filter((fusion) => fusion.skillId === huiyue).length, 2);
  state = submit(state, [cake, cake, cake, cake]);
  assert.equal(state.activeTimingPhase, "turn_change_action");
  state = submitActionWindowSkill(state, owner.id, cast(huiyue) as Extract<PlayerAction, { type: "skill" }>);
  assert.ok(state.players[0]!.buffs.some((buff) => buff.id === "temp_absolute_invulnerable" &&
    buff.sourceAbilityId === MOON_HUIYUE_ID && buff.expiresAtTurn === state.turnNumber));
});

test("想月读实际月况，星移和正午锁不影响轮末回血或回合初加饼", (context) => {
  assert.equal(isNaturalMoonAboveHorizon(moonAbove), true);
  assert.equal(isNaturalMoonAboveHorizon(moonBelow), false);
  context.mock.method(Date, "now", () => moonAbove);
  let state = game(MOON_LONGING_ID, { cardId: STAR_WHEEL_CARD, onlyAbilityId: STAR_WHEEL_SHIFT });
  const [owner, enemy] = state.players;
  assert.equal(owner!.cakes, 1);
  state.sunClockOverride = { hour: 12, minute: 0, effectName: "太阳神的归返" };
  assert.equal(hasMoon(state, owner, moonBelow), false);
  enemy!.cakes = 1;
  state = drain(submit(state, [cake, sha(owner!.id)]));
  assert.ok(state.eventLog.some((event) => event.type === "heal" && event.reason === "想月·轮末回血" && event.amount === 12));
  assert.equal(state.players[0]!.hp, 29);
  assert.equal(state.players[0]!.cakes, 1);
});

test("月祭召唤显示在其他物品，月亮能防同回合直接消失", (context) => {
  context.mock.method(Date, "now", () => moonBelow);
  let state = game(MOON_RITUAL_ID, { cardId: SUN_CARD_ID, onlyAbilityId: SUN_RETURN_ID });
  const [owner, enemy] = state.players;
  owner!.cakes = 6;
  enemy!.cakes = 16;
  state = drain(submit(state, [cast(MOON_RITUAL_ID), cast(SUN_RETURN_ID), defense, defense]));
  assert.equal(state.players[0]!.status, "alive");
  assert.ok(state.eventLog.some((event) => event.type === "system" && event.message.includes("因有月而无法消失")));
  assert.ok(getVisibleStatusOverview(toPublicGameState(state, owner!.id), owner!.id)?.items.some((item) => item.label === "月亮"));
});

test("月咏主招回复 8 血，下一轮起三轮的新得饼量翻倍", () => {
  let state = game(MOON_CHANT_ID);
  state.players[0]!.cakes = 4;
  state = drain(submit(state, [cast(MOON_CHANT_ID)]));
  assert.equal(state.players[0]!.hp, 26);
  assert.equal(state.roundNumber, 2);
  state = drain(submit(state, [cake]));
  assert.equal(state.players[0]!.cakes, 2);
});

test("月赞在发动回合就为另一名玩家提供绝对无敌和攻击三倍", () => {
  let state = game(MOON_PRAISE_ID);
  const [owner, ally, enemy, other] = state.players;
  owner!.cakes = 16;
  ally!.cakes = 1;
  other!.cakes = 1;
  state = drain(submit(state, [cast(MOON_PRAISE_ID, ally!.id), sha(enemy!.id), cake, sha(ally!.id)]));
  assert.equal(state.players[1]!.hp, 18);
  assert.equal(state.players[2]!.hp, 15);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" &&
    event.protectionName === "月赞·绝对无敌、攻击×3" && event.targetId === ally!.id));
});
