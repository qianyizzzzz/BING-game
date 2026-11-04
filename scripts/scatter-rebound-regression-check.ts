import assert from "node:assert/strict";
import {
  GameState, PlayerAction, SkillAction, createGame, createPlayer, addPlayerToGame, startGame,
  advanceActionWindow, submitPlayerAction, submitActionWindowSkill, getAllSkills, getFusionSkillId,
  COMMON_FUSION_SKILL_ID, createId, INFINITE_DAMAGE, applyHealthAmounts
} from "@bing/shared";

const skill = (name: string) => {
  const entry = getAllSkills().find((item) => item.name === name);
  assert.ok(entry, name); return entry.id;
};
const gain: PlayerAction = { type: "gain_cake" };
const cast = (name: string, extra: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId: skill(name), stacks: 1, ...extra });
function fixture(skills: string[][] = [[], ["散弹"], ["散弹"], []]): GameState {
  let state = createGame("A", { firstTurnNoAttack: false, skillMode: "test_select", skillCount: Math.max(2, ...skills.map((list) => list.length)) });
  for (const name of ["B", "C", "D"]) state = addPlayerToGame(state, createPlayer(name));
  state.players.forEach((player, index) => { player.skills = skills[index]!.map(skill); });
  state = startGame(state);
  for (const player of state.players) { player.hp = 40; player.cakes = 40; }
  return state;
}
function fuse(state: GameState, index: number, name: string): GameState {
  return submitPlayerAction(state, state.players[index]!.id, { type: "skill", skillId: COMMON_FUSION_SKILL_ID,
    stacks: 1, targetSkillId: getFusionSkillId(name), fusionRequestId: createId("fusion") }).state;
}
function collecting(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && i < 40; i++) state = advanceActionWindow(state);
  assert.equal(state.phase, "collecting_actions"); return state;
}
function reveal(state: GameState, actions: PlayerAction[]): GameState {
  state = collecting(state);
  for (let index = 0; index < 4; index++) state = submitPlayerAction(state, state.players[index]!.id, actions[index]!).state;
  assert.equal(state.activeTimingPhase, "turn_change_action"); return state;
}
function end(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== "turn_end_action" && i < 40; i++) state = advanceActionWindow(state);
  assert.ok(state.phase === "finished" || state.activeTimingPhase === "turn_end_action"); return state;
}
const rebound = (state: GameState, target: number): PlayerAction => ({ type: "defense", defense: "rebound", targetId: state.players[target]!.id });
const sha = (state: GameState, target = 1): PlayerAction => ({ type: "attack", attackId: "sha", stacks: 1, targetId: state.players[target]!.id });
const small: PlayerAction = { type: "defense", defense: "small" };
function infiniteTurn(state: GameState, defense: PlayerAction = gain): GameState {
  return end(reveal(state, [sha(state), rebound(state, 2), rebound(state, 1), defense]));
}
const charges = (state: GameState, index: number, id: string) => state.players[index]!.buffs.find((buff) => buff.id === id)?.stacks ?? 0;
const damageTo = (state: GameState, index: number) => state.eventLog.filter((event) => event.type === "damage" && event.targetId === state.players[index]!.id);
let passed = 0;
const failures: string[] = [];
function check(name: string, run: () => void): void {
  try { run(); passed++; console.log(`ok - ${name}`); }
  catch (error) { failures.push(name); console.error(`not ok - ${name}\n${error instanceof Error ? error.stack : error}`); }
}

for (const name of ["撸", "连爆", "冰箭雨"]) for (const kind of ["direct", "rebound", "scatter", "ball"] as const) {
  check(`${name}: ${kind} redirected hits grant rewards to the original source`, () => {
    let state = fixture([[name], kind === "direct" ? [] : ["绝弹", ...(["scatter", "ball"].includes(kind) ? ["散弹"] : [])], [], []]);
    if (kind === "ball") state = fuse(state, 1, "弹力球");
    const attack = name === "冰箭雨" ? { type: "attack", attackId: "wan_jian", stacks: 1 } as PlayerAction : cast(name, { targetId: state.players[1]!.id });
    state = end(reveal(state, [attack, kind === "direct" ? gain : rebound(state, name === "冰箭雨" ? 0 : 2), gain, gain]));
    const id = name === "冰箭雨" ? `ice_rain:${state.players[0]!.id}` : name === "撸" ? "lu_growth" : "free_lian_bao";
    const spread = kind === "scatter" || kind === "ball";
    assert.equal(charges(state, 0, id), name === "冰箭雨" ? kind === "direct" ? 0 : 1 : spread ? 3 : 1);
    if (name === "冰箭雨") {
      assert.equal(charges(state, 2, `ice_rain:${state.players[0]!.id}`), spread ? 2 : 1);
      assert.equal(charges(state, 3, `ice_rain:${state.players[0]!.id}`), spread ? 2 : 1);
    }
    if (kind !== "direct" && name !== "冰箭雨") assert.ok(damageTo(state, 2).length > 0);
  });
}

