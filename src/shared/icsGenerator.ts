/**
 * RFC 5545 iCalendar (.ics) Generator
 * Strictly offline, pure TypeScript, zero network calls.
 */

export interface IcsAlarm {
  triggerMinutesBefore: number;
  description?: string;
}

export interface IcsEventInput {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string | null; // HH:MM or HH:MM:SS
  endDate?: string | null; // YYYY-MM-DD (defaults to startDate)
  endTime?: string | null; // HH:MM or HH:MM:SS (if startTime present and endTime absent, defaults to +1 hour)
  allDay?: boolean;
  categories?: string[];
  alarms?: IcsAlarm[];
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  created?: Date;
  lastModified?: Date;
}

export interface IcsCalendarOptions {
  prodId?: string;
  calendarName?: string;
  calendarDescription?: string;
  events: IcsEventInput[];
}

/**
 * Escapes characters for TEXT values in RFC 5545:
 * Backslash (\) -> \\
 * Semicolon (;) -> \;
 * Comma (,) -> \,
 * Newlines (\r\n, \r, \n) -> \n (literal backslash followed by 'n')
 */
export function escapeIcsText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Calculates UTF-8 byte length of a string safely
 */
export function getUtf8ByteLength(str: string): number {
  return Buffer.byteLength(str, 'utf-8');
}

/**
 * Splits a single iCalendar content line into folded lines of at most 75 octets (bytes),
 * strictly preserving UTF-8 character boundaries (never splitting multi-byte code points).
 * RFC 5545 Section 3.1:
 * "Lines of text SHOULD NOT be longer than 75 octets, excluding the line break.
 *  Long content lines SHOULD be split into a smaller set of content lines using a line folding technique.
 *  That is, a long line can be split between any two characters by inserting a CRLF immediately followed
 *  by a single linear white-space character (i.e., SPACE)."
 */
export function foldIcsLine(line: string): string {
  // If the whole line in UTF-8 is already <= 75 bytes, return it as-is
  if (getUtf8ByteLength(line) <= 75) {
    return line;
  }

  const parts: string[] = [];
  let currentPart = '';
  let currentPartBytes = 0;
  let isFirstLine = true;

  // Use Array.from to correctly iterate over Unicode code points
  const chars = Array.from(line);

  for (const char of chars) {
    const charBytes = getUtf8ByteLength(char);
    // The first line can have up to 75 bytes.
    // Subsequent folded lines start with a single SPACE (1 byte), so max characters byte length is 74.
    const maxBytesAllowed = isFirstLine ? 75 : 74;

    if (currentPartBytes + charBytes > maxBytesAllowed) {
      if (currentPart.length > 0) {
        parts.push(currentPart);
      }
      currentPart = char;
      currentPartBytes = charBytes;
      isFirstLine = false;
    } else {
      currentPart += char;
      currentPartBytes += charBytes;
    }
  }

  if (currentPart.length > 0) {
    parts.push(currentPart);
  }

  // Join lines with CRLF followed by a single SPACE
  return parts.join('\r\n ');
}

/**
 * Formats a date string (YYYY-MM-DD) into iCalendar DATE format (YYYYMMDD)
 */
export function formatIcsDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

/**
 * Returns the next day date string (YYYY-MM-DD) for inclusive-to-exclusive all-day DTEND
 */
