export type ConfigurableListType = 
  | 'courts' 
  | 'case_types' 
  | 'adjournment_reasons' 
  | 'task_categories' 
  | 'transaction_types';

export interface ConfigurableListItem {
  id: number;
  list_type: ConfigurableListType;
  name: string;
  category?: string | null;
  sort_order: number;
  is_active: number; // 1 or 0
  is_default: number; // 1 or 0
  created_at?: string;
  updated_at?: string;
}

export interface OfficeSettings {
  id: number;
  office_name: string;
  lawyer_name: string;
  title: string;
  phone: string;
  phone2?: string;
  email?: string;
  address?: string;
  bar_registration_number?: string;
  tax_number?: string;
  logo_path?: string;
  notes?: string;
  appeal_deadline_civil: number;
  appeal_deadline_misdemeanor: number;
  appeal_deadline_cassation: number;
  appeal_deadline_urgent: number;
  appeal_deadline_family: number;
  appeal_deadline_admin: number;
  date_format: string; // 'ar-EG' | 'en-US'
  alert_days_before: number;
  created_at?: string;
  updated_at?: string;
}

export interface DataDirInfo {
  currentPath: string;
  dbPath: string;
  attachmentsPath: string;
  backupsPath: string;
  exportsPath: string;
  dbSizeBytes: number;
}

export interface PrintOptions {
  htmlContent: string;
  title?: string;
  landscape?: boolean;
  action: 'preview' | 'print' | 'pdf';
  suggestedFileName?: string;
}

export interface PrintResult {
  success: boolean;
  pdfPath?: string;
  error?: string;
}

export type NavigationTab = 
  | 'dashboard'
  | 'clients'
  | 'cases'
  | 'hearings'
  | 'calendar'
  | 'finance'
  | 'executions'
  | 'tasks'
  | 'reports'
  | 'settings';

// ==========================================
// Phase 2 Entities: Clients & Cases
// ==========================================

export type ClientType = 'individual' | 'company' | 'entity';

export interface Client {
  id: number;
  name: string;
  client_type: ClientType;
  national_id_or_cr?: string | null;
  phone: string;
  phone2?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  email?: string | null;
  poa_number?: string | null;
  poa_type?: string | null;
  poa_date?: string | null;
  poa_issuing_office?: string | null;
  poa_expiry_date?: string | null;
  representation_type?: string | null; // أصيل، ولي طبيعي، وصي، قيّم، وكيل عن شركة
  represented_name?: string | null;
  notes?: string | null;
  status: 'active' | 'archived';
  created_at?: string;
  updated_at?: string;
}

export interface CaseClient {
  id: number;
  case_id: number;
  client_id: number;
  role_capacity: string;
  is_primary: number;
  client_name?: string;
  client_phone?: string;
  client_type?: ClientType;
  poa_number?: string;
}

export interface CaseOpponent {
  id: number;
  case_id: number;
  name: string;
  role_capacity: string;
  national_id?: string | null;
  phone?: string | null;
  address?: string | null;
  lawyer_name?: string | null;
  lawyer_phone?: string | null;
  notes?: string | null;
}

export interface Case {
  id: number;
  case_number: string;
  case_year: number;
  court_name: string;
  court_circuit?: string | null;
  court_degree: string;
  case_type: string;
  table_number?: string | null;
  police_report_number?: string | null;
  filing_date?: string | null;
  subject: string;
  claims?: string | null;
  description?: string | null;
  status: string;
  priority: 'عادية' | 'مهمة' | 'عاجلة';
  assigned_lawyer?: string | null;
  colleague_lawyers?: string | null;
  parent_case_id?: number | null;
  is_juvenile: number;
  juvenile_name?: string | null;
  juvenile_age?: number | null;
  juvenile_charge?: string | null;
  guardian_name?: string | null;
  guardian_relation?: string | null;
  probation_officer?: string | null;
  care_facility?: string | null;
  imposed_measures?: string | null;
  created_at?: string;
  updated_at?: string;
  primary_client_name?: string;
  primary_opponent_name?: string;
  clients_count?: number;
}

