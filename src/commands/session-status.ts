import { Command } from "commander";
import { ensureServer } from "../client.js";
import { formatJSON } from "../format.js";
import { resolveSession } from "../resolve.js";

export function sessionStatusCommand(): Command {
  return new Command("status")
    .description("Get the status of sessions (idle, busy, retry)")
    .argument("[session-id]", "Session ID (defaults to showing all statuses)")
    .option("-j, --json", "Output as JSON")
    .action(async (sessionId: string | undefined, opts) => {
      const client = await ensureServer();

      const result = await client.session.status();
      const statuses = result.data ?? {};

      if (opts.json) {
        if (sessionId) {
          const resolved = await resolveSession(client, sessionId);
          console.log(formatJSON(statuses[resolved] ?? { type: "idle" }));
        } else {
          console.log(formatJSON(statuses));
        }
        return;
      }

      if (sessionId) {
        const resolved = await resolveSession(client, sessionId);
        const status = statuses[resolved];
        if (!status) {
          console.log(`${resolved}: idle`);
        } else {
          console.log(`${resolved}: ${status.type}`);
        }
        return;
      }

      const entries = Object.entries(statuses);
      if (entries.length === 0) {
        console.log("No active session statuses.");
        return;
      }

      console.log("SESSION\tSTATUS");
      for (const [id, status] of entries) {
        console.log(`${id}\t${status.type}`);
      }
    });
}
