---
name: occtl
description: Manage OpenCode sessions from the CLI using occtl. Use when the user wants to list sessions, read session messages, get the last message, watch a session for updates, send messages to sessions, respond to permission requests, check session status, view todos, abort sessions, view diffs, or automate session management. Triggers include "check session", "read messages", "last message", "watch session", "send prompt", "approve permissions", "session status", "session todo", "abort session", or any programmatic OpenCode session interaction.
---

# occtl - Extended CLI for OpenCode Sessions

`occtl` extends the `opencode` CLI with session management commands that are missing from the official tool: reading messages, watching sessions in real-time, responding to permission requests, and more.

## Prerequisites

- OpenCode must be running (the server is auto-detected from running processes)
- If auto-detection fails, set `OPENCODE_SERVER_HOST` and `OPENCODE_SERVER_PORT`

## Quick Reference

```bash
occtl session create -q                   # create a new session, print its ID
occtl session list                        # list all sessions
occtl session last                        # last message from most recent session
occtl session messages <id>               # all messages in a session
occtl session watch <id> --text-only      # stream text in real-time
occtl session send "fix the bug"          # send a message
occtl session respond --auto-approve -w   # auto-approve permissions
occtl session todo                        # view session todo list
occtl session status                      # check if sessions are busy/idle
occtl session share                       # share session, get public URL
```

The `session` subcommand can be shortened to `s`:

```bash
occtl s ls          # list sessions
occtl s last        # last message
occtl s msgs        # messages
```

## Commands

### List Sessions

```bash
occtl s list                    # sessions for current directory only (default)
occtl s list --all              # sessions for ALL directories
occtl s list /path/to/project   # sessions for a specific directory
occtl s list --children         # include child sessions (sub-agents)
occtl s list --json             # JSON output for scripting
occtl s list --detailed         # show full details per session
occtl s list --limit 5          # limit results
occtl s list --sort created     # sort by: updated (default), created, title
occtl s list --sort title --asc # sort ascending
```

### Create a Session

```bash
occtl s create                          # create a new session
occtl s create -t "my feature work"     # with a title
occtl s create -q                       # quiet mode: only output the session ID
occtl s create --json                   # full JSON output
occtl s create -p <parent-id>           # create a child session
```

The `-q` flag is useful in scripts: `SID=$(occtl s create -q)`

### Get Session Details

```bash
occtl s get <session-id>        # detailed info about a session
occtl s get <session-id> --json
```

### Read Messages

```bash
occtl s messages                          # all messages from most recent session
occtl s messages <session-id>             # all messages from specific session
occtl s messages <id> --role user         # only user messages
occtl s messages <id> --role assistant    # only assistant messages
occtl s messages <id> --limit 5           # last 5 messages
occtl s messages <id> --text-only         # text content only
occtl s messages <id> --verbose           # include tool call details
occtl s messages <id> --json              # full JSON output
```

### Get Last Message

```bash
occtl s last                              # last message (text-only by default)
occtl s last <session-id>                 # from specific session
occtl s last --role user                  # last user message
occtl s last --role assistant             # last assistant message
occtl s last --verbose                    # include tool calls and metadata
occtl s last --json                       # full JSON output
```

### Watch Session (Real-Time)

Connects to the SSE event stream and displays events for a session:

```bash
occtl s watch                             # watch most recent session
occtl s watch <session-id>                # watch specific session
occtl s watch --text-only                 # stream only text content as it arrives
occtl s watch --json                      # output each event as JSON line
occtl s watch --events message.updated,session.idle  # filter event types
```

Event types shown: `message.updated`, `message.part.updated` (text deltas, tool calls), `session.status`, `session.idle`, `permission.updated`, `todo.updated`, `session.error`.

Press Ctrl+C to stop watching.

### Send Messages

