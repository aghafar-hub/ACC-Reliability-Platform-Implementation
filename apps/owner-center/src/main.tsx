// apps/owner-center/src/main.tsx
// Application entry point — bootstraps the React root.

import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/shell.css';
import './styles/ui-framework.css';
import './styles/tokens.css';
import './styles/ui-framework-v2.css';
import App from './App';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error(
    'Root element not found. Ensure index.html contains <div id="root">.',
  );
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
