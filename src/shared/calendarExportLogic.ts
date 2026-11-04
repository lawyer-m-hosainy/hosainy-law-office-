import {
  IcsAlarm,
  IcsEventInput,
  generateIcsCalendar
} from './icsGenerator';

export interface CalendarExportOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  includeHearings: boolean;
  includeTasks: boolean;
  includeAppeals: boolean;
  includeCheques: boolean;
  includePoaExpiry: boolean;
  privacyMode: boolean; // default true
  alarmTriggerDays?: number; // default 1 (1 day before)
  alarmTriggerHours?: number; // default 1 (1 hour before)
}

export interface RawHearingExportData {
  id: number;
  case_id: number;
  case_number: string;
  case_year: number;
  court_name: string;
  court_circuit?: string | null;
  court_hall?: string | null;
  roll_number?: number | null;
  hearing_date: string;
  hearing_time?: string | null;
  requests?: string | null;
  previous_decision?: string | null;
  adjournment_reason?: string | null;
  primary_client_name?: string | null;
  primary_opponent_name?: string | null;
  status?: string;
}

export interface RawTaskExportData {
  id: number;
  title: string;
  category: string;
  priority: string;
  due_date: string;
  due_time?: string | null;
  estimated_duration?: string | null;
  description?: string | null;
  case_number?: string | null;
  case_year?: number | null;
  court_name?: string | null;
  client_name?: string | null;
  status: string;
}

export interface RawAppealExportData {
  id: number;
  case_id: number;
  case_number: string;
  case_year: number;
  court_name: string;
  appeal_type: string;
  judgment_date: string;
  deadline_date: string;
  client_name?: string | null;
}

export interface RawChequeExportData {
  id: number;
  cheque_number: string;
  bank_name: string;
  amount: number; // in piasters
  due_date: string;
  drawer_name?: string | null;
  client_name?: string | null;
}

export interface RawPoaExportData {
  id: number; // client id
  client_name: string;
  poa_number?: string | null;
  poa_type?: string | null;
  poa_date?: string | null;
  poa_issuing_office?: string | null;
  poa_expiry_date: string;
}

export interface CalendarExportDataset {
  hearings?: RawHearingExportData[];
  tasks?: RawTaskExportData[];
  appeals?: RawAppealExportData[];
  cheques?: RawChequeExportData[];
  poas?: RawPoaExportData[];
}

/**
 * Builds VALARM configurations from options
 */
export function buildAlarmsFromOptions(options: {
  alarmTriggerDays?: number;
  alarmTriggerHours?: number;
}): IcsAlarm[] {
  const alarms: IcsAlarm[] = [];

  const days = options.alarmTriggerDays !== undefined ? options.alarmTriggerDays : 1;
  const hours = options.alarmTriggerHours !== undefined ? options.alarmTriggerHours : 1;

  if (days > 0) {
    alarms.push({
      triggerMinutesBefore: days * 1440,
      description: `تذكير بالموعد قبل ${days === 1 ? 'يوم' : days === 2 ? 'يومين' : `${days} أيام`}`
    });
  }

  if (hours > 0) {
    alarms.push({
      triggerMinutesBefore: hours * 60,
      description: `تذكير بالموعد قبل ${hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتين' : `${hours} ساعات`}`
    });
  }

  return alarms;
}

/**
 * Transforms raw hearings into RFC 5545 events
 */