```bash
occtl s send "your message here"                    # send to most recent session
occtl s send -s <session-id> "your message"         # send to specific session
occtl s send --async "do this in background"        # send and return immediately
occtl s send -w "fix the tests"                     # send, block until idle, show result
occtl s send --model anthropic/claude-opus-4-6 "hi" # specify model
occtl s send --agent plan "analyze this code"       # specify agent
occtl s send --no-reply "context info"              # inject context without AI response
occtl s send --stdin < prompt.txt                   # read message from stdin
occtl s send "message" --json                       # JSON response output
```

The three send modes:
- **(default)** — synchronous: blocks on the HTTP request until the agent responds, returns the response.
- **`--async`** — fire-and-forget: sends and exits immediately. Use with `watch` or `wait-for-text` separately.
- **`--wait` / `-w`** — hybrid: sends async, blocks until `session.idle` via SSE, then fetches and displays the last assistant message. Best for scripts that need the result but want event-driven waiting.

### Respond to Permission Requests

```bash
# Respond to a specific permission
occtl s respond <session-id> -p <permission-id> -r once

# Wait for and respond to the next permission request
occtl s respond <session-id> --wait -r always

# Auto-approve all permissions continuously (for automation)
occtl s respond <session-id> --auto-approve --wait

# Response options: once, always, reject
occtl s respond -r reject -p <permission-id>
```

### View Todos

```bash
occtl s todo                              # todos from most recent session
occtl s todo <session-id>                 # todos from specific session
occtl s todo --json                       # JSON output
```

Output format:
```
[x]! Completed high-priority task
[>]  In-progress task
[ ]  Pending task
[-]  Cancelled task
```

### Check Session Status

```bash
occtl s status                            # all session statuses
occtl s status <session-id>               # specific session status
occtl s status --json                     # JSON output
```

Status types: `idle`, `busy`, `retry`.

### Abort a Session

```bash
occtl s abort                             # abort most recent session
occtl s abort <session-id>                # abort specific session
```

### View Diffs

```bash
occtl s diff                              # file changes from most recent session
occtl s diff <session-id>                 # file changes from specific session
occtl s diff --json                       # JSON output
```

### Wait for Text

```bash
occtl s wait-for-text "SOME_TEXT"                    # wait on most recent session
occtl s wait-for-text "SOME_TEXT" <session-id>       # wait on specific session
occtl s wait-for-text "DONE" --timeout 300           # timeout after 5 minutes (exit 1)
occtl s wait-for-text "DONE" --check-existing        # also check existing messages first
```

Silently watches the SSE stream until a message contains the given text, then outputs everything after that text and exits 0. Exits 1 on timeout. Useful for automation scripts that need to block until the agent signals completion.

### Share / Unshare

```bash
occtl s share                             # share most recent session, print URL
occtl s share <session-id>                # share a specific session
occtl s share --json                      # full JSON output
occtl s unshare <session-id>              # remove sharing
```

### List Child Sessions

```bash
occtl s children                          # children of most recent session
occtl s children <session-id>             # children of specific session
occtl s children --json                   # JSON output
```

## Session ID Resolution

All commands that accept a session ID support:

1. **No ID** - defaults to most recent session
2. **Full ID** - exact match (e.g., `ses_2e1451cf8ffe7cBLbjmQS8Ogsc`)
3. **Partial ID** - prefix or substring match (e.g., `ses_2e14` or just `2e14`)
4. **Title search** - case-insensitive match against session title

## Automation Patterns

### Continuous permission approval

```bash
# Run in background to auto-approve all permission requests
occtl s respond --auto-approve --wait &
```

### Poll session until idle

```bash
while [ "$(occtl s status <id> --json | jq -r '.type')" = "busy" ]; do
  sleep 2
done
echo "Session is idle"
```

### Send message and capture response

```bash
response=$(occtl s send "what files were changed?" --json)
echo "$response" | jq -r '.parts[] | select(.type == "text") | .text'
```

### Watch for text output and pipe it

