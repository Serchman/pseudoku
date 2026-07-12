<script lang="ts">
  let {
    pending,
    breakdown,
    onconfirm,
    oncancel,
  }: {
    pending: number;
    breakdown: { id: string; name: string; points: number }[];
    onconfirm: () => void;
    oncancel: () => void;
  } = $props();
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') oncancel();
  }}
/>

<div class="scrim" onclick={oncancel}>
  <div class="card" onclick={(e) => e.stopPropagation()}>
    <div class="header">
      <span class="header-icon">↺</span>
      <span class="header-title">CONFIRM PRESTIGE</span>
      <button class="close" onclick={oncancel}>✕</button>
    </div>

    <div class="divider"></div>

    <div class="body">
      <div class="description">
        Wipes every board and restarts the run. You keep the points below.
      </div>

      <div class="breakdown">
        {#if breakdown.length === 0}
          <div class="empty-row">No boards solved this run.</div>
        {:else}
          {#each breakdown as board (board.id)}
            <div class="breakdown-row">
              <span class="board-name">{board.name}</span>
              <span class="board-points">+{board.points}</span>
            </div>
          {/each}
        {/if}
      </div>

      <div class="divider"></div>

      <div class="total-row">
        <span class="total-label">TOTAL GAIN</span>
        <span class="total-value">+{pending}</span>
      </div>

      <div class="actions">
        <button class="cancel-btn" onclick={oncancel}>CANCEL</button>
        <button class="confirm-btn" onclick={onconfirm}>↺ CONFIRM RESET</button>
      </div>
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(5, 7, 10, 0.72);
    backdrop-filter: blur(2px);
    animation: fadein 0.16s ease-out;
  }

  .card {
    width: 432px;
    background: radial-gradient(120% 90% at 30% 0%, #10161d 0%, #0b0e13 65%);
    border: 1px solid #274b42;
    border-radius: 16px;
    box-shadow:
      0 30px 80px rgba(0, 0, 0, 0.6),
      0 0 40px rgba(94, 234, 212, 0.08);
    overflow: hidden;
    animation: modalin 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 22px 14px;
  }

  .header-icon {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    color: var(--accent);
  }

  .header-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 1.5px;
    color: #cdd8e4;
  }

  .close {
    margin-left: auto;
    padding: 0;
    background: none;
    border: none;
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    color: var(--dimmer-2);
    cursor: pointer;
    line-height: 1;
  }

  .divider {
    height: 1px;
    background: #1a2530;
  }

  .body {
    padding: 18px 22px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .description {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 12px;
    color: var(--muted-2);
    line-height: 1.5;
  }

  .breakdown {
    display: flex;
    flex-direction: column;
    gap: 9px;
    font-family: 'JetBrains Mono', monospace;
  }

  .breakdown-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .board-name {
    font-size: 12px;
    color: #8a97a6;
  }

  .board-points {
    font-size: 13px;
    color: #c7d2df;
  }

  .empty-row {
    font-size: 12px;
    color: var(--muted-2);
  }

  .total-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .total-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 2px;
    color: var(--muted-2);
  }

  .total-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 28px;
    font-weight: 700;
    color: var(--accent);
    line-height: 1;
    text-shadow: 0 0 16px rgba(94, 234, 212, 0.45);
  }

  .actions {
    display: flex;
    gap: 10px;
    margin-top: 2px;
  }

  .cancel-btn {
    flex: 1;
    padding: 11px 0;
    background: #0e1116;
    border: 1px solid #26303c;
    border-radius: 10px;
    color: #9aa7b6;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    letter-spacing: 1px;
    cursor: pointer;
  }

  .confirm-btn {
    flex: 1.4;
    padding: 11px 0;
    background: var(--accent-fill);
    border: 1px solid #3a8770;
    border-radius: 10px;
    color: var(--accent);
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    letter-spacing: 1px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(94, 234, 212, 0.18);
  }

  @keyframes modalin {
    0% {
      opacity: 0;
      transform: translateY(6px) scale(0.985);
    }
    100% {
      opacity: 1;
      transform: none;
    }
  }

  @keyframes fadein {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .scrim,
    .card {
      animation: none;
    }
  }
</style>
