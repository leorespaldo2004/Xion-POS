import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast'; // Ajusta la ruta si es necesario

export function useAutoUpdater(): void {
    const { toast } = useToast();

    useEffect(() => {
        // Validación de entorno: Si no estamos en Electron, ignoramos.
        if (typeof window === 'undefined' || !window.electronAPI?.updater) {
            return;
        }

        // Listener para cuando se detecta la actualización y comienza la descarga
        const unsubscribeAvailable = window.electronAPI.updater.onUpdateAvailable((version: string) => {
            toast({
                title: "🔄 Actualización Detectada",
                description: `Descargando la versión ${version} en segundo plano. El sistema seguirá funcionando normalmente.`,
                duration: 5000,
            });
        });

        // Listener para cuando la descarga termina y está lista para instalar
        const unsubscribeReady = window.electronAPI.updater.onUpdateReady((version: string) => {
            toast({
                title: "✅ Actualización Lista",
                description: `Versión ${version} descargada. Se instalará automáticamente al cerrar el POS.`,
                duration: 8000,
            });
        });

        // Cleanup: vital para evitar fugas de memoria si el componente se desmonta
        return () => {
            unsubscribeAvailable();
            unsubscribeReady();
        };
    }, [toast]);
}
