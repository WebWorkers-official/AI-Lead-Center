import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { scoreLead } from "@/lib/scoreLead";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, company, budget, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    let aiScore: number | null = null;
    let aiCategory: string | null = null;
    let aiReasoning: string | null = null;
    let aiSuggestedReply: string | null = null;

    try {
      const result = await scoreLead({ name, company, budget, message });
      aiScore = result.score;
      aiCategory = result.category;
      aiReasoning = result.reasoning;
      aiSuggestedReply = result.suggested_reply;
    } catch (scoringError) {
      console.error("Lead scoring failed (saving lead anyway):", scoringError);
    }

    const { error } = await supabase.from("leads").insert([
      {
        name,
        email,
        company: company || null,
        budget: budget || null,
        message,
        status: "new",
        ai_score: aiScore,
        ai_category: aiCategory,
        ai_reasoning: aiReasoning,
        ai_suggested_reply: aiSuggestedReply,
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, score: aiScore, category: aiCategory });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}