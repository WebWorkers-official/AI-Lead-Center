"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type FieldType =
  | "text"
  | "number"
  | "email"
  | "phone"
  | "dropdown"
  | "date"
  | "checkbox";

type CustomField = {
  id: string;
  client_id: string;
  field_name: string;
  field_type: FieldType;
  required: boolean;
  options: string[] | null;
  display_order: number;
  created_at: string;
};

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "dropdown", label: "Dropdown" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Checkbox" },
];

export default function CustomFieldsPage() {
  const router = useRouter();

  const [clientId, setClientId] = useState("");
  const [fields, setFields] = useState<CustomField[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [required, setRequired] = useState(false);

  const [options, setOptions] = useState<string[]>([""]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadFields();
  }, []);

  async function loadFields() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from("client_members")
          .select("client_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

      if (membershipError || !membership) {
        setError("Client account not found.");
        return;
      }

      setClientId(membership.client_id);

      const { data, error: fieldsError } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("client_id", membership.client_id)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (fieldsError) {
        throw fieldsError;
      }

      setFields((data || []) as CustomField[]);
    } catch (err) {
      console.error(err);
      setError("Failed to load custom fields.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFieldName("");
    setFieldType("text");
    setRequired(false);
    setOptions([""]);
    setShowForm(false);
  }

  function addOption() {
    setOptions((current) => [...current, ""]);
  }

  function updateOption(index: number, value: string) {
    setOptions((current) =>
      current.map((option, i) => (i === index ? value : option))
    );
  }

  function removeOption(index: number) {
    setOptions((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  async function addField() {
    setError("");
    setSuccess("");

    const trimmedName = fieldName.trim();

    if (!trimmedName) {
      setError("Please enter a field name.");
      return;
    }

    if (!clientId) {
      setError("Client account not found.");
      return;
    }

    let cleanedOptions: string[] | null = null;

    if (fieldType === "dropdown") {
      cleanedOptions = options
        .map((option) => option.trim())
        .filter(Boolean);

      if (cleanedOptions.length < 2) {
        setError("A dropdown needs at least two options.");
        return;
      }
    }

    try {
      setSaving(true);

      const nextOrder =
        fields.length > 0
          ? Math.max(...fields.map((field) => field.display_order)) + 1
          : 0;

      const { data, error: insertError } = await supabase
        .from("custom_fields")
        .insert({
          client_id: clientId,
          field_name: trimmedName,
          field_type: fieldType,
          required,
          options: cleanedOptions,
          display_order: nextOrder,
        })
        .select("*")
        .single();

      if (insertError) {
        throw insertError;
      }

      setFields((current) => [
        ...current,
        data as CustomField,
      ]);

      setSuccess("Custom field added successfully.");
      resetForm();
    } catch (err) {
      console.error(err);
      setError("Failed to add custom field.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteField(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this custom field?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const { error: deleteError } = await supabase
        .from("custom_fields")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw deleteError;
      }

      setFields((current) =>
        current.filter((field) => field.id !== id)
      );

      setSuccess("Custom field deleted.");
    } catch (err) {
      console.error(err);
      setError("Failed to delete custom field.");
    }
  }

  function getFieldTypeLabel(type: FieldType) {
    return (
      FIELD_TYPES.find((item) => item.value === type)?.label ||
      type
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-5 text-sm text-gray-400 transition hover:text-white"
          >
            ← Back to Dashboard
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Custom Lead Fields
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                Choose what information your business wants to
                collect from every lead.
              </p>
            </div>

            <button
              onClick={() => {
                setError("");
                setSuccess("");
                setShowForm(true);
              }}
              className="rounded-lg bg-green-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-green-400"
            >
              + Add Custom Field
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {success}
          </div>
        )}

        {/* Add Field Form */}
        {showForm && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">
                Add Custom Field
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Define the information you want leads to provide.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">

              {/* Field Name */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Field Name
                </label>

                <input
                  type="text"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="e.g. Project Name"
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-green-500"
                />
              </div>

              {/* Field Type */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Field Type
                </label>

                <select
                  value={fieldType}
                  onChange={(e) =>
                    setFieldType(e.target.value as FieldType)
                  }
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-green-500"
                >
                  {FIELD_TYPES.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Required */}
              <div className="flex items-center sm:justify-center">
                <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={required}
                    onChange={(e) =>
                      setRequired(e.target.checked)
                    }
                    className="h-4 w-4 accent-green-500"
                  />

                  This field is required
                </label>
              </div>

              {/* Dropdown Options */}
              {fieldType === "dropdown" && (
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Dropdown Options
                  </label>

                  <div className="space-y-3">
                    {options.map((option, index) => (
                      <div
                        key={index}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={option}
                          onChange={(e) =>
                            updateOption(index, e.target.value)
                          }
                          placeholder={`Option ${index + 1}`}
                          className="flex-1 rounded-lg border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-green-500"
                        />

                        {options.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="rounded-lg border border-white/10 px-4 text-sm text-gray-400 transition hover:border-red-500/40 hover:text-red-400"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-3 text-sm font-medium text-green-400 hover:text-green-300"
                  >
                    + Add Option
                  </button>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={resetForm}
                disabled={saving}
                className="rounded-lg border border-white/10 px-5 py-3 text-sm font-medium text-gray-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={addField}
                disabled={saving}
                className="rounded-lg bg-green-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add Field"}
              </button>
            </div>
          </div>
        )}

        {/* Existing Fields */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">
              Your Custom Fields
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              These fields will be available for your lead form.
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-gray-500">
              Loading custom fields...
            </div>
          ) : fields.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
              <p className="text-gray-300">
                No custom fields yet.
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Add fields that are specific to your business.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-white">
                          {field.field_name}
                        </h3>

                        <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-gray-400">
                          {getFieldTypeLabel(field.field_type)}
                        </span>

                        {field.required && (
                          <span className="rounded-md bg-green-500/10 px-2 py-1 text-xs text-green-400">
                            Required
                          </span>
                        )}
                      </div>

                      {field.field_type === "dropdown" &&
                        field.options &&
                        field.options.length > 0 && (
                          <p className="mt-2 text-xs text-gray-500">
                            Options: {field.options.join(", ")}
                          </p>
                        )}
                    </div>

                    <button
                      onClick={() => deleteField(field.id)}
                      className="self-start rounded-lg border border-red-500/20 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10 sm:self-auto"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}