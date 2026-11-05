import { useState, useEffect, useCallback } from 'react';
import { Client, ClientFilter } from '../../shared/types';
import { entityEventBus } from '../services/eventBus';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [expiringClients, setExpiringClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async (filter?: ClientFilter) => {
    try {
      setLoading(true);
      setError(null);
      const data = await window.electronAPI.getClients(filter);
      setClients(data);

      // Also fetch clients with POAs expiring within 45 days
      const expiring = await window.electronAPI.getExpiringPoaClients(45);
      setExpiringClients(expiring);
    } catch (err: any) {
      console.error('Failed to load clients:', err);
      setError(err?.message || 'تعذر تحميل قائمة الموكلين');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Subscribe to central entity invalidation events
  useEffect(() => {
    return entityEventBus.subscribe('clients', () => {
      loadClients();
    });
  }, [loadClients]);

  const createClient = useCallback(async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const created = await window.electronAPI.createClient(clientData);
      setClients((prev) => [created, ...prev]);
      entityEventBus.emit('clients');
      return { success: true, created };
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر إضافة الموكل' };
    }
  }, []);

  const updateClient = useCallback(async (id: number, updates: Partial<Client>) => {
    try {
      const updated = await window.electronAPI.updateClient(id, updates);
      setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
      entityEventBus.emit('clients');
      return { success: true, updated };
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر تعديل بيانات الموكل' };
    }
  }, []);

  const archiveClient = useCallback(async (id: number, archive: boolean) => {
    try {
      const updated = await window.electronAPI.archiveClient(id, archive);
      setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
      entityEventBus.emit('clients');
      entityEventBus.emit('trash');
      return { success: true, updated };
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر تغيير حالة الأرشفة' };
    }
  }, []);

  const getExpiringPoaClients = useCallback(async (days = 45) => {
    return await window.electronAPI.getExpiringPoaClients(days);
  }, []);

  const deleteClient = useCallback(async (id: number) => {
    try {
      const res = await window.electronAPI.deleteClient(id);
      if (res.success) {
        setClients((prev) => prev.filter((c) => c.id !== id));
        entityEventBus.emit('clients');
        entityEventBus.emit('trash');
      }
      return res;
    } catch (err: any) {
      console.error('Error deleting client:', err);
      return { success: false, message: err?.message || 'تعذر حذف الموكل' };
    }
  }, []);

  return {
    clients,
    expiringClients,
    loading,
    error,
    refresh: loadClients,
    createClient,
    updateClient,
    archiveClient,
    deleteClient,
    getExpiringPoaClients,
  };
}
