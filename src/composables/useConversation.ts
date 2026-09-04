import { ref, computed } from 'vue';
import {
  ConversationInfo,
  ConversationMessage,
  CurrentActivity,
  ScreenshotAnalysisEvent,
  AssistantMessageEvent,
  UserMessageEvent,
} from '../types';
import {
  fetchConversationInfo,
  fetchMessages,
  sendUserMessageStream,
  triggerWatcherCapture,
  syncEarlierConversation,
  clearConversationEvents,
  setConversationId,
} from '../services/api';

export function useConversation(onContentChange?: () => void) {
  const messages = ref<ConversationMessage[]>([]);
  const conversationId = ref<string | null>(null);
  const sessionInfo = ref<ConversationInfo | null>(null);
  const currentActivity = ref<CurrentActivity | null>(null);
  const isGenerating = ref(false);
  const isCapturing = ref(false);
  const error = ref<string | null>(null);

  // Active streaming message container
  const activeStreamingMessage = ref<{
    id: string;
    content: string;
    type: 'assistant_message' | 'screenshot_analysis';
    screenshot?: string;
    screenshotUrl?: string;
  } | null>(null);

  const screenshotCount = computed(() => {
    return (
      sessionInfo.value?.screenshotCount ??
      messages.value.filter((m) => m.type === 'screenshot_analysis').length
    );
  });

  const loadInitialData = async () => {
    try {
      error.value = null;
      const [info, history] = await Promise.all([
        fetchConversationInfo(),
        fetchMessages(),
      ]);

      conversationId.value = info.conversationId;
      sessionInfo.value = info;
      currentActivity.value = info.currentActivity || null;
      messages.value = history.events || [];

      onContentChange?.();
    } catch (err: any) {
      console.error('[Failed to load conversation]:', err);
      error.value = err.message || 'Failed to connect to backend';
    }
  };

  const reconcileMissedEvents = async (sinceId?: string) => {
    try {
      const history = await fetchMessages(sinceId);
      if (history.events && history.events.length > 0) {
        const existingIds = new Set(messages.value.map((m) => m.id));
        for (const evt of history.events) {
          if (!existingIds.has(evt.id)) {
            messages.value.push(evt);
            existingIds.add(evt.id);
          }
        }
        onContentChange?.();
      }

      // Also refresh session statistics
      const info = await fetchConversationInfo();
      sessionInfo.value = info;
      if (info.currentActivity) {
        currentActivity.value = info.currentActivity;
      }
    } catch (err) {
      console.error('[Failed to reconcile missed events]:', err);
    }
  };

  const handleRealtimeEvent = (eventType: string, data: any) => {
    if (!data) return;

    switch (eventType) {
      case 'screenshot': {
        // A new screenshot was observed by the watcher!
        // Prepare streaming analysis card
        activeStreamingMessage.value = {
          id: `pending_${Date.now()}`,
          type: 'screenshot_analysis',
          screenshot: data.data?.filename || 'screenshot.jpg',
          screenshotUrl: data.data?.url || `/api/screenshots/${data.data?.filename}`,
          content: '',
        };
        onContentChange?.();
        break;
      }

      case 'assistant_delta': {
        const delta = data.data?.delta || data.delta || '';
        if (activeStreamingMessage.value) {
          activeStreamingMessage.value.content += delta;
        } else {
          activeStreamingMessage.value = {
            id: `stream_${Date.now()}`,
            type: 'assistant_message',
            content: delta,
          };
        }
        onContentChange?.();
        break;
      }

      case 'screenshot_analysis': {
        const event = data as ScreenshotAnalysisEvent;
        // Check for duplicates
        const existingIdx = messages.value.findIndex((m) => m.id === event.id);
        if (existingIdx !== -1) {
          messages.value[existingIdx] = event;
        } else {
          messages.value.push(event);
        }

        // Clear active streaming container if it matched
        if (
          activeStreamingMessage.value &&
          activeStreamingMessage.value.type === 'screenshot_analysis'
        ) {
          activeStreamingMessage.value = null;
        }

        if (event.activity) {
          currentActivity.value = event.activity;
        }

        if (sessionInfo.value) {
          sessionInfo.value.screenshotCount = (sessionInfo.value.screenshotCount || 0) + 1;
          sessionInfo.value.lastUpdate = event.timestamp;
        }

        onContentChange?.();
        break;
      }

      case 'user_message': {
        const event = data as UserMessageEvent;
        const exists = messages.value.some((m) => m.id === event.id);
        if (!exists) {
          messages.value.push(event);
          onContentChange?.();
        }
        break;
      }

      case 'assistant_message': {
        const event = data as AssistantMessageEvent;
        const existingIdx = messages.value.findIndex((m) => m.id === event.id);
        if (existingIdx !== -1) {
          messages.value[existingIdx] = event;
        } else {
          messages.value.push(event);
        }

        activeStreamingMessage.value = null;
        isGenerating.value = false;
        onContentChange?.();
        break;
      }

      case 'activity_update': {
        if (data.data) {
          currentActivity.value = data.data;
        } else if (data.application) {
          currentActivity.value = data;
        }
        break;
      }

      case 'error': {
        error.value = data.error || 'Realtime event error';
        isGenerating.value = false;
        activeStreamingMessage.value = null;
        break;
      }
    }
  };

  const sendMessage = (text: string) => {
    if (!text.trim() || isGenerating.value) return;

    const trimmed = text.trim();
    isGenerating.value = true;
    error.value = null;

    // Optimistically add user message if needed (server also broadcasts it)
    const tempUserMessage: UserMessageEvent = {
      id: `evt_usr_temp_${Date.now()}`,
      type: 'user_message',
      conversationId: conversationId.value || 'conv_abc123',
      timestamp: new Date().toISOString(),
      content: trimmed,
    };
    messages.value.push(tempUserMessage);

    // Initialize active streaming message placeholder
    activeStreamingMessage.value = {
      id: `stream_${Date.now()}`,
      type: 'assistant_message',
      content: '',
    };

    onContentChange?.();

    sendUserMessageStream(trimmed, {
      onDelta: (delta: string) => {
        if (activeStreamingMessage.value) {
          activeStreamingMessage.value.content += delta;
          onContentChange?.();
        }
      },
      onComplete: (completedEvent: AssistantMessageEvent) => {
        // Deduplicate and push
        const existingIdx = messages.value.findIndex(
          (m) => m.id === completedEvent.id
        );
        if (existingIdx !== -1) {
          messages.value[existingIdx] = completedEvent;
        } else {
          messages.value.push(completedEvent);
        }

        activeStreamingMessage.value = null;
        isGenerating.value = false;
        onContentChange?.();
      },
      onError: (err: Error) => {
        console.error('[Send Message Error]:', err);
        error.value = err.message || 'Failed to get response from AI';
        isGenerating.value = false;
        activeStreamingMessage.value = null;
      },
    });
  };

  const triggerCapture = async () => {
    if (isCapturing.value) return;
    isCapturing.value = true;
    try {
      await triggerWatcherCapture();
    } catch (err: any) {
      error.value = err.message || 'Failed to trigger capture';
    } finally {
      setTimeout(() => {
        isCapturing.value = false;
      }, 1200);
    }
  };

  const isSyncing = ref(false);

  const syncHistory = async (targetId?: string) => {
    if (isSyncing.value) return;
    isSyncing.value = true;
    error.value = null;
    try {
      const res = await syncEarlierConversation(targetId);
      messages.value = res.events;
      await loadInitialData();
    } catch (err: any) {
      console.error('[Failed to sync earlier conversation]:', err);
      error.value = err.message || 'Failed to sync earlier conversation from OpenAI';
    } finally {
      isSyncing.value = false;
    }
  };

  const clearEvents = async () => {
    try {
      await clearConversationEvents();
      messages.value = [];
      await loadInitialData();
    } catch (err: any) {
      error.value = err.message || 'Failed to clear events';
    }
  };

  const updateConvId = async (newId: string) => {
    try {
      await setConversationId(newId);
      await syncHistory(newId);
    } catch (err: any) {
      error.value = err.message || 'Failed to update conversation ID';
    }
  };

  return {
    messages,
    conversationId,
    sessionInfo,
    currentActivity,
    screenshotCount,
    isGenerating,
    isCapturing,
    isSyncing,
    activeStreamingMessage,
    error,
    loadInitialData,
    reconcileMissedEvents,
    handleRealtimeEvent,
    sendMessage,
    triggerCapture,
    syncHistory,
    clearEvents,
    updateConvId,
  };
}
