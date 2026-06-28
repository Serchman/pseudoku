# Sudoku Incremental — Prototype GDD

*Working title: TBD*

## Concept

A browser-based incremental game where the player solves sudoku-style puzzles to earn points, then spends those points on upgrades and automations that help them complete future puzzles faster. As the player progresses, automations gradually take over the manual solving and the game shifts from a hands-on puzzle to a system the player manages and optimizes.

## Core Loop

Solve a board → earn Pointokus → spend Pointokus on upgrades → solve boards faster → earn more Pointokus per solve → unlock further upgrades and automations → repeat.

The central optimization vector is **completion speed**. Every meaningful upgrade in the game should, directly or indirectly, help the player complete boards faster.

## Resources

**Pointokus** — the primary currency. Earned by completing boards. Spent on upgrades and unlocks.

*(Additional resources may be introduced in later phases — TBD.)*

## Phase 1: The Starter Board

The player begins with a single small board: a 3×3 grid (9 cells total). The puzzle rule is intentionally simple — the player places each number from 1 to 9 exactly once across the nine cells. There are no row or column constraints; this is essentially a "fill in the missing numbers" puzzle.

Each board starts empty with a **Start button**. When the player presses Start, the puzzle generates (pre-filled cells populate) and the timer begins simultaneously. This prevents pre-solving — the player cannot see the board before committing to the attempt. Pre-filled cells are chosen randomly each puzzle.

At the Easy difficulty (the starting tier), 3 cells are left empty for the player to fill. The player places any missing number in any empty cell; duplicates are allowed and freely correctable — the only punishment for a wrong placement is the time lost correcting it. No error flagging in the prototype.

**Board difficulty tiers** are unlocked per-board, not via the Unlocks tab. Each tier increases the number of empty cells and applies a points multiplier to the completed board. This creates a core strategic decision: a faster solve at a lower difficulty may outperform a slower solve at a higher difficulty, depending on the player's speed and the multiplier values. Difficulty tier progression is TBD by designer.

When the player completes a board, they earn Pointokus. Initially this is a flat amount — speed does not yet affect earnings. The loop at this stage is simply: solve → earn → repeat.

New puzzles do not appear automatically. To get a fresh board, the player presses a **"Reset Boards"** button, which clears the current board and returns to the empty board + Start button state. Because reset is manual, Phase 1 is a fully active experience — nothing happens unless the player drives it. This is intentional, and creates the contrast against later automation-driven phases.

An **Unlocks tab** is visible from the start of the game. It displays the next available unlock and its Pointoku cost at all times, giving the player a concrete goal to work toward. The **first unlock** is the speed bonus itself — before purchasing it, all boards pay flat points regardless of solve time. After purchasing it, solve time begins to matter and the full scoring system activates. This unlock is intentionally cheap so the player experiences the real loop quickly.

Once the speed bonus is active, scoring uses a **tiered bracket + exponential** system. Hitting a faster time bracket gives a multiplier jump; within each bracket, exponential scaling rewards pushing further. A global speed-bonus multiplier (upgradeable via the Unlocks tab in subsequent unlocks) is applied last, amplifying the full result. The bracket thresholds and multiplier values are TBD by designer.

From here, every subsequent unlock the player works toward (automations, larger boards, additional mechanics — all TBD) is designed to feed back into the same loop.

**Phase 1 UX requirements:**
- Snappy input — both keyboard and click-to-place
- Visible solve timer so the player can feel and chase their speed
- Clear completion feedback: points earned, time taken, speed bonus applied
- Unlocks tab persistent and visible, always showing the next goal and its cost

**Phase 1 ends when:** *TBD by designer.*

## Phase 2: The Double Board

Phase 2 introduces the first board with real puzzle constraints. The player unlocks a **6×3 grid** — two 3×3 blocks placed side by side — via the Unlocks tab.

Each block follows the same base rule as Phase 1: place numbers 1–9 exactly once per block. The new constraint is **row rules**: no number may repeat across the shared rows that span both blocks. This is the first time the player must think logically rather than just place quickly, introducing Sudoku-style reasoning in a controlled, minimal way.

The 3×3 board remains available. The player can run either board at any time — the 3×3 remains the faster, lower-risk option while the 6×3 offers longer solves with higher point potential. This extends the core strategic tension (speed vs. multiplier) across board types as well as difficulty tiers.

The 6×3 has its own independent difficulty tier system, visible and unlockable on the board itself (not via the Unlocks tab). Each tier increases the number of empty cells and applies a higher points multiplier. Timer brackets and speed bonus parameters are tuned separately from the 3×3 to account for longer expected solve times. Specific values TBD by designer.

All other systems (Start button flow, random pre-fill distribution, free wrong placement, speed bonus scoring) carry over from Phase 1 unchanged.

**Phase 2 ends when:** *TBD by designer.*

## Phase 3: Tools and the Column Board

Phase 3 introduces two things simultaneously: the first solving tool, and a third board that introduces column constraints.

### Hint System

After Phase 2's row logic slows the player down, the **hint system** becomes available as an Unlocks tab purchase. This is a global unlock that gates the entire hint mechanic.

