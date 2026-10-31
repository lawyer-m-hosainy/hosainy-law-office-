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
};

contextBridge.exposeInMainWorld('electronAPI', api);
