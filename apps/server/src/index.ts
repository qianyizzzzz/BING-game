import express from "express";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketAck,
  SocketData,
  DEFEAT_LEVEL_LABELS,
  getActionLabel,
  getActionPlanLabel,
  getSkill
} from "@bing/shared";
import { RoomStore } from "./roomStore";
import type { PlayerState } from "@bing/shared";

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const EXTRA_ALLOWED_ORIGINS = parseOriginList(
  process.env.PUBLIC_ORIGINS ?? process.env.CLIENT_ORIGINS ?? ""
);
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const defaultPublicDir = path.resolve(serverDir, "../../client/dist");
const publicDir = path.resolve(process.env.PUBLIC_DIR ?? defaultPublicDir);
const dataDir = path.resolve(serverDir, "../../../data");
const accountFile = path.resolve(
  process.env.ACCOUNT_DATA_FILE ?? path.join(dataDir, "accounts", "accounts.json")
);

const app = express();
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: isAllowedOrigin,
    methods: ["GET", "POST"]
  }
});

const rooms = new RoomStore();
const roomTimers = new Map<string, ReturnType<typeof setTimeout>>();

interface AccountRecord {
  id: string;
  name: string;
  avatarUrl?: string;
  createdAt: number;
  updatedAt: number;
}

type AccountStore = Record<string, AccountRecord>;

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    name: "bing-server"
  });
});

app.post("/api/accounts/register", (request, response) => {
  const rawName = typeof request.body?.name === "string" ? request.body.name : "";
  const rawAccountId =
    typeof request.body?.accountId === "string" ? request.body.accountId : "";
  const rawAvatarUrl =
    typeof request.body?.avatarUrl === "string" ? request.body.avatarUrl : "";
  const accounts = readAccounts();
  const existing = rawAccountId ? accounts[rawAccountId] : undefined;
  const id = existing?.id ?? createAccountId();
  const now = Date.now();
  const account: AccountRecord = {
    id,
    name: rawName.trim().slice(0, 16) || "玩家",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };

  if (rawAvatarUrl.startsWith("data:image/") && rawAvatarUrl.length <= 14_000_000) {
    account.avatarUrl = rawAvatarUrl;
  } else if (existing?.avatarUrl) {
    account.avatarUrl = existing.avatarUrl;
  }

  accounts[id] = account;
  writeAccounts(accounts);
  response.json({ account });
});

app.get("/api/accounts/:accountId", (request, response) => {
  const account = readAccounts()[request.params.accountId];
  if (!account) {
    response.status(404).json({ error: "账号不存在" });
    return;
  }

  response.json({ account });
});

app.get("/api/matches", (_request, response) => {
  response.json({
    matches: rooms.listRecordedMatches()
  });
});

app.get("/api/matches/:roomId", (request, response) => {
  const state = rooms.readRecordedMatch(request.params.roomId);
  if (!state) {
    response.status(404).json({ error: "比赛不存在" });
    return;
  }

  response.json({ state });
});

app.get("/api/matches/:roomId/training-samples", (request, response) => {
  response.json({
    samples: rooms.readTrainingSamples(request.params.roomId)
  });
});

app.get("/replay/:roomId.txt", (request, response) => {
  const state = rooms.readRecordedMatch(request.params.roomId);
  if (!state) {
    response.status(404).type("text/plain; charset=utf-8").send("复盘不存在\n");
    return;
  }

  response
    .type("text/plain; charset=utf-8")
    .attachment(`${state.id}-replay.txt`)
    .send(renderReplayText(state));
});

app.get("/replay/:roomId", (request, response) => {
  const state = rooms.readRecordedMatch(request.params.roomId);
  if (!state) {
    response.status(404).type("html; charset=utf-8").send("<!doctype html><meta charset=\"utf-8\"><title>复盘不存在</title><p>复盘不存在</p>");
    return;
  }

  response.type("html; charset=utf-8").send(renderReplayHtml(state));
});

