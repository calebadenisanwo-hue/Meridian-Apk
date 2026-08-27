import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  PieChart,
  Edit2,
  DollarSign,
  Landmark,
  PiggyBank,
  TrendingUp,
  Coins,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { FinanceState, FinanceTransaction, FinanceAccount } from '../../types';
import { MeridianStorage, fmtNaira, fmtDateShort, todayStr } from '../../services/storage';

const KIND_ICONS: Record<FinanceAccount['kind'], React.ElementType> = {
  bank: Landmark,
  cash: Coins,
  savings: PiggyBank,
  investment: TrendingUp,
};

const KIND_COLORS: Record<FinanceAccount['kind'], string> = {
  bank: '#22A566',
  cash: '#C9963A',
  savings: '#4FA9E0',
  investment: '#C77DFF',
};

const KIND_LABELS: Record<FinanceAccount['kind'], string> = {
  bank: 'Bank Account',
  cash: 'Cash Wallet',
  savings: 'Savings Vault',
  investment: 'Investment & Portfolio',
};

export const FinanceView: React.FC = () => {
  const [state, setState] = useState<FinanceState>(() => MeridianStorage.getFinance());
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'transactions' | 'budgets' | 'accounts'>('overview');

  // Transaction filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Account modal states
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accName, setAccName] = useState('');
  const [accKind, setAccKind] = useState<FinanceAccount['kind']>('savings');
  const [accOpening, setAccOpening] = useState('');
  const [accAccent, setAccAccent] = useState('#4FA9E0');

  // Calculate account balances
  const calculateBalance = (account: FinanceAccount) => {
    let bal = account.opening;
    (state.transactions || []).forEach(t => {
      if (t.type === 'income' && t.accountId === account.id) bal += t.amountKobo;
      else if (t.type === 'expense' && t.accountId === account.id) bal -= t.amountKobo;
      else if (t.type === 'adjustment' && t.accountId === account.id) bal += t.amountKobo;
      else if (t.type === 'transfer') {
        if (t.fromAccountId === account.id) bal -= t.amountKobo;
        if (t.toAccountId === account.id) bal += t.amountKobo;
      }
    });
    return bal;
  };

  const totalNetWorthKobo = state.accounts.reduce((sum, a) => sum + calculateBalance(a), 0);

  // Asset category breakdowns
  const liquidKobo = state.accounts
    .filter(a => a.kind === 'bank' || a.kind === 'cash')
    .reduce((sum, a) => sum + calculateBalance(a), 0);

  const savingsKobo = state.accounts
    .filter(a => a.kind === 'savings')
    .reduce((sum, a) => sum + calculateBalance(a), 0);

  const investmentKobo = state.accounts
    .filter(a => a.kind === 'investment')
    .reduce((sum, a) => sum + calculateBalance(a), 0);

  // Month totals
  const ym = todayStr().slice(0, 7);
  const monthTransactions = (state.transactions || []).filter(t => t.date.slice(0, 7) === ym);
  const monthIncomeKobo = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amountKobo, 0);
  const monthExpenseKobo = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amountKobo, 0);

  // Category spending breakdown for current month
  const categorySpend: Record<string, number> = {};
  monthTransactions
    .filter(t => t.type === 'expense' && t.categoryId)
    .forEach(t => {
      categorySpend[t.categoryId!] = (categorySpend[t.categoryId!] || 0) + t.amountKobo;
    });

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Delete this transaction entry?')) {
      const updated = state.transactions.filter(t => t.id !== id);
      const newState = { ...state, transactions: updated };
      setState(newState);
      MeridianStorage.saveFinance(newState);
    }
  };

  const handleExportCSV = () => {
    const header = ['Date', 'Type', 'Account', 'Category', 'Merchant/Note', 'Amount (NGN)'];
    const rows = state.transactions.map(t => {
      const acc = state.accounts.find(a => a.id === t.accountId);
      const cat = state.categories.find(c => c.id === t.categoryId);
      return [
        t.date,
        t.type,
        acc ? acc.name : '',
        cat ? cat.name : '',
        `"${(t.merchant || t.note || '').replace(/"/g, '""')}"`,
        (t.amountKobo / 100).toFixed(2),
      ].join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meridian-finance-transactions-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTransactions = (state.transactions || []).filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (accountFilter !== 'all' && t.accountId !== accountFilter && t.fromAccountId !== accountFilter && t.toAccountId !== accountFilter)
      return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        (t.merchant && t.merchant.toLowerCase().includes(q)) ||
        (t.note && t.note.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const openNewAccountModal = (kind: FinanceAccount['kind'] = 'savings') => {
    setEditingAccountId(null);
    setAccName('');
    setAccKind(kind);
    setAccOpening('');
    setAccAccent(KIND_COLORS[kind]);
    setIsAccountModalOpen(true);
  };

  const openEditAccountModal = (acc: FinanceAccount) => {
    setEditingAccountId(acc.id);
    setAccName(acc.name);
    setAccKind(acc.kind);
    setAccOpening((acc.opening / 100).toString());
    setAccAccent(acc.accent);
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;

    const openingKobo = Math.round((parseFloat(accOpening) || 0) * 100);

    let updatedAccounts: FinanceAccount[];
    if (editingAccountId) {
      updatedAccounts = state.accounts.map(a =>
        a.id === editingAccountId
          ? { ...a, name: accName.trim(), kind: accKind, accent: accAccent, opening: openingKobo }
          : a
      );
    } else {
      const newAcc: FinanceAccount = {
        id: 'acc_' + Date.now().toString(36),
        name: accName.trim(),
        kind: accKind,
        accent: accAccent,
        opening: openingKobo,
        openingDate: todayStr(),
      };
      updatedAccounts = [...state.accounts, newAcc];
    }

    const newState = { ...state, accounts: updatedAccounts };
    setState(newState);
    MeridianStorage.saveFinance(newState);
    setIsAccountModalOpen(false);
  };

  const handleDeleteAccount = (id: string) => {
    if (state.accounts.length <= 1) {
      alert('You must keep at least one account.');
      return;
    }
    if (confirm('Delete this account? (Historical transactions linked to this account will remain in logs)')) {
      const updatedAccounts = state.accounts.filter(a => a.id !== id);
      const newState = { ...state, accounts: updatedAccounts };
      setState(newState);
      MeridianStorage.saveFinance(newState);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Sub-Navigation */}
      <div
        className="p-1.5 rounded-2xl border flex items-center justify-between gap-1 overflow-x-auto"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <div className="flex items-center gap-1">
          {[
            { id: 'overview', label: 'Financial Overview', icon: Wallet },
            { id: 'transactions', label: `Transactions (${state.transactions?.length || 0})`, icon: ArrowRightLeft },
            { id: 'budgets', label: 'Monthly Budgets', icon: PieChart },
            { id: 'accounts', label: `Accounts & Vaults (${state.accounts?.length || 0})`, icon: DollarSign },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Net Worth Ribbon */}
          <div
            className="p-6 rounded-3xl border shadow-sm space-y-5"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-primary tracking-wider">
                  Total Combined Net Worth
                </span>
                <div className="text-3xl sm:text-4xl font-bold font-mono text-on-surface mt-1">
                  {fmtNaira(totalNetWorthKobo)}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Across {state.accounts.length} active asset vaults, bank, savings, and investment accounts
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-right">
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-outline-variant text-left">
                  <span className="text-[11px] font-mono text-on-surface-variant">This Month In</span>
                  <div className="text-sm font-bold font-mono text-emerald-400">+{fmtNaira(monthIncomeKobo)}</div>
                </div>
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-outline-variant text-left">
                  <span className="text-[11px] font-mono text-on-surface-variant">This Month Out</span>
                  <div className="text-sm font-bold font-mono text-rose-400">−{fmtNaira(monthExpenseKobo)}</div>
                </div>
              </div>
            </div>

            {/* Asset Allocation Pill Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-outline-variant/50">
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-outline-variant flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant">Liquid (Bank & Cash)</span>
                  <div className="text-sm font-bold font-mono text-on-surface">{fmtNaira(liquidKobo)}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-outline-variant flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant">Savings Vaults</span>
                  <div className="text-sm font-bold font-mono text-on-surface">{fmtNaira(savingsKobo)}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-outline-variant flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant">Investments Portfolio</span>
                  <div className="text-sm font-bold font-mono text-on-surface">{fmtNaira(investmentKobo)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Balances Grid */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-bold font-display uppercase tracking-wider text-on-surface-variant">
                Account Asset Balances
              </h3>
              <button
                onClick={() => setActiveSubTab('accounts')}
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <span>Manage Accounts</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {state.accounts.map(acc => {
                const bal = calculateBalance(acc);
                const Icon = KIND_ICONS[acc.kind] || Wallet;
                return (
                  <div
                    key={acc.id}
                    className="p-4 rounded-2xl border bg-surface-container space-y-2 shadow-sm relative overflow-hidden"
                    style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: acc.accent + '22', color: acc.accent }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold truncate max-w-[110px]">{acc.name}</span>
                      </div>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: acc.accent }}
                      />
                    </div>
                    <div className="text-lg font-bold font-mono text-on-surface">{fmtNaira(bal)}</div>
                    <div className="text-[10px] text-on-surface-variant font-mono uppercase">
                      {KIND_LABELS[acc.kind]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS LIST */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="w-full sm:w-48 px-3.5 py-2 text-xs rounded-full border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
              />
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-full border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
              >
                <option value="all" className="dark:bg-zinc-800">All Types</option>
                <option value="expense" className="dark:bg-zinc-800">Expense</option>
                <option value="income" className="dark:bg-zinc-800">Income</option>
                <option value="transfer" className="dark:bg-zinc-800">Transfer</option>
                <option value="adjustment" className="dark:bg-zinc-800">Adjustment</option>
              </select>
              <select
                value={accountFilter}
                onChange={e => setAccountFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-full border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
              >
                <option value="all" className="dark:bg-zinc-800">All Accounts</option>
                {state.accounts.map(a => (
                  <option key={a.id} value={a.id} className="dark:bg-zinc-800">
                    {a.name} ({a.kind})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleExportCSV}
              type="button"
              className="px-4 py-2 text-xs font-semibold rounded-full border border-outline-variant hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5 text-on-surface-variant shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Transactions List */}
          <div
            className="rounded-3xl border divide-y overflow-hidden shadow-sm"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-xs text-on-surface-variant">
                No transactions match your filter criteria.
              </div>
            ) : (
              filteredTransactions.map(t => {
                const acc = state.accounts.find(a => a.id === t.accountId);
                const fromAcc = state.accounts.find(a => a.id === t.fromAccountId);
                const toAcc = state.accounts.find(a => a.id === t.toAccountId);
                const cat = state.categories.find(c => c.id === t.categoryId);
                const isExpense = t.type === 'expense';
                const isIncome = t.type === 'income';

                return (
                  <div key={t.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isIncome
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isExpense
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : isExpense ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowRightLeft className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-xs sm:text-sm font-semibold text-on-surface truncate">
                          {t.merchant || t.note || (t.type[0].toUpperCase() + t.type.slice(1))}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-on-surface-variant flex-wrap">
                          <span>{fmtDateShort(t.date)}</span>
                          {t.type === 'transfer' ? (
                            <span className="font-mono">
                              {fromAcc?.name || 'Account'} → {toAcc?.name || 'Account'}
                            </span>
                          ) : (
                            acc && <span>· {acc.name}</span>
                          )}
                          {cat && (
                            <span
                              className="px-2 py-0.2 rounded-full font-mono text-[10px]"
                              style={{ backgroundColor: cat.color + '22', color: cat.color }}
                            >
                              {cat.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-xs sm:text-sm font-mono font-bold ${
                          isIncome ? 'text-emerald-400' : isExpense ? 'text-rose-400' : 'text-on-surface'
                        }`}
                      >
                        {isExpense ? '−' : isIncome ? '+' : ''}
                        {fmtNaira(t.amountKobo)}
                      </span>
                      <button
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-rose-400"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BUDGETS */}
      {activeSubTab === 'budgets' && (
        <div
          className="p-6 rounded-3xl border space-y-4 shadow-sm"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-display">Monthly Category Budgets</h3>
            <span className="text-xs font-mono text-on-surface-variant">{ym}</span>
          </div>

          <div className="space-y-4">
            {state.categories
              .filter(c => c.kind === 'expense')
              .map(cat => {
                const budgetKobo = state.budgets[cat.id] || 0;
                const spentKobo = categorySpend[cat.id] || 0;
                const pct = budgetKobo > 0 ? Math.min(100, Math.round((spentKobo / budgetKobo) * 100)) : 0;
                const isOver = budgetKobo > 0 && spentKobo > budgetKobo;

                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span>{cat.name}</span>
                      </div>
                      <div className="font-mono">
                        <span className={isOver ? 'text-rose-400 font-bold' : ''}>{fmtNaira(spentKobo)}</span>
                        {budgetKobo > 0 && <span className="text-on-surface-variant"> / {fmtNaira(budgetKobo)}</span>}
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-500' : 'bg-primary'}`}
                        style={{ width: `${budgetKobo > 0 ? pct : spentKobo > 0 ? 100 : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 4: ASSET ACCOUNTS & VAULTS */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-bold font-display uppercase tracking-wider text-on-surface-variant">
                Asset Vaults & Accounts
              </h3>
              <p className="text-xs text-on-surface-variant">
                Manage bank accounts, physical cash, savings goals, and investment portfolios.
              </p>
            </div>
            <button
              onClick={() => openNewAccountModal('savings')}
              className="px-4 py-2 text-xs font-bold rounded-full bg-primary text-on-primary hover:opacity-90 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {state.accounts.map(acc => {
              const bal = calculateBalance(acc);
              const Icon = KIND_ICONS[acc.kind] || Wallet;
              return (
                <div
                  key={acc.id}
                  className="p-5 rounded-3xl border bg-surface-container space-y-3 relative group shadow-sm"
                  style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: acc.accent + '22', color: acc.accent }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-on-surface">{acc.name}</h4>
                        <span className="text-[10px] font-mono uppercase text-on-surface-variant">
                          {KIND_LABELS[acc.kind]}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditAccountModal(acc)}
                        className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-on-surface-variant hover:text-on-surface transition-colors"
                        title="Edit Account"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(acc.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-on-surface-variant hover:text-rose-400 transition-colors"
                        title="Delete Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-2xl font-bold font-mono text-on-surface">{fmtNaira(bal)}</div>

                  <div className="flex items-center justify-between text-xs text-on-surface-variant font-mono pt-2 border-t border-outline-variant/40">
                    <span>Initial: {fmtNaira(acc.opening)}</span>
                    <span>Created: {fmtDateShort(acc.openingDate)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ACCOUNT MODAL */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-xl bg-surface-container"
            style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-on-surface">
                {editingAccountId ? 'Edit Account / Vault' : 'Add New Account / Vault'}
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1 rounded-full text-on-surface-variant hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High-Yield Savings, Stanbic Bank, Crypto / Stocks"
                  value={accName}
                  onChange={e => setAccName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Account Kind
                  </label>
                  <select
                    value={accKind}
                    onChange={e => {
                      const k = e.target.value as FinanceAccount['kind'];
                      setAccKind(k);
                      setAccAccent(KIND_COLORS[k]);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                  >
                    <option value="bank" className="dark:bg-zinc-800">Bank Account</option>
                    <option value="cash" className="dark:bg-zinc-800">Cash Wallet</option>
                    <option value="savings" className="dark:bg-zinc-800">Savings Vault</option>
                    <option value="investment" className="dark:bg-zinc-800">Investment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Opening Balance (NGN)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={accOpening}
                    onChange={e => setAccOpening(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {['#22A566', '#C9963A', '#4FA9E0', '#C77DFF', '#E53E3E', '#F0A8C4', '#D3A346'].map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setAccAccent(col)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        accAccent === col ? 'border-white scale-110 shadow-sm' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-full border border-outline-variant text-on-surface-variant hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-full bg-primary text-on-primary hover:opacity-90 shadow-sm"
                >
                  {editingAccountId ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
