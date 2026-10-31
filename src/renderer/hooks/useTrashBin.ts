import { useState, useCallback, useEffect } from 'react';
import { TrashBinItem } from '../../shared/types';

export function useTrashBin() {
  const [items, setItems] = useState<TrashBinItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTrash = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.getTrashBinItems();
      setItems(data || []);
    } catch (err: any) {
      console.warn('Failed to load trash bin items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const restoreItem = async (entityType: string, entityId: number) => {
    try {
      const res = await window.electronAPI.restoreTrashItem(entityType, entityId);
      if (res.success) {
        await loadTrash();
        return true;
      }
      return false;
    } catch (err: any) {
      alert(`خطأ أثناء الاسترجاع: ${err?.message}`);
      return false;
    }
  };

  const deletePermanent = async (entityType: string, entityId: number) => {
    try {
      const res = await window.electronAPI.permanentDeleteTrashItem(entityType, entityId);
      if (res.success) {
        await loadTrash();
        return true;
      }
      return false;
    } catch (err: any) {
      alert(`خطأ أثناء الحذف النهائي: ${err?.message}`);
      return false;
    }
  };

  const emptyAllTrash = async () => {
    try {
      setLoading(true);
      const res = await window.electronAPI.emptyTrashBin();
      await loadTrash();
      return res;
    } catch (err: any) {
      alert(`خطأ أثناء إفراغ السلة: ${err?.message}`);
      return { success: false, count: 0 };
    } finally {
      setLoading(false);
    }
  };

  return {
    items,
    loading,
    loadTrash,
    restoreItem,
    deletePermanent,
    emptyAllTrash,
  };
}
