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
} from 'lucide-react';
import { FinanceState, FinanceTransaction, FinanceAccount } from '../../types';
import { MeridianStorage, fmtNaira, fmtDateShort, todayStr } from '../../services/storage';

export const FinanceView: React.FC = () => {
  const [state, setState] = useState<FinanceState>(() => MeridianStorage.getFinance());
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'transactions' | 'budgets' | 'accounts'>('overview');

  // Transaction filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calculate account balances
  const calculateBalance = (account: FinanceAccount) => {
    let bal = account.opening;
    state.transactions.forEach(t => {
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

  // Month totals
  const ym = todayStr().slice(0, 7);
  const monthTransactions = state.transactions.filter(t => t.date.slice(0, 7) === ym);
  const monthIncomeKobo = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amountKobo, 0);
  const monthExpenseKobo = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amountKobo, 0);
  const savingsRate =
    monthIncomeKobo > 0
      ? Math.round(((monthIncomeKobo - monthExpenseKobo) / monthIncomeKobo) * 100)
      : null;

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

  const filteredTransactions = state.transactions.filter(t => {
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
            { id: 'transactions', label: `Transactions (${state.transactions.length})`, icon: ArrowRightLeft },
            { id: 'budgets', label: 'Monthly Budgets', icon: PieChart },
            { id: 'accounts', label: 'Asset Accounts', icon: DollarSign },
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
            className="p-6 rounded-3xl border shadow-sm space-y-4"
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
                  Across 4 active asset vaults and mobile bank accounts
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
          </div>

          {/* Account Balances Grid */}
          <div>
            <h3 className="text-sm font-bold font-display uppercase tracking-wider text-on-surface-variant mb-3 px-1">
              Account Asset Balances
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {state.accounts.map(acc => {
                const bal = calculateBalance(acc);
                return (
                  <div
                    key={acc.id}
                    className="p-4 rounded-2xl border bg-surface-container space-y-2 shadow-sm"
                    style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{acc.name}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: acc.accent }}
                      />
                    </div>
                    <div className="text-lg font-bold font-mono text-on-surface">{fmtNaira(bal)}</div>
                    <div className="text-[10px] text-on-surface-variant font-mono uppercase">
                      {acc.kind} Account
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
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="w-full px-3.5 py-2 text-xs rounded-full border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
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
                          {acc && <span>· {acc.name}</span>}
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

      {/* TAB 4: ASSET ACCOUNTS */}
      {activeSubTab === 'accounts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {state.accounts.map(acc => {
            const bal = calculateBalance(acc);
            return (
              <div
                key={acc.id}
                className="p-5 rounded-3xl border bg-surface-container space-y-3"
                style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">{acc.name}</h4>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold"
                    style={{ backgroundColor: acc.accent + '22', color: acc.accent }}
                  >
                    {acc.kind}
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-on-surface">{fmtNaira(bal)}</div>
                <p className="text-xs text-on-surface-variant font-mono">
                  Initial balance {fmtNaira(acc.opening)} on {fmtDateShort(acc.openingDate)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
