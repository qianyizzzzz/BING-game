import assert from "node:assert/strict";
import { test } from "node:test";
import { addPlayerToGame, advanceActionWindow, beginActionPrompt, createGame, createPlayer, enterActionWindow, getActiveFusionCount,
  getFusionJudgmentRank, getVisibleStatusOverview, startGame, submitActionWindowSkill, submitPlayerAction,
  toPublicGameState, validateActionWindowSkill, type GameState, type PlayerAction, type SkillAction } from "../packages/shared/src";
import { getFusionSkillId } from "../packages/shared/src/skills/fusion";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";
import { HEXAGRAM_SIX_STAR, countHexagramStars, hexagramRemainingUses } from "../packages/shared/src/engine/hexagram";
import { HEXAGRAM_ABSOLUTE, HEXAGRAM_CARD, HEXAGRAM_CHOOSE, HEXAGRAM_IGNORE, HEXAGRAM_KEYS, HEXAGRAM_RESTORE, HEXAGRAM_SPIRIT,
  type HexagramForm } from "../packages/shared/src/engine/hexagramIds";

const cake: PlayerAction = { type: "gain_cake" };
const skill = (skillId: string, values: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...values });
const card = (state: GameState) => state.players[0]!.bigCards![0]!;
const owner = (state: GameState) => state.players[0]!;
const trace = (state: GameState) => JSON.stringify(state.eventLog.slice(-14));

function table(form?: HexagramForm) {
  let state = createGame("六芒", { skillMode: "big_test_select", skillCount: 1, initialHp: 18, firstTurnNoAttack: false });
  for (const name of ["乙", "丙"]) state = addPlayerToGame(state, createPlayer(name));
  owner(state).bigCards = [{ cardId: HEXAGRAM_CARD, instanceId: "hexagram" }];
  state = startGame(state);
  return form ? submitActionWindowSkill(state, owner(state).id, skill(HEXAGRAM_CHOOSE, { cardForm: form })) : state;
}

function drain(state: GameState, stop?: GameState["activeTimingPhase"]) {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && i < 90; i++)
    state = advanceActionWindow(state);
  return state;
}

function play(state: GameState, moves: PlayerAction[]) {
  for (const [index, move] of moves.entries()) {
    const submitted = submitPlayerAction(state, state.players[index]!.id, move);
    assert.equal(submitted.error, undefined);
    state = submitted.state;
  }
  return state;
}

test("六芒开局默认禁魂，自动轮换时暂停魔方，六芒星阵保持判定 VI", () => {
  let state = table();
  assert.equal(card(state).hexagramForms!.active, "soul");
  assert.equal(getActiveFusionCount(owner(state), "魔方"), 1);
  assert.equal(getFusionJudgmentRank(owner(state).skillFusions!.find((fusion) => fusion.skillId === getFusionSkillId("六芒星阵"))!), "VI");
  assert.ok(getVisibleStatusOverview(toPublicGameState(state, owner(state).id), owner(state).id)?.special
    .some(({ label, value }) => label === "六芒魔咒·形态" && value.includes("禁魂")));
  state = drain(state);
  state.roundNumber = 2;
  beginActionPrompt(state, "round_before_action");
  state = drain(state);
  assert.equal(card(state).hexagramForms!.active, "death");
  assert.equal(getActiveFusionCount(owner(state), "魔方"), 0);
  assert.equal(getActiveFusionCount(owner(state), "六芒星阵"), 1);
});

test("禁死在负血后仍允许出招，只按亮招已有的负血发六芒星", () => {
  let state = drain(table("death"));
  assert.equal(card(state).hexagramForms!.active, "death");
  owner(state).cakes = 2;
  state.players[1]!.hp = 0;
  const victim = state.players[1]!.id;
  state = drain(play(state, [{ type: "attack", attackId: "sha", stacks: 1, targetId: victim }, cake, cake]), "turn_end_action");
  assert.equal(state.players[1]!.status, "alive");
  assert.equal(state.players[1]!.hp, -1);
  assert.equal(hexagramRemainingUses(owner(state), HEXAGRAM_SIX_STAR), 1);
  state = drain(state, "round_before_action");
  if (state.phase === "action_window" && state.activeTimingPhase === "round_before_action" && state.roundNumber > 1)
    state = submitActionWindowSkill(state, owner(state).id, skill(HEXAGRAM_CHOOSE, { cardForm: "death" }));
  state = drain(state);
  state = drain(play(state, [cake, cake, cake]));
  assert.equal(hexagramRemainingUses(owner(state), HEXAGRAM_SIX_STAR), 2);
});

