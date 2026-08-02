import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Database, Maximize2, Minimize2, Download, Image } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
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
  const tableRef = useRef(null);

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

  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      rows.map(({ row, best, worst }) => ({
        Dataset: row.dataset,
        ...Object.fromEntries(
          models.map((model) => [
            model,
            isNumber(row[model]) ? row[model].toFixed(4) : '—',
          ]),
        ),
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Benchmark');
    XLSX.writeFile(wb, 'hts-benchmark.xlsx');
  };

  // `.tablewrap` is the scroll container, so html2canvas would otherwise capture
  // only the part currently in view. Expand it to its full scroll size for the
  // duration of the shot, then put every touched style back.
  const downloadImage = async () => {
    const wrap = tableRef.current;
    if (!wrap) return;

    const saved = {
      overflow: wrap.style.overflow,
      width: wrap.style.width,
      maxWidth: wrap.style.maxWidth,
      height: wrap.style.height,
      maxHeight: wrap.style.maxHeight,
      flex: wrap.style.flex,
      scrollLeft: wrap.scrollLeft,
      scrollTop: wrap.scrollTop,
    };

    wrap.scrollLeft = 0;
    wrap.scrollTop = 0;
    wrap.style.overflow = 'visible';
    wrap.style.width = 'max-content';
    wrap.style.maxWidth = 'none';
    wrap.style.height = 'auto';
    wrap.style.maxHeight = 'none';
    wrap.style.flex = 'none';

    try {
      const canvas = await html2canvas(wrap, {
        scale: 2,
        backgroundColor: '#000000',
        width: wrap.scrollWidth,
        height: wrap.scrollHeight,
        windowWidth: Math.max(document.documentElement.clientWidth, wrap.scrollWidth + 64),
        onclone: (doc) => {
          // Sticky header/first column would be painted at their scroll offset
          // in the clone; pinning them back to the flow keeps the shot aligned.
          doc.querySelectorAll('.tablewrap thead th, .tablewrap .lead').forEach((el) => {
            el.style.position = 'static';
          });

          // html2canvas does not honour a <td> as the containing block for the
          // absolutely positioned `.bar` overlay, so each one bleeds down the
          // table and the stacked opacities blow out the lower rows. It also
          // drops inset box-shadows (the winner stripe). Bake both into the
          // cell's own background, which it renders exactly.
          const live = [...document.querySelectorAll('.tablewrap td')];
          [...doc.querySelectorAll('.tablewrap td')].forEach((td, i) => {
            const bar = td.querySelector('.bar');
            if (bar) {
              const style = getComputedStyle(live[i]?.querySelector('.bar') ?? bar);
              const rgb = (style.backgroundColor.match(/[\d.]+/g) ?? []).slice(0, 3);
              if (rgb.length === 3) {
                td.style.backgroundColor = `rgba(${rgb.join(', ')}, ${style.opacity})`;
              }
              bar.remove();
            }

            const shadow = td.style.boxShadow;
            if (shadow && shadow.includes('inset')) {
              const colour = /(#[0-9a-f]{3,8}|rgba?\([^)]+\))/i.exec(shadow)?.[1];
              if (colour) {
                td.style.boxShadow = 'none';
                td.style.backgroundImage = `linear-gradient(to right, ${colour} 0 3px, transparent 3px)`;
              }
            }
          });
        },
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'hts-benchmark-table.png';
      link.click();
    } finally {
      wrap.style.overflow = saved.overflow;
      wrap.style.width = saved.width;
      wrap.style.maxWidth = saved.maxWidth;
      wrap.style.height = saved.height;
      wrap.style.maxHeight = saved.maxHeight;
      wrap.style.flex = saved.flex;
      wrap.scrollLeft = saved.scrollLeft;
      wrap.scrollTop = saved.scrollTop;
    }
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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            className="iconbtn"
            onClick={downloadExcel}
            title="Download as Excel"
          >
            <Download size={13} strokeWidth={1.8} />
          </button>
          <button
            className="iconbtn"
            onClick={downloadImage}
            title="Download as image"
          >
            <Image size={13} strokeWidth={1.8} />
          </button>
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
          </button>
        </div>
      </div>

      <div className="tablewrap" ref={tableRef}>
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