export interface CaseDetails extends Case {
  clients: CaseClient[];
  opponents: CaseOpponent[];
  parent_case?: { id: number; case_number: string; case_year: number; court_name: string } | null;
}

export interface ClientDetails extends Client {
  cases: (Case & { role_capacity: string })[];
}

export interface ClientFilter {
  query?: string;
  status?: 'active' | 'archived' | 'all';
  type?: ClientType;
}

export interface CaseFilter {
  query?: string;
  status?: string;
  court_name?: string;
  case_type?: string;
  court_degree?: string;
  priority?: string;
  client_id?: number;
}

export interface CreateCaseInput {
  case_number: string;
  case_year: number;
  court_name: string;
  court_circuit?: string;
  court_degree: string;
  case_type: string;
  table_number?: string;
  police_report_number?: string;
  filing_date?: string;
  subject: string;
  claims?: string;
  description?: string;
  status?: string;
  priority?: 'عادية' | 'مهمة' | 'عاجلة';
  assigned_lawyer?: string;
  colleague_lawyers?: string;
  parent_case_id?: number | null;
  is_juvenile?: number;
  juvenile_name?: string;
  juvenile_age?: number;
  juvenile_charge?: string;
  guardian_name?: string;
  guardian_relation?: string;
  probation_officer?: string;
  care_facility?: string;
  imposed_measures?: string;
  clients: { client_id: number; role_capacity: string; is_primary?: boolean }[];
  opponents: {
    name: string;
    role_capacity: string;
    national_id?: string;
    phone?: string;
    address?: string;
    lawyer_name?: string;
    lawyer_phone?: string;
    notes?: string;
  }[];
}

// ==========================================
// Phase 3 Entities: Hearings & Adjournments
// ==========================================

export type HearingStatus = 'محددة' | 'تمت' | 'مؤجلة' | 'محجوزة للحكم' | 'صدر حكم' | 'ملغاة';

export interface Hearing {
  id: number;
  case_id: number;
  hearing_date: string; // YYYY-MM-DD
  hearing_time?: string | null;
  court_name: string;
  court_circuit?: string | null;
  court_hall?: string | null;
  roll_number?: number | null;
  attended: number; // 1 or 0
  attended_by?: string | null;
  proceedings?: string | null;
  court_decision?: string | null;
  adjournment_reason?: string | null;
  adjournment_notes?: string | null;
  next_hearing_date?: string | null;
  requests?: string | null;
  submitted_documents?: string | null;
  notes?: string | null;
  is_judgment_hearing: number; // 1 or 0
  judgment_date?: string | null;
  judgment_text?: string | null;
  status: HearingStatus;
  created_at?: string;
  updated_at?: string;
}

export interface HearingWithCase extends Hearing {
  case_number: string;
  case_year: number;
  case_type: string;
  subject: string;
  priority: string;
  primary_client_name?: string;
  primary_client_role?: string;
  primary_opponent_name?: string;
  primary_opponent_role?: string;
  previous_hearing_date?: string;
  previous_decision?: string;
  previous_adjournment_reason?: string;
}

export interface HearingRollFilter {
  date?: string; // specific day YYYY-MM-DD
  startDate?: string;
  endDate?: string;
  court_name?: string;
  court_circuit?: string;
  status?: string;
}

export interface CaseHearingStats {
  total_hearings: number;
  postponement_count: number;
  most_frequent_reason?: string;
  most_frequent_reason_count?: number;
  avg_days_between_hearings?: number;
  first_hearing_date?: string;
  last_hearing_date?: string;
}

export interface AppealDeadline {
  id?: number;
  case_id: number;
  judgment_date: string;
  announcement_date?: string | null;
  appeal_type: string;
  days_allowed: number;
  deadline_date: string;
  is_appeal_filed: number;
  appeal_case_number?: string | null;
  notes?: string | null;
  created_at?: string;
  days_remaining?: number;
  is_expired?: boolean;
}

// ==========================================
// Phase 4 Entities: Financial System
// ==========================================

