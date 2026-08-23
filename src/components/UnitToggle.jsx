import { MILLI, useUnit } from '../lib/units.jsx';

export default function UnitToggle({ compact = false }) {
  const { scaled, setScaled } = useUnit();

  return (
    <div className="unitswitch" role="group" aria-label="sCRPS value scale">
      <div className="segmented">
        <button
          data-active={!scaled}
          onClick={() => setScaled(false)}
          title="Raw values"
          aria-pressed={!scaled}
        >
          SCRPS
        </button>
        <button
          data-active={scaled}
          onClick={() => setScaled(true)}
          title="Scaled values"
          aria-pressed={scaled}
        >
          SCRPS {MILLI}
        </button>
      </div>
    </div>
  );
}
