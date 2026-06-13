import assert from "node:assert/strict";
import {
  GameEvent,
  PlayerAction,
  PublicGameState
} from "@bing/shared";
import {
  MAX_BATTLE_STEPS,
  buildBattleSteps,
  findLatestBroadcast,
  type BattleBeat,
  type BattleSoundCue,
  type BattleStepKind
} from "../apps/client/src/lib/turnTimeline";
import { buildBattlePresentation } from "../apps/client/src/lib/battlePresentation";
import { battleDirectorSeatRole, buildBattleDirectorSnapshot } from "../apps/client/src/lib/battleDirector";
import { getBattleCueProfile } from "../apps/client/src/lib/battleAudio";

const now = Date.now();

const players: PublicGameState["players"] = [
  {
    id: "p1",
    name: "玩家一",
    kind: "human",
    hp: 6,
    cakes: 2,
    status: "alive",
    connected: true,
    skills: ["skill_alpha"],
    revealedSkillIds: [],
    buffs: []
  },
  {
    id: "p2",
    name: "玩家二",
    kind: "human",
    hp: 4,
    cakes: 1,
    status: "alive",
    connected: true,
    skills: ["skill_beta"],
    revealedSkillIds: [],
    buffs: []
  }
];

const reveal: Extract<GameEvent, { type: "turn_revealed" }> = {
  ...baseEvent("reveal"),
  type: "turn_revealed",
  actions: {
    p1: { actions: [{ type: "attack", attackId: "sha", stacks: 1, targetId: "p2" }] },
    p2: { actions: [{ type: "defense", defense: "small" }] }
  }
};

const state: PublicGameState = {
  id: "game-timeline-check",
  ownerId: "p1",
  phase: "resolving",
  roundNumber: 1,
  roundTurnNumber: 1,
  turnNumber: 1,
  activeTimingPhase: "turn_action",
  actionWindowPlayerIds: [],
  actionWindowPassPlayerIds: [],
  turnStartedAt: now,
  players,
  eventLog: [],
  winnerIds: [],
  config: {
    maxPlayers: 6,
    allowAI: true,
    firstTurnNoAttack: true,
    hideCakeCounts: false,
    turnTimeLimitSeconds: 45,
    speedMode: "normal",
    skillMode: "small_intro",
    skillCount: 2
  },
  createdAt: now,
  updatedAt: now,
  pendingActionPlayerIds: [],
  revealedActions: reveal.actions,
  viewerPlayerId: "p1"
};

const switchBefore: PlayerAction = { type: "defense", defense: "small" };
const switchAfter: PlayerAction = { type: "attack", attackId: "sha", stacks: 1, targetId: "p2" };

const cases: Array<{
  name: string;
  event: GameEvent;
  expected: {
    kind: BattleStepKind;
    beat: BattleBeat;
    soundCue: BattleSoundCue;
  };
}> = [
  {
    name: "damage",
    event: {
      ...baseEvent("damage"),
      type: "damage",
      sourceId: "p1",
      targetId: "p2",
      amount: 2,
      attackName: "杀"
    },
    expected: { kind: "damage", beat: "impact", soundCue: "hit" }
  },
  {
    name: "area damage",
    event: {
      ...baseEvent("area"),
      type: "damage",
      sourceId: "p1",
      targetId: "p2",
      amount: 1,
      attackName: "万箭齐发",
      traits: ["area"]
    },
    expected: { kind: "area", beat: "impact", soundCue: "area-hit" }
  },
  {
    name: "blocked attack",
    event: {
      ...baseEvent("blocked"),
      type: "attack_blocked",
      sourceId: "p1",
      targetId: "p2",
      attackName: "杀",
      defense: "small",
      blockKind: "block"
    },
    expected: { kind: "block", beat: "defense", soundCue: "block" }
  },
  {
    name: "reflected attack",
    event: {
      ...baseEvent("reflected"),
      type: "attack_reflected",
      sourceId: "p1",
      originalTargetId: "p2",
      reflectedTargetId: "p1",
      attackName: "擒"
    },
    expected: { kind: "reflect", beat: "reflect", soundCue: "reflect" }
  },
  {
    name: "rebound broken",
    event: {
      ...baseEvent("break"),
      type: "rebound_broken",
      sourceId: "p1",
      targetId: "p2",
      attackName: "核爆"
    },
    expected: { kind: "break", beat: "impact", soundCue: "break" }
  },
  {
    name: "healing",
    event: {
      ...baseEvent("heal"),
      type: "heal",
      sourceId: "p1",
      targetId: "p1",
      amount: 1,
      reason: "技能回复"
    },
    expected: { kind: "heal", beat: "recovery", soundCue: "heal" }
  },
  {
    name: "clash",
    event: {
      ...baseEvent("clash"),
      type: "clash",
      attackerAId: "p1",
      attackerBId: "p2",
      result: "双方攻击对撞，互相抵消"
    },
    expected: { kind: "clash", beat: "impact", soundCue: "clash" }
  },
  {
    name: "skill used",
    event: {
      ...baseEvent("skill-used"),
      type: "skill_used",
      playerId: "p1",
      skillId: "skill_alpha",
      skillName: "饼之怒",
      reason: "主动施放"
    },
    expected: { kind: "skill", beat: "skill", soundCue: "skill" }
  },
  {
    name: "skill revealed",
    event: {
      ...baseEvent("skill-revealed"),
      type: "skill_revealed",
      playerId: "p1",
      skillId: "skill_alpha",
      skillName: "饼之怒",
      reason: "触发"
    },
    expected: { kind: "skill", beat: "reveal", soundCue: "skill" }
  },
  {
    name: "action switched",
    event: {
      ...baseEvent("switched"),
      type: "action_switched",
      playerId: "p1",
      skillId: "skill_alpha",
      skillName: "改招",
      actionIndex: 0,
      before: switchBefore,
      after: switchAfter,
      cost: 1
    },
    expected: { kind: "skill", beat: "skill", soundCue: "skill" }
  },
  {
    name: "defeat",
    event: {
      ...baseEvent("defeat"),
      type: "player_died",
      playerId: "p2",
      defeatLevel: 1,
      sourceId: "p1",
      reason: "生命归零"
    },
    expected: { kind: "defeat", beat: "defeat", soundCue: "defeat" }
  },
  {
    name: "round ended",
    event: {
      ...baseEvent("round-ended"),
      type: "round_ended",
      reason: "出现血量变化"
    },
    expected: { kind: "system", beat: "system", soundCue: "system" }
  },
  {
    name: "game finished",
    event: {
      ...baseEvent("finished"),
      type: "game_finished",
      winnerIds: ["p1"]
    },
    expected: { kind: "system", beat: "system", soundCue: "victory" }
  },
  {
    name: "system reflect loop",
    event: {
      ...baseEvent("system-reflect"),
      type: "system",
      message: "反弹形成环，攻击消散"
    },
    expected: { kind: "reflect", beat: "reflect", soundCue: "reflect" }
  },
  {
    name: "system record",
    event: {
      ...baseEvent("system-record"),
      type: "system",
      message: "特殊状态已结算"
    },
    expected: { kind: "system", beat: "system", soundCue: "system" }
  }
];

