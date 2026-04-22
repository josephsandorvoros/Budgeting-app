'use strict';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const db = require('./database.cjs');
const appPackage = require('../package.json');

const isDev = process.env.NODE_ENV === 'development';
const BACKEND_HOST = process.env.BUDGET_HOST || '127.0.0.1';
const DEFAULT_BACKEND_PORT = isDev ? 8765 : 18765;
const BACKEND_PORT = Number(process.env.BUDGET_PORT || DEFAULT_BACKEND_PORT);
const APP_RELEASE_TAG = process.env.BUDGET_RELEASE_TAG || appPackage.releaseTag || null;
let backendProcess = null;

// Ensure Electron uses app-owned writable cache/session directories.
try {
  const appData = app.getPath('appData');
  const baseDataDir = path.join(appData, 'BudgetLedger');
  const cacheDir = path.join(baseDataDir, 'Cache');
  const sessionDir = path.join(baseDataDir, 'Session');

  fs.mkdirSync(cacheDir, { recursive: true });
  fs.mkdirSync(sessionDir, { recursive: true });

  app.setPath('userData', baseDataDir);
  app.setPath('sessionData', sessionDir);
  app.commandLine.appendSwitch('disk-cache-dir', cacheDir);
} catch {
  // If this fails, Electron will fall back to default paths.
}

function sendWindowState(win) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('window:maximized-changed', win.isMaximized());
}

function backendHealthcheck() {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: BACKEND_HOST,
        port: BACKEND_PORT,
        path: '/api/has-data',
        timeout: 1500,
      },
      (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      }
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackendReady(timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await backendHealthcheck()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function getBackendCommand() {
  if (isDev) {
    return {
      command: process.env.BUDGET_PYTHON || 'python',
      args: [path.join(__dirname, '..', 'backend', 'main.py')],
    };
  }

  const exeName = process.platform === 'win32' ? 'budget-ledger-backend.exe' : 'budget-ledger-backend';
  const packagedPath = path.join(process.resourcesPath, 'backend', exeName);
  return {
    command: packagedPath,
    args: [],
  };
}

async function startBackend() {
  if (backendProcess) return true;

  const { command, args } = getBackendCommand();
  if (!isDev && !fs.existsSync(command)) {
    console.error('Bundled backend executable not found at', command);
    return false;
  }

  const env = {
    ...process.env,
    BUDGET_HOST: BACKEND_HOST,
    BUDGET_PORT: String(BACKEND_PORT),
    BUDGET_DATA_DIR: app.getPath('userData'),
  };

  backendProcess = spawn(command, args, {
    env,
    windowsHide: true,
    stdio: isDev ? 'inherit' : 'ignore',
  });

  backendProcess.once('exit', () => {
    backendProcess = null;
  });

  return waitForBackendReady();
}

function stopBackend() {
  if (!backendProcess || backendProcess.killed) return;
  try {
    backendProcess.kill();
  } catch {
    // ignore shutdown errors
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    autoHideMenuBar: true,
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  const isSafeAppUrl = (url) => {
    if (isDev) return url.startsWith('http://localhost:5173');
    return url.startsWith('file://');
  };

  // Keep external URLs out of the app window and open them in the OS browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (isSafeAppUrl(url)) return;

    event.preventDefault();
    if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) {
      shell.openExternal(url);
    }
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.once('ready-to-show', () => {
    sendWindowState(win);
    win.show();
  });
  win.on('maximize', () => sendWindowState(win));
  win.on('unmaximize', () => sendWindowState(win));
  win.on('enter-full-screen', () => sendWindowState(win));
  win.on('leave-full-screen', () => sendWindowState(win));
}

app.whenReady().then(async () => {
  db.initDatabase(app);

  try {
    await startBackend();
  } catch (err) {
    console.error('Failed to start backend API', err);
  }

  ipcMain.handle('db:hasData',              (_e, ...a) => db.hasData(...a));
  ipcMain.handle('db:importAllData',        (_e, ...a) => db.importAllData(...a));
  ipcMain.handle('db:loadAllData',          (_e, ...a) => db.loadAllData(...a));
  ipcMain.handle('db:setCurrentBudget',     (_e, ...a) => db.setCurrentBudget(...a));
  ipcMain.handle('db:createBudget',         (_e, ...a) => db.createBudget(...a));
  ipcMain.handle('db:updateBudgetMeta',     (_e, ...a) => db.updateBudgetMeta(...a));
  ipcMain.handle('db:deleteBudget',         (_e, ...a) => db.deleteBudget(...a));
  ipcMain.handle('db:addTransaction',       (_e, ...a) => db.addTransaction(...a));
  ipcMain.handle('db:updateTransaction',    (_e, ...a) => db.updateTransaction(...a));
  ipcMain.handle('db:deleteTransaction',    (_e, ...a) => db.deleteTransaction(...a));
  ipcMain.handle('db:importTransactions',   (_e, ...a) => db.importTransactions(...a));
  ipcMain.handle('db:updateBudgetAmount',   (_e, ...a) => db.updateBudgetAmount(...a));
  ipcMain.handle('db:addCategory',          (_e, ...a) => db.addCategory(...a));
  ipcMain.handle('db:removeCategory',       (_e, ...a) => db.removeCategory(...a));
  ipcMain.handle('db:addAccount',           (_e, ...a) => db.addAccount(...a));
  ipcMain.handle('db:updateAccount',        (_e, ...a) => db.updateAccount(...a));
  ipcMain.handle('db:updateAccountBalance', (_e, ...a) => db.updateAccountBalance(...a));
  ipcMain.handle('db:deleteAccount',        (_e, ...a) => db.deleteAccount(...a));
  ipcMain.handle('db:addBill',              (_e, ...a) => db.addBill(...a));
  ipcMain.handle('db:updateBill',           (_e, ...a) => db.updateBill(...a));
  ipcMain.handle('db:deleteBill',           (_e, ...a) => db.deleteBill(...a));
  ipcMain.handle('window:minimize',         (event) => BrowserWindow.fromWebContents(event.sender)?.minimize());
  ipcMain.handle('window:toggleMaximize',   (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;

    if (win.isMaximized()) {
      win.unmaximize();
      return false;
    }

    win.maximize();
    return true;
  });
  ipcMain.handle('window:close',            (event) => BrowserWindow.fromWebContents(event.sender)?.close());
  ipcMain.handle('window:isMaximized',      (event) => BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false);
  ipcMain.handle('app:getVersion',          () => app.getVersion());
  ipcMain.handle('app:getReleaseTag',       () => APP_RELEASE_TAG);
  ipcMain.handle('app:getPlatform',         () => process.platform);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopBackend();
});
