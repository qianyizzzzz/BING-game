import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HEALING_ART_ID, KUIJI_ULTIMATE_ID, KUISHI_ID, SELF_ISOLATION_ID, SPIRIT_GUIDANCE_ID, FENTIAN_ATTACK_ID, JUNENG_SHIELD_ID,
  addPlayerToGame, advanceActionWindow, appendSkillInstances, beginActionPrompt, createGame, createPlayer,
  getActiveFusionCount, getElementAmount, getSkillUseLimit, getOwnedSkillIds, INFINITY_VALUE, scaleCombatValue, setPlayerHpValue,
  startGame, submitActionWindowSkill, submitPlayerAction, toPublicGameState, validateAction,
  type GameState, type PlayerAction, type SkillAction
} from "@bing/shared";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const cast = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", stacks: 1, targetId });

function drain(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; i < 100 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(cards = [["10505"], [], [], []], opening = false): GameState {
  let state = createGame("A", { skillMode: "big_test_select", skillCount: 2, firstTurnNoAttack: false });
  for (let i = 1; i < cards.length; i++) state = addPlayerToGame(state, createPlayer(String.fromCharCode(65 + i)));
  state.players.forEach((player, index) => { player.bigCards = cards[index]!.map((cardId, n) => ({ cardId, instanceId: `card-${index}-${n}` })); });
  state = startGame(state);
  if (opening) return state;
  state = drain(state);
  state.players.forEach((player) => { player.hp = 30; player.cakes = 30; });
  return state;
}

function turn(state: GameState, actions: PlayerAction[]): GameState {
  state = drain(state);
  for (const [index, player] of state.players.entries()) {
    if (player.status === "alive" && !state.pendingActions[player.id])
      state = submitPlayerAction(state, player.id, actions[index] ?? cake).state;
  }
  return drain(state, "turn_end_action");
}

test("开局授予实际技能；窥视只给持有者看原卡，公开复制完整卡牌并重新初始化", () => {
  let state = fixture([["10505"], ["10504"], ["10501"]], true);
  const [a, b, c] = state.players;
  assert.equal(getActiveFusionCount(a, "虚无"), 1);
  assert.equal(getActiveFusionCount(a, "天空之城"), 1);
  assert.ok(a!.skills.includes("skill_5_34881") && a!.skills.includes(HEALING_ART_ID));
  assert.equal(toPublicGameState(state, a!.id).players[1]!.bigCards?.[0]?.cardId, "10504");
  assert.equal(toPublicGameState(state, c!.id).players[1]!.bigCards?.length, 0);
  state = submitActionWindowSkill(state, a!.id, cast(KUISHI_ID, { targetBigCardInstanceId: "card-1-0" }));
  assert.equal(getActiveFusionCount(state.players[0], "毁灭之盾"), 1);
  assert.equal(toPublicGameState(state, c!.id).players[0]!.bigCards?.[0]?.cardId, "10504");
  assert.equal(toPublicGameState(state, c!.id).players[1]!.bigCards?.length, 0);
  assert.throws(() => submitActionWindowSkill(state, a!.id, cast(KUISHI_ID, { targetBigCardInstanceId: "card-2-0" })));
});

test("灵媒取消小防和饼的效果，消耗保留；互相指定时两边同时失效", () => {
  let state = fixture([["10505"], ["10505"], [], []]);
  const [a, b] = state.players;
  state.roundTurnNumber = 4;
  state = turn(state, [cast(SPIRIT_GUIDANCE_ID, { targetIds: [b!.id] }), small, small, small]);
  assert.equal(state.players[1]!.hp, 25);
  assert.equal(state.players[2]!.hp, 30);
  state = drain(state);
  state.players.forEach((player) => { player.cakes = 10; });
  state = turn(state, [cast(SPIRIT_GUIDANCE_ID, { targetIds: [b!.id] }), cast(SPIRIT_GUIDANCE_ID, { targetIds: [a!.id] }), small, small]);
  assert.equal(state.players[0]!.hp, 32);
  assert.equal(state.players[1]!.hp, 25);
  assert.equal(state.players[0]!.cakes, 7);
  assert.equal(state.players[1]!.cakes, 7);
  state = drain(state);
  state.players[0]!.cakes = 10;
  const before = state.players[1]!.cakes;
  state = turn(state, [cast(SPIRIT_GUIDANCE_ID, { targetIds: [b!.id] }), cake, small, small]);
  assert.equal(state.players[1]!.cakes, before);
});

test("灵媒只按实际伤害和回血累计，增长治愈术次数不增发卡", () => {
  let state = fixture();
  state = turn(state, [cast(SPIRIT_GUIDANCE_ID), cake, cake, cake]);
  const a = state.players[0]!;
  assert.equal(a.hp, 36);
  assert.equal(a.buffs.find((buff) => buff.id === "defense_value")?.stacks, 9);
  assert.equal(a.skills.filter((id) => id === HEALING_ART_ID).length, 1);
  assert.equal(getSkillUseLimit(a, HEALING_ART_ID), 2);
  assert.equal(a.bigCards?.[0]?.guidanceHealingUses, 1);
});

test("被灵媒取消时仍消耗元素和限定次数", () => {
  let state = fixture([["10505"], ["10504"], [], []]);
  const [a, b, c] = state.players;
  b!.buffs.push({ id: "element:聚", name: "聚", stateType: "element_resource", stacks: 2 });
  appendSkillInstances(c!, ["skill_95_91337"]);
  state = turn(state, [cast(SPIRIT_GUIDANCE_ID, { targetIds: [b!.id] }), cast(JUNENG_SHIELD_ID, { stacks: 2 }), small, small]);
  assert.equal(getElementAmount(state.players[1], "聚"), 0);
  assert.equal(state.players[1]!.hp, 25);
  assert.equal(state.players[1]!.buffs.find((buff) => buff.id === "defense_value"), undefined);
  state = drain(state);
  state.players[0]!.cakes = 3;
  state = turn(state, [cast(SPIRIT_GUIDANCE_ID, { targetIds: [c!.id] }), small, cast("skill_95_91337", { targetId: a!.id }), small]);
  assert.equal(state.players[0]!.status, "alive");
  assert.equal(state.players[2]!.buffs.find((buff) => buff.id === "skill_used:skill_95_91337")?.stacks, 1);
});

test("小空间主客隔离，群攻和焚天清场不跨空间；主空间轮末返回", () => {
  let state = fixture([["10505"], ["10501"], [], []]);
  const [a, b, c] = state.players;
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, a!.id, cast(SELF_ISOLATION_ID));
  assert.equal(state.roundNumber, 2);
  const isolatedHp = state.players[0]!.hp;
  const spaceId = state.players[0]!.spaceId!;
  assert.equal(state.smallSpaces?.[spaceId]?.expiresAtRound, 3);
  state = turn(state, [cake, cake, cake, cake]);
  assert.equal(state.players[0]!.cakes, 3);
  state = drain(state);
  state.players[1]!.cakes = 10;
  assert.equal(validateAction(state, b!.id, sha(a!.id)).ok, false);
  assert.equal(validateAction(state, a!.id, sha(b!.id)).ok, false);
  state = turn(state, [cake, cast(FENTIAN_ATTACK_ID, { targetId: c!.id }), cake, cake]);
  assert.equal(state.players[0]!.hp, isolatedHp);
  assert.equal(state.players[0]!.cakes, 6);
  assert.equal(state.players[0]!.spaceId, spaceId);
  state = drain(state);
  assert.equal(state.roundNumber, 3);
  assert.equal(state.players[0]!.spaceId, undefined);
  assert.equal(state.players[0]!.cakes, 0);
});

