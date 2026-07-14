<script lang="ts">
  import { exhaustedSymbols } from '../game/board';
  import { game } from '../game/state.svelte';
  import {
    anchorPopup,
    keyAt,
    MOVE_THRESHOLD,
    POPUP_W,
    POPUP_H,
    KEY,
    GAP,
    PAD,
    ERASE_H,
    type Anchor,
    type KeypadTarget,
  } from '../game/keypad';

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  let overlayEl: HTMLDivElement;
  let active = $state(false);
  // After a tap-open (press-and-lift with no drag) the popup stays open and keys become
  // ordinary tap targets; during a drag it is hit-tested from the captured pointer instead.
  let pinned = $state(false);
  let anchor = $state<Anchor>({ left: 0, top: 0, origin: 'center bottom' });
  let press = $state({ x: 0, y: 0 });
  let finger = $state({ x: 0, y: 0 });
  let pointerId: number | null = null;

  const disabled = $derived(
    game.board ? exhaustedSymbols(game.board, game.activeBoard) : new Set<number>(),
  );

  const moved = $derived(Math.hypot(finger.x - press.x, finger.y - press.y) > MOVE_THRESHOLD);

  // The key under the finger mid-drag. Null while pinned (native taps drive selection then).
  const hovered = $derived<KeypadTarget | null>(
    active && !pinned ? keyAt(finger.x, finger.y, anchor.left, anchor.top) : null,
  );

  // An exhausted digit is not pickable: it neither highlights nor commits.
  const pickable = (t: KeypadTarget | null): boolean =>
    t !== null && !(typeof t === 'number' && disabled.has(t));

  export function begin(index: number, e: PointerEvent) {
    if (active) return;
    if (e.pointerType !== 'touch') return;
    // On a solved board game.selected still points at the last-filled cell, so the guard
    // below would pass and open a popup whose every commit path silently no-ops.
    if (game.status !== 'playing') return;
    e.preventDefault();

    game.select(index);
    if (game.selected !== index) return;

    anchor = anchorPopup(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
    press = { x: e.clientX, y: e.clientY };
    finger = { x: e.clientX, y: e.clientY };
    pointerId = e.pointerId;
    overlayEl.setPointerCapture(e.pointerId);
    active = true;
    pinned = false;
  }

  function commit(t: KeypadTarget) {
    if (!pickable(t)) return;
    if (t === 'remove') game.clear();
    else game.place(t);
    close();
  }

  function close() {
    if (pointerId !== null && overlayEl.hasPointerCapture(pointerId)) {
      overlayEl.releasePointerCapture(pointerId);
    }
    pointerId = null;
    active = false;
    pinned = false;
  }

  function onmove(e: PointerEvent) {
    if (!active || pinned || e.pointerId !== pointerId) return;
    finger = { x: e.clientX, y: e.clientY };
  }

  function onup(e: PointerEvent) {
    if (!active || pinned || e.pointerId !== pointerId) return;
    // A trailing pointermove is not guaranteed — resolve against the lift-off point itself.
    finger = { x: e.clientX, y: e.clientY };
    const target = keyAt(finger.x, finger.y, anchor.left, anchor.top);
    if (pickable(target)) {
      commit(target!);
    } else if (moved) {
      close(); // dragged and released off every key: cancel, no change
    } else {
      pin(); // a tap-open: keep the popup up so the next tap chooses a digit
    }
  }

  function pin() {
    if (pointerId !== null && overlayEl.hasPointerCapture(pointerId)) {
      overlayEl.releasePointerCapture(pointerId);
    }
    pointerId = null;
    pinned = true;
  }

  function oncancel(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    close();
  }

  function onkey(e: KeyboardEvent) {
    if (active && e.key === 'Escape') close();
  }
</script>

<svelte:window onkeydown={onkey} />

<!-- Pointer-capture gesture surface, not an ARIA menu. During a drag the keys are hit-tested
     from the captured pointer; once pinned they behave as ordinary tap targets. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={overlayEl}
  class="overlay"
  class:active
  onpointermove={onmove}
  onpointerup={onup}
  onpointercancel={oncancel}
>
  {#if active}
    <!-- Tap-scrim: only catches cancels once pinned; mid-drag the capture owns the pointer. -->
    <button
      class="scrim"
      class:pinned
      aria-label="Cancel number picker"
      tabindex="-1"
      onclick={close}
    ></button>

    <div
      class="popup"
      style="left:{anchor.left}px; top:{anchor.top}px; width:{POPUP_W}px; height:{POPUP_H}px; --pad:{PAD}px; --key:{KEY}px; --gap:{GAP}px; --erase:{ERASE_H}px; transform-origin:{anchor.origin};"
    >
      <div class="grid">
        {#each digits as d (d)}
          <button
            class="key"
            class:hover={hovered === d}
            class:disabled={disabled.has(d)}
            disabled={disabled.has(d)}
            tabindex="-1"
            onclick={() => commit(d)}
          >
            {d}
          </button>
        {/each}
      </div>
      <button
        class="erase"
        class:hover={hovered === 'remove'}
        aria-label="Erase cell"
        tabindex="-1"
        onclick={() => commit('remove')}
      >
        ⌫
      </button>
    </div>
  {/if}
</div>

<style>
  /* Above the board, below the prestige modal (60) — a modal always wins. */
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 55;
    pointer-events: none;
  }

  .overlay.active {
    pointer-events: auto;
  }

  .scrim {
    position: absolute;
    inset: 0;
    border: none;
    padding: 0;
    background: transparent;
    /* Mid-drag the captured pointer owns everything; the scrim only intercepts
       cancel taps once the popup is pinned open. */
    pointer-events: none;
  }

  .scrim.pinned {
    pointer-events: auto;
  }

  .popup {
    position: absolute;
    box-sizing: border-box;
    padding: var(--pad);
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    background: rgba(11, 20, 26, 0.96);
    border: 1px solid #2f6b5a;
    border-radius: 22px;
    box-shadow:
      0 22px 50px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(94, 234, 212, 0.12);
    animation: pickerin 120ms ease-out;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, var(--key));
    grid-template-rows: repeat(3, var(--key));
    gap: var(--gap);
  }

  .key {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: #0e1a17;
    border: 1px solid #24413a;
    border-radius: 13px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 30px;
    font-weight: 600;
    color: #8fd9c9;
    cursor: pointer;
    transition:
      background 100ms ease-out,
      border-color 100ms ease-out,
      color 100ms ease-out,
      box-shadow 100ms ease-out,
      transform 100ms ease-out;
  }

  /* Under-finger / drag-over. Also fires on :active so a pinned tap flashes the same state. */
  .key.hover,
  .key:active {
    background: #123028;
    border: 1.5px solid var(--accent);
    color: #c7fff2;
    font-weight: 700;
    font-size: 32px;
    box-shadow: 0 0 18px rgba(94, 234, 212, 0.45);
    transform: scale(1.06);
  }

  .key.disabled {
    background: #0c110f;
    border: 1px solid #182420;
    color: #39463f;
    cursor: default;
  }

  .key.disabled:active {
    background: #0c110f;
    border: 1px solid #182420;
    color: #39463f;
    font-size: 30px;
    font-weight: 600;
    box-shadow: none;
    transform: none;
  }

  .erase {
    height: var(--erase);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: var(--cell-error-fill);
    border: 1px solid var(--cell-conflict-border);
    border-radius: 13px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 22px;
    color: var(--cell-conflict-numeral);
    cursor: pointer;
    transition:
      background 100ms ease-out,
      border-color 100ms ease-out,
      box-shadow 100ms ease-out;
  }

  .erase.hover,
  .erase:active {
    background: var(--cell-error-border);
    border-color: #ff9aa3;
    color: var(--cell-error-fill);
    box-shadow: 0 0 18px rgba(255, 96, 110, 0.45);
  }

  @keyframes pickerin {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .popup,
    .key,
    .erase {
      animation: none;
      transition: none;
    }
  }
</style>
