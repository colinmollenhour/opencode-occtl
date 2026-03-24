import type { Event } from "@opencode-ai/sdk";
import { getBaseUrl } from "./client.js";

/**
 * Check if an SSE event belongs to a given session.
 */
export function isSessionEvent(event: Event, sessionId: string): boolean {
  const props = event.properties as Record<string, unknown>;

  if (props.sessionID === sessionId) return true;
  if ((props.info as Record<string, unknown>)?.sessionID === sessionId) return true;
  if ((props.info as Record<string, unknown>)?.id === sessionId) return true;
  if ((props.part as Record<string, unknown>)?.sessionID === sessionId) return true;

  return false;
}

/**
 * Connect to the OpenCode SSE event stream and invoke a callback for each
 * parsed event. Returns the reader so callers can cancel it.
 */
export async function streamEvents(
  sessionId: string,
  onEvent: (event: Event) => void | "stop" | Promise<void | "stop">
): Promise<void> {
  const url = `${getBaseUrl()}/event`;
  const response = await fetch(url, {
    headers: { Accept: "text/event-stream" },
  });

  if (!response.ok || !response.body) {
    console.error("Failed to connect to event stream");
    process.exit(1);
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const event = JSON.parse(data) as Event;
          if (!isSessionEvent(event, sessionId)) continue;

          const result = await onEvent(event);
          if (result === "stop") {
            reader.cancel();
            return;
          }
        } catch {
          // Skip unparseable events
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}
