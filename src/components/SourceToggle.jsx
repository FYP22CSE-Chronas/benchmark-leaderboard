const SOURCES = [
  { key: 'benchmark', label: 'Models' },
  { key: 'experiments', label: 'Experiments' },
];

export default function SourceToggle({ source, setSource }) {
  return (
    <div className="sourceswitch" role="group" aria-label="Data source">
      <div className="segmented">
        {SOURCES.map(({ key, label }) => (
          <button
            key={key}
            data-active={source === key}
            onClick={() => setSource(key)}
            aria-pressed={source === key}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
