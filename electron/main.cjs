'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database.cjs');

const isDev = process.env.NODE_ENV === 'development';

function sendWindowState(win) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('window:maximized-changed', win.isMaximized());
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
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
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

app.whenReady().then(() => {
  db.initDatabase(app);

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

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
