import { getServiceClient } from "@/lib/supabase-server";

// Ownership checks so one user can't reach another user's data by guessing ids.
// Everything hangs off books.user_id: accounts belong to a book, statements to
// an account, transactions to a statement.

export async function userOwnsBook(
  bookId: string,
  userId: string
): Promise<boolean> {
  const { data } = await getServiceClient()
    .from("books")
    .select("id")
    .eq("id", bookId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function userOwnsAccount(
  accountId: string,
  userId: string
): Promise<boolean> {
  const { data } = await getServiceClient()
    .from("bank_accounts")
    .select("book:books!inner(user_id)")
    .eq("id", accountId)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)?.book?.user_id === userId;
}

export async function userOwnsStatement(
  statementId: string,
  userId: string
): Promise<boolean> {
  const { data } = await getServiceClient()
    .from("statements")
    .select("bank_account:bank_accounts!inner(book:books!inner(user_id))")
    .eq("id", statementId)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)?.bank_account?.book?.user_id === userId;
}
