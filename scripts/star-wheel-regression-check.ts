import assert from "node:assert/strict";
import { test } from "node:test";
import { addPlayerToGame, advanceActionWindow, createGame, createPlayer, getActiveSkillCount, getCombatSeats,
  getPhysicalCombatSeats, getFusionSkillId, grantInitializedSkill, startGame, submitActionWindowSkill, submitPlayerAction,
  JIHAN_CARD_ID,
  STAR_WHEEL_BUY, STAR_WHEEL_POSITION, STAR_WHEEL_REDIRECT, STAR_WHEEL_RELEASE, STAR_WHEEL_REVERSE,
  STAR_WHEEL_SHUFFLE, STAR_WHEEL_VICTORY, VERDICT_ACTION_ID, RAGING_WAVES_ID, starWheelRemaining, submitPointGameAction,
  toPublicGameState, type GameState, type PlayerAction,
  type SkillAction } from "../packages/shared/src";
import { applyFrozenStatus } from "../packages/shared/src/engine/negativeStatuses";
import { applyStarWheelIncomingMark } from "../packages/shared/src/engine/starWheel";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;

function fixture(withJihan = false): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: withJihan ? 2 : 1, firstTurnNoAttack: false, initialHp: 30 });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ cardId: "10547", instanceId: "star-wheel" }];
  if (withJihan) state.players[0]!.bigCards.push({ cardId: JIHAN_CARD_ID, instanceId: "jihan" });
  state = until(startGame(state), (game) => game.phase === "collecting_actions");
  for (const player of state.players) player.cakes = 25;
  return state;
}

function until(state: GameState, stop: (state: GameState) => boolean): GameState {
  for (let i = 0; i < 40 && state.phase === "action_window" && !stop(state); i++) state = advanceActionWindow(state);
  assert.ok(stop(state), state.phase + " / " + state.activeTimingPhase);
  return state;
}

function submit(state: GameState, moves: PlayerAction[]): GameState {
  const ids = state.players.map(({ id }) => id);
  for (const [index, id] of ids.entries()) state = submitPlayerAction(state, id, moves[index] ?? cake).state;
  return state;
}

function atChange(state: GameState): GameState {
  return until(state, (game) => game.activeTimingPhase === "turn_change_action");
}

function windowSkill(state: GameState, playerId: string, skillId: string, args: Partial<SkillAction> = {}): GameState {
  return submitActionWindowSkill(state, playerId, { type: "skill", skillId, stacks: 1, ...args });
}

test("开局发两组真实逆转星移，飞轮再发一组", () => {
  let state = fixture();
  const player = state.players[0]!;
  assert.equal(getActiveSkillCount(player, STAR_WHEEL_REVERSE), 2);
  assert.equal(getActiveSkillCount(player, STAR_WHEEL_REDIRECT), 2);
  state = submit(state, [{ type: "skill", skillId: STAR_WHEEL_BUY, stacks: 1 }]);
  state = until(state, (game) => game.phase === "collecting_actions");
  assert.equal(getActiveSkillCount(state.players[0], STAR_WHEEL_REVERSE), 3);
  assert.equal(state.players[0]!.cakes, 19);
});

test("逆转立即封存，后续空逆不恢复原出招，选中后才放出", () => {
  let state = fixture();
  const [owner, attacker, target, other] = state.players;
  state.players[3]!.skills.push(STAR_WHEEL_REVERSE);
  state = atChange(submit(state, [cake, { type: "attack", attackId: "sha", stacks: 1, targetId: target!.id }, cake]));
  state = windowSkill(state, owner!.id, STAR_WHEEL_REVERSE);
  const [move] = state.starWheelMoves ?? [];
  assert.ok(move);
  assert.equal(move.attacks[0]!.sourceId, target!.id);
  assert.equal(move.attacks[0]!.targetId, attacker!.id);
  assert.equal(toPublicGameState(state, owner!.id).starWheelMoves?.[0]?.id, move.id);
  assert.ok(!Object.values(state.pendingActions).some((plan) => plan?.actions.length));
  state = windowSkill(state, other!.id, STAR_WHEEL_REVERSE);
  assert.equal(state.starWheelMoves?.[0]?.id, move.id);
  state = windowSkill(state, owner!.id, STAR_WHEEL_RELEASE, { starWheelMoveIds: [move.id] });
  state = until(state, (game) => game.phase === "collecting_actions");
  assert.equal(state.players.find(({ id }) => id === attacker!.id)?.hp, 29);
  assert.equal(state.starWheelMoves?.length ?? 0, 0);
});

