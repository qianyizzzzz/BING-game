import assert from "node:assert/strict";
import {
  addCombatValues, addPlayerToGame, appendSkillInstances, BASE_ATTACKS, combatValue, compareCombatValues,
  createGame, createPlayer, FENTIAN_ATTACK_ID, getAllSkills, getPlayerHpValue, getSkill,
  INFINITE_DAMAGE, INFINITY_VALUE, passActionWindow, RETIRE_EFFECT_POWER, RETIRE_VALUE,
  setPlayerHpValue, startGame, submitActionWindowSkill, submitPlayerAction, toPublicGameState
} from "@bing/shared";
import type { CombatValue, GameState, PlayerAction, SkillPlayDefinition } from "@bing/shared";

const sha = BASE_ATTACKS.sha;
const cake: PlayerAction = { type: "gain_cake" };
const player = (state: GameState, index = 0) => state.players[index]!;
const aim = (state: GameState, skillId: string): PlayerAction => ({
  type: "skill", skillId, stacks: 1, targetId: player(state, 1).id
});

function advance(state: GameState, stop = ""): GameState {
  for (let guard = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && guard < 50; guard++) {
    const next = state.players.find(entry => entry.status === "alive" && !state.actionWindowPassPlayerIds.includes(entry.id));
    assert.ok(next, state.activeTimingPhase);
    state = passActionWindow(state, next.id);
  }
  return state;
}

function fixture(): GameState {
  let state = createGame("A", { skillMode: "big_test_select", firstTurnNoAttack: false });
  state = addPlayerToGame(state, createPlayer("B"));
  state = addPlayerToGame(state, createPlayer("C"));
  player(state).bigCards = [{ instanceId: "fire-card", cardId: "10501" }];
  state = advance(startGame(state));
  for (const entry of state.players) {
    entry.hp = 50;
    entry.cakes = 20;
  }
  return state;
}

function turn(state: GameState, a: PlayerAction, b: PlayerAction = cake): GameState {
  for (const [index, entry] of state.players.entries()) {
    state = submitPlayerAction(state, entry.id, [a, b, cake][index]!).state;
  }
  return advance(state, "turn_end_action");
}

function withFentianPower(powerValue: CombatValue, levelValue: CombatValue, lowLevel: number, run: () => void): void {
  const skill = getSkill(FENTIAN_ATTACK_ID)!;
  const originalPlay = skill.play!;
  const originalLevel = sha.level;
  const { damageParts: _, ...single } = originalPlay;
  try {
    skill.play = { ...single, powerValue, levelValue } as SkillPlayDefinition;
    sha.level = lowLevel;
    run();
  } finally {
    skill.play = originalPlay;
    sha.level = originalLevel;
  }
}

const counter = (state: GameState): PlayerAction => ({
  type: "attack", attackId: "sha", targetId: player(state).id, stacks: 1
});
const xPlusOne = addCombatValues(INFINITY_VALUE, combatValue(1));

withFentianPower(INFINITY_VALUE, combatValue(2, 1), 1, () => {
  const initial = fixture();
  setPlayerHpValue(player(initial, 1), combatValue(3, 1));
  const state = turn(initial, aim(initial, FENTIAN_ATTACK_ID), counter(initial));
  assert.deepEqual(getPlayerHpValue(player(state, 1)), combatValue(2, 1));
  assert.ok(state.eventLog.some(event => event.type === "damage" && event.amountValue &&
    compareCombatValues(event.amountValue, INFINITY_VALUE) === 0));
  assert.deepEqual(JSON.parse(JSON.stringify(toPublicGameState(state, player(state).id))).players[1].hpValue,
    combatValue(2, 1));
  console.log("ok - x(2x−1)/(2x) deals x through real clash and survives serialization");
});

withFentianPower(combatValue(1, 2), xPlusOne, INFINITE_DAMAGE, () => {
  const initial = fixture();
  setPlayerHpValue(player(initial, 1), combatValue(2, 1));
  const state = turn(initial, aim(initial, FENTIAN_ATTACK_ID), counter(initial));
  assert.deepEqual(getPlayerHpValue(player(state, 1)), INFINITY_VALUE);
  console.log("ok - x²/(x+1) reduces to x");
});

