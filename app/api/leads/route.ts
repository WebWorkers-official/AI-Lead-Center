import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authenticateApiKey } from "@/lib/authenticateApiKey";
import { isLikelySpam } from "@/lib/spamCheck";
import { waitUntil } from "@vercel/functions";
import { scoreLead } from "@/lib/scoreLead";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name,
      email,
      phone,
      company,
      budget,
      message,
      source,
    } = body;

    // -----------------------------
    // 1. Validate required fields
    // -----------------------------

    if (!name || !email || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Name, email, and message are required.",
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // 2. Validate email
    // -----------------------------

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // 3. Spam protection
    // -----------------------------

    if (isLikelySpam(message)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter a real message describing your enquiry.",
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // 4. Authenticate API key
    // -----------------------------

    const apiKey = req.headers.get("X-RaveWebs-Key");

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "API key is required.",
        },
        { status: 401 }
      );
    }

    const auth = await authenticateApiKey(apiKey);

    if (!auth.success) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
        },
        { status: 401 }
      );
    }

    const clientId = auth.clientId;

    // -----------------------------
    // 5. Create lead
    // -----------------------------

  const { data, error } = await supabaseAdmin
  .from("leads")
  .insert([{
    client_id: clientId,
    name,
    email,
    phone: phone || null,
    company: company || null,
    budget: budget || null,
    message,
    source: source || "Website",
    status: "new",
    ai_status: "processing",
  }])

      .select("id")
      .single();

    if (error || !data) {
      console.error("Supabase insert error:", error);

      return NextResponse.json(
        {
          success: false,
          error:
            error?.message || "Failed to save lead.",
        },
        { status: 500 }
      );
    }

    const leadId = data.id;

// -----------------------------
// 6. Process AI scoring in background
// -----------------------------

waitUntil(
  (async () => {
    try {
      console.log("Starting background AI scoring for lead:", leadId);

      const result = await scoreLead({
        name,
        company,
        budget,
        message,
      });

      console.log("Background AI scoring result:", result);

    const { error: scoreError } = await supabaseAdmin
      .from("leads")
      .update({
        ai_score: result.score,
        ai_category: result.category,
        ai_reasoning: result.reasoning,
        ai_reasons_bullets: JSON.stringify(result.reasons),
        ai_suggested_reply: result.suggested_reply,
        ai_status: "completed",
      })
      .eq("id", leadId);

      if (scoreError) {
        console.error(
          "FAILED TO SAVE BACKGROUND AI SCORE:",
          scoreError
        );
      } else {
        console.log(
          "BACKGROUND AI SCORE SAVED SUCCESSFULLY:",
          leadId
        );
      }
      } catch (scoreError) {
        console.error(
          "BACKGROUND AI SCORING FAILED:",
          scoreError
        );

        const { error: statusError } = await supabaseAdmin
          .from("leads")
          .update({
            ai_status: "failed",
          })
          .eq("id", leadId);

        if (statusError) {
          console.error(
            "FAILED TO SAVE AI FAILURE STATUS:",
            statusError
          );
        }
      }
        })()
      );


    // -----------------------------
    // 7. Return success
    // -----------------------------

    return NextResponse.json({
      success: true,
      id: leadId,
    });
  } catch (err) {
    console.error("Unexpected error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}