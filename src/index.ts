#!/usr/bin/env node

import { Command } from "commander";
import { sessionListCommand } from "./commands/session-list.js";
import { sessionGetCommand } from "./commands/session-get.js";
import { sessionMessagesCommand } from "./commands/session-messages.js";
import { sessionLastCommand } from "./commands/session-last.js";
import { sessionStatusCommand } from "./commands/session-status.js";
import { sessionWatchCommand } from "./commands/session-watch.js";
import { sessionSendCommand } from "./commands/session-send.js";
import { sessionRespondCommand } from "./commands/session-respond.js";
import { sessionTodoCommand } from "./commands/session-todo.js";
import { sessionAbortCommand } from "./commands/session-abort.js";
import { sessionDiffCommand } from "./commands/session-diff.js";
import { sessionChildrenCommand } from "./commands/session-children.js";
import { sessionCreateCommand } from "./commands/session-create.js";
import { sessionWaitForTextCommand } from "./commands/session-wait-for-text.js";

const program = new Command();

program
  .name("occtl")
  .description(
    "Extended CLI for managing OpenCode sessions.\n\n" +
    "Auto-detects running OpenCode server, or set:\n" +
    "  OPENCODE_SERVER_HOST  (default: 127.0.0.1)\n" +
    "  OPENCODE_SERVER_PORT  (default: 4096)"
  )
  .version("1.0.0");

// Session subcommand group
const session = program
  .command("session")
  .alias("s")
  .description("Manage OpenCode sessions");

session.addCommand(sessionListCommand());
session.addCommand(sessionCreateCommand());
session.addCommand(sessionGetCommand());
session.addCommand(sessionMessagesCommand());
session.addCommand(sessionLastCommand());
session.addCommand(sessionStatusCommand());
session.addCommand(sessionWatchCommand());
session.addCommand(sessionSendCommand());
session.addCommand(sessionRespondCommand());
session.addCommand(sessionTodoCommand());
session.addCommand(sessionAbortCommand());
session.addCommand(sessionDiffCommand());
session.addCommand(sessionChildrenCommand());
session.addCommand(sessionWaitForTextCommand());

program.parse();
