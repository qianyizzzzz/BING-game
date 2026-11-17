import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame } from "../packages/shared/src/engine/gameFactory";
import { HEALING_ART_ID } from "../packages/shared/src/bigCards/abilities";
import { CHEAT_TRANSFER_ID } from "../packages/shared/src/engine/cheatServerIds";
import { getCheatServerUseOptions, transferCheatServerUse, validateCheatServerUseTransfer } from "../packages/shared/src/engine/cheatServerUses";
import { getBigCardLimitedRemaining, setSkillUseBalanceAdjustment } from "../packages/shared/src/engine/limitedUseBalance";
import { getSkillUseLimit } from "../packages/shared/src/skills/registry";

const dusk = "1060106";

function makeHolder() {
  const player = createGame("甲", { skillMode: "big_test_select" }).players[0]!;
  player.skills.push(HEALING_ART_ID, "1044", "1102");
  player.bigCards = [
    { cardId: "10601", instanceId: "海神甲", onlyAbilityId: dusk, abilityUses: { [dusk]: 2 } },
    { cardId: "10601", instanceId: "海神乙", onlyAbilityId: dusk, abilityUses: { [dusk]: 3 } },
    { cardId: "10603", instanceId: "作弊", onlyAbilityId: CHEAT_TRANSFER_ID },
    { cardId: "10532", instanceId: "刹那" },
    { cardId: "10558", instanceId: "破天圣剑" }
  ];
  return player;
}

test("次数转移逐一选择大卡副本，可以补充耗尽的副本", () => {
  const player = makeHolder();
  const [donor, recipient] = player.bigCards!;
  const from = `${dusk}:${donor!.instanceId}`;
  const to = `${dusk}:${recipient!.instanceId}`;
  assert.equal(validateCheatServerUseTransfer(player, from, to), true);
  assert.equal(transferCheatServerUse(player, from, to), true);
  assert.equal(getBigCardLimitedRemaining(donor!, dusk, 3), 0);
  assert.equal(getBigCardLimitedRemaining(recipient!, dusk, 3), 1);
  assert.equal(donor!.abilityUses![dusk], 2);
  assert.equal(recipient!.abilityUses![dusk], 3);
  assert.equal(transferCheatServerUse(player, from, to), false);
});

test("次数转移支持小技能和负余额，排除周期、一次性绑定和武器次数", () => {
  const player = makeHolder();
  const from = `${dusk}:${player.bigCards![0]!.instanceId}`;
  const baseHealingUses = getSkillUseLimit(player, HEALING_ART_ID)!;
  setSkillUseBalanceAdjustment(player, HEALING_ART_ID, -baseHealingUses - 1);
  const optionIds = getCheatServerUseOptions(player).map(({ id }) => id);
  assert.ok(!optionIds.includes(`${CHEAT_TRANSFER_ID}:作弊`));
  assert.ok(!optionIds.includes("1044"));
  assert.ok(!optionIds.includes("1102"));
  assert.ok(!optionIds.some((id) => id.startsWith("10532") || id.startsWith("10558")));
  assert.equal(validateCheatServerUseTransfer(player, HEALING_ART_ID, from), false);
  assert.equal(validateCheatServerUseTransfer(player, from, from), false);
  assert.equal(validateCheatServerUseTransfer(player, from, `1060101:${player.bigCards![0]!.instanceId}`), false);
  assert.equal(transferCheatServerUse(player, from, HEALING_ART_ID), true);
  assert.equal(getSkillUseLimit(player, HEALING_ART_ID), 0);
});
