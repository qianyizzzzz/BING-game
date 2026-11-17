import assert from "node:assert/strict";
import { test } from "node:test";
import { activeTotems, addPlayerToGame, advanceActionWindow, createGame, createPlayer, getCombatSeatNumbers,
  getTotemTargets, startGame, submitPlayerAction, TOTEM_CHOOSE_ID, TOTEM_CREATE_ID, TOTEM_KINDS, validateAction,
  CHAOS_ELEMENT, CHAOS_EXILE_ID, QIANQIU_CARD_ID, RAGING_WAVES_ID, THORN_DANCE_CARD_ID, THORN_DANCE_ID, UTOPIA_CARD_ID, UTOPIA_MOVE_ID,
  type GameState, type PlayerAction, type TotemKind } from "../packages/shared/src";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { INFINITY_VALUE } from "../packages/shared/src/engine/combatValues";
import { applyThornPoison } from "../packages/shared/src/engine/thornDance";
import { getOrdinaryDefenseTotal } from "../packages/shared/src/engine/starDragon";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const youtiao = { type: "defense", defense: "youtiao" } as const;

function drain(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && i < 100; i++) state = advanceActionWindow(state);
  assert.notEqual(state.phase, "action_window");
  return state;
}

function fixture(): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false, initialHp: 30 });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ cardId: "10546", instanceId: "totem-card" }];
  state = drain(startGame(state));
  for (const player of state.players) player.cakes = 10;
  return state;
}

function turn(state: GameState, ...moves: PlayerAction[]): GameState {
  for (const [i, player] of state.players.entries()) {
    if (player.status !== "alive") continue;
    const move = moves[i] ?? small;
    const validation = validateAction(state, player.id, move);
    assert.ok(validation.ok, JSON.stringify(validation));
    state = submitPlayerAction(state, player.id, move).state;
  }
  return drain(state);
}

function place(state: GameState, kind: TotemKind, playerIndex = 1): GameState {
  return turn(state, { type: "skill", skillId: TOTEM_CHOOSE_ID, stacks: 1,
    targetId: state.players[playerIndex]!.id, totemRange: "center", totemKind: kind });
}

test("图腾独立占用造物区，范围按主目标当前座次计算，单攻命中缩短寿命", () => {
  let state = fixture();
  const [owner, primary, neighbor, anchor] = state.players;
  const numbers = [...getCombatSeatNumbers(state)];
  const created = state.turnNumber;
  assert.equal(validateAction(state, owner!.id, { type: "skill", skillId: TOTEM_CREATE_ID, stacks: 1,
    targetId: primary!.id, totemRange: "right", totemKind: "sky" }).ok, false);
  state = turn(state, { type: "skill", skillId: TOTEM_CHOOSE_ID, stacks: 1, targetId: primary!.id,
    totemAfterId: anchor!.id, totemRange: "right", totemKind: "flame" });
  const totem = activeTotems(state)[0]!;
  assert.equal(totem.tableZoneAfterPlayerId, anchor!.id);
  assert.equal(totem.expiresAtTurn, created + 30);
  assert.deepEqual([...getCombatSeatNumbers(state)], numbers);
  assert.deepEqual(getTotemTargets(state, totem).map(({ id }) => id), [primary!.id, neighbor!.id]);
  assert.equal(state.roundNumber, 1);
  assert.equal(state.players[0]!.cakes, 5);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceId === totem.id && event.amount === 10));
  const main = state.players[1]!;
  main.spaceId = "private";
  assert.deepEqual(getTotemTargets(state, totem), []);
  main.spaceId = undefined;
  const hit = state.turnNumber;
  assert.equal(validateAction(state, owner!.id, { type: "attack", attackId: "wan_jian", stacks: 1, targetId: totem.id }).ok, false);
  state = turn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: totem.id });
  assert.equal(activeTotems(state)[0]!.expiresAtTurn, hit + 3);
});

