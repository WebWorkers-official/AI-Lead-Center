import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateReply } from "@/lib/generateReply";

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
          error: "You do not have permission to generate responses.",
        },
        { status: 403 }
      );
    }

    // 3. Fetch the lead only if it belongs to the user's client
    const { data: lead, error: fetchError } =
      await supabaseAdmin
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

    // 4. Fetch custom field values for the verified lead
    const { data: customFieldValues, error: customFieldsError } =
      await supabaseAdmin
        .from("custom_field_values")
        .select(`
          value,
          custom_fields (
            field_name
          )
        `)
        .eq("lead_id", params.id);

    if (customFieldsError) {
      console.error("Failed to fetch custom field values:", customFieldsError);
    }

    const customFields: Record<string, string> = {};

    for (const field of customFieldValues || []) {
      const fieldData = field.custom_fields as {
        field_name?: string;
      } | null;

      if (fieldData?.field_name) {
        customFields[fieldData.field_name] = String(field.value ?? "");
      }
    }

    // 5. Generate the reply
    const reply = await generateReply({
      name: lead.name,
      message: lead.message,
      customFields,
    });

    // 6. Save the reply only to the verified client's lead
    const { error: updateError } =
      await supabaseAdmin
        .from("leads")
        .update({ ai_suggested_reply: reply })
        .eq("id", params.id)
        .eq("client_id", membership.client_id);

    if (updateError) {
      console.error("Failed to save regenerated reply:", updateError);
    }

    return NextResponse.json({ success: true, reply });
  } catch (err) {
    console.error("Generate response error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate a response. Please try again.",
      },
      { status: 500 }
    );
  }
}