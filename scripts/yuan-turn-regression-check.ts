import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getSkillPlay, startGame,
  STAR_WHEEL_RELEASE, STAR_WHEEL_REVERSE, submitActionWindowSkill, submitPlayerAction,
  type GameState, type PlayerAction
} from "../packages/shared/src";
import { YUAN_CARD_ID, YUAN_ORIGIN_ID, YUAN_RESTART_ID, YUAN_RETURN_ID, YUAN_VOID_ID } from "../packages/shared/src/engine/yuanIds";
import { HONGHUANG_CARD_ID, QIANQIU_CARD_ID, RAGING_WAVES_ID, TIME_REWIND_ID, VERDICT_ACTION_ID } from "../packages/shared/src/bigCards/abilities";
import { canAffectAcrossSpace } from "../packages/shared/src/engine/spaces";
import { getStatusOverview } from "../packages/shared/src/engine/statusOverview";
import { WIND_TRACE } from "../packages/shared/src/engine/ultimateWind";

const cake = { type: "gain_cake" } as const;
const move = (skillId: string): PlayerAction => ({ type: "skill", skillId, stacks: 1 });
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", stacks: 1, targetId });

function withLowRoll<T>(run: () => T): T {
  const random = Math.random;
  let rolls = 0;
  Math.random = () => (++rolls % 1000) * 1e-8;
  try { return run(); } finally { Math.random = random; }
}

function drain(state: GameState, stopAtOpening = false): GameState {
  for (let n = 0; n < 60 && state.phase === "action_window"; n++) {
    if (stopAtOpening && state.activeTimingPhase === "opening_action") return state;
    state = advanceActionWindow(state);
  }
  assert.notEqual(state.phase, "action_window");
  return state;
}

function game(hands: string[][] = [[YUAN_CARD_ID], [], []]): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, firstTurnNoAttack: false, allowDuplicateBigCards: true });
  for (const name of ["乙", "丙"]) state = addPlayerToGame(state, createPlayer(name));
  state.players.forEach((player, i) => { player.bigCards = (hands[i] ?? []).map((cardId, j) => ({ cardId, instanceId: `${i}:${j}` })); });
  return drain(startGame(state));
}

function submit(state: GameState, ...actions: PlayerAction[]): GameState {
  for (const [index, { id }] of state.players.entries()) {
    if (state.phase !== "collecting_actions" || state.pendingActions[id]) continue;
    state = submitPlayerAction(state, id, actions[index] ?? cake).state;
  }
  return state;
}

function markWindTrace(state: GameState, sourceId: string, targetId: string): void {
  const target = state.players.find(({ id }) => id === targetId)!;
  target.buffs.push({ id: `${WIND_TRACE}:${sourceId}`, name: "风踪", stateType: WIND_TRACE, sourcePlayerId: sourceId, stacks: 1 });
}

test("元的四项技能都占主出招且无需选人", () => {
  for (const [id, cost] of [[YUAN_RETURN_ID, 3], [YUAN_VOID_ID, 5], [YUAN_ORIGIN_ID, 6], [YUAN_RESTART_ID, 8]] as const) {
    const play = getSkillPlay(id);
    assert.equal(play?.cost, cost);
    assert.equal(play?.targetMode, "none");
  }
});

test("归元在变招结束后抽中一份杀使其无效，保留其费用并挡住另一个杀", () => {
  let state = game();
  const [source, first, second] = state.players;
  source!.cakes = 3;
  first!.cakes = second!.cakes = 1;
  state = submit(state, move(YUAN_RETURN_ID), sha(source!.id), sha(source!.id));
  assert.equal(state.activeTimingPhase, "turn_change_action");
  assert.equal(state.turnMoveSuppression?.invalidated[first!.id]?.length ?? 0, 0);
  state = withLowRoll(() => drain(state));
  assert.equal(state.players[0]!.hp, 18);
  assert.equal(state.players[1]!.cakes, 0);
  assert.equal(state.players[2]!.cakes, 0);
  assert.ok(state.eventLog.some((event) => event.type === "system" && event.message.includes("归元使 乙 的 杀")));
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.sourceId === second!.id &&
    event.protectionName === "归元·无敌"));
});

