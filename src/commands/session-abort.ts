import { Command } from "commander";
import { ensureServer } from "../client.js";
import { resolveSession } from "../resolve.js";

export function sessionAbortCommand(): Command {
  return new Command("abort")
    .description("Abort a running session")
    .argument("[session-id]", "Session ID (defaults to most recent)")
    .action(async (sessionId: string | undefined) => {
      const client = await ensureServer();
      const resolved = await resolveSession(client, sessionId);

      await client.session.abort({
        path: { id: resolved },
      });

      console.log(`Aborted session: ${resolved}`);
    });
}
