import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  Edit2,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuditLogs } from '../../../hooks/useAuditLogs';
import { ExportButton } from '../../../components/Common/ExportButton';
import { AuditLog } from '../../../../shared/types';

export const AuditLogsTab: React.FC = () => {
  const { logs, loading, filter, setFilter, loadLogs } = useAuditLogs();

  const [searchQuery, setSearchQuery] = useState('');
  const [actionType, setActionType] = useState('all');
  const [entityType, setEntityType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleApplyFilter = () => {
    loadLogs({
      action_type: actionType,
      entity_type: entityType,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      query: searchQuery || undefined,
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">إضافة جديدة</span>;
      case 'update':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">تعديل</span>;
      case 'delete':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">حذف</span>;
      case 'reverse':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">قيد عكسي</span>;
      case 'backup':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">نسخ احتياطي</span>;
      case 'restore':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">استعادة بيانات</span>;
      case 'lock':
      case 'unlock':
      case 'security':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">أمان وقفل</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">{action}</span>;
    }
  };

  const getEntityLabel = (type: string) => {
    switch (type) {
      case 'case': return 'قضية';
      case 'client': return 'موكل';
      case 'hearing': return 'جلسة';
      case 'finance': return 'مالية';
      case 'execution': return 'تنفيذ';
      case 'task': return 'مهمة';
      case 'document': return 'مستند';
      case 'system': return 'النظام';
      default: return type;
    }
  };

  // Export Data
  const exportHeaders = ['م', 'التاريخ والوقت', 'نوع العملية', 'الكيان', 'اسم العنصر', 'تفاصيل التغيير'];
  const exportRows = logs.map((l, idx) => [
    idx + 1,
    l.created_at.slice(0, 19).replace('T', ' '),
    l.action_type,
    getEntityLabel(l.entity_type),
    l.entity_name,
    l.details || '-',
  ]);

  return (
    <div className="space-y-6">
      {/* Control Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-800">سجل التدقيق وتاريخ التغييرات (Audit Log)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تتبع كامل لكافة العمليات الحساسة التي تمت على القضايا والمالية والمستندات وإعدادات الأمان
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ExportButton
              fileName="سجل_التدقيق_والتغييرات"
              title="سجل التدقيق والتغييرات في نظام المكتب"
              headers={exportHeaders}
              rows={exportRows}
              buttonLabel="تصدير السجل"
            />

            <button
              onClick={() => handleApplyFilter()}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              title="تحديث"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">نوع العملية:</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold focus:outline-none focus:border-amber-500"
            >
              <option value="all">كافة العمليات</option>
              <option value="create">إضافة جديدة</option>
              <option value="update">تعديل</option>
              <option value="delete">حذف</option>
              <option value="reverse">قيد عكسي</option>
              <option value="backup">نسخ احتياطي</option>
              <option value="restore">استعادة بيانات</option>
              <option value="security">أمان وقفل</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">الكيان:</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold focus:outline-none focus:border-amber-500"
            >
              <option value="all">كافة الكيانات</option>
              <option value="case">القضايا</option>
              <option value="client">الموكلين</option>
              <option value="hearing">الجلسات</option>
              <option value="finance">المالية</option>
              <option value="execution">التنفيذات</option>
              <option value="task">المهام</option>
              <option value="document">المستندات</option>
              <option value="system">النظام</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">من تاريخ:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">إلى تاريخ:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleApplyFilter}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold shadow-xs transition-colors"
            >
              تطبيق التصفية
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-semibold">
            جاري تحميل سجل التغييرات...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">لا توجد سجلات تطابق البحث</h4>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="p-3 w-12 text-center">م</th>
                  <th className="p-3 w-36">التاريخ والوقت</th>
                  <th className="p-3 w-28 text-center">العملية</th>
                  <th className="p-3 w-24">الكيان</th>
                  <th className="p-3 w-48">العنصر</th>
                  <th className="p-3">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                      {log.created_at.slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="p-3 text-center">{getActionBadge(log.action_type)}</td>
                    <td className="p-3 font-semibold text-slate-700">{getEntityLabel(log.entity_type)}</td>
                    <td className="p-3 font-bold text-slate-900 truncate max-w-xs">{log.entity_name}</td>
                    <td className="p-3 text-slate-600 font-medium leading-relaxed">{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
