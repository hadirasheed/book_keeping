import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, getDefaultUserId } from "@/lib/supabase-server";

// GET /api/books — list all books for the default user.
export async function GET() {
  try {
    const supabase = getServiceClient();
    const userId = await getDefaultUserId();
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ books: data });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/books — create a book { name, description? }.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const userId = await getDefaultUserId();
    const { data, error } = await supabase
      .from("books")
      .insert({
        user_id: userId,
        name,
        description: body.description?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ book: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
