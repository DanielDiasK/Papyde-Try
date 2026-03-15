import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import { autoUpdater } from 'electron-updater';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

if (started) {
  app.quit();
}

// Enable GPU acceleration for better performance (especially animations and modals)
// app.commandLine.appendSwitch('disable-gpu');
// app.commandLine.appendSwitch('disable-software-rasterizer');
// app.disableHardwareAcceleration();

const configPath = path.join(app.getPath('userData'), 'app-config.json');
let workspaceConfig: { name: string; path: string } | null = null;
let docsDir = '';

if (fs.existsSync(configPath)) {
  try {
    workspaceConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (workspaceConfig) {
      docsDir = workspaceConfig.path;
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
      }
    }
  } catch (e) {
    console.error('Failed to load config', e);
  }
}

let isQuitting = false;

const getIconPath = () => {
  // In packaged app, resources are inside the asar archive
  // app.getAppPath() always points to the root whether packed or not
  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // dev mode: __dirname is .vite/build, go 2 levels up to project root
    return path.resolve(__dirname, '..', '..', 'src', 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  }
  // packaged: assets live inside the asar at the app root
  return path.join(app.getAppPath(), 'src', 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // allow file:// avatar images
    },
  });

  // Ensure close works cleanly
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      isQuitting = true;
      mainWindow.destroy();
      app.quit();
    }
  });

  // Remove default menu completely
  Menu.setApplicationMenu(null);

  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    const builderPath = path.join(__dirname, '../dist-renderer/index.html');
    const forgePath = path.join(__dirname, '../renderer/main_window/index.html');

    if (fs.existsSync(builderPath)) {
      mainWindow.loadFile(builderPath);
    } else {
      mainWindow.loadFile(forgePath);
    }
  }
};

app.on('ready', () => {
  // Set app ID for Windows taskbar grouping
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.papyde.app');
  }
  createWindow();

  // Trigger auto update check but ONLY if packaged
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.error("AutoUpdater initial error: ", err);
    });
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('get-workspace', () => workspaceConfig);
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('window-minimize', (e) => {
  BrowserWindow.fromWebContents(e.sender)?.minimize();
});
ipcMain.handle('window-maximize', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});
ipcMain.handle('window-close', (e) => {
  BrowserWindow.fromWebContents(e.sender)?.close();
});

ipcMain.handle('select-folder', async () => {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Selecione a pasta'
  });
  if (canceled) return null;
  return filePaths[0];
});

ipcMain.handle('create-workspace', async (_, { name, folder }) => {
  const wsPath = path.join(folder, name);
  try {
    if (!fs.existsSync(wsPath)) {
      fs.mkdirSync(wsPath, { recursive: true });
    }
    workspaceConfig = { name, path: wsPath };
    docsDir = wsPath;
    fs.writeFileSync(configPath, JSON.stringify(workspaceConfig, null, 2), 'utf-8');
    return workspaceConfig;
  } catch (err) {
    console.error('Failed to create workspace', err);
    return null;
  }
});

ipcMain.handle('get-documents', async () => {
  if (!docsDir) return [];
  try {
    const reserved = new Set(['_structure.json']);
    const files = fs.readdirSync(docsDir)
      .filter(f => f.endsWith('.json') && !reserved.has(f));

    const docs: any[] = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(docsDir, file), 'utf-8');
        const parsed = JSON.parse(raw);
        // Only treat as a doc if it has the required shape
        if (parsed && typeof parsed.id === 'string' && 'title' in parsed && 'content' in parsed) {
          docs.push(parsed);
        }
      } catch { /* skip malformed files */ }
    }
    return docs.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  } catch (error) {
    console.error('Failed to get documents', error);
    return [];
  }
});

ipcMain.handle('save-document', async (_, doc) => {
  if (!docsDir) return null;
  try {
    const filePath = path.join(docsDir, `${doc.id}.json`);
    doc.updatedAt = Date.now();
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2), 'utf-8');
    return doc;
  } catch (error) {
    console.error('Failed to save document', error);
    return null;
  }
});

