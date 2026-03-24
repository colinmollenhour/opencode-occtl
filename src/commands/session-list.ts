import { Command } from "commander";
import path from "path";
import { ensureServer } from "../client.js";
import { formatSession, formatSessionDetailed, formatJSON } from "../format.js";

export function sessionListCommand(): Command {
  return new Command("list")
    .alias("ls")
    .description(
      "List sessions. Default: current directory only. Pass a path to filter by directory, or --all for everything."
    )
    .argument("[directory]", "Only show sessions for this directory")
    .option("-j, --json", "Output as JSON")
    .option("-d, --detailed", "Show detailed info for each session")
    .option("-n, --limit <n>", "Limit number of results", parseInt)
    .option("-a, --all", "Show sessions for all directories")
    .option("-c, --children", "Include child sessions (sub-agents)")
    .action(async (directory: string | undefined, opts) => {
      const client = await ensureServer();

      // Determine which directory to filter by
      let filterDir: string | undefined;
      if (opts.all) {
        // No directory filter
        filterDir = undefined;
      } else if (directory) {
        // Explicit directory argument — resolve to absolute path
        filterDir = path.resolve(directory);
      } else {
        // Default: current working directory
        filterDir = process.cwd();
      }

      const result = await client.session.list({
        ...(filterDir && { query: { directory: filterDir } }),
      });
      let sessions = result.data ?? [];

      // Client-side directory filtering as fallback in case the server
      // doesn't honour the query param (older versions)
      if (filterDir) {
        sessions = sessions.filter((s) => s.directory === filterDir);
      }

      // Filter out child sessions unless --children
      if (!opts.children) {
        sessions = sessions.filter((s) => !s.parentID);
      }

      // Apply limit
      if (opts.limit && opts.limit > 0) {
        sessions = sessions.slice(0, opts.limit);
      }

      if (opts.json) {
        console.log(formatJSON(sessions));
        return;
      }

      if (sessions.length === 0) {
        if (filterDir) {
          console.log(`No sessions found for ${filterDir}.`);
        } else {
          console.log("No sessions found.");
        }
        return;
      }

      if (opts.detailed) {
        for (const s of sessions) {
          console.log(formatSessionDetailed(s));
          console.log("");
        }
      } else {
        console.log("ID\tTITLE\tUPDATED");
        for (const s of sessions) {
          console.log(formatSession(s));
        }
      }
    });
}
