import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk";
import {
  createOpencodeClient as createOpencodeClientV2,
  type OpencodeClient as OpencodeClientV2,
} from "@opencode-ai/sdk/v2";
import { execSync } from "child_process";

let _client: OpencodeClient | null = null;
let _clientV2: OpencodeClientV2 | null = null;
let _baseUrl: string | null = null;
let _password: string | null | undefined = undefined;

/**
 * Auto-detect the OpenCode server by looking at running processes.
 * Falls back to env vars or defaults.
 */
function detectServer(): { host: string; port: string } {
  // Check env vars first
  if (process.env.OPENCODE_SERVER_HOST || process.env.OPENCODE_SERVER_PORT) {
    return {
      host: process.env.OPENCODE_SERVER_HOST || "127.0.0.1",
      port: process.env.OPENCODE_SERVER_PORT || "4096",
    };
  }

  // Try to detect from running opencode process
  try {
    const output = execSync(
      "ps aux | grep 'opencode serve' | grep -v grep",
      { encoding: "utf-8", timeout: 2000 }
    );
    const lines = output.trim().split("\n");
    for (const line of lines) {
      const portMatch = line.match(/--port\s+(\d+)/);
      const hostMatch = line.match(/--hostname\s+([\w.:]+)/);
      if (portMatch) {
        return {
          host: hostMatch?.[1] || "127.0.0.1",
          port: portMatch[1],
        };
      }
    }
  } catch {
    // Process detection failed, fall through
  }

  return { host: "127.0.0.1", port: "4096" };
}

export function getBaseUrl(): string {
  if (!_baseUrl) {
    const { host, port } = detectServer();
    _baseUrl = `http://${host}:${port}`;
  }
  return _baseUrl;
}

/**
 * Override the auto-detected server URL (used after spawning an ephemeral
 * `opencode serve`). Resets the cached SDK clients so subsequent calls hit
 * the new URL.
 */
export function setServer(baseUrl: string): void {
  _baseUrl = baseUrl;
  _client = null;
  _clientV2 = null;
}

/**
 * Set or clear the OpenCode server password. `null` disables auth even if
 * OPENCODE_SERVER_PASSWORD is in the environment; pass a string to use that
 * explicit value. Resets the cached SDK clients.
 */
export function setPassword(pw: string | null): void {
  _password = pw;
  _client = null;
  _clientV2 = null;
}

function getPassword(): string | null {
  if (_password !== undefined) return _password;
  return process.env.OPENCODE_SERVER_PASSWORD || null;
}

/**
 * Return Basic-auth headers when a server password is configured, else `{}`.
 * opencode's server uses HTTP Basic with username `opencode` and the
 * password from OPENCODE_SERVER_PASSWORD.
 */
export function getAuthHeaders(): Record<string, string> {
  const pw = getPassword();
  if (!pw) return {};
  const token = Buffer.from(`opencode:${pw}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

function authFetch(request: Request): ReturnType<typeof fetch> {
  const auth = getAuthHeaders();
  if (!auth.Authorization) return fetch(request);
  const headers = new Headers(request.headers);
  headers.set("Authorization", auth.Authorization);
  return fetch(new Request(request, { headers }));
}

export function getClient(): OpencodeClient {
  if (!_client) {
    _client = createOpencodeClient({
      baseUrl: getBaseUrl(),
      fetch: authFetch as unknown as typeof fetch,
    });
  }
  return _client;
}

export function getClientV2(): OpencodeClientV2 {
  if (!_clientV2) {
    _clientV2 = createOpencodeClientV2({
      baseUrl: getBaseUrl(),
      fetch: authFetch as unknown as typeof fetch,
    });
  }
  return _clientV2;
}

export async function ensureServer(): Promise<OpencodeClient> {
  const client = getClient();
  try {
    // Try listing sessions as a health check
    await client.session.list();
  } catch {
    console.error(
      "Error: Cannot connect to OpenCode server at " + getBaseUrl()
    );
    console.error(
      "Make sure OpenCode is running, or set OPENCODE_SERVER_HOST/OPENCODE_SERVER_PORT"
    );
    process.exit(1);
  }
  return client;
}
