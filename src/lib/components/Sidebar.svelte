<script lang="ts">
  import { game } from '../game/state.svelte';
</script>

<div class="sidebar-panel">
  <div class="unlocks">
    <div class="unlocks-head">
      <span>DIFFICULTY</span>
    </div>
    <div class="unlocks-sub">More blanks for a bigger points multiplier.</div>
    <div class="unlocks-list">
      {#each game.tiers as tier (tier.id)}
        <div
          class="unlock-row"
          class:affordable={tier.buyable}
          class:locked={!tier.owned && !tier.buyable}
          class:selected={tier.selected}
        >
          <div>
            <div class="unlock-title" class:locked={!tier.owned && !tier.buyable}>{tier.label}</div>
            <div class="unlock-sub">{tier.emptyCells} empty · ×{tier.mult}</div>
          </div>
          {#if tier.owned}
            {#if tier.selected}
              <span class="unlock-owned">ACTIVE</span>
            {:else}
              <button
                class="tier-btn"
                onclick={() => game.selectTier(tier.id)}
                disabled={game.status === 'playing'}
              >SELECT</button>
            {/if}
          {:else if tier.buyable}
            <button class="tier-btn buy" onclick={() => game.buyTier(tier.id)}>{tier.cost} P</button>
          {:else}
            <span class="unlock-badge locked">🔒 {tier.cost}</span>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <div class="key-hint">
    <div>› click cell, type <span class="key">1–9</span></div>
    <div>› <span class="key">⌫</span> clears · <span class="key">↹</span> next cell</div>
  </div>
</div>

<style>
  .sidebar-panel {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .unlocks-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 2px;
    color: var(--muted-2);
  }

  .unlocks-sub {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 11px;
    color: var(--muted-2);
    margin-top: 4px;
    margin-bottom: 10px;
  }

  .unlocks-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .unlock-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--panel-3);
    border: 1px solid #181e27;
    border-radius: 8px;
    padding: 11px 12px;
  }

  .unlock-row.affordable {
    border-color: var(--accent-border-2);
  }

  .unlock-row.selected {
    border-color: var(--accent-border);
    box-shadow: 0 0 20px rgba(94, 234, 212, 0.15);
  }

  .unlock-row.locked {
    background: #0b0e12;
    opacity: 0.55;
  }

  .unlock-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
  }

  .unlock-title.locked {
    color: #aab6c4;
  }

  .unlock-sub {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 11px;
    color: var(--muted-2);
    margin-top: 1px;
  }

  .unlock-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    border-radius: 5px;
    padding: 4px 8px;
  }

  .unlock-badge.locked {
    color: #7a8696;
    background: #10141a;
    border: 1px solid var(--border-4);
  }

  .unlock-owned {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--accent);
    letter-spacing: 0.5px;
  }

  .tier-btn {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #cdd8e4;
    background: #10141a;
    border: 1px solid var(--border-4);
    border-radius: 5px;
    padding: 4px 8px;
    cursor: pointer;
  }

  .tier-btn.buy {
    color: var(--accent);
    background: var(--accent-fill);
    border-color: var(--accent-border);
  }

  .tier-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .key-hint {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--dim);
    background: #0a0d12;
    border: 1px dashed var(--border-4);
    border-radius: 7px;
    padding: 10px 12px;
    line-height: 1.5;
  }

  .key {
    color: #cdd8e4;
  }
</style>
