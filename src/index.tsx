
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Service worker registration removed to prevent cross-origin/sandbox host errors
// in restricted environments.

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
