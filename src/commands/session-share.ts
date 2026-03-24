import { Command } from "commander";
import { ensureServer } from "../client.js";
import { resolveSession } from "../resolve.js";
import { formatJSON } from "../format.js";

export function sessionShareCommand(): Command {
  return new Command("share")
    .description("Share a session and get a public URL")
    .argument("[session-id]", "Session ID (defaults to most recent)")
    .option("-j, --json", "Output as JSON")
    .action(async (sessionId: string | undefined, opts) => {
      const client = await ensureServer();
      const resolved = await resolveSession(client, sessionId);

      const result = await client.session.share({
        path: { id: resolved },
      });

      if (!result.data) {
        console.error("Failed to share session.");
        process.exit(1);
      }

      if (opts.json) {
        console.log(formatJSON(result.data));
        return;
      }

      if (result.data.share?.url) {
        console.log(result.data.share.url);
      } else {
        console.log(`Session ${resolved} shared.`);
      }
    });
}

export function sessionUnshareCommand(): Command {
  return new Command("unshare")
    .description("Remove sharing from a session")
    .argument("[session-id]", "Session ID (defaults to most recent)")
    .option("-j, --json", "Output as JSON")
    .action(async (sessionId: string | undefined, opts) => {
      const client = await ensureServer();
      const resolved = await resolveSession(client, sessionId);

      const result = await client.session.unshare({
        path: { id: resolved },
      });

      if (!result.data) {
        console.error("Failed to unshare session.");
        process.exit(1);
      }

      if (opts.json) {
        console.log(formatJSON(result.data));
        return;
      }

      console.log(`Session ${resolved} unshared.`);
    });
}