io.on("connection", (socket) => {
  socket.on("room:create", (payload, ack) => {
    safely(ack, () => {
      const { state, player } = rooms.createRoom(payload.playerName, playerProfile(payload));
      socket.data.roomId = state.id;
      socket.data.playerId = player.id;
      void socket.join(state.id);
      const publicState = rooms.publicState(state.id, player.id);
      void broadcastRoomState(state.id);
      return {
        roomId: state.id,
        playerId: player.id,
        state: publicState
      };
    });
  });

  socket.on("room:join", (payload, ack) => {
    safely(ack, () => {
      const { state, player } = rooms.joinRoom(payload.roomId, payload.playerName, playerProfile(payload));
      socket.data.roomId = state.id;
      socket.data.playerId = player.id;
      void socket.join(state.id);
      const publicState = rooms.publicState(state.id, player.id);
      void broadcastRoomState(state.id);
      return {
        roomId: state.id,
        playerId: player.id,
        state: publicState
      };
    });
  });

  socket.on("room:spectate", (payload, ack) => {
    safely(ack, () => {
      const { state, player } = rooms.spectateRoom(payload.roomId, payload.playerName, playerProfile(payload));
      socket.data.roomId = state.id;
      socket.data.playerId = player.id;
      void socket.join(state.id);
      const publicState = rooms.publicState(state.id, player.id);
      void broadcastRoomState(state.id);
      return {
        roomId: state.id,
        playerId: player.id,
        state: publicState
      };
    });
  });

  socket.on("room:resume", (payload, ack) => {
    safely(ack, () => {
      const { state, player } = rooms.resumePlayer(payload.roomId, payload.playerId);
      socket.data.roomId = state.id;
      socket.data.playerId = player.id;
      void socket.join(state.id);
      const publicState = rooms.publicState(state.id, player.id);
      void broadcastRoomState(state.id);
      return {
        roomId: state.id,
        playerId: player.id,
        state: publicState
      };
    });
  });

  socket.on("room:add_ai", (payload, ack) => {
    safely(ack, () => {
      rooms.addAi(payload.roomId);
      void broadcastRoomState(payload.roomId);
      return {
        state: rooms.publicState(payload.roomId, socket.data.playerId)
      };
    });
  });

  socket.on("room:rename", (payload, ack) => {
    safely(ack, () => {
      const playerId = requirePlayerId(socket.data.playerId);
      const state = rooms.renamePlayer(payload.roomId, playerId, payload.name);
      void broadcastRoomState(payload.roomId);
      return {
        roomId: state.id,
        playerId,
        state: rooms.publicState(state.id, playerId)
      };
    });
  });

  socket.on("room:leave", (payload, ack) => {
    safely(ack, () => {
      const playerId = requirePlayerId(socket.data.playerId);
      const state = rooms.leaveRoom(payload.roomId, playerId);
      void socket.leave(payload.roomId);
      delete socket.data.roomId;
      delete socket.data.playerId;
      if (state) {
        void broadcastRoomState(payload.roomId);
        return {
          state: rooms.publicState(payload.roomId)
        };
      }

      clearRoomTimer(payload.roomId);
      return {};
    });
  });

  socket.on("room:kick", (payload, ack) => {
    safely(ack, () => {
      const ownerId = requirePlayerId(socket.data.playerId);
      rooms.kickPlayer(payload.roomId, ownerId, payload.targetPlayerId);
      void kickSocketFromRoom(payload.roomId, payload.targetPlayerId);
      void broadcastRoomState(payload.roomId);
      return {
        state: rooms.publicState(payload.roomId, ownerId)
      };
    });
  });

  socket.on("room:update_settings", (payload, ack) => {
    safely(ack, () => {
      const ownerId = requirePlayerId(socket.data.playerId);
      rooms.updateSettings(payload.roomId, ownerId, payload.config);
      void broadcastRoomState(payload.roomId);
      return {
        state: rooms.publicState(payload.roomId, ownerId)
      };
    });
  });

  socket.on("room:update_player_skills", (payload, ack) => {
    safely(ack, () => {
      const playerId = requirePlayerId(socket.data.playerId);
      rooms.updatePlayerSkills(
        payload.roomId,
        playerId,
        payload.targetPlayerId,
        payload.skillIds
      );
      void broadcastRoomState(payload.roomId);
      return {
        state: rooms.publicState(payload.roomId, playerId)
      };
    });
  });

  socket.on("game:start", (payload, ack) => {
    safely(ack, () => {
      const playerId = requirePlayerId(socket.data.playerId);
      rooms.start(payload.roomId, playerId);
      void broadcastRoomState(payload.roomId);
      return {
        state: rooms.publicState(payload.roomId, socket.data.playerId)
      };
    });
  });

  socket.on("game:submit_action", (payload, ack) => {
    safely(ack, () => {
      const playerId = requirePlayerId(socket.data.playerId);

      const result = rooms.submitAction(payload.roomId, playerId, payload.action);
      void broadcastRoomState(payload.roomId);
      return {
        state: rooms.publicState(payload.roomId, playerId),
        resolved: result.resolved
      };
    });
  });

  socket.on("game:enter_action_window", (payload, ack) => {
    safely(ack, () => {
      const playerId = requirePlayerId(socket.data.playerId);
      rooms.enterActionWindow(payload.roomId, playerId);
      void broadcastRoomState(payload.roomId);
      return {
        state: rooms.publicState(payload.roomId, playerId)
      };
    });
  });

  socket.on("game:pass_action_window", (payload, ack) => {
    safely(ack, () => {
      const playerId = requirePlayerId(socket.data.playerId);
      rooms.passActionWindow(payload.roomId, playerId);
      void broadcastRoomState(payload.roomId);
      return {
        state: rooms.publicState(payload.roomId, playerId)
      };
    });
  });

  socket.on("game:skip_to_next_action", (payload, ack) => {
    safely(ack, () => {
      const playerId = requirePlayerId(socket.data.playerId);
      rooms.skipActionWindowsUntilTurnAction(payload.roomId, playerId);
      void broadcastRoomState(payload.roomId);
      return {
        state: rooms.publicState(payload.roomId, playerId)
      };
    });
  });

  socket.on("game:submit_window_skill", (payload, ack) => {
    safely(ack, () => {
      const playerId = requirePlayerId(socket.data.playerId);
      rooms.submitWindowSkill(payload.roomId, playerId, payload.action);
      void broadcastRoomState(payload.roomId);
      return {
        state: rooms.publicState(payload.roomId, playerId)
      };
    });
  });

  socket.on("game:guess_skill", (payload, ack) => {
    safely(ack, () => {
      const playerId = requirePlayerId(socket.data.playerId);
      rooms.guessSkill(payload.roomId, playerId, payload.targetPlayerId, payload.targetSkillId);
      void broadcastRoomState(payload.roomId);
      return {
        state: rooms.publicState(payload.roomId, playerId)
      };
    });
  });
});

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.use((request, response, next) => {
    if (request.method !== "GET" || request.path.startsWith("/api")) {
      next();
      return;
    }

    const indexPath = path.join(publicDir, "index.html");
    if (fs.existsSync(indexPath)) {
      response.sendFile(indexPath);
      return;
    }

    next();
  });
}

