import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, beginActionPrompt, createGame, createPlayer,
  getActiveFusionCount, getFusionJudgmentRank, getVisibleStatusOverview, previewPlayerAttackStats, startGame,
  submitActionWindowSkill, submitPlayerAction, toPublicGameState, validateActionWindowSkill,
  FENTIAN_ATTACK_ID, SPIRIT_GUIDANCE_ID,
  type GameState, type PlayerAction, type SkillAction
} from "../packages/shared/src";
import { getSkillAttackStats } from "../packages/shared/src/skills/registry";
import { getFusionSkillId } from "../packages/shared/src/skills/fusion";
import { attackLevelValue } from "../packages/shared/src/engine/combatValues";
import { FIVE_ELEMENTS_CARD, FIVE_ELEMENTS_CHOOSE, FIVE_ELEMENTS_KEYS, FIVE_ELEMENTS_LEVEL,
  type FiveElementsForm } from "../packages/shared/src/engine/fiveElementsIds";
import { fiveElementsMoveAttributes } from "../packages/shared/src/engine/fiveElements";
import { applyFrozenStatus, applyNegativeStatus } from "../packages/shared/src/engine/negativeStatuses";
import { getDefenseTotal } from "../packages/shared/src/engine/starDragon";
import { resolveOrdinaryHealing } from "../packages/shared/src/engine/healing";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";
import { CRYSTAL_CARD_ID, CRYSTAL_INHERIT_ID } from "../packages/shared/src/engine/divineCrystal";

const cake = { type: "gain_cake" } as const;
const skill = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });
const hit = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", stacks: 2, targetId });
const forms = (state: GameState) => state.players[0]!.bigCards![0]!.fiveElementsForms!;

function table(opening = false): GameState {
  let state = createGame("五行", { skillMode: "big_test_select", skillCount: 1, initialHp: 18, firstTurnNoAttack: false });
  for (const name of ["乙", "丙"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ cardId: FIVE_ELEMENTS_CARD, instanceId: "five-elements" }];
  const started = startGame(state);
  return opening ? started : drain(started);
}

function drain(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && i < 80; i++)
    state = advanceActionWindow(state);
  return state;
}

function mainMoves(state: GameState, moves: PlayerAction[], order = [0, 1, 2]): GameState {
  for (const index of order) {
    const player = state.players[index]!;
    const submitted = submitPlayerAction(state, player.id, moves[index]!);
    assert.equal(submitted.error, undefined);
    state = submitted.state;
  }
  return state;
}

function useForm(state: GameState, cardForm: FiveElementsForm) {
  return submitActionWindowSkill(state, state.players[0]!.id,
    skill(FIVE_ELEMENTS_CHOOSE, { cardForm, bigCardInstanceId: "five-elements" }));
}

test("开局默认火，可改初选；以后自动循环；融合和状态栏按形态变化", () => {
  let state = table(true);
  assert.equal(state.activeTimingPhase, "opening_action");
  assert.equal(forms(state).active, "fire");
  const fireFusion = state.players[0]!.skillFusions!.find((fusion) => fusion.skillId === getFusionSkillId("炼狱使徒"))!;
  assert.equal(getFusionJudgmentRank(fireFusion), "VI");
  assert.equal(getActiveFusionCount(state.players[0], "炼狱使徒"), 1);
  assert.equal(getActiveFusionCount(state.players[0], "极寒"), 0);
  state = useForm(state, "ice");
  assert.equal(forms(state).active, "ice");
  assert.equal(getActiveFusionCount(state.players[0], "极寒"), 1);
  assert.equal(getActiveFusionCount(state.players[0], "炼狱使徒"), 0);
  const view = toPublicGameState(state, state.players[0]!.id);
  assert.ok(getVisibleStatusOverview(view, state.players[0]!.id)?.special.some(({ label, value }) =>
    label === "五行之圣·形态" && value.includes("冰 · 当前")));
  state = drain(state);
  state.roundNumber = 2;
  beginActionPrompt(state, "round_before_action");
  state = drain(state);
  assert.equal(forms(state).active, "electric");
});

