import { Command } from "commander";
import { ensureServer } from "../client.js";
import { formatMessage, formatJSON } from "../format.js";
import { resolveSession } from "../resolve.js";

export function sessionMessagesCommand(): Command {
  return new Command("messages")
    .alias("msgs")
    .description("List messages in a session")
    .argument("[session-id]", "Session ID (defaults to most recent)")
    .option("-j, --json", "Output as JSON")
    .option("-v, --verbose", "Show tool calls and extra details")
    .option("-t, --text-only", "Show only text content")
    .option("-n, --limit <n>", "Limit number of messages", parseInt)
    .option("--role <role>", "Filter by role (user or assistant)")
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

      if (opts.limit && opts.limit > 0) {
        messages = messages.slice(-opts.limit);
      }

      if (opts.json) {
        console.log(formatJSON(messages));
        return;
      }

      if (messages.length === 0) {
        console.log("No messages in session.");
        return;
      }

      for (const m of messages) {
        console.log(
          formatMessage(m.info, m.parts, {
            verbose: opts.verbose,
            textOnly: opts.textOnly,
          })
        );
        console.log("");
      }
    });
}
