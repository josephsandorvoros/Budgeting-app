'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Check / seed
  hasData:           ()           => ipcRenderer.invoke('db:hasData'),
  importAllData:     (state)      => ipcRenderer.invoke('db:importAllData', state),

  // Load
  loadAllData:       ()           => ipcRenderer.invoke('db:loadAllData'),

  // Budget management
  setCurrentBudget:  (id)         => ipcRenderer.invoke('db:setCurrentBudget', id),
  createBudget:      (id, name, year, type, seed) => ipcRenderer.invoke('db:createBudget', id, name, year, type, seed),
  updateBudgetMeta:  (id, name, year) => ipcRenderer.invoke('db:updateBudgetMeta', id, name, year),
  deleteBudget:      (id)         => ipcRenderer.invoke('db:deleteBudget', id),

  // Transactions
  addTransaction:    (budgetId, tx)        => ipcRenderer.invoke('db:addTransaction', budgetId, tx),
  updateTransaction: (id, updates)         => ipcRenderer.invoke('db:updateTransaction', id, updates),
  deleteTransaction: (id)                  => ipcRenderer.invoke('db:deleteTransaction', id),
  importTransactions:(budgetId, txArray)   => ipcRenderer.invoke('db:importTransactions', budgetId, txArray),

  // Budget amounts
  updateBudgetAmount:(budgetId, group, category, monthIndex, amount) =>
    ipcRenderer.invoke('db:updateBudgetAmount', budgetId, group, category, monthIndex, amount),

  // Categories
  addCategory:       (budgetId, group, name) => ipcRenderer.invoke('db:addCategory', budgetId, group, name),
  removeCategory:    (budgetId, group, name) => ipcRenderer.invoke('db:removeCategory', budgetId, group, name),

  // Accounts
  addAccount:              (budgetId, acc)              => ipcRenderer.invoke('db:addAccount', budgetId, acc),
  updateAccount:           (id, updates)                => ipcRenderer.invoke('db:updateAccount', id, updates),
  updateAccountBalance:    (accountId, monthIndex, bal) => ipcRenderer.invoke('db:updateAccountBalance', accountId, monthIndex, bal),
  deleteAccount:           (id)                         => ipcRenderer.invoke('db:deleteAccount', id),

  // Bills
  addBill:    (budgetId, bill) => ipcRenderer.invoke('db:addBill', budgetId, bill),
  updateBill: (id, updates)    => ipcRenderer.invoke('db:updateBill', id, updates),
  deleteBill: (id)             => ipcRenderer.invoke('db:deleteBill', id),

  // Window chrome
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggleMaximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getReleaseTag: () => ipcRenderer.invoke('app:getReleaseTag'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  onWindowMaximizedChange: (callback) => {
    const listener = (_event, value) => callback(Boolean(value));
    ipcRenderer.on('window:maximized-changed', listener);
    return () => ipcRenderer.removeListener('window:maximized-changed', listener);
  },
});
