import { createContext, useContext, ReactNode } from 'react';
import { useExchangeRates, ExchangeRate } from '@/hooks/useExchangeRates';

interface ExchangeRatesContextValue {
  rates: ExchangeRate[];
  loading: boolean;
  error: string | null;
}

const ExchangeRatesContext = createContext<ExchangeRatesContextValue>({
  rates: [],
  loading: true,
  error: null,
});

export function ExchangeRatesProvider({ children }: { children: ReactNode }) {
  const { rates, loading, error } = useExchangeRates();
  return (
    <ExchangeRatesContext.Provider value={{ rates, loading, error }}>
      {children}
    </ExchangeRatesContext.Provider>
  );
}

export function useExchangeRatesContext() {
  return useContext(ExchangeRatesContext);
}
