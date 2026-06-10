import assert from "node:assert/strict";
import {
  ActionSubmission,
  ACTION_WINDOW_SECONDS,
  GameConfig,
  GameState,
  PlayerId,
  addPlayerToGame,
  advanceActionWindow,
  createGame,
  createPlayer,
  enterActionWindow,
  getSkill,
  getSkillPlay,
  getSmallSkillIds,
  guessPlayerSkill,
  startGame,
  submitActionWindowSkill,
  submitPlayerAction,
  toPublicGameState,
  usesSkillActionWindows
} from "@bing/shared";

type PlayerMap = Record<string, PlayerId>;

run("nanman is parried when target uses sha on someone else", () => {
  const { state, ids } = makeGame(["A", "B", "C"]);
  seat(state, ids.A, { cakes: 3 });
  seat(state, ids.B, { cakes: 1 });

  const next = submitAll(state, {
    A: { type: "attack", attackId: "nan_man", stacks: 1 },
    B: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.C },
    C: { type: "gain_cake" }
  }, ids);

  assert.equal(player(next, ids.B).hp, 6);
});

run("wine and crystal add one to total, not per stack", () => {
  const { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.A, { cakes: 5, skills: ["skill_34_1533", "skill_33_55159"] });

  const next = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 5, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  const damage = next.eventLog.findLast((event) => event.type === "damage");

  assert.equal(damage?.type === "damage" ? damage.amount : 0, 6);
});

run("defense value absorbs non-spell physical damage", () => {
  const { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.A, { cakes: 3 });
  player(state, ids.B).buffs.push({ id: "defense_value", name: "defense", stacks: 2 });

  const next = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 3, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);

  assert.equal(player(next, ids.B).hp, 5);
});

run("defense value does not absorb burning earth spell damage", () => {
  const { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_13_68869"] });
  player(state, ids.B).buffs.push({ id: "defense_value", name: "defense", stacks: 5 });

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_13_68869",
    stacks: 1
  });

  assert.equal(player(next, ids.B).hp, 5);
  assert.equal(buffStacks(player(next, ids.B), "defense_value"), 5);
});

run("burning earth in round interval does not advance the round", () => {
  const { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_13_68869"] });

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_13_68869",
    stacks: 1
  });

  assert.equal(player(next, ids.B).hp, 5);
  assert.equal(next.roundNumber, 1);
  assert.equal(next.phase, "action_window");
  assert.equal(next.activeTimingPhase, "round_pre_interval_action");
});

run("burning earth before a round advances to the next round interval", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_13_68869"] });
  state = advanceActionWindow(state);
  assert.equal(state.activeTimingPhase, "round_before_action");

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_13_68869",
    stacks: 1
  });

  assert.equal(player(next, ids.B).hp, 5);
  assert.equal(next.roundNumber, 2);
  assert.equal(next.phase, "action_window");
  assert.equal(next.activeTimingPhase, "round_pre_interval_action");
});

run("turn-change burning earth does not skip submitted attacks and counts as same-turn fatal fire damage", () => {
  let { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { skills: ["skill_65_71994"] });
  seat(state, ids.B, { cakes: 2, skills: ["skill_13_68869"] });

  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "qin", stacks: 2, targetId: ids.A },
    C: { type: "gain_cake" }
  }, ids);
  assert.equal(state.phase, "action_window");
  assert.equal(state.activeTimingPhase, "turn_change_action");

  state = submitActionWindowSkill(state, ids.B, {
    type: "skill",
    skillId: "skill_13_68869",
    stacks: 1
  });
  assert.equal(state.phase, "action_window");
  assert.equal(state.activeTimingPhase, "turn_change_action");
  assert.equal(Object.keys(state.pendingActions).length, 3);

  state = drainActionWindows(state);

  assert.equal(player(state, ids.A).status, "alive");
  assert.equal(player(state, ids.A).hp, 6);
  assert.equal(
    state.eventLog.some(
      (event) =>
        event.type === "damage" &&
        event.targetId === ids.A &&
        event.attackName === "火烧大地" &&
        event.element === "fire"
    ),
    true
  );
});

run("guding blade does not multiply burning earth spell damage", () => {
  const { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 2
  });
  seat(state, ids.A, { skills: ["skill_13_68869", "skill_29_96125"] });

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_13_68869",
    stacks: 1
  });

  assert.equal(player(next, ids.B).cakes, 0);
  assert.equal(player(next, ids.B).hp, 5);
});

run("flash dodge avoids all attack damage for the turn", () => {
  const { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let next = drainActionWindows(state);
  seat(next, ids.A, { skills: ["skill_103_56259"] });
  seat(next, ids.B, { cakes: 1 });
  seat(next, ids.C, { cakes: 1 });

  next = submitAll(next, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.A },
    C: { type: "attack", attackId: "qin", stacks: 1, targetId: ids.A }
  }, ids);
  assert.equal(next.phase, "action_window");
  assert.equal(next.activeTimingPhase, "turn_change_action");

  next = submitActionWindowSkill(next, ids.A, {
    type: "skill",
    skillId: "skill_103_56259",
    stacks: 1
  });
  next = drainActionWindows(next);

  assert.equal(player(next, ids.A).hp, 6);
  assert.equal(buffCountByPrefix(player(next, ids.A), "flash_dodge_cooldown"), 1);
  assert.equal(
    next.eventLog.filter(
      (event) =>
        event.type === "attack_blocked" &&
        event.targetId === ids.A &&
        event.blockKind === "dodge"
    ).length,
    2
  );
});

run("six star converts the highest pending damage into healing", () => {
  const { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let next = drainActionWindows(state);
  seat(next, ids.A, { skills: ["skill_108_76133"] });
  seat(next, ids.B, { cakes: 2 });
  seat(next, ids.C, { cakes: 1 });

  next = submitAll(next, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "sha", stacks: 2, targetId: ids.A },
    C: { type: "attack", attackId: "qin", stacks: 1, targetId: ids.A }
  }, ids);
  let guard = 0;
  while (
    next.phase === "action_window" &&
    next.activeTimingPhase !== "turn_damage_modify" &&
    guard < 8
  ) {
    guard += 1;
    next = advanceActionWindow(next);
  }
  assert.equal(next.phase, "action_window");
  assert.equal(next.activeTimingPhase, "turn_damage_modify");

  next = submitActionWindowSkill(next, ids.A, {
    type: "skill",
    skillId: "skill_108_76133",
    stacks: 1
  });
  next = drainActionWindows(next);

  assert.equal(player(next, ids.A).hp, 15);
  assert.equal(
    next.eventLog.some((event) => event.type === "damage" && event.targetId === ids.A),
    false
  );
  assert.equal(
    next.eventLog.filter(
      (event) =>
        event.type === "attack_blocked" &&
        event.targetId === ids.A &&
        event.blockKind === "immune" &&
        event.protectionName === "六芒星"
    ).length,
    2
  );
});

run("guidao requires earned charges and consumes them", () => {
  const empty = makeGame(["A", "B"]);
  seat(empty.state, empty.ids.B, { skills: ["skill_37_68416"] });
  assert.throws(() =>
    submitPlayerAction(empty.state, empty.ids.B, {
      type: "skill",
      skillId: "skill_37_68416",
      stacks: 1,
      targetId: empty.ids.A
    })
  );

  const { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.A, { cakes: 2 });
  seat(state, ids.B, { skills: ["skill_37_68416"] });
  const charged = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 2, targetId: ids.B },
    B: { type: "defense", defense: "small" }
  }, ids);
  assert.equal(buffStacks(player(charged, ids.B), "guidao_charge"), 2);

  const spent = submitAll(charged, {
    A: { type: "gain_cake" },
    B: {
      type: "skill",
      skillId: "skill_37_68416",
      stacks: 2,
      targetId: ids.A
    }
  }, ids);
  assert.equal(buffStacks(player(spent, ids.B), "guidao_charge"), 0);
});

run("lu grows once per target hit and uses the grown base stats later", () => {
  let { state, ids } = makeGame(["A", "B", "C", "D"], {
    skillMode: "test_select",
    skillCount: 2
  });
  seat(state, ids.A, { cakes: 1, skills: ["skill_81_59663", "skill_54_99719"] });
  state = drainActionWindows(state);

  state = submitAll(state, {
    A: { type: "skill", skillId: "skill_81_59663", stacks: 1 },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" },
    D: { type: "gain_cake" }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(buffStacks(player(state, ids.A), "lu_growth"), 3);
  assert.equal(player(state, ids.B).hp, 5);
  assert.equal(player(state, ids.C).hp, 5);
  assert.equal(player(state, ids.D).hp, 5);

  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 1 });
  state = submitAll(state, {
    A: { type: "skill", skillId: "skill_81_59663", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" },
    D: { type: "gain_cake" }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).hp, 1);
  assert.equal(buffStacks(player(state, ids.A), "lu_growth"), 3);
});

run("stacked lu grows only once when it hits one target", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { cakes: 2, skills: ["skill_81_59663"] });
  state = drainActionWindows(state);

  state = submitAll(state, {
    A: { type: "skill", skillId: "skill_81_59663", stacks: 2, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).hp, 4);
  assert.equal(buffStacks(player(state, ids.A), "lu_growth"), 1);
});

run("lu grows from clash damage and from zero-power hits", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 2
  });
  seat(state, ids.A, { cakes: 2, skills: ["skill_81_59663", "skill_45_30424"] });
  seat(state, ids.B, { cakes: 1 });
  state = drainActionWindows(state);

  state = submitAll(state, {
    A: { type: "skill", skillId: "skill_81_59663", stacks: 2, targetId: ids.B },
    B: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.A }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).hp, 5);
  assert.equal(buffStacks(player(state, ids.A), "lu_growth"), 1);

  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 2 });
  state = submitAll(state, {
    A: { type: "skill", skillId: "skill_81_59663", stacks: 2, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_45_30424",
    stacks: 1,
    attackStatModifier: "power_to_zero_level_times_4"
  });
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).hp, 5);
  assert.equal(buffStacks(player(state, ids.A), "lu_growth"), 2);
});

run("lianbao grants and spends explicit free stacks", () => {
  const { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.A, { cakes: 2, skills: ["skill_87_44771"] });

  let hit = submitAll(state, {
    A: { type: "skill", skillId: "skill_87_44771", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  assert.equal(buffStacks(player(hit, ids.A), "free_lian_bao"), 1);

  hit = drainActionWindows(hit);
  seat(hit, ids.A, { cakes: 2 });
  const free = submitAll(hit, {
    A: {
      type: "skill",
      skillId: "skill_87_44771",
      stacks: 2,
      freeStacks: 1,
      targetId: ids.B
    },
    B: { type: "gain_cake" }
  }, ids);
  assert.equal(buffStacks(player(free, ids.A), "free_lian_bao"), 1);
  assert.equal(player(free, ids.B).hp, 3);
});

run("hit rewards trigger through defense value but not invulnerability", () => {
  let { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { cakes: 2, skills: ["skill_87_44771"] });
  player(state, ids.B).buffs.push({ id: "defense_value", name: "defense", stacks: 3 });
  state = drainActionWindows(state);

  state = submitAll(state, {
    A: { type: "skill", skillId: "skill_87_44771", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).hp, 6);
  assert.equal(buffStacks(player(state, ids.A), "free_lian_bao"), 1);

  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 2, skills: ["skill_78_18866"] });
  seat(state, ids.B, { skills: ["skill_32_19017"] });
  state = submitAll(state, {
    A: { type: "skill", skillId: "skill_78_18866", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).hp, 6);
  assert.equal(player(state, ids.C).hp, 6);
});

run("ding clashes cancel every attack except juanzi", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { cakes: 1, skills: ["skill_83_32356"] });
  seat(state, ids.B, { cakes: 14 });
  state = drainActionWindows(state);

  state = submitAll(state, {
    A: { type: "skill", skillId: "skill_83_32356", stacks: 1, targetId: ids.B },
    B: { type: "attack", attackId: "miao_sha", stacks: 1, targetId: ids.A }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.A).hp, 6);
  assert.equal(player(state, ids.B).hp, 6);

  ({ state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  }));
  seat(state, ids.A, { cakes: 1, skills: ["skill_83_32356"] });
  seat(state, ids.B, { skills: ["skill_95_91337"] });
  state = drainActionWindows(state);

  state = submitAll(state, {
    A: { type: "skill", skillId: "skill_83_32356", stacks: 1, targetId: ids.B },
    B: { type: "skill", skillId: "skill_95_91337", stacks: 1, targetId: ids.A }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.A).status, "dead");
  assert.equal(player(state, ids.A).defeatLevel, 2);
});

run("ding versus kou retires the ding side after change windows", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { cakes: 1, skills: ["skill_83_32356"] });
  seat(state, ids.B, { cakes: 2, skills: ["skill_84_6114"] });
  state = drainActionWindows(state);

  state = submitAll(state, {
    A: { type: "skill", skillId: "skill_83_32356", stacks: 1, targetId: ids.B },
    B: { type: "skill", skillId: "skill_84_6114", stacks: 1, targetId: ids.A }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.A).status, "dead");
  assert.equal(player(state, ids.A).defeatLevel, 2);
  assert.equal(player(state, ids.B).status, "alive");
});

run("scatter rebound can be submitted without a target and rebounds to everyone", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { cakes: 1 });
  seat(state, ids.B, { cakes: 1, skills: ["skill_58_88471"] });
  state = drainActionWindows(state);

  const next = drainActionWindows(submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.B },
    B: { type: "defense", defense: "rebound" }
  }, ids));

  assert.equal(player(next, ids.A).hp, 5);
  assert.equal(player(next, ids.B).hp, 6);
});

run("blizzard is one attack with two damage ticks", () => {
  const { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.A, { cakes: 2, skills: ["skill_96_33279"] });

  const next = submitAll(state, {
    A: { type: "skill", skillId: "skill_96_33279", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  const damageEvents = next.eventLog.filter(
    (event) => event.type === "damage" && event.targetId === ids.B
  );

  assert.equal(damageEvents.length, 2);
  assert.deepEqual(damageEvents.map((event) => event.amount), [2, 2]);
});

run("rocket can hit one or two consecutive targets only once", () => {
  const { state, ids } = makeGame(["A", "B", "C", "D"]);
  seat(state, ids.A, { skills: ["skill_79_36319"] });

  const next = submitAll(state, {
    A: {
      type: "skill",
      skillId: "skill_79_36319",
      stacks: 1,
      targetId: ids.B,
      targetIds: [ids.B, ids.C]
    },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" },
    D: { type: "gain_cake" }
  }, ids);

  assert.equal(player(next, ids.B).hp, 0);
  assert.equal(player(next, ids.C).hp, 0);
  assert.equal(buffStacks(player(next, ids.A), "skill_used:skill_79_36319"), 1);
});

run("rocket rejects non-consecutive dual targets", () => {
  const { state, ids } = makeGame(["A", "B", "C", "D"]);
  seat(state, ids.A, { skills: ["skill_79_36319"] });

  assert.throws(() =>
    submitPlayerAction(state, ids.A, {
      type: "skill",
      skillId: "skill_79_36319",
      stacks: 1,
      targetId: ids.B,
      targetIds: [ids.B, ids.D]
    })
  );
});

run("electric shock allows two non-consecutive targets", () => {
  const { state, ids } = makeGame(["A", "B", "C", "D"]);
  seat(state, ids.A, { skills: ["skill_36_14343"] });

  const next = submitAll(state, {
    A: {
      type: "skill",
      skillId: "skill_36_14343",
      stacks: 1,
      targetId: ids.B,
      targetIds: [ids.B, ids.D]
    },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" },
    D: { type: "gain_cake" }
  }, ids);

  assert.equal(
    player(next, ids.B).buffs.some((buff) => buff.id.startsWith("paralysis_next_action:")),
    true
  );
  assert.equal(
    player(next, ids.D).buffs.some((buff) => buff.id.startsWith("paralysis_next_action:")),
    true
  );
});

run("electric shock is a skill action, not an attack action", () => {
  assert.equal(getSkillPlay("skill_36_14343")?.kind, "effect");
});

run("eternal night does not erase electric shock", () => {
  const { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.A, { skills: ["skill_36_14343"] });
  seat(state, ids.B, { skills: ["skill_44_20092"] });

  const next = submitAll(state, {
    A: {
      type: "skill",
      skillId: "skill_36_14343",
      stacks: 1,
      targetId: ids.B,
      targetIds: [ids.B]
    },
    B: { type: "gain_cake" }
  }, ids);

  assert.equal(
    player(next, ids.B).buffs.some((buff) => buff.id.startsWith("paralysis_next_action:")),
    true
  );
});

run("vortex skills can hit up to three consecutive targets", () => {
  const { state, ids } = makeGame(["A", "B", "C", "D"]);
  seat(state, ids.A, { cakes: 3, skills: ["skill_119_78843"] });

  const next = submitAll(state, {
    A: {
      type: "skill",
      skillId: "skill_119_78843",
      stacks: 1,
      targetId: ids.B,
      targetIds: [ids.B, ids.C, ids.D]
    },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" },
    D: { type: "gain_cake" }
  }, ids);

  assert.equal(player(next, ids.B).hp, 3);
  assert.equal(player(next, ids.C).hp, 3);
  assert.equal(player(next, ids.D).hp, 3);
});

run("ice vortex freezes the target into no action next turn", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 3, skills: ["skill_118_53580"] });

  state = submitAll(state, {
    A: {
      type: "skill",
      skillId: "skill_118_53580",
      stacks: 1,
      targetId: ids.B,
      targetIds: [ids.B]
    },
    B: { type: "gain_cake" }
  }, ids);

  state = drainActionWindows(state);
  assert.deepEqual(state.pendingActions[ids.B]?.actions, []);
  assert.equal(player(state, ids.B).buffs.some((buff) => buff.id === "frozen"), true);
});

