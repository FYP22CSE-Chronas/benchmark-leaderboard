import { Crown, Medal, Minus } from 'lucide-react';
import { formatScore } from '../lib/scoring.js';

const POS_ICON = { 1: Crown, 2: Medal, 3: Medal };

export default function Leaderboard({ entries, styleMap }) {
  // Bars are drawn against the worst mean in the field, so the leader's bar is
  // the shortest — same "lower is better" reading as the numbers themselves.
  const maxAvg = Math.max(...entries.map((e) => e.avgSCRPS ?? 0));

  return (
    <>
      <p className="prose">
        Models are ranked by their mean sCRPS across the {entries[0].datasetCount} datasets — the
        plain average of the numbers in the benchmark table, lower first. Ties go to the model with
        more dataset wins.
      </p>

      <div className="lb">
        <div className="lb__row lb__row--head">
          <div>#</div>
          <div>Model</div>
          <div style={{ textAlign: 'right' }}>Mean sCRPS</div>
          <div>Relative to worst</div>
          <div style={{ textAlign: 'right' }}>Wins</div>
          <div style={{ textAlign: 'right' }}>Coverage</div>
        </div>

        {entries.map((entry) => {
          const Icon = POS_ICON[entry.rank] || Minus;
          const shade = styleMap.get(entry.model).shade;
          return (
            <div className="lb__row" key={entry.model} data-lead={entry.rank === 1}>
              <div className="lb__pos">
                <Icon size={13} strokeWidth={1.7} opacity={entry.rank <= 3 ? 1 : 0.35} />
                {entry.rank}
              </div>

              <div className="lb__model">
                <span className="swatch swatch--series" style={{ background: shade }} />
                <span>{entry.model}</span>
              </div>

              <div className="lb__pts">{formatScore(entry.avgSCRPS)}</div>

              <div className="lb__bar" title={`Mean sCRPS ${formatScore(entry.avgSCRPS)}`}>
                <div
                  className="lb__seg"
                  style={{
                    width: maxAvg ? `${((entry.avgSCRPS ?? 0) / maxAvg) * 100}%` : 0,
                    background: shade,
                  }}
                />
              </div>

              <div className="lb__num">
                {entry.wins} <span style={{ color: 'var(--ink-3)' }}>/ {entry.datasetCount}</span>
              </div>
              <div className="lb__num">
                {entry.covered} <span style={{ color: 'var(--ink-3)' }}>/ {entry.datasetCount}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="legendkeys">
        <span className="legendkey" style={{ color: 'var(--ink-3)' }}>
          Bar length = mean sCRPS relative to the worst model · shorter is better
        </span>
        <span className="legendkey" style={{ color: 'var(--ink-3)' }}>
          Coverage below {entries[0].datasetCount}/{entries[0].datasetCount} means the mean is taken
          over fewer datasets
        </span>
      </div>
    </>
  );
}
