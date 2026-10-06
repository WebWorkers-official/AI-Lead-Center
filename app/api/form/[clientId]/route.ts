import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isLikelySpam } from "@/lib/spamCheck";
import { scoreLead } from "@/lib/scoreLead";

//export async function GET//
export async function GET(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;

    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          error: "Client ID is required.",
        },
        { status: 400 }
      );
    }

    // Verify client exists
    const { data: client, error: clientError } =
      await supabaseAdmin
        .from("clients")
        .select("id")
        .eq("id", clientId)
        .maybeSingle();

    if (clientError) {
      console.error("Client lookup error:", clientError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to verify client.",
        },
        { status: 500 }
      );
    }

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid client.",
        },
        { status: 404 }
      );
    }

    // Load only the custom-field configuration needed by the public form
    const { data: fields, error: fieldsError } =
      await supabaseAdmin
        .from("custom_fields")
        .select(
          "id, field_name, field_type, required, options, display_order"
        )
        .eq("client_id", clientId)
        .order("display_order", { ascending: true });

    if (fieldsError) {
      console.error("Custom fields lookup error:", fieldsError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to load form fields.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fields: fields || [],
    });
  } catch (err) {
    console.error("Unexpected error loading form fields:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}

//export async function POST//
export async function POST(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;

    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          error: "Client ID is required.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      name,
      email,
      phone,
      message,
      source,
      customFields,
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
    // 4. Verify client exists
    // -----------------------------

    const { data: client, error: clientError } =
      await supabaseAdmin
        .from("clients")
        .select("id")
        .eq("id", clientId)
        .maybeSingle();

    if (clientError) {
      console.error("Client lookup error:", clientError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to verify client.",
        },
        { status: 500 }
      );
    }

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid client.",
        },
        { status: 404 }
      );
    }

    // -----------------------------
    // 5. Validate custom fields
    // -----------------------------

    let validatedCustomFields: {
      fieldId: string;
      value: string;
    }[] = [];

    if (customFields && typeof customFields === "object") {
      const { data: configuredFields, error: fieldsError } =
        await supabaseAdmin
          .from("custom_fields")
          .select("id, field_name, field_type")
          .eq("client_id", clientId);

      if (fieldsError) {
        console.error(
          "Custom fields lookup error:",
          fieldsError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Failed to validate custom fields.",
          },
          { status: 500 }
        );
      }

      const configuredFieldMap = new Map(
        (configuredFields || []).map((field) => [
          field.field_name,
          field,
        ])
      );

      for (const [fieldName, fieldValue] of Object.entries(
        customFields
      )) {
        const field = configuredFieldMap.get(fieldName);

        if (!field) {
          continue;
        }

        if (
          fieldValue === null ||
          fieldValue === undefined ||
          fieldValue === ""
        ) {
          continue;
        }

        validatedCustomFields.push({
          fieldId: field.id,
          value: String(fieldValue),
        });
      }
    }

    // -----------------------------
    // 6. Create lead
    // -----------------------------

    const { data, error } = await supabaseAdmin
      .from("leads")
      .insert([
        {
          client_id: clientId,
          name,
          email,
          phone: phone || null,
          message,
          source: source || "Website",
          status: "new",
          ai_status: "processing",
        },
      ])
      .select("id")
      .single();

    if (error || !data) {
      console.error("Supabase insert error:", error);

      return NextResponse.json(
        {
          success: false,
          error:
             "Failed to save lead.",
        },
        { status: 500 }
      );
    }

    const leadId = data.id;

    // -----------------------------
    // 7. Save custom field values
    // -----------------------------

    if (validatedCustomFields.length > 0) {
      const customFieldRows = validatedCustomFields.map(
        (field) => ({
          lead_id: leadId,
          field_id: field.fieldId,
          value: field.value,
        })
      );

      const { error: customFieldsError } =
        await supabaseAdmin
          .from("custom_field_values")
          .insert(customFieldRows);

      if (customFieldsError) {
        console.error(
          "Failed to save custom field values:",
          customFieldsError
        );
      }
    }

    // -----------------------------
    // 8. Background AI scoring
    // -----------------------------

    waitUntil(
      (async () => {
        try {
          console.log(
            "Starting background AI scoring for lead:",
            leadId
          );

          const result = await scoreLead({
            name,
            message,
          });

          const { error: scoreError } =
            await supabaseAdmin
              .from("leads")
              .update({
                ai_score: result.score,
                ai_category: result.category,
                ai_reasoning: result.reasoning,
                ai_reasons_bullets: JSON.stringify(
                  result.reasons
                ),
                ai_suggested_reply:
                  result.suggested_reply,
                ai_status: "completed",
              })
              .eq("id", leadId);

          if (scoreError) {
            console.error(
              "FAILED TO SAVE BACKGROUND AI SCORE:",
              scoreError
            );
          }
        } catch (scoreError) {
          console.error(
            "BACKGROUND AI SCORING FAILED:",
            scoreError
          );

          await supabaseAdmin
            .from("leads")
            .update({
              ai_status: "failed",
            })
            .eq("id", leadId);
        }
      })()
    );

    // -----------------------------
    // 9. Return success
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