check("ordinary chains reach the first scatter and scatter copies continue along ordinary rebounds", () => {
  let state = fixture([[], [], ["散弹"], []]);
  state = end(reveal(state, [sha(state), rebound(state, 2), rebound(state, 3), gain]));
  // B points to C, so C's scatter loops via B.
  assert.ok(damageTo(state, 0).some((event) => event.type === "damage" && event.infiniteCopies));
  assert.ok(damageTo(state, 3).some((event) => event.type === "damage" && event.sourceId === state.players[0]!.id && event.infiniteCopies));
});
check("one scatter with no return fires one copy; downstream normal rebound adds a second hit", () => {
  let state = fixture([[], ["散弹"], [], []]);
  state = end(reveal(state, [sha(state), rebound(state, 0), rebound(state, 3), gain]));
  assert.deepEqual(state.players.map((player) => player.hp), [39, 40, 40, 38]);
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.infiniteCopies));
});
check("ordinary-only cycles terminate without scatter", () => {
  let state = fixture([[], [], [], []]);
  state = end(reveal(state, [sha(state), rebound(state, 2), rebound(state, 1), gain]));
  assert.ok(state.players.every((player) => player.hp === 40));
  assert.ok(state.eventLog.length < 100);
});
check("two scatter users emit separate infinite families retaining the original attacker", () => {
  const state = infiniteTurn(fixture());
  for (const index of [0, 3]) {
    const damage = damageTo(state, index);
    assert.equal(damage.length, 2);
    assert.deepEqual(new Set(damage.map((event) => event.type === "damage" && event.sourceId)), new Set([state.players[0]!.id]));
    assert.ok(damage.every((event) => event.type === "damage" && event.reflected && event.infiniteCopies && event.perCopyAmount === 1));
  }
  assert.equal(state.players[1]!.hp, 40); assert.equal(state.players[2]!.hp, 40);
  assert.ok(state.eventLog.length < 100);
});
check("a scatter holder who chose gain does not join the loop", () => {
  let state = fixture();
  state = end(reveal(state, [sha(state), rebound(state, 0), gain, gain]));
  assert.deepEqual(state.players.map((player) => player.hp), [39, 40, 39, 39]);
  assert.equal(damageTo(state, 2).length, 1);
});
check("sealed scatter becomes an ordinary reflector and cannot create a second scatter", () => {
  let state = fixture();
  state.players[2]!.buffs.push({ id: `sealed_skill:${skill("散弹")}`, name: "封印", stacks: 1 });
  state = end(reveal(state, [sha(state), rebound(state, 0), rebound(state, 3), gain]));
  assert.deepEqual(state.players.map((player) => player.hp), [39, 40, 40, 38]);
});
check("an incompatible second scatter does not reflect inherently piercing attacks", () => {
  let state = fixture([["连爆"], ["散弹", "绝弹"], ["散弹"], []]);
  state = end(reveal(state, [cast("连爆", { targetId: state.players[1]!.id }), rebound(state, 0), rebound(state, 1), gain]));
  assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.infiniteCopies));
  assert.equal(state.players[2]!.hp, 40);
});

