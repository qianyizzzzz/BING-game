import { ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Bot, Camera, Copy, Crown, Download, LogOut, Play, Search, Settings, Sparkles, Timer, Trophy, UserPen, UsersRound, X } from "lucide-react";
import {
  ActionSubmission,
  ACTION_PROMPT_SECONDS,
  ACTION_WINDOW_SECONDS,
  GameConfig,
  MIN_PLAYERS,
  PublicGameState,
  RoomIdentity,
  SkillAction,
  SkillId,
  SocketAck,
  getAllSkills
} from "@bing/shared";
import { ActionPanel } from "./components/ActionPanel";
import { EventLog } from "./components/EventLog";
import { GameAdvice } from "./components/GameAdvice";
import { CharacterSelect } from "./components/CharacterSelect";
import { ReferencePanel } from "./components/ReferencePanel";
import { PokerTableGame } from "./components/PokerTableGame";
import { SkillPanel } from "./components/SkillPanel";
import { TutorialPanel } from "./components/TutorialPanel";
import { TurnAnimation } from "./components/TurnAnimation";
import { Button } from "./components/ui/button";
import { DEFAULT_CHARACTER_ID, getCharacterById } from "./lib/characters";
import { SERVER_URL, socket } from "./lib/socket";

type Identity = RoomIdentity | null;
const ROOM_IDENTITY_STORAGE_KEY = "bing.roomIdentity.v1";
const ACCOUNT_STORAGE_KEY = "bing.account.v1";
const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
const HERO_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4";

interface LocalAccount {
  id: string;
  name: string;
  avatarUrl?: string;
  characterId: string;
}

type SidePanelTab = "hint" | "log" | "skills" | "rules";

const SIDE_PANEL_TABS: Array<{ id: SidePanelTab; label: string }> = [
  { id: "hint", label: "提示" },
  { id: "log", label: "日志" },
  { id: "skills", label: "技能" },
  { id: "rules", label: "规则" }
];