test("归元选中出饼时仅收回被选中的收益", () => {
  let state = game();
  state.players[0]!.cakes = 3;
  state = submit(state, move(YUAN_RETURN_ID), cake, cake);
  assert.equal(state.players[1]!.cakes, 1);
  state = withLowRoll(() => drain(state));
  assert.deepEqual(state.players.map(({ cakes }) => cakes), [0, 0, 1]);
});

test("归元只取消同一玩家的一个出招槽，其他出招照常结算", () => {
  let state = game();
  const [source, target, other] = state.players;
  source!.cakes = 3;
  target!.cakes = 1;
  state.pendingActions[target!.id] = { actions: [cake, sha(other!.id)] };
  state = submit(state, move(YUAN_RETURN_ID));
  state = withLowRoll(() => drain(state));
  assert.equal(state.players[1]!.cakes, 0);
  assert.equal(state.players[2]!.hp, 17);
});

test("虚元回避单体攻击，群攻照常结算，异空间排除自己并维持五轮", () => {
  let state = game();
  const [source, first, second] = state.players;
  source!.cakes = 5;
  first!.cakes = 1;
  second!.cakes = 2;
  state = submit(state, move(YUAN_VOID_ID), sha(source!.id), { type: "attack", attackId: "wan_jian", stacks: 1 });
  state = withLowRoll(() => drain(state));
  assert.equal(state.players[0]!.hp, 16);
  assert.equal(state.players[0]!.spaceId, undefined);
  assert.ok(state.players[1]!.spaceId);
  const space = state.smallSpaces?.[state.players[1]!.spaceId!];
  assert.equal(space?.kind, "yuan_void");
  assert.equal(space?.expiresAtRound, 6);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.sourceId === first!.id &&
    event.blockKind === "dodge" && event.protectionName === "虚元"));
});

test("虚元内自动空过，允许阶段技能，返回主空间后恢复出招", () => {
  let state = game();
  const [source, target, other] = state.players;
  source!.cakes = 5;
  appendSkillInstances(target!, ["1012"]);
  state = withLowRoll(() => {
    let pending = submit(state, move(YUAN_VOID_ID));
    for (let n = 0; n < 60 && pending.phase === "action_window" && pending.activeTimingPhase !== "turn_end_action"; n++) {
      pending = advanceActionWindow(pending);
    }
    return pending;
  });
  assert.equal(state.activeTimingPhase, "turn_end_action");
  assert.ok(state.players[1]!.spaceId);
  assert.ok(getStatusOverview(state, state.players[1]!).space.some(({ value }) => value.includes("不能出招")));
  state = submitActionWindowSkill(state, target!.id, { type: "skill", skillId: "1012", stacks: 1 });
  state = drain(state);
  assert.deepEqual(state.pendingActions[target!.id]?.actions, []);
  assert.throws(() => submitPlayerAction(state, target!.id, cake), /虚元异空间内不能出招/);
  assert.throws(() => submitPlayerAction(state, target!.id, { type: "defense", defense: "self_destruct" }), /虚元异空间内不能出招/);

  state.players[1]!.buffs.push({ id: "test-delayed-cake", name: "延迟出饼", stacks: 1,
    sandDelayedMove: { action: cake, dueTurn: state.turnNumber } });
  state = drain(submit(state));
  assert.equal(state.players[1]!.cakes, 1);
  assert.ok(!state.players[1]!.buffs.some(({ id }) => id === "test-delayed-cake"));

  for (let round = 1; round < 6; round++) {
    state.players[0]!.cakes = 1;
    state = drain(submit(state, sha(other!.id)));
    assert.equal(state.roundNumber, round + 1);
  }
  assert.equal(state.players[1]!.spaceId, undefined);
  assert.deepEqual(submitPlayerAction(state, target!.id, cake).state.pendingActions[target!.id], { actions: [cake] });
});

test("怒海狂涛进虚元前的第一段正常命中，进虚元后即使有风踪也不能续发", () => {
  let state = game([[YUAN_CARD_ID], [QIANQIU_CARD_ID], []]);
  const [yuan, caster, target] = state.players;
  yuan!.cakes = 5;
  caster!.cakes = 2;
  state = withLowRoll(() => drain(submit(state, move(YUAN_VOID_ID), {
    type: "skill", skillId: RAGING_WAVES_ID, stacks: 1, targetId: target!.id
  })));
  assert.equal(state.smallSpaces?.[state.players[1]!.spaceId ?? ""]?.kind, "yuan_void");
  assert.equal(state.players[2]!.hp, 9);
  assert.ok(state.players[1]!.buffs.some(({ waveAttack }) => waveAttack?.skillId === RAGING_WAVES_ID));
  markWindTrace(state, caster!.id, target!.id);
  assert.ok(canAffectAcrossSpace(state, caster!.id, target!.id));

  state = drain(submit(state));
  assert.equal(state.phase, "collecting_actions");
  assert.equal(state.players[2]!.hp, 9);
});

