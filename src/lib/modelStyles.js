const SURFACE = '#070707';

const PALETTE = [
  { shade: '#3987e5', marker: 'circle' },
  { shade: '#d95926', marker: 'square' },
  { shade: '#199e70', marker: 'triangle' },
  { shade: '#c98500', marker: 'diamond' },
  { shade: '#d55181', marker: 'plus' },
  { shade: '#008300', marker: 'cross' },
  { shade: '#9085e9', marker: 'triangleDown' },
  { shade: '#e66767', marker: 'ring' },
];

export const CHART_SURFACE = SURFACE;

export function buildStyleMap(models) {
  const map = new Map();
  models.forEach((model, i) => {
    const slot = PALETTE[i] ?? PALETTE[PALETTE.length - 1];
    map.set(model, { ...slot, width: 2, id: `m${i}` });
  });
  return map;
}

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

export const isStrokeMarker = (shape) => shape === 'plus' || shape === 'cross' || shape === 'ring';
