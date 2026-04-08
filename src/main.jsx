import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

/**
 * Dark Mode Initialization
 * 
 * On app startup, we detect the user's system preference for color scheme
 * and apply the .dark class to the document root. This ensures the initial
 * render matches the user's OS preference before React hydrates.
 * 
 * We also listen for changes to system preference in real-time, so if
 * the user switches their OS theme while the app is open, we update
 * accordingly without requiring a page reload.
 */
const applyDarkMode = () => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', prefersDark);
};

applyDarkMode();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyDarkMode);

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)