import { useState, useCallback, useEffect } from 'react';
import { AuditLog, AuditLogFilter } from '../../shared/types';

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<AuditLogFilter>({
    action_type: 'all',
    entity_type: 'all',
  });

  const loadLogs = useCallback(async (currentFilter?: AuditLogFilter) => {
    try {
      setLoading(true);
      const data = await window.electronAPI.getAuditLogs(currentFilter || filter);
      setLogs(data || []);
    } catch (err: any) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const addLog = async (entry: { action_type: string; entity_type: string; entity_id?: number | null; entity_name: string; details?: string }) => {
    try {
      await window.electronAPI.createAuditLog(entry);
      await loadLogs();
    } catch (e) {
      console.warn('Failed to insert audit log:', e);
    }
  };

  return {
    logs,
    loading,
    filter,
    setFilter,
    loadLogs,
    addLog,
  };
}
