import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getActiveFusionCount,
  getElementAmount, getFusionSkillId, getSaintMoveMultiplier, startGame, submitActionWindowSkill, submitPlayerAction,
  validateAction, type GameState, type PlayerAction, type SkillAction, type SkillTimingPhase
} from "@bing/shared";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const awakened = getFusionSkillId("圣灵觉醒");
const cast = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });
const at = (state: GameState, index = 0) => state.players[index]!;
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });

function drain(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && i < 80; i++) state = advanceActionWindow(state);
  return state;
}
function fixture(chaofan = false): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  if (chaofan) at(state).bigCards = [{ cardId: "10514", instanceId: "saint-card" }];
  state = drain(startGame(state));
  for (const player of state.players) { player.cakes = 10; player.hp = 50; }
  return state;
}
function reveal(state: GameState, ...moves: PlayerAction[]): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) if (player.status === "alive")
    state = submitPlayerAction(state, player.id, moves[index] ?? cake).state;
  return state;
}
const deaths = (state: GameState, id: string) => state.eventLog.filter((event) =>
  event.type === "player_died" && event.playerId === id);

test("普通圣和齐天大圣的饼、元素均在回合末返还", () => {
  for (const [id, gain] of [["1060", 2], ["1061", 3]] as const) {
    for (const element of [undefined, "聚", "星"]) {
      let state = fixture();
      appendSkillInstances(at(state), [id]);
      if (element) changeElementAmount(at(state), element, 1);
      const action = cast(id, element ? { saintElement: element } : {});
      assert.equal(validateAction(state, at(state).id, cast(id, { saintElement: "不存在" })).ok, false);
      state = drain(reveal(state, action), "turn_end_action");
      assert.equal(at(state).cakes, element ? 10 : 9);
      if (element) assert.equal(getElementAmount(at(state), element), 0);
      state = drain(state);
      if (element) assert.equal(getElementAmount(at(state), element), gain);
      else assert.equal(at(state).cakes, 9 + gain);
    }
  }
});

test("真授予圣宝和神域之种；6×4×2并为48倍，同名副本也各计一次", () => {
  let state = fixture(true);
  for (const fusion of ["圣宝", "神域之种"]) assert.equal(getActiveFusionCount(at(state), fusion), 1);
  assert.equal(getSaintMoveMultiplier(at(state), awakened), 6);
  grantInitializedSkill(state, at(state).id, awakened, "测试独立圣灵觉醒");
  appendSkillInstances(at(state), ["1060"]);
  assert.equal(getSaintMoveMultiplier(at(state), awakened), 48);
  assert.equal(validateAction(state, at(state).id, cast("1060")).ok, false);
  changeElementAmount(at(state), "星", 2);
  state = drain(reveal(state, cast(awakened, { saintElement: "星", stacks: 2 })));
  assert.equal(getElementAmount(at(state), "星"), 96);
  assert.equal(state.roundTurnNumber, 2);
  assert.equal(at(state).cakes, 11, "每轮第2回合初额外获得1饼");
  state = fixture(true);
  appendSkillInstances(at(state), ["1060", "1060"]);
  assert.equal(getSaintMoveMultiplier(at(state), awakened), 24);
});

test("一次逆转退还元素并取消返还，二次逆转恢复付款与返还", () => {
  for (const twice of [false, true]) {
    let state = fixture();
    appendSkillInstances(at(state), ["1060"]);
    appendSkillInstances(at(state, 1), ["1092"]);
    appendSkillInstances(at(state, 2), ["1092"]);
    changeElementAmount(at(state), "聚", 1);
    state = drain(reveal(state, cast("1060", { saintElement: "聚" })), "turn_change_action");
    assert.equal(getElementAmount(at(state), "聚"), 0);
    state = submitActionWindowSkill(state, at(state, 1).id, cast("1092"));
    assert.equal(getElementAmount(at(state), "聚"), 1);
    if (twice) {
      state = submitActionWindowSkill(state, at(state, 2).id, cast("1092"));
      assert.equal(getElementAmount(at(state), "聚"), 0);
    }
    state = drain(state);
    assert.equal(getElementAmount(at(state), "聚"), twice ? 2 : 1);
  }
});

