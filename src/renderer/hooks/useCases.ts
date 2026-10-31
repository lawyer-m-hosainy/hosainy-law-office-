import { useState, useEffect, useCallback } from 'react';
import { Case, CaseDetails, CaseFilter, CreateCaseInput } from '../../shared/types';

export function useCases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCases = useCallback(async (filter?: CaseFilter) => {
    try {
      setLoading(true);
      setError(null);
      const data = await window.electronAPI.getCases(filter);
      setCases(data);
    } catch (err: any) {
      console.error('Failed to load cases:', err);
      setError(err?.message || 'تعذر تحميل ملفات القضايا');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const getCaseById = async (id: number): Promise<CaseDetails | null> => {
    try {
      return await window.electronAPI.getCaseById(id);
    } catch (err) {
      console.error('Failed to load case by id:', err);
      return null;
    }
  };

  const createCase = async (input: CreateCaseInput) => {
    try {
      const created = await window.electronAPI.createCase(input);
      setCases((prev) => [created, ...prev]);
      return { success: true, created };
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر إضافة ملف القضية' };
    }
  };

  const updateCase = async (id: number, input: Partial<CreateCaseInput>) => {
    try {
      const updated = await window.electronAPI.updateCase(id, input);
      setCases((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return { success: true, updated };
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر تحديث بيانات القضية' };
    }
  };

  const deleteCase = async (id: number) => {
    try {
      const res = await window.electronAPI.deleteCase(id);
      if (res.success) {
        setCases((prev) => prev.filter((c) => c.id !== id));
      }
      return res;
    } catch (err: any) {
      return { success: false, message: err?.message || 'تعذر حذف القضية' };
    }
  };

  return {
    cases,
    loading,
    error,
    refresh: loadCases,
    getCaseById,
    createCase,
    updateCase,
    deleteCase,
  };
}