export function transformHearingsToIcsEvents(
  hearings: RawHearingExportData[],
  privacyMode: boolean,
  alarms: IcsAlarm[]
): IcsEventInput[] {
  return hearings.map(h => {
    const caseTitle = `ق ${h.case_number} لسنة ${h.case_year} - ${h.court_name}`;

    // Summary:
    // If privacyMode is on: only case number, year, and court name.
    // If privacyMode is off: include client and opponent.
    let summary: string;
    if (privacyMode) {
      summary = `جلسة ${caseTitle}`;
    } else {
      const parties = [
        h.primary_client_name ? `موكل: ${h.primary_client_name}` : null,
        h.primary_opponent_name ? `ضد: ${h.primary_opponent_name}` : null
      ].filter(Boolean).join(' | ');
      summary = `جلسة ${caseTitle}${parties ? ` (${parties})` : ''}`;
    }

    // Description:
    // Required in prompt:
    // "الوصف: المطلوب في الجلسة والجلسة السابقة وسبب التأجيل"
    // In privacyMode: strictly no client or opponent names.
    const descLines: string[] = [];
    if (!privacyMode) {
      if (h.primary_client_name) descLines.push(`الموكل: ${h.primary_client_name}`);
      if (h.primary_opponent_name) descLines.push(`الخصم: ${h.primary_opponent_name}`);
    }
    if (h.court_circuit) descLines.push(`الدائرة: ${h.court_circuit}`);
    descLines.push(`المطلوب في الجلسة: ${h.requests && h.requests.trim() ? h.requests.trim() : 'غير محدد'}`);
    if (h.previous_decision && h.previous_decision.trim()) {
      descLines.push(`الجلسة السابقة: ${h.previous_decision.trim()}`);
    }
    if (h.adjournment_reason && h.adjournment_reason.trim()) {
      descLines.push(`سبب التأجيل: ${h.adjournment_reason.trim()}`);
    }

    // Location:
    const locParts: string[] = [h.court_name];
    if (h.court_circuit) locParts.push(h.court_circuit);
    if (h.court_hall) locParts.push(`قاعة ${h.court_hall}`);
    if (h.roll_number) locParts.push(`رول ${h.roll_number}`);

    return {
      uid: `hearing-${h.id}@lawoffice.local`,
      summary,
      description: descLines.join('\n'),
      location: locParts.join(' - '),
      startDate: h.hearing_date,
      startTime: h.hearing_time || null,
      allDay: !h.hearing_time || !h.hearing_time.trim(),
      categories: ['جلسات', 'محاكم'],
      alarms
    };
  });
}

/**
 * Transforms raw tasks into RFC 5545 events
 */
export function transformTasksToIcsEvents(
  tasks: RawTaskExportData[],
  privacyMode: boolean,
  alarms: IcsAlarm[]
): IcsEventInput[] {
  return tasks.map(t => {
    let summary: string;
    if (privacyMode) {
      summary = `مهمة: ${t.title}`;
    } else {
      const caseSuffix = t.case_number ? ` (ق ${t.case_number}/${t.case_year || ''})` : '';
      summary = `مهمة: ${t.title}${caseSuffix}`;
    }

    const descLines: string[] = [
      `التصنيف: ${t.category}`,
      `الأولوية: ${t.priority}`
    ];
    if (t.estimated_duration) descLines.push(`المدة التقديرية: ${t.estimated_duration}`);
    if (!privacyMode) {
      if (t.client_name) descLines.push(`الموكل: ${t.client_name}`);
      if (t.case_number) descLines.push(`القضية: ق ${t.case_number} لسنة ${t.case_year || ''} - ${t.court_name || ''}`);
    }
    if (t.description && t.description.trim()) {
      descLines.push(`التفاصيل: ${t.description.trim()}`);
    }

    return {
      uid: `task-${t.id}@lawoffice.local`,
      summary,
      description: descLines.join('\n'),
      location: t.court_name || undefined,
      startDate: t.due_date,
      startTime: t.due_time || null,
      allDay: !t.due_time || !t.due_time.trim(),
      categories: ['مهام', t.category],
      alarms
    };
  });
}

/**
 * Transforms appeal deadlines into RFC 5545 events
 */
export function transformAppealsToIcsEvents(
  appeals: RawAppealExportData[],
  privacyMode: boolean,
  alarms: IcsAlarm[]
): IcsEventInput[] {
  return appeals.map(a => {
    const summary = `ميعاد طعن ${a.appeal_type} - ق ${a.case_number} لسنة ${a.case_year}`;
    const descLines: string[] = [
      `نوع الطعن: ${a.appeal_type}`,
      `المحكمة: ${a.court_name}`,
      `تاريخ صدور الحكم: ${a.judgment_date}`,
      `آخر ميعاد للطعن: ${a.deadline_date}`
    ];
    if (!privacyMode && a.client_name) {
      descLines.push(`الموكل: ${a.client_name}`);
    }

    return {
      uid: `appeal-${a.id}@lawoffice.local`,
      summary,
      description: descLines.join('\n'),
      location: a.court_name,
      startDate: a.deadline_date,
      allDay: true,
      categories: ['مواعيد طعن', 'قضايا'],
      alarms
    };
  });
}

