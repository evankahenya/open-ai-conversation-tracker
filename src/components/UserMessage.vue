<script setup lang="ts">
import { UserMessageEvent } from '../types';
import { User } from 'lucide-vue-next';

const props = defineProps<{
  message: UserMessageEvent;
}>();

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
};
</script>

<template>
  <div :id="`user-msg-${props.message.id}`" class="py-4 border-b border-slate-800/60 transition-colors">
    <div class="max-w-4xl mx-auto flex items-start gap-4 px-4">
      <!-- User Avatar / Tag -->
      <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
        <User class="w-4 h-4" />
      </div>

      <!-- Message Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-xs font-bold tracking-wider text-indigo-400 uppercase">You</span>
          <span class="text-[11px] text-slate-500 font-mono">{{ formatTime(props.message.timestamp) }}</span>
        </div>

        <div class="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap font-sans">
          {{ props.message.content }}
        </div>
      </div>
    </div>
  </div>
</template>
