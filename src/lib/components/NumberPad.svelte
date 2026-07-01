<script lang="ts">
  import { game } from '../game/state.svelte';

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
</script>

<div class="numberpad">
  <div class="grid">
    {#each numbers as n}
      <button onclick={() => game.place(n)}>{n}</button>
    {/each}
  </div>
  <button class="erase" onclick={() => game.clear()}>⌫ Erase</button>
</div>

<style>
  .numberpad {
    position: relative;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 50px);
    grid-template-rows: repeat(3, 50px);
    gap: 7px;
  }

  .grid button {
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
    margin-top: 7px;
    width: 100%;
    height: 38px;
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
