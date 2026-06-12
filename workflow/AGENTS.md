# Codex Agent Rules

## Project Goal

This is a commercial indie game project targeting a future Steam release.

## Must Read Before Work

- `workflow/docs/00-game-pillars.md`
- `workflow/docs/01-visual-bible.md`
- `workflow/docs/03-agent-rules.md`
- The current task file under `workflow/tasks/`

## Codex Role

Codex owns implementation, integration, debugging, build verification, local testing, and screenshot-based UI checks.

Codex should not invent the product direction. Use the task file, Game Pillars, Visual Bible, and Figma as source material.

## Implementation Rules

- Preserve existing project structure.
- Keep changes scoped to the task.
- Do not rewrite unrelated systems.
- Do not change gameplay behavior unless the task asks for it.
- Do not touch files listed in the task's "Do Not Touch" section.
- If a UI task uses Figma, read the relevant frame before implementing.
- After implementation, run the available build, test, or dev command.
- For UI changes, verify at common desktop sizes and a Steam Deck-like layout when possible.

## Reporting

At the end of a task, report:

- Changed files
- What was implemented
- What was verified
- Screenshots or visual verification notes for UI work
- Known risks or unfinished items

## Figma MCP

Prefer the local MCP server:

```text
figma-desktop -> http://127.0.0.1:3845/mcp
```

Figma Desktop must be open with Desktop MCP server enabled.

## Blender MCP

Use Blender MCP for character modeling tasks only when the tool is actually available in the session.

Required art-director workflow:

1. Read `docs/SUBAGENT_ART_DIRECTOR_BLENDER.md`.
2. Read `workflow/docs/01-visual-bible.md`.
3. Read `apps/client/src/lib/characters.ts`.
4. For each character, create a role brief before touching Blender.
5. Use Blender MCP to create or edit the model, materials, lights, cameras, and exports.
6. Check material quality: skin pores, cloth weave, leather grain, metal wear, and non-plastic roughness.
7. Render front, side, three-quarter, table-scale, portrait-crop, and mobile-avatar QA images.
8. Export `.blend`, LOD0/LOD1 `.glb`, portrait, mobile-avatar, turnaround images, table-scale images, and `docs/CHARACTER_ASSET_AUDIT.md`.

If Blender MCP is unavailable, report the missing tool and continue only with briefs, asset lists, Blender Python drafts, and acceptance criteria. Do not claim that modeling was completed.
