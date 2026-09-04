<script setup lang="ts">
import { X, ZoomIn, ZoomOut, Download } from 'lucide-vue-next';
import { ref } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  imageUrl: string;
  title?: string;
  timestamp?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const zoomLevel = ref(1);

const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 0.25, 2.5);
};

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 0.25, 0.5);
};

const resetZoom = () => {
  zoomLevel.value = 1;
};

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    emit('close');
  }
};
</script>

<template>
  <div
    v-if="props.isOpen"
    id="image-viewer-modal"
    @click="handleBackdropClick"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in"
  >
    <div class="relative max-w-5xl w-full max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 text-sm">
        <div class="flex items-center gap-3">
          <span class="font-semibold text-slate-200">{{ props.title || 'Screenshot Preview' }}</span>
          <span v-if="props.timestamp" class="text-xs text-slate-400 font-mono">
            {{ props.timestamp }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Zoom Controls -->
          <button
            id="zoom-out-btn"
            @click="zoomOut"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut class="w-4 h-4" />
          </button>
          <button
            id="zoom-reset-btn"
            @click="resetZoom"
            class="px-2 py-1 text-xs font-mono text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
            title="Reset Zoom"
          >
            {{ Math.round(zoomLevel * 100) }}%
          </button>
          <button
            id="zoom-in-btn"
            @click="zoomIn"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn class="w-4 h-4" />
          </button>

          <!-- Download link -->
          <a
            id="download-screenshot-link"
            :href="props.imageUrl"
            download
            target="_blank"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors ml-1"
            title="Download Screenshot"
          >
            <Download class="w-4 h-4" />
          </a>

          <!-- Close button -->
          <button
            id="close-image-viewer-btn"
            @click="emit('close')"
            class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-900/40 hover:border-rose-800 transition-colors ml-2"
            title="Close Preview (Esc)"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Image Area -->
      <div class="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-950/80">
        <img
          id="modal-preview-img"
          :src="props.imageUrl"
          :alt="props.title || 'Screen Capture'"
          class="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg transition-transform duration-150 select-none"
          :style="{ transform: `scale(${zoomLevel})` }"
        />
      </div>
    </div>
  </div>
</template>
