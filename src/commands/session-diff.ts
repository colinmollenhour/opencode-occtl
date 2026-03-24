import { Command } from "commander";
import { ensureServer } from "../client.js";
import { resolveSession } from "../resolve.js";
import { formatJSON } from "../format.js";

export function sessionDiffCommand(): Command {
  return new Command("diff")
    .description("Show the diff (file changes) for a session")
    .argument("[session-id]", "Session ID (defaults to most recent)")
    .option("-j, --json", "Output as JSON")
    .action(async (sessionId: string | undefined, opts) => {
      const client = await ensureServer();
      const resolved = await resolveSession(client, sessionId);

      const result = await client.session.diff({
        path: { id: resolved },
      });

      const diffs = result.data ?? [];

      if (opts.json) {
        console.log(formatJSON(diffs));
        return;
      }

      if (diffs.length === 0) {
        console.log("No file changes in this session.");
        return;
      }

      for (const d of diffs) {
        console.log(`--- ${d.file}`);
        console.log(`+${d.additions} -${d.deletions}`);
        if (d.before !== d.after) {
          console.log(`Before: ${d.before.slice(0, 100)}`);
          console.log(`After:  ${d.after.slice(0, 100)}`);
        }
        console.log("");
      }
    });
}