run("ice rain wanjian grants ice rain mark without freezing", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 2, skills: ["skill_20_63089"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "wan_jian", stacks: 1 },
    B: { type: "gain_cake" }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).buffs.some((buff) => buff.id === `ice_rain:${ids.A}`), true);
  assert.equal(player(state, ids.B).buffs.some((buff) => buff.id === "frozen"), false);
});

run("winter wrath freezes for the consumed mark duration", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 1, skills: ["skill_22_54978"] });
  player(state, ids.A).buffs.push({
    id: "winter_mark",
    name: "凛冬印记",
    stacks: 3
  });

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_22_54978",
    stacks: 3
  });
  state = drainActionWindows(state);

  const frozen = player(state, ids.B).buffs.find((buff) => buff.id === "frozen");
  assert.equal(frozen?.stacks, 3);
  assert.equal(frozen?.expiresAtTurn, 4);
  assert.deepEqual(state.pendingActions[ids.B]?.actions, []);
});

run("ghost shield blocks electric shock paralysis", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 2
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { skills: ["skill_36_14343"] });
  seat(state, ids.B, { skills: ["skill_56_42637"] });

  state = submitAll(state, {
    A: {
      type: "skill",
      skillId: "skill_36_14343",
      stacks: 1,
      targetId: ids.B,
      targetIds: [ids.B]
    },
    B: { type: "gain_cake" }
  }, ids);
  state = submitActionWindowSkill(state, ids.B, {
    type: "skill",
    skillId: "skill_56_42637",
    stacks: 1
  });
  state = drainActionWindows(state);

  assert.equal(
    player(state, ids.B).buffs.some((buff) => buff.id.startsWith("paralysis_next_action:")),
    false
  );
});

run("ghost shield blocks skill attacks and their hit effects", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 2
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 3, skills: ["skill_118_53580"] });
  seat(state, ids.B, { skills: ["skill_56_42637"] });

  state = submitAll(state, {
    A: {
      type: "skill",
      skillId: "skill_118_53580",
      stacks: 1,
      targetId: ids.B,
      targetIds: [ids.B]
    },
    B: { type: "gain_cake" }
  }, ids);
  state = submitActionWindowSkill(state, ids.B, {
    type: "skill",
    skillId: "skill_56_42637",
    stacks: 1
  });
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).hp, 6);
  assert.equal(player(state, ids.B).buffs.some((buff) => buff.id === "frozen"), false);
});

run("vortex skills reject non-consecutive targets", () => {
  const { state, ids } = makeGame(["A", "B", "C", "D", "E"]);
  seat(state, ids.A, { cakes: 3, skills: ["skill_118_53580"] });

  assert.throws(() =>
    submitPlayerAction(state, ids.A, {
      type: "skill",
      skillId: "skill_118_53580",
      stacks: 1,
      targetId: ids.B,
      targetIds: [ids.B, ids.D, ids.E]
    })
  );
});

run("huanfang switches small defense to stone and spends three cakes", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 5 });
  seat(state, ids.B, { cakes: 3, skills: ["skill_89_99375"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "huo_wu", stacks: 1, targetId: ids.B },
    B: { type: "defense", defense: "small" }
  }, ids);
  state = submitActionWindowSkill(state, ids.B, {
    type: "skill",
    skillId: "skill_89_99375",
    stacks: 1,
    switchToAction: { type: "defense", defense: "stone" }
  });

  assert.equal(player(state, ids.B).cakes, 0);
  state = drainActionWindows(state);
  assert.equal(player(state, ids.B).hp, 6);
});

run("huanfang rejects an unaffordable three-cake switch", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 5 });
  seat(state, ids.B, { cakes: 2, skills: ["skill_89_99375"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "huo_wu", stacks: 1, targetId: ids.B },
    B: { type: "defense", defense: "small" }
  }, ids);

  assert.throws(() =>
    submitActionWindowSkill(state, ids.B, {
      type: "skill",
      skillId: "skill_89_99375",
      stacks: 1,
      switchToAction: { type: "defense", defense: "stone" }
    })
  );
});

run("huanfang basic switch can turn small defense into youtiao", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 3 });
  seat(state, ids.B, { cakes: 1, skills: ["skill_88_62906"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "nan_man", stacks: 1 },
    B: { type: "defense", defense: "small" }
  }, ids);
  state = submitActionWindowSkill(state, ids.B, {
    type: "skill",
    skillId: "skill_88_62906",
    stacks: 1,
    switchToAction: { type: "defense", defense: "youtiao" }
  });
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).hp, 6);
});

run("shahuan switches sha into qin before damage resolves", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 2, skills: ["skill_90_32911"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_90_32911",
    stacks: 1,
    switchToAction: {
      type: "attack",
      attackId: "qin",
      stacks: 1,
      targetId: ids.B
    }
  });
  state = drainActionWindows(state);

  assert.equal(player(state, ids.A).cakes, 0);
  assert.equal(player(state, ids.B).hp, 3);
});

run("jihuan swaps attack power and level before damage resolves", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 1, skills: ["skill_91_89631"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "qin", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_91_89631",
    stacks: 1,
    switchActionIndex: 0,
    attackStatModifier: "swap_power_level"
  });
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).hp, 6);
});

run("destruction power modifies selected attack and starts a two-round cooldown", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 2, skills: ["skill_45_30424"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 2, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_45_30424",
    stacks: 1,
    switchActionIndex: 0,
    attackStatModifier: "power_plus_2_level_minus_2"
  });

  assert.equal(
    player(state, ids.A).buffs.find((buff) => buff.id.startsWith("destroy_power_cooldown"))
      ?.expiresAtRound,
    3
  );
  assert.throws(() =>
    submitActionWindowSkill(state, ids.A, {
      type: "skill",
      skillId: "skill_45_30424",
      stacks: 1,
      switchActionIndex: 0,
      attackStatModifier: "power_minus_1_level_plus_1"
    })
  );

  state = drainActionWindows(state);
  assert.equal(player(state, ids.B).hp, 2);
});

run("destruction power uses v3 multiplier options", () => {
  const tripleSetup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let tripleState = drainActionWindows(tripleSetup.state);
  seat(tripleState, tripleSetup.ids.A, { cakes: 1, skills: ["skill_45_30424"] });

  tripleState = submitAll(tripleState, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: tripleSetup.ids.B },
    B: { type: "gain_cake" }
  }, tripleSetup.ids);
  tripleState = submitActionWindowSkill(tripleState, tripleSetup.ids.A, {
    type: "skill",
    skillId: "skill_45_30424",
    stacks: 1,
    switchActionIndex: 0,
    attackStatModifier: "power_times_3_level_to_zero"
  });
  tripleState = drainActionWindows(tripleState);
  assert.equal(player(tripleState, tripleSetup.ids.B).hp, 3);

  const levelSetup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let levelState = drainActionWindows(levelSetup.state);
  seat(levelState, levelSetup.ids.A, { cakes: 1, skills: ["skill_45_30424"] });
  seat(levelState, levelSetup.ids.B, { cakes: 1 });

  levelState = submitAll(levelState, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: levelSetup.ids.B },
    B: { type: "attack", attackId: "sha", stacks: 1, targetId: levelSetup.ids.A }
  }, levelSetup.ids);
  levelState = submitActionWindowSkill(levelState, levelSetup.ids.A, {
    type: "skill",
    skillId: "skill_45_30424",
    stacks: 1,
    switchActionIndex: 0,
    attackStatModifier: "power_to_zero_level_times_4"
  });
  levelState = drainActionWindows(levelState);
  assert.equal(player(levelState, levelSetup.ids.A).hp, 6);
  assert.equal(player(levelState, levelSetup.ids.B).hp, 6);
});

run("electric shock fixes a defensive action for the next turn", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 1, skills: ["skill_36_14343"] });

  state = submitAll(state, {
    A: {
      type: "skill",
      skillId: "skill_36_14343",
      stacks: 1,
      targetId: ids.B,
      targetIds: [ids.B]
    },
    B: { type: "defense", defense: "small" }
  }, ids);
  state = drainActionWindows(state);

  assert.deepEqual(state.pendingActions[ids.B]?.actions, [
    { type: "defense", defense: "small" }
  ]);
  state = submitPlayerAction(state, ids.A, {
    type: "attack",
    attackId: "sha",
    stacks: 1,
    targetId: ids.B
  }).state;
  state = drainActionWindows(state);
  assert.equal(player(state, ids.B).hp, 6);
});

run("electric shock fixes cake without granting cake next turn", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 7, skills: ["skill_36_14343"] });

  state = submitAll(state, {
    A: {
      type: "skill",
      skillId: "skill_36_14343",
      stacks: 1,
      targetId: ids.B,
      targetIds: [ids.B]
    },
    B: { type: "gain_cake" }
  }, ids);
  state = drainActionWindows(state);

  assert.deepEqual(state.pendingActions[ids.B]?.actions, [{ type: "gain_cake" }]);
  assert.equal(player(state, ids.B).cakes, 1);
  state = submitPlayerAction(state, ids.A, {
    type: "attack",
    attackId: "chao_he_bao",
    stacks: 1,
    targetId: ids.B
  }).state;
  state = drainActionWindows(state);
  assert.equal(player(state, ids.B).hp, 6);
  assert.equal(player(state, ids.B).cakes, 1);
});

run("electric shock clash paralysis leaves target with no action next turn", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 1, skills: ["skill_36_14343"] });
  seat(state, ids.B, { cakes: 1 });

  state = submitAll(state, {
    A: {
      type: "skill",
      skillId: "skill_36_14343",
      stacks: 1,
      targetId: ids.B,
      targetIds: [ids.B]
    },
    B: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.A }
  }, ids);
  state = drainActionWindows(state);

  assert.deepEqual(state.pendingActions[ids.B]?.actions, []);
  state = submitPlayerAction(state, ids.A, {
    type: "attack",
    attackId: "sha",
    stacks: 1,
    targetId: ids.B
  }).state;
  state = drainActionWindows(state);
  assert.equal(player(state, ids.B).hp, 5);
});

run("electric shock paralysis respects earth heart and holy realm", () => {
  const setup = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { skills: ["skill_36_14343"] });
  seat(state, ids.B, { skills: ["skill_39_77400"] });
  seat(state, ids.C, { skills: ["skill_75_68329"] });

  state = submitAll(state, {
    A: {
      type: "skill",
      skillId: "skill_36_14343",
      stacks: 1,
      targetId: ids.B,
      targetIds: [ids.B, ids.C]
    },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(buffStacks(player(state, ids.B), "defense_value"), 4);
  assert.equal(state.pendingActions[ids.B], undefined);
  assert.equal(state.pendingActions[ids.C], undefined);
});

run("qin versus sha uses normal clash when qin level is at least sha level", () => {
  const { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.A, { cakes: 2, skills: ["zhu_que_yu_shan"] });
  seat(state, ids.B, { cakes: 1 });

  const next = submitAll(state, {
    A: { type: "attack", attackId: "qin", stacks: 2, targetId: ids.B },
    B: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.A }
  }, ids);

  assert.equal(player(next, ids.B).hp, 2);
  assert.equal(player(next, ids.A).hp, 6);
});

run("sha versus qin uses clash damage and heals sha when sha level is higher", () => {
  const { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.A, { cakes: 2, hp: 5, skills: ["huo_yan_dao"] });
  seat(state, ids.B, { cakes: 1, skills: ["skill_51_92674"] });

  const next = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 2, targetId: ids.B },
    B: { type: "attack", attackId: "qin", stacks: 1, targetId: ids.A }
  }, ids);

  assert.equal(player(next, ids.B).hp, 1);
  assert.equal(player(next, ids.A).hp, 6);
});

run("test select mode preserves chosen skills and shows lobby selections", () => {
  let state = createGame("A", {
    firstTurnNoAttack: false,
    skillMode: "test_select",
    skillCount: 2
  });
  state = addPlayerToGame(state, createPlayer("B"));
  const ids = Object.fromEntries(state.players.map((item) => [item.name, item.id])) as PlayerMap;
  seat(state, ids.A, { skills: ["skill_88_62906", "skill_90_32911"] });
  seat(state, ids.B, { skills: ["skill_89_99375"] });

  const publicState = toPublicGameState(state, ids.A);
  assert.deepEqual(
    publicState.players.find((item) => item.id === ids.B)?.skills,
    ["skill_89_99375"]
  );

  const started = startGame(state);
  assert.equal(usesSkillActionWindows(started), true);
  assert.equal(started.phase, "action_window");
  assert.deepEqual(player(started, ids.A).skills, [
    "skill_88_62906",
    "skill_90_32911"
  ]);
  assert.deepEqual(player(started, ids.B).skills, ["skill_89_99375"]);
});

run("v3 exposure updates are reflected in the generated catalog", () => {
  assert.equal(getSkill("skill_8_89763")?.exposureTiming, "开局");
  assert.equal(getSkill("skill_18_34323")?.exposureTiming, "使用时");
  assert.equal(getSkill("skill_13_68869")?.attribute, "fire");
  assert.equal(getSkill("skill_14_46860")?.attribute, "ice");
  assert.equal(getSkill("skill_75_68329")?.attribute, undefined);
  assert.deepEqual(getSkill("skill_5_34881")?.typeTags, []);
  assert.deepEqual(getSkill("skill_6_503")?.typeTags, []);
  assert.deepEqual(getSkill("skill_7_35434")?.typeTags, []);
  assert.deepEqual(getSkill("skill_8_89763")?.typeTags, []);
  assert.deepEqual(getSkill("skill_9_93219")?.typeTags, []);
  assert.deepEqual(getSkill("skill_13_68869")?.typeTags, ["限定技"]);
  assert.deepEqual(getSkill("skill_14_46860")?.typeTags, ["限定技"]);
  assert.deepEqual(getSkill("skill_75_68329")?.typeTags, ["锁定技"]);
  assert.deepEqual(getSkill("skill_101_4254")?.typeTags, ["限定技"]);
  assert.deepEqual(getSkill("skill_111_51056")?.typeTags, ["限定技"]);
});

