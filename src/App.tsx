import React, { useEffect, useState } from 'react';
import '../styles/globals.css';
import { AutoUpdaterToast } from '@/components/pos/auto-updater-toast';
import { LoginScreen } from '@/components/pos/login-screen';
import { OnboardingScreen } from '@/components/pos/onboarding-screen';
import { DashboardScreen } from '@/components/pos/dashboard-screen';
import { apiClient } from '@/lib/api';

type AppView = 'login' | 'onboarding' | 'dashboard';

type BootState = 'checking' | 'ready' | 'failed';

export default function App() {
  const [view, setView] = useState<AppView>('login');
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
          <p className="mt-2 text-slate-400">Asegúrate que el backend Python ha iniciado correctamente y vuelve a cargar la app.</p>
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

  const renderContent = () => {
    if (view === 'login') {
      return <LoginScreen onLogin={() => setView('onboarding')} />;
    }

    if (view === 'onboarding') {
      return <OnboardingScreen onSelectPrimary={() => setView('dashboard')} onRequestAccess={() => setView('dashboard')} />;
    }

    return <DashboardScreen onLogout={() => setView('login')} />;
  };

  return (
    <div className="font-sans antialiased">
      {renderContent()}
      <AutoUpdaterToast />
    </div>
  );
}