test("火可以在变招时用无限调整每份攻击一次", () => {
  let state = table();
  const [owner, enemy] = state.players;
  owner!.cakes = 3;
  state = mainMoves(state, [hit(enemy!.id), cake, cake]);
  const original = previewPlayerAttackStats(state, owner!.id).stats[0]!;
  const change = skill(FIVE_ELEMENTS_LEVEL, { switchActionIndex: 0, fiveElementsLevelOperation: "divide" });
  state = submitActionWindowSkill(state, owner!.id, change);
  const attack = previewPlayerAttackStats(state, owner!.id).stats[0]!;
  assert.equal(attack.power, original.power);
  assert.deepEqual(attackLevelValue(attack), []);
  assert.equal(validateActionWindowSkill(state, owner!.id, change).ok, false);
});

test("火免疫普通攻击，冰免疫非火；冰按座次取第一份，即使第一份被油条挡住", () => {
  let state = table();
  const [owner, first, second] = state.players;
  first!.cakes = 4;
  state = drain(mainMoves(state, [cake, hit(owner!.id), cake]));
  assert.equal(state.players[0]!.hp, 18);
  forms(state).active = "ice";
  for (const player of state.players.slice(1)) player.cakes = 12;
  appendSkillInstances(state.players[1]!, ["1077"]);
  appendSkillInstances(state.players[2]!, ["1078"]);
  state = drain(mainMoves(state, [{ type: "defense", defense: "youtiao" },
    skill("1077", { targetId: owner!.id }), skill("1078", { targetId: owner!.id })], [2, 1, 0]));
  assert.equal(state.players[0]!.hp, 18);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.sourceId === second!.id && event.targetId === owner!.id &&
    event.protectionName === "五行·冰"));
});

test("冰形态的命中即冰封，电形态免疫不良并延长施加时长", () => {
  let state = table();
  forms(state).active = "ice";
  const [owner, enemy] = state.players;
  owner!.cakes = 6;
  state = drain(mainMoves(state, [hit(enemy!.id), cake, cake]));
  assert.equal(state.players[1]!.buffs.find(({ id }) => id === "frozen")?.stacks, 5);
  forms(state).active = "electric";
  assert.equal(applyFrozenStatus(state, owner!.id, 2, "turn", enemy!.id), false);
  assert.equal(applyFrozenStatus(state, enemy!.id, 4, "turn", owner!.id), true);
  assert.equal(state.players[1]!.buffs.find(({ id }) => id === "frozen")?.expiresAtTurn, state.turnNumber + 8);
  assert.equal(applyNegativeStatus(state, enemy!.id, "stunned", (target) =>
    target.buffs.push({ id: "stunned", name: "眩晕", stacks: 1, expiresAtTurn: state.turnNumber + 2 }), owner!.id), true);
  assert.equal(state.players[1]!.buffs.find(({ id }) => id === "stunned")?.expiresAtTurn, state.turnNumber + 4);
});

test("冰把一招的多段伤害与烧伤合为一次接收机会", () => {
  let state = table();
  forms(state).active = "ice";
  const [owner, first, second] = state.players;
  first!.bigCards = [{ cardId: "10501", instanceId: "fire", onlyAbilityId: FENTIAN_ATTACK_ID }];
  first!.cakes = second!.cakes = 12;
  appendSkillInstances(second!, ["1078"]);
  state = drain(mainMoves(state, [cake, skill(FENTIAN_ATTACK_ID, { targetId: owner!.id }),
    skill("1078", { targetId: owner!.id })]), "turn_end_action");
  const damage = state.eventLog.filter((event) => event.type === "damage" && event.targetId === owner!.id);
  assert.ok(damage.length > 1);
  assert.ok(damage.every((event) => event.sourceId === first!.id));
  assert.ok(state.players[0]!.buffs.some(({ stateType }) => stateType === "burning"));
});

