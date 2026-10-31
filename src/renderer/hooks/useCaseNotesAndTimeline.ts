import { useState, useCallback, useEffect } from 'react';
import {
  CaseNote,
  CreateCaseNoteInput,
  UpdateCaseNoteInput,
  CaseTimelineItem,
} from '../../shared/types';

export function useCaseNotesAndTimeline(caseId: number | null) {
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [timelineItems, setTimelineItems] = useState<CaseTimelineItem[]>([]);
  const [timelineStats, setTimelineStats] = useState({
    totalHearings: 0,
    adjournmentsCount: 0,
    topAdjournmentReason: 'لا يوجد تأجيلات',
    avgDaysBetweenHearings: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!caseId) {
      setNotes([]);
      return;
    }
    try {
      const data = await window.electronAPI.getCaseNotes(caseId);
      setNotes(data || []);
    } catch (err: any) {
      console.error('Failed to load case notes:', err);
    }
  }, [caseId]);

  const loadTimeline = useCallback(async () => {
    if (!caseId) {
      setTimelineItems([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await window.electronAPI.getCaseTimeline(caseId);
      setTimelineItems(res.items || []);
      if (res.stats) {
        setTimelineStats(res.stats);
      }
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل السجل الزمني للقضية');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadNotes();
    loadTimeline();
  }, [loadNotes, loadTimeline]);

  const createNote = async (input: CreateCaseNoteInput) => {
    try {
      await window.electronAPI.createCaseNote(input);
      await loadNotes();
      await loadTimeline();
      return true;
    } catch (err: any) {
      alert(`خطأ أثناء إضافة الملاحظة: ${err?.message}`);
      return false;
    }
  };

  const updateNote = async (id: number, updates: UpdateCaseNoteInput) => {
    try {
      await window.electronAPI.updateCaseNote(id, updates);
      await loadNotes();
      await loadTimeline();
      return true;
    } catch (err: any) {
      alert(`خطأ أثناء تعديل الملاحظة: ${err?.message}`);
      return false;
    }
  };

  const deleteNote = async (id: number) => {
    try {
      await window.electronAPI.deleteCaseNote(id);
      await loadNotes();
      await loadTimeline();
      return true;
    } catch (err: any) {
      alert(`خطأ أثناء حذف الملاحظة: ${err?.message}`);
      return false;
    }
  };

  return {
    notes,
    timelineItems,
    timelineStats,
    loading,
    error,
    loadNotes,
    loadTimeline,
    createNote,
    updateNote,
    deleteNote,
  };
}
