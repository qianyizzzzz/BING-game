# Agent Rules

这份文档定义 Codex、Claude、Figma、Blender 和 BING 专用子智能体的协作边界。

## Source of Truth

| Area | Source |
| --- | --- |
| Game direction | `workflow/docs/00-game-pillars.md` |
| Visual direction | `workflow/docs/01-visual-bible.md` |
| Production plan | `workflow/docs/02-roadmap.md` |
| Subagent roster | `docs/SUBAGENT_ROSTER.md` and `.agents/agent-roster.md` |
| Task scope | `workflow/tasks/TASK-XXX.md` |
| Visual layout | Figma frame, when provided |
| Character 3D source | Blender `.blend` files |
| Implementation | Codebase |

## Role Split

### User

- Final decision maker.
- Approves taste, scope, public links, paid API spend, and tradeoffs.
- Plays builds and records feedback.

### Codex

- Implements code.
- Integrates assets.
- Runs builds and tests.
- Fixes bugs.
- Verifies UI with screenshots when possible.
- Owns staging, commit, and push only when requested or already authorized.

### Claude

- Writes specs.
- Reviews design and implementation.
- Finds product, UX, gameplay, and writing risks.
- Defaults to review/specification instead of direct code edits.

### Figma

- Provides visual source of truth when a Figma URL or Figma task exists.
- Defines layout, component states, color, typography, spacing, small-screen variants, and focus states.

### Blender / 美术总监

- Owns 3D character modeling, material polish, turnarounds, and game-readability checks when Blender MCP is available.
- Follows `.agents/art-director-blender.md`, `docs/SUBAGENT_ART_DIRECTOR_BLENDER.md`, and `workflow/docs/01-visual-bible.md`.
- Treats primitive blockout / simple geometry characters as technical placeholders only.
- Current visual target is the latest Visual Bible direction: Shared Dining / oil-paint installation UI plus hand-drawn goofy animal characters, unless the user explicitly changes direction again.
- Reports missing Blender MCP instead of pretending that model work has been completed.

## BING Specialist Subagents

Use only the functional names below. Do not use Kuhn, Fermat, Noether, Sagan, Planck, Darwin, Descartes, Rawls, Plato, Volta, Huygens, James, Hume, Bernoulli, Lovelace, Ptolemy, Godel, Bacon, Gibbs, Erdos, Dewey, Kant, or other generic person-name agents for BING tasks.

| Role | Entry | Responsibility |
| --- | --- | --- |
| 美术总监 | `.agents/art-director-blender.md` | UI taste, portraits, player frames, character quality, VFX language, style consistency |
| 动画设计 | `.agents/animation-designer.md` | Keyframe coverage, Seedance prompt readiness, VFX timing, video/poster asset gaps |
| 文学总监 | `.agents/literary-director.md` | Chinese copy for onboarding, room flow, action panel, battle readout, README |
| 产品经理 | `.agents/product-manager.md` | Priority, scope, release blockers, acceptance criteria, commit cadence |
| 新手玩家 | `.agents/new-player.md` | First-room, first-turn, first-settlement comprehension |
| 竞技玩家 | `.agents/competitive-player.md` | Repeated actions, target reading, resource deltas, response windows, animation interference |
| 开发商 / QA | `.agents/developer-qa.md` | Tests, CI, socket behavior, browser smoke, release gates, regression risk |
| 公网部署 | `.agents/public-deployment.md` | Local/public runbook checks, tunnel notes, deployment docs |

## Ownership Rules

- One writable task should have one owner.
- Do not let two agents edit the same core file at the same time.
- Review agents are read-only unless the main thread gives them an explicit write scope.
- Codex owns integration, verification, and commit.
- For paid image/video/API generation, stop and ask when estimated spend reaches or exceeds 10 RMB.

## Task Rules

Every task should include:

- Goal
- Why it matters
- Player flow
- Required states
- Implementation scope
- Acceptance criteria
- Verification command or manual verification steps

Do not claim implementation is complete if:

- The target behavior is unclear.
- The task has no acceptance criteria.
- A required Figma source is missing for a Figma-driven visual task.
- Blender MCP is missing for a task that specifically requires live Blender scene edits or model export.
- The work only updates documentation while the requested runtime behavior is still absent.

## Review Severity

- P0: Blocks playability, public-demo quality, user trust, or paid-generation safety.
- P1: Clearly damages player experience.
- P2: Should be fixed before public demo.
- P3: Nice to have later.

Codex should fix P0, P1, and selected P2 issues first. P3 items should not derail the milestone.
