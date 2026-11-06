import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from './app/providers';
import { registerDynamicImportRecovery } from './lib/chunk-load-recovery';
import './styles/globals.css';
import './App.css';

// Register before rendering lazy routes so old chunks can recover on navigation.
registerDynamicImportRecovery();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders />
  </React.StrictMode>
);