test("两人战自我封闭时对方立即获胜", () => {
  let state = fixture([["10505"], []]);
  const [a, b] = state.players;
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, a!.id, cast(SELF_ISOLATION_ID));
  assert.equal(state.phase, "finished");
  assert.deepEqual(state.winnerIds, [b!.id]);
});

test("小空间的积饼规则属于空间；分隔的空间不可互相选中，局部扣血不重开主空间", () => {
  let state = fixture([["10505"], [], [], [], []]);
  const [a, b, c] = state.players;
  state.smallSpaces = {
    alpha: { name: "自我封闭", expiresAtRound: 3, cakeMultiplier: 3 },
    beta: { name: "自我封闭", expiresAtRound: 3, cakeMultiplier: 3 }
  };
  a!.spaceId = "alpha";
  b!.spaceId = "alpha";
  c!.spaceId = "beta";
  assert.equal(validateAction(state, a!.id, sha(c!.id)).ok, false);
  state = turn(state, [sha(b!.id), cake, cake, cake, cake]);
  assert.equal(state.players[1]!.hp, 29);
  assert.equal(state.players[1]!.cakes, 33);
  assert.equal(state.players[2]!.cakes, 33);
  assert.equal(state.players[3]!.cakes, 31);
  state = drain(state);
  assert.equal(state.roundNumber, 1);
});

test("大招造成伤害但未致死时保留；参与致死后只失去该子技能", () => {
  let state = fixture();
  for (const player of state.players.slice(1)) setPlayerHpValue(player, scaleCombatValue(INFINITY_VALUE, 2));
  state = turn(state, [cast(KUIJI_ULTIMATE_ID), cake, cake, cake]);
  assert.ok(getOwnedSkillIds(state.players[0]!).includes(KUIJI_ULTIMATE_ID));
  state = drain(state);
  state.players[0]!.cakes = 14;
  setPlayerHpValue(state.players[1]!, []);
  setPlayerHpValue(state.players[2]!, scaleCombatValue(INFINITY_VALUE, 2));
  setPlayerHpValue(state.players[3]!, scaleCombatValue(INFINITY_VALUE, 2));
  state = turn(state, [cast(KUIJI_ULTIMATE_ID), cake, cake, cake]);
  assert.ok(!getOwnedSkillIds(state.players[0]!).includes(KUIJI_ULTIMATE_ID));
  assert.ok(getOwnedSkillIds(state.players[0]!).includes(SPIRIT_GUIDANCE_ID));
  assert.ok(state.players[0]!.buffs.some((buff) => buff.stateType === "kuiji_cake_growth"));
});
