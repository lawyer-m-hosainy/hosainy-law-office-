import { useState, useEffect, useCallback } from 'react';
import { Client, ClientFilter } from '../../shared/types';

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

  const createClient = async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const created = await window.electronAPI.createClient(clientData);
      setClients((prev) => [created, ...prev]);
      return { success: true, created };
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر إضافة الموكل' };
    }
  };

  const updateClient = async (id: number, updates: Partial<Client>) => {
    try {
      const updated = await window.electronAPI.updateClient(id, updates);
      setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return { success: true, updated };
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر تعديل بيانات الموكل' };
    }
  };

  const archiveClient = async (id: number, archive: boolean) => {
    try {
      const updated = await window.electronAPI.archiveClient(id, archive);
      setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return { success: true, updated };
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر تغيير حالة الأرشفة' };
    }
  };

  const getExpiringPoaClients = async (days = 45) => {
    return await window.electronAPI.getExpiringPoaClients(days);
  };

  const deleteClient = async (id: number) => {
    try {
      const res = await window.electronAPI.deleteClient(id);
      if (res.success) {
        setClients((prev) => prev.filter((c) => c.id !== id));
      }
      return res;
    } catch (err: any) {
      return { success: false, message: err?.message || 'تعذر حذف الموكل' };
    }
  };

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
