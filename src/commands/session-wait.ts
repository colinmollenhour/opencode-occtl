import { Command } from "commander";
import { ensureServer } from "../client.js";
import { resolveSession } from "../resolve.js";
import { streamEvents, streamAllEvents, getEventSessionId } from "../sse.js";
import { formatJSON } from "../format.js";

// ─── wait-for-idle ─────────────────────────────────────

export function sessionWaitForIdleCommand(): Command {
  return new Command("wait-for-idle")
    .description(
      "Block until a session goes idle. Exits 0 when idle, 1 on timeout."
    )
    .argument("[session-id]", "Session ID (defaults to most recent)")
    .option(
      "-t, --timeout <seconds>",
      "Timeout in seconds (exit 1 if not idle in time)",
      parseInt
    )
    .action(async (sessionId: string | undefined, opts) => {
      const client = await ensureServer();
      const resolved = await resolveSession(client, sessionId);

      // Set up timeout
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (opts.timeout && opts.timeout > 0) {
        timer = setTimeout(() => process.exit(1), opts.timeout * 1000);
      }

      // To avoid a race between the status check and SSE connection,
      // we start listening on SSE first, then check current status.
      // If the session went idle before our SSE connected, we catch it
      // in the status check. If it goes idle after, the SSE stream
      // catches it. No gap.
      let resolved_via_api = false;

      const streamPromise = streamEvents(resolved, (event) => {
        if (event.type === "session.idle") {
          if (timer) clearTimeout(timer);
          return "stop";
        }
      });

      // Give the SSE connection a moment to establish, then check status
      await new Promise((r) => setTimeout(r, 50));

      const statusResult = await client.session.status();
      const statuses = statusResult.data ?? {};
      const current = statuses[resolved];
      if (!current || current.type === "idle") {
        resolved_via_api = true;
        if (timer) clearTimeout(timer);
        process.exit(0);
      }

      if (!resolved_via_api) {
        await streamPromise;
      }

      process.exit(0);
    });
}

// ─── wait-any ──────────────────────────────────────────

export function sessionWaitAnyCommand(): Command {
  return new Command("wait-any")
    .description(
      "Wait for the first of multiple sessions to go idle. Outputs the session ID that finished."
    )
    .argument(
      "<session-ids...>",
      "Two or more session IDs to watch"
    )
    .option(
      "-t, --timeout <seconds>",
      "Timeout in seconds (exit 1 if none finish)",
      parseInt
    )
    .option("-j, --json", "Output as JSON")
    .action(async (sessionIds: string[], opts) => {
      const client = await ensureServer();

      // Resolve all session IDs
      const resolved: string[] = [];
      for (const sid of sessionIds) {
        resolved.push(await resolveSession(client, sid));
      }
      const watchSet = new Set(resolved);

      // Set up timeout
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (opts.timeout && opts.timeout > 0) {
        timer = setTimeout(() => process.exit(1), opts.timeout * 1000);
      }

      const outputAndExit = (sid: string, reason: string) => {
        if (timer) clearTimeout(timer);
        if (opts.json) {
          console.log(formatJSON({ sessionID: sid, reason }));
        } else {
          console.log(sid);
        }
        process.exit(0);
      };

      // Start SSE first, then check status — avoids race condition
      let resolved_via_api = false;

      const streamPromise = streamAllEvents((event) => {
        if (event.type !== "session.idle") return;

        const eventSid = getEventSessionId(event);
        if (!eventSid || !watchSet.has(eventSid)) return;

        outputAndExit(eventSid, "idle");
        return "stop";
      });

      // Give SSE a moment to connect, then check current status
      await new Promise((r) => setTimeout(r, 50));

      const statusResult = await client.session.status();
      const statuses = statusResult.data ?? {};
      for (const sid of resolved) {
        const current = statuses[sid];
        if (!current || current.type === "idle") {
          resolved_via_api = true;
          outputAndExit(sid, "already_idle");
        }
      }

      if (!resolved_via_api) {
        await streamPromise;
      }
    });
}

// ─── is-idle ───────────────────────────────────────────

export function sessionIsIdleCommand(): Command {
  return new Command("is-idle")
    .description(
      "Check if a session is idle (non-blocking). Exit 0 = idle, exit 1 = busy."
    )
    .argument("[session-id]", "Session ID (defaults to most recent)")
    .option("-j, --json", "Output status as JSON")
    .action(async (sessionId: string | undefined, opts) => {
      const client = await ensureServer();
      const resolved = await resolveSession(client, sessionId);

      const statusResult = await client.session.status();
      const statuses = statusResult.data ?? {};
      const current = statuses[resolved];
      const isIdle = !current || current.type === "idle";

      if (opts.json) {
        console.log(
          formatJSON({
            sessionID: resolved,
            idle: isIdle,
            status: current?.type ?? "idle",
          })
        );
      }

      process.exit(isIdle ? 0 : 1);
    });
}