export function App() {
  const [identity, setIdentity] = useState<Identity>(null);
  const [state, setState] = useState<PublicGameState | null>(null);
  const [account, setAccount] = useState<LocalAccount>(() => readSavedAccount());
  const [playerName, setPlayerName] = useState(() => readSavedAccount().name);
  const [roomToJoin, setRoomToJoin] = useState("");
  const [message, setMessage] = useState("");
  const [roomCopied, setRoomCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidePanelTab, setSidePanelTab] = useState<SidePanelTab>("hint");
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [previewPlayerIds, setPreviewPlayerIds] = useState<string[]>([]);
  const [lastActionSubmission, setLastActionSubmission] = useState<ActionSubmission | null>(null);
  const selectedCharacter = useMemo(
    () => getCharacterById(account.characterId),
    [account.characterId]
  );
  const accountAvatarUrl = account.avatarUrl ?? selectedCharacter.avatarUrl;

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
    const hasDeadline =
      (state?.phase === "collecting_actions" && state.turnDeadlineAt) ||
      (state?.phase === "action_window" && state.actionWindowDeadlineAt);
    if (!hasDeadline) {
      return;
    }

    const timer = window.setInterval(() => setClockNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [state?.phase, state?.turnDeadlineAt, state?.actionWindowDeadlineAt]);

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
  const seatedCount = useMemo(
    () => state?.players.filter((player) => player.kind !== "spectator").length ?? 0,
    [state]
  );
  const submittedCount = state?.pendingActionPlayerIds.length ?? 0;
  const passCount = state?.actionWindowPassPlayerIds.length ?? 0;
  const missingStartPlayers = state?.phase === "lobby"
    ? Math.max(0, MIN_PLAYERS - seatedCount)
    : 0;
  const startDisabledReason =
    state?.phase !== "lobby"
      ? ""
      : !isOwner
        ? `等待房主 ${ownerName} 开始游戏`
        : busy
          ? "正在处理，请稍候"
          : missingStartPlayers > 0
            ? `还差 ${missingStartPlayers} 名玩家。可以邀请朋友，或点击“加 AI”立即练习。`
            : "";
  const lobbyHint =
    state?.phase !== "lobby"
      ? ""
      : isOwner
        ? missingStartPlayers > 0
          ? `下一步：加 ${missingStartPlayers} 名 AI 或分享房号，凑齐 ${MIN_PLAYERS} 人后开始。`
          : "下一步：确认设置后点击“开始”，进入第一回合。"
        : `你已在房间中，等待房主 ${ownerName} 调整设置并开始游戏。`;
  const activeDeadline =
    state?.phase === "action_window"
      ? state.actionWindowDeadlineAt
      : state?.phase === "collecting_actions"
        ? state.turnDeadlineAt
        : undefined;
  const deadlineSeconds =
    activeDeadline
      ? Math.max(0, Math.ceil((activeDeadline - clockNow) / 1000))
      : null;
  const highlightedPlayerIds = useMemo(() => {
    const ids = new Set<string>(previewPlayerIds);
    if (!state) {
      return ids;
    }

    state.eventLog.slice(-8).forEach((event) => {
      if (event.type === "damage") {
        ids.add(event.targetId);
      }
    });

    return ids;
  }, [previewPlayerIds, state]);

  useEffect(() => {
    if (!state || state.phase === "lobby" || state.phase === "finished") {
      setPreviewPlayerIds([]);
    }
  }, [identity?.roomId, state?.phase]);

  useEffect(() => {
    setLastActionSubmission(null);
  }, [identity?.roomId]);

  function focusJourneyConsole() {
    document
      .getElementById("journey-console")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement>('[data-testid="player-name-input"]')?.focus();
    }, 260);
    setMessage("先确认玩家名、头像和角色，再点击创建房间。");
  }

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

  function spectateRoom() {
    setBusy(true);
    socket.emit(
      "room:spectate",
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

  function updateCharacterSelection(characterId: string) {
    const nextAccount = {
      ...account,
      characterId
    };
    setAccount(nextAccount);
    persistAccount(nextAccount);
    setMessage("角色已确认，进入房间后会显示在你的座位上。");
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
          avatarUrl: accountAvatarUrl
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
        name: data.account.name,
        characterId: account.characterId
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
        if (response.ok && response.data) {
          setLastActionSubmission(cloneActionSubmission(action));
        }
        handleStateResponse(response);
      }
    );
  }

  function enterActionWindow() {
    if (!identity) {
      return;
    }

    setBusy(true);
    socket.emit("game:enter_action_window", { roomId: identity.roomId }, (response) => {
      setBusy(false);
      handleStateResponse(response);
    });
  }

  function passActionWindow() {
    if (!identity) {
      return;
    }

    setBusy(true);
    socket.emit("game:pass_action_window", { roomId: identity.roomId }, (response) => {
      setBusy(false);
      handleStateResponse(response);
    });
  }

  function skipToNextAction() {
    if (!identity) {
      return;
    }

    setBusy(true);
    socket.emit("game:skip_to_next_action", { roomId: identity.roomId }, (response) => {
      setBusy(false);
      handleStateResponse(response);
    });
  }

  function submitWindowSkill(action: SkillAction) {
    if (!identity) {
      return;
    }

    setBusy(true);
    socket.emit(
      "game:submit_window_skill",
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

  function guessSkill(targetPlayerId: string, targetSkillId: SkillId) {
    if (!identity) {
      return;
    }

    setBusy(true);
    socket.emit(
      "game:guess_skill",
      {
        roomId: identity.roomId,
        targetPlayerId,
        targetSkillId
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

  async function copyRoomId() {
    if (!identity) {
      return;
    }

    setRoomCopied(true);
    window.setTimeout(() => setRoomCopied(false), 1800);
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(identity.roomId);
      } else {
        fallbackCopyText(identity.roomId);
      }
    } catch {
      fallbackCopyText(identity.roomId);
    }
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

  function updatePlayerSkills(targetPlayerId: string, skillIds: SkillId[]) {
    if (!identity) {
      return;
    }

    setBusy(true);
    socket.emit(
      "room:update_player_skills",
      {
        roomId: identity.roomId,
        targetPlayerId,
        skillIds
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

  const hasActiveRoom = Boolean(identity && state);

  return (
    <main
      className={[
        "app-shell min-h-screen",
        hasActiveRoom ? "text-gray-900" : "hero-shell text-foreground"
      ].join(" ")}
    >
      {hasActiveRoom ? (
        <div className="cake-sticker-field" aria-hidden="true">
          <span className="cake-sticker cake-sticker-a">饼</span>
          <span className="cake-sticker cake-sticker-b">饼</span>
          <span className="cake-sticker cake-sticker-c">饼</span>
        </div>
      ) : null}
      {state ? <TurnAnimation state={state} /> : null}
      {identity && state ? (
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
              <span className="room-code" data-testid="room-code">
                {identity.roomId}
              </span>
              <button
                className="btn-secondary"
                onClick={copyRoomId}
                type="button"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                {roomCopied ? "已复制" : "复制房号"}
              </button>
              <a
                className="btn-secondary"
                download={`${identity.roomId}-replay.txt`}
                href={`${SERVER_URL}/replay/${identity.roomId}.txt`}
                rel="noreferrer"
                target="_blank"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                复盘报告
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
      ) : null}

      {!identity || !state ? (
        <section className="hero-page relative min-h-screen overflow-hidden bg-background text-foreground">
          <video
            aria-hidden="true"
            autoPlay
            className="absolute inset-0 z-0 h-full w-full object-cover"
            loop
            muted
            playsInline
          >
            <source src={HERO_VIDEO_URL} type="video/mp4" />
          </video>

          <nav className="hero-nav relative z-10 mx-auto flex max-w-7xl flex-row items-center justify-between px-8 py-6">
            <a
              className="hero-brand"
              href="#hero"
            >
              <span className="hero-brand-symbol">饼</span>
              <span>
                <strong>BING Game</strong>
                <small>同步出招卡牌策略</small>
              </span>
            </a>
            <div className="hidden items-center gap-8 md:flex">
              {[
                ["开房", "#journey-console"],
                ["规则", "#journey-console"],
                ["角色", "#journey-console"],
                ["公网联机", "#journey-console"]
              ].map(([item, href], index) => (
                <a
                  key={item}
                  className={[
                    "text-sm transition-colors hover:text-foreground",
                    index === 0 ? "text-foreground" : "text-muted-foreground"
                  ].join(" ")}
                  href={href}
                >
                  {item}
                </a>
              ))}
            </div>
            <Button
              className="rounded-full px-6 py-2.5 text-sm hover:scale-[1.03]"
              onClick={focusJourneyConsole}
              variant="glass"
            >
              进入大厅
            </Button>
          </nav>

          <div
            className="relative z-10 flex min-h-[calc(100vh-96px)] flex-col items-center px-6 pb-40 pt-32 py-[90px] text-center"
            id="hero"
          >
            <div className="hero-copy flex flex-1 flex-col items-center justify-center">
              <div className="hero-eyebrow animate-fade-rise">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                BING / 饼 · 多人实时牌桌
              </div>
              <h1
                className="animate-fade-rise hero-title max-w-7xl text-5xl font-black leading-[0.95] text-foreground sm:text-7xl md:text-8xl"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                同时出招，藏住你的饼。
              </h1>
              <p className="animate-fade-rise-delay mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                创建房间、邀请朋友、同一回合暗中选择行动。吃饼、防御、攻击、反弹和技能会在亮招瞬间一起结算。
              </p>
              <div className="hero-proof-row animate-fade-rise-delay">
                <span>2-6 人实时房间</span>
                <span>Socket.IO 同步</span>
                <span>3D 桌面与复盘</span>
              </div>
              <Button
                className="mt-12 rounded-full px-14 py-5 text-base hover:scale-[1.03]"
                data-testid="create-room-hero"
                disabled={busy}
                onClick={focusJourneyConsole}
                variant="glass"
              >
                确认身份后开房
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div
              className="hero-lobby-grid animate-fade-rise-delay-2"
              id="journey-console"
            >
              <div className="hero-lobby-panel liquid-glass">
                <div className="hero-panel-heading">
                  <span>
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    玩家牌桌通行证
                  </span>
                  <strong>{selectedCharacter.archetype}</strong>
                </div>
                <label className="block text-left text-sm font-medium text-muted-foreground">
                  玩家名
                  <input
                    className="soft-input mt-2 w-full"
                    data-testid="player-name-input"
                    maxLength={16}
                    onChange={(event) => updateAccountName(event.target.value)}
                    value={playerName}
                  />
                </label>
                <div className="account-card mt-4">
                  <div className="account-avatar">
                    <img alt={`${selectedCharacter.name} 头像`} src={accountAvatarUrl} />
                  </div>
                  <div className="account-summary min-w-0 flex-1 text-left">
                    <div className="text-sm font-black text-foreground">本地账号</div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{account.id}</p>
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
                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <button
                    className="btn-primary justify-center py-3"
                    data-testid="create-room"
                    disabled={busy}
                    onClick={createRoom}
                    type="button"
                  >
                    <UsersRound className="h-4 w-4" aria-hidden="true" />
                    创建房间
                  </button>
                  <div className="hero-join-row">
                    <input
                      className="soft-input min-w-0 flex-1"
                      data-testid="join-room-input"
                      onChange={(event) => setRoomToJoin(event.target.value)}
                      placeholder="房号"
                      value={roomToJoin}
                    />
                    <button
                      className="btn-secondary px-4 disabled:text-gray-400"
                      data-testid="join-room"
                      disabled={busy || !roomToJoin.trim()}
                      onClick={joinRoom}
                      type="button"
                    >
                      加入
                    </button>
                    <button
                      className="btn-secondary px-4 disabled:text-gray-400"
                      data-testid="spectate-room"
                      disabled={busy || !roomToJoin.trim()}
                      onClick={spectateRoom}
                      type="button"
                    >
                      观战
                    </button>
                  </div>
                </div>
                {message ? (
                  <p className="mt-4 rounded-lg border border-red-200/40 bg-red-950/40 px-3 py-2 text-left text-sm text-red-100">
                    {message}
                  </p>
                ) : null}
              </div>

              <CharacterSelect
                selectedCharacterId={account.characterId}
                onConfirm={(character) => updateCharacterSelection(character.id)}
              />
            </div>
          </div>
        </section>
      ) : (
        <section className="battle-grid mx-auto grid max-w-7xl gap-5 px-4 py-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {state.phase !== "lobby" ? (
              <PokerTableGame
                actionPanel={
                  state.phase !== "finished" && viewer?.kind !== "spectator" ? (
                    <ActionPanel
                      lastActionSubmission={lastActionSubmission}
                      onEnterActionWindow={enterActionWindow}
                      onPassActionWindow={passActionWindow}
                      onSkipToNextAction={skipToNextAction}
                      onSubmit={submitAction}
                      onGuessSkill={guessSkill}
                      onPreviewTargets={setPreviewPlayerIds}
                      onSubmitWindowSkill={submitWindowSkill}
                      state={state}
                      submitting={busy}
                    />
                  ) : null
                }
                highlightedPlayerIds={highlightedPlayerIds}
                isOwner={isOwner}
                onKickPlayer={kickPlayer}
                state={state}
                viewerPlayerId={identity.playerId}
              />
            ) : null}

            <div
              className={[
                "surface-card command-center p-5",
                state.phase !== "lobby" ? "command-center-compact" : ""
              ].join(" ")}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="status-pill w-fit">
                    {state.phase === "lobby"
                      ? "房间等待中"
                      : state.phase === "finished"
                        ? "游戏结束"
                        : state.phase === "action_window"
                          ? state.activeTimingPhase === "revival_action"
                            ? "复活阶段"
                            : "行动窗口"
                          : "正在收招"}
                  </div>
                  <div className="mt-1 text-xl font-bold text-gray-950">
                    {state.phase === "lobby" ? "房间准备 · 等待开始" : `第 ${state.roundNumber} 轮 · 本轮第 ${state.roundTurnNumber} 回合`}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <StatusMetric icon={<Crown className="h-4 w-4" />} label="房主" value={ownerName} />
                    <StatusMetric
                      icon={<UsersRound className="h-4 w-4" />}
                      label={state.phase === "lobby" ? "玩家" : "存活"}
                      value={state.phase === "lobby" ? `${seatedCount} 人` : `${aliveCount}/${seatedCount}`}
                    />
                    <StatusMetric
                      icon={<Trophy className="h-4 w-4" />}
                      label={state.phase === "lobby" ? "准备" : state.phase === "action_window" ? state.activeTimingPhase === "revival_action" ? "已结束" : "已放弃" : "已出招"}
                      value={state.phase === "lobby" ? `${seatedCount} 人在房间` : state.phase === "action_window" ? `${passCount}/${aliveCount}` : `${submittedCount}/${aliveCount}`}
                    />
                    <StatusMetric
                      icon={<Timer className="h-4 w-4" />}
                      label={state.phase === "lobby" ? "状态" : "限时"}
                      value={state.phase === "lobby" ? "等待房主" : deadlineSeconds === null ? "未开启" : `${deadlineSeconds} 秒`}
                    />
                  </div>
                  {deadlineSeconds !== null ? (
                    <CountdownBar
                      secondsLeft={deadlineSeconds}
                      totalSeconds={
                        state.phase === "action_window"
                          ? state.activeTimingPhase === "revival_action"
                            ? ACTION_WINDOW_SECONDS
                            : state.actionWindowMode === "prompt"
                            ? ACTION_PROMPT_SECONDS
                            : ACTION_WINDOW_SECONDS
                          : Math.max(1, state.config.turnTimeLimitSeconds)
                      }
                    />
                  ) : null}
                  {viewer ? (
                    <p className="mt-1 text-sm text-gray-500">
                      当前玩家：{viewer.name}
                    </p>
                  ) : null}
                  {lobbyHint ? (
                    <p className="lobby-next-step mt-3">
                      {lobbyHint}
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
                    {isOwner ? (
                      <>
                        <button
                          className="btn-warning"
                          data-testid="add-ai"
                          disabled={busy}
                          onClick={addAi}
                          type="button"
                        >
                          <Bot className="h-4 w-4" aria-hidden="true" />
                          加 AI
                        </button>
                        <button
                          className="btn-primary"
                          data-testid="start-game"
                          disabled={busy || missingStartPlayers > 0}
                          onClick={startGame}
                          title={startDisabledReason || "开始游戏"}
                          type="button"
                        >
                          <Play className="h-4 w-4" aria-hidden="true" />
                          开始
                        </button>
                      </>
                    ) : (
                      <span className="status-pill border-amber-200 bg-amber-50 text-amber-800">
                        等待房主开始
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
              {startDisabledReason ? (
                <p className="lobby-start-reason mt-3">
                  {startDisabledReason}
                </p>
              ) : null}
              {message ? (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {message}
                </p>
              ) : null}
              {settingsOpen && isOwner && state.phase === "lobby" ? (
                <SettingsPanel
                  config={state.config}
                  onChange={updateSettings}
                />
              ) : null}
            </div>

            {state.phase === "lobby" && state.config.skillMode === "test_select" ? (
              <TestSkillPanel
                busy={busy}
                isOwner={isOwner}
                onChange={updatePlayerSkills}
                state={state}
                viewerPlayerId={identity.playerId}
              />
            ) : null}

            {state.phase === "lobby" ? (
              <PokerTableGame
                highlightedPlayerIds={highlightedPlayerIds}
                isOwner={isOwner}
                onKickPlayer={kickPlayer}
                state={state}
                viewerPlayerId={identity.playerId}
              />
            ) : null}

            <GameAdvice state={state} />
          </div>

          <SidePanel
            activeTab={sidePanelTab}
            onTabChange={setSidePanelTab}
            state={state}
          />
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

function fallbackCopyText(value: string): void {
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "true");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  input.style.top = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
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
        name: parsed.name || "玩家",
        characterId:
          typeof parsed.characterId === "string"
            ? parsed.characterId
            : DEFAULT_CHARACTER_ID
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
    name: "玩家",
    characterId: DEFAULT_CHARACTER_ID
  };
}

function persistAccount(account: LocalAccount): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
}

function cloneActionSubmission(action: ActionSubmission): ActionSubmission {
  return JSON.parse(JSON.stringify(action)) as ActionSubmission;
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
  payload.avatarUrl =
    account.avatarUrl ?? getCharacterById(account.characterId).avatarUrl;

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

function TestSkillPanel({
  busy,
  isOwner,
  onChange,
  state,
  viewerPlayerId
}: {
  busy: boolean;
  isOwner: boolean;
  onChange: (targetPlayerId: string, skillIds: SkillId[]) => void;
  state: PublicGameState;
  viewerPlayerId: string;
}) {
  const allSkills = useMemo(
    () => getAllSkills().filter((skill) => skill.implemented),
    []
  );
  const controlledPlayers = state.players.filter((player) => {
    if (player.kind === "spectator") {
      return false;
    }
    if (player.id === viewerPlayerId) {
      return true;
    }
    return isOwner && player.kind === "ai";
  });

  if (controlledPlayers.length === 0) {
    return null;
  }

  return (
    <section className="surface-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-teal-700" aria-hidden="true" />
          <h2 className="text-base font-bold text-gray-950">测试技能</h2>
        </div>
        <span className="status-pill">{state.config.skillCount} 槽</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {controlledPlayers.map((player) => (
          <SkillPicker
            allSkills={allSkills}
            busy={busy}
            key={player.id}
            maxCount={state.config.skillCount}
            onChange={(skillIds) => onChange(player.id, skillIds)}
            player={player}
          />
        ))}
      </div>
    </section>
  );
}

function SidePanel({
  activeTab,
  onTabChange,
  state
}: {
  activeTab: SidePanelTab;
  onTabChange: (tab: SidePanelTab) => void;
  state: PublicGameState;
}) {
  return (
    <aside className="side-panel-stack">
      <div className="surface-card side-panel-tabs p-3">
        <div className="side-panel-tab-list" role="tablist" aria-label="辅助信息">
          {SIDE_PANEL_TABS.map((tab) => (
            <button
              aria-selected={activeTab === tab.id}
              className={[
                "side-panel-tab",
                activeTab === tab.id ? "side-panel-tab-active" : ""
              ].join(" ")}
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="side-panel-content" role="tabpanel">
        {activeTab === "hint" ? <QuickHintPanel state={state} /> : null}
        {activeTab === "log" ? <EventLog state={state} /> : null}
        {activeTab === "skills" ? <SkillPanel state={state} /> : null}
        {activeTab === "rules" ? (
          <div className="space-y-5">
            <TutorialPanel />
            <ReferencePanel />
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function QuickHintPanel({ state }: { state: PublicGameState }) {
  const viewer = state.players.find((player) => player.id === state.viewerPlayerId);
  const activePlayers = state.players.filter(
    (player) => player.kind !== "spectator" && player.status === "alive"
  );
  const waitingPlayers =
    state.phase === "action_window"
      ? activePlayers.filter((player) => !state.actionWindowPassPlayerIds.includes(player.id))
      : state.phase === "collecting_actions"
        ? activePlayers.filter((player) => !state.pendingActionPlayerIds.includes(player.id))
        : [];
  const hint = quickHintForState(state, viewer?.id);

  return (
    <section className="surface-card quick-hint-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <span className="quick-hint-eyebrow">当前提示</span>
          <h2>{hint.title}</h2>
        </div>
        <span className="status-pill">{phaseDisplayLabel(state)}</span>
      </div>
      <p>{hint.body}</p>
      <div className="quick-hint-grid">
        <div>
          <span>等待</span>
          <strong>{waitingPlayers.length > 0 ? waitingPlayers.map((player) => player.name).join("、") : "无"}</strong>
        </div>
        <div>
          <span>玩家</span>
          <strong>{viewer?.name ?? "观战"}</strong>
        </div>
      </div>
    </section>
  );
}

function quickHintForState(
  state: PublicGameState,
  viewerPlayerId: string | undefined
): { title: string; body: string } {
  const viewerIsActive =
    Boolean(viewerPlayerId) &&
    state.players.some(
      (player) => player.id === viewerPlayerId && player.kind !== "spectator" && player.status === "alive"
    );

  if (state.phase === "lobby") {
    return {
      title: "准备开局",
      body: "房主可以加 AI 或分享房号；其他玩家只需要确认名字、角色和技能，等待开局。"
    };
  }

  if (state.phase === "finished") {
    return {
      title: "对局结束",
      body: "查看复盘建议、结算日志和胜者状态，再决定是否重新开房或继续调整规则。"
    };
  }

  if (state.phase === "action_window") {
    const alreadyPassed = Boolean(
      viewerPlayerId && state.actionWindowPassPlayerIds.includes(viewerPlayerId)
    );
    return {
      title: alreadyPassed ? "等待阶段结算" : "处理阶段行动",
      body: viewerIsActive && !alreadyPassed
        ? "如果有可用技能，先确认目标和消耗；没有要处理的动作时可以结束本阶段。"
        : "等待仍在处理阶段行动的玩家，全部完成后会继续结算。"
    };
  }

  const alreadySubmitted = Boolean(
    viewerPlayerId && state.pendingActionPlayerIds.includes(viewerPlayerId)
  );
  return {
    title: alreadySubmitted ? "等待亮招" : "选择本回合行动",
    body: viewerIsActive && !alreadySubmitted
      ? "先确认当前选择、目标和消耗，再按提交。第一局不确定时，吃饼 +1 是最稳的开局。"
      : "等待所有存活玩家提交，本回合行动会同时亮出。"
  };
}

function phaseDisplayLabel(state: PublicGameState): string {
  if (state.phase === "lobby") {
    return "房间";
  }

  if (state.phase === "finished") {
    return "结束";
  }

  if (state.phase === "action_window") {
    return state.activeTimingPhase === "revival_action" ? "复活" : "阶段";
  }

  return "出招";
}

function SkillPicker({
  allSkills,
  busy,
  maxCount,
  onChange,
  player
}: {
  allSkills: ReturnType<typeof getAllSkills>;
  busy: boolean;
  maxCount: number;
  onChange: (skillIds: SkillId[]) => void;
  player: PublicGameState["players"][number];
}) {
  const selected = player.skills.slice(0, maxCount);
  const [skillQuery, setSkillQuery] = useState("");
  const filteredAvailableSkills = skillQuery.trim()
    ? allSkills.filter((skill) => searchSkillText(skill).includes(skillQuery.trim()))
    : allSkills;
  const canAdd = selected.length < maxCount;

  function removeSelectedSkill(index: number): void {
    onChange(selected.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <article className="settings-field block">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <strong className="block truncate text-sm text-gray-950">{player.name}</strong>
          <span className="text-xs font-semibold text-gray-500">
            {player.kind === "ai" ? "AI" : "自己"}
          </span>
        </div>
        <span className="text-xs font-black text-teal-700">
          {selected.length}/{maxCount}
        </span>
      </div>

      <div className="flex min-h-10 flex-wrap gap-2">
        {selected.map((skillId, index) => {
          const skill = allSkills.find((item) => item.id === skillId);
          return (
            <button
              className="btn-secondary max-w-full px-2 py-1 text-xs"
              disabled={busy}
              key={`${skillId}:${index}`}
              onClick={() => removeSelectedSkill(index)}
              title={skill?.description || skill?.name || skillId}
              type="button"
            >
              <span className="truncate">{skill?.name ?? skillId}</span>
              <X className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
            </button>
          );
        })}
        {selected.length === 0 ? (
          <span className="rounded-md border border-dashed border-gray-300 px-2 py-1 text-xs font-semibold text-gray-400">
            未选择
          </span>
        ) : null}
      </div>

      <label className="relative mt-3 block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          className="soft-input w-full pl-9"
          disabled={busy || !canAdd}
          onChange={(event) => setSkillQuery(event.target.value)}
          placeholder={`搜索 ${allSkills.length} 个可添加技能`}
          value={skillQuery}
        />
      </label>

      <select
        className="soft-input mt-2 w-full"
        disabled={busy || !canAdd}
        onChange={(event) => {
          const skillId = event.target.value as SkillId;
          if (!skillId) {
            return;
          }
          onChange([...selected, skillId]);
          setSkillQuery("");
          event.target.value = "";
        }}
        value=""
      >
        <option value="">
          {canAdd
            ? filteredAvailableSkills.length > 0
              ? "添加技能"
              : "没有匹配技能"
            : "技能槽已满"}
        </option>
        {filteredAvailableSkills.map((skill) => (
          <option key={skill.id} value={skill.id}>
            {skill.name} #{skill.sourceRow}
          </option>
        ))}
      </select>
    </article>
  );
}

function searchSkillText(skill: ReturnType<typeof getAllSkills>[number]): string {
  return `${skill.name} ${skill.description} ${skill.tags.join(" ")} ${skill.typeTags.join(" ")} #${skill.sourceRow}`;
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
        技能模式
        <select
          className="soft-input mt-1 w-full"
          onChange={(event) => {
            const skillMode = event.target.value as GameConfig["skillMode"];
            onChange({
              skillMode,
              skillCount: skillMode === "none" ? 0 : Math.max(1, config.skillCount)
            });
          }}
          value={config.skillMode}
        >
          <option value="none">基础规则</option>
          <option value="small_intro">随机小技能</option>
          <option value="test_select">测试自选技能</option>
        </select>
      </label>
      <label className="settings-field block font-medium text-gray-700">
        小技能数量
        <select
          className="soft-input mt-1 w-full"
          disabled={config.skillMode === "none"}
          onChange={(event) => {
            const skillCount = Number(event.target.value);
            onChange({
              skillCount,
              skillMode: skillCount > 0 ? config.skillMode : "none"
            });
          }}
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