test("已有共享中毒在剧毒范围内禁攻，毒伤来源是中毒者且属于法伤", () => {
  let state = fixture();
  state = place(state, "poison");
  const [owner, target] = state.players;
  applyThornPoison(state, owner!.id, target!.id, 2, 1);
  assert.equal(validateAction(state, target!.id, { type: "attack", attackId: "sha", stacks: 1, targetId: owner!.id }).ok, false);
  state = turn(state);
  const damage = state.eventLog.find((event) => event.type === "damage" && event.attackName === "中毒" && event.amount === 2);
  assert.ok(damage?.type === "damage");
  assert.equal(damage.sourceId, target!.id);
  assert.notEqual(damage.internalDamage, true);
});

test("图腾可作为非攻击招式的选定目标，不受伤、不获得状态或缩短寿命", () => {
  let state = place(fixture(), "frost");
  const [owner, user, opponent] = state.players;
  const totem = activeTotems(state)[0]!;
  user!.bigCards = [{ cardId: UTOPIA_CARD_ID, instanceId: "utopia" }, { cardId: "10521", instanceId: "chaos" }];
  changeElementAmount(user!, CHAOS_ELEMENT, 3);
  const exile = { type: "skill", skillId: CHAOS_EXILE_ID, stacks: 1, targetId: totem.id } as const;
  user!.spaceId = "other";
  assert.equal(validateAction(state, user!.id, exile).ok, false);
  user!.spaceId = undefined;
  state = turn(state, small, exile);
  assert.equal(state.roundNumber, 1);
  assert.equal(activeTotems(state)[0]!.expiresAtTurn, totem.expiresAtTurn);
  state = turn(state, small, { type: "skill", skillId: UTOPIA_MOVE_ID, stacks: 1,
    targetId: totem.id, targetIds: [totem.id, opponent!.id] });
  assert.ok(state.players.find(({ id }) => id === opponent!.id)?.spaceId);
  assert.ok(!state.players.some(({ id }) => id === totem.id));
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.targetId === totem.id));
  assert.equal(activeTotems(state)[0]!.expiresAtTurn, totem.expiresAtTurn);
  assert.equal(state.players.find(({ id }) => id === owner!.id)?.hp, 30);
});

test("反弹可将单体攻击转向图腾，图腾只缩短寿命", () => {
  let state = place(fixture(), "frost");
  const [, rebounder, attacker] = state.players;
  const totem = activeTotems(state)[0]!;
  const hit = state.turnNumber;
  state = turn(state, small, { type: "defense", defense: "rebound", targetId: totem.id },
    { type: "attack", attackId: "sha", stacks: 1, targetId: rebounder!.id });
  assert.equal(activeTotems(state)[0]!.expiresAtTurn, hit + 3);
  assert.ok(state.eventLog.some((event) => event.type === "attack_reflected" && event.sourceId === attacker!.id &&
    event.reflectedTargetId === totem.id));
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.targetId === totem.id));
});

test("有专用命中处理的单体技能攻击也能命中图腾", () => {
  for (const [cardId, skillId] of [[QIANQIU_CARD_ID, RAGING_WAVES_ID], [THORN_DANCE_CARD_ID, THORN_DANCE_ID]] as const) {
    let state = place(fixture(), "frost");
    state.players[1]!.bigCards = [{ cardId, instanceId: cardId }];
    const totem = activeTotems(state)[0]!;
    const hit = state.turnNumber;
    state = turn(state, small, { type: "skill", skillId, stacks: 1, targetId: totem.id });
    assert.equal(activeTotems(state)[0]!.expiresAtTurn, hit + 3);
    assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.targetId === totem.id));
  }
});

test("木灵被他人攻击致死时恢复至初始，普通禁复活不阻止且图腾保留", () => {
  let state = place(fixture(), "wood");
  const target = state.players[1]!;
  target.hp = 1;
  target.cakes = 3;
  target.buffs.push({ id: "no_revive", name: "无法复活", stacks: 1 });
  state = turn(state, { type: "attack", attackId: "sha", stacks: 2, targetId: target.id }, cake);
  assert.equal(state.players[1]!.hp, 30);
  assert.equal(state.players[1]!.cakes, 0);
  assert.equal(activeTotems(state)[0]?.kind, "wood");
});

