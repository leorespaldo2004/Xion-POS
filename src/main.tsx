import './lib/dom-patch';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/globals.css';
import { AutoUpdaterProvider } from './hooks/use-auto-updater';
import { ErrorBoundary } from './components/shared/error-boundary';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AutoUpdaterProvider>
          <App />
        </AutoUpdaterProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
