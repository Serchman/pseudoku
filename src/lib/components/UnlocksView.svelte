<script lang="ts">
  import { game } from '../game/state.svelte';
  import { UNLOCKS } from '../game/unlocks';
</script>

<div class="unlocks-view">
  <div class="unlocks-header">
    <span class="unlocks-label">UNLOCK TREE</span>
    <span class="unlocks-counter">{game.ownedCount} / {UNLOCKS.length} owned</span>
  </div>

  <div class="card-list">
    {#each UNLOCKS as u (u.id)}
      {@const owned = game.isOwned(u.id)}
      {@const affordable = !owned && game.pointokus >= u.cost}
      <div class="card" class:unlocked={owned || affordable} class:locked={!owned && !affordable}>
        <div class="card-title" class:locked={!owned && !affordable}>{u.title}</div>
        <div class="card-desc">{u.description}</div>
        <div class="card-footer">
          {#if owned}
            <span class="owned">✓ OWNED</span>
          {:else if affordable}
            <button class="buy" onclick={() => game.buyUnlock(u.id)}>Buy · {u.cost} P</button>
          {:else}
            <span class="cost-locked">🔒 {u.cost} P</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .unlocks-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 22px 30px;
  }

  .unlocks-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
  }

  .unlocks-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 2.5px;
    color: var(--muted-2);
  }

  .unlocks-counter {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--dimmer);
  }

  .card-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  .card {
    width: 100%;
    max-width: 320px;
    min-width: 200px;
    background: var(--panel-4);
    border-radius: 11px;
    padding: 14px 15px;
  }

  .card.unlocked {
    border: 1px solid var(--accent-border);
    box-shadow: 0 0 20px rgba(94, 234, 212, 0.15);
  }

  .card.locked {
    background: #0b0e12;
    border: 1px solid #181e27;
    opacity: 0.6;
  }

  .card-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .card-title.locked {
    color: #aab6c4;
  }

  .card-desc {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 11.5px;
    color: var(--muted-2);
    margin-top: 4px;
  }

  .card-footer {
    margin-top: 11px;
  }

  .owned {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--accent);
    letter-spacing: 0.5px;
  }

  .buy {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12.5px;
    color: var(--accent);
    background: var(--accent-fill);
    border: 1px solid var(--accent-border);
    border-radius: 6px;
    padding: 5px 10px;
    cursor: pointer;
  }

  .cost-locked {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12.5px;
    color: #7a8696;
    background: #10141a;
    border: 1px solid var(--border-4);
    border-radius: 6px;
    padding: 5px 10px;
  }
</style>
