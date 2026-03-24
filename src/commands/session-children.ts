import { Command } from "commander";
import { ensureServer } from "../client.js";
import { resolveSession } from "../resolve.js";
import { formatSession, formatJSON } from "../format.js";

export function sessionChildrenCommand(): Command {
  return new Command("children")
    .description("List child sessions (sub-agents) of a session")
    .argument("[session-id]", "Session ID (defaults to most recent)")
    .option("-j, --json", "Output as JSON")
    .action(async (sessionId: string | undefined, opts) => {
      const client = await ensureServer();
      const resolved = await resolveSession(client, sessionId);

      const result = await client.session.children({
        path: { id: resolved },
      });

      const children = result.data ?? [];

      if (opts.json) {
        console.log(formatJSON(children));
        return;
      }

      if (children.length === 0) {
        console.log("No child sessions.");
        return;
      }

      console.log("ID\tTITLE\tUPDATED");
      for (const s of children) {
        console.log(formatSession(s));
      }
    });
}
