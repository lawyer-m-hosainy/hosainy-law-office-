import React from 'react';
import {
  Scale,
  Users,
  Briefcase,
  Gavel,
  CheckSquare,
  Printer,
  Settings as SettingsIcon,
  FolderOpen,
  ShieldCheck,
  Building,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import {
  ConfigurableListItem,
  DataDirInfo,
  NavigationTab,
  OfficeSettings,
} from '../../../shared/types';

interface DashboardPageProps {
  settings: OfficeSettings | null;
  courtsCount: number;
  caseTypesCount: number;
  dataDirInfo: DataDirInfo | null;
  onNavigate: (tab: NavigationTab) => void;
  onOpenDataDir: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  settings,
  courtsCount,
  caseTypesCount,
  dataDirInfo,
  onNavigate,
  onOpenDataDir,
}) => {
  const todayFormatted = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome & Office Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 text-white shadow-lg border border-slate-700/60">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <Scale className="w-3.5 h-3.5" />
              <span>نظام إدارة مكاتب المحاماة - النسخة المكتبية المعتمدة</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              مرحبًا، {settings?.lawyer_name || 'الأستاذ المحامي'}
            </h2>
            <p className="text-sm text-slate-300 font-medium max-w-2xl leading-relaxed">
              {settings?.office_name} • {settings?.title}
            </p>
            <p className="text-xs text-amber-400/80 font-mono">
              اليوم: {todayFormatted}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onNavigate('reports')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>التقارير والطباعة</span>
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-600/60 transition-all"
            >
              <SettingsIcon className="w-4 h-4" />
              <span>إعدادات المكتب</span>
            </button>
          </div>
        </div>

        {/* Decorative background watermark */}
        <div className="absolute left-[-20px] bottom-[-40px] opacity-10 pointer-events-none">
          <Scale className="w-72 h-72 text-amber-200" />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">المحاكم المعتمدة</span>
            <span className="text-2xl font-black text-slate-800">{courtsCount}</span>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">جاهزة في القوائم</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">أنواع القضايا</span>
            <span className="text-2xl font-black text-slate-800">{caseTypesCount}</span>
            <span className="text-[11px] text-amber-600 font-semibold block mt-0.5">مدني، جنح، أسرة، إلخ</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">وضع قاعدة البيانات</span>
            <span className="text-base font-bold text-emerald-700 block">SQLite WAL</span>
            <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
              {dataDirInfo ? `${(dataDirInfo.dbSizeBytes / 1024).toFixed(1)} KB` : 'متصل'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">مجلد البيانات المحلي</span>
            <span className="text-xs font-bold text-slate-800 block truncate max-w-[120px]">LawOfficeData</span>
            <button
              onClick={onOpenDataDir}
              className="text-[11px] text-amber-600 hover:text-amber-800 font-bold block mt-0.5"
            >
              استعراض المجلد ←
            </button>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <FolderOpen className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Launch & Phase 1 Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phase 1 Status Checklist */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">
              حالة إنجاز متطلبات المرحلة الأولى (Phase 1 Checklist)
            </h3>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-bold">
              مكتملة 100%
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                ✓
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">هيكل Electron + React + TypeScript + Vite + SQLite</span>
                <span className="text-slate-500">
                  فصل صارم بين Main Process و Preload Bridge و Renderer مع نظام هجرات مرقّم (Migrations) ووضع WAL.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                ✓
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">واجهة عربية RTL كاملة والتنقل بين 10 أقسام رئيسية</span>
                <span className="text-slate-500">
                  خط Cairo العربي مضمن محلياً بالكامل، خالية من أي طلب شبكة أو CDN خارجي، وتعمل أوفلاين 100%.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                ✓
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">إدارة بيانات المكتب، مجلد البيانات، والقوائم القابلة للتعديل</span>
                <span className="text-slate-500">
                  تعبئة افتراضية كاملة من SPEC.md للمحاكم وأنواع القضايا وأسباب التأجيل وتصنيفات المهام والحركات المالية.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                ✓
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">خدمة الطباعة الموحدة والتقرير التجريبي (A4 RTL)</span>
                <span className="text-slate-500">
                  خدمة مركزية بالـ Main تدعم المعاينة قبل الطباعة، الطباعة المباشرة، وحفظ ملفات PDF بترويسة المكتب الرسمية.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
            إجراءات سريعة
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => onNavigate('reports')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-right transition-colors"
            >
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-amber-700" />
                <div>
                  <span className="text-xs font-bold text-amber-950 block">تجربة خدمة الطباعة</span>
                  <span className="text-[11px] text-amber-700 block">معاينة وطباعة وحفظ PDF</span>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-amber-600" />
            </button>

            <button
              onClick={() => onNavigate('settings')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-right transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-slate-700" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">تعديل بيانات المكتب والشعار</span>
                  <span className="text-[11px] text-slate-500 block">الاسم، الهاتف، العنوان، ورقم القيد</span>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={onOpenDataDir}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-right transition-colors"
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-slate-700" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">فتح مجلد البيانات</span>
                  <span className="text-[11px] text-slate-500 block">استعراض office.db والمرفقات</span>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
