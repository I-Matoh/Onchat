import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Detect system dark mode and apply .dark class
const applyDarkMode = () => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', prefersDark);
};

applyDarkMode();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyDarkMode);

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)