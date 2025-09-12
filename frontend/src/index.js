import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const rootElem = document.getElementById('root');
const root = createRoot(rootElem);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
