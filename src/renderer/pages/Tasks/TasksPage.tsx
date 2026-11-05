import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
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
  Printer,
  List,
  Columns,
  CalendarDays,
  ExternalLink,
  Flame,
  ArrowRight,
  Sparkles,
  Repeat,
  Eye
} from 'lucide-react';
import {
  Case,
  Client,
  Task,
  TaskPriority,
  TaskStatus,
  TaskRecurrence,
  TaskFilter,
  CreateTaskInput,
  TaskTemplate,
  CreateTaskTemplateInput,
  ConfigurableListItem,
  OfficeSettings
} from '../../../shared/types';
import { useTasks } from '../../hooks/useTasks';
import { generateTasksReportHtml } from '../../services/tasksReportGenerator';
import { ExportButton } from '../../components/Common/ExportButton';

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface TasksPageProps {
  settings: OfficeSettings | null;
  cases: Case[];
  clients: Client[];
  taskCategories: ConfigurableListItem[];
  onNavigateToCase?: (caseId: number) => void;
}

type TaskViewMode = 'list' | 'kanban' | 'calendar';

export const TasksPage: React.FC<TasksPageProps> = ({
  settings,
  cases,
  clients,
  taskCategories,
  onNavigateToCase
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
    createTemplate,
    deleteTemplate,
    applyTemplate
  } = useTasks();

  // View state
  const [viewMode, setViewMode] = useState<TaskViewMode>('list');
  const [periodTab, setPeriodTab] = useState<'all' | 'today' | 'week' | 'overdue'>('all');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedAssignee, setSelectedAssignee] = useState('all');

  // Modals state
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isApplyTemplateModalOpen, setIsApplyTemplateModalOpen] = useState(false);
  const [isManageTemplatesModalOpen, setIsManageTemplatesModalOpen] = useState(false);
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  // New task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    case_id: '' as string | number,
    client_id: '' as string | number,
    category: taskCategories?.[0]?.name || 'مأمورية محكمة',
    priority: 'عادية' as TaskPriority,
    due_date: formatLocalDate(new Date()),
    due_time: '10:00',
    recurrence: 'لا يتكرر' as TaskRecurrence,
    recurrence_interval: 1,
    assigned_to: 'أنا',
    estimated_duration: 'ساعة',
    checklist_input: ''
  });

  // Apply template form state
  const [applyTemplateForm, setApplyTemplateForm] = useState({
    templateId: '' as string | number,
    caseId: '' as string | number,
    clientId: '' as string | number,
    baseDate: formatLocalDate(new Date()),
    assignedTo: 'أنا'
  });

  // Create custom template form state
  const [customTemplateForm, setCustomTemplateForm] = useState({
    name: '',
    description: '',
    items: [
      {
        title: '',
        category: taskCategories?.[0]?.name || 'مأمورية محكمة',
        priority: 'عادية' as TaskPriority,
        days_offset: 0,
        estimated_duration: 'ساعة',
        checklist_items: ''
      }
    ]
  });

  // Calendar view state (Selected month & day)
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string>(formatLocalDate(new Date()));

  // Load initial tasks & templates
  useEffect(() => {
    loadTasks({
      period: periodTab,
      search: searchQuery,
      category: selectedCategory,
      priority: selectedPriority,
      status: selectedStatus,
      assignedTo: selectedAssignee
    });
    loadTemplates();
  }, [periodTab, searchQuery, selectedCategory, selectedPriority, selectedStatus, selectedAssignee, loadTasks, loadTemplates]);

  // Handle task status toggle
  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'منتهية' ? 'جديدة' : 'منتهية';
    await updateTask(task.id, { status: newStatus });
    loadTasks({
      period: periodTab,
      search: searchQuery,
      category: selectedCategory,
      priority: selectedPriority,
      status: selectedStatus,
      assignedTo: selectedAssignee
    });
  };

  // Move task status in Kanban
  const handleMoveKanban = async (taskId: number, newStatus: TaskStatus) => {
    await updateTask(taskId, { status: newStatus });
    loadTasks({
      period: periodTab,
      search: searchQuery,
      category: selectedCategory,
      priority: selectedPriority,
      status: selectedStatus,
      assignedTo: selectedAssignee
    });
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
      case_id: taskForm.case_id ? Number(taskForm.case_id) : null,
      client_id: taskForm.client_id ? Number(taskForm.client_id) : null,
      category: taskForm.category,
      priority: taskForm.priority,
      due_date: taskForm.due_date,
      due_time: taskForm.due_time || null,
      recurrence: taskForm.recurrence,
      recurrence_interval: taskForm.recurrence_interval,
      assigned_to: taskForm.assigned_to,
      estimated_duration: taskForm.estimated_duration,
      checklist_titles: checklistTitles
    });

    setIsNewTaskModalOpen(false);
    setTaskForm({
      title: '',
      description: '',
      case_id: '',
      client_id: '',
      category: taskCategories[0]?.name || 'مأمورية محكمة',
      priority: 'عادية',
      due_date: new Date().toISOString().split('T')[0],
      due_time: '10:00',
      recurrence: 'لا يتكرر',
      recurrence_interval: 1,
      assigned_to: 'أنا',
      estimated_duration: 'ساعة',
      checklist_input: ''
    });

    loadTasks({
      period: periodTab,
      search: searchQuery,
      category: selectedCategory,
      priority: selectedPriority,
      status: selectedStatus,
      assignedTo: selectedAssignee
    });
  };

  // Submit Apply Template
  const handleApplyTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyTemplateForm.templateId) {
      alert('يرجى اختيار القالب');
      return;
    }

    await applyTemplate({
      templateId: Number(applyTemplateForm.templateId),
      caseId: applyTemplateForm.caseId ? Number(applyTemplateForm.caseId) : undefined,
      clientId: applyTemplateForm.clientId ? Number(applyTemplateForm.clientId) : undefined,
      baseDate: applyTemplateForm.baseDate,
      assignedTo: applyTemplateForm.assignedTo
    });

    setIsApplyTemplateModalOpen(false);
    loadTasks({
      period: periodTab,
      search: searchQuery,
      category: selectedCategory,
      priority: selectedPriority,
      status: selectedStatus,
      assignedTo: selectedAssignee
    });
  };

  // Submit Create Custom Template
  const handleCreateCustomTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTemplateForm.name.trim()) {
      alert('يرجى إدخال اسم القالب');
      return;
    }
    const validItems = customTemplateForm.items.filter(i => i.title.trim());
    if (validItems.length === 0) {
      alert('يرجى إضافة مهمة واحدة على الأقل في القالب');
      return;
    }

    await createTemplate({
      name: customTemplateForm.name,
      description: customTemplateForm.description,
      items: validItems
    });

    setIsCreateTemplateModalOpen(false);
    loadTemplates();
  };

  // Print Tasks Report
  const handlePrintTasks = async () => {
    if (!settings) return;
    try {
      setPrintStatus('جاري تجهيز تقرير المهام للطباعة...');
      let periodLabel = 'لكافة المهام المحددة';
      if (periodTab === 'today') periodLabel = 'مهام اليوم';
      else if (periodTab === 'week') periodLabel = 'مهام الأسبوع';
      else if (periodTab === 'overdue') periodLabel = 'المهام المتأخرة والعاجلة';

      const htmlContent = generateTasksReportHtml(tasks, settings, {
        title: `قائمة المهام والمأموريات (${periodLabel})`,
        periodText: periodLabel,
        filterLabel: selectedCategory !== 'all' ? `التصنيف: ${selectedCategory}` : undefined
      });

      const res = await window.electronAPI.executePrint({
        htmlContent,
        title: `قائمة_المهام_${periodTab}`,
        landscape: false,
        action: 'preview',
        suggestedFileName: `قائمة_المهام_${periodTab}.pdf`
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

  // Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'منتهية').length;
    const pending = tasks.filter(t => t.status !== 'منتهية' && t.status !== 'ملغاة').length;
    const overdue = tasks.filter(t => t.is_overdue).length;
    const urgent = tasks.filter(t => t.priority === 'عاجلة' && t.status !== 'منتهية').length;
    return { total, completed, pending, overdue, urgent };
  }, [tasks]);

  // Kanban Columns
  const kanbanColumns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'جديدة', label: 'مهام جديدة', color: 'border-blue-400 bg-blue-50/30' },
    { status: 'جارية', label: 'قيد التنفيذ', color: 'border-amber-400 bg-amber-50/30' },
    { status: 'مؤجلة', label: 'مؤجلة', color: 'border-purple-400 bg-purple-50/30' },
    { status: 'منتهية', label: 'منتهية بنجاح', color: 'border-emerald-400 bg-emerald-50/30' }
  ];

  return (
    <div className="h-full flex flex-col space-y-4 p-6 overflow-hidden bg-slate-50">
      {/* Toast Notification */}
      {printStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{printStatus}</span>
        </div>
      )}

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">إجمالي المهام</span>
          <div className="text-xl font-bold text-slate-800">{metrics.total}</div>
          <span className="text-[10px] text-slate-400">كافة المهام المسجلة</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-blue-600 block mb-1">قيد التنفيذ</span>
          <div className="text-xl font-bold text-blue-700">{metrics.pending}</div>
          <span className="text-[10px] text-slate-400">مطلوب إنجازها</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-red-600 block mb-1">المهام المتأخرة</span>
          <div className="text-xl font-bold text-red-700">{metrics.overdue}</div>
          <span className="text-[10px] text-slate-400">فات موعد استحقاقها</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 block mb-1">مهام عاجلة 🔥</span>
          <div className="text-xl font-bold text-amber-700">{metrics.urgent}</div>
          <span className="text-[10px] text-slate-400">أولوية قصوى</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 block mb-1">المنتهية</span>
          <div className="text-xl font-bold text-emerald-700">{metrics.completed}</div>
          <span className="text-[10px] text-slate-400">تم إنجازها بنجاح</span>
        </div>
      </div>

      {/* Control Bar: View Switcher, Period Tabs & Action Buttons */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Period Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setPeriodTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                periodTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`} data-testid="tasks.main.set-period-tab"
            >
              الكل
            </button>
            <button
              onClick={() => setPeriodTab('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                periodTab === 'today' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`} data-testid="tasks.main.set-period-tab-2"
            >
              مهام اليوم
            </button>
            <button
              onClick={() => setPeriodTab('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                periodTab === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`} data-testid="tasks.main.set-period-tab-3"
            >
              الأسبوع
            </button>
            <button
              onClick={() => setPeriodTab('overdue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                periodTab === 'overdue' ? 'bg-white text-red-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`} data-testid="tasks.main.set-period-tab-4"
            >
              المتأخرة
            </button>
          </div>

          {/* View Modes Switcher */}
          <div className="flex items-center gap-1 border border-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="عرض القائمة" data-testid="tasks.main.set-view-mode"
            >
              <List className="w-3.5 h-3.5" />
              <span>قائمة</span>
            </button>

            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="لوحة كانبان" data-testid="tasks.main.set-view-mode-2"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>كانبان</span>
            </button>

            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'calendar' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="عرض التقويم" data-testid="tasks.main.set-view-mode-3"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>تقويم</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <ExportButton
              fileName="قائمة_المهام"
              title="سجل المهام والمأموريات القضائية"
              headers={['م', 'عنوان المهمة', 'التصنيف', 'الأولوية', 'الحالة', 'تاريخ الاستحقاق', 'المكلف', 'رقم القضية', 'المدة التقديرية', 'ملاحظات النتيجة']}
              rows={(tasks || []).map((t, idx) => [
                idx + 1,
                t.title,
                t.category,
                t.priority,
                t.status,
                t.due_date ? `${t.due_date} ${t.due_time || ''}`.trim() : '-',
                t.assigned_to || '-',
                t.case_number ? `${t.case_number}/${t.case_year}` : '-',
                t.estimated_duration || '-',
                t.result_notes || '-',
              ])}
              buttonLabel="تصدير المهام"
            />

            <button
              onClick={handlePrintTasks}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              title="طباعة قائمة المهام بخانات التأشير بالقلم" data-testid="tasks.main.handle-print-tasks"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>طباعة المهام</span>
            </button>

            <button
              onClick={() => setIsManageTemplatesModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-lg text-xs font-bold transition-colors" data-testid="tasks.main.set-is-manage-templates-modal-open"
            >
              <LayoutTemplate className="w-4 h-4" />
              <span>قوالب المهام</span>
            </button>

            <button
              onClick={() => setIsApplyTemplateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition-colors" data-testid="tasks.main.set-is-apply-template-modal-open"
            >
              <Sparkles className="w-4 h-4" />
              <span>تطبيق قالب</span>
            </button>

            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs" data-testid="tasks.main.set-is-new-task-modal-open"
            >
              <Plus className="w-4 h-4" />
              <span>مهمة جديدة</span>
            </button>
          </div>
        </div>

        {/* Filter Inputs Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث في عنوان المهمة، الوصف، المكلّف، الموكل، القضية..."
              className="w-full pr-9 pl-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-amber-500" data-testid="tasks.main.set-search-query"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400">التصنيف:</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white" data-testid="tasks.main.set-selected-category"
            >
              <option value="all">كل التصنيفات</option>
              {taskCategories && taskCategories.length > 0 ? (
                taskCategories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))
              ) : (
                <>
                  <option value="مأمورية محكمة">مأمورية محكمة</option>
                  <option value="إدارة مكتب وأعمال سكرتارية">إدارة مكتب وأعمال سكرتارية</option>
                  <option value="تحرير وإيداع صحيفة دعوى / طعن">تحرير وإيداع صحيفة دعوى / طعن</option>
                  <option value="سداد رسوم وأمانات قضائية">سداد رسوم وأمانات قضائية</option>
                </>
              )}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400">الأولوية:</span>
            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white font-bold" data-testid="tasks.main.set-selected-priority"
            >
              <option value="all">كل الأولويات</option>
              <option value="عاجلة">عاجلة</option>
              <option value="مهمة">مهمة</option>
              <option value="عادية">عادية</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400">الحالة:</span>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white" data-testid="tasks.main.set-selected-status"
            >
              <option value="all">كل الحالات</option>
              <option value="جديدة">جديدة</option>
              <option value="جارية">جارية</option>
              <option value="مؤجلة">مؤجلة</option>
              <option value="منتهية">منتهية</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center space-y-3">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">لا توجد مهام مطابقة لخيارات التصفية</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              يمكنك إضافة مهمة جديدة أو تطبيق أحد القوالب التأسيسية التلقائية لتنظيم عمل المكتب.
            </p>
          </div>
        ) : (
          <>
            {/* VIEW 1: LIST VIEW */}
            {viewMode === 'list' && (
              <div className="space-y-2.5">
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
                        <div className="flex items-start gap-3 flex-1">
                          {/* Toggle Completion Checkbox */}
                          <button
                            onClick={() => handleToggleTaskStatus(task)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 transition-colors ${
                              isCompleted
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 hover:border-amber-500 bg-white'
                            }`} data-testid="tasks.main.handle-toggle-task-status"
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

                              {task.recurrence !== 'لا يتكرر' && (
                                <span className="flex items-center gap-0.5 text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded">
                                  <Repeat className="w-3 h-3" />
                                  <span>{task.recurrence}</span>
                                </span>
                              )}

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

                              {task.case_id && onNavigateToCase && (
                                <button
                                  onClick={() => onNavigateToCase(task.case_id!)}
                                  className="flex items-center gap-1 text-[11px] text-blue-700 hover:underline font-bold" data-testid="tasks.main.on-navigate-to-case"
                                >
                                  <span>قضية: {task.case_number} ({task.court_name})</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}

                              {task.client_name && (
                                <span className="text-[11px] text-slate-500">
                                  موكل: {task.client_name}
                                </span>
                              )}

                              {task.estimated_duration && (
                                <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>المدة: {task.estimated_duration}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Delete Action */}
                        <div>
                          <button
                            onClick={async () => {
                              if (confirm(`هل أنت متأكد من حذف المهمة "${task.title}"؟`)) {
                                await deleteTask(task.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                            title="حذف المهمة" data-testid="tasks.main.onfirm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Sub Checklist Items */}
                      {task.checklists && task.checklists.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 pr-8 space-y-1.5">
                          <div className="text-[11px] text-slate-400 font-bold mb-1">
                            قائمة الفحص ({task.completed_items || 0} من {task.total_items || 0})
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
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5" data-testid="tasks.main.toggle-checklist-item"
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

            {/* VIEW 2: KANBAN BOARD */}
            {viewMode === 'kanban' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full pb-4">
                {kanbanColumns.map(col => {
                  const colTasks = tasks.filter(t => t.status === col.status);

                  return (
                    <div
                      key={col.status}
                      className={`rounded-xl border p-3 flex flex-col ${col.color}`}
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                        <span className="font-bold text-xs text-slate-800">{col.label}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 shadow-2xs">
                          {colTasks.length}
                        </span>
                      </div>

                      {/* Cards Container */}
                      <div className="space-y-2.5 flex-1 overflow-y-auto">
                        {colTasks.map(task => (
                          <div
                            key={task.id}
                            className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2 hover:border-slate-300 transition-all text-xs"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-slate-900">{task.title}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  task.priority === 'عاجلة' ? 'bg-red-100 text-red-800' :
                                  task.priority === 'مهمة' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {task.priority}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500">
                              {task.category}
                            </div>

                            {task.case_number && (
                              <div className="text-[10px] text-blue-700 truncate">
                                قضية {task.case_number}/{task.case_year} ({task.court_name})
                              </div>
                            )}

                            {task.total_items ? (
                              <div className="text-[10px] text-slate-400">
                                بنود الفحص: {task.completed_items}/{task.total_items}
                              </div>
                            ) : null}

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                              <span>{task.due_date}</span>
                              <span className="font-bold text-slate-700">{task.assigned_to || 'أنا'}</span>
                            </div>

                            {/* Move Status Buttons */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-[10px]">
                              {col.status !== 'جديدة' && (
                                <button
                                  onClick={() => handleMoveKanban(task.id, 'جديدة')}
                                  className="text-slate-400 hover:text-slate-700" data-testid="tasks.main.handle-move-kanban"
                                >
                                  ← جديدة
                                </button>
                              )}
                              {col.status !== 'جارية' && (
                                <button
                                  onClick={() => handleMoveKanban(task.id, 'جارية')}
                                  className="text-amber-600 hover:text-amber-800 font-bold" data-testid="tasks.main.handle-move-kanban-2"
                                >
                                  قيد التنفيذ
                                </button>
                              )}
                              {col.status !== 'منتهية' && (
                                <button
                                  onClick={() => handleMoveKanban(task.id, 'منتهية')}
                                  className="text-emerald-600 hover:text-emerald-800 font-bold" data-testid="tasks.main.handle-move-kanban-3"
                                >
                                  إنهاء ✓
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIEW 3: CALENDAR VIEW */}
            {viewMode === 'calendar' && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900">
                    تقويم استحقاق المهام والمأموريات
                  </h4>
                  <span className="text-xs text-slate-500">
                    اختر يوماً لاستعراض المهام المطلوبة به
                  </span>
                </div>

                {/* Days list & Tasks for selected day */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Mini Calendar / Days with task counts */}
                  <div className="space-y-2 border-l border-slate-100 pl-4">
                    <span className="text-xs font-bold text-slate-600 block mb-2">أيام بها مهام قادمة</span>
                    {Array.from(new Set((tasks || []).map(t => t.due_date).filter(Boolean))).sort().map(dateStr => {
                      const count = (tasks || []).filter(t => t.due_date === dateStr).length;
                      const isSelected = selectedCalendarDay === dateStr;

                      return (
                        <div
                          key={dateStr}
                          onClick={() => setSelectedCalendarDay(dateStr)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-amber-600 text-white font-bold border-amber-600'
                              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                          }`} data-testid="tasks.main.set-selected-calendar-day"
                        >
                          <span>{dateStr}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-amber-700 text-white' : 'bg-white text-slate-800'}`}>
                            {count} مهمة
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tasks on Selected Day */}
                  <div className="md:col-span-2 space-y-3">
                    <span className="text-xs font-bold text-slate-800 block">
                      مهام يوم: {selectedCalendarDay}
                    </span>

                    {tasks.filter(t => t.due_date === selectedCalendarDay).length === 0 ? (
                      <div className="p-8 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                        لا توجد مهام مستحقة في هذا اليوم
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tasks.filter(t => t.due_date === selectedCalendarDay).map(t => (
                          <div key={t.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${t.priority === 'عاجلة' ? 'bg-red-500' : 'bg-amber-500'}`} />
                              <span className="font-bold text-slate-900">{t.title}</span>
                              <span className="text-[10px] text-slate-500">({t.category})</span>
                            </div>
                            <span className="text-slate-600 font-medium">{t.assigned_to || 'أنا'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: Create New Task */}
      {/* ========================================================= */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" />
              <span>إضافة مهمة أو مأمورية جديدة</span>
            </h3>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">عنوان المهمة *</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="مثال: تقديم صحيفة الدعوى، استخراج صورة رسمية..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold" data-testid="tasks.main.set-task-form-6"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">الوصف والتفاصيل</label>
                <textarea
                  rows={2}
                  value={taskForm.description}
                  onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="ملاحظات وتفاصيل المهمة..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="tasks.main.set-task-form-7"
                />
              </div>

              {/* Case / Client Linkage */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">القضية المرتبطة (اختياري)</label>
                  <select
                    value={taskForm.case_id}
                    onChange={e => {
                      const cId = e.target.value;
                      const foundCase = cases.find(c => c.id === Number(cId));
                      setTaskForm({
                        ...taskForm,
                        case_id: cId,
                        client_id: foundCase?.primary_client_id || taskForm.client_id
                      });
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white" data-testid="tasks.main.set-task-form"
                  >
                    <option value="">بدون ربط بقضية (مهمة عامة)</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>
                        قضية {c.case_number}/{c.case_year} ({c.court_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">الموكل المرتبط (اختياري)</label>
                  <select
                    value={taskForm.client_id}
                    onChange={e => setTaskForm({ ...taskForm, client_id: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white" data-testid="tasks.main.set-task-form-2"
                  >
                    <option value="">بدون تحديد موكل</option>
                    {clients.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">التصنيف *</label>
                  <select
                    value={taskForm.category}
                    onChange={e => setTaskForm({ ...taskForm, category: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white" data-testid="tasks.main.set-task-form-3"
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
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold bg-white" data-testid="tasks.main.set-task-form-4"
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
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="tasks.main.set-task-form-8"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">الوقت</label>
                  <input
                    type="time"
                    value={taskForm.due_time}
                    onChange={e => setTaskForm({ ...taskForm, due_time: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="tasks.main.set-task-form-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">التكرار</label>
                  <select
                    value={taskForm.recurrence}
                    onChange={e => setTaskForm({ ...taskForm, recurrence: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white" data-testid="tasks.main.set-task-form-5"
                  >
                    <option value="لا يتكرر">لا يتكرر</option>
                    <option value="يومي">يومي</option>
                    <option value="أسبوعي">أسبوعي</option>
                    <option value="شهري">شهري</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">المكلف بالمهمة</label>
                  <input
                    type="text"
                    value={taskForm.assigned_to}
                    onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                    placeholder="أنا، سكرتير، مندوب..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="tasks.main.set-task-form-10"
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
                  placeholder="تصوير المستندات&#10;إحضار التوكيل&#10;سداد الرسوم"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono" data-testid="tasks.main.set-task-form-11"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs" data-testid="tasks.main.set-is-new-task-modal-open-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs" data-testid="tasks.main.add"
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
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>تطبيق قالب مهام إجرائي تلقائي</span>
            </h3>

            <form onSubmit={handleApplyTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">اختر قالب المهام *</label>
                <select
                  required
                  value={applyTemplateForm.templateId}
                  onChange={e => setApplyTemplateForm({ ...applyTemplateForm, templateId: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold bg-white" data-testid="tasks.main.set-apply-template-form"
                >
                  <option value="">-- اختر القالب --</option>
                  {templates.map(tmpl => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} ({tmpl.items_count} مهام متسلسلة)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">ربط بالقضية (اختياري)</label>
                <select
                  value={applyTemplateForm.caseId}
                  onChange={e => setApplyTemplateForm({ ...applyTemplateForm, caseId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white" data-testid="tasks.main.set-apply-template-form-2"
                >
                  <option value="">مهام عامة بدون قضية</option>
                  {cases.map(c => (
                    <option key={c.id} value={c.id}>
                      قضية {c.case_number}/{c.case_year} — {c.court_name} ({c.primary_client_name || 'موكل'})
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
                    value={applyTemplateForm.baseDate}
                    onChange={e => setApplyTemplateForm({ ...applyTemplateForm, baseDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="tasks.main.set-apply-template-form-3"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">إسناد المهام إلى</label>
                  <input
                    type="text"
                    value={applyTemplateForm.assignedTo}
                    onChange={e => setApplyTemplateForm({ ...applyTemplateForm, assignedTo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="tasks.main.set-apply-template-form-4"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50 rounded-lg text-[11px] text-indigo-800 leading-relaxed">
                يقوم النظام بحساب تواريخ استحقاق المهام وقوائم الفحص التابعة لها تلقائياً بناءً على تاريخ البدء وإضافتها للنظام دفعة واحدة.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsApplyTemplateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs" data-testid="tasks.main.set-is-apply-template-modal-open-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs" data-testid="tasks.main.apply"
                >
                  تطبيق وتوليد المهام
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: Manage Task Templates */}
      {/* ========================================================= */}
      {isManageTemplatesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-purple-600" />
                <span>قوالب المهام الإجرائية</span>
              </h3>
              <button
                onClick={() => {
                  setIsCreateTemplateModalOpen(true);
                }}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold" data-testid="tasks.main.set-is-create-template-modal-open"
              >
                + إنشاء قالب مخصص جديد
              </button>
            </div>

            <div className="space-y-3">
              {templates.map(tmpl => (
                <div key={tmpl.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{tmpl.name}</span>
                      {tmpl.is_default === 1 && (
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded mr-2 font-bold">
                          قالب نظام معتمد
                        </span>
                      )}
                    </div>
                    {tmpl.is_default !== 1 && (
                      <button
                        onClick={async () => {
                          if (confirm(`هل أنت متأكد من حذف القالب "${tmpl.name}"؟`)) {
                            await deleteTemplate(tmpl.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800 text-xs font-bold" data-testid="tasks.main.onfirm-2"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                  {tmpl.description && <p className="text-slate-600 text-xs">{tmpl.description}</p>}
                  <div className="text-[11px] text-purple-700 font-bold">
                    عدد المهام المتسلسلة: {tmpl.items_count}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsManageTemplatesModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs" data-testid="tasks.main.set-is-manage-templates-modal-open-2"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: Create Custom Template */}
      {/* ========================================================= */}
      {isCreateTemplateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" />
              <span>إنشاء قالب مهام مخصص جديد</span>
            </h3>

            <form onSubmit={handleCreateCustomTemplate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">اسم القالب *</label>
                  <input
                    type="text"
                    required
                    value={customTemplateForm.name}
                    onChange={e => setCustomTemplateForm({ ...customTemplateForm, name: e.target.value })}
                    placeholder="مثال: إجراءات استئناف حكم، دعوى صحة توقيع..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold" data-testid="tasks.main.set-custom-template-form-5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">الوصف</label>
                  <input
                    type="text"
                    value={customTemplateForm.description}
                    onChange={e => setCustomTemplateForm({ ...customTemplateForm, description: e.target.value })}
                    placeholder="وصف استخدام هذا القالب..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs" data-testid="tasks.main.set-custom-template-form-6"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">بنود المهام المتسلسلة للقالب ({customTemplateForm.items.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomTemplateForm({
                        ...customTemplateForm,
                        items: [
                          ...customTemplateForm.items,
                          {
                            title: '',
                            category: taskCategories[0]?.name || 'مأمورية محكمة',
                            priority: 'عادية',
                            days_offset: 1,
                            estimated_duration: 'ساعة',
                            checklist_items: ''
                          }
                        ]
                      });
                    }}
                    className="text-purple-700 hover:text-purple-900 font-bold text-xs" data-testid="tasks.main.set-custom-template-form"
                  >
                    + إضافة مهمة للقالب
                  </button>
                </div>

                {customTemplateForm.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">مهمة #{idx + 1}</span>
                      {customTemplateForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomTemplateForm({
                              ...customTemplateForm,
                              items: customTemplateForm.items.filter((_, i) => i !== idx)
                            });
                          }}
                          className="text-red-500 hover:text-red-700" data-testid="tasks.main.set-custom-template-form-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="عنوان المهمة"
                        value={item.title}
                        onChange={e => {
                          const newItems = [...customTemplateForm.items];
                          newItems[idx].title = e.target.value;
                          setCustomTemplateForm({ ...customTemplateForm, items: newItems });
                        }}
                        className="p-1.5 border border-slate-300 rounded text-xs font-bold" data-testid="tasks.main.set-custom-template-form-7"
                      />

                      <select
                        value={item.category}
                        onChange={e => {
                          const newItems = [...customTemplateForm.items];
                          newItems[idx].category = e.target.value;
                          setCustomTemplateForm({ ...customTemplateForm, items: newItems });
                        }}
                        className="p-1.5 border border-slate-300 rounded text-xs bg-white" data-testid="tasks.main.set-custom-template-form-3"
                      >
                        {taskCategories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 whitespace-nowrap">الاستحقاق بعد:</span>
                        <input
                          type="number"
                          min="0"
                          value={item.days_offset}
                          onChange={e => {
                            const newItems = [...customTemplateForm.items];
                            newItems[idx].days_offset = Number(e.target.value);
                            setCustomTemplateForm({ ...customTemplateForm, items: newItems });
                          }}
                          className="w-16 p-1 border border-slate-300 rounded text-xs text-center font-bold" data-testid="tasks.main.set-custom-template-form-8"
                        />
                        <span className="text-slate-500">يوم</span>
                      </div>

                      <select
                        value={item.priority}
                        onChange={e => {
                          const newItems = [...customTemplateForm.items];
                          newItems[idx].priority = e.target.value as any;
                          setCustomTemplateForm({ ...customTemplateForm, items: newItems });
                        }}
                        className="p-1 border border-slate-300 rounded text-xs bg-white font-bold" data-testid="tasks.main.set-custom-template-form-4"
                      >
                        <option value="عادية">أولوية عادية</option>
                        <option value="مهمة">أولوية مهمة</option>
                        <option value="عاجلة">أولوية عاجلة</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateTemplateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs" data-testid="tasks.main.set-is-create-template-modal-open-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-xs" data-testid="tasks.main.save"
                >
                  حفظ القالب المخصص
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
