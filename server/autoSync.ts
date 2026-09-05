import { getConversation, getEvents, replaceEvents, updateConversation } from './store';
import { getOpenAIClient, fetchEarlierConversationFromOpenAI } from './openaiService';
import { realtimeHub } from './realtime';
import { getConversationLock } from './concurrency';
import { ConversationEvent, UserMessageEvent, AssistantMessageEvent } from './types';

let autoSyncInterval: NodeJS.Timeout | null = null;
let isSyncCheckInProgress = false;

/**
 * Starts the server-side background worker that periodically polls OpenAI
 * for the active conversation. When a new user message or AI response appears
 * on OpenAI (e.g., from ChatGPT, another script, or external process),
 * it synchronizes automatically and broadcasts via SSE to all connected clients.
 */
export function startAutoSyncWorker(intervalMs = 3000): void {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
  }

  autoSyncInterval = setInterval(async () => {
    if (isSyncCheckInProgress) return;

    const conv = getConversation();
    const conversationId = conv.conversationId;
    if (!conversationId || conversationId.trim() === '' || conversationId === 'conv_abc123') {
      return;
    }

    const client = getOpenAIClient();
    if (!client) {
      return;
    }

    // Don't interrupt active in-flight locks (e.g. streaming responses or watcher tasks)
    const lock = getConversationLock(conversationId);
    if (lock.busy) {
      return;
    }

    isSyncCheckInProgress = true;
    try {
      // Check latest items from OpenAI
      const itemsPage = await client.conversations.items.list(conversationId, { limit: 10 });
      const currentEvents = getEvents();
      const currentIds = new Set(currentEvents.map((e) => e.id));

      let hasNewItems = false;
      let newCount = 0;

      for await (const rawItem of itemsPage) {
        const item = rawItem as any;
        if (item?.id && !currentIds.has(item.id)) {
          hasNewItems = true;
          newCount++;
        }
      }

      if (hasNewItems) {
        console.log(
          `[AutoSync] Detected ${newCount} new items from OpenAI for conversation "${conversationId}". Synchronizing...`
        );
        const syncedItems = await fetchEarlierConversationFromOpenAI(conversationId);

        const newEvents: ConversationEvent[] = syncedItems.map((item) => {
          if (item.type === 'user_message') {
            return {
              id: item.id,
              type: 'user_message',
              conversationId,
              timestamp: item.timestamp,
              content: item.content,
            } as UserMessageEvent;
          } else {
            return {
              id: item.id,
              type: 'assistant_message',
              conversationId,
              timestamp: item.timestamp,
              content: item.content,
            } as AssistantMessageEvent;
          }
        });

        replaceEvents(newEvents);
        updateConversation({ lastUpdate: new Date().toISOString() });

        // Broadcast real-time update to all connected browser tabs
        realtimeHub.broadcast({
          id: `evt_autosync_${Date.now()}`,
          type: 'conversation_synced',
          conversationId,
          timestamp: new Date().toISOString(),
          data: { count: newEvents.length, autoSynced: true },
        });
      }
    } catch (err: any) {
      // Silently swallow 404s (e.g. conversation ID not yet created or invalid)
      // so the console isn't flooded with polling logs
      if (err?.status !== 404 && err?.statusCode !== 404 && !err?.message?.includes('404')) {
        // Only log non-404 unexpected errors if needed
      }
    } finally {
      isSyncCheckInProgress = false;
    }
  }, intervalMs);

  console.log(`[AutoSync] Background auto-sync worker started (interval: ${intervalMs}ms)`);
}

export function stopAutoSyncWorker(): void {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
}