test("死亡和退游仅在有剩余形态可留时扣形态，始终保留最后一个形态", () => {
  let state = table();
  const ownerId = state.players[0]!.id;
  forms(state).active = "wind";
  forms(state).available = ["wind", "earth"];
  state.players[0]!.hp = 1;
  state.players[1]!.cakes = 6;
  state = drain(mainMoves(state, [cake, hit(ownerId), cake]), "round_before_action");
  assert.equal(forms(state).active, "earth");
  assert.deepEqual(forms(state).available, ["earth"]);
  assert.equal(state.players[0]!.hp, 18);
  state = drain(state);
  forms(state).active = "wind";
  forms(state).available = ["wind"];
  state.players[0]!.buffs = state.players[0]!.buffs.filter(({ id }) => id !== "defense_value");
  state.players[0]!.hp = 1;
  state.players[1]!.cakes = 6;
  state = drain(mainMoves(state, [cake, hit(ownerId), cake]));
  assert.equal(state.players[0]!.status, "dead");
  assert.equal(forms(state).active, "wind");

  state = table();
  forms(state).available = ["wind", "earth"];
  forms(state).active = "wind";
  appendSkillInstances(state.players[1]!, ["1094"]);
  state = drain(mainMoves(state, [cake, skill("1094", { targetId: state.players[0]!.id }), cake]));
  assert.equal(state.players[0]!.defeatLevel, 2);
  assert.deepEqual(forms(state).available, ["wind", "earth"]);

  state = table();
  forms(state).available = ["wind", "earth", "ice"];
  forms(state).active = "wind";
  appendSkillInstances(state.players[1]!, ["1094"]);
  state = drain(mainMoves(state, [cake, skill("1094", { targetId: state.players[0]!.id }), cake]), "round_before_action");
  assert.equal(state.players[0]!.status, "alive");
  assert.equal(forms(state).available.length, 1);
  assert.ok(!forms(state).available.includes("wind"));
  assert.equal(forms(state).active, forms(state).available[0]);
  assert.equal(state.players[0]!.hp, 18);
});

test("土夺取回血和防御值，抵挡伤害后耗尽防御值，多人同为土时不夺取", () => {
  let state = table();
  forms(state).active = "earth";
  const [owner, enemy] = state.players;
  assert.equal(resolveOrdinaryHealing(state, enemy!.id, 2, false)?.targetId, owner!.id);
  appendSkillInstances(enemy!, ["1047"]);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, enemy!.id, skill("1047"));
  assert.ok(getDefenseTotal(state.players[0]!).length > 0);
  assert.equal(getDefenseTotal(state.players[1]!).length, 0);
  state = drain(state);
  forms(state).active = "earth";
  appendSkillInstances(state.players[1]!, ["1094"]);
  state = drain(mainMoves(state, [cake, skill("1094", { targetId: owner!.id }), cake]), "turn_end_action");
  assert.equal(state.players[0]!.hp, 18);
  assert.equal(getDefenseTotal(state.players[0]!).length, 0);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.protectionName === "五行·土"));

  state.players[1]!.bigCards = [{ cardId: FIVE_ELEMENTS_CARD, instanceId: "another",
    fiveElementsForms: { active: "earth", available: [...FIVE_ELEMENTS_KEYS] } }];
  assert.equal(resolveOrdinaryHealing(state, state.players[2]!.id, 2, false)?.targetId, state.players[2]!.id);
});

test("土的拆迁队驱动毁灭之力清除板牌，并把天花板换成纯净苍穹", () => {
  let state = table();
  forms(state).active = "earth";
  const [owner, boardOwner, target] = state.players;
  appendSkillInstances(boardOwner!, ["1104"]);
  const ceiling = getFusionSkillId("天花板");
  grantInitializedSkill(state, boardOwner!.id, ceiling, "测试授予天花板");
  owner!.cakes = 8;
  state = mainMoves(state, [hit(target!.id), cake, cake]);
  state = submitActionWindowSkill(state, owner!.id, skill("1044", {
    switchActionIndex: 0, attackStatModifier: "power_times_3_level_to_zero"
  }));
  assert.ok(!state.players[1]!.skills.includes("1104"));
  assert.ok(!state.players[1]!.skillFusions!.some((fusion) => fusion.skillId === ceiling));
  assert.equal(getActiveFusionCount(state.players[1], "纯净苍穹"), 1);
});

