import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";

export interface SessionDefaults {
  model?: string;
  agent?: string;
  variant?: string;
}

function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), ".config");
  return join(base, "occtl", "sessions");
}

function pathFor(sessionId: string): string {
  return join(configDir(), `${sessionId}.json`);
}

export function readDefaults(sessionId: string): SessionDefaults | null {
  try {
    const raw = readFileSync(pathFor(sessionId), "utf-8");
    const parsed = JSON.parse(raw) as SessionDefaults;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDefaults(sessionId: string, defaults: SessionDefaults): void {
  const path = pathFor(sessionId);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(defaults, null, 2));
}

export function clearDefaults(sessionId: string): void {
  try {
    unlinkSync(pathFor(sessionId));
  } catch {
    // ignore missing file
  }
}
