<script setup lang="ts">
import { ConnectionStatusType } from '../types';
import { RefreshCw, Wifi, WifiOff } from 'lucide-vue-next';

const props = defineProps<{
  status: ConnectionStatusType;
}>();

const emit = defineEmits<{
  (e: 'reconnect'): void;
}>();
</script>

<template>
  <button
    id="connection-status-btn"
    @click="props.status !== 'connected' && emit('reconnect')"
    class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer select-none"
    :class="{
      'bg-emerald-950/40 text-emerald-400 border-emerald-800/50 hover:bg-emerald-900/40':
        props.status === 'connected',
      'bg-amber-950/40 text-amber-400 border-amber-800/50 hover:bg-amber-900/40':
        props.status === 'reconnecting',
      'bg-rose-950/40 text-rose-400 border-rose-800/50 hover:bg-rose-900/40':
        props.status === 'disconnected',
    }"
    :title="props.status !== 'connected' ? 'Click to reconnect now' : 'Real-time event channel connected'"
  >
    <!-- Dot Indicator -->
    <span class="relative flex h-2 w-2">
      <span
        v-if="props.status === 'connected'"
        class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
      ></span>
      <span
        class="relative inline-flex rounded-full h-2 w-2"
        :class="{
          'bg-emerald-400': props.status === 'connected',
          'bg-amber-400 animate-pulse': props.status === 'reconnecting',
          'bg-rose-400': props.status === 'disconnected',
        }"
      ></span>
    </span>

    <!-- Label -->
    <span v-if="props.status === 'connected'" class="flex items-center gap-1">
      <Wifi class="w-3 h-3 inline" />
      Connected
    </span>
    <span v-else-if="props.status === 'reconnecting'" class="flex items-center gap-1">
      <RefreshCw class="w-3 h-3 animate-spin inline" />
      Reconnecting...
    </span>
    <span v-else class="flex items-center gap-1">
      <WifiOff class="w-3 h-3 inline" />
      Disconnected
    </span>
  </button>
</template>
