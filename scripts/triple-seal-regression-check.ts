import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, createGame, createPlayer, FIRE_TALISMAN_ID, getCakeGainAmount,
  getFusionJudgmentRank, getFusionSkillId, getFusionTier, startGame, submitPlayerAction,
  toPublicGameState, validateAction, victoryEligiblePlayers, WATER_TALISMAN_ID, WOOD_TALISMAN_ID,
  type GameState, type PlayerAction, type SkillAction
} from "../packages/shared/src";
import { addIceFireMarks } from "../packages/shared/src/engine/attackMarks";
import { addSpareLife } from "../packages/shared/src/engine/kaige";
import { attachTalisman } from "../packages/shared/src/engine/tripleSeal";
import { excludedByTripleSeal, hasTalisman } from "../packages/shared/src/engine/talismanRules";
import { restorePlayerInitialState } from "../packages/shared/src/engine/initialPlayerState";

const gain = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const at = (state: GameState, index = 0) => state.players[index]!;
const move = (skillId: string, targetId?: string): SkillAction => ({ type: "skill", skillId, stacks: 1, ...(targetId ? { targetId } : {}) });
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });

function drain(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && i < 50; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(cards = [["10533"], ["10501"], []]): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, firstTurnNoAttack: false });
  for (let i = 1; i < cards.length; i++) state = addPlayerToGame(state, createPlayer(`玩家 ${i}`));
  for (const [i, player] of state.players.entries()) player.bigCards = cards[i]!.map((cardId, j) => ({ cardId, instanceId: `card-${i}-${j}` }));
  state = drain(startGame(state));
  for (const player of state.players) { player.cakes = 10; player.hp = 20; }
  return state;
}

function turn(state: GameState, ...moves: PlayerAction[]): GameState {
  assert.equal(state.phase, "collecting_actions");
  for (const [i, player] of state.players.entries()) if (player.status === "alive")
    state = submitPlayerAction(state, player.id, moves[i] ?? gain).state;
  return drain(state);
}

test("灵符按各自条件防住，等级参与对撞，灵符本身不造成伤害", () => {
  let state = fixture();
  const targetId = at(state, 1).id;
  state = turn(state, move(FIRE_TALISMAN_ID, targetId), stone);
  assert.equal(hasTalisman(at(state, 1), "fire"), false);
  state = turn(state, move(WATER_TALISMAN_ID, targetId), gain);
  assert.equal(hasTalisman(at(state, 1), "water"), false);
  state = turn(state, move(WOOD_TALISMAN_ID, targetId), sha(at(state).id));
  assert.equal(hasTalisman(at(state, 1), "wood"), false);
  assert.equal(at(state, 1).hp, 20);
  assert.ok(state.eventLog.some((event) => event.type === "clash" && event.result.includes("等级更高")));
  state = fixture();
  state = turn(state, move(WOOD_TALISMAN_ID, at(state, 1).id), stone);
  assert.equal(hasTalisman(at(state, 1), "wood"), true);
  assert.equal(at(state, 1).hp, 20);
});

test("火符命中后禁止技能攻击，第三回合清良好、防御值和1饼", () => {
  let state = fixture();
  const targetId = at(state, 1).id;
  state = turn(state, move(FIRE_TALISMAN_ID, targetId), gain);
  assert.equal(hasTalisman(at(state, 1), "fire"), true);
  assert.deepEqual(validateAction(state, targetId, move("1050101", at(state).id)),
    { ok: false, error: "火之灵符禁止使用技能攻击" });
  assert.equal(validateAction(state, targetId, sha(at(state).id)).ok, true);
  at(state, 1).buffs.push({ id: "defense_value", name: "防御值", stacks: 6 },
    { id: "sakura_growth", stateType: "sakura_growth", name: "良好", stacks: 1 });
  state = turn(state);
  assert.ok(at(state, 1).buffs.some(({ id }) => id === "defense_value"));
  state = turn(state);
  assert.equal(state.turnNumber, 4);
  assert.ok(!at(state, 1).buffs.some(({ id }) => ["defense_value", "sakura_growth"].includes(id)));
  assert.ok(state.eventLog.some((event) => event.type === "cake_changed" && event.playerId === targetId &&
    event.turnNumber === 4 && event.reason === "火之灵符" && event.before - event.after === 1));
});

