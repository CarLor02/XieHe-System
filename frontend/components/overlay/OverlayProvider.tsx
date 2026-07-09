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
  hostElement: HTMLElement | null;
}

interface OverlayHostProps {
  hostId?: string;
  hostTestId: string;
  hostScope: 'global' | 'scoped';
  onHostElementChange: (element: HTMLDivElement | null) => void;
}

interface OverlayScopeProviderProps {
  children: ReactNode;
  hostId?: string;
  hostTestId?: string;
  hostScope?: 'global' | 'scoped';
}

const OverlayContext = createContext<OverlayContextValue | undefined>(undefined);

/**
 * Overlay container state intentionally has three states instead of collapsing
 * "outside provider" and "waiting host" into one fallback path.
 *
 * Outside the provider we allow Radix to use its default body container, which
 * keeps isolated tests and local reuse working. Inside the provider, however,
 * the host ref is null on the first render; rendering a Radix Portal at that
 * moment would mount it under document.body and then move it into OverlayHost
 * on the next render. That short-lived body mount is enough to reintroduce
 * z-index races and focus/position flicker, so consumers must skip portal
 * rendering while the host is still waiting.
 */
export type OverlayContainerState =
  | {
      type: 'outside-provider';
      shouldRenderPortal: true;
      container: undefined;
    }
  | {
      type: 'waiting-host';
      shouldRenderPortal: false;
      container: undefined;
    }
  | {
      type: 'ready';
      shouldRenderPortal: true;
      container: HTMLElement;
    };

export function useOverlayContainer(): OverlayContainerState {
  const context = useContext(OverlayContext);

  if (context === undefined) {
    return {
      type: 'outside-provider',
      shouldRenderPortal: true,
      container: undefined,
    };
  }

  if (context.hostElement === null) {
    return {
      type: 'waiting-host',
      shouldRenderPortal: false,
      container: undefined,
    };
  }

  return {
    type: 'ready',
    shouldRenderPortal: true,
    container: context.hostElement,
  };
}

export function useOverlayHostElement(): HTMLElement | null | undefined {
  const overlayContainer = useOverlayContainer();

  if (overlayContainer.type === 'outside-provider') return undefined;
  if (overlayContainer.type === 'waiting-host') return null;
  return overlayContainer.container;
}

function OverlayHost({
  hostId,
  hostTestId,
  hostScope,
  onHostElementChange,
}: OverlayHostProps) {
  return (
    <div
      id={hostId}
      data-overlay-host={hostScope}
      data-testid={hostTestId}
      ref={onHostElementChange}
    />
  );
}

export function OverlayScopeProvider({
  children,
  hostId,
  hostTestId = 'xiehe-overlay-scoped-host',
  hostScope = 'scoped',
}: OverlayScopeProviderProps) {
  const [hostElement, setHostElement] = useState<HTMLDivElement | null>(null);
  const handleHostElementChange = useCallback((element: HTMLDivElement | null) => {
    setHostElement(element);
  }, []);
  const contextValue = useMemo(() => ({ hostElement }), [hostElement]);

  return (
    <OverlayContext.Provider value={contextValue}>
      {children}
      <OverlayHost
        hostId={hostId}
        hostTestId={hostTestId}
        hostScope={hostScope}
        onHostElementChange={handleHostElementChange}
      />
    </OverlayContext.Provider>
  );
}

export default function OverlayProvider({ children }: { children: ReactNode }) {
  return (
    <OverlayScopeProvider
      hostId="xiehe-overlay-host"
      hostTestId="xiehe-overlay-host"
      hostScope="global"
    >
      {children}
    </OverlayScopeProvider>
  );
}