export function getNextDayDateStr(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a date and time into RFC 5545 Floating Time:
 * "Floating" time has NO trailing 'Z' and NO 'TZID'.
 * Form: YYYYMMDDTHHMMSS
 */
export function formatIcsFloatingDateTime(dateStr: string, timeStr: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  const timeParts = timeStr.trim().split(':');
  const hh = (timeParts[0] || '00').padStart(2, '0');
  const mm = (timeParts[1] || '00').padStart(2, '0');
  const ss = (timeParts[2] || '00').padStart(2, '0');
  return `${cleanDate}T${hh}${mm}${ss}`;
}

/**
 * Adds hours/minutes to a time string (HH:MM or HH:MM:SS)
 */
export function addHoursToTime(timeStr: string, hoursToAdd: number = 1): string {
  const parts = timeStr.trim().split(':');
  let hh = parseInt(parts[0] || '0', 10) + hoursToAdd;
  const mm = parts[1] || '00';
  const ss = parts[2] || '00';
  if (hh >= 24) hh = 23; // cap at 23 to avoid day overflow in same-day event
  return `${String(hh).padStart(2, '0')}:${mm}:${ss}`;
}

/**
 * Formats a JavaScript Date to UTC timestamp for DTSTAMP / CREATED: YYYYMMDDTHHMMSSZ
 */
export function formatIcsUtcDateTime(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${day}T${h}${min}${s}Z`;
}

/**
 * Converts trigger minutes before into an RFC 5545 duration string:
 * e.g., 1440 minutes -> -P1D
 *       60 minutes -> -PT1H
 *       120 minutes -> -PT2H
 *       30 minutes -> -PT30M
 */
export function formatIcsAlarmTrigger(minutesBefore: number): string {
  if (minutesBefore <= 0) {
    return 'PT0S';
  }
  if (minutesBefore % 1440 === 0) {
    const days = minutesBefore / 1440;
    return `-P${days}D`;
  }
  if (minutesBefore % 60 === 0) {
    const hours = minutesBefore / 60;
    return `-PT${hours}H`;
  }
  return `-PT${minutesBefore}M`;
}

/**
 * Parses user alarm trigger configuration string (e.g. "1d,1h" or "1440,60" or "2d")
 * into array of minutes before.
 */
export function parseAlarmTriggers(configStr?: string | null): number[] {
  if (!configStr || !configStr.trim()) {
    // Default: 1 day before (1440 mins) and 1 hour before (60 mins)
    return [1440, 60];
  }

  const result: number[] = [];
  const parts = configStr.split(',').map(s => s.trim().toLowerCase());

  for (const part of parts) {
    if (!part) continue;
    if (part.endsWith('d')) {
      const days = parseFloat(part.slice(0, -1));
      if (!isNaN(days) && days > 0) result.push(Math.round(days * 1440));
    } else if (part.endsWith('h')) {
      const hours = parseFloat(part.slice(0, -1));
      if (!isNaN(hours) && hours > 0) result.push(Math.round(hours * 60));
    } else if (part.endsWith('m')) {
      const mins = parseFloat(part.slice(0, -1));
      if (!isNaN(mins) && mins > 0) result.push(Math.round(mins));
    } else {
      const num = parseFloat(part);
      if (!isNaN(num) && num > 0) {
        // If > 24 assume minutes, else assume days or minutes
        result.push(Math.round(num));
      }
    }
  }

  return result.length > 0 ? result : [1440, 60];
}

/**
 * Builds a single VEVENT block according to RFC 5545
 */
export function generateVEvent(event: IcsEventInput, now: Date = new Date()): string[] {
  const lines: string[] = [];
  const dtstamp = formatIcsUtcDateTime(now);

  lines.push('BEGIN:VEVENT');
  lines.push(`UID:${event.uid}`);
  lines.push(`DTSTAMP:${dtstamp}`);

  if (event.created) {
    lines.push(`CREATED:${formatIcsUtcDateTime(event.created)}`);
  }
  if (event.lastModified) {
    lines.push(`LAST-MODIFIED:${formatIcsUtcDateTime(event.lastModified)}`);
  }

  const isTimed = !event.allDay && Boolean(event.startTime && event.startTime.trim());

  if (isTimed) {
    // Floating Time: Date with local time, NO 'Z' and NO 'TZID'
    const startTime = event.startTime!.trim();
    const endTime = event.endTime && event.endTime.trim() ? event.endTime.trim() : addHoursToTime(startTime, 1);
    const endDate = event.endDate || event.startDate;

    lines.push(`DTSTART:${formatIcsFloatingDateTime(event.startDate, startTime)}`);
    lines.push(`DTEND:${formatIcsFloatingDateTime(endDate, endTime)}`);
  } else {
    // All-day event: VALUE=DATE
    // According to RFC 5545, DTEND is exclusive for DATE values, so next day.
    const startFormatted = formatIcsDate(event.startDate);
    const nextDay = getNextDayDateStr(event.endDate || event.startDate);
    const endFormatted = formatIcsDate(nextDay);

    lines.push(`DTSTART;VALUE=DATE:${startFormatted}`);
    lines.push(`DTEND;VALUE=DATE:${endFormatted}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(event.summary)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  if (event.categories && event.categories.length > 0) {
    lines.push(`CATEGORIES:${event.categories.map(c => escapeIcsText(c)).join(',')}`);
  }

  lines.push(`STATUS:${event.status || 'CONFIRMED'}`);
  lines.push('TRANSP:OPAQUE');

  // Add VALARMs
  if (event.alarms && event.alarms.length > 0) {
    for (const alarm of event.alarms) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:${escapeIcsText(alarm.description || event.summary || 'تذكير بالموعد')}`);
      lines.push(`TRIGGER:${formatIcsAlarmTrigger(alarm.triggerMinutesBefore)}`);
      lines.push('END:VALARM');
    }
  }

  lines.push('END:VEVENT');

  return lines;
}

/**
 * Generates a complete RFC 5545 iCalendar string.
 * All lines are properly folded at 75 bytes without splitting UTF-8 characters,
 * and terminated with standard CRLF (\r\n).
 */
export function generateIcsCalendar(options: IcsCalendarOptions): string {
  const {
    prodId = '-//Law Office Management//Calendar Export//AR',
    calendarName = 'تقويم مكتب المحاماة',
    calendarDescription = 'تصدير مواعيد وجلسات ومهام مكتب المحاماة',
    events
  } = options;

  const rawLines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    `X-WR-CALDESC:${escapeIcsText(calendarDescription)}`,
    'X-WR-TIMEZONE:Africa/Cairo'
  ];

  const now = new Date();
  for (const event of events) {
    const eventLines = generateVEvent(event, now);
    rawLines.push(...eventLines);
  }

  rawLines.push('END:VCALENDAR');

  // Apply RFC 5545 line folding (max 75 octets with UTF-8 safety) and join with CRLF
  const foldedLines = rawLines.map(line => foldIcsLine(line));

  return foldedLines.join('\r\n') + '\r\n';
}
