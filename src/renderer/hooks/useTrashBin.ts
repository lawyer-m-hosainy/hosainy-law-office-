import { useState, useCallback, useEffect } from 'react';
import { TrashBinItem } from '../../shared/types';
import { entityEventBus, EntityType } from '../services/eventBus';

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

  // Subscribe to trash invalidation events
  useEffect(() => {
    return entityEventBus.subscribe('trash', () => {
      loadTrash();
    });
  }, [loadTrash]);

  // Map entity type strings to EventBus entity types
  const entityTypeToEventType = (entityType: string): EntityType | null => {
    const map: Record<string, EntityType> = {
      client: 'clients',
      clients: 'clients',
      case: 'cases',
      cases: 'cases',
      task: 'tasks',
      tasks: 'tasks',
      execution: 'executions',
      executions: 'executions',
    };
    return map[entityType] || null;
  };

  const restoreItem = async (entityType: string, entityId: number) => {
    try {
      const res = await window.electronAPI.restoreTrashItem(entityType, entityId);
      if (res.success) {
        await loadTrash();
        // Emit event for the restored entity type so other hooks refresh
        const eventType = entityTypeToEventType(entityType);
        if (eventType) {
          entityEventBus.emit(eventType);
        }
        entityEventBus.emit('trash');
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
        entityEventBus.emit('trash');
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
      // Emit all entity types since any of them could have been affected
      entityEventBus.emitMultiple(['clients', 'cases', 'tasks', 'executions', 'trash']);
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