run("zailaiyici rerolls itself into an intro small skill", () => {
  const { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  const expectedSkillId = getSmallSkillIds()[0]!;
  seat(state, ids.A, { skills: ["skill_3_56718"] });

  const next = withMockedRandom(0, () =>
    submitActionWindowSkill(state, ids.A, {
      type: "skill",
      skillId: "skill_3_56718",
      stacks: 1
    })
  );

  assert.equal(player(next, ids.A).skills.includes("skill_3_56718"), false);
  assert.equal(player(next, ids.A).skills.includes(expectedSkillId), true);
  assert.equal(player(next, ids.A).revealedSkillIds.includes(expectedSkillId), false);
  assert.ok(
    next.eventLog.some(
      (event) =>
        event.type === "system" &&
        event.message.includes("再来一次变化")
    )
  );
});

run("shazi transforms into a declared small skill when nobody else has it", () => {
  const { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  const targetSkillId = pickIntroSkill(["skill_4_65637"]);
  seat(state, ids.A, { skills: ["skill_4_65637"] });
  seat(state, ids.B, { skills: ["skill_89_99375"] });

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_4_65637",
    stacks: 1,
    targetSkillId
  });

  assert.equal(player(next, ids.A).status, "alive");
  assert.equal(player(next, ids.A).skills.includes("skill_4_65637"), false);
  assert.equal(player(next, ids.A).skills.includes(targetSkillId), true);
  assert.equal(player(next, ids.A).revealedSkillIds.includes(targetSkillId), true);
});

run("shazi reveals duplicate skill and self-retires on collision", () => {
  const { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  const targetSkillId = pickIntroSkill(["skill_4_65637"]);
  seat(state, ids.A, { skills: ["skill_4_65637"] });
  seat(state, ids.B, { skills: [targetSkillId] });

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_4_65637",
    stacks: 1,
    targetSkillId
  });

  assert.equal(player(next, ids.A).status, "dead");
  assert.equal(player(next, ids.A).defeatLevel, 2);
  assert.equal(player(next, ids.A).hp, 6);
  assert.equal(player(next, ids.B).revealedSkillIds.includes(targetSkillId), true);
  assert.equal(
    next.eventLog.some(
      (event) =>
        event.type === "damage" &&
        event.targetId === ids.A &&
        event.attackName === "沙子变化失败"
    ),
    false
  );
  assert.equal(
    next.eventLog.some(
      (event) =>
        event.type === "player_died" &&
        event.playerId === ids.A &&
        event.defeatLevel === 2
    ),
    true
  );
});

run("skill guess reveals a correct small skill and triggers chuanyin", () => {
  const { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_109_65084"] });
  seat(state, ids.B, { skills: ["skill_87_44771"] });
  const turnEnd = reachTurnEndAction(state, ids);

  const next = guessPlayerSkill(turnEnd, ids.A, ids.B, "skill_87_44771");

  assert.equal(player(next, ids.B).revealedSkillIds.includes("skill_87_44771"), true);
  assert.equal(player(next, ids.A).revealedSkillIds.includes("skill_109_65084"), true);
  assert.equal(player(next, ids.B).hp, 4);
  assert.ok(
    next.eventLog.some(
      (event) =>
        event.type === "damage" &&
        event.sourceId === ids.A &&
        event.targetId === ids.B &&
        event.attackName === "传音入密"
    )
  );
});

run("wrong skill guess blocks another guess this turn", () => {
  const { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.B, { skills: ["skill_87_44771"] });
  const turnEnd = reachTurnEndAction(state, ids);
  const wrongSkillId = getSmallSkillIds().find((skillId) => skillId !== "skill_87_44771");
  assert.ok(wrongSkillId);

  const afterWrongGuess = guessPlayerSkill(turnEnd, ids.A, ids.B, wrongSkillId);

  assert.equal(
    player(afterWrongGuess, ids.A).buffs.some(
      (buff) => buff.id === `skill_guess_failed:${afterWrongGuess.turnNumber}`
    ),
    true
  );
  assert.throws(() =>
    guessPlayerSkill(afterWrongGuess, ids.A, ids.B, "skill_87_44771")
  );
});

run("mirror spell copies an exposed skill", () => {
  const { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_101_4254"] });
  seat(state, ids.B, { skills: ["skill_87_44771"] });
  player(state, ids.B).revealedSkillIds = ["skill_87_44771"];

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_101_4254",
    stacks: 1,
    targetId: ids.B,
    targetSkillId: "skill_87_44771"
  });

  assert.equal(player(next, ids.A).skills.includes("skill_87_44771"), true);
  assert.equal(player(next, ids.A).revealedSkillIds.includes("skill_87_44771"), true);
});

run("mirror spell can copy a duplicate skill, including from self", () => {
  const { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_101_4254", "skill_87_44771"] });
  player(state, ids.A).revealedSkillIds = ["skill_87_44771"];

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_101_4254",
    stacks: 1,
    targetId: ids.A,
    targetSkillId: "skill_87_44771"
  });

  assert.equal(
    player(next, ids.A).skills.filter((skillId) => skillId === "skill_87_44771").length,
    2
  );
});

run("seal locks an exposed skill without removing it, and mirror can still copy it", () => {
  const { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_5_34881", "skill_18_34323"] });
  seat(state, ids.B, { skills: ["skill_75_68329"] });
  seat(state, ids.C, { skills: ["skill_101_4254"] });
  player(state, ids.B).revealedSkillIds = ["skill_75_68329"];

  const sealed = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_5_34881",
    stacks: 1,
    targetId: ids.B,
    targetSkillId: "skill_75_68329"
  });

  assert.equal(player(sealed, ids.B).skills.includes("skill_75_68329"), true);
  assert.equal(player(sealed, ids.B).revealedSkillIds.includes("skill_75_68329"), true);
  assert.equal(
    player(sealed, ids.B).buffs.some((buff) => buff.id === "sealed_skill:skill_75_68329"),
    true
  );

  const mirrored = submitActionWindowSkill(sealed, ids.C, {
    type: "skill",
    skillId: "skill_101_4254",
    stacks: 1,
    targetId: ids.B,
    targetSkillId: "skill_75_68329"
  });
  assert.equal(player(mirrored, ids.C).skills.includes("skill_75_68329"), true);
});

run("seal rejects exposed skills without the locked type tag", () => {
  const { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_5_34881"] });
  seat(state, ids.B, { skills: ["skill_8_89763"] });
  player(state, ids.B).revealedSkillIds = ["skill_8_89763"];

  assert.throws(() =>
    submitActionWindowSkill(state, ids.A, {
      type: "skill",
      skillId: "skill_5_34881",
      stacks: 1,
      targetId: ids.B,
      targetSkillId: "skill_8_89763"
    })
  );
});

run("seal can be used once per target player", () => {
  const { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_5_34881"] });
  seat(state, ids.B, { skills: ["skill_75_68329"] });
  seat(state, ids.C, { skills: ["skill_22_54978"] });
  player(state, ids.B).revealedSkillIds = ["skill_75_68329"];
  player(state, ids.C).revealedSkillIds = ["skill_22_54978"];

  const afterB = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_5_34881",
    stacks: 1,
    targetId: ids.B,
    targetSkillId: "skill_75_68329"
  });
  const afterC = submitActionWindowSkill(afterB, ids.A, {
    type: "skill",
    skillId: "skill_5_34881",
    stacks: 1,
    targetId: ids.C,
    targetSkillId: "skill_22_54978"
  });

  assert.equal(
    player(afterC, ids.A).buffs.some((buff) => buff.id === `sealed_player:${ids.B}`),
    true
  );
  assert.equal(
    player(afterC, ids.A).buffs.some((buff) => buff.id === `sealed_player:${ids.C}`),
    true
  );
  const repeated = submitActionWindowSkill(afterC, ids.A, {
    type: "skill",
    skillId: "skill_5_34881",
    stacks: 1,
    targetId: ids.B,
    targetSkillId: "skill_75_68329"
  });
  assert.equal(
    player(repeated, ids.A).buffs.filter((buff) => buff.id === `sealed_player:${ids.B}`).length,
    1
  );
});

run("jingu blocks control skills before they can be used", () => {
  const { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_8_89763"] });
  seat(state, ids.B, { skills: ["skill_18_34323"] });
  player(state, ids.A).revealedSkillIds = ["skill_8_89763"];
  state.activeTimingPhase = "turn_change_action";

  assert.throws(() =>
    submitActionWindowSkill(state, ids.B, {
      type: "skill",
      skillId: "skill_18_34323",
      stacks: 1,
      targetId: ids.A
    })
  );
});

run("jingu reveals when it locks control skills out of the action list", () => {
  let state = createGame("A", {
    firstTurnNoAttack: false,
    skillMode: "test_select",
    skillCount: 1,
    turnTimeLimitSeconds: 45
  });
  state = addPlayerToGame(state, createPlayer("B"));
  const ids = Object.fromEntries(state.players.map((item) => [item.name, item.id]));
  seat(state, ids.A!, { skills: ["skill_8_89763"] });
  seat(state, ids.B!, { skills: ["skill_18_34323"] });

  const started = startGame(state);

  assert.equal(player(started, ids.A!).revealedSkillIds.includes("skill_8_89763"), true);
});

run("poe prevents jingu from blocking control skills", () => {
  const { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_8_89763"] });
  seat(state, ids.B, { skills: ["skill_18_34323"] });
  seat(state, ids.C, { skills: ["skill_9_93219"] });
  player(state, ids.A).revealedSkillIds = ["skill_8_89763"];
  state.activeTimingPhase = "turn_change_action";

  assert.doesNotThrow(() =>
    submitActionWindowSkill(state, ids.B, {
      type: "skill",
      skillId: "skill_18_34323",
      stacks: 1,
      targetId: ids.A
    })
  );
});

run("self-targeted attack, seal, and mirror are allowed", () => {
  const plain = makeGame(["A", "B"]);
  seat(plain.state, plain.ids.A, { cakes: 1 });
  const selfHit = submitAll(plain.state, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: plain.ids.A },
    B: { type: "gain_cake" }
  }, plain.ids);
  assert.equal(player(selfHit, plain.ids.A).hp, 5);

  const { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, {
    cakes: 1,
    skills: ["skill_5_34881", "skill_75_68329", "skill_101_4254"]
  });
  player(state, ids.A).revealedSkillIds = ["skill_75_68329"];

  const selfSeal = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_5_34881",
    stacks: 1,
    targetId: ids.A,
    targetSkillId: "skill_75_68329"
  });
  assert.equal(
    player(selfSeal, ids.A).buffs.some((buff) => buff.id === "sealed_skill:skill_75_68329"),
    true
  );

  const selfMirror = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_101_4254",
    stacks: 1,
    targetId: ids.A,
    targetSkillId: "skill_75_68329"
  });
  assert.equal(player(selfMirror, ids.A).status, "alive");
  assert.equal(
    player(selfMirror, ids.A).skills.filter((skillId) => skillId === "skill_75_68329").length,
    2
  );
});

run("full-force strike backlash triggers when blocked", () => {
  const { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.A, { skills: ["skill_27_23816"] });

  const next = submitAll(state, {
    A: { type: "skill", skillId: "skill_27_23816", stacks: 1, targetId: ids.B },
    B: { type: "defense", defense: "small" }
  }, ids);

  assert.equal(player(next, ids.A).hp, 3);
});

run("frostfall removes enemy fire skills", () => {
  const { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_14_46860"] });
  seat(state, ids.B, { skills: ["huo_yan_dao"] });

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_14_46860",
    stacks: 1
  });

  assert.equal(player(next, ids.B).skills.includes("huo_yan_dao"), false);
});

run("tengjia adds one to fire spell damage", () => {
  const { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_13_68869"] });
  seat(state, ids.B, { skills: ["skill_51_92674"] });

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_13_68869",
    stacks: 1
  });

  assert.equal(player(next, ids.B).hp, 4);
  assert.equal(player(next, ids.C).hp, 5);
});

run("tengjia adds one to fireball splash damage", () => {
  const game = makeGame(["A", "B", "C", "D"], {
    skillMode: "test_select",
    skillCount: 1
  });
  const { ids } = game;
  let { state } = game;
  seat(state, ids.A, { cakes: 2, skills: ["skill_78_18866"] });
  seat(state, ids.C, { skills: ["skill_51_92674"] });
  state = drainActionWindows(state);

  const next = drainActionWindows(submitAll(state, {
    A: { type: "skill", skillId: "skill_78_18866", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" },
    D: { type: "gain_cake" }
  }, ids));

  assert.equal(player(next, ids.B).hp, 2);
  assert.equal(player(next, ids.C).hp, 4);
  assert.equal(player(next, ids.D).hp, 6);
});

run("holy realm blocks burning earth damage and ice skill removal", () => {
  const { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_13_68869"] });
  seat(state, ids.B, { skills: ["skill_75_68329", "skill_22_54978"] });
  seat(state, ids.C, { skills: ["skill_22_54978"] });

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_13_68869",
    stacks: 1
  });

  assert.equal(player(next, ids.B).hp, 6);
  assert.equal(player(next, ids.B).skills.includes("skill_22_54978"), true);
  assert.equal(player(next, ids.C).hp, 4);
  assert.equal(player(next, ids.C).skills.includes("skill_22_54978"), false);
});

run("purification blocks other players' burning earth and ice skill removal", () => {
  const { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_13_68869"] });
  seat(state, ids.B, { skills: ["skill_7_35434", "skill_22_54978"] });
  seat(state, ids.C, { skills: ["skill_22_54978"] });

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_13_68869",
    stacks: 1
  });

  assert.equal(player(next, ids.B).hp, 6);
  assert.equal(player(next, ids.B).skills.includes("skill_22_54978"), true);
  assert.equal(player(next, ids.B).revealedSkillIds.includes("skill_7_35434"), true);
  assert.equal(player(next, ids.C).hp, 4);
  assert.equal(player(next, ids.C).skills.includes("skill_22_54978"), false);
});

run("divine protection blocks attack damage but not burning earth spell damage", () => {
  const attackGame = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let attackState = drainActionWindows(attackGame.state);
  seat(attackState, attackGame.ids.A, { cakes: 2 });
  seat(attackState, attackGame.ids.B, { skills: ["skill_32_19017"] });

  const attackNext = submitAll(attackState, {
    A: { type: "attack", attackId: "sha", stacks: 2, targetId: attackGame.ids.B },
    B: { type: "gain_cake" }
  }, attackGame.ids);
  assert.equal(player(attackNext, attackGame.ids.B).hp, 6);

  const spellGame = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(spellGame.state, spellGame.ids.A, { skills: ["skill_13_68869"] });
  seat(spellGame.state, spellGame.ids.B, { skills: ["skill_32_19017"] });

  const spellNext = submitActionWindowSkill(spellGame.state, spellGame.ids.A, {
    type: "skill",
    skillId: "skill_13_68869",
    stacks: 1
  });
  assert.equal(player(spellNext, spellGame.ids.B).hp, 5);
});

