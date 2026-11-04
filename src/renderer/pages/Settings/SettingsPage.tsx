import React, { useState } from 'react';
import {
  Building2,
  FolderTree,
  ListFilter,
  Clock,
  Save,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  FolderOpen,
  ArrowRightLeft,
  Check,
  AlertTriangle,
  Upload,
  Info,
  Lock,
  Archive,
  History,
  ShieldCheck,
} from 'lucide-react';
import {
  ConfigurableListItem,
  ConfigurableListType,
  DataDirInfo,
  OfficeSettings,
} from '../../../shared/types';
import { SecuritySettingsTab } from './components/SecuritySettingsTab';
import { BackupSettingsTab } from './components/BackupSettingsTab';
import { AuditLogsTab } from './components/AuditLogsTab';

interface SettingsPageProps {
  settings: OfficeSettings | null;
  lists: Record<ConfigurableListType, ConfigurableListItem[]>;
  dataDirInfo: DataDirInfo | null;
  onUpdateSettings: (updates: Partial<OfficeSettings>) => Promise<{ success: boolean; error?: string }>;
  onCreateListItem: (item: Omit<ConfigurableListItem, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string }>;
  onUpdateListItem: (id: number, listType: ConfigurableListType, updates: Partial<ConfigurableListItem>) => Promise<{ success: boolean; error?: string }>;
  onDeleteListItem: (id: number, listType: ConfigurableListType) => Promise<{ success: boolean; message?: string }>;
  onResetList: (listType: ConfigurableListType) => Promise<{ success: boolean; error?: string }>;
  onRefreshDataDir: () => void;
}

type SettingsTab = 'office' | 'security' | 'backups' | 'audit' | 'storage' | 'lists' | 'deadlines';

