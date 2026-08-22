import { env } from './env';

type Level = 'info' | 'warn' | 'error' | 'debug';

let enabled = env.logEnabled;

function write(level: Level, scope: string, message: string, meta?: unknown): void {
  if (!enabled) return;
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${scope}] ${message}`;
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta !== undefined) {
    out(line, meta);
  } else {
    out(line);
  }
}

export interface Logger {
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
  debug(message: string, meta?: unknown): void;
}

export function createLogger(scope: string): Logger {
  return {
    info: (message, meta) => write('info', scope, message, meta),
    warn: (message, meta) => write('warn', scope, message, meta),
    error: (message, meta) => write('error', scope, message, meta),
    debug: (message, meta) => write('debug', scope, message, meta),
  };
}

export const Logger = {
  setEnabled(value: boolean): void {
    enabled = value;
  },
  isEnabled(): boolean {
    return enabled;
  },
};
