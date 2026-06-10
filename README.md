# BING Game / 饼

<p align="center">
  <strong>A simultaneous-action multiplayer card strategy game with bluffing, resource tension, skills, replays, and a 3D table interface.</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a>
  ·
  <a href="#public-play">Public Play</a>
  ·
  <a href="docs/UI_DESIGN_PLAN.md">UI Design Plan</a>
  ·
  <a href="docs/ARCHITECTURE.md">Architecture</a>
  ·
  <a href="docs/AI_TRAINING.md">AI Training</a>
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=111111">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite&logoColor=white">
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-4.8-010101?style=flat-square&logo=socketdotio&logoColor=white">
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-0.184-111111?style=flat-square&logo=threedotjs&logoColor=white">
</p>

![BING desktop battle table](docs/screenshots/table-desktop.png)

## What Is BING?

`饼` is an original turn-based card strategy game built around simultaneous decisions. Every player submits an action at the same time, then the server reveals and resolves the round: eating cakes, defending, attacking, reflecting, breaking counters, using skills, and surviving the table.

The project currently includes:

- Real-time rooms with Socket.IO: create room, join room, spectate, ready up, submit actions, and broadcast resolved state.
- A shared TypeScript rules package used by both client and server.
- A React game client with a 3D table, player seats, skill effects, action dock, event log, tutorial, and replay links.
- Match recording, replay pages, training sample export, and self-play scripts for future AI iteration.
- A public play helper using Cloudflare Tunnel so remote players can join from any network.

## Screenshots

<p align="center">
  <img alt="BING mobile battle table" src="docs/screenshots/table-mobile.png" width="320">
</p>

## Quick Start

```bash
npm install
npm run dev
```

Local development URLs:

- Client: [http://localhost:5173](http://localhost:5173)
- Server: [http://localhost:3001](http://localhost:3001)

## Public Play

For a temporary public multiplayer link:

```bash
npm run public
```

This builds the app, starts the production server on `3001`, and exposes it through a temporary Cloudflare Tunnel URL. Keep the terminal open while players are connected.

If you already built the app:

```bash
npm run public:no-build
```

For long-running deployment, build and serve the production app behind HTTPS:

```bash
npm install
npm run build
npm run serve
```

See [docs/PUBLIC_PLAY.md](docs/PUBLIC_PLAY.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for more detail.

## Core Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start client and server in development mode. |
| `npm run build` | Build shared rules, server, and client. |
| `npm run serve` | Start the production server. |
| `npm run public` | Build, serve, and open a temporary public tunnel. |
| `npm run typecheck` | Run TypeScript checks across workspaces. |
| `npm run test:rules` | Run rule regression checks. |
| `npm run import:skills` | Import skills from the spreadsheet source. |
| `npm run training:export` | Export match data for training. |
| `npm run training:selfplay` | Run self-play training simulations. |

## Project Structure

```text
apps/
  client/          React, Vite, Tailwind, Three.js game UI
  server/          Express, Socket.IO, room state, replay endpoints
packages/
  shared/          Shared rules, actions, skills, socket types, state machine
docs/              Architecture, deployment, public play, AI training, UI plan
scripts/           Skill import, public play tunnel, rule checks, training tools
workflow/          Planning templates, review templates, production notes
```

## Gameplay Loop

1. Create or join a room.
2. Pick a character/avatar and configure room settings.
3. Each player submits one hidden action for the turn.
4. The server reveals and resolves all actions together.
5. The table plays feedback: action reveal, damage, defense, reflect, skill effects, death, and round transitions.
6. The match can be replayed and exported as structured training data.

## Design Direction

The current UI already has a strong foundation: a 3D tabletop, seat cards, an action dock, and a right-side information rail. The next step is to make the interface feel less like a prototype and more like a shipped game:

- Make the active player decision unmistakable.
- Make every server event map to one visible animation beat.
- Keep the 3D table cinematic, but preserve readable card/state information.
- Add agent-based playtesting for first-time players, competitive players, and a developer/product reviewer.

Read the full proposal in [docs/UI_DESIGN_PLAN.md](docs/UI_DESIGN_PLAN.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Public play](docs/PUBLIC_PLAY.md)
- [Remote play](docs/remote-play.md)
- [AI training](docs/AI_TRAINING.md)
- [UI design plan](docs/UI_DESIGN_PLAN.md)

## License

Private project. Add a license before publishing or accepting external contributions.
