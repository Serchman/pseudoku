<script lang="ts">
  import { game } from '../game/state.svelte';
  import { computeSegments, computeMeterPosition, formatClock } from '../game/meter';

  // Bar geometry never changes for a board — compute it once, not every tick.
  const { segments, horizonSec } = computeSegments(game.activeBoard.brackets);
  const pos = $derived(computeMeterPosition(game.elapsed / 1000, game.activeBoard.brackets, horizonSec));
</script>

<div class="speed-meter">
  <div class="top-row">
    <span class="clock">{formatClock(game.elapsed)}</span>
    <span class="arrow">➜</span>
    <span class="projected">{game.projectedPoints} P</span>
  </div>

  <div class="bar">
    <div class="fill" style="left: {pos.positionPct}%"></div>
    {#each segments as segment, i}
      {#if i < segments.length - 1}
        <div class="divider" style="left: {segment.endPct}%"></div>
      {/if}
    {/each}
  </div>

  <div class="indicator-row">
    <span class="indicator" style="left: {pos.positionPct}%">▲</span>
  </div>

  <div class="labels-row">
    {#each segments as segment, i}
      <span class="label" class:active={i === pos.activeIndex} style="left: {segment.centerPct}%">
        ×{segment.mult.toFixed(1)}
      </span>
    {/each}
  </div>
</div>

<style>
  .speed-meter {
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .top-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
    margin-bottom: 12px;
  }

  .clock {
    font-family: 'JetBrains Mono', monospace;
    font-size: 21px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.5px;
  }

  .arrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px;
    color: var(--dim);
  }

  .projected {
    font-family: 'JetBrains Mono', monospace;
    font-size: 21px;
    font-weight: 700;
    color: var(--points);
  }

  .bar {
    position: relative;
    height: 14px;
    border-radius: 7px;
    background: var(--panel);
    border: 1px solid var(--border-4);
    overflow: hidden;
  }

  .fill {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, var(--accent), var(--accent-fill));
    opacity: 0.85;
  }

  .divider {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--bg);
  }

  .indicator-row {
    position: relative;
    height: 11px;
  }

  .indicator {
    position: absolute;
    transform: translateX(-50%);
    color: var(--accent);
    font-size: 10px;
    line-height: 1;
  }

  .labels-row {
    position: relative;
    height: 15px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
  }

  .label {
    position: absolute;
    transform: translateX(-50%);
    color: var(--muted);
  }

  .label.active {
    color: var(--accent);
    font-weight: 700;
  }

  /* Phase 4 — compact the meter on mobile so it sits tightly above the board
     and stays within the Phase-1 vertical reserve. Additive; desktop unchanged. */
  @media (max-width: 640px) {
    .top-row {
      gap: 9px;
      margin-bottom: 9px;
    }
    .clock,
    .projected {
      font-size: 17px;
    }
    .arrow {
      font-size: 12px;
    }
    .bar {
      height: 11px;
      border-radius: 6px;
    }
    .indicator-row {
      height: 9px;
    }
    .indicator {
      font-size: 9px;
    }
    .labels-row {
      height: 14px;
      margin-top: 2px;
      font-size: 9px;
    }
  }
</style>
