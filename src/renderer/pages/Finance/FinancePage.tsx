import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Coins,
  Plus,
  Printer,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileText,
  CreditCard,
  Building,
  Scale,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Clock,
  User,
  Check
} from 'lucide-react';
import {
  Case,
  ChequeDetail,
  ChequeStatus,
  Client,
  FinancialFilter,
  FinancialTransaction,
  GeneralFinancialStats,
  OfficeSettings,
  PaymentMethod,
  TransactionCategory,
  TransactionDirection
} from '../../../shared/types';
import { useFinance } from '../../hooks/useFinance';
import { generateGeneralFinancialReportHtml } from '../../services/generalFinancialReportGenerator';
import { generateReceiptHtml } from '../../services/receiptReportGenerator';
import { generateClientStatementHtml } from '../../services/clientStatementReportGenerator';
import { ExportButton } from '../../components/Common/ExportButton';

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface FinancePageProps {
  settings: OfficeSettings | null;
  clients: Client[];
  cases: Case[];
  onNavigateToCase?: (caseId: number) => void;
}

type PeriodFilter = 'month' | 'quarter' | 'year' | 'range' | 'all';
type FinanceSubTab = 'journal' | 'cheques' | 'clients';

export const FinancePage: React.FC<FinancePageProps> = ({
  settings,
  clients,
  cases,
  onNavigateToCase
}) => {
  const {
    getFinancialTransactions,
    createFinancialTransaction,
    reverseFinancialTransaction,
    getGeneralFinancialStats,
    getCheques,
    updateChequeStatus,
    getClientFinancialSummary
  } = useFinance();

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<FinanceSubTab>('journal');

  // Period state
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filters for Journal
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [selectedDirection, setSelectedDirection] = useState<string>('الكل');
  const [selectedMethod, setSelectedMethod] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter for Cheques
  const [chequeStatusFilter, setChequeStatusFilter] = useState<string>('الكل');

  // Filter for Client Statement
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
  const [clientSummary, setClientSummary] = useState<any>(null);

  // Data state
  const [stats, setStats] = useState<GeneralFinancialStats>({
    total_income: 0,
    total_expense: 0,
    net_profit: 0,
    outstanding_fees: 0,
    pending_cheques_count: 0,
    pending_cheques_amount: 0
  });
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [cheques, setCheques] = useState<ChequeDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [selectedTxToReverse, setSelectedTxToReverse] = useState<FinancialTransaction | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  // Add transaction form
  const [txForm, setTxForm] = useState({
    case_id: '' as string,
    client_id: '' as string,
    direction: 'وارد' as TransactionDirection,
    category: 'أتعاب' as TransactionCategory,
    transaction_type: 'أتعاب - دفعة مرحلية',
    amount: '',
    transaction_date: formatLocalDate(new Date()),
    payment_method: 'نقدي' as PaymentMethod,
    description: '',
    notes: '',
    printImmediately: true,
    cheque_number: '',
    bank_name: '',
    drawer_name: '',
    due_date: formatLocalDate(new Date())
  });

  // Calculate Dates for Period Filter
  const dateRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (periodFilter === 'month') {
      const start = formatLocalDate(new Date(year, month, 1));
      const end = formatLocalDate(new Date(year, month + 1, 0));
      return { startDate: start, endDate: end, label: 'هذا الشهر' };
    } else if (periodFilter === 'quarter') {
      const qMonth = Math.floor(month / 3) * 3;
      const start = formatLocalDate(new Date(year, qMonth, 1));
      const end = formatLocalDate(new Date(year, qMonth + 3, 0));
      return { startDate: start, endDate: end, label: 'الربع الجاري' };
    } else if (periodFilter === 'year') {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      return { startDate: start, endDate: end, label: `عام ${year}` };
    } else if (periodFilter === 'range') {
      return { startDate, endDate, label: `الفترة من ${startDate || 'البداية'} إلى ${endDate || 'النهاية'}` };
    } else {
      return { label: 'كافة الفترات' };
    }
  }, [periodFilter, startDate, endDate]);

  // Load Financial Data
  const loadFinanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, txList, chqList] = await Promise.all([
        getGeneralFinancialStats(dateRange.startDate && dateRange.endDate ? { startDate: dateRange.startDate, endDate: dateRange.endDate } : undefined),
        getFinancialTransactions({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          category: selectedCategory !== 'الكل' ? (selectedCategory as TransactionCategory) : undefined,
          direction: selectedDirection !== 'الكل' ? (selectedDirection as TransactionDirection) : undefined,
          payment_method: selectedMethod !== 'الكل' ? (selectedMethod as PaymentMethod) : undefined,
          query: searchQuery,
          includeReversed: true
        }),
        getCheques({
          status: chequeStatusFilter !== 'الكل' ? chequeStatusFilter : undefined
        })
      ]);

      if (statsData) {
        setStats({
          total_income: Number(statsData.total_income) || 0,
          total_expense: Number(statsData.total_expense) || 0,
          net_profit: Number(statsData.net_profit) || 0,
          outstanding_fees: Number(statsData.outstanding_fees) || 0,
          pending_cheques_count: Number(statsData.pending_cheques_count) || 0,
          pending_cheques_amount: Number(statsData.pending_cheques_amount) || 0
        });
      }
      setTransactions(Array.isArray(txList) ? txList : []);
      setCheques(Array.isArray(chqList) ? chqList : []);
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  }, [
    getGeneralFinancialStats,
    getFinancialTransactions,
    getCheques,
    dateRange,
    selectedCategory,
    selectedDirection,
    selectedMethod,
    searchQuery,
    chequeStatusFilter
  ]);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // Load client summary if selected
  useEffect(() => {
    if (selectedClientId) {
      getClientFinancialSummary(Number(selectedClientId)).then(res => {
        setClientSummary(res);
      }).catch(console.error);
    } else {
      setClientSummary(null);
    }
  }, [selectedClientId, getClientFinancialSummary]);

  // Handle Add Transaction submit
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
        case_id: txForm.case_id ? parseInt(txForm.case_id) : null,
        client_id: txForm.client_id ? parseInt(txForm.client_id) : null,
        transaction_date: txForm.transaction_date,
        category: txForm.category,
        transaction_type: txForm.transaction_type,
        direction: txForm.direction,
        amount: amt,
        payment_method: txForm.payment_method,
        description: txForm.description.trim(),
        notes: txForm.notes.trim() || null
      }, chequeData);

      if (created) {
        setShowAddTxModal(false);
        setTxForm({
          case_id: '',
          client_id: '',
          direction: 'وارد',
          category: 'أتعاب',
          transaction_type: 'أتعاب - دفعة مرحلية',
          amount: '',
          transaction_date: new Date().toISOString().split('T')[0],
          payment_method: 'نقدي',
          description: '',
          notes: '',
          printImmediately: true,
          cheque_number: '',
          bank_name: '',
          drawer_name: '',
          due_date: new Date().toISOString().split('T')[0]
        });

        await loadFinanceData();

        if (txForm.printImmediately && settings) {
          handlePrintReceipt(created);
        } else {
          alert(`تم تسجيل الحركة بنجاح برقم إيصال: ${created.receipt_number}`);
        }
      }
    } catch (err: any) {
      alert(err?.message || 'فشل في تسجيل الحركة المالية');
    }
  };

  // Handle Reversal submit
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
        await loadFinanceData();
        alert('تم إلغاء الحركة وتوليد القيد العكسي بنجاح وتحديث الحسابات');
      }
    } catch (err: any) {
      alert(err?.message || 'فشل في إلغاء الحركة');
    }
  };

  // Print Receipt
  const handlePrintReceipt = async (tx: FinancialTransaction) => {
    if (!settings) return;
    const htmlContent = generateReceiptHtml(tx, settings);
    await window.electronAPI.executePrint({
      htmlContent,
      title: `إيصال_${tx.receipt_number}`,
      action: 'preview',
      suggestedFileName: `إيصال_${tx.receipt_number}.pdf`
    });
  };

  // Print General Financial Report
  const handlePrintGeneralReport = async () => {
    if (!settings) return;
    const htmlContent = generateGeneralFinancialReportHtml(stats, transactions, settings, {
      periodTitle: dateRange.label,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });

    await window.electronAPI.executePrint({
      htmlContent,
      title: `تقرير_مالي_${dateRange.label.replace(/\s+/g, '_')}`,
      action: 'preview',
      suggestedFileName: `تقرير_مالي_${dateRange.label.replace(/\s+/g, '_')}.pdf`
    });
  };

  // Collect Cheque action
  const handleCollectCheque = async (chq: ChequeDetail) => {
    if (!window.confirm(`هل تريد تأكيد تحصيل الشيك رقم ${chq.cheque_number} بمبلغ ${chq.amount} ج.م؟`)) return;
    try {
      await updateChequeStatus(chq.id, 'محصل');
      await loadFinanceData();
      alert('تم تحديث حالة الشيك إلى "محصل" بنجاح');
    } catch (err: any) {
      alert(err?.message || 'فشل في تحديث حالة الشيك');
    }
  };

  // Bounce Cheque action
  const handleBounceCheque = async (chq: ChequeDetail) => {
    if (!window.confirm(`هل أنت متأكد من تسجيل الشيك رقم ${chq.cheque_number} كـ "مرتد"؟`)) return;
    try {
      await updateChequeStatus(chq.id, 'مرتد');
      await loadFinanceData();
      alert('تم تحديث حالة الشيك إلى "مرتد"');
    } catch (err: any) {
      alert(err?.message || 'فشل في تحديث حالة الشيك');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-600" />
            الإدارة المالية العامة وحسابات المكتب
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            متابعة الإيرادات والمصروفات، اتفاقات الأتعاب، تتبع الشيكات المؤجلة، وإصدار الإيصالات وكشوف الحسابات
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButton
            fileName="سجل_المالية"
            title="سجل الحركات المالية والمقبوضات والمصروفات"
            headers={['م', 'رقم الإيصال', 'التاريخ', 'الاتجاه', 'التصنيف', 'نوع الحركة', 'المبلغ (ج.م)', 'طريقة الدفع', 'البيان', 'الموكل', 'رقم القضية']}
            rows={(transactions || []).map((tx, idx) => [
              idx + 1,
              tx.receipt_number,
              tx.transaction_date,
              tx.direction,
              tx.category,
              tx.transaction_type,
              tx.amount,
              tx.payment_method,
              tx.description,
              tx.client_name || '-',
              tx.case_number ? `${tx.case_number}/${tx.case_year}` : '-',
            ])}
            buttonLabel="تصدير المالية"
          />

          <button
            onClick={handlePrintGeneralReport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" data-testid="finance.main.handle-print-general-report"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            طباعة التقرير المالي
          </button>

          <button
            onClick={() => setShowAddTxModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm" data-testid="finance.main.set-show-add-tx-modal"
          >
            <Plus className="w-4 h-4" />
            تسجيل حركة مالية جديدة
          </button>

          <button
            onClick={loadFinanceData}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="تحديث البيانات" data-testid="finance.main.load-finance-data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Income */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">إجمالي الإيرادات (وارد)</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-700">
            {(stats?.total_income || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">خلال {dateRange.label}</div>
        </div>

        {/* Expenses */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">إجمالي المصروفات (صادر)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-extrabold text-rose-700">
            {(stats?.total_expense || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">رسوم ومصروفات فعلية</div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">صافي الفائض / الأرباح</span>
            <Coins className="w-4 h-4 text-indigo-600" />
          </div>
          <div className={`text-xl font-extrabold ${(stats?.net_profit || 0) >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
            {(stats?.net_profit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">الوارد مطروحًا منه الصادر</div>
        </div>

        {/* Outstanding Fees */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">أتعاب معلقة ومتأخرات</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-amber-700">
            {(stats?.outstanding_fees || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">متبقي من اتفاقات القضايا</div>
        </div>

        {/* Pending Cheques */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">شيكات تحت التحصيل</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-blue-700">
            {(stats?.pending_cheques_amount || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            إجمالي {stats?.pending_cheques_count || 0} شيكات مؤجلة
          </div>
        </div>
      </div>

      {/* 3. Sub-Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('journal')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === 'journal'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`} data-testid="finance.main.set-active-sub-tab"
          >
            سجل الحركات المالية ({transactions.length})
          </button>

          <button
            onClick={() => setActiveSubTab('cheques')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'cheques'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`} data-testid="finance.main.set-active-sub-tab-2"
          >
            <CreditCard className="w-3.5 h-3.5" />
            تتبع الشيكات المؤجلة ({cheques.length})
          </button>

          <button
            onClick={() => setActiveSubTab('clients')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'clients'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`} data-testid="finance.main.set-active-sub-tab-3"
          >
            <User className="w-3.5 h-3.5" />
            كشوف حسابات الموكلين
          </button>
        </div>

        {/* Period Selector (applicable to Journal & Stats) */}
        {activeSubTab === 'journal' && (
          <div className="flex items-center gap-2">
            {[
              { id: 'month', label: 'هذا الشهر' },
              { id: 'quarter', label: 'الربع الجاري' },
              { id: 'year', label: 'العام الحالي' },
              { id: 'all', label: 'الكل' }
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setPeriodFilter(btn.id as PeriodFilter)}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${
                  periodFilter === btn.id
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`} data-testid="finance.main.set-period-filter"
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. SUB-TAB 1: TRANSACTIONS JOURNAL */}
      {activeSubTab === 'journal' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">بحث في الحركات والإيصالات</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالإيصال أو البيان أو الموكل..."
                  className="w-full text-xs pr-8 pl-2 py-1.5 rounded-lg border border-slate-300 bg-white" data-testid="finance.main.set-search-query"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الفئة</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white" data-testid="finance.main.set-selected-category"
              >
                <option value="الكل">كافة الفئات</option>
                <option value="أتعاب">أتعاب المحاماة</option>
                <option value="رسوم قضائية">رسوم قضائية</option>
                <option value="مصاريف">مصاريف وإداريات</option>
                <option value="تنفيذ">تنفيذ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الاتجاه</label>
              <select
                value={selectedDirection}
                onChange={(e) => setSelectedDirection(e.target.value)}
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white" data-testid="finance.main.set-selected-direction"
              >
                <option value="الكل">الكل (وارد وصادر)</option>
                <option value="وارد">وارد فقط (إيراد من موكل)</option>
                <option value="صادر">صادر فقط (مصروف من المكتب)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع</label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white" data-testid="finance.main.set-selected-method"
              >
                <option value="الكل">كافة الطرق</option>
                <option value="نقدي">نقدي</option>
                <option value="تحويل بنكي">تحويل بنكي</option>
                <option value="شيك">شيك بنكي</option>
                <option value="فودافون كاش">فودافون كاش</option>
                <option value="إنستاباي">إنستاباي</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Coins className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">لا توجد حركات مالية مسجلة وفق الفلاتر</h4>
                <p className="text-xs text-slate-400">اضغط على زر "تسجيل حركة مالية جديدة" لإضافة سند قبض أو صرف.</p>
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
                      <th className="p-3">الموكل والقضية</th>
                      <th className="p-3 w-24 text-center">طريقة الدفع</th>
                      <th className="p-3 w-28 text-left">المبلغ</th>
                      <th className="p-3 w-28 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx, idx) => {
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
                              isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
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
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{tx.client_name || '-'}</div>
                            {tx.case_number && (
                              <div className="text-[11px] text-indigo-700 flex items-center gap-1">
                                {onNavigateToCase ? (
                                  <button
                                    onClick={() => tx.case_id && onNavigateToCase(tx.case_id)}
                                    className="hover:underline font-bold" data-testid="finance.main.on-navigate-to-case"
                                  >
                                    قضية {tx.case_number}/{tx.case_year || ''}
                                  </button>
                                ) : (
                                  <span>قضية {tx.case_number}/{tx.case_year || ''}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-700">
                            {tx.payment_method}
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
                                title="طباعة إيصال السداد" data-testid="finance.main.handle-print-receipt"
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
                                  title="إلغاء الحركة بقيد عكسي" data-testid="finance.main.set-selected-tx-to-reverse"
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
        </div>
      )}

      {/* 5. SUB-TAB 2: CHEQUES TRACKER */}
      {activeSubTab === 'cheques' && (
        <div className="space-y-4">
          {/* Status filter buttons */}
          <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-600 ml-2">حالة الشيك:</span>
            {[
              { id: 'الكل', label: `كافة الشيكات (${cheques.length})` },
              { id: 'تحت التحصيل', label: 'تحت التحصيل (مؤجلة)' },
              { id: 'محصل', label: 'تم التحصيل' },
              { id: 'مرتد', label: 'مرتدة ومرفوضة' }
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setChequeStatusFilter(btn.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  chequeStatusFilter === btn.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`} data-testid="finance.main.set-cheque-status-filter"
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {cheques.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">لا توجد شيكات مسجلة بهذه الحالة</h4>
                <p className="text-xs text-slate-400">عند تسجيل حركة مالية واختيار طريقة الدفع "شيك"، ستظهر تلقائيًا في هذا الجدول للمتابعة والتحصيل.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-slate-800 text-white font-bold border-b border-slate-700">
                    <tr>
                      <th className="p-3 w-12 text-center">م</th>
                      <th className="p-3 w-32">رقم الشيك</th>
                      <th className="p-3">اسم البنك</th>
                      <th className="p-3">الساحب / العميل</th>
                      <th className="p-3 w-28 text-left">المبلغ</th>
                      <th className="p-3 w-28 text-center">ميعاد الاستحقاق</th>
                      <th className="p-3 w-28 text-center">المهلة</th>
                      <th className="p-3 w-24 text-center">الحالة</th>
                      <th className="p-3 w-36 text-center">إجراءات التحصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cheques.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{c.cheque_number}</td>
                        <td className="p-3 font-semibold text-slate-800">{c.bank_name}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{c.drawer_name || c.client_name || '-'}</div>
                          {c.case_number && (
                            <div className="text-[11px] text-slate-500">قضية {c.case_number}/{c.case_year || ''}</div>
                          )}
                        </td>
                        <td className="p-3 text-left font-black text-slate-900" dir="ltr">
                          {c.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="p-3 text-center font-bold">{c.due_date}</td>
                        <td className="p-3 text-center">
                          {c.status === 'تحت التحصيل' ? (
                            c.is_overdue ? (
                              <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200 animate-pulse">
                                متأخر ({Math.abs(c.days_until_due ?? 0)} يوم)
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                                متبقي {c.days_until_due} يوم
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            c.status === 'محصل' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : c.status === 'مرتد'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {c.status === 'تحت التحصيل' && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleCollectCheque(c)}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm" data-testid="finance.main.handle-collect-cheque"
                              >
                                تحصيل
                              </button>
                              <button
                                onClick={() => handleBounceCheque(c)}
                                className="px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200" data-testid="finance.main.handle-bounce-cheque"
                              >
                                ارتداد
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. SUB-TAB 3: CLIENTS STATEMENTS */}
      {activeSubTab === 'clients' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              استخراج كشف حساب تفصيلي لموكل
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اختر الموكل</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-bold" data-testid="finance.main.set-selected-client-id"
                >
                  <option value="">-- اضغط لاختيار موكل --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.client_type === 'company' ? 'شركة' : 'فرد'})</option>
                  ))}
                </select>
              </div>

              {clientSummary && (
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex-1 text-xs space-y-1">
                    <div>إجمالي الأتعاب المتفق عليها: <strong>{clientSummary.total_agreed_fees.toLocaleString('ar-EG')} ج.م</strong></div>
                    <div>المسدد منها: <strong className="text-emerald-700">{clientSummary.paid_fees.toLocaleString('ar-EG')} ج.م</strong></div>
                    <div>المتبقي: <strong className="text-amber-700">{clientSummary.remaining_fees.toLocaleString('ar-EG')} ج.م</strong></div>
                  </div>

                  <button
                    onClick={async () => {
                      const client = clients.find(c => c.id === Number(selectedClientId));
                      if (!client || !settings) return;

                      // Fetch client transactions
                      const txs = await getFinancialTransactions({ client_id: client.id, includeReversed: false });
                      const fakeSummary = {
                        total_agreed_fees: clientSummary.total_agreed_fees,
                        paid_fees: clientSummary.paid_fees,
                        remaining_fees: clientSummary.remaining_fees,
                        total_court_fees_inflow: 0,
                        total_court_fees_outflow: 0,
                        total_expenses_inflow: 0,
                        total_expenses_outflow: 0,
                        total_execution_inflow: 0,
                        total_execution_outflow: 0,
                        total_inflow: clientSummary.paid_fees,
                        total_outflow: 0,
                        net_balance: clientSummary.net_balance
                      };

                      const htmlContent = generateClientStatementHtml(fakeSummary, txs, settings, {
                        clientName: client.name,
                        clientPhone: client.phone,
                        periodText: 'كشف حساب شامل لكافة قضايا الموكل'
                      });

                      await window.electronAPI.executePrint({
                        htmlContent,
                        title: `كشف_حساب_${client.name}`,
                        action: 'preview',
                        suggestedFileName: `كشف_حساب_${client.name}.pdf`
                      });
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm" data-testid="finance.main.settings"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة كشف الحساب
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Add Transaction */}
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
                className="text-slate-400 hover:text-slate-600 font-bold text-lg" data-testid="finance.main.set-show-add-tx-modal-2"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="space-y-3.5">
              {/* Case & Client selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">القضية (اختياري)</label>
                  <select
                    value={txForm.case_id}
                    onChange={(e) => setTxForm({ ...txForm, case_id: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="finance.main.set-tx-form"
                  >
                    <option value="">بدون ربط بقضية (عام)</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.case_number}/{c.case_year} — {c.court_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الموكل (اختياري)</label>
                  <select
                    value={txForm.client_id}
                    onChange={(e) => setTxForm({ ...txForm, client_id: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="finance.main.set-tx-form-2"
                  >
                    <option value="">بدون تحديد موكل</option>
                    {clients.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Direction & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اتجاه الحركة</label>
                  <select
                    value={txForm.direction}
                    onChange={(e) => setTxForm({ ...txForm, direction: e.target.value as TransactionDirection })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white font-bold" data-testid="finance.main.set-tx-form-3"
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
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white font-bold" data-testid="finance.main.set-tx-form-4"
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
                    value={txForm.transaction_type}
                    onChange={(e) => setTxForm({ ...txForm, transaction_type: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="finance.main.set-tx-form-6"
                  />
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
                    required data-testid="finance.main.set-tx-form-7"
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
                    required data-testid="finance.main.set-tx-form-8"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع</label>
                  <select
                    value={txForm.payment_method}
                    onChange={(e) => setTxForm({ ...txForm, payment_method: e.target.value as PaymentMethod })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="finance.main.set-tx-form-5"
                  >
                    <option value="نقدي">نقدي (كاش)</option>
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="شيك">شيك بنكي</option>
                    <option value="فودافون كاش">فودافون كاش</option>
                    <option value="إنستاباي">إنستاباي (InstaPay)</option>
                  </select>
                </div>
              </div>

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
                        required data-testid="finance.main.set-tx-form-9"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم البنك *</label>
                      <input
                        type="text"
                        value={txForm.bank_name}
                        onChange={(e) => setTxForm({ ...txForm, bank_name: e.target.value })}
                        className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white"
                        required data-testid="finance.main.set-tx-form-10"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الساحب</label>
                      <input
                        type="text"
                        value={txForm.drawer_name}
                        onChange={(e) => setTxForm({ ...txForm, drawer_name: e.target.value })}
                        className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white" data-testid="finance.main.set-tx-form-11"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الاستحقاق *</label>
                      <input
                        type="date"
                        value={txForm.due_date}
                        onChange={(e) => setTxForm({ ...txForm, due_date: e.target.value })}
                        className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white"
                        required data-testid="finance.main.set-tx-form-12"
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
                  placeholder="مثلاً: سداد دفعة أتعاب / رسوم استئناف..."
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                  required data-testid="finance.main.set-tx-form-13"
                />
              </div>

              {/* Print Receipt immediately checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={txForm.printImmediately}
                  onChange={(e) => setTxForm({ ...txForm, printImmediately: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4" data-testid="finance.main.set-tx-form-14"
                />
                <span className="text-xs font-semibold text-slate-800">
                  معاينة وطباعة إيصال السداد المرقّم فور الحفظ
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg" data-testid="finance.main.set-show-add-tx-modal-3"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm" data-testid="finance.main.save"
                >
                  حفظ الحركة المالية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal: Reversal */}
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
                  placeholder="سبب إلغاء الحركة..."
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                  required data-testid="finance.main.set-reverse-reason"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReverseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg" data-testid="finance.main.set-show-reverse-modal"
                >
                  تراجع
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm" data-testid="finance.main.cancel"
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
