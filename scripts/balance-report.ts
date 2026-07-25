// scripts/balance-report.ts — pacing/strategy/rate report. Run: npm run balance
import { PROFILES, STRATEGIES, runLadder, rateTable } from '../src/lib/game/simulate';
import { formatClock } from '../src/lib/game/meter';

const fmt = (sec: number) => formatClock(sec * 1000);

for (const profile of PROFILES) {
  console.log(`\n=== ${profile.id} (${profile.secPerBlank} s/blank, +${profile.overheadSec} s overhead) ===`);
  const ladder = runLadder(profile);

  console.log('\nPacing (chained winners):');
  console.log('gate'.padEnd(18) + 'cost'.padStart(6) + 'solves'.padStart(8) + 'section'.padStart(9) + 'total'.padStart(9));
  for (const s of ladder) {
    const w = s.results[s.winner];
    console.log(
      s.gate.padEnd(18) + String(s.cost).padStart(6) + String(w.solves).padStart(8) +
      fmt(w.wallClockSec).padStart(9) + fmt(s.cumulativeSec).padStart(9),
    );
  }

  console.log('\nStrategy map (section wall-clock, * = winner):');
  console.log('gate'.padEnd(18) + STRATEGIES.map((id) => id.padStart(13)).join(''));
  for (const s of ladder) {
    const cells = STRATEGIES.map((id) =>
      (fmt(s.results[id].wallClockSec) + (id === s.winner ? '*' : ' ')).padStart(13),
    );
    console.log(s.gate.padEnd(18) + cells.join(''));
  }

  console.log('\nRate table (points/min, speed bonus owned):');
  for (const r of rateTable(profile)) {
    console.log(`${r.boardId}:${r.tierId}`.padEnd(18) + r.pointsPerMin.toFixed(1).padStart(8));
  }
}