async function broadcastRoomState(roomId: string): Promise<void> {
  scheduleTurnTimer(roomId);
  const sockets = await io.in(roomId).fetchSockets();
  for (const roomSocket of sockets) {
    roomSocket.emit(
      "room:state",
      rooms.publicState(roomId, roomSocket.data.playerId)
    );
  }
}

async function kickSocketFromRoom(roomId: string, playerId: string): Promise<void> {
  const sockets = await io.in(roomId).fetchSockets();
  for (const roomSocket of sockets) {
    if (roomSocket.data.playerId !== playerId) {
      continue;
    }

    roomSocket.emit("room:error", "你已被房主移出房间");
    delete roomSocket.data.roomId;
    delete roomSocket.data.playerId;
    await roomSocket.leave(roomId);
  }
}

function scheduleTurnTimer(roomId: string): void {
  clearRoomTimer(roomId);
  const state = rooms.get(roomId);
  const deadline =
    state?.phase === "action_window"
      ? state.actionWindowDeadlineAt
      : state?.phase === "collecting_actions"
        ? state.turnDeadlineAt
        : undefined;
  if (!state || !deadline) {
    return;
  }

  const delay = Math.max(0, deadline - Date.now());
  const timer = setTimeout(() => {
    try {
      rooms.resolveTimedOutActions(roomId);
      void broadcastRoomState(roomId);
    } catch (error) {
      console.error(error);
    }
  }, delay);
  roomTimers.set(roomId, timer);
}

function clearRoomTimer(roomId: string): void {
  const timer = roomTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
  }
  roomTimers.delete(roomId);
}

function safely<T>(
  ack: (response: SocketAck<T>) => void,
  fn: () => T
): void {
  try {
    ack({
      ok: true,
      data: fn()
    });
  } catch (error) {
    ack({
      ok: false,
      error: error instanceof Error ? error.message : "未知错误"
    });
  }
}

function requirePlayerId(playerId: string | undefined): string {
  if (!playerId) {
    throw new Error("当前连接还没有加入房间");
  }

  return playerId;
}

function playerProfile(payload: {
  accountId?: string;
  avatarUrl?: string;
}): Pick<PlayerState, "accountId" | "avatarUrl"> {
  const profile: Pick<PlayerState, "accountId" | "avatarUrl"> = {};
  if (payload.accountId) {
    profile.accountId = payload.accountId;
  }
  if (payload.avatarUrl) {
    profile.avatarUrl = payload.avatarUrl;
  }

  return profile;
}

function readAccounts(): AccountStore {
  if (!fs.existsSync(accountFile)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(accountFile, "utf-8")) as AccountStore;
  } catch {
    return {};
  }
}

