/**
 * Categorical series encoding — the one place colour is spent.
 *
 * Eight fixed hues in a fixed order, assigned by the model's position in
 * `levelModels` and never cycled: colour follows the model, so hiding a series
 * never repaints the survivors. Steps are the dark-mode column of the reference
 * categorical palette, validated against this app's chart surface (#070707):
 * lightness band, chroma floor, CVD separation (worst adjacent pair ΔE 8.4 under
 * protanopia), normal-vision floor (19.3), and >= 3:1 contrast all pass.
 *
 * Marker shape is a redundant identity channel, so the series stay separable
 * for colourblind readers, in print, and under forced-colors.
 */

const SURFACE = '#070707';

const PALETTE = [
  { shade: '#3987e5', marker: 'circle' }, // blue
  { shade: '#d95926', marker: 'square' }, // orange
  { shade: '#199e70', marker: 'triangle' }, // aqua
  { shade: '#c98500', marker: 'diamond' }, // yellow
  { shade: '#d55181', marker: 'plus' }, // magenta
  { shade: '#008300', marker: 'cross' }, // green
  { shade: '#9085e9', marker: 'triangleDown' }, // violet
  { shade: '#e66767', marker: 'ring' }, // red
];

export const CHART_SURFACE = SURFACE;

/** @returns {Map<string, object>} model name -> style, assigned by declared order. */
export function buildStyleMap(models) {
  const map = new Map();
  models.forEach((model, i) => {
    // Past eight series the palette must not cycle — fold to "Other" instead.
    const slot = PALETTE[i] ?? PALETTE[PALETTE.length - 1];
    map.set(model, { ...slot, width: 2, id: `m${i}` });
  });
  return map;
}

/** SVG path for a marker of the given shape centred on (x, y). */
export function markerPath(shape, x, y, r = 3.4) {
  switch (shape) {
    case 'square':
      return `M${x - r} ${y - r}H${x + r}V${y + r}H${x - r}Z`;
    case 'triangle':
      return `M${x} ${y - r * 1.2}L${x + r * 1.15} ${y + r * 0.85}H${x - r * 1.15}Z`;
    case 'triangleDown':
      return `M${x} ${y + r * 1.2}L${x + r * 1.15} ${y - r * 0.85}H${x - r * 1.15}Z`;
    case 'diamond':
      return `M${x} ${y - r * 1.3}L${x + r * 1.1} ${y}L${x} ${y + r * 1.3}L${x - r * 1.1} ${y}Z`;
    case 'plus':
      return `M${x - r * 1.25} ${y}H${x + r * 1.25}M${x} ${y - r * 1.25}V${y + r * 1.25}`;
    case 'cross':
      return `M${x - r} ${y - r}L${x + r} ${y + r}M${x + r} ${y - r}L${x - r} ${y + r}`;
    case 'ring':
    case 'circle':
    default: {
      const c = r * 0.552;
      return (
        `M${x} ${y - r}` +
        `C${x + c} ${y - r} ${x + r} ${y - c} ${x + r} ${y}` +
        `C${x + r} ${y + c} ${x + c} ${y + r} ${x} ${y + r}` +
        `C${x - c} ${y + r} ${x - r} ${y + c} ${x - r} ${y}` +
        `C${x - r} ${y - c} ${x - c} ${y - r} ${x} ${y - r}Z`
      );
    }
  }
}

/** Strokes-only shapes must not be filled. */
export const isStrokeMarker = (shape) => shape === 'plus' || shape === 'cross' || shape === 'ring';