```bash
occtl s watch <id> --text-only | tee session-output.txt
```

### Chain send + watch for async workflows

```bash
occtl s send --async "refactor the auth module"
occtl s watch --text-only
```

## JSON Output

All commands support `--json` for machine-readable output. The JSON structure matches the OpenCode SDK types directly (`Session`, `Message`, `Part`, `Todo`, etc.).

## Creating a Ralph Loop

The Ralph Loop (aka "Ralph Wiggum pattern") is an autonomous coding technique where an AI agent works through a task list in a loop, with fresh context each iteration. Progress persists via the filesystem and git — not the context window. Each iteration: the agent reads the current state, picks a task, implements it, verifies it, commits, and marks it done. The loop repeats until all tasks pass or a max iteration count is reached.

`occtl` makes this pattern smarter than a raw bash loop because you can inspect the agent's actual output, watch its progress in real-time, auto-approve permissions, and use `wait-for-text` to detect completion signals reliably.

### Prerequisites

1. A running OpenCode instance (`opencode serve`)
2. A task file in your project (e.g. `tasks.md`, `prd.json`, or similar)
3. A prompt file that tells the agent how to work (e.g. `PROMPT.md`)

### Minimal Ralph Loop

The simplest version — a fresh session per iteration, just like the original Ralph:

```bash
#!/usr/bin/env bash
set -e

MAX_ITERATIONS=${1:-10}
PROMPT_FILE="./PROMPT.md"

for i in $(seq 1 "$MAX_ITERATIONS"); do
  echo "=== Ralph iteration $i/$MAX_ITERATIONS ==="

  # Fresh session each iteration (the core Ralph principle)
  SID=$(occtl s create -q -t "ralph-$i")

  # Send prompt async to the new session
  occtl s send --async "$(cat "$PROMPT_FILE")" -s "$SID"

  # Auto-approve permissions in background
  occtl s respond "$SID" --auto-approve --wait &
  APPROVE_PID=$!

  # Wait for the agent to signal completion
  if occtl s wait-for-text "RALPH_COMPLETE" "$SID" --timeout 600; then
    kill $APPROVE_PID 2>/dev/null || true
    echo "=== Iteration $i complete ==="
  else
    kill $APPROVE_PID 2>/dev/null || true
    echo "=== Iteration $i timed out ==="
  fi

  # Check if all tasks are done
  if occtl s wait-for-text "ALL_TASKS_DONE" "$SID" \
       --check-existing --timeout 1; then
    echo "=== All tasks complete! ==="
    break
  fi
done
```

### Smarter Ralph Loop with occtl

This version creates a fresh session each iteration and uses `occtl` to inspect what the agent actually did between iterations — giving you observability and control that a raw bash loop cannot:

```bash
#!/usr/bin/env bash
set -e

MAX_ITERATIONS=${1:-10}
PROMPT_FILE="./PROMPT.md"
PROGRESS_FILE="./progress.txt"
TASK_FILE="./tasks.md"

for i in $(seq 1 "$MAX_ITERATIONS"); do
  echo "=== Ralph iteration $i/$MAX_ITERATIONS ==="

  # Fresh session each iteration — avoids context rot
  SID=$(occtl s create -q -t "ralph-$i")
  echo "Session: $SID"

  # Build the prompt with progress context
  PROMPT="$(cat "$PROMPT_FILE")

## Current Progress
$(cat "$PROGRESS_FILE" 2>/dev/null || echo 'No progress yet.')

## Task List
$(cat "$TASK_FILE")

When you are done with this iteration, output RALPH_DONE on its own line.
If ALL tasks are complete, output ALL_TASKS_COMPLETE on its own line."

  # Send async so we can monitor in parallel
  occtl s send --async "$PROMPT" -s "$SID"

  # Auto-approve permissions in background
  occtl s respond "$SID" --auto-approve --wait &
  APPROVE_PID=$!

  # Wait for the agent to signal completion
  occtl s wait-for-text "RALPH_DONE" "$SID" --timeout 600
  EXIT_CODE=$?

  kill $APPROVE_PID 2>/dev/null || true
  wait $APPROVE_PID 2>/dev/null || true

  if [ $EXIT_CODE -ne 0 ]; then
    echo "=== Iteration $i timed out or failed ==="
    # Capture what happened for debugging
    occtl s last "$SID" >> "$PROGRESS_FILE"
    continue
  fi

  # Append the agent's summary to progress file
  occtl s last "$SID" >> "$PROGRESS_FILE"

  # Check the todo list for remaining work
  echo "--- Todos after iteration $i ---"
  occtl s todo "$SID"

  # Show what files changed this iteration
  echo "--- Diff ---"
  occtl s diff "$SID"

  # Check if the agent signalled full completion
  if occtl s wait-for-text "ALL_TASKS_COMPLETE" "$SID" \
       --check-existing --timeout 1; then
    echo "=== All tasks complete after $i iterations ==="
    break
  fi

  echo "--- Continuing to next iteration ---"
  echo ""
done

echo "=== Ralph Loop finished ==="
```

