import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    // --------------------------------
    // 1. Get Supabase access token
    // --------------------------------

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

    // --------------------------------
    // 2. Verify logged-in user
    // --------------------------------

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

    // --------------------------------
    // 3. Find user's client membership
    // --------------------------------

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

    // --------------------------------
    // 4. Only owner/admin can create keys
    // --------------------------------

    if (
      membership.role !== "owner" &&
      membership.role !== "admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You do not have permission to create API keys.",
        },
        { status: 403 }
      );
    }

    // --------------------------------
    // 5. Read key name
    // --------------------------------

    let body: { name?: string } = {};

    try {
      body = await req.json();
    } catch {
      // Empty body is allowed
    }

    const name =
      body.name?.trim() || "Website";

    // --------------------------------
    // 6. Generate secure API key
    // --------------------------------

    const apiKey =
      "rave_live_" +
      crypto.randomBytes(32).toString("hex");

    // --------------------------------
    // 7. Hash API key
    // --------------------------------

    const keyHash = crypto
      .createHash("sha256")
      .update(apiKey)
      .digest("hex");

    // --------------------------------
    // 8. Store ONLY the hash
    // --------------------------------

    const { data, error } = await supabaseAdmin
      .from("client_api_keys")
      .insert({
        client_id: membership.client_id,
        name,
        key_hash: keyHash,
      })
      .select(
        "id, client_id, name, created_at"
      )
      .single();

    if (error || !data) {
      console.error(
        "API key creation error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            error?.message ||
            "Failed to create API key.",
        },
        { status: 500 }
      );
    }

    // --------------------------------
    // 9. Return raw key ONCE
    // --------------------------------

    return NextResponse.json({
      success: true,
      apiKey,
      key: data,
    });
  } catch (error) {
    console.error(
      "Unexpected API key error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong.",
      },
      { status: 500 }
    );
  }
}