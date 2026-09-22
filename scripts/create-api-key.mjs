import dotenv from "dotenv";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Explicitly load .env.local
dotenv.config({
  path: ".env.local",
});

// --------------------------------------------------
// 1. Check environment variables
// --------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL in .env.local"
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
}

// --------------------------------------------------
// 2. Create Supabase admin client
// --------------------------------------------------

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
);

// --------------------------------------------------
// 3. RaveWebs client ID
// --------------------------------------------------

const clientId =
  "a774a7cb-722d-47d0-a576-954d9974dce3";

// --------------------------------------------------
// 4. Verify client exists
// --------------------------------------------------

const { data: client, error: clientError } =
  await supabaseAdmin
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .maybeSingle();

if (clientError) {
  throw new Error(
    `Client lookup failed: ${clientError.message}`
  );
}

if (!client) {
  throw new Error(
    `Client not found: ${clientId}`
  );
}

console.log(
  `Client found: ${client.name} (${client.id})`
);

// --------------------------------------------------
// 5. Generate secure API key
// --------------------------------------------------

const apiKey =
  "rave_live_" +
  crypto.randomBytes(32).toString("hex");

// --------------------------------------------------
// 6. Hash API key
// --------------------------------------------------

const keyHash = crypto
  .createHash("sha256")
  .update(apiKey)
  .digest("hex");

// --------------------------------------------------
// 7. Store ONLY the hash in Supabase
// --------------------------------------------------

const { data, error } = await supabaseAdmin
  .from("client_api_keys")
  .insert({
    client_id: clientId,
    name: "RaveWebs Website",
    key_hash: keyHash,
  })
  .select("id, client_id, name, created_at")
  .single();

if (error) {
  throw new Error(
    `API key creation failed: ${error.message}`
  );
}

// --------------------------------------------------
// 8. Show the raw key ONCE
// --------------------------------------------------

console.log("\n========================================");
console.log("API KEY CREATED SUCCESSFULLY");
console.log("========================================\n");

console.log("API Key:");
console.log(apiKey);

console.log("\nDatabase record:");
console.log(data);

console.log("\n========================================");
console.log("IMPORTANT");
console.log("========================================");
console.log(
  "Save this API key somewhere secure."
);
console.log(
  "The database stores only the SHA-256 hash."
);
console.log(
  "If you lose this key, generate a new one."
);
console.log();