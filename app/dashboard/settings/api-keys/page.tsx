"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ApiKey = {
  id: string;
  name: string;
  created_at: string;
  revoked_at: string | null;
};

export default function ApiKeysPage() {
  const router = useRouter();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: membership, error: memberError } =
        await supabase
          .from("client_members")
          .select("client_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

      if (memberError || !membership) {
        setError("Client account not found.");
        return;
      }

      const { data, error: keysError } = await supabase
        .from("client_api_keys")
        .select("id, name, created_at, revoked_at")
        .eq("client_id", membership.client_id)
        .order("created_at", { ascending: false });

      if (keysError) {
        setError(keysError.message);
        return;
      }

      setKeys(data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  }

  async function generateKey() {
    try {
      setCreating(true);
      setError("");
      setNewKey("");
      setCopied(false);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Session expired. Please log in again.");
        return;
      }

      const response = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: "Website",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to generate API key.");
        return;
      }

      setNewKey(data.apiKey);

      await loadKeys();
    } catch (err) {
      console.error(err);
      setError("Failed to generate API key.");
    } finally {
      setCreating(false);
    }
  }

  async function copyKey() {
    if (!newKey) return;

    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError("Failed to copy API key.");
    }
  }

  async function revokeKey(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to revoke this API key?"
    );

    if (!confirmed) return;

    try {
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Session expired. Please log in again.");
        return;
      }

      const response = await fetch(
        `/api/settings/api-keys/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to revoke API key.");
        return;
      }

      await loadKeys();
    } catch (err) {
      console.error(err);
      setError("Failed to revoke API key.");
    }
  }

  return (
    <main className="min-h-screen p-8 text-white">
      <div className="mx-auto max-w-4xl">

        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 text-sm text-gray-400 hover:text-white"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold">
          API Keys
        </h1>

        <p className="mt-2 text-gray-400">
          Connect websites and external systems to your
          RaveWebs lead management system.
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        <div className="mt-8 rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-xl font-semibold">
                Create API Key
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Generate a key for a client's website or backend.
              </p>
            </div>

            <button
              onClick={generateKey}
              disabled={creating}
              className="rounded-lg bg-white px-5 py-3 font-medium text-black disabled:opacity-50"
            >
              {creating ? "Generating..." : "Generate Key"}
            </button>

          </div>
        </div>

        {newKey && (
          <div className="mt-6 rounded-xl border border-green-500/40 bg-green-500/10 p-6">

            <h2 className="text-lg font-semibold text-green-400">
              API Key Generated
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Copy this key now. It will not be shown again.
            </p>

            <div className="mt-4 rounded-lg bg-black p-4">
              <p className="break-all font-mono text-sm text-green-400">
                {newKey}
              </p>
            </div>

            <button
              onClick={copyKey}
              className="mt-4 rounded-lg bg-green-500 px-5 py-2 text-black"
            >
              {copied ? "Copied ✓" : "Copy API Key"}
            </button>

          </div>
        )}

        <div className="mt-8 rounded-xl border border-white/10 p-6">

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Your API Keys
            </h2>

            <span className="text-sm text-gray-500">
              {keys.length} keys
            </span>
          </div>

          {loading ? (
            <p className="mt-6 text-gray-500">
              Loading...
            </p>
          ) : keys.length === 0 ? (
            <p className="mt-6 text-gray-500">
              No API keys created yet.
            </p>
          ) : (
            <div className="mt-6 space-y-4">

              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 p-5"
                >

                  <div>
                    <div className="flex items-center gap-3">

                      <h3 className="font-medium">
                        {key.name}
                      </h3>

                      {key.revoked_at ? (
                        <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-400">
                          Revoked
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-400">
                          Active
                        </span>
                      )}

                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      Created{" "}
                      {new Date(key.created_at).toLocaleString()}
                    </p>
                  </div>

                  {!key.revoked_at && (
                    <button
                      onClick={() => revokeKey(key.id)}
                      className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                    >
                      Revoke
                    </button>
                  )}

                </div>
              ))}

            </div>
          )}

        </div>

      </div>
    </main>
  );
}