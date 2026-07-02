<script lang="ts">
  import { game } from './lib/game/state.svelte';
  import Board from './lib/components/Board.svelte';
  import NumberPad from './lib/components/NumberPad.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import UnlocksView from './lib/components/UnlocksView.svelte';
  import SettingsView from './lib/components/SettingsView.svelte';
  import SpeedMeter from './lib/components/SpeedMeter.svelte';

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
    <div class="header-center">
      <div class="points-box">
        <span class="points-box-label">POINTS</span>
        <span class="points-box-value">{game.pointokus}</span>
      </div>
      <button
        class="prestige-btn"
        class:active={game.pendingPoints > 0}
        onclick={() => game.resetAll()}
      >
        <span class="prestige-text">
          <span class="prestige-label">↺ RESET ALL BOARDS</span>
          <span class="prestige-sub">Prestige — wipes every board</span>
        </span>
        <span class="prestige-divider"></span>
        <span class="prestige-gain">
          <span class="prestige-gain-value">+{game.pendingPoints}</span>
          <span class="prestige-gain-label">POINTS</span>
        </span>
      </button>
    </div>
  </div>

  <nav class="tabs">
    <button class="tab" class:active={game.activeView === 'board'} onclick={() => game.setView('board')}>Board</button>
    <button class="tab" class:active={game.activeView === 'unlocks'} onclick={() => game.setView('unlocks')}>
      Unlocks
      {#if game.nextUnlock && game.pointokus >= game.nextUnlock.cost}<span class="afford-dot"></span>{/if}
    </button>
    <button class="tab" class:active={game.activeView === 'settings'} onclick={() => game.setView('settings')}>Settings</button>
  </nav>

  <div class="body">
    {#if game.activeView === 'board'}
      <main class="board-area">
        <div class="board-caption">FILL EVERY CELL · 1–9, NO REPEATS</div>

        <div class="board-panel">
          {#if game.speedBonusOwned && game.status !== 'idle'}
            <div class="meter-slot"><SpeedMeter /></div>
          {/if}
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

          {#if game.status === 'complete' && game.lastResult}
            <div class="completion">
              <span class="completion-points">+{game.lastResult.points} P</span>
              <span class="completion-time">{(game.lastResult.timeMs / 1000).toFixed(1)}s</span>
              {#if game.lastResult.speedApplied}<span class="completion-speed">SPEED ×{game.lastResult.bracketMult}</span>{/if}
            </div>
          {/if}

          <div class="board-footer">
            <span class="filled-counter" class:active={game.status !== 'idle'}>
              {game.filledCount} / {game.editableCount} filled{game.status === 'complete' ? ' ✓' : ''}
            </span>
          </div>
        </div>
      </main>

      <aside class="sidebar">
        <Sidebar />
      </aside>
    {:else if game.activeView === 'unlocks'}
      <UnlocksView />
    {:else}
      <SettingsView />
    {/if}
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

  .header-center {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .points-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    background: var(--panel-2);
    border: 1px solid var(--border-2);
    border-radius: 12px;
    padding: 8px 24px;
  }

  .points-box-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    letter-spacing: 3px;
    color: var(--muted-2);
  }

  .points-box-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 27px;
    font-weight: 600;
    color: var(--points);
    line-height: 1;
  }

  .prestige-btn {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--accent-fill);
    border: 1px solid #2f6b5a;
    border-radius: 12px;
    padding: 9px 18px;
    cursor: pointer;
  }

  .prestige-btn.active {
    box-shadow: 0 0 24px rgba(94, 234, 212, 0.14);
  }

  .prestige-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .prestige-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    letter-spacing: 2.5px;
    color: var(--accent);
  }

  .prestige-sub {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 11px;
    color: var(--muted-2);
  }

  .prestige-divider {
    width: 1px;
    height: 34px;
    background: var(--accent-border);
  }

  .prestige-gain {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }

  .prestige-gain-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 24px;
    font-weight: 700;
    color: var(--accent);
    line-height: 1;
  }

  .prestige-gain-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    letter-spacing: 2px;
    color: #3f6b60;
  }

  .tabs {
    display: flex;
    gap: 4px;
    padding: 0 22px;
    border-bottom: 1px solid var(--border);
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 16px;
    margin-bottom: -1px;
    border: 0;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--dim);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
  }

  .tab.active {
    border-bottom-color: var(--accent);
    color: var(--text);
    font-weight: 600;
  }

  .afford-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px rgba(94, 234, 212, 0.7);
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

  .meter-slot {
    width: 390px;
    align-self: flex-start;
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

  .completion {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
  }

  .completion-points {
    color: var(--accent);
    font-weight: 600;
  }

  .completion-time {
    color: var(--dim);
  }

  .completion-speed {
    color: var(--accent);
    background: var(--accent-fill);
    border: 1px solid var(--accent-border);
    border-radius: 5px;
    padding: 2px 8px;
    font-size: 11px;
    letter-spacing: 0.5px;
  }

  .board-footer {
    display: flex;
    justify-content: center;
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

</style>
