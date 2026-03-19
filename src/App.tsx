import React, { useEffect, useState } from 'react';
import '../styles/globals.css';
import { DashboardScreen } from '@/components/pos/dashboard-screen';
// import { LoginScreen } from '@/components/pos/login-screen'; // Descomentar cuando actives el login
import { apiClient } from '@/lib/api';

type BootState = 'checking' | 'ready' | 'failed';

export default function App() {
  const [bootState, setBootState] = useState<BootState>('checking');
  const [error, setError] = useState<string>('');
  
  // Omitimos la seguridad temporalmente fijando esto en "true"
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

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

  /* * Flujo de Autenticación (Desactivado para desarrollo)
   * Cuando quieras volver a activar el login, simplemente cambia 
   * el estado inicial de isAuthenticated a 'false' y descomenta este bloque.
   */
  // if (!isAuthenticated) {
  //   return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  // }

  return (
    <DashboardScreen 
      onLogout={() => {
        // En modo desarrollo puedes dejar esto vacío o que simplemente cambie el estado
        console.log("Cerrando sesión...");
        setIsAuthenticated(false); 
      }} 
    />
  );
}
