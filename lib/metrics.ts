import type { TransactionWithAccount } from "@/lib/types";

export interface CategoryStat {
  category: string;
  total: number;
  count: number;
  share: number; // fraction of total expenses
}

export interface MonthStat {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  net: number;
}

export interface Metrics {
  currency: string;
  count: number;
  income: number;
  expense: number;
  net: number;
  avgTxn: number;
  avgIncome: number;
  avgExpense: number;
  largestIncome: number;
  largestExpense: number;
  expenseToIncome: number | null; // expenses / income
  savingsRate: number | null; // net / income
  categorized: number;
  uncategorized: number;
  dateFrom: string | null;
  dateTo: string | null;
  categories: CategoryStat[]; // expense categories, largest first
  months: MonthStat[]; // chronological
}

function isCredit(t: TransactionWithAccount): boolean {
  return t.direction ? t.direction === "credit" : t.amount >= 0;
}

/** Compute basic + advanced accounting metrics from a book's transactions. */
export function computeMetrics(txns: TransactionWithAccount[]): Metrics {
  const currency = txns[0]?.bank_account?.currency ?? "KWD";

  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  let largestIncome = 0;
  let largestExpense = 0;
  let categorized = 0;
  let dateFrom: string | null = null;
  let dateTo: string | null = null;

  const catTotals = new Map<string, { total: number; count: number }>();
  const monthMap = new Map<string, { income: number; expense: number }>();

  for (const t of txns) {
    const amt = Math.abs(t.amount);
    const credit = isCredit(t);
    if (credit) {
      income += amt;
      incomeCount += 1;
      largestIncome = Math.max(largestIncome, amt);
    } else {
      expense += amt;
      expenseCount += 1;
      largestExpense = Math.max(largestExpense, amt);
      const cat = t.category || "Uncategorized";
      const c = catTotals.get(cat) ?? { total: 0, count: 0 };
      c.total += amt;
      c.count += 1;
      catTotals.set(cat, c);
    }
    if (t.category) categorized += 1;

    if (!dateFrom || t.txn_date < dateFrom) dateFrom = t.txn_date;
    if (!dateTo || t.txn_date > dateTo) dateTo = t.txn_date;

    const month = (t.txn_date || "").slice(0, 7);
    if (month) {
      const m = monthMap.get(month) ?? { income: 0, expense: 0 };
      if (credit) m.income += amt;
      else m.expense += amt;
      monthMap.set(month, m);
    }
  }

  const count = txns.length;
  const net = income - expense;

  const categories: CategoryStat[] = [...catTotals.entries()]
    .map(([category, v]) => ({
      category,
      total: v.total,
      count: v.count,
      share: expense > 0 ? v.total / expense : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const months: MonthStat[] = [...monthMap.entries()]
    .map(([month, v]) => ({
      month,
      income: v.income,
      expense: v.expense,
      net: v.income - v.expense,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    currency,
    count,
    income,
    expense,
    net,
    avgTxn: count ? (income + expense) / count : 0,
    avgIncome: incomeCount ? income / incomeCount : 0,
    avgExpense: expenseCount ? expense / expenseCount : 0,
    largestIncome,
    largestExpense,
    expenseToIncome: income > 0 ? expense / income : null,
    savingsRate: income > 0 ? net / income : null,
    categorized,
    uncategorized: count - categorized,
    dateFrom,
    dateTo,
    categories,
    months,
  };
}
