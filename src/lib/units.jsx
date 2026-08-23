import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'hts.scrps.scale';

export const MILLI = '\u00d710\u207b\u00b3'; // ×10⁻³

const UnitContext = createContext(null);

/** Drops trailing zeros: 2.5000000001 -> "2.5", 100 -> "100". */
const trim = (v) => String(Number(v.toPrecision(12)));

/** Raw-scale axis ticks need more decimals the smaller they get. */
const rawTick = (v) => {
  if (v === 0) return '0';
  if (v >= 0.1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(3);
  return v.toFixed(4);
};

export function UnitProvider({ children }) {
  const [scaled, setScaled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'milli';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, scaled ? 'milli' : 'raw');
    } catch {
      /* private mode / storage disabled — the toggle still works this session */
    }
  }, [scaled]);

  const value = useMemo(
    () => ({
      scaled,
      setScaled,
      suffix: scaled ? MILLI : '',
      /** "sCRPS" or "sCRPS ×10⁻³" — use wherever the metric is named. */
      label: scaled ? `sCRPS ${MILLI}` : 'sCRPS',
      /**
       * The source data carries four decimals, so ×1000 with one decimal is
       * lossless — no precision is invented or lost by flipping the switch.
       */
      format: (v) => (scaled ? (v * 1000).toFixed(1) : v.toFixed(4)),
      /** Axis ticks: scales are still computed on raw values, only labels change. */
      formatTick: (v) => (scaled ? trim(v * 1000) : rawTick(v)),
    }),
    [scaled],
  );

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
}

export function useUnit() {
  const ctx = useContext(UnitContext);
  if (!ctx) throw new Error('useUnit must be used inside <UnitProvider>');
  return ctx;
}
