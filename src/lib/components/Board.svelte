<script lang="ts">
  import { game } from '../game/state.svelte';
  import { toBlocks } from '../game/board';
  import Cell from './Cell.svelte';

  let { onCellPress }: { onCellPress?: (index: number, e: PointerEvent) => void } = $props();

  const blocksAcross = $derived(game.activeBoard.cols / game.activeBoard.blockCols);
  // At idle game.board is null; render an empty placeholder board so the grid
  // still reserves its full size (keeps the start overlay aligned over it).
  const board = $derived(
    game.board ??
      Array.from(
        { length: game.activeBoard.cols * game.activeBoard.rows },
        () => ({ value: null, prefilled: false }),
      ),
  );
  const blocks = $derived(toBlocks(board, game.activeBoard));
  const conflicts = $derived(game.conflicts);
</script>

<div
  class="board"
  class:solved={game.status === 'complete'}
  style="grid-template-columns: repeat({blocksAcross}, auto); --cols: {game.activeBoard.cols}; --rows: {game.activeBoard.rows}"
>
  {#each blocks as block}
    <div
      class="block"
      style="grid-template-columns: repeat({game.activeBoard.blockCols}, var(--cell)); grid-template-rows: repeat({game.activeBoard.blockRows}, var(--cell))"
    >
      {#each block as { index, cell }}
        <Cell
          {cell}
          selected={game.selected === index}
          error={game.lastEntered === index && conflicts.has(index)}
          conflict={conflicts.has(index) && game.lastEntered !== index}
          hintCandidates={game.hintedCandidates[index]}
          onSelect={() => game.select(index)}
          onPress={(e) => onCellPress?.(index, e)}
        />
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

  @media (max-width: 640px) {
    .board {
      --cell: min((100vw - 64px - (var(--cols) - 1) * 8px) / var(--cols),
                  (100vh  - 330px) / var(--rows), 120px);   /* fallback */
      --cell: min((100vw - 64px - (var(--cols) - 1) * 8px) / var(--cols),
                  (100dvh - 330px) / var(--rows), 120px);
    }
  }
</style>
