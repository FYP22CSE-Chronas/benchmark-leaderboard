import { Crown, Medal, Minus } from 'lucide-react';

const POS_ICON = { 1: Crown, 2: Medal, 3: Medal };

export default function Leaderboard({ entries, styleMap }) {
  const maxAvg = Math.max(...entries.map((e) => e.avgRank ?? 0));

  return (
    <>
      <p className="prose">
        Models are ranked by their average positional rank across the {entries[0].datasetCount}{' '}
        datasets.
      </p>

      <div className="lb">
        <div className="lb__row lb__row--head">
          <div>#</div>
          <div>Model</div>
          <div style={{ textAlign: 'right' }}>Avg Rank</div>
          <div>Consistency</div>
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

              <div className="lb__pts">{entry.avgRank.toFixed(2)}</div>

              <div className="lb__bar" title={`Average rank ${entry.avgRank.toFixed(2)}`}>
                <div
                  className="lb__seg"
                  style={{
                    width: maxAvg ? `${((entry.avgRank ?? 0) / maxAvg) * 100}%` : 0,
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
          Bar length = average rank relative to worst model · shorter is better
        </span>
        <span className="legendkey" style={{ color: 'var(--ink-3)' }}>
          Coverage below {entries[0].datasetCount}/{entries[0].datasetCount} means the model did not run on all
          datasets and was assigned last place on the missing ones
        </span>
      </div>
    </>
  );
}