test("收招期间时溯进出虚元，立即更新自动空过和提交资格", () => {
  let state = game([[YUAN_CARD_ID], [HONGHUANG_CARD_ID], [HONGHUANG_CARD_ID]]);
  const [yuan, target, honghuang] = state.players;
  yuan!.cakes = 5;
  state = withLowRoll(() => drain(submit(state, move(YUAN_VOID_ID))));
  assert.ok(state.players[1]!.spaceId);

  for (let round = 1; round <= 2; round++) {
    state.players[0]!.cakes = 1;
    state = drain(submit(state, sha(honghuang!.id)));
    assert.equal(state.roundNumber, round + 1);
  }
  const rewindTarget = { type: "skill", skillId: TIME_REWIND_ID, stacks: 1, targetId: target!.id } as const;
  state = submitActionWindowSkill(state, target!.id, rewindTarget);
  assert.equal(state.players[1]!.spaceId, undefined);
  assert.equal(state.pendingActions[target!.id], undefined);

  state.players[0]!.cakes = 1;
  state = drain(submit(state, sha(honghuang!.id)));
  assert.equal(state.roundNumber, 4);
  state = submitPlayerAction(state, yuan!.id, cake).state;
  state = submitPlayerAction(state, honghuang!.id, cake).state;
  assert.equal(state.phase, "collecting_actions");

  const turn = state.turnNumber;
  state = submitActionWindowSkill(state, honghuang!.id, rewindTarget);
  state = drain(state);
  assert.ok(state.turnNumber > turn);
  assert.equal(state.smallSpaces?.[state.players[1]!.spaceId ?? ""]?.kind, "yuan_void");
  assert.deepEqual(state.pendingActions[target!.id]?.actions, []);
});

test("普通逆转无法让虚元内的玩家成为跨空间出招的发出者", () => {
  let state = game();
  const [yuan, target, attacker] = state.players;
  yuan!.cakes = 5;
  appendSkillInstances(yuan!, ["1092"]);
  state = withLowRoll(() => drain(submit(state, move(YUAN_VOID_ID))));
  assert.equal(state.smallSpaces?.[state.players[1]!.spaceId ?? ""]?.kind, "yuan_void");
  markWindTrace(state, attacker!.id, target!.id);
  markWindTrace(state, target!.id, attacker!.id);
  assert.ok(canAffectAcrossSpace(state, attacker!.id, target!.id));
  assert.ok(canAffectAcrossSpace(state, target!.id, attacker!.id));

  const revealed = submit(state, cake, cake, sha(target!.id));
  const normal = drain(revealed);
  assert.ok(normal.players[1]!.hp < 18);
  state = drain(submitActionWindowSkill(revealed, yuan!.id, { type: "skill", skillId: "1092", stacks: 1 }));
  assert.equal(state.phase, "collecting_actions");
  assert.deepEqual(state.players.map(({ hp }) => hp), [18, 18, 18]);
});

test("封存招式的发出者进入虚元后，跨空间释放也不能造成伤害或启动玩点", () => {
  for (const sealVerdict of [false, true]) {
    let state = game([[YUAN_CARD_ID, "10547"], [], ["10508"]]);
    const [keeper, target, attacker] = state.players;
    keeper!.cakes = 5;
    attacker!.cakes = 3;
    const attack = sealVerdict
      ? { type: "skill", skillId: VERDICT_ACTION_ID, stacks: 1, targetId: target!.id } as const
      : sha(target!.id);
    state = submit(state, cake, cake, attack);
    state = drain(submitActionWindowSkill(state, keeper!.id, { type: "skill", skillId: STAR_WHEEL_REVERSE, stacks: 1 }));
    const sealed = state.starWheelMoves?.[0];
    assert.ok(sealed);
    assert.equal((sealVerdict ? sealed.effects[0] : sealed.attacks[0])?.sourceId, target!.id);

    state = withLowRoll(() => drain(submit(state, move(YUAN_VOID_ID))));
    assert.equal(state.smallSpaces?.[state.players[1]!.spaceId ?? ""]?.kind, "yuan_void");
    markWindTrace(state, target!.id, attacker!.id);
    assert.ok(canAffectAcrossSpace(state, target!.id, attacker!.id));
    state = drain(submitActionWindowSkill(state, keeper!.id, {
      type: "skill", skillId: STAR_WHEEL_RELEASE, stacks: 1, starWheelMoveIds: [sealed.id]
    }));
    assert.equal(state.phase, "collecting_actions");
    assert.equal(state.players[2]!.hp, 18);
    assert.ok(!state.verdictTurn?.games.some(({ targetId }) => targetId === attacker!.id));
    assert.ok(!state.starWheelMoves?.some(({ id }) => id === sealed.id));
  }
});