run("shapeless shield blocks adjacent attack damage but not lightning spell damage", () => {
  const attackGame = makeGame(["A", "B", "C", "D"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let attackState = drainActionWindows(attackGame.state);
  seat(attackState, attackGame.ids.A, { cakes: 2 });
  seat(attackState, attackGame.ids.B, { skills: ["skill_99_65551"] });

  const attackNext = submitAll(attackState, {
    A: { type: "attack", attackId: "sha", stacks: 2, targetId: attackGame.ids.B },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" },
    D: { type: "gain_cake" }
  }, attackGame.ids);
  assert.equal(player(attackNext, attackGame.ids.B).hp, 6);

  const spellGame = makeGame(["A", "B", "C", "D"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(spellGame.state, spellGame.ids.A, { skills: ["skill_35_16792"] });
  seat(spellGame.state, spellGame.ids.B, { hp: 6, skills: ["skill_99_65551"] });
  seat(spellGame.state, spellGame.ids.C, { hp: 5 });
  seat(spellGame.state, spellGame.ids.D, { hp: 3 });

  const spellNext = submitActionWindowSkill(spellGame.state, spellGame.ids.A, {
    type: "skill",
    skillId: "skill_35_16792",
    stacks: 1
  });
  assert.equal(player(spellNext, spellGame.ids.B).hp, 4);
  assert.equal(player(spellNext, spellGame.ids.C).hp, 3);
});

run("holy realm blocks frostfall healing and fire skill removal", () => {
  const { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_14_46860"] });
  seat(state, ids.B, { hp: 3, skills: ["skill_75_68329", "huo_yan_dao"] });
  seat(state, ids.C, { hp: 3, skills: ["huo_yan_dao"] });

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_14_46860",
    stacks: 1
  });

  assert.equal(player(next, ids.B).hp, 3);
  assert.equal(player(next, ids.B).skills.includes("huo_yan_dao"), true);
  assert.equal(player(next, ids.C).hp, 3);
  assert.equal(player(next, ids.C).skills.includes("huo_yan_dao"), false);
});

run("purification blocks other players' frostfall healing and fire skill removal", () => {
  const { state, ids } = makeGame(["A", "B", "C", "D"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_14_46860"] });
  seat(state, ids.B, { hp: 3, skills: ["skill_7_35434"] });
  seat(state, ids.C, { hp: 3, skills: ["skill_7_35434", "huo_yan_dao"] });
  seat(state, ids.D, { hp: 3, skills: ["huo_yan_dao"] });

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_14_46860",
    stacks: 1
  });

  assert.equal(player(next, ids.B).hp, 3);
  assert.equal(player(next, ids.B).revealedSkillIds.includes("skill_7_35434"), true);
  assert.equal(player(next, ids.C).hp, 3);
  assert.equal(player(next, ids.C).skills.includes("huo_yan_dao"), true);
  assert.equal(player(next, ids.C).revealedSkillIds.includes("skill_7_35434"), true);
  assert.equal(player(next, ids.D).hp, 3);
  assert.equal(player(next, ids.D).skills.includes("huo_yan_dao"), false);
});

run("purification does not stop mirror from copying its holder's exposed skill", () => {
  const { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_101_4254"] });
  seat(state, ids.B, { skills: ["skill_7_35434", "skill_75_68329"] });
  player(state, ids.B).revealedSkillIds = ["skill_75_68329"];

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_101_4254",
    stacks: 1,
    targetId: ids.B,
    targetSkillId: "skill_75_68329"
  });

  assert.equal(player(next, ids.A).skills.includes("skill_75_68329"), true);
});

run("balance redistributes hp across two selected targets", () => {
  const { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { hp: 6, skills: ["skill_111_51056"] });
  seat(state, ids.B, { hp: 4 });
  seat(state, ids.C, { hp: 3 });

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_111_51056",
    stacks: 1,
    targetId: ids.B,
    targetIds: [ids.B, ids.C]
  });

  assert.equal(player(next, ids.A).hp, 5);
  assert.equal(player(next, ids.B).hp, 4);
  assert.equal(player(next, ids.C).hp, 4);
});

run("purification makes balance fail completely when selected", () => {
  const { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { hp: 6, skills: ["skill_111_51056"] });
  seat(state, ids.B, { hp: 2, skills: ["skill_7_35434"] });
  seat(state, ids.C, { hp: 2 });

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_111_51056",
    stacks: 1,
    targetId: ids.B,
    targetIds: [ids.B, ids.C]
  });

  assert.equal(player(next, ids.A).hp, 6);
  assert.equal(player(next, ids.B).hp, 2);
  assert.equal(player(next, ids.C).hp, 2);
  assert.equal(player(next, ids.B).revealedSkillIds.includes("skill_7_35434"), true);
});

run("lethal damage opens a revival window before turn end", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 7 });
  seat(state, ids.B, { skills: ["skill_64_60978"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 7, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = advancePastTurnEndDamage(state);

  assert.equal(state.phase, "action_window");
  assert.equal(state.activeTimingPhase, "revival_action");
  assert.equal(player(state, ids.B).status, "alive");
  assert.equal(player(state, ids.B).hp, -1);
  assert.equal(buffStacks(player(state, ids.B), "pending_death"), 1);
  assert.ok((state.actionWindowDeadlineAt ?? 0) - Date.now() > (ACTION_WINDOW_SECONDS - 1) * 1000);
});

run("nonlethal damage proceeds to turn end after the damage point", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 1 });

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = advancePastTurnEndDamage(state);

  assert.equal(state.phase, "action_window");
  assert.equal(state.activeTimingPhase, "turn_end_action");
  assert.equal(player(state, ids.B).hp, 5);
});

run("healing spell revives to initial hp and respects holy bath", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 7 });
  seat(state, ids.B, { skills: ["skill_64_60978", "skill_67_31717"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 7, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = advancePastTurnEndDamage(state);
  state = submitActionWindowSkill(state, ids.B, {
    type: "skill",
    skillId: "skill_64_60978",
    stacks: 1
  });

  assert.equal(player(state, ids.B).status, "alive");
  assert.equal(player(state, ids.B).hp, 18);
  assert.equal(buffStacks(player(state, ids.B), "pending_death"), 0);
});

run("tianyou can heal alive players and revive from negative hp", () => {
  const alive = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(alive.state, alive.ids.A, { hp: 3, skills: ["skill_66_82448"] });
  const healed = submitActionWindowSkill(alive.state, alive.ids.A, {
    type: "skill",
    skillId: "skill_66_82448",
    stacks: 1
  });
  assert.equal(player(healed, alive.ids.A).hp, 9);

  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 7 });
  seat(state, ids.B, { skills: ["skill_66_82448"] });
  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 7, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = advancePastTurnEndDamage(state);
  state = submitActionWindowSkill(state, ids.B, {
    type: "skill",
    skillId: "skill_66_82448",
    stacks: 1
  });
  assert.equal(player(state, ids.B).hp, 7);
});

run("lishang revives from a fatal source and discards one exposed small skill", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 7, hp: 5, skills: ["skill_87_44771"] });
  seat(state, ids.B, { skills: ["skill_68_57581"] });
  player(state, ids.A).revealedSkillIds = ["skill_87_44771"];

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 7, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = advancePastTurnEndDamage(state);
  state = submitActionWindowSkill(state, ids.B, {
    type: "skill",
    skillId: "skill_68_57581",
    stacks: 1,
    targetId: ids.A,
    targetSkillId: "skill_87_44771"
  });

  assert.equal(player(state, ids.B).hp, 3);
  assert.equal(player(state, ids.A).hp, 2);
  assert.equal(player(state, ids.A).skills.includes("skill_87_44771"), false);
});

run("liehun blocks active and passive revivals from fatal damage sources", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 7, skills: ["skill_6_503"] });
  seat(state, ids.B, { skills: ["skill_66_82448", "skill_69_22138"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 7, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = advancePastTurnEndDamage(state);

  assert.equal(player(state, ids.A).revealedSkillIds.includes("skill_6_503"), true);
  assert.equal(state.activeTimingPhase, "revival_action");
  assert.equal(buffStacks(player(state, ids.B), "no_revive"), 1);
  assert.throws(() =>
    submitActionWindowSkill(state, ids.B, {
      type: "skill",
      skillId: "skill_66_82448",
      stacks: 1
    })
  );
  state = passAllActionWindowPlayers(state);
  assert.equal(player(state, ids.B).status, "dead");
});

run("absolute value at zero enters revival and can use tianyou", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 6 });
  seat(state, ids.B, { skills: ["skill_69_22138", "skill_66_82448"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 6, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = advancePastTurnEndDamage(state);

  assert.equal(state.activeTimingPhase, "revival_action");
  assert.equal(player(state, ids.B).hp, 0);
  state = submitActionWindowSkill(state, ids.B, {
    type: "skill",
    skillId: "skill_66_82448",
    stacks: 1
  });
  assert.equal(player(state, ids.B).hp, 6);
  assert.equal(buffStacks(player(state, ids.B), "pending_death"), 0);
});

run("fire rebirth revives from fire fatal damage and is a fire skill", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 7, skills: ["huo_yan_dao"] });
  seat(state, ids.B, { skills: ["skill_65_71994"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 7, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = advancePastTurnEndDamage(state);

  assert.equal(getSkill("skill_65_71994")?.attribute, "fire");
  assert.equal(player(state, ids.B).status, "alive");
  assert.equal(player(state, ids.B).hp, 6);
});

run("fire rebirth can trigger again on a later round fire fatal damage", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 7, skills: ["huo_yan_dao"] });
  seat(state, ids.B, { skills: ["skill_65_71994"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 7, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = advancePastTurnEndDamage(state);
  assert.equal(player(state, ids.B).hp, 6);

  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 7 });
  assert.notEqual(state.turnNumber, state.roundTurnNumber);

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 7, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = advancePastTurnEndDamage(state);

  assert.equal(player(state, ids.B).status, "alive");
  assert.equal(player(state, ids.B).hp, 6);
  assert.equal(buffStacks(player(state, ids.B), "pending_death"), 0);
});

run("death scythe heals from every fatal damage event separately", () => {
  let { state, ids } = makeGame(["A", "B", "C", "D"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 3 });
  seat(state, ids.C, { hp: 3, skills: ["skill_70_79685"] });
  seat(state, ids.D, { cakes: 4 });

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 3, targetId: ids.B },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" },
    D: { type: "attack", attackId: "sha", stacks: 4, targetId: ids.B }
  }, ids);
  state = advancePastTurnEndDamage(state);

  assert.equal(player(state, ids.B).status, "dead");
  assert.equal(player(state, ids.C).hp, 6);
});

run("skill reveal can trigger chuanyin damage once per player", () => {
  const { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.A, { skills: ["skill_109_65084"] });
  seat(state, ids.B, { cakes: 2, skills: ["skill_87_44771"] });

  const next = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "skill", skillId: "skill_87_44771", stacks: 1, targetId: ids.A }
  }, ids);

  assert.equal(player(next, ids.B).hp, 4);
  assert.equal(buffStacks(player(next, ids.A), `chuanyin_triggered:${ids.B}`), 1);
});

run("putian qin costs half a cake", () => {
  const { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.A, { cakes: 0.5, skills: ["skill_98_7182"] });

  const next = submitAll(state, {
    A: { type: "attack", attackId: "qin", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);

  assert.equal(player(next, ids.A).cakes, 0);
});

run("putian area attacks omit the farthest seats", () => {
  const four = makeGame(["A", "B", "C", "D"]);
  seat(four.state, four.ids.A, { cakes: 1, skills: ["skill_98_7182"] });
  let next = submitAll(four.state, {
    A: { type: "attack", attackId: "sha", stacks: 1 },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" },
    D: { type: "gain_cake" }
  }, four.ids);
  assert.equal(player(next, four.ids.B).hp, 5);
  assert.equal(player(next, four.ids.C).hp, 6);
  assert.equal(player(next, four.ids.D).hp, 5);

  const five = makeGame(["A", "B", "C", "D", "E"]);
  seat(five.state, five.ids.A, { cakes: 1, skills: ["skill_98_7182"] });
  next = submitAll(five.state, {
    A: { type: "attack", attackId: "sha", stacks: 1 },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" },
    D: { type: "gain_cake" },
    E: { type: "gain_cake" }
  }, five.ids);
  assert.equal(player(next, five.ids.B).hp, 5);
  assert.equal(player(next, five.ids.C).hp, 6);
  assert.equal(player(next, five.ids.D).hp, 6);
  assert.equal(player(next, five.ids.E).hp, 5);

  const six = makeGame(["A", "B", "C", "D", "E", "F"]);
  seat(six.state, six.ids.A, { cakes: 1, skills: ["skill_98_7182"] });
  next = submitAll(six.state, {
    A: { type: "attack", attackId: "sha", stacks: 1 },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" },
    D: { type: "gain_cake" },
    E: { type: "gain_cake" },
    F: { type: "gain_cake" }
  }, six.ids);
  assert.equal(player(next, six.ids.B).hp, 5);
  assert.equal(player(next, six.ids.C).hp, 5);
  assert.equal(player(next, six.ids.D).hp, 6);
  assert.equal(player(next, six.ids.E).hp, 5);
  assert.equal(player(next, six.ids.F).hp, 5);
});

run("shunshou lets the player choose one opening skill candidate", () => {
  let { state, ids } = makeGameWithAssignedSkills(["A", "B", "C"], {
    A: ["skill_100_45717"],
    B: ["skill_34_1533"],
    C: ["skill_33_55159"]
  });
  const crystalChoice = state.pendingSkillChoices?.find(
    (choice) => choice.playerId === ids.A && choice.skillId === "skill_33_55159"
  );
  assert.ok(crystalChoice);

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_100_45717",
    stacks: 1,
    targetSkillId: "skill_33_55159"
  });

  assert.equal(player(state, ids.A).skills.includes("skill_33_55159"), true);
  assert.equal(state.pendingSkillChoices?.some((choice) => choice.playerId === ids.A), undefined);
});

run("shunshou defaults to an opening candidate when skipped", () => {
  let { state, ids } = makeGameWithAssignedSkills(["A", "B", "C"], {
    A: ["skill_100_45717"],
    B: ["skill_34_1533"],
    C: ["skill_33_55159"]
  });

  state = drainActionWindows(state);

  assert.equal(player(state, ids.A).skills.length, 2);
  assert.equal(state.pendingSkillChoices?.some((choice) => choice.playerId === ids.A), undefined);
});

run("xieyu uses the selected round-end target before defaulting", () => {
  let { state, ids } = makeGameWithAssignedSkills(["A", "B", "C"], {
    A: ["skill_72_53933"]
  });
  state = drainActionWindows(state);
  state.roundNumber = 3;
  seat(state, ids.B, { cakes: 1 });

  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.C },
    C: { type: "gain_cake" }
  }, ids);
  state = advancePastTurnEndDamage(state);
  assert.equal(state.activeTimingPhase, "turn_end_action");

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_72_53933",
    stacks: 1,
    targetId: ids.B
  });
  state = drainActionWindows(state);

  assert.equal(player(state, ids.A).hp, 7);
  assert.equal(player(state, ids.B).hp, 5);
  assert.equal(player(state, ids.C).hp, 5);
});

run("shen yin hong lian heals only exactly zero hp", () => {
  const zero = makeGame(["A", "B"]);
  seat(zero.state, zero.ids.A, { hp: 1, skills: ["skill_23_90895"] });
  seat(zero.state, zero.ids.B, { cakes: 1 });
  const healed = submitAll(zero.state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "sha", stacks: 1, targetId: zero.ids.A }
  }, zero.ids);
  assert.equal(player(healed, zero.ids.A).hp, 1);

  const negative = makeGame(["A", "B"]);
  seat(negative.state, negative.ids.A, { hp: 1, skills: ["skill_23_90895"] });
  seat(negative.state, negative.ids.B, { cakes: 2 });
  const dead = submitAll(negative.state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "sha", stacks: 2, targetId: negative.ids.A }
  }, negative.ids);
  assert.equal(player(dead, negative.ids.A).status, "dead");
});

run("absolute value zero death takes priority over shenyin skills", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 3
  });
  state = drainActionWindows(state);
  seat(state, ids.A, {
    cakes: 3,
    skills: ["skill_69_22138", "skill_23_90895", "skill_24_71363"]
  });
  seat(state, ids.B, { cakes: 6 });

  state = submitAll(state, {
    A: { type: "defense", defense: "youtiao" },
    B: { type: "attack", attackId: "sha", stacks: 6, targetId: ids.A }
  }, ids);
  state = advancePastTurnEndDamage(state);

  assert.equal(player(state, ids.A).hp, 0);
  assert.equal(player(state, ids.A).status, "dead");
  assert.equal(
    state.eventLog.some(
      (event) => event.type === "heal" && event.reason === "神隐红莲"
    ),
    false
  );
});

run("infinite war spirit keeps negative hp without healing", () => {
  const { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.A, { hp: 1, skills: ["skill_113_88141"] });
  seat(state, ids.B, { cakes: 2 });

  const next = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "sha", stacks: 2, targetId: ids.A }
  }, ids);

  assert.equal(player(next, ids.A).status, "alive");
  assert.equal(player(next, ids.A).hp, -1);
  assert.equal(buffStacks(player(next, ids.A), "war_spirit"), 1);
});

