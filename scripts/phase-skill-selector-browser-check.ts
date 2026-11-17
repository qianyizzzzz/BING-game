import assert from "node:assert/strict";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { chromium } from "playwright";
import { build } from "vite";
import {
  addPlayerToGame, advanceActionWindow, createGame, createPlayer, startGame, submitPlayerAction, toPublicGameState, validateActionWindowSkill,
  BUBBLE_FORGET, CHARITY_CARD_ID, DEMON_CARD_ID, DEMON_EVIL_HOUND_ID, DEMON_FEAR_HOUND_ID, HEALING_ART_ID,
  FIVE_ELEMENTS_CHOOSE, FIVE_ELEMENTS_LEVEL, SACRED_BEAST_ID, TIGER_SWITCH, YIYUAN_REPEAT,
  type GameState, type PublicGameState, type SkillAction
} from "../packages/shared/src";
import { TIGER_CARD } from "../packages/shared/src/engine/netherTigerIds";
import { VACUUM_CARD_ID } from "../packages/shared/src/engine/vacuumIds";
import { FIVE_ELEMENTS_CARD } from "../packages/shared/src/engine/fiveElementsIds";
import { HEXAGRAM_ABSOLUTE, HEXAGRAM_CARD, HEXAGRAM_CHOOSE, HEXAGRAM_RESTORE, HEXAGRAM_SPIRIT } from "../packages/shared/src/engine/hexagramIds";
import { SEVEN_STAR_CARD, SEVEN_STAR_CHOOSE, SEVEN_STAR_YAOGUANG, SEVEN_STAR_YUHENG } from "../packages/shared/src/engine/sevenStarIds";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";

const fixture = "virtual:phase-skill-selector";
const bundle = await build({
  configFile: false,
  logLevel: "error",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  plugins: [react(), {
    name: "phase-skill-selector-fixture",
    resolveId: (id) => id === fixture ? "\0" + fixture : null,
    load: (id) => id === "\0" + fixture ? `
      import { createElement } from "react";
      import { createRoot } from "react-dom/client";
      import { ActionPanel } from "/apps/client/src/components/ActionPanel.tsx";
      import { RetirementCounterPanel } from "/apps/client/src/components/RetirementCounterPanel.tsx";
      import { VictoryCounterPanel } from "/apps/client/src/components/VictoryCounterPanel.tsx";
      const root = createRoot(document.getElementById("root"));
      const noop = () => {};
      const record = (action) => { window.submitted = action; };
      window.renderPhase = (state) => {
        window.submitted = undefined;
        const playerId = state.viewerPlayerId;
        root.render(state.retirementCounter
          ? createElement(RetirementCounterPanel, { counter: state.retirementCounter, players: state.players,
              playerId, busy: false, submit: record })
          : state.victoryCounter ? createElement(VictoryCounterPanel, { state, playerId, busy: false, submit: record, pass: noop })
          : createElement(ActionPanel, { state, submitting: false, onSubmitWindowSkill: record, onSubmit: record,
              onEnterActionWindow: noop, onPassActionWindow: noop, onSkipToNextAction: noop, onGuessSkill: noop }));
      };
    ` : null
  }],
  root: path.resolve(import.meta.dirname, ".."),
  build: { write: false, lib: { entry: fixture, name: "PhaseSkillFixture", formats: ["iife"] },
    rollupOptions: { input: fixture } }
});
const output = Array.isArray(bundle) ? bundle[0] : bundle;
assert.ok(output && "output" in output);
const chunk = output.output.find((entry) => entry.type === "chunk");
assert.ok(chunk?.type === "chunk");

function table(cardId: string) {
  const game = addPlayerToGame(createGame("甲", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false }), createPlayer("乙"));
  game.players[0]!.bigCards = [{ cardId, instanceId: "fixture-card" }];
  return startGame(game);
}

function phase(game: GameState, timing: GameState["activeTimingPhase"]): PublicGameState {
  game.phase = timing === "turn_action" ? "collecting_actions" : "action_window";
  game.activeTimingPhase = timing;
  game.actionWindowMode = "active";
  game.actionWindowPassPlayerIds = [];
  return toPublicGameState(game, game.players[0]!.id);
}

