import { useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import { markerPath, isStrokeMarker, CHART_SURFACE } from '../lib/modelStyles.js';
import SeriesGlyph from './SeriesGlyph.jsx';
import { isNumber } from '../lib/scoring.js';
import { useUnit } from '../lib/units.jsx';

const W = 660;
const H = 340;
const PAD = { top: 16, right: 16, bottom: 46, left: 58 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/** Human-friendly tick steps: 1, 2, 2.5, 5 x 10^n. */
function linearTicks(min, max, target = 5) {
  if (!(max > min)) return [min];
  const raw = (max - min) / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) * mag;
  const ticks = [];
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-9; t += step) {
    ticks.push(Number(t.toFixed(10)));
  }
  return ticks;
}

function logTicks(min, max) {
  const lo = Math.floor(Math.log10(min));
  const hi = Math.ceil(Math.log10(max));
  const ticks = [];
  for (let e = lo; e <= hi; e += 1) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e;
      if (v >= min * 0.999 && v <= max * 1.001) ticks.push(v);
    }
  }
  return ticks.length >= 2 ? ticks : [min, max];
}

export default function LevelChart({ dataset, rows, models, styleMap, scale }) {
  const unit = useUnit();
  const [hidden, setHidden] = useState(() => new Set());
  const [hover, setHover] = useState(null);

  // Models with at least one reported value on this dataset.
  const present = useMemo(
    () => models.filter((m) => rows.some((r) => isNumber(r[m]))),
    [models, rows],
  );
  const visible = present.filter((m) => !hidden.has(m));

  const { xOf, yOf, ticks, domain } = useMemo(() => {
    const values = rows.flatMap((r) => visible.map((m) => r[m])).filter(isNumber);
    const log = scale === 'log' && values.every((v) => v > 0);

    let lo = values.length ? Math.min(...values) : 0;
    let hi = values.length ? Math.max(...values) : 1;
    if (lo === hi) {
      // Single distinct value (or every series hidden): open a usable window.
      const span = Math.abs(lo) * 0.1 || 1;
      lo -= span;
      hi += span;
    }

    let tickList;
    if (log) {
      lo *= 0.8;
      hi *= 1.25;
      tickList = logTicks(lo, hi);
    } else {
      const pad = (hi - lo) * 0.08;
      lo = Math.max(0, lo - pad);
      hi += pad;
      tickList = linearTicks(lo, hi);
      if (tickList.length) {
        lo = Math.min(lo, tickList[0]);
        hi = Math.max(hi, tickList[tickList.length - 1]);
      }
    }

    const project = log
      ? (v) => (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))
      : (v) => (v - lo) / (hi - lo);

    const n = rows.length;
    return {
      domain: { lo, hi, log },
      ticks: tickList,
      xOf: (i) => PAD.left + (n === 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W),
      yOf: (v) => PAD.top + PLOT_H - project(v) * PLOT_H,
    };
  }, [rows, visible, scale]);

  const toggle = (model) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(model) ? next.delete(model) : next.add(model);
      return next;
    });

  const handleMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * W;
    const step = rows.length > 1 ? PLOT_W / (rows.length - 1) : PLOT_W;
    const idx = Math.max(0, Math.min(rows.length - 1, Math.round((px - PAD.left) / step)));
    setHover({ idx, x: event.clientX, y: event.clientY });
  };

  const hoverRows = hover
    ? visible
        .map((m) => ({ model: m, value: rows[hover.idx][m] }))
        .filter((d) => isNumber(d.value))
        .sort((a, b) => a.value - b.value)
    : [];

  return (
    <section className="card">
      <div className="card__head">
        <div className="card__title">
          <Layers size={14} strokeWidth={1.7} />
          {dataset}
        </div>
        <div className="card__sub">
          {rows.length} levels · {present.length} models
        </div>
      </div>

      <div className="card__body">
        <svg
          className="chart"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${unit.label} by hierarchy level for ${dataset}`}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* y grid + labels */}
          {ticks.map((t) => {
            const y = yOf(t);
            if (!Number.isFinite(y) || y < PAD.top - 1 || y > PAD.top + PLOT_H + 1) return null;
            return (
              <g key={t}>
                <line className="grid-line" x1={PAD.left} y1={y} x2={PAD.left + PLOT_W} y2={y} />
                <text x={PAD.left - 9} y={y + 3.2} textAnchor="end">
                  {unit.formatTick(t)}
                </text>
              </g>
            );
          })}

          {/* axes */}
          <line className="axis-line" x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PLOT_H} />
          <line
            className="axis-line"
            x1={PAD.left}
            y1={PAD.top + PLOT_H}
            x2={PAD.left + PLOT_W}
            y2={PAD.top + PLOT_H}
          />

          {/* x labels */}
          {rows.map((r, i) => (
            <text key={r.level} x={xOf(i)} y={PAD.top + PLOT_H + 17} textAnchor="middle">
              {r.level}
            </text>
          ))}

          <text
            className="axis-title"
            x={PAD.left + PLOT_W / 2}
            y={H - 8}
            textAnchor="middle"
          >
            Hierarchy level
          </text>
          <text
            className="axis-title"
            transform={`translate(13 ${PAD.top + PLOT_H / 2}) rotate(-90)`}
            textAnchor="middle"
          >
            {unit.label}{domain.log ? ' · log' : ''}
          </text>

          {/* hover crosshair */}
          {hover && (
            <line
              className="cursor-line"
              x1={xOf(hover.idx)}
              y1={PAD.top}
              x2={xOf(hover.idx)}
              y2={PAD.top + PLOT_H}
            />
          )}

          {/* series */}
          {visible.map((model) => {
            const style = styleMap.get(model);
            let d = '';
            let open = false;
            rows.forEach((r, i) => {
              const v = r[model];
              if (!isNumber(v)) {
                open = false;
                return;
              }
              d += `${open ? 'L' : 'M'}${xOf(i).toFixed(2)} ${yOf(v).toFixed(2)}`;
              open = true;
            });

            return (
              <g
                key={model}
                className="series"
                opacity={hover && hoverRows.length ? 0.92 : 1}
              >
                <path
                  d={d}
                  stroke={style.shade}
                  strokeWidth={style.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                {rows.map((r, i) => {
                  const v = r[model];
                  if (!isNumber(v)) return null;
                  const active = hover && hover.idx === i;
                  const r0 = active ? 5 : 4;
                  const stroked = isStrokeMarker(style.marker);
                  const d0 = markerPath(style.marker, xOf(i), yOf(v), r0);
                  return (
                    <g key={r.level}>
                      {/* Surface ring: keeps overlapping markers legible where lines cross. */}
                      <path
                        d={d0}
                        fill={stroked ? 'none' : CHART_SURFACE}
                        stroke={CHART_SURFACE}
                        strokeWidth={stroked ? 4.4 : 3.4}
                        strokeLinejoin="round"
                      />
                      <path
                        d={d0}
                        fill={stroked ? 'none' : style.shade}
                        stroke={style.shade}
                        strokeWidth={1.6}
                        strokeLinejoin="round"
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {hover && hoverRows.length > 0 && (
          <div
            className="tooltip"
            style={{
              left: Math.min(hover.x + 16, window.innerWidth - 230),
              top: Math.min(hover.y + 16, window.innerHeight - (hoverRows.length * 18 + 60)),
            }}
          >
            <div className="tooltip__head">
              <span>{dataset}</span>
              <span>{rows[hover.idx].level}</span>
            </div>
            {hoverRows.map((row, i) => (
              <div className="tooltip__row" key={row.model} data-best={i === 0}>
                <span className="tooltip__name">
                  <SeriesGlyph style={styleMap.get(row.model)} width={18} />
                  {row.model}
                </span>
                <span className="tooltip__val">{unit.format(row.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="serieslegend">
        {present.map((model) => {
          const on = !hidden.has(model);
          return (
            <button
              key={model}
              className="serieslegend__item"
              data-on={on}
              onClick={() => toggle(model)}
              title={on ? `Hide ${model}` : `Show ${model}`}
            >
              <SeriesGlyph style={styleMap.get(model)} muted={!on} />
              {model}
            </button>
          );
        })}
      </div>
    </section>
  );
}
