// Shared TypeScript types mirroring the database schema in
// supabase/migrations/0001_init.sql. Keep these in sync with the SQL.

export type StatementStatus = "pending" | "processing" | "done" | "failed";
export type TransactionDirection = "debit" | "credit";
export type AIProvider = "claude" | "openai" | "openrouter";

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface Book {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

// Book plus derived counts used by the dashboard cards.
export interface BookWithStats extends Book {
  account_count: number;
  statement_count: number;
  transaction_count: number;
}

export interface BankAccount {
  id: string;
  book_id: string;
  bank_name: string;
  account_name: string; // nickname, e.g. "Business Checking"
  account_number_last4: string | null;
  currency: string;
  created_at: string;
}

export interface Statement {
  id: string;
  bank_account_id: string;
  file_url: string;
  file_name: string;
  status: StatementStatus;
  period_start: string | null;
  period_end: string | null;
  uploaded_at: string;
  processed_at: string | null;
}

// Statement joined with its bank account (used by the statements list API).
export interface StatementWithAccount extends Statement {
  bank_account: Pick<
    BankAccount,
    "id" | "bank_name" | "account_name" | "currency"
  > | null;
}

export interface Transaction {
  id: string;
  statement_id: string;
  bank_account_id: string;
  txn_date: string;
  description: string | null;
  raw_description: string | null;
  amount: number;
  direction: TransactionDirection | null;
  category: string | null;
  is_verified: boolean;
  confidence_score: number | null;
  created_at: string;
}

// Transaction joined with its bank account (used by the transactions list API).
export interface TransactionWithAccount extends Transaction {
  bank_account: Pick<
    BankAccount,
    "id" | "bank_name" | "account_name" | "currency"
  > | null;
}

export interface AIModelConfig {
  id: string;
  provider: AIProvider;
  model_name: string;
  api_key: string; // plain for MVP; encrypt before real launch
  is_active: boolean;
  created_at: string;
}

// API-safe shape: the raw api_key is never returned to the client, only a mask.
export interface AIModelConfigMasked extends Omit<AIModelConfig, "api_key"> {
  api_key_masked: string | null;
  has_key: boolean;
}
