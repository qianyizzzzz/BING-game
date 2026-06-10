# UI Design Review and Implementation Plan

Date: 2026-06-11

This note summarizes UI improvement ideas for BING, animation direction for a more game-like feel, and an agent-based playtesting setup with two player agents plus one developer/product agent.

## 1. UI Optimization Methods

### Current Strengths

- The game already has a distinctive 3D table, seat layout, action dock, event log, tutorial, and skill panel.
- The interface supports real multiplayer states instead of being a static mockup.
- The public play flow is practical: one local server can host a temporary HTTPS room.

### Main Problems To Fix First

- **Brand mismatch:** the landing page still reads like a generic cinematic site in places. The first screen should clearly say BING / 饼 and immediately show the actual game.
- **Text encoding risk:** some Chinese strings appear garbled in source/output. Before visual polish, normalize source files to UTF-8 and verify all UI copy in browser.
- **Too many equal-weight panels:** the table, action dock, command center, log, tutorial, skill panel, and reference panel compete for attention.
- **Action clarity:** the current action dock is usable, but the player should always know: "What phase is this?", "What can I do now?", "What happens if I press this?"
- **Mobile stacking:** mobile works, but the action dock and next section compete vertically. The primary action should stay reachable without burying the state summary.

### Recommended UI Changes

1. **Create a stronger game HUD hierarchy**

   Put the phase, countdown, and submitted/pass count into a compact battle HUD attached to the table. Keep it persistent and visually separated from secondary panels.

2. **Turn the action dock into a console**

   The action panel should have one primary button, one selected action summary, and secondary options. Avoid making all actions look equally important after selection.

3. **Collapse the right rail by context**

   During active decision phases, show only event log + current skill/help snippet. Move full tutorial/reference into tabs or drawers.

4. **Make seat cards more game-like**

   Add state rings, small status icons, action readiness badges, and visible "threat/target" feedback. Reduce repeated text where icons can carry meaning.

5. **Unify art direction**

   Pick one theme lane and commit to it: "mysterious tabletop ritual", "casual card party", or "competitive arena". The current 3D abyss/HUD language is strong, so lean into that and remove generic landing-page language.

6. **Define design tokens**

   Move key colors, elevations, spacing, borders, and animation durations into a small token layer. This makes later polish much easier and prevents each component from inventing its own look.

7. **Add empty, loading, error, and reconnect states**

   Multiplayer games feel much more solid when connection loss, reconnect, waiting for others, spectator mode, and owner-only actions all have deliberate UI states.

## 2. Making Animations Feel Like A Real Game

### Use A Turn Animation Timeline

Every server-resolved turn should play as a deterministic sequence:

1. **Lock-in:** each seat shows submitted/ready feedback.
2. **Reveal:** action cards flip or slide toward the center.
3. **Anticipation:** short pause, camera push, table glow, target line appears.
4. **Impact:** damage/defense/reflect/skill effect fires with hit-stop.
5. **Aftermath:** HP/cake numbers count, status badges update, defeated players fade or slump.
6. **Return to neutral:** table breathes back to idle and the next prompt appears.

### Add Game Feel Principles

- **Hit-stop:** freeze the table for 80-140ms on big impacts.
- **Camera shake:** use small, brief shakes only for damage, break, or death.
- **Particles:** crumbs for cake gain/spend, sparks for defense, arcs for reflect, shock rings for skill activation.
- **Number animation:** HP/cake changes should count rather than instantly jump.
- **Sound hooks:** even simple UI blips make the game feel much more complete. Add sound events after animation names are stable.
- **State-based animation, not random animation:** every visual effect should be triggered by an event type from the server log.
- **Reduced motion mode:** respect `prefers-reduced-motion` and provide calmer alternatives.

### Technical Approach

- Keep Three.js for the table and camera.
- Use CSS transitions for small UI states: hover, selected, disabled, ready.
- Use a timeline helper for turn resolution events. This can be plain TypeScript first; add GSAP or another animation timeline library only if sequencing becomes hard to maintain.
- Store visual event IDs so the client never replays old effects after reconnect.
- Add Playwright checks for: desktop view, mobile view, canvas nonblank, action dock visible, no major overlap.

## 3. Agent-Based Playtesting Setup

Create three agent personas and use them after every UI polish pass.

### Player Agent A: First-Time Player

Role: someone who has never played BING.

Goals:

- Create or join a room without reading external docs.
- Understand when to submit an action.
- Explain what happened after one resolved turn.

What it should report:

