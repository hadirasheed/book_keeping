import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

// PATCH /api/ai-models/:id — toggle a provider on/off { enabled }.
// Disabling a provider also clears its active flag.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled (boolean) is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const updates: Record<string, unknown> = { enabled: body.enabled };
    if (!body.enabled) updates.is_active = false;

    const { data, error } = await supabase
      .from("ai_model_configs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ config: { ...data, api_key: undefined } });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
