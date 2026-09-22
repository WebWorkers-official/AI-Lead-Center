import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function authenticateApiKey(
  apiKey: string | null
) {
  if (!apiKey) {
    return {
      success: false as const,
      clientId: null,
      error: "Missing API key.",
    };
  }

  const keyHash = crypto
    .createHash("sha256")
    .update(apiKey)
    .digest("hex");

  const { data, error } = await supabaseAdmin
    .from("client_api_keys")
    .select("client_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    console.error("API key lookup error:", error);

    return {
      success: false as const,
      clientId: null,
      error: "API key verification failed.",
    };
  }

  if (!data) {
    return {
      success: false as const,
      clientId: null,
      error: "Invalid API key.",
    };
  }

  return {
    success: true as const,
    clientId: data.client_id,
    error: null,
  };
}