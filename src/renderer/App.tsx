import React, { useState } from 'react';
import { NavigationTab } from '../shared/types';
import { useSettings } from './hooks/useSettings';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { GenericPlaceholder } from './pages/GenericPlaceholder';
import { Scale, Loader2, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  const {
    settings,
    lists,
    dataDirInfo,
    loading,
    error,
    reload,
    updateSettings,
    createListItem,
    updateListItem,
    deleteListItem,
    resetList,
    refreshDataDirInfo,
  } = useSettings();

  const handleOpenDataDir = async () => {
    try {
      const res = await window.electronAPI.openDataDir();
      if (!res.success) {
        alert(`تعذر فتح مجلد البيانات: ${res.error}`);
      }
    } catch (err: any) {
      alert(`خطأ: ${err?.message}`);
    }
  };

  const handleOpenQuickPrint = () => {
    setActiveTab('reports');
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white space-y-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white shadow-xl animate-pulse">
          <Scale className="w-8 h-8 text-amber-200" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300 font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>جاري تهيئة النظام وقاعدة البيانات المحلية...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6 select-none">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-red-200 shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">تعذر بدء تشغيل البرنامج</h2>
          <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg font-mono text-right dir-ltr">
            {error}
          </p>
          <button
            onClick={() => reload()}
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-cairo">
      {/* Sidebar Navigation on Right (RTL) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        settings={settings}
        dbPath={dataDirInfo?.dbPath}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          settings={settings}
          onOpenDataDir={handleOpenDataDir}
          onOpenQuickPrint={handleOpenQuickPrint}
        />

        {/* Content View */}
        <main className="flex-1 overflow-y-auto bg-slate-100/60">
          {activeTab === 'dashboard' && (
            <DashboardPage
              settings={settings}
              courtsCount={lists.courts?.length || 0}
              caseTypesCount={lists.case_types?.length || 0}
              dataDirInfo={dataDirInfo}
              onNavigate={setActiveTab}
              onOpenDataDir={handleOpenDataDir}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              settings={settings}
              lists={lists}
              dataDirInfo={dataDirInfo}
              onUpdateSettings={updateSettings}
              onCreateListItem={createListItem}
              onUpdateListItem={updateListItem}
              onDeleteListItem={deleteListItem}
              onResetList={resetList}
              onRefreshDataDir={refreshDataDirInfo}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsPage
              settings={settings}
              courtsList={lists.courts || []}
            />
          )}

          {['clients', 'cases', 'hearings', 'calendar', 'finance', 'executions', 'tasks'].includes(activeTab) && (
            <GenericPlaceholder tab={activeTab} onNavigateToSettings={() => setActiveTab('settings')} />
          )}
        </main>
      </div>
    </div>
  );
};