function writeAccounts(accounts: AccountStore): void {
  fs.mkdirSync(path.dirname(accountFile), { recursive: true });
  fs.writeFileSync(accountFile, `${JSON.stringify(accounts, null, 2)}\n`, "utf-8");
}

function createAccountId(): string {
  return `acct_${Math.random().toString(36).slice(2, 10)}`;
}

function isAllowedOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void
): void {
  if (!origin) {
    callback(null, true);
    return;
  }

  const allowedOrigins = new Set([
    CLIENT_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...EXTRA_ALLOWED_ORIGINS
  ]);

  if (allowedOrigins.has(origin)) {
    callback(null, true);
    return;
  }

  try {
    const url = new URL(origin);
    const isAppPort = url.port === "5173" || url.port === String(PORT);
    const isDefaultWebPort = url.port === "" || url.port === "80" || url.port === "443";

    callback(
      null,
      (isAppPort && isLocalNetworkHost(url.hostname)) ||
        (isDefaultWebPort && isKnownTunnelHost(url.hostname))
    );
  } catch {
    callback(null, false);
  }
}

function parseOriginList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isLocalNetworkHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".ts.net")
  ) {
    return true;
  }

  const octets = host.split(".").map((part) => Number(part));
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }

  const [first, second] = octets as [number, number, number, number];
  return (
    first === 10 ||
    first === 25 ||
    first === 26 ||
    (first === 192 && second === 168) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 100 && second >= 64 && second <= 127)
  );
}

function isKnownTunnelHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host.endsWith(".trycloudflare.com") ||
    host.endsWith(".ngrok-free.app") ||
    host.endsWith(".ngrok.app") ||
    host.endsWith(".serveousercontent.com") ||
    host.endsWith(".serveo.net") ||
    host.endsWith(".loca.lt")
  );
}

type RecordedMatch = NonNullable<ReturnType<RoomStore["readRecordedMatch"]>>;
type RecordedEvent = RecordedMatch["eventLog"][number];