run("zhong keeps only one active shield at a time", () => {
  const { state, ids } = makeGame(["A", "B", "C"]);
  seat(state, ids.A, { cakes: 2, skills: ["skill_85_26345"] });

  const first = submitAll(state, {
    A: { type: "skill", skillId: "skill_85_26345", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" }
  }, ids);
  seat(first, ids.A, { cakes: 1 });
  const second = submitAll(first, {
    A: { type: "skill", skillId: "skill_85_26345", stacks: 1, targetId: ids.C },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" }
  }, ids);
  const shields = player(second, ids.A).buffs.filter((buff) => buff.id === "jin_zhong_zhao");

  assert.equal(shields.length, 1);
  assert.equal(shields[0]?.sourcePlayerId, ids.C);
});

run("frost blade hit causes no damage but forces a round restart and disables target skills", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { cakes: 1, skills: ["skill_18_34323"] });
  seat(state, ids.B, { skills: ["skill_61_59049"] });
  state = drainActionWindows(state);
  state = submitPlayerAction(state, ids.A, {
    type: "attack",
    attackId: "sha",
    stacks: 1,
    targetId: ids.B
  }).state;
  state = submitPlayerAction(state, ids.B, { type: "gain_cake" }).state;
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_18_34323",
    stacks: 1
  });
  state = advancePastTurnEndDamage(state);

  assert.equal(player(state, ids.B).hp, 6);
  assert.equal(state.activeTimingPhase, "turn_end_action");
  state = advanceActionWindow(state);
  assert.equal(state.roundNumber, 2);
  assert.equal(
    player(state, ids.B).buffs.some((buff) => buff.id.startsWith("skill_disabled_until_round:")),
    true
  );
});

run("frost blade nullifies final clash damage after fire and tengjia adjustments", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 3
  });
  seat(state, ids.A, {
    cakes: 2,
    skills: ["skill_18_34323", "huo_yan_dao", "skill_34_1533"]
  });
  seat(state, ids.B, { cakes: 1, skills: ["skill_51_92674"] });
  state = drainActionWindows(state);
  state = submitPlayerAction(state, ids.A, {
    type: "attack",
    attackId: "sha",
    stacks: 2,
    targetId: ids.B
  }).state;
  state = submitPlayerAction(state, ids.B, {
    type: "attack",
    attackId: "sha",
    stacks: 1,
    targetId: ids.A
  }).state;
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_18_34323",
    stacks: 1
  });
  state = advancePastTurnEndDamage(state);

  assert.equal(player(state, ids.B).hp, 6);
  assert.equal(
    state.eventLog.some(
      (event) => event.type === "damage" && event.targetId === ids.B
    ),
    false
  );
  assert.equal(
    state.eventLog.some(
      (event) =>
        event.type === "system" &&
        event.message.includes("原本 5 点") &&
        event.message.includes("归零")
    ),
    true
  );
  assert.equal(
    player(state, ids.B).buffs.some((buff) => buff.id.startsWith("skill_disabled_until_round:")),
    true
  );
});

run("disabled skills can be used and paid for but produce no effect", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { cakes: 1, skills: ["skill_18_34323"] });
  seat(state, ids.B, { skills: ["skill_61_59049"] });
  state = drainActionWindows(state);
  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_18_34323",
    stacks: 1
  });
  state = advancePastTurnEndDamage(state);
  state = advanceActionWindow(state);
  state = drainActionWindows(state);
  seat(state, ids.B, { cakes: 1 });

  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "skill", skillId: "skill_61_59049", stacks: 1 }
  }, ids);

  assert.equal(player(state, ids.B).cakes, 0);
});

run("shenyin qinglian requires zero hp, costs three cakes, heals, and grants next-round cake", () => {
  const invalid = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(invalid.state, invalid.ids.A, { hp: 1, cakes: 3, skills: ["skill_24_71363"] });
  assert.throws(() =>
    submitActionWindowSkill(invalid.state, invalid.ids.A, {
      type: "skill",
      skillId: "skill_24_71363",
      stacks: 1
    })
  );

  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { hp: 0, cakes: 3, skills: ["skill_24_71363"] });

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_24_71363",
    stacks: 1
  });

  assert.equal(player(state, ids.A).hp, 3);
  assert.equal(player(state, ids.A).cakes, 0);
  assert.equal(state.roundNumber, 1);
  assert.equal(state.activeTimingPhase, "round_pre_interval_action");

  state = drainActionWindows(state);
  seat(state, ids.B, { cakes: 1 });
  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.A }
  }, ids);
  state = drainActionWindows(state);
  assert.equal(state.roundNumber, 2);
  assert.equal(player(state, ids.A).cakes, 1);
});

run("coagulation power grants next round-start cakes from previous round damage capped at four", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 2
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { skills: ["skill_47_94841", "skill_47_94841"] });
  seat(state, ids.B, { cakes: 4 });

  state = submitAll(state, {
    A: { type: "defense", defense: "youtiao" },
    B: { type: "attack", attackId: "qin", stacks: 2, targetId: ids.A }
  }, ids);
  state = advancePastTurnEndDamage(state);

  assert.equal(player(state, ids.A).hp, 0);
  assert.equal(buffStacks(player(state, ids.A), "damage_taken_round:1"), 6);
  state = advanceActionWindow(state);
  assert.equal(state.roundNumber, 2);

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_47_94841",
    stacks: 1
  });
  assert.throws(() =>
    submitActionWindowSkill(state, ids.A, {
      type: "skill",
      skillId: "skill_47_94841",
      stacks: 1
    })
  );
  state = advanceActionWindow(state);
  state = advanceActionWindow(state);

  assert.equal(player(state, ids.A).cakes, 4);
});

run("same fate deals current turn damage at turn end and can repeat while uses remain", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { skills: ["skill_115_74459"] });
  seat(state, ids.B, { cakes: 3 });

  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "sha", stacks: 3, targetId: ids.A }
  }, ids);
  state = advancePastTurnEndDamage(state);

  assert.equal(state.activeTimingPhase, "turn_end_action");
  assert.equal(player(state, ids.A).hp, 3);
  assert.equal(buffStacks(player(state, ids.A), "damage_taken_round:1"), 3);

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_115_74459",
    stacks: 1,
    targetId: ids.B
  });

  assert.equal(player(state, ids.A).hp, 3);
  assert.equal(player(state, ids.B).hp, 3);
  assert.equal(
    state.eventLog.some(
      (event) =>
        event.type === "damage" &&
        event.sourceId === ids.A &&
        event.targetId === ids.B &&
        event.amount === 3 &&
        event.attackName === "同生共死"
    ),
    true
  );
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_115_74459",
    stacks: 1,
    targetId: ids.B
  });
  assert.equal(player(state, ids.B).hp, 0);
  assert.equal(buffStacks(player(state, ids.A), "skill_used:skill_115_74459"), 2);
});

run("douzhuan redirects spell damage before it is applied", () => {
  let { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_13_68869"] });
  seat(state, ids.B, { skills: ["skill_94_627"] });

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_13_68869",
    stacks: 1
  });

  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  const damage = state.pendingDamageItems?.find((item) => item.targetId === ids.B);
  assert.ok(damage);
  assert.equal(damage.amount, 1);
  assert.equal(player(state, ids.B).hp, 6);

  state = submitActionWindowSkill(state, ids.B, {
    type: "skill",
    skillId: "skill_94_627",
    stacks: 1,
    targetId: ids.C,
    targetDamageId: damage.id
  });
  state = advanceActionWindow(state);

  assert.equal(player(state, ids.B).hp, 6);
  assert.equal(player(state, ids.C).hp, 4);
});

run("douzhuan can be chained by the redirected target", () => {
  let { state, ids } = makeGame(["A", "B", "C", "D"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 2 });
  seat(state, ids.B, { skills: ["skill_94_627"] });
  seat(state, ids.D, { skills: ["skill_94_627"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "qin", stacks: 1, targetId: ids.D },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" },
    D: { type: "gain_cake" }
  }, ids);
  state = advanceActionWindow(state);

  const firstDamage = state.pendingDamageItems?.find((item) => item.targetId === ids.D);
  assert.ok(firstDamage);
  state = submitActionWindowSkill(state, ids.D, {
    type: "skill",
    skillId: "skill_94_627",
    stacks: 1,
    targetId: ids.B,
    targetDamageId: firstDamage.id
  });

  const redirectedDamage = state.pendingDamageItems?.find((item) => item.targetId === ids.B);
  assert.ok(redirectedDamage);
  assert.equal(state.actionWindowPassPlayerIds.includes(ids.B), false);
  state = submitActionWindowSkill(state, ids.B, {
    type: "skill",
    skillId: "skill_94_627",
    stacks: 1,
    targetId: ids.C,
    targetDamageId: redirectedDamage.id
  });
  state = advanceActionWindow(state);

  assert.equal(player(state, ids.D).hp, 6);
  assert.equal(player(state, ids.B).hp, 6);
  assert.equal(player(state, ids.C).hp, 3);
});

run("douzhuan cannot redirect fire attack damage after tengjia raises it above three", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 3
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 1, skills: ["huo_yan_dao", "skill_34_1533"] });
  seat(state, ids.B, { skills: ["skill_51_92674", "skill_94_627"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = advanceActionWindow(state);

  assert.equal(state.activeTimingPhase, "turn_end_action");
  assert.equal(player(state, ids.B).hp, 2);
  assert.equal(state.pendingDamageItems?.length ?? 0, 0);
});

run("ice rain mark can be spent on one matching pending damage", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { skills: ["skill_20_63089"] });
  seat(state, ids.B, { cakes: 2 });
  player(state, ids.B).buffs.push({
    id: `ice_rain:${ids.A}`,
    name: "冰雨：A",
    stacks: 1,
    sourcePlayerId: ids.A
  });

  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "qin", stacks: 1, targetId: ids.A }
  }, ids);
  state = advanceActionWindow(state);
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  const damage = state.pendingDamageItems?.find((item) => item.targetId === ids.A);
  assert.ok(damage);

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_20_63089",
    stacks: 1,
    targetDamageId: damage.id
  });
  state = drainActionWindows(state);

  assert.equal(player(state, ids.A).hp, 5);
  assert.equal(player(state, ids.B).buffs.some((buff) => buff.id === `ice_rain:${ids.A}`), false);
});

run("huyou mark halves a selected pending damage", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { skills: ["skill_73_76567"] });
  seat(state, ids.B, { cakes: 2 });
  player(state, ids.A).buffs.push({ id: "huyou_mark", name: "护佑印记", stacks: 1 });

  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "qin", stacks: 1, targetId: ids.A }
  }, ids);
  state = advanceActionWindow(state);
  const damage = state.pendingDamageItems?.find((item) => item.targetId === ids.A);
  assert.ok(damage);

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_73_76567",
    stacks: 1,
    targetDamageId: damage.id
  });
  state = drainActionWindows(state);

  assert.equal(player(state, ids.A).hp, 5);
  assert.equal(buffStacks(player(state, ids.A), "huyou_mark"), 1);
});

run("cross mark doubles adjacent pending damage", () => {
  let { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { skills: ["skill_73_76567"] });
  seat(state, ids.B, { cakes: 2 });
  player(state, ids.A).buffs.push({ id: "cross_mark", name: "十字印记", stacks: 1 });

  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "qin", stacks: 1, targetId: ids.C },
    C: { type: "gain_cake" }
  }, ids);
  state = advanceActionWindow(state);
  const damage = state.pendingDamageItems?.find((item) => item.targetId === ids.C);
  assert.ok(damage);

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_73_76567",
    stacks: 1,
    targetDamageId: damage.id
  });
  state = drainActionWindows(state);

  assert.equal(player(state, ids.C).hp, 0);
  assert.equal(buffStacks(player(state, ids.A), "cross_mark"), 0);
});

run("collapse removes skill opportunities until the next round end and rechecks disabled passives", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_10_9488"] });
  seat(state, ids.B, { hp: 1, skills: ["skill_69_22138", "skill_61_59049"] });

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_10_9488",
    stacks: 1
  });

  assert.equal(state.roundNumber, 2);
  assert.equal(state.phase, "collecting_actions");
  assert.equal(
    state.players.every((item) =>
      item.status !== "alive" ||
      item.buffs.some((buff) => buff.id === "collapse_until_round:2")
    ),
    true
  );
  assert.throws(() =>
    submitPlayerAction(state, ids.B, {
      type: "skill",
      skillId: "skill_61_59049",
      stacks: 1
    })
  );

  seat(state, ids.A, { cakes: 1 });
  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);

  assert.equal(player(state, ids.B).hp, 0);
  assert.equal(player(state, ids.B).status, "dead");
  assert.equal(
    state.players.some((item) =>
      item.buffs.some((buff) => buff.id.startsWith("collapse_until_round:"))
    ),
    false
  );
});

run("collapse preemptive restart refunds limited skills used as the submitted action", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { skills: ["skill_95_91337"] });
  seat(state, ids.B, { skills: ["skill_10_9488"] });

  state = submitAll(state, {
    A: { type: "skill", skillId: "skill_95_91337", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  assert.equal(state.phase, "action_window");
  assert.equal(state.activeTimingPhase, "turn_change_action");
  assert.equal(buffStacks(player(state, ids.A), "skill_used:skill_95_91337"), 1);

  state = submitActionWindowSkill(state, ids.B, {
    type: "skill",
    skillId: "skill_10_9488",
    stacks: 1
  });

  assert.equal(state.roundNumber, 2);
  assert.equal(buffStacks(player(state, ids.A), "skill_used:skill_95_91337"), 0);
  assert.equal(buffStacks(player(state, ids.B), "skill_used:skill_10_9488"), 1);
});

run("collapse resolves the current round end before suppressing sanctuary", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_10_9488"] });
  seat(state, ids.B, { hp: 3, skills: ["skill_71_40087"] });
  state.roundNumber = 3;

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_10_9488",
    stacks: 1
  });

  assert.equal(state.roundNumber, 4);
  assert.equal(player(state, ids.B).hp, 6);
  assert.equal(
    player(state, ids.B).buffs.some((buff) => buff.id === "collapse_until_round:4"),
    true
  );
});

run("collapse suppresses sanctuary at the next round end before clearing", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_10_9488"] });
  seat(state, ids.B, { hp: 3, skills: ["skill_71_40087"] });
  state.roundNumber = 2;

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_10_9488",
    stacks: 1
  });

  assert.equal(state.roundNumber, 3);
  assert.equal(player(state, ids.B).hp, 3);
  assert.equal(
    player(state, ids.B).buffs.some((buff) => buff.id === "collapse_until_round:3"),
    true
  );

  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 1 });
  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);

  assert.equal(player(state, ids.B).hp, 2);
  assert.equal(
    state.players.some((item) =>
      item.buffs.some((buff) => buff.id.startsWith("collapse_until_round:"))
    ),
    false
  );
});

run("purifying wind alternates odd then even hp targets", () => {
  let { state, ids } = makeGame(["A", "B", "C", "D"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_15_64971"] });
  seat(state, ids.B, { hp: 5 });
  seat(state, ids.C, { hp: 4 });
  seat(state, ids.D, { hp: 3 });

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_15_64971",
    stacks: 1
  });

  assert.equal(player(state, ids.B).hp, 4);
  assert.equal(player(state, ids.C).hp, 4);
  assert.equal(player(state, ids.D).hp, 2);

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_15_64971",
    stacks: 1
  });

  assert.equal(player(state, ids.B).hp, 3);
  assert.equal(player(state, ids.C).hp, 3);
  assert.equal(player(state, ids.D).hp, 1);
  assert.equal(buffStacks(player(state, ids.A), "skill_used:skill_15_64971"), 2);
});

run("lightning spell auto locks unique highest and second highest hp targets", () => {
  let { state, ids } = makeGame(["A", "B", "C", "D"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_35_16792"] });
  seat(state, ids.B, { hp: 6 });
  seat(state, ids.C, { hp: 5 });
  seat(state, ids.D, { hp: 3 });

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_35_16792",
    stacks: 1
  });

  assert.equal(player(state, ids.B).hp, 4);
  assert.equal(player(state, ids.C).hp, 3);
  assert.equal(player(state, ids.D).hp, 3);
  assert.equal(
    state.eventLog.some(
      (event) =>
        event.type === "damage" &&
        event.targetId === ids.B &&
        event.elements?.includes("electric")
    ),
    true
  );
});

