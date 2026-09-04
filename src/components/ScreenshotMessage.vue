<script setup lang="ts">
import { ScreenshotAnalysisEvent } from '../types';
import { Camera, Bot, Maximize2, CheckCircle2 } from 'lucide-vue-next';

const props = defineProps<{
  message: ScreenshotAnalysisEvent;
}>();

const emit = defineEmits<{
  (e: 'view-image', url: string, title?: string, timestamp?: string): void;
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
  <div :id="`screenshot-msg-${props.message.id}`" class="py-5 border-b border-slate-800/60 bg-slate-900/20 transition-colors">
    <div class="max-w-4xl mx-auto px-4 space-y-4">
      <!-- 1. SCREENSHOT CARD -->
      <div class="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-md max-w-xl">
        <!-- Screenshot Header -->
        <div class="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border-b border-slate-800/80 text-xs">
          <div class="flex items-center gap-2">
            <span class="p-1 rounded bg-slate-800 text-sky-400">
              <Camera class="w-3.5 h-3.5" />
            </span>
            <span class="font-bold tracking-wider text-sky-400 uppercase text-[11px]">Screenshot</span>
            <span class="text-slate-400 font-mono text-[11px]">{{ props.message.screenshot }}</span>
          </div>
          <div class="text-[11px] text-slate-500 font-mono">
            {{ formatTime(props.message.timestamp) }}
          </div>
        </div>

        <!-- Screenshot Image Preview -->
        <div
          class="relative group cursor-pointer bg-slate-950 flex items-center justify-center overflow-hidden"
          @click="emit('view-image', props.message.screenshotUrl, props.message.screenshot, formatTime(props.message.timestamp))"
        >
          <img
            :src="props.message.screenshotUrl"
            :alt="props.message.screenshot"
            class="w-full max-h-72 object-contain aspect-video transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />

          <!-- Hover Overlay -->
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-medium">
            <span class="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm flex items-center gap-1.5 border border-white/20">
              <Maximize2 class="w-3.5 h-3.5" />
              Click to inspect screenshot
            </span>
          </div>
        </div>

        <!-- Context Pill if activity attached -->
        <div v-if="props.message.activity" class="px-3.5 py-2 bg-slate-950/60 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span class="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 class="w-3 h-3 text-emerald-400" />
            {{ props.message.activity.application }}
          </span>
          <span class="truncate max-w-xs text-slate-400 font-sans">{{ props.message.activity.activity }}</span>
        </div>
      </div>

      <!-- 2. AI ANALYSIS PRESENTATION -->
      <div class="flex items-start gap-4 pt-1">
        <!-- AI Avatar -->
        <div class="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
          <Bot class="w-4 h-4" />
        </div>

        <!-- AI Text Body -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-xs font-bold tracking-wider text-emerald-400 uppercase">AI Analysis</span>
            <span class="text-[11px] text-slate-500 font-mono">{{ formatTime(props.message.timestamp) }}</span>
          </div>

          <div class="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {{ props.message.content }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
