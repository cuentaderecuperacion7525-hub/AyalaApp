import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Capacitor} from '@capacitor/core';
import App from './App.tsx';
import '@fontsource-variable/plus-jakarta-sans';
import './index.css';

// In native Android APK context, route relative API requests to backend host
if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  const originalFetch = window.fetch;
  const REMOTE_BACKEND = 'https://ais-pre-x5o23dw5dokdisr4elvbbw-542088184903.us-west2.run.app';

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      const serverUrl = localStorage.getItem('famichat_server_url') || REMOTE_BACKEND;
      input = `${serverUrl.replace(/\/$/, '')}${input}`;
    }
    return originalFetch(input, init);
  };
}

// Register Service Worker for true standalone PWA experience without address bar
if ('serviceWorker' in navigator) {
  const registerSW = () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered successfully!', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
