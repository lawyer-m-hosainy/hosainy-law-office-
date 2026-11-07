import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Coins,
  Plus,
  Printer,
  CheckCircle2,
  RotateCcw,
  Scale,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Clock,
  ShieldCheck,
  Trash2,
  Edit2
} from 'lucide-react';
import {
  CaseDetails,
  CaseFeeAgreement,
  CaseFinancialSummary,
  FinancialTransaction,
  OfficeSettings,
  PaymentMethod,
  TransactionCategory,
  TransactionDirection
} from '../../../../shared/types';
import { useFinance } from '../../../hooks/useFinance';
import { generateClientStatementHtml } from '../../../services/clientStatementReportGenerator';
import { generateReceiptHtml } from '../../../services/receiptReportGenerator';
import { tafqit } from '../../../../shared/tafqit';

interface CaseFinanceTabProps {
  caseData: CaseDetails;
  settings: OfficeSettings;
  onCaseUpdated?: () => void;
}

export const CaseFinanceTab: React.FC<CaseFinanceTabProps> = ({
  caseData,
  settings,
  onCaseUpdated
}) => {
  const {
    getFeeAgreement,
    saveFeeAgreement,
    getFinancialTransactions,
    createFinancialTransaction,
    reverseFinancialTransaction,
    getCaseFinancialSummary,
  } = useFinance();

  // State
  const [agreement, setAgreement] = useState<CaseFeeAgreement | null>(null);
  const [summary, setSummary] = useState<CaseFinancialSummary>({
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
  });
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('الكل');

  // Modals
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [selectedTxToReverse, setSelectedTxToReverse] = useState<FinancialTransaction | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  // Transaction form
  const [txForm, setTxForm] = useState({
    direction: 'وارد' as TransactionDirection,
    category: 'أتعاب' as TransactionCategory,
    transaction_type: 'أتعاب - دفعة مرحلية',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: 'نقدي' as PaymentMethod,
    installment_id: '' as string,
    description: '',
    notes: '',
    printImmediately: true,
    // Cheque fields
    cheque_number: '',
    bank_name: '',
    drawer_name: '',
    due_date: new Date().toISOString().split('T')[0]
  });

  // Agreement form
  const [agreementForm, setAgreementForm] = useState({
    agreement_type: 'مبلغ مقطوع' as any,
    total_amount: '',
    percentage: '',
    amount_per_session: '',
    monthly_amount: '',
    terms_notes: '',
    installments: [] as { title: string; amount: number; due_date: string; notes?: string }[]
  });

  // Subtypes from configurable lists
  const [transactionTypes, setTransactionTypes] = useState<string[]>([]);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ag, sm, txList, typesList] = await Promise.all([
        getFeeAgreement(caseData.id),
        getCaseFinancialSummary(caseData.id),
        getFinancialTransactions({ case_id: caseData.id, includeReversed: true }),
        window.electronAPI.getListItems('transaction_types')
      ]);

      setAgreement(ag);
      setSummary(sm);
      setTransactions(txList);
      setTransactionTypes(typesList.map(t => t.name));
    } catch (err) {
      console.error('Failed to load financial data:', err);
    } finally {
      setLoading(false);
    }
  }, [caseData.id, getFeeAgreement, getCaseFinancialSummary, getFinancialTransactions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter transactions by selected category
  const filteredTransactions = useMemo(() => {
    if (activeCategoryFilter === 'الكل') return transactions;
    return transactions.filter(t => t.category === activeCategoryFilter);
  }, [transactions, activeCategoryFilter]);

  // Open Agreement Modal
  const handleOpenAgreementModal = () => {
    if (agreement) {
      setAgreementForm({
        agreement_type: agreement.agreement_type,
        total_amount: String(agreement.total_amount || ''),
        percentage: String(agreement.percentage || ''),
        amount_per_session: String(agreement.amount_per_session || ''),
        monthly_amount: String(agreement.monthly_amount || ''),
        terms_notes: agreement.terms_notes || '',
        installments: (agreement.installments || []).map(i => ({
          title: i.title,
          amount: i.amount,
          due_date: i.due_date || '',
          notes: i.notes || ''
        }))
      });
    } else {
      setAgreementForm({
        agreement_type: 'مبلغ مقطوع',
        total_amount: '',
        percentage: '',
        amount_per_session: '',
        monthly_amount: '',
        terms_notes: '',
        installments: [
          { title: 'مقدم أتعاب عند التعاقد', amount: 0, due_date: new Date().toISOString().split('T')[0] },
          { title: 'مؤخر أتعاب عند صدور الحكم', amount: 0, due_date: '' }
        ]
      });
    }
    setShowAgreementModal(true);
  };

  // Submit Agreement
  const handleSubmitAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(agreementForm.total_amount) || 0;

    try {
      await saveFeeAgreement({
        case_id: caseData.id,
        client_id: caseData.clients?.[0]?.client_id || null,
        agreement_type: agreementForm.agreement_type,
        total_amount: total,
        percentage: parseFloat(agreementForm.percentage) || null,
        amount_per_session: parseFloat(agreementForm.amount_per_session) || null,
        monthly_amount: parseFloat(agreementForm.monthly_amount) || null,
        terms_notes: agreementForm.terms_notes || null,
        installments: agreementForm.installments.map(inst => ({
          title: inst.title,
          amount: Number(inst.amount) || 0,
          due_date: inst.due_date || null,
          notes: inst.notes || null
        }))
      });

      setShowAgreementModal(false);
      await loadData();
      if (onCaseUpdated) onCaseUpdated();
      alert('تم حفظ اتفاق الأتعاب وجدول الدفعات بنجاح');
    } catch (err: any) {
      alert(err?.message || 'فشل في حفظ اتفاق الأتعاب');
    }
  };

  // Submit Transaction
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(txForm.amount);
    if (!amt || amt <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    if (!txForm.description.trim()) {
      alert('يرجى كتابة بيان ووصف الحركة المالية');
      return;
    }

    try {
      const chequeData = txForm.payment_method === 'شيك' ? {
        cheque_number: txForm.cheque_number,
        bank_name: txForm.bank_name,
        drawer_name: txForm.drawer_name || undefined,
        due_date: txForm.due_date,
        notes: txForm.notes || undefined
      } : undefined;

      const created = await createFinancialTransaction({
        case_id: caseData.id,
        client_id: caseData.clients?.[0]?.client_id || null,
        transaction_date: txForm.transaction_date,
        category: txForm.category,
        transaction_type: txForm.transaction_type,
        direction: txForm.direction,
        amount: amt,
        payment_method: txForm.payment_method,
        installment_id: txForm.installment_id ? parseInt(txForm.installment_id) : null,
        description: txForm.description.trim(),
        notes: txForm.notes.trim() || null
      }, chequeData);

      if (created) {
        setShowAddTxModal(false);
        // Reset form
        setTxForm({
          direction: 'وارد',
          category: 'أتعاب',
          transaction_type: 'أتعاب - دفعة مرحلية',
          amount: '',
          transaction_date: new Date().toISOString().split('T')[0],
          payment_method: 'نقدي',
          installment_id: '',
          description: '',
          notes: '',
          printImmediately: true,
          cheque_number: '',
          bank_name: '',
          drawer_name: '',
          due_date: new Date().toISOString().split('T')[0]
        });

        await loadData();
        if (onCaseUpdated) onCaseUpdated();

        // Print receipt if requested
        if (txForm.printImmediately) {
          handlePrintReceipt(created);
        } else {
          alert(`تم تسجيل الحركة بنجاح برقم إيصال: ${created.receipt_number}`);
        }
      }
    } catch (err: any) {
      alert(err?.message || 'فشل في تسجيل الحركة المالية');
    }
  };

  // Submit Reversal
  const handleSubmitReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxToReverse) return;
    if (!reverseReason.trim()) {
      alert('يرجى كتابة سبب الإلغاء والقيد العكسي');
      return;
    }

    try {
      const success = await reverseFinancialTransaction(selectedTxToReverse.id, reverseReason.trim());
      if (success) {
        setShowReverseModal(false);
        setSelectedTxToReverse(null);
        setReverseReason('');
        await loadData();
        if (onCaseUpdated) onCaseUpdated();
        alert('تم إلغاء الحركة وتوليد القيد العكسي بنجاح وتحديث الحسابات');
      }
    } catch (err: any) {
      alert(err?.message || 'فشل في إلغاء الحركة');
    }
  };

  // Print Receipt
  const handlePrintReceipt = async (tx: FinancialTransaction) => {
    const htmlContent = generateReceiptHtml(tx, settings);
    await window.electronAPI.executePrint({
      htmlContent,
      title: `إيصال_${tx.receipt_number}`,
      action: 'preview',
      suggestedFileName: `إيصال_${tx.receipt_number}.pdf`
    });
  };

  // Print Statement of Account
  const handlePrintStatement = async () => {
    const clientName = caseData.clients?.[0]?.client_name || (caseData.clients?.[0] as any)?.name || 'الموكل';
    const htmlContent = generateClientStatementHtml(summary, transactions, settings, {
      clientName,
      clientPhone: caseData.clients?.[0]?.client_phone || (caseData.clients?.[0] as any)?.phone,
      caseNumber: caseData.case_number,
      caseYear: caseData.case_year,
      courtName: caseData.court_name,
      subject: caseData.subject,
      periodText: `كشف حساب للقضية رقم ${caseData.case_number} لسنة ${caseData.case_year}`
    });

    await window.electronAPI.executePrint({
      htmlContent,
      title: `كشف_حساب_${clientName}_${caseData.case_number}`,
      action: 'preview',
      suggestedFileName: `كشف_حساب_${clientName}_${caseData.case_number}.pdf`
    });
  };

  const isCredit = summary.net_balance >= 0;

  if (loading && transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
        <Clock className="w-8 h-8 animate-spin mx-auto text-amber-600 mb-2" />
        جاري تحميل البيانات والحسابات المالية للقضية...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Account Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Agreed Fees */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">الأتعاب المتفق عليها</span>
            <Coins className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {summary.total_agreed_fees.toLocaleString('ar-EG', { minimumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {agreement ? `اتفاق: ${agreement.agreement_type}` : 'لم يتم تحديد اتفاق'}
          </div>
        </div>

        {/* Paid Fees */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">المدفوع من الأتعاب</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {summary.paid_fees.toLocaleString('ar-EG', { minimumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {summary.total_agreed_fees > 0 
              ? `تم سداد ${Math.round((summary.paid_fees / summary.total_agreed_fees) * 100)}% من الأتعاب`
              : 'مسدد بالكامل'}
          </div>
        </div>

        {/* Remaining Fees */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">متبقي الأتعاب</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {summary.remaining_fees.toLocaleString('ar-EG', { minimumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            مستحق السداد للمكتب
          </div>
        </div>

        {/* Actual Expenses Spent */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">المصروفات والرسوم</span>
            <Scale className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-800">
            {summary.total_outflow.toLocaleString('ar-EG', { minimumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            رسوم: {summary.total_court_fees_outflow} | مصاريف: {summary.total_expenses_outflow}
          </div>
        </div>
      </div>

      {/* Net Balance Banner with Tafqit */}
      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
        isCredit 
          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' 
          : 'bg-rose-50/70 border-rose-300 text-rose-950'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <span>رصيد حساب الموكل النهائي في القضية:</span>
            <span className="text-xs px-2 py-0.5 rounded font-bold bg-white/80 border">
              {isCredit ? 'رصيد دائن للموكل (له أمانة متوفرة)' : 'مستحق على الموكل (مدين للمكتب)'}
            </span>
          </div>
          <div className="text-xs text-slate-600">
            {tafqit(Math.abs(summary.net_balance))}
          </div>
        </div>

        <div className="text-left">
          <div className="text-2xl font-black">
            {Math.abs(summary.net_balance).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} <span className="text-sm">ج.م</span>
          </div>
        </div>
      </div>

      {/* 2. Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-600" />
          <h3 className="text-base font-bold text-slate-800">
            السجل المالي للقضية ({transactions.length} حركة)
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrintStatement}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" data-testid="case.finance.tab.handle-print-statement"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            طباعة كشف حساب الموكل
          </button>

          <button
            onClick={handleOpenAgreementModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors" data-testid="case.finance.tab.handle-open-agreement-modal"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {agreement ? 'تعديل اتفاق الأتعاب' : 'تسجيل اتفاق الأتعاب'}
          </button>

          <button
            onClick={() => setShowAddTxModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm" data-testid="case.finance.tab.set-show-add-tx-modal"
          >
            <Plus className="w-4 h-4" />
            تسجيل حركة مالية
          </button>
        </div>
      </div>

      {/* 3. Fee Agreement & Installments Card */}
      {agreement && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-800">
                اتفاق الأتعاب وجدول الدفعات المقررة
              </h4>
              <span className="text-xs bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded font-bold border border-indigo-200">
                {agreement.agreement_type}
              </span>
            </div>

            <div className="text-xs text-slate-600">
              إجمالي الاتفاق: <strong className="text-slate-900 font-extrabold">{agreement.total_amount.toLocaleString('ar-EG')} ج.م</strong>
            </div>
          </div>

          {agreement.terms_notes && (
            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <strong>شروط وملاحظات الاتفاق:</strong> {agreement.terms_notes}
            </div>
          )}

          {agreement.installments && agreement.installments.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {agreement.installments.map((inst) => (
                <div key={inst.id} className="p-3 rounded-lg border bg-slate-50/60 border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>{inst.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      inst.status === 'مسددة بالكامل' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : inst.status === 'مسددة جزئياً'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                    }`}>
                      {inst.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>المبلغ المطلوب:</span>
                    <strong>{inst.amount.toLocaleString('ar-EG')} ج.م</strong>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>المسدد:</span>
                    <strong>{inst.paid_amount.toLocaleString('ar-EG')} ج.م</strong>
                  </div>
                  {inst.due_date && (
                    <div className="text-[11px] text-slate-400">
                      ميعاد الاستحقاق: {inst.due_date}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <span className="text-xs font-bold text-slate-500 ml-2">تصنيف الحركات:</span>
        {[
          { id: 'الكل', label: `كافة الحركات (${transactions.length})` },
          { id: 'أتعاب', label: 'أتعاب المحاماة' },
          { id: 'رسوم قضائية', label: 'الرسوم القضائية' },
          { id: 'مصاريف', label: 'المصاريف الإدارية والانتقالات' },
          { id: 'تنفيذ', label: 'أتعاب ومصاريف التنفيذ' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategoryFilter(tab.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              activeCategoryFilter === tab.id
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`} data-testid="case.finance.tab.set-active-category-filter"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 5. Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Coins className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">لا توجد حركات مالية مسجلة في هذا التصنيف</h4>
            <p className="text-xs text-slate-400">اضغط على زر "تسجيل حركة مالية" لإضافة دفعة أتعاب أو سداد رسوم.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-slate-800 text-white font-bold border-b border-slate-700">
                <tr>
                  <th className="p-3 w-12 text-center">م</th>
                  <th className="p-3 w-24 text-center">التاريخ</th>
                  <th className="p-3 w-28 text-center">رقم الإيصال</th>
                  <th className="p-3 w-24 text-center">الفئة</th>
                  <th className="p-3 w-20 text-center">الاتجاه</th>
                  <th className="p-3">البيان والوصف</th>
                  <th className="p-3 w-24 text-center">طريقة الدفع</th>
                  <th className="p-3 w-28 text-left">المبلغ</th>
                  <th className="p-3 w-32 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx, idx) => {
                  const isIncome = tx.direction === 'وارد';

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        tx.is_reversed ? 'bg-rose-50/30 opacity-70 line-through' : ''
                      } ${tx.reversal_of_id ? 'bg-amber-50/40' : ''}`}
                    >
                      <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 text-center whitespace-nowrap">{tx.transaction_date}</td>
                      <td className="p-3 text-center">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {tx.receipt_number}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[11px]">
                          {tx.category}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded font-bold text-[11px] ${
                          isIncome 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isIncome ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.direction}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{tx.description}</div>
                        <div className="text-[11px] text-slate-500">{tx.transaction_type}</div>
                        {tx.is_reversed === 1 && (
                          <div className="text-[11px] text-red-600 font-bold mt-0.5">
                            ⚠️ ملغاة بقيد عكسي — السبب: {tx.reversal_reason || 'غير محدد'}
                          </div>
                        )}
                        {tx.reversal_of_id && (
                          <div className="text-[11px] text-amber-700 font-bold mt-0.5">
                            🔄 قيد تسوية عكسي للإيصال الأصلي
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="font-semibold text-slate-700">{tx.payment_method}</div>
                        {tx.cheque_details && (
                          <div className="text-[10px] text-slate-500">
                            شيك: {tx.cheque_details.cheque_number}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-left font-black text-sm whitespace-nowrap" dir="ltr">
                        <span className={isIncome ? 'text-emerald-700' : 'text-rose-700'}>
                          {isIncome ? '+' : '-'}{tx.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handlePrintReceipt(tx)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="طباعة إيصال السداد" data-testid="case.finance.tab.handle-print-receipt"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>

                          {!tx.is_reversed && !tx.reversal_of_id && (
                            <button
                              onClick={() => {
                                setSelectedTxToReverse(tx);
                                setReverseReason('');
                                setShowReverseModal(true);
                              }}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                              title="إلغاء الحركة بقيد عكسي" data-testid="case.finance.tab.set-selected-tx-to-reverse"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Modal: Add Transaction */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-600" />
                تسجيل حركة مالية جديدة
              </h3>
              <button
                onClick={() => setShowAddTxModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg" data-testid="case.finance.tab.set-show-add-tx-modal-2"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="space-y-3.5">
              {/* Direction & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اتجاه الحركة</label>
                  <select
                    value={txForm.direction}
                    onChange={(e) => setTxForm({ ...txForm, direction: e.target.value as TransactionDirection })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white font-bold" data-testid="case.finance.tab.set-tx-form"
                  >
                    <option value="وارد">وارد (مدفوع من الموكل للمكتب)</option>
                    <option value="صادر">صادر (مصروف من المكتب على القضية)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الفئة المالية</label>
                  <select
                    value={txForm.category}
                    onChange={(e) => setTxForm({ ...txForm, category: e.target.value as TransactionCategory })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white font-bold" data-testid="case.finance.tab.set-tx-form-2"
                  >
                    <option value="أتعاب">أتعاب المحاماة</option>
                    <option value="رسوم قضائية">رسوم قضائية</option>
                    <option value="مصاريف">مصاريف وإداريات</option>
                    <option value="تنفيذ">أتعاب ومصاريف تنفيذ</option>
                  </select>
                </div>
              </div>

              {/* Subtype & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الحركة الفرعي</label>
                  <input
                    type="text"
                    list="tx-subtypes"
                    value={txForm.transaction_type}
                    onChange={(e) => setTxForm({ ...txForm, transaction_type: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.finance.tab.set-tx-form-5"
                  />
                  <datalist id="tx-subtypes">
                    {transactionTypes.map((t, i) => (
                      <option key={i} value={t} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المبلغ بالجنيه <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full text-xs p-2 rounded border border-amber-300 bg-amber-50/50 font-bold text-slate-900"
                    required data-testid="case.finance.tab.set-tx-form-6"
                  />
                </div>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الحركة</label>
                  <input
                    type="date"
                    value={txForm.transaction_date}
                    onChange={(e) => setTxForm({ ...txForm, transaction_date: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                    required data-testid="case.finance.tab.set-tx-form-7"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع</label>
                  <select
                    value={txForm.payment_method}
                    onChange={(e) => setTxForm({ ...txForm, payment_method: e.target.value as PaymentMethod })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.finance.tab.set-tx-form-3"
                  >
                    <option value="نقدي">نقدي (كاش)</option>
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="شيك">شيك بنكي</option>
                    <option value="فودافون كاش">فودافون كاش</option>
                    <option value="إنستاباي">إنستاباي (InstaPay)</option>
                  </select>
                </div>
              </div>

              {/* Link to installment if Fees */}
              {txForm.category === 'أتعاب' && agreement?.installments && agreement.installments.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ربط بدفعة أتعاب محددة (اختياري)</label>
                  <select
                    value={txForm.installment_id}
                    onChange={(e) => setTxForm({ ...txForm, installment_id: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.finance.tab.set-tx-form-4"
                  >
                    <option value="">بدون ربط بدفعة محددة</option>
                    {agreement.installments.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.title} ({inst.amount} ج.م) — المسدد منها {inst.paid_amount} ج.م
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Cheque Details fields if payment method is Cheque */}
              {txForm.payment_method === 'شيك' && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2.5">
                  <div className="font-bold text-indigo-900 text-xs">بيانات الشيك البنكي:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الشيك *</label>
                      <input
                        type="text"
                        value={txForm.cheque_number}
                        onChange={(e) => setTxForm({ ...txForm, cheque_number: e.target.value })}
                        className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white"
                        required data-testid="case.finance.tab.set-tx-form-8"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم البنك *</label>
                      <input
                        type="text"
                        value={txForm.bank_name}
                        onChange={(e) => setTxForm({ ...txForm, bank_name: e.target.value })}
                        className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white"
                        required data-testid="case.finance.tab.set-tx-form-9"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الساحب</label>
                      <input
                        type="text"
                        value={txForm.drawer_name}
                        onChange={(e) => setTxForm({ ...txForm, drawer_name: e.target.value })}
                        className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white" data-testid="case.finance.tab.set-tx-form-10"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الاستحقاق *</label>
                      <input
                        type="date"
                        value={txForm.due_date}
                        onChange={(e) => setTxForm({ ...txForm, due_date: e.target.value })}
                        className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white"
                        required data-testid="case.finance.tab.set-tx-form-11"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  البيان والوصف <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  placeholder="مثلاً: سداد الدفعة الأولى من الأتعاب / سداد رسوم استئناف بخزينة المحكمة"
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                  required data-testid="case.finance.tab.set-tx-form-12"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  value={txForm.notes}
                  onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.finance.tab.set-tx-form-13"
                />
              </div>

              {/* Print Receipt immediately checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={txForm.printImmediately}
                  onChange={(e) => setTxForm({ ...txForm, printImmediately: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4" data-testid="case.finance.tab.set-tx-form-14"
                />
                <span className="text-xs font-semibold text-slate-800">
                  معاينة وطباعة إيصال السداد المرقّم فور الحفظ
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg" data-testid="case.finance.tab.set-show-add-tx-modal-3"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm" data-testid="case.finance.tab.save"
                >
                  حفظ الحركة المالية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal: Fee Agreement & Installments */}
      {showAgreementModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Coins className="w-5 h-5 text-indigo-600" />
                اتفاق الأتعاب وجدول الدفعات المقررة
              </h3>
              <button
                onClick={() => setShowAgreementModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg" data-testid="case.finance.tab.set-show-agreement-modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitAgreement} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الاتفاق</label>
                  <select
                    value={agreementForm.agreement_type}
                    onChange={(e) => setAgreementForm({ ...agreementForm, agreement_type: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white font-bold" data-testid="case.finance.tab.set-agreement-form"
                  >
                    <option value="مبلغ مقطوع">مبلغ مقطوع (شامل)</option>
                    <option value="على مراحل">على مراحل إجرائية</option>
                    <option value="نسبة من المحكوم به">نسبة مئوية من المحكوم به</option>
                    <option value="بالجلسة">بالجلسة</option>
                    <option value="شهري">شهري</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    إجمالي مبلغ الأتعاب المتفق عليه <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={agreementForm.total_amount}
                    onChange={(e) => setAgreementForm({ ...agreementForm, total_amount: e.target.value })}
                    placeholder="0"
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white font-bold"
                    required data-testid="case.finance.tab.set-agreement-form-4"
                  />
                </div>
              </div>

              {agreementForm.agreement_type === 'نسبة من المحكوم به' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">النسبة المئوية (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={agreementForm.percentage}
                    onChange={(e) => setAgreementForm({ ...agreementForm, percentage: e.target.value })}
                    placeholder="مثلاً: 10"
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.finance.tab.set-agreement-form-5"
                  />
                </div>
              )}

              {/* Installments List Editor */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">جدول الدفعات والأقساط المقررة:</label>
                  <button
                    type="button"
                    onClick={() => {
                      setAgreementForm({
                        ...agreementForm,
                        installments: [
                          ...agreementForm.installments,
                          { title: `دفعة مرحلية ${agreementForm.installments.length + 1}`, amount: 0, due_date: '' }
                        ]
                      });
                    }}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1" data-testid="case.finance.tab.set-agreement-form-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة دفعة
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {agreementForm.installments.map((inst, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                      <input
                        type="text"
                        value={inst.title}
                        onChange={(e) => {
                          const updated = [...agreementForm.installments];
                          updated[idx].title = e.target.value;
                          setAgreementForm({ ...agreementForm, installments: updated });
                        }}
                        placeholder="عنوان الدفعة"
                        className="flex-1 text-xs p-1.5 rounded border border-slate-300 bg-white"
                        required data-testid="case.finance.tab.set-agreement-form-6"
                      />
                      <input
                        type="number"
                        value={inst.amount || ''}
                        onChange={(e) => {
                          const updated = [...agreementForm.installments];
                          updated[idx].amount = parseFloat(e.target.value) || 0;
                          setAgreementForm({ ...agreementForm, installments: updated });
                        }}
                        placeholder="المبلغ"
                        className="w-24 text-xs p-1.5 rounded border border-slate-300 bg-white font-bold"
                        required data-testid="case.finance.tab.set-agreement-form-7"
                      />
                      <input
                        type="date"
                        value={inst.due_date || ''}
                        onChange={(e) => {
                          const updated = [...agreementForm.installments];
                          updated[idx].due_date = e.target.value;
                          setAgreementForm({ ...agreementForm, installments: updated });
                        }}
                        className="w-32 text-xs p-1.5 rounded border border-slate-300 bg-white" data-testid="case.finance.tab.set-agreement-form-8"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = agreementForm.installments.filter((_, i) => i !== idx);
                          setAgreementForm({ ...agreementForm, installments: updated });
                        }}
                        className="text-slate-400 hover:text-red-600 p-1" data-testid="case.finance.tab.set-agreement-form-3"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms and Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شروط وملاحظات الاتفاق</label>
                <textarea
                  value={agreementForm.terms_notes}
                  onChange={(e) => setAgreementForm({ ...agreementForm, terms_notes: e.target.value })}
                  rows={2}
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.finance.tab.set-agreement-form-9"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAgreementModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg" data-testid="case.finance.tab.set-show-agreement-modal-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm" data-testid="case.finance.tab.save-2"
                >
                  حفظ اتفاق الأتعاب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal: Reversal (إلغاء بقيد عكسي) */}
      {showReverseModal && selectedTxToReverse && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-rose-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-base font-bold">إلغاء الحركة المالية بقيد عكسي</h3>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
              ⚠️ <strong>قاعدة محاسبية صارمة:</strong> وفقًا لمعايير إدارة مكاتب المحاماة في RULES.md، البيانات المالية لا تُحذف نهائيًا، بل يتم إلغاؤها بقيد تسوية عكسي مسجل بأثر فوري.
            </div>

            <div className="text-xs space-y-1 bg-slate-50 p-2.5 rounded border border-slate-200">
              <div><strong>رقم الإيصال:</strong> {selectedTxToReverse.receipt_number}</div>
              <div><strong>المبلغ:</strong> {selectedTxToReverse.amount.toLocaleString('ar-EG')} ج.م</div>
              <div><strong>البيان:</strong> {selectedTxToReverse.description}</div>
            </div>

            <form onSubmit={handleSubmitReversal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  سبب الإلغاء والقيد العكسي <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  placeholder="مثلاً: خطأ في إدخال المبلغ / شيك مرتد / استرداد الموكل للمبلغ"
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                  required data-testid="case.finance.tab.set-reverse-reason"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReverseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg" data-testid="case.finance.tab.set-show-reverse-modal"
                >
                  تراجع
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm" data-testid="case.finance.tab.cancel"
                >
                  تأكيد الإلغاء بالقيد العكسي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
