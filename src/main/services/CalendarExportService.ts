import fs from 'fs';
import path from 'path';
import { DatabaseService } from './DatabaseService';
import { DataDirService } from './DataDirService';
import {
  CalendarExportOptions,
  CalendarExportDataset,
  RawHearingExportData,
  RawTaskExportData,
  RawAppealExportData,
  RawChequeExportData,
  RawPoaExportData,
  buildIcsFromDataset,
  generateTodaySummaryText
} from '../../shared/calendarExportLogic';
import { CalendarExportCounts, CalendarExportResult, OfficeSettings } from '../../shared/types';

export class CalendarExportService {
  private static instance: CalendarExportService | null = null;
  private dbService = DatabaseService.getInstance();
  private dataDirService = DataDirService.getInstance();

  public static getInstance(): CalendarExportService {
    if (!CalendarExportService.instance) {
      CalendarExportService.instance = new CalendarExportService();
    }
    return CalendarExportService.instance;
  }

  /**
   * Queries dataset for calendar export between startDate and endDate
   */
  public queryDataset(options: CalendarExportOptions): CalendarExportDataset {
    const db = this.dbService.getDb();
    const dataset: CalendarExportDataset = {};
    const { startDate, endDate } = options;

    // 1. Hearings
    if (options.includeHearings) {
      const sql = `
        SELECT 
          h.id,
          h.case_id,
          c.case_number,
          c.case_year,
          h.court_name,
          h.court_circuit,
          h.court_hall,
          h.roll_number,
          h.hearing_date,
          h.hearing_time,
          h.requests,
          h.adjournment_reason,
          h.status,
          (SELECT cl.name FROM case_clients cc JOIN clients cl ON cl.id = cc.client_id WHERE cc.case_id = h.case_id AND cc.is_primary = 1 LIMIT 1) as primary_client_name,
          (SELECT co.name FROM case_opponents co WHERE co.case_id = h.case_id LIMIT 1) as primary_opponent_name,
          prev.court_decision as previous_decision
        FROM hearings h
        JOIN cases c ON c.id = h.case_id
        LEFT JOIN hearings prev ON prev.id = (
          SELECT id FROM hearings p
          WHERE p.case_id = h.case_id AND (p.hearing_date < h.hearing_date OR (p.hearing_date = h.hearing_date AND p.id < h.id))
          ORDER BY p.hearing_date DESC, p.id DESC
          LIMIT 1
        )
        WHERE h.hearing_date >= ? AND h.hearing_date <= ? AND (h.status IS NULL OR h.status != 'ملغاة')
        ORDER BY h.hearing_date ASC, h.hearing_time ASC, h.id ASC
      `;
      dataset.hearings = db.prepare(sql).all(startDate, endDate) as RawHearingExportData[];
    }

    // 2. Tasks
    if (options.includeTasks) {
      const sql = `
        SELECT 
          t.id,
          t.title,
          t.category,
          t.priority,
          t.due_date,
          t.due_time,
          t.estimated_duration,
          t.description,
          t.status,
          c.case_number,
          c.case_year,
          c.court_name,
          cl.name as client_name
        FROM tasks t
        LEFT JOIN cases c ON c.id = t.case_id
        LEFT JOIN clients cl ON cl.id = t.client_id
        WHERE t.due_date >= ? AND t.due_date <= ? AND t.status != 'ملغاة'
        ORDER BY t.due_date ASC, t.due_time ASC, t.id ASC
      `;
      dataset.tasks = db.prepare(sql).all(startDate, endDate) as RawTaskExportData[];
    }

    // 3. Appeals
    if (options.includeAppeals) {
      const sql = `
        SELECT 
          a.id,
          a.case_id,
          c.case_number,
          c.case_year,
          c.court_name,
          a.appeal_type,
          a.judgment_date,
          a.deadline_date,
          (SELECT cl.name FROM case_clients cc JOIN clients cl ON cl.id = cc.client_id WHERE cc.case_id = a.case_id AND cc.is_primary = 1 LIMIT 1) as client_name
        FROM case_appeal_deadlines a
        JOIN cases c ON c.id = a.case_id
        WHERE a.deadline_date >= ? AND a.deadline_date <= ?
        ORDER BY a.deadline_date ASC, a.id ASC
      `;
      dataset.appeals = db.prepare(sql).all(startDate, endDate) as RawAppealExportData[];
    }

    // 4. Cheques
    if (options.includeCheques) {
      const sql = `
        SELECT 
          cd.id,
          cd.cheque_number,
          cd.bank_name,
          cd.amount,
          cd.due_date,
          cd.drawer_name,
          cl.name as client_name
        FROM cheque_details cd
        LEFT JOIN clients cl ON cl.id = cd.client_id
        WHERE cd.due_date >= ? AND cd.due_date <= ? AND cd.status != 'محصل'
        ORDER BY cd.due_date ASC, cd.id ASC
      `;
      dataset.cheques = db.prepare(sql).all(startDate, endDate) as RawChequeExportData[];
    }

    // 5. POA Expirations
    if (options.includePoaExpiry) {
      const sql = `
        SELECT 
          id,
          name as client_name,
          poa_number,
          poa_type,
          poa_date,
          poa_issuing_office,
          poa_expiry_date
        FROM clients
        WHERE status = 'active'
          AND poa_expiry_date IS NOT NULL
          AND poa_expiry_date != ''
          AND poa_expiry_date >= ?
          AND poa_expiry_date <= ?
        ORDER BY poa_expiry_date ASC, id ASC
      `;
      dataset.poas = db.prepare(sql).all(startDate, endDate) as RawPoaExportData[];
    }

    return dataset;
  }