test("禁灵只列已暴露子技能，支付两份镜像并保存 ID", () => {
  let state = table("spirit");
  const [source, other] = state.players;
  other!.bigCards = [{ cardId: "10521", instanceId: "visible-target" }];
  const targetSkillId = "1052104";
  const action = skill(HEXAGRAM_SPIRIT, { targetId: other!.id, targetSkillId, targetBigCardInstanceId: "visible-target" });
  for (let i = 0; i < 2; i++) grantInitializedSkill(state, source!.id, "1100", "测试镜像", false);
  assert.equal(validateActionWindowSkill(state, source!.id, action).ok, false);
  assert.equal(toPublicGameState(state, source!.id).hexagramCopyChoices, undefined);
  other!.revealedSkillIds.push(targetSkillId);
  assert.ok(toPublicGameState(state, source!.id).hexagramCopyChoices?.some((choice) => choice.targetSkillId === targetSkillId));
  assert.equal(validateActionWindowSkill(state, source!.id, action).ok, true);
  state = submitActionWindowSkill(state, source!.id, action);
  assert.equal(hexagramRemainingUses(owner(state), "1100"), 0);
  assert.ok(owner(state).bigCards!.some((copy) => copy.onlyAbilityId === targetSkillId));
  assert.deepEqual(owner(state).mirroredSkillIds, [targetSkillId]);
});

test("禁绝支付两次六芒星，变招时选择恢复，跳过按 ID 恢复", () => {
  let state = drain(table("absolute"));
  card(state).hexagramForms!.available = ["spirit", "art", "absolute", "limited"];
  card(state).hexagramSpentStars = 4;
  grantInitializedSkill(state, owner(state).id, HEXAGRAM_SIX_STAR, "测试额外六芒星", false);
  assert.equal(validateActionWindowSkill(state, owner(state).id, skill(HEXAGRAM_ABSOLUTE)).ok, false);
  state = play(state, [cake, cake, cake]);
  state = enterActionWindow(state, owner(state).id);
  const quote = validateActionWindowSkill(state, owner(state).id, skill(HEXAGRAM_ABSOLUTE));
  assert.equal(quote.ok, true, JSON.stringify({ quote, phase: state.activeTimingPhase, form: card(state).hexagramForms!.active,
    uses: hexagramRemainingUses(owner(state), HEXAGRAM_SIX_STAR) }));
  state = submitActionWindowSkill(state, owner(state).id, skill(HEXAGRAM_ABSOLUTE));
  assert.equal(hexagramRemainingUses(owner(state), HEXAGRAM_SIX_STAR), 0);
  assert.ok(owner(state).buffs.some(({ sourceJudgmentRank, id }) => id === "temp_absolute_invulnerable" && sourceJudgmentRank === "VI"));
  assert.equal(card(state).hexagramRestores, 1);
  let auto = drain(structuredClone(state));
  assert.ok(card(auto).hexagramForms!.available.includes("soul"));
  assert.ok(!card(auto).hexagramForms!.available.includes("death"));
  state = submitActionWindowSkill(state, owner(state).id, skill(HEXAGRAM_RESTORE, { cardForm: "death" }));
  assert.ok(card(state).hexagramForms!.available.includes("death"));
  assert.ok(!card(state).hexagramForms!.available.includes("soul"));
  assert.equal(card(state).hexagramForms!.active, "absolute");
});

test("第九条只计同空间的消耗，形态全满时不预存恢复", () => {
  const state = drain(table());
  countHexagramStars(state, state.players[1]!, 6);
  assert.equal(card(state).hexagramRestores, undefined);
  assert.equal(card(state).hexagramSpentStars, 0);
  card(state).hexagramForms!.available = HEXAGRAM_KEYS.filter((key) => key !== "art");
  state.players[1]!.spaceId = "separate";
  countHexagramStars(state, state.players[1]!, 6);
  assert.equal(card(state).hexagramRestores, undefined);
  countHexagramStars(state, owner(state), 6);
  assert.equal(card(state).hexagramRestores, 1);
});

