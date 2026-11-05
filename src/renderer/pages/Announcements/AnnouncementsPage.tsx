import React, { useState, useMemo } from 'react';
import {
  Send,
  Printer,
  Search,
  Filter,
  Building,
  Calendar,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Coins
} from 'lucide-react';
import {
  CaseAnnouncement,
  OfficeSettings,
  AnnouncementStatus,
  AnnouncementFilter
} from '../../../shared/types';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { generateAnnouncementsReportHtml } from '../../services/announcementsReportGenerator';

interface AnnouncementsPageProps {
  settings: OfficeSettings | null;
  onNavigateToCase?: (caseId: number) => void;
}

export const AnnouncementsPage: React.FC<AnnouncementsPageProps> = ({
  settings,
  onNavigateToCase
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('pending_only');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOffice, setSelectedOffice] = useState<string>('الكل');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Active filter payload
  const activeFilter: AnnouncementFilter = useMemo(() => {
    const f: AnnouncementFilter = {};
    if (filterStatus === 'pending_only') {
      f.status = 'pending_only';
    } else if (filterStatus !== 'all') {
      f.status = filterStatus as AnnouncementStatus;
    }
    if (selectedOffice !== 'الكل') {
      f.bailiff_office = selectedOffice;
    }
    if (searchQuery.trim()) {
      f.query = searchQuery.trim();
    }
    if (startDate) {
      f.startDate = startDate;
    }
    if (endDate) {
      f.endDate = endDate;
    }
    return f;
  }, [filterStatus, selectedOffice, searchQuery, startDate, endDate]);

  const {
    announcements,
    loading,
    error,
    updateAnnouncement,
    deleteAnnouncement,
    createReattemptAnnouncement,
    refreshAnnouncements
  } = useAnnouncements(undefined, activeFilter);

  // Distinct bailiff offices for filter
  const officesList = useMemo(() => {
    const set = new Set<string>();
    announcements.forEach(a => {
      if (a.bailiff_office && a.bailiff_office.trim()) {
        set.add(a.bailiff_office.trim());
      }
    });
    return Array.from(set);
  }, [announcements]);

  // Modal states for quick outcome and reattempt
  const [statusModalItem, setStatusModalItem] = useState<CaseAnnouncement | null>(null);
  const [statusForm, setStatusForm] = useState<{
    status: AnnouncementStatus;
    return_date: string;
    bailiff_name: string;
    failure_reason: string;
    notes: string;
  }>({
    status: 'أُعلن',
    return_date: new Date().toISOString().split('T')[0],
    bailiff_name: '',
    failure_reason: '',
    notes: ''
  });

  const [reattemptModalItem, setReattemptModalItem] = useState<CaseAnnouncement | null>(null);
  const [reattemptForm, setReattemptForm] = useState<{
    delivery_date: string;
    bailiff_office: string;
    request_number: string;
    fee_amount: number;
    notes: string;
  }>({
    delivery_date: new Date().toISOString().split('T')[0],
    bailiff_office: '',
    request_number: '',
    fee_amount: 0,
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenStatusModal = (ann: CaseAnnouncement) => {
    setStatusModalItem(ann);
    setStatusForm({
      status: ann.status === 'قيد الانتظار' ? 'أُعلن' : ann.status,
      return_date: ann.return_date || new Date().toISOString().split('T')[0],
      bailiff_name: ann.bailiff_name || '',
      failure_reason: ann.failure_reason || '',
      notes: ann.notes || ''
    });
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalItem) return;

    try {
      setIsSubmitting(true);
      await updateAnnouncement(statusModalItem.id, {
        status: statusForm.status,
        return_date: statusForm.return_date || null,
        bailiff_name: statusForm.bailiff_name.trim() || null,
        failure_reason: statusForm.status === 'لم يُعلن' || statusForm.status === 'ورد بدون نتيجة' ? statusForm.failure_reason.trim() : null,
        notes: statusForm.notes.trim() || null
      });
      setStatusModalItem(null);
    } catch (err: any) {
      alert(err?.message || 'فشل تحديث نتيجة الإعلان');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReattemptModal = (ann: CaseAnnouncement) => {
    setReattemptModalItem(ann);
    setReattemptForm({
      delivery_date: new Date().toISOString().split('T')[0],
      bailiff_office: ann.bailiff_office || '',
      request_number: '',
      fee_amount: 0,
      notes: `إعادة إعلان بناء على المحاولة #${ann.attempt_number}`
    });
  };

  const handleSaveReattempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reattemptModalItem) return;

    try {
      setIsSubmitting(true);
      const feePiasters = Math.round((Number(reattemptForm.fee_amount) || 0) * 100);

      await createReattemptAnnouncement(reattemptModalItem.id, {
        case_id: reattemptModalItem.case_id,
        hearing_id: reattemptModalItem.hearing_id,
        recipient_name: reattemptModalItem.recipient_name,
        recipient_capacity: reattemptModalItem.recipient_capacity,
        recipient_address: reattemptModalItem.recipient_address,
        announcement_type: reattemptModalItem.announcement_type.includes('إعادة')
          ? reattemptModalItem.announcement_type
          : `إعادة إعلان (${reattemptModalItem.announcement_type})`,
        bailiff_office: reattemptForm.bailiff_office.trim() || null,
        request_number: reattemptForm.request_number.trim() || null,
        delivery_date: reattemptForm.delivery_date || null,
        fee_amount: feePiasters,
        notes: reattemptForm.notes.trim() || null,
        status: 'قيد الانتظار'
      });
      setReattemptModalItem(null);
    } catch (err: any) {
      alert(err?.message || 'فشل إضافة إعادة الإعلان');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (ann: CaseAnnouncement) => {
    const confirmMsg = ann.fee_amount > 0
      ? `هل أنت متأكد من حذف الإعلان #${ann.id}؟\nتنبيه: سيتم إلغاء رسم الإعلان بقيد مالي عكسي.`
      : `هل أنت متأكد من حذف الإعلان #${ann.id}؟`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteAnnouncement(ann.id);
    } catch (err: any) {
      alert(err?.message || 'فشل حذف الإعلان');
    }
  };

  const handlePrint = async () => {
    if (!settings) return;
    try {
      const title = filterStatus === 'pending_only' ? 'كشف الإعلانات القضائية المعلقة' : 'كشف الإعلانات القضائية والمحضرين';
      const html = generateAnnouncementsReportHtml(settings, announcements, title);
      await window.electronAPI.showPrintPreview(html);
    } catch (err) {
      console.error('Print preview error:', err);
    }
  };

  const getStatusBadge = (status: AnnouncementStatus) => {
    switch (status) {
      case 'أُعلن':
      case 'ورد':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'جهة إدارة':
      case 'مخاطبة مع شخص آخر':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'لم يُعلن':
      case 'ورد بدون نتيجة':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'قيد الانتظار':
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header and Print action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Send className="w-6 h-6 text-amber-600" />
            <span>متابعة الإعلانات القضائية وأقلام المحضرين</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            متابعة مركزية لجميع الإعلانات المسلمة لأقلام المحضرين بمختلف القضايا والجلسات، ومراقبة الورود والنتائج.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            disabled={announcements.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs" data-testid="announcements.main.handle-print"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة كشف الإعلانات</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick status tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-bold">
            <button
              onClick={() => setFilterStatus('pending_only')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterStatus === 'pending_only' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`} data-testid="announcements.main.set-filter-status"
            >
              المعلقة فقط (قيد الانتظار / لم تعلن)
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterStatus === 'all' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`} data-testid="announcements.main.set-filter-status-2"
            >
              جميع الحالات
            </button>
            <button
              onClick={() => setFilterStatus('أُعلن')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterStatus === 'أُعلن' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`} data-testid="announcements.main.set-filter-status-3"
            >
              أُعلنت بنجاح
            </button>
          </div>

          {/* Search query input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الدعوى، المطلوب إعلانه، القلم، رقم القيد..."
              className="w-full pl-3 pr-9 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500" data-testid="announcements.main.set-search-query"
            />
          </div>

          {/* Office filter */}
          {officesList.length > 0 && (
            <div className="min-w-[150px]">
              <select
                value={selectedOffice}
                onChange={(e) => setSelectedOffice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700" data-testid="announcements.main.set-selected-office"
              >
                <option value="الكل">كل أقلام المحضرين</option>
                {officesList.map((off, idx) => (
                  <option key={idx} value={off}>{off}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>من:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-xs" data-testid="announcements.main.set-start-date"
            />
            <span>إلى:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-xs" data-testid="announcements.main.set-end-date"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">جاري تحميل بيانات الإعلانات...</div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Send className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">لا توجد إعلانات مطابقة لمعايير البحث الحالية</h4>
            <p className="text-xs text-slate-400">
              يمكنك تجربة تغيير شروط التصفية أو اختيار "جميع الحالات" للاطلاع على كامل السجل.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="p-3 text-center w-12">م</th>
                  <th className="p-3">القضية</th>
                  <th className="p-3">المطلوب إعلانه</th>
                  <th className="p-3">نوع الإعلان والقلم</th>
                  <th className="p-3">رقم القيد والتسليم</th>
                  <th className="p-3">الجلسة المرتبطة</th>
                  <th className="p-3 text-center">الحالة والنتيجة</th>
                  <th className="p-3 text-center">الرسم</th>
                  <th className="p-3 text-center w-36">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {announcements.map((ann, idx) => {
                  const isPending = ['قيد الانتظار', 'لم يُعلن', 'ورد بدون نتيجة'].includes(ann.status);

                  return (
                    <tr key={ann.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>

                      <td className="p-3">
                        {onNavigateToCase ? (
                          <button
                            onClick={() => onNavigateToCase(ann.case_id)}
                            className="font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 group" data-testid="announcements.main.on-navigate-to-case"
                          >
                            <span>{ann.case_number ? `${ann.case_number}` : (ann.case_title || `قضية #${ann.case_id}`)}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ) : (
                          <span className="font-bold text-slate-800">{ann.case_number || ann.case_title}</span>
                        )}
                        <div className="text-[11px] text-slate-500 mt-0.5">{ann.court_name || '-'}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-800">{ann.recipient_name}</div>
                        {ann.recipient_capacity && (
                          <div className="text-[11px] text-slate-500">{ann.recipient_capacity}</div>
                        )}
                        {ann.recipient_address && (
                          <div className="text-[10px] text-slate-400 line-clamp-1" title={ann.recipient_address}>
                            {ann.recipient_address}
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-800">
                          {ann.announcement_type}
                          {ann.attempt_number > 1 && (
                            <span className="mr-1 px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-700">
                              م{ann.attempt_number}
                            </span>
                          )}
                        </div>
                        {ann.bailiff_office && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{ann.bailiff_office}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        {ann.request_number ? (
                          <div className="font-mono font-bold text-slate-700">قيد: {ann.request_number}</div>
                        ) : (
                          <div className="text-slate-400 text-[11px]">-</div>
                        )}
                        {ann.delivery_date && (
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            سُلّم: {ann.delivery_date}
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        {ann.hearing_date ? (
                          <div className="font-mono font-bold text-slate-700 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{ann.hearing_date}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">غير مربوطة</span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-block ${getStatusBadge(ann.status)}`}>
                          {ann.status}
                        </span>
                        {ann.return_date && (
                          <div className="text-[10px] text-slate-500 font-mono mt-1">
                            ورد: {ann.return_date}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        {ann.fee_amount > 0 ? (
                          <span className="font-bold text-emerald-700 font-mono">
                            {(ann.fee_amount / 100).toFixed(2)} ج.م
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenStatusModal(ann)}
                            className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded border border-slate-300 text-[11px]"
                            title="تسجيل نتيجة وورود الإعلان" data-testid="announcements.main.handle-open-status-modal"
                          >
                            النتيجة
                          </button>

                          {(ann.status === 'لم يُعلن' || ann.status === 'ورد بدون نتيجة' || ann.status === 'جهة إدارة') && (
                            <button
                              onClick={() => handleOpenReattemptModal(ann)}
                              className="p-1 text-amber-700 hover:bg-amber-100 rounded"
                              title="إضافة إعادة إعلان" data-testid="announcements.main.handle-open-reattempt-modal"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(ann)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="حذف" data-testid="announcements.main.handle-delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Outcome Modal */}
      {statusModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h4 className="font-bold text-sm text-slate-800">
                تسجيل نتيجة الإعلان (#{statusModalItem.id})
              </h4>
              <button
                onClick={() => setStatusModalItem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold" data-testid="announcements.main.set-status-modal-item"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">النتيجة / الحالة</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as AnnouncementStatus })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold" data-testid="announcements.main.set-status-form"
                >
                  <option value="أُعلن">أُعلن (تم الإعلان مع الشخص نفسه)</option>
                  <option value="مخاطبة مع شخص آخر">مخاطبة مع شخص آخر (تابع / قريب / شريك)</option>
                  <option value="جهة إدارة">جهة إدارة (إخطار مسجل بعلم الوصول)</option>
                  <option value="ورد">ورد</option>
                  <option value="لم يُعلن">لم يُعلن (لعدم الاستدلال أو غلق أو رفض)</option>
                  <option value="ورد بدون نتيجة">ورد بدون نتيجة</option>
                  <option value="قيد الانتظار">قيد الانتظار (لم يرد بعد)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الورود</label>
                  <input
                    type="date"
                    value={statusForm.return_date}
                    onChange={(e) => setStatusForm({ ...statusForm, return_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono" data-testid="announcements.main.set-status-form-2"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم المحضر</label>
                  <input
                    type="text"
                    value={statusForm.bailiff_name}
                    onChange={(e) => setStatusForm({ ...statusForm, bailiff_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg" data-testid="announcements.main.set-status-form-3"
                  />
                </div>
              </div>

              {(statusForm.status === 'لم يُعلن' || statusForm.status === 'ورد بدون نتيجة') && (
                <div>
                  <label className="block text-red-700 font-bold mb-1">سبب عدم الإعلان</label>
                  <textarea
                    rows={2}
                    value={statusForm.failure_reason}
                    onChange={(e) => setStatusForm({ ...statusForm, failure_reason: e.target.value })}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg bg-red-50/50"
                    required data-testid="announcements.main.set-status-form-4"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none" data-testid="announcements.main.set-status-form-5"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStatusModalItem(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold" data-testid="announcements.main.set-status-modal-item-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50" data-testid="announcements.main.button-13"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ النتيجة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reattempt Modal */}
      {reattemptModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h4 className="font-bold text-sm text-slate-800">
                إضافة إعادة إعلان (محاولة جديدة مرتبطة بـ #{reattemptModalItem.id})
              </h4>
              <button
                onClick={() => setReattemptModalItem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold" data-testid="announcements.main.set-reattempt-modal-item"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReattempt} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">
                <div>المطلوب إعلانه: <strong>{reattemptModalItem.recipient_name}</strong></div>
                <div>الدعوى: <span>{reattemptModalItem.case_number || reattemptModalItem.case_title}</span></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">قلم المحضرين</label>
                  <input
                    type="text"
                    value={reattemptForm.bailiff_office}
                    onChange={(e) => setReattemptForm({ ...reattemptForm, bailiff_office: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg" data-testid="announcements.main.set-reattempt-form"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الطلب الجديد</label>
                  <input
                    type="text"
                    value={reattemptForm.request_number}
                    onChange={(e) => setReattemptForm({ ...reattemptForm, request_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono" data-testid="announcements.main.set-reattempt-form-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ التسليم</label>
                  <input
                    type="date"
                    value={reattemptForm.delivery_date}
                    onChange={(e) => setReattemptForm({ ...reattemptForm, delivery_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono" data-testid="announcements.main.set-reattempt-form-3"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رسم الإعادة (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={reattemptForm.fee_amount}
                    onChange={(e) => setReattemptForm({ ...reattemptForm, fee_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold" data-testid="announcements.main.set-reattempt-form-4"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات المحاولة</label>
                <textarea
                  rows={2}
                  value={reattemptForm.notes}
                  onChange={(e) => setReattemptForm({ ...reattemptForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none" data-testid="announcements.main.set-reattempt-form-5"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReattemptModalItem(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold" data-testid="announcements.main.set-reattempt-modal-item-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50" data-testid="announcements.main.button-16"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ إعادة الإعلان'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
