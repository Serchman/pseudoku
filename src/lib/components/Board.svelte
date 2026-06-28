<script lang="ts">
  import { game } from '../game/state.svelte';
  import Cell from './Cell.svelte';
</script>

<div class="board">
  {#each game.board ?? [] as cell, i}
    <Cell {cell} selected={game.selected === i} onSelect={() => game.select(i)} />
  {/each}
</div>
