# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project: Sudoku Incremental

**Stack:** Svelte 5 (runes: `$state`, `$props`, etc.) + TypeScript + Vite. Tests: Vitest.

**Verify (all three must pass before a change is done):**

```
npm run check   # svelte-check — type + Svelte diagnostics
npm test        # vitest run
npm run build   # vite build
```

`npm run test:watch` for iterating; `npm run dev` to serve.

**Layout:**
- `src/lib/game/` — game logic and state. State lives in `state.svelte.ts` via
  `createGame()`, which returns an object of getters + action methods; `game` is the
  shared singleton. Pure helpers (`board.ts`, `scoring.ts`, etc.) sit alongside.
- `src/lib/components/` — Svelte components. `src/App.svelte` is the shell.
- `src/app.css` — global CSS: design tokens (`:root { --accent, --points, --panel*,
  --border*, --muted-*, --dim, ... }`) and `@keyframes`.

**Component conventions:**
- Scoped `<style>` per component. Reference the `app.css` tokens rather than hardcoding
  hex where a token lines up.
- Every clickable element is a `<button>`, never a `<div onclick>` (keyboard-accessible
  by default; matches `Sidebar.svelte`, `NumberPad.svelte`, `Cell.svelte`).
- Any animation gets a `@media (prefers-reduced-motion: reduce) { animation: none; }`
  guard — see `Cell.svelte` for the established pattern.
- Props via `$props()` with an inline type; callbacks passed as `on*` props (e.g.
  `onconfirm`, `oncancel`), not `createEventDispatcher`.

**Tests:**
- Game logic is unit-tested; components are **not** — there is no component-render
  harness, and adding one is out of scope unless explicitly asked.
- State tests use `// @vitest-environment jsdom`, `createGame()` + `localStorage`, and a
  `beforeEach(() => localStorage.clear())`. Reuse the existing `solveDefault(game)` helper
  in `state.test.ts` to drive a board to `complete`; don't write a new solver.
