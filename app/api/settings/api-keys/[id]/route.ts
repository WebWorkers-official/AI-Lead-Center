import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    // 4. Only owner/admin can revoke
    // --------------------------------

    if (
      membership.role !== "owner" &&
      membership.role !== "admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You do not have permission to revoke API keys.",
        },
        { status: 403 }
      );
    }

    // --------------------------------
    // 5. Get API key ID
    // --------------------------------

    const keyId = params.id;

    if (!keyId) {
      return NextResponse.json(
        {
          success: false,
          error: "API key ID is required.",
        },
        { status: 400 }
      );
    }

    // --------------------------------
    // 6. Verify key belongs to user's client
    // --------------------------------

    const { data: apiKey, error: keyError } =
      await supabaseAdmin
        .from("client_api_keys")
        .select("id, client_id, revoked_at")
        .eq("id", keyId)
        .eq("client_id", membership.client_id)
        .maybeSingle();

    if (keyError) {
      console.error(
        "API key lookup error:",
        keyError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to find API key.",
        },
        { status: 500 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "API key not found.",
        },
        { status: 404 }
      );
    }

    // --------------------------------
    // 7. Check if already revoked
    // --------------------------------

    if (apiKey.revoked_at) {
      return NextResponse.json({
        success: true,
        message: "API key is already revoked.",
      });
    }

    // --------------------------------
    // 8. Revoke API key
    // --------------------------------

    const { error: updateError } =
      await supabaseAdmin
        .from("client_api_keys")
        .update({
          revoked_at: new Date().toISOString(),
        })
        .eq("id", keyId)
        .eq("client_id", membership.client_id);

    if (updateError) {
      console.error(
        "API key revoke error:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to revoke API key.",
        },
        { status: 500 }
      );
    }

    // --------------------------------
    // 9. Success
    // --------------------------------

    return NextResponse.json({
      success: true,
      message: "API key revoked successfully.",
    });
  } catch (error) {
    console.error(
      "Unexpected revoke error:",
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