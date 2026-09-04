import { ref, onMounted, onUnmounted } from 'vue';
import { ConnectionStatusType } from '../types';

export function useRealtime(
  onEvent: (eventType: string, data: any, eventId?: string) => void,
  onReconnect?: () => void
) {
  const connectionStatus = ref<ConnectionStatusType>('reconnecting');
  const lastEventId = ref<string | null>(null);
  const reconnectAttempts = ref(0);

  let eventSource: EventSource | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let isExplicitlyClosed = false;

  const connect = () => {
    if (isExplicitlyClosed) return;

    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    connectionStatus.value = reconnectAttempts.value > 0 ? 'reconnecting' : 'reconnecting';

    const url = lastEventId.value
      ? `/api/events?since=${encodeURIComponent(lastEventId.value)}`
      : '/api/events';

    try {
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        connectionStatus.value = 'connected';
        const hadDisconnected = reconnectAttempts.value > 0;
        reconnectAttempts.value = 0;

        if (hadDisconnected && onReconnect) {
          onReconnect();
        }
      };

      eventSource.onerror = () => {
        connectionStatus.value = 'reconnecting';
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        reconnectAttempts.value += 1;
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts.value), 10000);

        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
          connect();
        }, delay);
      };

      const eventTypes = [
        'connected',
        'screenshot_analysis',
        'user_message',
        'assistant_message',
        'screenshot',
        'assistant_delta',
        'activity_update',
        'watcher_status',
        'error',
      ];

      eventTypes.forEach((type) => {
        eventSource?.addEventListener(type, (event: MessageEvent) => {
          if (event.lastEventId) {
            lastEventId.value = event.lastEventId;
          }
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.id) {
              lastEventId.value = parsed.id;
            }
            onEvent(type, parsed, event.lastEventId);
          } catch {
            onEvent(type, event.data, event.lastEventId);
          }
        });
      });
    } catch (err) {
      console.error('[Realtime Connection Error]:', err);
      connectionStatus.value = 'disconnected';
    }
  };

  const reconnectNow = () => {
    reconnectAttempts.value = 0;
    connect();
  };

  onMounted(() => {
    isExplicitlyClosed = false;
    connect();
  });

  onUnmounted(() => {
    isExplicitlyClosed = true;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    connectionStatus.value = 'disconnected';
  });

  return {
    connectionStatus,
    lastEventId,
    reconnectNow,
  };
}
