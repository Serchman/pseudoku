<script lang="ts">
  import { game } from '../game/state.svelte';

  function fmt(ms: number | null): string {
    return ms === null ? '—' : `${(ms / 1000).toFixed(2)}s`;
  }
</script>

<div class="stats-view">
  <div class="stats-panel">
    <div class="stats-head">STATISTICS</div>

    <div class="mult-box" class:inactive={!game.isOwned('records')}>
      <span class="mult-label">RECORD MULTIPLIER</span>
      <span class="mult-value">×{game.recordMultiplier.toFixed(2)}</span>
      {#if !game.isOwned('records')}
        <span class="mult-note">Unlock Records to apply this to banked points.</span>
      {/if}
    </div>

    <div class="breakdown-head">PER-BOARD RECORDS</div>
    <div class="breakdown">
      {#each game.recordStats as s (s.id)}
        <div class="stat-row">
          <span class="stat-name">{s.name}</span>
          <span class="stat-best">{fmt(s.bestMs)}</span>
          <span class="stat-term">×{s.term.toFixed(2)}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .stats-view {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 28px 16px;
  }

  .stats-panel {
    width: 100%;
    max-width: 460px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .stats-head,
  .breakdown-head {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 2px;
    color: var(--muted-2);
  }

  .mult-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: var(--accent-fill);
    border: 1px solid var(--accent-border);
    border-radius: 12px;
    padding: 18px;
  }

  .mult-box.inactive {
    background: var(--panel-3);
    border-color: var(--border);
  }

  .mult-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 2.5px;
    color: var(--muted-2);
  }

  .mult-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 34px;
    font-weight: 700;
    color: var(--accent);
    line-height: 1;
  }

  .mult-box.inactive .mult-value {
    color: var(--dim);
  }

  .mult-note {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 11px;
    color: var(--muted-2);
  }

  .breakdown {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .stat-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: var(--panel-3);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 11px 12px;
    font-family: 'JetBrains Mono', monospace;
  }

  .stat-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .stat-best {
    margin-left: auto;
    font-size: 12px;
    color: var(--dim);
  }

  .stat-term {
    font-size: 12px;
    color: var(--accent);
  }
</style>
