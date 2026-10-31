import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  MessageCircle,
  FileText,
  AlertCircle,
  Archive,
  RotateCcw,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  Calendar,
  Building,
  Briefcase,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Client, ClientType } from '../../../shared/types';
import { useClients } from '../../hooks/useClients';
import { arabicIncludes } from '../../../shared/arabicUtils';
import { ExportButton } from '../../components/Common/ExportButton';

interface ClientsPageProps {
  onNavigateToCase?: (caseId: number) => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({ onNavigateToCase }) => {
  const {
    clients,
    expiringClients,
    loading,
    refresh,
    createClient,
    updateClient,
    archiveClient,
    deleteClient,
  } = useClients();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientForView, setSelectedClientForView] = useState<Client | null>(null);
  const [clientCases, setClientCases] = useState<any[]>([]);

  // Form state
  const initialFormState: Omit<Client, 'id' | 'created_at' | 'updated_at'> = {
    name: '',
    client_type: 'individual',
    national_id_or_cr: '',
    phone: '',
    phone2: '',
    whatsapp: '',
    address: '',
    email: '',
    poa_number: '',
    poa_type: 'عام قضايا',
    poa_date: '',
    poa_issuing_office: '',
    poa_expiry_date: '',
    representation_type: 'أصيل',
    represented_name: '',
    notes: '',
    status: 'active',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAddModal = () => {
    setEditingClient(null);
    setFormData(initialFormState);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      client_type: client.client_type,
      national_id_or_cr: client.national_id_or_cr || '',
      phone: client.phone,
      phone2: client.phone2 || '',
      whatsapp: client.whatsapp || '',
      address: client.address || '',
      email: client.email || '',
      poa_number: client.poa_number || '',
      poa_type: client.poa_type || 'عام قضايا',
      poa_date: client.poa_date || '',
      poa_issuing_office: client.poa_issuing_office || '',
      poa_expiry_date: client.poa_expiry_date || '',
      representation_type: client.representation_type || 'أصيل',
      represented_name: client.represented_name || '',
      notes: client.notes || '',
      status: client.status,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setFormError('الاسم ورقم الهاتف الأساسي حقول إلزامية.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    if (editingClient) {
      const res = await updateClient(editingClient.id, formData);
      setIsSubmitting(false);
      if (res.success) {
        setIsModalOpen(false);
      } else {
        setFormError(res.error || 'تعذر تعديل بيانات الموكل');
      }
    } else {
      const res = await createClient(formData);
      setIsSubmitting(false);
      if (res.success) {
        setIsModalOpen(false);
      } else {
        setFormError(res.error || 'تعذر إضافة الموكل');
      }
    }
  };

  const handleArchiveToggle = async (client: Client) => {
    const isArchived = client.status === 'archived';
    const confirm = window.confirm(
      isArchived
        ? `هل تريد استعادة الموكل "${client.name}" من الأرشيف؟`
        : `هل تريد أرشفة الموكل "${client.name}"؟ ستبقى سجلاته محفوظة.`
    );
    if (!confirm) return;

    await archiveClient(client.id, !isArchived);
  };

  const handleDelete = async (client: Client) => {
    const confirm = window.confirm(`هل أنت متأكد تمامًا من حذف الموكل "${client.name}" نهائيًا؟`);
    if (!confirm) return;

    const res = await deleteClient(client.id);
    if (!res.success) {
      alert(res.message || 'تعذر الحذف');
    }
  };

  const handleViewClientDetails = async (client: Client) => {
    setSelectedClientForView(client);
    try {
      const details = await window.electronAPI.getClientById(client.id);
      if (details) {
        setClientCases(details.cases || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter clients locally using normalized Arabic search
  const filteredClients = clients.filter((client) => {
    if (statusFilter !== 'all' && client.status !== statusFilter) return false;
    if (typeFilter !== 'all' && client.client_type !== typeFilter) return false;

    if (!searchQuery.trim()) return true;

    return (
      arabicIncludes(client.name, searchQuery) ||
      arabicIncludes(client.phone, searchQuery) ||
      arabicIncludes(client.phone2, searchQuery) ||
      arabicIncludes(client.national_id_or_cr, searchQuery) ||
      arabicIncludes(client.poa_number, searchQuery) ||
      arabicIncludes(client.represented_name, searchQuery) ||
      arabicIncludes(client.notes, searchQuery)
    );
  });

  // Calculate POA status helper
  const getPoaStatus = (expiryDate?: string | null) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'منتهٍ', color: 'bg-red-100 text-red-800 border-red-200' };
    }
    if (diffDays <= 30) {
      return { label: `ينتهي خلال ${diffDays} يوم`, color: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    return { label: 'سارٍ', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Expiration Warning */}
      {expiringClients.length > 0 && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">تنبيه انتهاء التوكيلات:</span> يوجد لديك (
            <strong>{expiringClients.length}</strong>) موكلين اقترب موعد انتهاء توكيلاتهم القضائية أو انتهت بالفعل. يُرجى مراجعة تجديد التوكيلات لمباشرة الإجراءات.
          </div>
        </div>
      )}

      {/* Control Bar: Search, Filters, and Add Button */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input with Normalized Arabic indicator */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث سريع (الاسم، الهاتف، الرقم القومي، رقم التوكيل)..."
            className="w-full pr-10 pl-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'active' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              النشطون ({clients.filter((c) => c.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'archived' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الأرشيف ({clients.filter((c) => c.status === 'archived').length})
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({clients.length})
            </button>
          </div>

          {/* Add Client Button & Export */}
          <ExportButton
            fileName="سجل_الموكلين"
            title="سجل الموكلين والشركات والتوكيلات القضائية"
            headers={['م', 'اسم الموكل', 'النوع', 'الرقم القومي / السجل', 'الهاتف', 'الهاتف 2', 'رقم التوكيل', 'نوع التوكيل', 'مكتب التوثيق', 'انتهاء التوكيل', 'الحالة']}
            rows={filteredClients.map((c, idx) => [
              idx + 1,
              c.name,
              c.client_type === 'individual' ? 'فرد' : (c.client_type === 'company' ? 'شركة' : 'جهة'),
              c.national_id_or_cr || '-',
              c.phone || '-',
              c.phone2 || '-',
              c.poa_number || '-',
              c.poa_type || '-',
              c.poa_issuing_office || '-',
              c.poa_expiry_date || '-',
              c.status === 'active' ? 'نشط' : 'مؤرشف',
            ])}
          />

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة موكل جديد</span>
          </button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">اسم الموكل والنوع</th>
                <th className="py-3 px-4">الرقم القومي / السجل</th>
                <th className="py-3 px-4">الهواتف والتواصل</th>
                <th className="py-3 px-4">التوكيل ومكتب التوثيق</th>
                <th className="py-3 px-4 text-center">انتهاء التوكيل</th>
                <th className="py-3 px-4 text-center">الصفة التمثيلية</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-center w-32">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    جاري تحميل بيانات الموكلين...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    لا يوجد موكلون يطابقون معايير البحث
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const poaStatus = getPoaStatus(client.poa_expiry_date);

                  return (
                    <tr
                      key={client.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        client.status === 'archived' ? 'bg-slate-50/50 opacity-70' : ''
                      }`}
                    >
                      {/* Name & Type */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{client.name}</span>
                          {client.client_type === 'company' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-semibold">
                              شركة
                            </span>
                          )}
                          {client.client_type === 'entity' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-semibold">
                              جهة
                            </span>
                          )}
                        </div>
                        {client.address && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5">
                            {client.address}
                          </div>
                        )}
                      </td>

                      {/* National ID / CR */}
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        {client.national_id_or_cr || '-'}
                      </td>

                      {/* Phones & WhatsApp */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-800 font-semibold">{client.phone}</span>
                          {client.whatsapp && (
                            <span title={`واتساب: ${client.whatsapp}`} className="text-emerald-600">
                              <MessageCircle className="w-3.5 h-3.5 inline" />
                            </span>
                          )}
                        </div>
                        {client.phone2 && (
                          <div className="font-mono text-[11px] text-slate-400 mt-0.5">{client.phone2}</div>
                        )}
                      </td>

                      {/* POA details */}
                      <td className="py-3 px-4 text-xs">
                        {client.poa_number ? (
                          <div>
                            <span className="font-bold text-slate-800">
                              رقم {client.poa_number} ({client.poa_type || 'قضايا'})
                            </span>
                            {client.poa_issuing_office && (
                              <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                                {client.poa_issuing_office}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">لا يوجد توكيل</span>
                        )}
                      </td>

                      {/* POA Expiry Status */}
                      <td className="py-3 px-4 text-center">
                        {poaStatus ? (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border ${poaStatus.color}`}
                          >
                            {poaStatus.label}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">غير محدد</span>
                        )}
                      </td>

                      {/* Representation capacity */}
                      <td className="py-3 px-4 text-center text-xs">
                        {client.representation_type && client.representation_type !== 'أصيل' ? (
                          <div className="text-slate-700">
                            <span className="font-bold text-amber-700">{client.representation_type}</span>
                            {client.represented_name && (
                              <div className="text-[11px] text-slate-500 truncate max-w-[120px]">
                                عن: {client.represented_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">أصيل</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            client.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {client.status === 'active' ? 'نشط' : 'مؤرشف'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleViewClientDetails(client)}
                            title="عرض تفاصيل الموكل وقضاياه"
                            className="p-1 text-slate-500 hover:text-amber-600 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(client)}
                            title="تعديل البيانات"
                            className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleArchiveToggle(client)}
                            title={client.status === 'active' ? 'أرشفة الموكل' : 'استعادة من الأرشيف'}
                            className="p-1 text-slate-500 hover:text-purple-600 transition-colors"
                          >
                            {client.status === 'active' ? (
                              <Archive className="w-4 h-4" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDelete(client)}
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

      {/* Add / Edit Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-800">
                  {editingClient ? 'تعديل بيانات الموكل' : 'إضافة موكل جديد'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Section 1: Basic Client Info */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  البيانات الأساسية والهوية
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">الاسم بالكامل *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="اسم الموكل أو اسم الشركة..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نوع الموكل</label>
                    <select
                      value={formData.client_type}
                      onChange={(e) => setFormData({ ...formData, client_type: e.target.value as ClientType })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="individual">فرد</option>
                      <option value="company">شركة</option>
                      <option value="entity">جهة / هيئة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {formData.client_type === 'individual' ? 'الرقم القومي (14 رقم)' : 'السجل التجاري / البطاقة الضريبية'}
                    </label>
                    <input
                      type="text"
                      value={formData.national_id_or_cr || ''}
                      onChange={(e) => setFormData({ ...formData, national_id_or_cr: e.target.value })}
                      placeholder="رقم إثبات الشخصية..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الهاتف الأساسي *</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="010..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">هاتف إضافي</label>
                    <input
                      type="text"
                      value={formData.phone2 || ''}
                      onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الواتساب</label>
                    <input
                      type="text"
                      value={formData.whatsapp || ''}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">العنوان بالتفصيل</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Power of Attorney (التوكيل) */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  بيانات التوكيل الرسمي
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم التوكيل والحرف</label>
                    <input
                      type="text"
                      value={formData.poa_number || ''}
                      onChange={(e) => setFormData({ ...formData, poa_number: e.target.value })}
                      placeholder="مثال: 1234 لسنة 2026 ب"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نوع التوكيل</label>
                    <select
                      value={formData.poa_type || 'عام قضايا'}
                      onChange={(e) => setFormData({ ...formData, poa_type: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="عام قضايا">عام قضايا</option>
                      <option value="خاص">توكيل خاص</option>
                      <option value="عام شامل">توكيل عام شامل رسمي</option>
                      <option value="إدارة وتوثيق">إدارة وتوثيق</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">مكتب الشهر العقاري / التوثيق</label>
                    <input
                      type="text"
                      value={formData.poa_issuing_office || ''}
                      onChange={(e) => setFormData({ ...formData, poa_issuing_office: e.target.value })}
                      placeholder="مثال: توثيق الأهرام النموذجي"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ تحرير التوكيل</label>
                    <input
                      type="date"
                      value={formData.poa_date || ''}
                      onChange={(e) => setFormData({ ...formData, poa_date: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ انتهاء التوكيل (إن وجد)</label>
                    <input
                      type="date"
                      value={formData.poa_expiry_date || ''}
                      onChange={(e) => setFormData({ ...formData, poa_expiry_date: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Legal Capacity & Representation (صفة الأطراف) */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  الصفة والتمثيل القانوني
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">صفة الموكل في التعامل</label>
                    <select
                      value={formData.representation_type || 'أصيل'}
                      onChange={(e) => setFormData({ ...formData, representation_type: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      <option value="أصيل">أصيل عن نفسه</option>
                      <option value="ولي طبيعي">ولي طبيعي (أب عن قاصر)</option>
                      <option value="وصي">وصي على قاصر</option>
                      <option value="قيّم">قيّم على محجور عليه</option>
                      <option value="وكيل عن شركة">وكيل / ممثل قانوني عن شركة</option>
                      <option value="وكيل بالباطن">وكيل بالباطن</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم الشخص أو الجهة المُمَثّلة</label>
                    <input
                      type="text"
                      value={formData.represented_name || ''}
                      onChange={(e) => setFormData({ ...formData, represented_name: e.target.value })}
                      placeholder="اسم القاصر أو المحجور عليه أو اسم الشركة..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية</label>
                    <textarea
                      rows={2}
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="أي ملاحظات أو تعليمات خاصة بالموكل..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : editingClient ? 'حفظ التعديلات' : 'إضافة الموكل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Client Details Drawer / Modal */}
      {selectedClientForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-800">
                  ملف الموكل: {selectedClientForView.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedClientForView(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block mb-1">الهاتف والاتصال:</span>
                  <span className="font-bold text-slate-800 text-sm block font-mono">{selectedClientForView.phone}</span>
                  {selectedClientForView.phone2 && (
                    <span className="text-slate-500 font-mono block mt-0.5">{selectedClientForView.phone2}</span>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block mb-1">الرقم القومي / السجل:</span>
                  <span className="font-bold text-slate-800 text-sm block font-mono">
                    {selectedClientForView.national_id_or_cr || 'غير مسجل'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block mb-1">بيانات التوكيل:</span>
                  <span className="font-bold text-slate-800 block">
                    {selectedClientForView.poa_number
                      ? `رقم ${selectedClientForView.poa_number} (${selectedClientForView.poa_type || 'قضايا'})`
                      : 'لا يوجد توكيل'}
                  </span>
                  {selectedClientForView.poa_issuing_office && (
                    <span className="text-slate-500 block mt-0.5">{selectedClientForView.poa_issuing_office}</span>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block mb-1">الصفة التمثيلية:</span>
                  <span className="font-bold text-slate-800 block">
                    {selectedClientForView.representation_type || 'أصيل'}
                  </span>
                  {selectedClientForView.represented_name && (
                    <span className="text-slate-500 block mt-0.5">عن: {selectedClientForView.represented_name}</span>
                  )}
                </div>
              </div>

              {/* Linked Cases Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  <span>القضايا المرتبطة بهذا الموكل ({clientCases.length}):</span>
                </h4>

                {clientCases.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-xs">
                    لا توجد قضايا مسجلة لهذا الموكل حتى الآن
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clientCases.map((cs) => (
                      <div
                        key={cs.id}
                        className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <span className="font-bold text-slate-800 block">
                            القضية رقم {cs.case_number} لسنة {cs.case_year} ({cs.court_name})
                          </span>
                          <span className="text-slate-500 block mt-0.5">
                            صفة الموكل: <strong className="text-amber-700">{cs.role_capacity}</strong> • الموضوع: {cs.subject}
                          </span>
                        </div>

                        {onNavigateToCase && (
                          <button
                            onClick={() => {
                              setSelectedClientForView(null);
                              onNavigateToCase(cs.id);
                            }}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs transition-colors"
                          >
                            فتح القضية ←
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
