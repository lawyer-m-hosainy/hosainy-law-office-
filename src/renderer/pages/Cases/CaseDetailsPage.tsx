import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  ArrowRight,
  Printer,
  Edit2,
  Calendar,
  Gavel,
  Coins,
  FileCheck2,
  FileText,
  CheckSquare,
  History,
  Scale,
  Building,
  User,
  Users,
  Shield,
  Baby,
  Phone,
  MessageCircle,
  FileDown,
  Eye,
  Check,
  AlertCircle,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  CaseDetails,
  Client,
  ConfigurableListItem,
  CreateCaseInput,
  OfficeSettings,
} from '../../../shared/types';
import { useCases } from '../../hooks/useCases';
import { generateCaseSheetHtml } from '../../services/caseReportGenerator';
import { CaseHearingsTab } from './components/CaseHearingsTab';
import { CaseFinanceTab } from './components/CaseFinanceTab';

interface CaseDetailsPageProps {
  caseId: number;
  settings: OfficeSettings | null;
  courts: ConfigurableListItem[];
  caseTypes: ConfigurableListItem[];
  clients: Client[];
  onBack: () => void;
}

type CaseTab = 'basic' | 'hearings' | 'finance' | 'executions' | 'documents' | 'tasks' | 'timeline';

export const CaseDetailsPage: React.FC<CaseDetailsPageProps> = ({
  caseId,
  settings,
  courts,
  caseTypes,
  clients,
  onBack,
}) => {
  const { getCaseById, updateCase } = useCases();
  const [caseData, setCaseData] = useState<CaseDetails | null>(null);
  const [activeTab, setActiveTab] = useState<CaseTab>('basic');
  const [loading, setLoading] = useState(true);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<CreateCaseInput>>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadCase = async () => {
    setLoading(true);
    const data = await getCaseById(caseId);
    setCaseData(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCase();
  }, [caseId]);

  // Handle Quick Print / PDF of Case Details
  const handlePrintCaseSheet = async (action: 'preview' | 'print' | 'pdf') => {
    if (!caseData || !settings) return;

    try {
      setPrintStatus('جاري تجهيز تقرير القضية...');
      const htmlContent = generateCaseSheetHtml(caseData, settings);

      const res = await window.electronAPI.executePrint({
        htmlContent,
        title: `ملف_قضية_${caseData.case_number}_لسنة_${caseData.case_year}`,
        landscape: false,
        action,
        suggestedFileName: `ملف_قضية_${caseData.case_number}_${caseData.case_year}.pdf`,
      });

      if (res.success) {
        if (action === 'pdf' && res.pdfPath) {
          setPrintStatus(`تم حفظ ملف الـ PDF في: ${res.pdfPath}`);
        } else {
          setPrintStatus(action === 'print' ? 'تم إرسال أمر الطباعة بنجاح!' : 'تم فتح نافذة المعاينة!');
        }
        setTimeout(() => setPrintStatus(null), 4000);
      } else {
        setPrintStatus(`خطأ: ${res.error || 'تعذر إتمام العملية'}`);
      }
    } catch (err: any) {
      setPrintStatus(`خطأ: ${err?.message}`);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = () => {
    if (!caseData) return;
    setEditFormData({
      case_number: caseData.case_number,
      case_year: caseData.case_year,
      court_name: caseData.court_name,
      court_circuit: caseData.court_circuit || '',
      court_degree: caseData.court_degree,
      case_type: caseData.case_type,
      table_number: caseData.table_number || '',
      police_report_number: caseData.police_report_number || '',
      filing_date: caseData.filing_date || '',
      subject: caseData.subject,
      claims: caseData.claims || '',
      description: caseData.description || '',
      status: caseData.status,
      priority: caseData.priority,
      assigned_lawyer: caseData.assigned_lawyer || '',
      colleague_lawyers: caseData.colleague_lawyers || '',
      parent_case_id: caseData.parent_case_id,
      is_juvenile: caseData.is_juvenile,
      juvenile_name: caseData.juvenile_name || '',
      juvenile_age: caseData.juvenile_age || 15,
      juvenile_charge: caseData.juvenile_charge || '',
      guardian_name: caseData.guardian_name || '',
      guardian_relation: caseData.guardian_relation || 'أب',
      probation_officer: caseData.probation_officer || '',
      care_facility: caseData.care_facility || '',
      imposed_measures: caseData.imposed_measures || '',
      clients: caseData.clients.map((c) => ({
        client_id: c.client_id,
        role_capacity: c.role_capacity,
        is_primary: c.is_primary === 1,
      })),
      opponents: caseData.opponents.map((op) => ({
        name: op.name,
        role_capacity: op.role_capacity,
        national_id: op.national_id || '',
        phone: op.phone || '',
        address: op.address || '',
        lawyer_name: op.lawyer_name || '',
        lawyer_phone: op.lawyer_phone || '',
        notes: op.notes || '',
      })),
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData) return;

    setIsSaving(true);
    setEditError(null);

    const res = await updateCase(caseData.id, editFormData);
    setIsSaving(false);

    if (res.success && res.updated) {
      setCaseData(res.updated);
      setIsEditModalOpen(false);
    } else {
      setEditError(res.error || 'تعذر حفظ التعديلات');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        جاري تحميل بيانات القضية...
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">الملف غير موجود أو تم حذفه</h3>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold"
        >
          العودة لقائمة القضايا
        </button>
      </div>
    );
  }

  const tabs: { id: CaseTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: 'basic', label: '1. البيانات الأساسية', icon: Briefcase },
    { id: 'hearings', label: '2. الجلسات والتأجيلات', icon: Gavel },
    { id: 'finance', label: '3. المالية والحسابات', icon: Coins },
    { id: 'executions', label: '4. التنفيذات', icon: FileCheck2 },
    { id: 'documents', label: '5. المستندات والمرفقات', icon: FileText },
    { id: 'tasks', label: '6. المهام المرتبطة', icon: CheckSquare },
    { id: 'timeline', label: '7. السجل الزمني والملاحظات', icon: History },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation Bar with Back & Print Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="العودة لكل القضايا"
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">
                القضية رقم {caseData.case_number} لسنة {caseData.case_year}
              </h2>
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {caseData.status}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  caseData.priority === 'عاجلة'
                    ? 'bg-red-100 text-red-800'
                    : caseData.priority === 'مهمة'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {caseData.priority}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {caseData.court_name} {caseData.court_circuit ? `• الدائرة: ${caseData.court_circuit}` : ''} • الدرجة: {caseData.court_degree}
            </p>
          </div>
        </div>

        {/* Print & Edit Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Print Sheet Button */}
          <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-lg border border-amber-200">
            <button
              onClick={() => handlePrintCaseSheet('preview')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 rounded transition-colors"
              title="معاينة بيانات القضية قبل الطباعة"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>معاينة</span>
            </button>

            <button
              onClick={() => handlePrintCaseSheet('print')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors shadow-xs"
              title="طباعة مباشرة لبيانات القضية"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة بيانات القضية</span>
            </button>

            <button
              onClick={() => handlePrintCaseSheet('pdf')}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 rounded transition-colors"
              title="حفظ بيانات القضية كملف PDF رسمي"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>

          <button
            onClick={handleOpenEditModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>تعديل البيانات</span>
          </button>
        </div>
      </div>

      {printStatus && (
        <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{printStatus}</span>
        </div>
      )}

      {/* The 7 Tabs Bar */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: البيانات الأساسية (Active & Fully Operational in Phase 2) */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          {/* Main Details Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-600" />
                <span>بيانات القيد والمحكمة</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block mb-1">المحكمة:</span>
                  <span className="font-bold text-slate-800 text-sm block">{caseData.court_name}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block mb-1">الدائرة / القاعة:</span>
                  <span className="font-bold text-slate-800 text-sm block">
                    {caseData.court_circuit || 'غير محدد'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block mb-1">الدرجة القضائية:</span>
                  <span className="font-bold text-slate-800 text-sm block">{caseData.court_degree}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block mb-1">نوع الدعوى:</span>
                  <span className="font-bold text-slate-800 text-sm block">{caseData.case_type}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block mb-1">رقم الحصر / الجدول:</span>
                  <span className="font-bold text-slate-800 font-mono block">
                    {caseData.table_number || 'لا يوجد'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block mb-1">رقم المحضر / النيابة:</span>
                  <span className="font-bold text-slate-800 font-mono block">
                    {caseData.police_report_number || 'لا يوجد'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block mb-1">تاريخ القيد:</span>
                  <span className="font-bold text-slate-800 block">
                    {caseData.filing_date || 'غير مسجل'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block mb-1">المحامي المسؤول:</span>
                  <span className="font-bold text-slate-800 block">
                    {caseData.assigned_lawyer || settings?.lawyer_name}
                  </span>
                </div>
              </div>
            </div>

            {/* Subject and Claims */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block mb-1">موضوع الدعوى:</span>
                <p className="text-sm font-bold text-slate-900 leading-relaxed">{caseData.subject}</p>
              </div>

              {caseData.claims && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 block mb-1">الطلبات الختامية:</span>
                  <p className="text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                    {caseData.claims}
                  </p>
                </div>
              )}

              {caseData.description && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 block mb-1">الوصف المختصر والملاحظات:</span>
                  <p className="text-xs text-slate-700 leading-relaxed">{caseData.description}</p>
                </div>
              )}
            </div>

            {/* Linked Clients */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span>الموكلون في الدعوى ({caseData.clients.length})</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {caseData.clients.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{c.client_name}</span>
                        {c.is_primary === 1 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                            رئيسي
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 mt-1">
                        الصفة: <strong className="text-amber-700 font-bold">{c.role_capacity}</strong> • الهاتف: {c.client_phone || '-'}
                      </div>
                      {c.poa_number && (
                        <div className="text-[11px] text-slate-400 mt-0.5">توكيل: {c.poa_number}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Opponents and their lawyers */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-600" />
                <span>الخصوم والمحامون المقابلون ({caseData.opponents.length})</span>
              </h3>

              {caseData.opponents.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                  لم يتم تسجيل خصوم في هذه الدعوى
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {caseData.opponents.map((op) => (
                    <div
                      key={op.id}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{op.name}</span>
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[11px]">
                          {op.role_capacity}
                        </span>
                      </div>
                      {op.address && <div className="text-slate-500 text-[11px]">العنوان: {op.address}</div>}
                      {op.lawyer_name && (
                        <div className="text-slate-700 font-semibold pt-1 border-t border-slate-200/60">
                          المحامي المقابل: {op.lawyer_name} {op.lawyer_phone ? `(${op.lawyer_phone})` : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Juvenile Section if Juvenile Case */}
            {caseData.is_juvenile === 1 && (
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                  <Baby className="w-4 h-4 text-amber-600" />
                  <span>بيانات محكمة الطفل (جنح أحداث)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-amber-50/70 p-4 rounded-xl border border-amber-200 text-xs">
                  <div>
                    <span className="text-amber-800 block mb-0.5">اسم الحدث:</span>
                    <span className="font-bold text-slate-900 text-sm">{caseData.juvenile_name || '-'}</span>
                  </div>

                  <div>
                    <span className="text-amber-800 block mb-0.5">السن وقت الواقعة:</span>
                    <span className="font-bold text-slate-900">
                      {caseData.juvenile_age ? `${caseData.juvenile_age} سنة` : '-'}
                    </span>
                  </div>

                  <div>
                    <span className="text-amber-800 block mb-0.5">الاتهام المنسوب:</span>
                    <span className="font-bold text-slate-900">{caseData.juvenile_charge || '-'}</span>
                  </div>

                  <div>
                    <span className="text-amber-800 block mb-0.5">ولي الأمر:</span>
                    <span className="font-bold text-slate-900">
                      {caseData.guardian_name ? `${caseData.guardian_name} (${caseData.guardian_relation || ''})` : '-'}
                    </span>
                  </div>

                  <div>
                    <span className="text-amber-800 block mb-0.5">مراقب السلوك:</span>
                    <span className="font-bold text-slate-900">{caseData.probation_officer || '-'}</span>
                  </div>

                  <div>
                    <span className="text-amber-800 block mb-0.5">المؤسسة / الدار:</span>
                    <span className="font-bold text-slate-900">{caseData.care_facility || '-'}</span>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-amber-800 block mb-0.5">التدابير المقضي بها:</span>
                    <span className="font-bold text-slate-900">{caseData.imposed_measures || '-'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Hearings and Adjournments */}
      {activeTab === 'hearings' && (
        <CaseHearingsTab
          caseData={caseData}
          settings={settings || {
            office_name: 'مكتب المحاماة',
            lawyer_name: '',
            lawyer_title: 'المحامي بالنقض',
            appeal_deadline_civil: 40,
            appeal_deadline_misdemeanor: 10,
            appeal_deadline_cassation: 60,
            appeal_deadline_urgent: 15,
            appeal_deadline_family: 40,
            appeal_deadline_admin: 60,
            hearing_alert_days: 1
          } as any}
          onCaseUpdated={loadCaseData}
        />
      )}

      {/* TAB 3: Finance and Accounts */}
      {activeTab === 'finance' && (
        <CaseFinanceTab
          caseData={caseData}
          settings={settings || {
            office_name: 'مكتب المحاماة',
            lawyer_name: '',
            lawyer_title: 'المحامي بالنقض'
          } as any}
          onCaseUpdated={loadCaseData}
        />
      )}

      {activeTab === 'executions' && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <FileCheck2 className="w-10 h-10 text-amber-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-800">تبويب ملفات التنفيذ الجبري</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            مجدول ومخصص في <strong>المرحلة 5</strong>: السندات التنفيذية، إجراءات الحجز، البيع بالمزاد، والمبالغ المحصلة.
          </p>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <FileText className="w-10 h-10 text-amber-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-800">تبويب المستندات والمرفقات المحلية</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            مجدول ومخصص في <strong>المرحلة 7</strong>: تخزين مستندات القضية داخل مجلد LawOfficeData/attachments بروابط نسبية.
          </p>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <CheckSquare className="w-10 h-10 text-amber-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-800">تبويب المهام والمأموريات المرتبطة</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            مجدول ومخصص في <strong>المرحلة 6</strong>: مأموريات المحكمة والنيابة والشهر العقاري الخاصة بهذه القضية.
          </p>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <History className="w-10 h-10 text-amber-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-800">تبويب السجل الزمني والملاحظات التراكمية</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            مجدول ومخصص في <strong>المرحلة 8</strong>: سجل التدقيق وتاريخ التغييرات التي تمت على القضية.
          </p>
        </div>
      )}

      {/* Edit Case Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-800">تعديل بيانات القضية</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {editError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم القضية *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.case_number || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, case_number: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السنة القضائية *</label>
                  <input
                    type="number"
                    required
                    value={editFormData.case_year || 2026}
                    onChange={(e) => setEditFormData({ ...editFormData, case_year: parseInt(e.target.value) || 2026 })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المحكمة *</label>
                  <select
                    value={editFormData.court_name}
                    onChange={(e) => setEditFormData({ ...editFormData, court_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    {courts.map((court) => (
                      <option key={court.id} value={court.name}>
                        {court.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الدائرة / القاعة</label>
                  <input
                    type="text"
                    value={editFormData.court_circuit || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, court_circuit: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع القضية *</label>
                  <select
                    value={editFormData.case_type}
                    onChange={(e) => setEditFormData({ ...editFormData, case_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    {caseTypes.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حالة القضية</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="متداولة">متداولة</option>
                    <option value="محجوزة للحكم">محجوزة للحكم</option>
                    <option value="محكوم فيها">محكوم فيها</option>
                    <option value="مستأنفة">مستأنفة</option>
                    <option value="مشطوبة">مشطوبة</option>
                    <option value="موقوفة">موقوفة</option>
                    <option value="منتهية">منتهية</option>
                    <option value="مؤرشفة">مؤرشفة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">درجة الأهمية</label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  >
                    <option value="عادية">عادية</option>
                    <option value="مهمة">مهمة</option>
                    <option value="عاجلة">عاجلة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المحامي المسؤول</label>
                  <input
                    type="text"
                    value={editFormData.assigned_lawyer || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, assigned_lawyer: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">موضوع الدعوى *</label>
                <input
                  type="text"
                  required
                  value={editFormData.subject || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الطلبات الختامية</label>
                <textarea
                  rows={2}
                  value={editFormData.claims || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, claims: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
