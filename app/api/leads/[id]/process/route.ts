import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { scoreLead } from "@/lib/scoreLead";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate the logged-in user
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid authentication.",
        },
        { status: 401 }
      );
    }

    // 2. Verify the user is an owner of a client
    const { data: membership, error: membershipError } =
      await supabaseAdmin
        .from("client_members")
        .select("client_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        {
          success: false,
          error: "Client membership not found.",
        },
        { status: 403 }
      );
    }

    if (membership.role !== "owner") {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have permission to process leads.",
        },
        { status: 403 }
      );
    }

    const leadId = params.id;

    // 3. Get the lead only if it belongs to the user's client
    const { data: lead, error: fetchError } =
      await supabaseAdmin
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .eq("client_id", membership.client_id)
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

    // 4. Run AI scoring
    console.log("Starting AI processing for lead:", leadId);

    const result = await scoreLead({
      name: lead.name,
      message: lead.message,
    });

    console.log("AI processing result:", result);

    // 5. Save AI results only to the verified client's lead
    const { error: updateError } =
      await supabaseAdmin
        .from("leads")
        .update({
          ai_score: result.score,
          ai_category: result.category,
          ai_reasoning: result.reasoning,
          ai_reasons_bullets: JSON.stringify(result.reasons),
          ai_suggested_reply: result.suggested_reply,
        })
        .eq("id", leadId)
        .eq("client_id", membership.client_id);

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

    // 6. Done
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