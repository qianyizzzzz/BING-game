import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, chooseWitherNumber, createGame, createPlayer,
  getActiveSkillCount, getAttackActionCost, getAttackFieldBlocker, getCakeGainAmount, getFusionSkillId, getKurongCakeDiscount,
  getReboundCakeCost, getSkillAttackStats, getTurnSkillActionCost, getWitherSelectionGroups,
  KURONG_ATTACK_ID, KURONG_LEAF_ID, startGame, submitActionWindowSkill, submitPlayerAction, toPublicGameState,
  type GameState, type PlayerAction, type SkillAction, type SkillTimingPhase
} from "@bing/shared";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";

const at = (state: GameState, index = 0) => state.players[index]!;
const cake = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const cast = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });
const sha = (targetId: string, stacks = 2): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks });

function drain(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && i < 100; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(cards = [["10516"], [], [], []], keepOpening = false): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, firstTurnNoAttack: false });
  for (let index = 1; index < cards.length; index++) state = addPlayerToGame(state, createPlayer(`玩家 ${index}`));
  for (const [index, player] of state.players.entries()) {
    player.bigCards = cards[index]!.map((cardId, n) => ({ cardId, instanceId: `card-${index}-${n}` }));
  }
  state = startGame(state);
  if (!keepOpening) state = drain(state);
  for (const player of state.players) { player.cakes = 15; player.hp = 50; }
  return state;
}

function reveal(state: GameState, ...moves: PlayerAction[]): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) if (player.status === "alive")
    state = submitPlayerAction(state, player.id, moves[index] ?? cake).state;
  return state;
}

test("枯萎独立三格、繁荣两格，五个正整数分别精确匹配最终攻等", () => {
  let state = fixture([["10516"], [], [], []], true);
  const groups = getWitherSelectionGroups(at(state), true);
  assert.deepEqual(groups.map(({ name, indices }) => [name, indices.length]), [["枯萎", 3], ["繁荣", 2]]);
  const indices = groups.flatMap(({ indices }) => indices);
  assert.equal(new Set(indices).size, 5);
  const numbers = [2, 3, 5, 7, 11];
  for (const [index, value] of numbers.entries()) state = chooseWitherNumber(state, at(state).id, indices[index]!, value);
  const base = getSkillAttackStats(KURONG_ATTACK_ID, 1)!;
  for (const power of numbers)
    assert.equal(getAttackFieldBlocker(state, at(state, 1).id, { ...base, powerValue: [{ coefficient: power, exponent: 0 }] })?.skillId, "1010");
  assert.equal(getAttackFieldBlocker(state, at(state, 1).id, { ...base, powerValue: [{ coefficient: 23, exponent: 0 }] }), undefined);
  assert.equal(getActiveSkillCount(at(state), "1011"), 1, "繁荣移除其素材的血之哀，保留独立枯萎的血之哀");
  assert.equal(getActiveSkillCount(at(state), "1092"), 1);
});

test("繁荣只同步原始回血，多人持有时不循环", () => {
  let state = fixture([[], [], [], []]);
  for (const index of [0, 1]) grantInitializedSkill(state, at(state, index).id, getFusionSkillId("繁荣"), "测试繁荣");
  assert.equal(getActiveSkillCount(at(state), "1011"), 0);
  appendSkillInstances(at(state, 2), ["1045"]);
  state = drain(reveal(state, cake, cake, sha(at(state, 3).id, 4)));
  const echoes = state.eventLog.filter((event) => event.type === "heal" && event.reason === "繁荣");
  assert.equal(echoes.length, 2);
  assert.ok(echoes.every((event) => event.type === "heal" && event.amount === 1));
});

test("叶落彼岸只展示其他玩家各一张，分开取得三个初始化子技能且保密", () => {
  let state = fixture([["10516"], ["10501"], ["10507"], ["10514"], ["10517", "10518"]], true);
  const view = toPublicGameState(state, at(state).id);
  const offers = view.leafCardChoices!;
  assert.equal(offers.length, 4);
  assert.ok(!offers.some(({ ownerId }) => ownerId === at(state).id));
  assert.equal(toPublicGameState(state, at(state, 1).id).leafCardChoices, undefined);
  assert.ok(!("leafCardsByViewer" in toPublicGameState(state)));
  const picks = offers.slice(0, 3).map(({ cardInstanceId, abilityIds }, index) =>
    ({ cardInstanceId, abilityId: index === 0 ? "1050103" : abilityIds[0]! }));
  const sameCard = [{ ...picks[0]! }, { ...picks[0]!, abilityId: "1050101" }];
  assert.throws(() => submitActionWindowSkill(state, at(state).id, cast(KURONG_LEAF_ID, { leafAbilityChoices: sameCard })), /叶落彼岸/);
  assert.throws(() => submitActionWindowSkill(state, at(state).id, cast(KURONG_LEAF_ID, {
    leafAbilityChoices: [...picks, { cardInstanceId: offers[3]!.cardInstanceId, abilityId: offers[3]!.abilityIds[0]! }]
  })), /叶落彼岸/);
  state = submitActionWindowSkill(state, at(state).id, cast(KURONG_LEAF_ID, { leafAbilityChoices: picks }));
  assert.equal(toPublicGameState(state, at(state).id).leafCardChoices, undefined);
  assert.deepEqual(at(state).bigCards!.slice(1).map((card) => card.onlyAbilityId), picks.map(({ abilityId }) => abilityId));
  assert.ok(at(state).skillFusions?.some((fusion) => fusion.skillId === getFusionSkillId("天火之狱")));
  assert.equal(at(state, 1).bigCards![0]!.onlyAbilityId, undefined);
  assert.equal(toPublicGameState(state, at(state, 1).id).players[0]!.bigCards!.length, 0);
});

