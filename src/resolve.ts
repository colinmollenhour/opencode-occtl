import type { OpencodeClient, Session } from "@opencode-ai/sdk";

/**
 * Resolve a session ID. If none is provided, returns the most recently updated session
 * for the current directory. Also supports partial ID matching.
 */
export async function resolveSession(
  client: OpencodeClient,
  sessionId?: string
): Promise<string> {
  if (!sessionId) {
    // Get most recent session for the current directory
    const dir = process.cwd();
    const result = await client.session.list({
      query: { directory: dir },
    });
    let sessions = (result.data ?? []).filter(
      (s: Session) => !s.parentID && s.directory === dir
    );
    if (sessions.length === 0) {
      console.error(`No sessions found for ${dir}.`);
      process.exit(1);
    }
    // Sessions are sorted by most recently updated
    return sessions[0].id;
  }

  // Try exact match first
  try {
    const result = await client.session.get({
      path: { id: sessionId },
    });
    if (result.data) {
      return result.data.id;
    }
  } catch {
    // Fall through to partial match
  }

  // Try partial match
  const result = await client.session.list();
  const sessions = result.data ?? [];
  const matches = sessions.filter(
    (s: Session) =>
      s.id.startsWith(sessionId) ||
      s.id.includes(sessionId) ||
      (s.title && s.title.toLowerCase().includes(sessionId.toLowerCase()))
  );

  if (matches.length === 0) {
    console.error(`No session found matching: ${sessionId}`);
    process.exit(1);
  }

  if (matches.length > 1) {
    console.error(`Ambiguous session ID "${sessionId}", matches:`);
    for (const m of matches.slice(0, 5)) {
      console.error(`  ${m.id}  ${m.title || "(untitled)"}`);
    }
    process.exit(1);
  }

  return matches[0].id;
}