for (const item of cases) {
  const [step] = buildBattleSteps([item.event], state);
  assert.ok(step, `${item.name} should map to a battle step`);
  assert.equal(step.kind, item.expected.kind, `${item.name} kind`);
  assert.equal(step.beat, item.expected.beat, `${item.name} beat`);
  assert.equal(step.soundCue, item.expected.soundCue, `${item.name} sound cue`);
  assert.ok(getBattleCueProfile(step.soundCue).durationMs > 0, `${item.name} registered cue`);
  assert.ok(step.label.length > 0, `${item.name} label`);
  assert.ok(step.description.length > 0, `${item.name} description`);

  const [cue] = buildBattlePresentation([item.event], state);
  assert.ok(cue, `${item.name} should map to a presentation cue`);
  assert.equal(cue.kind, item.expected.kind, `${item.name} presentation kind`);
  assert.equal(cue.beat, item.expected.beat, `${item.name} presentation beat`);
  assert.equal(cue.sfx, item.expected.soundCue, `${item.name} presentation sound cue`);
  assert.ok(cue.durationMs > 0, `${item.name} presentation duration`);
  assert.ok(cue.intensity >= 0 && cue.intensity <= 1, `${item.name} presentation intensity`);
  assert.ok(cue.vfx !== "none", `${item.name} presentation vfx`);
}

const broadcast = findLatestBroadcast([reveal, ...cases.map((item) => item.event)]);
assert.equal(broadcast?.reveal.id, reveal.id);
assert.equal(broadcast?.events.length, cases.length);

const cappedSteps = buildBattleSteps(cases.map((item) => item.event), state);
assert.equal(cappedSteps.length, MAX_BATTLE_STEPS);

const cappedPresentation = buildBattlePresentation(cases.map((item) => item.event), state);
assert.equal(cappedPresentation.length, MAX_BATTLE_STEPS);
assert.equal(cappedPresentation[0]?.startMs, 0);
assert.ok((cappedPresentation[1]?.startMs ?? 0) > (cappedPresentation[0]?.startMs ?? -1));

const director = buildBattleDirectorSnapshot(cases.map((item) => item.event), state, 1);
assert.equal(director.cueCount, MAX_BATTLE_STEPS);
assert.equal(director.activeCue?.id, cappedPresentation[1]?.id);
assert.equal(director.activeBeat, cappedPresentation[1]?.beat);
assert.equal(director.activeCameraCue, cappedPresentation[1]?.camera);
assert.equal(director.activeHitStopMs, cappedPresentation[1]?.hitStopMs);
assert.deepEqual(director.activeTargetIds, cappedPresentation[1]?.targetIds);
assert.ok(director.totalDurationMs > cappedPresentation.length * 600);
assert.equal(battleDirectorSeatRole("p1", "p1", ["p2"]), "source");
assert.equal(battleDirectorSeatRole("p2", "p1", ["p2"]), "target");
assert.equal(battleDirectorSeatRole("p1", "p1", ["p1"]), "source-target");
assert.equal(battleDirectorSeatRole("p3", "p1", ["p2"]), undefined);

console.log(`turn timeline check passed: ${cases.length} event mappings and presentation cues covered`);

function baseEvent(id: string) {
  return {
    id,
    at: now,
    roundNumber: 1,
    turnNumber: 1
  };
}
