<script lang="ts">
  import { game } from "../game/state.svelte"
  import { toBlocks } from "../game/board"
  import Cell from "./Cell.svelte"

  let {
    onCellPress,
  }: {
    onCellPress?: (
      index: number,
      e: PointerEvent,
    ) => void
  } = $props()

  const blocksAcross =
    $derived(
      game.activeBoard.cols /
        game.activeBoard
          .blockCols,
    )
  const blocksDown = $derived(
    game.activeBoard.rows /
      game.activeBoard
        .blockRows,
  )
  // At idle game.board is null; render an empty placeholder board so the grid
  // still reserves its full size (keeps the start overlay aligned over it).
  const board = $derived(
    game.board ??
      Array.from(
        {
          length:
            game.activeBoard
              .cols *
            game.activeBoard
              .rows,
        },
        () => ({
          value: null,
          prefilled: false,
        }),
      ),
  )
  const blocks = $derived(
    toBlocks(
      board,
      game.activeBoard,
    ),
  )
  const conflicts = $derived(
    game.conflicts,
  )
</script>

<div
  class="board"
  class:solved={game.status ===
    "complete"}
  style="grid-template-columns: repeat({blocksAcross}, auto); --cols: {game
    .activeBoard
    .cols}; --rows: {game
    .activeBoard
    .rows}; --bx: {blocksAcross}; --by: {blocksDown}"
>
  {#each blocks as block}
    <div
      class="block"
      style="grid-template-columns: repeat({game
        .activeBoard
        .blockCols}, var(--cell)); grid-template-rows: repeat({game
        .activeBoard
        .blockRows}, var(--cell))"
    >
      {#each block as { index, cell }}
        <Cell
          {cell}
          selected={game.selected ===
            index}
          error={game.lastEntered ===
            index &&
            conflicts.has(
              index,
            )}
          conflict={conflicts.has(
            index,
          ) &&
            game.lastEntered !==
              index}
          onSelect={() =>
            game.select(
              index,
            )}
          onPress={(e) =>
            onCellPress?.(
              index,
              e,
            )}
        />
      {/each}
    </div>
  {/each}
</div>

<style>
  .board {
    --chrome-x: 672px; /* 2 × 312px sidebar mirror + breathing room */
    --chrome-y: 390px; /* MEASURE THIS — see below */

    /* the board's own overhead: cell gaps + block gaps + frame padding */
    --pad-x: calc(
      (
          var(--cols) -
            var(--bx)
        ) * 8px +
        (var(--bx) - 1) * 16px +
        26px
    );
    --pad-y: calc(
      (
          var(--rows) -
            var(--by)
        ) * 8px +
        (var(--by) - 1) * 16px +
        26px
    );

    --cell: min(
      (
          100vw -
            var(--chrome-x) -
            var(--pad-x)
        ) / var(--cols),
      (
          100vh -
            var(--chrome-y) -
            var(--pad-y)
        ) / var(--rows),
      116px
    ); /* fallback */
    --cell: min(
      (
          100vw -
            var(--chrome-x) -
            var(--pad-x)
        ) / var(--cols),
      (
          100dvh -
            var(--chrome-y) -
            var(--pad-y)
        ) / var(--rows),
      116px
    );
    display: grid;
    gap: 16px;
    padding: 13px;
    background: var(
      --board-frame
    );
    border: 1px solid
      var(--frame-border);
    border-radius: 14px;
    box-shadow: 0 12px 40px
      rgba(0, 0, 0, 0.45);
  }

  .block {
    display: grid;
    gap: 8px;
  }

  .board.solved {
    animation: solveglow 1.6s
      ease-in-out infinite;
  }

  @media (max-width: 640px) {
    .board {
      --chrome-x: 32px; /* board-area's 12px side padding + margin */
      --chrome-y: 288px;
    }
  }
</style>
