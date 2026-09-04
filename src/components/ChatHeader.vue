<script setup lang="ts">
import { ConnectionStatusType, CurrentActivity as CurrentActivityType } from '../types';
import ConnectionStatus from './ConnectionStatus.vue';
import CurrentActivity from './CurrentActivity.vue';
import { Menu, PlayCircle, Loader2 } from 'lucide-vue-next';

const props = defineProps<{
  connectionStatus: ConnectionStatusType;
  currentActivity?: CurrentActivityType | null;
  isCapturing?: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-sidebar'): void;
  (e: 'reconnect'): void;
  (e: 'trigger-capture'): void;
}>();
</script>

<template>
  <header
    id="chat-header"
    class="border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-4 py-3 shrink-0 select-none z-10 space-y-3"
  >
    <!-- Top Row: App Title, Status, and Controls -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- Mobile Sidebar Toggle -->
        <button
          id="mobile-sidebar-toggle-btn"
          @click="emit('toggle-sidebar')"
          class="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title="Toggle Sidebar"
        >
          <Menu class="w-5 h-5" />
        </button>

        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-100 text-sm sm:text-base tracking-tight">Screen Monitor</span>
          <span class="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            OpenAI Responses
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <!-- Quick Capture Button in Header -->
        <button
          id="header-capture-btn"
          @click="emit('trigger-capture')"
          :disabled="props.isCapturing"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          title="Trigger a new screenshot capture"
        >
          <Loader2 v-if="props.isCapturing" class="w-3.5 h-3.5 animate-spin text-sky-400" />
          <PlayCircle v-else class="w-3.5 h-3.5 text-sky-400" />
          <span class="hidden sm:inline">{{ props.isCapturing ? 'Capturing...' : 'Capture Frame' }}</span>
        </button>

        <!-- Connection Status Pill -->
        <ConnectionStatus
          :status="props.connectionStatus"
          @reconnect="emit('reconnect')"
        />
      </div>
    </div>

    <!-- Second Row: Current Activity Banner -->
    <CurrentActivity :activity="props.currentActivity" />
  </header>
</template>
