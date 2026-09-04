<script setup lang="ts">
import { onMounted } from 'vue';
import ChatLayout from './components/ChatLayout.vue';
import { useConversation } from './composables/useConversation';
import { useRealtime } from './composables/useRealtime';

const {
  messages,
  sessionInfo,
  currentActivity,
  screenshotCount,
  isGenerating,
  isCapturing,
  activeStreamingMessage,
  error,
  loadInitialData,
  reconcileMissedEvents,
  handleRealtimeEvent,
  sendMessage,
  triggerCapture,
} = useConversation();

const { connectionStatus, lastEventId, reconnectNow } = useRealtime(
  (eventType, data) => {
    handleRealtimeEvent(eventType, data);
  },
  () => {
    // Reconnection callback: synchronize any missed events
    reconcileMissedEvents(lastEventId.value || undefined);
  }
);

onMounted(() => {
  loadInitialData();
});
</script>

<template>
  <ChatLayout
    :session-info="sessionInfo"
    :current-activity="currentActivity"
    :screenshot-count="screenshotCount"
    :connection-status="connectionStatus"
    :messages="messages"
    :active-streaming-message="activeStreamingMessage"
    :is-generating="isGenerating"
    :is-capturing="isCapturing"
    :error-message="error"
    @send-message="sendMessage"
    @trigger-capture="triggerCapture"
    @reconnect="reconnectNow"
    @clear-error="error = null"
  />
</template>
