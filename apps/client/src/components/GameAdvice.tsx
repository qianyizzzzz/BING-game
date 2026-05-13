import { Lightbulb } from "lucide-react";
import { GameEvent, PublicGameState, getActionPlanLabel } from "@bing/shared";
import { playerName } from "../lib/format";

interface GameAdviceProps {
  state: PublicGameState;
}

export function GameAdvice({ state }: GameAdviceProps) {
  if (state.phase !== "finished") {
    return null;
  }

  const advice = buildAdvice(state);
  return (
    <section className="surface-card advice-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-amber-600" aria-hidden="true" />
        <h2 className="text-base font-black text-gray-900">赛后建议</h2>
      </div>
      <div className="space-y-2">
        {advice.map((item) => (
          <div key={item} className="advice-item">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function buildAdvice(state: PublicGameState): string[] {
  const viewer = state.players.find((player) => player.id === state.viewerPlayerId);
  const winnerNames = state.winnerIds.map((winnerId) => playerName(state, winnerId));
  const damageTaken = sumEvents(
    state.eventLog,
    (event) => event.type === "damage" && event.targetId === viewer?.id
  );
  const damageDone = sumEvents(
    state.eventLog,
    (event) => event.type === "damage" && event.sourceId === viewer?.id
  );
  const blockedCount = state.eventLog.filter(
    (event) => event.type === "attack_blocked" && event.targetId === viewer?.id
  ).length;
  const reboundCount = state.eventLog.filter(
    (event) => event.type === "attack_reflected" && event.originalTargetId === viewer?.id
  ).length;
  const revealEvents = state.eventLog.filter(
    (event): event is Extract<GameEvent, { type: "turn_revealed" }> =>
      event.type === "turn_revealed"
  );
  const viewerActions = viewer
    ? revealEvents
        .map((event) => event.actions[viewer.id])
        .filter((plan): plan is NonNullable<typeof plan> => Boolean(plan))
        .map((plan) => getActionPlanLabel(plan))
    : [];
  const cakeTurns = viewerActions.filter((label) => label === "饼").length;
  const attackTurns = viewerActions.filter((label) => !["饼", "小防", "油条", "石头", "反弹"].includes(label)).length;
  const resultLine =
    viewer && state.winnerIds.includes(viewer.id)
      ? "你赢下了这局。下一步可以尝试更早逼出对手防御，再用高等级招式收尾。"
      : `本局胜者：${winnerNames.join("、") || "无"}。你可以重点复盘最后两轮的饼量和防御选择。`;

  const advice = [resultLine];
  if (damageTaken > damageDone) {
    advice.push(`你的承伤 ${damageTaken} 高于输出 ${damageDone}，建议在对手有 2-4 饼时优先考虑油条，5 饼以上提高石头或反弹的权重。`);
  } else {
    advice.push(`你的输出 ${damageDone} 不低，下一步可以练习多目标出招，避免把所有压力都压在同一个目标上。`);
  }

  if (cakeTurns < 2 && revealEvents.length >= 4) {
    advice.push("你攒饼回合偏少，容易只能打低费招。基础局里前两轮稳定攒饼通常更稳。");
  }

  if (attackTurns > cakeTurns + 2) {
    advice.push("你的攻击频率偏高。对手饼量充足时，连续进攻容易被对撞或反弹惩罚。");
  }

  if (blockedCount === 0 && damageTaken > 0) {
    advice.push("本局几乎没有成功防住伤害，建议先记住：杀/擒用小防，南蛮/闪电偏油条，火舞/核爆偏石头。");
  }

  if (reboundCount > 0) {
    advice.push("你使用过反弹。反弹的目标选择很关键，优先弹给血量低或已经被多人集火的玩家。");
  }

  if (viewer?.skills.length) {
    advice.push("你本局有技能。主动技能要和基础招式一起算饼量，锁定技则会自动改变某些招式的收益。");
  }

  return advice.slice(0, 5);
}

function sumEvents(
  events: GameEvent[],
  predicate: (event: GameEvent) => boolean
): number {
  return events.reduce((sum, event) => {
    if (event.type !== "damage" || !predicate(event)) {
      return sum;
    }

    return sum + event.amount;
  }, 0);
}
