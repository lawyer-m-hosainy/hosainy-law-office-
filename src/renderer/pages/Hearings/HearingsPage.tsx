import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Gavel,
  Printer,
  Calendar,
  Clock,
  Filter,
  Search,
  CheckCircle2,
  FileDown,
  Eye,
  RefreshCw,
  Building,
  Scale,
  AlertCircle,
  ExternalLink,
  Send,
  AlertTriangle
} from 'lucide-react';
import {
  ConfigurableListItem,
  HearingStatus,
  HearingWithCase,
  OfficeSettings,
  CaseAnnouncement
} from '../../../shared/types';
import { useHearings } from '../../hooks/useHearings';
import { entityEventBus } from '../../services/eventBus';
import { generateHearingRollHtml } from '../../services/hearingRollReportGenerator';
import { ExportButton } from '../../components/Common/ExportButton';

interface HearingsPageProps {
  courts: ConfigurableListItem[];
  settings: OfficeSettings | null;
  onNavigateToCase: (caseId: number) => void;
}

type QuickDateFilter = 'today' | 'tomorrow' | 'this_week' | 'specific' | 'range' | 'all';

export const HearingsPage: React.FC<HearingsPageProps> = ({
  courts,
  settings,
  onNavigateToCase
}) => {
  const { getHearingRoll, recordOutcome } = useHearings();

  // Filter States
  const [dateFilterType, setDateFilterType] = useState<QuickDateFilter>('today');
  const [specificDate, setSpecificDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCourt, setSelectedCourt] = useState<string>('الكل');
  const [courtCircuitQuery, setCourtCircuitQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('الكل');

  // Adjournment reasons for modal
  const [adjournmentReasons, setAdjournmentReasons] = useState<string[]>([]);
  const [announcements, setAnnouncements] = useState<CaseAnnouncement[]>([]);

  // Roll Data & Loading
  const [hearings, setHearings] = useState<HearingWithCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Outcome Modal State
  const [showOutcomeModal, setShowOutcomeModal] = useState<boolean>(false);
  const [selectedHearing, setSelectedHearing] = useState<HearingWithCase | null>(null);
  const [outcomeForm, setOutcomeForm] = useState({
    attended: 1,
    attended_by: settings?.lawyer_name || '',
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

  // Calculate Dates for Quick Filters
  const getDateRange = useCallback(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (dateFilterType === 'today') {
      return { date: todayStr };
    } else if (dateFilterType === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { date: tomorrow.toISOString().split('T')[0] };
    } else if (dateFilterType === 'this_week') {
      const start = new Date(today);
      const day = start.getDay(); // 0 is Sunday, 6 is Saturday
      // Egyptian week starting Saturday:
      const diffToSaturday = (day + 1) % 7;
      start.setDate(start.getDate() - diffToSaturday);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    } else if (dateFilterType === 'specific') {
      return { date: specificDate };
    } else if (dateFilterType === 'range') {
      return { startDate, endDate };
    } else {
      return {}; // All
    }
  }, [dateFilterType, specificDate, startDate, endDate]);

  // Load Hearing Roll
  const loadRoll = useCallback(async () => {
    setLoading(true);
    try {
      const dates = getDateRange();
      const roll = await getHearingRoll({
        ...dates,
        court_name: selectedCourt,
        court_circuit: courtCircuitQuery,
        status: selectedStatus
      });
      setHearings(roll);

      // Load pending announcements
      try {
        const anns = await window.electronAPI.getAllAnnouncements({ status: 'pending_only' });
        setAnnouncements(anns);
      } catch (err) {
        console.error('Error loading announcements for roll:', err);
      }
    } catch (err) {
      console.error('Error loading roll:', err);
    } finally {
      setLoading(false);
    }
  }, [getHearingRoll, getDateRange, selectedCourt, courtCircuitQuery, selectedStatus]);

  useEffect(() => {
    loadRoll();
  }, [loadRoll]);

  // Subscribe to hearings updates from elsewhere
  useEffect(() => {
    const unsubH = entityEventBus.subscribe('hearings', () => {
      loadRoll();
    });
    const unsubA = entityEventBus.subscribe('announcements', () => {
      loadRoll();
    });
    return () => {
      unsubH();
      unsubA();
    };
  }, [loadRoll]);

  // Load adjournment reasons list for modal & subscribe to settings updates
  useEffect(() => {
    const loadReasons = () => {
      window.electronAPI.getListItems('adjournment_reasons').then(items => {
        setAdjournmentReasons(items.map(i => i.name));
      }).catch(console.error);
    };
    loadReasons();
    return entityEventBus.subscribe('settings', loadReasons);
  }, []);

  // Filter summary description text
  const filterSummaryText = useMemo(() => {
    const parts: string[] = [];
    if (dateFilterType === 'today') parts.push(`جلسات اليوم (${new Date().toLocaleDateString('ar-EG')})`);
    else if (dateFilterType === 'tomorrow') parts.push('جلسات الغد');
    else if (dateFilterType === 'this_week') parts.push('جلسات الأسبوع الجاري');
    else if (dateFilterType === 'specific') parts.push(`جلسات يوم ${specificDate}`);
    else if (dateFilterType === 'range') parts.push(`الفترة من ${startDate || 'البداية'} إلى ${endDate || 'النهاية'}`);
    else parts.push('كافة الجلسات المسجلة');

    if (selectedCourt !== 'الكل') parts.push(`محكمة: ${selectedCourt}`);
    if (courtCircuitQuery.trim()) parts.push(`دائرة: ${courtCircuitQuery}`);
    if (selectedStatus !== 'الكل') parts.push(`حالة: ${selectedStatus}`);

    return parts.join(' | ');
  }, [dateFilterType, specificDate, startDate, endDate, selectedCourt, courtCircuitQuery, selectedStatus]);

  // Print Handling (Preview / Print / PDF)
  const handlePrintRoll = async (action: 'preview' | 'print' | 'pdf') => {
    if (!settings) return;
    const htmlContent = generateHearingRollHtml(hearings, settings, {
      title: 'رول الجلسات القضائية',
      filterSummary: filterSummaryText,
      orientation: 'landscape'
    });

    const dateTag = dateFilterType === 'today' ? 'اليوم' : specificDate || 'رول';
    await window.electronAPI.executePrint({
      htmlContent,
      title: 'رول الجلسات القضائية',
      action,
      suggestedFileName: `رول_الجلسات_${dateTag}.pdf`
    });
  };

  // Open Outcome Recording
  const handleOpenOutcome = (h: HearingWithCase) => {
    setSelectedHearing(h);
    setOutcomeForm({
      attended: h.attended ? 1 : 1,
      attended_by: h.attended_by || settings?.lawyer_name || '',
      proceedings: h.proceedings || '',
      court_decision: h.court_decision || '',
      adjournment_reason: h.adjournment_reason || '',
      adjournment_notes: h.adjournment_notes || '',
      next_hearing_date: h.next_hearing_date || '',
      status: (h.status && h.status !== 'محددة' ? h.status : 'مؤجلة') as HearingStatus,
      is_judgment_hearing: h.is_judgment_hearing ? 1 : 0,
      judgment_date: h.judgment_date || '',
      judgment_text: h.judgment_text || ''
    });
    setShowOutcomeModal(true);
  };

  // Submit Outcome Recording
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
        await loadRoll();
        if (res.nextHearing) {
          alert(`تم حفظ نتيجة الجلسة وتوليد الجلسة القادمة بنجاح بتاريخ ${res.nextHearing.hearing_date}`);
        } else {
          alert('تم حفظ نتيجة الجلسة بنجاح');
        }
      }
    } catch (err: any) {
      alert(err?.message || 'فشل في حفظ نتيجة الجلسة');
    }
  };

  const getStatusBadge = (status: HearingStatus, isJudgment: number) => {
    if (isJudgment === 1 || status === 'محجوزة للحكم') {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">⚖️ محجوزة للحكم</span>;
    }
    switch (status) {
      case 'محددة':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">محددة</span>;
      case 'تمت':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">تمت</span>;
      case 'مؤجلة':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">مؤجلة</span>;
      case 'صدر حكم':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800 border border-green-200">صدر حكم</span>;
      case 'ملغاة':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">ملغاة</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* 1. Header with Title & Print Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Gavel className="w-6 h-6 text-amber-600" />
            رول الجلسات القضائية
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة ومتابعة وطباعة رول جلسات المحاكم لليوم أو لأي فترة ومحكمة محددة مع تسجيل النتائج فورًا
          </p>
        </div>

        {/* Print Toolbar */}
        <div className="flex items-center gap-2">
          <ExportButton
            fileName="رول_الجلسات"
            title="رول الجلسات القضائية"
            headers={['م', 'التاريخ', 'المحكمة', 'الدائرة', 'القاعة', 'الرول', 'رقم القضية', 'السنة', 'الموكل', 'الخصم', 'الصفة', 'قرار المحكمة / سبب التأجيل', 'الحالة']}
            rows={hearings.map((h, idx) => [
              idx + 1,
              h.hearing_date,
              h.court_name,
              h.court_circuit || '-',
              h.court_hall || '-',
              h.roll_number || '-',
              h.case_number,
              h.case_year,
              h.primary_client_name || '-',
              h.opponent_name || '-',
              h.client_role || '-',
              h.court_decision || h.adjournment_reason || '-',
              h.status,
            ])}
            buttonLabel="تصدير الرول"
          />

          <button
            onClick={() => handlePrintRoll('preview')}
            disabled={hearings.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4 text-slate-600" />
            معاينة الرول
          </button>

          <button
            onClick={() => handlePrintRoll('print')}
            disabled={hearings.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            طباعة الرول
          </button>

          <button
            onClick={() => handlePrintRoll('pdf')}
            disabled={hearings.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 rounded-lg transition-colors border border-amber-300"
          >
            <FileDown className="w-4 h-4 text-amber-700" />
            حفظ PDF
          </button>

          <button
            onClick={loadRoll}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        {/* Quick Date Buttons */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-600 ml-2">الموعد:</span>
          {[
            { id: 'today', label: 'اليوم' },
            { id: 'tomorrow', label: 'غدًا' },
            { id: 'this_week', label: 'هذا الأسبوع' },
            { id: 'specific', label: 'تاريخ محدد' },
            { id: 'range', label: 'فترة مخصصة' },
            { id: 'all', label: 'كافة الجلسات' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setDateFilterType(btn.id as QuickDateFilter)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                dateFilterType === btn.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}

          {/* Conditional Date Pickers */}
          {dateFilterType === 'specific' && (
            <div className="flex items-center gap-2 mr-2">
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="text-xs p-1.5 rounded border border-slate-300 bg-white"
              />
            </div>
          )}

          {dateFilterType === 'range' && (
            <div className="flex items-center gap-2 mr-2">
              <span className="text-xs text-slate-500">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs p-1.5 rounded border border-slate-300 bg-white"
              />
              <span className="text-xs text-slate-500">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs p-1.5 rounded border border-slate-300 bg-white"
              />
            </div>
          )}
        </div>

        {/* Secondary Filters: Court, Circuit, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">المحكمة</label>
            <select
              value={selectedCourt}
              onChange={(e) => setSelectedCourt(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="الكل">كافة المحاكم</option>
              {courts.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الدائرة القضائية</label>
            <input
              type="text"
              value={courtCircuitQuery}
              onChange={(e) => setCourtCircuitQuery(e.target.value)}
              placeholder="بحث بالدائرة..."
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">حالة الجلسة</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="الكل">كافة الحالات</option>
              <option value="محددة">محددة</option>
              <option value="مؤجلة">مؤجلة</option>
              <option value="محجوزة للحكم">محجوزة للحكم</option>
              <option value="تمت">تمت</option>
              <option value="صدر حكم">صدر حكم</option>
              <option value="ملغاة">ملغاة</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Summary Pill Banner */}
      <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200 px-4 py-2.5 rounded-xl text-xs text-amber-900">
        <div className="font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-700" />
          <span>{filterSummaryText}</span>
        </div>
        <div className="font-bold">
          عدد الجلسات بالرول: <span className="text-amber-700 text-sm">{hearings.length}</span>
        </div>
      </div>

      {/* 4. Roll Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Clock className="w-8 h-8 animate-spin mx-auto text-amber-600 mb-2" />
            جاري تحميل رول الجلسات...
          </div>
        ) : hearings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Gavel className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">لا توجد جلسات تطابق خيارات التصفية</h4>
            <p className="text-xs text-slate-400">
              قم بتعديل التاريخ أو اختيار "كافة الجلسات" لاستعراض الجلسات المسجلة.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-slate-800 text-white font-bold border-b border-slate-700">
                <tr>
                  <th className="p-3 w-12 text-center">م</th>
                  <th className="p-3 w-28 text-center">التاريخ / الرول</th>
                  <th className="p-3">رقم القضية والدائرة</th>
                  <th className="p-3">الموكل</th>
                  <th className="p-3">الخصم</th>
                  <th className="p-3">الجلسة السابقة والقرار</th>
                  <th className="p-3">المطلوب</th>
                  <th className="p-3 w-28 text-center">الحالة</th>
                  <th className="p-3 w-28 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hearings.map((h, idx) => (
                  <tr key={h.id} className="hover:bg-amber-50/40 transition-colors">
                    {/* Index */}
                    <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>

                    {/* Date / Hall / Roll */}
                    <td className="p-3 text-center">
                      <div className="font-bold text-slate-900">{h.hearing_date}</div>
                      {h.roll_number && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-bold border border-slate-200">
                          رول {h.roll_number}
                        </span>
                      )}
                      {h.court_hall && (
                        <div className="text-[10px] text-slate-500 mt-0.5">قاعة {h.court_hall}</div>
                      )}
                      {(() => {
                        const pendingAnn = announcements.find(
                          a => a.hearing_id === h.id || (a.case_id === h.case_id && a.hearing_id === null)
                        );
                        if (!pendingAnn) return null;
                        const daysThreshold = settings?.announcement_warning_days ?? 3;
                        const today = new Date().toISOString().split('T')[0];
                        const diffDays = Math.ceil((new Date(h.hearing_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
                        const isNear = diffDays >= 0 && diffDays <= daysThreshold;
                        return (
                          <div
                            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold border mt-1 ${
                              isNear
                                ? 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                            title={`إعلان معلق (${pendingAnn.announcement_type}) للمطلوب إعلانه: ${pendingAnn.recipient_name}`}
                          >
                            <Send className="w-2.5 h-2.5" />
                            <span>إعلان: {pendingAnn.status}</span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Case Number & Court */}
                    <td className="p-3">
                      <button
                        onClick={() => onNavigateToCase(h.case_id)}
                        className="text-amber-700 hover:text-amber-800 font-extrabold text-sm flex items-center gap-1 group"
                        title="انتقل إلى ملف القضية"
                      >
                        {h.case_number} لسنة {h.case_year}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <div className="text-[11px] font-semibold text-slate-700 mt-0.5">
                        {h.court_name} {h.court_circuit ? `— ${h.court_circuit}` : ''}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{h.subject}</div>
                    </td>

                    {/* Client */}
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{h.primary_client_name || '-'}</div>
                      {h.primary_client_role && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {h.primary_client_role}
                        </span>
                      )}
                    </td>

                    {/* Opponent */}
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{h.primary_opponent_name || '-'}</div>
                      {h.primary_opponent_role && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {h.primary_opponent_role}
                        </span>
                      )}
                    </td>

                    {/* Previous Hearing & Decision */}
                    <td className="p-3">
                      {h.previous_hearing_date ? (
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-bold text-slate-700">📅 {h.previous_hearing_date}</div>
                          {h.previous_decision && (
                            <div className="text-[11px] text-slate-600 line-clamp-2">{h.previous_decision}</div>
                          )}
                          {h.previous_adjournment_reason && (
                            <span className="inline-block text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                              {h.previous_adjournment_reason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">أول جلسة</span>
                      )}
                    </td>

                    {/* Required Actions */}
                    <td className="p-3 text-slate-600">
                      {h.requests || (h.notes ? h.notes : '-')}
                    </td>

                    {/* Status Badge */}
                    <td className="p-3 text-center">
                      {getStatusBadge(h.status, h.is_judgment_hearing)}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenOutcome(h)}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors shadow-sm"
                      >
                        {h.court_decision ? 'تعديل' : 'تسجيل'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Record Outcome Modal */}
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
                  قضية رقم {selectedHearing.case_number} لسنة {selectedHearing.case_year} — {selectedHearing.court_name}
                </div>
              </div>
              <button
                onClick={() => setShowOutcomeModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitOutcome} className="space-y-4">
              {/* Suggestion for pending announcement */}
              {(() => {
                const pendingAnn = announcements.find(
                  a => a.hearing_id === selectedHearing.id || (a.case_id === selectedHearing.case_id && a.hearing_id === null)
                );
                if (!pendingAnn) return null;
                const suggestedReason = pendingAnn.status === 'لم يُعلن' || pendingAnn.status === 'ورد بدون نتيجة'
                  ? 'لإعادة الإعلان'
                  : 'للإعلان وورود الإشعار';

                return (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-2">
                    <div className="flex items-center gap-1.5 text-red-800 font-bold">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>يوجد إعلان معلق مرتبط ({pendingAnn.announcement_type} - {pendingAnn.recipient_name})</span>
                    </div>
                    <div className="text-slate-600 flex items-center justify-between">
                      <span>حالة الإعلان: <strong>{pendingAnn.status}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          setOutcomeForm(prev => ({
                            ...prev,
                            adjournment_reason: suggestedReason,
                            proceedings: prev.proceedings ? prev.proceedings : `طلب أجل ${suggestedReason} للمطلوب إعلانه ${pendingAnn.recipient_name}`
                          }));
                        }}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold shadow-xs transition-colors"
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
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white font-bold"
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
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                  />
                </div>
              </div>

              {/* Proceedings */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ما تم في الجلسة (الإجراء / المرافعة)</label>
                <textarea
                  value={outcomeForm.proceedings}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, proceedings: e.target.value })}
                  placeholder="مثلاً: حضرنا عن المدعي وقدمنا أصل الصحيفة معلنة..."
                  rows={2}
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
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
                  placeholder="مثلاً: التأجيل لجلسة 2026/11/24 لتقديم المذكرات والمستندات"
                  className="w-full text-xs p-2 rounded border border-amber-300 bg-amber-50/50 font-bold text-slate-900"
                  required
                />
              </div>

              {/* Adjournment Reason from configurable list */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سبب التأجيل (اختر أو اكتب)</label>
                  <input
                    type="text"
                    list="roll-adjournment-reasons"
                    value={outcomeForm.adjournment_reason}
                    onChange={(e) => setOutcomeForm({ ...outcomeForm, adjournment_reason: e.target.value })}
                    placeholder="اختر سبب التأجيل..."
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                  />
                  <datalist id="roll-adjournment-reasons">
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
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white font-bold"
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
                    className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
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
                        className="w-full text-xs p-2 rounded border border-purple-300 bg-white"
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
                        className="w-full text-xs p-2 rounded border border-purple-300 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Next Hearing Date Auto-generation */}
              <div className="bg-indigo-50/60 p-3.5 rounded-lg border border-indigo-200 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  الجلسة القادمة (توليد تلقائي للجلسة التالية بالرول)
                </div>
                <input
                  type="date"
                  value={outcomeForm.next_hearing_date}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, next_hearing_date: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-indigo-300 bg-white font-bold text-indigo-900"
                />
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  💡 سيقوم النظام تلقائيًا بإنشاء الجلسة القادمة في رول القضية ورول المحكمة بمجرد الحفظ.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOutcomeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-lg shadow-sm"
                >
                  حفظ نتيجة الجلسة وتحديث الرول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
