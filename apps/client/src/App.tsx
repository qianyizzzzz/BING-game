import { ReactNode, useEffect, useMemo, useState } from "react";
import { Bot, Camera, Copy, Crown, Download, LogOut, Play, PlugZap, Settings, Timer, Trophy, UserPen, UsersRound, X } from "lucide-react";
import {
  ActionSubmission,
  GameConfig,
  PublicGameState,
  RoomIdentity,
  SocketAck
} from "@bing/shared";
import { ActionPanel } from "./components/ActionPanel";
import { EventLog } from "./components/EventLog";
import { GameAdvice } from "./components/GameAdvice";
import { PlayerCard } from "./components/PlayerCard";
import { ReferencePanel } from "./components/ReferencePanel";
import { SkillPanel } from "./components/SkillPanel";
import { TutorialPanel } from "./components/TutorialPanel";
import { TurnAnimation } from "./components/TurnAnimation";
import { SERVER_URL, socket } from "./lib/socket";

type Identity = RoomIdentity | null;
const ROOM_IDENTITY_STORAGE_KEY = "bing.roomIdentity.v1";
const ACCOUNT_STORAGE_KEY = "bing.account.v1";
const MAX_AVATAR_BYTES = 512 * 1024;

interface LocalAccount {
  id: string;
  name: string;
  avatarUrl?: string;
}

