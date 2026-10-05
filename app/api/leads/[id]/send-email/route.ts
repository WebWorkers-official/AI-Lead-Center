import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/sendEmail";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate the logged-in user
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
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
        { success: false, error: "Invalid authentication." },
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
        { success: false, error: "Client membership not found." },
        { status: 403 }
      );
    }

    if (membership.role !== "owner") {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have permission to send emails.",
        },
        { status: 403 }
      );
    }

    // 3. Fetch the lead only if it belongs to the user's client
    const { data: lead, error: fetchError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", params.id)
      .eq("client_id", membership.client_id)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found." },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const messageText: string | undefined =
      body.message || lead.ai_suggested_reply;

    if (!messageText) {
      return NextResponse.json(
        {
          success: false,
          error: "No message content to send. Generate a response first.",
        },
        { status: 400 }
      );
    }

    await sendEmail({
      to: lead.email,
      subject: `Thanks for your enquiry` + (lead.subject ? ` - ${lead.subject}` : ""),
      text: messageText,
    });

    const sentAt = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("leads")
      .update({
        email_sent_at: sentAt,
        status: lead.status === "new" ? "contacted" : lead.status,
      })
      .eq("id", params.id)
      .eq("client_id", membership.client_id);

    if (updateError) {
      console.error("Email sent, but failed to record it:", updateError);
    }

    return NextResponse.json({ success: true, sentAt });
  } catch (err: any) {
    console.error("Send email error:", err);

    return NextResponse.json(
      { success: false, error: "Failed to send email. Please try again." },
      { status: 500 }
    );
  }
}