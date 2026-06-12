import { ScrollText } from "lucide-react";
import { PublicGameState } from "@bing/shared";
import { formatEvent } from "../lib/format";

interface EventLogProps {
  state: PublicGameState;
}

export function EventLog({ state }: EventLogProps) {
  const events = state.eventLog
    .filter(
      (event) =>
        event.type !== "action_submitted" &&
        event.type !== "cake_changed"
    )
    .slice(-10)
    .reverse();

  return (
    <aside className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-teal-700" aria-hidden="true" />
          <h2 className="text-base font-semibold text-gray-900">结算日志</h2>
        </div>
        <span className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-bold text-gray-500">
          {events.length}
        </span>
      </div>
      <div className="max-h-[130px] space-y-2 overflow-auto pr-1">
        {events.length === 0 ? (
          <p className="text-sm text-gray-500">暂无事件</p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className={["event-card", eventTone(event.type)].join(" ")}
            >
              <span className="mr-2 font-bold text-gray-400">
                R{event.roundNumber}/T{event.turnNumber}
              </span>
              {formatEvent(event, state)}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function eventTone(type: string): string {
  if (type === "damage" || type === "player_died") {
    return "event-danger";
  }

  if (type === "heal") {
    return "event-heal";
  }

  if (type === "attack_reflected" || type === "rebound_broken") {
    return "event-rebound";
  }

  if (type === "attack_blocked") {
    return "event-block";
  }

  if (type === "turn_revealed" || type === "skill_revealed" || type === "skill_used" || type === "action_switched") {
    return "event-turn";
  }

  return "";
}
