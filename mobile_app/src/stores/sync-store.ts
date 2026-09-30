import { create } from 'zustand';
import { syncEngine, SyncEngineStatus } from '../services/sync_engine';

interface SyncState extends SyncEngineStatus {
  triggerSync: () => Promise<{ success: boolean; message: string }>;
  setStatus: (status: SyncEngineStatus) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: false,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  lastError: null,

  setStatus: (status) => set(status),

  triggerSync: async () => {
    return await syncEngine.triggerManualSync();
  }
}));

// Connect engine listener to store
syncEngine.subscribe((status) => {
  useSyncStore.getState().setStatus(status);
});