export type TransactionCategory = 'أتعاب' | 'رسوم قضائية' | 'مصاريف' | 'تنفيذ';
export type TransactionDirection = 'وارد' | 'صادر';
export type PaymentMethod = 'نقدي' | 'تحويل بنكي' | 'شيك' | 'فودافون كاش' | 'إنستاباي';
export type FeeAgreementType = 'مبلغ مقطوع' | 'على مراحل' | 'نسبة من المحكوم به' | 'بالجلسة' | 'شهري';
export type ChequeStatus = 'تحت التحصيل' | 'محصل' | 'مرتد';

export interface FeeInstallment {
  id: number;
  agreement_id: number;
  case_id: number;
  title: string;
  amount: number;
  due_date?: string | null;
  status: 'غير مسددة' | 'مسددة جزئياً' | 'مسددة بالكامل';
  paid_amount: number;
  notes?: string | null;
  created_at?: string;
}

export interface CaseFeeAgreement {
  id: number;
  case_id: number;
  client_id?: number | null;
  agreement_type: FeeAgreementType;
  total_amount: number;
  percentage?: number | null;
  amount_per_session?: number | null;
  monthly_amount?: number | null;
  terms_notes?: string | null;
  installments?: FeeInstallment[];
  created_at?: string;
  updated_at?: string;
}

export interface ChequeDetail {
  id: number;
  transaction_id: number;
  case_id?: number | null;
  client_id?: number | null;
  cheque_number: string;
  bank_name: string;
  drawer_name?: string | null;
  amount: number;
  due_date: string; // YYYY-MM-DD
  collected_date?: string | null;
  status: ChequeStatus;
  notes?: string | null;
  case_number?: string;
  case_year?: number;
  client_name?: string;
  created_at?: string;
  updated_at?: string;
  days_until_due?: number;
  is_overdue?: boolean;
}

