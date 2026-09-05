<script setup lang="ts">
import { ref } from 'vue';
import { Send, Loader2, RefreshCw } from 'lucide-vue-next';

const props = defineProps<{
  disabled?: boolean;
  isGenerating?: boolean;
  isSyncing?: boolean;
}>();

const emit = defineEmits<{
  (e: 'send', message: string): void;
  (e: 'sync'): void;
}>();

const text = ref('');

const handleSubmit = () => {
  if (!text.value.trim() || props.disabled || props.isGenerating) return;
  emit('send', text.value);
  text.value = '';
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
};
</script>

<template>
  <div id="message-composer" class="p-4 border-t border-slate-800 bg-slate-950/80 backdrop-blur-md">
    <div class="max-w-4xl mx-auto">
      <!-- Processing indicator banner if generating -->
      <div
        v-if="props.isGenerating"
        class="flex items-center gap-2 mb-2 text-xs text-emerald-400 font-mono animate-pulse px-1"
      >
        <Loader2 class="w-3.5 h-3.5 animate-spin" />
        <span>AI is analyzing desktop context and generating response...</span>
      </div>

      <!-- Controls Row: Big Manual Sync Button on Left + Chat Input -->
      <div class="flex items-stretch gap-2.5 sm:gap-3">
        <!-- Big Manual Sync Button on the LEFT -->
        <button
          id="composer-manual-sync-btn"
          type="button"
          @click="emit('sync')"
          :disabled="props.disabled || props.isSyncing || props.isGenerating"
          class="shrink-0 min-h-[50px] px-4 sm:px-5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:from-indigo-700 active:to-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed border border-indigo-400/40 text-white font-semibold shadow-lg shadow-indigo-950/60 flex items-center justify-center gap-2.5 transition-all cursor-pointer select-none group"
          title="Fetch latest responses & earlier history directly from OpenAI"
        >
          <Loader2 v-if="props.isSyncing" class="w-5 h-5 animate-spin text-white" />
          <RefreshCw
            v-else
            class="w-5 h-5 text-indigo-100 group-hover:rotate-180 transition-transform duration-500"
          />
          <div class="flex flex-col items-start leading-tight text-left">
            <span class="text-[10px] text-indigo-200 font-mono font-medium uppercase tracking-wider">Manual</span>
            <span class="text-sm font-bold text-white tracking-tight whitespace-nowrap">
              {{ props.isSyncing ? 'Syncing...' : 'Sync Chat' }}
            </span>
          </div>
        </button>

        <!-- Input Box -->
        <form
          @submit.prevent="handleSubmit"
          class="flex-1 relative flex items-center bg-slate-900 border border-slate-800 rounded-xl shadow-inner focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all min-h-[50px]"
        >
          <textarea
            id="chat-input"
            v-model="text"
            @keydown="handleKeyDown"
            :disabled="props.disabled || props.isGenerating"
            placeholder="Ask the AI about the current screen (e.g. 'What is the user currently doing?')..."
            rows="1"
            class="w-full bg-transparent px-4 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-32 min-h-[48px]"
          ></textarea>

          <div class="pr-2 shrink-0">
            <button
              id="send-message-btn"
              type="submit"
              :disabled="!text.trim() || props.disabled || props.isGenerating"
              class="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-semibold shadow transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Loader2 v-if="props.isGenerating" class="w-3.5 h-3.5 animate-spin" />
              <Send v-else class="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Subtitle hint -->
      <div class="flex items-center justify-between mt-1.5 px-1 text-[11px] text-slate-500">
        <span>Press <kbd class="px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Enter</kbd> to send, <kbd class="px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Shift + Enter</kbd> for newline</span>
        <span class="hidden sm:inline font-mono">OpenAI Responses API • Persistent Conversation</span>
      </div>
    </div>
  </div>
</template>
