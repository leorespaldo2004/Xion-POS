import { useSyncStore } from '../stores/sync-store';

export function useSync() {
  const syncState = useSyncStore();

  return {
    isOnline: syncState.isOnline,
    isSyncing: syncState.isSyncing,
    pendingCount: syncState.pendingCount,
    lastSyncAt: syncState.lastSyncAt,
    lastError: syncState.lastError,
    triggerSync: syncState.triggerSync
  };
}
