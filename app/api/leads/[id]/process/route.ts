import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { scoreLead } from "@/lib/scoreLead";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;

    // 1. Get the lead
    const { data: lead, error: fetchError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json(
        {
          success: false,
          error: "Lead not found.",
        },
        { status: 404 }
      );
    }

    // 2. Run AI scoring
    console.log("Starting AI processing for lead:", leadId);

    const result = await scoreLead({
      name: lead.name,
      company: lead.company,
      budget: lead.budget,
      message: lead.message,
    });

    console.log("AI processing result:", result);

    // 3. Save AI results
    const { error: updateError } = await supabaseAdmin
      .from("leads")
      .update({
        ai_score: result.score,
        ai_category: result.category,
        ai_reasoning: result.reasoning,
        ai_reasons_bullets: JSON.stringify(result.reasons),
        ai_suggested_reply: result.suggested_reply,
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("Failed to save AI results:", updateError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to save AI results.",
        },
        { status: 500 }
      );
    }

    // 4. Done
    return NextResponse.json({
      success: true,
      message: "Lead processed successfully.",
    });
  } catch (error) {
    console.error("Lead processing failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Lead processing failed.",
      },
      { status: 500 }
    );
  }
}