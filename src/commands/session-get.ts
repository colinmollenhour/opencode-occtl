import { Command } from "commander";
import { ensureServer } from "../client.js";
import { formatSessionDetailed, formatJSON } from "../format.js";
import { readDefaults } from "../session-defaults.js";

export function sessionGetCommand(): Command {
  return new Command("get")
    .alias("show")
    .description("Get session details (including locally-persisted defaults)")
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

      const defaults = readDefaults(result.data.id);

      if (opts.json) {
        console.log(formatJSON({ ...result.data, defaults }));
        return;
      }

      console.log(formatSessionDetailed(result.data));
      if (defaults && Object.keys(defaults).length > 0) {
        console.log("");
        console.log("Local defaults:");
        if (defaults.model) console.log(`  Model:   ${defaults.model}`);
        if (defaults.agent) console.log(`  Agent:   ${defaults.agent}`);
        if (defaults.variant) console.log(`  Variant: ${defaults.variant}`);
      }
    });
}
