import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { getApiClient } from './api';
import { syncRepository, SyncQueueItem } from '../database/repositories/syncRepository';
import { saleRepository } from '../database/repositories/saleRepository';
import { productRepository } from '../database/repositories/productRepository';
import { configRepository } from '../database/repositories/configRepository';

export interface SyncEngineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
}

type SyncEngineListener = (status: SyncEngineStatus) => void;

class SyncEngine {
  private isOnline = false;
  private isSyncing = false;
  private lastSyncAt: string | null = null;
  private lastError: string | null = null;
  private listeners: Set<SyncEngineListener> = new Set();
  private netInfoUnsubscribe: (() => void) | null = null;

  public init() {
    this.netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      const changed = this.isOnline !== online;
      this.isOnline = online;

      this.notifyListeners();

      if (online && changed) {
        this.processSyncQueue();
        this.pullDeltaSync();
      }
    });

    // Check initial count
    this.notifyListeners();
  }

  public destroy() {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
    }
  }

  public subscribe(listener: SyncEngineListener): () => void {
    this.listeners.add(listener);
    this.notifyListeners();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners() {
    let pendingCount = 0;
    try {
      pendingCount = await syncRepository.getPendingCount();
    } catch (err) {
      // DB not ready yet
    }

    const status: SyncEngineStatus = {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError
    };

    for (const listener of Array.from(this.listeners)) {
      listener(status);
    }
  }

  public async triggerManualSync(): Promise<{ success: boolean; message: string }> {
    if (!this.isOnline) {
      return { success: false, message: 'Sin conexión a la red' };
    }
    if (this.isSyncing) {
      return { success: false, message: 'Sincronización en proceso...' };
    }

    try {
      await this.processSyncQueue();
      await this.pullDeltaSync();
      return { success: true, message: 'Sincronización completada con éxito' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error en sincronización' };
    }
  }

  public async processSyncQueue() {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    this.lastError = null;
    await this.notifyListeners();

    try {
      const pendingItems = await syncRepository.getPendingQueue();
      if (pendingItems.length === 0) {
        this.isSyncing = false;
        await this.notifyListeners();
        return;
      }

      const client = await getApiClient();

      for (const item of pendingItems) {
        await syncRepository.updateQueueStatus(item.id, 'processing');

        if (item.action === 'CREATE_SALE') {
          const payload = JSON.parse(item.payload);
          try {
            const res = await client.post('/api/sales/sync', payload);
            const remoteId = res.data?.remote_id || res.data?.id || `remote_${payload.sale.id}`;

            // Mark sale synced locally
            await saleRepository.markSynced(payload.sale.id, remoteId);
            // Remove item from queue
            await syncRepository.removeQueueItem(item.id);
          } catch (err: any) {
            const errorMsg = err.response?.data?.detail || err.message || 'Error enviando venta al backend';
            await syncRepository.updateQueueStatus(item.id, 'failed', errorMsg);
            this.lastError = errorMsg;
          }
        } else if (item.action === 'CREATE_PURCHASE') {
          const payload = JSON.parse(item.payload);
          try {
            await client.post('/api/purchases', payload);
            await syncRepository.removeQueueItem(item.id);
          } catch (err: any) {
            const errorMsg = err.response?.data?.detail || err.message || 'Error enviando compra al backend';
            await syncRepository.updateQueueStatus(item.id, 'failed', errorMsg);
            this.lastError = errorMsg;
          }
        }
      }

      this.lastSyncAt = new Date().toISOString();
    } catch (err: any) {
      this.lastError = err.message || 'Error general en cola de sync';
    } finally {
      this.isSyncing = false;
      await this.notifyListeners();
    }
  }

  public async pullDeltaSync() {
    if (!this.isOnline) return;

    try {
      const client = await getApiClient();
      const lastSync = (await configRepository.get('last_sync_at')) || '';
      
      const res = await client.get(`/api/sync/delta`, {
        params: { last_sync_at: lastSync }
      });

      if (res.data) {
        const { products, rates } = res.data;

        if (Array.isArray(products) && products.length > 0) {
          const mapped = products.map((p: any) => ({
            id: p.id,
            barcode: p.barcode || null,
            name: p.name,
            category_id: p.category_id || null,
            price_usd: Number(p.price_usd || p.priceUsd || 0),
            cost_usd: Number(p.cost_usd || p.costUsd || 0),
            wholesale_price_usd: Number(p.wholesale_price_usd || p.wholesalePriceUsd || 0),
            package_quantity: Number(p.package_quantity || p.packageQuantity || 1),
            current_stock: Number(p.current_stock || p.currentStock || 0),
            min_stock: Number(p.min_stock || p.minStock || 0),
            type: p.type || 'physical',
            has_vat: Boolean(p.has_vat || p.hasVat),
            updated_at: p.updated_at || new Date().toISOString()
          }));

          await productRepository.upsertMany(mapped);
        }

        if (rates) {
          if (rates.bcv) await configRepository.set('bcv_rate', String(rates.bcv));
          if (rates.parallel) await configRepository.set('parallel_rate', String(rates.parallel));
        }

        await configRepository.set('last_sync_at', new Date().toISOString());
        this.lastSyncAt = new Date().toISOString();
      }
    } catch (err) {
      // Fallback: If backend delta endpoint is not reachable, continue working offline
    } finally {
      await this.notifyListeners();
    }
  }
}

export const syncEngine = new SyncEngine();