test("风先判互相施加的无效，双方都是风时按原次序", () => {
  for (const opponentWind of [false, true]) {
    let state = table();
    const [owner, enemy] = state.players;
    forms(state).active = "wind";
    owner!.bigCards!.push({ cardId: "10505", instanceId: "owner-guidance", onlyAbilityId: SPIRIT_GUIDANCE_ID });
    enemy!.bigCards = [{ cardId: "10505", instanceId: "enemy-guidance", onlyAbilityId: SPIRIT_GUIDANCE_ID }];
    if (opponentWind) enemy!.bigCards.push({ cardId: FIVE_ELEMENTS_CARD, instanceId: "enemy-wind",
      fiveElementsForms: { active: "wind", available: [...FIVE_ELEMENTS_KEYS] } });
    owner!.cakes = enemy!.cakes = 12;
    state = mainMoves(state, [skill(SPIRIT_GUIDANCE_ID, { targetIds: [enemy!.id] }),
      skill(SPIRIT_GUIDANCE_ID, { targetIds: [owner!.id] }), cake], [1, 0, 2]);
    const invalidations = state.eventLog.flatMap((event) =>
      event.type === "system" && event.message.includes("灵媒指引使") ? [event.message] : []);
    assert.equal(invalidations.length, opponentWind ? 2 : 1);
    assert.ok(invalidations.some((message) => message.startsWith(owner!.name)));
  }
});

test("风的烈弓优先于神域魔晶禁止交错，双方都有风时恢复对撞", () => {
  for (const opponentWind of [false, true]) {
    let state = table();
    const [owner, enemy] = state.players;
    forms(state).active = "wind";
    appendSkillInstances(owner!, ["1059"]);
    enemy!.bigCards = [{ cardId: CRYSTAL_CARD_ID, instanceId: "crystal", onlyAbilityId: CRYSTAL_INHERIT_ID }];
    if (opponentWind) enemy!.bigCards.push({ cardId: FIVE_ELEMENTS_CARD, instanceId: "enemy-wind",
      fiveElementsForms: { active: "wind", available: [...FIVE_ELEMENTS_KEYS] } });
    owner!.cakes = enemy!.cakes = 12;
    state = mainMoves(state, [hit(enemy!.id), hit(owner!.id), cake]);
    state = drain(submitActionWindowSkill(state, owner!.id, skill("1059", {
      targetId: enemy!.id, switchActionIndex: 0
    })), "turn_end_action");
    assert.equal(state.eventLog.some((event) => event.type === "clash"), opponentWind);
    assert.equal(state.eventLog.some((event) => event.type === "system" && event.message.includes("交错而过")), !opponentWind);
  }
});

test("暴风雪同时恢复冰和风，免疫整招，当前形态不变；大卡使用自己的属性", () => {
  let state = table();
  const owner = state.players[0]!;
  forms(state).available = ["electric"];
  forms(state).active = "electric";
  appendSkillInstances(state.players[1]!, ["1095"]);
  state.players[1]!.cakes = 6;
  state = drain(mainMoves(state, [cake, skill("1095", { targetId: owner.id }), cake]));
  assert.equal(state.players[0]!.hp, 18);
  assert.equal(forms(state).active, "electric");
  assert.deepEqual(new Set(forms(state).available), new Set(["electric", "ice", "wind"]));
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.protectionName?.includes("五行·复归")));
  assert.deepEqual(fiveElementsMoveAttributes(getSkillAttackStats("1052411", 1)!), ["wind"]);
  assert.deepEqual(fiveElementsMoveAttributes(getSkillAttackStats("1096", 1)!), ["ice", "wind"]);
});
