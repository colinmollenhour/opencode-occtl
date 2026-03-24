import { Command } from "commander";
import { ensureServer, getClient } from "../client.js";
import { resolveSession } from "../resolve.js";
import { formatJSON } from "../format.js";
import { streamEvents } from "../sse.js";
import type { Permission } from "@opencode-ai/sdk";

export function sessionRespondCommand(): Command {
  return new Command("respond")
    .description("Respond to a permission request in a session")
    .argument("[session-id]", "Session ID (defaults to most recent)")
    .option(
      "-r, --response <response>",
      "Response: once, always, or reject",
      "once"
    )
    .option("-j, --json", "Output as JSON")
    .option(
      "-p, --permission-id <id>",
      "Permission ID to respond to (auto-detects if omitted)"
    )
    .option("-w, --wait", "Wait for a permission request if none pending")
    .option(
      "--auto-approve",
      "Automatically approve all permission requests (use with --wait)"
    )
    .action(async (sessionId: string | undefined, opts) => {
      const client = await ensureServer();
      const resolved = await resolveSession(client, sessionId);

      const validResponses = ["once", "always", "reject"];
      if (!validResponses.includes(opts.response)) {
        console.error(
          `Invalid response: ${opts.response}. Must be one of: ${validResponses.join(", ")}`
        );
        process.exit(1);
      }

      if (opts.permissionId) {
        await respondToPermission(resolved, opts.permissionId, opts.response);
        if (opts.json) {
          console.log(formatJSON({ success: true, permissionId: opts.permissionId }));
        } else {
          console.log(
            `Responded to permission ${opts.permissionId} with: ${opts.response}`
          );
        }
        return;
      }

      if (opts.wait || opts.autoApprove) {
        await waitAndRespond(resolved, opts);
        return;
      }

      console.error(
        "No --permission-id specified. Use --wait to wait for permission requests."
      );
      process.exit(1);
    });
}

async function respondToPermission(
  sessionId: string,
  permissionId: string,
  response: "once" | "always" | "reject"
): Promise<void> {
  const client = getClient();
  await client.postSessionIdPermissionsPermissionId({
    path: { id: sessionId, permissionID: permissionId },
    body: { response },
  });
}

async function waitAndRespond(
  sessionId: string,
  opts: { response: string; json?: boolean; autoApprove?: boolean }
): Promise<void> {
  console.error(`Waiting for permission requests on session ${sessionId}...`);
  console.error("Press Ctrl+C to stop.\n");

  await streamEvents(sessionId, async (event) => {
    if (event.type !== "permission.updated") return;

    const permission = event.properties as Permission;

    console.error(
      `Permission request: ${permission.title} (type: ${permission.type}, id: ${permission.id})`
    );

    if (opts.autoApprove) {
      await respondToPermission(sessionId, permission.id, "once");
      console.error(`Auto-approved: ${permission.id}`);
    } else {
      await respondToPermission(
        sessionId,
        permission.id,
        opts.response as "once" | "always" | "reject"
      );
      console.error(`Responded with "${opts.response}": ${permission.id}`);
      // After responding once, stop unless auto-approve
      return "stop";
    }
  });
}
