import { Command } from "commander";
import { ensureServer } from "../client.js";
import { formatMessage, formatJSON, formatMessageJSON } from "../format.js";
import { resolveSession } from "../resolve.js";

export function sessionLastCommand(): Command {
  return new Command("last")
    .description("Get the last message from a session")
    .argument("[session-id]", "Session ID (defaults to most recent)")
    .option("-j, --json", "Output as JSON")
    .option("-v, --verbose", "Show tool calls and extra details")
    .option("-t, --text-only", "Show only text content (default)")
    .option("--role <role>", "Get last message of a specific role (user or assistant)")
    .action(async (sessionId: string | undefined, opts) => {
      const client = await ensureServer();
      const resolved = await resolveSession(client, sessionId);

      const result = await client.session.messages({
        path: { id: resolved },
      });

      let messages = result.data ?? [];

      if (opts.role) {
        messages = messages.filter((m) => m.info.role === opts.role);
      }

      if (messages.length === 0) {
        console.error("No messages in session.");
        process.exit(1);
      }

      const last = messages[messages.length - 1];

      if (opts.json) {
        console.log(formatJSON(formatMessageJSON(last)));
        return;
      }

      // Default to text-only for the 'last' command unless verbose
      const textOnly = opts.verbose ? false : (opts.textOnly !== false);
      console.log(
        formatMessage(last.info, last.parts, {
          verbose: opts.verbose,
          textOnly,
        })
      );
    });
}
