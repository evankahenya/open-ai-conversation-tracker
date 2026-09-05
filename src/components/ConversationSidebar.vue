<script setup lang="ts">
import { ref } from 'vue';
import { ConversationInfo } from '../types';
import {
  Monitor,
  Camera,
  Clock,
  Copy,
  Check,
  FolderSync,
  PlayCircle,
  Loader2,
  HardDrive,
  RefreshCw,
  Trash2,
  Edit3,
  PanelLeftClose,
  Hash,
} from 'lucide-vue-next';

const props = defineProps<{
  sessionInfo?: ConversationInfo | null;
  screenshotCount: number;
  isCapturing?: boolean;
  isSyncing?: boolean;
}>();

const emit = defineEmits<{
  (e: 'trigger-capture'): void;
  (e: 'sync-history'): void;
  (e: 'clear-events'): void;
  (e: 'update-conversation-id', newId: string): void;
  (e: 'close-sidebar'): void;
}>();

const copied = ref(false);
const isEditingId = ref(false);
const manualConvIdInput = ref('');

const copyConversationId = async () => {
  if (!props.sessionInfo?.conversationId) return;
  try {
    await navigator.clipboard.writeText(props.sessionInfo.conversationId);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Clipboard copy failed:', err);
  }
};

const startEditId = () => {
  manualConvIdInput.value = props.sessionInfo?.conversationId || '';
  isEditingId.value = true;
};

const saveNewId = () => {
  if (manualConvIdInput.value.trim()) {
    emit('update-conversation-id', manualConvIdInput.value.trim());
  }
  isEditingId.value = false;
};

const formatTime = (iso?: string) => {
  if (!iso) return '--:--';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};
</script>

