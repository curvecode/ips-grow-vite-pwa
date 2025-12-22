// Offline detection and UI indicator
export function initOfflineDetection() {
  const offlineLabel = createOfflineLabel();
  document.body.appendChild(offlineLabel);

  // Listen for online/offline events
  window.addEventListener('online', () => {
    updateOfflineLabel(false);
  });

  window.addEventListener('offline', () => {
    updateOfflineLabel(true);
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

