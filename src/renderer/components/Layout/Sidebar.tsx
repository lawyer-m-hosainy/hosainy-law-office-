import React from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Gavel,
  Calendar as CalendarIcon,
  Coins,
  FileCheck2,
  CheckSquare,
  FileText,
  Trash2,
  Settings as SettingsIcon,
  Scale,
  HardDrive,
  Send,
} from 'lucide-react';
import { NavigationTab, OfficeSettings } from '../../../shared/types';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  settings: OfficeSettings | null;
  dbPath?: string;
}

const navItems: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { id: 'clients', label: 'الموكلين', icon: Users },
  { id: 'cases', label: 'القضايا', icon: Briefcase },
  { id: 'hearings', label: 'الجلسات', icon: Gavel },
  { id: 'calendar', label: 'التقويم', icon: CalendarIcon },
  { id: 'finance', label: 'المالية', icon: Coins },
  { id: 'executions', label: 'التنفيذات', icon: FileCheck2 },
  { id: 'announcements', label: 'الإعلانات والمحضرين', icon: Send },
  { id: 'tasks', label: 'المهام', icon: CheckSquare },
  { id: 'reports', label: 'التقارير والطباعة', icon: FileText },
  { id: 'trash', label: 'سلة المحذوفات', icon: Trash2 },
  { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  settings,
  dbPath,
}) => {
  const [appVersion, setAppVersion] = React.useState<string>('');

  React.useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then((ver) => {
        if (ver) setAppVersion(ver);
      }).catch((err) => {
        console.error('Failed to get app version:', err);
      });
    }
  }, []);
  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen border-l border-slate-800 shadow-xl flex-shrink-0 select-none">
      {/* Brand / Lawyer Profile Banner */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white shadow-lg shadow-amber-900/30 flex-shrink-0">
            <Scale className="w-6 h-6 text-amber-200" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm text-slate-100 truncate">
              {settings?.office_name || 'مكتب المحاماة'}
            </h1>
            <p className="text-xs text-amber-400/90 truncate font-medium">
              {settings?.lawyer_name || 'المحامي المسؤول'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 group relative text-right ${
                isActive
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`} data-testid="sidebar.main.on-tab-change"
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {isActive && (
                <div className="w-1.5 h-4 bg-amber-400 rounded-full flex-shrink-0 mr-auto" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Storage Status */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-xs">
        <div className="flex items-center gap-2 text-slate-400 mb-1">
          <HardDrive className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="font-semibold text-slate-300">قاعدة البيانات المحلية</span>
          <span className="mr-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
            WAL نشط
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
          <span className="truncate" title={dbPath}>{dbPath ? dbPath.split(/[\\/]/).pop() : 'office.db'}</span>
          <span className="font-mono text-amber-400 font-bold text-[10px]">
            v{appVersion || (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.1')}
          </span>
        </div>
        {typeof __BUILD_TIMESTAMP__ !== 'undefined' && __BUILD_TIMESTAMP__ && (
          <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-0.5" title="تاريخ ووقت البناء">
            <span>بناء:</span>
            <span>{__BUILD_TIMESTAMP__}</span>
          </div>
        )}
      </div>
    </aside>
  );
};
