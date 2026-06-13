# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project overview

《饼》(Bing) is a Chinese multiplayer turn-based card game. Players accumulate "cakes" (饼) as resources, then spend them on attacks and defenses. The frontend is React + Tailwind, the backend is Node.js + Express + Socket.IO, and the game logic lives in a shared package used by both.

## Commands

```bash
# Start server + client in parallel (hot-reload)
npm run dev

# Start individually
npm run dev:server
npm run dev:client

# Build all (shared → server → client)
npm run build

# Type-check all workspaces
npm run typecheck

# Run rule regression tests
npm run test:rules

# Regenerate skill catalog from the xlsx spreadsheet in docs/archive
npm run import:skills

# AI self-play training
npm run training:selfplay
npm run training:roles
```

The server listens on `PORT` (default `3001`); the client dev server is on `5173`.

## Monorepo layout

```
apps/
  client/          # React + TypeScript + Tailwind
  server/          # Express + Socket.IO
packages/
  shared/          # All game logic — imported by both apps
scripts/           # Training and data-export scripts
data/              # Runtime: accounts.json, recorded matches (gitignored)
```

The shared package is published as `@bing/shared`. All imports between workspaces use this package name.

## Architecture

### Shared engine (source of truth)

All game rules live in `packages/shared/src/`. Nothing game-related is computed in the client or server — they only call shared functions.

Key files:

| File | Purpose |
|------|---------|
| `engine/resolver.ts` | `submitPlayerAction` and `resolveTurn` — main settlement entry points |
| `engine/attacks.ts` | `BASE_ATTACKS` definitions; stacking math for cost/power/level |
| `engine/gameFactory.ts` | `createGame`, `createPlayer`, turn deadline helpers, constants |
| `engine/validation.ts` | Action validation before a submission is accepted |
| `state/machine.ts` | `shouldFinishGame` and phase transition logic |
| `skills/registry.ts` | `implementedSkills` — register skill hooks here |
| `skills/generatedSkillCatalog.ts` | **Auto-generated** from the xlsx spreadsheet in `docs/archive/`; never edit manually |
| `skills/types.ts` | `SkillDefinition`, `SkillHooks`, `SkillPlayDefinition` types |
| `skills/phases.ts` | Maps skill timing strings to `SkillTimingPhase` values |
| `socket.ts` | Typed Socket.IO event contracts (both directions) |
| `types.ts` | All core types: `GameState`, `PlayerState`, `PlayerAction`, `GameEvent`, etc. |

### Game phases

```
lobby → collecting_actions → action_window ↔ resolving → finished
```

`action_window` is an interstitial for skill-reaction prompts between the main action and full resolution. The server drives timers for both `turnDeadlineAt` and `actionWindowDeadlineAt`.

### Settlement pipeline (resolver.ts)

1. Validate and record pending action
2. When all alive players have submitted: reveal turn → compute resources (cakes) → build attack instances → run skill `modifyAttack` hooks → handle rebounds → handle clashes → resolve blocks by defense tag → aggregate damage/healing → apply HP deltas → check win condition

The client never runs settlement logic. It submits typed actions via `game:submit_action` and receives `PublicGameState` (which omits other players' pending actions to prevent cheating).

### Adding a skill

1. Find or create the skill's `id` in `generatedSkillCatalog.ts` (if it's a new raw skill, run `npm run import:skills` after updating the spreadsheet).
2. Add an entry to `implementedSkills` in `skills/registry.ts` with the correct `category`, `implemented: true`, and a `hooks` object.
3. Available hooks: `validateAction`, `modifyAttack`, `beforeDamage`, `afterTurnResolved`.
4. Skills with active play use `play: SkillPlayDefinition` in their registry entry.

### Server (apps/server)

- `index.ts` — Express HTTP routes (`/health`, `/api/accounts/*`, `/api/matches/*`, `/replay/*`) and Socket.IO event handlers.
- `roomStore.ts` — `RoomStore` class wraps all shared engine calls and keeps game state in a `Map<GameId, GameState>`. Also delegates to `MatchRecorder`.
- `ai.ts` — `chooseAiAction` scores legal actions and picks stochastically from the top candidates. Backed by a learned policy in `aiPolicy.ts`.

### Client (apps/client)

`App.tsx` manages the top-level socket connection and identity (room + player ID) stored in `localStorage`. It renders into sub-panels:
- `ActionPanel` — submit attack/defense/skill actions
- `PokerTableGame` — main table view with player seats
- `SkillPanel` — display and play skills
- `EventLog` — scrollable game event history
- `TurnAnimation` — visual turn reveal effect

Characters (avatars) are defined in `lib/characters.ts`. The account model is registered/updated via `POST /api/accounts/register` and cached in `localStorage`.

## Environment variables (server)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3001` | Server listen port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Primary allowed CORS origin |
| `PUBLIC_ORIGINS` | — | Comma-separated extra origins |
| `PUBLIC_DIR` | `apps/client/dist` | Static file directory for production |
| `ACCOUNT_DATA_FILE` | `data/accounts/accounts.json` | Account persistence path |

## Key invariants

- **`擒` (qin) base level is 0** — stacking still yields level 0, which means it cannot be countered by level-based defense. Do not change this accidentally.
- **`PublicGameState` vs `GameState`** — `pendingActions` is stripped from the public state broadcast; use `pendingActionPlayerIds` to know who has submitted without revealing what.
- **`generatedSkillCatalog.ts` is machine-generated** — changes are overwritten on the next `npm run import:skills`. Put all skill logic in `registry.ts`.
