<script lang="ts">
  import { game } from './lib/game/state.svelte';
  import Header from './lib/components/Header.svelte';
  import Board from './lib/components/Board.svelte';
  import NumberPad from './lib/components/NumberPad.svelte';
  import Timer from './lib/components/Timer.svelte';

  function onKeydown(e: KeyboardEvent) {
    if (game.status !== 'playing') return;
    if (e.key >= '1' && e.key <= '9') {
      game.place(Number(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      game.clear();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<Header />

<main>
  {#if game.status === 'idle'}
    <button onclick={() => game.start()}>Start</button>
  {:else}
    <Timer />
    <Board />
    <NumberPad />
    {#if game.status === 'complete' && game.lastResult}
      <div class="result">
        Solved! +{game.lastResult.points} Pointokus in
        {(game.lastResult.timeMs / 1000).toFixed(2)}s
      </div>
      <button onclick={() => game.reset()}>Reset Boards</button>
    {/if}
  {/if}
</main>
