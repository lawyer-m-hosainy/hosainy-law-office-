import { ipcMain, Notification } from 'electron';
import { DatabaseService } from '../services/DatabaseService';
import {
  Task,
  TaskChecklistItem,
  TaskFilter,
  CreateTaskInput,
  TaskTemplate,
  TaskTemplateItem,
  CreateTaskTemplateInput,
  TaskStatus
} from '../../shared/types';

export function registerTasksIpc(): void {
  const dbService = DatabaseService.getInstance();

  // Helper: Format date offset YYYY-MM-DD
  function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  // 1. Get Tasks with Filters, Sorting, and Checklists
  ipcMain.handle('tasks:getTasks', async (_event, filter?: TaskFilter): Promise<Task[]> => {
    const db = dbService.getDb();
    const today = new Date().toISOString().split('T')[0];

    let sql = `
      SELECT 
        t.*,
        c.case_number,
        c.case_year,
        c.court_name as case_court_name,
        cl.name as client_name,
        (SELECT COUNT(*) FROM task_checklists WHERE task_id = t.id) as total_items,
        (SELECT COUNT(*) FROM task_checklists WHERE task_id = t.id AND is_completed = 1) as completed_items
      FROM tasks t
      LEFT JOIN cases c ON c.id = t.case_id
      LEFT JOIN clients cl ON cl.id = t.client_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.caseId) {
      sql += ' AND t.case_id = ?';
      params.push(filter.caseId);
    }

    if (filter?.clientId) {
      sql += ' AND t.client_id = ?';
      params.push(filter.clientId);
    }

    if (filter?.category && filter.category !== 'all' && filter.category !== 'الكل') {
      sql += ' AND t.category = ?';
      params.push(filter.category);
    }

    if (filter?.priority && filter.priority !== 'all' && filter.priority !== 'الكل') {
      sql += ' AND t.priority = ?';
      params.push(filter.priority);
    }

    if (filter?.status && filter.status !== 'all' && filter.status !== 'الكل') {
      sql += ' AND t.status = ?';
      params.push(filter.status);
    }

    if (filter?.assignedTo && filter.assignedTo !== 'all' && filter.assignedTo !== 'الكل') {
      sql += ' AND t.assigned_to = ?';
      params.push(filter.assignedTo);
    }

    // Period Filter
    if (filter?.period === 'today') {
      sql += ' AND t.due_date = ?';
      params.push(today);
    } else if (filter?.period === 'week') {
      const nextWeek = addDays(today, 7);
      sql += ' AND t.due_date >= ? AND t.due_date <= ?';
      params.push(today, nextWeek);
    } else if (filter?.period === 'overdue') {
      sql += " AND t.due_date < ? AND t.status NOT IN ('منتهية', 'ملغاة')";
      params.push(today);
    } else if (filter?.period === 'custom') {
      if (filter.startDate) {
        sql += ' AND t.due_date >= ?';
        params.push(filter.startDate);
      }
      if (filter.endDate) {
        sql += ' AND t.due_date <= ?';
        params.push(filter.endDate);
      }
    }

    // Search with Arabic Normalization
    if (filter?.search && filter.search.trim()) {
      const q = filter.search.trim();
      sql += ` AND (
        normalize_arabic(t.title) LIKE '%' || normalize_arabic(?) || '%'
        OR normalize_arabic(COALESCE(t.description, '')) LIKE '%' || normalize_arabic(?) || '%'
        OR normalize_arabic(t.category) LIKE '%' || normalize_arabic(?) || '%'
        OR normalize_arabic(COALESCE(t.assigned_to, '')) LIKE '%' || normalize_arabic(?) || '%'
        OR normalize_arabic(COALESCE(cl.name, '')) LIKE '%' || normalize_arabic(?) || '%'
        OR c.case_number LIKE '%' || ? || '%'
      )`;
      params.push(q, q, q, q, q, q);
    }

    // Order: Priority first (عاجلة, مهمة, عادية), then due_date, then id
    sql += `
      ORDER BY 
        CASE t.priority WHEN 'عاجلة' THEN 1 WHEN 'مهمة' THEN 2 ELSE 3 END ASC,
        t.due_date ASC,
        COALESCE(t.due_time, '23:59') ASC,
        t.id DESC
    `;

    const rows = db.prepare(sql).all(...params) as any[];

    // Fetch checklists for all returned tasks
    const taskIds = rows.map(r => r.id);
    let checklistsByTask: Record<number, TaskChecklistItem[]> = {};
    if (taskIds.length > 0) {
      const placeholders = taskIds.map(() => '?').join(',');
      const allChecklists = db.prepare(`
        SELECT * FROM task_checklists WHERE task_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC
      `).all(...taskIds) as TaskChecklistItem[];

      for (const item of allChecklists) {
        if (!checklistsByTask[item.task_id]) {
          checklistsByTask[item.task_id] = [];
        }
        checklistsByTask[item.task_id].push(item);
      }
    }

    return rows.map(r => {
      const isOverdue = r.due_date < today && r.status !== 'منتهية' && r.status !== 'ملغاة';
      return {
        ...r,
        court_name: r.case_court_name,
        total_items: Number(r.total_items) || 0,
        completed_items: Number(r.completed_items) || 0,
        checklists: checklistsByTask[r.id] || [],
        is_overdue: isOverdue
      };
    });
  });

  // 2. Get Task By ID
  ipcMain.handle('tasks:getById', async (_event, id: number): Promise<Task | null> => {
    const db = dbService.getDb();
    const today = new Date().toISOString().split('T')[0];

    const row = db.prepare(`
      SELECT 
        t.*,
        c.case_number,
        c.case_year,
        c.court_name as case_court_name,
        cl.name as client_name
      FROM tasks t
      LEFT JOIN cases c ON c.id = t.case_id
      LEFT JOIN clients cl ON cl.id = t.client_id
      WHERE t.id = ?
    `).get(id) as any;

    if (!row) return null;

    const checklists = db.prepare(`
      SELECT * FROM task_checklists WHERE task_id = ? ORDER BY sort_order ASC, id ASC
    `).all(id) as TaskChecklistItem[];

    const isOverdue = row.due_date < today && row.status !== 'منتهية' && row.status !== 'ملغاة';

    return {
      ...row,
      court_name: row.case_court_name,
      checklists,
      total_items: checklists.length,
      completed_items: checklists.filter(c => c.is_completed === 1).length,
      is_overdue: isOverdue
    };
  });

  // 3. Create Task
  ipcMain.handle('tasks:create', async (_event, input: CreateTaskInput): Promise<Task> => {
    const db = dbService.getDb();

    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO tasks (
          title, description, case_id, client_id, category, priority,
          due_date, due_time, recurrence, recurrence_interval, status,
          assigned_to, estimated_duration, reminder_minutes_before
        ) VALUES (
          @title, @description, @case_id, @client_id, @category, @priority,
          @due_date, @due_time, @recurrence, @recurrence_interval, @status,
          @assigned_to, @estimated_duration, @reminder_minutes_before
        )
      `);

      const res = stmt.run({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        case_id: input.case_id || null,
        client_id: input.client_id || null,
        category: input.category || 'مأمورية محكمة',
        priority: input.priority || 'عادية',
        due_date: input.due_date,
        due_time: input.due_time?.trim() || null,
        recurrence: input.recurrence || 'لا يتكرر',
        recurrence_interval: input.recurrence_interval || null,
        status: input.status || 'جديدة',
        assigned_to: input.assigned_to?.trim() || 'أنا',
        estimated_duration: input.estimated_duration?.trim() || null,
        reminder_minutes_before: input.reminder_minutes_before || 60
      });

      const taskId = res.lastInsertRowid as number;

      // Insert checklist items if provided
      if (input.checklist_titles && input.checklist_titles.length > 0) {
        const insertChecklist = db.prepare(`
          INSERT INTO task_checklists (task_id, title, is_completed, sort_order)
          VALUES (?, ?, 0, ?)
        `);
        input.checklist_titles.forEach((title, idx) => {
          if (title.trim()) {
            insertChecklist.run(taskId, title.trim(), idx + 1);
          }
        });
      }

      const created = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task;
      const checklists = db.prepare('SELECT * FROM task_checklists WHERE task_id = ? ORDER BY sort_order ASC').all(taskId) as TaskChecklistItem[];

      return {
        ...created,
        checklists,
        total_items: checklists.length,
        completed_items: 0,
        is_overdue: false
      };
    });

    return transaction();
  });

  // 4. Update Task (Handles recurrence generation upon completion)
  ipcMain.handle('tasks:update', async (_event, id: number, updates: Partial<CreateTaskInput> & { status?: TaskStatus; result_notes?: string; completed_at?: string }): Promise<Task> => {
    const db = dbService.getDb();

    const transaction = db.transaction(() => {
      const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
      if (!existing) {
        throw new Error('المهمة غير موجودة');
      }

      let completedAt = existing.completed_at;
      if (updates.status === 'منتهية' && existing.status !== 'منتهية') {
        completedAt = new Date().toISOString();
      } else if (updates.status && updates.status !== 'منتهية') {
        completedAt = null;
      }

      db.prepare(`
        UPDATE tasks SET
          title = @title,
          description = @description,
          case_id = @case_id,
          client_id = @client_id,
          category = @category,
          priority = @priority,
          due_date = @due_date,
          due_time = @due_time,
          recurrence = @recurrence,
          recurrence_interval = @recurrence_interval,
          status = @status,
          completed_at = @completed_at,
          assigned_to = @assigned_to,
          estimated_duration = @estimated_duration,
          result_notes = @result_notes,
          reminder_minutes_before = @reminder_minutes_before,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `).run({
        id,
        title: updates.title !== undefined ? updates.title.trim() : existing.title,
        description: updates.description !== undefined ? updates.description?.trim() || null : existing.description,
        case_id: updates.case_id !== undefined ? updates.case_id : existing.case_id,
        client_id: updates.client_id !== undefined ? updates.client_id : existing.client_id,
        category: updates.category !== undefined ? updates.category : existing.category,
        priority: updates.priority !== undefined ? updates.priority : existing.priority,
        due_date: updates.due_date !== undefined ? updates.due_date : existing.due_date,
        due_time: updates.due_time !== undefined ? updates.due_time : existing.due_time,
        recurrence: updates.recurrence !== undefined ? updates.recurrence : existing.recurrence,
        recurrence_interval: updates.recurrence_interval !== undefined ? updates.recurrence_interval : existing.recurrence_interval,
        status: updates.status !== undefined ? updates.status : existing.status,
        completed_at: completedAt,
        assigned_to: updates.assigned_to !== undefined ? updates.assigned_to : existing.assigned_to,
        estimated_duration: updates.estimated_duration !== undefined ? updates.estimated_duration : existing.estimated_duration,
        result_notes: updates.result_notes !== undefined ? updates.result_notes : existing.result_notes,
        reminder_minutes_before: updates.reminder_minutes_before !== undefined ? updates.reminder_minutes_before : existing.reminder_minutes_before
      });

      // Handle recurrence when marked completed
      if (updates.status === 'منتهية' && existing.status !== 'منتهية' && existing.recurrence !== 'لا يتكرر') {
        let nextDate = existing.due_date;
        if (existing.recurrence === 'يومي') {
          nextDate = addDays(existing.due_date, 1);
        } else if (existing.recurrence === 'أسبوعي') {
          nextDate = addDays(existing.due_date, 7);
        } else if (existing.recurrence === 'شهري') {
          nextDate = addDays(existing.due_date, 30);
        } else if (existing.recurrence === 'مخصص' && existing.recurrence_interval) {
          nextDate = addDays(existing.due_date, existing.recurrence_interval);
        }

        const newRecurRes = db.prepare(`
          INSERT INTO tasks (
            title, description, case_id, client_id, category, priority,
            due_date, due_time, recurrence, recurrence_interval, status,
            assigned_to, estimated_duration, reminder_minutes_before
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'جديدة', ?, ?, ?)
        `).run(
          existing.title,
          existing.description,
          existing.case_id,
          existing.client_id,
          existing.category,
          existing.priority,
          nextDate,
          existing.due_time,
          existing.recurrence,
          existing.recurrence_interval,
          existing.assigned_to,
          existing.estimated_duration,
          existing.reminder_minutes_before
        );

        // Copy checklists to next recurring task
        const checklists = db.prepare('SELECT title, sort_order FROM task_checklists WHERE task_id = ?').all(id) as TaskChecklistItem[];
        const insertCl = db.prepare('INSERT INTO task_checklists (task_id, title, is_completed, sort_order) VALUES (?, ?, 0, ?)');
        for (const cl of checklists) {
          insertCl.run(newRecurRes.lastInsertRowid, cl.title, cl.sort_order);
        }
      }

      const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
      const checklists = db.prepare('SELECT * FROM task_checklists WHERE task_id = ? ORDER BY sort_order ASC').all(id) as TaskChecklistItem[];

      return {
        ...updated,
        checklists,
        total_items: checklists.length,
        completed_items: checklists.filter(c => c.is_completed === 1).length
      };
    });

    return transaction();
  });

  // 5. Toggle Checklist Item
  ipcMain.handle('tasks:toggleChecklistItem', async (_event, itemId: number, isCompleted: boolean): Promise<TaskChecklistItem> => {
    const db = dbService.getDb();
    db.prepare('UPDATE task_checklists SET is_completed = ? WHERE id = ?').run(isCompleted ? 1 : 0, itemId);
    return db.prepare('SELECT * FROM task_checklists WHERE id = ?').get(itemId) as TaskChecklistItem;
  });

  // 6. Delete Task
  ipcMain.handle('tasks:delete', async (_event, id: number): Promise<{ success: boolean }> => {
    const db = dbService.getDb();
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return { success: true };
  });

  // 7. Get Task Templates
  ipcMain.handle('tasks:getTemplates', async (): Promise<TaskTemplate[]> => {
    const db = dbService.getDb();
    const rows = db.prepare(`
      SELECT 
        tmpl.*,
        (SELECT COUNT(*) FROM task_template_items WHERE template_id = tmpl.id) as items_count
      FROM task_templates tmpl
      ORDER BY tmpl.is_default DESC, tmpl.id ASC
    `).all() as any[];

    return rows.map(r => ({
      ...r,
      items_count: Number(r.items_count) || 0
    }));
  });

  // 8. Get Task Template By ID (with items)
  ipcMain.handle('tasks:getTemplateById', async (_event, id: number): Promise<TaskTemplate | null> => {
    const db = dbService.getDb();
    const tmpl = db.prepare('SELECT * FROM task_templates WHERE id = ?').get(id) as TaskTemplate | undefined;
    if (!tmpl) return null;

    const items = db.prepare(`
      SELECT * FROM task_template_items WHERE template_id = ? ORDER BY sort_order ASC, id ASC
    `).all(id) as TaskTemplateItem[];

    return {
      ...tmpl,
      items,
      items_count: items.length
    };
  });

  // 9. Create Custom Task Template
  ipcMain.handle('tasks:createTemplate', async (_event, input: CreateTaskTemplateInput): Promise<TaskTemplate> => {
    const db = dbService.getDb();

    const transaction = db.transaction(() => {
      const res = db.prepare(`
        INSERT INTO task_templates (name, description, is_default)
        VALUES (?, ?, 0)
      `).run(input.name.trim(), input.description?.trim() || null);

      const templateId = res.lastInsertRowid as number;

      const insertItem = db.prepare(`
        INSERT INTO task_template_items (
          template_id, title, category, priority, days_offset,
          estimated_duration, checklist_items, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      input.items.forEach((item, idx) => {
        insertItem.run(
          templateId,
          item.title.trim(),
          item.category,
          item.priority || 'عادية',
          Number(item.days_offset) || 0,
          item.estimated_duration?.trim() || null,
          item.checklist_items?.trim() || null,
          item.sort_order || idx + 1
        );
      });

      const created = db.prepare('SELECT * FROM task_templates WHERE id = ?').get(templateId) as TaskTemplate;
      const items = db.prepare('SELECT * FROM task_template_items WHERE template_id = ? ORDER BY sort_order ASC').all(templateId) as TaskTemplateItem[];

      return {
        ...created,
        items,
        items_count: items.length
      };
    });

    return transaction();
  });

  // 10. Delete Task Template (Only non-default)
  ipcMain.handle('tasks:deleteTemplate', async (_event, id: number): Promise<{ success: boolean; message?: string }> => {
    const db = dbService.getDb();
    const tmpl = db.prepare('SELECT * FROM task_templates WHERE id = ?').get(id) as TaskTemplate | undefined;
    if (!tmpl) {
      return { success: false, message: 'القالب غير موجود' };
    }
    if (tmpl.is_default) {
      return { success: false, message: 'لا يمكن حذف قوالب النظام الافتراضية المعتمدة' };
    }

    db.prepare('DELETE FROM task_templates WHERE id = ?').run(id);
    return { success: true };
  });

  // 11. Apply Task Template (Atomic creation of tasks with checklist)
  ipcMain.handle('tasks:applyTemplate', async (_event, params: {
    templateId: number;
    caseId?: number;
    clientId?: number;
    baseDate?: string;
    assignedTo?: string;
  }): Promise<Task[]> => {
    const db = dbService.getDb();

    const transaction = db.transaction(() => {
      const items = db.prepare(`
        SELECT * FROM task_template_items WHERE template_id = ? ORDER BY sort_order ASC, id ASC
      `).all(params.templateId) as TaskTemplateItem[];

      if (items.length === 0) {
        return [];
      }

      const baseDate = params.baseDate || new Date().toISOString().split('T')[0];
      const assignedTo = params.assignedTo || 'أنا';

      const insertTask = db.prepare(`
        INSERT INTO tasks (
          title, case_id, client_id, category, priority, due_date,
          status, assigned_to, estimated_duration
        ) VALUES (?, ?, ?, ?, ?, ?, 'جديدة', ?, ?)
      `);

      const insertCl = db.prepare(`
        INSERT INTO task_checklists (task_id, title, is_completed, sort_order)
        VALUES (?, ?, 0, ?)
      `);

      const createdTasks: Task[] = [];

      for (const item of items) {
        const dueDate = addDays(baseDate, item.days_offset);
        const taskRes = insertTask.run(
          item.title,
          params.caseId || null,
          params.clientId || null,
          item.category,
          item.priority,
          dueDate,
          assignedTo,
          item.estimated_duration || null
        );

        const taskId = taskRes.lastInsertRowid as number;

        // Insert checklists if provided
        if (item.checklist_items && item.checklist_items.trim()) {
          const lines = item.checklist_items.split('\n').map(l => l.trim()).filter(Boolean);
          lines.forEach((line, idx) => {
            insertCl.run(taskId, line, idx + 1);
          });
        }

        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task;
        const checklists = db.prepare('SELECT * FROM task_checklists WHERE task_id = ? ORDER BY sort_order ASC').all(taskId) as TaskChecklistItem[];
        createdTasks.push({
          ...task,
          checklists,
          total_items: checklists.length,
          completed_items: 0
        });
      }

      return createdTasks;
    });

    return transaction();
  });

  // 12. Get Due Task Reminders (For Local Desktop Notifications)
  ipcMain.handle('tasks:getDueReminders', async (): Promise<Task[]> => {
    const db = dbService.getDb();
    const today = new Date().toISOString().split('T')[0];

    const rows = db.prepare(`
      SELECT t.*, c.case_number, c.court_name, cl.name as client_name
      FROM tasks t
      LEFT JOIN cases c ON c.id = t.case_id
      LEFT JOIN clients cl ON cl.id = t.client_id
      WHERE t.status NOT IN ('منتهية', 'ملغاة')
        AND t.reminder_shown = 0
        AND t.due_date <= ?
      ORDER BY t.priority = 'عاجلة' DESC, t.due_date ASC
      LIMIT 10
    `).all(today) as Task[];

    return rows;
  });

  // 13. Mark Reminder Shown
  ipcMain.handle('tasks:markReminderShown', async (_event, taskId: number): Promise<void> => {
    const db = dbService.getDb();
    db.prepare('UPDATE tasks SET reminder_shown = 1 WHERE id = ?').run(taskId);
  });

  // 14. Show Desktop Notification
  ipcMain.handle('tasks:showDesktopNotification', async (_event, options: { title: string; body: string }): Promise<boolean> => {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: options.title,
        body: options.body,
        silent: false
      });
      notification.show();
      return true;
    }
    return false;
  });
}
