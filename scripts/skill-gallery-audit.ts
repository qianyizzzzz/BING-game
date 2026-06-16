import fs from "node:fs";
import path from "node:path";
import { getAllSkills } from "../packages/shared/src/skills/registry";

const projectRoot = process.cwd();
const files = {
  referencePanel: read("apps/client/src/components/ReferencePanel.tsx"),
  skillPanel: read("apps/client/src/components/SkillPanel.tsx"),
  styles: read("apps/client/src/styles.css")
};
const failures: string[] = [];
const skillCount = getAllSkills().length;

expect(skillCount >= 100, `expected at least 100 skills, got ${skillCount}`);

expectContains(files.skillPanel, "skill-gallery-panel", "SkillPanel should render a gallery panel");
expectContains(files.skillPanel, "skill-gallery-feature", "SkillPanel should render a featured skill card");
expectContains(files.skillPanel, "skill-gallery-thumb", "SkillPanel should render thumbnail cards");
expectContains(files.skillPanel, "aria-label=\"本局技能卡册\"", "SkillPanel gallery should expose a Chinese aria label");
expectContains(files.skillPanel, "setSelectedSkillId(skillId)", "SkillPanel cards should be selectable");
expectContains(files.skillPanel, "skill-used-flash", "SkillPanel should preserve triggered-skill feedback");
expectContains(files.skillPanel, "skillCostPipCount(skill)", "SkillPanel cards should show cost pips");
expectContains(files.skillPanel, "SKILL_TIMING_PHASE_LABELS", "SkillPanel cards should show timing phases");

expectContains(files.referencePanel, "reference-skill-toolbar", "ReferencePanel should keep a gallery toolbar");
expectContains(files.referencePanel, "reference-skill-search", "ReferencePanel should keep search");
expectContains(files.referencePanel, "placeholder={`搜索 ${skills.length} 个技能`}", "ReferencePanel search should show total skill count");
expectContains(files.referencePanel, "reference-skill-count", "ReferencePanel should show filtered/total counts");
expectContains(files.referencePanel, "aria-label=\"技能分类\"", "ReferencePanel should expose category filtering");
expectContains(files.referencePanel, "reference-filter-chip", "ReferencePanel should keep category chips");
expectContains(files.referencePanel, "ReferenceSkillFeature", "ReferencePanel should render a selected feature card");
expectContains(files.referencePanel, "reference-skill-gallery", "ReferencePanel should render the full skill gallery");
expectContains(files.referencePanel, "filteredSkills.map", "ReferencePanel should map all filtered skills to cards");
expectContains(files.referencePanel, "没有匹配的技能。", "ReferencePanel should keep empty-state copy");

expectCssClass("skill-gallery-panel");
expectCssClass("skill-gallery-feature");
expectCssClass("skill-gallery-feature-art");
expectCssClass("skill-gallery-thumb");
expectCssClass("skill-gallery-thumb-active");
expectCssClass("reference-skill-toolbar");
expectCssClass("reference-skill-card");
expectCssClass("reference-skill-card-active");
expectCssClass("reference-filter-chip");
expectCssClass("reference-filter-chip-active");

if (failures.length > 0) {
  console.error("skill gallery audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`skill gallery audit passed: reference gallery covers ${skillCount} skills`);

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function expect(condition: boolean, message: string): void {
  if (!condition) {
    failures.push(message);
  }
}

function expectContains(source: string, needle: string, label: string): void {
  if (!source.includes(needle)) {
    failures.push(`${label}: missing ${needle}`);
  }
}

function expectCssClass(selectorClass: string): void {
  if (!files.styles.includes(`.${selectorClass}`)) {
    failures.push(`styles.css: missing .${selectorClass}`);
  }
}
