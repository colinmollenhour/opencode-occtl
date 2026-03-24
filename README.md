# occtl

Extended CLI for managing [OpenCode](https://opencode.ai) sessions. Adds the commands missing from the `opencode` CLI: reading messages, watching sessions in real-time, sending prompts, responding to permission requests, and more.

Built for automating and orchestrating OpenCode sessions externally -- including [Ralph Loop](#ralph-loop) workflows.

## Install

```bash
npm install -g occtl
```

## Quick Start

```bash
# List sessions for the current directory
occtl session list

# Get the last assistant message
occtl session last

# Watch a session stream in real-time
occtl session watch --text-only

# Send a prompt and wait for the response
occtl session send "fix the failing tests"

# Auto-approve all permission requests
occtl session respond --auto-approve --wait
```

The `session` subcommand can be shortened to `s`:

```bash
occtl s ls
occtl s last
occtl s send -w "refactor the auth module"
```

## Server Detection

`occtl` auto-detects a running OpenCode server by inspecting processes. Override with environment variables:

```bash
export OPENCODE_SERVER_HOST=127.0.0.1
export OPENCODE_SERVER_PORT=4096
```

## Commands

| Command | Description |
|---------|-------------|
| `session list` | List sessions (filters by cwd, supports `--all`, path arg, `--sort`, `--asc`) |
| `session create` | Create a new session (`-q` for just the ID, `-t` for title) |
| `session get` | Get detailed session info |
| `session messages` | List messages (`--role`, `--limit`, `--text-only`, `--verbose`) |
| `session last` | Get the last message (text-only by default) |
| `session status` | Check session status (idle/busy/retry) |
| `session watch` | Watch session events via SSE (`--text-only`, `--json`, `--events`) |
| `session send` | Send a message (`--async`, `--wait`, `--model`, `--agent`, `--stdin`) |
| `session respond` | Respond to permission requests (`--auto-approve`, `--wait`) |
| `session todo` | View the session's todo list |
| `session abort` | Abort a running session |
| `session diff` | Show file changes in a session |
| `session children` | List child sessions (sub-agents) |
| `session share` | Share a session and get a public URL |
| `session unshare` | Remove sharing from a session |
| `session wait-for-text` | Block until a message contains given text, then exit 0 |
| `install-skill` | Install the occtl skill as an OpenCode user-level skill |
| `view-skill` | Display the bundled SKILL.md |

All commands that accept a session ID support partial matching and title search. When no ID is given, the most recent session is used.

All commands support `--json` for machine-readable output.

### Send Modes

```bash
# Default: synchronous, blocks until the agent responds
occtl s send "fix the bug"

# Async: fire and forget
occtl s send --async "fix the bug"

# Wait: send async, block until session idle, show result
occtl s send --wait "fix the bug"
```

## OpenCode Skill

`occtl` ships with a SKILL.md that teaches OpenCode agents how to use `occtl`. Install it as a user-level skill:

```bash
occtl install-skill
```

This copies the skill to `~/.config/opencode/skills/occtl/`. Restart OpenCode to pick it up. The skill includes full command reference and Ralph Loop templates.

To view the skill without installing:

```bash
occtl view-skill
```

## Ralph Loop

The [Ralph Loop](https://ghuntley.com/ralph/) (aka "Ralph Wiggum pattern") is an autonomous coding technique where an AI agent works through a task list in a loop, with fresh context each iteration. `occtl` makes this pattern smarter than a raw bash loop with event-driven completion detection, permission auto-approval, and inter-iteration inspection.

### Minimal Example

```bash
#!/usr/bin/env bash
set -e

MAX_ITERATIONS=${1:-10}

for i in $(seq 1 "$MAX_ITERATIONS"); do
  echo "=== Iteration $i/$MAX_ITERATIONS ==="

  # Fresh session each iteration
  SID=$(occtl s create -q -t "ralph-$i")

  # Send the prompt
  occtl s send --async "$(cat PROMPT.md)" -s "$SID"

  # Auto-approve permissions
  occtl s respond "$SID" --auto-approve --wait &
  APPROVE_PID=$!

  # Wait for completion signal
  if occtl s wait-for-text "RALPH_DONE" "$SID" --timeout 600; then
    echo "=== Iteration $i complete ==="
  else
    echo "=== Iteration $i timed out ==="
  fi

  kill $APPROVE_PID 2>/dev/null || true

  # Check if all tasks are done
  if occtl s wait-for-text "ALL_TASKS_DONE" "$SID" \
       --check-existing --timeout 1; then
    echo "=== All tasks complete! ==="
    break
  fi
done
```

See `occtl view-skill` for the full Ralph Loop guide with a smarter script, PROMPT.md template, and tips.

## Why Not Just Use opencode CLI?

The `opencode` CLI provides `session list` and `session delete`. Everything else in `occtl` is additive:

- **Read messages** from any session
- **Watch** sessions in real-time via SSE
- **Send prompts** programmatically (sync, async, or wait-for-idle)
- **Respond** to permission requests (including continuous auto-approve)
- **Wait for text** in agent output (event-driven, not polling)
- **Create** sessions for fresh-context workflows
- **Share/unshare** sessions
- **Inspect** todos, diffs, children, and status

## License

MIT
