<script lang="ts">
  import { game } from '../game/state.svelte';
  import { toBlocks } from '../game/board';
  import Cell from './Cell.svelte';

  const blocksAcross = $derived(game.activeBoard.cols / game.activeBoard.blockCols);
  const blocks = $derived(game.board !== null ? toBlocks(game.board, game.activeBoard) : []);
</script>

<div
  class="board"
  class:solved={game.status === 'complete'}
  style="grid-template-columns: repeat({blocksAcross}, auto)"
>
  {#each blocks as block}
    <div
      class="block"
      style="grid-template-columns: repeat({game.activeBoard.blockCols}, var(--cell)); grid-template-rows: repeat({game.activeBoard.blockRows}, var(--cell))"
    >
      {#each block as { index, cell }}
        <Cell {cell} selected={game.selected === index} onSelect={() => game.select(index)} />
      {/each}
    </div>
  {/each}
</div>

<style>
  .board {
    --cell: clamp(64px, 11vw, 116px);
    display: grid;
    gap: 16px;
    padding: 13px;
    background: var(--board-frame);
    border: 1px solid var(--frame-border);
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  }

  .block {
    display: grid;
    gap: 8px;
  }

  .board.solved {
    animation: solveglow 1.6s ease-in-out infinite;
  }
</style>
