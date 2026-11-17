import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer,
  FALLEN_SPLENDOR_CONVERT, FALLEN_SPLENDOR_DOUBLE, FALLEN_SPLENDOR_EXECUTION, FALLEN_SPLENDOR_RELEASE,
  GOD_KING_JUDGMENT_ID, ORIGIN_SHOT_FUSION, ORIGIN_SHOT_STOCK, SKY_PLAYER_ID,
  fallenSplendorExecutionStock, fallenSplendorHealingRemaining, getActiveFusionCount, getActiveSkillCount,
  getFusionSkillId, getSkillUseLimit, grantInitializedSkill, previewPlayerAttackStats, startGame, submitActionWindowSkill, submitPlayerAction,
  validateAction, validateActionWindowSkill, type GameState, type PlayerAction
} from "../packages/shared/src";
import { setPlayerHpValue } from "../packages/shared/src/engine/infiniteValues";

const gain = { type: "gain_cake" } as const;
const owner = (state: GameState) => state.players[0]!;
const card = (state: GameState) => owner(state).bigCards![0]!;
function advance(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; i < 60 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++)
    state = advanceActionWindow(state);
  return state;
}

function fixture(players = 3, onlyAbilityId?: string): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", firstTurnNoAttack: false });
  for (const name of ["乙", "丙"].slice(0, players - 1)) state = addPlayerToGame(state, createPlayer(name));
  owner(state).bigCards = [{ instanceId: "splendor", cardId: "10604", ...(onlyAbilityId ? { onlyAbilityId } : {}) }];
  return advance(startGame(state));
}

function turn(state: GameState, ...moves: Array<PlayerAction | undefined>): GameState {
  const alive = state.players.flatMap((player, index) => player.status === "alive" ? [{ id: player.id, index }] : []);
  for (const { id, index } of alive) {
    if (state.phase !== "collecting_actions") break;
    state.players.find((player) => player.id === id)!.cakes = 100;
    state = submitPlayerAction(state, id, moves[index] ?? gain).state;
  }
  return state;
}

test("陨落天华的七次复活按顺序解锁，只收回本卡授予的技能", () => {
  let state = fixture();
  appendSkillInstances(owner(state), ["1063"]);
  assert.equal(getSkillUseLimit(owner(state), "1063"), 8);
  const source = owner(state).id;
  for (let stage = 1; stage <= 7; stage++) {
    setPlayerHpValue(owner(state), []);
    state.roundTurnNumber = 4;
    const attack: PlayerAction = stage < 7 ? { type: "attack", attackId: "sha", stacks: 1, targetId: source } :
      { type: "skill", skillId: GOD_KING_JUDGMENT_ID, stacks: 1, targetId: source };
    if (stage === 7) {
      state.players[1]!.bigCards = [{ cardId: "10522", instanceId: "judge", initialized: true,
        abilityUseBonuses: { [GOD_KING_JUDGMENT_ID]: 1 } }];
    }
    state = advance(turn(state, gain, attack), "revival_action");
    if (state.activeTimingPhase === "revival_action")
      state = submitActionWindowSkill(state, source, { type: "skill", skillId: "1063", stacks: 1 });
    assert.equal(card(state).fallenSplendorStage, stage);
    if (stage === 1) assert.equal(getActiveFusionCount(owner(state), "天空之城"), 1);
    if (stage === 4) {
      assert.equal(getActiveFusionCount(owner(state), "六转生死阵"), 1);
      owner(state).skillFusions = owner(state).skillFusions?.filter(({ skillId }) => skillId !== "4023" &&
        skillId !== getFusionSkillId("六芒星阵"));
    }
    if (stage === 6) assert.equal(owner(state).skillFusions?.some(({ judgmentRank }) => judgmentRank === "VI"), true);
    state = advance(state);
  }
  assert.equal(getActiveFusionCount(owner(state), "天空之城"), 0);
  assert.equal(getSkillUseLimit(owner(state), "1063"), 1);
  assert.equal(fallenSplendorExecutionStock(owner(state))?.stacks, 1);
});

test("治愈术转为离殇是单向转换，只扣本卡库存", () => {
  let state = fixture();
  appendSkillInstances(owner(state), ["1063"]);
  state = submitActionWindowSkill(state, owner(state).id, { type: "skill", skillId: FALLEN_SPLENDOR_CONVERT, stacks: 1 });
  assert.equal(fallenSplendorHealingRemaining(owner(state), card(state)), 6);
  assert.equal(getSkillUseLimit(owner(state), "1063"), 7);
  assert.equal(getSkillUseLimit(owner(state), "1067"), 1);
});

test("第七次手动治愈先扣本卡次数，回收库存时不会扣玩家独立治愈术", () => {
  let state = fixture();
  const id = owner(state).id;
  card(state).fallenSplendorStage = 6;
  card(state).grantedSkillUses = { "1063": 6 };
  owner(state).buffs.push({ id: "skill_used:1063", name: "技能使用次数", stacks: 6 });
  appendSkillInstances(owner(state), ["1063"]);
  setPlayerHpValue(owner(state), []);
  state = advance(turn(state, gain, { type: "attack", attackId: "sha", stacks: 1, targetId: id }), "revival_action");
  assert.equal(state.activeTimingPhase, "revival_action");
  state = submitActionWindowSkill(state, id, { type: "skill", skillId: "1063", stacks: 1 });
  assert.equal(card(state).fallenSplendorStage, 7);
  assert.equal(getSkillUseLimit(owner(state), "1063"), 1);
  assert.equal(owner(state).buffs.find(({ id }) => id === "skill_used:1063")?.stacks ?? 0, 0);
});

