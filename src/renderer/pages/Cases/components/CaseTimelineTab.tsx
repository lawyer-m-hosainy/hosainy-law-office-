import React, { useState } from 'react';
import {
  History,
  FileText,
  Gavel,
  Coins,
  Shield,
  CheckSquare,
  StickyNote,
  Pin,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  Printer,
  ChevronDown,
  X,
} from 'lucide-react';
import { CaseDetails, OfficeSettings, CaseNote, CaseNoteCategory } from '../../../../shared/types';
import { useCaseNotesAndTimeline } from '../../../hooks/useCaseNotesAndTimeline';
import { ExportButton } from '../../../components/Common/ExportButton';
import { generateReportHtml } from '../../../services/reportGenerator';

interface CaseTimelineTabProps {
  caseData: CaseDetails;
  settings: OfficeSettings;
}

const NOTE_CATEGORIES: CaseNoteCategory[] = [
  'عامة',
  'قانونية',
  'إجرائية',
  'موكل',
  'تذكير',
  'خطة دفاع',
];

export const CaseTimelineTab: React.FC<CaseTimelineTabProps> = ({
  caseData,
  settings,
}) => {
  const {
    notes,
    timelineItems,
    timelineStats,
    loading,
    createNote,
    updateNote,
    deleteNote,
  } = useCaseNotesAndTimeline(caseData.id);

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CaseNote | null>(null);

  // New Note State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<CaseNoteCategory>('عامة');
  const [noteIsPinned, setNoteIsPinned] = useState(false);

  // Filtered timeline items
  const filteredTimeline = timelineItems.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.type === activeFilter;
  });

  // Handle Save Note
  const handleSaveNote = async () => {
    if (!noteTitle.trim()) {
      alert('يرجى إدخال عنوان الملاحظة');
      return;
    }

    if (editingNote) {
      await updateNote(editingNote.id, {
        title: noteTitle,
        content: noteContent,
        category: noteCategory,
        is_pinned: noteIsPinned ? 1 : 0,
      });
      setEditingNote(null);
    } else {
      await createNote({
        case_id: caseData.id,
        title: noteTitle,
        content: noteContent,
        category: noteCategory,
        is_pinned: noteIsPinned ? 1 : 0,
      });
    }

    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('عامة');
    setNoteIsPinned(false);
    setIsAddNoteModalOpen(false);
  };

  // Open Edit Note
  const handleOpenEdit = (n: CaseNote) => {
    setEditingNote(n);
    setNoteTitle(n.title);
    setNoteContent(n.content);
    setNoteCategory((n.category as CaseNoteCategory) || 'عامة');
    setNoteIsPinned(n.is_pinned === 1);
    setIsAddNoteModalOpen(true);
  };

  // Print Timeline
  const handlePrintTimeline = async () => {
    if (!settings) return;

    const tableHeaders = ['التاريخ', 'نوع الحدث', 'بيان الحدث', 'التفاصيل والقرارات'];
    const tableRows = filteredTimeline.map((item) => [
      item.date || '-',
      item.statusBadge || item.type,
      item.title,
      item.description || '-',
    ]);

    const htmlContent = generateReportHtml({
      settings,
      title: `السجل الزمني المتكامل لقضية ${caseData.case_number} لسنة ${caseData.case_year}`,
      subtitle: `محكمة: ${caseData.court_name} • الموكل: ${caseData.clients[0]?.client_name || '-'} • إجمالي الجلسات: ${timelineStats.totalHearings} • التأجيلات: ${timelineStats.adjournmentsCount}`,
      tableHeaders,
      tableRows,
      notes: `أكثر أسباب التأجيل: ${timelineStats.topAdjournmentReason} • متوسط الفترة بين الجلسات: ${timelineStats.avgDaysBetweenHearings} يوم. تم استخراج السجل الزمني التراكمي من قاعدة البيانات المحلية.`,
    });

    await window.electronAPI.executePrint({
      htmlContent,
      title: `سجل_قضية_${caseData.case_number}_${caseData.case_year}`,
      action: 'preview',
    });
  };

  // Export Data
  const exportHeaders = ['م', 'التاريخ', 'النوع', 'العنوان', 'التفاصيل', 'الشارة'];
  const exportRows = filteredTimeline.map((item, idx) => [
    idx + 1,
    item.date || '-',
    item.type,
    item.title,
    item.description || '-',
    item.statusBadge || '-',
  ]);

  return (
    <div className="space-y-6">
      {/* 1. Smart Hearing Statistics (SPEC.md requirement) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Gavel className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold">إجمالي الجلسات</span>
          </div>
          <span className="text-xl font-bold text-slate-900">
            {timelineStats.totalHearings} جلسة
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <History className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-semibold">عدد التأجيلات</span>
          </div>
          <span className="text-xl font-bold text-slate-900">
            {timelineStats.adjournmentsCount} تأجيل
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold">متوسط الفارق بين الجلسات</span>
          </div>
          <span className="text-xl font-bold text-slate-900">
            {timelineStats.avgDaysBetweenHearings > 0
              ? `${timelineStats.avgDaysBetweenHearings} يوم`
              : 'جلسة واحدة'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold">أكثر أسباب التأجيل</span>
          </div>
          <span className="text-xs font-bold text-slate-800 line-clamp-1" title={timelineStats.topAdjournmentReason}>
            {timelineStats.topAdjournmentReason}
          </span>
        </div>
      </div>

      {/* 2. Case Notes Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-sm text-slate-800">ملاحظات وخطة العمل في الدعوى</h3>
            <span className="text-xs text-slate-400">({notes.length} ملاحظة)</span>
          </div>

          <button
            onClick={() => {
              setEditingNote(null);
              setNoteTitle('');
              setNoteContent('');
              setNoteCategory('عامة');
              setNoteIsPinned(false);
              setIsAddNoteModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors" data-testid="case.timeline.tab.set-editing-note"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة ملاحظة</span>
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
            لم تسجل ملاحظات خاصة بهذه القضية بعد؛ يمكنك تدوين توجيهات الموكل، ثغرات الدفاع، أو خطة الجلسة القادمة هنا.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between space-y-2 transition-all ${
                  note.is_pinned === 1
                    ? 'bg-amber-50/60 border-amber-300 shadow-xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-50/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                      {note.category}
                    </span>
                    {note.is_pinned === 1 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        <Pin className="w-3 h-3 fill-amber-700" />
                        <span>مثبتة</span>
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{note.title}</h4>
                  <p className="text-slate-600 whitespace-pre-line mt-1 leading-relaxed">
                    {note.content}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-slate-400 text-[10px]">
                  <span>{note.created_at ? note.created_at.slice(0, 10) : ''}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(note)}
                      className="p-1 hover:text-slate-700"
                      title="تعديل الملاحظة" data-testid="case.timeline.tab.handle-open-edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
                          deleteNote(note.id);
                        }
                      }}
                      className="p-1 hover:text-rose-600"
                      title="حذف الملاحظة" data-testid="case.timeline.tab.onfirm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Unified Panoramic Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-800">
              السجل الزمني التراكمي للقضية (Unified Timeline)
            </h3>
            <span className="text-xs text-slate-400">({filteredTimeline.length} حدث)</span>
          </div>

          <div className="flex items-center gap-2">
            <ExportButton
              fileName={`سجل_قضية_${caseData.case_number}_${caseData.case_year}`}
              title={`السجل الزمني التراكمي لقضية رقم ${caseData.case_number} لسنة ${caseData.case_year}`}
              headers={exportHeaders}
              rows={exportRows}
              buttonLabel="تصدير السجل"
            />
            <button
              onClick={handlePrintTimeline}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors" data-testid="case.timeline.tab.handle-print-timeline"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة السجل</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
          {[
            { id: 'all', label: 'كافة الأحداث' },
            { id: 'hearing', label: 'الجلسات والقرارات' },
            { id: 'finance', label: 'الحركات المالية' },
            { id: 'execution', label: 'إجراءات التنفيذ' },
            { id: 'document', label: 'المستندات' },
            { id: 'task', label: 'المهام' },
            { id: 'note', label: 'الملاحظات' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setActiveFilter(pill.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                activeFilter === pill.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`} data-testid="case.timeline.tab.set-active-filter"
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Timeline Stream */}
        {filteredTimeline.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            لا توجد أحداث مسجلة في هذا التصنيف
          </div>
        ) : (
          <div className="relative pr-6 border-r-2 border-slate-200 space-y-6 pt-2 pb-2">
            {filteredTimeline.map((item) => {
              return (
                <div key={item.id} className="relative group">
                  {/* Timeline Dot Indicator */}
                  <div
                    className={`absolute -right-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                      item.type === 'filing'
                        ? 'bg-blue-600'
                        : item.type === 'hearing'
                        ? 'bg-amber-600'
                        : item.type === 'finance'
                        ? 'bg-emerald-600'
                        : item.type === 'execution'
                        ? 'bg-purple-600'
                        : item.type === 'document'
                        ? 'bg-sky-600'
                        : item.type === 'task'
                        ? 'bg-rose-600'
                        : 'bg-indigo-600'
                    }`}
                  />

                  {/* Card Content */}
                  <div className="bg-slate-50 hover:bg-slate-100/80 transition-colors p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                        {item.statusBadge && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                            {item.statusBadge}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.date}</span>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-slate-600 leading-relaxed font-medium">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Note Modal */}
      {isAddNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  {editingNote ? 'تعديل الملاحظة' : 'إضافة ملاحظة جديدة بالقضية'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddNoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600" data-testid="case.timeline.tab.set-is-add-note-modal-open"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان الملاحظة:
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="مثال: خطة المرافعة، تنبيه بشأن الشاهد، اتفاق مع الموكل..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-bold" data-testid="case.timeline.tab.set-note-title"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  التصنيف:
                </label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as CaseNoteCategory)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-semibold" data-testid="case.timeline.tab.set-note-category"
                >
                  {NOTE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نص الملاحظة:
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="اكتب تفاصيل الملاحظة هنا..."
                  rows={4}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 resize-none leading-relaxed" data-testid="case.timeline.tab.set-note-content"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={noteIsPinned}
                  onChange={(e) => setNoteIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300" data-testid="case.timeline.tab.set-note-is-pinned"
                />
                <span className="text-xs font-bold text-slate-700">
                  تثبيت الملاحظة في أعلى القائمة (ملاحظة هامة)
                </span>
              </label>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddNoteModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold" data-testid="case.timeline.tab.set-is-add-note-modal-open-2"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors" data-testid="case.timeline.tab.handle-save-note"
              >
                {editingNote ? 'حفظ التعديلات' : 'إضافة الملاحظة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
