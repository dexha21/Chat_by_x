let queue = [];
let isShowing = false;
let showCallback = null;
let hideCallback = null;
let timeoutId = null;

export const NotificationManager = { 
  setShowCallback(callback) {
    showCallback = callback;
  },

  setHideCallback(callback) {
    hideCallback = callback;
  },

  push(notification) {
    if (typeof notification === 'string') {
      queue.push({ message: notification, type: 'info' });
    } else {
      queue.push({ ...notification, type: notification.type || 'info' });
    }
    this.processQueue();
  },

  processQueue() {
    if (isShowing || queue.length === 0 || !showCallback) return;

    const next = queue.shift();
    isShowing = true;

    showCallback(next);

    timeoutId = setTimeout(() => {
      this.dismiss();
    }, 15000);
  },

  dismiss() {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
    isShowing = false;

    if (hideCallback) hideCallback();

    this.processQueue();
  },

  clear() {
    queue = [];
    isShowing = false;
    if (timeoutId) clearTimeout(timeoutId);
  }
};
