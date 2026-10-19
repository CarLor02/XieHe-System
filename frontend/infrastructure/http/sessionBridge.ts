interface WebSessionBridgeHandlers {
  getSessionEpoch: () => number;
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
  handleUnauthorized: (error: unknown) => void | Promise<void>;
}

let handlers: WebSessionBridgeHandlers = {
  getSessionEpoch: () => 0,
  getAccessToken: () => null,
  refreshAccessToken: async () => null,
  handleUnauthorized: () => undefined,
};

export function configureWebSessionBridge(
  nextHandlers: WebSessionBridgeHandlers
): void {
  handlers = nextHandlers;
}

export const webSessionBridge = {
  getSessionEpoch: (): number => handlers.getSessionEpoch(),
  getAccessToken: (): string | null => handlers.getAccessToken(),
  refreshAccessToken: (): Promise<string | null> =>
    handlers.refreshAccessToken(),
  handleUnauthorized: (error: unknown): void | Promise<void> =>
    handlers.handleUnauthorized(error),
};