test("在变招阶段放出的一批招式可以再被普通逆转", () => {
  let state = fixture();
  const [owner, attacker, target, other] = state.players;
  state.players[3]!.skills.push(STAR_WHEEL_REVERSE);
  state = atChange(submit(state, [cake, { type: "attack", attackId: "sha", stacks: 1, targetId: target!.id }, cake]));
  state = windowSkill(state, owner!.id, STAR_WHEEL_REVERSE);
  state = windowSkill(state, owner!.id, STAR_WHEEL_RELEASE, { starWheelMoveIds: [state.starWheelMoves![0]!.id] });
  state = windowSkill(state, other!.id, STAR_WHEEL_REVERSE);
  state = until(state, (game) => game.phase === "collecting_actions");
  assert.equal(state.players.find(({ id }) => id === target!.id)?.hp, 29);
});

test("在回合前或回合末释放封存的攻击，极寒之拥正常反击且每份只判一次", () => {
  for (const timing of ["turn_before_action", "turn_end_action"] as const) {
    let state = fixture(true);
    const [owner, target] = state.players;
    assert.ok(owner && target);
    state = atChange(submit(state, [{ type: "attack", attackId: "sha", stacks: 1, targetId: target.id }]));
    state = windowSkill(state, owner.id, STAR_WHEEL_REVERSE);
    const [sealed] = state.starWheelMoves ?? [];
    assert.equal(sealed?.attacks[0]?.targetId, owner.id);
    state = until(state, (game) => game.activeTimingPhase === timing);
    state = windowSkill(state, owner.id, STAR_WHEEL_RELEASE, { starWheelMoveIds: [sealed!.id] });
    state = until(state, (game) => game.phase === "collecting_actions");

    assert.deepEqual(state.players.map(({ hp }) => hp), [29, 29, 29, 29], timing);
    const counterDamage = state.eventLog.filter((event) => event.type === "damage" &&
      event.sourceId === owner.id && event.attackName === "极寒之拥·冰伤反击");
    assert.equal(counterDamage.length, 3, timing);
    assert.equal(state.players[0]!.bigCards?.find(({ cardId }) => cardId === JIHAN_CARD_ID)?.jihanDamage, 3, timing);
  }
});

test("斗转在变伤时跳过免疫候选，将待结算伤害传给下一席", () => {
  let state = fixture();
  const [owner, attacker, accept, reject] = state.players;
  reject!.buffs.push({ id: "skip-redirect", name: "无视转伤", stacks: 1, ignoredEffectCategories: ["damage_redirection"] });
  state = until(submit(state, [cake, { type: "attack", attackId: "sha", stacks: 1, targetId: owner!.id }, cake]),
    (game) => game.activeTimingPhase === "turn_damage_modify");
  const damage = state.pendingDamageItems?.find(({ targetId }) => targetId === owner!.id);
  assert.ok(damage);
  state = windowSkill(state, owner!.id, STAR_WHEEL_REDIRECT, { targetDamageId: damage.id });
  state = until(state, (game) => game.phase === "collecting_actions");
  assert.equal(state.players.find(({ id }) => id === owner!.id)?.hp, 30);
  assert.equal(state.players.find(({ id }) => id === accept!.id)?.hp, 29);
  assert.equal(state.players.find(({ id }) => id === reject!.id)?.hp, 30);
});

test("收到的不良在变伤窗口前未挂上，斗转成功后保留到期时间", () => {
  let state = fixture();
  const [owner, attacker, , last] = state.players;
  applyFrozenStatus(state, owner!.id, 3, "turn", attacker!.id);
  assert.ok(!owner!.buffs.some(({ id }) => id === "frozen"));
  const effect = state.starWheelPendingStatuses?.[0];
  assert.ok(effect);
  assert.equal(toPublicGameState(state, owner!.id).starWheelPendingStatuses?.[0]?.id, effect.id);
  assert.equal(toPublicGameState(state, attacker!.id).starWheelPendingStatuses?.length, 0);
  state = until(submit(state, [small]), (game) => game.activeTimingPhase === "turn_damage_modify");
  state = windowSkill(state, owner!.id, STAR_WHEEL_REDIRECT, { starWheelStatusId: effect.id });
  state = until(state, (game) => game.phase === "collecting_actions");
  assert.equal(state.players.find(({ id }) => id === last!.id)?.buffs.find(({ id }) => id === "frozen")?.expiresAtTurn,
    effect.buffs[0]?.expiresAtTurn);
  assert.ok(!state.players.find(({ id }) => id === owner!.id)?.buffs.some(({ id }) => id === "frozen"));
});

test("选择开局原位只改变规则使用的座次", () => {
  let state = fixture();
  const [owner, , , last] = state.players;
  state.players.push(state.players.shift()!);
  state = windowSkill(state, owner!.id, STAR_WHEEL_POSITION, { starWheelUseOriginal: true });
  assert.equal(getCombatSeats(state)[0]?.id, owner!.id);
  assert.equal(getPhysicalCombatSeats(state)[2]?.id, last!.id);
  assert.equal(getPhysicalCombatSeats(state)[3]?.id, owner!.id);
});

