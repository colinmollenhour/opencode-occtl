import { Command } from "commander";
import { ensureServer } from "../client.js";
import { formatSessionDetailed, formatJSON } from "../format.js";
import { writeDefaults, type SessionDefaults } from "../session-defaults.js";

export function sessionCreateCommand(): Command {
  return new Command("create")
    .alias("new")
    .description("Create a new session")
    .option("-t, --title <title>", "Session title")
    .option(
      "-p, --parent <id>",
      "Parent session ID (creates a child/sub-agent session)"
    )
    .option(
      "-d, --dir <path>",
      "Project directory for the session (defaults to cwd)"
    )
    .option(
      "--model <model>",
      "Default model for this session (format: provider/model). Stored locally and applied by `occtl send`."
    )
    .option(
      "--agent <agent>",
      "Default agent for this session. Stored locally and applied by `occtl send`."
    )
    .option(
      "--variant <variant>",
      "Default model variant for this session. Stored locally and applied by `occtl send`."
    )
    .option("-j, --json", "Output as JSON")
    .option("-q, --quiet", "Only output the session ID")
    .action(async (opts) => {
      const client = await ensureServer();

      const directory = opts.dir
        ? (await import("path")).resolve(opts.dir)
        : process.cwd();

      const result = await client.session.create({
        body: {
          ...(opts.title && { title: opts.title }),
          ...(opts.parent && { parentID: opts.parent }),
        },
        query: { directory },
      });

      if (!result.data) {
        console.error("Failed to create session.");
        process.exit(1);
      }

      const defaults: SessionDefaults = {
        ...(opts.model && { model: opts.model }),
        ...(opts.agent && { agent: opts.agent }),
        ...(opts.variant && { variant: opts.variant }),
      };
      if (Object.keys(defaults).length > 0) {
        writeDefaults(result.data.id, defaults);
      }

      if (opts.quiet) {
        console.log(result.data.id);
        return;
      }

      if (opts.json) {
        console.log(formatJSON(result.data));
        return;
      }

      console.log(formatSessionDetailed(result.data));
    });
}
