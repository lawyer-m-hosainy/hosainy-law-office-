import { app, BrowserWindow, protocol, net, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { DatabaseService } from './services/DatabaseService';
import { registerAllIpcHandlers } from './ipc';
import { DataDirService } from './services/DataDirService';

// Isolated test userData if running under test
if (process.env.TEST_DATA_DIR) {
  try {
    const testUserData = path.join(process.env.TEST_DATA_DIR, 'user-data');
    if (!fs.existsSync(testUserData)) {
      fs.mkdirSync(testUserData, { recursive: true });
    }
    app.setPath('userData', testUserData);
  } catch (e) {}
}

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: 'نظام إدارة مكتب المحاماة',
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  // Show gracefully when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.maximize();
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Uncomment if needed: mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Block in-app navigation outside application
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow?.webContents.getURL();
    if (url !== currentUrl && !url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  // Block opening unverified external URLs
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Register custom protocol for local attachments with path traversal protection
    protocol.handle('local-file', (request) => {
      const url = request.url.replace('local-file://', '');
      const decodedPath = decodeURIComponent(url);
      const dataDir = DataDirService.getInstance().getDataDirectory();
      const safePath = path.resolve(dataDir, decodedPath);
      // Ensure path stays strictly inside data directory
      if (!safePath.startsWith(path.resolve(dataDir))) {
        return new Response('Forbidden', { status: 403 });
      }
      return net.fetch(`file://${safePath}`);
    });

    try {
      // 1. Initialize SQLite Database & run migrations
      DatabaseService.getInstance().init();

      // 2. Register all IPC handlers
      registerAllIpcHandlers();

      // 3. Create GUI window
      createWindow();
    } catch (err) {
      console.error('Fatal initialization error:', err);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      DatabaseService.getInstance().close();
      app.quit();
    }
  });
}