export interface FinancialTransaction {
  id: number;
  receipt_number: string;
  case_id?: number | null;
  client_id?: number | null;
  execution_id?: number | null;
  hearing_id?: number | null;
  installment_id?: number | null;
  transaction_date: string; // YYYY-MM-DD
  category: TransactionCategory;
  transaction_type: string;
  direction: TransactionDirection;
  amount: number;
  payment_method: PaymentMethod;
  description: string;
  notes?: string | null;
  is_reversed: number; // 0 or 1
  reversed_at?: string | null;
  reversed_by_id?: number | null;
  reversal_of_id?: number | null;
  reversal_reason?: string | null;
  cheque_details?: ChequeDetail | null;
  case_number?: string;
  case_year?: number;
  court_name?: string;
  client_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CaseFinancialSummary {
  total_agreed_fees: number;
  paid_fees: number;
  remaining_fees: number;
  total_court_fees_inflow: number;
  total_court_fees_outflow: number;
  total_expenses_inflow: number;
  total_expenses_outflow: number;
  total_execution_inflow: number;
  total_execution_outflow: number;
  total_inflow: number;
  total_outflow: number;
  net_balance: number; // positive = credit (له), negative = debit (عليه)
}

export interface FinancialFilter {
  case_id?: number;
  client_id?: number;
  execution_id?: number;
  category?: string;
  direction?: string;
  payment_method?: string;
  startDate?: string;
  endDate?: string;
  query?: string;
  includeReversed?: boolean;
}

export interface GeneralFinancialStats {
  total_income: number;
  total_expense: number;
  net_profit: number;
  outstanding_fees: number;
  pending_cheques_count: number;
  pending_cheques_amount: number;
}

// ==========================================
// Phase 5 Entities: Executions (التنفيذ الجبري)
// ==========================================

export type ExecutionDeedType = 
  | 'حكم' 
  | 'أمر أداء' 
  | 'شيك' 
  | 'كمبيالة' 
  | 'عقد موثق' 
  | 'محضر صلح' 
  | 'أخرى';

export type ExecutionStatus = 
  | 'جديد' 
  | 'جاري' 
  | 'تم الصلح والتسوية' 
  | 'تم التنفيذ كلياً' 
  | 'موقوف' 
  | 'مرفوض' 
  | 'معلق';

export type ExecutionActionType = 
  | 'إعلان السند التنفيذي' 
  | 'تكليف بالوفاء' 
  | 'حجز تحفظي' 
  | 'حجز تنفيذي' 
  | 'حجز ما للمدين لدى الغير' 
  | 'حجز على سيارة' 
  | 'حجز عقاري' 
  | 'بيع بالمزاد' 
  | 'تسليم منقول' 
  | 'إخلاء' 
  | 'منع سفر' 
  | 'ضبط وإحضار' 
  | 'استشكال في التنفيذ' 
  | 'دعوى استرداد' 
  | 'مأمورية كسر وفتح بالقوة الجبرية' 
  | 'أخرى';

export type ExecutionActionStatus = 'تم' | 'مرفوض' | 'مؤجل' | 'جاري' | 'ملغى';

export type ExecutionHearingStatus = 'محددة' | 'تمت' | 'مؤجلة' | 'محكوم فيها';

export interface ExecutionFile {
  id: number;
  file_number: string;
  year?: number | null;
  case_id?: number | null;
  client_id?: number | null;
  deed_type: ExecutionDeedType;
  deed_number?: string | null;
  court: string;
  execution_judge?: string | null;
  execution_dept?: string | null;
  applicant_name: string;
  applicant_capacity?: string | null;
  enforced_against: string;
  enforced_against_capacity?: string | null;
  enforced_against_address?: string | null;
  enforced_against_phone?: string | null;
  total_claimed_amount: number;
  collected_amount: number;
  remaining_amount: number;
  announcement_date?: string | null;
  status: ExecutionStatus;
  settlement_minutes?: string | null;
  settlement_date?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Join fields
  case_number?: string;
  case_year?: number;
  court_name?: string;
  client_name?: string;
  actions_count?: number;
  hearings_count?: number;
}

export interface ExecutionAction {
  id: number;
  execution_id: number;
  action_type: ExecutionActionType;
  action_date: string; // YYYY-MM-DD
  status: ExecutionActionStatus;
  police_report_or_bailiff_number?: string | null;
  dept_or_bailiff_office?: string | null;
  bailiff_name?: string | null;
  amount_collected?: number;
  details?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExecutionHearing {
  id: number;
  execution_id: number;
  case_id?: number | null;
  hearing_date: string; // YYYY-MM-DD
  hearing_time?: string | null;
  court_name?: string | null;
  court_circuit?: string | null;
  roll_number?: string | null;
  attended: number; // 0 or 1
  attended_by?: string | null;
  proceedings?: string | null;
  court_decision?: string | null;
  adjournment_reason?: string | null;
  next_hearing_date?: string | null;
  status: ExecutionHearingStatus;
  created_at?: string;
  updated_at?: string;
}

export interface ExecutionDetails extends ExecutionFile {
  actions: ExecutionAction[];
  hearings: ExecutionHearing[];
  transactions: FinancialTransaction[];
}

export interface ExecutionFilter {
  caseId?: number;
  clientId?: number;
  status?: string;
  deedType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateExecutionFileInput {
  file_number: string;
  year?: number | null;
  case_id?: number | null;
  client_id?: number | null;
  deed_type: ExecutionDeedType;
  deed_number?: string | null;
  court: string;
  execution_judge?: string | null;
  execution_dept?: string | null;
  applicant_name: string;
  applicant_capacity?: string | null;
  enforced_against: string;
  enforced_against_capacity?: string | null;
  enforced_against_address?: string | null;
  enforced_against_phone?: string | null;
  total_claimed_amount: number;
  announcement_date?: string | null;
  status?: ExecutionStatus;
  settlement_minutes?: string | null;
  settlement_date?: string | null;
  notes?: string | null;
}

export interface CreateExecutionActionInput {
  execution_id: number;
  action_type: ExecutionActionType;
  action_date: string;
  status: ExecutionActionStatus;
  police_report_or_bailiff_number?: string | null;
  dept_or_bailiff_office?: string | null;
  bailiff_name?: string | null;
  amount_collected?: number;
  details?: string | null;
  notes?: string | null;
}

export interface CreateExecutionHearingInput {
  execution_id: number;
  case_id?: number | null;
  hearing_date: string;
  hearing_time?: string | null;
  court_name?: string | null;
  court_circuit?: string | null;
  roll_number?: string | null;
  attended?: number;
  attended_by?: string | null;
  proceedings?: string | null;
  court_decision?: string | null;
  adjournment_reason?: string | null;
  next_hearing_date?: string | null;
  status?: ExecutionHearingStatus;
}

export interface IElectronAPI {
  // Settings
  getOfficeSettings: () => Promise<OfficeSettings>;
  updateOfficeSettings: (settings: Partial<OfficeSettings>) => Promise<OfficeSettings>;