### PROMPT.md Template

A good Ralph Loop prompt tells the agent exactly how to work each iteration:

```markdown
# Task Execution Prompt

You are working through a task list autonomously. Each iteration you have fresh
context, so you MUST read the current state from the filesystem.

## Instructions

1. Read `tasks.md` to see what needs to be done
2. Read `progress.txt` to see what has already been completed
3. Pick the highest-priority incomplete task
4. Implement it fully — write code, run tests, fix errors
5. Commit your changes with a descriptive message
6. Update `tasks.md` to mark the task as done
7. Append a brief summary of what you did to `progress.txt`

## Rules

- Do ONE task per iteration. Do not try to do multiple tasks.
- Run the test suite before marking a task complete.
- If tests fail, fix them before moving on.
- If you are stuck on a task after a reasonable attempt, note the blocker in
  `progress.txt` and move to the next task.

## Completion Signals

- When you finish this iteration's task, output: RALPH_DONE
- When ALL tasks in `tasks.md` are complete, output: ALL_TASKS_COMPLETE
```

### Tips

- **One task per iteration.** This is the core Ralph principle. Trying to do too much in one pass leads to context rot and half-finished work.
- **Keep tasks atomic.** Each task should be completable within a single context window. If a task is too big, break it into subtasks before starting the loop.
- **Use `wait-for-text` over polling.** It's event-driven (SSE) so it reacts instantly and uses no CPU while waiting, unlike a `sleep`/poll loop.
- **Use `--check-existing` on the final completion check.** The agent may have written `ALL_TASKS_COMPLETE` in the same message as `RALPH_DONE`, so check existing messages rather than waiting for a new one.
- **Auto-approve permissions carefully.** For trusted codebases, `--auto-approve` is fine. For untrusted work, omit it and let the agent block on permission requests (you can respond manually via another terminal).
- **Inspect between iterations.** Unlike a raw bash loop, `occtl` lets you `occtl s last`, `occtl s todo`, and `occtl s diff` between iterations to observe what the agent actually did.
- **Set a timeout.** Always use `--timeout` with `wait-for-text` to prevent infinite hangs if the agent gets stuck or never produces the completion signal.
- **Progress file as memory.** The agent has no memory across iterations. The `progress.txt` file IS its memory. Keep it concise — append summaries, not full transcripts.
- **Use `send --wait` for simpler loops.** If you don't need completion signals and just want to block until the agent finishes, `occtl s send -w` is simpler than `send --async` + `wait-for-text`. It sends the message, blocks until `session.idle`, and prints the last assistant message.
- **`session delete` lives in `opencode`.** Use `opencode session delete <id>` to clean up sessions after a Ralph loop. This was intentionally not duplicated in `occtl`.
