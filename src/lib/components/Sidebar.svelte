<script lang="ts"></script>

<div class="sidebar-panel">
  <div class="unlocks">
    <div class="unlocks-head">
      <span>BOARD UPGRADES</span>
    </div>
    <div class="unlocks-sub">Boosts that apply to this board only.</div>
    <div class="unlocks-list">
      <div class="unlock-row affordable">
        <div>
          <div class="unlock-title">Auto-fill hint</div>
          <div class="unlock-sub">Reveals one cell</div>
        </div>
        <span class="unlock-badge affordable">120 P</span>
      </div>
      <div class="unlock-row locked">
        <div>
          <div class="unlock-title locked">Larger board</div>
          <div class="unlock-sub">Unlock 4×4 grid</div>
        </div>
        <span class="unlock-badge locked">🔒 500</span>
      </div>
      <div class="unlock-row">
        <div>
          <div class="unlock-title">Point multiplier</div>
          <div class="unlock-sub">×1.5 per solve</div>
        </div>
        <span class="unlock-owned">✓ OWNED</span>
      </div>
    </div>
  </div>

  <div class="key-hint">
    <div>› click cell, type <span class="key">1–9</span></div>
    <div>› <span class="key">⌫</span> clears · <span class="key">↹</span> next cell</div>
  </div>
</div>

<style>
  .sidebar-panel {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .unlocks-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 2px;
    color: var(--muted-2);
  }

  .unlocks-sub {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 11px;
    color: var(--muted-2);
    margin-top: 4px;
    margin-bottom: 10px;
  }

  .unlocks-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .unlock-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--panel-3);
    border: 1px solid #181e27;
    border-radius: 8px;
    padding: 11px 12px;
  }

  .unlock-row.affordable {
    border-color: var(--accent-border-2);
  }

  .unlock-row.locked {
    background: #0b0e12;
    opacity: 0.55;
  }

  .unlock-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
  }

  .unlock-title.locked {
    color: #aab6c4;
  }

  .unlock-sub {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 11px;
    color: var(--muted-2);
    margin-top: 1px;
  }

  .unlock-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    border-radius: 5px;
    padding: 4px 8px;
  }

  .unlock-badge.affordable {
    color: var(--accent);
    background: var(--accent-fill);
    border: 1px solid var(--accent-border);
  }

  .unlock-badge.locked {
    color: #7a8696;
    background: #10141a;
    border: 1px solid var(--border-4);
  }

  .unlock-owned {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--accent);
    letter-spacing: 0.5px;
  }

  .key-hint {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--dim);
    background: #0a0d12;
    border: 1px dashed var(--border-4);
    border-radius: 7px;
    padding: 10px 12px;
    line-height: 1.5;
  }

  .key {
    color: #cdd8e4;
  }
</style>
