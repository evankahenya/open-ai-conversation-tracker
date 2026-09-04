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
  Info,
} from 'lucide-vue-next';

const props = defineProps<{
  sessionInfo?: ConversationInfo | null;
  screenshotCount: number;
  isCapturing?: boolean;
}>();

const emit = defineEmits<{
  (e: 'trigger-capture'): void;
}>();

const copied = ref(false);

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
    class="w-64 sm:w-72 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none overflow-y-auto"
  >
    <!-- Top Section -->
    <div class="p-4 space-y-5">
      <!-- App Brand Header -->
      <div class="flex items-center gap-2.5 px-1 py-1">
        <div class="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 text-sky-400 shadow-sm">
          <Monitor class="w-5 h-5" />
        </div>
        <div>
          <h1 class="text-sm font-bold text-slate-100 tracking-tight">Screen Monitor</h1>
          <p class="text-[11px] text-slate-400">Continuous Desktop AI</p>
        </div>
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

      <!-- Session Information Panel -->
      <div class="bg-slate-900/70 border border-slate-800/90 rounded-xl p-3.5 space-y-3">
        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Session Details</span>
          <span class="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Monitoring
          </span>
        </div>

        <!-- Conversation ID -->
        <div>
          <span class="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Conversation ID
          </span>
          <div class="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
            <span class="truncate max-w-[140px]" :title="props.sessionInfo?.conversationId">
              {{ props.sessionInfo?.conversationId || 'conv_abc123' }}
            </span>
            <button
              id="copy-conv-id-btn"
              @click="copyConversationId"
              class="text-slate-400 hover:text-white p-1 rounded transition-colors"
              :title="copied ? 'Copied!' : 'Copy ID'"
            >
              <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-400" />
              <Copy v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Metric Grid -->
        <div class="grid grid-cols-2 gap-2 pt-1">
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
        <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>Last Update:</span>
          <span class="font-mono text-slate-300">{{ formatTime(props.sessionInfo?.lastUpdate) }}</span>
        </div>
      </div>

      <!-- Watcher Architecture Card -->
      <div class="bg-slate-900/50 border border-slate-800/70 rounded-xl p-3 text-xs space-y-2">
        <div class="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
          <FolderSync class="w-3.5 h-3.5 text-indigo-400" />
          <span>Watcher Pipeline</span>
        </div>

        <div class="space-y-1.5 text-[11px] font-mono text-slate-400">
          <div class="flex items-center justify-between">
            <span>Watch dir:</span>
            <span class="text-slate-300 bg-slate-800/60 px-1.5 py-0.5 rounded">data/watch/</span>
          </div>
          <div class="flex items-center justify-between">
            <span>Store:</span>
            <span class="text-slate-300 bg-slate-800/60 px-1.5 py-0.5 rounded">data/events.json</span>
          </div>
          <div class="flex items-center justify-between">
            <span>Engine:</span>
            <span class="text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">OpenAI Responses</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Footer -->
    <div class="p-3 border-t border-slate-900 text-[10px] text-slate-400 flex items-center justify-between">
      <span class="flex items-center gap-1">
        <HardDrive class="w-3 h-3 text-slate-500" />
        Local Event Store
      </span>
      <span>Vue 3 + Vite</span>
    </div>
  </aside>
</template>
