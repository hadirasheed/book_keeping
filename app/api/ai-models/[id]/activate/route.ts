import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

// PATCH /api/ai-models/:id/activate — mark this config active and deactivate the
// others. Only one provider may be active at a time.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    // Deactivate everything, then activate the target. (Small table, so two
    // simple statements are clearer than a conditional single update.)
    const { error: deactivateError } = await supabase
      .from("ai_model_configs")
      .update({ is_active: false })
      .neq("id", id);
    if (deactivateError) throw deactivateError;

    const { data, error } = await supabase
      .from("ai_model_configs")
      .update({ is_active: true })
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
