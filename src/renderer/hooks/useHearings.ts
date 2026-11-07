import { useState, useCallback } from 'react';
import {
  Hearing,
  HearingWithCase,
  HearingRollFilter,
  CaseHearingStats,
  AppealDeadline,
  HearingStatus
} from '../../shared/types';
import { entityEventBus } from '../services/eventBus';

export function useHearings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getHearingsByCase = useCallback(async (caseId: number): Promise<Hearing[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.electronAPI.getHearingsByCase(caseId);
      return data;
    } catch (err: any) {
      setError(err?.message || 'فشل في تحميل جلسات القضية');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getHearingStatsByCase = useCallback(async (caseId: number): Promise<CaseHearingStats | null> => {
    try {
      const stats = await window.electronAPI.getHearingStatsByCase(caseId);
      return stats;
    } catch (err: any) {
      console.error('Failed to get hearing stats:', err);
      return null;
    }
  }, []);

  const getHearingRoll = useCallback(async (filter?: HearingRollFilter): Promise<HearingWithCase[]> => {
    setLoading(true);
    setError(null);
    try {
      const roll = await window.electronAPI.getHearingRoll(filter || {});
      return roll;
    } catch (err: any) {
      setError(err?.message || 'فشل في تحميل رول الجلسات');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createHearing = useCallback(async (hearing: Omit<Hearing, 'id' | 'created_at' | 'updated_at'>): Promise<Hearing | null> => {
    setLoading(true);
    setError(null);
    try {
      const created = await window.electronAPI.createHearing(hearing);
      entityEventBus.emitMultiple(['hearings', 'cases']);
      return created;
    } catch (err: any) {
      setError(err?.message || 'فشل في إنشاء الجلسة');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const recordOutcome = useCallback(async (hearingId: number, outcome: {
    attended: number;
    attended_by?: string;
    proceedings?: string;
    court_decision: string;
    adjournment_reason?: string;
    adjournment_notes?: string;
    next_hearing_date?: string;
    status: HearingStatus;
    is_judgment_hearing?: number;
    judgment_date?: string;
    judgment_text?: string;
  }): Promise<{ currentHearing: Hearing; nextHearing?: Hearing } | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.recordHearingOutcome(hearingId, outcome);
      entityEventBus.emitMultiple(['hearings', 'cases']);
      return res;
    } catch (err: any) {
      setError(err?.message || 'فشل في تسجيل نتيجة الجلسة');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateHearing = useCallback(async (id: number, updates: Partial<Hearing>): Promise<Hearing | null> => {
    setLoading(true);
    setError(null);
    try {
      const updated = await window.electronAPI.updateHearing(id, updates);
      entityEventBus.emitMultiple(['hearings', 'cases']);
      return updated;
    } catch (err: any) {
      setError(err?.message || 'فشل في تعديل بيانات الجلسة');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteHearing = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.deleteHearing(id);
      entityEventBus.emitMultiple(['hearings', 'cases']);
      return res.success;
    } catch (err: any) {
      setError(err?.message || 'فشل في حذف الجلسة');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAppealDeadlines = useCallback(async (caseId?: number): Promise<AppealDeadline[]> => {
    try {
      const deadlines = await window.electronAPI.getAppealDeadlines(caseId);
      return deadlines;
    } catch (err: any) {
      console.error('Failed to get appeal deadlines:', err);
      return [];
    }
  }, []);

  const saveAppealDeadline = useCallback(async (deadline: Omit<AppealDeadline, 'created_at' | 'days_remaining' | 'is_expired'>): Promise<AppealDeadline | null> => {
    try {
      const saved = await window.electronAPI.saveAppealDeadline(deadline);
      return saved;
    } catch (err: any) {
      console.error('Failed to save appeal deadline:', err);
      return null;
    }
  }, []);

  const deleteAppealDeadline = useCallback(async (id: number): Promise<boolean> => {
    try {
      const res = await window.electronAPI.deleteAppealDeadline(id);
      return res.success;
    } catch (err: any) {
      console.error('Failed to delete appeal deadline:', err);
      return false;
    }
  }, []);

  return {
    loading,
    error,
    getHearingsByCase,
    getHearingStatsByCase,
    getHearingRoll,
    createHearing,
    recordOutcome,
    updateHearing,
    deleteHearing,
    getAppealDeadlines,
    saveAppealDeadline,
    deleteAppealDeadline
  };
}
