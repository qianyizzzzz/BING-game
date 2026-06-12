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
| Character 3D source | Blender `.blend` files |
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

### Blender / Art Director Agent

- Owns 3D character modeling, material polish, turnarounds, and game-readability checks.
- Uses Blender MCP when available.
- Follows `docs/SUBAGENT_ART_DIRECTOR_BLENDER.md` and `workflow/docs/01-visual-bible.md`.
- Reports missing Blender MCP instead of pretending that model work has been completed.
- Exports `.blend`, `.glb`, portrait crops, and art review reports for each approved character task.

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
- Blender MCP is missing for a task that requires actual Blender scene edits or model export.
- The allowed file scope is unclear for risky systems.

## Review Rules

Reviews should be ordered by severity:

- P0: Blocks playability or release
- P1: Clearly damages player experience
- P2: Should be fixed before public demo
- P3: Nice to have later

Codex should fix P0, P1, and selected P2 issues first. P3 items should not derail the milestone.
