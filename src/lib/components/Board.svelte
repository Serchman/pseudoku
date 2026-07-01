<script lang="ts">
  import { game } from '../game/state.svelte';
  import Cell from './Cell.svelte';
</script>

<div class="board" class:solved={game.status === 'complete'}>
  {#each game.board ?? [] as cell, i}
    <Cell {cell} selected={game.selected === i} onSelect={() => game.select(i)} />
  {/each}
</div>

<style>
  .board {
    display: grid;
    grid-template-columns: repeat(3, 116px);
    grid-template-rows: repeat(3, 116px);
    gap: 8px;
    padding: 13px;
    background: var(--board-frame);
    border: 1px solid var(--frame-border);
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  }

  .board.solved {
    animation: solveglow 1.6s ease-in-out infinite;
  }
</style>
