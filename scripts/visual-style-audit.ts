import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const cssPath = path.join(projectRoot, "apps", "client", "src", "styles.css");
const css = fs.readFileSync(cssPath, "utf8");
const failures: string[] = [];
const visualDoctrinePaths = [
  "README.md",
  "docs/PRODUCT_PLAN.md",
  "docs/UI_DESIGN_PLAN.md",
  "docs/SUBAGENT_ART_DIRECTOR_BLENDER.md",
  "docs/SUBAGENT_UI_REVIEW.md",
  "workflow/README.md",
  "workflow/docs/01-visual-bible.md",
  "workflow/tasks/TASK-006-real-human-character-upgrade.md"
];

const finalPass = sectionAfter("Art director inspection pass");

expectContains(css, "Animal sticker art pass: one visual language for avatars and room entry.", "animal portrait style pass");
expectContains(css, "Final room-pass: make the room UI feel like notes pinned over the painting.", "final room style pass");
expectContains(finalPass, ".character-select-panel", "character select final override");
expectContains(finalPass, ".poker-table-board .poker-seat", "poker seat final override");
expectContains(finalPass, ".poker-table-board .seat-resource", "seat resource final override");
expectContains(finalPass, "@media (min-width: 1080px)", "desktop action dock sizing override");

expectNearby(".hero-shell .character-select-panel", ["border: 0 !important", "border-radius: 18px 12px 20px 14px"]);
expectNearby(".character-select-preview", ["background: transparent !important", "box-shadow: none !important"]);
expectNearby(".hero-shell .character-option", [
  "border-width: 0 0 1px !important",
  "border-style: dashed !important"
]);
expectNearby(".poker-table-board .poker-seat", [
  "border: 0 !important",
  "border-radius: 15px 10px 16px 11px"
]);
expectNearby(".poker-table-board .seat-resource", [
  "border-width: 0 0 0 1px !important",
  "background: transparent !important",
  "box-shadow: none !important"
]);
expectNearby(".poker-table-board .seat-skill-card", [
  "border: 0 !important",
  "box-shadow: inset 0 -1px 0 rgba(36, 31, 25, 0.06) !important"
]);
expectNearby(".table-action-dock", [
  "min-width: 360px !important",
  "max-height: min(420px, calc(100vh - 210px)) !important"
]);

for (const token of ["\uFFFD", "楗?", "缇庢湳", "鍔ㄧ敾", "鏂囧"]) {
  if (css.includes(token)) {
    failures.push(`styles.css contains likely mojibake token ${JSON.stringify(token)}`);
  }
}

for (const relativePath of visualDoctrinePaths) {
  const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  expectContains(source, "油画", `${relativePath} should keep oil-paint art direction`);
  if (relativePath !== "workflow/docs/01-visual-bible.md") {
    expectContains(source, "搞怪动物", `${relativePath} should keep animal character direction`);
  }

  for (const token of ["\uFFFD", "楗?", "缇庢湳", "鍔ㄧ敾", "鏂囧"]) {
    if (source.includes(token)) {
      failures.push(`${relativePath} contains likely mojibake token ${JSON.stringify(token)}`);
    }
  }

  for (const stalePhrase of [
    "深渊遗物",
    "深渊牌桌",
    "真人比例",
    "接近真人比例",
    "半写实",
    "真人比例的半写实",
    "半写实游戏角色",
    "半写实 3D"
  ]) {
    if (source.includes(stalePhrase)) {
      failures.push(`${relativePath} contains stale art direction phrase ${JSON.stringify(stalePhrase)}`);
    }
  }
}

if (failures.length > 0) {
  console.error("visual style audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("visual style audit passed: room entry and table HUD soft-frame rules are present");

function sectionAfter(marker: string): string {
  const index = css.indexOf(marker);
  if (index === -1) {
    failures.push(`missing section marker: ${marker}`);
    return "";
  }
  return css.slice(index);
}

function expectContains(source: string, needle: string, label: string): void {
  if (!source.includes(needle)) {
    failures.push(`${label}: missing ${needle}`);
  }
}

function expectNearby(selector: string, needles: string[]): void {
  const index = finalPass.indexOf(selector);
  if (index === -1) {
    failures.push(`${selector}: missing selector`);
    return;
  }

  const nearby = finalPass.slice(index, index + 1300);
  for (const needle of needles) {
    if (!nearby.includes(needle)) {
      failures.push(`${selector}: missing nearby declaration ${needle}`);
    }
  }
}
