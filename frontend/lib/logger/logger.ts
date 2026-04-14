export type LogLevelName =
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'silent';

const LOG_LEVEL_PRIORITY: Record<LogLevelName, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 60,
};

const CONSOLE_METHODS: Record<
  Exclude<LogLevelName, 'silent'>,
  (...args: unknown[]) => void
> = {
  trace: console.debug.bind(console),
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

function normalizeLogLevel(input?: string | null): LogLevelName {
  const value = input?.toLowerCase();
  if (
    value === 'trace' ||
    value === 'debug' ||
    value === 'info' ||
    value === 'warn' ||
    value === 'error' ||
    value === 'silent'
  ) {
    return value;
  }
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
}

let globalLogLevel = normalizeLogLevel(process.env.NEXT_PUBLIC_LOG_LEVEL);

export function setGlobalLogLevel(level: LogLevelName) {
  globalLogLevel = level;
}

export function getGlobalLogLevel(): LogLevelName {
  return globalLogLevel;
}

export interface Logger {
  trace: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  child: (suffix: string) => Logger;
}

function shouldLog(level: Exclude<LogLevelName, 'silent'>) {
  return (
    LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[getGlobalLogLevel()] &&
    getGlobalLogLevel() !== 'silent'
  );
}

export function createLogger(scope: string): Logger {
  const write = (level: Exclude<LogLevelName, 'silent'>, args: unknown[]) => {
    if (!shouldLog(level)) return;
    const timestamp = new Date().toISOString();
    CONSOLE_METHODS[level](`[${timestamp}] [${scope}]`, ...args);
  };

  return {
    trace: (...args) => write('trace', args),
    debug: (...args) => write('debug', args),
    info: (...args) => write('info', args),
    warn: (...args) => write('warn', args),
    error: (...args) => write('error', args),
    child: suffix => createLogger(`${scope}.${suffix}`),
  };
}
