// Copyright © 2025 Anton Medvedev
// SPDX‑License‑Identifier: AGPL‑3.0

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n/config';
import "./index.css";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
