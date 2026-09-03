import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { scoreLead } from "@/lib/scoreLead";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: lead, error: fetchError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", params.id)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found." },
        { status: 404 }
      );
    }

    const result = await scoreLead({
      name: lead.name,
      company: lead.company,
      budget: lead.budget,
      message: lead.message,
    });

    const { error: updateError } = await supabaseAdmin
      .from("leads")
      .update({
        ai_score: result.score,
        ai_category: result.category,
        ai_reasoning: result.reasoning,
        ai_suggested_reply: result.suggested_reply,
      })
      .eq("id", params.id);

    if (updateError) {
      console.error("Failed to save score:", updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    // This runs in the background — a failure here just means the lead
    // stays unscored, which is fine. It's still saved and visible.
    console.error("Background scoring failed:", err);
    return NextResponse.json(
      { success: false, error: "Scoring failed." },
      { status: 500 }
    );
  }
}