test("所有候选均无视限定技时，原不良留下并按轮回互换生死", () => {
  let state = fixture();
  const [owner, attacker, reject, dead] = state.players;
  for (const player of [attacker!, reject!])
    player.buffs.push({ id: "no-limited", name: "无视限定技", stacks: 1, ignoredEffectCategories: ["limited_skill"] });
  dead!.status = "dead";
  dead!.defeatLevel = 1;
  dead!.hp = -1;
  applyFrozenStatus(state, owner!.id, 4, "turn", attacker!.id);
  const effect = state.starWheelPendingStatuses![0]!;
  const before = starWheelRemaining(owner!, STAR_WHEEL_REVERSE);
  for (const id of [owner!.id, attacker!.id, reject!.id]) state = submitPlayerAction(state, id, small).state;
  state = until(state, (game) => game.activeTimingPhase === "turn_damage_modify");
  state = windowSkill(state, owner!.id, STAR_WHEEL_REDIRECT, { starWheelStatusId: effect.id });
  assert.ok(!state.players.find(({ id }) => id === owner!.id)?.buffs.some(({ id }) => id === "frozen"));
  state = until(state, (game) => game.phase === "collecting_actions");
  assert.equal(state.players.find(({ id }) => id === dead!.id)?.hp, 30);
  assert.equal(state.players.find(({ id }) => id === attacker!.id)?.status, "dead");
  assert.equal(state.players.find(({ id }) => id === reject!.id)?.status, "dead");
  assert.ok(state.players.find(({ id }) => id === owner!.id)?.buffs.some(({ id }) => id === "frozen"));
  assert.equal(starWheelRemaining(state.players.find(({ id }) => id === owner!.id), STAR_WHEEL_REVERSE), before + 1);
});

test("璇空可后手支付各一次，终招从下一回合起逐回合重排，满八回合获胜", () => {
  let state = fixture();
  const owner = state.players[0]!;
  for (let n = 0; n < 8; n++) grantInitializedSkill(state, owner.id, getFusionSkillId("逆转星移"), "测试授予", false);
  const before = starWheelRemaining(owner, STAR_WHEEL_REVERSE);
  state = atChange(submit(state, []));
  state = windowSkill(state, owner.id, STAR_WHEEL_SHUFFLE);
  state = until(state, (game) => game.phase === "collecting_actions");
  assert.equal(starWheelRemaining(state.players.find(({ id }) => id === owner.id), STAR_WHEEL_REVERSE), before - 1);
  const startingShuffles = state.eventLog.filter((event) => event.type === "system" && event.message.includes("重新排列座位")).length;
  state = until(submit(state, state.players.map(({ id }) => id === owner.id ?
    { type: "skill", skillId: STAR_WHEEL_VICTORY, stacks: 1 } : cake)), (game) => game.phase === "collecting_actions");
  for (let n = 1; n < 8; n++) {
    state = until(submit(state, []), (game) => game.phase === "collecting_actions");
    assert.equal(state.players.find(({ id }) => id === owner.id)?.bars?.[0]?.value, n);
  }
  state = until(submit(state, []), (game) => game.phase === "finished");
  assert.deepEqual(state.winnerIds, [owner.id]);
  assert.equal(state.eventLog.filter((event) => event.type === "system" && event.message.includes("重新排列座位")).length, startingShuffles + 8);
});

test("回合末释放时读取当回合已经亮出的防御", () => {
  let state = fixture();
  const [owner, attacker, target] = state.players;
  state = atChange(submit(state, [cake, { type: "attack", attackId: "sha", stacks: 1, targetId: target!.id }, cake]));
  state = windowSkill(state, owner!.id, STAR_WHEEL_REVERSE);
  state = until(state, (game) => game.phase === "collecting_actions");
  const [move] = state.starWheelMoves!;
  state = until(submit(state, [cake, small]), (game) => game.activeTimingPhase === "turn_end_action");
  state = windowSkill(state, owner!.id, STAR_WHEEL_RELEASE, { starWheelMoveIds: [move!.id] });
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === attacker!.id && event.defense === "small"));
  assert.equal(state.players.find(({ id }) => id === attacker!.id)?.hp, 30);
});

