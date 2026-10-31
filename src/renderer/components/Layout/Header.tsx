import React from 'react';
import {
  FolderOpen,
  Printer,
  ShieldCheck,
  Calendar,
  Search,
  Lock,
} from 'lucide-react';
import { NavigationTab, OfficeSettings } from '../../../shared/types';

interface HeaderProps {
  activeTab: NavigationTab;
  settings: OfficeSettings | null;
  onOpenDataDir: () => void;
  onOpenQuickPrint: () => void;
  onOpenUniversalSearch: () => void;
  onLockApp?: () => void;
  hasPassword?: boolean;
}

const tabTitles: Record<NavigationTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'الرئيسية - لوحة اليوم', subtitle: 'موجز الجلسات، المهام العاجلة، والمواعيد القانونية' },
  clients: { title: 'سجل الموكلين', subtitle: 'إدارة الموكلين، الشركات، والصفات القانونية والتوكيلات' },
  cases: { title: 'ملفات القضايا', subtitle: 'إدارة ملفات الدعاوى، الدوائر، الأطراف، والوثائق' },
  hearings: { title: 'الجلسات والتأجيلات', subtitle: 'رول الجلسات، القرارات، أسباب التأجيل، وحساب المواعيد' },
  calendar: { title: 'التقويم القضائي', subtitle: 'متابعة مواعيد الجلسات والمهام على مدار الشهر والأسبوع' },
  finance: { title: 'المالية والحسابات', subtitle: 'الأتعاب، الرسوم القضائية، المصاريف، وسندات القبض' },
  executions: { title: 'إجراءات التنفيذ', subtitle: 'ملفات التنفيذ الجبري، الأوامر، الحجوزات، والمحاضر' },
  tasks: { title: 'قائمة المهام والمأموريات', subtitle: 'مأموريات المحاكم والنيابة والشهر العقاري والأعمال الإدارية' },
  reports: { title: 'التقارير والطباعة الرسمية', subtitle: 'خدمة الطباعة الموحدة، كشوف الحسابات، وملفات القضايا' },
  trash: { title: 'سلة المحذوفات والأرشيف', subtitle: 'استعراض واسترجاع المستندات والقضايا والمهام المحذوفة' },
  settings: { title: 'إعدادات النظام والمكتب', subtitle: 'بيانات المكتب، الأمان والنسخ الاحتياطي، وسجل التدقيق' },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenDataDir,
  onOpenQuickPrint,
  onOpenUniversalSearch,
  onLockApp,
  hasPassword,
}) => {
  const currentTabInfo = tabTitles[activeTab] || { title: '', subtitle: '' };

  const todayStr = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs select-none flex-shrink-0">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 leading-tight">
          {currentTabInfo.title}
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          {currentTabInfo.subtitle}
        </p>
      </div>

      {/* Actions & Status */}
      <div className="flex items-center gap-3">
        {/* Universal Search Button / Trigger */}
        <button
          onClick={onOpenUniversalSearch}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-500 rounded-lg text-xs font-medium border border-slate-200 transition-colors cursor-pointer group"
          title="البحث الشامل عبر كل القضايا والموكلين والجلسات والمهام (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
          <span className="hidden sm:inline">بحث شامل في كافة السجلات...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white text-slate-500 border border-slate-200 rounded shadow-2xs">
            Ctrl K
          </kbd>
        </button>

        {/* Date badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-amber-600" />
          <span>{todayStr}</span>
        </div>

        {/* Offline Badge */}
        <div className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">أوفلاين محلي 100%</span>
        </div>

        {/* Quick Open Data Dir Button */}
        <button
          onClick={onOpenDataDir}
          title="فتح مجلد بيانات البرنامج (LawOfficeData)"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden lg:inline">مجلد البيانات</span>
        </button>

        {/* Quick Lock Button if Protected */}
        {hasPassword && onLockApp && (
          <button
            onClick={onLockApp}
            title="قفل البرنامج فوراً (Lock Screen)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-slate-700" />
            <span className="hidden md:inline">قفل</span>
          </button>
        )}

        {/* Quick Print Button */}
        <button
          onClick={onOpenQuickPrint}
          title="خدمة الطباعة الموحدة"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>معاينة وطباعة</span>
        </button>
      </div>
    </header>
  );
};
