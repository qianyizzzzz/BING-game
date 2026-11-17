import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, startGame,
  submitActionWindowSkill, submitPlayerAction, type GameState, type PlayerAction
} from "../packages/shared/src";
import { SEA_GOD_CARD_ID, SEA_GOD_IGNORE_ID } from "../packages/shared/src/engine/seaGodIds";
import { SEA_GOD_REVIVAL_BLOCK } from "../packages/shared/src/engine/seaGodIgnore";

const cake = { type: "gain_cake" } as const;
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
const wanJian = { type: "attack", attackId: "wan_jian", stacks: 1 } as const;
const small = { type: "defense", defense: "small" } as const;
const p = (state: GameState, index: number) => state.players[index]!;

function advance(state: GameState, phase: GameState["activeTimingPhase"] = "turn_action"): GameState {
  for (let i = 0; i < 50 && state.phase === "action_window" && state.activeTimingPhase !== phase; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(): GameState {
  let state = createGame("海神", { skillMode: "big_test_select", initialHp: 30, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  p(state, 0).bigCards = [{ cardId: SEA_GOD_CARD_ID, instanceId: "sea", onlyAbilityId: SEA_GOD_IGNORE_ID }];
  state = advance(startGame(state));
  for (const player of state.players) player.cakes = 20;
  return state;
}

function reveal(state: GameState, moves: PlayerAction[]): GameState {
  for (const [index, { id, status }] of state.players.entries()) {
    if (status !== "alive") continue;
    const result = submitPlayerAction(state, id, moves[index] ?? cake);
    assert.equal(result.error, undefined);
    state = result.state;
  }
  return advance(state, "turn_change_action");
}

function destroy(state: GameState, index: number, choice: "power_times_3_level_to_zero" | "power_plus_2_level_minus_2") {
  return submitActionWindowSkill(state, p(state, index).id, {
    type: "skill", skillId: "1044", stacks: 1, switchActionIndex: 0, attackStatModifier: choice
  });
}

test("千载空悠在对撞前无视技能攻击，海神的负等级攻击照常命中", () => {
  let state = fixture();
  const [holder, opponent] = state.players;
  appendSkillInstances(holder!, ["1044"]);
  appendSkillInstances(opponent!, ["1081", "1050"]);
  state = destroy(reveal(state, [sha(opponent!.id), { type: "skill", skillId: "1081", targetId: holder!.id, stacks: 1 }]),
    0, "power_plus_2_level_minus_2");
  state = advance(state);
  assert.equal(p(state, 0).hp, 30);
  assert.equal(p(state, 1).hp, 27);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === holder!.id &&
    event.protectionName === "千载空悠" && event.blockKind === "ignored"));
  assert.equal(state.eventLog.some((event) => event.type === "clash"), false);
});

test("普通群攻只移除打向海神这一份的毁灭之力及锁定技增伤", () => {
  let state = fixture();
  const [, opponent] = state.players;
  appendSkillInstances(opponent!, ["1044", "1028"]);
  p(state, 0).cakes = p(state, 2).cakes = 0;
  state = destroy(reveal(state, [cake, wanJian, cake, small]), 1, "power_times_3_level_to_zero");
  state = advance(state);
  assert.equal(p(state, 0).hp, 28);
  assert.equal(p(state, 2).hp, 24);
  assert.equal(p(state, 3).hp, 30);
});

test("技能群攻对其他玩家照常结算", () => {
  let state = fixture();
  const [, opponent, other] = state.players;
  appendSkillInstances(opponent!, ["1081", "1053"]);
  state = advance(reveal(state, [cake, { type: "skill", skillId: "1081", targetId: other!.id, stacks: 1 }]));
  assert.equal(p(state, 0).hp, 30);
  assert.ok(p(state, 2).hp < 30);
  assert.ok(p(state, 3).hp < 30);
});

test("乱舞转群的普通攻击仍包含海神，对海神这一份去掉火焰刀加成", () => {
  let state = fixture();
  appendSkillInstances(p(state, 1), ["1053", "1015"]);
  state = advance(reveal(state, [cake, { type: "attack", attackId: "sha", stacks: 1 }]));
  assert.equal(p(state, 0).hp, 29);
  assert.equal(p(state, 2).hp, 28);
  assert.equal(p(state, 3).hp, 28);
});

test("海神承受变招前的普通攻击，锁定技也不会改变这一份攻击", () => {
  let state = fixture();
  const [holder, opponent] = state.players;
  appendSkillInstances(opponent!, ["1089", "1015"]);
  state = reveal(state, [cake, sha(holder!.id)]);
  state = submitActionWindowSkill(state, opponent!.id, { type: "skill", skillId: "1089", stacks: 1,
    switchActionIndex: 0, switchToAction: { type: "attack", attackId: "qin", targetId: holder!.id, stacks: 1 } });
  state = advance(state);
  assert.equal(p(state, 0).hp, 29);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === holder!.id && event.attackName === "杀"));
});

test("海神的普通攻击可被防御出招挡住，致死时禁止复活并保留备用命", () => {
  for (const scenario of ["defense", "revival", "life"] as const) {
    let state = fixture();
    const target = p(state, 1);
    target.hp = 1;
    appendSkillInstances(target, ["1068"]);
    if (scenario === "life") target.spareLives = [{ hp: 12 }];
    state = advance(reveal(state, [{ ...sha(target.id), stacks: 3 }, scenario === "defense" ? small : cake]));
    assert.equal(p(state, 1).hp, scenario === "defense" ? 1 : scenario === "revival" ? -2 : 12);
    assert.equal(p(state, 1).status, scenario === "revival" ? "dead" : "alive");
    assert.equal(p(state, 1).buffs.some(({ id }) => id === SEA_GOD_REVIVAL_BLOCK), scenario === "revival");
  }
});
