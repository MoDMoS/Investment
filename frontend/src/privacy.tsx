import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fmt } from './format';

const STORAGE_KEY = 'hide-amounts';
const MASK = '••••';

type PrivacyContextValue = {
  hidden: boolean;
  toggle: () => void;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

function readHidden() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(readHidden);

  const value = useMemo(
    () => ({
      hidden,
      toggle: () => {
        setHidden((prev) => {
          const next = !prev;
          try {
            localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
          } catch {
            /* ignore */
          }
          return next;
        });
      },
    }),
    [hidden],
  );

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error('usePrivacy must be used within PrivacyProvider');
  return ctx;
}

export function useMoneyFmt() {
  const { hidden } = usePrivacy();
  return useMemo(
    () => ({
      thb: (value: number) => (hidden ? MASK : fmt.thb(value)),
      usd: (value: number) => (hidden ? MASK : fmt.usd(value)),
      number: (value: number, digits?: number) =>
        hidden ? MASK : fmt.number(value, digits),
      rate: (value: number) => (hidden ? MASK : fmt.rate(value)),
      shares: fmt.shares,
      signed: (format: (value: number) => string, value: number) =>
        hidden ? MASK : fmt.signed(format, value),
    }),
    [hidden],
  );
}
