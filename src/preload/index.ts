import { contextBridge, ipcRenderer } from 'electron';
import {
  ConfigurableListItem,
  ConfigurableListType,
  DataDirInfo,
  IElectronAPI,
  OfficeSettings,
  PrintOptions,
  PrintResult
} from '../shared/types';

const api: IElectronAPI = {
  // Office Settings
  getOfficeSettings: (): Promise<OfficeSettings> => {
    return ipcRenderer.invoke('settings:getOfficeSettings');
  },
  updateOfficeSettings: (settings: Partial<OfficeSettings>): Promise<OfficeSettings> => {
    return ipcRenderer.invoke('settings:updateOfficeSettings', settings);
  },

  // Configurable Lists
  getListItems: (listType: ConfigurableListType): Promise<ConfigurableListItem[]> => {
    return ipcRenderer.invoke('settings:getListItems', listType);
  },
  getAllListItems: (): Promise<Record<ConfigurableListType, ConfigurableListItem[]>> => {
    return ipcRenderer.invoke('settings:getAllListItems');
  },
  createListItem: (item: Omit<ConfigurableListItem, 'id' | 'created_at' | 'updated_at'>): Promise<ConfigurableListItem> => {
    return ipcRenderer.invoke('settings:createListItem', item);
  },
  updateListItem: (id: number, item: Partial<ConfigurableListItem>): Promise<ConfigurableListItem> => {
    return ipcRenderer.invoke('settings:updateListItem', id, item);
  },
  deleteListItem: (id: number): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('settings:deleteListItem', id);
  },
  resetListToDefaults: (listType: ConfigurableListType): Promise<ConfigurableListItem[]> => {
    return ipcRenderer.invoke('settings:resetListToDefaults', listType);
  },

  // Data Directory Management
  getDataDirInfo: (): Promise<DataDirInfo> => {
    return ipcRenderer.invoke('dataDir:getInfo');
  },
  openDataDir: (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('dataDir:open');
  },
  selectNewDataDir: (): Promise<{ canceled: boolean; selectedPath?: string }> => {
    return ipcRenderer.invoke('dataDir:selectNew');
  },
  relocateDataDir: (newPath: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('dataDir:relocate', newPath);
  },

  // Unified Printing Service
  executePrint: (options: PrintOptions): Promise<PrintResult> => {
    return ipcRenderer.invoke('print:execute', options);
  },
  selectLogoFile: (): Promise<{ canceled: boolean; filePath?: string; fileDataUrl?: string }> => {
    return ipcRenderer.invoke('settings:selectLogoFile');
  },

  // System
  getAppVersion: (): Promise<string> => {
    return ipcRenderer.invoke('system:getAppVersion');
  },

  // Clients API (Phase 2)
  getClients: (filter?: any): Promise<any> => {
    return ipcRenderer.invoke('clients:getClients', filter);
  },
  getClientById: (id: number): Promise<any> => {
    return ipcRenderer.invoke('clients:getClientById', id);
  },
  createClient: (client: any): Promise<any> => {
    return ipcRenderer.invoke('clients:createClient', client);
  },
  updateClient: (id: number, updates: any): Promise<any> => {
    return ipcRenderer.invoke('clients:updateClient', id, updates);
  },
  archiveClient: (id: number, archive: boolean): Promise<any> => {
    return ipcRenderer.invoke('clients:archiveClient', id, archive);
  },
  deleteClient: (id: number): Promise<any> => {
    return ipcRenderer.invoke('clients:deleteClient', id);
  },
  getExpiringPoaClients: (daysThreshold?: number): Promise<any> => {
    return ipcRenderer.invoke('clients:getExpiringPoa', daysThreshold);
  },

  // Cases API (Phase 2)
  getCases: (filter?: any): Promise<any> => {
    return ipcRenderer.invoke('cases:getCases', filter);
  },
  getCaseById: (id: number): Promise<any> => {
    return ipcRenderer.invoke('cases:getCaseById', id);
  },
  createCase: (input: any): Promise<any> => {
    return ipcRenderer.invoke('cases:createCase', input);
  },
  updateCase: (id: number, input: any): Promise<any> => {
    return ipcRenderer.invoke('cases:updateCase', id, input);
  },
  deleteCase: (id: number): Promise<any> => {
    return ipcRenderer.invoke('cases:deleteCase', id);
  },

  // Hearings API (Phase 3)
  getHearingsByCase: (caseId: number): Promise<any> => {
    return ipcRenderer.invoke('hearings:getByCase', caseId);
  },
  getHearingStatsByCase: (caseId: number): Promise<any> => {
    return ipcRenderer.invoke('hearings:getStats', caseId);
  },
  getHearingRoll: (filter?: any): Promise<any> => {
    return ipcRenderer.invoke('hearings:getRoll', filter);
  },
  createHearing: (hearing: any): Promise<any> => {
    return ipcRenderer.invoke('hearings:create', hearing);
  },
  recordHearingOutcome: (hearingId: number, outcome: any): Promise<any> => {
    return ipcRenderer.invoke('hearings:recordOutcome', hearingId, outcome);
  },
  updateHearing: (id: number, updates: any): Promise<any> => {
    return ipcRenderer.invoke('hearings:update', id, updates);
  },
  deleteHearing: (id: number): Promise<any> => {
    return ipcRenderer.invoke('hearings:delete', id);
  },

  // Appeal Deadlines Calculator (Phase 3)
  getAppealDeadlines: (caseId?: number): Promise<any> => {
    return ipcRenderer.invoke('appeals:getDeadlines', caseId);
  },
  saveAppealDeadline: (deadline: any): Promise<any> => {
    return ipcRenderer.invoke('appeals:save', deadline);
  },
  deleteAppealDeadline: (id: number): Promise<any> => {
    return ipcRenderer.invoke('appeals:delete', id);
  },

  // Finance API (Phase 4)
  getFeeAgreement: (caseId: number): Promise<any> => {
    return ipcRenderer.invoke('finance:getFeeAgreement', caseId);
  },
  saveFeeAgreement: (agreement: any): Promise<any> => {
    return ipcRenderer.invoke('finance:saveFeeAgreement', agreement);
  },
  getFinancialTransactions: (filter?: any): Promise<any> => {
    return ipcRenderer.invoke('finance:getTransactions', filter);
  },
  createFinancialTransaction: (tx: any, cheque?: any): Promise<any> => {
    return ipcRenderer.invoke('finance:createTransaction', tx, cheque);
  },
  reverseFinancialTransaction: (transactionId: number, reason: string): Promise<any> => {
    return ipcRenderer.invoke('finance:reverseTransaction', transactionId, reason);
  },
  getCaseFinancialSummary: (caseId: number): Promise<any> => {
    return ipcRenderer.invoke('finance:getCaseSummary', caseId);
  },
  getClientFinancialSummary: (clientId: number): Promise<any> => {
    return ipcRenderer.invoke('finance:getClientSummary', clientId);
  },
  getCheques: (filter?: any): Promise<any> => {
    return ipcRenderer.invoke('finance:getCheques', filter);
  },
  updateChequeStatus: (id: number, status: any, collectedDate?: string): Promise<any> => {
    return ipcRenderer.invoke('finance:updateChequeStatus', id, status, collectedDate);
  },
  getGeneralFinancialStats: (period?: any): Promise<any> => {
    return ipcRenderer.invoke('finance:getGeneralStats', period);
  },
  getNextReceiptNumber: (): Promise<string> => {
    return ipcRenderer.invoke('finance:getNextReceiptNumber');
  },

  // Executions API (Phase 5)
  getExecutionFiles: (filter?: any): Promise<any> => {
    return ipcRenderer.invoke('executions:getFiles', filter);
  },
  getExecutionFileById: (id: number): Promise<any> => {
    return ipcRenderer.invoke('executions:getById', id);
  },
  createExecutionFile: (input: any): Promise<any> => {
    return ipcRenderer.invoke('executions:createFile', input);
  },
  updateExecutionFile: (id: number, updates: any): Promise<any> => {
    return ipcRenderer.invoke('executions:updateFile', id, updates);
  },
  deleteExecutionFile: (id: number): Promise<any> => {
    return ipcRenderer.invoke('executions:deleteFile', id);
  },
  recordExecutionSettlement: (id: number, settlementMinutes: string, settlementDate?: string): Promise<any> => {
    return ipcRenderer.invoke('executions:recordSettlement', id, settlementMinutes, settlementDate);
  },
  getExecutionActions: (executionId: number): Promise<any> => {
    return ipcRenderer.invoke('executions:getActions', executionId);
  },
  createExecutionAction: (input: any): Promise<any> => {
    return ipcRenderer.invoke('executions:createAction', input);
  },
  updateExecutionAction: (id: number, updates: any): Promise<any> => {
    return ipcRenderer.invoke('executions:updateAction', id, updates);
  },
  deleteExecutionAction: (id: number): Promise<any> => {
    return ipcRenderer.invoke('executions:deleteAction', id);
  },
  getExecutionHearings: (executionId: number): Promise<any> => {
    return ipcRenderer.invoke('executions:getHearings', executionId);
  },
  createExecutionHearing: (input: any): Promise<any> => {
    return ipcRenderer.invoke('executions:createHearing', input);
  },
  updateExecutionHearing: (id: number, updates: any): Promise<any> => {
    return ipcRenderer.invoke('executions:updateHearing', id, updates);
  },
  deleteExecutionHearing: (id: number): Promise<any> => {
    return ipcRenderer.invoke('executions:deleteHearing', id);
  },
  recordExecutionHearingOutcome: (hearingId: number, outcome: any): Promise<any> => {
    return ipcRenderer.invoke('executions:recordHearingOutcome', hearingId, outcome);
  },
  recordExecutionPayment: (params: any): Promise<any> => {
    return ipcRenderer.invoke('executions:recordPayment', params);
  },

  // Tasks API (Phase 6)
  getTasks: (filter?: any): Promise<any> => {
    return ipcRenderer.invoke('tasks:getTasks', filter);
  },
  getTaskById: (id: number): Promise<any> => {
    return ipcRenderer.invoke('tasks:getById', id);
  },
  createTask: (input: any): Promise<any> => {
    return ipcRenderer.invoke('tasks:create', input);
  },
  updateTask: (id: number, updates: any): Promise<any> => {
    return ipcRenderer.invoke('tasks:update', id, updates);
  },
  toggleTaskChecklistItem: (itemId: number, isCompleted: boolean): Promise<any> => {
    return ipcRenderer.invoke('tasks:toggleChecklistItem', itemId, isCompleted);
  },
  deleteTask: (id: number): Promise<any> => {
    return ipcRenderer.invoke('tasks:delete', id);
  },
  getTaskTemplates: (): Promise<any> => {
    return ipcRenderer.invoke('tasks:getTemplates');
  },
  getTaskTemplateById: (id: number): Promise<any> => {
    return ipcRenderer.invoke('tasks:getTemplateById', id);
  },
  createTaskTemplate: (input: any): Promise<any> => {
    return ipcRenderer.invoke('tasks:createTemplate', input);
  },
  deleteTaskTemplate: (id: number): Promise<any> => {
    return ipcRenderer.invoke('tasks:deleteTemplate', id);
  },
  applyTaskTemplate: (params: any): Promise<any> => {
    return ipcRenderer.invoke('tasks:applyTemplate', params);
  },
  getDueTaskReminders: (): Promise<any> => {
    return ipcRenderer.invoke('tasks:getDueReminders');
  },
  markTaskReminderShown: (taskId: number): Promise<any> => {
    return ipcRenderer.invoke('tasks:markReminderShown', taskId);
  },
  showDesktopNotification: (options: { title: string; body: string }): Promise<any> => {
    return ipcRenderer.invoke('tasks:showDesktopNotification', options);
  },

  // Documents & Attachments API (Phase 7)
  selectFilesToAttach: (): Promise<string[]> => {
    return ipcRenderer.invoke('documents:selectFiles');
  },
  attachDocument: (input: any): Promise<any> => {
    return ipcRenderer.invoke('documents:attach', input);
  },
  getCaseDocuments: (caseId: number, includeDeleted?: boolean): Promise<any> => {
    return ipcRenderer.invoke('documents:getByCase', caseId, includeDeleted);
  },
  openDocument: (documentId: number): Promise<any> => {
    return ipcRenderer.invoke('documents:open', documentId);
  },
  showDocumentInFolder: (documentId: number): Promise<any> => {
    return ipcRenderer.invoke('documents:showInFolder', documentId);
  },
  updateDocument: (id: number, updates: any): Promise<any> => {
    return ipcRenderer.invoke('documents:update', id, updates);
  },
  deleteDocument: (id: number, permanent?: boolean): Promise<any> => {
    return ipcRenderer.invoke('documents:delete', id, permanent);
  },
  restoreDocument: (id: number): Promise<any> => {
    return ipcRenderer.invoke('documents:restore', id);
  },

  // Case Notes API (Phase 7)
  getCaseNotes: (caseId: number): Promise<any> => {
    return ipcRenderer.invoke('caseNotes:getByCase', caseId);
  },
  createCaseNote: (input: any): Promise<any> => {
    return ipcRenderer.invoke('caseNotes:create', input);
  },
  updateCaseNote: (id: number, updates: any): Promise<any> => {
    return ipcRenderer.invoke('caseNotes:update', id, updates);
  },
  deleteCaseNote: (id: number): Promise<any> => {
    return ipcRenderer.invoke('caseNotes:delete', id);
  },

  // Universal Search API (Phase 7)
  universalSearch: (query: string): Promise<any> => {
    return ipcRenderer.invoke('search:universal', query);
  },

  // Case Timeline & History API (Phase 7)
  getCaseTimeline: (caseId: number): Promise<any> => {
    return ipcRenderer.invoke('caseTimeline:get', caseId);
  },

  // Data Export API (Phase 7)
  exportTableData: (input: any): Promise<any> => {
    return ipcRenderer.invoke('export:tableData', input);
  },
  openExportedFile: (filePath: string): Promise<any> => {
    return ipcRenderer.invoke('export:openFile', filePath);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
