import { Command } from "commander";
import { ensureServer } from "../client.js";
import { formatSessionDetailed, formatJSON } from "../format.js";

export function sessionGetCommand(): Command {
  return new Command("get")
    .description("Get session details")
    .argument("<session-id>", "Session ID")
    .option("-j, --json", "Output as JSON")
    .action(async (sessionId: string, opts) => {
      const client = await ensureServer();
      const result = await client.session.get({
        path: { id: sessionId },
      });

      if (!result.data) {
        console.error(`Session not found: ${sessionId}`);
        process.exit(1);
      }

      if (opts.json) {
        console.log(formatJSON(result.data));
        return;
      }

      console.log(formatSessionDetailed(result.data));
    });
}