const browser = await chromium.launch({
  headless: true,
  ...(process.env.BING_TEST_BROWSER_CHANNEL ? { channel: process.env.BING_TEST_BROWSER_CHANNEL } : {})
});
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(7_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: chunk.code });
  assert.deepEqual(pageErrors, []);
  const render = (state: PublicGameState) => page.evaluate((view) => {
    (window as unknown as { renderPhase: (next: PublicGameState) => void }).renderPhase(view);
  }, state);
  const submitted = () => page.evaluate(() => (window as unknown as { submitted: SkillAction }).submitted);
  const windowSkills = page.getByTestId("window-skill-select");
  const chooseWindowSkill = (id: string) => windowSkills.selectOption(`phase:${id}`);

  const demon = table(DEMON_CARD_ID);
  for (const timing of ["opening_action", "round_pre_interval_action", "round_before_action", "turn_before_action",
    "turn_change_action", "turn_damage_modify", "turn_end_action", "turn_after_interval_action",
    "round_after_interval_action"] as const) {
    await render(phase(demon, timing));
    await windowSkills.locator(`option[value="${DEMON_EVIL_HOUND_ID}"]`).waitFor({ state: "attached" });
    assert.equal(await page.getByRole("combobox", { name: "召唤种类" }).count(), 0);
  }
  await render(phase(demon, "turn_action"));
  await page.getByTestId("action-mode-skill").click();
  const turnSkills = page.getByTestId("skill-action-select");
  assert.equal(await page.getByRole("combobox", { name: "召唤目标" }).count(), 0);
  await turnSkills.selectOption(`phase:${DEMON_EVIL_HOUND_ID}`);
  assert.equal(await page.getByTestId("submit-action").count(), 0);
  await page.getByRole("button", { name: "召唤", exact: true }).click();
  const summon = await submitted();
  assert.equal(summon.skillId, DEMON_EVIL_HOUND_ID);
  assert.equal(summon.targetId, demon.players[1]!.id);
  assert.equal(validateActionWindowSkill(demon, demon.players[0]!.id, summon).ok, true);
  await turnSkills.selectOption(`phase:${DEMON_FEAR_HOUND_ID}`);
  await page.getByRole("button", { name: "召唤", exact: true }).click();
  assert.equal((await submitted()).skillId, DEMON_FEAR_HOUND_ID);
  assert.equal(validateActionWindowSkill(demon, demon.players[0]!.id, await submitted()).ok, true);
  console.log("通过各常规阶段和出招阶段的独立技能选择");

  const vacuum = table(VACUUM_CARD_ID);
  vacuum.players[0]!.buffs.push({ id: "vacuum_extra:fixture-card", stacks: 2, name: "额外虚无" });
  const change = phase(vacuum, "turn_change_action");
  change.yiyuanRepeatChoice = { casterNames: ["乙"], moves: ["饼"] };
  await render(change);
  assert.equal(await page.getByRole("combobox", { name: "是否复刻" }).count(), 0);
  await chooseWindowSkill(YIYUAN_REPEAT);
  await page.getByRole("combobox", { name: "是否复刻" }).selectOption("false");
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  assert.equal((await submitted()).yiyuanRepeat, false);
  const vacuumOption = windowSkills.getByRole("option", { name: "虚无 · 无耗饼", exact: true });
  assert.equal(await vacuumOption.count(), 1);
  await windowSkills.selectOption({ label: "虚无 · 无耗饼" });
  await page.getByRole("combobox", { name: "次数来源" }).selectOption("fixture-card:extra");
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  assert.equal((await submitted()).vacuumUse, "extra");
  assert.equal(validateActionWindowSkill(vacuum, vacuum.players[0]!.id, await submitted()).ok, true);
  console.log("通过虚无和一元·永恒共用变招下拉栏");

  const damage = phase(demon, "turn_damage_modify");
  damage.bubbleDreamHitChoices = [{ id: "hit", label: "杀", sourceId: demon.players[1]!.id }];
  await render(damage);
  assert.equal(await page.getByRole("button", { name: "无视该招并获得改造" }).count(), 0);
  await chooseWindowSkill(BUBBLE_FORGET);
  await page.getByRole("button", { name: "无视该招并获得改造" }).click();
  assert.equal((await submitted()).attackResponseId, "hit");

  await render(phase(table("10518"), "round_before_action"));
  await chooseWindowSkill(SACRED_BEAST_ID);
  await page.getByRole("combobox", { name: "神兽", exact: true }).selectOption("dragon");
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  assert.equal((await submitted()).sacredBeast, "dragon");
  const tiger = table(TIGER_CARD);
  for (const timing of ["round_pre_interval_action", "round_after_interval_action"] as const) {
    await render(phase(tiger, timing));
    await chooseWindowSkill(TIGER_SWITCH);
    await page.getByRole("button", { name: "使用技能", exact: true }).click();
    assert.equal((await submitted()).skillId, TIGER_SWITCH);
    assert.equal(validateActionWindowSkill(tiger, tiger.players[0]!.id, await submitted()).ok, true);
  }
  console.log("通过变伤响应、神兽和幽冥白虎切换");

  let fiveElements = table(FIVE_ELEMENTS_CARD);
  await render(phase(fiveElements, "opening_action"));
  assert.equal(await page.getByRole("combobox", { name: "五行形态" }).count(), 0);
  await chooseWindowSkill(FIVE_ELEMENTS_CHOOSE);
  await page.getByRole("combobox", { name: "五行形态" }).selectOption("fixture-card:wind");
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  assert.equal((await submitted()).cardForm, "wind");
  assert.equal(validateActionWindowSkill(fiveElements, fiveElements.players[0]!.id, await submitted()).ok, true);
  for (let i = 0; i < 60 && fiveElements.phase === "action_window"; i++) fiveElements = advanceActionWindow(fiveElements);
  const [fire, opponent] = fiveElements.players;
  fire!.cakes = 5;
  fiveElements = submitPlayerAction(fiveElements, fire!.id, { type: "attack", attackId: "sha", stacks: 1, targetId: opponent!.id }).state;
  fiveElements = submitPlayerAction(fiveElements, opponent!.id, { type: "gain_cake" }).state;
  await render(phase(fiveElements, "turn_change_action"));
  await windowSkills.selectOption(FIVE_ELEMENTS_LEVEL);
  await page.getByRole("combobox", { name: "等级运算" }).selectOption("subtract");
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  assert.equal((await submitted()).fiveElementsLevelOperation, "subtract");
  assert.equal(validateActionWindowSkill(fiveElements, fire!.id, await submitted()).ok, true);
  console.log("通过五行开局选择和火形态变招选择");

  const hexagram = table(HEXAGRAM_CARD);
  const [mage, known] = hexagram.players;
  const hexagramInstance = mage!.bigCards![0]!;
  await render(phase(hexagram, "opening_action"));
  await chooseWindowSkill(HEXAGRAM_CHOOSE);
  await page.getByRole("combobox", { name: "六芒形态" }).selectOption("fixture-card:spirit");
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  assert.equal((await submitted()).cardForm, "spirit");
  assert.equal(validateActionWindowSkill(hexagram, mage!.id, await submitted()).ok, true);

  hexagramInstance.hexagramForms!.active = "spirit";
  known!.bigCards = [{ cardId: "10521", instanceId: "known-card", publiclyRevealed: true }];
  for (let i = 0; i < 2; i++) grantInitializedSkill(hexagram, mage!.id, "1100", "测试镜像", false);
  await render(phase(hexagram, "turn_before_action"));
  await chooseWindowSkill(HEXAGRAM_SPIRIT);
  await page.getByRole("combobox", { name: "复制子技能 · 消耗 2 次镜像法术" }).selectOption("known-card:1052104");
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  assert.equal((await submitted()).targetSkillId, "1052104");
  assert.equal(validateActionWindowSkill(hexagram, mage!.id, await submitted()).ok, true);

  hexagramInstance.hexagramForms!.active = "absolute";
  hexagramInstance.hexagramForms!.available = hexagramInstance.hexagramForms!.available.filter((form) => form !== "death");
  hexagramInstance.hexagramRestores = 1;
  grantInitializedSkill(hexagram, mage!.id, "1107", "测试六芒星", false);
  await render(phase(hexagram, "turn_change_action"));
  await chooseWindowSkill(HEXAGRAM_ABSOLUTE);
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  assert.equal(validateActionWindowSkill(hexagram, mage!.id, await submitted()).ok, true);
  await chooseWindowSkill(HEXAGRAM_RESTORE);
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  assert.equal((await submitted()).cardForm, "death");
  assert.equal(validateActionWindowSkill(hexagram, mage!.id, await submitted()).ok, true);
  console.log("通过六芒形态、禁灵复制、禁绝及恢复形态下拉入口");

  const sevenStars = table(SEVEN_STAR_CARD);
  const [starOwner, heir] = sevenStars.players;
  const starCard = starOwner!.bigCards![0]!;
  await render(phase(sevenStars, "opening_action"));
  await chooseWindowSkill(SEVEN_STAR_CHOOSE);
  await page.getByRole("combobox", { name: "七星形态" }).selectOption("fixture-card:yaoguang");
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  assert.equal((await submitted()).cardForm, "yaoguang");

  starCard.sevenStarForms!.active = "yaoguang";
  starCard.sevenStarForms!.available = starCard.sevenStarForms!.available.filter((form) => form !== "tianji");
  starOwner!.cakes = 10;
  await render(phase(sevenStars, "turn_action"));
  await page.getByTestId("action-mode-skill").click();
  await page.getByTestId("skill-action-select").selectOption(SEVEN_STAR_YAOGUANG);
  assert.ok((await page.getByRole("combobox", { name: "恢复形态" }).innerText()).includes("天玑"));

  starCard.sevenStarForms!.active = "yuheng";
  starOwner!.status = "dead";
  starOwner!.defeatLevel = 1;
  sevenStars.sevenStarLegacyPending = { [starOwner!.id]: [starCard.instanceId] };
  sevenStars.sevenStarLegacyResume = { kind: "victory", timing: "turn_end_action", victoryResume: "window" };
  await render(phase(sevenStars, "revival_action"));
  await chooseWindowSkill(SEVEN_STAR_YUHENG);
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  assert.equal((await submitted()).targetId, heir!.id);
  assert.equal(validateActionWindowSkill(sevenStars, starOwner!.id, await submitted()).ok, true);
  console.log("通过七星形态、摇光主出招及玉衡复活阶段选人");

  const charity = table(CHARITY_CARD_ID);
  charity.players[0]!.hp = -1;
  charity.players[0]!.buffs.push({ id: "pending_death", name: "等待复活", stacks: 1 });
  await render(phase(charity, "revival_action"));
  assert.equal(await page.getByRole("combobox", { name: "治愈方式" }).count(), 0);
  await chooseWindowSkill(HEALING_ART_ID);
  await page.getByRole("combobox", { name: "治愈方式" }).selectOption("heal");
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  assert.equal((await submitted()).skillId, HEALING_ART_ID);
  assert.equal(validateActionWindowSkill(charity, charity.players[0]!.id, await submitted()).ok, true);

  const retirement = phase(demon, "retirement_counter_action");
  retirement.retirementCounter = { id: "retirement", playerIds: [demon.players[1]!.id], remainingReversals: 0,
    soulResponderIds: [demon.players[0]!.id], canUseSoulSink: true };
  await render(retirement);
  assert.equal(await page.getByTestId("retirement-use-skill").count(), 0);
  await page.getByTestId("retirement-skill-select").selectOption("soul_sink");
  await page.getByTestId("retirement-use-skill").click();
  assert.deepEqual(await submitted(), { windowId: "retirement", kind: "soul_sink" });
  const victory = phase(demon, "victory_counter_action");
  victory.victoryCounter = { remainingReversals: 5, canTransfer: true,
    claims: [{ id: "claim", playerId: demon.players[1]!.id, protected: false, contributions: {} }] };
  await render(victory);
  assert.equal(await page.getByTestId("victory-transfer").count(), 0);
  await page.getByTestId("victory-skill-select").selectOption("transfer");
  await page.getByTestId("victory-transfer").click();
  assert.deepEqual(await submitted(), { kind: "transfer", claimId: "claim" });
  console.log("通过复活、退场和胜利反制技能选择");
  assert.deepEqual(pageErrors, []);
} finally {
  await browser.close();
}
