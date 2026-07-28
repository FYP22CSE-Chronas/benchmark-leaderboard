import { Crown, Medal, Minus } from 'lucide-react';
import { WEIGHT_META, formatPoints } from '../lib/scoring.js';

const POS_ICON = { 1: Crown, 2: Medal, 3: Medal };

export default function Leaderboard({ entries, styleMap }) {
  return (
    <>
      <div className="formula">
        {WEIGHT_META.map((w) => (
          <div className="formula__cell" key={w.key}>
            <div className="formula__w">
              <b>{w.weight}</b>
              <span>pts · {w.label}</span>
            </div>
            <p>{w.blurb}</p>
          </div>
        ))}
      </div>

      <div className="lb" style={{ marginTop: 20 }}>
        <div className="lb__row lb__row--head">
          <div>#</div>
          <div>Model</div>
          <div style={{ textAlign: 'right' }}>Points</div>
          <div>Score composition</div>
          <div style={{ textAlign: 'right' }}>Wins</div>
          <div style={{ textAlign: 'right' }}>Coverage</div>
          <div style={{ textAlign: 'right' }}>Avg sCRPS</div>
        </div>

        {entries.map((entry) => {
          const Icon = POS_ICON[entry.rank] || Minus;
          return (
            <div className="lb__row" key={entry.model} data-lead={entry.rank === 1}>
              <div className="lb__pos">
                <Icon size={13} strokeWidth={1.7} opacity={entry.rank <= 3 ? 1 : 0.35} />
                {entry.rank}
              </div>

              <div className="lb__model">
                <span
                  className="swatch swatch--series"
                  style={{ background: styleMap.get(entry.model).shade }}
                />
                <span>{entry.model}</span>
              </div>

              <div className="lb__pts">{formatPoints(entry.points)}</div>

              <div
                className="lb__bar"
                title={WEIGHT_META.map(
                  (w) => `${w.label} ${entry.contrib[w.key].toFixed(1)}/${w.weight}`,
                ).join('  ·  ')}
              >
                {WEIGHT_META.map((w) => (
                  <div
                    key={w.key}
                    className="lb__seg"
                    data-k={w.key}
                    style={{ width: `${entry.contrib[w.key]}%` }}
                  />
                ))}
              </div>

              <div className="lb__num">
                {entry.wins} <span style={{ color: 'var(--ink-3)' }}>/ {entry.datasetCount}</span>
              </div>
              <div className="lb__num">
                {entry.covered} <span style={{ color: 'var(--ink-3)' }}>/ {entry.datasetCount}</span>
              </div>
              <div className="lb__num">{entry.avgSCRPS === null ? '—' : entry.avgSCRPS.toFixed(4)}</div>
            </div>
          );
        })}
      </div>

      <div className="legendkeys">
        {WEIGHT_META.map((w) => (
          <span className="legendkey" key={w.key}>
            <span
              className="swatch"
              style={{
                background: { skill: '#ffffff', rank: '#a8a8a8', levels: '#666666', coverage: '#303030' }[w.key],
              }}
            />
            {w.label} · max {w.weight}
          </span>
        ))}
        <span className="legendkey" style={{ color: 'var(--ink-3)' }}>
          Bar length = total points out of 100
        </span>
      </div>
    </>
  );
}
