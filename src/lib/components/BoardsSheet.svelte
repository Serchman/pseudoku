<script lang="ts">
  import { game } from '../game/state.svelte';
  import Sidebar from './Sidebar.svelte';

  let open = $state(false);

  // Light up the collapsed-bar dot when anything in the drawer can be bought.
  const anyBuyable = $derived(
    game.boards.some((b) => b.buyable) || game.tiers.some((t) => t.buyable)
  );

  function close() {
    open = false;
  }
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && open) close(); }} />

<div class="sheet-root">
  {#if open}
    <button class="scrim" aria-label="Close boards and upgrades" onclick={close}></button>
  {/if}

  <div class="sheet" class:open>
    <button class="bar" aria-expanded={open} onclick={() => (open = !open)}>
      <span class="handle"></span>
      <span class="bar-row">
        <span class="bar-label">
          BOARDS &amp; UPGRADES
          {#if anyBuyable}<span class="afford-dot"></span>{/if}
        </span>
        <span class="chevron" class:open>⌃</span>
      </span>
    </button>

    <div class="sheet-body">
      <Sidebar />
    </div>
  </div>
</div>

<style>
  /* Mobile-only: hidden on desktop, shown at <=640px. */
  .sheet-root {
    display: none;
  }

  @media (max-width: 640px) {
    .sheet-root {
      display: block;
    }

    .scrim {
      position: fixed;
      inset: 0;
      z-index: 40;
      border: 0;
      padding: 0;
      background: rgba(5, 7, 10, 0.58);
      cursor: pointer;
    }

    .sheet {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
      background: var(--panel);
      border-top: 1px solid var(--border-5);
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -12px 34px rgba(0, 0, 0, 0.5);
      padding: 0 max(16px, env(safe-area-inset-right))
               max(16px, env(safe-area-inset-bottom))
               max(16px, env(safe-area-inset-left));
    }

    .sheet.open {
      border-top-color: var(--accent-border);
      box-shadow: 0 -20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(94, 234, 212, 0.06);
    }

    .bar {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 9px 0 12px;
      border: 0;
      background: transparent;
      cursor: pointer;
    }

    .handle {
      width: 38px;
      height: 4px;
      border-radius: 2px;
      background: var(--border-3);
      align-self: center;
    }

    .bar-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .bar-label {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      letter-spacing: 1.5px;
      color: var(--muted);
    }

    .afford-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 8px rgba(94, 234, 212, 0.7);
    }

    .chevron {
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      color: var(--accent);
      transition: transform 0.2s ease;
    }

    .chevron.open {
      transform: rotate(180deg);
    }

    .sheet-body {
      max-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      visibility: hidden;
      transition: max-height 0.25s ease;
    }

    .sheet.open .sheet-body {
      max-height: 70vh;
      padding-bottom: 6px;
      visibility: visible;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .chevron,
    .sheet-body {
      transition: none;
    }
  }
</style>