test("地怒清空防御值并产生同量法伤，来源是图腾", () => {
  let state = fixture();
  state.players[1]!.buffs.push({ id: "defense_value", name: "防御值", stacks: 3 });
  state = place(state, "earth");
  const totem = activeTotems(state)[0]!;
  assert.deepEqual(getOrdinaryDefenseTotal(state.players[1]!), []);
  assert.equal(state.players[1]!.hp, 27);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceId === totem.id && event.amount === 3));
});

test("闪电第三回合只打一名目标，油条能挡；祭仪第十回合无等级且无法出招防住", () => {
  let state = place(fixture(), "lightning");
  state = turn(state);
  state = turn(state, small, youtiao);
  assert.equal(state.players[1]!.hp, 30);
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.sourceAbilityId === TOTEM_KINDS.lightning.id));
  let ritual = place(fixture(), "ritual");
  for (let i = 0; i < 9; i++) ritual = turn(ritual, small, i === 8 ?
    { type: "defense", defense: "rebound", targetId: ritual.players[0]!.id } : small);
  const attack = ritual.eventLog.find((event) => event.type === "damage" && event.attackName === "祭仪图腾");
  assert.ok(attack?.type === "damage" && attack.attackDamage);
  assert.deepEqual(attack.amountValue, INFINITY_VALUE);
  assert.equal(attack.sourceId, ritual.totems?.[0]?.id);
});

test("寒冰减半出饼，风暴为普通出招追加一次自动续发", () => {
  let frost = place(fixture(), "frost");
  const start = frost.players[1]!.cakes;
  frost = turn(frost, small, cake);
  assert.equal(frost.players[1]!.cakes, start + 0.5);
  let storm = place(fixture(), "storm");
  const before = storm.players[1]!.cakes;
  storm = turn(storm, small, cake);
  assert.ok(storm.players[1]!.buffs.some((buff) => buff.name === "风暴图腾" && buff.roarContinuation?.action.type === "gain_cake"));
  storm = turn(storm, small, small);
  assert.equal(storm.players[1]!.cakes, before + 2);
});

test("影月双向拦截低于无限的攻击，天空抵挡仍判命中", () => {
  let moon = place(fixture(), "moon");
  const [owner, target] = moon.players;
  moon = turn(moon, { type: "attack", attackId: "sha", stacks: 1, targetId: target!.id },
    { type: "attack", attackId: "sha", stacks: 1, targetId: owner!.id });
  assert.ok(!moon.eventLog.some((event) => event.type === "damage"));
  assert.equal(moon.eventLog.filter((event) => event.type === "attack_blocked" && event.protectionName === "影月图腾").length, 2);

  let sky = place(fixture(), "sky");
  sky = turn(sky, { type: "attack", attackId: "sha", stacks: 1, targetId: sky.players[1]!.id }, cake);
  assert.equal(sky.players[1]!.hp, 30);
  assert.ok(sky.eventLog.some((event) => event.type === "attack_blocked" && event.blockKind === "invulnerable" &&
    event.protectionName === "天空图腾"));
});

test("耀日的出招丢失与飞翼的目标回避使用各自判定", () => {
  for (const kind of ["sun", "wing"] as const) {
    let state = place(fixture(), kind, kind === "sun" ? 0 : 1);
    const [owner, target] = state.players;
    const totem = activeTotems(state)[0]!;
    const key = [totem.id, state.turnNumber, owner!.id, 0, ...(kind === "wing" ? [target!.id] : [])].join(":");
    state.totemMoveRolls = { turnNumber: state.turnNumber, results: { [key]: true } };
    state = turn(state, { type: "attack", attackId: "sha", stacks: 1, targetId: target!.id }, cake);
    assert.equal(state.players[1]!.hp, 30);
    assert.ok(kind === "sun" ? state.eventLog.some((event) => event.type === "system" && event.message.includes("耀日图腾影响丢失目标")) :
      state.eventLog.some((event) => event.type === "attack_blocked" && event.blockKind === "dodge" && event.protectionName === "飞翼图腾"));
  }
});
