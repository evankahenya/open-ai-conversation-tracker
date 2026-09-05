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
  isSyncing?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  (e: 'send-message', text: string): void;
  (e: 'trigger-capture'): void;
  (e: 'sync-history'): void;
  (e: 'clear-events'): void;
  (e: 'update-conversation-id', newId: string): void;
  (e: 'reconnect'): void;
  (e: 'clear-error'): void;
}>();

// Sidebar state: open by default, can be toggled closed so the main screen occupies 100% full width
const isSidebarOpen = ref(true);

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

const closeSidebar = () => {
  isSidebarOpen.value = false;
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
    <!-- Mobile Backdrop (only when open on mobile) -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
      @click="closeSidebar"
    ></div>

    <!-- Collapsible Sidebar Container -->
    <div
      id="collapsible-sidebar-container"
      class="fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out flex shrink-0 lg:relative"
      :class="[
        isSidebarOpen
          ? 'w-64 sm:w-72 translate-x-0 opacity-100'
          : 'w-0 max-w-0 -translate-x-full opacity-0 pointer-events-none overflow-hidden',
      ]"
    >
      <ConversationSidebar
        :session-info="props.sessionInfo"
        :screenshot-count="props.screenshotCount"
        :is-capturing="props.isCapturing"
        :is-syncing="props.isSyncing"
        @trigger-capture="emit('trigger-capture')"
        @sync-history="emit('sync-history')"
        @clear-events="emit('clear-events')"
        @update-conversation-id="(id) => emit('update-conversation-id', id)"
        @close-sidebar="closeSidebar"
      />
    </div>

    <!-- Main Content Area: Takes 100% full width when sidebar is hidden -->
    <main class="flex-1 flex flex-col min-w-0 w-full h-full overflow-hidden bg-[#0f1117] transition-all duration-300">
      <!-- Minimal Header: Focused strictly on conversation thread -->
      <ChatHeader
        :connection-status="props.connectionStatus"
        :is-capturing="props.isCapturing"
        :is-sidebar-open="isSidebarOpen"
        :conversation-id="props.sessionInfo?.conversationId"
        :is-syncing="props.isSyncing"
        @toggle-sidebar="toggleSidebar"
        @reconnect="emit('reconnect')"
        @trigger-capture="emit('trigger-capture')"
        @update-conversation-id="(id) => emit('update-conversation-id', id)"
        @sync-history="emit('sync-history')"
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
          class="p-1 rounded text-rose-400 hover:text-white transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Messages View: The main focus of the application -->
      <ConversationView
        :messages="props.messages"
        :active-streaming-message="props.activeStreamingMessage"
        @view-image="openImageViewer"
      />

      <!-- Message Composer -->
      <MessageComposer
        :is-generating="props.isGenerating"
        :is-syncing="props.isSyncing"
        :disabled="props.connectionStatus === 'disconnected'"
        @send="(text) => emit('send-message', text)"
        @sync="emit('sync-history')"
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
