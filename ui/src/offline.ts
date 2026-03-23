// Offline detection and UI indicator
export function initOfflineDetection() {
  // const offlineLabel = createOfflineLabel();
  // document.body.appendChild(offlineLabel);

  // Listen for online/offline events
  window.addEventListener('online', () => {
    updateOfflineLabel(false);
    showNotification('You are back online', 'success');
  });

  window.addEventListener('offline', () => {
    updateOfflineLabel(true);
    showNotification('You are offline. Changes will be synced when back online.', 'warning');
  });

  // Initial check
  updateOfflineLabel(!navigator.onLine);
}

function createOfflineLabel(): HTMLElement {
  const label = document.createElement('div');
  label.id = 'offline-indicator';
  label.className = 'offline-indicator';
  label.textContent = 'OFFLINE';
  label.style.display = 'none';
  return label;
}

function updateOfflineLabel(isOffline: boolean) {
  const label = document.getElementById('offline-indicator');
  if (label) {
    label.style.display = isOffline ? 'block' : 'none';
  }
}

function showNotification(message: string, type: 'success' | 'warning' | 'error') {
  // Request permission if not granted
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // Show browser notification if permission granted
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Daily Buy App', {
      body: message,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `offline-status-${type}`,
    });
  }

  // Also show in-app toast notification
  showToast(message, type);
}

function showToast(message: string, type: 'success' | 'warning' | 'error') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 10px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : '#f44336'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(toast);

  // Remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

