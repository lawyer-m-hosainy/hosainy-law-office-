import { useState, useEffect, useCallback } from 'react';
import {
  CaseAnnouncement,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  AnnouncementFilter,
  AnnouncementWarning
} from '../../shared/types';
import { entityEventBus } from '../services/eventBus';

export function useAnnouncements(caseId?: number, filter?: AnnouncementFilter) {
  const [announcements, setAnnouncements] = useState<CaseAnnouncement[]>([]);
  const [warnings, setWarnings] = useState<AnnouncementWarning[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let data: CaseAnnouncement[] = [];

      if (caseId) {
        data = await window.electronAPI.getAnnouncementsByCase(caseId);
      } else {
        data = await window.electronAPI.getAllAnnouncements(filter);
      }

      setAnnouncements(data);
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
      setError(err?.message || 'حدث خطأ أثناء تحميل الإعلانات');
    } finally {
      setLoading(false);
    }
  }, [caseId, JSON.stringify(filter)]);

  const fetchWarnings = useCallback(async (threshold?: number) => {
    try {
      const data = await window.electronAPI.getAnnouncementWarnings(threshold);
      setWarnings(data);
    } catch (err) {
      console.error('Error fetching announcement warnings:', err);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();

    const unsubAnnouncements = entityEventBus.subscribe('announcements', () => {
      fetchAnnouncements();
      fetchWarnings();
    });

    const unsubHearings = entityEventBus.subscribe('hearings', () => {
      fetchAnnouncements();
      fetchWarnings();
    });

    return () => {
      unsubAnnouncements();
      unsubHearings();
    };
  }, [fetchAnnouncements, fetchWarnings]);

  const createAnnouncement = async (input: CreateAnnouncementInput): Promise<CaseAnnouncement> => {
    const created = await window.electronAPI.createAnnouncement(input);
    const toEmit: ('announcements' | 'finance')[] = ['announcements'];
    if (input.fee_amount && input.fee_amount > 0) {
      toEmit.push('finance');
    }
    entityEventBus.emitMultiple(toEmit);
    return created;
  };

  const updateAnnouncement = async (id: number, input: UpdateAnnouncementInput): Promise<CaseAnnouncement> => {
    const updated = await window.electronAPI.updateAnnouncement(id, input);
    entityEventBus.emit('announcements');
    return updated;
  };

  const createReattemptAnnouncement = async (
    parentAnnouncementId: number,
    input: Partial<CreateAnnouncementInput>
  ): Promise<CaseAnnouncement> => {
    const reattempt = await window.electronAPI.createReattemptAnnouncement(parentAnnouncementId, input);
    const toEmit: ('announcements' | 'finance')[] = ['announcements'];
    if (input.fee_amount && input.fee_amount > 0) {
      toEmit.push('finance');
    }
    entityEventBus.emitMultiple(toEmit);
    return reattempt;
  };

  const getAnnouncementById = async (id: number): Promise<CaseAnnouncement | null> => {
    try {
      return await window.electronAPI.getAnnouncementById(id);
    } catch (err) {
      console.error('Failed to get announcement by id:', err);
      return null;
    }
  };

  const deleteAnnouncement = async (id: number): Promise<{ success: boolean; message?: string }> => {
    const res = await window.electronAPI.deleteAnnouncement(id);
    if (res.success) {
      entityEventBus.emitMultiple(['announcements', 'finance']);
    }
    return res;
  };

  return {
    announcements,
    warnings,
    loading,
    error,
    refreshAnnouncements: fetchAnnouncements,
    refreshWarnings: fetchWarnings,
    getAnnouncementById,
    createAnnouncement,
    updateAnnouncement,
    createReattemptAnnouncement,
    deleteAnnouncement
  };
}
