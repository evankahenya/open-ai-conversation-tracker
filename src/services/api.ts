import { ConversationInfo, ConversationMessage, AssistantMessageEvent } from '../types';

const API_BASE = '';

export async function fetchConversationInfo(): Promise<ConversationInfo> {
  const res = await fetch(`${API_BASE}/api/conversation`);
  if (!res.ok) {
    throw new Error(`Failed to fetch conversation info: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchMessages(sinceId?: string): Promise<{ conversationId: string; events: ConversationMessage[] }> {
  const url = sinceId
    ? `${API_BASE}/api/conversation/messages?since=${encodeURIComponent(sinceId)}`
    : `${API_BASE}/api/conversation/messages`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch messages: ${res.statusText}`);
  }
  return res.json();
}

export async function triggerWatcherCapture(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/watcher/trigger`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Failed to trigger screen capture: ${res.statusText}`);
  }
}

/**
 * Sends a user message and streams the AI response chunk-by-chunk using fetch + ReadableStream
 */
export function sendUserMessageStream(
  message: string,
  callbacks: {
    onDelta: (delta: string) => void;
    onComplete: (event: AssistantMessageEvent) => void;
    onError: (err: Error) => void;
  }
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/conversation/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = 'message';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            currentEvent = 'message';
            continue;
          }

          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.substring(6).trim();
          } else if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.substring(5).trim();
            try {
              const parsed = JSON.parse(dataStr);
              if (currentEvent === 'assistant_delta') {
                callbacks.onDelta(parsed.delta || '');
              } else if (currentEvent === 'assistant_message') {
                callbacks.onComplete(parsed);
              } else if (currentEvent === 'error') {
                callbacks.onError(new Error(parsed.error || 'OpenAI error'));
              }
            } catch {
              // Plain text delta fallback
              if (currentEvent === 'assistant_delta') {
                callbacks.onDelta(dataStr);
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        callbacks.onError(err);
      }
    }
  })();

  return () => controller.abort();
}