test("虚元能回避明确指向施术者的御秽裁决，跳过玩点", () => {
  let state = game([[YUAN_CARD_ID], ["10508"], []]);
  const [source, opponent] = state.players;
  source!.cakes = 5;
  opponent!.cakes = 3;
  state = submit(state, move(YUAN_VOID_ID), { type: "skill", skillId: VERDICT_ACTION_ID, stacks: 1, targetId: source!.id });
  state = withLowRoll(() => drain(state));
  assert.equal(state.verdictTurn, undefined);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.sourceId === opponent!.id &&
    event.attackName === "御秽裁决" && event.blockKind === "dodge" && event.protectionName === "虚元"));
});

test("初元的随机目标先消失整张大卡再按快照恢复，自身被选中时也恢复", () => {
  let state = game([[YUAN_CARD_ID], ["10536"], []]);
  const [source, first, second] = state.players;
  source!.cakes = 6;
  source!.hp = 3;
  first!.hp = 5;
  second!.cakes = 1;
  const initialCard = first!.bigCards?.[0];
  state = submit(state, move(YUAN_ORIGIN_ID), cake, sha(source!.id));
  state = withLowRoll(() => drain(state));
  assert.equal(state.players[0]!.hp, 17);
  assert.equal(state.players[1]!.hp, 18);
  assert.equal(state.players[1]!.bigCards?.[0]?.instanceId, initialCard?.instanceId);
  const disappearance = state.eventLog.findIndex((event) => event.type === "system" && event.removalKind === "disappear");
  const restoration = state.eventLog.findIndex((event) => event.type === "system" && event.message === "乙 因初元恢复至初始");
  assert.ok(disappearance >= 0 && restoration > disappearance);
});

test("虚元的随机目标也能触发初元自我恢复，仍在当前伤害结算后转入异空间", () => {
  let state = game([[YUAN_CARD_ID], [YUAN_CARD_ID], []]);
  state.players[0]!.hp = 3;
  state.players[0]!.cakes = 6;
  state.players[1]!.cakes = 5;
  state = submit(state, move(YUAN_ORIGIN_ID), move(YUAN_VOID_ID));
  state = withLowRoll(() => drain(state));
  assert.equal(state.players[0]!.hp, 18);
  assert.equal(state.smallSpaces?.[state.players[0]!.spaceId ?? ""]?.kind, "yuan_void");
});

test("太虚之初确认有效就回到开局并跳过剩余攻击，归元使其无效时无法重开", () => {
  let state = game();
  const [source, target] = state.players;
  const previousRoom = state.id;
  source!.cakes = 8;
  target!.cakes = 1;
  const start = state.eventLog.length;
  state = submit(state, move(YUAN_RESTART_ID), sha(source!.id));
  state = withLowRoll(() => drain(state, true));
  assert.equal(state.activeTimingPhase, "opening_action");
  assert.equal(state.id, previousRoom);
  assert.equal(state.players[0]!.bigCards?.[0]?.cardId, YUAN_CARD_ID);
  assert.equal(state.eventLog.slice(start).some((event) => event.type === "damage"), false);

  let canceled = game([[YUAN_CARD_ID], [YUAN_CARD_ID], []]);
  canceled.players[0]!.cakes = 3;
  canceled.players[1]!.cakes = 8;
  canceled = submit(canceled, move(YUAN_RETURN_ID), move(YUAN_RESTART_ID));
  canceled = withLowRoll(() => drain(canceled, true));
  assert.notEqual(canceled.activeTimingPhase, "opening_action");
  assert.equal(canceled.players[1]!.cakes, 0);
});
