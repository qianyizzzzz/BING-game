# Agent Rules

这份文件定义 Codex、Claude、Figma 和你自己的协作边界。

## Source of Truth

| Area | Source |
| --- | --- |
| Game direction | `docs/00-game-pillars.md` |
| Visual direction | `docs/01-visual-bible.md` |
| Production plan | `docs/02-roadmap.md` |
| Task scope | `tasks/TASK-XXX.md` |
| Visual layout | Figma frame |
| Implementation | Codebase |

## Role Split

### You

- Final decision maker
- Approves taste, scope, and tradeoffs
- Plays builds and records feedback

### Codex

- Implements code
- Integrates assets
- Runs builds and tests
- Fixes bugs
- Verifies UI with screenshots when possible

### Claude

- Writes specs
- Reviews design and implementation
- Finds product, UX, and gameplay risks
- Helps prepare Steam copy and communication

### Figma

- Provides visual source of truth
- Defines layout, component states, color, typography, and spacing
- Stores UI variants for small screens and controller focus

## Ownership Rules

- One agent should own one task at a time.
- Do not let two agents edit the same core file at the same time.
- Core files such as `GameManager`, `PlayerController`, `SaveSystem`, and `UIManager` need explicit ownership.
- Claude should default to review and specification instead of direct code edits.
- Codex should default to implementation and verification.

## Task Rules

Every task must include:

- Goal
- Why it matters
- Player flow
- Required states
- Implementation scope
- Acceptance criteria
- Verification command or manual verification steps

Do not start implementation if:

- The target behavior is unclear.
- The task has no acceptance criteria.
- The Figma source is missing for a visual task.
- The allowed file scope is unclear for risky systems.

## Review Rules

Reviews should be ordered by severity:

- P0: Blocks playability or release
- P1: Clearly damages player experience
- P2: Should be fixed before public demo
- P3: Nice to have later

Codex should fix P0, P1, and selected P2 issues first. P3 items should not derail the milestone.
