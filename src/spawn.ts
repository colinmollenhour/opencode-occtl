import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface SpawnedServer {
  baseUrl: string;
  host: string;
  port: number;
  pid: number;
  password: string | null;
  /** SIGTERM the server, wait up to 5s, SIGKILL, then remove the state dir. Idempotent. */
  shutdown: () => Promise<void>;
}

export interface SpawnOptions {
  /** Bind to this port. 0/undefined picks a random free port. */
  port?: number;
  /** OPENCODE_SERVER_PASSWORD value for the child. `null` (default) leaves auth disabled. */
  password?: string | null;
  /** Hostname to bind. Default 127.0.0.1. */
  hostname?: string;
  /** Max wait for the "listening on" log line. Default 30000ms. */
  readyTimeoutMs?: number;
  /** Forward child stdout/stderr to this fd in addition to the in-memory buffer. */
  inheritStdio?: boolean;
}

/**
 * Pick a free TCP port by binding 0. There's a small TOCTOU window before
 * the child binds, but it's acceptable for ephemeral servers.
 */
async function pickFreePort(hostname: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, hostname, () => {
      const addr = srv.address();
      if (!addr || typeof addr === "string") {
        srv.close();
        reject(new Error("Could not allocate a free port"));
        return;
      }
      const port = addr.port;
      srv.close(() => resolve(port));
    });
  });
}

/**
 * Spawn an ephemeral `opencode serve` instance and resolve once it logs
 * "listening on http://...". Caller MUST call `shutdown()` to clean up the
 * child process and the per-spawn state dir.
 *
 * Why a per-spawn `XDG_STATE_HOME`: the opencode binary mkdir's its XDG
 * state dir on startup; if the user's `~/.local/state` is not writable
 * (sandbox, EROFS) the server fails before it can bind. Redirecting to a
 * fresh tmp dir sidesteps that. Provider configs (XDG_CONFIG_HOME) and
 * auth tokens (XDG_DATA_HOME) are inherited so the spawned server has the
 * same model access as the user's normal opencode.
 */
export async function spawnOpencodeServer(
  opts: SpawnOptions = {}
): Promise<SpawnedServer> {
  const hostname = opts.hostname ?? "127.0.0.1";
  const port =
    opts.port && opts.port > 0 ? opts.port : await pickFreePort(hostname);
  const readyTimeoutMs = opts.readyTimeoutMs ?? 30000;
  const password = opts.password ?? null;

  const stateDir = mkdtempSync(join(tmpdir(), "occtl-spawn-"));

  const env: NodeJS.ProcessEnv = { ...process.env, XDG_STATE_HOME: stateDir };
  if (password === null) {
    delete env.OPENCODE_SERVER_PASSWORD;
  } else {
    env.OPENCODE_SERVER_PASSWORD = password;
  }

  const child = spawn(
    "opencode",
    ["serve", "--port", String(port), "--hostname", hostname],
    { env, stdio: ["ignore", "pipe", "pipe"] }
  );

  let stdoutBuf = "";
  let stderrBuf = "";
  let listening = false;
  let exited = false;

  return new Promise<SpawnedServer>((resolve, reject) => {
    const timer = setTimeout(() => {
      detach();
      child.kill("SIGTERM");
      reject(
        new Error(
          `opencode serve did not become ready within ${readyTimeoutMs}ms.\n` +
            `stdout: ${stdoutBuf.slice(-2000)}\nstderr: ${stderrBuf.slice(-2000)}`
        )
      );
    }, readyTimeoutMs);

    const detach = () => {
      clearTimeout(timer);
      child.stdout?.removeListener("data", onStdout);
      child.stderr?.removeListener("data", onStderr);
      child.removeListener("error", onError);
      child.removeListener("exit", onExit);
    };

    const checkReady = () => {
      if (listening) return;
      if (/listening on http/i.test(stdoutBuf + stderrBuf)) {
        listening = true;
        detach();
        resolve(buildHandle());
      }
    };

    const onStdout = (chunk: Buffer) => {
      stdoutBuf += chunk.toString();
      if (opts.inheritStdio) process.stdout.write(chunk);
      checkReady();
    };

    const onStderr = (chunk: Buffer) => {
      stderrBuf += chunk.toString();
      if (opts.inheritStdio) process.stderr.write(chunk);
      checkReady();
    };

    const onError = (err: Error) => {
      detach();
      try {
        rmSync(stateDir, { recursive: true, force: true });
      } catch {}
      reject(new Error(`Failed to spawn opencode: ${err.message}`));
    };

    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      exited = true;
      if (!listening) {
        detach();
        try {
          rmSync(stateDir, { recursive: true, force: true });
        } catch {}
        reject(
          new Error(
            `opencode serve exited (code=${code}, signal=${signal}) before becoming ready.\n` +
              `stdout: ${stdoutBuf.slice(-2000)}\nstderr: ${stderrBuf.slice(-2000)}`
          )
        );
      }
    };

    child.stdout!.on("data", onStdout);
    child.stderr!.on("data", onStderr);
    child.once("error", onError);
    child.once("exit", onExit);

    const buildHandle = (): SpawnedServer => {
      let shutdownCalled = false;
      const shutdown = async (): Promise<void> => {
        if (shutdownCalled) return;
        shutdownCalled = true;
        if (!exited) {
          child.kill("SIGTERM");
          await new Promise<void>((r) => {
            const killTimer = setTimeout(() => {
              try {
                child.kill("SIGKILL");
              } catch {}
              r();
            }, 5000);
            child.once("exit", () => {
              clearTimeout(killTimer);
              r();
            });
          });
        }
        try {
          rmSync(stateDir, { recursive: true, force: true });
        } catch {}
      };
      return {
        baseUrl: `http://${hostname}:${port}`,
        host: hostname,
        port,
        pid: child.pid!,
        password,
        shutdown,
      };
    };
  });
}
