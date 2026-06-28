<script lang="ts">
  import { game } from '../game/state.svelte';

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
</script>

<div class="numberpad">
  {#each numbers as n}
    <button onclick={() => game.place(n)}>{n}</button>
  {/each}
  <button onclick={() => game.clear()}>Clear</button>
</div>
