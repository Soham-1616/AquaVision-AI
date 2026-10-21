import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/app/App';
import '@/index.css';
import { useAppStore } from '@/lib/store';

// Auto-detect backend on startup
async function checkBackend() {
  try {
    const response = await fetch('/api/capabilities');
    if (response.ok) {
      const caps = await response.json();
      const store = useAppStore.getState();
      store.setBackendCapabilities(caps);
      store.setIsDemo(false);
      console.log('[AquaVision] Backend connected:', caps);
    }
  } catch {
    console.log('[AquaVision] Backend not available, using demo mode');
  }
}

checkBackend();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Ensure index.html has a <div id="root">.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
