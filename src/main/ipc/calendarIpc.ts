import { ipcMain } from 'electron';
import { CalendarExportService } from '../services/CalendarExportService';
import {
  CalendarExportOptions,
  CalendarExportResult,
  CalendarExportCounts
} from '../../shared/types';

export function registerCalendarIpc(): void {
  const calendarService = CalendarExportService.getInstance();

  // Export to .ics
  ipcMain.handle(
    'calendar:exportIcs',
    async (_event, options: CalendarExportOptions): Promise<CalendarExportResult> => {
      return calendarService.exportIcs(options);
    }
  );

  // Get preview counts
  ipcMain.handle(
    'calendar:getExportCounts',
    async (_event, options: CalendarExportOptions): Promise<CalendarExportCounts> => {
      return calendarService.getCounts(options);
    }
  );

  // Get Today's Summary text
  ipcMain.handle(
    'calendar:getTodaySummary',
    async (_event, options?: { privacyMode?: boolean }): Promise<string> => {
      return calendarService.getTodaySummary(options);
    }
  );
}