test("回合末先返还倍增的元素，随后重开仍保留元素余额", () => {
  let state = fixture();
  appendSkillInstances(at(state), ["1060"]);
  changeElementAmount(at(state), "聚", 1);
  const round = state.roundNumber;
  state = drain(reveal(state, cast("1060", { saintElement: "聚" }), sha(at(state, 2).id)));
  assert.equal(state.roundNumber, round + 1);
  assert.equal(at(state).cakes, 0);
  assert.equal(getElementAmount(at(state), "聚"), 2);
});

test("圣触发非伤害死亡，绝对无敌仍可复活，多余命也可接住", () => {
  let state = fixture(true);
  appendSkillInstances(at(state, 1), ["1060", "1063"]);
  at(state, 1).buffs.push({ id: "temp_absolute_invulnerable", name: "绝对无敌", stacks: 1, expiresAtTurn: state.turnNumber });
  state = drain(reveal(state, cake, cast("1060")), "revival_action");
  assert.equal(state.activeTimingPhase, "revival_action");
  assert.ok(at(state, 1).buffs.some(({ id }) => id === "pending_death"));
  assert.ok(!state.eventLog.some((event) => event.type === "damage"));
  state = drain(submitActionWindowSkill(state, at(state, 1).id, cast("1063")));
  assert.equal(at(state, 1).hp, 18);
  assert.equal(at(state, 1).status, "alive");

  state = fixture(true);
  appendSkillInstances(at(state, 1), ["1061"]);
  at(state, 1).spareLives = [{ hp: 11 }];
  state = drain(reveal(state, cake, cast("1061")));
  assert.equal(at(state, 1).hp, 11);
  assert.equal(at(state, 1).status, "alive");
  assert.equal(at(state, 1).spareLives?.length, 0);
});

test("神族水晶与神之庇护只在触发时判一阶死亡", () => {
  let state = fixture(true);
  appendSkillInstances(at(state, 1), ["1032", "1031"]);
  state = drain(reveal(state, cake, cake, cake, cake));
  assert.equal(at(state, 1).status, "alive");
  state = drain(reveal(state, cake, sha(at(state, 2).id), small));
  assert.equal(at(state, 1).defeatLevel, 1);
  assert.equal(deaths(state, at(state, 1).id).length, 1);
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.targetId === at(state, 1).id));

  state = fixture(true);
  grantInitializedSkill(state, at(state, 1).id, getFusionSkillId("神域之种"), "测试神域之种");
  state = drain(reveal(state, cake, cake, sha(at(state, 1).id)));
  assert.equal(at(state, 1).defeatLevel, 1);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === at(state, 1).id));
});

test("超凡绝圣挡住破天圣剑的青釭破防，独立青釭仍生效", () => {
  for (const independent of [false, true]) {
    let state = fixture(true);
    grantInitializedSkill(state, at(state, 1).id, getFusionSkillId("破天圣剑"), "测试破天圣剑");
    if (independent) appendSkillInstances(at(state, 1), ["1029"]);
    state = drain(reveal(state, cake, sha(at(state).id)));
    assert.equal(at(state).hp, independent ? 49 : 50);
  }
});

test("双刃剑的破天破弹无法穿过超凡绝圣的普通反弹", () => {
  let state = fixture(true);
  const defender = at(state).id;
  const attacker = at(state, 1).id;
  const destination = at(state, 2).id;
  grantInitializedSkill(state, attacker, getFusionSkillId("破天圣剑"), "测试破天圣剑");
  state = drain(reveal(state, { type: "defense", defense: "rebound", targetId: destination }, sha(defender)), "turn_change_action");
  state = drain(submitActionWindowSkill(state, attacker,
    cast("1030", { switchActionIndex: 0, doubleEdgeMode: "pierce_rebound" })));
  assert.ok(state.eventLog.some((event) => event.type === "attack_reflected" && event.originalTargetId === defender &&
    event.reflectedTargetId === destination));
  assert.equal(at(state, 2).hp, 49);
});
