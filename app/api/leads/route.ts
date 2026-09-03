import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

    // Insert immediately, WITHOUT waiting for AI scoring.
    // Scoring happens in a separate follow-up request (see /score route)
    // so the visitor gets an instant response instead of waiting 5-10s.
    const { data, error } = await supabaseAdmin
      .from("leads")
      .insert([
        {
          name,
          email,
          company: company || null,
          budget: budget || null,
          message,
          status: "new",
        },
      ])
      .select("id")
      .single();

    if (error || !data) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { success: false, error: error?.message || "Failed to save lead." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}