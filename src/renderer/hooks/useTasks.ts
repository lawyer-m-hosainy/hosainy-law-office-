import { useState, useCallback, useEffect } from 'react';
import {
  Task,
  TaskFilter,
  CreateTaskInput,
  TaskTemplate,
  TaskTemplateItem,
  CreateTaskTemplateInput,
  TaskStatus
} from '../../shared/types';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async (filter?: TaskFilter): Promise<Task[]> => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getTasks(filter);
      setTasks(data);
      return data;
    } catch (err) {
      console.error('Failed to load tasks:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getTaskById = useCallback(async (id: number): Promise<Task | null> => {
    try {
      return await window.electronAPI.getTaskById(id);
    } catch (err) {
      console.error('Failed to get task by id:', err);
      return null;
    }
  }, []);

  const createTask = useCallback(async (input: CreateTaskInput): Promise<Task> => {
    const created = await window.electronAPI.createTask(input);
    setTasks(prev => [created, ...prev]);
    return created;
  }, []);

  const updateTask = useCallback(async (id: number, updates: Partial<CreateTaskInput> & { status?: TaskStatus; result_notes?: string; completed_at?: string }): Promise<Task> => {
    const updated = await window.electronAPI.updateTask(id, updates);
    setTasks(prev => prev.map(t => (t.id === id ? updated : t)));
    return updated;
  }, []);

  const toggleChecklistItem = useCallback(async (itemId: number, isCompleted: boolean) => {
    const updatedItem = await window.electronAPI.toggleTaskChecklistItem(itemId, isCompleted);
    // Update local task checklist item
    setTasks(prev => prev.map(task => {
      if (task.checklists?.some(c => c.id === itemId)) {
        const updatedChecklists = task.checklists.map(c => c.id === itemId ? updatedItem : c);
        const completedCount = updatedChecklists.filter(c => c.is_completed === 1).length;
        return {
          ...task,
          checklists: updatedChecklists,
          completed_items: completedCount
        };
      }
      return task;
    }));
    return updatedItem;
  }, []);

  const deleteTask = useCallback(async (id: number): Promise<{ success: boolean }> => {
    const res = await window.electronAPI.deleteTask(id);
    if (res.success) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
    return res;
  }, []);

  const loadTemplates = useCallback(async (): Promise<TaskTemplate[]> => {
    try {
      const tmpls = await window.electronAPI.getTaskTemplates();
      setTemplates(tmpls);
      return tmpls;
    } catch (err) {
      console.error('Failed to load task templates:', err);
      return [];
    }
  }, []);

  const getTemplateById = useCallback(async (id: number): Promise<TaskTemplate | null> => {
    try {
      return await window.electronAPI.getTaskTemplateById(id);
    } catch (err) {
      console.error('Failed to get template by id:', err);
      return null;
    }
  }, []);

  const createTemplate = useCallback(async (input: CreateTaskTemplateInput): Promise<TaskTemplate> => {
    const created = await window.electronAPI.createTaskTemplate(input);
    setTemplates(prev => [...prev, created]);
    return created;
  }, []);

  const deleteTemplate = useCallback(async (id: number): Promise<{ success: boolean; message?: string }> => {
    const res = await window.electronAPI.deleteTaskTemplate(id);
    if (res.success) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
    return res;
  }, []);

  const applyTemplate = useCallback(async (params: {
    templateId: number;
    caseId?: number;
    clientId?: number;
    baseDate?: string;
    assignedTo?: string;
  }): Promise<Task[]> => {
    const createdTasks = await window.electronAPI.applyTaskTemplate(params);
    setTasks(prev => [...createdTasks, ...prev]);
    return createdTasks;
  }, []);

  // Periodic Local Desktop Reminders Check
  const checkReminders = useCallback(async (): Promise<Task[]> => {
    try {
      const dueTasks = await window.electronAPI.getDueTaskReminders();
      for (const t of dueTasks) {
        await window.electronAPI.showDesktopNotification({
          title: `تذكير بمهمة: ${t.title} (${t.priority})`,
          body: `تاريخ الاستحقاق: ${t.due_date} ${t.due_time || ''}\nالمكلف: ${t.assigned_to || 'أنا'}`
        });
        await window.electronAPI.markTaskReminderShown(t.id);
      }
      return dueTasks;
    } catch (err) {
      console.error('Reminder check error:', err);
      return [];
    }
  }, []);

  // Set up periodic reminder checker (every 30 seconds local offline)
  useEffect(() => {
    checkReminders();
    const interval = setInterval(() => {
      checkReminders();
    }, 30000);
    return () => clearInterval(interval);
  }, [checkReminders]);

  return {
    tasks,
    templates,
    loading,
    loadTasks,
    getTaskById,
    createTask,
    updateTask,
    toggleChecklistItem,
    deleteTask,
    loadTemplates,
    getTemplateById,
    createTemplate,
    deleteTemplate,
    applyTemplate,
    checkReminders,
  };
}
