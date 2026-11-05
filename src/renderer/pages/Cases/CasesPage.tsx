import React, { useState, useMemo, useEffect } from 'react';
import {
  Briefcase,
  FolderPlus,
  Search,
  Filter,
  Gavel,
  Scale,
  Calendar,
  Building,
  User,
  Users,
  Eye,
  Trash2,
  Edit2,
  Clock,
  Printer,
  X,
  Plus,
  Baby,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
} from 'lucide-react';
import {
  Case,
  CaseFilter,
  Client,
  ConfigurableListItem,
  CreateCaseInput,
} from '../../../shared/types';
import { useCases } from '../../hooks/useCases';
import { entityEventBus } from '../../services/eventBus';
import { arabicIncludes } from '../../../shared/arabicUtils';
import { ExportButton } from '../../components/Common/ExportButton';

interface CasesPageProps {
  courts: ConfigurableListItem[];
  caseTypes: ConfigurableListItem[];
  clients: Client[];
  onOpenCaseDetails: (caseId: number) => void;
}

export const CasesPage: React.FC<CasesPageProps> = ({
  courts,
  caseTypes,
  clients,
  onOpenCaseDetails,
}) => {
  const { cases, loading, createCase, deleteCase } = useCases();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [courtFilter, setCourtFilter] = useState('الكل');
  const [typeFilter, setTypeFilter] = useState('الكل');
  const [priorityFilter, setPriorityFilter] = useState('الكل');

  // Modal State for New Case
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Add Client State
  const [isQuickAddClientModalOpen, setIsQuickAddClientModalOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientPhone, setQuickClientPhone] = useState('');
  const [quickClientError, setQuickClientError] = useState<string | null>(null);
  const [isQuickClientSubmitting, setIsQuickClientSubmitting] = useState(false);

  // Form State
  const initialFormState: CreateCaseInput = {
    case_number: '',
    case_year: new Date().getFullYear(),
    court_name: courts[0]?.name || 'محكمة ابتدائية',
    court_circuit: '',
    court_degree: 'أول درجة',
    case_type: caseTypes[0]?.name || 'مدني',
    table_number: '',
    police_report_number: '',
    filing_date: new Date().toISOString().slice(0, 10),
    subject: '',
    claims: '',
    description: '',
    status: 'متداولة',
    priority: 'عادية',
    assigned_lawyer: '',
    colleague_lawyers: '',
    parent_case_id: null,
    is_juvenile: 0,
    juvenile_name: '',
    juvenile_age: 15,
    juvenile_charge: '',
    guardian_name: '',
    guardian_relation: 'أب',
    probation_officer: '',
    care_facility: '',
    imposed_measures: '',
    clients: clients[0] ? [{ client_id: clients[0].id, role_capacity: 'مدعي', is_primary: true }] : [],
    opponents: [{ name: '', role_capacity: 'مدعى عليه', lawyer_name: '', lawyer_phone: '' }],
  };

  const [formData, setFormData] = useState<CreateCaseInput>(initialFormState);

  const handleOpenAddModal = () => {
    setFormData({
      ...initialFormState,
      court_name: courts[0]?.name || 'محكمة ابتدائية',
      case_type: caseTypes[0]?.name || 'مدني',
      clients: clients[0] ? [{ client_id: clients[0].id, role_capacity: 'مدعي', is_primary: true }] : [],
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCaseTypeChange = (typeName: string) => {
    const isJuv = typeName.includes('أطفال') || typeName.includes('أحداث');
    setFormData((prev) => ({
      ...prev,
      case_type: typeName,
      is_juvenile: isJuv ? 1 : prev.is_juvenile,
    }));
  };

  // Add / Remove clients in form
  const handleAddClientToCase = () => {
    if (clients.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      clients: [...prev.clients, { client_id: clients[0].id, role_capacity: 'مدعي', is_primary: false }],
    }));
  };

  const handleRemoveClientFromCase = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      clients: prev.clients.filter((_, i) => i !== idx),
    }));
  };

  // Add / Remove opponents in form
  const handleAddOpponentToCase = () => {
    setFormData((prev) => ({
      ...prev,
      opponents: [...prev.opponents, { name: '', role_capacity: 'مدعى عليه', lawyer_name: '', lawyer_phone: '' }],
    }));
  };

  const handleRemoveOpponentFromCase = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      opponents: prev.opponents.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.case_number.trim() || !formData.subject.trim()) {
      setFormError('رقم القضية وموضوع الدعوى حقول إلزامية.');
      return;
    }
    if (formData.clients.length === 0) {
      setFormError('يجب ربط موكل واحد على الأقل بالقضية.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const res = await createCase(formData);
    setIsSubmitting(false);

    if (res.success && res.created) {
      setIsAddModalOpen(false);
      onOpenCaseDetails(res.created.id);
    } else {
      setFormError(res.error || 'تعذر إضافة ملف القضية');
    }
  };

  const handleDelete = async (e: React.MouseEvent, cs: Case) => {
    e.stopPropagation();
    const confirm = window.confirm(`هل أنت متأكد من حذف القضية رقم ${cs.case_number} لسنة ${cs.case_year} نهائيًا؟`);
    if (!confirm) return;

    await deleteCase(cs.id);
  };

  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName.trim() || !quickClientPhone.trim()) {
      setQuickClientError('يرجى ملء اسم الموكل ورقم الهاتف.');
      return;
    }
    setIsQuickClientSubmitting(true);
    setQuickClientError(null);
    try {
      const created = await window.electronAPI.createClient({
        name: quickClientName.trim(),
        phone: quickClientPhone.trim(),
        client_type: 'individual',
        status: 'active',
      });
      entityEventBus.emit('clients');
      setFormData((prev) => {
        const existing = [...prev.clients];
        if (existing.length > 0) {
          existing[0].client_id = created.id;
          return { ...prev, clients: existing };
        } else {
          return { ...prev, clients: [{ client_id: created.id, role_capacity: 'مدعي', is_primary: true }] };
        }
      });
      setIsQuickAddClientModalOpen(false);
      setQuickClientName('');
      setQuickClientPhone('');
    } catch (err: any) {
      setQuickClientError(err?.message || 'تعذر إضافة الموكل');
    } finally {
      setIsQuickClientSubmitting(false);
    }
  };

  // Filter cases locally using normalized Arabic search
  const filteredCases = cases.filter((c) => {
    if (statusFilter !== 'الكل' && c.status !== statusFilter) return false;
    if (courtFilter !== 'الكل' && c.court_name !== courtFilter) return false;
    if (typeFilter !== 'الكل' && c.case_type !== typeFilter) return false;
    if (priorityFilter !== 'الكل' && c.priority !== priorityFilter) return false;

    if (!searchQuery.trim()) return true;

    return (
      arabicIncludes(c.case_number, searchQuery) ||
      arabicIncludes(String(c.case_year), searchQuery) ||
      arabicIncludes(c.subject, searchQuery) ||
      arabicIncludes(c.court_name, searchQuery) ||
      arabicIncludes(c.court_circuit, searchQuery) ||
      arabicIncludes(c.primary_client_name, searchQuery) ||
      arabicIncludes(c.primary_opponent_name, searchQuery) ||
      arabicIncludes(c.table_number, searchQuery) ||
      arabicIncludes(c.police_report_number, searchQuery)
    );
  });

  // Pagination for high performance on 10,000+ cases
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, courtFilter, typeFilter, priorityFilter, pageSize]);

  const totalPages = Math.ceil(filteredCases.length / pageSize) || 1;
  const paginatedCases = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCases.slice(start, start + pageSize);
  }, [filteredCases, currentPage, pageSize]);

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'عاجلة':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'مهمة':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Normalized Arabic Search */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في القضايا (رقم القضية، السنة، المحكمة، الموكل، الخصم، الموضوع)..."
              className="w-full pr-10 pl-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium" data-testid="cases.main.set-search-query"
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <ExportButton
              fileName="قضايا_المكتب"
              title="سجل ملفات القضايا والدعاوى"
              headers={['م', 'رقم القضية', 'السنة', 'المحكمة', 'الدائرة', 'نوع الدعوى', 'الموكل الرئيسي', 'الخصم', 'الحالة', 'الأهمية', 'تاريخ القيد']}
              rows={filteredCases.map((c, idx) => [
                idx + 1,
                c.case_number,
                c.case_year,
                c.court_name,
                c.court_circuit || '-',
                c.case_type,
                c.primary_client_name || '-',
                c.opponents_summary || '-',
                c.status,
                c.priority,
                c.filing_date || '-',
              ])}
            />

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex-shrink-0" data-testid="cases.main.handle-open-add-modal"
            >
              <FolderPlus className="w-4 h-4" />
              <span>إضافة ملف قضية جديد</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>تصفية:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none" data-testid="cases.main.set-status-filter"
          >
            <option value="الكل">كل الحالات</option>
            <option value="متداولة">متداولة</option>
            <option value="محجوزة للحكم">محجوزة للحكم</option>
            <option value="محكوم فيها">محكوم فيها</option>
            <option value="مستأنفة">مستأنفة</option>
            <option value="مشطوبة">مشطوبة</option>
            <option value="موقوفة">موقوفة</option>
            <option value="منتهية">منتهية</option>
            <option value="مؤرشفة">مؤرشفة</option>
          </select>

          <select
            value={courtFilter}
            onChange={(e) => setCourtFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none max-w-[160px]" data-testid="cases.main.set-court-filter"
          >
            <option value="الكل">كل المحاكم</option>
            {courts.map((court) => (
              <option key={court.id} value={court.name}>
                {court.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none max-w-[140px]" data-testid="cases.main.set-type-filter"
          >
            <option value="الكل">كل الأنواع</option>
            {caseTypes.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none" data-testid="cases.main.set-priority-filter"
          >
            <option value="الكل">كل درجات الأهمية</option>
            <option value="عادية">عادية</option>
            <option value="مهمة">مهمة</option>
            <option value="عاجلة">عاجلة</option>
          </select>

          <span className="mr-auto text-slate-400 font-medium">
            عدد النتائج: <strong>{filteredCases.length}</strong>
          </span>
        </div>
      </div>

      {/* Cases Cards / List Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          جاري تحميل ملفات القضايا...
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 space-y-3">
          <Briefcase className="w-10 h-10 mx-auto text-slate-300" />
          <div className="text-sm font-bold text-slate-600">لا توجد قضايا مطابقة لمعايير البحث</div>
          <p className="text-xs text-slate-400">يمكنك إضافة قضية جديدة بربطها بالموكلين والخصوم</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedCases.map((cs) => (
            <div
              key={cs.id}
              onClick={() => onOpenCaseDetails(cs.id)}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:border-amber-400/80 transition-all p-5 cursor-pointer flex flex-col justify-between group relative overflow-hidden" data-testid="cases.main.on-open-case-details"
            >
              <div className="space-y-3">
                {/* Header: Number, Year, Priority Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-black text-slate-900 text-base group-hover:text-amber-700 transition-colors">
                      رقم {cs.case_number} لسنة {cs.case_year}
                    </h3>
                    <div className="text-xs text-slate-500 font-semibold mt-0.5">
                      {cs.court_name} {cs.court_circuit ? `• د/${cs.court_circuit}` : ''}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${getPriorityBadge(
                      cs.priority
                    )}`}
                  >
                    {cs.priority}
                  </span>
                </div>

                {/* Subject */}
                <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {cs.subject}
                </p>

                {/* Clients & Opponents Mini Preview */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 truncate">
                    <User className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="font-bold text-slate-900 truncate">
                      {cs.primary_client_name || 'موكل غير محدد'}
                    </span>
                    {cs.clients_count && cs.clients_count > 1 ? (
                      <span className="text-[10px] text-slate-400">(+{cs.clients_count - 1})</span>
                    ) : null}
                  </div>

                  {cs.primary_opponent_name && (
                    <div className="flex items-center gap-1.5 text-slate-500 truncate text-[11px]">
                      <span className="text-red-500 font-bold">ضد:</span>
                      <span className="truncate">{cs.primary_opponent_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Metadata & Status */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                    {cs.case_type}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-[11px]">
                    {cs.status}
                  </span>
                  {cs.is_juvenile === 1 && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center gap-1">
                      <Baby className="w-3 h-3" />
                      <span>حدث</span>
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => handleDelete(e, cs)}
                  title="حذف القضية"
                  className="p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" data-testid="cases.main.handle-delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls for High Performance on 10,000+ Cases */}
      {filteredCases.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
          {/* Summary & Page Size Selector */}
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <span>
              عرض {((currentPage - 1) * pageSize + 1).toLocaleString('ar-EG')} - {Math.min(currentPage * pageSize, filteredCases.length).toLocaleString('ar-EG')} من إجمالي {filteredCases.length.toLocaleString('ar-EG')} قضية
            </span>

            <div className="flex items-center gap-1.5 border-r border-slate-200 pr-4">
              <span className="text-slate-500 font-normal">عدد العناصر:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded font-bold focus:outline-none focus:ring-1 focus:ring-amber-500" data-testid="cases.main.set-page-size"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
                <option value={96}>96</option>
              </select>
            </div>
          </div>

          {/* Page Navigation Buttons */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="الصفحة الأولى"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors" data-testid="cases.main.set-current-page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              title="الصفحة السابقة"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors" data-testid="cases.main.set-current-page-2"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {(() => {
                const pages: (number | string)[] = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (currentPage > 3) pages.push('...');
                  const start = Math.max(2, currentPage - 1);
                  const end = Math.min(totalPages - 1, currentPage + 1);
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (currentPage < totalPages - 2) pages.push('...');
                  pages.push(totalPages);
                }
                return pages.map((p, idx) =>
                  p === '...' ? (
                    <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400 font-bold">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${p}`}
                      onClick={() => setCurrentPage(p as number)}
                      className={`min-w-8 h-8 px-2 rounded-lg font-bold transition-all ${
                        currentPage === p
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`} data-testid="cases.main.set-current-page-3"
                    >
                      {(p as number).toLocaleString('ar-EG')}
                    </button>
                  )
                );
              })()}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              title="الصفحة التالية"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors" data-testid="cases.main.set-current-page-4"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              title="الصفحة الأخيرة"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors" data-testid="cases.main.set-current-page-5"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create New Case */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-800">إضافة ملف قضية جديد</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors" data-testid="cases.main.set-is-add-modal-open"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. المحكمة والقيد */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  1. بيانات المحكمة والقيد القضائي
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم القضية *</label>
                    <input
                      type="text"
                      required
                      value={formData.case_number}
                      onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
                      placeholder="مثال: 1234"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold" data-testid="cases.main.set-form-data-8"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">السنة القضائية *</label>
                    <input
                      type="number"
                      required
                      value={formData.case_year}
                      onChange={(e) => setFormData({ ...formData, case_year: parseInt(e.target.value) || 2026 })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold" data-testid="cases.main.set-form-data-9"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المحكمة *</label>
                    <select
                      value={formData.court_name}
                      onChange={(e) => setFormData({ ...formData, court_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold" data-testid="cases.main.set-form-data"
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
                      value={formData.court_circuit || ''}
                      onChange={(e) => setFormData({ ...formData, court_circuit: e.target.value })}
                      placeholder="مثال: 7 مدني كلي"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" data-testid="cases.main.set-form-data-10"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نوع القضية *</label>
                    <select
                      value={formData.case_type}
                      onChange={(e) => handleCaseTypeChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold" data-testid="cases.main.handle-case-type-change"
                    >
                      {caseTypes.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الدرجة القضائية</label>
                    <select
                      value={formData.court_degree}
                      onChange={(e) => setFormData({ ...formData, court_degree: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" data-testid="cases.main.set-form-data-2"
                    >
                      <option value="أول درجة">أول درجة</option>
                      <option value="استئناف">استئناف</option>
                      <option value="نقض">نقض</option>
                      <option value="إدارية عليا">إدارية عليا</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الحصر / الجدول</label>
                    <input
                      type="text"
                      value={formData.table_number || ''}
                      onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono" data-testid="cases.main.set-form-data-11"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم المحضر / النيابة</label>
                    <input
                      type="text"
                      value={formData.police_report_number || ''}
                      onChange={(e) => setFormData({ ...formData, police_report_number: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono" data-testid="cases.main.set-form-data-12"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ القيد</label>
                    <input
                      type="date"
                      value={formData.filing_date || ''}
                      onChange={(e) => setFormData({ ...formData, filing_date: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" data-testid="cases.main.set-form-data-13"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">حالة القضية</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" data-testid="cases.main.set-form-data-3"
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
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold" data-testid="cases.main.set-form-data-4"
                    >
                      <option value="عادية">عادية</option>
                      <option value="مهمة">مهمة</option>
                      <option value="عاجلة">عاجلة ⚡</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المحامي المسؤول</label>
                    <input
                      type="text"
                      value={formData.assigned_lawyer || ''}
                      onChange={(e) => setFormData({ ...formData, assigned_lawyer: e.target.value })}
                      placeholder="اسم المحامي المتابع..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" data-testid="cases.main.set-form-data-14"
                    />
                  </div>
                </div>
              </div>

              {/* 2. الموضوع والطلبات */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  2. موضوع الدعوى والطلبات
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">موضوع القضية *</label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="مثال: دعوى صحة ونفاذ عقد بيع ابتدائي أو جنحة شيك بدون رصيد..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold" data-testid="cases.main.set-form-data-15"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الطلبات الختامية</label>
                      <textarea
                        rows={2}
                        value={formData.claims || ''}
                        onChange={(e) => setFormData({ ...formData, claims: e.target.value })}
                        placeholder="الطلبات الواردة بصحيفة الدعوى..."
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" data-testid="cases.main.set-form-data-16"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">وصف وملاحظات مختصرة</label>
                      <textarea
                        rows={2}
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="ملخص وقائع الدعوى..."
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" data-testid="cases.main.set-form-data-17"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. الموكلين وصفاتهم */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    3. الموكلون في الدعوى
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsQuickAddClientModalOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors" data-testid="cases.main.set-is-quick-add-client-modal-open"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة موكل جديد</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddClientToCase}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-200 transition-colors" data-testid="cases.main.handle-add-client-to-case"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة موكل آخر</span>
                    </button>
                  </div>
                </div>

                {clients.length === 0 ? (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">
                    يجب إضافة موكل واحد على الأقل في شاشة الموكلين أولاً.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.clients.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="text-xs font-bold text-slate-400 w-6 text-center">{idx + 1}</span>
                        <div className="flex-1">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">اختر الموكل</label>
                          <select
                            value={c.client_id}
                            onChange={(e) => {
                              const newClients = [...formData.clients];
                              newClients[idx].client_id = parseInt(e.target.value);
                              setFormData({ ...formData, clients: newClients });
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-semibold focus:outline-none" data-testid="cases.main.set-form-data-5"
                          >
                            {clients.map((cl) => (
                              <option key={cl.id} value={cl.id}>
                                {cl.name} ({cl.phone})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-48">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">صفة الموكل في الدعوى</label>
                          <select
                            value={c.role_capacity}
                            onChange={(e) => {
                              const newClients = [...formData.clients];
                              newClients[idx].role_capacity = e.target.value;
                              setFormData({ ...formData, clients: newClients });
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-bold text-amber-800 focus:outline-none" data-testid="cases.main.set-form-data-6"
                          >
                            <option value="مدعي">مدعي</option>
                            <option value="مدعى عليه">مدعى عليه</option>
                            <option value="متهم">متهم</option>
                            <option value="مجني عليه">مجني عليه</option>
                            <option value="مدعٍ بالحق المدني">مدعٍ بالحق المدني</option>
                            <option value="طاعن">طاعن</option>
                            <option value="مطعون ضده">مطعون ضده</option>
                            <option value="مستأنف">مستأنف</option>
                            <option value="مستأنف ضده">مستأنف ضده</option>
                            <option value="منفذ">منفذ</option>
                            <option value="منفذ ضده">منفذ ضده</option>
                            <option value="خصم متدخل">خصم متدخل</option>
                          </select>
                        </div>

                        {formData.clients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveClientFromCase(idx)}
                            className="text-red-500 hover:text-red-700 p-1 self-end mb-1" data-testid="cases.main.handle-remove-client-from-case"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. الخصوم ومحاميهم */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    4. الخصوم والمحامون المقابلون
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddOpponentToCase}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-200 transition-colors" data-testid="cases.main.handle-add-opponent-to-case"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة خصم</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.opponents.map((op, idx) => (
                    <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">خصم #{idx + 1}</span>
                        {formData.opponents.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOpponentFromCase(idx)}
                            className="text-xs text-red-500 hover:text-red-700" data-testid="cases.main.handle-remove-opponent-from-case"
                          >
                            حذف الخصم
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">اسم الخصم *</label>
                          <input
                            type="text"
                            value={op.name}
                            onChange={(e) => {
                              const ops = [...formData.opponents];
                              ops[idx].name = e.target.value;
                              setFormData({ ...formData, opponents: ops });
                            }}
                            placeholder="اسم الخصم أو الشركة..."
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-semibold focus:outline-none" data-testid="cases.main.set-form-data-18"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">صفة الخصم</label>
                          <select
                            value={op.role_capacity}
                            onChange={(e) => {
                              const ops = [...formData.opponents];
                              ops[idx].role_capacity = e.target.value;
                              setFormData({ ...formData, opponents: ops });
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none" data-testid="cases.main.set-form-data-7"
                          >
                            <option value="مدعى عليه">مدعى عليه</option>
                            <option value="مدعي">مدعي</option>
                            <option value="متهم">متهم</option>
                            <option value="مجني عليه">مجني عليه</option>
                            <option value="مطعون ضده">مطعون ضده</option>
                            <option value="طاعن">طاعن</option>
                            <option value="مستأنف ضده">مستأنف ضده</option>
                            <option value="مستأنف">مستأنف</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">اسم المحامي المقابل</label>
                          <input
                            type="text"
                            value={op.lawyer_name || ''}
                            onChange={(e) => {
                              const ops = [...formData.opponents];
                              ops[idx].lawyer_name = e.target.value;
                              setFormData({ ...formData, opponents: ops });
                            }}
                            placeholder="الأستاذ محامي الخصم..."
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none" data-testid="cases.main.set-form-data-19"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">هاتف محامي الخصم</label>
                          <input
                            type="text"
                            value={op.lawyer_phone || ''}
                            onChange={(e) => {
                              const ops = [...formData.opponents];
                              ops[idx].lawyer_phone = e.target.value;
                              setFormData({ ...formData, opponents: ops });
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none font-mono" data-testid="cases.main.set-form-data-20"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">عنوان الخصم وتليفونه</label>
                          <input
                            type="text"
                            value={op.address || ''}
                            onChange={(e) => {
                              const ops = [...formData.opponents];
                              ops[idx].address = e.target.value;
                              setFormData({ ...formData, opponents: ops });
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none" data-testid="cases.main.set-form-data-21"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. قسم مخصص لجنح الأطفال (Juvenile Courts) */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Baby className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-bold text-slate-700">
                      حقول إضافية خاصة بمحكمة الطفل (جنح أحداث)
                    </h4>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_juvenile === 1}
                      onChange={(e) => setFormData({ ...formData, is_juvenile: e.target.checked ? 1 : 0 })}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4" data-testid="cases.main.set-form-data-22"
                    />
                    <span>تفعيل حقول جنح الأحداث</span>
                  </label>
                </div>

                {formData.is_juvenile === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الحدث</label>
                      <input
                        type="text"
                        value={formData.juvenile_name || ''}
                        onChange={(e) => setFormData({ ...formData, juvenile_name: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none font-semibold" data-testid="cases.main.set-form-data-23"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">السن وقت الواقعة (سنة)</label>
                      <input
                        type="number"
                        min={7}
                        max={18}
                        value={formData.juvenile_age || ''}
                        onChange={(e) => setFormData({ ...formData, juvenile_age: parseInt(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none font-bold" data-testid="cases.main.set-form-data-24"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">الاتهام المنسوب للحدث</label>
                      <input
                        type="text"
                        value={formData.juvenile_charge || ''}
                        onChange={(e) => setFormData({ ...formData, juvenile_charge: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none" data-testid="cases.main.set-form-data-25"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم ولي الأمر</label>
                      <input
                        type="text"
                        value={formData.guardian_name || ''}
                        onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none" data-testid="cases.main.set-form-data-26"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">صفة ولي الأمر (القرابة)</label>
                      <input
                        type="text"
                        value={formData.guardian_relation || ''}
                        onChange={(e) => setFormData({ ...formData, guardian_relation: e.target.value })}
                        placeholder="أب / أم / عم / جد..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none" data-testid="cases.main.set-form-data-27"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">مراقب السلوك</label>
                      <input
                        type="text"
                        value={formData.probation_officer || ''}
                        onChange={(e) => setFormData({ ...formData, probation_officer: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none" data-testid="cases.main.set-form-data-28"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المؤسسة أو الدار</label>
                      <input
                        type="text"
                        value={formData.care_facility || ''}
                        onChange={(e) => setFormData({ ...formData, care_facility: e.target.value })}
                        placeholder="دار رعاية الأحداث إن وُجد..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none" data-testid="cases.main.set-form-data-29"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">التدابير المقضي بها</label>
                      <input
                        type="text"
                        value={formData.imposed_measures || ''}
                        onChange={(e) => setFormData({ ...formData, imposed_measures: e.target.value })}
                        placeholder="تسليم لولي الأمر، إلحاق بتدريب، إيداع..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none" data-testid="cases.main.set-form-data-30"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors" data-testid="cases.main.set-is-add-modal-open-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50" data-testid="cases.main.button-29"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ وإنشاء ملف القضية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Client Modal */}
      {isQuickAddClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">إضافة موكل جديد سريع</h3>
              <button
                onClick={() => setIsQuickAddClientModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg" data-testid="cases.main.set-is-quick-add-client-modal-open-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddClient} className="p-5 space-y-4">
              {quickClientError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-bold">
                  {quickClientError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الموكل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickClientName}
                  onChange={(e) => setQuickClientName(e.target.value)}
                  placeholder="اسم الموكل بالكامل..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold" data-testid="cases.main.set-quick-client-name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الهاتف <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={quickClientPhone}
                  onChange={(e) => setQuickClientPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" data-testid="cases.main.set-quick-client-phone"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsQuickAddClientModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors" data-testid="cases.main.set-is-quick-add-client-modal-open-3"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isQuickClientSubmitting}
                  className="px-5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50" data-testid="cases.main.button-32"
                >
                  {isQuickClientSubmitting ? 'جاري الحفظ...' : 'إضافة الموكل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
