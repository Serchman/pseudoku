<script lang="ts">
  import { game } from './lib/game/state.svelte';
  import Board from './lib/components/Board.svelte';
  import NumberPad from './lib/components/NumberPad.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import BoardsSheet from './lib/components/BoardsSheet.svelte';
  import UnlocksView from './lib/components/UnlocksView.svelte';
  import SettingsView from './lib/components/SettingsView.svelte';
  import StatisticsView from './lib/components/StatisticsView.svelte';
  import SpeedMeter from './lib/components/SpeedMeter.svelte';
  import PrestigeModal from './lib/components/PrestigeModal.svelte';
  import KeypadPicker from './lib/components/KeypadPicker.svelte';

  let showPrestige = $state(false);
  let picker: KeypadPicker | undefined = $state();

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
    <div class="topbar-center">
      <div class="points-box">
        <span class="points-box-label">POINTS</span>
        <span class="points-box-value">{game.pointokus}</span>
      </div>
      <button
        class="prestige-btn"
        class:active={game.pendingPoints > 0}
        onclick={() => (showPrestige = true)}
      >
        <span class="prestige-text">
          <span class="prestige-label">↺ PRESTIGE</span>
        </span>
        {#if game.pendingPoints > 0}
          <span class="prestige-divider"></span>
          <span class="prestige-gain">
            <span class="prestige-gain-value">+{game.pendingPoints}</span>
            <span class="prestige-gain-label">POINTS</span>
          </span>
        {/if}
      </button>
    </div>
  </div>

  <nav class="tabs">
    <button class="tab" class:active={game.activeView === 'board'} onclick={() => game.setView('board')}>Board</button>
    <button class="tab" class:active={game.activeView === 'unlocks'} onclick={() => game.setView('unlocks')}>
      Unlocks
      {#if game.nextUnlock && game.pointokus >= game.nextUnlock.cost}<span class="afford-dot"></span>{/if}
    </button>
    <button class="tab" class:active={game.activeView === 'statistics'} onclick={() => game.setView('statistics')}>Statistics</button>
    <button class="tab" class:active={game.activeView === 'settings'} onclick={() => game.setView('settings')}>Settings</button>
  </nav>

  <div class="body">
    {#if game.activeView === 'board'}
      <main class="board-area">
        <div class="board-caption">{game.activeBoard.caption}</div>

        <div class="board-panel">
          <div class="board-col">
            {#if game.speedBonusOwned}
              {#key game.activeBoard}
                <div class="meter-slot" class:reserved={game.status === 'idle'}><SpeedMeter /></div>
              {/key}
            {/if}
            <div class="board-wrap">
              <Board onCellPress={(i, e) => picker?.begin(i, e)} />
              {#if game.status === 'idle'}
                <div class="start-overlay">
                  <button class="start-btn" onclick={() => game.start()}>▶ Start Puzzle</button>
                  <div class="start-caption">populates locked cells</div>
                </div>
              {/if}
            </div>
            <!-- Kept mounted (hidden) when idle so the board holds its playing
                 position — pressing Start reveals the pad without reflowing the grid. -->
            <div class="pad-slot" class:reserved={game.status === 'idle'}>
              <NumberPad />
            </div>
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

      <BoardsSheet />
    {:else if game.activeView === 'unlocks'}
      <UnlocksView />
    {:else if game.activeView === 'statistics'}
      <StatisticsView />
    {:else}
      <SettingsView />
    {/if}
  </div>

  {#if showPrestige}
    <PrestigeModal
      pending={game.pendingPoints}
      breakdown={game.prestigeBreakdown}
      multiplier={game.recordMultiplier}
      total={game.bankPreview}
      onconfirm={() => { game.resetAll(); showPrestige = false; }}
      oncancel={() => (showPrestige = false)}
    />
  {/if}

  <KeypadPicker bind:this={picker} />
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

  .topbar-center {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .points-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    background: var(--panel-2);
    border: 1px solid var(--border-2);
    border-radius: 12px;
    padding: 9px 30px;
  }

  .points-box-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 3.5px;
    color: var(--muted-2);
  }

  .points-box-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 40px;
    font-weight: 700;
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
    justify-content: center;
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

  .board-col {
    display: grid;
    justify-items: center;
    gap: 16px;
  }

  .meter-slot,
  .pad-slot {
    width: 100%;
  }

  /* Reserve layout space while hidden so the board doesn't shift on Start. */
  .reserved {
    visibility: hidden;
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

  @media (max-width: 640px) {
    /* Phase 2 — compact top bar. Drop the wordmark block; spread the POINTS
       chip and PRESTIGE button across the full width. */
    .topbar-left { display: none; }
    .topbar-center { width: 100%; justify-content: space-between; gap: 10px; }

    .points-box {
      flex-direction: row;
      gap: 9px;
      padding: 8px 13px;
    }
    .points-box-label { font-size: 8px; letter-spacing: 2.5px; }
    .points-box-value { font-size: 18px; }

    .prestige-btn { gap: 8px; padding: 8px 12px; }
    .prestige-label { font-size: 10.5px; letter-spacing: 1.5px; }
    .prestige-divider { height: 18px; }
    .prestige-gain-value {
      font-size: 15px;
      text-shadow: 0 0 10px rgba(94, 234, 212, 0.4);
    }
    .prestige-gain-label { display: none; }

    /* Phase 3 — segmented tab strip. Restyle the desktop underline tabs into a
       pill/segmented control; behavior (game.setView) is unchanged. */
    .tabs {
      gap: 4px;
      margin: 4px 12px 0;
      padding: 4px;
      background: var(--panel);
      border: 1px solid var(--border-5);
      border-radius: 11px;
    }
    .tab {
      flex: 1;
      justify-content: center;
      height: 34px;
      padding: 0;
      margin-bottom: 0;
      border: 0;
      border-radius: 8px;
      font-size: 13px;
    }
    .tab.active {
      background: var(--accent-fill);
      border: 1px solid var(--accent-border);
      color: var(--accent);
    }

    .board-panel { flex: 1; width: 100%; }
    /* With the NumberPad gone, the column holds only the board (+ optional speed
       meter). space-between top-pinned that lone row and left dead space below;
       center it in the reclaimed vertical space instead. justify-content centers
       the collapsed track on the inline axis (justify-items only centers content
       within the track, not the track itself). */
    .board-col { flex: 1; width: 100%; align-content: center; justify-content: center; }

    /* Phase 5 — number entry moves to a later input phase; the docked pad is
       removed on mobile to free the bottom zone for the drawer. */
    .pad-slot { display: none; }
  }

</style>