test("千春共绽三种排名、整次付费，隐藏饼数时仍给自己的正确价格", () => {
  let state = fixture();
  const setCakes = (values: number[]) => values.forEach((value, index) => { at(state, index).cakes = value; });
  setCakes([4, 5, 6, 7]);
  assert.equal(getKurongCakeDiscount(state, at(state)), 3);
  assert.equal(getCakeGainAmount(state, at(state)), 3);
  assert.equal(getTurnSkillActionCost(at(state), cast(KURONG_ATTACK_ID, { stacks: 3 }), state), 9);
  assert.equal(getReboundCakeCost(state, at(state)), 1);
  assert.equal(getAttackActionCost(state, at(state), sha(at(state, 1).id, 2) as Extract<PlayerAction, { type: "attack" }>), 1);
  state.config.hideCakeCounts = true;
  const view = toPublicGameState(state, at(state).id);
  assert.equal(view.players[1]!.cakes, -1);
  assert.equal(getKurongCakeDiscount(view, view.players[0]!), 3);
  setCakes([4, 4, 6, 7]);
  assert.equal(getTurnSkillActionCost(at(state), cast(KURONG_ATTACK_ID), state), 4);
  assert.equal(getCakeGainAmount(state, at(state)), 1);
  setCakes([3, 1, 6, 7]);
  assert.equal(getTurnSkillActionCost(at(state), cast(KURONG_ATTACK_ID), state), 3);
  state = reveal(state, cast(KURONG_ATTACK_ID, { targetId: at(state, 1).id }), stone);
  assert.equal(at(state).cakes, 0);
});

test("普通反弹按当前排名实扣，所有主出招在付款前同时确定排名", () => {
  let state = fixture();
  at(state).cakes = 4;
  state = drain(reveal(state, { type: "defense", defense: "rebound", targetId: at(state, 1).id }));
  assert.equal(at(state).cakes, 3);
  state = fixture([[], ["10516"], [], []]);
  at(state).cakes = 1;
  at(state, 1).cakes = 1;
  state = drain(reveal(state));
  assert.equal(at(state, 1).cakes, 2, "甲先加饼也不会改变乙这一手原本并列最低");
});

test("未防住时即刻吸走全部多余命，石头与无敌防住时不吸命", () => {
  for (const defense of ["none", "stone", "invulnerable"]) {
    let state = fixture();
    at(state, 1).spareLives = [{ hp: 0 }, { hp: 3 }, { hp: 0 }];
    if (defense === "invulnerable") at(state, 1).buffs.push({ id: "temp_invulnerable", name: "无敌", stacks: 1 });
    state = drain(reveal(state, cast(KURONG_ATTACK_ID, { targetId: at(state, 1).id }), defense === "stone" ? stone : cake));
    assert.deepEqual(at(state).spareLives?.map(({ hp }) => hp) ?? [], defense === "none" ? [0, 3, 0] : []);
    assert.equal(at(state, 1).spareLives?.length, defense === "none" ? 0 : 3);
    assert.ok(!at(state, 1).buffs.some((buff) => buff.lifeAbsorptionDueRound !== undefined));
  }
});

test("目标免疫失去命数时仍受攻击伤害，吸取者得不到命", () => {
  let state = fixture();
  const target = at(state, 1);
  target.spareLives = [{ hp: 3 }];
  target.buffs.push({ id: "test_life_loss_immunity", name: "免疫失去命数", stacks: 1, immuneEffectCategories: ["life_loss"] });
  state = drain(reveal(state, cast(KURONG_ATTACK_ID, { targetId: target.id })));
  assert.equal(at(state, 1).hp, 44);
  assert.deepEqual(at(state, 1).spareLives, [{ hp: 3 }]);
  assert.equal(at(state).spareLives?.length ?? 0, 0);
});

test("三轮后的轮初吸走当前生命，或者只吸期间新获得的最新一条命", () => {
  for (const gainsSpare of [false, true]) {
    let state = fixture();
    const target = at(state, 1).id;
    state = drain(reveal(state, cast(KURONG_ATTACK_ID, { targetId: target })));
    assert.equal(state.roundNumber, 2);
    assert.equal(at(state, 1).buffs.find((buff) => buff.lifeAbsorptionDueRound)?.lifeAbsorptionDueRound, 4);
    if (gainsSpare) at(state, 1).spareLives = [{ hp: 0 }, { hp: 8 }];
    for (let turn = 0; turn < 2; turn++) {
      at(state, 2).cakes = 3;
      state = drain(reveal(state, cake, cake, sha(at(state, 3).id)));
    }
    assert.equal(state.roundNumber, 4);
    assert.equal(at(state).spareLives?.[0]?.hp, gainsSpare ? 8 : 44);
    assert.equal(at(state, 1).status, gainsSpare ? "alive" : "dead");
    if (gainsSpare) assert.deepEqual(at(state, 1).spareLives, [{ hp: 0 }]);
    assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.roundNumber === 4 && event.targetId === target));
  }
});
