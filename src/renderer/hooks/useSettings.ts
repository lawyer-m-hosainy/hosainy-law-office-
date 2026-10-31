import { useState, useEffect, useCallback } from 'react';
import {
  ConfigurableListItem,
  ConfigurableListType,
  DataDirInfo,
  OfficeSettings
} from '../../shared/types';

export function useSettings() {
  const [settings, setSettings] = useState<OfficeSettings | null>(null);
  const [lists, setLists] = useState<Record<ConfigurableListType, ConfigurableListItem[]>>({
    courts: [],
    case_types: [],
    adjournment_reasons: [],
    task_categories: [],
    transaction_types: [],
  });
  const [dataDirInfo, setDataDirInfo] = useState<DataDirInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!window.electronAPI) {
        throw new Error('electronAPI is not available');
      }

      const [loadedSettings, loadedLists, loadedDirInfo] = await Promise.all([
        window.electronAPI.getOfficeSettings(),
        window.electronAPI.getAllListItems(),
        window.electronAPI.getDataDirInfo(),
      ]);

      setSettings(loadedSettings);
      setLists(loadedLists);
      setDataDirInfo(loadedDirInfo);
    } catch (err: any) {
      console.error('Failed to load settings data:', err);
      setError(err?.message || 'حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateSettings = async (updates: Partial<OfficeSettings>) => {
    try {
      const updated = await window.electronAPI.updateOfficeSettings(updates);
      setSettings(updated);
      return { success: true, updated };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل في تحديث الإعدادات' };
    }
  };

  const createListItem = async (item: Omit<ConfigurableListItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const created = await window.electronAPI.createListItem(item);
      setLists((prev) => ({
        ...prev,
        [item.list_type]: [...prev[item.list_type], created],
      }));
      return { success: true, created };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل في إضافة العنصر' };
    }
  };

  const updateListItem = async (id: number, listType: ConfigurableListType, updates: Partial<ConfigurableListItem>) => {
    try {
      const updated = await window.electronAPI.updateListItem(id, updates);
      setLists((prev) => ({
        ...prev,
        [listType]: prev[listType].map((item) => (item.id === id ? updated : item)),
      }));
      return { success: true, updated };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل في تعديل العنصر' };
    }
  };

  const deleteListItem = async (id: number, listType: ConfigurableListType) => {
    try {
      const res = await window.electronAPI.deleteListItem(id);
      if (res.success) {
        setLists((prev) => ({
          ...prev,
          [listType]: prev[listType].filter((item) => item.id !== id),
        }));
      }
      return res;
    } catch (err: any) {
      return { success: false, message: err?.message || 'فشل في حذف العنصر' };
    }
  };

  const resetList = async (listType: ConfigurableListType) => {
    try {
      const defaultItems = await window.electronAPI.resetListToDefaults(listType);
      setLists((prev) => ({
        ...prev,
        [listType]: defaultItems,
      }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل في استعادة الافتراضيات' };
    }
  };

  const refreshDataDirInfo = async () => {
    try {
      const info = await window.electronAPI.getDataDirInfo();
      setDataDirInfo(info);
    } catch (err) {
      console.error('Failed to refresh data dir info:', err);
    }
  };

  return {
    settings,
    lists,
    dataDirInfo,
    loading,
    error,
    reload: loadData,
    updateSettings,
    createListItem,
    updateListItem,
    deleteListItem,
    resetList,
    refreshDataDirInfo,
  };
}