for (const defense of ["small", "八卦阵", "藤甲", "invulnerable", "辉月", "闪电护体", "gold", "defense_pool", "绝对值"]) {
  check(`infinite copies respect ${defense} per copy`, () => {
    let state = fixture([[], ["散弹"], ["散弹"], ["八卦阵", "藤甲", "闪电护体", "绝对值"].includes(defense) ? [defense] : []]);
    const d = state.players[3]!;
    if (defense === "invulnerable") d.buffs.push({ id: "temp_invulnerable", name: "无敌", stacks: 1 });
    if (defense === "gold") for (const index of [0]) d.buffs.push({ id: "jin_zhong_zhao", name: "金钟罩", stacks: 2, sourcePlayerId: state.players[index]!.id });
    if (defense === "defense_pool") d.buffs.push({ id: "defense_value", name: "防御值", stacks: 100 });
    state = reveal(state, [sha(state), rebound(state, 2), rebound(state, 1), defense === "small" ? small : gain]);
    if (defense === "辉月") state.players[3]!.buffs.push({ id: "huiyue_stasis", name: "辉月", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
    state = end(state);
    const target = state.players[3]!;
    if (["small", "八卦阵", "藤甲", "invulnerable", "辉月"].includes(defense)) assert.equal(target.hp, 40);
    else if (defense === "闪电护体") { assert.equal(target.hp, 39); assert.equal(damageTo(state, 3).length, 1); }
    else if (defense === "绝对值") { assert.equal(target.hp, INFINITE_DAMAGE); assert.equal(target.hpIsInfinite, true); assert.equal(target.status, "alive"); }
    else { assert.equal(target.status, "dead"); assert.equal(target.hpIsInfinite, true); }
    if (defense === "gold") assert.ok(!target.buffs.some((buff) => buff.id === "jin_zhong_zhao"));
    if (defense === "defense_pool") assert.ok(!target.buffs.some((buff) => buff.id === "defense_value"));
  });
}
check("gold shields against other sources remain intact and settlement terminates", () => {
  let state = fixture();
  state.players[3]!.buffs.push({ id: "jin_zhong_zhao", name: "金钟罩", stacks: 1, sourcePlayerId: state.players[1]!.id });
  state = infiniteTurn(state);
  assert.equal(charges(state, 3, "jin_zhong_zhao"), 1);
});
check("small defense generates infinite ghost charges and spending charges keeps infinity", () => {
  let state = fixture([["绝对值"], ["散弹"], ["散弹"], ["鬼道"]]);
  state = infiniteTurn(state, small);
  assert.equal(state.players[3]!.buffs.find((buff) => buff.id === "guidao_charge")?.infinite, true);
  state = end(reveal(state, [gain, gain, gain, cast("鬼道", { targetId: state.players[1]!.id })]));
  assert.equal(state.players[3]!.buffs.find((buff) => buff.id === "guidao_charge")?.infinite, true);
  assert.equal(charges(state, 3, "guidao_charge"), INFINITE_DAMAGE);
});
check("electric thunder keeps one copy and earns infinite ghost charges", () => {
  let state = fixture([[], ["散弹"], ["散弹"], ["鬼道", "闪电护体"]]);
  state = fuse(state, 3, "电闪雷鸣");
  state = infiniteTurn(state);
  assert.equal(state.players[3]!.hp, 39);
  assert.equal(state.players[3]!.buffs.find((buff) => buff.id === "guidao_charge")?.infinite, true);
});
check("already infinite HP remains infinite after another infinite-damage turn", () => {
  let state = infiniteTurn(fixture([["绝对值"], ["散弹"], ["散弹"], ["绝对值"]]));
  state = collecting(state);
  for (const player of state.players) player.cakes = 40;
  state = infiniteTurn(state);
  assert.equal(state.players[0]!.hpIsInfinite, true); assert.equal(state.players[0]!.status, "alive");
  assert.equal(state.players[3]!.hpIsInfinite, true); assert.equal(state.players[3]!.status, "alive");
  assert.equal(state.players[3]!.hp, INFINITE_DAMAGE);
  JSON.stringify(state, (_key, value) => { if (typeof value === "number") assert.ok(Number.isFinite(value)); return value; });
  assert.equal(JSON.parse(JSON.stringify(state)).players[3].hpIsInfinite, true);
});
check("infinite bloodthirst rounds each original-source copy before multiplying", () => {
  let state = fixture([["绝对值", "嗜血"], ["散弹", "嗜血"], ["散弹"], []]);
  state.players[1]!.hp = 20;
  state = infiniteTurn(state);
  assert.ok(!state.eventLog.some((e) => e.type === "heal" && e.reason === "嗜血"));
  assert.equal(state.players[1]!.hp, 20);
});
check("infinite four-damage copies grant healing only to their original source", () => {
  let state = fixture([["绝对值", "酒", "酒", "酒", "嗜血"], ["散弹", "嗜血"], ["散弹"], []]);
  state.players[1]!.hp = 20;
  state = infiniteTurn(state);
  assert.equal(state.players[0]!.hpIsInfinite, true);
  assert.ok(state.eventLog.some((e) => e.type === "heal" && e.targetId === state.players[0]!.id && e.infinite));
  assert.equal(state.players[1]!.hp, 20); assert.ok(!state.players[1]!.hpIsInfinite);
});
check("reflected attacks do not advance revenge or hundred trials for reflectors", () => {
  let state = fixture([["百炼成神", "复仇之刃"], ["散弹", "百炼成神", "复仇之刃"], ["散弹", "百炼成神", "复仇之刃"], []]);
  for (const index of [0, 1, 2]) {
    state.players[index]!.hp = 2;
    state.players[index]!.buffs.push({ id: `revenge_target:${state.players[3]!.id}`, name: "复仇目标", stacks: 1 });
  }
  state = infiniteTurn(state);
  assert.equal(charges(state, 0, "bailian_attack_count"), 1);
  for (const index of [1, 2]) { assert.equal(charges(state, index, "bailian_attack_count"), 0); assert.equal(charges(state, index, "revenge_hit_count"), 0); }
});
check("redirected frost blade retains its zero damage and skill-disable effect", () => {
  let state = fixture([["寒冰剑"], [], [], []]);
  state = reveal(state, [sha(state), rebound(state, 2), gain, gain]);
  state = submitActionWindowSkill(state, state.players[0]!.id, cast("寒冰剑"));
  state = end(state);
  assert.equal(state.players[2]!.hp, 40);
  assert.ok(state.players[2]!.buffs.some((buff) => buff.id.startsWith("skill_disabled_until_round:")));
});
check("a single damage modifier splits one copy from an infinite family", () => {
  let state = fixture([["绝对值"], ["散弹"], ["散弹"], ["十字守护"]]);
  state.players[3]!.buffs.push({ id: "huyou_mark", name: "护佑", stacks: 2 });
  state = reveal(state, [sha(state), rebound(state, 2), rebound(state, 1), gain]);
  for (let i = 0; state.activeTimingPhase !== "turn_damage_modify" && i < 15; i++) state = advanceActionWindow(state);
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  const item = state.pendingDamageItems!.find((item) => item.targetId === state.players[3]!.id)!;
  assert.equal(item.infiniteCopies, true);
  state = submitActionWindowSkill(state, state.players[3]!.id, cast("十字守护", { targetDamageId: item.id }));
  assert.equal(state.pendingDamageItems!.find((entry) => entry.id === item.id)?.amount, 1);
  assert.equal(state.pendingDamageItems!.find((entry) => entry.id === item.id)?.infiniteCopies, true);
  assert.ok(state.pendingDamageItems!.some((entry) => entry.targetId === item.targetId && entry.amount === 0 && !entry.infiniteCopies));
  state = end(state); assert.equal(state.players[3]!.status, "dead");
});
check("reversal can still reach a scatter on the reversed target", () => {
  let state = fixture([["散弹"], [], [], ["逆转"]]);
  state = reveal(state, [sha(state), rebound(state, 0), gain, gain]);
  state = submitActionWindowSkill(state, state.players[3]!.id, cast("逆转"));
  state = end(state);
  assert.ok(state.eventLog.some((event) => event.type === "system" && event.message.includes("散弹")));
  assert.ok(state.eventLog.length < 100);
});
check("finite HP at the numeric sentinel is not mistaken for infinite HP", () => {
  const player = createPlayer("finite"); player.hp = INFINITE_DAMAGE;
  applyHealthAmounts(player, 1, 0);
  assert.equal(player.hp, INFINITE_DAMAGE - 1); assert.ok(!player.hpIsInfinite);
});
check("reflecting the non-attack electric shock preserves its paralysis action", () => {
  let state = fixture([["电击法术"], ["绝弹"], [], []]);
  state = end(reveal(state, [cast("电击法术", { targetIds: [state.players[1]!.id] }), rebound(state, 2), gain, gain]));
  assert.ok(state.players[2]!.buffs.some((buff) => buff.id.startsWith("paralysis_next_action:")));
  assert.ok(!state.players[1]!.buffs.some((buff) => buff.id.startsWith("paralysis_next_action:")));
  assert.ok(state.players.every((player) => player.hp === 40));
});
check("an area attack entering the same infinite loop twice emits each family once", () => {
  let state = fixture([["绝对值"], ["散弹", "绝弹"], ["散弹", "绝弹"], []]);
  state = end(reveal(state, [{ type: "attack", attackId: "wan_jian", stacks: 1 }, rebound(state, 2), rebound(state, 1), gain]));
  assert.equal(damageTo(state, 3).filter((event) => event.type === "damage" && event.infiniteCopies).length, 2);
  assert.ok(state.eventLog.length < 150);
});
for (const infinite of [false, true]) check(`reversed blizzard preserves both ticks of one ${infinite ? "infinite" : "finite"} reflected attack`, () => {
  let state = fixture([["散弹", "绝弹", "暴风雪"], [], infinite ? ["散弹", "绝弹"] : [], ["逆转", "闪电护体"]]);
  state = reveal(state, [cast("暴风雪", { targetId: state.players[1]!.id }), rebound(state, 0), gain, infinite ? rebound(state, 2) : gain]);
  state = submitActionWindowSkill(state, state.players[3]!.id, cast("逆转"));
  state = end(state);
  assert.equal(state.players[3]!.hp, 36);
  assert.equal(damageTo(state, 3).length, 2);
  assert.ok(damageTo(state, 3).every((event) => event.type === "damage" && event.amount === 2 && !event.infiniteCopies));
});

console.log(`scatter rebound checks: ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
