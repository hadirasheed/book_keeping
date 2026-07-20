import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getCurrentUserId } from "@/lib/auth-user";
import {
  userOwnsAccount,
  userOwnsBook,
  userOwnsStatement,
} from "@/lib/ownership";

const BUCKET = "statements";
const DENIED = NextResponse.json({ error: "Not found" }, { status: 404 });

// GET /api/statements?bookId= — list statements for a book, joined with the
// bank account name. Ordered newest first.
export async function GET(req: NextRequest) {
  try {
    const bookId = req.nextUrl.searchParams.get("bookId");
    if (!bookId) {
      return NextResponse.json({ error: "bookId is required" }, { status: 400 });
    }
    const userId = await getCurrentUserId();
    if (!(await userOwnsBook(bookId, userId))) return DENIED;
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("statements")
      .select(
        "*, bank_account:bank_accounts!inner(id, bank_name, account_name, currency, book_id)"
      )
      .eq("bank_account.book_id", bookId)
      .order("uploaded_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ statements: data });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/statements — multipart form: file, bookId, bankAccountId.
// Uploads the file to Storage and inserts a `statements` row (status=pending).
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const bookId = form.get("bookId") as string | null;
    const bankAccountId = form.get("bankAccountId") as string | null;

    if (!file || !bookId || !bankAccountId) {
      return NextResponse.json(
        { error: "file, bookId and bankAccountId are required" },
        { status: 400 }
      );
    }
    const userId = await getCurrentUserId();
    if (!(await userOwnsAccount(bankAccountId, userId))) return DENIED;

    const supabase = getServiceClient();

    // Store under statements/{bookId}/{bankAccountId}/{timestamp}-{filename}.
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${bookId}/${bankAccountId}/${Date.now()}-${safeName}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    // Private bucket: store the storage path as file_url. A signed URL can be
    // generated on demand when we need to read the file back.
    const { data, error } = await supabase
      .from("statements")
      .insert({
        bank_account_id: bankAccountId,
        file_url: path,
        file_name: file.name,
        status: "pending", // TODO: AI parsing into `transactions` is a follow-up step.
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ statement: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/statements?id= — remove a statement, its Storage file, and its
// transactions (transactions cascade via the FK on delete).
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const userId = await getCurrentUserId();
    if (!(await userOwnsStatement(id, userId))) return DENIED;
    const supabase = getServiceClient();

    // Look up the storage path first so we can clean up the file.
    const { data: statement } = await supabase
      .from("statements")
      .select("file_url")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("statements").delete().eq("id", id);
    if (error) throw error;

    // Best-effort file removal (don't fail the request if the object is gone).
    if (statement?.file_url) {
      await supabase.storage.from(BUCKET).remove([statement.file_url]);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
