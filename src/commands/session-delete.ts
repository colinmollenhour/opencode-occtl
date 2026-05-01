import { Command } from "commander";
import { ensureServer, getClientV2 } from "../client.js";
import { resolveSession } from "../resolve.js";
import { clearDefaults } from "../session-defaults.js";

export function sessionDeleteCommand(): Command {
  return new Command("delete")
    .alias("rm")
    .description("Delete a session and drop its locally-persisted defaults")
    .argument("[session-id]", "Session ID (defaults to most recent)")
    .option(
      "--keep-defaults",
      "Keep the local defaults file even after deleting the session"
    )
    .action(async (sessionId: string | undefined, opts) => {
      const client = await ensureServer();
      const clientV2 = getClientV2();
      const resolved = await resolveSession(client, sessionId);

      await clientV2.session.delete({ sessionID: resolved });

      if (!opts.keepDefaults) {
        clearDefaults(resolved);
      }

      console.log(`Deleted session ${resolved}.`);
    });
}
