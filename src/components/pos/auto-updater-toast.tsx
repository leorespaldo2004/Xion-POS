'use client';

import { useAutoUpdater } from '@/hooks/use-auto-updater';

export function AutoUpdaterToast() {
    // Inicializa los listeners del sistema de actualizaciones de Electron
    useAutoUpdater();

    // Este es un componente "Renderless". Solo inyecta comportamiento.
    return null;
}
