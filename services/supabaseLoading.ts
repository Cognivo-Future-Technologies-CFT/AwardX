type Listener = () => void;

const SHOW_DELAY_MS = 140;
const MIN_VISIBLE_MS = 420;

const listeners = new Set<Listener>();

let pendingRequests = 0;
let isVisible = false;
let visibleSince = 0;
let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const emit = () => {
  listeners.forEach((listener) => listener());
};

const setVisible = (nextVisible: boolean) => {
  if (isVisible === nextVisible) return;
  isVisible = nextVisible;
  if (nextVisible) {
    visibleSince = Date.now();
  }
  emit();
};

const beginRequest = () => {
  pendingRequests += 1;

  if (pendingRequests !== 1) {
    return;
  }

  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  if (!isVisible && !showTimer) {
    showTimer = setTimeout(() => {
      showTimer = null;
      if (pendingRequests > 0) {
        setVisible(true);
      }
    }, SHOW_DELAY_MS);
  }
};

const endRequest = () => {
  pendingRequests = Math.max(0, pendingRequests - 1);

  if (pendingRequests > 0) {
    return;
  }

  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }

  if (!isVisible) {
    return;
  }

  const elapsed = Date.now() - visibleSince;
  const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

  if (hideTimer) {
    clearTimeout(hideTimer);
  }

  hideTimer = setTimeout(() => {
    hideTimer = null;
    if (pendingRequests === 0) {
      setVisible(false);
    }
  }, remaining);
};

export const trackSupabaseRequest = async <T>(request: () => Promise<T>): Promise<T> => {
  beginRequest();
  try {
    return await request();
  } finally {
    endRequest();
  }
};

export const subscribeSupabaseLoading = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getSupabaseLoadingSnapshot = () => isVisible;
