import { useState, useCallback } from 'react';
import {
  ExecutionFile,
  ExecutionDetails,
  ExecutionFilter,
  CreateExecutionFileInput,
  CreateExecutionActionInput,
  ExecutionAction,
  CreateExecutionHearingInput,
  ExecutionHearing,
  ExecutionHearingStatus,
  FinancialTransaction,
  TransactionDirection,
  PaymentMethod
} from '../../shared/types';

export function useExecutions() {
  const [files, setFiles] = useState<ExecutionFile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFiles = useCallback(async (filter?: ExecutionFilter) => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getExecutionFiles(filter);
      setFiles(data);
      return data;
    } catch (err) {
      console.error('Failed to load execution files:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getFileById = useCallback(async (id: number): Promise<ExecutionDetails | null> => {
    try {
      return await window.electronAPI.getExecutionFileById(id);
    } catch (err) {
      console.error('Failed to get execution file by id:', err);
      return null;
    }
  }, []);

  const createFile = useCallback(async (input: CreateExecutionFileInput): Promise<ExecutionFile> => {
    const created = await window.electronAPI.createExecutionFile(input);
    setFiles(prev => [created, ...prev]);
    return created;
  }, []);

  const updateFile = useCallback(async (id: number, updates: Partial<CreateExecutionFileInput>): Promise<ExecutionFile> => {
    const updated = await window.electronAPI.updateExecutionFile(id, updates);
    setFiles(prev => prev.map(f => (f.id === id ? updated : f)));
    return updated;
  }, []);

  const deleteFile = useCallback(async (id: number): Promise<{ success: boolean; message?: string }> => {
    const res = await window.electronAPI.deleteExecutionFile(id);
    if (res.success) {
      setFiles(prev => prev.filter(f => f.id !== id));
    }
    return res;
  }, []);

  const recordSettlement = useCallback(async (id: number, settlementMinutes: string, settlementDate?: string): Promise<ExecutionFile> => {
    const updated = await window.electronAPI.recordExecutionSettlement(id, settlementMinutes, settlementDate);
    setFiles(prev => prev.map(f => (f.id === id ? updated : f)));
    return updated;
  }, []);

  const getActions = useCallback(async (executionId: number): Promise<ExecutionAction[]> => {
    return await window.electronAPI.getExecutionActions(executionId);
  }, []);

  const createAction = useCallback(async (input: CreateExecutionActionInput): Promise<ExecutionAction> => {
    return await window.electronAPI.createExecutionAction(input);
  }, []);

  const updateAction = useCallback(async (id: number, updates: Partial<ExecutionAction>): Promise<ExecutionAction> => {
    return await window.electronAPI.updateExecutionAction(id, updates);
  }, []);

  const deleteAction = useCallback(async (id: number): Promise<{ success: boolean }> => {
    return await window.electronAPI.deleteExecutionAction(id);
  }, []);

  const getHearings = useCallback(async (executionId: number): Promise<ExecutionHearing[]> => {
    return await window.electronAPI.getExecutionHearings(executionId);
  }, []);

  const createHearing = useCallback(async (input: CreateExecutionHearingInput): Promise<ExecutionHearing> => {
    return await window.electronAPI.createExecutionHearing(input);
  }, []);

  const updateHearing = useCallback(async (id: number, updates: Partial<ExecutionHearing>): Promise<ExecutionHearing> => {
    return await window.electronAPI.updateExecutionHearing(id, updates);
  }, []);

  const deleteHearing = useCallback(async (id: number): Promise<{ success: boolean }> => {
    return await window.electronAPI.deleteExecutionHearing(id);
  }, []);

  const recordHearingOutcome = useCallback(async (hearingId: number, outcome: {
    attended: number;
    attended_by?: string;
    proceedings?: string;
    court_decision: string;
    adjournment_reason?: string;
    next_hearing_date?: string;
    status: ExecutionHearingStatus;
  }) => {
    return await window.electronAPI.recordExecutionHearingOutcome(hearingId, outcome);
  }, []);

  const recordPayment = useCallback(async (params: {
    executionId: number;
    amount: number;
    direction: TransactionDirection;
    transactionType: string;
    paymentMethod: PaymentMethod;
    description: string;
    date?: string;
    notes?: string;
  }): Promise<FinancialTransaction> => {
    const tx = await window.electronAPI.recordExecutionPayment(params);
    // Reload files so collected amount and status stay synced
    loadFiles();
    return tx;
  }, [loadFiles]);

  return {
    files,
    loading,
    loadFiles,
    getFileById,
    createFile,
    updateFile,
    deleteFile,
    recordSettlement,
    getActions,
    createAction,
    updateAction,
    deleteAction,
    getHearings,
    createHearing,
    updateHearing,
    deleteHearing,
    recordHearingOutcome,
    recordPayment,
  };
}
