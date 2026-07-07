<script lang="ts">
  import type { Cell } from '../game/board';

  let {
    cell,
    selected,
    error = false,
    conflict = false,
    onSelect,
  }: {
    cell: Cell;
    selected: boolean;
    error?: boolean;
    conflict?: boolean;
    onSelect: () => void;
  } = $props();
</script>

<button
  class="cell"
  class:selected
  class:prefilled={cell.prefilled}
  class:error
  class:conflict
  disabled={cell.prefilled}
  onclick={onSelect}
>
  {cell.value ?? ''}
  {#if selected && cell.value == null}
    <span class="caret"></span>
  {/if}
</button>

<style>
  .cell {
    width: var(--cell);
    height: var(--cell);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--cell-empty);
    border: 1px solid var(--border-4);
    border-radius: 5px;
    font-family: 'JetBrains Mono', monospace;
    font-size: calc(var(--cell) * 0.31);
    font-weight: 500;
    color: var(--cell-player-numeral);
    padding: 0;
    cursor: pointer;
  }

  .cell.prefilled {
    background: var(--cell-locked-fill);
    border-color: var(--border-4);
    color: var(--cell-locked-numeral);
    cursor: default;
  }

  .cell.selected {
    background: var(--cell-selected-fill);
    border: 2px solid var(--accent);
    box-shadow: var(--cell-selected-glow);
  }

  .cell.conflict {
    color: var(--cell-conflict-numeral);
    border: 1px solid var(--cell-conflict-border);
    animation: conflictpulse 1.6s ease-in-out infinite;
  }

  .cell.error {
    background: var(--cell-error-fill);
    border: 2px solid var(--cell-error-border);
    color: var(--cell-error-numeral);
    font-weight: 700;
    animation:
      errshake 0.4s ease-in-out,
      errglow 1.6s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .cell.error,
    .cell.conflict {
      animation: none;
      box-shadow: none;
    }
  }

  .caret {
    display: inline-block;
    width: 4px;
    height: calc(var(--cell) * 0.33);
    background: var(--accent);
    animation: blink 1.1s steps(1) infinite;
  }
</style>
