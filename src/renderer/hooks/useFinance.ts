import { useState, useCallback } from 'react';
import {
  CaseFeeAgreement,
  CaseFinancialSummary,
  ChequeDetail,
  ChequeStatus,
  FinancialFilter,
  FinancialTransaction,
  GeneralFinancialStats
} from '../../shared/types';

export function useFinance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFeeAgreement = useCallback(async (caseId: number): Promise<CaseFeeAgreement | null> => {
    try {
      return await window.electronAPI.getFeeAgreement(caseId);
    } catch (err: any) {
      console.error('Failed to get fee agreement:', err);
      return null;
    }
  }, []);

  const saveFeeAgreement = useCallback(async (data: any): Promise<CaseFeeAgreement | null> => {
    setLoading(true);
    setError(null);
    try {
      return await window.electronAPI.saveFeeAgreement(data);
    } catch (err: any) {
      setError(err?.message || 'فشل في حفظ اتفاق الأتعاب');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFinancialTransactions = useCallback(async (filter?: FinancialFilter): Promise<FinancialTransaction[]> => {
    setLoading(true);
    setError(null);
    try {
      return await window.electronAPI.getFinancialTransactions(filter);
    } catch (err: any) {
      setError(err?.message || 'فشل في تحميل الحركات المالية');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createFinancialTransaction = useCallback(async (tx: any, cheque?: any): Promise<FinancialTransaction | null> => {
    setLoading(true);
    setError(null);
    try {
      return await window.electronAPI.createFinancialTransaction(tx, cheque);
    } catch (err: any) {
      setError(err?.message || 'فشل في تسجيل الحركة المالية');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reverseFinancialTransaction = useCallback(async (transactionId: number, reason: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await window.electronAPI.reverseFinancialTransaction(transactionId, reason);
      return true;
    } catch (err: any) {
      setError(err?.message || 'فشل في إلغاء الحركة بالقيد العكسي');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCaseFinancialSummary = useCallback(async (caseId: number): Promise<CaseFinancialSummary> => {
    try {
      return await window.electronAPI.getCaseFinancialSummary(caseId);
    } catch (err: any) {
      console.error('Failed to get case financial summary:', err);
      return {
        total_agreed_fees: 0,
        paid_fees: 0,
        remaining_fees: 0,
        total_court_fees_inflow: 0,
        total_court_fees_outflow: 0,
        total_expenses_inflow: 0,
        total_expenses_outflow: 0,
        total_execution_inflow: 0,
        total_execution_outflow: 0,
        total_inflow: 0,
        total_outflow: 0,
        net_balance: 0
      };
    }
  }, []);

  const getClientFinancialSummary = useCallback(async (clientId: number) => {
    try {
      return await window.electronAPI.getClientFinancialSummary(clientId);
    } catch (err: any) {
      console.error('Failed to get client financial summary:', err);
      return {
        total_agreed_fees: 0,
        paid_fees: 0,
        remaining_fees: 0,
        net_balance: 0
      };
    }
  }, []);

  const getCheques = useCallback(async (filter?: any): Promise<ChequeDetail[]> => {
    setLoading(true);
    setError(null);
    try {
      return await window.electronAPI.getCheques(filter);
    } catch (err: any) {
      setError(err?.message || 'فشل في تحميل تفاصيل الشيكات');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const updateChequeStatus = useCallback(async (id: number, status: ChequeStatus, collectedDate?: string): Promise<ChequeDetail | null> => {
    try {
      return await window.electronAPI.updateChequeStatus(id, status, collectedDate);
    } catch (err: any) {
      console.error('Failed to update cheque status:', err);
      return null;
    }
  }, []);

  const getGeneralFinancialStats = useCallback(async (period?: any): Promise<GeneralFinancialStats> => {
    try {
      return await window.electronAPI.getGeneralFinancialStats(period);
    } catch (err: any) {
      console.error('Failed to get general financial stats:', err);
      return {
        total_income: 0,
        total_expense: 0,
        net_profit: 0,
        outstanding_fees: 0,
        pending_cheques_count: 0,
        pending_cheques_amount: 0
      };
    }
  }, []);

  const getNextReceiptNumber = useCallback(async (): Promise<string> => {
    try {
      return await window.electronAPI.getNextReceiptNumber();
    } catch (err: any) {
      console.error('Failed to get next receipt number:', err);
      return 'REC-' + new Date().getFullYear() + '-0001';
    }
  }, []);

  return {
    loading,
    error,
    getFeeAgreement,
    saveFeeAgreement,
    getFinancialTransactions,
    createFinancialTransaction,
    reverseFinancialTransaction,
    getCaseFinancialSummary,
    getClientFinancialSummary,
    getCheques,
    updateChequeStatus,
    getGeneralFinancialStats,
    getNextReceiptNumber
  };
}
