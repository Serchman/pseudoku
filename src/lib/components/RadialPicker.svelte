<script lang="ts">
  import { exhaustedSymbols } from '../game/board';
  import { game } from '../game/state.svelte';
  import {
    ARM_THRESHOLD,
    GUIDE,
    IDLE,
    RADIUS,
    SCRIM,
    SELECTED,
    clampOrigin,
    resolveTarget,
    targetOffset,
    type RadialTarget,
  } from '../game/radial';

  const targets: RadialTarget[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'remove'];

  let overlayEl: HTMLDivElement;
  let active = $state(false);
  let origin = $state({ x: 0, y: 0 });
  let press = $state({ x: 0, y: 0 });
  let finger = $state({ x: 0, y: 0 });
  let pointerId: number | null = null;

  const disabled = $derived(
    game.board ? exhaustedSymbols(game.board, game.activeBoard) : new Set<number>(),
  );

  // Nothing is pickable until the finger has actually travelled: a press-and-lift cannot
  // resolve to a target, whatever the clamp did to the ring's origin.
  const armed = $derived(
    active && Math.hypot(finger.x - press.x, finger.y - press.y) > ARM_THRESHOLD,
  );

  // The ring is drawn at the clamped origin, so the hit test measures from it too.
  const hovered = $derived(
    armed ? resolveTarget(finger.x - origin.x, finger.y - origin.y) : null,
  );

  // An exhausted digit is not pickable: it neither locks in nor commits.
  const picked = $derived(
    typeof hovered === 'number' && disabled.has(hovered) ? null : hovered,
  );

  const beamDeg = $derived.by(() => {
    if (picked === null) return 0;
    const { x, y } = targetOffset(picked === 'remove' ? 9 : picked - 1);
    return (Math.atan2(y, x) * 180) / Math.PI;
  });

  export function begin(index: number, e: PointerEvent) {
    if (active) return;
    if (e.pointerType !== 'touch') return;
    // On a solved board `game.selected` still points at the last-filled cell, so the identity
    // guard below would pass and bloom a fan whose every commit path silently no-ops.
    if (game.status !== 'playing') return;
    e.preventDefault();

    game.select(index);
    if (game.selected !== index) return;

    origin = clampOrigin(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
    press = { x: e.clientX, y: e.clientY };
    finger = { x: e.clientX, y: e.clientY };
    pointerId = e.pointerId;
    overlayEl.setPointerCapture(e.pointerId);
    active = true;
  }

  function end() {
    if (pointerId !== null && overlayEl.hasPointerCapture(pointerId)) {
      overlayEl.releasePointerCapture(pointerId);
    }
    pointerId = null;
    active = false;
  }

  function onmove(e: PointerEvent) {
    if (!active || e.pointerId !== pointerId) return;
    finger = { x: e.clientX, y: e.clientY };
  }

  function onup(e: PointerEvent) {
    if (!active || e.pointerId !== pointerId) return;
    // A trailing pointermove is not guaranteed — resolve against the lift-off point itself.
    finger = { x: e.clientX, y: e.clientY };
    if (picked === 'remove') game.clear();
    else if (typeof picked === 'number') game.place(picked);
    end();
  }

  function oncancel(e: PointerEvent) {
    if (!active || e.pointerId !== pointerId) return;
    end();
  }
</script>

<!-- Gesture visualization, not an ARIA menu: the targets are painted, not clicked — the
     whole interaction is one pointer capture. The Cell button keeps its own click path,
     so there is no role to give this overlay. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={overlayEl}
  class="overlay"
  class:active
  style="--rx:{origin.x}px; --ry:{origin.y}px; --scrim:{SCRIM}px; --guide:{GUIDE}px; --idle:{IDLE}px; --sel:{SELECTED}px; --radius:{RADIUS}px;"
  onpointermove={onmove}
  onpointerup={onup}
  onpointercancel={oncancel}
>
  {#if active}
    <div class="scrim"></div>
    <div class="guide"></div>
    {#if picked !== null}
      <div class="beam" style="transform: rotate({beamDeg}deg);"></div>
    {/if}
    <div class="dot"></div>
    {#each targets as t, k (k)}
      {@const off = targetOffset(k)}
      <div
        class="target"
        class:remove={t === 'remove'}
        class:spent={typeof t === 'number' && disabled.has(t)}
        class:picked={picked === t}
        class:dimmed={picked !== null && picked !== t}
        style="left:{origin.x + off.x}px; top:{origin.y + off.y}px; --k:{k};"
      >
        {t === 'remove' ? '⌫' : t}
      </div>
    {/each}
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

  .scrim,
  .guide,
  .dot,
  .beam {
    position: absolute;
    left: var(--rx);
    top: var(--ry);
  }

  .scrim {
    width: var(--scrim);
    height: var(--scrim);
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(circle, rgba(10, 12, 16, 0.8) 40%, rgba(10, 12, 16, 0) 72%);
  }

  .guide {
    width: var(--guide);
    height: var(--guide);
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 1px dashed var(--accent-border-2);
    animation: ringbreathe 3s ease-in-out infinite;
  }

  .beam {
    width: var(--radius);
    height: 2px;
    margin-top: -1px;
    transform-origin: 0 50%;
    background: linear-gradient(90deg, rgba(94, 234, 212, 0.12), var(--accent));
    animation: beamin 140ms ease-out;
  }

  .dot {
    width: 12px;
    height: 12px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: var(--accent-fill);
    border: 1.5px solid var(--accent);
    box-shadow: 0 0 10px rgba(94, 234, 212, 0.5);
  }

  .target {
    position: absolute;
    width: var(--idle);
    height: var(--idle);
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0e1a17;
    border: 1px solid var(--accent-border);
    border-radius: 50%;
    font-family: 'JetBrains Mono', monospace;
    font-size: 20px;
    font-weight: 600;
    color: #8fd9c9;
    transition:
      width 120ms ease-out,
      height 120ms ease-out,
      opacity 120ms ease-out;
    animation: bloom 180ms ease-out backwards;
    animation-delay: calc(var(--k) * 14ms);
  }

  .target.remove {
    background: var(--cell-error-fill);
    border-color: var(--cell-conflict-border);
    color: var(--cell-conflict-numeral);
    font-size: 18px;
    font-weight: 400;
  }

  .target.spent {
    opacity: 0.28;
  }

  .target.dimmed {
    opacity: 0.4;
  }

  .target.spent.dimmed {
    opacity: 0.2;
  }

  .target.picked {
    width: var(--sel);
    height: var(--sel);
    z-index: 2;
    background: var(--accent);
    border: 2px solid #b6f5ea;
    color: var(--accent-on-dark);
    font-size: 26px;
    font-weight: 700;
    animation: selglow 1.4s ease-in-out infinite;
  }

  .target.picked.remove {
    background: var(--cell-error-border);
    border-color: #ff9aa3;
    color: var(--cell-error-fill);
    font-size: 24px;
    animation: removeglow 1.4s ease-in-out infinite;
  }

  @keyframes ringbreathe {
    0%,
    100% {
      opacity: 0.9;
    }
    50% {
      opacity: 0.55;
    }
  }

  /* `to` deliberately omits opacity: the implicit to-value comes from the cascade, so a target
     fades in to its own opacity (1 normally, .28 when spent) instead of snapping dim afterwards. */
  @keyframes bloom {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.4);
    }
    to {
      transform: translate(-50%, -50%) scale(1);
    }
  }

  @keyframes beamin {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes selglow {
    0%,
    100% {
      box-shadow: 0 0 26px rgba(94, 234, 212, 0.65);
    }
    50% {
      box-shadow: 0 0 36px rgba(94, 234, 212, 0.85);
    }
  }

  @keyframes removeglow {
    0%,
    100% {
      box-shadow: 0 0 26px rgba(255, 96, 110, 0.55);
    }
    50% {
      box-shadow: 0 0 36px rgba(255, 96, 110, 0.75);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .guide,
    .beam,
    .target,
    .target.picked,
    .target.picked.remove {
      animation: none;
      transition: none;
    }

    .target.picked {
      box-shadow: 0 0 26px rgba(94, 234, 212, 0.65);
    }

    .target.picked.remove {
      box-shadow: 0 0 26px rgba(255, 96, 110, 0.55);
    }
  }
</style>