Once unlocked, each board gains its own hint upgrade purchasable directly on the board (not via the Unlocks tab). Each purchase permanently adds one hinted cell to that board. Hinted cells display the valid numbers for that cell in real time — any number not yet present in that cell's row or 3×3 box. Hints update live as the board state changes, so they always reflect the current puzzle state.

When a new puzzle generates, hinted cell positions are assigned randomly from the empty cells. The permanent upgrade is the *number* of hinted cells, not their position. This adds mild variance to each solve while keeping the investment stable and meaningful.

At higher difficulty tiers, more empty cells mean hints cover a smaller fraction of the board — players will naturally want to invest in more hints as they climb difficulty tiers to maintain solve speed.

### The Column Board (3×9)

The second new board is a **3×9 grid** — three 3×3 blocks stacked vertically — unlocked via the Unlocks tab. Each block follows the base rule of placing 1–9 exactly once. The new constraint is **column rules**: no number may repeat across the shared columns spanning all three blocks.

This mirrors Phase 2's structure but in the vertical axis, introducing column logic as a distinct constraint the player hasn't encountered before. Combined with the hint system arriving at the same time, the player has a tool to help manage the increased cognitive load.

The 3×9 has its own independent difficulty tier system, visible and unlockable on the board itself. Timer brackets and speed bonus parameters are tuned separately to account for the larger board and longer expected solve times. Specific values TBD by designer.

All three boards (3×3, 6×3, 3×9) are available simultaneously. The player manages which boards to run and invest in based on their earning strategy.

**Phase 3 ends when:** *TBD by designer.*

## Phase 4

Phase 4 likely introduces a **6×6 grid** — four 3×3 blocks in a 2×2 layout — as the first board where both row and column constraints apply simultaneously. This is a significant difficulty step and a natural milestone before the 9×9.

Phase 4 may also be where **automation** first appears, given the player has ground through three board types and a full hint system by this point. The specific form automation takes is TBD.

Unlocks tab progression, board difficulty tiers, and hint upgrades carry over from previous phases.

*Further details TBD by designer.*

## Phase 5 and Beyond

The **9×9 board** — full classic Sudoku with row, column, and box constraints — arrives here as a major milestone. This is the natural destination the entire game has been building toward.

A **prestige / endgame** layer exists beyond the 9×9. Details TBD by designer.

## Tech Stack Recommendation

- **Vanilla JS or Svelte** — Svelte gives reactive UI without React's overhead; vanilla is fine if you want full control. Avoid React unless you already have a strong preference.
- **break_infinity.js** — for large numbers if/when Pointokus scaling exceeds Number.MAX_SAFE_INTEGER in later phases.
- **LocalStorage + export-string saves** — incremental players will expect backup/restore.
- **Web Workers** — useful later if/when automation logic runs on large boards and could block the UI. Not needed for Phase 1.
- **No build step initially** — keep it simple, ship from a single HTML file during prototyping.

## Prototype Scope (MVP)

The MVP is exactly Phase 1, nothing more. Goal: validate that the core loop is engaging before designing the rest.

**In scope:**
- Single 3×3 board with 1–9 placement (no row/col constraints)
- Empty board + Start button; puzzle generates and timer starts simultaneously on press
- 3 empty cells at Easy difficulty; pre-filled cells chosen randomly each puzzle
- Wrong placements allowed and freely correctable; no error flagging
- Flat Pointokus on completion before speed bonus is unlocked
- First unlock: activates the speed bonus (tiered bracket + exponential scaling)
- Subsequent unlock: global speed-bonus multiplier upgrade
- Board difficulty tiers unlocked per-board (not via Unlocks tab)
- Manual "Reset Boards" button
- Unlocks tab showing the next unlock and its cost
- Save/load via LocalStorage

**Out of scope for MVP:**
- Anything from Phases 2, 3, 4
- Multiple boards
- Automation
- Larger or variant puzzles
- Cosmetics beyond functional UI

**The MVP question:** Does the loop of *solve fast → earn points → buy a speed-bonus upgrade → want to solve even faster* feel compelling enough on its own that the player wants to keep going and see what's behind the next unlock? If yes, the foundation is solid for the rest of the design. If no, Phase 1 needs tuning before more is built on top.

## Design Decisions (Phase 1)

1. **Pre-filled cells per puzzle** — Easy difficulty starts with 3 empty cells. Each board difficulty tier increases the empty cell count and applies a higher points multiplier, creating a speed-vs-multiplier tradeoff the player manages. Pre-filled cells are chosen randomly each puzzle.
2. **Speed bonus curve** — tiered brackets combined with exponential scaling within each bracket. Bracket thresholds and multiplier values TBD by designer.
3. **Wrong-placement handling** — players can place any number freely and correct mistakes at will. No penalties beyond the time lost. No duplicate flagging in the prototype.
4. **Pre-filled cell distribution** — random each puzzle.
5. **Timer start** — the board starts empty. The player presses a Start button; the puzzle generates and the timer begins simultaneously. This prevents pre-solving on paper before committing to the attempt.