  /**
   * Calculates counts of matching records for preview
   */
  public getCounts(options: CalendarExportOptions): CalendarExportCounts {
    const dataset = this.queryDataset(options);
    const hearings = dataset.hearings?.length || 0;
    const tasks = dataset.tasks?.length || 0;
    const appeals = dataset.appeals?.length || 0;
    const cheques = dataset.cheques?.length || 0;
    const poa = dataset.poas?.length || 0;

    return {
      hearings,
      tasks,
      appeals,
      cheques,
      poa,
      total: hearings + tasks + appeals + cheques + poa
    };
  }

  /**
   * Exports calendar events to an RFC 5545 .ics file in exports/ directory
   */
  public exportIcs(options: CalendarExportOptions): CalendarExportResult {
    try {
      const exportsDir = this.dataDirService.getExportsPath();
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      // Read office name from settings
      const db = this.dbService.getDb();
      const settingsRow = db.prepare('SELECT * FROM office_settings WHERE id = 1').get() as OfficeSettings | undefined;
      const officeName = settingsRow?.office_name || 'مكتب المحاماة';

      // Query dataset
      const dataset = this.queryDataset(options);

      // Build RFC 5545 iCalendar content
      const { icsContent, eventsCount } = buildIcsFromDataset(dataset, options, officeName);

      // Generate filename: calendar_export_YYYYMMDD_HHmmss.ics
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const privacyTag = options.privacyMode ? '_privacy' : '';
      const fileName = `calendar_export_${yyyy}${mm}${dd}_${hh}${min}${ss}${privacyTag}.ics`;
      const filePath = path.join(exportsDir, fileName);

      // Write UTF-8 file
      fs.writeFileSync(filePath, icsContent, 'utf-8');

      return {
        success: true,
        filePath,
        eventsCount
      };
    } catch (err: any) {
      console.error('Failed to export calendar ICS:', err);
      return {
        success: false,
        error: err?.message || 'فشل تصدير ملف التقويم'
      };
    }
  }

  /**
   * Generates Today's Summary text in Arabic (WhatsApp / clipboard format)
   */
  public getTodaySummary(options?: { privacyMode?: boolean }): string {
    const db = this.dbService.getDb();
    const today = new Date().toISOString().slice(0, 10);

    // Get default privacy mode from settings if not specified
    let privacyMode = options?.privacyMode;
    if (privacyMode === undefined) {
      const settingsRow = db.prepare('SELECT calendar_privacy_mode FROM office_settings WHERE id = 1').get() as { calendar_privacy_mode?: number } | undefined;
      privacyMode = settingsRow?.calendar_privacy_mode !== undefined ? Boolean(settingsRow.calendar_privacy_mode) : true;
    }

    // 1. Today's Hearings
    const hearingsSql = `
      SELECT 
        h.id,
        h.case_id,
        c.case_number,
        c.case_year,
        h.court_name,
        h.court_circuit,
        h.court_hall,
        h.roll_number,
        h.hearing_date,
        h.hearing_time,
        h.requests,
        h.adjournment_reason,
        h.status,
        (SELECT cl.name FROM case_clients cc JOIN clients cl ON cl.id = cc.client_id WHERE cc.case_id = h.case_id AND cc.is_primary = 1 LIMIT 1) as primary_client_name,
        (SELECT co.name FROM case_opponents co WHERE co.case_id = h.case_id LIMIT 1) as primary_opponent_name,
        prev.court_decision as previous_decision
      FROM hearings h
      JOIN cases c ON c.id = h.case_id
      LEFT JOIN hearings prev ON prev.id = (
        SELECT id FROM hearings p
        WHERE p.case_id = h.case_id AND (p.hearing_date < h.hearing_date OR (p.hearing_date = h.hearing_date AND p.id < h.id))
        ORDER BY p.hearing_date DESC, p.id DESC
        LIMIT 1
      )
      WHERE h.hearing_date = ? AND (h.status IS NULL OR h.status != 'ملغاة')
      ORDER BY h.hearing_time ASC, h.roll_number ASC, h.id ASC
    `;
    const hearings = db.prepare(hearingsSql).all(today) as RawHearingExportData[];

    // 2. Today's Tasks
    const tasksSql = `
      SELECT 
        t.id,
        t.title,
        t.category,
        t.priority,
        t.due_date,
        t.due_time,
        t.estimated_duration,
        t.description,
        t.status,
        c.case_number,
        c.case_year,
        c.court_name,
        cl.name as client_name
      FROM tasks t
      LEFT JOIN cases c ON c.id = t.case_id
      LEFT JOIN clients cl ON cl.id = t.client_id
      WHERE t.due_date = ? AND t.status != 'ملغاة'
      ORDER BY t.due_time ASC, t.priority DESC, t.id ASC
    `;
    const tasks = db.prepare(tasksSql).all(today) as RawTaskExportData[];

    return generateTodaySummaryText({
      todayDateStr: today,
      hearings,
      tasks,
      privacyMode
    });
  }
}
