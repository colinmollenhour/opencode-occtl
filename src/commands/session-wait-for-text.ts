import { Command } from "commander";
import { ensureServer, getClient } from "../client.js";
import { resolveSession } from "../resolve.js";
import { streamEvents } from "../sse.js";
import { extractText } from "../format.js";
import type { Part } from "@opencode-ai/sdk";

export function sessionWaitForTextCommand(): Command {
  return new Command("wait-for-text")
    .description(
      "Silently wait until a message contains the given text, then output everything after it and exit 0"
    )
    .argument("<text>", "Text to wait for")
    .argument("[session-id]", "Session ID (defaults to most recent)")
    .option(
      "-t, --timeout <seconds>",
      "Timeout in seconds (exit 1 if not found)",
      parseInt
    )
    .option(
      "--check-existing",
      "Also check messages already in the session before watching"
    )
    .action(async (text: string, sessionId: string | undefined, opts) => {
      const client = await ensureServer();
      const resolved = await resolveSession(client, sessionId);

      // Set up timeout if requested
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (opts.timeout && opts.timeout > 0) {
        timer = setTimeout(() => {
          process.exit(1);
        }, opts.timeout * 1000);
      }

      // Optionally check existing messages first
      if (opts.checkExisting) {
        const result = await client.session.messages({
          path: { id: resolved },
        });
        const messages = result.data ?? [];
        // Walk backwards to find the most recent match
        for (let i = messages.length - 1; i >= 0; i--) {
          const fullText = extractText(messages[i].parts);
          const idx = fullText.indexOf(text);
          if (idx !== -1) {
            const after = fullText.slice(idx + text.length).trimStart();
            process.stdout.write(after);
            if (timer) clearTimeout(timer);
            process.exit(0);
          }
        }
      }

      // Accumulate text per assistant message so we can detect the marker
      // even when it arrives across multiple SSE deltas
      const messageBuffers = new Map<string, string>();

      await streamEvents(resolved, (event) => {
        if (event.type === "message.part.updated") {
          const props = event.properties as {
            part: Part & { text?: string };
            delta?: string;
          };
          if (props.part.type !== "text" || !props.delta) return;

          const msgId = props.part.messageID;
          const current = (messageBuffers.get(msgId) ?? "") + props.delta;
          messageBuffers.set(msgId, current);

          const idx = current.indexOf(text);
          if (idx !== -1) {
            const after = current.slice(idx + text.length).trimStart();
            process.stdout.write(after);
            if (timer) clearTimeout(timer);
            // Exit with success on next tick so stdout flushes
            process.exitCode = 0;
            return "stop";
          }
        }

        // Also check completed messages (the full text snapshot)
        if (event.type === "message.updated") {
          // message.updated doesn't carry parts, so we rely on the
          // accumulated buffer or check via API when session goes idle
        }

        // When the session goes idle, do a final check of the last message
        // in case we missed deltas (e.g. compaction)
        if (event.type === "session.idle") {
          checkLastMessage(resolved, text, timer).catch(() => {});
        }
      });
    });
}

async function checkLastMessage(
  sessionId: string,
  text: string,
  timer: ReturnType<typeof setTimeout> | undefined
): Promise<void> {
  const client = getClient();
  const result = await client.session.messages({
    path: { id: sessionId },
  });
  const messages = result.data ?? [];
  if (messages.length === 0) return;

  const last = messages[messages.length - 1];
  const fullText = extractText(last.parts);
  const idx = fullText.indexOf(text);
  if (idx !== -1) {
    const after = fullText.slice(idx + text.length).trimStart();
    process.stdout.write(after);
    if (timer) clearTimeout(timer);
    process.exit(0);
  }
}
