import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, createGame, createPlayer, getActiveFusionCount, getActiveSkillCount,
  getFusionSkillId, getSkillUseLimit, startGame, submitActionWindowSkill, submitPlayerAction, type GameState, type PlayerAction
} from "../packages/shared/src";
import { loseBigCardAbility } from "../packages/shared/src/engine/bigCards";
import { SEA_GOD_CARD_ID, SEA_GOD_INHERIT_ID } from "../packages/shared/src/engine/seaGodIds";
import { getSixStarArrayChances } from "../packages/shared/src/engine/tianmang";
import { getDepletedSixReversalArrays, getRootFusions, isFusionImplemented } from "../packages/shared/src/skills/fusion";

const cake = { type: "gain_cake" } as const;
const cast = (skillId: string) => ({ type: "skill", skillId, stacks: 1 }) as const;

function advanceTo(state: GameState, stop: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; i < 50 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++) state = advanceActionWindow(state);
  assert.equal(state.activeTimingPhase, stop);
  return state;
}

function fixture(): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 1, initialHp: 30, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ cardId: SEA_GOD_CARD_ID, instanceId: "sea-god", onlyAbilityId: SEA_GOD_INHERIT_ID }];
  state = advanceTo(startGame(state), "turn_action");
  for (const player of state.players) player.cakes = 50;
  return state;
}

function submit(state: GameState, incoming?: PlayerAction): GameState {
  for (const [index, player] of state.players.entries()) state = submitPlayerAction(state, player.id, index === 1 && incoming || cake).state;
  return state;
}

function dice<T>(award: boolean, run: () => T): T {
  const previous = Math.random;
  Math.random = () => {
    const callers = new Error().stack?.split("\n").slice(2, 7);
    if (callers?.[0]?.includes("rollSixStarArray")) return 0.99;
    if (callers?.[1]?.includes("withSkillsIgnored") && callers?.[2]?.includes("resolveSixStarArray")) return award ? 0 : 0.99;
    return previous();
  };
  try { return run(); } finally { Math.random = previous; }
}

test("瀚海乾坤提供九份独立技能和融合；暂时失效与失去时仅移除其来源", () => {
  const state = fixture();
  const holder = state.players[0]!;
  assert.equal(isFusionImplemented(getFusionSkillId("六转生死阵")), true);
  assert.deepEqual(getRootFusions(holder).map(({ skillId }) => skillId), [
    "绝对天盾", "虚无", "逆转星移", "六芒星阵", "六转生死阵"
  ].map(getFusionSkillId));
  assert.equal(getActiveSkillCount(holder, "1067"), 1);
  assert.equal(getActiveSkillCount(holder, "1114"), 1);
  assert.equal(getSkillUseLimit(holder, "1092"), 4);
  assert.equal(getSkillUseLimit(holder, "1093"), 6);
  assert.deepEqual(getSixStarArrayChances(holder, false), [1 / 3, 1 / 6, 1 / 6]);
  holder.buffs.push({ id: "tianmang_locked_disabled", name: "锁定技失效", stacks: 1 });
  assert.equal(getActiveFusionCount(holder, "六转生死阵"), 0);
  assert.equal(getActiveSkillCount(holder, "1067"), 0);
  holder.buffs = [];
  assert.equal(getActiveFusionCount(holder, "六转生死阵"), 1);
  assert.equal(loseBigCardAbility(holder, holder.bigCards![0]!, SEA_GOD_INHERIT_ID), true);
  assert.equal(holder.skillInventory?.length, 0);
  assert.equal(holder.skillFusions?.length, 0);
});

test("六转生死阵仅在自身素材两种次数均耗尽后追加掷骰，奖励副本不会停止后续判定", () => {
  let state = fixture();
  const [holder, , receiver] = state.players;
  for (let i = 0; i < 2; i++) {
    state = advanceTo(submit(state), "turn_change_action");
    state = submitActionWindowSkill(state, holder!.id, cast("1092"));
    state = advanceTo(state, "turn_action");
  }
  assert.equal(getDepletedSixReversalArrays(state.players[0]!).length, 0);

  const sha = { type: "attack", attackId: "sha", stacks: 5, targetId: holder!.id } as const;
  for (let i = 0; i < 2; i++) {
    state.players[1]!.cakes = 10;
    state = dice(false, () => advanceTo(submit(state, sha), "turn_damage_modify"));
    const damage = state.pendingDamageItems?.find(({ targetId }) => targetId === holder!.id);
    assert.ok(damage);
    state = submitActionWindowSkill(state, holder!.id, {
      ...cast("1093"), targetId: receiver!.id, targetDamageId: damage.id
    });
    state = advanceTo(state, "turn_action");
  }
  assert.equal(getDepletedSixReversalArrays(state.players[0]!).length, 1);
  assert.equal(getSkillUseLimit(state.players[0]!, "1092"), 4);
  assert.equal(getSkillUseLimit(state.players[0]!, "1093"), 6);

  for (let i = 0; i < 2; i++) {
    state.players[1]!.cakes = 10;
    state = dice(true, () => advanceTo(submit(state, sha), "turn_damage_modify"));
    assert.equal(getActiveFusionCount(state.players[0], "逆转星移"), 3 + i);
    assert.equal(getDepletedSixReversalArrays(state.players[0]!).length, 1);
    state = advanceTo(state, "turn_action");
  }
  const chances = state.eventLog.filter((event) => event.type === "system" &&
    event.probabilityChecks?.skillId === getFusionSkillId("六转生死阵"));
  assert.equal(chances.length, 2);
  for (const event of chances) {
    assert.equal(event.type === "system" && event.probabilityChecks?.chance, 1 / 12);
    assert.equal(event.type === "system" && event.probabilityChecks?.successes[0]?.coefficient, 1);
  }
  const owner = state.players[0]!;
  assert.equal(loseBigCardAbility(owner, owner.bigCards![0]!, SEA_GOD_INHERIT_ID), true);
  assert.equal(getActiveFusionCount(owner, "逆转星移"), 2);
  assert.equal(getSkillUseLimit(owner, "1092"), 2);
  assert.equal(getSkillUseLimit(owner, "1093"), 4);
  assert.equal(owner.buffs.some(({ id, stacks }) => ["skill_used:1092", "skill_used:1093"].includes(id) && stacks > 0), false);
});
