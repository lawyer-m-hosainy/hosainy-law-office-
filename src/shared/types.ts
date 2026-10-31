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

  // System
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