<template>
  <aside
    id="conversation-sidebar"
    class="w-64 sm:w-72 h-full bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none overflow-y-auto"
  >
    <!-- Top Section -->
    <div class="p-4 space-y-4">
      <!-- App Brand Header + Collapse Button -->
      <div class="flex items-center justify-between px-1 py-1">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 text-sky-400 shadow-sm">
            <Monitor class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-sm font-bold text-slate-100 tracking-tight">Screen Monitor</h1>
            <p class="text-[11px] text-slate-400">Desktop AI</p>
          </div>
        </div>

        <!-- Button to hide sidebar so main screen occupies full width -->
        <button
          id="sidebar-close-btn"
          @click="emit('close-sidebar')"
          class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Hide sidebar (Full width mode)"
        >
          <PanelLeftClose class="w-4 h-4 text-slate-400 hover:text-sky-400" />
        </button>
      </div>

      <!-- Action: Trigger Screenshot -->
      <button
        id="sidebar-capture-btn"
        @click="emit('trigger-capture')"
        :disabled="props.isCapturing"
        class="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-800/90 border border-slate-700/70 text-slate-200 text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        <Loader2 v-if="props.isCapturing" class="w-4 h-4 animate-spin text-sky-400" />
        <PlayCircle v-else class="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
        <span>{{ props.isCapturing ? 'Capturing Frame...' : 'Capture Screenshot Now' }}</span>
      </button>

      <!-- Sync from OpenAI Button (Genuine SDK sync) -->
      <button
        id="sidebar-sync-btn"
        @click="emit('sync-history')"
        :disabled="props.isSyncing"
        class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 active:bg-indigo-900/70 border border-indigo-700/50 text-indigo-200 text-xs font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        title="Fetch earlier conversation items directly from OpenAI API using official SDK"
      >
        <Loader2 v-if="props.isSyncing" class="w-3.5 h-3.5 animate-spin text-indigo-400" />
        <RefreshCw v-else class="w-3.5 h-3.5 text-indigo-400" />
        <span>{{ props.isSyncing ? 'Syncing from OpenAI...' : 'Sync Earlier from OpenAI' }}</span>
      </button>

      <!-- Manually Enter Conversation ID Panel -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
          <div class="flex items-center gap-1.5 text-slate-300 font-semibold text-xs">
            <Hash class="w-3.5 h-3.5 text-indigo-400" />
            <span>Conversation ID</span>
          </div>
          <button
            v-if="!isEditingId"
            @click="startEditId"
            class="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
          >
            <Edit3 class="w-3 h-3" />
            <span>Change</span>
          </button>
        </div>

        <!-- Normal Mode: Display current ID + Copy -->
        <div v-if="!isEditingId" class="space-y-2">
          <div class="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
            <span class="truncate max-w-[155px]" :title="props.sessionInfo?.conversationId">
              {{ props.sessionInfo?.conversationId || 'No active ID' }}
            </span>
            <button
              id="copy-conv-id-btn"
              @click="copyConversationId"
              class="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
              :title="copied ? 'Copied!' : 'Copy ID'"
            >
              <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-400" />
              <Copy v-else class="w-3.5 h-3.5" />
            </button>
          </div>
          <p class="text-[10px] text-slate-500">
            Click "Change" to manually enter an existing OpenAI Conversation ID.
          </p>
        </div>

        <!-- Edit / Manual Entry Mode -->
        <div v-else class="space-y-2 pt-1">
          <label class="block text-[11px] text-slate-400 font-medium">
            Enter Conversation ID:
          </label>
          <input
            v-model="manualConvIdInput"
            type="text"
            autofocus
            placeholder="e.g. conv_67c74e84b80..."
            class="w-full bg-slate-950 px-2.5 py-1.5 rounded-lg border border-indigo-500/70 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            @keyup.enter="saveNewId"
          />
          <div class="flex items-center justify-end gap-1.5 text-[11px]">
            <button
              @click="isEditingId = false"
              class="px-2.5 py-1 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="saveNewId"
              :disabled="!manualConvIdInput.trim()"
              class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium rounded-lg shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Save & Connect
            </button>
          </div>
        </div>
      </div>

      <!-- Session Information Panel -->
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Session Status</span>
          <span class="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Active
          </span>
        </div>

        <!-- Metric Grid -->
        <div class="grid grid-cols-2 gap-2">
          <!-- Screenshots Count -->
          <div class="bg-slate-950/80 p-2 rounded-lg border border-slate-800/80">
            <div class="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
              <Camera class="w-3 h-3 text-sky-400" />
              <span>Screenshots</span>
            </div>
            <span class="text-base font-bold text-slate-100 font-mono">
              {{ props.screenshotCount }}
            </span>
          </div>

          <!-- Session Started -->
          <div class="bg-slate-950/80 p-2 rounded-lg border border-slate-800/80">
            <div class="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
              <Clock class="w-3 h-3 text-amber-400" />
              <span>Started</span>
            </div>
            <span class="text-xs font-semibold text-slate-200 font-mono">
              {{ formatTime(props.sessionInfo?.sessionStarted) }}
            </span>
          </div>
        </div>

        <!-- Last Update -->
        <div class="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <span>Last Activity:</span>
          <span class="font-mono text-slate-300">{{ formatTime(props.sessionInfo?.lastUpdate) }}</span>
        </div>
      </div>

      <!-- Clear Dummy / Local Events -->
      <button
        @click="emit('clear-events')"
        class="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 hover:text-rose-300 hover:bg-rose-950/20 hover:border-rose-900/40 transition-colors cursor-pointer"
      >
        <Trash2 class="w-3 h-3" />
        <span>Clear Event History</span>
      </button>

      <!-- Architecture details -->
      <div class="bg-slate-900/40 border border-slate-800/70 rounded-xl p-3 text-xs space-y-1.5">
        <div class="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
          <FolderSync class="w-3.5 h-3.5 text-indigo-400" />
          <span>OpenAI SDK Pipeline</span>
        </div>

        <div class="space-y-1 text-[11px] font-mono text-slate-400">
          <div class="flex items-center justify-between">
            <span>Watch dir:</span>
            <span class="text-slate-300 bg-slate-800/60 px-1.5 py-0.5 rounded">data/watch/</span>
          </div>
          <div class="flex items-center justify-between">
            <span>Data State:</span>
            <span class="text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded text-[10px]">Zero Dummy Data</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Footer -->
    <div class="p-3 border-t border-slate-900 text-[10px] text-slate-400 flex items-center justify-between">
      <span class="flex items-center gap-1">
        <HardDrive class="w-3 h-3 text-slate-500" />
        OpenAI Responses API
      </span>
      <span>Vue 3 + Vite</span>
    </div>
  </aside>
</template>
