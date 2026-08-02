import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Database, Maximize2, Minimize2 } from 'lucide-react';
import { bestInRow, worstInRow, intensity, isNumber } from '../lib/scoring.js';

const MODES = [
  { key: 'value', label: 'sCRPS' },
  { key: 'rank', label: 'Rank' },
  { key: 'delta', label: 'Δ vs best' },
];

export default function BenchmarkTable({ data, rankMap, styleMap }) {
  const models = data.overallModels;
  const [mode, setMode] = useState('value');
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [maximized, setMaximized] = useState(false);

  // Escape leaves the maximized view, and the page behind it must not scroll.
  useEffect(() => {
    if (!maximized) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMaximized(false);
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [maximized]);

  const rows = useMemo(() => {
    const stats = data.overall.map((row) => ({
      row,
      best: bestInRow(row, models),
      worst: worstInRow(row, models),
    }));
    if (!sort.key) return stats;
    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...stats].sort((a, b) => {
      const av = a.row[sort.key];
      const bv = b.row[sort.key];
      if (!isNumber(av)) return 1;
      if (!isNumber(bv)) return -1;
      return (av - bv) * sign;
    });
  }, [data.overall, models, sort]);

  const winCounts = useMemo(() => {
    const counts = new Map(models.map((m) => [m, 0]));
    for (const row of data.overall) {
      const best = bestInRow(row, models);
      for (const m of models) if (row[m] === best) counts.set(m, counts.get(m) + 1);
    }
    return counts;
  }, [data.overall, models]);

  const toggleSort = (key) =>
    setSort((prev) =>
      prev.key !== key ? { key, dir: 'asc' } : prev.dir === 'asc' ? { key, dir: 'desc' } : { key: null, dir: 'asc' },
    );

  const renderCell = (row, model, best) => {
    const value = row[model];
    if (!isNumber(value)) return '—';
    if (mode === 'rank') return rankMap.get(row.dataset).get(model);
    if (mode === 'delta') {
      const pct = ((value - best) / best) * 100;
      return pct < 0.05 ? 'best' : `+${pct.toFixed(0)}%`;
    }
    return value.toFixed(4);
  };

  return (
    <div className="tableview" data-max={maximized}>
      <div className="toolbar tableview__bar">
        <div className="segmented">
          {MODES.map((m) => (
            <button key={m.key} data-active={mode === m.key} onClick={() => setMode(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
        <button
          className="iconbtn"
          onClick={() => setMaximized((v) => !v)}
          title={maximized ? 'Exit full screen (Esc)' : 'Maximize table'}
        >
          {maximized ? (
            <Minimize2 size={13} strokeWidth={1.8} />
          ) : (
            <Maximize2 size={13} strokeWidth={1.8} />
          )}
          {maximized ? 'Close' : 'Maximize'}
        </button>
      </div>

      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th className="lead">Dataset</th>
              {models.map((model) => {
                const active = sort.key === model;
                const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
                const shade = styleMap.get(model).shade;
                return (
                  <th
                    key={model}
                    className="sortable"
                    onClick={() => toggleSort(model)}
                    title={`Sort datasets by ${model}`}
                    style={{ borderBottom: `2px solid ${shade}` }}
                  >
                    <span className="th-sort">
                      <span className="swatch swatch--series" style={{ background: shade }} />
                      {model}
                      <Icon size={11} strokeWidth={1.8} opacity={active ? 1 : 0.45} />
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row, best, worst }) => (
              <tr key={row.dataset}>
                <td className="lead">
                  <span className="dsname">
                    <Database size={12} strokeWidth={1.7} opacity={0.55} />
                    {row.dataset}
                  </span>
                </td>
                {models.map((model) => {
                  const value = row[model];
                  const ok = isNumber(value);
                  const isBest = ok && value === best;
                  const shade = styleMap.get(model).shade;
                  return (
                    <td
                      key={model}
                      className={`cell-num ${isBest ? 'cell-best' : ''} ${ok ? '' : 'cell-na'}`}
                      style={isBest ? { boxShadow: `inset 3px 0 0 ${shade}` } : undefined}
                    >
                      {ok && (
                        <span
                          className="bar"
                          style={
                            isBest
                              ? { background: shade, opacity: 0.22 }
                              : { opacity: 0.03 + intensity(value, best, worst) * 0.16 }
                          }
                        />
                      )}
                      {renderCell(row, model, best)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="lead" style={{ color: 'var(--ink-3)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Dataset wins
              </td>
              {models.map((model) => {
                const n = winCounts.get(model);
                const shade = styleMap.get(model).shade;
                return (
                  <td
                    key={model}
                    className={n ? 'cell-best' : 'cell-na'}
                    style={{
                      borderTop: '1px solid var(--line-strong)',
                      boxShadow: n ? `inset 3px 0 0 ${shade}` : undefined,
                    }}
                  >
                    {n} / {data.overall.length}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