test("六芒消耗当前形态承担普通死亡，退游消耗当前和另一种形态", (context) => {
  let state = drain(table());
  let calls = 0;
  const random = context.mock.method(Math, "random", () => 0.9 + ++calls / 100000);
  owner(state).hp = 0;
  state.players[1]!.cakes = 3;
  state = drain(play(state, [cake, { type: "attack", attackId: "sha", stacks: 3, targetId: owner(state).id }, cake]), "round_before_action");
  assert.equal(owner(state).hp, 18);
  assert.equal(card(state).hexagramForms!.active, "death");
  assert.ok(!card(state).hexagramForms!.available.includes("soul"));
  assert.equal(card(state).hexagramForms!.available.length, 5);

  random.mock.restore();
  state = drain(table());
  context.mock.method(Math, "random", () => 0.9 + ++calls / 100000);
  card(state).lostAbilityIds = [HEXAGRAM_IGNORE];
  grantInitializedSkill(state, state.players[1]!.id, "1094", "测试退游", false);
  state = drain(play(state, [cake, skill("1094", { targetId: owner(state).id }), cake]), "round_before_action");
  assert.equal(owner(state).status, "alive");
  assert.ok(!card(state).hexagramForms!.available.includes("soul"));
  assert.equal(card(state).hexagramForms!.available.length, 4);
});

test("禁灵按实际受伤获得镜像", (context) => {
  let state = drain(table("spirit"));
  context.mock.method(Math, "random", () => 0.99);
  for (const player of state.players.slice(1)) player.cakes = 3;
  const attack: PlayerAction = { type: "attack", attackId: "sha", targetId: owner(state).id, stacks: 3 };
  state = drain(play(state, [cake, attack, attack]), "turn_end_action");
  assert.equal(hexagramRemainingUses(owner(state), "1100"), 1, trace(state));
  assert.equal(owner(state).hp, 16);
});

test("禁术回合初加饼，在重开时向下取整", (context) => {
  let state = drain(table("art"));
  context.mock.method(Math, "random", () => 0.99);
  assert.equal(owner(state).cakes, 1);
  owner(state).cakes = 4;
  state.players[1]!.cakes = 3;
  state = drain(play(state, [cake, { type: "attack", attackId: "sha", stacks: 3, targetId: owner(state).id }, cake]), "round_before_action");
  assert.equal(owner(state).cakes, 2, trace(state));
});

test("禁魂将相同 ID 的法伤判为无效，第八条始终无视技能攻击", (context) => {
  let state = drain(table());
  context.mock.method(Math, "random", () => 0.99);
  owner(state).mirroredSkillIds = ["1012"];
  const [source, enemy, other] = state.players;
  const id = source!.id;
  for (const caster of [enemy!, other!]) {
    caster.cakes = 4;
    grantInitializedSkill(state, caster.id, "1012", "测试火烧", false);
    grantInitializedSkill(state, caster.id, "1077", "测试火球", false);
  }
  state = play(state, [cake, skill("1077", { targetId: id }), cake]);
  state = submitActionWindowSkill(state, other!.id, skill("1012"));
  state = drain(state, "turn_end_action");
  assert.equal(owner(state).hp, 18);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === id &&
    event.blockKind === "invalid" && event.protectionName === "禁魂"), trace(state));
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === id &&
    event.blockKind === "ignored" && event.protectionName === "六芒魔咒·无视"), trace(state));
});

test("禁锢无视自己发动的逆转，只保留技能出招的方向", (context) => {
  let state = drain(table("limited"));
  context.mock.method(Math, "random", () => 0.99);
  const [caster, fireTarget, normalTarget] = state.players;
  caster!.cakes = 2;
  normalTarget!.cakes = 1;
  for (const id of ["1092", "1077"]) grantInitializedSkill(state, caster!.id, id, "测试限定技无视", false);
  state = play(state, [skill("1077", { targetId: fireTarget!.id }), cake,
    { type: "attack", attackId: "sha", targetId: fireTarget!.id, stacks: 1 }]);
  state = submitActionWindowSkill(state, caster!.id, skill("1092"));
  state = drain(state, "turn_end_action");
  const damage = state.eventLog.filter((event) => event.type === "damage");
  assert.ok(damage.some((event) => event.type === "damage" && event.sourceId === caster!.id && event.targetId === fireTarget!.id));
  assert.ok(damage.some((event) => event.type === "damage" && event.sourceId === fireTarget!.id && event.targetId === normalTarget!.id));
});
