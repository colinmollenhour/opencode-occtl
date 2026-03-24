import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk";
import { execSync } from "child_process";

let _client: OpencodeClient | null = null;
let _baseUrl: string | null = null;

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

export function getClient(): OpencodeClient {
  if (!_client) {
    _client = createOpencodeClient({
      baseUrl: getBaseUrl(),
    });
  }
  return _client;
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