test("主出招与窗口释放共用终式库存，双人房允许只选一人", () => {
  let state = fixture(2, FALLEN_SPLENDOR_EXECUTION);
  const [source, target] = state.players;
  const main: PlayerAction = { type: "skill", skillId: FALLEN_SPLENDOR_EXECUTION, stacks: 1, targetIds: [target!.id] };
  assert.equal(validateAction(state, source!.id, main).ok, true);
  state = advance(turn(state, main, { type: "attack", attackId: "sha", stacks: 2, targetId: source!.id }));
  assert.equal(state.players[1]!.defeatLevel, 4);
  assert.equal(fallenSplendorExecutionStock(owner(state)), undefined);
  assert.ok(state.eventLog.some((event) => event.type === "clash"));

  state = fixture(3, FALLEN_SPLENDOR_EXECUTION);
  state = advance(submitActionWindowSkill(state, owner(state).id,
    { type: "skill", skillId: FALLEN_SPLENDOR_RELEASE, stacks: 1, targetIds: state.players.slice(1).map(({ id }) => id) }));
  assert.ok(state.players.slice(1).every(({ defeatLevel }) => defeatLevel === 4));
  assert.equal(fallenSplendorExecutionStock(owner(state)), undefined);
  assert.ok(!state.eventLog.some((event) => event.type === "damage"));
});

test("第三阶段可控攻击只翻倍攻值，保留等级", () => {
  let state = fixture(2, "1060404");
  const [source, target] = state.players;
  state = advance(turn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: target!.id }), "turn_change_action");
  const before = previewPlayerAttackStats(state, source!.id).stats[0]!;
  state = submitActionWindowSkill(state, source!.id, { type: "skill", skillId: FALLEN_SPLENDOR_DOUBLE, stacks: 1, switchActionIndex: 0 });
  const after = previewPlayerAttackStats(state, source!.id).stats[0]!;
  assert.equal(after.power, before.power * 2);
  assert.equal(after.level, before.level);
});

test("最后一条无视法伤和自爆，以无视记录且仍能受到普通攻击", () => {
  let state = fixture(3, "1060409");
  const id = owner(state).id;
  const startHp = owner(state).hp;
  assert.equal(getActiveSkillCount(owner(state), "1060409"), 1);
  state = advance(turn(state, { type: "defense", defense: "self_destruct" }));
  assert.equal(owner(state).hp, startHp);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.attackName === "自爆" && event.blockKind === "ignored"));
  appendSkillInstances(state.players[1]!, ["1012"]);
  state = advance(turn(state), "turn_end_action");
  assert.equal(state.activeTimingPhase, "turn_end_action");
  state = advance(submitActionWindowSkill(state, state.players[1]!.id, { type: "skill", skillId: "1012", stacks: 1 }));
  assert.equal(owner(state).hp, startHp);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === id &&
    event.attackName === "火烧大地" && event.blockKind === "ignored"));
  state = advance(turn(state, gain, { type: "attack", attackId: "sha", stacks: 1, targetId: id }));
  assert.equal(owner(state).hp, startHp - 1);
});

test("第五次复活的起源弹能付反噬存次，并与对向攻击完全抵消", () => {
  let state = fixture(2, "1060406");
  const id = owner(state).id;
  const targetId = state.players[1]!.id;
  const before = owner(state).hp;
  state = advance(submitActionWindowSkill(state, id, { type: "skill", skillId: ORIGIN_SHOT_FUSION, stacks: 1 }));
  assert.equal(owner(state).hp, before - 1);
  assert.equal(owner(state).buffs.find(({ id }) => id === ORIGIN_SHOT_STOCK)?.stacks, 1);
  state = advance(turn(state, { type: "skill", skillId: ORIGIN_SHOT_FUSION, stacks: 1, targetId },
    { type: "attack", attackId: "sha", stacks: 3, targetId: id }));
  assert.equal(owner(state).hp, before - 1);
  assert.ok(state.eventLog.some((event) => event.type === "clash" && event.result.includes("起源弹")));
  assert.equal(owner(state).buffs.find(({ id }) => id === ORIGIN_SHOT_STOCK), undefined);
});

test("神圣禁域让天复刻单攻，原出招继续结算", () => {
  let state = fixture(2, "1060407");
  const id = owner(state).id;
  const opponent = state.players[1]!.id;
  state.roundTurnNumber = 4;
  state = advance(turn(state, gain, { type: "attack", attackId: "sha", stacks: 1, targetId: id }));
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceId === SKY_PLAYER_ID && event.targetId === opponent));
  assert.ok(state.eventLog.some((event) => (event.type === "damage" || event.type === "attack_blocked") &&
    event.sourceId === opponent && event.targetId === id));
});

test("第四阶段穿过伤害免疫，并拒绝斗转星移转走自己的攻击", () => {
  let state = fixture(3, "1060405");
  const source = owner(state).id;
  const opponent = state.players[1]!.id;
  const other = state.players[2]!.id;
  appendSkillInstances(owner(state), ["1012"]);
  grantInitializedSkill(state, opponent, getFusionSkillId("帝灵之境"), "测试");
  appendSkillInstances(state.players[1]!, ["1093"]);
  state = advance(turn(state), "turn_end_action");
  state = advance(submitActionWindowSkill(state, source, { type: "skill", skillId: "1012", stacks: 1 }));
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceId === source && event.targetId === opponent));

  state.phase = "action_window";
  state.activeTimingPhase = "turn_damage_modify";
  state.actionWindowMode = "active";
  state.actionWindowPassPlayerIds = [];
  state.pendingDamageItems = [{ id: "attack", sourceId: source, targetId: opponent, amount: 1, fromAttack: true, isLastHit: false }];
  const validation = validateActionWindowSkill(state, opponent, { type: "skill", skillId: "1093", stacks: 1,
    targetId: other, targetDamageId: "attack" });
  assert.equal(validation.ok, false);
});
