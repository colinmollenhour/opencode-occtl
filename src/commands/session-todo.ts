import { Command } from "commander";
import { ensureServer } from "../client.js";
import { resolveSession } from "../resolve.js";
import { formatJSON } from "../format.js";

export function sessionTodoCommand(): Command {
  return new Command("todo")
    .description("Get the todo list for a session")
    .argument("[session-id]", "Session ID (defaults to most recent)")
    .option("-j, --json", "Output as JSON")
    .action(async (sessionId: string | undefined, opts) => {
      const client = await ensureServer();
      const resolved = await resolveSession(client, sessionId);

      const result = await client.session.todo({
        path: { id: resolved },
      });

      const todos = result.data ?? [];

      if (opts.json) {
        console.log(formatJSON(todos));
        return;
      }

      if (todos.length === 0) {
        console.log("No todos in session.");
        return;
      }

      for (const todo of todos) {
        const icon =
          todo.status === "completed"
            ? "[x]"
            : todo.status === "in_progress"
            ? "[>]"
            : todo.status === "cancelled"
            ? "[-]"
            : "[ ]";
        const priority =
          todo.priority === "high"
            ? "!"
            : todo.priority === "low"
            ? " "
            : " ";
        console.log(`${icon}${priority} ${todo.content}`);
      }
    });
}
