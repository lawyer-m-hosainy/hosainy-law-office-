import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  Printer,
  Calendar,
  Coins,
  Gavel,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Edit2,
  Eye,
  FileText,
  User,
  Building,
  Scale,
  Handshake,
  DollarSign,
  ArrowUpRight,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import {
  Case,
  Client,
  ExecutionFile,
  ExecutionDetails,
  ExecutionAction,
  ExecutionHearing,
  ExecutionDeedType,
  ExecutionStatus,
  ExecutionActionType,
  ExecutionActionStatus,
  OfficeSettings,
  TransactionDirection,
  PaymentMethod
} from '../../../shared/types';
import { useExecutions } from '../../hooks/useExecutions';
import { generateExecutionReportHtml } from '../../services/executionReportGenerator';

interface ExecutionsPageProps {
  settings: OfficeSettings | null;
  clients: Client[];
  cases: Case[];
  onNavigateToCase?: (caseId: number) => void;
}

export const ExecutionsPage: React.FC<ExecutionsPageProps> = ({
  settings,
  clients,
  cases,
  onNavigateToCase
}) => {
  const {
    files,
    loading,
    loadFiles,
    getFileById,
    createFile,
    updateFile,
    deleteFile,
    recordSettlement,
    createAction,
    deleteAction,
    createHearing,
    recordHearingOutcome,
    recordPayment
  } = useExecutions();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeedType, setSelectedDeedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCaseLink, setSelectedCaseLink] = useState<'all' | 'linked' | 'standalone'>('all');

  // Selected file for detail drawer/pane
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [selectedFileDetails, setSelectedFileDetails] = useState<ExecutionDetails | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'actions' | 'hearings' | 'finance' | 'settlement'>('info');

  // Modals state
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isHearingModalOpen, setIsHearingModalOpen] = useState(false);
  const [isHearingOutcomeModalOpen, setIsHearingOutcomeModalOpen] = useState(false);
  const [selectedHearingToOutcome, setSelectedHearingToOutcome] = useState<ExecutionHearing | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  // Forms state
  const [newFileForm, setNewFileForm] = useState({
    file_number: '',
    year: new Date().getFullYear(),
    case_id: '' as string | number,
    client_id: '' as string | number,
    deed_type: 'حكم' as ExecutionDeedType,
    deed_number: '',
    court: '',
    execution_judge: '',
    execution_dept: 'قلم المحضرين',
    applicant_name: '',
    applicant_capacity: 'طالب التنفيذ',
    enforced_against: '',
    enforced_against_capacity: 'المنفذ ضده',
    enforced_against_address: '',
    enforced_against_phone: '',
    total_claimed_amount: 0,
    announcement_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [actionForm, setActionForm] = useState({
    action_type: 'إعلان السند التنفيذي' as ExecutionActionType,
    action_date: new Date().toISOString().split('T')[0],
    status: 'جاري' as ExecutionActionStatus,
    police_report_or_bailiff_number: '',
    dept_or_bailiff_office: 'قلم المحضرين',
    bailiff_name: '',
    amount_collected: 0,
    details: '',
    notes: ''
  });

  const [hearingForm, setHearingForm] = useState({
    hearing_date: new Date().toISOString().split('T')[0],
    hearing_time: '10:00',
    court_name: '',
    court_circuit: 'دائرة إشكالات التنفيذ',
    roll_number: '',
    proceedings: ''
  });

  const [hearingOutcomeForm, setHearingOutcomeForm] = useState({
    attended: 1,
    attended_by: 'المحامي المسؤول',
    proceedings: '',
    court_decision: '',
    adjournment_reason: '',
    next_hearing_date: '',
    status: 'تمت' as any
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    direction: 'وارد' as TransactionDirection,
    transactionType: 'تحصيل تنفيذ جبري / ودي',
    paymentMethod: 'نقدي' as PaymentMethod,
    description: '',
    notes: ''
  });

  const [settlementForm, setSettlementForm] = useState({
    settlement_minutes: '',
    settlement_date: new Date().toISOString().split('T')[0]
  });

  // Load files
  useEffect(() => {
    loadFiles({
      search: searchQuery,
      deedType: selectedDeedType,
      status: selectedStatus
    });
  }, [searchQuery, selectedDeedType, selectedStatus, loadFiles]);

  // Load file details when selected
  useEffect(() => {
    if (selectedFileId) {
      getFileById(selectedFileId).then(data => {
        setSelectedFileDetails(data);
      });
    } else {
      setSelectedFileDetails(null);
    }
  }, [selectedFileId, getFileById]);

  // Refresh helper
  const refreshCurrent = async () => {
    if (selectedFileId) {
      const data = await getFileById(selectedFileId);
      setSelectedFileDetails(data);
    }
    loadFiles({
      search: searchQuery,
      deedType: selectedDeedType,
      status: selectedStatus
    });
  };

  // Filter files by case linkage (client-side)
  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      if (selectedCaseLink === 'linked') return f.case_id !== null && f.case_id !== undefined;
      if (selectedCaseLink === 'standalone') return !f.case_id;
      return true;
    });
  }, [files, selectedCaseLink]);

  // Calculate Metrics
  const metrics = useMemo(() => {
    const totalFiles = files.length;
    const activeFiles = files.filter(f => f.status === 'جاري' || f.status === 'جديد').length;
    const completedOrSettled = files.filter(f => f.status === 'تم التنفيذ كلياً' || f.status === 'تم الصلح والتسوية').length;
    const totalClaimed = files.reduce((s, f) => s + (f.total_claimed_amount || 0), 0);
    const totalCollected = files.reduce((s, f) => s + (f.collected_amount || 0), 0);
    const totalRemaining = Math.max(0, totalClaimed - totalCollected);

    return {
      totalFiles,
      activeFiles,
      completedOrSettled,
      totalClaimed,
      totalCollected,
      totalRemaining
    };
  }, [files]);

  // Handle Printing
  const handlePrint = async (fileDetails: ExecutionDetails) => {
    if (!settings) return;
    try {
      setPrintStatus('جاري إعداد تقرير ملف التنفيذ...');
      const htmlContent = generateExecutionReportHtml(fileDetails, settings);
      const res = await window.electronAPI.executePrint({
        htmlContent,
        title: `ملف_تنفيذ_${fileDetails.file_number}_${fileDetails.court}`,
        landscape: false,
        action: 'preview',
        suggestedFileName: `ملف_تنفيذ_${fileDetails.file_number}.pdf`
      });

      if (res.success) {
        setPrintStatus('تم فتح المعاينة بنجاح');
      } else {
        setPrintStatus('تعذر بدء الطباعة');
      }
    } catch (err: any) {
      alert(`خطأ أثناء الطباعة: ${err?.message}`);
    } finally {
      setTimeout(() => setPrintStatus(null), 3000);
    }
  };

  // Submit New File
  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileForm.file_number.trim() || !newFileForm.court.trim() || !newFileForm.applicant_name.trim() || !newFileForm.enforced_against.trim()) {
      alert('يرجى ملء جميع الحقول المطلوبة (رقم الملف، المحكمة، طالب التنفيذ، المنفذ ضده)');
      return;
    }

    try {
      const created = await createFile({
        file_number: newFileForm.file_number,
        year: newFileForm.year ? Number(newFileForm.year) : null,
        case_id: newFileForm.case_id ? Number(newFileForm.case_id) : null,
        client_id: newFileForm.client_id ? Number(newFileForm.client_id) : null,
        deed_type: newFileForm.deed_type,
        deed_number: newFileForm.deed_number,
        court: newFileForm.court,
        execution_judge: newFileForm.execution_judge,
        execution_dept: newFileForm.execution_dept,
        applicant_name: newFileForm.applicant_name,
        applicant_capacity: newFileForm.applicant_capacity,
        enforced_against: newFileForm.enforced_against,
        enforced_against_capacity: newFileForm.enforced_against_capacity,
        enforced_against_address: newFileForm.enforced_against_address,
        enforced_against_phone: newFileForm.enforced_against_phone,
        total_claimed_amount: Number(newFileForm.total_claimed_amount) || 0,
        announcement_date: newFileForm.announcement_date,
        notes: newFileForm.notes
      });

      setIsNewFileModalOpen(false);
      setSelectedFileId(created.id);
      refreshCurrent();
    } catch (err: any) {
      alert(`خطأ أثناء فتح ملف التنفيذ: ${err?.message}`);
    }
  };

  // Submit Action
  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFileId) return;

    try {
      await createAction({
        execution_id: selectedFileId,
        action_type: actionForm.action_type,
        action_date: actionForm.action_date,
        status: actionForm.status,
        police_report_or_bailiff_number: actionForm.police_report_or_bailiff_number,
        dept_or_bailiff_office: actionForm.dept_or_bailiff_office,
        bailiff_name: actionForm.bailiff_name,
        amount_collected: Number(actionForm.amount_collected) || 0,
        details: actionForm.details,
        notes: actionForm.notes
      });

      setIsActionModalOpen(false);
      refreshCurrent();
    } catch (err: any) {
      alert(`خطأ أثناء إضافة الإجراء: ${err?.message}`);
    }
  };

  // Submit Hearing
  const handleCreateHearing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFileId) return;

    try {
      await createHearing({
        execution_id: selectedFileId,
        case_id: selectedFileDetails?.case_id || null,
        hearing_date: hearingForm.hearing_date,
        hearing_time: hearingForm.hearing_time,
        court_name: hearingForm.court_name || selectedFileDetails?.court || '',
        court_circuit: hearingForm.court_circuit,
        roll_number: hearingForm.roll_number,
        proceedings: hearingForm.proceedings,
        attended: 0,
        status: 'محددة'
      });

      setIsHearingModalOpen(false);
      refreshCurrent();
    } catch (err: any) {
      alert(`خطأ أثناء إضافة الجلسة: ${err?.message}`);
    }
  };

  // Submit Hearing Outcome
  const handleRecordHearingOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHearingToOutcome) return;

    try {
      await recordHearingOutcome(selectedHearingToOutcome.id, hearingOutcomeForm);
      setIsHearingOutcomeModalOpen(false);
      setSelectedHearingToOutcome(null);
      refreshCurrent();
    } catch (err: any) {
      alert(`خطأ أثناء تسجيل نتيجة الجلسة: ${err?.message}`);
    }
  };

  // Submit Payment / Expense
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFileId) return;
    if (paymentForm.amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    try {
      await recordPayment({
        executionId: selectedFileId,
        amount: Number(paymentForm.amount),
        direction: paymentForm.direction,
        transactionType: paymentForm.transactionType,
        paymentMethod: paymentForm.paymentMethod,
        description: paymentForm.description,
        notes: paymentForm.notes
      });

      setIsPaymentModalOpen(false);
      refreshCurrent();
    } catch (err: any) {
      alert(`خطأ أثناء تسجيل الحركة المالية: ${err?.message}`);
    }
  };

  // Submit Settlement
  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFileId || !settlementForm.settlement_minutes.trim()) {
      alert('يرجى إدخال بنود محضر الصلح');
      return;
    }

    try {
      await recordSettlement(selectedFileId, settlementForm.settlement_minutes, settlementForm.settlement_date);
      setIsSettlementModalOpen(false);
      refreshCurrent();
    } catch (err: any) {
      alert(`خطأ أثناء تسجيل الصلح: ${err?.message}`);
    }
  };

  // When a case is selected in new file form, prefill court and parties
  const handleCaseSelection = (caseIdStr: string) => {
    if (!caseIdStr) {
      setNewFileForm({
        ...newFileForm,
        case_id: '',
        deed_number: '',
        court: '',
        applicant_name: '',
        enforced_against: ''
      });
      return;
    }

    const cId = Number(caseIdStr);
    const foundCase = cases.find(c => c.id === cId);
    if (foundCase) {
      setNewFileForm({
        ...newFileForm,
        case_id: cId,
        court: foundCase.court_name,
        deed_number: `حكم رقم ${foundCase.case_number} لسنة ${foundCase.case_year}`,
        applicant_name: foundCase.primary_client_name || '',
        enforced_against: foundCase.primary_opponent_name || ''
      });
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 p-6 overflow-hidden bg-slate-50">
      {/* Toast Notification */}
      {printStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{printStatus}</span>
        </div>
      )}

      {/* Top Bar with Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">ملفات التنفيذ</span>
          <div className="text-xl font-bold text-slate-800">{metrics.totalFiles}</div>
          <span className="text-[10px] text-slate-400">إجمالي الملفات</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-blue-600 block mb-1">الملفات الجارية</span>
          <div className="text-xl font-bold text-blue-700">{metrics.activeFiles}</div>
          <span className="text-[10px] text-slate-400">قيد المتابعة والحجز</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-600 block mb-1">إجمالي المطلوب</span>
          <div className="text-lg font-bold text-slate-800 dir-ltr text-right truncate">
            {metrics.totalClaimed.toLocaleString('ar-EG')} <span className="text-[10px]">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-400">قيمة السندات</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 block mb-1">المبالغ المحصلة</span>
          <div className="text-lg font-bold text-emerald-700 dir-ltr text-right truncate">
            {metrics.totalCollected.toLocaleString('ar-EG')} <span className="text-[10px]">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-400">تم قبضها</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-red-600 block mb-1">المتبقي للتحصيل</span>
          <div className="text-lg font-bold text-red-700 dir-ltr text-right truncate">
            {metrics.totalRemaining.toLocaleString('ar-EG')} <span className="text-[10px]">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-400">بذمة المدينين</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-purple-600 block mb-1">منفذ ومصالح</span>
          <div className="text-xl font-bold text-purple-700">{metrics.completedOrSettled}</div>
          <span className="text-[10px] text-slate-400">تم إنهاؤها بنجاح</span>
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الملف، المنفذ، المدين، المحكمة، السند..."
              className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Deed Type Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-slate-400">السند:</span>
            <select
              value={selectedDeedType}
              onChange={e => setSelectedDeedType(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg text-xs bg-white"
            >
              <option value="all">كل السندات</option>
              <option value="حكم">حكم قضائي</option>
              <option value="أمر أداء">أمر أداء</option>
              <option value="شيك">شيك بنكي</option>
              <option value="كمبيالة">كمبيالة</option>
              <option value="عقد موثق">عقد موثق</option>
              <option value="محضر صلح">محضر صلح</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-slate-400">الحالة:</span>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg text-xs bg-white"
            >
              <option value="all">كل الحالات</option>
              <option value="جاري">جاري</option>
              <option value="تم الصلح والتسوية">تم الصلح والتسوية</option>
              <option value="تم التنفيذ كلياً">تم التنفيذ كلياً</option>
              <option value="موقوف">موقوف</option>
              <option value="مرفوض">مرفوض</option>
            </select>
          </div>

          {/* Linkage Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-slate-400">النوع:</span>
            <select
              value={selectedCaseLink}
              onChange={e => setSelectedCaseLink(e.target.value as any)}
              className="p-2 border border-slate-200 rounded-lg text-xs bg-white"
            >
              <option value="all">الكل</option>
              <option value="linked">مرتبطة بقضية</option>
              <option value="standalone">ملفات مستقلة</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setNewFileForm({
              file_number: '',
              year: new Date().getFullYear(),
              case_id: '',
              client_id: '',
              deed_type: 'حكم',
              deed_number: '',
              court: '',
              execution_judge: '',
              execution_dept: 'قلم المحضرين',
              applicant_name: '',
              applicant_capacity: 'طالب التنفيذ',
              enforced_against: '',
              enforced_against_capacity: 'المنفذ ضده',
              enforced_against_address: '',
              enforced_against_phone: '',
              total_claimed_amount: 0,
              announcement_date: new Date().toISOString().split('T')[0],
              notes: ''
            });
            setIsNewFileModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>فتح ملف تنفيذ جديد</span>
        </button>
      </div>

      {/* Main Workspace Layout (Files Grid / Master-Detail) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
        {/* Table / List View (Right 7 Cols in RTL) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700">
              قائمة ملفات التنفيذ ({filteredFiles.length})
            </span>
            <span className="text-[11px] text-slate-400">
              اضغط على أي ملف لعرض إجراءاته وجلساته وماليته
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredFiles.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <FileCheck2 className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs font-bold">لا توجد ملفات تنفيذ مطابقة للبحث أو الفلتر</p>
                <p className="text-[11px]">جرّب تغيير خيارات البحث أو قم بفتح ملف تنفيذ جديد.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredFiles.map(file => {
                  const isSelected = selectedFileId === file.id;
                  const pct = file.total_claimed_amount > 0
                    ? Math.min(100, Math.round((file.collected_amount / file.total_claimed_amount) * 100))
                    : 0;

                  return (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFileId(file.id)}
                      className={`p-3.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-50/70 border-r-4 border-amber-600 shadow-xs'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            ملف {file.file_number}
                          </span>
                          {file.year && <span className="text-xs text-slate-400">/{file.year}</span>}
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                            {file.deed_type}
                          </span>
                          {file.case_id && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-medium">
                              مرتبط بقضية {file.case_number || ''}
                            </span>
                          )}
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          file.status === 'تم التنفيذ كلياً' || file.status === 'تم الصلح والتسوية'
                            ? 'bg-emerald-100 text-emerald-800'
                            : file.status === 'جاري'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {file.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-2">
                        <div>
                          <span className="text-slate-400">المنفذ: </span>
                          <span className="font-bold text-slate-800">{file.applicant_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">المدين: </span>
                          <span className="font-bold text-slate-800">{file.enforced_against}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span className="text-[11px]">{file.court}</span>
                        <div className="space-x-3 space-x-reverse text-xs">
                          <span>المطلوب: <strong className="text-slate-800">{file.total_claimed_amount.toLocaleString('ar-EG')}</strong></span>
                          <span>المحصل: <strong className="text-emerald-700">{file.collected_amount.toLocaleString('ar-EG')}</strong></span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                        <span>إعلان: {file.announcement_date || '-'}</span>
                        <span>{file.actions_count || 0} إجراء تنفيذ | {file.hearings_count || 0} جلسة</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detailed File Workspace (Left 5 Cols in RTL) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {!selectedFileDetails ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-600">اختر ملف تنفيذ من القائمة</p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                ستظهر هنا كافة تفاصيل السند، إجراءات الحجز، الجلسات، التحصيلات المالية، ومحضر الصلح.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Drawer Top Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">
                        ملف {selectedFileDetails.file_number}
                        {selectedFileDetails.year && ` لسنة ${selectedFileDetails.year}`}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {selectedFileDetails.deed_type}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {selectedFileDetails.court} {selectedFileDetails.execution_judge ? `| ${selectedFileDetails.execution_judge}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePrint(selectedFileDetails)}
                      className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors"
                      title="طباعة ملف التنفيذ"
                    >
                      <Printer className="w-4 h-4 text-slate-600" />
                    </button>

                    {selectedFileDetails.case_id && onNavigateToCase && (
                      <button
                        onClick={() => onNavigateToCase(selectedFileDetails.case_id!)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 transition-colors"
                        title="الانتقال إلى صفحة القضية المرتبطة"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        if (confirm(`هل أنت متأكد من حذف ملف التنفيذ رقم ${selectedFileDetails.file_number}؟`)) {
                          const res = await deleteFile(selectedFileDetails.id);
                          if (!res.success) {
                            alert(res.message || 'تعذر الحذف');
                          } else {
                            setSelectedFileId(null);
                          }
                        }
                      }}
                      className="p-1.5 bg-white hover:bg-red-50 border border-slate-200 rounded-lg text-red-600 transition-colors"
                      title="حذف الملف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub Tabs */}
                <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-1">
                  <button
                    onClick={() => setDetailTab('info')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      detailTab === 'info'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    البيانات الأساسية
                  </button>

                  <button
                    onClick={() => setDetailTab('actions')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      detailTab === 'actions'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    الإجراءات ({selectedFileDetails.actions.length})
                  </button>

                  <button
                    onClick={() => setDetailTab('hearings')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      detailTab === 'hearings'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    الجلسات ({selectedFileDetails.hearings.length})
                  </button>

                  <button
                    onClick={() => setDetailTab('finance')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      detailTab === 'finance'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    المالية ({selectedFileDetails.transactions.length})
                  </button>

                  <button
                    onClick={() => setDetailTab('settlement')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      detailTab === 'settlement'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    الصلح والتسوية
                  </button>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 text-xs space-y-4">
                {/* TAB 1: Info */}
                {detailTab === 'info' && (
                  <div className="space-y-4">
                    {/* Financial Summary Box */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">المطلوب</span>
                        <span className="font-bold text-slate-900 dir-ltr text-xs block">
                          {selectedFileDetails.total_claimed_amount.toLocaleString('ar-EG')} ج.م
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 font-bold block mb-0.5">المحصل</span>
                        <span className="font-bold text-emerald-700 dir-ltr text-xs block">
                          {selectedFileDetails.collected_amount.toLocaleString('ar-EG')} ج.م
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-red-700 font-bold block mb-0.5">المتبقي</span>
                        <span className="font-bold text-red-700 dir-ltr text-xs block">
                          {selectedFileDetails.remaining_amount.toLocaleString('ar-EG')} ج.م
                        </span>
                      </div>
                    </div>

                    {/* Parties info */}
                    <div className="space-y-2 border border-slate-100 p-3 rounded-xl bg-white shadow-2xs">
                      <h5 className="font-bold text-slate-800 text-xs">أطراف ملف التنفيذ</h5>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-slate-400">طالب التنفيذ (المنفذ): </span>
                          <span className="font-bold text-slate-800">{selectedFileDetails.applicant_name}</span>
                          <span className="text-slate-500"> ({selectedFileDetails.applicant_capacity || 'طالب التنفيذ'})</span>
                          {selectedFileDetails.client_name && (
                            <div className="text-[11px] text-amber-700 mt-0.5">الموكل: {selectedFileDetails.client_name}</div>
                          )}
                        </div>

                        <div className="pt-1 border-t border-slate-50">
                          <span className="text-slate-400">المنفذ ضده (المدين): </span>
                          <span className="font-bold text-slate-800">{selectedFileDetails.enforced_against}</span>
                          <span className="text-slate-500"> ({selectedFileDetails.enforced_against_capacity || 'المنفذ ضده'})</span>
                          {selectedFileDetails.enforced_against_phone && (
                            <div className="text-slate-600">هاتف: {selectedFileDetails.enforced_against_phone}</div>
                          )}
                          {selectedFileDetails.enforced_against_address && (
                            <div className="text-slate-600">عنوان: {selectedFileDetails.enforced_against_address}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Deed info */}
                    <div className="space-y-2 border border-slate-100 p-3 rounded-xl bg-white shadow-2xs">
                      <h5 className="font-bold text-slate-800 text-xs">بيانات السند التنفيذي</h5>
                      <div className="grid grid-cols-2 gap-2 text-slate-700">
                        <div>
                          <span className="text-slate-400 block">نوع السند:</span>
                          <span className="font-bold">{selectedFileDetails.deed_type}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">رقم وتاريخ السند:</span>
                          <span>{selectedFileDetails.deed_number || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">المحكمة:</span>
                          <span>{selectedFileDetails.court}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">إعلان السند:</span>
                          <span>{selectedFileDetails.announcement_date || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {selectedFileDetails.notes && (
                      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/50 text-slate-700">
                        <span className="font-bold text-amber-900 block mb-1">ملاحظات الملف:</span>
                        <p className="whitespace-pre-wrap">{selectedFileDetails.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Actions */}
                {detailTab === 'actions' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">سجل الإجراءات المتسلسلة</span>
                      <button
                        onClick={() => setIsActionModalOpen(true)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold"
                      >
                        + إضافة إجراء
                      </button>
                    </div>

                    {selectedFileDetails.actions.length === 0 ? (
                      <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-400">
                        لم يتم تسجيل أي إجراءات حتى الآن (إعلان، حجز، بيع بالمزاد...)
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedFileDetails.actions.map(act => (
                          <div key={act.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{act.action_type}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                act.status === 'تم' ? 'bg-emerald-100 text-emerald-800' :
                                act.status === 'مرفوض' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {act.status}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-slate-500 text-[11px]">
                              <span>بتاريخ: {act.action_date}</span>
                              {act.police_report_or_bailiff_number && (
                                <span>محضر: {act.police_report_or_bailiff_number}</span>
                              )}
                            </div>

                            {act.dept_or_bailiff_office && (
                              <div className="text-slate-600 text-[11px]">
                                الجهة: {act.dept_or_bailiff_office} {act.bailiff_name ? `(${act.bailiff_name})` : ''}
                              </div>
                            )}

                            {(act.amount_collected || 0) > 0 && (
                              <div className="text-emerald-700 font-bold text-[11px]">
                                المبلغ المحصل: {act.amount_collected?.toLocaleString('ar-EG')} ج.م
                              </div>
                            )}

                            {act.details && (
                              <p className="text-slate-700 text-[11px] pt-1 border-t border-slate-200/40">
                                {act.details}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Hearings */}
                {detailTab === 'hearings' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">جلسات وإشكالات التنفيذ</span>
                      <button
                        onClick={() => {
                          setHearingForm({
                            hearing_date: new Date().toISOString().split('T')[0],
                            hearing_time: '10:00',
                            court_name: selectedFileDetails.court,
                            court_circuit: 'دائرة إشكالات التنفيذ',
                            roll_number: '',
                            proceedings: ''
                          });
                          setIsHearingModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-bold"
                      >
                        + إضافة جلسة
                      </button>
                    </div>

                    {selectedFileDetails.hearings.length === 0 ? (
                      <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-400">
                        لا توجد جلسات إشكالات أو منازعات مسجلة
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedFileDetails.hearings.map(h => (
                          <div key={h.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900">{h.hearing_date}</span>
                                {h.roll_number && <span className="text-[10px] bg-slate-200 px-1 rounded">رول {h.roll_number}</span>}
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedHearingToOutcome(h);
                                  setHearingOutcomeForm({
                                    attended: h.attended || 1,
                                    attended_by: h.attended_by || 'المحامي المسؤول',
                                    proceedings: h.proceedings || '',
                                    court_decision: h.court_decision || '',
                                    adjournment_reason: h.adjournment_reason || '',
                                    next_hearing_date: h.next_hearing_date || '',
                                    status: h.status || 'تمت'
                                  });
                                  setIsHearingOutcomeModalOpen(true);
                                }}
                                className="text-purple-700 hover:text-purple-900 font-bold underline"
                              >
                                تسجيل القرار
                              </button>
                            </div>

                            {h.court_decision && (
                              <div className="text-slate-800 font-medium">
                                <span className="text-slate-400">القرار: </span>
                                {h.court_decision}
                              </div>
                            )}

                            {h.next_hearing_date && (
                              <div className="text-amber-800 text-[11px]">
                                مؤجل إلى: {h.next_hearing_date} {h.adjournment_reason ? `(${h.adjournment_reason})` : ''}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: Finance */}
                {detailTab === 'finance' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">الحركات المالية المقيدة</span>
                      <button
                        onClick={() => {
                          setPaymentForm({
                            amount: 0,
                            direction: 'وارد',
                            transactionType: 'تحصيل تنفيذ جبري / ودي',
                            paymentMethod: 'نقدي',
                            description: `تحصيل مبلغ على ذمة ملف التنفيذ رقم ${selectedFileDetails.file_number}`,
                            notes: ''
                          });
                          setIsPaymentModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                      >
                        + تسجيل تحصيل أو مصروف
                      </button>
                    </div>

                    {selectedFileDetails.transactions.length === 0 ? (
                      <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-400">
                        لا توجد حركات مالية مسجلة بعد
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedFileDetails.transactions.map(tx => (
                          <div
                            key={tx.id}
                            className={`p-3 rounded-lg border text-xs space-y-1 ${
                              tx.is_reversed ? 'bg-red-50/50 border-red-200 line-through opacity-60' : 'bg-slate-50 border-slate-200/70'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-blue-700">{tx.receipt_number}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                tx.direction === 'وارد' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {tx.direction === 'وارد' ? 'تحصيل' : 'مصروف'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between font-bold">
                              <span className="text-slate-800">{tx.description}</span>
                              <span className={`dir-ltr ${tx.direction === 'وارد' ? 'text-emerald-700' : 'text-red-700'}`}>
                                {tx.amount.toLocaleString('ar-EG')} ج.م
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-slate-400 text-[10px]">
                              <span>التاريخ: {tx.transaction_date}</span>
                              <span>طريقة السداد: {tx.payment_method}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: Settlement */}
                {detailTab === 'settlement' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">محضر التسوية والصلح الودية</span>
                      <button
                        onClick={() => {
                          setSettlementForm({
                            settlement_minutes: selectedFileDetails.settlement_minutes || '',
                            settlement_date: selectedFileDetails.settlement_date || new Date().toISOString().split('T')[0]
                          });
                          setIsSettlementModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold"
                      >
                        {selectedFileDetails.settlement_minutes ? 'تعديل محضر الصلح' : '+ تحرير محضر صلح'}
                      </button>
                    </div>

                    {selectedFileDetails.settlement_minutes ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-emerald-900 font-bold">
                          <span>تم الصلح والتسوية الودية</span>
                          <span className="text-[11px]">بتاريخ: {selectedFileDetails.settlement_date}</span>
                        </div>
                        <p className="text-emerald-800 whitespace-pre-wrap leading-relaxed text-xs">
                          {selectedFileDetails.settlement_minutes}
                        </p>
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-400 space-y-2">
                        <Handshake className="w-8 h-8 mx-auto opacity-40 text-amber-600" />
                        <p>لم يتم تسجيل محضر صلح أو تسوية لهذا الملف بعد.</p>
                        <p className="text-[11px]">عند الاتفاق مع المدين، يمكنك توثيق شروط الصلح هنا لتتحول حالة الملف تلقائياً إلى "تم الصلح والتسوية".</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: Create Execution File */}
      {/* ============================================================== */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-amber-600" />
              <span>فتح ملف تنفيذ جبري جديد</span>
            </h3>

            <form onSubmit={handleCreateFile} className="space-y-4 text-xs">
              {/* Optional Case Linkage */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-slate-700 font-bold">
                  ربط الملف بقضية مسجلة بالبرنامج (اختياري)
                </label>
                <select
                  value={newFileForm.case_id}
                  onChange={e => handleCaseSelection(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="">ملف تنفيذ مستقل (غير مرتبط بقضية)</option>
                  {cases.map(c => (
                    <option key={c.id} value={c.id}>
                      قضية رقم {c.case_number} لسنة {c.case_year} — {c.court_name} ({c.primary_client_name || 'موكل'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">رقم ملف التنفيذ *</label>
                  <input
                    type="text"
                    required
                    value={newFileForm.file_number}
                    onChange={e => setNewFileForm({ ...newFileForm, file_number: e.target.value })}
                    placeholder="مثال: 512"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">السنة القضائية</label>
                  <input
                    type="number"
                    value={newFileForm.year}
                    onChange={e => setNewFileForm({ ...newFileForm, year: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">نوع السند التنفيذي *</label>
                  <select
                    value={newFileForm.deed_type}
                    onChange={e => setNewFileForm({ ...newFileForm, deed_type: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="حكم">حكم قضائي</option>
                    <option value="أمر أداء">أمر أداء</option>
                    <option value="شيك">شيك بنكي</option>
                    <option value="كمبيالة">كمبيالة / سند لأمر</option>
                    <option value="عقد موثق">عقد موثق بشهر عقاري</option>
                    <option value="محضر صلح">محضر صلح موثق</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">بيانات ورقم السند</label>
                  <input
                    type="text"
                    value={newFileForm.deed_number}
                    onChange={e => setNewFileForm({ ...newFileForm, deed_number: e.target.value })}
                    placeholder="رقم الحكم، تاريخه، الدائرة..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">المحكمة *</label>
                  <input
                    type="text"
                    required
                    value={newFileForm.court}
                    onChange={e => setNewFileForm({ ...newFileForm, court: e.target.value })}
                    placeholder="مثال: محكمة جنوب القاهرة الابتدائية"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">قاضي / إدارة التنفيذ</label>
                  <input
                    type="text"
                    value={newFileForm.execution_judge}
                    onChange={e => setNewFileForm({ ...newFileForm, execution_judge: e.target.value })}
                    placeholder="قاضي التنفيذ أو الدائرة"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">طالب التنفيذ (المنفذ) *</label>
                  <input
                    type="text"
                    required
                    value={newFileForm.applicant_name}
                    onChange={e => setNewFileForm({ ...newFileForm, applicant_name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">المنفذ ضده (المدين) *</label>
                  <input
                    type="text"
                    required
                    value={newFileForm.enforced_against}
                    onChange={e => setNewFileForm({ ...newFileForm, enforced_against: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">المبلغ المطلوب تنفيذه (ج.م) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={newFileForm.total_claimed_amount}
                    onChange={e => setNewFileForm({ ...newFileForm, total_claimed_amount: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">تاريخ إعلان السند</label>
                  <input
                    type="date"
                    value={newFileForm.announcement_date}
                    onChange={e => setNewFileForm({ ...newFileForm, announcement_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">ملاحظات الملف</label>
                <textarea
                  rows={2}
                  value={newFileForm.notes}
                  onChange={e => setNewFileForm({ ...newFileForm, notes: e.target.value })}
                  placeholder="ملاحظات..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewFileModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  فتح الملف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: Create Action */}
      {/* ============================================================== */}
      {isActionModalOpen && selectedFileDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              <span>إضافة إجراء تنفيذ على ملف ({selectedFileDetails.file_number})</span>
            </h3>

            <form onSubmit={handleCreateAction} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">نوع الإجراء *</label>
                  <select
                    value={actionForm.action_type}
                    onChange={e => setActionForm({ ...actionForm, action_type: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="إعلان السند التنفيذي">إعلان السند التنفيذي</option>
                    <option value="تكليف بالوفاء">تكليف بالوفاء</option>
                    <option value="حجز تحفظي">حجز تحفظي</option>
                    <option value="حجز تنفيذي">حجز تنفيذي</option>
                    <option value="حجز ما للمدين لدى الغير">حجز ما للمدين لدى الغير (بنوك/شركات)</option>
                    <option value="حجز على سيارة">حجز على سيارة</option>
                    <option value="حجز عقاري">حجز عقاري</option>
                    <option value="بيع بالمزاد">بيع بالمزاد العلني</option>
                    <option value="تسليم منقول">تسليم منقول</option>
                    <option value="إخلاء">إخلاء جبري وتسليم</option>
                    <option value="منع سفر">منع من السفر</option>
                    <option value="ضبط وإحضار">ضبط وإحضار المدين</option>
                    <option value="استشكال في التنفيذ">استشكال في التنفيذ</option>
                    <option value="دعوى استرداد">دعوى استرداد محجوزات</option>
                    <option value="مأمورية كسر وفتح بالقوة الجبرية">كسر وفتح بالقوة الجبرية</option>
                    <option value="أخرى">إجراء آخر</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">تاريخ الإجراء *</label>
                  <input
                    type="date"
                    required
                    value={actionForm.action_date}
                    onChange={e => setActionForm({ ...actionForm, action_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">رقم المحضر / ورقة المحضرين</label>
                  <input
                    type="text"
                    value={actionForm.police_report_or_bailiff_number}
                    onChange={e => setActionForm({ ...actionForm, police_report_or_bailiff_number: e.target.value })}
                    placeholder="رقم المحضر"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">حالة الإجراء</label>
                  <select
                    value={actionForm.status}
                    onChange={e => setActionForm({ ...actionForm, status: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="تم">تم بنجاح</option>
                    <option value="جاري">جاري التنفيذ</option>
                    <option value="مؤجل">مؤجل</option>
                    <option value="مرفوض">مرفوض</option>
                    <option value="ملغى">ملغى</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">المبلغ المحصل (إن وجد)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={actionForm.amount_collected}
                    onChange={e => setActionForm({ ...actionForm, amount_collected: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs text-emerald-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">اسم المحضر / المعاون</label>
                  <input
                    type="text"
                    value={actionForm.bailiff_name}
                    onChange={e => setActionForm({ ...actionForm, bailiff_name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">تفاصيل ووقائع الإجراء</label>
                <textarea
                  rows={2}
                  value={actionForm.details}
                  onChange={e => setActionForm({ ...actionForm, details: e.target.value })}
                  placeholder="ما تم أثناء الإجراء..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  حفظ الإجراء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: Create Hearing */}
      {/* ============================================================== */}
      {isHearingModalOpen && selectedFileDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Gavel className="w-5 h-5 text-purple-600" />
              <span>إضافة جلسة أو إشكال تنفيذ</span>
            </h3>

            <form onSubmit={handleCreateHearing} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">تاريخ الجلسة *</label>
                  <input
                    type="date"
                    required
                    value={hearingForm.hearing_date}
                    onChange={e => setHearingForm({ ...hearingForm, hearing_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">وقت الجلسة</label>
                  <input
                    type="time"
                    value={hearingForm.hearing_time}
                    onChange={e => setHearingForm({ ...hearingForm, hearing_time: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">المحكمة</label>
                  <input
                    type="text"
                    value={hearingForm.court_name}
                    onChange={e => setHearingForm({ ...hearingForm, court_name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">الدائرة / قاضي التنفيذ</label>
                  <input
                    type="text"
                    value={hearingForm.court_circuit}
                    onChange={e => setHearingForm({ ...hearingForm, court_circuit: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">رقم الرول</label>
                <input
                  type="text"
                  value={hearingForm.roll_number}
                  onChange={e => setHearingForm({ ...hearingForm, roll_number: e.target.value })}
                  placeholder="مثال: 5"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">المطلوب في الجلسة</label>
                <textarea
                  rows={2}
                  value={hearingForm.proceedings}
                  onChange={e => setHearingForm({ ...hearingForm, proceedings: e.target.value })}
                  placeholder="نظر إشكال، استمرار تنفيذ..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHearingModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  حفظ الجلسة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: Record Hearing Outcome */}
      {/* ============================================================== */}
      {isHearingOutcomeModalOpen && selectedHearingToOutcome && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
              <span>تسجيل نتيجة جلسة {selectedHearingToOutcome.hearing_date}</span>
            </h3>

            <form onSubmit={handleRecordHearingOutcome} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">الحضور</label>
                  <select
                    value={hearingOutcomeForm.attended}
                    onChange={e => setHearingOutcomeForm({ ...hearingOutcomeForm, attended: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value={1}>تم الحضور</option>
                    <option value={0}>لم يحضر أحد</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">من حضر</label>
                  <input
                    type="text"
                    value={hearingOutcomeForm.attended_by}
                    onChange={e => setHearingOutcomeForm({ ...hearingOutcomeForm, attended_by: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">قرار المحكمة / قاضي التنفيذ *</label>
                <textarea
                  rows={2}
                  required
                  value={hearingOutcomeForm.court_decision}
                  onChange={e => setHearingOutcomeForm({ ...hearingOutcomeForm, court_decision: e.target.value })}
                  placeholder="منطوق القرار..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">سبب التأجيل (إن وجد)</label>
                  <input
                    type="text"
                    value={hearingOutcomeForm.adjournment_reason}
                    onChange={e => setHearingOutcomeForm({ ...hearingOutcomeForm, adjournment_reason: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">الجلسة القادمة (توليد آلي)</label>
                  <input
                    type="date"
                    value={hearingOutcomeForm.next_hearing_date}
                    onChange={e => setHearingOutcomeForm({ ...hearingOutcomeForm, next_hearing_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHearingOutcomeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  حفظ القرار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: Payment / Expense */}
      {/* ============================================================== */}
      {isPaymentModalOpen && selectedFileDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              <span>تسجيل حركة مالية على ملف ({selectedFileDetails.file_number})</span>
            </h3>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">نوع الحركة *</label>
                  <select
                    value={paymentForm.direction}
                    onChange={e => {
                      const dir = e.target.value as TransactionDirection;
                      setPaymentForm({
                        ...paymentForm,
                        direction: dir,
                        transactionType: dir === 'وارد' ? 'تحصيل تنفيذ جبري / ودي' : 'مصاريف تنفيذ ورسوم محضرين'
                      });
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    <option value="وارد">وارد (تحصيل دين من المدين)</option>
                    <option value="صادر">صادر (مصروفات ورسوم تنفيذ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">المبلغ (ج.م) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={paymentForm.amount || ''}
                    onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">طريقة السداد</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="نقدي">نقدي</option>
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="شيك">شيك</option>
                    <option value="فودافون كاش">فودافون كاش</option>
                    <option value="إنستاباي">إنستاباي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">نوع المعاملة</label>
                  <input
                    type="text"
                    value={paymentForm.transactionType}
                    onChange={e => setPaymentForm({ ...paymentForm, transactionType: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">البيان / الوصف *</label>
                <input
                  type="text"
                  required
                  value={paymentForm.description}
                  onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  placeholder="تحصيل قسط تنفيذ، أمانة محضرين..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  حفظ وإصدار إيصال
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: Settlement */}
      {/* ============================================================== */}
      {isSettlementModalOpen && selectedFileDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Handshake className="w-5 h-5 text-amber-600" />
              <span>محضر صلح وتسوية ودية لملف ({selectedFileDetails.file_number})</span>
            </h3>

            <form onSubmit={handleRecordSettlement} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">تاريخ الصلح *</label>
                <input
                  type="date"
                  required
                  value={settlementForm.settlement_date}
                  onChange={e => setSettlementForm({ ...settlementForm, settlement_date: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">بنود ومحضر التسوية *</label>
                <textarea
                  rows={4}
                  required
                  value={settlementForm.settlement_minutes}
                  onChange={e => setSettlementForm({ ...settlementForm, settlement_minutes: e.target.value })}
                  placeholder="تم الاتفاق بين طالب التنفيذ والمنفذ ضده على..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSettlementModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  تثبيت الصلح والتسوية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
