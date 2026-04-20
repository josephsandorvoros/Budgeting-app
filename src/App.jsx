import { useEffect, useState } from 'react';
import NavBar from './components/NavBar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AnnualBudget from './pages/AnnualBudget.jsx';
import Expenses from './pages/Expenses.jsx';
import MonthlyView from './pages/MonthlyView.jsx';
import Categories from './pages/Categories.jsx';
import BalanceSheet from './pages/BalanceSheet.jsx';
import SettingsAccounts from './pages/SettingsAccounts.jsx';
import BillsRecurring from './pages/BillsRecurring.jsx';
import ManageBudgets from './pages/ManageBudgets.jsx';
import DataManagement from './pages/DataManagement.jsx';
import Templates from './pages/Templates.jsx';
import Updates from './pages/Updates.jsx';
import WhatsNew from './pages/WhatsNew.jsx';
import About from './pages/About.jsx';
import Help from './pages/Help.jsx';
import { useAppData } from './hooks/useAppData.js';
import './App.css';

function DesktopTitleBar({ isMaximized, onMaximizedChange }) {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  if (!isElectron) return null;

  const handleMinimize = () => {
    window.electronAPI.minimizeWindow();
  };

  const handleToggleMaximize = async () => {
    const value = await window.electronAPI.toggleMaximizeWindow();
    onMaximizedChange(Boolean(value));
  };

  const handleClose = () => {
    window.electronAPI.closeWindow();
  };

  return (
    <header className="desktop-titlebar">
      <div className="desktop-titlebar-drag" onDoubleClick={handleToggleMaximize}>
        <div className="desktop-titlebar-brand">
          <span className="desktop-titlebar-logo">📒</span>
          <span className="desktop-titlebar-title">Budget Ledger</span>
        </div>
      </div>
      <div className="desktop-titlebar-actions">
        <button className="desktop-titlebar-btn" type="button" onClick={handleMinimize} aria-label="Minimize window">−</button>
        <button className="desktop-titlebar-btn" type="button" onClick={handleToggleMaximize} aria-label={isMaximized ? 'Restore window' : 'Maximize window'}>{isMaximized ? '❐' : '□'}</button>
        <button className="desktop-titlebar-btn desktop-titlebar-btn-close" type="button" onClick={handleClose} aria-label="Close window">✕</button>
      </div>
    </header>
  );
}

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [initialMonth, setInitialMonth] = useState(null);
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const {
    data,
    allBudgets,
    templates,
    budgetList,
    currentId,
    loading,
    createBudget,
    switchBudget,
    renameBudget,
    deleteBudget,
    duplicateBudget,
    saveCurrentAsTemplate,
    duplicateTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    applyTemplateToCurrent,
    updateBudget,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    importTransactions,
    addCategory,
    removeCategory,
    renameCategory,
    updateAccountBalance,
    updateAccountStartBalance,
    addAccount,
    updateAccount,
    deleteAccount,
    addBill,
    updateBill,
    deleteBill,
    exportAllData,
    importAllData,
    resetAllData,
  } = useAppData();

  const navigate = (p) => {
    setPage(p);
    if (p !== 'monthly') setInitialMonth(null);
  };

  useEffect(() => {
    if (!isElectron) return;

    let cancelled = false;
    const syncState = async () => {
      const value = await window.electronAPI.isWindowMaximized();
      if (!cancelled) setIsWindowMaximized(Boolean(value));
    };

    syncState();
    const unsubscribe = window.electronAPI.onWindowMaximizedChange((value) => {
      setIsWindowMaximized(Boolean(value));
    });

    document.body.classList.add('electron-shell-body');

    return () => {
      cancelled = true;
      unsubscribe?.();
      document.body.classList.remove('electron-shell-body');
    };
  }, [isElectron]);

  if (loading || !data) {
    if (!loading && !data) {
      return (
        <div className={`app-shell${isWindowMaximized ? ' app-shell-maximized' : ''}`}>
          <DesktopTitleBar isMaximized={isWindowMaximized} onMaximizedChange={setIsWindowMaximized} />
          <div className="app-layout">
            <NavBar
              page={page}
              setPage={navigate}
              budgetList={budgetList}
              currentId={currentId}
              onSwitchBudget={switchBudget}
              onCreateBudget={createBudget}
              onManageBudgets={() => navigate('manage')}
              onHelp={() => navigate('help')}
            />
            <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <div className="card" style={{ maxWidth: 680, width: '100%', textAlign: 'center', display: 'grid', gap: 12 }}>
                <div style={{ fontSize: 44 }}>📒</div>
                <h2 style={{ margin: 0 }}>No Budget Data Yet</h2>
                <div className="subtitle">Create your first budget or apply a template from Settings → Templates.</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-primary" onClick={() => createBudget('My Budget', new Date().getFullYear(), 'personal')}>Create Personal Budget</button>
                  <button className="btn-ghost" onClick={() => createBudget('Business Budget', new Date().getFullYear(), 'business')}>Create Business Budget</button>
                </div>
              </div>
            </main>
          </div>
        </div>
      );
    }

    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📒</div>
          <div style={{ fontSize: 18 }}>Loading Budget Ledger…</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell${isWindowMaximized ? ' app-shell-maximized' : ''}`}>
      <DesktopTitleBar isMaximized={isWindowMaximized} onMaximizedChange={setIsWindowMaximized} />
      <div className="app-layout">
        <NavBar
          page={page}
          setPage={navigate}
          budgetList={budgetList}
          currentId={currentId}
          onSwitchBudget={switchBudget}
          onCreateBudget={createBudget}
          onManageBudgets={() => navigate('manage')}
          onHelp={() => navigate('help')}
        />
        <main className="main-content">
          {page === 'manage' && (
            <ManageBudgets
              budgetList={budgetList}
              allBudgets={allBudgets}
              currentId={currentId}
              onSwitch={switchBudget}
              onRename={renameBudget}
              onDuplicate={duplicateBudget}
              onDelete={deleteBudget}
            />
          )}
          {page === 'dashboard' && (
            <Dashboard
              data={data}
              allBudgets={allBudgets}
              budgetList={budgetList}
              currentId={currentId}
              onSwitchBudget={switchBudget}
              setPage={navigate}
              setInitialMonth={setInitialMonth}
            />
          )}
          {page === 'annual' && (
            <AnnualBudget
              data={data}
              allBudgets={allBudgets}
              updateBudget={updateBudget}
              budgetList={budgetList}
              currentId={currentId}
              onSwitchBudget={switchBudget}
            />
          )}
          {page === 'expenses' && (
            <Expenses
              data={data}
              addTransaction={addTransaction}
              deleteTransaction={deleteTransaction}
              updateTransaction={updateTransaction}
              importTransactions={importTransactions}
            />
          )}
          {page === 'monthly' && (
            <MonthlyView
              data={data}
              allBudgets={allBudgets}
              initialMonth={initialMonth}
              budgetList={budgetList}
              currentId={currentId}
              onSwitchBudget={switchBudget}
            />
          )}
          {page === 'categories' && (
            <Categories
              data={data}
              addCategory={addCategory}
              removeCategory={removeCategory}
              renameCategory={renameCategory}
              budgetList={budgetList}
              currentId={currentId}
              onSwitchBudget={switchBudget}
              onNavigateSettings={navigate}
            />
          )}
          {page === 'data-management' && (
            <DataManagement
              data={data}
              exportAllData={exportAllData}
              importAllData={importAllData}
              importTransactions={importTransactions}
              resetAllData={resetAllData}
            />
          )}
          {page === 'templates' && (
            <Templates
              templates={templates}
              currentBudget={data}
              onSaveCurrentAsTemplate={saveCurrentAsTemplate}
              onDuplicateTemplate={duplicateTemplate}
              onUpdateTemplate={updateTemplate}
              onDeleteTemplate={deleteTemplate}
              onApplyTemplate={applyTemplate}
              onApplyTemplateToCurrent={applyTemplateToCurrent}
            />
          )}
          {page === 'updates' && <Updates />}
          {page === 'whats-new' && <WhatsNew />}
          {page === 'about' && <About />}
          {page === 'help' && <Help />}
          {page === 'balancesheet' && (
            <BalanceSheet
              data={data}
              updateAccountBalance={updateAccountBalance}
              updateAccountStartBalance={updateAccountStartBalance}
              addAccount={addAccount}
              deleteAccount={deleteAccount}
            />
          )}
          {page === 'accounts' && (
            <SettingsAccounts
              data={data}
              addAccount={addAccount}
              updateAccount={updateAccount}
              deleteAccount={deleteAccount}
              budgetList={budgetList}
              currentId={currentId}
              onSwitchBudget={switchBudget}
              onNavigateSettings={navigate}
            />
          )}
          {page === 'bills' && (
            <BillsRecurring
              data={data}
              addBill={addBill}
              updateBill={updateBill}
              deleteBill={deleteBill}
            />
          )}
        </main>
      </div>
    </div>
  );
}
