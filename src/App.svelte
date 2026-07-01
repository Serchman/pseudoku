<script lang="ts">
  import { game } from './lib/game/state.svelte';
  import Board from './lib/components/Board.svelte';
  import NumberPad from './lib/components/NumberPad.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';

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

<div class="app">
  <div class="topbar">
    <div class="topbar-left">
      <span class="status-dot"></span>
      <span class="wordmark">SUDOKU_INCREMENTAL<span class="accent">_</span></span>
      <span class="version">v0.1</span>
    </div>
    <div class="topbar-right">PUZZLE_01 · 3×3</div>
  </div>

  <div class="body">
    <main class="board-area">
      <div class="board-caption">FILL EVERY CELL · 1–9, NO REPEATS</div>

      <div class="board-panel">
        <div class="board-row">
          <div class="board-wrap">
            <Board />
            {#if game.status === 'idle'}
              <div class="start-overlay">
                <button class="start-btn" onclick={() => game.start()}>▶ Start Puzzle</button>
                <div class="start-caption">populates locked cells</div>
              </div>
            {/if}
          </div>
          {#if game.status !== 'idle'}
            <NumberPad />
          {/if}
        </div>

        <div class="board-footer">
          <span class="filled-counter" class:active={game.status !== 'idle'}>
            {game.filledCount} / {game.editableCount} filled{game.status === 'complete' ? ' ✓' : ''}
          </span>
          <button
            class="reset-btn"
            class:complete={game.status === 'complete'}
            onclick={() => game.reset()}
          >
            ↺ Reset Board
          </button>
        </div>
      </div>
    </main>

    <aside class="sidebar">
      <Sidebar />
    </aside>
  </div>
</div>

<style>
  .topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulsedot 1.6s ease-in-out infinite;
  }

  .wordmark {
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: var(--text);
  }

  .wordmark .accent {
    color: var(--accent);
  }

  .version {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--dim);
  }

  .topbar-right {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--dim);
  }

  .board-caption {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    letter-spacing: 1.5px;
    color: var(--dim);
  }

  .board-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .board-row {
    display: flex;
    align-items: flex-start;
    gap: 22px;
  }

  .board-wrap {
    position: relative;
  }

  .start-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: rgba(9, 12, 16, 0.62);
    backdrop-filter: blur(2px);
    border-radius: 14px;
  }

  .start-btn {
    padding: 15px 34px;
    background: var(--accent);
    color: var(--accent-on-dark);
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 600;
    font-size: 16px;
    letter-spacing: 0.5px;
    border: none;
    border-radius: 9px;
    box-shadow: 0 0 30px rgba(94, 234, 212, 0.4);
    cursor: pointer;
  }

  .start-caption {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 12px;
    color: var(--muted);
  }

  .board-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .filled-counter {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--dimmer-2);
  }

  .filled-counter.active {
    color: var(--accent);
  }

  .reset-btn {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    background: transparent;
    border: 1px solid #2a323e;
    border-radius: 6px;
    padding: 9px 15px;
    cursor: pointer;
  }

  .reset-btn.complete {
    background: var(--accent);
    color: var(--accent-on-dark);
    border: none;
    font-weight: 600;
  }
</style>
