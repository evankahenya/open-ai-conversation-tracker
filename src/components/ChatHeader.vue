<script setup lang="ts">
import { ref } from 'vue';
import { ConnectionStatusType } from '../types';
import ConnectionStatus from './ConnectionStatus.vue';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PlayCircle,
  Loader2,
  Hash,
  Edit3,
  RefreshCw,
  Check,
  X,
} from 'lucide-vue-next';

const props = defineProps<{
  connectionStatus: ConnectionStatusType;
  isCapturing?: boolean;
  isSidebarOpen: boolean;
  conversationId?: string;
  isSyncing?: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-sidebar'): void;
  (e: 'reconnect'): void;
  (e: 'trigger-capture'): void;
  (e: 'update-conversation-id', newId: string): void;
  (e: 'sync-history'): void;
}>();

const isEditingConvId = ref(false);
const inputConvId = ref('');

const openEditModal = () => {
  inputConvId.value = props.conversationId || '';
  isEditingConvId.value = true;
};

const cancelEdit = () => {
  isEditingConvId.value = false;
};

const applyConvId = () => {
  if (inputConvId.value.trim()) {
    emit('update-conversation-id', inputConvId.value.trim());
  }
  isEditingConvId.value = false;
};
</script>

<template>
  <header
    id="chat-header"
    class="border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-4 py-2.5 shrink-0 select-none z-20"
  >
    <!-- Single Sleek Top Row: Main focus on conversation thread -->
    <div class="flex items-center justify-between gap-3">
      <!-- Left: Sidebar Toggle, Title, Conversation ID -->
      <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <!-- Sidebar Toggle Button (Desktop & Mobile) -->
        <button
          id="sidebar-toggle-btn"
          @click="emit('toggle-sidebar')"
          class="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 active:bg-slate-800 border border-slate-800 transition-all cursor-pointer flex items-center justify-center shrink-0"
          :title="props.isSidebarOpen ? 'Hide sidebar (Full width mode)' : 'Show sidebar'"
        >
          <PanelLeftClose v-if="props.isSidebarOpen" class="w-4 h-4 text-sky-400" />
          <PanelLeftOpen v-else class="w-4 h-4 text-slate-300" />
        </button>

        <div class="flex items-center gap-2 shrink-0">
          <span class="font-bold text-slate-100 text-sm sm:text-base tracking-tight">Screen Monitor</span>
        </div>

        <!-- Manual Conversation ID Badge / Quick Edit -->
        <div class="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-800">
          <button
            id="header-conv-id-badge"
            @click="openEditModal"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-slate-100 text-xs transition-colors cursor-pointer group"
            title="Click to manually enter or change OpenAI Conversation ID"
          >
            <Hash class="w-3.5 h-3.5 text-indigo-400" />
            <span class="font-mono text-[11px] max-w-[130px] md:max-w-[200px] truncate">
              {{ props.conversationId || 'No Conversation ID' }}
            </span>
            <Edit3 class="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </button>

          <!-- Quick Sync from OpenAI Button -->
          <button
            id="header-quick-sync-btn"
            @click="emit('sync-history')"
            :disabled="props.isSyncing"
            class="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer disabled:opacity-50"
            title="Sync earlier messages from OpenAI"
          >
            <Loader2 v-if="props.isSyncing" class="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <RefreshCw v-else class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Right: Capture & Status Controls -->
      <div class="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <!-- Quick Capture Button in Header -->
        <button
          id="header-capture-btn"
          @click="emit('trigger-capture')"
          :disabled="props.isCapturing"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-800/90 border border-slate-700/80 text-xs font-semibold text-slate-200 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          title="Trigger a new screenshot capture"
        >
          <Loader2 v-if="props.isCapturing" class="w-3.5 h-3.5 animate-spin text-sky-400" />
          <PlayCircle v-else class="w-3.5 h-3.5 text-sky-400" />
          <span class="hidden md:inline">{{ props.isCapturing ? 'Capturing...' : 'Capture Frame' }}</span>
        </button>

        <!-- Connection Status Pill -->
        <ConnectionStatus
          :status="props.connectionStatus"
          @reconnect="emit('reconnect')"
        />
      </div>
    </div>

    <!-- Modal Dialog: Manually Enter Conversation ID -->
    <div
      v-if="isEditingConvId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      @click.self="cancelEdit"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div class="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <Hash class="w-4 h-4 text-indigo-400" />
            <span>Enter Conversation ID</span>
          </div>
          <button
            @click="cancelEdit"
            class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="applyConvId" class="p-5 space-y-4">
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-slate-300">
              OpenAI Conversation ID
            </label>
            <p class="text-[11px] text-slate-400">
              Enter an existing conversation ID created through the OpenAI SDK to stream earlier messages and continue the session.
            </p>
            <input
              id="manual-conversation-id-input"
              v-model="inputConvId"
              type="text"
              autofocus
              placeholder="e.g. conv_67c74e84b80c8191a3c004c23f11e..."
              class="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-700 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              @click="cancelEdit"
              class="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-conversation-id-btn"
              type="submit"
              :disabled="!inputConvId.trim()"
              class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Check class="w-3.5 h-3.5" />
              <span>Connect & Sync</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </header>
</template>
