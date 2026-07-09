'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

interface OverlayContextValue {
  hostElement: HTMLDivElement | null;
}

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function useOverlayHostElement(): HTMLDivElement | null | undefined {
  const context = useContext(OverlayContext);
  return context ? context.hostElement : undefined;
}

function OverlayHost({
  onHostElementChange,
}: {
  onHostElementChange: (element: HTMLDivElement | null) => void;
}) {
  return (
    <div
      id="xiehe-overlay-host"
      data-testid="xiehe-overlay-host"
      ref={onHostElementChange}
    />
  );
}

export default function OverlayProvider({ children }: { children: ReactNode }) {
  const [hostElement, setHostElement] = useState<HTMLDivElement | null>(null);
  const handleHostElementChange = useCallback((element: HTMLDivElement | null) => {
    setHostElement(element);
  }, []);
  const contextValue = useMemo(() => ({ hostElement }), [hostElement]);

  return (
    <OverlayContext.Provider value={contextValue}>
      {children}
      <OverlayHost onHostElementChange={handleHostElementChange} />
    </OverlayContext.Provider>
  );
}