ipcMain.handle('delete-document', async (_, id) => {
  if (!docsDir) return false;
  try {
    const filePath = path.join(docsDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (error) {
    console.error('Failed to delete document', error);
    return false;
  }
});

// Sidebar structure (folders + ordering/nesting)
const getStructurePath = () => path.join(docsDir, '_structure.json');

ipcMain.handle('get-structure', () => {
  if (!docsDir) return [];
  const spath = getStructurePath();
  if (!fs.existsSync(spath)) return [];
  try {
    return JSON.parse(fs.readFileSync(spath, 'utf-8'));
  } catch { return []; }
});

ipcMain.handle('save-structure', (_, items) => {
  if (!docsDir) return false;
  try {
    fs.writeFileSync(getStructurePath(), JSON.stringify(items, null, 2), 'utf-8');
    return true;
  } catch { return false; }
});

// ── Settings ──────────────────────────────────────────────────────────────────
const settingsPath = path.join(app.getPath('userData'), 'app-settings.json');

const loadSettings = () => {
  try {
    if (fs.existsSync(settingsPath)) return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  } catch { }
  return { name: 'Usuário', theme: 'light', avatarPath: null };
};

ipcMain.handle('get-settings', () => loadSettings());

ipcMain.handle('save-settings', (_, settings) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch { return false; }
});

// Select avatar image — returns base64 data URL so renderer can display without file:// issues
ipcMain.handle('select-avatar', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const options = {
    title: 'Selecionar foto de perfil',
    filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
    properties: ['openFile' as const],
  };
  const { canceled, filePaths } = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);

  if (canceled || !filePaths[0]) return null;
  try {
    const ext = path.extname(filePaths[0]).toLowerCase();
    const mimeMap: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    const mime = mimeMap[ext] || 'image/jpeg';
    const data = fs.readFileSync(filePaths[0]);
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch (e) {
    console.error('Failed to read avatar', e);
    return null;
  }
});

// Create backup (copies workspace folder to a new location)
ipcMain.handle('create-backup', async (event) => {
  if (!docsDir) return { success: false, message: 'Nenhum workspace configurado.' };
  const win = BrowserWindow.fromWebContents(event.sender);
  const options = {
    title: 'Escolha onde salvar o backup',
    properties: ['openDirectory' as const],
  };
  const { canceled, filePaths } = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);

  if (canceled || !filePaths[0]) return { success: false, message: 'Cancelado.' };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDest = path.join(filePaths[0], `Papyde_Backup_${timestamp}`);
  try {
    const copyDir = (src: string, dest: string) => {
      fs.mkdirSync(dest, { recursive: true });
      for (const entry of fs.readdirSync(src)) {
        const s = path.join(src, entry), d = path.join(dest, entry);
        fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
      }
    };
    copyDir(docsDir, backupDest);
    return { success: true, message: `Backup salvo em ${backupDest}` };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
});

// Change workspace folder (move all files to new location)
ipcMain.handle('change-workspace-folder', async (_, newName?: string) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Selecione a nova pasta do workspace',
    properties: ['openDirectory'],
  });
  if (canceled || !filePaths[0]) return null;

  const name = newName || workspaceConfig?.name || 'Papyde';
  const newPath = path.join(filePaths[0], name);
  try {
    fs.mkdirSync(newPath, { recursive: true });
    // Copy files from old location
    if (docsDir && fs.existsSync(docsDir)) {
      for (const file of fs.readdirSync(docsDir)) {
        fs.copyFileSync(path.join(docsDir, file), path.join(newPath, file));
      }
    }
    workspaceConfig = { name, path: newPath };
    docsDir = newPath;
    fs.writeFileSync(configPath, JSON.stringify(workspaceConfig, null, 2), 'utf-8');
    return workspaceConfig;
  } catch (e: any) {
    console.error('Failed to change workspace folder', e);
    return null;
  }
});

// ── Updates ──────────────────────────────────────────────────────────────────
ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) {
    throw new Error('Atualizações automáticas estão desabilitadas no modo de desenvolvimento. Elas só funcionam na versão instalada do Papyde.');
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    return result;
  } catch (error: any) {
    console.error('Update check failed:', error);
    // Se não tiver o arquivo de config (publish) no builder, o updater vai dar erro
    throw new Error('Não foi possível verificar atualizações. Certifique-se de que o app está configurado corretamente no GitHub.');
  }
});

ipcMain.handle('download-update', async () => {
  if (!app.isPackaged) {
    throw new Error('Download de atualizações desabilitado em modo de desenvolvimento.');
  }

  try {
    await autoUpdater.downloadUpdate();
    return true;
  } catch (error) {
    console.error('Download replacement failed:', error);
    throw new Error('Falha ao baixar a atualização.');
  }
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

// Event listeners to send progress/status to renderer
autoUpdater.on('update-available', (info) => {
  BrowserWindow.getAllWindows()[0]?.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  BrowserWindow.getAllWindows()[0]?.webContents.send('update-not-available', info);
});

autoUpdater.on('download-progress', (progressObj) => {
  BrowserWindow.getAllWindows()[0]?.webContents.send('update-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  BrowserWindow.getAllWindows()[0]?.webContents.send('update-downloaded', info);
});

autoUpdater.on('error', (err) => {
  BrowserWindow.getAllWindows()[0]?.webContents.send('update-error', err.message);
});

