import React, { useState } from 'react';
import {
  Send,
  Plus,
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Edit2,
  Scale,
  Building,
  RotateCcw,
  Coins,
  ChevronDown,
  ChevronUp,
  User,
  Info
} from 'lucide-react';
import {
  CaseDetails,
  CaseAnnouncement,
  OfficeSettings,
  AnnouncementStatus,
  CreateAnnouncementInput,
  UpdateAnnouncementInput
} from '../../../../shared/types';
import { useAnnouncements } from '../../../hooks/useAnnouncements';
import { useHearings } from '../../../hooks/useHearings';
import { generateAnnouncementsReportHtml } from '../../../services/announcementsReportGenerator';

interface CaseAnnouncementsTabProps {
  caseData: CaseDetails;
  settings: OfficeSettings;
  onCaseUpdated?: () => void;
}

export const CaseAnnouncementsTab: React.FC<CaseAnnouncementsTabProps> = ({
  caseData,
  settings,
  onCaseUpdated
}) => {
  const {
    announcements,
    loading,
    error,
    createAnnouncement,
    updateAnnouncement,
    createReattemptAnnouncement,
    deleteAnnouncement,
    refreshAnnouncements
  } = useAnnouncements(caseData.id);

  const { hearings = [] } = useHearings(caseData.id);
  const safeHearings = hearings || [];

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isReattemptModalOpen, setIsReattemptModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<CaseAnnouncement | null>(null);

  // Close modals on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setIsStatusModalOpen(false);
        setIsReattemptModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Form states
  const [addForm, setAddForm] = useState<{
    hearing_id: number | '';
    recipient_type: 'party' | 'free';
    recipient_name: string;
    recipient_capacity: string;
    recipient_address: string;
    announcement_type: string;
    bailiff_office: string;
    request_number: string;
    bailiff_name: string;
    delivery_date: string;
    fee_amount: number; // in EGP
    notes: string;
  }>({
    hearing_id: '',
    recipient_type: 'party',
    recipient_name: '',
    recipient_capacity: '',
    recipient_address: '',
    announcement_type: 'صحيفة دعوى',
    bailiff_office: '',
    request_number: '',
    bailiff_name: '',
    delivery_date: new Date().toISOString().split('T')[0],
    fee_amount: 0,
    notes: ''
  });

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

  const [reattemptForm, setReattemptForm] = useState<{
    hearing_id: number | '';
    delivery_date: string;
    bailiff_office: string;
    request_number: string;
    fee_amount: number; // in EGP
    notes: string;
  }>({
    hearing_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    bailiff_office: '',
    request_number: '',
    fee_amount: 0,
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Collect case parties for quick select
  const opponents = caseData.opponents || [];
  const clients = caseData.clients || [];

  const handleOpenAddModal = () => {
    // Default recipient to first opponent if available
    let defName = '';
    let defCap = 'المدعى عليه';
    let defAddr = '';

    if (opponents.length > 0) {
      defName = opponents[0].name || '';
      defCap = opponents[0].role_capacity || (opponents[0] as any).capacity || 'المدعى عليه';
      defAddr = opponents[0].address || '';
    } else if (clients.length > 0) {
      defName = clients[0].client_name || (clients[0] as any).name || '';
      defCap = clients[0].role_capacity || (clients[0] as any).capacity || 'الموكل';
      defAddr = (clients[0] as any).address || '';
    }

    setAddForm({
      hearing_id: (safeHearings.length > 0 ? safeHearings[0].id : '') as number | '',
      recipient_type: 'party',
      recipient_name: defName,
      recipient_capacity: defCap,
      recipient_address: defAddr,
      announcement_type: 'صحيفة دعوى',
      bailiff_office: '',
      request_number: '',
      bailiff_name: '',
      delivery_date: new Date().toISOString().split('T')[0],
      fee_amount: 0,
      notes: ''
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSelectParty = (name: string) => {
    const opp = opponents.find(o => o.name === name);
    if (opp) {
      setAddForm(prev => ({
        ...prev,
        recipient_name: opp.name,
        recipient_capacity: opp.role_capacity || (opp as any).capacity || 'خصم',
        recipient_address: opp.address || ''
      }));
      return;
    }

    const cl = clients.find(c => (c.client_name || (c as any).name) === name);
    if (cl) {
      setAddForm(prev => ({
        ...prev,
        recipient_name: cl.client_name || (cl as any).name || '',
        recipient_capacity: cl.role_capacity || (cl as any).capacity || 'موكل',
        recipient_address: (cl as any).address || ''
      }));
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.recipient_name.trim()) {
      setFormError('يرجى تحديد أو إدخال المطلوب إعلانه');
      return;
    }
    if (!addForm.announcement_type.trim()) {
      setFormError('يرجى اختيار نوع الإعلان');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const feePiasters = Math.round((Number(addForm.fee_amount) || 0) * 100);

      await createAnnouncement({
        case_id: caseData.id,
        hearing_id: addForm.hearing_id ? Number(addForm.hearing_id) : null,
        recipient_name: addForm.recipient_name.trim(),
        recipient_capacity: addForm.recipient_capacity.trim(),
        recipient_address: addForm.recipient_address.trim() || null,
        announcement_type: addForm.announcement_type.trim(),
        bailiff_office: addForm.bailiff_office.trim() || null,
        request_number: addForm.request_number.trim() || null,
        bailiff_name: addForm.bailiff_name.trim() || null,
        delivery_date: addForm.delivery_date || null,
        fee_amount: feePiasters,
        notes: addForm.notes.trim() || null,
        status: 'قيد الانتظار'
      });

      setIsAddModalOpen(false);
      if (onCaseUpdated) onCaseUpdated();
    } catch (err: any) {
      setFormError(err?.message || 'حدث خطأ أثناء إضافة الإعلان');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenStatusModal = (ann: CaseAnnouncement) => {
    setSelectedAnnouncement(ann);
    setStatusForm({
      status: ann.status === 'قيد الانتظار' ? 'أُعلن' : ann.status,
      return_date: ann.return_date || new Date().toISOString().split('T')[0],
      bailiff_name: ann.bailiff_name || '',
      failure_reason: ann.failure_reason || '',
      notes: ann.notes || ''
    });
    setFormError(null);
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnnouncement) return;

    try {
      setSubmitting(true);
      setFormError(null);

      await updateAnnouncement(selectedAnnouncement.id, {
        status: statusForm.status,
        return_date: statusForm.return_date || null,
        bailiff_name: statusForm.bailiff_name.trim() || null,
        failure_reason: statusForm.status === 'لم يُعلن' || statusForm.status === 'ورد بدون نتيجة' ? statusForm.failure_reason.trim() : null,
        notes: statusForm.notes.trim() || null
      });

      setIsStatusModalOpen(false);
      setSelectedAnnouncement(null);
      if (onCaseUpdated) onCaseUpdated();
    } catch (err: any) {
      setFormError(err?.message || 'حدث خطأ أثناء تحديث حالة الإعلان');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReattemptModal = (ann: CaseAnnouncement) => {
    setSelectedAnnouncement(ann);
    setReattemptForm({
      hearing_id: ann.hearing_id || (safeHearings.length > 0 ? safeHearings[0].id : ''),
      delivery_date: new Date().toISOString().split('T')[0],
      bailiff_office: ann.bailiff_office || '',
      request_number: '',
      fee_amount: 0,
      notes: `إعادة إعلان بناءً على المحاولة #${ann.attempt_number} (النتيجة: ${ann.status})`
    });
    setFormError(null);
    setIsReattemptModalOpen(true);
  };

  const handleCreateReattempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnnouncement) return;

    try {
      setSubmitting(true);
      setFormError(null);

      const feePiasters = Math.round((Number(reattemptForm.fee_amount) || 0) * 100);

      await createReattemptAnnouncement(selectedAnnouncement.id, {
        case_id: caseData.id,
        hearing_id: reattemptForm.hearing_id ? Number(reattemptForm.hearing_id) : null,
        recipient_name: selectedAnnouncement.recipient_name,
        recipient_capacity: selectedAnnouncement.recipient_capacity,
        recipient_address: selectedAnnouncement.recipient_address,
        announcement_type: selectedAnnouncement.announcement_type.includes('إعادة')
          ? selectedAnnouncement.announcement_type
          : `إعادة إعلان (${selectedAnnouncement.announcement_type})`,
        bailiff_office: reattemptForm.bailiff_office.trim() || null,
        request_number: reattemptForm.request_number.trim() || null,
        delivery_date: reattemptForm.delivery_date || null,
        fee_amount: feePiasters,
        notes: reattemptForm.notes.trim() || null,
        status: 'قيد الانتظار'
      });

      setIsReattemptModalOpen(false);
      setSelectedAnnouncement(null);
      if (onCaseUpdated) onCaseUpdated();
    } catch (err: any) {
      setFormError(err?.message || 'حدث خطأ أثناء إضافة إعادة الإعلان');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ann: CaseAnnouncement) => {
    const confirmMsg = ann.fee_amount > 0
      ? `هل أنت متأكد من حذف الإعلان رقم #${ann.id}؟\nتنبيه: سيتم إلغاء رسم الإعلان (${(ann.fee_amount / 100).toFixed(2)} ج.م) بقيد مالي عكسي حفاظاً على سلامة الحسابات.`
      : `هل أنت متأكد من حذف الإعلان رقم #${ann.id}؟`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteAnnouncement(ann.id);
      if (onCaseUpdated) onCaseUpdated();
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const handlePrint = async () => {
    try {
      const html = generateAnnouncementsReportHtml(
        settings,
        announcements,
        `كشف إعلانات القضية رقم ${caseData.case_number} لسنة ${caseData.case_year}`
      );
      await window.electronAPI.showPrintPreview(html);
    } catch (err) {
      console.error('Print preview error:', err);
    }
  };

  // Group announcements by parent/chain
  const rootAnnouncements = announcements.filter(a => !a.parent_id);
  const getAttempts = (rootId: number) => {
    return announcements.filter(a => a.parent_id === rootId);
  };

  const getStatusBadgeClass = (status: AnnouncementStatus) => {
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
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Send className="w-4 h-4 text-amber-600" />
            <span>سجل الإعلانات القضائية وأقلام المحضرين</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            متابعة تسليم وورود الإعلانات المرتبطة بالجلسات، وسجل إعادة الإعلان والرسوم المقيدة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {announcements.length > 0 && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-300"
              title="طباعة كشف إعلانات القضية" data-testid="case.announcements.tab.handle-print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الكشف</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs" data-testid="case.announcements.tab.handle-open-add-modal"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة إعلان جديد</span>
          </button>
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">جاري تحميل سجل الإعلانات...</div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Send className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700 mb-1">لا توجد إعلانات مسجلة لهذه القضية حتى الآن</h4>
          <p className="text-xs text-slate-400 mb-4">
            يمكنك تسجيل صحف الدعاوى والإعلانات بالحضور وإعلانات الأحكام والطعون ومتابعة نتيجتها من قلم المحضرين.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors" data-testid="case.announcements.tab.handle-open-add-modal-2"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل أول إعلان</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rootAnnouncements.map((root) => {
            const reattempts = getAttempts(root.id);
            const allInChain = [root, ...reattempts];
            const latestStatus = allInChain[allInChain.length - 1].status;
            const canReattempt = latestStatus === 'لم يُعلن' || latestStatus === 'ورد بدون نتيجة' || latestStatus === 'جهة إدارة';

            return (
              <div key={root.id} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Root Announcement Item */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-sm">
                      #{root.id}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-sm">{root.announcement_type}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusBadgeClass(root.status)}`}>
                          {root.status}
                        </span>
                        {root.attempt_number > 1 && (
                          <span className="px-2 py-0.5 rounded text-xs bg-slate-200 text-slate-700 font-semibold">
                            محاولة {root.attempt_number}
                          </span>
                        )}
                        {root.hearing_date && (
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" />
                            جلسة {root.hearing_date}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-2">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-400">المطلوب إعلانه:</span>
                          <span className="font-bold text-slate-700">{root.recipient_name}</span>
                          {root.recipient_capacity && <span className="text-slate-500">({root.recipient_capacity})</span>}
                        </div>

                        {root.bailiff_office && (
                          <div className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-400">قلم المحضرين:</span>
                            <span className="font-medium text-slate-700">{root.bailiff_office}</span>
                          </div>
                        )}

                        {root.request_number && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">رقم القيد/الطلب:</span>
                            <span className="font-mono font-medium text-slate-700">{root.request_number}</span>
                          </div>
                        )}
                      </div>

                      {root.recipient_address && (
                        <div className="text-xs text-slate-500 mt-1">
                          <span className="text-slate-400">العنوان: </span>
                          <span>{root.recipient_address}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2 font-mono">
                        {root.delivery_date && (
                          <span>تاريخ التسليم: <strong className="text-slate-700">{root.delivery_date}</strong></span>
                        )}
                        {root.return_date && (
                          <span>تاريخ الورود: <strong className="text-slate-700">{root.return_date}</strong></span>
                        )}
                        {root.bailiff_name && (
                          <span>المحضر: <strong className="text-slate-700">{root.bailiff_name}</strong></span>
                        )}
                        {root.fee_amount > 0 && (
                          <span className="text-emerald-700 font-bold">
                            الرسم: {(root.fee_amount / 100).toFixed(2)} ج.م (مقيد بحركة مالية)
                          </span>
                        )}
                      </div>

                      {root.failure_reason && (
                        <div className="mt-2 text-xs bg-red-50 text-red-700 p-2 rounded border border-red-200">
                          <strong>سبب عدم الإعلان: </strong> {root.failure_reason}
                        </div>
                      )}

                      {root.notes && (
                        <div className="mt-1 text-xs text-slate-500 italic">
                          ملاحظات: {root.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for Root */}
                  <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                    <button
                      onClick={() => handleOpenStatusModal(root)}
                      className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition-colors"
                      title="تسجيل نتيجة وورود الإعلان" data-testid="case.announcements.tab.handle-open-status-modal"
                    >
                      تسجيل النتيجة
                    </button>

                    <button
                      onClick={() => handleDelete(root)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="حذف الإعلان" data-testid="case.announcements.tab.handle-delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-attempts (سجل المحاولات / إعادة الإعلان) */}
                {reattempts.length > 0 && (
                  <div className="p-4 bg-white space-y-3">
                    <h5 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      <span>سجل المحاولات وإعادة الإعلان ({reattempts.length}):</span>
                    </h5>

                    <div className="space-y-2 border-r-2 border-amber-300 pr-3 mr-2">
                      {reattempts.map((att) => (
                        <div key={att.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800">
                                محاولة رقم {att.attempt_number}: {att.announcement_type}
                              </span>
                              <span className={`px-2 py-0.2 rounded text-[11px] font-bold border ${getStatusBadgeClass(att.status)}`}>
                                {att.status}
                              </span>
                              {att.delivery_date && (
                                <span className="text-slate-500 font-mono">
                                  بتاريخ: {att.delivery_date}
                                </span>
                              )}
                              {att.return_date && (
                                <span className="text-slate-500 font-mono">
                                  وردت: {att.return_date}
                                </span>
                              )}
                              {att.fee_amount > 0 && (
                                <span className="text-emerald-700 font-bold">
                                  رسم: {(att.fee_amount / 100).toFixed(2)} ج.م
                                </span>
                              )}
                            </div>

                            {att.failure_reason && (
                              <div className="mt-1 text-red-700 bg-red-50 p-1.5 rounded">
                                <strong>السبب:</strong> {att.failure_reason}
                              </div>
                            )}

                            {att.notes && (
                              <div className="mt-1 text-slate-500 italic">
                                {att.notes}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0 self-end md:self-center">
                            <button
                              onClick={() => handleOpenStatusModal(att)}
                              className="px-2 py-0.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200" data-testid="case.announcements.tab.handle-open-status-modal-2"
                            >
                              تسجيل النتيجة
                            </button>
                            <button
                              onClick={() => handleDelete(att)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded" data-testid="case.announcements.tab.handle-delete-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reattempt Trigger Button if failure or admin notification */}
                {canReattempt && (
                  <div className="p-3 bg-amber-50/50 border-t border-amber-100 flex items-center justify-between">
                    <span className="text-xs text-amber-800 flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      لم يكتمل الإعلان بنجاح في آخر محاولة. يمكنك إضافة "إعادة إعلان" كمحاولة جديدة.
                    </span>
                    <button
                      onClick={() => handleOpenReattemptModal(allInChain[allInChain.length - 1])}
                      className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition-colors shadow-xs" data-testid="case.announcements.tab.handle-open-reattempt-modal"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إضافة إعادة إعلان</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Add New Announcement */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-600" />
                <h4 className="font-bold text-sm text-slate-800">إضافة إعلان قضائي جديد</h4>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold" data-testid="case.announcements.tab.set-is-add-modal-open"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 font-semibold">
                  {formError}
                </div>
              )}

              {/* Hearing Link */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  الجلسة المرتبطة (يُنصح بالربط للتنبيه التلقائي)
                </label>
                <select
                  value={addForm.hearing_id}
                  onChange={(e) => setAddForm({ ...addForm, hearing_id: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono" data-testid="case.announcements.tab.set-add-form"
                >
                  <option value="">-- بدون ربط بجلسة محددة --</option>
                  {safeHearings.map((h) => (
                    <option key={h.id} value={h.id}>
                      جلسة {h.hearing_date} ({h.status}) - {h.court_decision ? h.court_decision.slice(0, 30) : 'محددة'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Source Selection */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">المطلوب إعلانه</label>
                <div className="flex items-center gap-4 mb-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={addForm.recipient_type === 'party'}
                      onChange={() => setAddForm({ ...addForm, recipient_type: 'party' })} data-testid="case.announcements.tab.set-add-form-3"
                    />
                    <span>من أطراف القضية (خصم / موكل)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={addForm.recipient_type === 'free'}
                      onChange={() => setAddForm({ ...addForm, recipient_type: 'free' })} data-testid="case.announcements.tab.set-add-form-4"
                    />
                    <span>اسم حر جديد</span>
                  </label>
                </div>

                {addForm.recipient_type === 'party' ? (
                  <select
                    value={addForm.recipient_name}
                    onChange={(e) => handleSelectParty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold" data-testid="case.announcements.tab.handle-select-party"
                  >
                    <option value="">-- اختر من أطراف القضية --</option>
                    {opponents.length > 0 && (
                      <optgroup label="الخصوم">
                        {opponents.map((o) => (
                          <option key={`opp-${o.id}`} value={o.name}>
                            {o.name} ({o.role_capacity || (o as any).capacity || 'خصم'})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {clients.length > 0 && (
                      <optgroup label="الموكلون">
                        {clients.map((c) => {
                          const clientDisplayName = c.client_name || (c as any).name || '';
                          return (
                            <option key={`cl-${c.id}`} value={clientDisplayName}>
                              {clientDisplayName} ({c.role_capacity || (c as any).capacity || 'موكل'})
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={addForm.recipient_name}
                    onChange={(e) => setAddForm({ ...addForm, recipient_name: e.target.value })}
                    placeholder="اسم المطلوب إعلانه..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                    required data-testid="case.announcements.tab.set-add-form-5"
                  />
                )}
              </div>

              {/* Capacity and Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الصفة في الإعلان</label>
                  <input
                    type="text"
                    value={addForm.recipient_capacity}
                    onChange={(e) => setAddForm({ ...addForm, recipient_capacity: e.target.value })}
                    placeholder="مثال: المدعى عليه الأول"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg" data-testid="case.announcements.tab.set-add-form-6"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع الإعلان</label>
                  <select
                    value={addForm.announcement_type}
                    onChange={(e) => setAddForm({ ...addForm, announcement_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold" data-testid="case.announcements.tab.set-add-form-2"
                  >
                    <option value="صحيفة دعوى">صحيفة دعوى</option>
                    <option value="إعلان بالحضور">إعلان بالحضور</option>
                    <option value="إعادة إعلان">إعادة إعلان</option>
                    <option value="إعلان حكم">إعلان حكم</option>
                    <option value="إعلان سند تنفيذي">إعلان سند تنفيذي</option>
                    <option value="إنذار رسمي على يد محضر">إنذار رسمي على يد محضر</option>
                    <option value="إعلان طعن بالاستئناف">إعلان طعن بالاستئناف</option>
                    <option value="إعلان طعن بالنقض">إعلان طعن بالنقض</option>
                    <option value="إعلان إدخال ضامن">إعلان إدخال ضامن</option>
                    <option value="إعلان طلبات عارضة">إعلان طلبات عارضة</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان المطلوب إعلانه</label>
                <input
                  type="text"
                  value={addForm.recipient_address}
                  onChange={(e) => setAddForm({ ...addForm, recipient_address: e.target.value })}
                  placeholder="العنوان التفصيلي للإعلان..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg" data-testid="case.announcements.tab.set-add-form-7"
                />
              </div>

              {/* Bailiff details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">قلم المحضرين</label>
                  <input
                    type="text"
                    value={addForm.bailiff_office}
                    onChange={(e) => setAddForm({ ...addForm, bailiff_office: e.target.value })}
                    placeholder="محضرين قسم..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg" data-testid="case.announcements.tab.set-add-form-8"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الطلب / القيد</label>
                  <input
                    type="text"
                    value={addForm.request_number}
                    onChange={(e) => setAddForm({ ...addForm, request_number: e.target.value })}
                    placeholder="رقم القيد..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono" data-testid="case.announcements.tab.set-add-form-9"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم المحضر (إن وجد)</label>
                  <input
                    type="text"
                    value={addForm.bailiff_name}
                    onChange={(e) => setAddForm({ ...addForm, bailiff_name: e.target.value })}
                    placeholder="المحضر المختص..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg" data-testid="case.announcements.tab.set-add-form-bailiff-name"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ التسليم للقلم</label>
                  <input
                    type="date"
                    value={addForm.delivery_date}
                    onChange={(e) => setAddForm({ ...addForm, delivery_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono" data-testid="case.announcements.tab.set-add-form-10"
                  />
                </div>
              </div>

              {/* Fee in EGP */}
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <label className="block text-emerald-900 font-bold mb-1 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>رسم الإعلان المدفوع (بالجنيه المصري)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={addForm.fee_amount}
                  onChange={(e) => setAddForm({ ...addForm, fee_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-emerald-300 rounded-lg font-mono font-bold text-emerald-900 bg-white"
                  placeholder="0.00" data-testid="case.announcements.tab.set-add-form-11"
                />
                <span className="text-[11px] text-emerald-700 block mt-1">
                  * سيتم إنشاء حركة مالية منصرفة من نوع "رسوم قضائية - رسوم إعلان محضرين" مربوطة بالقضية تلقائياً.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="أي ملاحظات تخص الإعلان..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none" data-testid="case.announcements.tab.set-add-form-12"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold" data-testid="case.announcements.tab.set-is-add-modal-open-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50" data-testid="case.announcements.tab.button-14"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ الإعلان'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Outcome / Update Status */}
      {isStatusModalOpen && selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <h4 className="font-bold text-sm text-slate-800">
                  تسجيل نتيجة الإعلان (#{selectedAnnouncement.id})
                </h4>
              </div>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold" data-testid="case.announcements.tab.set-is-status-modal-open"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">النتيجة / الحالة</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as AnnouncementStatus })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold" data-testid="case.announcements.tab.set-status-form"
                >
                  <option value="أُعلن">أُعلن (تم الإعلان مع الشخص نفسه)</option>
                  <option value="مخاطبة مع شخص آخر">مخاطبة مع شخص آخر (تابع / قريب / شريك)</option>
                  <option value="جهة إدارة">جهة إدارة (إخطار مسجل بعلم الوصول)</option>
                  <option value="ورد">ورد</option>
                  <option value="لم يُعلن">لم يُعلن (لعدم الاستدلال أو خطأ بالعنوان أو غلق)</option>
                  <option value="ورد بدون نتيجة">ورد بدون نتيجة</option>
                  <option value="قيد الانتظار">قيد الانتظار (لم يرد بعد)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الورود من القلم</label>
                  <input
                    type="date"
                    value={statusForm.return_date}
                    onChange={(e) => setStatusForm({ ...statusForm, return_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono" data-testid="case.announcements.tab.set-status-form-2"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم المحضر القائم بالإعلان</label>
                  <input
                    type="text"
                    value={statusForm.bailiff_name}
                    onChange={(e) => setStatusForm({ ...statusForm, bailiff_name: e.target.value })}
                    placeholder="اسم المحضر..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg" data-testid="case.announcements.tab.set-status-form-3"
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
                    placeholder="مثال: لعدم الاستدلال على العنوان، أو العقار مغلق، أو رفض الاستلام..."
                    className="w-full px-3 py-2 border border-red-300 rounded-lg bg-red-50/50"
                    required data-testid="case.announcements.tab.set-status-form-4"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات على النتيجة</label>
                <textarea
                  rows={2}
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                  placeholder="ملاحظات المحضر أو تفاصيل الإعلان..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none" data-testid="case.announcements.tab.set-status-form-5"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold" data-testid="case.announcements.tab.set-is-status-modal-open-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50" data-testid="case.announcements.tab.button-18"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ النتيجة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Reattempt Announcement */}
      {isReattemptModalOpen && selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-600" />
                <h4 className="font-bold text-sm text-slate-800">
                  إعادة إعلان (محاولة جديدة مرتبطة بالإعلان #{selectedAnnouncement.id})
                </h4>
              </div>
              <button
                onClick={() => setIsReattemptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold" data-testid="case.announcements.tab.set-is-reattempt-modal-open"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReattempt} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 font-semibold">
                  {formError}
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 space-y-1">
                <div>المطلوب إعلانه: <strong>{selectedAnnouncement.recipient_name}</strong></div>
                <div>العنوان: <span>{selectedAnnouncement.recipient_address || 'غير محدد'}</span></div>
                <div>نوع الإعلان الأصلي: <span>{selectedAnnouncement.announcement_type}</span></div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الجلسة المرتبطة بالمحاولة الجديدة</label>
                <select
                  value={reattemptForm.hearing_id}
                  onChange={(e) => setReattemptForm({ ...reattemptForm, hearing_id: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono" data-testid="case.announcements.tab.set-reattempt-form"
                >
                  <option value="">-- بدون ربط بجلسة --</option>
                  {safeHearings.map((h) => (
                    <option key={h.id} value={h.id}>
                      جلسة {h.hearing_date} ({h.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">قلم المحضرين</label>
                  <input
                    type="text"
                    value={reattemptForm.bailiff_office}
                    onChange={(e) => setReattemptForm({ ...reattemptForm, bailiff_office: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg" data-testid="case.announcements.tab.set-reattempt-form-2"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الطلب الجديد</label>
                  <input
                    type="text"
                    value={reattemptForm.request_number}
                    onChange={(e) => setReattemptForm({ ...reattemptForm, request_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono" data-testid="case.announcements.tab.set-reattempt-form-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ تسليم الإعادة</label>
                  <input
                    type="date"
                    value={reattemptForm.delivery_date}
                    onChange={(e) => setReattemptForm({ ...reattemptForm, delivery_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono" data-testid="case.announcements.tab.set-reattempt-form-4"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رسم إعادة الإعلان (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={reattemptForm.fee_amount}
                    onChange={(e) => setReattemptForm({ ...reattemptForm, fee_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                    placeholder="0.00" data-testid="case.announcements.tab.set-reattempt-form-5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات المحاولة الجديدة</label>
                <textarea
                  rows={2}
                  value={reattemptForm.notes}
                  onChange={(e) => setReattemptForm({ ...reattemptForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none" data-testid="case.announcements.tab.set-reattempt-form-6"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsReattemptModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold" data-testid="case.announcements.tab.set-is-reattempt-modal-open-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50" data-testid="case.announcements.tab.button-22"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ إعادة الإعلان'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