/**
 * Transforms due cheques into RFC 5545 events
 */
export function transformChequesToIcsEvents(
  cheques: RawChequeExportData[],
  privacyMode: boolean,
  alarms: IcsAlarm[]
): IcsEventInput[] {
  return cheques.map(c => {
    const amountStr = (c.amount / 100).toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const summary = `شيك مستحق السداد - رقم ${c.cheque_number}`;
    const descLines: string[] = [
      `رقم الشيك: ${c.cheque_number}`,
      `البنك: ${c.bank_name}`,
      `المبلغ: ${amountStr} ج.م`,
      `تاريخ الاستحقاق: ${c.due_date}`
    ];
    if (!privacyMode) {
      if (c.drawer_name) descLines.push(`الساحب: ${c.drawer_name}`);
      if (c.client_name) descLines.push(`الموكل: ${c.client_name}`);
    }

    return {
      uid: `cheque-${c.id}@lawoffice.local`,
      summary,
      description: descLines.join('\n'),
      location: c.bank_name,
      startDate: c.due_date,
      allDay: true,
      categories: ['شيكات', 'مالية'],
      alarms
    };
  });
}

/**
 * Transforms expiring Powers of Attorney into RFC 5545 events
 */
export function transformPoaToIcsEvents(
  poas: RawPoaExportData[],
  privacyMode: boolean,
  alarms: IcsAlarm[]
): IcsEventInput[] {
  return poas.map(p => {
    let summary: string;
    if (privacyMode) {
      summary = `انتهاء توكيل قضائي رقم ${p.poa_number || 'بدون رقم'}`;
    } else {
      summary = `انتهاء توكيل: ${p.client_name} (رقم ${p.poa_number || 'بدون رقم'})`;
    }

    const descLines: string[] = [
      `رقم التوكيل: ${p.poa_number || 'غير مسجل'}`,
      `النوع: ${p.poa_type || 'قضايا عام'}`,
      `مكتب التوثيق: ${p.poa_issuing_office || 'غير محدد'}`,
      `تاريخ التوكيل: ${p.poa_date || '-'}`,
      `تاريخ الانتهاء: ${p.poa_expiry_date}`
    ];
    if (!privacyMode) {
      descLines.unshift(`الموكل: ${p.client_name}`);
    }

    return {
      uid: `poa-${p.id}@lawoffice.local`,
      summary,
      description: descLines.join('\n'),
      location: p.poa_issuing_office || undefined,
      startDate: p.poa_expiry_date,
      allDay: true,
      categories: ['توكيلات', 'موكلين'],
      alarms
    };
  });
}

/**
 * Generates the full iCalendar file from dataset and options
 */
