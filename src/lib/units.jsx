import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'hts.scrps.scale';

export const MILLI = '\u00d710\u207b\u00b3';

const UnitContext = createContext(null);

const trim = (v) => String(Number(v.toPrecision(12)));

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
    }
  }, [scaled]);

  const value = useMemo(
    () => ({
      scaled,
      setScaled,
      suffix: scaled ? MILLI : '',
      label: scaled ? `sCRPS ${MILLI}` : 'sCRPS',
      format: (v) => (scaled ? (v * 1000).toFixed(1) : v.toFixed(4)),
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