run("lightning spell locks highest target and chooses among tied second highest", () => {
  const { state, ids } = makeGame(["A", "B", "C", "D"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_35_16792"] });
  seat(state, ids.B, { hp: 6 });
  seat(state, ids.C, { hp: 4 });
  seat(state, ids.D, { hp: 4 });

  assert.throws(() =>
    submitActionWindowSkill(state, ids.A, {
      type: "skill",
      skillId: "skill_35_16792",
      stacks: 1,
      targetIds: [ids.C, ids.D]
    })
  );

  const next = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_35_16792",
    stacks: 1,
    targetId: ids.B,
    targetIds: [ids.B, ids.D]
  });

  assert.equal(player(next, ids.B).hp, 4);
  assert.equal(player(next, ids.C).hp, 4);
  assert.equal(player(next, ids.D).hp, 2);
});

run("lightning spell chooses any two targets when at least three players tie for highest hp", () => {
  let { state, ids } = makeGame(["A", "B", "C", "D"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_35_16792"] });
  seat(state, ids.B, { hp: 6 });
  seat(state, ids.C, { hp: 6 });
  seat(state, ids.D, { hp: 6 });

  assert.throws(() =>
    submitActionWindowSkill(state, ids.A, {
      type: "skill",
      skillId: "skill_35_16792",
      stacks: 1,
      targetIds: [ids.B, ids.B]
    })
  );

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_35_16792",
    stacks: 1,
    targetId: ids.B,
    targetIds: [ids.B, ids.C]
  });

  assert.equal(player(state, ids.B).hp, 4);
  assert.equal(player(state, ids.C).hp, 4);
  assert.equal(player(state, ids.D).hp, 6);
});

run("juanzi causes retire instead of damage and does not trigger healing watchers", () => {
  let { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 2
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { hp: 3, skills: ["skill_95_91337", "skill_46_3651"] });
  seat(state, ids.C, { hp: 3, skills: ["skill_70_79685"] });

  state = submitAll(state, {
    A: { type: "skill", skillId: "skill_95_91337", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" },
    C: { type: "gain_cake" }
  }, ids);
  state = advancePastTurnEndDamage(state);

  assert.equal(player(state, ids.B).status, "dead");
  assert.equal(player(state, ids.B).defeatLevel, 2);
  assert.equal(player(state, ids.B).hp, 6);
  assert.equal(player(state, ids.A).hp, 3);
  assert.equal(player(state, ids.C).hp, 3);
  assert.equal(
    state.eventLog.some(
      (event) => event.type === "damage" && event.targetId === ids.B
    ),
    false
  );
});

run("ghost shield cannot block juanzi retire", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 2
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { skills: ["skill_95_91337"] });
  seat(state, ids.B, { skills: ["skill_56_42637"] });

  state = submitAll(state, {
    A: { type: "skill", skillId: "skill_95_91337", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = submitActionWindowSkill(state, ids.B, {
    type: "skill",
    skillId: "skill_56_42637",
    stacks: 1
  });
  state = advancePastTurnEndDamage(state);

  assert.equal(player(state, ids.B).status, "dead");
  assert.equal(player(state, ids.B).defeatLevel, 2);
});

run("thunder crack sunset applies electric retire effect and respects electric immunity", () => {
  let { state, ids } = makeGame(["A", "B", "C", "D", "E"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_107_53513"] });
  seat(state, ids.B, { hp: 3 });
  seat(state, ids.C, { hp: 3, skills: ["skill_39_77400"] });
  seat(state, ids.D, { hp: 3, skills: ["skill_75_68329"] });
  seat(state, ids.E, { hp: 4 });

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_107_53513",
    stacks: 1
  });

  assert.equal(player(state, ids.B).hp, 3);
  assert.equal(player(state, ids.B).status, "dead");
  assert.equal(player(state, ids.B).defeatLevel, 2);
  assert.equal(player(state, ids.C).hp, 3);
  assert.equal(buffStacks(player(state, ids.C), "defense_value"), 4);
  assert.equal(player(state, ids.D).hp, 3);
  assert.equal(player(state, ids.E).hp, 4);
  assert.equal(
    state.eventLog.some(
      (event) =>
        event.type === "damage" &&
        event.targetId === ids.B
    ),
    false
  );
  assert.equal(
    state.eventLog.some(
      (event) =>
        event.type === "player_died" &&
        event.playerId === ids.B &&
        event.defeatLevel === 2
    ),
    true
  );
});

run("double edge ignores only the selected attack's defensive action", () => {
  const setup = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 4, skills: ["skill_31_80497"] });
  seat(state, ids.C, { cakes: 4 });

  state = submitAll(state, {
    A: { type: "attack", attackId: "shan_dian", stacks: 1, targetId: ids.B },
    B: { type: "defense", defense: "youtiao" },
    C: { type: "attack", attackId: "shan_dian", stacks: 1, targetId: ids.B }
  }, ids);
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_31_80497",
    stacks: 1,
    switchActionIndex: 0
  });
  state = drainActionWindows(state);

  assert.equal(player(state, ids.A).hp, 5);
  assert.equal(player(state, ids.B).hp, 2);
  assert.equal(
    state.eventLog.filter(
      (event) =>
        event.type === "damage" &&
        event.targetId === ids.B &&
        event.sourceId === ids.A
    ).length,
    1
  );
  assert.equal(
    state.eventLog.filter(
      (event) =>
        event.type === "damage" &&
        event.targetId === ids.B &&
        event.sourceId === ids.C
    ).length,
    0
  );
});

run("double edge pays its hp cost even when later electric immunity blocks damage", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 4, skills: ["skill_31_80497"] });
  seat(state, ids.B, { skills: ["skill_39_77400"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "shan_dian", stacks: 1, targetId: ids.B },
    B: { type: "defense", defense: "youtiao" }
  }, ids);
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_31_80497",
    stacks: 1,
    switchActionIndex: 0
  });
  state = drainActionWindows(state);

  assert.equal(player(state, ids.A).hp, 5);
  assert.equal(player(state, ids.B).hp, 6);
  assert.equal(buffStacks(player(state, ids.B), "defense_value"), 4);
});

run("double edge cannot ignore rebound or globally nullified attacks", () => {
  const rebound = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let reboundState = drainActionWindows(rebound.state);
  seat(reboundState, rebound.ids.A, { cakes: 4, skills: ["skill_31_80497"] });
  seat(reboundState, rebound.ids.B, { cakes: 1 });
  reboundState = submitAll(reboundState, {
    A: { type: "attack", attackId: "shan_dian", stacks: 1, targetId: rebound.ids.B },
    B: { type: "defense", defense: "rebound", targetId: rebound.ids.A }
  }, rebound.ids);
  assert.throws(() =>
    submitActionWindowSkill(reboundState, rebound.ids.A, {
      type: "skill",
      skillId: "skill_31_80497",
      stacks: 1,
      switchActionIndex: 0
    })
  );

  const globalBlock = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let blockedState = drainActionWindows(globalBlock.state);
  seat(blockedState, globalBlock.ids.A, { cakes: 4, skills: ["skill_31_80497"] });
  seat(blockedState, globalBlock.ids.C, { skills: ["skill_42_94266"] });
  blockedState = submitAll(blockedState, {
    A: { type: "attack", attackId: "shan_dian", stacks: 1, targetId: globalBlock.ids.B },
    B: { type: "defense", defense: "youtiao" },
    C: { type: "gain_cake" }
  }, globalBlock.ids);
  assert.throws(() =>
    submitActionWindowSkill(blockedState, globalBlock.ids.A, {
      type: "skill",
      skillId: "skill_31_80497",
      stacks: 1,
      switchActionIndex: 0
    })
  );
});

run("qinggang sword does not ignore holy realm", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 4, skills: ["skill_30_38815"] });
  seat(state, ids.B, { skills: ["skill_75_68329"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "shan_dian", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).hp, 6);
});

run("qinggang sword still ignores divine protection", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 1, skills: ["skill_30_38815"] });
  seat(state, ids.B, { skills: ["skill_32_19017"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).hp, 5);
});

run("qinggang sword ignores defense switches only for its holder's attack", () => {
  const setup = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 1, skills: ["skill_30_38815"] });
  seat(state, ids.B, { cakes: 1, skills: ["skill_88_62906"] });
  seat(state, ids.C, { cakes: 1 });

  state = submitAll(state, {
    A: { type: "attack", attackId: "qin", stacks: 1, targetId: ids.B },
    B: { type: "defense", defense: "youtiao" },
    C: { type: "attack", attackId: "qin", stacks: 1, targetId: ids.B }
  }, ids);
  state = submitActionWindowSkill(state, ids.B, {
    type: "skill",
    skillId: "skill_88_62906",
    stacks: 1,
    switchActionIndex: 0,
    switchToAction: { type: "defense", defense: "small" }
  });
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).hp, 3);
  assert.equal(
    state.eventLog.filter(
      (event) =>
        event.type === "damage" &&
        event.targetId === ids.B &&
        event.sourceId === ids.A
    ).length,
    1
  );
  assert.equal(
    state.eventLog.filter(
      (event) =>
        event.type === "damage" &&
        event.targetId === ids.B &&
        event.sourceId === ids.C
    ).length,
    0
  );
});

run("double edge can ignore multiple defended area targets one at a time", () => {
  const setup = makeGame(["A", "B", "C", "D"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = drainActionWindows(setup.state);
  const { ids } = setup;
  seat(state, ids.A, { cakes: 2, skills: ["skill_31_80497"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "wan_jian", stacks: 1 },
    B: { type: "defense", defense: "small" },
    C: { type: "defense", defense: "youtiao" },
    D: { type: "defense", defense: "stone" }
  }, ids);
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_31_80497",
    stacks: 1,
    switchActionIndex: 0
  });
  for (const targetId of [ids.B, ids.C, ids.D]) {
    if (targetId === ids.B) {
      continue;
    }
    state = submitActionWindowSkill(state, ids.A, {
      type: "skill",
      skillId: "skill_31_80497",
      stacks: 1,
      switchActionIndex: 0,
      targetId
    });
  }
  state = drainActionWindows(state);

  assert.equal(player(state, ids.A).hp, 3);
  assert.equal(player(state, ids.B).hp, 4);
  assert.equal(player(state, ids.C).hp, 4);
  assert.equal(player(state, ids.D).hp, 4);
});

run("double edge can ignore cake defense and survives later defense switches", () => {
  const cake = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let cakeState = drainActionWindows(cake.state);
  seat(cakeState, cake.ids.A, { cakes: 7, skills: ["skill_31_80497"] });
  cakeState = submitAll(cakeState, {
    A: { type: "attack", attackId: "chao_he_bao", stacks: 1, targetId: cake.ids.B },
    B: { type: "gain_cake" }
  }, cake.ids);
  cakeState = submitActionWindowSkill(cakeState, cake.ids.A, {
    type: "skill",
    skillId: "skill_31_80497",
    stacks: 1,
    switchActionIndex: 0,
    targetId: cake.ids.B
  });
  cakeState = drainActionWindows(cakeState);
  assert.equal(player(cakeState, cake.ids.A).hp, 5);
  assert.equal(
    cakeState.eventLog.some(
      (event) =>
        event.type === "damage" &&
        event.targetId === cake.ids.B &&
        event.amount === 7
    ),
    true
  );

  const switched = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let switchedState = drainActionWindows(switched.state);
  seat(switchedState, switched.ids.A, { cakes: 2, skills: ["skill_31_80497"] });
  seat(switchedState, switched.ids.B, { cakes: 1, skills: ["skill_88_62906"] });
  switchedState = submitAll(switchedState, {
    A: { type: "attack", attackId: "wan_jian", stacks: 1 },
    B: { type: "defense", defense: "small" }
  }, switched.ids);
  switchedState = submitActionWindowSkill(switchedState, switched.ids.A, {
    type: "skill",
    skillId: "skill_31_80497",
    stacks: 1,
    switchActionIndex: 0,
    targetId: switched.ids.B
  });
  switchedState = submitActionWindowSkill(switchedState, switched.ids.B, {
    type: "skill",
    skillId: "skill_88_62906",
    stacks: 1,
    switchActionIndex: 0,
    switchToAction: { type: "defense", defense: "youtiao" }
  });
  switchedState = drainActionWindows(switchedState);
  assert.equal(player(switchedState, switched.ids.A).hp, 5);
  assert.equal(player(switchedState, switched.ids.B).hp, 4);
});

run("liegong crosses attacks without clash or last-hit effects", () => {
  const { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 2
  });
  let next = drainActionWindows(state);
  seat(next, ids.A, { cakes: 2, skills: ["skill_26_70243"] });
  seat(next, ids.B, { cakes: 1, skills: ["skill_60_57192", "skill_28_42646"] });

  next = submitAll(next, {
    A: { type: "attack", attackId: "wan_jian", stacks: 1 },
    B: { type: "attack", attackId: "qin", stacks: 1, targetId: ids.A },
    C: { type: "gain_cake" }
  }, ids);
  next = submitActionWindowSkill(next, ids.B, {
    type: "skill",
    skillId: "skill_60_57192",
    stacks: 1,
    switchActionIndex: 0,
    targetId: ids.A
  });
  next = drainActionWindows(next);

  assert.equal(player(next, ids.A).hp, 3);
  assert.equal(player(next, ids.B).hp, 4);
  assert.equal(player(next, ids.C).hp, 4);
  assert.equal(next.eventLog.some((event) => event.type === "clash"), false);
});

run("absolute guard rewrites incoming attack target modes and pays half attack cost", () => {
  const { state, ids } = makeGame(["P", "AI1", "AI2", "AI3"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let next = drainActionWindows(state);
  seat(next, ids.P, { cakes: 10, skills: ["skill_74_34920"] });
  seat(next, ids.AI1, { cakes: 3 });
  seat(next, ids.AI2, { cakes: 4, skills: ["skill_54_99719"] });
  seat(next, ids.AI3, { cakes: 2, skills: ["skill_28_42646"] });

  next = submitAll(next, {
    P: { type: "defense", defense: "youtiao" },
    AI1: { type: "attack", attackId: "nan_man", stacks: 1 },
    AI2: { type: "attack", attackId: "shan_dian", stacks: 1, targetId: ids.P },
    AI3: { type: "attack", attackId: "qin", stacks: 2, targetId: ids.P }
  }, ids);
  next = submitActionWindowSkill(next, ids.P, {
    type: "skill",
    skillId: "skill_74_34920",
    stacks: 1,
    targetId: ids.AI1,
    switchActionIndex: 0
  });
  assert.equal(player(next, ids.P).cakes, 8);
  next = submitActionWindowSkill(next, ids.P, {
    type: "skill",
    skillId: "skill_74_34920",
    stacks: 1,
    targetId: ids.AI2,
    switchActionIndex: 0
  });
  assert.equal(player(next, ids.P).cakes, 6);
  next = submitActionWindowSkill(next, ids.P, {
    type: "skill",
    skillId: "skill_74_34920",
    stacks: 1,
    targetId: ids.AI3,
    switchActionIndex: 0
  });
  assert.equal(player(next, ids.P).cakes, 5);

  next = drainActionWindows(next);

  assert.equal(player(next, ids.P).hp, 0);
  assert.equal(player(next, ids.AI1).hp, -6);
  assert.equal(player(next, ids.AI2).hp, -6);
  assert.equal(player(next, ids.AI3).hp, 6);
  assert.equal(
    next.eventLog.some(
      (event) =>
        event.type === "damage" &&
        event.sourceId === ids.AI3 &&
        event.targetId === ids.AI1 &&
        event.amount === 12
    ),
    true
  );
  assert.equal(
    next.eventLog.some(
      (event) =>
        event.type === "damage" &&
        event.sourceId === ids.AI3 &&
        event.targetId === ids.AI2 &&
        event.amount === 12
    ),
    true
  );
});

run("luanwu attacks are area before absolute guard choices are built", () => {
  const { state, ids } = makeGame(["P", "AI1", "AI2"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let next = drainActionWindows(state);
  seat(next, ids.P, { cakes: 1, skills: ["skill_74_34920"] });
  seat(next, ids.AI1, { cakes: 1, skills: ["skill_54_99719"] });

  next = submitAll(next, {
    P: { type: "defense", defense: "small" },
    AI1: { type: "attack", attackId: "sha", stacks: 1 },
    AI2: { type: "gain_cake" }
  }, ids);

  const publicForPlayer = toPublicGameState(next, ids.P);
  const revealedLuanwuAttack = publicForPlayer.revealedActions?.[ids.AI1]?.actions[0];
  assert.ok(revealedLuanwuAttack);
  assert.equal("targetId" in revealedLuanwuAttack, false);

  next = submitActionWindowSkill(next, ids.P, {
    type: "skill",
    skillId: "skill_74_34920",
    stacks: 1,
    targetId: ids.AI1,
    switchActionIndex: 0
  });
  assert.equal(player(next, ids.P).cakes, 0);

  next = drainActionWindows(next);

  assert.equal(player(next, ids.P).hp, 6);
  assert.equal(player(next, ids.AI2).hp, 6);
});

run("reversal swaps a single targeted attack and removes cake gain", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { skills: ["skill_93_50224"] });
  seat(state, ids.B, { cakes: 1 });

  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.A }
  }, ids);

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_93_50224",
    stacks: 1
  });

  assert.equal(player(state, ids.A).hp, 6);
  assert.equal(player(state, ids.A).cakes, 0);
  assert.equal(player(state, ids.B).hp, 5);
});

