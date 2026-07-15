import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

// GET /api/bank-accounts?bookId= — list accounts for a book.
export async function GET(req: NextRequest) {
  try {
    const bookId = req.nextUrl.searchParams.get("bookId");
    if (!bookId) {
      return NextResponse.json({ error: "bookId is required" }, { status: 400 });
    }
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("book_id", bookId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ bankAccounts: data });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/bank-accounts — create an account under a book.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bookId = body.book_id;
    const bankName = (body.bank_name ?? "").trim();
    const accountName = (body.account_name ?? "").trim();

    if (!bookId || !bankName || !accountName) {
      return NextResponse.json(
        { error: "book_id, bank_name and account_name are required" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("bank_accounts")
      .insert({
        book_id: bookId,
        bank_name: bankName,
        account_name: accountName,
        account_number_last4: body.account_number_last4?.trim() || null,
        currency: (body.currency ?? "USD").trim() || "USD",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ bankAccount: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// PATCH /api/bank-accounts — update an account { id, ...fields }.
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.bank_name !== undefined) updates.bank_name = body.bank_name.trim();
    if (body.account_name !== undefined)
      updates.account_name = body.account_name.trim();
    if (body.account_number_last4 !== undefined)
      updates.account_number_last4 = body.account_number_last4?.trim() || null;
    if (body.currency !== undefined)
      updates.currency = body.currency.trim() || "USD";

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("bank_accounts")
      .update(updates)
      .eq("id", body.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ bankAccount: data });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/bank-accounts?id= — delete an account (cascades statements/txns).
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const supabase = getServiceClient();
    const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
