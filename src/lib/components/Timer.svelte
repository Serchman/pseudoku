<script lang="ts">
  import { game } from '../game/state.svelte';

  function format(ms: number): string {
    const totalCs = Math.floor(ms / 10);
    const cs = totalCs % 100;
    const totalS = Math.floor(totalCs / 100);
    const s = totalS % 60;
    const m = Math.floor(totalS / 60);
    return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }
</script>

<div class="timer">{format(game.elapsed)}</div>