  // Configurable Lists
  getListItems: (listType: ConfigurableListType) => Promise<ConfigurableListItem[]>;
  getAllListItems: () => Promise<Record<ConfigurableListType, ConfigurableListItem[]>>;
  createListItem: (item: Omit<ConfigurableListItem, 'id' | 'created_at' | 'updated_at'>) => Promise<ConfigurableListItem>;
  updateListItem: (id: number, item: Partial<ConfigurableListItem>) => Promise<ConfigurableListItem>;
  deleteListItem: (id: number) => Promise<{ success: boolean; message?: string }>;
  resetListToDefaults: (listType: ConfigurableListType) => Promise<ConfigurableListItem[]>;

  // Data Directory Management
  getDataDirInfo: () => Promise<DataDirInfo>;
  openDataDir: () => Promise<{ success: boolean; error?: string }>;
  selectNewDataDir: () => Promise<{ canceled: boolean; selectedPath?: string }>;
  relocateDataDir: (newPath: string) => Promise<{ success: boolean; error?: string }>;

  // Printing Service
  executePrint: (options: PrintOptions) => Promise<PrintResult>;
  selectLogoFile: () => Promise<{ canceled: boolean; filePath?: string; fileDataUrl?: string }>;

  // Clients API (Phase 2)
  getClients: (filter?: ClientFilter) => Promise<Client[]>;
  getClientById: (id: number) => Promise<ClientDetails | null>;
  createClient: (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => Promise<Client>;
  updateClient: (id: number, updates: Partial<Client>) => Promise<Client>;
  archiveClient: (id: number, archive: boolean) => Promise<Client>;
  deleteClient: (id: number) => Promise<{ success: boolean; message?: string }>;
  getExpiringPoaClients: (daysThreshold?: number) => Promise<Client[]>;

  // Cases API (Phase 2)
  getCases: (filter?: CaseFilter) => Promise<Case[]>;
  getCaseById: (id: number) => Promise<CaseDetails | null>;
  createCase: (input: CreateCaseInput) => Promise<CaseDetails>;
  updateCase: (id: number, input: Partial<CreateCaseInput>) => Promise<CaseDetails>;
  deleteCase: (id: number) => Promise<{ success: boolean; message?: string }>;

  // Hearings API (Phase 3)
  getHearingsByCase: (caseId: number) => Promise<Hearing[]>;
  getHearingStatsByCase: (caseId: number) => Promise<CaseHearingStats>;
  getHearingRoll: (filter: HearingRollFilter) => Promise<HearingWithCase[]>;
  createHearing: (hearing: Omit<Hearing, 'id' | 'created_at' | 'updated_at'>) => Promise<Hearing>;
  recordHearingOutcome: (hearingId: number, outcome: {
    attended: number;
    attended_by?: string;
    proceedings?: string;
    court_decision: string;
    adjournment_reason?: string;
    adjournment_notes?: string;
    next_hearing_date?: string;
    status: HearingStatus;
    is_judgment_hearing?: number;
    judgment_date?: string;
    judgment_text?: string;
  }) => Promise<{ currentHearing: Hearing; nextHearing?: Hearing }>;
  updateHearing: (id: number, updates: Partial<Hearing>) => Promise<Hearing>;
  deleteHearing: (id: number) => Promise<{ success: boolean }>;

  // Appeal Deadlines Calculator (Phase 3)
  getAppealDeadlines: (caseId?: number) => Promise<AppealDeadline[]>;
  saveAppealDeadline: (deadline: Omit<AppealDeadline, 'id' | 'created_at' | 'days_remaining' | 'is_expired'>) => Promise<AppealDeadline>;
  deleteAppealDeadline: (id: number) => Promise<{ success: boolean }>;

  // Finance API (Phase 4)
  getFeeAgreement: (caseId: number) => Promise<CaseFeeAgreement | null>;
  saveFeeAgreement: (agreement: {
    case_id: number;
    client_id?: number | null;
    agreement_type: FeeAgreementType;
    total_amount: number;
    percentage?: number | null;
    amount_per_session?: number | null;
    monthly_amount?: number | null;
    terms_notes?: string | null;
    installments?: { title: string; amount: number; due_date?: string | null; notes?: string | null }[];
  }) => Promise<CaseFeeAgreement>;
  getFinancialTransactions: (filter?: FinancialFilter) => Promise<FinancialTransaction[]>;
  createFinancialTransaction: (tx: {
    case_id?: number | null;
    client_id?: number | null;
    hearing_id?: number | null;
    installment_id?: number | null;
    transaction_date: string;
    category: TransactionCategory;
    transaction_type: string;
    direction: TransactionDirection;
    amount: number;
    payment_method: PaymentMethod;
    description: string;
    notes?: string | null;
  }, cheque?: {
    cheque_number: string;
    bank_name: string;
    drawer_name?: string;
    due_date: string;
    notes?: string;
  }) => Promise<FinancialTransaction>;
  reverseFinancialTransaction: (transactionId: number, reason: string) => Promise<{ original: FinancialTransaction; reversal: FinancialTransaction }>;
  getCaseFinancialSummary: (caseId: number) => Promise<CaseFinancialSummary>;
  getClientFinancialSummary: (clientId: number) => Promise<{ total_agreed_fees: number; paid_fees: number; remaining_fees: number; net_balance: number }>;
  getCheques: (filter?: { status?: string; startDate?: string; endDate?: string }) => Promise<ChequeDetail[]>;
  updateChequeStatus: (id: number, status: ChequeStatus, collected_date?: string) => Promise<ChequeDetail>;
  getGeneralFinancialStats: (period?: { startDate?: string; endDate?: string }) => Promise<GeneralFinancialStats>;
  getNextReceiptNumber: () => Promise<string>;

  // Executions API (Phase 5)
  getExecutionFiles: (filter?: ExecutionFilter) => Promise<ExecutionFile[]>;
  getExecutionFileById: (id: number) => Promise<ExecutionDetails | null>;
  createExecutionFile: (input: CreateExecutionFileInput) => Promise<ExecutionFile>;
  updateExecutionFile: (id: number, updates: Partial<CreateExecutionFileInput>) => Promise<ExecutionFile>;
  deleteExecutionFile: (id: number) => Promise<{ success: boolean; message?: string }>;
  recordExecutionSettlement: (id: number, settlementMinutes: string, settlementDate?: string) => Promise<ExecutionFile>;
  getExecutionActions: (executionId: number) => Promise<ExecutionAction[]>;
  createExecutionAction: (input: CreateExecutionActionInput) => Promise<ExecutionAction>;
  updateExecutionAction: (id: number, updates: Partial<ExecutionAction>) => Promise<ExecutionAction>;
  deleteExecutionAction: (id: number) => Promise<{ success: boolean }>;
  getExecutionHearings: (executionId: number) => Promise<ExecutionHearing[]>;
  createExecutionHearing: (input: CreateExecutionHearingInput) => Promise<ExecutionHearing>;
  updateExecutionHearing: (id: number, updates: Partial<ExecutionHearing>) => Promise<ExecutionHearing>;
  deleteExecutionHearing: (id: number) => Promise<{ success: boolean }>;
  recordExecutionHearingOutcome: (hearingId: number, outcome: {
    attended: number;
    attended_by?: string;
    proceedings?: string;
    court_decision: string;
    adjournment_reason?: string;
    next_hearing_date?: string;
    status: ExecutionHearingStatus;
  }) => Promise<{ currentHearing: ExecutionHearing; nextHearing?: ExecutionHearing }>;
  recordExecutionPayment: (params: {
    executionId: number;
    amount: number;
    direction: TransactionDirection;
    transactionType: string;
    paymentMethod: PaymentMethod;
    description: string;
    date?: string;
    notes?: string;
  }) => Promise<FinancialTransaction>;

  // System
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