- Confusing labels.
- Missing next-step cues.
- Anything that looks clickable but is not.
- Moments where the player cannot tell if the game is waiting, loading, or broken.

### Player Agent B: Competitive Player

Role: someone optimizing for speed, clarity, and tactical information.

Goals:

- Submit actions quickly.
- Track enemy resources and likely intent.
- Use skills without misclicks.
- Read the log after a complex turn.

What it should report:

- Slow interactions.
- Hidden or noisy information.
- Timing pressure problems.
- Ambiguous iconography.
- Whether the UI supports fast repeated play.

### Developer/Product Agent

Role: developer, producer, and QA reviewer.

Goals:

- Verify no console errors.
- Check responsive layout at desktop and mobile.
- Check Socket.IO reconnect and room resume.
- Validate performance during 3D table and effects.
- Turn player feedback into actionable tasks.

What it should report:

- Bugs with reproduction steps.
- Performance risks.
- Accessibility problems.
- Prioritized issue list with owner, severity, and acceptance criteria.

## Suggested Agent Test Script

1. Start production mode:

   ```bash
   npm run build
   npm run serve
   ```

2. Open two browser contexts.

3. Player Agent A creates a room.

4. Player Agent B joins the room.

5. Owner adds one AI, starts the game, and both agents submit actions for three turns.

6. Developer/Product Agent records:

   - screenshots
   - console errors
   - failed clicks
   - layout overlap
   - unclear copy
   - animation/event mismatch

7. Generate a markdown report in `artifacts/playtests/`.

## Modification Opinion Summary

### Priority 0: Make The Current UI Trustworthy

- Fix any garbled Chinese copy in the client and replay pages.
- Make the first screen use BING / 饼 branding.
- Ensure the README, public play docs, and in-app labels say the same thing.

### Priority 1: Improve Decision Clarity

- Redesign the action dock around one selected action and one primary submit button.
- Add a persistent phase/countdown HUD.
- Make "waiting for others" and "you have submitted" unmistakable.

### Priority 2: Make The Table Feel Alive

- Add turn reveal timeline.
- Add seat idle/ready/target/damaged/defeated states.
- Add HP/cake number transitions.
- Add event-specific particles and short camera beats.

### Priority 3: Improve Long-Term Polish

- Replace placeholder SVG character art with final visual direction.
- Add sound hooks.
- Add accessibility pass: contrast, keyboard flow, reduced motion, focus states.
- Add Playwright visual QA for desktop and mobile.

## Proposed Implementation Phases

### Phase A: Copy, Branding, And Layout

Deliverables:

- UTF-8 copy audit.
- BING-branded landing page.
- Cleaner table HUD and action dock hierarchy.
- Mobile dock behavior pass.

Acceptance criteria:

- A new player can create a room and submit a first action without external explanation.
- No visible mojibake in the main UI.
- No major layout overlap at 390px mobile width and 1280px desktop width.

### Phase B: Turn Timeline

Deliverables:

- Client-side event timeline mapper.
- Reveal, impact, reflect, defense, skill, defeat, and recovery beats.
- Basic sound event placeholders.

Acceptance criteria:

- Every major event in the log has a matching visual beat.
- Reconnect does not replay old effects.
- `prefers-reduced-motion` disables large camera shakes and particle bursts.

### Phase C: Playtest Agents

Deliverables:

- `scripts/ui-playtest-agents.ts` or Playwright equivalent.
- Two player browser contexts plus one reporter.
- Markdown report output.

Acceptance criteria:

- Script can create a room, join, start, submit actions, and capture screenshots.
- Report includes player-agent feedback and developer-agent bug list.

### Phase D: Production Feel

Deliverables:

- Final art direction pass.
- Better character/skill assets.
- Sound pack integration.
- Performance profiling for 3D table and effect bursts.

Acceptance criteria:

- Stable 60fps target on a normal laptop for the active table scene.
- Mobile remains readable and playable.
- The game feels coherent before, during, and after each turn.

## README Inspiration Notes

The README structure was shaped after common game repository patterns:

- Game repos often open with a concise identity line, badges, and immediate build/run instructions.
- Larger games separate installation, building, downloads, and support docs clearly.
- Demo-heavy repositories highlight screenshots or browser demos near the top so readers can understand the experience quickly.

References used while shaping the README:

- Mindustry: https://github.com/Anuken/Mindustry
- Endless Sky: https://github.com/endless-sky/endless-sky
- OpenRA: https://github.com/OpenRA/OpenRA
- Godot demo projects: https://github.com/godotengine/godot-demo-projects
