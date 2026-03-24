import { Command } from "commander";
import { ensureServer } from "../client.js";
import { formatMessage, formatJSON } from "../format.js";
import { resolveSession } from "../resolve.js";

export function sessionSendCommand(): Command {
  return new Command("send")
    .alias("prompt")
    .description("Send a message to a session")
    .argument("<message...>", "Message text to send")
    .option("-s, --session <id>", "Session ID (defaults to most recent)")
    .option("-j, --json", "Output response as JSON")
    .option("-v, --verbose", "Show tool calls and extra details")
    .option("-t, --text-only", "Show only text content in response")
    .option("--no-reply", "Send as context injection (no AI response)")
    .option("--async", "Send async and return immediately")
    .option("--agent <agent>", "Agent to use")
    .option("--model <model>", "Model to use (format: provider/model)")
    .option("--stdin", "Read message from stdin instead of arguments")
    .action(async (messageParts: string[], opts) => {
      const client = await ensureServer();
      const resolved = await resolveSession(client, opts.session);

      let messageText: string;
      if (opts.stdin) {
        // Read from stdin
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        messageText = Buffer.concat(chunks).toString("utf-8").trim();
      } else {
        messageText = messageParts.join(" ");
      }

      if (!messageText) {
        console.error("No message provided.");
        process.exit(1);
      }

      // Parse model if provided
      let model: { providerID: string; modelID: string } | undefined;
      if (opts.model) {
        const parts = opts.model.split("/");
        if (parts.length === 2 && parts[0] && parts[1]) {
          model = { providerID: parts[0], modelID: parts[1] };
        }
      }

      if (opts.async) {
        await client.session.promptAsync({
          path: { id: resolved },
          body: {
            parts: [{ type: "text", text: messageText }],
            ...(model && { model }),
            ...(opts.agent && { agent: opts.agent }),
            ...(opts.reply === false && { noReply: true }),
          },
        });
        console.log("Message sent (async).");
        return;
      }

      const result = await client.session.prompt({
        path: { id: resolved },
        body: {
          parts: [{ type: "text", text: messageText }],
          ...(model && { model }),
          ...(opts.agent && { agent: opts.agent }),
          ...(opts.reply === false && { noReply: true }),
        },
      });

      if (!result.data) {
        console.error("No response received.");
        process.exit(1);
      }

      if (opts.json) {
        console.log(formatJSON(result.data));
        return;
      }

      console.log(
        formatMessage(result.data.info, result.data.parts, {
          verbose: opts.verbose,
          textOnly: opts.textOnly ?? true,
        })
      );
    });
}