test("回合外释放封存的御秽裁决，保留逆转后的双方并开放玩点", () => {
  let state = fixture();
  const [owner, originalCaster, originalTarget] = state.players;
  originalCaster!.bigCards = [{ cardId: "10508", instanceId: "verdict" }];
  state = atChange(submit(state, [cake, { type: "skill", skillId: VERDICT_ACTION_ID, stacks: 1, targetId: originalTarget!.id }, cake]));
  state = windowSkill(state, owner!.id, STAR_WHEEL_REVERSE);
  state = until(state, (game) => game.phase === "collecting_actions");
  const [move] = state.starWheelMoves!;
  state = windowSkill(state, owner!.id, STAR_WHEEL_RELEASE, { starWheelMoveIds: [move!.id] });
  const [pointGame] = state.verdictTurn!.games;
  assert.equal(pointGame!.sourceId, originalTarget!.id);
  assert.equal(pointGame!.targetId, originalCaster!.id);
  state = submitPointGameAction(state, originalTarget!.id, { kind: "move", gameId: pointGame!.id, round: 1, move: "rock" });
  state = submitPointGameAction(state, originalCaster!.id, { kind: "move", gameId: pointGame!.id, round: 1, move: "paper" });
  assert.ok(!state.starWheelPointResume);
  assert.ok(!state.verdictTurn?.games.some(({ winnerId }) => !winnerId));
});

test("印记可以被第二名持卡者斗回原持卡者，两人各消耗一次", () => {
  let state = fixture();
  const [first, source, skip, second] = state.players;
  second!.bigCards = [{ cardId: "10547", instanceId: "second-wheel", onlyAbilityId: "1054701" }];
  second!.skills.push(STAR_WHEEL_REDIRECT);
  for (const player of [source!, skip!])
    player.buffs.push({ id: "ignore-transfer", name: "无视转伤", stacks: 1, ignoredEffectCategories: ["damage_redirection"] });
  const firstUses = starWheelRemaining(first, STAR_WHEEL_REDIRECT);
  const secondUses = starWheelRemaining(second, STAR_WHEEL_REDIRECT);
  applyStarWheelIncomingMark(state, first!, source!.id, { id: "fixture_mark", name: "测试印记", stacks: 2 });
  state = until(submit(state, []), (game) => game.activeTimingPhase === "turn_damage_modify");
  state = windowSkill(state, first!.id, STAR_WHEEL_REDIRECT, { starWheelStatusId: state.starWheelPendingStatuses![0]!.id });
  assert.equal(state.starWheelPendingStatuses?.[0]?.targetId, second!.id);
  state = windowSkill(state, second!.id, STAR_WHEEL_REDIRECT, { starWheelStatusId: state.starWheelPendingStatuses![0]!.id });
  assert.equal(state.starWheelPendingStatuses?.[0]?.targetId, first!.id);
  state = until(state, (game) => game.phase === "collecting_actions");
  assert.equal(starWheelRemaining(state.players[0], STAR_WHEEL_REDIRECT), firstUses - 1);
  assert.equal(starWheelRemaining(state.players[3], STAR_WHEEL_REDIRECT), secondUses - 1);
  assert.equal(state.players[0]!.buffs.find(({ id }) => id === "fixture_mark")?.stacks, 2);
});

test("封存保留攻击已加成的数值，换人后不再叠新发出者的进攻加成", () => {
  let state = fixture();
  const [owner, originalCaster, originalTarget] = state.players;
  originalCaster!.skills.push("1033", "1032");
  state = atChange(submit(state, [cake, { type: "attack", attackId: "sha", stacks: 1, targetId: originalTarget!.id }, cake]));
  state = windowSkill(state, owner!.id, STAR_WHEEL_REVERSE);
  const [move] = state.starWheelMoves!;
  assert.equal(move!.attacks[0]?.stats.power, 2);
  state = until(state, (game) => game.phase === "collecting_actions");
  state.players.find(({ id }) => id === originalTarget!.id)!.skills.push("1033", "1032");
  state = windowSkill(state, owner!.id, STAR_WHEEL_RELEASE, { starWheelMoveIds: [move!.id] });
  state = until(state, (game) => game.phase === "collecting_actions");
  assert.equal(state.players.find(({ id }) => id === originalCaster!.id)?.hp, 28);
});

test("封存怒海狂涛只取当回合一段，后续照常自动发出", () => {
  let state = fixture();
  const [owner, originalCaster, originalTarget] = state.players;
  originalCaster!.bigCards = [{ cardId: "10509", instanceId: "waves" }];
  state = atChange(submit(state, [cake, { type: "skill", skillId: RAGING_WAVES_ID, stacks: 1, targetId: originalTarget!.id }, cake]));
  state = windowSkill(state, owner!.id, STAR_WHEEL_REVERSE);
  state = until(state, (game) => game.phase === "collecting_actions");
  assert.ok(state.starWheelMoves?.some(({ attacks }) => attacks.some(({ stats }) => stats.id === RAGING_WAVES_ID)));
  assert.equal(state.players.find(({ id }) => id === originalCaster!.id)?.hp, 30);
  assert.equal(state.players.find(({ id }) => id === originalTarget!.id)?.hp, 30);
  state = until(submit(state, []), (game) => game.phase === "collecting_actions");
  assert.equal(state.players.find(({ id }) => id === originalTarget!.id)?.hp, 21);
});
