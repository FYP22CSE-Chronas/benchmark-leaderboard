import { markerPath, isStrokeMarker } from '../lib/modelStyles.js';

/** Miniature line-plus-marker preview used in legends and tooltips. */
export default function SeriesGlyph({ style, width = 24, muted = false }) {
  const h = 12;
  const cy = h / 2;
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden="true" style={{ flex: 'none' }}>
      <line
        x1="0"
        y1={cy}
        x2={width}
        y2={cy}
        stroke={muted ? '#3a3a3a' : style.shade}
        strokeWidth={style.width}
      />
      <path
        d={markerPath(style.marker, width / 2, cy, 3)}
        fill={isStrokeMarker(style.marker) ? 'none' : muted ? '#3a3a3a' : style.shade}
        stroke={muted ? '#3a3a3a' : style.shade}
        strokeWidth={1.3}
      />
    </svg>
  );
}
