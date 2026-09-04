<script setup lang="ts">
import { AssistantMessageEvent } from '../types';
import { Bot } from 'lucide-vue-next';

const props = defineProps<{
  message: AssistantMessageEvent;
  isStreaming?: boolean;
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
  <div :id="`assistant-msg-${props.message.id}`" class="py-4 border-b border-slate-800/60 bg-slate-900/10 transition-colors">
    <div class="max-w-4xl mx-auto flex items-start gap-4 px-4">
      <!-- AI Avatar -->
      <div class="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
        <Bot class="w-4 h-4" />
      </div>

      <!-- Message Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-xs font-bold tracking-wider text-emerald-400 uppercase">AI</span>
          <span class="text-[11px] text-slate-500 font-mono">{{ formatTime(props.message.timestamp) }}</span>
          <span v-if="props.isStreaming" class="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono ml-2">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Streaming...
          </span>
        </div>

        <div class="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
          {{ props.message.content }}
          <!-- Pulsing cursor during streaming -->
          <span v-if="props.isStreaming" class="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse align-middle"></span>
        </div>
      </div>
    </div>
  </div>
</template>
