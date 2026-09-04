<script setup lang="ts">
import { ref } from 'vue';
import { Send, Loader2 } from 'lucide-vue-next';

const props = defineProps<{
  disabled?: boolean;
  isGenerating?: boolean;
}>();

const emit = defineEmits<{
  (e: 'send', message: string): void;
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

      <!-- Input Box -->
      <form @submit.prevent="handleSubmit" class="relative flex items-center bg-slate-900 border border-slate-800 rounded-xl shadow-inner focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
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
            class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-semibold shadow transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Loader2 v-if="props.isGenerating" class="w-3.5 h-3.5 animate-spin" />
            <Send v-else class="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </form>

      <!-- Subtitle hint -->
      <div class="flex items-center justify-between mt-1.5 px-1 text-[11px] text-slate-500">
        <span>Press <kbd class="px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Enter</kbd> to send, <kbd class="px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Shift + Enter</kbd> for newline</span>
        <span class="hidden sm:inline font-mono">OpenAI Responses API • Persistent Conversation</span>
      </div>
    </div>
  </div>
</template>