function renderReplayText(state: ReturnType<RoomStore["readRecordedMatch"]>): string {
  if (!state) {
    return "";
  }

  const players = new Map(state.players.map((player) => [player.id, player.name]));
  const lines = [
    "============================================================",
    "《饼》复盘报告",
    "============================================================",
    `房间号：${state.id}`,
    `当前阶段：${phaseLabel(state.phase)}`,
    `轮 / 回合：第 ${state.roundNumber} 轮 · 本轮第 ${state.roundTurnNumber} 回合`,
    `生成时间：${new Date().toLocaleString("zh-CN")}`,
    "",
    "一、快速结论",
    "------------------------------------------------------------",
    ...buildReplaySummary(state, players),
    "",
    "二、玩家终局",
    "------------------------------------------------------------",
    "玩家           身份   状态   血量   饼   技能"
  ];

  for (const player of state.players) {
    const skills = player.skills
      .map((skillId) => getSkill(skillId)?.name ?? skillId)
      .join("、") || "无";
    lines.push(
      `${padText(player.name, 13)} ${padText(player.kind === "ai" ? "AI" : "真人", 6)} ${padText(playerStatusLabel(player), 6)} ${padText(String(player.hp), 6)} ${padText(String(player.cakes), 4)} ${skills}`
    );
  }

  lines.push(
    "",
    "三、关键回合",
    "------------------------------------------------------------",
    ...buildReplayTurnBlocks(state, players),
    "",
    "四、完整事件流（已隐藏“等待提交”等噪声事件）",
    "------------------------------------------------------------"
  );

  for (const event of state.eventLog.filter((item) => !isReplayNoiseEvent(item))) {
    lines.push(...renderReplayTextEvent(event, players));
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildReplaySummary(
  state: RecordedMatch,
  players: Map<string, string>
): string[] {
  const damageDone = new Map<string, number>();
  const damageTaken = new Map<string, number>();
  const healingDone = new Map<string, number>();
  let biggestHit: Extract<RecordedEvent, { type: "damage" }> | undefined;
  let revealCount = 0;
  let reboundCount = 0;
  let blockCount = 0;

  for (const event of state.eventLog) {
    if (event.type === "turn_revealed") {
      revealCount += 1;
      continue;
    }

    if (event.type === "damage") {
      damageTaken.set(event.targetId, (damageTaken.get(event.targetId) ?? 0) + event.amount);
      if (event.sourceId) {
        damageDone.set(event.sourceId, (damageDone.get(event.sourceId) ?? 0) + event.amount);
      }
      if (!biggestHit || event.amount > biggestHit.amount) {
        biggestHit = event;
      }
      continue;
    }

    if (event.type === "heal") {
      healingDone.set(event.targetId, (healingDone.get(event.targetId) ?? 0) + event.amount);
      continue;
    }

    if (event.type === "attack_reflected") {
      reboundCount += 1;
      continue;
    }

    if (event.type === "attack_blocked") {
      blockCount += 1;
    }
  }

  const winners = state.winnerIds.map((id) => playerLabel(players, id)).join("、") || "暂无";
  const topDamage = topStat(damageDone, players);
  const topTaken = topStat(damageTaken, players);
  const topHealing = topStat(healingDone, players);
  const skillPlayers = state.players.filter((player) => player.skills.length > 0).length;
  const lines = [
    `- 本局共结算 ${revealCount} 个回合，发生 ${state.eventLog.length} 条事件，胜者：${winners}。`,
    `- 伤害输出最高：${topDamage}；承伤最高：${topTaken}；回复最高：${topHealing}。`,
    `- 防御成功 ${blockCount} 次，反弹转移 ${reboundCount} 次。`
  ];

  if (biggestHit) {
    lines.push(
      `- 最大单次伤害：${playerLabel(players, biggestHit.sourceId)} 用 ${biggestHit.attackName ?? "攻击"} 对 ${playerLabel(players, biggestHit.targetId)} 造成 ${biggestHit.amount} 点。`
    );
  }

  if (state.config.skillCount > 0) {
    lines.push(
      `- 本局开启小技能数量 ${state.config.skillCount}，共有 ${skillPlayers} 名玩家持有技能；带技能对局会被优先用于后续 AI 训练。`
    );
  } else {
    lines.push("- 本局是基础规则局，适合分析攒饼、防御克制和攻击时机。");
  }

  const recommendation =
    reboundCount > blockCount
      ? "反弹参与度较高，复盘时重点看反弹目标选择和破弹攻击的出手窗口。"
      : "防御和出饼节奏更关键，复盘时重点看是否在对方饼数到达攻击阈值前选择了正确防御。";
  lines.push(`- AI 复盘建议：${recommendation}`);

  return lines;
}

function buildReplayTurnBlocks(
  state: RecordedMatch,
  players: Map<string, string>
): string[] {
  const blocks: string[] = [];
  let current: Extract<RecordedEvent, { type: "turn_revealed" }> | undefined;
  let currentEvents: RecordedEvent[] = [];

  const flush = () => {
    if (!current) {
      return;
    }

    blocks.push(`R${current.roundNumber}/T${current.turnNumber} 亮招`);
    const actions = Object.entries(current.actions)
      .map(([playerId, plan]) => `${playerLabel(players, playerId)}：${getActionPlanLabel(plan)}`)
      .join("  |  ");
    blocks.push(`  出招：${actions || "无"}`);

    const highlights = currentEvents
      .filter((event) =>
        [
          "damage",
          "heal",
          "attack_blocked",
          "attack_reflected",
          "rebound_broken",
          "clash",
          "round_ended",
          "player_died",
          "game_finished",
          "system"
        ].includes(event.type)
      )
      .flatMap((event) => renderReplayTextEvent(event, players).map((line) => `  ${line.replace(/^\[[^\]]+\]\s*/, "")}`));

    if (highlights.length === 0) {
      blocks.push("  结果：无人受伤，进入下一回合。");
    } else {
      blocks.push(...highlights);
    }
    blocks.push("");
  };

  for (const event of state.eventLog) {
    if (event.type === "turn_revealed") {
      flush();
      current = event;
      currentEvents = [];
      continue;
    }

    if (current) {
      currentEvents.push(event);
    }
  }
  flush();

  return blocks.length > 0 ? blocks : ["暂无亮招记录。"];
}

function isReplayNoiseEvent(event: RecordedEvent): boolean {
  return event.type === "action_submitted" || event.type === "player_ready";
}

function renderReplayTextEvent(
  event: RecordedEvent,
  players: Map<string, string>
): string[] {
  const time = `[R${event.roundNumber}/T${event.turnNumber}]`;
  switch (event.type) {
    case "turn_revealed": {
      const lines = [`${time} 本回合出招`];
      for (const [playerId, plan] of Object.entries(event.actions)) {
        lines.push(`  - ${playerLabel(players, playerId)}：${getActionPlanLabel(plan)}`);
      }
      return lines;
    }
    case "cake_changed":
      return [`${time} ${playerLabel(players, event.playerId)} 的饼：${event.before} -> ${event.after}（${event.reason}）`];
    case "damage":
      return [`${time} ${playerLabel(players, event.sourceId)} 用 ${event.attackName ?? "攻击"} 命中 ${playerLabel(players, event.targetId)}，造成 ${event.amount} 点伤害。`];
    case "heal":
      return [`${time} ${playerLabel(players, event.targetId)} 回复 ${event.amount} 血（${event.reason}）。`];
    case "attack_blocked":
      return [`${time} ${playerLabel(players, event.targetId)} 防住了 ${playerLabel(players, event.sourceId)} 的 ${event.attackName}。`];
    case "attack_reflected":
      return [`${time} ${playerLabel(players, event.originalTargetId)} 将 ${playerLabel(players, event.sourceId)} 的 ${event.attackName} 反弹给 ${playerLabel(players, event.reflectedTargetId)}。`];
    case "rebound_broken":
      return [`${time} ${playerLabel(players, event.sourceId)} 的 ${event.attackName} 带破弹，${playerLabel(players, event.targetId)} 的反弹失效。`];
    case "clash":
      return [`${time} 攻击对撞：${event.result}`];
    case "round_ended":
      return [`${time} 本轮结束：${event.reason}`];
    case "player_joined":
      return [`${time} ${event.name} 加入房间。`];
    case "player_renamed":
      return [`${time} ${playerLabel(players, event.playerId)} 改名为 ${event.name}。`];
    case "player_left":
      return [`${time} ${event.name} 退出房间。`];
    case "player_kicked":
      return [`${time} ${event.name} 被房主 ${playerLabel(players, event.byPlayerId)} 踢出房间。`];
    case "settings_updated":
      return [`${time} 房间设置更新：限时 ${event.config.turnTimeLimitSeconds}s，小技能 ${event.config.skillCount} 张。`];
    case "player_died":
      return [`${time} ${playerLabel(players, event.playerId)} ${defeatStatusLabel(event.defeatLevel)}。`];
    case "game_finished":
      return [`${time} 游戏结束，胜者：${event.winnerIds.map((playerId) => playerLabel(players, playerId)).join("、") || "无"}。`];
    case "system":
      return [`${time} 系统：${event.message}`];
    case "game_created":
      return [`${time} 房间已创建：${event.gameId}`];
    case "action_submitted":
      return [`${time} ${playerLabel(players, event.playerId)} 已提交出招。`];
    case "action_switched":
      return [`${time} ${playerLabel(players, event.playerId)} 使用 ${event.skillName} 将 ${getActionLabel(event.before)} 切换为 ${getActionLabel(event.after)}，消耗 ${event.cost} 饼。`];
    case "player_ready":
      return [`${time} ${playerLabel(players, event.playerId)} 已准备。`];
    default:
      return [`${time} 未分类事件。`];
  }
}

function topStat(values: Map<string, number>, players: Map<string, string>): string {
  if (values.size === 0) {
    return "无";
  }

  const [playerId, amount] = [...values.entries()].sort((a, b) => b[1] - a[1])[0]!;
  return `${playerLabel(players, playerId)} ${amount}`;
}

function padText(value: string, width: number): string {
  const clipped = value.length > width ? `${value.slice(0, Math.max(1, width - 1))}…` : value;
  return clipped.padEnd(width, " ");
}

function phaseLabel(phase: RecordedMatch["phase"]): string {
  if (phase === "lobby") {
    return "房间等待";
  }

  if (phase === "collecting_actions") {
    return "收招中";
  }

  if (phase === "action_window") {
    return "行动窗口";
  }

  if (phase === "resolving") {
    return "结算中";
  }

  return "已结束";
}

function renderReplayHtml(state: ReturnType<RoomStore["readRecordedMatch"]>): string {
  if (!state) {
    return "";
  }

  const players = new Map(state.players.map((player) => [player.id, player.name]));
  const aliveCount = state.players.filter((player) => player.status === "alive").length;
  const events = state.eventLog.map((event) => renderReplayEvent(event, players)).join("");
  const playerCards = state.players
    .map(
      (player) => `<article class="player-card">
        <div class="avatar">${escapeHtml(player.name.slice(0, 1))}</div>
        <div>
          <strong>${escapeHtml(player.name)}</strong>
          <span>${player.kind === "ai" ? "AI 玩家" : "真人玩家"} · ${playerStatusLabel(player)}</span>
        </div>
        <dl>
          <div><dt>血量</dt><dd>${player.hp}</dd></div>
          <div><dt>饼</dt><dd>${player.cakes}</dd></div>
        </dl>
      </article>`
    )
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>《饼》复盘 ${escapeHtml(state.id)}</title>
  <style>
    :root { color: #111827; background: #f4f5f1; font-family: Inter, ui-sans-serif, system-ui, "Microsoft YaHei", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-width: 320px; }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      background-image: linear-gradient(rgba(31,41,55,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(31,41,55,.055) 1px, transparent 1px);
      background-size: 28px 28px;
    }
    main { position: relative; max-width: 1180px; margin: 0 auto; padding: 28px 16px 48px; }
    header { display: grid; gap: 16px; margin-bottom: 18px; }
    h1 { margin: 0; font-size: clamp(28px, 5vw, 44px); line-height: 1.08; }
    .subtitle { margin: 8px 0 0; color: #4b5563; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .pill, .link { border: 1px solid #d1d5db; background: rgba(255,255,255,.86); border-radius: 8px; padding: 9px 12px; color: #374151; text-decoration: none; font-weight: 700; }
    .link { color: #0f766e; border-color: #99f6e4; }
    .summary { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); margin: 18px 0; }
    .metric, .player-card, .event { border: 1px solid #e5e7eb; border-radius: 8px; background: rgba(255,255,255,.94); box-shadow: 0 8px 24px rgba(15,23,42,.05); }
    .metric { padding: 14px; }
    .metric span { display: block; color: #6b7280; font-size: 13px; }
    .metric strong { display: block; margin-top: 6px; font-size: 24px; }
    .players { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-bottom: 20px; }
    .player-card { display: grid; grid-template-columns: auto 1fr; gap: 12px; padding: 14px; align-items: center; }
    .avatar { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 999px; background: #0f766e; color: #fff; font-weight: 900; }
    .player-card span { display: block; margin-top: 3px; color: #6b7280; font-size: 13px; }
    dl { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0; }
    dt { color: #6b7280; font-size: 12px; }
    dd { margin: 2px 0 0; font-size: 20px; font-weight: 900; }
    .timeline { display: grid; gap: 10px; }
    .event { position: relative; display: grid; gap: 6px; padding: 14px 16px 14px 52px; overflow: hidden; }
    .event::before { content: attr(data-mark); position: absolute; left: 14px; top: 16px; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 999px; color: white; font-weight: 900; font-size: 13px; }
    .event.turn::before { background: #0f766e; }
    .event.damage::before { background: #dc2626; }
    .event.heal::before { background: #059669; }
    .event.block::before { background: #2563eb; }
    .event.rebound::before { background: #7c3aed; }
    .event.system::before { background: #4b5563; }
    .event.join::before { background: #d97706; }
    .event.end::before { background: #111827; }
    .event small { color: #6b7280; font-weight: 700; }
    .event strong { font-size: 16px; }
    .event p { margin: 0; color: #4b5563; line-height: 1.55; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
    .action-chip { border: 1px solid #ccfbf1; border-radius: 8px; background: #f0fdfa; padding: 7px 9px; color: #0f766e; font-weight: 800; }
    @media (min-width: 760px) {
      header { grid-template-columns: 1fr auto; align-items: end; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>《饼》比赛复盘</h1>
        <p class="subtitle">按事件流记录每一次亮招、反弹、防御、伤害和轮结束，方便复盘与训练 AI。</p>
      </div>
      <div class="toolbar">
        <span class="pill">房间 ${escapeHtml(state.id)}</span>
        <a class="link" href="/api/matches/${encodeURIComponent(state.id)}">查看 JSON</a>
        <a class="link" href="/api/matches/${encodeURIComponent(state.id)}/training-samples">训练样本</a>
      </div>
    </header>
    <section class="summary" aria-label="比赛概览">
      <div class="metric"><span>当前轮</span><strong>${state.roundNumber}</strong></div>
      <div class="metric"><span>本轮回合</span><strong>${state.roundTurnNumber}</strong></div>
      <div class="metric"><span>事件数</span><strong>${state.eventLog.length}</strong></div>
      <div class="metric"><span>存活人数</span><strong>${aliveCount}</strong></div>
    </section>
    <section class="players" aria-label="玩家状态">${playerCards}</section>
    <section class="timeline" aria-label="事件时间线">${events}</section>
  </main>
</body>
</html>`;
}

function renderReplayEvent(event: RecordedEvent, players: Map<string, string>): string {
  const time = `R${event.roundNumber}/T${event.turnNumber}`;

  switch (event.type) {
    case "turn_revealed": {
      const actions = Object.entries(event.actions)
        .map(
          ([playerId, plan]) =>
            `<span class="action-chip">${escapeHtml(playerLabel(players, playerId))}：${escapeHtml(getActionPlanLabel(plan))}</span>`
        )
        .join("");
      return replayEvent("turn", "招", time, "本回合出招", "所有玩家本回合的出招如下。", `<div class="actions">${actions}</div>`);
    }
    case "damage":
      return replayEvent(
        "damage",
        "伤",
        time,
        `${playerLabel(players, event.targetId)} 受到 ${event.amount} 点伤害`,
        `${playerLabel(players, event.sourceId)} 使用 ${event.attackName ?? "攻击"} 命中。`
      );
    case "heal":
      return replayEvent(
        "heal",
        "回",
        time,
        `${playerLabel(players, event.targetId)} 回复 ${event.amount} 血`,
        event.reason
      );
    case "attack_blocked":
      return replayEvent(
        "block",
        "防",
        time,
        `${playerLabel(players, event.targetId)} 防住了 ${event.attackName}`,
        `来源：${playerLabel(players, event.sourceId)}`
      );
    case "attack_reflected":
      return replayEvent(
        "rebound",
        "弹",
        time,
        `${playerLabel(players, event.originalTargetId)} 将 ${event.attackName} 反弹给 ${playerLabel(players, event.reflectedTargetId)}`,
        `原始来源：${playerLabel(players, event.sourceId)}`
      );
    case "rebound_broken":
      return replayEvent(
        "rebound",
        "破",
        time,
        `${event.attackName} 破弹`,
        `${playerLabel(players, event.targetId)} 的反弹失效。`
      );
    case "clash":
      return replayEvent("system", "撞", time, "攻击对撞", event.result);
    case "round_ended":
      return replayEvent("end", "轮", time, "本轮结束", event.reason);
    case "player_joined":
      return replayEvent("join", "入", time, `${event.name} 加入房间`, "等待对局开始。");
    case "player_renamed":
      return replayEvent("join", "名", time, `${event.name} 改名`, "房间等待阶段可以改名。");
    case "player_left":
      return replayEvent("join", "退", time, `${event.name} 退出房间`, "玩家离开。");
    case "player_kicked":
      return replayEvent("join", "踢", time, `${event.name} 被移出房间`, `房主：${playerLabel(players, event.byPlayerId)}`);
    case "settings_updated":
      return replayEvent("system", "设", time, "房间设置已更新", "新的设置会从开局后生效。");
    case "skill_revealed":
      return replayEvent(
        "turn",
        "技",
        time,
        `${playerLabel(players, event.playerId)} 暴露了 ${event.skillName}`,
        event.reason
      );
    case "cake_changed":
      return replayEvent("system", "饼", time, `${playerLabel(players, event.playerId)} 饼数 ${event.before} → ${event.after}`, event.reason);
    case "player_died":
      return replayEvent(
        "end",
        defeatStatusLabel(event.defeatLevel).slice(0, 1),
        time,
        `${playerLabel(players, event.playerId)} ${defeatStatusLabel(event.defeatLevel)}`,
        event.reason ? `原因：${event.reason}` : `${defeatStatusLabel(event.defeatLevel)}状态。`
      );
    case "game_finished":
      return replayEvent(
        "end",
        "胜",
        time,
        "游戏结束",
        `胜者：${event.winnerIds.map((playerId) => playerLabel(players, playerId)).join("、") || "无"}`
      );
    case "system":
      return replayEvent("system", "记", time, "系统记录", event.message);
    case "game_created":
      return replayEvent("join", "建", time, "房间已创建", event.gameId);
    case "action_submitted":
      return replayEvent("system", "待", time, `${playerLabel(players, event.playerId)} 已出招`, "等待其他玩家。");
    case "player_ready":
      return replayEvent("system", "备", time, `${playerLabel(players, event.playerId)} 已准备`, "进入收招阶段。");
    default:
      return replayEvent("system", "事", time, "未知事件", "未分类事件。");
  }
}

function replayEvent(
  className: string,
  mark: string,
  time: string,
  title: string,
  body: string,
  extra = ""
): string {
  return `<article class="event ${className}" data-mark="${escapeHtml(mark)}">
    <small>${escapeHtml(time)}</small>
    <strong>${escapeHtml(title)}</strong>
    <p>${escapeHtml(body)}</p>
    ${extra}
  </article>`;
}

function defeatStatusLabel(defeatLevel: PlayerState["defeatLevel"]): string {
  return DEFEAT_LEVEL_LABELS[defeatLevel ?? 1];
}

function playerStatusLabel(player: Pick<PlayerState, "status" | "defeatLevel">): string {
  return player.status === "alive" ? "存活" : defeatStatusLabel(player.defeatLevel);
}

function playerLabel(players: Map<string, string>, playerId: string | undefined): string {
  if (!playerId) {
    return "系统";
  }

  return players.get(playerId) ?? "未知玩家";
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

httpServer.listen(PORT, () => {
  console.log(`Bing server listening on http://localhost:${PORT}`);
});
