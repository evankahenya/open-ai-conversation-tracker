<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { ConversationMessage } from '../types';
import ScreenshotMessage from './ScreenshotMessage.vue';
import UserMessage from './UserMessage.vue';
import AssistantMessage from './AssistantMessage.vue';
import { useAutoScroll } from '../composables/useAutoScroll';
import { ArrowDown, Bot, Monitor } from 'lucide-vue-next';

const props = defineProps<{
  messages: ConversationMessage[];
  activeStreamingMessage?: {
    id: string;
    content: string;
    type: 'assistant_message' | 'screenshot_analysis';
    screenshot?: string;
    screenshotUrl?: string;
  } | null;
}>();

const emit = defineEmits<{
  (e: 'view-image', url: string, title?: string, timestamp?: string): void;
}>();

const scrollContainerRef = ref<HTMLElement | null>(null);
const { isUserScrolledUp, showScrollButton, unreadCount, scrollToBottom, notifyNewContent } =
  useAutoScroll(scrollContainerRef);

// Ensure messages are rendered strictly in chronological order:
// Oldest messages appear at the top, and the most recent AI response appears at the bottom.
const sortedMessages = computed(() => {
  return [...props.messages].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    if (isNaN(timeA) || isNaN(timeB) || timeA === timeB) {
      return 0;
    }
    return timeA - timeB;
  });
});

// Watch for changes in message count, last message ID, or streaming content to trigger auto-scroll
watch(
  () => [
    props.messages.length,
    props.messages[props.messages.length - 1]?.id,
    props.messages[props.messages.length - 1]?.content,
    props.activeStreamingMessage?.content,
  ],
  () => {
    notifyNewContent();
  },
  { deep: true }
);

onMounted(() => {
  scrollToBottom(false);
  setTimeout(() => scrollToBottom(false), 60);
  setTimeout(() => scrollToBottom(false), 200);
});
</script>

<template>
  <div class="relative flex-1 overflow-hidden flex flex-col bg-[#0f1117]">
    <!-- Scrollable Messages Area -->
    <div
      id="conversation-scroll-container"
      ref="scrollContainerRef"
      class="flex-1 overflow-y-auto divide-y divide-slate-900 scroll-smooth"
    >
      <!-- Empty State -->
      <div
        v-if="sortedMessages.length === 0 && !props.activeStreamingMessage"
        class="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3"
      >
        <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 shadow-sm">
          <Monitor class="w-8 h-8 text-indigo-400" />
        </div>
        <div class="max-w-md space-y-1.5">
          <h3 class="text-sm font-semibold text-slate-200">Zero Dummy Data — Ready for Real OpenAI Conversation</h3>
          <p class="text-xs text-slate-400">
            No dummy or simulated events are loaded. Auto-sync is active in the background. You can also send a new question below to stream live with the OpenAI Responses API.
          </p>
        </div>
      </div>

      <!-- Messages Stream (Oldest at top, most recent at bottom) -->
      <template v-for="msg in sortedMessages" :key="msg.id">
        <!-- Screenshot Analysis Event -->
        <ScreenshotMessage
          v-if="msg.type === 'screenshot_analysis'"
          :message="msg"
          @view-image="(url, title, timestamp) => emit('view-image', url, title, timestamp)"
        />

        <!-- User Message Event -->
        <UserMessage
          v-else-if="msg.type === 'user_message'"
          :message="msg"
        />

        <!-- Assistant Message Event -->
        <AssistantMessage
          v-else-if="msg.type === 'assistant_message'"
          :message="msg"
        />
      </template>

      <!-- Active In-Flight Streaming Message (if streaming a response or screenshot analysis) -->
      <template v-if="props.activeStreamingMessage">
        <!-- Streaming Screenshot Analysis -->
        <div
          v-if="props.activeStreamingMessage.type === 'screenshot_analysis'"
          class="py-5 border-b border-slate-800/60 bg-slate-900/30 animate-pulse"
        >
          <div class="max-w-4xl mx-auto px-4 space-y-4">
            <!-- Screenshot Preview Card -->
            <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden max-w-xl">
              <div class="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400">
                <span class="font-bold text-sky-400 uppercase text-[11px]">Screenshot (Analyzing)</span>
                <span class="font-mono text-[11px]">{{ props.activeStreamingMessage.screenshot }}</span>
              </div>
              <div
                v-if="props.activeStreamingMessage.screenshotUrl"
                class="bg-slate-950 flex items-center justify-center cursor-pointer"
                @click="emit('view-image', props.activeStreamingMessage.screenshotUrl!, props.activeStreamingMessage.screenshot)"
              >
                <img
                  :src="props.activeStreamingMessage.screenshotUrl"
                  :alt="props.activeStreamingMessage.screenshot"
                  class="w-full max-h-72 object-contain aspect-video"
                />
              </div>
            </div>

            <!-- Streaming AI Text -->
            <div class="flex items-start gap-4">
              <div class="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot class="w-4 h-4" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="text-xs font-bold tracking-wider text-emerald-400 uppercase">AI Analyzing Frame</span>
                  <span class="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Streaming...
                  </span>
                </div>
                <div class="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {{ props.activeStreamingMessage.content || 'Analyzing screen elements and extracting desktop context...' }}
                  <span class="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse align-middle"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Streaming User Response -->
        <AssistantMessage
          v-else
          :message="{
            id: props.activeStreamingMessage.id,
            type: 'assistant_message',
            conversationId: '',
            timestamp: new Date().toISOString(),
            content: props.activeStreamingMessage.content,
          }"
          :is-streaming="true"
        />
      </template>
    </div>

    <!-- Floating "↓ New activity" Button -->
    <div
      v-if="showScrollButton"
      class="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-bounce"
    >
      <button
        id="scroll-to-bottom-btn"
        @click="scrollToBottom(true)"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold shadow-xl border border-slate-600 transition-all cursor-pointer backdrop-blur-md"
      >
        <ArrowDown class="w-3.5 h-3.5 text-sky-400" />
        <span>New activity</span>
        <span
          v-if="unreadCount > 0"
          class="px-1.5 py-0.2 rounded-full bg-sky-500 text-[10px] font-bold text-white"
        >
          {{ unreadCount }}
        </span>
      </button>
    </div>
  </div>
</template>
