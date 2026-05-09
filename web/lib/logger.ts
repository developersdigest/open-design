type Level = "info" | "warn" | "error" | "debug";

type Fields = Record<string, unknown>;

const LEVELS: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function envLevel(): Level {
  const raw = (process.env.LOG_LEVEL || "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

function isPretty(): boolean {
  return process.env.LOG_PRETTY === "1";
}

function getRequestId(): string | null {
  try {
    // Lazy require so this file is safe outside a request scope (build, scripts, etc).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("next/headers");
    const h = mod.headers();
    const id = h.get("x-request-id");
    return id ?? null;
  } catch {
    return null;
  }
}

function emit(level: Level, msg: string, fields?: Fields, staticFields?: Fields): void {
  const threshold = LEVELS[envLevel()];
  if (LEVELS[level] < threshold) return;

  const record: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
    request_id: getRequestId(),
    ...(staticFields || {}),
    ...(fields || {}),
  };

  const line = isPretty()
    ? JSON.stringify(record, null, 2)
    : JSON.stringify(record);
  console.log(line);
}

export interface Logger {
  info(msg: string, fields?: Fields): void;
  warn(msg: string, fields?: Fields): void;
  error(msg: string, fields?: Fields): void;
  debug(msg: string, fields?: Fields): void;
  child(staticFields: Fields): Logger;
}

function make(staticFields?: Fields): Logger {
  return {
    info: (msg, fields) => emit("info", msg, fields, staticFields),
    warn: (msg, fields) => emit("warn", msg, fields, staticFields),
    error: (msg, fields) => emit("error", msg, fields, staticFields),
    debug: (msg, fields) => emit("debug", msg, fields, staticFields),
    child: (extra) => make({ ...(staticFields || {}), ...extra }),
  };
}

export const log: Logger = make();
export function child(staticFields: Fields): Logger {
  return make(staticFields);
}