run("reversal splits area attacks into single reversed attacks", () => {
  let { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { skills: ["skill_93_50224"] });
  seat(state, ids.B, { cakes: 2 });

  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "wan_jian", stacks: 1 },
    C: { type: "gain_cake" }
  }, ids);

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_93_50224",
    stacks: 1
  });

  assert.equal(player(state, ids.A).hp, 6);
  assert.equal(player(state, ids.C).hp, 6);
  assert.equal(player(state, ids.B).hp, 2);
});

run("reversal preserves modified attack stats after the source changes", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 4
  });
  state = drainActionWindows(state);
  seat(state, ids.A, {
    cakes: 2,
    hp: 10,
    skills: ["huo_yan_dao", "skill_45_30424", "skill_51_92674", "skill_93_50224"]
  });

  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_45_30424",
    stacks: 1,
    switchActionIndex: 0,
    attackStatModifier: "power_times_3_level_to_zero"
  });
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_93_50224",
    stacks: 1
  });

  assert.equal(player(state, ids.A).hp, 3);
  assert.equal(player(state, ids.B).hp, 6);
});

run("reversal suppresses cake, saint, and forest gains", () => {
  let { state, ids } = makeGame(["A", "B", "C", "D"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { skills: ["skill_93_50224"] });
  seat(state, ids.B, { cakes: 1 });
  seat(state, ids.C, { cakes: 1, skills: ["skill_61_59049"] });
  seat(state, ids.D, { cakes: 3, hp: 4, skills: ["skill_77_30612"] });

  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.D },
    C: { type: "skill", skillId: "skill_61_59049", stacks: 1 },
    D: { type: "skill", skillId: "skill_77_30612", stacks: 1 }
  }, ids);

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_93_50224",
    stacks: 1
  });

  assert.equal(player(state, ids.A).cakes, 0);
  assert.equal(player(state, ids.C).cakes, 0);
  assert.equal(player(state, ids.D).hp, 4);
  assert.equal(player(state, ids.B).hp, 5);
});

run("reversal resolves clashes before aggregate rebound chains", () => {
  let { state, ids } = makeGame(["P", "AI1", "AI2", "AI3"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.P, { cakes: 3, skills: ["skill_93_50224"] });
  seat(state, ids.AI1, { cakes: 1, skills: ["skill_58_88471"] });
  seat(state, ids.AI2, { cakes: 2 });
  seat(state, ids.AI3, { cakes: 1 });

  state = submitAll(state, {
    P: { type: "attack", attackId: "nan_man", stacks: 1 },
    AI1: { type: "defense", defense: "rebound", targetId: ids.P },
    AI2: { type: "attack", attackId: "wan_jian", stacks: 1 },
    AI3: { type: "defense", defense: "rebound", targetId: ids.P }
  }, ids);

  state = submitActionWindowSkill(state, ids.P, {
    type: "skill",
    skillId: "skill_93_50224",
    stacks: 1
  });

  assert.equal(player(state, ids.P).hp, 6);
  assert.equal(player(state, ids.AI1).hp, -12);
  assert.equal(player(state, ids.AI2).hp, 6);
  assert.equal(player(state, ids.AI3).hp, 6);
});

run("past time small space removes its player from main-space win checks", () => {
  let { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_104_71181"] });
  seat(state, ids.B, { skills: ["skill_105_48309"] });

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_104_71181",
    stacks: 1
  });

  assert.equal(player(state, ids.A).status, "dead");
  assert.equal(player(state, ids.A).defeatLevel, 2);
  assert.equal(buffStacks(player(state, ids.A), "small_space:past_time"), 5);
  assert.equal(state.phase, "finished");
  assert.deepEqual(state.winnerIds, [ids.B]);
});

run("past time small space lowers alive count for shapeless shield", () => {
  let { state, ids } = makeGame(["A", "B", "C", "D"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_104_71181"] });
  seat(state, ids.B, { skills: ["skill_99_65551"] });

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_104_71181",
    stacks: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.C, { cakes: 1 });

  state = submitAll(state, {
    B: { type: "gain_cake" },
    C: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.B },
    D: { type: "gain_cake" }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).hp, 5);
});

run("main-space players cannot target a player in past time", () => {
  let { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_104_71181"] });

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_104_71181",
    stacks: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.B, { cakes: 1 });

  assert.throws(() =>
    submitPlayerAction(state, ids.B, {
      type: "attack",
      attackId: "sha",
      stacks: 1,
      targetId: ids.A
    })
  );
});

run("past time returns its player after five round ends", () => {
  let { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_104_71181"] });

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_104_71181",
    stacks: 1
  });
  assert.equal(buffStacks(player(state, ids.A), "small_space:past_time"), 5);

  for (let index = 0; index < 5; index += 1) {
    state = drainActionWindows(state);
    seat(state, ids.B, { cakes: 1 });
    state = submitAll(state, {
      B: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.C },
      C: { type: "gain_cake" }
    }, ids);
    state = drainActionWindows(state);
  }

  assert.equal(player(state, ids.A).status, "alive");
  assert.equal(player(state, ids.A).defeatLevel, undefined);
  assert.equal(buffStacks(player(state, ids.A), "small_space:past_time"), 0);
});

run("hell overlord revives a level 1 corpse as a skillless puppet", () => {
  let { state, ids } = makeGame(["A", "B", "C", "D"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_112_59292"] });
  seat(state, ids.B, { hp: -1, skills: ["skill_87_44771"], cakes: 2 });
  player(state, ids.B).status = "dead";
  player(state, ids.B).defeatLevel = 1;

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_112_59292",
    stacks: 1,
    targetId: ids.B
  });

  assert.equal(player(state, ids.B).status, "alive");
  assert.equal(player(state, ids.B).hp, 6);
  assert.deepEqual(player(state, ids.B).skills, []);
  assert.equal(buffStacks(player(state, ids.B), `puppet_of:${ids.A}`), 1);

  state = drainActionWindows(state);
  seat(state, ids.B, { cakes: 2 });
  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "wan_jian", stacks: 1 },
    C: { type: "gain_cake" },
    D: { type: "gain_cake" }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.A).hp, 6);
  assert.equal(player(state, ids.C).hp, 4);
  assert.equal(player(state, ids.D).hp, 4);
});

run("puppets are ignored only for victory count", () => {
  let { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_112_59292"] });
  seat(state, ids.C, { skills: ["skill_105_48309"] });
  player(state, ids.B).status = "dead";
  player(state, ids.B).defeatLevel = 1;
  player(state, ids.B).hp = -1;

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_112_59292",
    stacks: 1,
    targetId: ids.B
  });

  assert.equal(state.phase, "finished");
  assert.deepEqual(state.winnerIds, [ids.C]);
});

run("hell overlord cannot target a no-revive corpse", () => {
  const { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_112_59292"] });
  player(state, ids.B).status = "dead";
  player(state, ids.B).defeatLevel = 1;
  player(state, ids.B).hp = -1;
  player(state, ids.B).buffs.push({ id: "no_revive", name: "裂魂", stacks: 1 });

  assert.throws(() =>
    submitActionWindowSkill(state, ids.A, {
      type: "skill",
      skillId: "skill_112_59292",
      stacks: 1,
      targetId: ids.B
    })
  );
});

run("hell overlord self revival clears the user's skills", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { skills: ["skill_112_59292"] });
  seat(state, ids.B, { cakes: 3 });

  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "qin", stacks: 3, targetId: ids.A }
  }, ids);
  state = advancePastTurnEndDamage(state);

  assert.equal(state.activeTimingPhase, "revival_action");
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_112_59292",
    stacks: 1,
    targetId: ids.A
  });

  assert.equal(player(state, ids.A).status, "alive");
  assert.equal(player(state, ids.A).hp, 6);
  assert.deepEqual(player(state, ids.A).skills, []);
  assert.equal(buffStacks(player(state, ids.A), "pending_death"), 0);
});

run("purification wastes hell overlord against its corpse", () => {
  let { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_112_59292"] });
  seat(state, ids.B, { skills: ["skill_7_35434"], hp: -1 });
  player(state, ids.B).status = "dead";
  player(state, ids.B).defeatLevel = 1;

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_112_59292",
    stacks: 1,
    targetId: ids.B
  });

  assert.equal(player(state, ids.B).status, "dead");
  assert.equal(player(state, ids.B).defeatLevel, 1);
  assert.equal(player(state, ids.B).revealedSkillIds.includes("skill_7_35434"), true);
  assert.equal(buffStacks(player(state, ids.A), "skill_used:skill_112_59292"), 1);
});

run("purification wastes lishang against its corpse", () => {
  let { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.B, { skills: ["skill_7_35434"], hp: -1 });
  seat(state, ids.C, { skills: ["skill_68_57581"], hp: -1 });
  player(state, ids.B).status = "dead";
  player(state, ids.B).defeatLevel = 1;
  player(state, ids.C).buffs.push({ id: "pending_death", name: "已死亡", stacks: 1 });
  state.phase = "action_window";
  state.actionWindowMode = "active";
  state.activeTimingPhase = "revival_action";
  state.actionWindowPassPlayerIds = [];
  state.actionWindowPlayerIds = [ids.C];
  state.eventLog.push({
    id: "evt_lishang_purification_fixture",
    at: Date.now(),
    roundNumber: state.roundNumber,
    turnNumber: state.roundTurnNumber,
    type: "damage",
    sourceId: ids.B,
    targetId: ids.C,
    amount: 3,
    attackName: "测试致死伤害"
  });

  state = submitActionWindowSkill(state, ids.C, {
    type: "skill",
    skillId: "skill_68_57581",
    stacks: 1,
    targetId: ids.B
  });

  assert.equal(player(state, ids.B).status, "dead");
  assert.equal(player(state, ids.C).status, "dead");
  assert.equal(player(state, ids.B).revealedSkillIds.includes("skill_7_35434"), true);
  assert.equal(buffStacks(player(state, ids.C), "skill_used:skill_68_57581"), 1);
});

run("causal cognition reveals divine protection before later hidden defenses", () => {
  let { state, ids } = makeGameWithAssignedSkills(["A", "B"], {
    A: ["skill_121_59557", "skill_109_65084"],
    B: ["skill_32_19017", "skill_39_77400", "skill_51_92674"]
  });
  assert.equal(player(state, ids.A).revealedSkillIds.includes("skill_121_59557"), true);
  assert.equal(player(state, ids.B).revealedSkillIds.includes("skill_32_19017"), false);

  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 1 });
  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).revealedSkillIds.includes("skill_32_19017"), true);
  assert.equal(player(state, ids.B).revealedSkillIds.includes("skill_51_92674"), false);
  assert.equal(player(state, ids.B).hp, 4);
});

run("causal cognition reveals tengjia only when tengjia actually triggers", () => {
  let { state, ids } = makeGameWithAssignedSkills(["A", "B"], {
    A: ["skill_121_59557", "skill_109_65084"],
    B: ["skill_51_92674"]
  });
  state = drainActionWindows(state);
  state.roundTurnNumber = 3;
  seat(state, ids.A, { cakes: 1 });
  state = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).revealedSkillIds.includes("skill_51_92674"), true);
  assert.equal(player(state, ids.B).hp, 4);
});

run("causal cognition reveals earth heart when it immunes lightning", () => {
  let { state, ids } = makeGameWithAssignedSkills(["A", "B"], {
    A: ["skill_121_59557", "skill_109_65084"],
    B: ["skill_39_77400"]
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 4 });
  state = submitAll(state, {
    A: { type: "attack", attackId: "shan_dian", stacks: 1, targetId: ids.B },
    B: { type: "defense", defense: "small" }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(player(state, ids.B).revealedSkillIds.includes("skill_39_77400"), true);
  assert.equal(buffStacks(player(state, ids.B), "defense_value"), 4);
  assert.equal(player(state, ids.B).hp, 4);
});

run("voluntary discard removes an unused skill and heals without restarting", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 2
  });
  seat(state, ids.A, { hp: 3, skills: ["skill_34_1533", "skill_33_55159"] });
  assert.throws(() =>
    submitPlayerAction(state, ids.A, {
      type: "discard_skill",
      targetSkillId: "skill_34_1533"
    })
  );
  const collectingState = drainActionWindows(state);
  assert.equal(collectingState.phase, "collecting_actions");
  assert.throws(() =>
    submitPlayerAction(collectingState, ids.A, {
      type: "discard_skill",
      targetSkillId: "skill_34_1533"
    })
  );

  state = enterActionWindow(state, ids.A);
  state = submitPlayerAction(state, ids.A, {
    type: "discard_skill",
    targetSkillId: "skill_34_1533"
  }).state;

  assert.equal(player(state, ids.A).hp, 4);
  assert.equal(player(state, ids.A).skills.includes("skill_34_1533"), false);
  assert.equal(state.phase, "action_window");
  assert.equal(state.roundNumber, 1);

  state = submitPlayerAction(state, ids.A, {
    type: "discard_skill",
    targetSkillId: "skill_33_55159"
  }).state;
  assert.equal(player(state, ids.A).hp, 5);
  assert.equal(player(state, ids.A).skills.length, 0);
});

run("voluntary discard does not heal after the skill has been used", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { hp: 3, cakes: 3, skills: ["skill_13_68869"] });

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_13_68869",
    stacks: 1
  });
  state = enterActionWindow(state, ids.A);
  state = submitPlayerAction(state, ids.A, {
    type: "discard_skill",
    targetSkillId: "skill_13_68869"
  }).state;

  assert.equal(player(state, ids.A).hp, 3);
  assert.equal(player(state, ids.A).skills.includes("skill_13_68869"), false);
});

run("blood sorrow suppresses voluntary discard healing after the discard is applied", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { hp: 3, skills: ["skill_34_1533"] });
  seat(state, ids.B, { skills: ["skill_12_79004"] });

  state = enterActionWindow(state, ids.A);
  state = submitPlayerAction(state, ids.A, {
    type: "discard_skill",
    targetSkillId: "skill_34_1533"
  }).state;

  assert.equal(player(state, ids.A).hp, 3);
  assert.equal(player(state, ids.B).revealedSkillIds.includes("skill_12_79004"), true);
});

run("discarding the only blood sorrow allows the unused-skill heal", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { hp: 3, skills: ["skill_12_79004"] });

  state = enterActionWindow(state, ids.A);
  state = submitPlayerAction(state, ids.A, {
    type: "discard_skill",
    targetSkillId: "skill_12_79004"
  }).state;

  assert.equal(player(state, ids.A).hp, 4);
  assert.equal(player(state, ids.A).skills.includes("skill_12_79004"), false);
});

run("self destruct as an action skips to round end and still resolves sanctuary", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = setup.state;
  const { ids } = setup;
  seat(state, ids.B, { hp: 3, skills: ["skill_71_40087"] });
  state.roundNumber = 3;
  state.roundTurnNumber = 2;
  state.turnNumber = 2;
  state = drainActionWindows(state);

  state = submitPlayerAction(state, ids.A, {
    type: "defense",
    defense: "self_destruct"
  }).state;

  assert.equal(player(state, ids.A).hp, 5);
  assert.equal(player(state, ids.B).hp, 6);
  assert.equal(state.roundNumber, 4);
  assert.equal(
    state.eventLog.some((event) => event.type === "heal" && event.reason === "圣域"),
    true
  );
  assert.equal(
    state.eventLog.some((event) => event.type === "damage" && event.reason === "自爆"),
    false
  );
});

