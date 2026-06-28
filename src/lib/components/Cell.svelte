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
</button>
