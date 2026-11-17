import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getActiveFusionCount,
  getActiveSkillCount, getActionAttackTargetIds, getDefenseTotal, grantInitializedSkill, grantFreshBigCard,
  enterActionWindow, startGame, submitActionWindowSkill, submitPlayerAction, validateActionWindowSkill, combatValue, getFusionSkillId, setPlayerHpValue,
  LONE_STAR_STRIKE_ID, LONE_STAR_PIERCE_ID, LONE_STAR_RAGE_ID, LONE_STAR_FINALE_ID, type GameState, type PlayerAction
} from "../packages/shared/src";
import { grantLoneStarUpgrade, loneStarUpgrade } from "../packages/shared/src/engine/loneStar";
import { LONE_STAR_DUEL, LONE_STAR_SUICIDE } from "../packages/shared/src/engine/loneStarIds";

const cake = { type: "gain_cake" } as const;
const skill = (skillId: string, targetId: string): PlayerAction => ({ type: "skill", skillId, targetId, stacks: 1 });
function drain(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && i < 80; i++) state = advanceActionWindow(state);
  return state;
}
function fixture(ability?: string, count = 2): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false, initialHp: 18 });
  for (let i = 1; i < count; i++) state = addPlayerToGame(state, createPlayer(`玩家${i + 1}`));
  state.players[0]!.bigCards = [{ cardId: "10538", instanceId: "lone-star", ...(ability ? { onlyAbilityId: ability } : {}) }];
  state = drain(startGame(state));
  state.players.forEach((player) => { player.cakes = 100; });
  return state;
}
function submit(state: GameState, ...actions: PlayerAction[]): GameState {
  for (const [i, { id }] of state.players.entries()) if (!state.pendingActions[id])
    state = submitPlayerAction(state, id, actions[i] ?? cake).state;
  return state;
}

test("独保留天煞孤星和普天同庆，单攻转为打中两名并列最远者", () => {
  let state = fixture(undefined, 5);
  const [a, b, c, d, e] = state.players;
  assert.equal(getActiveFusionCount(a, "天煞孤星"), 1);
  assert.equal(getActiveSkillCount(a, "1097"), 1);
  const attack = { type: "attack", attackId: "sha", stacks: 1 } as const;
  assert.deepEqual(getActionAttackTargetIds(state, a!.id, attack), [c!.id, d!.id]);
  state = drain(submit(state, attack, cake, cake, { ...attack, targetId: a!.id }));
  assert.equal(state.players.find(({ id }) => id === a!.id)!.hp, 18);
  for (const id of [c!.id, d!.id]) assert.equal(state.players.find((p) => p.id === id)!.hp, 17);
  for (const id of [b!.id, e!.id]) assert.equal(state.players.find((p) => p.id === id)!.hp, 18);
});

test("绝击支付两饼并造成66点攻击伤害，石头可防", () => {
  for (const defended of [false, true]) {
    let state = fixture(LONE_STAR_STRIKE_ID);
    const targetId = state.players[1]!.id;
    setPlayerHpValue(state.players[1]!, combatValue(100));
    state = submit(state, skill(LONE_STAR_STRIKE_ID, targetId), defended ? { type: "defense", defense: "stone" } : cake);
    assert.equal(state.players[0]!.cakes, 98);
    state = drain(state);
    assert.equal(state.players.find(({ id }) => id === targetId)!.hp, defended ? 100 : 34);
  }
});

test("普通星绝击穿过减伤、回避、反弹和护盾，原资源保留", () => {
  let state = fixture(LONE_STAR_PIERCE_ID);
  const target = state.players[1]!;
  target.hp = 1000;
  appendSkillInstances(target, ["1049", "1031"]);
  target.buffs.push({ id: "defense_value", name: "防御值", stacks: 100 },
    { id: "temp_flash_dodge", name: "闪现", stacks: 1, expiresAtTurn: state.turnNumber + 1 },
    { id: "reflect", name: "技能弹", stateType: "skill_rebound", stacks: 1, expiresAtTurn: state.turnNumber + 1 },
    { id: "shield", stateType: "shield", name: "护盾", stacks: 1, damageShieldLimit: combatValue(1000) });
  state = drain(submit(state, skill(LONE_STAR_PIERCE_ID, target.id)));
  const settled = state.players[1]!;
  assert.equal(settled.hp, 334);
  assert.deepEqual(getDefenseTotal(settled), combatValue(100));
  assert.equal(settled.buffs.find((buff) => buff.id === "shield")?.stacks, 1);
  assert.equal(getActiveSkillCount(settled, "1049"), 1);
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.targetId === state.players[0]!.id));
});