export function App() {
  const [identity, setIdentity] = useState<Identity>(null);
  const [state, setState] = useState<PublicGameState | null>(null);
  const [account, setAccount] = useState<LocalAccount>(() => readSavedAccount());
  const [playerName, setPlayerName] = useState(() => readSavedAccount().name);
  const [roomToJoin, setRoomToJoin] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());

  useEffect(() => {
    let resumeInFlight = false;

    const resumeSavedRoom = () => {
      const savedIdentity = readSavedIdentity();
      if (!savedIdentity || resumeInFlight) {
        if (!savedIdentity) {
          setMessage("");
        }
        return;
      }

      resumeInFlight = true;
      setMessage("正在恢复上次房间...");
      socket.emit("room:resume", savedIdentity, (response) => {
        resumeInFlight = false;
        if (!response.ok || !response.data) {
          clearSavedIdentity();
          setIdentity(null);
          setState(null);
          setMessage(response.error ?? "无法恢复上次房间，请重新加入");
          return;
        }

        const nextIdentity = {
          roomId: response.data.roomId,
          playerId: response.data.playerId
        };
        persistIdentity(nextIdentity);
        setIdentity(nextIdentity);
        setState(response.data.state);
        setMessage("");
      });
    };

    const handleRoomError = (nextMessage: string) => {
      setMessage(nextMessage);
      if (nextMessage.includes("移出")) {
        clearSavedIdentity();
        setIdentity(null);
        setState(null);
      }
    };
    const handleConnectError = (error: Error) => {
      setMessage(`连接服务器失败：${error.message}`);
    };

    socket.on("room:state", setState);
    socket.on("room:error", handleRoomError);
    socket.on("connect", resumeSavedRoom);
    socket.on("connect_error", handleConnectError);

    resumeSavedRoom();

    return () => {
      socket.off("room:state", setState);
      socket.off("room:error", handleRoomError);
      socket.off("connect", resumeSavedRoom);
      socket.off("connect_error", handleConnectError);
    };
  }, []);

  useEffect(() => {
    if (state?.phase !== "collecting_actions" || !state.turnDeadlineAt) {
      return;
    }

    const timer = window.setInterval(() => setClockNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [state?.phase, state?.turnDeadlineAt]);

  const viewer = useMemo(
    () => state?.players.find((player) => player.id === state.viewerPlayerId),
    [state]
  );
  const isOwner = Boolean(identity && state && state.ownerId === identity.playerId);
  const ownerName = useMemo(
    () => state?.players.find((player) => player.id === state.ownerId)?.name ?? "未知",
    [state]
  );
  const aliveCount = useMemo(
    () => state?.players.filter((player) => player.status === "alive").length ?? 0,
    [state]
  );
  const submittedCount = state?.pendingActionPlayerIds.length ?? 0;
  const deadlineSeconds =
    state?.turnDeadlineAt && state.phase === "collecting_actions"
      ? Math.max(0, Math.ceil((state.turnDeadlineAt - clockNow) / 1000))
      : null;
  const highlightedPlayerIds = useMemo(() => {
    if (!state) {
      return new Set<string>();
    }

    return new Set(
      state.eventLog
        .slice(-8)
        .flatMap((event) => {
          if (event.type === "damage") {
            return [event.targetId];
          }

          return [];
        })
    );
  }, [state]);

  function createRoom() {
    setBusy(true);
    socket.emit("room:create", buildRoomPayload(playerName, account), (response) => {
      setBusy(false);
      handleIdentityResponse(response);
    });
  }

  function joinRoom() {
    setBusy(true);
    socket.emit(
      "room:join",
      {
        roomId: roomToJoin.trim(),
        ...buildRoomPayload(playerName, account)
      },
      (response) => {
        setBusy(false);
        handleIdentityResponse(response);
      }
    );
  }

  function updateAccountName(name: string) {
    setPlayerName(name);
    const nextAccount = {
      ...account,
      name
    };
    setAccount(nextAccount);
    persistAccount(nextAccount);
  }

  function uploadAvatar(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("请上传图片格式的头像");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setMessage("头像图片太大，请选择 512KB 以内的图片");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setMessage("头像读取失败，请换一张图片");
        return;
      }

      const nextAccount = {
        ...account,
        name: playerName,
        avatarUrl: reader.result
      };
      setAccount(nextAccount);
      persistAccount(nextAccount);
      setMessage("");
    };
    reader.onerror = () => setMessage("头像读取失败，请换一张图片");
    reader.readAsDataURL(file);
  }

  async function registerAccount() {
    setBusy(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/accounts/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          accountId: account.id,
          name: playerName,
          avatarUrl: account.avatarUrl
        })
      });

      if (!response.ok) {
        throw new Error("账号注册失败");
      }

      const data = (await response.json()) as {
        account: {
          id: string;
          name: string;
          avatarUrl?: string;
        };
      };
      const nextAccount: LocalAccount = {
        id: data.account.id,
        name: data.account.name
      };
      if (data.account.avatarUrl) {
        nextAccount.avatarUrl = data.account.avatarUrl;
      }
      setAccount(nextAccount);
      setPlayerName(nextAccount.name);
      persistAccount(nextAccount);
      setMessage("账号已注册，之后创建或加入房间会使用这个身份。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "账号注册失败");
    } finally {
      setBusy(false);
    }
  }

  function addAi() {
    if (!identity) {
      return;
    }

    setBusy(true);
    socket.emit("room:add_ai", { roomId: identity.roomId }, (response) => {
      setBusy(false);
      handleStateResponse(response);
    });
  }

  function startGame() {
    if (!identity) {
      return;
    }

    setBusy(true);
    socket.emit("game:start", { roomId: identity.roomId }, (response) => {
      setBusy(false);
      handleStateResponse(response);
    });
  }

  function submitAction(action: ActionSubmission) {
    if (!identity) {
      return;
    }

    setBusy(true);
    socket.emit(
      "game:submit_action",
      {
        roomId: identity.roomId,
        action
      },
      (response) => {
        setBusy(false);
        handleStateResponse(response);
      }
    );
  }

  function renameSelf() {
    if (!identity || !state || state.phase !== "lobby") {
      return;
    }

    const nextName = window.prompt("输入新的玩家名", viewer?.name ?? playerName);
    if (!nextName) {
      return;
    }

    setBusy(true);
    socket.emit(
      "room:rename",
      {
        roomId: identity.roomId,
        name: nextName
      },
      (response) => {
        setBusy(false);
        handleIdentityResponse(response);
      }
    );
  }

  function leaveRoom() {
    if (!identity) {
      return;
    }

    setBusy(true);
    socket.emit("room:leave", { roomId: identity.roomId }, (response) => {
      setBusy(false);
      if (!response.ok) {
        setMessage(response.error ?? "退出失败");
        return;
      }

      clearSavedIdentity();
      setIdentity(null);
      setState(null);
      setMessage("");
    });
  }

  function kickPlayer(targetPlayerId: string) {
    if (!identity) {
      return;
    }

    setBusy(true);
    socket.emit(
      "room:kick",
      {
        roomId: identity.roomId,
        targetPlayerId
      },
      (response) => {
        setBusy(false);
        handleStateResponse(response);
      }
    );
  }

  function updateSettings(config: Partial<GameConfig>) {
    if (!identity) {
      return;
    }

    setBusy(true);
    socket.emit(
      "room:update_settings",
      {
        roomId: identity.roomId,
        config
      },
      (response) => {
        setBusy(false);
        handleStateResponse(response);
      }
    );
  }

  function handleIdentityResponse(
    response: SocketAck<RoomIdentity & { state: PublicGameState }>
  ) {
    if (!response.ok || !response.data) {
      setMessage(response.error ?? "请求失败");
      return;
    }

    const nextIdentity = {
      roomId: response.data.roomId,
      playerId: response.data.playerId
    };
    persistIdentity(nextIdentity);
    setIdentity(nextIdentity);
    setState(response.data.state);
    setMessage("");
  }

  function handleStateResponse<T extends { state: PublicGameState }>(
    response: SocketAck<T>
  ) {
    if (!response.ok || !response.data) {
      setMessage(response.error ?? "请求失败");
      return;
    }

    setState(response.data.state);
    setMessage("");
  }

  return (
    <main className="app-shell min-h-screen text-gray-900">
      <div className="cake-sticker-field" aria-hidden="true">
        <span className="cake-sticker cake-sticker-a">饼</span>
        <span className="cake-sticker cake-sticker-b">饼</span>
        <span className="cake-sticker cake-sticker-c">饼</span>
      </div>
      {state ? <TurnAnimation state={state} /> : null}
      <div className="topbar sticky top-0 z-30 border-b border-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="brand-lockup">
            <div className="brand-mark">饼</div>
            <div>
              <h1 className="text-2xl font-black tracking-normal text-gray-950">饼</h1>
              <p className="text-xs font-semibold text-gray-500">同时行动制卡牌策略</p>
            </div>
          </div>
          {identity && state ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="room-code">
                {identity.roomId}
              </span>
              <button
                className="btn-secondary"
                onClick={() => navigator.clipboard.writeText(identity.roomId)}
                type="button"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                复制房号
              </button>
              <a
                className="btn-secondary"
                download={`${identity.roomId}-replay.txt`}
                href={`${SERVER_URL}/replay/${identity.roomId}.txt`}
                rel="noreferrer"
                target="_blank"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                复盘TXT
              </a>
              <button
                className="btn-secondary"
                onClick={leaveRoom}
                type="button"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                退出
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {!identity || !state ? (
        <section className="battle-grid mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
          <div className="surface-card lobby-card p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-black text-teal-800">
                  <PlugZap className="h-4 w-4" aria-hidden="true" />
                  快速开局
                </div>
                <h2 className="text-2xl font-black text-gray-950">进入《饼》对局</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  创建房间、邀请好友，或者加入已有房间。每一回合都是一次读心、攒饼和反制的心理战。
                </p>
              </div>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              玩家名
              <input
                className="soft-input mt-1 w-full"
                maxLength={16}
                onChange={(event) => updateAccountName(event.target.value)}
                value={playerName}
              />
            </label>
            <div className="mt-4 account-card">
              <div className="account-avatar">
                {account.avatarUrl ? (
                  <img alt="玩家头像" src={account.avatarUrl} />
                ) : (
                  <span>{playerName.trim().slice(0, 1) || "饼"}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-gray-950">本地账号</div>
                <p className="mt-1 truncate text-xs text-gray-500">{account.id}</p>
              </div>
              <label className="btn-secondary cursor-pointer">
                <Camera className="h-4 w-4" aria-hidden="true" />
                上传头像
                <input
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => uploadAvatar(event.target.files?.[0])}
                  type="file"
                />
              </label>
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={registerAccount}
                type="button"
              >
                <UserPen className="h-4 w-4" aria-hidden="true" />
                注册账号
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                className="btn-primary justify-center py-3"
                disabled={busy}
                onClick={createRoom}
                type="button"
              >
                <UsersRound className="h-4 w-4" aria-hidden="true" />
                创建房间
              </button>
              <div className="flex gap-2">
                <input
                  className="soft-input min-w-0 flex-1"
                  onChange={(event) => setRoomToJoin(event.target.value)}
                  placeholder="房号"
                  value={roomToJoin}
                />
                <button
                  className="btn-secondary px-4 disabled:text-gray-400"
                  disabled={busy || !roomToJoin.trim()}
                  onClick={joinRoom}
                  type="button"
                >
                  加入
                </button>
              </div>
            </div>
            {message ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {message}
              </p>
            ) : null}
          </div>

          <ReferencePanel />
          <TutorialPanel />
        </section>
      ) : (
        <section className="battle-grid mx-auto grid max-w-7xl gap-5 px-4 py-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="surface-card command-center p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="status-pill w-fit">
                    {state.phase === "lobby"
                      ? "房间等待中"
                      : state.phase === "finished"
                        ? "游戏结束"
                        : "正在收招"}
                  </div>
                  <div className="mt-1 text-xl font-bold text-gray-950">
                    第 {state.roundNumber} 轮 · 总第 {state.turnNumber} 回合
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <StatusMetric icon={<Crown className="h-4 w-4" />} label="房主" value={ownerName} />
                    <StatusMetric icon={<UsersRound className="h-4 w-4" />} label="存活" value={`${aliveCount}/${state.players.length}`} />
                    <StatusMetric icon={<Trophy className="h-4 w-4" />} label="已出招" value={`${submittedCount}/${aliveCount}`} />
                    <StatusMetric icon={<Timer className="h-4 w-4" />} label="限时" value={deadlineSeconds === null ? "未开启" : `${deadlineSeconds} 秒`} />
                  </div>
                  {deadlineSeconds !== null ? (
                    <CountdownBar
                      secondsLeft={deadlineSeconds}
                      totalSeconds={Math.max(1, state.config.turnTimeLimitSeconds)}
                    />
                  ) : null}
                  {viewer ? (
                    <p className="mt-1 text-sm text-gray-500">
                      当前玩家：{viewer.name}
                    </p>
                  ) : null}
                </div>
                {state.phase === "lobby" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn-secondary"
                      disabled={busy}
                      onClick={renameSelf}
                      type="button"
                    >
                      <UserPen className="h-4 w-4" aria-hidden="true" />
                      改名
                    </button>
                    {isOwner ? (
                      <button
                        className="btn-secondary"
                        disabled={busy}
                        onClick={() => setSettingsOpen((open) => !open)}
                        type="button"
                      >
                        <Settings className="h-4 w-4" aria-hidden="true" />
                        设置
                      </button>
                    ) : null}
                    <button
                      className="btn-warning"
                      disabled={busy}
                      onClick={addAi}
                      type="button"
                    >
                      <Bot className="h-4 w-4" aria-hidden="true" />
                      加 AI
                    </button>
                    <button
                      className="btn-primary"
                      disabled={busy || state.players.length < 2 || !isOwner}
                      onClick={startGame}
                      type="button"
                    >
                      <Play className="h-4 w-4" aria-hidden="true" />
                      开始
                    </button>
                  </div>
                ) : null}
              </div>
              {message ? (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {message}
                </p>
              ) : null}
              {settingsOpen && isOwner ? (
                <SettingsPanel
                  config={state.config}
                  onChange={updateSettings}
                />
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {state.players.map((player) => (
                <div key={player.id} className="space-y-2">
                  <PlayerCard
                    highlighted={highlightedPlayerIds.has(player.id)}
                    isViewer={player.id === identity.playerId}
                    player={player}
                    state={state}
                  />
                  {state.phase === "lobby" &&
                  isOwner &&
                  player.id !== identity.playerId ? (
                    <button
                      className="btn-danger"
                      onClick={() => kickPlayer(player.id)}
                      type="button"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      踢出 {player.name}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            {state.phase !== "lobby" && state.phase !== "finished" ? (
              <ActionPanel
                onSubmit={submitAction}
                state={state}
                submitting={busy}
              />
            ) : null}
            <SkillPanel state={state} />
            <GameAdvice state={state} />
          </div>

          <div className="space-y-5">
            <EventLog state={state} />
            <TutorialPanel />
            <ReferencePanel />
          </div>
        </section>
      )}
    </main>
  );
}

function readSavedIdentity(): RoomIdentity | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(ROOM_IDENTITY_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RoomIdentity>;
    if (typeof parsed.roomId === "string" && typeof parsed.playerId === "string") {
      return {
        roomId: parsed.roomId,
        playerId: parsed.playerId
      };
    }
  } catch {
    // Ignore corrupted local storage and ask the player to join again.
  }

  clearSavedIdentity();
  return null;
}

function persistIdentity(identity: RoomIdentity): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ROOM_IDENTITY_STORAGE_KEY,
    JSON.stringify(identity)
  );
}

function clearSavedIdentity(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ROOM_IDENTITY_STORAGE_KEY);
}

function readSavedAccount(): LocalAccount {
  if (typeof window === "undefined") {
    return createLocalAccount();
  }

  const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
  if (!raw) {
    const account = createLocalAccount();
    persistAccount(account);
    return account;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalAccount>;
    if (typeof parsed.id === "string" && typeof parsed.name === "string") {
      const account: LocalAccount = {
        id: parsed.id,
        name: parsed.name || "玩家"
      };
      if (typeof parsed.avatarUrl === "string") {
        account.avatarUrl = parsed.avatarUrl;
      }
      return account;
    }
  } catch {
    // Corrupted account data is replaced with a fresh local account.
  }

  const account = createLocalAccount();
  persistAccount(account);
  return account;
}

function createLocalAccount(): LocalAccount {
  return {
    id: `acct_${Math.random().toString(36).slice(2, 10)}`,
    name: "玩家"
  };
}

function persistAccount(account: LocalAccount): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
}

function buildRoomPayload(playerName: string, account: LocalAccount) {
  const payload: {
    playerName: string;
    accountId: string;
    avatarUrl?: string;
  } = {
    playerName: playerName.trim() || account.name || "玩家",
    accountId: account.id
  };
  if (account.avatarUrl) {
    payload.avatarUrl = account.avatarUrl;
  }

  return payload;
}

function StatusMetric({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="status-metric">
      <span className="text-teal-700">{icon}</span>
      <div className="min-w-0">
        <span className="block text-xs font-semibold text-gray-500">{label}</span>
        <strong className="block truncate text-sm text-gray-950">{value}</strong>
      </div>
    </div>
  );
}

function CountdownBar({
  secondsLeft,
  totalSeconds
}: {
  secondsLeft: number;
  totalSeconds: number;
}) {
  const progress = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));
  const urgent = secondsLeft <= 5;
  return (
    <div className={["countdown-shell mt-3", urgent ? "countdown-urgent" : ""].join(" ")}>
      <div className="flex items-center justify-between gap-3 text-xs font-black">
        <span>回合倒计时</span>
        <span>{secondsLeft}s</span>
      </div>
      <div className="countdown-track mt-2">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function SettingsPanel({
  config,
  onChange
}: {
  config: GameConfig;
  onChange: (config: Partial<GameConfig>) => void;
}) {
  return (
    <div className="mt-4 grid gap-3 border-t border-teal-100/70 pt-4 text-sm md:grid-cols-2">
      <label className="settings-field flex items-center gap-2 font-medium text-gray-700">
        <input
          checked={config.hideCakeCounts}
          onChange={(event) => onChange({ hideCakeCounts: event.target.checked })}
          type="checkbox"
        />
        隐藏他人饼数量
      </label>
      <label className="settings-field block font-medium text-gray-700">
        回合限时
        <input
          className="soft-input mt-1 w-full"
          max={180}
          min={5}
          onChange={(event) =>
            onChange({ turnTimeLimitSeconds: Number(event.target.value) })
          }
          type="number"
          value={config.turnTimeLimitSeconds}
        />
      </label>
      <label className="settings-field block font-medium text-gray-700">
        速度模式
        <select
          className="soft-input mt-1 w-full"
          onChange={(event) =>
            onChange({ speedMode: event.target.value as GameConfig["speedMode"] })
          }
          value={config.speedMode}
        >
          <option value="normal">普通</option>
          <option value="accelerating">越来越快</option>
        </select>
      </label>
      <label className="settings-field block font-medium text-gray-700">
        小技能数量
        <select
          className="soft-input mt-1 w-full"
          onChange={(event) =>
            onChange({
              skillCount: Number(event.target.value),
              skillMode: Number(event.target.value) > 0 ? "small_intro" : "none"
            })
          }
          value={config.skillCount}
        >
          <option value={0}>0 张：基础规则</option>
          <option value={1}>1 张：技能入门</option>
          <option value={2}>2 张：进阶练习</option>
          <option value={3}>3 张：技能乱斗</option>
        </select>
      </label>
    </div>
  );
}
