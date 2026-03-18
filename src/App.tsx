import React, { useEffect, useState } from 'react';
import '../styles/globals.css';
import { ConnectionTester } from '@/components/pos/connection-tester';
import { apiClient } from '@/lib/api';

type BootState = 'checking' | 'ready' | 'failed';

export default function App() {
  const [bootState, setBootState] = useState<BootState>('checking');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const boot = async () => {
      try {
        await apiClient.initialize();
        if (isMounted) setBootState('ready');
      } catch (err) {
        console.error('[App] Backend initialization failed', err);
        if (isMounted) {
          setError('No se pudo conectar con el backend local. Revisa que Python esté listo.');
          setBootState('failed');
        }
      }
    };

    boot();
    return () => {
      isMounted = false;
    };
  }, []);

  if (bootState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Iniciando Xion POS...</h1>
          <p className="text-slate-300 mt-2">Verificando backend local...</p>
        </div>
      </div>
    );
  }

  if (bootState === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="bg-slate-900 rounded-xl border border-red-500 p-6 max-w-lg">
          <h1 className="text-xl font-bold text-red-300">Backend no disponible</h1>
          <p className="mt-2 text-slate-200">{error}</p>
          <button
            className="mt-4 rounded-md px-4 py-2 bg-sky-500 text-slate-900 font-semibold"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-4">Xion POS - Escritorio</h1>
        <ConnectionTester />
      </div>
    </div>
  );
}
