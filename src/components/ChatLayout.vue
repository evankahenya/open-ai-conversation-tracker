<script setup lang="ts">
import { ref } from 'vue';
import {
  ConversationInfo,
  ConversationMessage,
  ConnectionStatusType,
  CurrentActivity,
} from '../types';
import ConversationSidebar from './ConversationSidebar.vue';
import ChatHeader from './ChatHeader.vue';
import ConversationView from './ConversationView.vue';
import MessageComposer from './MessageComposer.vue';
import ImageViewer from './ImageViewer.vue';
import { AlertCircle, X } from 'lucide-vue-next';

const props = defineProps<{
  sessionInfo?: ConversationInfo | null;
  currentActivity?: CurrentActivity | null;
  screenshotCount: number;
  connectionStatus: ConnectionStatusType;
  messages: ConversationMessage[];
  activeStreamingMessage?: any;
  isGenerating?: boolean;
  isCapturing?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  (e: 'send-message', text: string): void;
  (e: 'trigger-capture'): void;
  (e: 'reconnect'): void;
  (e: 'clear-error'): void;
}>();

const isMobileSidebarOpen = ref(false);

const toggleSidebar = () => {
  isMobileSidebarOpen.value = !isMobileSidebarOpen.value;
};

// Modal image state
const selectedImage = ref<{
  isOpen: boolean;
  url: string;
  title?: string;
  timestamp?: string;
}>({
  isOpen: false,
  url: '',
});

const openImageViewer = (url: string, title?: string, timestamp?: string) => {
  selectedImage.value = {
    isOpen: true,
    url,
    title,
    timestamp,
  };
};

const closeImageViewer = () => {
  selectedImage.value.isOpen = false;
};
</script>

<template>
  <div id="chat-layout-root" class="flex h-screen w-screen bg-[#0f1117] text-slate-100 overflow-hidden font-sans">
    <!-- Desktop & Mobile Sidebar -->
    <!-- Mobile Backdrop -->
    <div
      v-if="isMobileSidebarOpen"
      class="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
      @click="isMobileSidebarOpen = false"
    ></div>

    <!-- Sidebar Container -->
    <div
      class="fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-transform duration-200 ease-in-out flex"
      :class="isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <ConversationSidebar
        :session-info="props.sessionInfo"
        :screenshot-count="props.screenshotCount"
        :is-capturing="props.isCapturing"
        @trigger-capture="emit('trigger-capture')"
      />
    </div>

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#0f1117]">
      <!-- Header -->
      <ChatHeader
        :connection-status="props.connectionStatus"
        :current-activity="props.currentActivity"
        :is-capturing="props.isCapturing"
        @toggle-sidebar="toggleSidebar"
        @reconnect="emit('reconnect')"
        @trigger-capture="emit('trigger-capture')"
      />

      <!-- Error Notification Banner if any -->
      <div
        v-if="props.errorMessage"
        class="bg-rose-950/80 border-b border-rose-800/80 px-4 py-2 text-xs text-rose-200 flex items-center justify-between z-10"
      >
        <div class="flex items-center gap-2">
          <AlertCircle class="w-4 h-4 text-rose-400 shrink-0" />
          <span>{{ props.errorMessage }}</span>
        </div>
        <button
          @click="emit('clear-error')"
          class="p-1 rounded text-rose-400 hover:text-white transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Messages View -->
      <ConversationView
        :messages="props.messages"
        :active-streaming-message="props.activeStreamingMessage"
        @view-image="openImageViewer"
      />

      <!-- Message Composer -->
      <MessageComposer
        :is-generating="props.isGenerating"
        :disabled="props.connectionStatus === 'disconnected'"
        @send="(text) => emit('send-message', text)"
      />
    </main>

    <!-- Fullscreen Image Viewer Modal -->
    <ImageViewer
      :is-open="selectedImage.isOpen"
      :image-url="selectedImage.url"
      :title="selectedImage.title"
      :timestamp="selectedImage.timestamp"
      @close="closeImageViewer"
    />
  </div>
</template>
