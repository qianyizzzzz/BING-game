import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getAllSkills, getSkillAttackStats, startGame,
  submitActionWindowSkill, submitPlayerAction, type GameState, type PlayerAction
} from "../packages/shared/src";
import { addBigCardStatus } from "../packages/shared/src/engine/bigCards";
import { DEAD_REALM_CARD_ID, DEAD_REALM_DODGE_ID } from "../packages/shared/src/engine/deadRealmIds";
import { SKILL_DISABLED_BUFF_PREFIX } from "../packages/shared/src/engine/effectCategories";
import { KARMA_CARD_ID, KARMA_PUNISH_ID, KARMA_SONG_END_ID, KARMA_SONG_ID, KARMA_SONG_STATUS_LOCK } from "../packages/shared/src/engine/karmaCycleIds";
import { grantFreeMove } from "../packages/shared/src/engine/wujin";

const cake = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;

function drain(state: GameState): GameState {
  for (let i = 0; i < 80 && state.phase === "action_window"; i++) state = advanceActionWindow(state);
  return state;
}

function setup(): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, initialHp: 30, firstTurnNoAttack: false });
  state = addPlayerToGame(state, createPlayer("乙"));
  state = addPlayerToGame(state, createPlayer("丙"));
  state.players[0]!.bigCards = [KARMA_PUNISH_ID, KARMA_SONG_ID].map((id) => ({ instanceId: id, cardId: KARMA_CARD_ID, onlyAbilityId: id }));
  state.players[1]!.bigCards = [{ instanceId: DEAD_REALM_DODGE_ID, cardId: DEAD_REALM_CARD_ID, onlyAbilityId: DEAD_REALM_DODGE_ID }];
  return drain(startGame(state));
}

function play(state: GameState, ...moves: PlayerAction[]): GameState {
  state.players.forEach((player) => { player.cakes = 10; });
  for (const [index, { id }] of state.players.entries())
    state = submitPlayerAction(state, id, moves[index] ?? cake).state;
  return drain(state);
}

test("命运惩戒造成十点攻击伤害、石头防无效，并使目标技能失效至下一轮末", () => {
  let state = setup();
  const target = state.players[2]!.id;
  const stats = getSkillAttackStats(KARMA_PUNISH_ID, 1)!;
  assert.deepEqual([stats.power, stats.level, stats.defenseTag], [10, 0, "unblockable"]);
  const rounds = state.roundNumber;
  state = play(state, { type: "skill", skillId: KARMA_PUNISH_ID, stacks: 1, targetId: target }, cake, stone);
  assert.equal(state.players[2]!.hp, 20);
  assert.ok(state.players[2]!.buffs.some(({ id }) => id === SKILL_DISABLED_BUFF_PREFIX + (rounds + 1)));
});

test("轮回保持胜负计数并忽略普通死亡，无法获得新状态，结束后正常判死", () => {
  let state = play(setup(), { type: "skill", skillId: KARMA_SONG_ID, stacks: 1 });
  const sourceId = state.players[0]!.id;
  const caster = state.players[0]!;
  assert.equal(caster.karmaReincarnation, true);
  assert.ok(caster.buffs.some(({ id }) => id === KARMA_SONG_STATUS_LOCK));
  assert.equal(addBigCardStatus(state, sourceId, "burning", state.players[1]!.id, "1050101", undefined, {}, true), false);
  assert.equal(addBigCardStatus(state, sourceId, "positive_regression_status", sourceId, "1050101", undefined, {}, false), false);
  caster.hp = 0;
  state = play(state, cake, { type: "attack", attackId: "sha", targetId: sourceId, stacks: 1 });
  assert.equal(state.players[0]!.hp, -1);
  assert.equal(state.players[0]!.karmaReincarnation, true);
  assert.equal(state.players[0]!.status, "alive");
  assert.notEqual(state.phase, "finished");
  state = drain(submitActionWindowSkill(state, sourceId, { type: "skill", skillId: KARMA_SONG_END_ID, stacks: 1 }));
  assert.equal(state.players[0]!.status, "dead");
  assert.equal(state.players[0]!.karmaReincarnation, undefined);
  assert.ok(!state.players[0]!.buffs.some(({ id }) => id === KARMA_SONG_STATUS_LOCK));
});

test("冥不会回避轮回玩家的攻击", () => {
  let state = play(setup(), { type: "skill", skillId: KARMA_SONG_ID, stacks: 1 });
  const targetId = state.players[1]!.id;
  const oldRandom = Math.random;
  Math.random = () => 0;
  try {
    state = play(state, { type: "attack", attackId: "sha", targetId, stacks: 1 });
    assert.equal(state.players[1]!.hp, 29);
  } finally {
    Math.random = oldRandom;
  }
});

test("轮回可以获得防御值，但不能获得印记和免费出招库存", () => {
  let state = play(setup(), { type: "skill", skillId: KARMA_SONG_ID, stacks: 1 });
  const [caster, archer] = state.players;
  const armorId = "1050102";
  caster!.bigCards!.push({ instanceId: armorId, cardId: "10501", onlyAbilityId: armorId });
  appendSkillInstances(archer!, ["1019"]);
  grantFreeMove(state, caster!, { type: "attack", attackId: "sha", stacks: 1 }, 1);
  assert.ok(!caster!.buffs.some((buff) => buff.freeMove));
  state = play(state, { type: "skill", skillId: armorId, stacks: 1, targetIds: [archer!.id, state.players[2]!.id] },
    { type: "attack", attackId: "wan_jian", stacks: 1 });
  const owner = state.players[0]!;
  assert.ok(owner.buffs.some((buff) => buff.id === "defense_value" && buff.stacks > 0));
  assert.ok(!owner.buffs.some((buff) => buff.id.startsWith("ice_rain:")));
});

test("轮回仍会正常承受退游点伤害", () => {
  let state = play(setup(), { type: "skill", skillId: KARMA_SONG_ID, stacks: 1 });
  const paper = getAllSkills().find(({ name }) => name === "卷子")!.id;
  appendSkillInstances(state.players[1]!, [paper]);
  state = play(state, cake, { type: "skill", skillId: paper, stacks: 1, targetId: state.players[0]!.id });
  assert.equal(state.players[0]!.status, "dead");
  assert.equal(state.players[0]!.defeatLevel, 2);
  assert.equal(state.players[0]!.karmaReincarnation, undefined);
});
