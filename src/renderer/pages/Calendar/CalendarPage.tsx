import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Gavel,
  Clock,
  Building,
  Scale,
  ExternalLink,
  Eye,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy
} from 'lucide-react';
import { HearingWithCase, OfficeSettings } from '../../../shared/types';
import { useHearings } from '../../hooks/useHearings';
import { entityEventBus } from '../../services/eventBus';
import { CalendarExportModal } from './CalendarExportModal';

interface CalendarPageProps {
  settings: OfficeSettings | null;
  onNavigateToCase: (caseId: number) => void;
}

type CalendarViewMode = 'month' | 'week' | 'day';

const ARABIC_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const CalendarPage: React.FC<CalendarPageProps> = ({
  settings,
  onNavigateToCase
}) => {
  const { getHearingRoll } = useHearings();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [hearings, setHearings] = useState<HearingWithCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedHearing, setSelectedHearing] = useState<HearingWithCase | null>(null);

  // Selected day for day view
  const [selectedDayDate, setSelectedDayDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Calendar Export Modal & Today Summary
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [todaySummaryCopied, setTodaySummaryCopied] = useState<boolean>(false);

  const handleCopyTodaySummary = async () => {
    try {
      const summaryText = await window.electronAPI.getTodaySummary();
      await navigator.clipboard.writeText(summaryText);
      setTodaySummaryCopied(true);
      setTimeout(() => setTodaySummaryCopied(false), 3000);
    } catch (err: any) {
      alert(`تعذر نسخ ملخص اليوم: ${err?.message}`);
    }
  };

  // Compute start and end dates for current calendar month
  const { startPeriodStr, endPeriodStr } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Start of calendar display (a week before month start to cover full grid)
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const start = new Date(firstDayOfMonth);
    start.setDate(start.getDate() - 7);

    const end = new Date(lastDayOfMonth);
    end.setDate(end.getDate() + 7);

    return {
      startPeriodStr: start.toISOString().split('T')[0],
      endPeriodStr: end.toISOString().split('T')[0]
    };
  }, [currentDate]);

  // Load hearings for the range
  const loadHearings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHearingRoll({
        startDate: startPeriodStr,
        endDate: endPeriodStr
      });
      setHearings(data);
    } catch (err) {
      console.error('Failed to load hearings for calendar:', err);
    } finally {
      setLoading(false);
    }
  }, [getHearingRoll, startPeriodStr, endPeriodStr]);

  useEffect(() => {
    loadHearings();
  }, [loadHearings]);

  // Subscribe to hearings updates from elsewhere
  useEffect(() => {
    return entityEventBus.subscribe('hearings', () => {
      loadHearings();
    });
  }, [loadHearings]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      });
    } else {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 1);
        setSelectedDayDate(d.toISOString().split('T')[0]);
        return d;
      });
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      });
    } else {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 1);
        setSelectedDayDate(d.toISOString().split('T')[0]);
        return d;
      });
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDayDate(today.toISOString().split('T')[0]);
  };

  // Month grid calculation (Saturday to Friday)
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Day of week: 0=Sun, 1=Mon, ..., 6=Sat
    // We want Saturday to be index 0
    // formula: (day + 1) % 7 gives Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
    const startDayIndex = (firstDay.getDay() + 1) % 7;
    const totalDays = lastDay.getDate();

    const days: {
      date: Date;
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const dStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateStr: dStr,
        dayNum: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: dStr === new Date().toISOString().split('T')[0]
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateStr: dStr,
        dayNum: i,
        isCurrentMonth: true,
        isToday: dStr === new Date().toISOString().split('T')[0]
      });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateStr: dStr,
        dayNum: i,
        isCurrentMonth: false,
        isToday: dStr === new Date().toISOString().split('T')[0]
      });
    }

    return days;
  }, [currentDate]);

  // Week days calculation (Saturday to Friday)
  const weekDays = useMemo(() => {
    const base = new Date(currentDate);
    const day = (base.getDay() + 1) % 7; // Sat is 0
    const startOfWeek = new Date(base);
    startOfWeek.setDate(base.getDate() - day);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateStr: dStr,
        dayName: ARABIC_DAYS[i],
        dayNum: d.getDate(),
        isToday: dStr === new Date().toISOString().split('T')[0]
      });
    }
    return days;
  }, [currentDate]);

  // Group hearings by date string
  const hearingsByDate = useMemo(() => {
    const map: Record<string, HearingWithCase[]> = {};
    for (const h of hearings) {
      if (!map[h.hearing_date]) {
        map[h.hearing_date] = [];
      }
      map[h.hearing_date].push(h);
    }
    return map;
  }, [hearings]);

  // Hearings for current day view
  const dayHearings = useMemo(() => {
    return hearingsByDate[selectedDayDate] || [];
  }, [hearingsByDate, selectedDayDate]);

  return (
    <div className="p-6 space-y-5">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-600" />
            التقويم القضائي والمواعيد
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            جدول زمني متكامل لجلسات المحاكم والأحكام المعلقة بروابط فورية لملف القضية
          </p>
        </div>

        {/* View Switcher & Month Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'month' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              عرض شهري
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'week' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              عرض أسبوعي
            </button>
            <button
              onClick={() => {
                setViewMode('day');
                setSelectedDayDate(currentDate.toISOString().split('T')[0]);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'day' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              عرض يومي
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              onClick={handlePrev}
              className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
              title="السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
            >
              اليوم
            </button>

            <button
              onClick={handleNext}
              className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
              title="التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm font-extrabold text-slate-800 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
            {ARABIC_MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>

          {/* Export and Today's Summary Actions */}
          <div className="flex items-center gap-2 mr-auto sm:mr-0">
            <button
              onClick={handleCopyTodaySummary}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                todaySummaryCopied
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="نسخ نص مختصر بجدول جلسات ومهام اليوم بوضع الخصوصية للحافظة"
            >
              {todaySummaryCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
              <span>{todaySummaryCopied ? 'تم نسخ ملخص اليوم!' : 'ملخص اليوم'}</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              title="تصدير ملف .ics متوافق مع كافة برامج التقويم أوفلاين"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير التقويم (.ics)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Calendar Views */}

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Day of Week Header */}
          <div className="grid grid-cols-7 bg-slate-800 text-white text-xs font-bold text-center border-b border-slate-700">
            {ARABIC_DAYS.map((dayName, idx) => (
              <div key={idx} className="py-2.5 border-r border-slate-700 last:border-r-0">
                {dayName}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 border-collapse">
            {monthDays.map((day, idx) => {
              const dayItems = hearingsByDate[day.dateStr] || [];
              const isToday = day.isToday;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDayDate(day.dateStr);
                    if (dayItems.length > 0) {
                      setViewMode('day');
                    }
                  }}
                  className={`min-h-[110px] p-2 border-b border-r border-slate-100 flex flex-col justify-between transition-colors ${
                    !day.isCurrentMonth
                      ? 'bg-slate-50/60 text-slate-400'
                      : isToday
                        ? 'bg-amber-50/50'
                        : 'bg-white hover:bg-slate-50/50'
                  } cursor-pointer`}
                >
                  {/* Date number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-extrabold px-1.5 py-0.5 rounded ${
                        isToday
                          ? 'bg-amber-600 text-white'
                          : day.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                      }`}
                    >
                      {day.dayNum}
                    </span>

                    {dayItems.length > 0 && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-full">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  {/* Hearing Chips */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px]">
                    {dayItems.slice(0, 3).map((h) => {
                      const isJudgment = h.is_judgment_hearing === 1 || h.status === 'محجوزة للحكم';
                      return (
                        <div
                          key={h.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHearing(h);
                          }}
                          className={`text-[10px] p-1 rounded font-semibold truncate border transition-transform hover:scale-[1.02] ${
                            isJudgment
                              ? 'bg-purple-100 text-purple-900 border-purple-200'
                              : h.status === 'مؤجلة'
                                ? 'bg-amber-100 text-amber-900 border-amber-200'
                                : 'bg-blue-100 text-blue-900 border-blue-200'
                          }`}
                          title={`${h.case_number}/${h.case_year} - ${h.court_name}`}
                        >
                          <span className="font-bold">{h.case_number}</span> ({h.court_name})
                        </div>
                      );
                    })}

                    {dayItems.length > 3 && (
                      <div className="text-[10px] text-slate-500 font-bold text-center">
                        +{dayItems.length - 3} جلسات أخرى
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-800 text-white text-xs font-bold text-center border-b border-slate-700">
            {weekDays.map((w, idx) => (
              <div key={idx} className={`py-3 border-r border-slate-700 last:border-r-0 ${w.isToday ? 'bg-amber-600' : ''}`}>
                <div>{w.dayName}</div>
                <div className="text-[11px] opacity-90">{w.dayNum} {ARABIC_MONTHS[w.date.getMonth()]}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 min-h-[400px] divide-x divide-x-reverse divide-slate-100">
            {weekDays.map((w, idx) => {
              const items = hearingsByDate[w.dateStr] || [];
              return (
                <div key={idx} className={`p-2 space-y-2 ${w.isToday ? 'bg-amber-50/30' : ''}`}>
                  {items.length === 0 ? (
                    <div className="text-center text-[11px] text-slate-400 mt-6">لا توجد جلسات</div>
                  ) : (
                    items.map((h) => {
                      const isJudgment = h.is_judgment_hearing === 1 || h.status === 'محجوزة للحكم';
                      return (
                        <div
                          key={h.id}
                          onClick={() => setSelectedHearing(h)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer shadow-sm hover:shadow transition-shadow space-y-1 ${
                            isJudgment
                              ? 'bg-purple-50 border-purple-200 text-purple-950'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="font-extrabold flex items-center justify-between text-indigo-900">
                            <span>{h.case_number}/{h.case_year}</span>
                            {h.roll_number && <span className="text-[10px] bg-slate-100 px-1 rounded">رول {h.roll_number}</span>}
                          </div>
                          <div className="text-[11px] text-slate-600 truncate">{h.court_name}</div>
                          {h.primary_client_name && (
                            <div className="text-[10px] text-slate-500 truncate">👤 {h.primary_client_name}</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-amber-600" />
                رول جلسات يوم {selectedDayDate}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                إجمالي الجلسات المسجلة لهذا اليوم: {dayHearings.length}
              </p>
            </div>

            <input
              type="date"
              value={selectedDayDate}
              onChange={(e) => setSelectedDayDate(e.target.value)}
              className="text-xs p-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          {dayHearings.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <Gavel className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">لا توجد جلسات مسجلة لهذا اليوم</h4>
              <p className="text-xs text-slate-400">يمكنك مراجعة الأيام الأخرى من التقويم أو إضافة جلسة جديدة.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {dayHearings.map((h, idx) => (
                <div key={h.id} className="py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70 p-3 rounded-lg transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        قضية {h.case_number} لسنة {h.case_year}
                      </span>
                      {h.roll_number && (
                        <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          رول {h.roll_number}
                        </span>
                      )}
                      {h.court_hall && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          قاعة {h.court_hall}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {h.court_name} {h.court_circuit ? `(${h.court_circuit})` : ''}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-4">
                      {h.primary_client_name && <div><strong>الموكل:</strong> {h.primary_client_name}</div>}
                      {h.primary_opponent_name && <div><strong>الخصم:</strong> {h.primary_opponent_name}</div>}
                    </div>

                    {h.court_decision && (
                      <div className="text-xs font-semibold text-slate-800 bg-slate-100 p-1.5 rounded inline-block">
                        القرار: {h.court_decision}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedHearing(h)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      عرض التفاصيل
                    </button>
                    <button
                      onClick={() => onNavigateToCase(h.case_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm"
                    >
                      فتح ملف القضية
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Quick Details Modal for selected hearing */}
      {selectedHearing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-800">
                  تفاصيل جلسة {selectedHearing.hearing_date}
                </h3>
              </div>
              <button
                onClick={() => setSelectedHearing(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2">
                <div><strong>رقم القضية:</strong> {selectedHearing.case_number} لسنة {selectedHearing.case_year}</div>
                <div><strong>نوع الدعوى:</strong> {selectedHearing.case_type}</div>
                <div><strong>المحكمة:</strong> {selectedHearing.court_name}</div>
                <div><strong>الدائرة:</strong> {selectedHearing.court_circuit || 'غير محددة'}</div>
                <div><strong>القاعة:</strong> {selectedHearing.court_hall || 'غير محددة'}</div>
                <div><strong>رقم الرول:</strong> {selectedHearing.roll_number || 'غير محدد'}</div>
              </div>

              <div><strong>الموكل:</strong> {selectedHearing.primary_client_name || '-'} ({selectedHearing.primary_client_role || 'طرف'})</div>
              <div><strong>الخصم:</strong> {selectedHearing.primary_opponent_name || '-'} ({selectedHearing.primary_opponent_role || 'خصم'})</div>
              <div><strong>موضوع الدعوى:</strong> {selectedHearing.subject}</div>

              {selectedHearing.court_decision && (
                <div className="bg-amber-50 p-2.5 rounded border border-amber-200">
                  <strong className="text-amber-900">قرار المحكمة:</strong> {selectedHearing.court_decision}
                  {selectedHearing.adjournment_reason && (
                    <div className="text-amber-800 mt-1">
                      <strong>سبب التأجيل:</strong> {selectedHearing.adjournment_reason}
                    </div>
                  )}
                </div>
              )}

              {selectedHearing.requests && (
                <div><strong>المطلوب:</strong> {selectedHearing.requests}</div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedHearing(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                إغلاق
              </button>

              <button
                onClick={() => {
                  const cid = selectedHearing.case_id;
                  setSelectedHearing(null);
                  onNavigateToCase(cid);
                }}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                انتقال إلى صفحة القضية
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Export Modal (.ics) */}
      <CalendarExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        settings={settings}
      />
    </div>
  );
};
