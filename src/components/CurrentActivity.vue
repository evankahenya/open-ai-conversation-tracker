<script setup lang="ts">
import { CurrentActivity } from '../types';
import { Activity, AppWindow, Clock } from 'lucide-vue-next';

const props = defineProps<{
  activity?: CurrentActivity | null;
}>();

const formatTime = (iso?: string) => {
  if (!iso) return 'Just now';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
};
</script>

<template>
  <div
    id="current-activity-panel"
    class="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 shadow-sm backdrop-blur-md"
  >
    <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
      <div class="flex items-center gap-1.5 font-semibold text-slate-200 uppercase tracking-wider text-[10px]">
        <Activity class="w-3.5 h-3.5 text-indigo-400" />
        <span>Current Activity</span>
      </div>
      <div class="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
        <Clock class="w-3 h-3 text-slate-500" />
        <span>{{ formatTime(props.activity?.lastUpdate) }}</span>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class="flex items-start gap-2">
        <div class="p-1 rounded bg-slate-800 text-slate-400 mt-0.5">
          <AppWindow class="w-3.5 h-3.5 text-sky-400" />
        </div>
        <div>
          <span class="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Application</span>
          <span class="text-slate-100 font-medium text-xs">{{ props.activity?.application || 'Monitoring desktop...' }}</span>
        </div>
      </div>

      <div>
        <span class="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Detected Context</span>
        <p class="text-slate-300 text-xs truncate max-w-xs" :title="props.activity?.activity">
          {{ props.activity?.activity || 'Analyzing desktop frames...' }}
        </p>
      </div>
    </div>
  </div>
</template>