test("星绝击不会阻断斗转星移的转伤窗口", () => {
  let state = fixture(LONE_STAR_PIERCE_ID, 3);
  const [source, target, other] = state.players;
  target!.hp = 1000;
  grantInitializedSkill(state, target!.id, getFusionSkillId("逆转星移"), "测试");
  state = drain(submit(state, skill(LONE_STAR_PIERCE_ID, target!.id)), "turn_damage_modify");
  const incoming = state.pendingDamageItems?.find((item) => item.targetId === target!.id && item.defensePiercing);
  assert.ok(incoming);
  state = enterActionWindow(state, target!.id);
  const redirect = { ...skill("1093", other!.id), targetDamageId: incoming.id };
  assert.equal(validateActionWindowSkill(state, target!.id, redirect).ok, true);
  state = drain(submitActionWindowSkill(state, target!.id, redirect));
  assert.equal(state.players.find(({ id }) => id === target!.id)!.hp, 1000);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceId === target!.id && event.targetId === other!.id));
  assert.equal(state.players.find(({ id }) => id === source!.id)!.hp, 18);
});

test("雷霆不免疫星绝击，只有真的遇到雷霆时才能击碎它", () => {
  for (const [charged, extraAttack] of [[false, true], [true, false], [true, true]]) {
    let state = fixture(LONE_STAR_PIERCE_ID, 3);
    const [source, target] = state.players;
    target!.hp = 1000;
    appendSkillInstances(target!, ["1037"]);
    if (charged) grantLoneStarUpgrade(source!, target!.id, LONE_STAR_PIERCE_ID, 1);
    state = drain(submit(state, skill(LONE_STAR_PIERCE_ID, target!.id), cake,
      extraAttack ? { type: "attack", attackId: "sha", stacks: 1, targetId: target!.id } : cake));
    const settled = state.players.find(({ id }) => id === target!.id)!;
    assert.equal(settled.hp, extraAttack ? 333 : 334);
    assert.equal(getActiveSkillCount(settled, "1037"), charged && extraAttack ? 0 : 1);
  }
});

test("山海封印无法挡下致死星绝击，有击碎资格时移除山海封印", () => {
  for (const charged of [false, true]) {
    let state = fixture(LONE_STAR_PIERCE_ID);
    const [source, target] = state.players;
    grantFreshBigCard(state, target!, { cardId: "10518", instanceId: "mountain", onlyAbilityId: "1051803" });
    if (charged) grantLoneStarUpgrade(source!, target!.id, LONE_STAR_PIERCE_ID, 1);
    state = drain(submit(state, skill(LONE_STAR_PIERCE_ID, target!.id)));
    const settled = state.players.find(({ id }) => id === target!.id)!;
    assert.equal(settled.status, "dead");
    assert.equal(getActiveSkillCount(settled, "1051803"), charged ? 0 : 1);
    assert.ok(!state.eventLog.some((event) => event.type === "system" && event.message.includes("发动山海封印")));
  }
});

test("击碎资格用掉后，命中会摧毁独立防御、大卡子技能、融合和防御值", () => {
  let state = fixture(LONE_STAR_PIERCE_ID);
  const source = state.players[0]!, target = state.players[1]!;
  target.hp = 1000;
  appendSkillInstances(target, ["1031", "1001"]);
  grantInitializedSkill(state, target.id, getFusionSkillId("六芒星阵"), "测试");
  grantFreshBigCard(state, target, { cardId: "10509", instanceId: "qianqiu", onlyAbilityId: "1050903" });
  target.buffs.push({ id: "defense_value", name: "防御值", stacks: 100 },
    { id: "unspent", stateType: "shield", name: "挡10的护盾", stacks: 1, damageShieldLimit: combatValue(10) },
    { id: "loss-immune", name: "免疫失技", stacks: 1, immuneEffectCategories: ["skill_loss", "remove_skills"] });
  grantLoneStarUpgrade(source, target.id, LONE_STAR_PIERCE_ID, 1);
  state = drain(submit(state, skill(LONE_STAR_PIERCE_ID, target.id)));
  const settled = state.players[1]!;
  assert.equal(settled.hp, 334);
  assert.equal(getActiveFusionCount(settled, "六芒星阵"), 0);
  assert.equal(getActiveSkillCount(settled, "1031"), 0);
  assert.equal(getActiveSkillCount(settled, "1050903"), 0);
  assert.deepEqual(getDefenseTotal(settled), []);
  assert.equal(settled.buffs.find(({ id }) => id === "unspent")?.stacks, 1);
  assert.equal(loneStarUpgrade(state.players[0]!, target.id, LONE_STAR_PIERCE_ID), 0);
});

