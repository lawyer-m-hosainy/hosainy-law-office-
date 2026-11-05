import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Plus,
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
  DollarSign
} from 'lucide-react';
import {
  CaseDetails,
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
} from '../../../../shared/types';
import { useExecutions } from '../../../hooks/useExecutions';
import { generateExecutionReportHtml } from '../../../services/executionReportGenerator';

interface CaseExecutionsTabProps {
  caseData: CaseDetails;
  settings: OfficeSettings;
  onCaseUpdated?: () => void;
}

export const CaseExecutionsTab: React.FC<CaseExecutionsTabProps> = ({
  caseData,
  settings,
  onCaseUpdated
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

  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [selectedFileDetails, setSelectedFileDetails] = useState<ExecutionDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Modals state
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isHearingModalOpen, setIsHearingModalOpen] = useState(false);
  const [isHearingOutcomeModalOpen, setIsHearingOutcomeModalOpen] = useState(false);
  const [selectedHearingToOutcome, setSelectedHearingToOutcome] = useState<ExecutionHearing | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  // Form states
  const [fileForm, setFileForm] = useState({
    file_number: '',
    year: new Date().getFullYear(),
    deed_type: 'حكم' as ExecutionDeedType,
    deed_number: `حكم رقم ${caseData.case_number} لسنة ${caseData.case_year}`,
    court: caseData.court_name,
    execution_judge: '',
    execution_dept: 'محضرين التنفيذ',
    applicant_name: caseData.clients?.[0]?.client_name || 'الموكل',
    applicant_capacity: caseData.clients?.[0]?.capacity || 'طالب التنفيذ',
    enforced_against: caseData.opponents?.[0]?.name || '',
    enforced_against_capacity: caseData.opponents?.[0]?.capacity || 'المنفذ ضده',
    enforced_against_address: caseData.opponents?.[0]?.address || '',
    enforced_against_phone: caseData.opponents?.[0]?.phone || '',
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
    court_name: caseData.court_name,
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
    transactionType: 'تحصيل تنفيذ جبري',
    paymentMethod: 'نقدي' as PaymentMethod,
    description: `تحصيل مبلغ على ذمة ملف التنفيذ رقم ${caseData.case_number}`,
    notes: ''
  });

  const [settlementForm, setSettlementForm] = useState({
    settlement_minutes: '',
    settlement_date: new Date().toISOString().split('T')[0]
  });

  // Load files for this case
  useEffect(() => {
    loadFiles({ caseId: caseData.id });
  }, [caseData.id, loadFiles]);

  // Load full details when a file is selected
  useEffect(() => {
    if (selectedFileId) {
      setLoadingDetails(true);
      getFileById(selectedFileId).then(data => {
        setSelectedFileDetails(data);
        setLoadingDetails(false);
      });
    } else {
      setSelectedFileDetails(null);
    }
  }, [selectedFileId, getFileById]);

  // Quick refresh selected file
  const refreshSelected = async () => {
    if (selectedFileId) {
      const data = await getFileById(selectedFileId);
      setSelectedFileDetails(data);
    }
    loadFiles({ caseId: caseData.id });
    if (onCaseUpdated) onCaseUpdated();
  };

  // Printing execution file
  const handlePrintFile = async (fileDetails: ExecutionDetails) => {
    try {
      setPrintStatus('جاري تجهيز تقرير ملف التنفيذ...');
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
    if (!fileForm.file_number.trim() || !fileForm.court.trim() || !fileForm.applicant_name.trim() || !fileForm.enforced_against.trim()) {
      alert('يرجى ملء جميع الحقول الإلزامية (رقم الملف، المحكمة، طالب التنفيذ، المنفذ ضده)');
      return;
    }

    try {
      const newFile = await createFile({
        ...fileForm,
        case_id: caseData.id,
        client_id: caseData.clients?.[0]?.client_id || null,
        total_claimed_amount: Number(fileForm.total_claimed_amount) || 0
      });

      setIsNewFileModalOpen(false);
      setSelectedFileId(newFile.id);
      refreshSelected();
    } catch (err: any) {
      alert(`خطأ أثناء إنشاء ملف التنفيذ: ${err?.message}`);
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
      setActionForm({
        action_type: 'حجز تنفيذي',
        action_date: new Date().toISOString().split('T')[0],
        status: 'تم',
        police_report_or_bailiff_number: '',
        dept_or_bailiff_office: 'قلم المحضرين',
        bailiff_name: '',
        amount_collected: 0,
        details: '',
        notes: ''
      });
      refreshSelected();
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
        case_id: caseData.id,
        hearing_date: hearingForm.hearing_date,
        hearing_time: hearingForm.hearing_time,
        court_name: hearingForm.court_name,
        court_circuit: hearingForm.court_circuit,
        roll_number: hearingForm.roll_number,
        proceedings: hearingForm.proceedings,
        attended: 0,
        status: 'محددة'
      });

      setIsHearingModalOpen(false);
      refreshSelected();
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
      refreshSelected();
    } catch (err: any) {
      alert(`خطأ أثناء تسجيل نتيجة الجلسة: ${err?.message}`);
    }
  };

  // Submit Payment / Expense
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFileId) return;
    if (paymentForm.amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
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
      setPaymentForm({
        amount: 0,
        direction: 'وارد',
        transactionType: 'تحصيل تنفيذ جبري',
        paymentMethod: 'نقدي',
        description: '',
        notes: ''
      });
      refreshSelected();
    } catch (err: any) {
      alert(`خطأ أثناء تسجيل الحركة المالية: ${err?.message}`);
    }
  };

  // Submit Settlement
  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFileId || !settlementForm.settlement_minutes.trim()) {
      alert('يرجى إدخال وقائع وبنود محضر التسوية والصلح');
      return;
    }

    try {
      await recordSettlement(selectedFileId, settlementForm.settlement_minutes, settlementForm.settlement_date);
      setIsSettlementModalOpen(false);
      refreshSelected();
    } catch (err: any) {
      alert(`خطأ أثناء تسجيل الصلح: ${err?.message}`);
    }
  };

  // Calculations for this case's executions
  const totalClaimed = files.reduce((sum, f) => sum + (f.total_claimed_amount || 0), 0);
  const totalCollected = files.reduce((sum, f) => sum + (f.collected_amount || 0), 0);
  const totalRemaining = Math.max(0, totalClaimed - totalCollected);

  return (
    <div className="space-y-6">
      {/* Print Notification Toast */}
      {printStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{printStatus}</span>
        </div>
      )}

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">ملفات التنفيذ</span>
            <FileCheck2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-800">{files.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">ملفات مقيدة على هذه الدعوى</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">المبلغ المطلوب تنفيذه</span>
            <Coins className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-700 dir-ltr text-right">
            {totalClaimed.toLocaleString('ar-EG')} <span className="text-xs font-normal">ج.م</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">إجمالي منطوق الأحكام والسندات</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">المبالغ المحصلة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 dir-ltr text-right">
            {totalCollected.toLocaleString('ar-EG')} <span className="text-xs font-normal">ج.م</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            نسبة التحصيل: {totalClaimed > 0 ? Math.round((totalCollected / totalClaimed) * 100) : 0}%
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">المبلغ المتبقي</span>
            <Clock className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-bold text-red-700 dir-ltr text-right">
            {totalRemaining.toLocaleString('ar-EG')} <span className="text-xs font-normal">ج.م</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">متبقٍ بذمة المنفذ ضدهم</div>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-800">ملفات وإجراءات التنفيذ الجبري</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            السندات التنفيذية، إجراءات الحجوزات والبيع بالمزاد، التحصيلات والصلح القضائي
          </p>
        </div>
        <button
          onClick={() => setIsNewFileModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs" data-testid="case.executions.tab.set-is-new-file-modal-open"
        >
          <Plus className="w-4 h-4" />
          <span>فتح ملف تنفيذ جديد</span>
        </button>
      </div>

      {/* Files List / Details Grid */}
      {files.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">لا توجد ملفات تنفيذ مفتوحة لهذه القضية</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            يمكنك فتح ملف تنفيذ جبري جديد بموجب حكم صادر أو أمر أداء لمتابعة الحجوزات ومحاضر البيع والتحصيلات.
          </p>
          <button
            onClick={() => setIsNewFileModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors" data-testid="case.executions.tab.set-is-new-file-modal-open-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>فتح ملف تنفيذ الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Files Selector Column (Left on RTL) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-600 px-1">الملفات المسجلة ({files.length})</h4>
            {files.map(file => {
              const isSelected = selectedFileId === file.id;
              const percent = file.total_claimed_amount > 0
                ? Math.min(100, Math.round((file.collected_amount / file.total_claimed_amount) * 100))
                : 0;

              return (
                <div
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`} data-testid="case.executions.tab.set-selected-file-id"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">ملف {file.file_number}</span>
                        {file.year && <span className="text-xs text-slate-500">/{file.year}</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{file.court}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        file.status === 'تم التنفيذ كلياً' || file.status === 'تم الصلح والتسوية'
                          ? 'bg-emerald-100 text-emerald-800'
                          : file.status === 'جاري'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {file.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 mb-2">
                    <span className="text-slate-400">ضد: </span>
                    <span className="font-medium">{file.enforced_against}</span>
                  </div>

                  {/* Mini Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>محصل: {file.collected_amount.toLocaleString('ar-EG')} ج.م</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
                    <span>{file.deed_type}</span>
                    <span>{file.actions_count || 0} إجراء | {file.hearings_count || 0} جلسة</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected File Details Column */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedFileDetails ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                <FileCheck2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">اختر ملف تنفيذ من القائمة لعرض تفاصيله وإجراءاته</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-6">
                {/* Header & Quick Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900">
                        ملف تنفيذ رقم ({selectedFileDetails.file_number}) {selectedFileDetails.year ? `لسنة ${selectedFileDetails.year}` : ''}
                      </h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                        {selectedFileDetails.deed_type}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      المحكمة: {selectedFileDetails.court} {selectedFileDetails.execution_judge ? `| قاضي التنفيذ: ${selectedFileDetails.execution_judge}` : ''}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => handlePrintFile(selectedFileDetails)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                      title="طباعة ملف التنفيذ بإجراءاته" data-testid="case.executions.tab.handle-print-file"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>طباعة الملف</span>
                    </button>

                    <button
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors" data-testid="case.executions.tab.set-is-payment-modal-open"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>تسجيل تحصيل / صرف</span>
                    </button>

                    <button
                      onClick={() => setIsActionModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors" data-testid="case.executions.tab.set-is-action-modal-open"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة إجراء</span>
                    </button>

                    <button
                      onClick={() => setIsHearingModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors" data-testid="case.executions.tab.set-is-hearing-modal-open"
                    >
                      <Gavel className="w-3.5 h-3.5" />
                      <span>إضافة جلسة / إشكال</span>
                    </button>

                    <button
                      onClick={() => setIsSettlementModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors" data-testid="case.executions.tab.set-is-settlement-modal-open"
                    >
                      <Handshake className="w-3.5 h-3.5" />
                      <span>محضر تسوية</span>
                    </button>
                  </div>
                </div>

                {/* Parties Details Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block mb-1">طالب التنفيذ (المنفذ):</span>
                    <span className="font-bold text-slate-900 block text-sm">
                      {selectedFileDetails.applicant_name} ({selectedFileDetails.applicant_capacity || 'طالب التنفيذ'})
                    </span>
                    {selectedFileDetails.client_name && (
                      <span className="text-amber-700 mt-1 block">الموكل: {selectedFileDetails.client_name}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">المنفذ ضده:</span>
                    <span className="font-bold text-slate-900 block text-sm">
                      {selectedFileDetails.enforced_against} ({selectedFileDetails.enforced_against_capacity || 'المنفذ ضده'})
                    </span>
                    {selectedFileDetails.enforced_against_phone && (
                      <span className="text-slate-600 block mt-0.5">الهاتف: {selectedFileDetails.enforced_against_phone}</span>
                    )}
                    {selectedFileDetails.enforced_against_address && (
                      <span className="text-slate-600 block mt-0.5">العنوان: {selectedFileDetails.enforced_against_address}</span>
                    )}
                  </div>
                </div>

                {/* Financial Summary Card */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-center">
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">المبلغ المطلوب تنفيذه</span>
                    <span className="font-bold text-sm text-slate-900 dir-ltr block">
                      {selectedFileDetails.total_claimed_amount.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-emerald-700 font-bold block mb-1">المبالغ المحصلة</span>
                    <span className="font-bold text-sm text-emerald-700 dir-ltr block">
                      {selectedFileDetails.collected_amount.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-red-700 font-bold block mb-1">المتبقي</span>
                    <span className="font-bold text-sm text-red-700 dir-ltr block">
                      {selectedFileDetails.remaining_amount.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                </div>

                {/* Settlement Banner if Exists */}
                {selectedFileDetails.settlement_minutes && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                        <Handshake className="w-4 h-4 text-emerald-600" />
                        <span>محضر الصلح والتسوية الودية</span>
                      </div>
                      <span className="text-[10px] text-emerald-700">
                        بتاريخ: {selectedFileDetails.settlement_date || '-'}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 whitespace-pre-wrap leading-relaxed">
                      {selectedFileDetails.settlement_minutes}
                    </p>
                  </div>
                )}

                {/* Section 1: Execution Actions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-blue-600" />
                      <span>سجل الإجراءات المتسلسلة ({selectedFileDetails.actions.length})</span>
                    </h5>
                    <button
                      onClick={() => setIsActionModalOpen(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold" data-testid="case.executions.tab.set-is-action-modal-open-2"
                    >
                      + إضافة إجراء
                    </button>
                  </div>

                  {selectedFileDetails.actions.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-400">
                      لم يتم تسجيل أي إجراءات حتى الآن (إعلان، حجز تحفظي، حجز تنفيذي، بيع بالمزاد...)
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                          <tr>
                            <th className="p-2.5">التاريخ</th>
                            <th className="p-2.5">نوع الإجراء</th>
                            <th className="p-2.5">رقم المحضر / الورقة</th>
                            <th className="p-2.5">الجهة / المحضر</th>
                            <th className="p-2.5">الحالة</th>
                            <th className="p-2.5">المحصل</th>
                            <th className="p-2.5">حذف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedFileDetails.actions.map(act => (
                            <tr key={act.id} className="hover:bg-slate-50/50">
                              <td className="p-2.5 text-slate-500 whitespace-nowrap">{act.action_date}</td>
                              <td className="p-2.5 font-bold text-slate-900">{act.action_type}</td>
                              <td className="p-2.5 text-slate-600">{act.police_report_or_bailiff_number || '-'}</td>
                              <td className="p-2.5 text-slate-600">{act.dept_or_bailiff_office || '-'}{act.bailiff_name ? ` (${act.bailiff_name})` : ''}</td>
                              <td className="p-2.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  act.status === 'تم' ? 'bg-emerald-100 text-emerald-800' :
                                  act.status === 'مرفوض' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {act.status}
                                </span>
                              </td>
                              <td className="p-2.5 font-bold text-emerald-700 dir-ltr text-right">
                                {(act.amount_collected || 0) > 0 ? (act.amount_collected || 0).toLocaleString('ar-EG') : '-'}
                              </td>
                              <td className="p-2.5">
                                <button
                                  onClick={async () => {
                                    if (confirm('هل أنت متأكد من حذف هذا الإجراء؟')) {
                                      await deleteAction(act.id);
                                      refreshSelected();
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700" data-testid="case.executions.tab.onfirm"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Section 2: Execution Hearings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Gavel className="w-4 h-4 text-purple-600" />
                      <span>جلسات وإشكالات التنفيذ ({selectedFileDetails.hearings.length})</span>
                    </h5>
                    <button
                      onClick={() => setIsHearingModalOpen(true)}
                      className="text-xs text-purple-600 hover:text-purple-700 font-bold" data-testid="case.executions.tab.set-is-hearing-modal-open-2"
                    >
                      + إضافة جلسة
                    </button>
                  </div>

                  {selectedFileDetails.hearings.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-400">
                      لا توجد جلسات إشكالات أو منازعات تنفيذ مقيدة
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedFileDetails.hearings.map(h => (
                        <div key={h.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{h.hearing_date}</span>
                              <span className="text-[10px] text-slate-500">({h.court_circuit || 'قاضي التنفيذ'})</span>
                              {h.roll_number && <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">رول {h.roll_number}</span>}
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
                              className="text-xs text-purple-700 hover:text-purple-900 font-bold underline" data-testid="case.executions.tab.set-selected-hearing-to-outcome"
                            >
                              تسجيل القرار والنتيجة
                            </button>
                          </div>
                          {h.court_decision && (
                            <div className="text-slate-800 font-medium">
                              <span className="text-slate-400">القرار: </span>
                              {h.court_decision}
                            </div>
                          )}
                          {h.next_hearing_date && (
                            <div className="text-[11px] text-amber-800">
                              الجلسة القادمة: {h.next_hearing_date} {h.adjournment_reason ? `(${h.adjournment_reason})` : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 3: Financial Transactions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-600" />
                      <span>الحركات المالية والإيصالات المقيدة بالملف ({selectedFileDetails.transactions.length})</span>
                    </h5>
                    <button
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-bold" data-testid="case.executions.tab.set-is-payment-modal-open-2"
                    >
                      + تسجيل تحصيل أو مصروف
                    </button>
                  </div>

                  {selectedFileDetails.transactions.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-400">
                      لا توجد حركات مالية مقيدة حتى الآن
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                          <tr>
                            <th className="p-2.5">رقم الإيصال</th>
                            <th className="p-2.5">التاريخ</th>
                            <th className="p-2.5">البيان</th>
                            <th className="p-2.5">طريقة الدفع</th>
                            <th className="p-2.5">المبلغ</th>
                            <th className="p-2.5">النوع</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedFileDetails.transactions.map(tx => (
                            <tr key={tx.id} className={tx.is_reversed ? 'bg-red-50/50 line-through opacity-60' : 'hover:bg-slate-50/50'}>
                              <td className="p-2.5 font-mono font-bold text-blue-700">{tx.receipt_number}</td>
                              <td className="p-2.5 text-slate-500 whitespace-nowrap">{tx.transaction_date}</td>
                              <td className="p-2.5 font-medium text-slate-800">{tx.description}</td>
                              <td className="p-2.5 text-slate-600">{tx.payment_method}</td>
                              <td className={`p-2.5 font-bold dir-ltr text-right ${tx.direction === 'وارد' ? 'text-emerald-700' : 'text-red-700'}`}>
                                {tx.amount.toLocaleString('ar-EG')} ج.م
                              </td>
                              <td className="p-2.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tx.direction === 'وارد' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                  {tx.direction === 'وارد' ? 'تحصيل' : 'مصروف'}
                                </span>
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
          </div>
        </div>
      )}

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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">رقم ملف التنفيذ *</label>
                  <input
                    type="text"
                    required
                    value={fileForm.file_number}
                    onChange={e => setFileForm({ ...fileForm, file_number: e.target.value })}
                    placeholder="مثال: 145"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-file-form-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">السنة القضائية</label>
                  <input
                    type="number"
                    value={fileForm.year}
                    onChange={e => setFileForm({ ...fileForm, year: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-file-form-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">نوع السند التنفيذي *</label>
                  <select
                    value={fileForm.deed_type}
                    onChange={e => setFileForm({ ...fileForm, deed_type: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-file-form"
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
                    value={fileForm.deed_number}
                    onChange={e => setFileForm({ ...fileForm, deed_number: e.target.value })}
                    placeholder="مثال: حكم مدني كلي رقم ..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-file-form-4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">المحكمة *</label>
                  <input
                    type="text"
                    required
                    value={fileForm.court}
                    onChange={e => setFileForm({ ...fileForm, court: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-file-form-5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">قاضي / إدارة التنفيذ</label>
                  <input
                    type="text"
                    value={fileForm.execution_judge}
                    onChange={e => setFileForm({ ...fileForm, execution_judge: e.target.value })}
                    placeholder="اسم قاضي التنفيذ أو الدائرة"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-file-form-6"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">طالب التنفيذ (المنفذ) *</label>
                  <input
                    type="text"
                    required
                    value={fileForm.applicant_name}
                    onChange={e => setFileForm({ ...fileForm, applicant_name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-file-form-7"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">المنفذ ضده (المدين) *</label>
                  <input
                    type="text"
                    required
                    value={fileForm.enforced_against}
                    onChange={e => setFileForm({ ...fileForm, enforced_against: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-file-form-8"
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
                    value={fileForm.total_claimed_amount}
                    onChange={e => setFileForm({ ...fileForm, total_claimed_amount: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-blue-700" data-testid="case.executions.tab.set-file-form-9"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">تاريخ إعلان السند التنفيذي</label>
                  <input
                    type="date"
                    value={fileForm.announcement_date}
                    onChange={e => setFileForm({ ...fileForm, announcement_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-file-form-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">ملاحظات الملف</label>
                <textarea
                  rows={2}
                  value={fileForm.notes}
                  onChange={e => setFileForm({ ...fileForm, notes: e.target.value })}
                  placeholder="أي تفاصيل خاصة بتنفيذ الحكم..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-file-form-11"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewFileModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs" data-testid="case.executions.tab.set-is-new-file-modal-open-3"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs" data-testid="case.executions.tab.open"
                >
                  فتح الملف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: Create Execution Action */}
      {/* ============================================================== */}
      {isActionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              <span>إضافة إجراء تنفيذ</span>
            </h3>

            <form onSubmit={handleCreateAction} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">نوع الإجراء *</label>
                  <select
                    value={actionForm.action_type}
                    onChange={e => setActionForm({ ...actionForm, action_type: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-action-form"
                  >
                    <option value="إعلان السند التنفيذي">إعلان السند التنفيذي</option>
                    <option value="تكليف بالوفاء">تكليف بالوفاء</option>
                    <option value="حجز تحفظي">حجز تحفظي</option>
                    <option value="حجز تنفيذي">حجز تنفيذي</option>
                    <option value="حجز ما للمدين لدى الغير">حجز ما للمدين لدى الغير (بنوك/جهات)</option>
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
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-action-form-3"
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
                    placeholder="رقم المحضر أو الإعلان"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-action-form-4"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">حالة الإجراء</label>
                  <select
                    value={actionForm.status}
                    onChange={e => setActionForm({ ...actionForm, status: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-action-form-2"
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
                  <label className="block text-slate-600 font-bold mb-1">جهة التنفيذ / قلم المحضرين</label>
                  <input
                    type="text"
                    value={actionForm.dept_or_bailiff_office}
                    onChange={e => setActionForm({ ...actionForm, dept_or_bailiff_office: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-action-form-5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">اسم المحضر / معاون التنفيذ</label>
                  <input
                    type="text"
                    value={actionForm.bailiff_name}
                    onChange={e => setActionForm({ ...actionForm, bailiff_name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-action-form-6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">المبلغ المحصل في هذا الإجراء (إن وجد)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={actionForm.amount_collected}
                  onChange={e => setActionForm({ ...actionForm, amount_collected: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs text-emerald-700 font-bold" data-testid="case.executions.tab.set-action-form-7"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">تفاصيل ووقائع الإجراء</label>
                <textarea
                  rows={2}
                  value={actionForm.details}
                  onChange={e => setActionForm({ ...actionForm, details: e.target.value })}
                  placeholder="ما تم أثناء تنفيذ الإجراء، العقبات، أو المضبوطات..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-action-form-8"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs" data-testid="case.executions.tab.set-is-action-modal-open-3"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs" data-testid="case.executions.tab.save"
                >
                  حفظ الإجراء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: Create Execution Hearing */}
      {/* ============================================================== */}
      {isHearingModalOpen && (
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
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-hearing-form"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">وقت الجلسة</label>
                  <input
                    type="time"
                    value={hearingForm.hearing_time}
                    onChange={e => setHearingForm({ ...hearingForm, hearing_time: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-hearing-form-2"
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
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-hearing-form-3"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">الدائرة / قاضي التنفيذ</label>
                  <input
                    type="text"
                    value={hearingForm.court_circuit}
                    onChange={e => setHearingForm({ ...hearingForm, court_circuit: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-hearing-form-4"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">رقم الرول</label>
                <input
                  type="text"
                  value={hearingForm.roll_number}
                  onChange={e => setHearingForm({ ...hearingForm, roll_number: e.target.value })}
                  placeholder="مثال: 12"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-hearing-form-5"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">المطلوب في الجلسة</label>
                <textarea
                  rows={2}
                  value={hearingForm.proceedings}
                  onChange={e => setHearingForm({ ...hearingForm, proceedings: e.target.value })}
                  placeholder="نظر إشكال في التنفيذ، استمرار التنفيذ، مرافعة..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-hearing-form-6"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHearingModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs" data-testid="case.executions.tab.set-is-hearing-modal-open-3"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-xs" data-testid="case.executions.tab.add"
                >
                  إضافة الجلسة
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
                  <label className="block text-slate-600 font-bold mb-1">حالة الحضور</label>
                  <select
                    value={hearingOutcomeForm.attended}
                    onChange={e => setHearingOutcomeForm({ ...hearingOutcomeForm, attended: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-hearing-outcome-form"
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
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-hearing-outcome-form-2"
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
                  placeholder="مثال: رفض الإشكال والاستمرار في التنفيذ، أو تأجيل لجلسة..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900" data-testid="case.executions.tab.set-hearing-outcome-form-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">سبب التأجيل (إن وجد)</label>
                  <input
                    type="text"
                    value={hearingOutcomeForm.adjournment_reason}
                    onChange={e => setHearingOutcomeForm({ ...hearingOutcomeForm, adjournment_reason: e.target.value })}
                    placeholder="لتقديم مستندات، للمذكرات..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-hearing-outcome-form-4"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">الجلسة القادمة (توليد تلقائي)</label>
                  <input
                    type="date"
                    value={hearingOutcomeForm.next_hearing_date}
                    onChange={e => setHearingOutcomeForm({ ...hearingOutcomeForm, next_hearing_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-hearing-outcome-form-5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHearingOutcomeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs" data-testid="case.executions.tab.set-is-hearing-outcome-modal-open"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-xs" data-testid="case.executions.tab.save-2"
                >
                  حفظ القرار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: Record Payment / Expense (Integrated into unified finance) */}
      {/* ============================================================== */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              <span>تسجيل حركة مالية للتنفيذ</span>
            </h3>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">اتجاه الحركة *</label>
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
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold" data-testid="case.executions.tab.set-payment-form"
                  >
                    <option value="وارد">وارد (تحصيل مبالغ دين من المدين)</option>
                    <option value="صادر">صادر (مصروفات ورسوم تنفيذ من المكتب)</option>
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
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-emerald-700" data-testid="case.executions.tab.set-payment-form-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">طريقة السداد</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-payment-form-2"
                  >
                    <option value="نقدي">نقدي</option>
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="شيك">شيك</option>
                    <option value="فودافون كاش">فودافون كاش</option>
                    <option value="إنستاباي">إنستاباي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">نوع الحركة</label>
                  <input
                    type="text"
                    value={paymentForm.transactionType}
                    onChange={e => setPaymentForm({ ...paymentForm, transactionType: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-payment-form-4"
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
                  placeholder="تحصيل دفعة تنفيذ، رسوم محضرين، قوة أمنية..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-medium" data-testid="case.executions.tab.set-payment-form-5"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="ملاحظات..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-payment-form-6"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs" data-testid="case.executions.tab.set-is-payment-modal-open-3"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs" data-testid="case.executions.tab.save-3"
                >
                  حفظ وإصدار إيصال
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: Record Settlement */}
      {/* ============================================================== */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Handshake className="w-5 h-5 text-amber-600" />
              <span>تسجيل محضر صلح وتسوية ودية</span>
            </h3>

            <form onSubmit={handleRecordSettlement} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">تاريخ الصلح والتسوية *</label>
                <input
                  type="date"
                  required
                  value={settlementForm.settlement_date}
                  onChange={e => setSettlementForm({ ...settlementForm, settlement_date: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.executions.tab.set-settlement-form"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">شروط وبنود محضر التسوية والصلح *</label>
                <textarea
                  rows={4}
                  required
                  value={settlementForm.settlement_minutes}
                  onChange={e => setSettlementForm({ ...settlementForm, settlement_minutes: e.target.value })}
                  placeholder="تم الاتفاق والصلح بين الطرفين على سداد مبلغ ... والتنازل عن الحجوزات..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs leading-relaxed" data-testid="case.executions.tab.set-settlement-form-2"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-lg text-[11px] text-amber-800">
                سيتم تحديث حالة ملف التنفيذ تلقائياً إلى <strong>"تم الصلح والتسوية"</strong>.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSettlementModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs" data-testid="case.executions.tab.set-is-settlement-modal-open-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs" data-testid="case.executions.tab.button-31"
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
