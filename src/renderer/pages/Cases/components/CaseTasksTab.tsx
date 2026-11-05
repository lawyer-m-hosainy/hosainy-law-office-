import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp,
  LayoutTemplate,
  Printer
} from 'lucide-react';
import {
  CaseDetails,
  Task,
  TaskPriority,
  TaskStatus,
  TaskRecurrence,
  ConfigurableListItem,
  OfficeSettings
} from '../../../../shared/types';
import { useTasks } from '../../../hooks/useTasks';
import { generateTasksReportHtml } from '../../../services/tasksReportGenerator';

interface CaseTasksTabProps {
  caseData: CaseDetails;
  taskCategories: ConfigurableListItem[];
  settings: OfficeSettings;
  onCaseUpdated?: () => void;
}

export const CaseTasksTab: React.FC<CaseTasksTabProps> = ({
  caseData,
  taskCategories,
  settings,
  onCaseUpdated
}) => {
  const {
    tasks,
    templates,
    loading,
    loadTasks,
    createTask,
    updateTask,
    toggleChecklistItem,
    deleteTask,
    loadTemplates,
    applyTemplate
  } = useTasks();

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isApplyTemplateModalOpen, setIsApplyTemplateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [templateBaseDate, setTemplateBaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [templateAssignedTo, setTemplateAssignedTo] = useState('أنا');
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  // New task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: taskCategories[0]?.name || 'مأمورية محكمة',
    priority: 'عادية' as TaskPriority,
    due_date: new Date().toISOString().split('T')[0],
    due_time: '10:00',
    recurrence: 'لا يتكرر' as TaskRecurrence,
    assigned_to: 'أنا',
    estimated_duration: 'ساعة',
    checklist_input: ''
  });

  // Load tasks for this case
  useEffect(() => {
    loadTasks({ caseId: caseData.id });
    loadTemplates();
  }, [caseData.id, loadTasks, loadTemplates]);

  // Handle task status toggle
  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'منتهية' ? 'جديدة' : 'منتهية';
    await updateTask(task.id, { status: newStatus });
    loadTasks({ caseId: caseData.id });
  };

  // Submit New Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      alert('يرجى إدخال عنوان المهمة');
      return;
    }

    const checklistTitles = taskForm.checklist_input
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean);

    await createTask({
      title: taskForm.title,
      description: taskForm.description,
      case_id: caseData.id,
      client_id: caseData.clients?.[0]?.client_id || null,
      category: taskForm.category,
      priority: taskForm.priority,
      due_date: taskForm.due_date,
      due_time: taskForm.due_time || null,
      recurrence: taskForm.recurrence,
      assigned_to: taskForm.assigned_to,
      estimated_duration: taskForm.estimated_duration,
      checklist_titles: checklistTitles
    });

    setIsNewTaskModalOpen(false);
    setTaskForm({
      title: '',
      description: '',
      category: taskCategories[0]?.name || 'مأمورية محكمة',
      priority: 'عادية',
      due_date: new Date().toISOString().split('T')[0],
      due_time: '10:00',
      recurrence: 'لا يتكرر',
      assigned_to: 'أنا',
      estimated_duration: 'ساعة',
      checklist_input: ''
    });
    loadTasks({ caseId: caseData.id });
  };

  // Submit Apply Template
  const handleApplyTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) {
      alert('يرجى اختيار قالب المهام');
      return;
    }

    await applyTemplate({
      templateId: Number(selectedTemplateId),
      caseId: caseData.id,
      clientId: caseData.clients?.[0]?.client_id || null,
      baseDate: templateBaseDate,
      assignedTo: templateAssignedTo
    });

    setIsApplyTemplateModalOpen(false);
    loadTasks({ caseId: caseData.id });
  };

  // Print Case Tasks
  const handlePrintTasks = async () => {
    try {
      setPrintStatus('جاري تجهيز تقرير المهام...');
      const htmlContent = generateTasksReportHtml(tasks, settings, {
        title: `قائمة مهام ومأموريات قضية رقم ${caseData.case_number} لسنة ${caseData.case_year}`,
        periodText: `المحكمة: ${caseData.court_name} | الدائرة: ${caseData.court_circuit || '-'}`
      });

      const res = await window.electronAPI.executePrint({
        htmlContent,
        title: `مهام_قضية_${caseData.case_number}`,
        landscape: false,
        action: 'preview',
        suggestedFileName: `مهام_قضية_${caseData.case_number}.pdf`
      });

      if (res.success) {
        setPrintStatus('تم فتح المعاينة بنجاح');
      }
    } catch (err: any) {
      alert(`خطأ أثناء الطباعة: ${err?.message}`);
    } finally {
      setTimeout(() => setPrintStatus(null), 3000);
    }
  };

  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'منتهية').length;
  const pendingTasks = tasks.filter(t => t.status !== 'منتهية' && t.status !== 'ملغاة').length;
  const overdueTasks = tasks.filter(t => t.is_overdue).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {printStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{printStatus}</span>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block mb-1">إجمالي المهام</span>
          <div className="text-xl font-bold text-slate-800">{totalTasks}</div>
          <span className="text-[10px] text-slate-400">مهام ومأموريات مرتبطة</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-blue-600 block mb-1">قيد التنفيذ</span>
          <div className="text-xl font-bold text-blue-700">{pendingTasks}</div>
          <span className="text-[10px] text-slate-400">مطلوب إنجازها</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-600 block mb-1">المهام المنجزة</span>
          <div className="text-xl font-bold text-emerald-700">{completedTasks}</div>
          <span className="text-[10px] text-slate-400">تمت بنجاح</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-red-600 block mb-1">المهام المتأخرة</span>
          <div className="text-xl font-bold text-red-700">{overdueTasks}</div>
          <span className="text-[10px] text-slate-400">تجاوزت تاريخ الاستحقاق</span>
        </div>
      </div>

      {/* Control Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h4 className="text-sm font-bold text-slate-900">المهام والمأموريات القضائية المرتبطة</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة المأموريات، الإعلانات، استخراج الصور الرسمية، وقوائم الفحص
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tasks.length > 0 && (
            <button
              onClick={handlePrintTasks}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              title="طباعة قائمة المهام بخانات التأشير بالقلم" data-testid="case.tasks.tab.handle-print-tasks"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>طباعة المهام</span>
            </button>
          )}

          <button
            onClick={() => setIsApplyTemplateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition-colors" data-testid="case.tasks.tab.set-is-apply-template-modal-open"
          >
            <LayoutTemplate className="w-4 h-4" />
            <span>تطبيق قالب مهام</span>
          </button>

          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs" data-testid="case.tasks.tab.set-is-new-task-modal-open"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مهمة جديدة</span>
          </button>
        </div>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h5 className="text-sm font-bold text-slate-800">لا توجد مهام أو مأموريات مسجلة لهذه القضية</h5>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            يمكنك إضافة مهمة فردية أو تطبيق أحد القوالب التأسيسية التلقائية مثل "قضية جديدة" أو "حكم صدر".
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => setIsApplyTemplateModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors" data-testid="case.tasks.tab.set-is-apply-template-modal-open-2"
            >
              تطبيق قالب مهام تلقائي
            </button>
            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors" data-testid="case.tasks.tab.set-is-new-task-modal-open-2"
            >
              إضافة مهمة فردية
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const isCompleted = task.status === 'منتهية';
            const isUrgent = task.priority === 'عاجلة';
            const isImportant = task.priority === 'مهمة';

            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl border p-4 transition-all shadow-xs space-y-3 ${
                  isCompleted
                    ? 'border-slate-200 bg-slate-50/50 opacity-75'
                    : task.is_overdue
                    ? 'border-red-300 ring-1 ring-red-400/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Title & Checkbox */}
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => handleToggleTaskStatus(task)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 transition-colors ${
                        isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 hover:border-amber-500 bg-white'
                      }`} data-testid="case.tasks.tab.handle-toggle-task-status"
                    >
                      {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {task.title}
                        </span>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                          {task.category}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isUrgent
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : isImportant
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {task.priority}
                        </span>

                        {task.is_overdue && !isCompleted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                            متأخرة!
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-600">{task.description}</p>
                      )}

                      {/* Metadata Row */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>الاستحقاق: <strong>{task.due_date}</strong> {task.due_time ? `(${task.due_time})` : ''}</span>
                        </span>

                        <span className="flex items-center gap-1 text-[11px]">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>المكلف: <strong>{task.assigned_to || 'أنا'}</strong></span>
                        </span>

                        {task.estimated_duration && (
                          <span className="flex items-center gap-1 text-[11px] text-blue-700">
                            <Clock className="w-3.5 h-3.5" />
                            <span>المدة: {task.estimated_duration}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={async () => {
                        if (confirm(`هل أنت متأكد من حذف المهمة "${task.title}"؟`)) {
                          await deleteTask(task.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                      title="حذف المهمة" data-testid="case.tasks.tab.onfirm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub Checklist Items */}
                {task.checklists && task.checklists.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 pr-8 space-y-1.5">
                    <div className="text-[11px] text-slate-400 font-bold mb-1">
                      قائمة الفحص الفرعية ({task.completed_items || 0} من {task.total_items || 0})
                    </div>
                    {task.checklists.map(cl => (
                      <label
                        key={cl.id}
                        className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none hover:text-slate-900"
                      >
                        <input
                          type="checkbox"
                          checked={cl.is_completed === 1}
                          onChange={e => toggleChecklistItem(cl.id, e.target.checked)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5" data-testid="case.tasks.tab.toggle-checklist-item"
                        />
                        <span className={cl.is_completed === 1 ? 'line-through text-slate-400' : ''}>
                          {cl.title}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: Create New Task */}
      {/* ========================================================= */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" />
              <span>إضافة مهمة جديدة للقضية</span>
            </h3>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">عنوان المهمة *</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="مثال: تقديم مذكرة دفاع ختامية، سداد أمانة خبير..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold" data-testid="case.tasks.tab.set-task-form-3"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">الوصف والتفاصيل</label>
                <textarea
                  rows={2}
                  value={taskForm.description}
                  onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="تفاصيل إضافية عن المطلوب..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.tasks.tab.set-task-form-4"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">التصنيف *</label>
                  <select
                    value={taskForm.category}
                    onChange={e => setTaskForm({ ...taskForm, category: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white" data-testid="case.tasks.tab.set-task-form"
                  >
                    {taskCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">الأولوية</label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold bg-white" data-testid="case.tasks.tab.set-task-form-2"
                  >
                    <option value="عادية">عادية</option>
                    <option value="مهمة">مهمة</option>
                    <option value="عاجلة">عاجلة 🔥</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">تاريخ الاستحقاق *</label>
                  <input
                    type="date"
                    required
                    value={taskForm.due_date}
                    onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.tasks.tab.set-task-form-5"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">وقت الاستحقاق</label>
                  <input
                    type="time"
                    value={taskForm.due_time}
                    onChange={e => setTaskForm({ ...taskForm, due_time: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.tasks.tab.set-task-form-6"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">المكلف بالمهمة</label>
                  <input
                    type="text"
                    value={taskForm.assigned_to}
                    onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                    placeholder="أنا، سكرتير، محامي زميل..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.tasks.tab.set-task-form-7"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">المدة التقديرية</label>
                  <input
                    type="text"
                    value={taskForm.estimated_duration}
                    onChange={e => setTaskForm({ ...taskForm, estimated_duration: e.target.value })}
                    placeholder="مثال: ساعتين، يوم عمل..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.tasks.tab.set-task-form-8"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  قائمة فحص فرعية (Checklist) - اكتب كل بند في سطر
                </label>
                <textarea
                  rows={3}
                  value={taskForm.checklist_input}
                  onChange={e => setTaskForm({ ...taskForm, checklist_input: e.target.value })}
                  placeholder="تصوير حافظة المستندات&#10;إرفاق التوكيل وسند الوكالة&#10;توقيع المذكرة من المحامي"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono" data-testid="case.tasks.tab.set-task-form-9"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs" data-testid="case.tasks.tab.set-is-new-task-modal-open-3"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs" data-testid="case.tasks.tab.add"
                >
                  إضافة المهمة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: Apply Task Template */}
      {/* ========================================================= */}
      {isApplyTemplateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-indigo-600" />
              <span>تطبيق قالب مهام إجرائي تلقائي</span>
            </h3>

            <form onSubmit={handleApplyTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">اختر قالب المهام *</label>
                <select
                  required
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold bg-white" data-testid="case.tasks.tab.set-selected-template-id"
                >
                  <option value="">-- اختر القالب المناسب --</option>
                  {templates.map(tmpl => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} ({tmpl.items_count} مهام متسلسلة)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">تاريخ البدء الأساسي *</label>
                  <input
                    type="date"
                    required
                    value={templateBaseDate}
                    onChange={e => setTemplateBaseDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.tasks.tab.set-template-base-date"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">إسناد المهام إلى</label>
                  <input
                    type="text"
                    value={templateAssignedTo}
                    onChange={e => setTemplateAssignedTo(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="case.tasks.tab.set-template-assigned-to"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50 rounded-lg text-[11px] text-indigo-800 leading-relaxed">
                يقوم النظام بحساب تواريخ استحقاق المهام وقوائم الفحص التابعة لها تلقائياً بناءً على تاريخ البدء وإضافتها لملف هذه القضية.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsApplyTemplateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs" data-testid="case.tasks.tab.set-is-apply-template-modal-open-3"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs" data-testid="case.tasks.tab.apply"
                >
                  تطبيق وتوليد المهام
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