export function buildIcsFromDataset(
  dataset: CalendarExportDataset,
  options: CalendarExportOptions,
  calendarName: string = 'تقويم مكتب المحاماة'
): { icsContent: string; eventsCount: number } {
  const alarms = buildAlarmsFromOptions({
    alarmTriggerDays: options.alarmTriggerDays,
    alarmTriggerHours: options.alarmTriggerHours
  });

  const allEvents: IcsEventInput[] = [];

  if (options.includeHearings && dataset.hearings) {
    allEvents.push(...transformHearingsToIcsEvents(dataset.hearings, options.privacyMode, alarms));
  }
  if (options.includeTasks && dataset.tasks) {
    allEvents.push(...transformTasksToIcsEvents(dataset.tasks, options.privacyMode, alarms));
  }
  if (options.includeAppeals && dataset.appeals) {
    allEvents.push(...transformAppealsToIcsEvents(dataset.appeals, options.privacyMode, alarms));
  }
  if (options.includeCheques && dataset.cheques) {
    allEvents.push(...transformChequesToIcsEvents(dataset.cheques, options.privacyMode, alarms));
  }
  if (options.includePoaExpiry && dataset.poas) {
    allEvents.push(...transformPoaToIcsEvents(dataset.poas, options.privacyMode, alarms));
  }

  // Sort events chronologically by startDate, then startTime
  allEvents.sort((a, b) => {
    const dComp = a.startDate.localeCompare(b.startDate);
    if (dComp !== 0) return dComp;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  const icsContent = generateIcsCalendar({
    calendarName: options.privacyMode ? `${calendarName} (وضع الخصوصية)` : calendarName,
    calendarDescription: options.privacyMode
      ? 'مواعيد العمل القضائي الصادرة بوضع الخصوصية (خالية من أسماء الأطراف)'
      : 'مواعيد العمل القضائي الصادرة من برنامج إدارة مكتب المحاماة',
    events: allEvents
  });

  return {
    icsContent,
    eventsCount: allEvents.length
  };
}

/**
 * Arabic Day Names
 */
const ARABIC_DAYS_OF_WEEK = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت'
];

/**
 * Generates Today's Summary text in Arabic (ready to copy to clipboard)
 * respecting Privacy Mode.
 */
export function generateTodaySummaryText(params: {
  todayDateStr: string; // YYYY-MM-DD
  hearings: RawHearingExportData[];
  tasks: RawTaskExportData[];
  privacyMode: boolean;
}): string {
  const { todayDateStr, hearings, tasks, privacyMode } = params;

  // Format date display
  const [y, m, d] = todayDateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayName = ARABIC_DAYS_OF_WEEK[dateObj.getDay()] || '';

  const header = `📅 ملخص أعمال اليوم (${dayName} ${todayDateStr})${privacyMode ? ' [وضع الخصوصية]' : ''}`;
  const sections: string[] = [header, '────────────────────'];

  // Hearings section
  if (hearings.length === 0) {
    sections.push('⚖️ الجلسات: لا توجد جلسات مجدولة اليوم.');
  } else {
    sections.push(`⚖️ الجلسات القضائية (${hearings.length}):`);
    hearings.forEach((h, idx) => {
      const timePart = h.hearing_time ? ` [الساعة ${h.hearing_time}]` : '';
      const rollPart = h.roll_number ? ` (رول ${h.roll_number})` : '';
      const courtPart = `${h.court_name}${h.court_circuit ? ' - ' + h.court_circuit : ''}`;

      let itemLine = `${idx + 1}. ق ${h.case_number} لسنة ${h.case_year} - ${courtPart}${rollPart}${timePart}`;
      if (!privacyMode) {
        if (h.primary_client_name) itemLine += `\n   • الموكل: ${h.primary_client_name}`;
        if (h.primary_opponent_name) itemLine += ` | الخصم: ${h.primary_opponent_name}`;
      }
      if (h.requests && h.requests.trim()) {
        itemLine += `\n   • المطلوب: ${h.requests.trim()}`;
      }
      if (h.adjournment_reason && h.adjournment_reason.trim()) {
        itemLine += `\n   • التأجيل: ${h.adjournment_reason.trim()}`;
      }
      sections.push(itemLine);
    });
  }

  sections.push('');

  // Tasks section
  if (tasks.length === 0) {
    sections.push('📌 المهام: لا توجد مهام مستحقة اليوم.');
  } else {
    sections.push(`📌 المهام والمأموريات (${tasks.length}):`);
    tasks.forEach((t, idx) => {
      const timePart = t.due_time ? ` [الساعة ${t.due_time}]` : '';
      const priorityPart = t.priority === 'عاجلة' ? ' 🔴' : t.priority === 'مهمة' ? ' 🟡' : '';
      let itemLine = `${idx + 1}. ${t.title}${priorityPart} [${t.category}]${timePart}`;
      if (!privacyMode && t.client_name) {
        itemLine += ` (الموكل: ${t.client_name})`;
      }
      if (t.description && t.description.trim()) {
        itemLine += `\n   • ملاحظات: ${t.description.trim()}`;
      }
      sections.push(itemLine);
    });
  }

  sections.push('────────────────────');
  sections.push('تم الاستخراج من برنامج إدارة مكتب المحاماة (أوفلاين 100%)');

  return sections.join('\n');
}
