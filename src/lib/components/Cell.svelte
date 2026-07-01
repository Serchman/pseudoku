<script lang="ts">
  import type { Cell } from '../game/board';

  let {
    cell,
    selected,
    onSelect,
  }: { cell: Cell; selected: boolean; onSelect: () => void } = $props();
</script>

<button
  class="cell"
  class:selected
  class:prefilled={cell.prefilled}
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
    width: 116px;
    height: 116px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--cell-empty);
    border: 1px solid var(--border-4);
    border-radius: 5px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 36px;
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

  .caret {
    display: inline-block;
    width: 4px;
    height: 38px;
    background: var(--accent);
    animation: blink 1.1s steps(1) infinite;
  }
</style>
