import React, { useState } from 'react';
import {
  FileText,
  Upload,
  FolderOpen,
  ExternalLink,
  Trash2,
  RotateCcw,
  Edit2,
  Search,
  Printer,
  FileCheck,
  File,
  Image,
  FileCode,
  HardDrive,
  AlertTriangle,
  X,
  Plus,
} from 'lucide-react';
import { CaseDetails, OfficeSettings, CaseDocumentCategory, CaseDocument } from '../../../../shared/types';
import { useDocuments } from '../../../hooks/useDocuments';
import { ExportButton } from '../../../components/Common/ExportButton';
import { generateReportHtml } from '../../../services/reportGenerator';

interface CaseDocumentsTabProps {
  caseData: CaseDetails;
  settings: OfficeSettings;
  onCaseUpdated?: () => void;
}

const CATEGORIES: CaseDocumentCategory[] = [
  'عريضة دعوى',
  'توكيل قضايا',
  'إنذار رسمي',
  'تقرير خبير',
  'محضر شرطة',
  'حكم قضائي',
  'مستندات موكل',
  'مذكرات دفاع',
  'مستندات خصم',
  'إيصالات ورسوم',
  'أخرى',
];

export const CaseDocumentsTab: React.FC<CaseDocumentsTabProps> = ({
  caseData,
  settings,
}) => {
  const {
    documents,
    trashDocuments,
    loading,
    attachFiles,
    openDocument,
    showInFolder,
    updateDocument,
    moveToTrash,
    restoreDocument,
    deletePermanent,
  } = useDocuments(caseData.id);

  const [activeView, setActiveView] = useState<'active' | 'trash'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [attachCategory, setAttachCategory] = useState<CaseDocumentCategory>('عريضة دعوى');
  const [attachDescription, setAttachDescription] = useState('');
  const [editingDoc, setEditingDoc] = useState<CaseDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  // Filtered documents
  const currentList = activeView === 'active' ? documents : trashDocuments;
  const filteredDocs = currentList.filter((doc) => {
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchFile = doc.file_name.toLowerCase().includes(q);
      const matchDesc = (doc.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchFile && !matchDesc) return false;
    }
    return true;
  });

  // Calculate stats
  const totalSizeBytes = documents.reduce((sum, d) => sum + (d.file_size_bytes || 0), 0);
  const totalSizeMb = (totalSizeBytes / (1024 * 1024)).toFixed(2);

  // File icon helper
  const getFileIcon = (ext: string) => {
    const cleanExt = ext.replace('.', '').toLowerCase();
    if (['pdf'].includes(cleanExt)) {
      return <FileText className="w-5 h-5 text-red-600" />;
    }
    if (['doc', 'docx'].includes(cleanExt)) {
      return <FileCheck className="w-5 h-5 text-blue-600" />;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(cleanExt)) {
      return <Image className="w-5 h-5 text-purple-600" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(cleanExt)) {
      return <FileCode className="w-5 h-5 text-emerald-600" />;
    }
    return <File className="w-5 h-5 text-slate-500" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} م.ب`;
    }
    return `${Math.round(bytes / 1024)} ك.ب`;
  };

  // Attach submit
  const handleAttachSubmit = async () => {
    setIsAttachModalOpen(false);
    const res = await attachFiles(attachCategory, attachDescription);
    if (res.success) {
      setAttachDescription('');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (doc: CaseDocument) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditCategory(doc.category);
    setEditDescription(doc.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    await updateDocument(editingDoc.id, {
      title: editTitle,
      category: editCategory,
      description: editDescription,
    });
    setEditingDoc(null);
  };

  // Print Inventory Report
  const handlePrintInventory = async () => {
    if (!settings) return;

    try {
      setPrintStatus('جاري تجهيز تقرير المستندات...');

      const tableHeaders = ['م', 'عنوان المستند', 'التصنيف', 'اسم الملف', 'الحجم', 'تاريخ الإرفاق'];
      const tableRows = documents.map((doc, idx) => [
        idx + 1,
        doc.title,
        doc.category,
        doc.file_name,
        formatFileSize(doc.file_size_bytes),
        doc.created_at ? doc.created_at.slice(0, 10) : '-',
      ]);

      const htmlContent = generateReportHtml({
        settings,
        title: `حصر مستندات ومرفقات قضية ${caseData.case_number} لسنة ${caseData.case_year}`,
        subtitle: `محكمة: ${caseData.court_name} • الموكل: ${caseData.clients[0]?.client_name || '-'} • إجمالي المستندات: ${documents.length} ملف`,
        tableHeaders,
        tableRows,
        notes: `مجلد الحفظ المحلي: LawOfficeData/attachments/${caseData.id}/. جميع الملفات محفوظة بروابط نسبية مشفرة محلياً.`,
      });

      const res = await window.electronAPI.executePrint({
        htmlContent,
        title: `مستندات_قضية_${caseData.case_number}_${caseData.case_year}`,
        action: 'preview',
      });

      if (res.success) {
        setPrintStatus('تم فتح نافذة المعاينة والطباعة بنجاح!');
        setTimeout(() => setPrintStatus(null), 3000);
      } else {
        setPrintStatus(`خطأ: ${res.error}`);
      }
    } catch (err: any) {
      setPrintStatus(`خطأ: ${err?.message}`);
    }
  };

  // Prepare Export Data
  const exportHeaders = ['م', 'عنوان المستند', 'التصنيف', 'اسم الملف', 'الامتداد', 'الحجم (بايت)', 'تاريخ الإرفاق', 'الملاحظات'];
  const exportRows = documents.map((doc, idx) => [
    idx + 1,
    doc.title,
    doc.category,
    doc.file_name,
    doc.file_extension,
    doc.file_size_bytes,
    doc.created_at || '-',
    doc.description || '',
  ]);

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">المستندات النشطة</span>
            <span className="text-xl font-bold text-slate-900">{documents.length} ملف</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">إجمالي حجم المرفقات</span>
            <span className="text-xl font-bold text-slate-900">{totalSizeMb} ميغابايت</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">سلة المحذوفات</span>
            <span className="text-xl font-bold text-slate-900">{trashDocuments.length} ملف</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* View Toggles (Active vs Trash) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeView === 'active'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              المستندات الحالية ({documents.length})
            </button>
            <button
              onClick={() => setActiveView('trash')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeView === 'trash'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>سلة المحذوفات ({trashDocuments.length})</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {activeView === 'active' && (
              <>
                <button
                  onClick={() => setIsAttachModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>إرفاق مستندات</span>
                </button>

                <ExportButton
                  fileName={`مستندات_قضية_${caseData.case_number}_${caseData.case_year}`}
                  title={`حصر مستندات ومرفقات قضية رقم ${caseData.case_number} لسنة ${caseData.case_year}`}
                  headers={exportHeaders}
                  rows={exportRows}
                  buttonLabel="تصدير المستندات"
                />

                <button
                  onClick={handlePrintInventory}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors"
                  title="طباعة حصر المستندات"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الحصر</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في المستندات بالاسم أو التصنيف أو الملاحظات..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-56 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-amber-500 font-semibold"
          >
            <option value="all">كافة التصنيفات ({currentList.length})</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {printStatus && (
        <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold">
          {printStatus}
        </div>
      )}

      {/* Documents Grid / Table */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <h4 className="text-sm font-bold text-slate-700">
            {activeView === 'active' ? 'لا توجد مستندات مرفقة في القضية' : 'سلة المحذوفات فارغة'}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeView === 'active'
              ? 'يمكنك إرفاق ملفات PDF، مذكرات Word، صور التوكيلات، والمحاضر الرسمية لتخزينها محلياً بروابط نسبية آمنة'
              : 'المستندات التي يتم حذفها تُنقل أولاً إلى السلة ويمكن استرجاعها في أي وقت'}
          </p>
          {activeView === 'active' && (
            <button
              onClick={() => setIsAttachModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>إرفاق أول مستند</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs p-4 flex flex-col justify-between transition-all space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                  {getFileIcon(doc.file_extension)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      {doc.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatFileSize(doc.file_size_bytes)}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 truncate" title={doc.title}>
                    {doc.title}
                  </h4>
                  <p className="text-xs text-slate-400 truncate mt-0.5" title={doc.file_name}>
                    {doc.file_name}
                  </p>

                  {doc.description && (
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                      {doc.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer with Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[11px] text-slate-400 font-mono">
                  {doc.created_at ? doc.created_at.slice(0, 10) : ''}
                </span>

                <div className="flex items-center gap-1.5">
                  {activeView === 'active' ? (
                    <>
                      <button
                        onClick={() => openDocument(doc.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-bold transition-colors"
                        title="فتح الملف بالبرنامج الافتراضي على Windows"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>فتح</span>
                      </button>

                      <button
                        onClick={() => showInFolder(doc.id)}
                        className="p-1 hover:bg-slate-100 text-slate-600 rounded transition-colors"
                        title="عرض الملف في مجلد المستندات"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(doc)}
                        className="p-1 hover:bg-slate-100 text-slate-600 rounded transition-colors"
                        title="تعديل بيانات المستند"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => moveToTrash(doc.id)}
                        className="p-1 hover:bg-rose-50 text-rose-600 rounded transition-colors"
                        title="نقل إلى سلة المحذوفات"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => restoreDocument(doc.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-bold transition-colors"
                        title="استرجاع الملف من سلة المحذوفات"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>استرجاع</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من الحذف النهائي للمستند (${doc.title})؟ سيتم حذف الملف من القرص نهائياً!`)) {
                            deletePermanent(doc.id);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-bold transition-colors"
                        title="حذف نهائي لا يمكن الرجوع عنه"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف نهائي</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attach Modal */}
      {isAttachModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-800">إرفاق مستندات بالقضية</h3>
              </div>
              <button onClick={() => setIsAttachModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تصنيف المستندات:</label>
                <select
                  value={attachCategory}
                  onChange={(e) => setAttachCategory(e.target.value as CaseDocumentCategory)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-semibold"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف أو ملاحظات إضافية (اختياري):</label>
                <textarea
                  value={attachDescription}
                  onChange={(e) => setAttachDescription(e.target.value)}
                  placeholder="مثال: مذكرة دفاع الجلسة الأولى، توكيل رقم 123 لسنة 2026..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                <span>
                  عند الضغط على الزر أدناه، ستفتح نافذة لاختيار الملفات من حاسوبك؛ سيتم نسخها تلقائياً داخل مجلد البيانات المحلي وتخزينها بروابط نسبية.
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAttachModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAttachSubmit}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <FolderOpen className="w-4 h-4" />
                <span>اختيار الملفات ورفعها</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-800">تعديل بيانات المستند</h3>
              </div>
              <button onClick={() => setEditingDoc(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان المستند:</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">التصنيف:</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-semibold"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الملاحظات والوصف:</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
              >
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
