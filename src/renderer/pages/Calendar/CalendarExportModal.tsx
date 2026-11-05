import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Download,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FolderOpen,
  ExternalLink,
  Copy,
  X,
  FileCheck,
  Gavel,
  CheckSquare,
  Scale,
  CreditCard,
  FileText
} from 'lucide-react';
import {
  CalendarExportOptions,
  CalendarExportResult,
  CalendarExportCounts,
  OfficeSettings
} from '../../../shared/types';

interface CalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: OfficeSettings | null;
}

export const CalendarExportModal: React.FC<CalendarExportModalProps> = ({
  isOpen,
  onClose,
  settings
}) => {
  // Date ranges
  const todayStr = new Date().toISOString().slice(0, 10);
  const nextMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(nextMonthEnd);

  // Content selection
  const [includeHearings, setIncludeHearings] = useState<boolean>(true);
  const [includeTasks, setIncludeTasks] = useState<boolean>(true);
  const [includeAppeals, setIncludeAppeals] = useState<boolean>(true);
  const [includeCheques, setIncludeCheques] = useState<boolean>(true);
  const [includePoaExpiry, setIncludePoaExpiry] = useState<boolean>(true);

  // Privacy mode (default enabled)
  const defaultPrivacy = settings?.calendar_privacy_mode !== undefined ? Boolean(settings.calendar_privacy_mode) : true;
  const [privacyMode, setPrivacyMode] = useState<boolean>(defaultPrivacy);

  // Counts and state
  const [counts, setCounts] = useState<CalendarExportCounts | null>(null);
  const [isLoadingCounts, setIsLoadingCounts] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportResult, setExportResult] = useState<CalendarExportResult | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Quick Presets
  const applyPreset = (preset: 'thisMonth' | 'nextMonth' | 'currentWeek' | 'threeMonths' | 'year') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (preset === 'thisMonth') {
      const first = new Date(y, m, 1).toISOString().slice(0, 10);
      const last = new Date(y, m + 1, 0).toISOString().slice(0, 10);
      setStartDate(first);
      setEndDate(last);
    } else if (preset === 'nextMonth') {
      const first = new Date(y, m + 1, 1).toISOString().slice(0, 10);
      const last = new Date(y, m + 2, 0).toISOString().slice(0, 10);
      setStartDate(first);
      setEndDate(last);
    } else if (preset === 'currentWeek') {
      const day = now.getDay(); // 0 is Sunday
      // In Egypt, court week starts Saturday (day 6)
      const diffToSat = (day + 1) % 7;
      const sat = new Date(now);
      sat.setDate(now.getDate() - diffToSat);
      const thu = new Date(sat);
      thu.setDate(sat.getDate() + 6);
      setStartDate(sat.toISOString().slice(0, 10));
      setEndDate(thu.toISOString().slice(0, 10));
    } else if (preset === 'threeMonths') {
      const first = todayStr;
      const end = new Date(y, m + 3, 0).toISOString().slice(0, 10);
      setStartDate(first);
      setEndDate(end);
    } else if (preset === 'year') {
      const first = `${y}-01-01`;
      const end = `${y}-12-31`;
      setStartDate(first);
      setEndDate(end);
    }
  };

  // Fetch counts when options change
  const loadCounts = useCallback(async () => {
    if (!isOpen) return;
    try {
      setIsLoadingCounts(true);
      const exportOptions: CalendarExportOptions = {
        startDate,
        endDate,
        includeHearings,
        includeTasks,
        includeAppeals,
        includeCheques,
        includePoaExpiry,
        privacyMode
      };
      const res = await window.electronAPI.getCalendarExportCounts(exportOptions);
      setCounts(res);
    } catch (err) {
      console.error('Failed to load calendar export counts:', err);
    } finally {
      setIsLoadingCounts(false);
    }
  }, [isOpen, startDate, endDate, includeHearings, includeTasks, includeAppeals, includeCheques, includePoaExpiry, privacyMode]);

  useEffect(() => {
    if (isOpen) {
      loadCounts();
    }
  }, [isOpen, loadCounts]);

  if (!isOpen) return null;

  // Handle Export to .ics
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportResult(null);

      const options: CalendarExportOptions = {
        startDate,
        endDate,
        includeHearings,
        includeTasks,
        includeAppeals,
        includeCheques,
        includePoaExpiry,
        privacyMode
      };

      const result = await window.electronAPI.exportCalendarIcs(options);
      setExportResult(result);

      if (!result.success) {
        alert(result.error || 'فشل تصدير ملف التقويم');
      }
    } catch (err: any) {
      alert(`حدث خطأ أثناء تصدير ملف التقويم: ${err?.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Today's Summary Copy
  const handleCopyTodaySummary = async () => {
    try {
      const summaryText = await window.electronAPI.getTodaySummary({ privacyMode });
      await navigator.clipboard.writeText(summaryText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3500);
    } catch (err: any) {
      alert(`فشل نسخ ملخص اليوم: ${err?.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">تصدير التقويم القضائي والمواعيد (.ics)</h3>
              <p className="text-xs text-slate-300">متوافق مع تقويم Google وموبايل iPhone وAndroid وOutlook (أوفلاين 100%)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10" data-testid="calendar-export.main.on-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-right dir-rtl">
          
          {/* Privacy Warning Banner */}
          <div className={`p-4 rounded-xl border transition-all ${
            privacyMode
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                privacyMode ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {privacyMode ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <div className="flex-1 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">
                    {privacyMode ? 'وضع الخصوصية التامة مُفعّل (موصى به)' : 'تنبيه: وضع الخصوصية معطل!'}
                  </h4>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <span className="text-[11px] font-semibold text-slate-600">تفعيل وضع الخصوصية:</span>
                    <input
                      type="checkbox"
                      checked={privacyMode}
                      onChange={e => setPrivacyMode(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500" data-testid="calendar-export.main.set-privacy-mode"
                    />
                  </label>
                </div>
                <p className="leading-relaxed">
                  {privacyMode ? (
                    <span>
                      لحماية أسرار الموكلين، سيحتوي الملف فقط على <strong>رقم القضية والسنة والمحكمة والطلبات الإجرائية</strong>، مع <strong>حجب أسماء الموكلين والخصوم تماماً</strong>، لأن ملفات التقويم عند فتحها في تطبيقات الهواتف أو Google Calendar يتم مزامنتها مع خوادم خارجية سحابية.
                    </span>
                  ) : (
                    <span className="text-amber-900 font-medium">
                      ⚠️ تحذير: سيتم تضمين أسماء الموكلين والخصوم داخل ملف التقويم. يُرجى الانتباه إلى أن استيراد الملف في Google Calendar أو البريد الإلكتروني سينقل هذه البيانات إلى خوادم خارجية.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">الفترة الزمنية للتصدير:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">من تاريخ:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors" data-testid="calendar-export.main.set-start-date"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">إلى تاريخ:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors" data-testid="calendar-export.main.set-end-date"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium">فترات سريعة:</span>
              <button
                type="button"
                onClick={() => applyPreset('currentWeek')}
                className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors" data-testid="calendar-export.main.button-2"
              >
                الأسبوع الحالي
              </button>
              <button
                type="button"
                onClick={() => applyPreset('thisMonth')}
                className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors" data-testid="calendar-export.main.onth"
              >
                هذا الشهر
              </button>
              <button
                type="button"
                onClick={() => applyPreset('nextMonth')}
                className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors" data-testid="calendar-export.main.onth-2"
              >
                الشهر القادم
              </button>
              <button
                type="button"
                onClick={() => applyPreset('threeMonths')}
                className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors" data-testid="calendar-export.main.onths"
              >
                3 أشهر قادمة
              </button>
              <button
                type="button"
                onClick={() => applyPreset('year')}
                className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors" data-testid="calendar-export.main.button-6"
              >
                كامل السنة
              </button>
            </div>
          </div>

          {/* Content Checkboxes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">محتوى ملف التقويم:</label>
              {counts && (
                <span className="text-xs text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  {isLoadingCounts ? 'جارِ الحساب...' : `${counts.total} حدث إجمالي`}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* 1. Hearings */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeHearings}
                  onChange={e => setIncludeHearings(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500" data-testid="calendar-export.main.set-include-hearings"
                />
                <div className="flex items-center justify-between flex-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <Gavel className="w-4 h-4 text-indigo-600" />
                    <span>جلسات المحاكم والرول</span>
                  </div>
                  {counts && (
                    <span className="text-[11px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {counts.hearings}
                    </span>
                  )}
                </div>
              </label>

              {/* 2. Tasks */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeTasks}
                  onChange={e => setIncludeTasks(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500" data-testid="calendar-export.main.set-include-tasks"
                />
                <div className="flex items-center justify-between flex-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span>المهام والمأموريات المحددة بوقت</span>
                  </div>
                  {counts && (
                    <span className="text-[11px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {counts.tasks}
                    </span>
                  )}
                </div>
              </label>

              {/* 3. Appeals */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeAppeals}
                  onChange={e => setIncludeAppeals(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500" data-testid="calendar-export.main.set-include-appeals"
                />
                <div className="flex items-center justify-between flex-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <Scale className="w-4 h-4 text-amber-600" />
                    <span>مواعيد الطعن القانونية</span>
                  </div>
                  {counts && (
                    <span className="text-[11px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {counts.appeals}
                    </span>
                  )}
                </div>
              </label>

              {/* 4. Cheques */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeCheques}
                  onChange={e => setIncludeCheques(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500" data-testid="calendar-export.main.set-include-cheques"
                />
                <div className="flex items-center justify-between flex-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>الشيكات المستحقة السداد</span>
                  </div>
                  {counts && (
                    <span className="text-[11px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {counts.cheques}
                    </span>
                  )}
                </div>
              </label>

              {/* 5. POA Expirations */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors sm:col-span-2">
                <input
                  type="checkbox"
                  checked={includePoaExpiry}
                  onChange={e => setIncludePoaExpiry(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500" data-testid="calendar-export.main.set-include-poa-expiry"
                />
                <div className="flex items-center justify-between flex-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>انتهاء صلاحية التوكيلات القضائية</span>
                  </div>
                  {counts && (
                    <span className="text-[11px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {counts.poa}
                    </span>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Alarm Duration Note */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>تنبيهات التقويم المدمجة (VALARM):</span>
            </div>
            <span className="font-semibold text-slate-800">
              تنبيه قبل الموعد بـ 1 يوم و 1 ساعة
            </span>
          </div>

          {/* Export Result Success Card */}
          {exportResult && exportResult.success && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>تم تصدير ملف التقويم بنجاح! ({exportResult.eventsCount} حدث)</span>
              </div>
              <p className="text-xs text-slate-600 truncate dir-ltr text-right" title={exportResult.filePath}>
                {exportResult.filePath}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    if (exportResult.filePath) {
                      await window.electronAPI.openExportedFile(exportResult.filePath);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors" data-testid="calendar-export.main.on-api"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح الملف الآن في التقويم</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await window.electronAPI.openDataDir();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition-colors" data-testid="calendar-export.main.on-api-2"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-slate-600" />
                  <span>مجلد exports/</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          {/* Quick Copy Today's Summary Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTodaySummary}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                copySuccess
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
              }`}
              title="ينسخ نصاً مرتباً وسريعاً بجلسات ومهام اليوم بوضع الخصوصية الحالي" data-testid="calendar-export.main.handle-copy-today-summary"
            >
              {copySuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              <span>{copySuccess ? 'تم نسخ ملخص اليوم للحافظة!' : 'نسخ ملخص اليوم'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors" data-testid="calendar-export.main.on-close-2"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || (counts?.total === 0)}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all" data-testid="calendar-export.main.handle-export"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جارِ التصدير...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تصدير ملف .ics الآن</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
