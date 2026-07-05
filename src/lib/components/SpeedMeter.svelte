<script lang="ts">
  import { game } from '../game/state.svelte';
  import { computeSegments, computeMeterPosition, formatClock, formatCountdown } from '../game/meter';

  // Bar geometry never changes for a board — compute it once, not every tick.
  const { segments, horizonSec } = computeSegments(game.activeBoard.brackets);
  const pos = $derived(computeMeterPosition(game.elapsed / 1000, game.activeBoard.brackets, horizonSec));
</script>

<div class="speed-meter">
  <div class="top-row">
    <span class="clock">{formatClock(game.elapsed)}</span>
    <span class="arrow">➜</span>
    <span class="mult">×{pos.currentMult.toFixed(1)}</span>
  </div>

  <div class="bar">
    <div class="fill" style="width: {pos.positionPct}%"></div>
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

  {#if pos.nextDropSec !== null}
    <div class="next-drop">
      <span class="dot"></span>
      next drop {formatCountdown(pos.nextDropSec)} → ×{pos.nextMult?.toFixed(1)}
    </div>
  {/if}
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

  .mult {
    font-family: 'JetBrains Mono', monospace;
    font-size: 21px;
    font-weight: 700;
    color: var(--accent);
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
    background: linear-gradient(90deg, var(--accent-fill), var(--accent));
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

  .next-drop {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    color: var(--points);
  }

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--points);
    box-shadow: 0 0 8px rgba(245, 180, 84, 0.7);
    animation: pulsedot 1.6s ease-in-out infinite;
  }
</style>
