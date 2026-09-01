import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/sendEmail";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));

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

    const messageText: string | undefined = body.message || lead.ai_suggested_reply;

    if (!messageText) {
      return NextResponse.json(
        { success: false, error: "No message content to send. Generate a response first." },
        { status: 400 }
      );
    }

    await sendEmail({
      to: lead.email,
      subject: `Re: Your enquiry${lead.company ? ` — ${lead.company}` : ""}`,
      text: messageText,
    });

    const sentAt = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("leads")
      .update({
        email_sent_at: sentAt,
        status: lead.status === "new" ? "contacted" : lead.status,
      })
      .eq("id", params.id);

    if (updateError) {
      console.error("Email sent, but failed to record it:", updateError);
    }

    return NextResponse.json({ success: true, sentAt });
  } catch (err: any) {
    console.error("Send email error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to send email. Please try again." },
      { status: 500 }
    );
  }
}