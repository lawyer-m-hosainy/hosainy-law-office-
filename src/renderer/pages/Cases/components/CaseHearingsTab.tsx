import React, { useState, useEffect, useCallback } from 'react';
import {
  Gavel,
  Plus,
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Scale,
  Calculator,
  AlertCircle,
  HelpCircle,
  Clock3,
  Send
} from 'lucide-react';
import {
  CaseDetails,
  Hearing,
  CaseHearingStats,
  AppealDeadline,
  HearingStatus,
  OfficeSettings,
  CaseAnnouncement
} from '../../../../shared/types';
import { useHearings } from '../../../hooks/useHearings';
import { generateAdjournmentsReportHtml } from '../../../services/adjournmentsReportGenerator';

interface CaseHearingsTabProps {
  caseData: CaseDetails;
  settings: OfficeSettings;
  onCaseUpdated?: () => void;
}

export const CaseHearingsTab: React.FC<CaseHearingsTabProps> = ({
  caseData,
  settings,
  onCaseUpdated
}) => {
  const {
    getHearingsByCase,
    getHearingStatsByCase,
    createHearing,
    recordOutcome,
    updateHearing,
    deleteHearing,
    getAppealDeadlines,
    saveAppealDeadline,
    deleteAppealDeadline
  } = useHearings();

  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [stats, setStats] = useState<CaseHearingStats>({
    total_hearings: 0,
    postponement_count: 0
  });
  const [appealDeadlines, setAppealDeadlines] = useState<AppealDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configurable lists for adjournment reasons
  const [adjournmentReasons, setAdjournmentReasons] = useState<string[]>([]);
  const [caseAnnouncements, setCaseAnnouncements] = useState<CaseAnnouncement[]>([]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [selectedHearing, setSelectedHearing] = useState<Hearing | null>(null);

  // New hearing form state
  const [addForm, setAddForm] = useState({
    hearing_date: '',
    hearing_time: '',
    court_name: caseData.court_name || '',
    court_circuit: caseData.court_circuit || '',
    court_hall: '',
    roll_number: '',
    requests: '',
    notes: ''
  });

  // Outcome recording form state
  const [outcomeForm, setOutcomeForm] = useState({
    attended: 1,
    attended_by: settings.lawyer_name || '',
    proceedings: '',
    court_decision: '',
    adjournment_reason: '',
    adjournment_notes: '',
    next_hearing_date: '',
    status: 'مؤجلة' as HearingStatus,
    is_judgment_hearing: 0,
    judgment_date: '',
    judgment_text: ''
  });

  // Appeal Calculator state
  const [appealForm, setAppealForm] = useState({
    appeal_type: 'استئناف مدني',
    judgment_date: '',
    announcement_date: '',
    base_type: 'judgment', // 'judgment' or 'announcement'
    days_allowed: settings.appeal_deadline_civil || 40,
    is_appeal_filed: 0,
    appeal_case_number: '',
    notes: ''
  });
  const [calculatedDeadline, setCalculatedDeadline] = useState<{
    deadline_date: string;
    days_remaining: number;
    is_expired: boolean;
  } | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hList, hStats, aDeadlines, reasonsList, annList] = await Promise.all([
        getHearingsByCase(caseData.id),
        getHearingStatsByCase(caseData.id),
        getAppealDeadlines(caseData.id),
        window.electronAPI.getListItems('adjournment_reasons'),
        window.electronAPI.getAnnouncementsByCase(caseData.id)
      ]);

      setHearings(Array.isArray(hList) ? hList : []);
      if (hStats) setStats(hStats);
      setAppealDeadlines(Array.isArray(aDeadlines) ? aDeadlines : []);
      setAdjournmentReasons(Array.isArray(reasonsList) ? reasonsList.map(item => item.name) : []);
      setCaseAnnouncements(Array.isArray(annList) ? annList : []);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء تحميل بيانات الجلسات');
    } finally {
      setLoading(false);
    }
  }, [caseData.id, getHearingsByCase, getHearingStatsByCase, getAppealDeadlines]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute calculated deadline whenever appeal form changes
  useEffect(() => {
    const startDate = appealForm.base_type === 'announcement' && appealForm.announcement_date
      ? appealForm.announcement_date
      : appealForm.judgment_date;

    if (!startDate || !appealForm.days_allowed) {
      setCalculatedDeadline(null);
      return;
    }

    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      setCalculatedDeadline(null);
      return;
    }

    const target = new Date(start);
    target.setDate(target.getDate() + Number(appealForm.days_allowed));

    const deadlineStr = target.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const diffDays = Math.ceil((new Date(deadlineStr).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));

    setCalculatedDeadline({
      deadline_date: deadlineStr,
      days_remaining: diffDays,
      is_expired: diffDays < 0
    });
  }, [appealForm.base_type, appealForm.judgment_date, appealForm.announcement_date, appealForm.days_allowed]);

  // Handle Appeal Type select change
  const handleAppealTypeChange = (type: string) => {
    let days = 40;
    if (type === 'استئناف مدني') days = settings.appeal_deadline_civil || 40;
    else if (type === 'استئناف جنح') days = settings.appeal_deadline_misdemeanor || 10;
    else if (type === 'طعن بالنقض') days = settings.appeal_deadline_cassation || 60;
    else if (type === 'أمور مستعجلة') days = settings.appeal_deadline_urgent || 15;
    else if (type === 'استئناف أسرة') days = settings.appeal_deadline_family || 40;
    else if (type === 'استئناف قضاء إداري') days = settings.appeal_deadline_admin || 60;
    else if (type === 'معارضة جنح') days = 10;

    setAppealForm(prev => ({
      ...prev,
      appeal_type: type,
      days_allowed: days
    }));
  };

  // Save Appeal Deadline
  const handleSaveAppealDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calculatedDeadline || !appealForm.judgment_date) {
      alert('يرجى تحديد تاريخ الحكم وحساب الميعاد أولاً');
      return;
    }

    try {
      await saveAppealDeadline({
        case_id: caseData.id,
        judgment_date: appealForm.judgment_date,
        announcement_date: appealForm.announcement_date || null,
        appeal_type: appealForm.appeal_type,
        days_allowed: Number(appealForm.days_allowed),
        deadline_date: calculatedDeadline.deadline_date,
        is_appeal_filed: appealForm.is_appeal_filed,
        appeal_case_number: appealForm.appeal_case_number || null,
        notes: appealForm.notes || null
      });

      // Reload
      const updated = await getAppealDeadlines(caseData.id);
      setAppealDeadlines(updated);
      alert('تم حفظ ميعاد الطعن بنجاح ومتابعته في النظام');
    } catch (err: any) {
      alert(err?.message || 'فشل في حفظ ميعاد الطعن');
    }
  };

  const handleDeleteAppealDeadline = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الميعاد؟')) return;
    try {
      await deleteAppealDeadline(id);
      setAppealDeadlines(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err?.message || 'فشل في حذف الميعاد');
    }
  };

  const handleToggleAppealFiled = async (item: AppealDeadline) => {
    try {
      const newStatus = item.is_appeal_filed ? 0 : 1;
      let newCaseNum = item.appeal_case_number;
      if (newStatus === 1 && !newCaseNum) {
        const input = window.prompt('أدخل رقم وتاريخ صحيفة الطعن أو القضية الجديدة (اختياري):');
        if (input !== null) newCaseNum = input;
      }

      await saveAppealDeadline({
        id: item.id,
        case_id: item.case_id,
        judgment_date: item.judgment_date,
        announcement_date: item.announcement_date,
        appeal_type: item.appeal_type,
        days_allowed: item.days_allowed,
        deadline_date: item.deadline_date,
        is_appeal_filed: newStatus,
        appeal_case_number: newCaseNum,
        notes: item.notes
      });

      const updated = await getAppealDeadlines(caseData.id);
      setAppealDeadlines(updated);
    } catch (err: any) {
      alert(err?.message || 'فشل في تحديث حالة الطعن');
    }
  };

  // Open Record Outcome modal
  const handleOpenOutcomeModal = (hearing: Hearing) => {
    setSelectedHearing(hearing);
    setOutcomeForm({
      attended: hearing.attended ? 1 : 1,
      attended_by: hearing.attended_by || settings.lawyer_name || '',
      proceedings: hearing.proceedings || '',
      court_decision: hearing.court_decision || '',
      adjournment_reason: hearing.adjournment_reason || '',
      adjournment_notes: hearing.adjournment_notes || '',
      next_hearing_date: hearing.next_hearing_date || '',
      status: (hearing.status && hearing.status !== 'محددة' ? hearing.status : 'مؤجلة') as HearingStatus,
      is_judgment_hearing: hearing.is_judgment_hearing ? 1 : 0,
      judgment_date: hearing.judgment_date || '',
      judgment_text: hearing.judgment_text || ''
    });
    setShowOutcomeModal(true);
  };

  // Submit Record Outcome
  const handleSubmitOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHearing) return;
    if (!outcomeForm.court_decision.trim()) {
      alert('يرجى كتابة قرار المحكمة');
      return;
    }

    try {
      const res = await recordOutcome(selectedHearing.id, outcomeForm);
      if (res) {
        setShowOutcomeModal(false);
        await loadData();
        if (onCaseUpdated) onCaseUpdated();
        if (res.nextHearing) {
          alert(`تم حفظ النتيجة وتوليد الجلسة القادمة بنجاح بتاريخ ${res.nextHearing.hearing_date}`);
        } else {
          alert('تم حفظ نتيجة الجلسة بنجاح');
        }
      }
    } catch (err: any) {
      alert(err?.message || 'فشل في حفظ نتيجة الجلسة');
    }
  };

  // Submit Create New Hearing
  const handleCreateHearing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.hearing_date) {
      alert('يرجى تحديد تاريخ الجلسة');
      return;
    }

    try {
      const res = await createHearing({
        case_id: caseData.id,
        hearing_date: addForm.hearing_date,
        hearing_time: addForm.hearing_time || null,
        court_name: addForm.court_name || caseData.court_name,
        court_circuit: addForm.court_circuit || caseData.court_circuit || null,
        court_hall: addForm.court_hall || null,
        roll_number: addForm.roll_number ? parseInt(addForm.roll_number) : null,
        attended: 0,
        requests: addForm.requests || null,
        notes: addForm.notes || null,
        is_judgment_hearing: 0,
        status: 'محددة'
      });

      if (res) {
        setShowAddModal(false);
        setAddForm({
          hearing_date: '',
          hearing_time: '',
          court_name: caseData.court_name || '',
          court_circuit: caseData.court_circuit || '',
          court_hall: '',
          roll_number: '',
          requests: '',
          notes: ''
        });
        await loadData();
        if (onCaseUpdated) onCaseUpdated();
        alert('تمت إضافة الجلسة بنجاح');
      }
    } catch (err: any) {
      alert(err?.message || 'فشل في إضافة الجلسة');
    }
  };

  // Delete Hearing
  const handleDeleteHearing = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الجلسة؟')) return;
    try {
      await deleteHearing(id);
      await loadData();
      if (onCaseUpdated) onCaseUpdated();
    } catch (err: any) {
      alert(err?.message || 'فشل في حذف الجلسة');
    }
  };

  // Print Adjournments Timeline Report
  const handlePrintTimelineReport = async (action: 'preview' | 'print' | 'pdf') => {
    const htmlContent = generateAdjournmentsReportHtml(caseData, hearings, stats, settings);
    await window.electronAPI.executePrint({
      htmlContent,
      title: 'تقرير الجلسات',
      action,
      suggestedFileName: `تقرير_جلسات_${caseData.case_number}_${caseData.case_year}.pdf`
    });
  };

  const getStatusBadge = (status: HearingStatus, isJudgment: number) => {
    if (isJudgment === 1 || status === 'محجوزة للحكم') {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">⚖️ محجوزة للحكم</span>;
    }
    switch (status) {
      case 'محددة':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">محددة</span>;
      case 'تمت':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">تمت</span>;
      case 'مؤجلة':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">مؤجلة</span>;
      case 'صدر حكم':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 border border-green-200">صدر حكم</span>;
      case 'ملغاة':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">ملغاة</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">{status}</span>;
    }
  };

  if (loading && hearings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
        <Clock className="w-8 h-8 animate-spin mx-auto text-amber-600 mb-2" />
        جاري تحميل جلسات وإحصائيات القضية...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">إجمالي الجلسات</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.total_hearings}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.first_hearing_date ? `أول جلسة: ${stats.first_hearing_date}` : 'لا توجد جلسات بعد'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">عدد التأجيلات</span>
            <Clock3 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.postponement_count}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.total_hearings > 0 
              ? `${Math.round((stats.postponement_count / stats.total_hearings) * 100)}% من إجمالي الجلسات`
              : '-'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">أكثر سبب تأجيل تكراراً</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-sm font-bold text-slate-800 truncate" title={stats.most_frequent_reason || 'لا يوجد'}>
            {stats.most_frequent_reason || 'لا يوجد'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.most_frequent_reason_count ? `تكرر ${stats.most_frequent_reason_count} مرات` : 'لم تسجل تأجيلات'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">متوسط الفترة بين الجلسات</span>
            <Scale className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-700">{stats.avg_days_between_hearings || 0} <span className="text-xs font-normal text-slate-500">يوم</span></div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.last_hearing_date ? `آخر جلسة: ${stats.last_hearing_date}` : '-'}
          </div>
        </div>
      </div>

      {/* 2. Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Gavel className="w-5 h-5 text-amber-600" />
          <h3 className="text-base font-bold text-slate-800">
            الخط الزمني للجلسات والتأجيلات ({hearings.length})
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handlePrintTimelineReport('preview')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" data-testid="case.hearings.tab.handle-print-timeline-report"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            طباعة تقرير التأجيلات
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm" data-testid="case.hearings.tab.set-show-add-modal"
          >
            <Plus className="w-4 h-4" />
            إضافة جلسة جديدة
          </button>
        </div>
      </div>

      {/* 3. Visual Timeline of Hearings */}
      {hearings.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">لا توجد جلسات مسجلة لهذه القضية حتى الآن</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            اضغط على زر "إضافة جلسة جديدة" لتسجيل تاريخ ورقم رول أول جلسة للمتابعة.
          </p>
        </div>
      ) : (
        <div className="relative border-r-2 border-slate-200 mr-4 space-y-6">
          {hearings.map((h, idx) => {
            const isLatest = idx === 0;
            return (
              <div key={h.id} className="relative pr-6">
                {/* Timeline dot */}
                <div className={`absolute -right-[9px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                  h.is_judgment_hearing || h.status === 'محجوزة للحكم' 
                    ? 'bg-purple-600 ring-4 ring-purple-100' 
                    : isLatest 
                      ? 'bg-amber-600 ring-4 ring-amber-100' 
                      : 'bg-slate-400'
                }`} />

                {/* Hearing Card */}
                <div className={`bg-white rounded-xl border transition-all ${
                  isLatest ? 'border-amber-300 shadow-md ring-1 ring-amber-200' : 'border-slate-200 shadow-sm'
                } p-5 space-y-3`}>
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900">
                        جلسة {h.hearing_date}
                      </span>
                      {h.hearing_time && (
                        <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3" />
                          {h.hearing_time}
                        </span>
                      )}
                      {getStatusBadge(h.status, h.is_judgment_hearing)}
                      {(() => {
                        const pendingAnn = caseAnnouncements.find(
                          a => a.hearing_id === h.id && ['قيد الانتظار', 'لم يُعلن', 'ورد بدون نتيجة'].includes(a.status)
                        );
                        if (!pendingAnn) return null;
                        const daysThreshold = settings.announcement_warning_days ?? 3;
                        const today = new Date().toISOString().split('T')[0];
                        const diffDays = Math.ceil((new Date(h.hearing_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
                        const isNear = diffDays >= 0 && diffDays <= daysThreshold;
                        return (
                          <span
                            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-bold border ${
                              isNear
                                ? 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                            title={`إعلان معلق (${pendingAnn.announcement_type}) - ${pendingAnn.status}`}
                          >
                            <Send className="w-3 h-3" />
                            <span>إعلان معلق: {pendingAnn.status}</span>
                          </span>
                        );
                      })()}
                      {isLatest && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                          الجلسة الأحدث
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenOutcomeModal(h)}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors" data-testid="case.hearings.tab.handle-open-outcome-modal"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        {h.court_decision ? 'تعديل النتيجة' : 'تسجيل النتيجة'}
                      </button>

                      <button
                        onClick={() => handleDeleteHearing(h.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                        title="حذف الجلسة" data-testid="case.hearings.tab.handle-delete-hearing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Hall and Roll details */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <div>
                      <strong className="text-slate-700">المحكمة:</strong> {h.court_name} {h.court_circuit ? `(${h.court_circuit})` : ''}
                    </div>
                    {h.court_hall && (
                      <div>
                        <strong className="text-slate-700">القاعة:</strong> {h.court_hall}
                      </div>
                    )}
                    {h.roll_number && (
                      <div>
                        <strong className="text-slate-700">رقم الرول:</strong> {h.roll_number}
                      </div>
                    )}
                    <div>
                      <strong className="text-slate-700">الحضور:</strong>{' '}
                      {h.attended === 1 ? (
                        <span className="text-emerald-700 font-semibold">حضر {h.attended_by ? `(${h.attended_by})` : ''}</span>
                      ) : (
                        <span className="text-slate-400">لم يحضر بعد</span>
                      )}
                    </div>
                  </div>

                  {/* Proceedings / Decision section */}
                  {h.court_decision ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-slate-700 min-w-[70px]">قرار المحكمة:</span>
                        <span className="text-xs font-bold text-slate-900">{h.court_decision}</span>
                      </div>

                      {h.adjournment_reason && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 min-w-[70px]">سبب التأجيل:</span>
                          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                            {h.adjournment_reason}
                          </span>
                        </div>
                      )}

                      {h.proceedings && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-slate-500 min-w-[70px]">ما تم بالجلسة:</span>
                          <span className="text-xs text-slate-700">{h.proceedings}</span>
                        </div>
                      )}

                      {h.next_hearing_date && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                          <span className="text-xs font-bold text-indigo-700 min-w-[70px]">الجلسة القادمة:</span>
                          <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                            📅 {h.next_hearing_date}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center justify-between">
                      <span>لم يتم تسجيل قرار أو نتيجة هذه الجلسة بعد.</span>
                      <button
                        onClick={() => handleOpenOutcomeModal(h)}
                        className="text-amber-800 font-bold underline hover:text-amber-900" data-testid="case.hearings.tab.handle-open-outcome-modal-2"
                      >
                        سجل النتيجة الآن
                      </button>
                    </div>
                  )}

                  {/* Judgment Notice if reserved */}
                  {(h.is_judgment_hearing === 1 || h.status === 'محجوزة للحكم') && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-purple-700" />
                        حُجزت القضية للحكم {h.judgment_date ? `ليوم: ${h.judgment_date}` : ''}
                      </div>
                      {h.judgment_text && (
                        <div className="text-purple-800 mt-1 bg-white p-2 rounded border border-purple-100">
                          <strong>منطوق الحكم:</strong> {h.judgment_text}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Requests / Notes */}
                  {(h.requests || h.notes) && (
                    <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                      {h.requests && <div><strong>الطلبات:</strong> {h.requests}</div>}
                      {h.notes && <div><strong>ملاحظات:</strong> {h.notes}</div>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Legal Appeal Deadlines Calculator & Tracker */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-800">
              حاسبة ومتابعة مواعيد الطعن القانونية
            </h3>
          </div>
          <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-medium">
            تنبيه استرشادي وفق القواعد العامة
          </span>
        </div>

        {/* Disclaimer Warning Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <strong>تنبيه قانوني:</strong> الحساب الوارد في هذه الشاشة استرشادي وفق القواعد العامة المقررة بالمكتب وقابلة للتعديل من الإعدادات، وتقع مسؤولية التحقق النهائي من المواعيد الرسمية ومراعاة مواعيد المسافة والعطلات الرسمية على المحامي وفق وقائع كل دعوى.
          </div>
        </div>

        {/* Calculator Form */}
        <form onSubmit={handleSaveAppealDeadline} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نوع الطعن</label>
            <select
              value={appealForm.appeal_type}
              onChange={(e) => handleAppealTypeChange(e.target.value)}
              className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.hearings.tab.handle-appeal-type-change"
            >
              <option value="استئناف مدني">استئناف مدني ({settings.appeal_deadline_civil || 40} يوم)</option>
              <option value="استئناف جنح">استئناف جنح ({settings.appeal_deadline_misdemeanor || 10} أيام)</option>
              <option value="طعن بالنقض">طعن بالنقض ({settings.appeal_deadline_cassation || 60} يوم)</option>
              <option value="أمور مستعجلة">أمور مستعجلة ({settings.appeal_deadline_urgent || 15} يوم)</option>
              <option value="استئناف أسرة">استئناف أسرة ({settings.appeal_deadline_family || 40} يوم)</option>
              <option value="استئناف قضاء إداري">استئناف قضاء إداري ({settings.appeal_deadline_admin || 60} يوم)</option>
              <option value="معارضة جنح">معارضة جنح (10 أيام)</option>
              <option value="ميعاد مخصص">ميعاد مخصص (أيام مخصصة)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تاريخ صدور الحكم
            </label>
            <input
              type="date"
              value={appealForm.judgment_date}
              onChange={(e) => setAppealForm({ ...appealForm, judgment_date: e.target.value })}
              className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
              required data-testid="case.hearings.tab.set-appeal-form-2"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              يبدأ الحساب من
            </label>
            <select
              value={appealForm.base_type}
              onChange={(e) => setAppealForm({ ...appealForm, base_type: e.target.value })}
              className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.hearings.tab.set-appeal-form"
            >
              <option value="judgment">تاريخ النطق بالحكم</option>
              <option value="announcement">تاريخ الإعلان بالحكم</option>
            </select>
          </div>

          {appealForm.base_type === 'announcement' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الإعلان</label>
              <input
                type="date"
                value={appealForm.announcement_date}
                onChange={(e) => setAppealForm({ ...appealForm, announcement_date: e.target.value })}
                className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                required data-testid="case.hearings.tab.set-appeal-form-3"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عدد الأيام المسموحة</label>
              <input
                type="number"
                min="1"
                value={appealForm.days_allowed}
                onChange={(e) => setAppealForm({ ...appealForm, days_allowed: parseInt(e.target.value) || 0 })}
                className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.hearings.tab.set-appeal-form-4"
              />
            </div>
          )}

          {/* Result Preview Box */}
          {calculatedDeadline && (
            <div className="md:col-span-4 bg-white p-3 rounded border border-indigo-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-indigo-900">آخر موعد قانوني للطعن:</span>
                <span className="text-sm font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded border border-indigo-200">
                  📅 {calculatedDeadline.deadline_date}
                </span>

                {calculatedDeadline.is_expired ? (
                  <span className="text-xs font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded border border-red-200">
                    انتهى الميعاد منذ {Math.abs(calculatedDeadline.days_remaining)} يوم
                  </span>
                ) : (
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${
                    calculatedDeadline.days_remaining <= 5 
                      ? 'text-red-700 bg-red-100 border-red-200 animate-pulse' 
                      : calculatedDeadline.days_remaining <= 15
                        ? 'text-amber-800 bg-amber-100 border-amber-200'
                        : 'text-emerald-800 bg-emerald-100 border-emerald-200'
                  }`}>
                    متبقي {calculatedDeadline.days_remaining} يوم
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors" data-testid="case.hearings.tab.save"
              >
                حفظ الميعاد وتتبعه
              </button>
            </div>
          )}
        </form>

        {/* Saved Deadlines Table */}
        {appealDeadlines.length > 0 && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">نوع الطعن</th>
                  <th className="p-2.5">تاريخ الحكم</th>
                  <th className="p-2.5">آخر موعد للطعن</th>
                  <th className="p-2.5">المهلة المتبقية</th>
                  <th className="p-2.5">حالة التقرير بالطعن</th>
                  <th className="p-2.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appealDeadlines.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-800">{item.appeal_type}</td>
                    <td className="p-2.5">{item.judgment_date}</td>
                    <td className="p-2.5 font-extrabold text-indigo-900">{item.deadline_date}</td>
                    <td className="p-2.5">
                      {item.is_appeal_filed ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          تم الطعن
                        </span>
                      ) : item.is_expired ? (
                        <span className="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          انتهى الميعاد
                        </span>
                      ) : (
                        <span className={`font-bold px-2 py-0.5 rounded border ${
                          (item.days_remaining ?? 0) <= 5 
                            ? 'text-red-700 bg-red-50 border-red-200' 
                            : 'text-amber-800 bg-amber-50 border-amber-200'
                        }`}>
                          متبقي {item.days_remaining} يوم
                        </span>
                      )}
                    </td>
                    <td className="p-2.5">
                      <button
                        onClick={() => handleToggleAppealFiled(item)}
                        className={`text-[11px] px-2 py-0.5 rounded border font-semibold ${
                          item.is_appeal_filed 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`} data-testid="case.hearings.tab.handle-toggle-appeal-filed"
                      >
                        {item.is_appeal_filed ? `تم الطعن (${item.appeal_case_number || 'مسجل'})` : 'اضغط لتأكيد التقرير بالطعن'}
                      </button>
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => item.id && handleDeleteAppealDeadline(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="حذف الميعاد" data-testid="case.hearings.tab.handle-delete-appeal-deadline"
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

      {/* 5. Modal: Add New Hearing */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Gavel className="w-5 h-5 text-amber-600" />
                إضافة جلسة جديدة للقضية
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg" data-testid="case.hearings.tab.set-show-add-modal-2"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateHearing} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الجلسة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={addForm.hearing_date}
                    onChange={(e) => setAddForm({ ...addForm, hearing_date: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                    required data-testid="case.hearings.tab.set-add-form"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الوقت (اختياري)</label>
                  <input
                    type="time"
                    value={addForm.hearing_time}
                    onChange={(e) => setAddForm({ ...addForm, hearing_time: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.hearings.tab.set-add-form-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المحكمة</label>
                  <input
                    type="text"
                    value={addForm.court_name}
                    onChange={(e) => setAddForm({ ...addForm, court_name: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                    required data-testid="case.hearings.tab.set-add-form-3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الدائرة</label>
                  <input
                    type="text"
                    value={addForm.court_circuit}
                    onChange={(e) => setAddForm({ ...addForm, court_circuit: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.hearings.tab.set-add-form-4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">القاعة</label>
                  <input
                    type="text"
                    value={addForm.court_hall}
                    onChange={(e) => setAddForm({ ...addForm, court_hall: e.target.value })}
                    placeholder="مثلاً: قاعة 3"
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.hearings.tab.set-add-form-5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الرول</label>
                  <input
                    type="number"
                    value={addForm.roll_number}
                    onChange={(e) => setAddForm({ ...addForm, roll_number: e.target.value })}
                    placeholder="مثلاً: 14"
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.hearings.tab.set-add-form-6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الطلبات / المطلوب بالجلسة</label>
                <input
                  type="text"
                  value={addForm.requests}
                  onChange={(e) => setAddForm({ ...addForm, requests: e.target.value })}
                  placeholder="مثلاً: تقديم مذكرة دفاع وحافظة مستندات"
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.hearings.tab.set-add-form-7"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  rows={2}
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.hearings.tab.set-add-form-8"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg" data-testid="case.hearings.tab.set-show-add-modal-3"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm" data-testid="case.hearings.tab.add"
                >
                  إضافة الجلسة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Record Outcome & Auto Next Hearing */}
      {showOutcomeModal && selectedHearing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  تسجيل نتيجة وقرار جلسة {selectedHearing.hearing_date}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {selectedHearing.court_name} {selectedHearing.court_circuit ? `(${selectedHearing.court_circuit})` : ''}
                </div>
              </div>
              <button
                onClick={() => setShowOutcomeModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg" data-testid="case.hearings.tab.set-show-outcome-modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitOutcome} className="space-y-4">
              {/* Announcement Suggestion Alert if pending announcement exists for selected hearing */}
              {(() => {
                const pendingAnn = caseAnnouncements.find(
                  a => a.hearing_id === selectedHearing.id && ['قيد الانتظار', 'لم يُعلن', 'ورد بدون نتيجة'].includes(a.status)
                );
                if (!pendingAnn) return null;

                const suggestedReason = pendingAnn.status === 'لم يُعلن' || pendingAnn.status === 'ورد بدون نتيجة'
                  ? 'لإعادة الإعلان'
                  : 'للإعلان وورود الإشعار';

                return (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-2">
                    <div className="flex items-center gap-1.5 text-red-800 font-bold">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>يوجد إعلان قضائي معلق لهذه الجلسة ({pendingAnn.announcement_type} - {pendingAnn.recipient_name})</span>
                    </div>
                    <div className="text-slate-600 flex items-center justify-between">
                      <span>حالة الإعلان الحالية: <strong>{pendingAnn.status}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          setOutcomeForm(prev => ({
                            ...prev,
                            adjournment_reason: suggestedReason,
                            proceedings: prev.proceedings ? prev.proceedings : `طلب أجل ${suggestedReason} للمطلوب إعلانه ${pendingAnn.recipient_name}`
                          }));
                        }}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold shadow-xs transition-colors" data-testid="case.hearings.tab.set-outcome-form"
                      >
                        اقتراح سبب التأجيل "{suggestedReason}"
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Attendance */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حالة الحضور</label>
                  <select
                    value={outcomeForm.attended}
                    onChange={(e) => setOutcomeForm({ ...outcomeForm, attended: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white font-bold" data-testid="case.hearings.tab.set-outcome-form-2"
                  >
                    <option value={1}>✅ حضرت الجلسة</option>
                    <option value={0}>❌ لم أحضر</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">من حضر بالجلسة</label>
                  <input
                    type="text"
                    value={outcomeForm.attended_by}
                    onChange={(e) => setOutcomeForm({ ...outcomeForm, attended_by: e.target.value })}
                    placeholder="اسم المحامي أو المندوب"
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.hearings.tab.set-outcome-form-4"
                  />
                </div>
              </div>

              {/* Proceedings */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ما تم في الجلسة (الإجراء / المرافعة)</label>
                <textarea
                  value={outcomeForm.proceedings}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, proceedings: e.target.value })}
                  placeholder="مثلاً: حضرنا عن المدعي وقدمنا أصل الصحيفة معلنة، وطلب الحاضر عن المدعى عليه أجلاً للاطلاع..."
                  rows={2}
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.hearings.tab.set-outcome-form-5"
                />
              </div>

              {/* Court Decision (Required) */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  قرار المحكمة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={outcomeForm.court_decision}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, court_decision: e.target.value })}
                  placeholder="مثلاً: التأجيل لجلسة 2026/11/24 للاطلاع والمستندات"
                  className="w-full text-xs p-2 rounded border border-amber-300 bg-amber-50/50 font-bold text-slate-900"
                  required data-testid="case.hearings.tab.set-outcome-form-6"
                />
              </div>

              {/* Adjournment Reason from configurable list */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سبب التأجيل (اختر أو اكتب)</label>
                  <input
                    type="text"
                    list="adjournment-reasons-list"
                    value={outcomeForm.adjournment_reason}
                    onChange={(e) => setOutcomeForm({ ...outcomeForm, adjournment_reason: e.target.value })}
                    placeholder="اختر سبب التأجيل..."
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white" data-testid="case.hearings.tab.set-outcome-form-7"
                  />
                  <datalist id="adjournment-reasons-list">
                    {adjournmentReasons.map((r, i) => (
                      <option key={i} value={r} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حالة الجلسة</label>
                  <select
                    value={outcomeForm.status}
                    onChange={(e) => setOutcomeForm({ ...outcomeForm, status: e.target.value as HearingStatus })}
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white font-bold" data-testid="case.hearings.tab.set-outcome-form-3"
                  >
                    <option value="مؤجلة">مؤجلة</option>
                    <option value="محجوزة للحكم">محجوزة للحكم</option>
                    <option value="صدر حكم">صدر حكم</option>
                    <option value="تمت">تمت</option>
                    <option value="ملغاة">ملغاة</option>
                  </select>
                </div>
              </div>

              {/* Reserved for Judgment Section */}
              <div className="bg-purple-50 p-3.5 rounded-lg border border-purple-200 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outcomeForm.is_judgment_hearing === 1 || outcomeForm.status === 'محجوزة للحكم'}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setOutcomeForm({
                        ...outcomeForm,
                        is_judgment_hearing: checked ? 1 : 0,
                        status: checked ? 'محجوزة للحكم' : outcomeForm.status
                      });
                    }}
                    className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4" data-testid="case.hearings.tab.set-outcome-form-8"
                  />
                  <span className="text-xs font-bold text-purple-900">
                    ⚖️ حجز القضية للحكم (تفعيل تنبيه الحكم المعلق)
                  </span>
                </label>

                {(outcomeForm.is_judgment_hearing === 1 || outcomeForm.status === 'محجوزة للحكم') && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-purple-200">
                    <div>
                      <label className="block text-xs font-bold text-purple-900 mb-1">
                        تاريخ النطق بالحكم
                      </label>
                      <input
                        type="date"
                        value={outcomeForm.judgment_date}
                        onChange={(e) => setOutcomeForm({ ...outcomeForm, judgment_date: e.target.value })}
                        className="w-full text-xs p-2 rounded border border-purple-300 bg-white" data-testid="case.hearings.tab.set-outcome-form-9"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-purple-900 mb-1">
                        منطوق الحكم (لو صدر)
                      </label>
                      <input
                        type="text"
                        value={outcomeForm.judgment_text}
                        onChange={(e) => setOutcomeForm({ ...outcomeForm, judgment_text: e.target.value })}
                        placeholder="منطوق الحكم الصادر..."
                        className="w-full text-xs p-2 rounded border border-purple-300 bg-white" data-testid="case.hearings.tab.set-outcome-form-10"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Next Hearing Date Auto-generation */}
              <div className="bg-indigo-50/60 p-3.5 rounded-lg border border-indigo-200 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  الجلسة القادمة (توليد تلقائي للجلسة بالجدول)
                </div>
                <input
                  type="date"
                  value={outcomeForm.next_hearing_date}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, next_hearing_date: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-indigo-300 bg-white font-bold text-indigo-900" data-testid="case.hearings.tab.set-outcome-form-11"
                />
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  💡 بمجرد تحديد تاريخ الجلسة القادمة، سيقوم النظام تلقائيًا بإنشاء الجلسة التالية في رول القضية ورول المحكمة مع نسخ بيانات المحكمة والدائرة والمطلوب.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOutcomeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg" data-testid="case.hearings.tab.set-show-outcome-modal-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-lg shadow-sm" data-testid="case.hearings.tab.save-2"
                >
                  حفظ نتيجة الجلسة وتحديث القضية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