test("星绝击普通防住仍消耗资格，提交后不能使用控制技", () => {
  let state = fixture(LONE_STAR_PIERCE_ID);
  const source = state.players[0]!, target = state.players[1]!;
  appendSkillInstances(source, ["1044"]);
  grantLoneStarUpgrade(source, target.id, LONE_STAR_PIERCE_ID, 1);
  state = submit(state, skill(LONE_STAR_PIERCE_ID, target.id), { type: "defense", defense: "small" });
  assert.equal(state.activeTimingPhase, "turn_change_action");
  const active = enterActionWindow(state, source.id);
  assert.match(validateActionWindowSkill(active, source.id, { type: "skill", skillId: "1044", stacks: 1 }).error ?? "", /星绝击/);
  state = drain(state);
  assert.equal(state.players[1]!.hp, 18);
  assert.equal(loneStarUpgrade(state.players[0]!, target.id, LONE_STAR_PIERCE_ID), 0);
});

test("怒星莽击命中分别赋予两种强化，后续被防住仍消耗怒星强化", () => {
  let state = fixture(LONE_STAR_RAGE_ID);
  const targetId = state.players[1]!.id;
  setPlayerHpValue(state.players[1]!, combatValue(3, 1));
  state = drain(submit(state, skill(LONE_STAR_RAGE_ID, targetId)));
  const source = state.players[0]!;
  assert.equal(loneStarUpgrade(source, targetId, LONE_STAR_RAGE_ID), 1);
  assert.equal(loneStarUpgrade(source, targetId, LONE_STAR_PIERCE_ID), 1);
  source.cakes = 100;
  state = drain(submit(state, skill(LONE_STAR_RAGE_ID, targetId), { type: "defense", defense: "stone" }));
  assert.equal(loneStarUpgrade(state.players[0]!, targetId, LONE_STAR_RAGE_ID), 0);
  assert.equal(loneStarUpgrade(state.players[0]!, targetId, LONE_STAR_PIERCE_ID), 1);
});

test("终招可被石头防住，命中是直接必杀并预约下一回合初自必杀", () => {
  let defended = fixture(LONE_STAR_FINALE_ID);
  defended = submit(defended, skill(LONE_STAR_FINALE_ID, defended.players[1]!.id), { type: "defense", defense: "stone" });
  assert.equal(defended.players[0]!.buffs.find(({ stateType }) => stateType === LONE_STAR_DUEL)?.sourceJudgmentRank, "IV");
  defended = drain(defended);
  assert.equal(defended.players[1]!.status, "alive");
  let hit = fixture(LONE_STAR_FINALE_ID);
  const usedTurn = hit.turnNumber;
  hit = drain(submit(hit, skill(LONE_STAR_FINALE_ID, hit.players[1]!.id)));
  assert.equal(hit.players[1]!.defeatLevel, 4);
  assert.equal(hit.players[0]!.status, "alive");
  assert.equal(hit.players[0]!.buffs.find(({ stateType }) => stateType === LONE_STAR_SUICIDE)?.expiresAtTurn, usedTurn + 2);
  assert.ok(!hit.eventLog.some((event) => event.type === "damage" && event.targetId === hit.players[1]!.id));
});

test("独也拦下被无视攻击附带的早期焚天清场", () => {
  let state = fixture();
  const source = state.players[0]!, opponent = state.players[1]!;
  opponent.hp = 1000;
  grantFreshBigCard(state, opponent, { cardId: "10501", instanceId: "fire", onlyAbilityId: "1050101" });
  source.buffs.push({ id: "defense_value", name: "防御值", stacks: 20 });
  state = drain(submit(state, { type: "attack", attackId: "sha", stacks: 1 }, skill("1050101", source.id)));
  assert.equal(state.players[0]!.hp, 18);
  assert.deepEqual(getDefenseTotal(state.players[0]!), combatValue(20));
  assert.equal(state.players[1]!.hp, 999);
});

test("自必杀在下一回合初结算且不产生伤害事件", () => {
  let state = fixture(LONE_STAR_FINALE_ID, 3);
  const sourceId = state.players[0]!.id;
  state.players[0]!.buffs.push({ id: "self-finale", name: "孤星绝煞·自必杀", stacks: 1,
    stateType: LONE_STAR_SUICIDE, expiresAtTurn: state.turnNumber + 2 });
  state = drain(submit(state, cake));
  const source = state.players.find(({ id }) => id === sourceId)!;
  assert.equal(state.turnNumber, 2);
  assert.equal(source.defeatLevel, 4);
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.targetId === sourceId));
});
