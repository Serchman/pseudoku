<script lang="ts">
  import { game } from '../game/state.svelte';

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
</script>

<div class="numberpad">
  <div class="keys">
    {#each numbers as n}
      <button onclick={() => game.place(n)}>{n}</button>
    {/each}
  </div>
  <button class="erase" onclick={() => game.clear()}>⌫ Erase</button>
</div>

<style>
  .numberpad {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .keys {
    display: flex;
    gap: 6px;
  }

  .keys button {
    flex: 1;
    aspect-ratio: 1;
    min-width: 0;
    max-height: 56px;
    background: #11161d;
    border: 1px solid var(--border-4);
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 19px;
    color: #cdd8e4;
    cursor: pointer;
    padding: 0;
  }

  .erase {
    width: 100%;
    height: 40px;
    background: var(--panel-3);
    border: 1px solid var(--border-4);
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 13px;
    color: var(--muted);
    cursor: pointer;
  }
</style>
