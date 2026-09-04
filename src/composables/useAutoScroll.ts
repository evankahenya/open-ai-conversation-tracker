import { ref, nextTick, onMounted, onUnmounted, Ref } from 'vue';

export function useAutoScroll(containerRef: Ref<HTMLElement | null>) {
  const isUserScrolledUp = ref(false);
  const showScrollButton = ref(false);
  const unreadCount = ref(0);

  const checkIfScrolledUp = () => {
    const el = containerRef.value;
    if (!el) return;
    const threshold = 80;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserScrolledUp.value = distanceFromBottom > threshold;
    if (!isUserScrolledUp.value) {
      showScrollButton.value = false;
      unreadCount.value = 0;
    }
  };

  const scrollToBottom = (smooth = true) => {
    nextTick(() => {
      const el = containerRef.value;
      if (!el) return;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
      isUserScrolledUp.value = false;
      showScrollButton.value = false;
      unreadCount.value = 0;
    });
  };

  const notifyNewContent = () => {
    if (isUserScrolledUp.value) {
      showScrollButton.value = true;
      unreadCount.value += 1;
    } else {
      scrollToBottom(false);
    }
  };

  let scrollListener: (() => void) | null = null;

  onMounted(() => {
    const el = containerRef.value;
    if (el) {
      scrollListener = () => checkIfScrolledUp();
      el.addEventListener('scroll', scrollListener, { passive: true });
    }
  });

  onUnmounted(() => {
    const el = containerRef.value;
    if (el && scrollListener) {
      el.removeEventListener('scroll', scrollListener);
    }
  });

  return {
    isUserScrolledUp,
    showScrollButton,
    unreadCount,
    scrollToBottom,
    notifyNewContent,
    checkIfScrolledUp,
  };
}
