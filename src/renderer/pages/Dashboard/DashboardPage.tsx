import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale,
  Users,
  Briefcase,
  Gavel,
  Calendar,
  Clock,
  Printer,
  Settings as SettingsIcon,
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ChevronLeft,
  Eye,
  FileDown,
  Coins,
  CheckSquare,
  Check
} from 'lucide-react';
import {
  Client,
  DataDirInfo,
  HearingWithCase,
  NavigationTab,
  OfficeSettings,
  AppealDeadline,
  Task
} from '../../../shared/types';
import { useHearings } from '../../hooks/useHearings';
import { useClients } from '../../hooks/useClients';
import { generateHearingRollHtml } from '../../services/hearingRollReportGenerator';

interface DashboardPageProps {
  settings: OfficeSettings | null;
  courtsCount: number;
  caseTypesCount: number;
  clientsCount?: number;
  casesCount?: number;
  dataDirInfo: DataDirInfo | null;
  onNavigate: (tab: NavigationTab) => void;
  onOpenDataDir: () => void;
  onNavigateToCase?: (caseId: number) => void;
}

const formatLocalDate = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  settings,
  courtsCount,
  caseTypesCount,
  clientsCount = 0,
  casesCount = 0,
  dataDirInfo,
  onNavigate,
  onOpenDataDir,
  onNavigateToCase
}) => {
  const { getHearingRoll, getAppealDeadlines } = useHearings();
  const { getExpiringPoaClients } = useClients();

  const [todayHearings, setTodayHearings] = useState<HearingWithCase[]>([]);
  const [tomorrowHearings, setTomorrowHearings] = useState<HearingWithCase[]>([]);
  const [pendingJudgments, setPendingJudgments] = useState<HearingWithCase[]>([]);
  const [upcomingAppeals, setUpcomingAppeals] = useState<AppealDeadline[]>([]);
  const [expiringClients, setExpiringClients] = useState<Client[]>([]);
  const [dashboardTasks, setDashboardTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = formatLocalDate(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatLocalDate(tomorrow);

  const todayFormatted = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRoll, tomorrowRoll, allJudgmentHearings, allAppeals, poaClients, dueTasks, overdueTasks] = await Promise.all([
        getHearingRoll({ date: todayStr }),
        getHearingRoll({ date: tomorrowStr }),
        getHearingRoll({ status: 'محجوزة للحكم' }),
        getAppealDeadlines(),
        getExpiringPoaClients(30),
        window.electronAPI.getTasks({ period: 'today' }),
        window.electronAPI.getTasks({ period: 'overdue' })
      ]);

      setTodayHearings(Array.isArray(todayRoll) ? todayRoll : []);
      setTomorrowHearings(Array.isArray(tomorrowRoll) ? tomorrowRoll : []);
      setPendingJudgments(Array.isArray(allJudgmentHearings) ? allJudgmentHearings : []);
      
      // Filter upcoming appeals: not filed and remaining days <= 20
      const appealsList = Array.isArray(allAppeals) ? allAppeals : [];
      const urgentAppeals = appealsList.filter(a => !a.is_appeal_filed && (a.days_remaining ?? 999) <= 20);
      setUpcomingAppeals(urgentAppeals);
      setExpiringClients(Array.isArray(poaClients) ? poaClients : []);

      // Combine today's tasks and pending overdue tasks
      const safeOverdue = Array.isArray(overdueTasks) ? overdueTasks : [];
      const safeDue = Array.isArray(dueTasks) ? dueTasks : [];
      const combinedTasks = [...safeOverdue, ...safeDue.filter(t => !safeOverdue.some(o => o.id === t.id))];
      setDashboardTasks(combinedTasks.slice(0, 8));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [getHearingRoll, getAppealDeadlines, getExpiringPoaClients, todayStr, tomorrowStr]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Direct print today's roll
  const handlePrintTodayRoll = async (action: 'preview' | 'print' | 'pdf') => {
    if (!settings || todayHearings.length === 0) return;
    const htmlContent = generateHearingRollHtml(todayHearings, settings, {
      title: 'رول جلسات اليوم',
      filterSummary: `رول جلسات اليوم: ${todayFormatted}`,
      orientation: 'landscape'
    });

    await window.electronAPI.executePrint({
      htmlContent,
      title: 'رول جلسات اليوم',
      action,
      suggestedFileName: `رول_جلسات_اليوم_${todayStr}.pdf`
    });
  };

  const handleOpenCase = (caseId: number) => {
    if (onNavigateToCase) {
      onNavigateToCase(caseId);
    } else {
      onNavigate('cases');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Welcome & Office Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 text-white shadow-lg border border-slate-700/60">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <Scale className="w-3.5 h-3.5" />
              <span>لوحة اليوم — برنامج إدارة مكتب المحاماة</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              مرحبًا، {settings?.lawyer_name || 'الأستاذ المحامي'}
            </h2>
            <p className="text-sm text-slate-300 font-medium max-w-2xl leading-relaxed">
              {settings?.office_name} • {settings?.lawyer_title || 'المحامي بالنقض والدستورية العليا'}
            </p>
            <p className="text-xs text-amber-400/90 font-bold">
              📅 {todayFormatted}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => handlePrintTodayRoll('print')}
              disabled={todayHearings.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة رول اليوم</span>
            </button>
            <button
              onClick={() => onNavigate('hearings')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-600/60 transition-all"
            >
              <Gavel className="w-4 h-4 text-amber-400" />
              <span>رول الجلسات</span>
            </button>
            <button
              onClick={() => onNavigate('calendar')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-600/60 transition-all"
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>التقويم</span>
            </button>
            <button
              onClick={() => onNavigate('finance')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-600/60 transition-all"
            >
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>المالية</span>
            </button>
          </div>
        </div>

        {/* Decorative background watermark */}
        <div className="absolute left-[-20px] bottom-[-40px] opacity-10 pointer-events-none">
          <Scale className="w-72 h-72 text-amber-200" />
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today's hearings */}
        <div
          onClick={() => onNavigate('hearings')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">جلسات اليوم</span>
            <Gavel className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{todayHearings.length}</div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">
            {todayHearings.length > 0 ? 'رول اليوم جاهز للمتابعة ←' : 'لا توجد جلسات اليوم'}
          </div>
        </div>

        {/* Pending Judgments */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">أحكام معلقة / محجوزة</span>
            <Scale className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-800">{pendingJudgments.length}</div>
          <div className="text-[11px] text-purple-600 font-semibold mt-1">
            تنتظر النطق بالحكم
          </div>
        </div>

        {/* Urgent Appeals */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">مواعيد طعن قريبة</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">{upcomingAppeals.length}</div>
          <div className="text-[11px] text-rose-600 font-semibold mt-1">
            خلال 20 يومًا أو انتهت
          </div>
        </div>

        {/* Expiring POAs */}
        <div
          onClick={() => onNavigate('clients')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">توكيلات قاربت على الانتهاء</span>
            <ShieldAlert className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-orange-700">{expiringClients.length}</div>
          <div className="text-[11px] text-orange-600 font-semibold mt-1">
            تتطلب التجديد ←
          </div>
        </div>
      </div>

      {/* 3. Main Today's Roll Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-extrabold text-slate-900">
              رول جلسات اليوم ({todayHearings.length})
            </h3>
            <span className="text-xs text-slate-500">
              مرتبة بالمحكمة والدائرة ورقم الرول
            </span>
          </div>

          <div className="flex items-center gap-2">
            {todayHearings.length > 0 && (
              <>
                <button
                  onClick={() => handlePrintTodayRoll('preview')}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                >
                  <Eye className="w-3.5 h-3.5" />
                  معاينة
                </button>
                <button
                  onClick={() => handlePrintTodayRoll('print')}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  طباعة الرول
                </button>
              </>
            )}

            <button
              onClick={() => onNavigate('hearings')}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 mr-2"
            >
              فتح رول الجلسات الكامل ←
            </button>
          </div>
        </div>

        {todayHearings.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <Gavel className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-xs font-bold text-slate-700">لا توجد جلسات محددة لليوم في الرول</div>
            {tomorrowHearings.length > 0 && (
              <div className="text-xs text-indigo-700 font-semibold bg-indigo-50 p-2 rounded-lg max-w-sm mx-auto">
                💡 يوجد لديك <strong>{tomorrowHearings.length}</strong> جلسات مجدولة ليوم الغد.
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5 w-12 text-center">م</th>
                  <th className="p-2.5 w-24 text-center">الرول / القاعة</th>
                  <th className="p-2.5">رقم القضية</th>
                  <th className="p-2.5">المحكمة والدائرة</th>
                  <th className="p-2.5">الموكل</th>
                  <th className="p-2.5">الخصم</th>
                  <th className="p-2.5">الجلسة السابقة</th>
                  <th className="p-2.5">المطلوب</th>
                  <th className="p-2.5 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayHearings.map((h, idx) => (
                  <tr key={h.id} className="hover:bg-amber-50/30">
                    <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 text-center">
                      {h.roll_number ? (
                        <span className="font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                          رول {h.roll_number}
                        </span>
                      ) : '-'}
                      {h.court_hall && (
                        <div className="text-[10px] text-slate-500 mt-0.5">قاعة {h.court_hall}</div>
                      )}
                    </td>
                    <td className="p-2.5">
                      <button
                        onClick={() => handleOpenCase(h.case_id)}
                        className="font-extrabold text-slate-900 hover:text-amber-700 flex items-center gap-1"
                      >
                        {h.case_number} لسنة {h.case_year}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-800">{h.court_name}</div>
                      {h.court_circuit && <div className="text-[11px] text-slate-500">{h.court_circuit}</div>}
                    </td>
                    <td className="p-2.5 font-semibold text-slate-800">{h.primary_client_name || '-'}</td>
                    <td className="p-2.5 text-slate-600">{h.primary_opponent_name || '-'}</td>
                    <td className="p-2.5 text-[11px] text-slate-500">
                      {h.previous_decision || h.previous_adjournment_reason || 'أول جلسة'}
                    </td>
                    <td className="p-2.5 text-indigo-700 font-semibold">{h.requests || h.notes || '-'}</td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => onNavigate('hearings')}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg"
                      >
                        تسجيل النتيجة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3b. Today & Urgent Tasks Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-800">
              مهام ومأموريات اليوم والمتأخرة ({dashboardTasks.length})
            </h3>
          </div>
          <button
            onClick={() => onNavigate('tasks')}
            className="text-xs text-amber-600 font-bold hover:underline"
          >
            سجل المهام الكامل ←
          </button>
        </div>

        {dashboardTasks.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            لا توجد مهام أو مأموريات عاجلة مطلوبة لليوم 🎉
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dashboardTasks.map(task => (
              <div
                key={task.id}
                className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                  task.is_overdue
                    ? 'bg-red-50/40 border-red-200'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60'
                }`}
              >
                <button
                  onClick={async () => {
                    await window.electronAPI.updateTask(task.id, { status: 'منتهية' });
                    loadDashboardData();
                  }}
                  className="w-5 h-5 rounded-md border border-slate-300 hover:border-emerald-600 bg-white flex items-center justify-center mt-0.5"
                  title="تأشير المهمة كمنجزة فوراً"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600 opacity-30 hover:opacity-100" />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs truncate">
                      {task.title}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      task.priority === 'عاجلة' ? 'bg-red-100 text-red-800' :
                      task.priority === 'مهمة' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {task.priority}
                    </span>
                    {task.is_overdue && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-600 text-white">
                        متأخرة
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                    <span>{task.category}</span>
                    <span>الاستحقاق: <strong>{task.due_date}</strong></span>
                    <span>المكلف: <strong>{task.assigned_to || 'أنا'}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Two Columns: Pending Judgments & Urgent Appeals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Judgments */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-800">
                أحكام معلقة تنتظر النطق ({pendingJudgments.length})
              </h3>
            </div>
            <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-bold">
              محجوزة للحكم
            </span>
          </div>

          {pendingJudgments.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              لا توجد قضايا محجوزة للحكم حاليًا
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {pendingJudgments.map((h) => (
                <div key={h.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <button
                      onClick={() => handleOpenCase(h.case_id)}
                      className="font-bold text-slate-900 hover:text-purple-700 flex items-center gap-1"
                    >
                      {h.case_number} لسنة {h.case_year} ({h.court_name})
                    </button>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      الموكل: {h.primary_client_name || '-'}
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="inline-block text-[11px] font-extrabold text-purple-800 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                      📅 {h.judgment_date ? `حكم: ${h.judgment_date}` : 'ميعاد النطق محدد'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Appeal Deadlines */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-800">
                مواعيد الطعن القانونية العاجلة ({upcomingAppeals.length})
              </h3>
            </div>
            <span className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold">
              تنبيه المهلة
            </span>
          </div>

          {upcomingAppeals.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              لا توجد مواعيد طعن عاجلة أو منتهية حاليًا
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {upcomingAppeals.map((a) => (
                <div key={a.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <button
                      onClick={() => handleOpenCase(a.case_id)}
                      className="font-bold text-slate-900 hover:text-rose-700 flex items-center gap-1"
                    >
                      {a.appeal_type} — قضية {a.case_id}
                    </button>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      تاريخ الحكم: {a.judgment_date} • آخر ميعاد: {a.deadline_date}
                    </div>
                  </div>

                  <div className="text-left">
                    {a.is_expired ? (
                      <span className="text-[11px] font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                        انتهى الميعاد
                      </span>
                    ) : (
                      <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded border ${
                        (a.days_remaining ?? 0) <= 5
                          ? 'text-red-700 bg-red-100 border-red-200 animate-pulse'
                          : 'text-amber-800 bg-amber-100 border-amber-200'
                      }`}>
                        متبقي {a.days_remaining} يوم
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Expiring POAs & Data Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring POAs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-orange-600" />
              <h3 className="text-sm font-bold text-slate-800">
                توكيلات قاربت على الانتهاء ({expiringClients.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigate('clients')}
              className="text-xs text-amber-600 font-bold hover:underline"
            >
              سجل الموكلين ←
            </button>
          </div>

          {expiringClients.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              جميع توكيلات الموكلين سارية ولا توجد توكيلات منتهية
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {expiringClients.map((c) => (
                <div key={c.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{c.name}</span>
                    <div className="text-[11px] text-slate-500">توكيل رقم {c.poa_number || 'غير مسجل'}</div>
                  </div>
                  <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                    ينتهي في: {c.poa_expiry_date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data Directory Info */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-800">بيانات التخزين المحلي</h3>
            </div>
            <button
              onClick={onOpenDataDir}
              className="text-xs text-amber-600 font-bold hover:underline"
            >
              فتح المجلد ←
            </button>
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between p-2 bg-slate-50 rounded">
              <span>مسار قاعدة البيانات:</span>
              <span className="font-mono text-slate-800 font-bold truncate max-w-xs" title={dataDirInfo?.dbPath}>
                {dataDirInfo?.dbPath || 'office.db'}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded">
              <span>وضع تشغيل SQLite:</span>
              <span className="text-emerald-700 font-bold">WAL Mode (عالي الأداء)</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded">
              <span>حالة الاتصال والشبكة:</span>
              <span className="text-emerald-700 font-bold">محلي أوفلاين 100% (بدون اتصال)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