run("self destruct preemptive restart restores the turn-start checkpoint before round end", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 2
  });
  let state = setup.state;
  const { ids } = setup;
  seat(state, ids.A, { cakes: 2, skills: ["skill_52_22171", "skill_63_72549"] });
  state.roundTurnNumber = 4;
  state.turnNumber = 4;
  let guard = 0;
  while (
    state.phase === "action_window" &&
    state.activeTimingPhase !== "turn_before_action" &&
    guard < 8
  ) {
    guard += 1;
    state = advanceActionWindow(state);
  }
  assert.equal(state.activeTimingPhase, "turn_before_action");
  state = advanceActionWindow(state);
  assert.equal(state.phase, "collecting_actions");
  assert.equal(player(state, ids.A).cakes, 3);

  state = submitPlayerAction(state, ids.A, {
    type: "attack",
    attackId: "nan_man",
    stacks: 1
  }).state;
  state = submitPlayerAction(state, ids.B, {
    type: "defense",
    defense: "self_destruct"
  }).state;

  assert.equal(player(state, ids.A).cakes, 1);
  assert.equal(player(state, ids.B).hp, 5);
  assert.equal(buffStacks(player(state, ids.A), "used_attack_round:1"), 0);
  assert.equal(state.roundNumber, 2);
});

run("late self destruct requires self destructer death during turn change", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  state = drainActionWindows(state);
  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "gain_cake" }
  }, ids);

  assert.equal(state.phase, "action_window");
  assert.equal(state.activeTimingPhase, "turn_change_action");
  assert.throws(() =>
    submitPlayerAction(state, ids.A, {
      type: "defense",
      defense: "self_destruct"
    })
  );
});

run("late self destruct refunds the submitted turn action and consumes one late chance", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 2
  });
  seat(state, ids.A, { skills: ["skill_102_5546", "skill_95_91337"] });
  state = drainActionWindows(state);

  state = submitAll(state, {
    A: { type: "skill", skillId: "skill_95_91337", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);
  assert.equal(state.phase, "action_window");
  assert.equal(state.activeTimingPhase, "turn_change_action");
  assert.equal(buffStacks(player(state, ids.A), "skill_used:skill_95_91337"), 1);

  state = submitPlayerAction(state, ids.A, {
    type: "defense",
    defense: "self_destruct"
  }).state;

  assert.equal(player(state, ids.A).hp, 5);
  assert.equal(player(state, ids.B).status, "alive");
  assert.equal(buffStacks(player(state, ids.A), "skill_used:skill_95_91337"), 0);
  assert.equal(buffStacks(player(state, ids.A), "late_self_destruct_used"), 1);
  assert.equal(buffStacks(player(state, ids.A), "self_destruct_count"), 1);
  assert.equal(state.roundNumber, 2);
});

run("late self destruct limit scales with duplicate self destructer death copies", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 2
  });
  seat(state, ids.A, { skills: ["skill_102_5546", "skill_102_5546"] });
  player(state, ids.A).buffs.push({
    id: "late_self_destruct_used",
    name: "后期自爆次数",
    stacks: 3
  });
  state = drainActionWindows(state);
  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "gain_cake" }
  }, ids);

  state = submitPlayerAction(state, ids.A, {
    type: "defense",
    defense: "self_destruct"
  }).state;

  assert.equal(buffStacks(player(state, ids.A), "late_self_destruct_used"), 4);
  assert.equal(player(state, ids.A).hp, 5);
});

run("late self destruct rejects uses beyond the provided chance count", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  seat(state, ids.A, { skills: ["skill_102_5546"] });
  player(state, ids.A).buffs.push({
    id: "late_self_destruct_used",
    name: "后期自爆次数",
    stacks: 2
  });
  state = drainActionWindows(state);
  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "gain_cake" }
  }, ids);

  assert.throws(() =>
    submitPlayerAction(state, ids.A, {
      type: "defense",
      defense: "self_destruct"
    })
  );
});

run("self destruct can be used from the turn-before window", () => {
  const setup = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 1
  });
  let state = setup.state;
  const { ids } = setup;
  let guard = 0;
  while (
    state.phase === "action_window" &&
    state.activeTimingPhase !== "turn_before_action" &&
    guard < 8
  ) {
    guard += 1;
    state = advanceActionWindow(state);
  }

  assert.equal(state.phase, "action_window");
  assert.equal(state.activeTimingPhase, "turn_before_action");
  state = submitPlayerAction(state, ids.A, {
    type: "defense",
    defense: "self_destruct"
  }).state;

  assert.equal(player(state, ids.A).hp, 5);
  assert.equal(state.roundNumber, 2);
});

run("repeated self destruct escalates to zero hp then retire", () => {
  let { state, ids } = makeGame(["A", "B"]);

  state = submitPlayerAction(state, ids.A, {
    type: "defense",
    defense: "self_destruct"
  }).state;
  state = submitPlayerAction(state, ids.A, {
    type: "defense",
    defense: "self_destruct"
  }).state;
  assert.equal(player(state, ids.A).status, "alive");
  assert.equal(player(state, ids.A).hp, 0);

  state = submitPlayerAction(state, ids.A, {
    type: "defense",
    defense: "self_destruct"
  }).state;
  assert.equal(player(state, ids.A).status, "dead");
  assert.equal(player(state, ids.A).defeatLevel, 2);
});

run("second self destruct kills absolute value at zero hp", () => {
  let { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.A, { skills: ["skill_69_22138"] });

  state = submitPlayerAction(state, ids.A, {
    type: "defense",
    defense: "self_destruct"
  }).state;
  state = submitPlayerAction(state, ids.A, {
    type: "defense",
    defense: "self_destruct"
  }).state;

  assert.equal(player(state, ids.A).hp, 0);
  assert.equal(player(state, ids.A).status, "dead");
  assert.equal(player(state, ids.A).defeatLevel, 1);
});

run("self destructer death prevents the owner's escalation", () => {
  let { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.A, { skills: ["skill_102_5546"] });

  for (let index = 0; index < 3; index += 1) {
    state = submitPlayerAction(state, ids.A, {
      type: "defense",
      defense: "self_destruct"
    }).state;
  }

  assert.equal(player(state, ids.A).status, "alive");
  assert.equal(player(state, ids.A).hp, 3);
  assert.equal(buffStacks(player(state, ids.A), "self_destruct_count"), 3);
  assert.equal(player(state, ids.A).revealedSkillIds.includes("skill_102_5546"), true);
});

run("self destructer death retires other self destructors immediately", () => {
  let { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.B, { skills: ["skill_102_5546"] });

  state = submitPlayerAction(state, ids.A, {
    type: "defense",
    defense: "self_destruct"
  }).state;

  assert.equal(player(state, ids.A).status, "dead");
  assert.equal(player(state, ids.A).defeatLevel, 2);
  assert.equal(player(state, ids.B).revealedSkillIds.includes("skill_102_5546"), true);
});

run("duplicate startup locked skills stack their numeric effects", () => {
  const { state, ids } = makeGameWithAssignedSkills(["A", "B"], {
    A: ["skill_53_62958", "skill_53_62958", "skill_67_31717", "skill_67_31717"],
    B: []
  });

  assert.equal(player(state, ids.A).hp, 54);
  const started = drainActionWindows(state);
  assert.equal(player(started, ids.A).cakes, 2);
});

run("duplicate fire blade and vine armor stack on fire sha damage", () => {
  const { state, ids } = makeGame(["A", "B"]);
  seat(state, ids.A, { cakes: 1, skills: ["huo_yan_dao", "huo_yan_dao"] });
  seat(state, ids.B, { skills: ["skill_51_92674", "skill_51_92674"] });

  const next = submitAll(state, {
    A: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.B },
    B: { type: "gain_cake" }
  }, ids);

  assert.equal(player(next, ids.B).hp, 1);
});

run("duplicate limited skills increase the shared use count limit", () => {
  let { state, ids } = makeGameWithAssignedSkills(["A", "B"], {
    A: ["skill_13_68869", "skill_13_68869"],
    B: []
  });

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_13_68869",
    stacks: 1
  });
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_13_68869",
    stacks: 1
  });

  assert.equal(player(state, ids.B).hp, 4);
  assert.equal(buffStacks(player(state, ids.A), "skill_used:skill_13_68869"), 2);
  assert.throws(() =>
    submitActionWindowSkill(state, ids.A, {
      type: "skill",
      skillId: "skill_13_68869",
      stacks: 1
    })
  );
});

run("duplicate flash dodge copies have independent cooldown slots", () => {
  let { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 2
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { skills: ["skill_103_56259", "skill_103_56259"] });
  seat(state, ids.B, { cakes: 1 });
  seat(state, ids.C, { cakes: 1 });

  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "attack", attackId: "sha", stacks: 1, targetId: ids.A },
    C: { type: "attack", attackId: "qin", stacks: 1, targetId: ids.A }
  }, ids);
  assert.equal(state.phase, "action_window");
  assert.equal(state.activeTimingPhase, "turn_change_action");

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_103_56259",
    stacks: 1
  });
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_103_56259",
    stacks: 1
  });

  assert.equal(buffCountByPrefix(player(state, ids.A), "flash_dodge_cooldown"), 2);
});

run("duplicate ice rain grants multiple marks from one wanjian hit", () => {
  let { state, ids } = makeGame(["A", "B"], {
    skillMode: "test_select",
    skillCount: 2
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { cakes: 2, skills: ["skill_20_63089", "skill_20_63089"] });

  state = submitAll(state, {
    A: { type: "attack", attackId: "wan_jian", stacks: 1 },
    B: { type: "gain_cake" }
  }, ids);
  state = drainActionWindows(state);

  assert.equal(buffStacks(player(state, ids.B), `ice_rain:${ids.A}`), 2);
});

run("duplicate xieyu can select one target per copy", () => {
  let { state, ids } = makeGame(["A", "B", "C"], {
    skillMode: "test_select",
    skillCount: 2
  });
  state = drainActionWindows(state);
  seat(state, ids.A, { skills: ["skill_72_53933", "skill_72_53933"] });
  state.roundNumber = 3;
  state.phase = "action_window";
  state.actionWindowMode = "active";
  state.activeTimingPhase = "turn_end_action";
  state.actionWindowPlayerIds = [ids.A];
  state.actionWindowPassPlayerIds = [];
  state.actionWindowDeadlineAt = Date.now() + ACTION_WINDOW_SECONDS * 1000;

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_72_53933",
    stacks: 1,
    targetId: ids.B
  });
  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_72_53933",
    stacks: 1,
    targetId: ids.C
  });

  assert.equal(player(state, ids.A).buffs.filter((buff) => buff.id === "xieyu_target").length, 2);
  assert.throws(() =>
    submitActionWindowSkill(state, ids.A, {
      type: "skill",
      skillId: "skill_72_53933",
      stacks: 1,
      targetId: ids.B
    })
  );
});

run("duplicate sand detects a skill transformed by another sand copy", () => {
  let { state, ids } = makeGameWithAssignedSkills(["A", "B"], {
    A: ["skill_4_65637", "skill_4_65637"],
    B: []
  });

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_4_65637",
    stacks: 1,
    targetSkillId: "skill_53_62958"
  });
  assert.equal(player(state, ids.A).skills.includes("skill_53_62958"), true);
  assert.equal(player(state, ids.A).status, "alive");

  state = submitActionWindowSkill(state, ids.A, {
    type: "skill",
    skillId: "skill_4_65637",
    stacks: 1,
    targetSkillId: "skill_53_62958"
  });

  assert.equal(player(state, ids.A).status, "dead");
  assert.equal(player(state, ids.A).defeatLevel, 2);
});

console.log("rule regression checks passed");

function makeGame(
  names: string[],
  configPatch: Partial<GameConfig> = {}
): { state: GameState; ids: PlayerMap } {
  const config: Partial<GameConfig> = {
    firstTurnNoAttack: false,
    skillMode: "none",
    skillCount: 0,
    turnTimeLimitSeconds: 45,
    ...configPatch
  };
  let state = createGame(names[0]!, config);
  for (const name of names.slice(1)) {
    state = addPlayerToGame(state, createPlayer(name));
  }
  state = startGame(state);
  const ids = Object.fromEntries(state.players.map((item) => [item.name, item.id]));
  return { state, ids };
}

function makeGameWithAssignedSkills(
  names: string[],
  skillsByName: Record<string, string[]>
): { state: GameState; ids: PlayerMap } {
  const maxSkillCount = Math.max(1, ...Object.values(skillsByName).map((skills) => skills.length));
  let state = createGame(names[0]!, {
    firstTurnNoAttack: false,
    skillMode: "test_select",
    skillCount: maxSkillCount,
    turnTimeLimitSeconds: 45
  });
  for (const name of names.slice(1)) {
    state = addPlayerToGame(state, createPlayer(name));
  }
  for (const player of state.players) {
    player.skills = [...(skillsByName[player.name] ?? [])];
  }
  state = startGame(state);
  const ids = Object.fromEntries(state.players.map((item) => [item.name, item.id]));
  return { state, ids };
}

function submitAll(
  initialState: GameState,
  actions: Record<string, ActionSubmission>,
  ids: PlayerMap
): GameState {
  let state = initialState;
  for (const [name, action] of Object.entries(actions)) {
    state = submitPlayerAction(state, ids[name]!, action).state;
  }
  return state;
}

function reachTurnEndAction(initialState: GameState, ids: PlayerMap): GameState {
  let state = drainActionWindows(initialState);
  state = submitAll(state, {
    A: { type: "gain_cake" },
    B: { type: "gain_cake" }
  }, ids);
  let guard = 0;
  while (
    state.phase === "action_window" &&
    state.activeTimingPhase !== "turn_end_action" &&
    guard < 8
  ) {
    guard += 1;
    state = advanceActionWindow(state);
  }
  assert.equal(state.phase, "action_window");
  assert.equal(state.activeTimingPhase, "turn_end_action");
  return state;
}

function drainActionWindows(initialState: GameState): GameState {
  let state = initialState;
  let guard = 0;
  while (state.phase === "action_window" && guard < 12) {
    guard += 1;
    state = advanceActionWindow(state);
  }
  return state;
}

function advancePastTurnEndDamage(initialState: GameState): GameState {
  let state = initialState;
  let guard = 0;
  while (
    state.phase === "action_window" &&
    state.turnResolutionStarted &&
    state.activeTimingPhase !== "revival_action" &&
    state.activeTimingPhase !== "turn_end_action" &&
    guard < 8
  ) {
    guard += 1;
    state = advanceActionWindow(state);
  }
  return state;
}

function passAllActionWindowPlayers(initialState: GameState): GameState {
  let state = initialState;
  let guard = 0;
  while (state.phase === "action_window" && guard < 8) {
    guard += 1;
    state = advanceActionWindow(state);
  }
  return state;
}

function seat(
  state: GameState,
  playerId: PlayerId,
  patch: Partial<Pick<GameState["players"][number], "cakes" | "hp" | "skills">>
): void {
  Object.assign(player(state, playerId), patch);
}

function player(state: GameState, playerId: PlayerId): GameState["players"][number] {
  const found = state.players.find((item) => item.id === playerId);
  assert.ok(found, `missing player ${playerId}`);
  return found;
}

function buffStacks(
  target: GameState["players"][number],
  buffId: string
): number {
  return target.buffs.find((buff) => buff.id === buffId)?.stacks ?? 0;
}

function buffCountByPrefix(
  target: GameState["players"][number],
  buffIdPrefix: string
): number {
  return target.buffs.filter((buff) => buff.id.startsWith(buffIdPrefix)).length;
}

function pickIntroSkill(excluded: string[] = []): string {
  const excludedSet = new Set(excluded);
  const skillId = getSmallSkillIds().find((id) => !excludedSet.has(id));
  assert.ok(skillId, "missing intro skill candidate");
  return skillId;
}

function withMockedRandom<T>(value: number, fn: () => T): T {
  const originalRandom = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = originalRandom;
  }
}

function run(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}
