import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateReply } from "@/lib/generateReply";

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

    const reply = await generateReply({
      name: lead.name,
      company: lead.company,
      budget: lead.budget,
      message: lead.message,
    });

    const { error: updateError } = await supabaseAdmin
      .from("leads")
      .update({ ai_suggested_reply: reply })
      .eq("id", params.id);

    if (updateError) {
      console.error("Failed to save regenerated reply:", updateError);
    }

    return NextResponse.json({ success: true, reply });
  } catch (err) {
    console.error("Generate response error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate a response. Please try again." },
      { status: 500 }
    );
  }
}