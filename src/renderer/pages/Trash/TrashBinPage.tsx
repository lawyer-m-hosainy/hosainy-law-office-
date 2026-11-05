import React, { useState } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  FileText,
  Briefcase,
  Users,
  CheckSquare,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  X,
} from 'lucide-react';
import { useTrashBin } from '../../hooks/useTrashBin';
import { ExportButton } from '../../components/Common/ExportButton';

export const TrashBinPage: React.FC = () => {
  const { items, loading, loadTrash, restoreItem, deletePermanent, emptyAllTrash } = useTrashBin();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filter items
  const filteredItems = items.filter((item) => {
    if (selectedType !== 'all' && item.entityType !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDetails = item.details.toLowerCase().includes(q);
      if (!matchTitle && !matchDetails) return false;
    }
    return true;
  });

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="w-4 h-4 text-sky-600" />;
      case 'case':
        return <Briefcase className="w-4 h-4 text-amber-600" />;
      case 'client':
        return <Users className="w-4 h-4 text-blue-600" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-red-600" />;
      default:
        return <Trash2 className="w-4 h-4 text-slate-500" />;
    }
  };

  const getEntityBadge = (type: string) => {
    switch (type) {
      case 'document':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">مستند</span>;
      case 'case':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">قضية</span>;
      case 'client':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">موكل</span>;
      case 'task':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">مهمة</span>;
      default:
        return null;
    }
  };

  const handleRestore = async (entityType: string, entityId: number, title: string) => {
    const ok = await restoreItem(entityType, entityId);
    if (ok) {
      setStatusMessage(`تم استرجاع (${title}) بنجاح إلى سجله الأصلي!`);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleDeletePermanent = async (entityType: string, entityId: number, title: string) => {
    if (confirm(`تحذير نهائي: هل أنت متأكد من الحذف النهائي لـ (${title})؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذفه من القرص وقاعدة البيانات!`)) {
      const ok = await deletePermanent(entityType, entityId);
      if (ok) {
        setStatusMessage(`تم الحذف النهائي لـ (${title}) بنجاح.`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    }
  };

  const handleEmptyAll = async () => {
    if (items.length === 0) return;
    if (confirm(`تحذير شديد الأهمية: هل أنت متأكد من تفريغ سلة المحذوفات وحذف كافة العناصر (${items.length} عنصر) نهائياً من القرص؟`)) {
      const res = await emptyAllTrash();
      if (res.success) {
        setStatusMessage(`تم تفريغ سلة المحذوفات بنجاح وحذف ${res.count} عنصر نهائياً.`);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    }
  };

  // Export Data
  const exportHeaders = ['م', 'النوع', 'العنوان', 'التفاصيل', 'تاريخ النقل للسلة'];
  const exportRows = filteredItems.map((item, idx) => [
    idx + 1,
    item.entityType,
    item.title,
    item.details,
    item.deletedAt.slice(0, 19).replace('T', ' '),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header and Stats */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">سلة المحذوفات والأرشيف المسترجع</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              مركز إدارة واسترجاع المستندات المحذوفة، القضايا المؤرشفة، والموكلين قبل الحذف النهائي
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              fileName="سلة_المحذوفات"
              title="سجل عناصر سلة المحذوفات"
              headers={exportHeaders}
              rows={exportRows}
              buttonLabel="تصدير السلة"
            />

            <button
              onClick={handleEmptyAll}
              disabled={items.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              title="تفريغ كافة العناصر نهائياً من القرص" data-testid="trash.main.handle-empty-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>تفريغ السلة بالكامل</span>
            </button>

            <button
              onClick={loadTrash}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              title="تحديث" data-testid="trash.main.load-trash"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills and Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'all', label: 'الكل', count: items.length },
              { id: 'document', label: 'المستندات', count: items.filter((i) => i.entityType === 'document').length },
              { id: 'case', label: 'القضايا المؤرشفة', count: items.filter((i) => i.entityType === 'case').length },
              { id: 'client', label: 'الموكلين', count: items.filter((i) => i.entityType === 'client').length },
              { id: 'task', label: 'المهام الملغاة', count: items.filter((i) => i.entityType === 'task').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedType === tab.id
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`} data-testid="trash.main.set-selected-type"
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في سلة المحذوفات بالعنوان أو التفاصيل..."
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 font-semibold" data-testid="trash.main.set-search-query"
            />
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-700 hover:text-emerald-900" data-testid="trash.main.set-status-message">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Trash Items List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-semibold">
            جاري قراءة عناصر سلة المحذوفات...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Trash2 className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
            <h4 className="text-sm font-bold text-slate-700">سلة المحذوفات فارغة</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              لا توجد عناصر محذوفة أو مؤرشفة حالياً في النظام
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getEntityIcon(item.entityType)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getEntityBadge(item.entityType)}
                      <h4 className="font-bold text-sm text-slate-900 truncate">{item.title}</h4>
                    </div>
                    <p className="text-slate-500 font-medium truncate">{item.details}</p>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                      تاريخ النقل للسلة: {item.deletedAt.slice(0, 10)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRestore(item.entityType, item.entityId, item.title)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold border border-emerald-200 transition-colors"
                    title="استرجاع العنصر إلى مكانه الأصلي" data-testid="trash.main.handle-restore"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>استرجاع</span>
                  </button>

                  <button
                    onClick={() => handleDeletePermanent(item.entityType, item.entityId, item.title)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold border border-rose-200 transition-colors"
                    title="حذف نهائي لا رجعة فيه" data-testid="trash.main.handle-delete-permanent"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف نهائي</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