const listTypeLabels: Record<ConfigurableListType, { label: string; desc: string }> = {
  courts: { label: 'المحاكم والهيئات القضائية', desc: 'المحاكم الجزئية، الابتدائية، الاستئناف، النقض، ومجلس الدولة' },
  case_types: { label: 'أنواع القضايا والدعاوى', desc: 'مدني، جنح، جنايات، أسرة، عمالي، إداري، وغيرها' },
  adjournment_reasons: { label: 'أسباب التأجيل الجاهزة', desc: 'أسباب التأجيل الشائعة المستخدمة في رول الجلسات' },
  task_categories: { label: 'تصنيفات المهام والمأموريات', desc: 'مأموريات المحاكم والنيابة والشهر العقاري والأعمال الإدارية' },
  transaction_types: { label: 'أنواع الحركات المالية', desc: 'أتعاب، رسوم قضائية، مصاريف، دمغات، وأمانات خبراء' },
  announcement_types: { label: 'أنواع الإعلانات القضائية', desc: 'صحف الدعاوى، إعلانات بالحضور، إنذارات رسمية، وإعلانات الأحكام والطعون' },
};

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  lists,
  dataDirInfo,
  onUpdateSettings,
  onCreateListItem,
  onUpdateListItem,
  onDeleteListItem,
  onResetList,
  onRefreshDataDir,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('office');

  // Form states for Office Settings
  const [officeForm, setOfficeForm] = useState<Partial<OfficeSettings>>(settings || {});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Form states for Configurable Lists
  const [selectedListType, setSelectedListType] = useState<ConfigurableListType>('courts');
  const [newItemName, setNewItemName] = useState('');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingItemName, setEditingItemName] = useState('');
  const [listSearch, setListSearch] = useState('');

  // Storage Relocation states
  const [relocating, setRelocating] = useState(false);
  const [storageStatus, setStorageStatus] = useState<{ message: string; isError?: boolean } | null>(null);

  // Sync form when settings prop changes
  React.useEffect(() => {
    if (settings) {
      setOfficeForm(settings);
    }
  }, [settings]);

  // Handle office settings save
  const handleSaveOfficeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('جاري الحفظ...');
    const res = await onUpdateSettings(officeForm);
    if (res.success) {
      setSaveStatus('تم حفظ البيانات بنجاح!');
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveStatus(`خطأ: ${res.error || 'تعذر الحفظ'}`);
    }
  };

  // Handle logo pick
  const handlePickLogo = async () => {
    try {
      const res = await window.electronAPI.selectLogoFile();
      if (!res.canceled && res.filePath) {
        setOfficeForm((prev) => ({ ...prev, logo_path: res.filePath }));
        setSaveStatus('تم تحديث الشعار بنجاح!');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (err: any) {
      alert(`خطأ أثناء اختيار الشعار: ${err?.message}`);
    }
  };

  // Handle open folder
  const handleOpenFolder = async () => {
    const res = await window.electronAPI.openDataDir();
    if (!res.success) {
      alert(`تعذر فتح المجلد: ${res.error}`);
    }
  };

  // Handle relocate folder
  const handleRelocateFolder = async () => {
    try {
      const pickRes = await window.electronAPI.selectNewDataDir();
      if (pickRes.canceled || !pickRes.selectedPath) {
        return;
      }

      const confirm = window.confirm(
        `هل أنت متأكد من رغبتك في نقل مجلد البيانات وقاعدة البيانات إلى المسار التالي:\n\n${pickRes.selectedPath}\\LawOfficeData\n\nسيتم نسخ جميع الملفات بأمان وتحديث التخزين.`
      );

      if (!confirm) return;

      setRelocating(true);
      setStorageStatus({ message: 'جاري نقل الملفات وتحديث قاعدة البيانات...' });

      const res = await window.electronAPI.relocateDataDir(pickRes.selectedPath);
      setRelocating(false);

      if (res.success) {
        setStorageStatus({ message: 'تم نقل مجلد البيانات بنجاح!' });
        onRefreshDataDir();
      } else {
        setStorageStatus({ message: `فشل النقل: ${res.error}`, isError: true });
      }
    } catch (err: any) {
      setRelocating(false);
      setStorageStatus({ message: `خطأ: ${err?.message}`, isError: true });
    }
  };

  // Handle Add Item to List
  const handleAddListItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const res = await onCreateListItem({
      list_type: selectedListType,
      name: newItemName.trim(),
      sort_order: (lists[selectedListType]?.length || 0) + 1,
      is_active: 1,
      is_default: 0,
    });

    if (res.success) {
      setNewItemName('');
    } else {
      alert(res.error || 'تعذر إضافة العنصر');
    }
  };

  // Handle Edit Item
  const handleSaveEditItem = async (item: ConfigurableListItem) => {
    if (!editingItemName.trim()) return;
    const res = await onUpdateListItem(item.id, selectedListType, {
      name: editingItemName.trim(),
    });
    if (res.success) {
      setEditingItemId(null);
      setEditingItemName('');
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async (item: ConfigurableListItem) => {
    await onUpdateListItem(item.id, selectedListType, {
      is_active: item.is_active === 1 ? 0 : 1,
    });
  };

  // Handle Delete Item
  const handleDeleteItem = async (item: ConfigurableListItem) => {
    const confirm = window.confirm(`هل أنت متأكد من حذف "${item.name}" من القائمة؟`);
    if (!confirm) return;

    const res = await onDeleteListItem(item.id, selectedListType);
    if (!res.success) {
      alert(res.message || 'تعذر الحذف');
    }
  };

  // Handle Reset to Defaults
  const handleResetList = async () => {
    const confirm = window.confirm(
      `هل أنت متأكد من استعادة القيم الافتراضية لقائمة "${listTypeLabels[selectedListType].label}" من SPEC.md؟ سيتم إعادة ضبط القائمة.`
    );
    if (!confirm) return;

    const res = await onResetList(selectedListType);
    if (!res.success) {
      alert(res.error || 'تعذر استعادة الافتراضيات');
    }
  };

  const currentListItems = (lists[selectedListType] || []).filter((item) =>
    item.name.toLowerCase().includes(listSearch.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Settings Navigation Pills */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        <button
          onClick={() => setActiveTab('office')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'office'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>بيانات المكتب والترويسة</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'security'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>الأمان وقفل البرنامج</span>
        </button>

        <button
          onClick={() => setActiveTab('backups')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'backups'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>النسخ الاحتياطي والاستعادة</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل التدقيق والتغييرات</span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'storage'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>مجلد البيانات والتخزين المحلي</span>
        </button>

        <button
          onClick={() => setActiveTab('lists')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'lists'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>إدارة القوائم القابلة للتعديل</span>
        </button>

        <button
          onClick={() => setActiveTab('deadlines')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'deadlines'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>المواعيد القانونية والتنبيهات</span>
        </button>
      </div>

      {/* TAB 1: Office Settings */}
      {activeTab === 'office' && (
        <form onSubmit={handleSaveOfficeSettings} className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">بيانات المكتب والمحامي المسؤول</h3>
                <p className="text-xs text-slate-500">تظهر هذه البيانات في ترويسة التقارير الرسمية، كشوف الحساب، والإيصالات</p>
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>

            {saveStatus && (
              <div className={`p-3 mb-6 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                saveStatus.includes('خطأ') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                <Check className="w-4 h-4" />
                <span>{saveStatus}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Office Name */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المكتب / العنوان التجاري *</label>
                <input
                  type="text"
                  required
                  value={officeForm.office_name || ''}
                  onChange={(e) => setOfficeForm({ ...officeForm, office_name: e.target.value })}
                  placeholder="مثال: مكتب الأستاذ فلان المحامي بالنقض"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>

              {/* Logo Upload Box */}
              <div className="row-span-2 flex flex-col justify-between p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                <div>
                  <span className="block text-xs font-bold text-slate-700 mb-1">شعار المكتب (Logo)</span>
                  <p className="text-[11px] text-slate-500 mb-3">يُطبع في منتصف أو أعلى الترويسة الرسمية للتقارير</p>
                </div>
                
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-slate-200 mb-3 min-h-[90px]">
                  {officeForm.logo_path ? (
                    <div className="text-center">
                      <span className="text-xs font-bold text-emerald-600 block mb-1">✓ الشعار محدد</span>
                      <span className="text-[11px] text-slate-400 truncate max-w-[150px] block">{officeForm.logo_path}</span>
                    </div>
                  ) : (
                    <div className="text-3xl text-slate-400">⚖️</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handlePickLogo}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{officeForm.logo_path ? 'تغيير الشعار' : 'رفع صورة الشعار'}</span>
                </button>
              </div>

              {/* Lawyer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المحامي المسؤول *</label>
                <input
                  type="text"
                  required
                  value={officeForm.lawyer_name || ''}
                  onChange={(e) => setOfficeForm({ ...officeForm, lawyer_name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>

              {/* Title / Degree */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الصفة والدرجة القضائية</label>
                <input
                  type="text"
                  value={officeForm.title || ''}
                  onChange={(e) => setOfficeForm({ ...officeForm, title: e.target.value })}
                  placeholder="مثال: محامٍ بالنقض والدستورية العليا"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Phone 1 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الهاتف الأساسي *</label>
                <input
                  type="text"
                  required
                  value={officeForm.phone || ''}
                  onChange={(e) => setOfficeForm({ ...officeForm, phone: e.target.value })}
                  placeholder="010..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Phone 2 / WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">هاتف إضافي / واتساب</label>
                <input
                  type="text"
                  value={officeForm.phone2 || ''}
                  onChange={(e) => setOfficeForm({ ...officeForm, phone2: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={officeForm.email || ''}
                  onChange={(e) => setOfficeForm({ ...officeForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Bar Registration Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم القيد بنقابة المحامين</label>
                <input
                  type="text"
                  value={officeForm.bar_registration_number || ''}
                  onChange={(e) => setOfficeForm({ ...officeForm, bar_registration_number: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Tax Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم البطاقة الضريبية</label>
                <input
                  type="text"
                  value={officeForm.tax_number || ''}
                  onChange={(e) => setOfficeForm({ ...officeForm, tax_number: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Full Address */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان المكتب التفصيلي</label>
                <input
                  type="text"
                  value={officeForm.address || ''}
                  onChange={(e) => setOfficeForm({ ...officeForm, address: e.target.value })}
                  placeholder="الشارع، العمارة، الدور، المدينة، المحافظة"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Footer quote / Notes */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">عبارة تذييل الترويسة / الملاحظات المطبوعة</label>
                <textarea
                  rows={2}
                  value={officeForm.notes || ''}
                  onChange={(e) => setOfficeForm({ ...officeForm, notes: e.target.value })}
                  placeholder="مثال: المحاماة رسالة الدفاع عن الحق والعدل وسيادة القانون"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB: Security & Password Lock */}
      {activeTab === 'security' && <SecuritySettingsTab />}

      {/* TAB: Backups & Restore */}
      {activeTab === 'backups' && <BackupSettingsTab />}

      {/* TAB: Audit Logs */}
      {activeTab === 'audit' && <AuditLogsTab />}

      {/* TAB 2: Storage & LawOfficeData */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">إدارة مجلد البيانات (LawOfficeData)</h3>
                <p className="text-xs text-slate-500">
                  وفقًا لقواعد البرنامج (RULES.md): جميع البيانات وقاعدة البيانات والمرفقات مخزنة داخل هذا المجلد حصراً
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenFolder}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors"
                >
                  <FolderOpen className="w-4 h-4 text-slate-600" />
                  <span>فتح المجلد</span>
                </button>

                <button
                  type="button"
                  disabled={relocating}
                  onClick={handleRelocateFolder}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>{relocating ? 'جاري النقل...' : 'نقل مجلد البيانات'}</span>
                </button>
              </div>
            </div>

            {storageStatus && (
              <div className={`p-3 mb-6 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                storageStatus.isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {storageStatus.isError ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                <span>{storageStatus.message}</span>
              </div>
            )}

            {/* Path details cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="block text-xs font-bold text-slate-500 mb-1">المسار الحالي لمجلد البيانات</span>
                <span className="text-sm font-bold text-slate-800 break-all dir-ltr text-right block font-mono">
                  {dataDirInfo?.currentPath || 'جاري التحميل...'}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="block text-xs font-bold text-slate-500 mb-1">ملف قاعدة البيانات (SQLite WAL)</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800 font-mono">office.db</span>
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                    {dataDirInfo ? `${(dataDirInfo.dbSizeBytes / 1024).toFixed(1)} KB` : '0 KB'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="block text-xs font-bold text-slate-500 mb-1">مجلد المرفقات (Attachments)</span>
                <span className="text-xs text-slate-700 break-all dir-ltr text-right block font-mono">
                  {dataDirInfo?.attachmentsPath || 'attachments/'}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">تُنسخ الملفات بروابط نسبية لضمان عملها عند النقل</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="block text-xs font-bold text-slate-500 mb-1">مجلد التصديرات (Exports / PDF)</span>
                <span className="text-xs text-slate-700 break-all dir-ltr text-right block font-mono">
                  {dataDirInfo?.exportsPath || 'exports/'}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">المكان الافتراضي لحفظ التقارير بصيغة PDF</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong>ملاحظة حول أمان البيانات:</strong> زرار <em>"نقل مجلد البيانات"</em> يتيح لك اختيار مسار آخر (مثل بارتيشن D:\ أو قرص خارجي)،
                حيث يقوم البرنامج بنسخ قاعدة البيانات والمرفقات والتصديرات بالكامل وتحديث مسار التخزين وإعادة التشغيل بسلاسة تامة.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Configurable Lists */}
      {activeTab === 'lists' && (
        <div className="space-y-6">
          {/* List Type Selector Tabs */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(listTypeLabels) as ConfigurableListType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setSelectedListType(type);
                  setEditingItemId(null);
                  setListSearch('');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  selectedListType === type
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {listTypeLabels[type].label} ({lists[type]?.length || 0})
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-100 gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {listTypeLabels[selectedListType].label}
                </h3>
                <p className="text-xs text-slate-500">{listTypeLabels[selectedListType].desc}</p>
              </div>

              <button
                type="button"
                onClick={handleResetList}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors self-start sm:self-auto"
                title="إعادة ضبط القائمة إلى القيم الافتراضية المحددة في SPEC.md"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                <span>استعادة الافتراضيات</span>
              </button>
            </div>

            {/* Add New Item Form & Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <form onSubmit={handleAddListItem} className="md:col-span-2 flex items-center gap-2">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={`إضافة اسم جديد إلى ${listTypeLabels[selectedListType].label}...`}
                  className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={!newItemName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </form>

              <div>
                <input
                  type="text"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="بحث في القائمة..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">الاسم / البيان</th>
                    <th className="py-2.5 px-4 w-28 text-center">الحالة</th>
                    <th className="py-2.5 px-4 w-32 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentListItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        لا توجد عناصر مطابقة
                      </td>
                    </tr>
                  ) : (
                    currentListItems.map((item, idx) => {
                      const isEditing = editingItemId === item.id;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            item.is_active === 0 ? 'opacity-50 bg-slate-50/50' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 text-center text-xs font-semibold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingItemName}
                                  onChange={(e) => setEditingItemName(e.target.value)}
                                  className="px-2.5 py-1 text-sm bg-white border border-amber-500 rounded focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditItem(item)}
                                  className="p-1 text-emerald-600 hover:text-emerald-800"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItemId(null)}
                                  className="text-xs text-slate-500 hover:text-slate-700"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <span>{item.name}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(item)}
                              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                                item.is_active === 1
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                            >
                              {item.is_active === 1 ? 'مفعل' : 'معطّل'}
                            </button>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditingItemName(item.name);
                                }}
                                title="تعديل الاسم"
                                className="p-1 text-slate-500 hover:text-amber-600 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item)}
                                title="حذف نهائي"
                                className="p-1 text-slate-500 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Deadlines & Alerts */}
      {activeTab === 'deadlines' && (
        <form onSubmit={handleSaveOfficeSettings} className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">حاسبة مواعيد الطعن القانونية والتنبيهات</h3>
                <p className="text-xs text-slate-500">
                  وفقًا لـ SPEC.md: جميع المواعيد قابلة للتعديل من الإعدادات تحسبًا لأي تعديلات تشريعية في القوانين الإجرائية
                </p>
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ميعاد الاستئناف المدني (يوم)</label>
                <input
                  type="number"
                  min={1}
                  value={officeForm.appeal_deadline_civil ?? 40}
                  onChange={(e) => setOfficeForm({ ...officeForm, appeal_deadline_civil: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">افتراضي: 40 يومًا من تاريخ صدور الحكم</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ميعاد استئناف الجنح (يوم)</label>
                <input
                  type="number"
                  min={1}
                  value={officeForm.appeal_deadline_misdemeanor ?? 10}
                  onChange={(e) => setOfficeForm({ ...officeForm, appeal_deadline_misdemeanor: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">افتراضي: 10 أيام من تاريخ النطق أو الإعلان</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ميعاد الطعن بالنقض (يوم)</label>
                <input
                  type="number"
                  min={1}
                  value={officeForm.appeal_deadline_cassation ?? 60}
                  onChange={(e) => setOfficeForm({ ...officeForm, appeal_deadline_cassation: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">افتراضي: 60 يومًا</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ميعاد استئناف القضاء المستعجل (يوم)</label>
                <input
                  type="number"
                  min={1}
                  value={officeForm.appeal_deadline_urgent ?? 15}
                  onChange={(e) => setOfficeForm({ ...officeForm, appeal_deadline_urgent: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">افتراضي: 15 يومًا للأحكام المستعجلة</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ميعاد استئناف محاكم الأسرة (يوم)</label>
                <input
                  type="number"
                  min={1}
                  value={officeForm.appeal_deadline_family ?? 40}
                  onChange={(e) => setOfficeForm({ ...officeForm, appeal_deadline_family: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">افتراضي: 40 يومًا</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الطعن أمام الإدارية العليا (مجلس الدولة) (يوم)</label>
                <input
                  type="number"
                  min={1}
                  value={officeForm.appeal_deadline_admin ?? 60}
                  onChange={(e) => setOfficeForm({ ...officeForm, appeal_deadline_admin: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">افتراضي: 60 يومًا</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">التنبيه المسبق قبل انتهاء الميعاد (أيام)</label>
                <input
                  type="number"
                  min={1}
                  value={officeForm.alert_days_before ?? 3}
                  onChange={(e) => setOfficeForm({ ...officeForm, alert_days_before: parseInt(e.target.value) || 1 })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">تنبيه في لوحة اليوم قبل انتهاء الميعاد</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">تنبيه الإعلانات المعلقة قبل الجلسة (أيام)</label>
                <input
                  type="number"
                  min={1}
                  value={officeForm.announcement_warning_days ?? 3}
                  onChange={(e) => setOfficeForm({ ...officeForm, announcement_warning_days: parseInt(e.target.value) || 1 })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">تنبيه أحمر للجلسات التي لم ترد إعلاناتها</span>
              </div>
            </div>

            {/* iCalendar (.ics) Export & Privacy Settings (Phase 11) */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>إعدادات تصدير التقويم ووضع الخصوصية (iCalendar .ics)</span>
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                تخصيص الخصوصية والتنبيهات المضمنة في ملفات .ics عند تصديرها واستيرادها إلى تقويم Google أو تطبيقات الهواتف الذكية.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(officeForm.calendar_privacy_mode ?? 1)}
                      onChange={(e) => setOfficeForm({ ...officeForm, calendar_privacy_mode: e.target.checked ? 1 : 0 })}
                      className="w-5 h-5 text-emerald-600 rounded-sm focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">تفعيل "وضع الخصوصية" افتراضيًا</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        يحجب أسماء الموكلين والخصوم من ملف التقويم لمنع تسربها عند المزامنة مع خوادم خارجية
                      </span>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    تنبيهات المواعيد المضمنة في التقويم (VALARM)
                  </label>
                  <input
                    type="text"
                    value={officeForm.calendar_alarm_triggers || '1d,1h'}
                    onChange={(e) => setOfficeForm({ ...officeForm, calendar_alarm_triggers: e.target.value })}
                    placeholder="مثال: 1d,1h (يوم قبل وساعة قبل)"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    الصيغة: 1d (يوم قبل)، 1h (ساعة قبل)، أو بالدقائق مفصولة بفواصل
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>تنويه قانوني هام:</strong> حساب مواعيد الطعن داخل البرنامج هو إجراء استرشادي لمساعدة الأستاذ المحامي في متابعة أعماله،
              وليس بديلًا عن فحص أوراق الحكم ومواعيد الإعلان القانونية وفقًا لقانون المرافعات والإجراءات الجنائية المصري.
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