test("水符禁止非攻击技能出招，第三回合清持续状态并让已提交攻击无效", () => {
  let state = fixture([["10533"], ["10504"], []]);
  const targetId = at(state, 1).id;
  state = turn(state, move(WATER_TALISMAN_ID, targetId), stone);
  assert.equal(hasTalisman(at(state, 1), "water"), true);
  assert.deepEqual(validateAction(state, targetId, move("1050401")), { ok: false, error: "水之灵符禁止使用非攻击技能出招" });
  at(state, 1).buffs.push({ id: "test_ongoing", stateType: "test_ongoing", name: "持续状态", stacks: 1, expiresAtTurn: 20 });
  state = turn(turn(state));
  assert.ok(!at(state, 1).buffs.some(({ id }) => id === "test_ongoing"));
  assert.equal(hasTalisman(at(state, 1), "water"), true);
  const cakes = at(state, 1).cakes;
  state = turn(state, gain, sha(at(state).id));
  assert.equal(at(state).hp, 20);
  assert.equal(at(state, 1).cakes, cakes - 1);
});

test("灵符的每三回合计时跨轮继续", () => {
  let state = fixture();
  const targetId = at(state, 1).id;
  state = turn(state, move(FIRE_TALISMAN_ID, targetId));
  state = turn(state, gain, gain, sha(at(state).id));
  assert.equal(state.roundNumber, 2);
  assert.equal(state.turnNumber, 3);
  state = turn(state, gain, gain);
  assert.equal(state.turnNumber, 4);
  assert.ok(state.eventLog.some((event) => event.type === "cake_changed" && event.playerId === targetId &&
    event.roundNumber === 2 && event.turnNumber === 2 && event.reason === "火之灵符" && event.before - event.after === 1));
});

test("木符阻止普通攻击与新增资源，仍可进行防御", () => {
  let state = fixture([["10533"], ["10507"], []]);
  const targetId = at(state, 1).id;
  state = turn(state, move(WOOD_TALISMAN_ID, targetId), stone);
  assert.deepEqual(validateAction(state, targetId, sha(at(state).id)), { ok: false, error: "木之灵符禁止使用普通攻击" });
  assert.equal(validateAction(state, targetId, stone).ok, true);
  assert.equal(getCakeGainAmount(state, at(state, 1)), 0);
  assert.equal(addSpareLife(at(state, 1), { hp: 12 }, state), false);
  const cakes = at(state, 1).cakes;
  state = turn(state, gain, gain);
  assert.equal(at(state, 1).cakes, cakes);
  at(state, 2).cakes = 0;
  state = turn(state, gain, move("1050703"), gain);
  assert.ok(!at(state, 1).buffs.some(({ id }) => id === "defense_value"));
});

test("相克与相生按相反方向计算，三种符同在后成为永久规则", () => {
  const state = fixture();
  const source = at(state);
  const target = at(state, 1);
  assert.equal(attachTalisman(state, source, target, "fire"), true);
  assert.equal(attachTalisman(state, source, target, "water"), true);
  const status = (kind: string) => target.buffs.find(({ id }) => id === `triple_talisman:${kind}`)!;
  assert.equal(status("fire").expiresAtRound, state.roundNumber + 1);
  assert.equal(status("water").expiresAtRound, state.roundNumber + 6);
  assert.equal(attachTalisman(state, source, target, "wood"), true);
  assert.ok(excludedByTripleSeal(target));
  assert.equal(victoryEligiblePlayers(state).length, 2);
  assert.equal(target.status, "alive");
  assert.ok(restorePlayerInitialState(state, target));
  assert.ok(excludedByTripleSeal(target));
  assert.match(toPublicGameState(state, target.id).statusOverview!.space[0]!.value, /不计为场上人数/);

  const other = at(state, 2);
  attachTalisman(state, source, other, "water");
  state.roundNumber++;
  attachTalisman(state, source, other, "fire");
  assert.equal(other.buffs.find(({ id }) => id === "triple_talisman:water")?.expiresAtRound, state.roundNumber + 3);
  assert.equal(other.buffs.find(({ id }) => id === "triple_talisman:fire")?.expiresAtRound, state.roundNumber + 2);
});

test("真授予王者判定的三槽三元协奏曲，其子融合可储存超过六层冰火印记", () => {
  const state = fixture();
  const source = at(state);
  const fusion = source.skillFusions!.find((entry) => entry.skillId === getFusionSkillId("三元协奏曲"))!;
  const child = source.skillFusions!.find((entry) => fusion.materialFusionIds!.includes(entry.id) &&
    entry.skillId === getFusionSkillId("冰火狂暴曲"))!;
  assert.equal(getFusionTier(fusion.skillId), 3);
  assert.equal(getFusionJudgmentRank(fusion), "V");
  addIceFireMarks(source, child.id, 12, 6);
  assert.equal(source.buffs.find((buff) => buff.id === "ice_fire_mark" && buff.sourceFusionId === child.id)?.stacks, 12);
});