withFentianPower(combatValue(0.5, 1), xPlusOne, INFINITE_DAMAGE, () => {
  const initial = fixture();
  const state = turn(initial, aim(initial, FENTIAN_ATTACK_ID), counter(initial));
  assert.equal(player(state, 1).hp, 49.5);
  console.log("ok - equal leading degrees leave a finite quotient");
});

withFentianPower(combatValue(1), combatValue(1), -INFINITE_DAMAGE, () => {
  const initial = fixture();
  setPlayerHpValue(player(initial, 1), combatValue(2, 1));
  const state = turn(initial, aim(initial, FENTIAN_ATTACK_ID), counter(initial));
  assert.deepEqual(getPlayerHpValue(player(state, 1)), INFINITY_VALUE);
  console.log("ok - a negative unbounded opposing level can raise the damage degree");
});

withFentianPower(combatValue(1000), combatValue(10), 1, () => {
  const initial = fixture();
  player(initial, 1).hp = 2000;
  const state = turn(initial, aim(initial, FENTIAN_ATTACK_ID));
  assert.equal(player(state, 1).hp, 1000);
  assert.equal(player(state, 1).hpIsInfinite, undefined);
  console.log("ok - finite damage above the old sentinel stays finite");
});

withFentianPower(combatValue(4), xPlusOne, INFINITE_DAMAGE, () => {
  for (const invulnerable of [false, true]) {
    const initial = fixture();
    if (invulnerable) player(initial, 1).buffs.push({ id: "temp_invulnerable", name: "无敌", stacks: 1 });
    const state = turn(initial, aim(initial, FENTIAN_ATTACK_ID), counter(initial));
    assert.equal(player(state, 1).hp, 50);
    assert.equal(player(state, 1).buffs.some(buff => buff.stateType === "burning"), !invulnerable);
  }
  console.log("ok - vanishing damage still attaches hit effects unless the attack is stopped");
});

for (const power of [combatValue(3, 1), combatValue(1, 2)]) {
  withFentianPower(power, combatValue(10), 1, () => {
    const initial = fixture();
    setPlayerHpValue(player(initial, 1), combatValue(2, 1));
    const state = turn(initial, aim(initial, FENTIAN_ATTACK_ID));
    assert.equal(player(state, 1).defeatLevel, 1);
    assert.deepEqual(getPlayerHpValue(player(state, 1)), power[0]!.exponent === 1 ? combatValue(-1, 1) : [
      { exponent: 2, coefficient: -1 }, { exponent: 1, coefficient: 2 }
    ]);
  });
}
console.log("ok - 2x−3x = −x, and ordinary x² remains ordinary death");

{
  const initial = fixture();
  player(initial).cakes = 50;
  setPlayerHpValue(player(initial, 1), combatValue(4, 1));
  setPlayerHpValue(player(initial, 2), combatValue(4, 1));
  const sameFate = getAllSkills().find(skill => skill.name === "同生共死")!.id;
  appendSkillInstances(player(initial, 1), [sameFate]);
  let state = turn(initial, { type: "attack", attackId: "miao_sha", stacks: 3, targetId: player(initial, 1).id });
  player(state, 1).cakes = 10;
  state = submitActionWindowSkill(state, player(state, 1).id, {
    type: "skill", skillId: sameFate, stacks: 1, targetId: player(state, 2).id
  });
  state = advance(state);
  assert.deepEqual(getPlayerHpValue(player(state, 2)), INFINITY_VALUE);
  console.log("ok - 同生共死 passes along the actual 3x damage taken this turn");
}

{
  const initial = fixture();
  const paper = getAllSkills().find(skill => skill.name === "卷子")!.id;
  appendSkillInstances(player(initial), [paper, "skill_33_55159"]);
  const originalLevel = sha.level;
  try {
    sha.level = RETIRE_EFFECT_POWER;
    const state = turn(initial, aim(initial, paper), counter(initial));
    assert.equal(player(state, 1).defeatLevel, 2);
    assert.ok(state.eventLog.some(event => event.type === "damage" && event.pointDefeatLevel === 2 &&
      compareCombatValues(event.amountValue ?? [], RETIRE_VALUE) === 0));
  } finally {
    sha.level = originalLevel;
  }
  console.log("ok - retirement-point damage retains its rank and value when only one level remains");
}
