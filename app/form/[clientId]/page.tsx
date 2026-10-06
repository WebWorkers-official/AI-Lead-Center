"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Status = "idle" | "loading" | "success" | "error";

type CustomField = {
  id: string;
  field_name: string;
  field_type: string;
  required: boolean;
  options: string[] | null;
  display_order: number;
};

export default function ClientLeadForm() {
  const params = useParams();
  const clientId = params.clientId as string;

  const [fields, setFields] = useState<CustomField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadCustomFields() {
      if (!clientId) return;

      setLoadingFields(true);

      try {
        const res = await fetch(`/api/form/${clientId}`);

        const data = await res.json();

        if (!res.ok || !data.success) {
          console.error("Failed to load custom fields:", data.error);

          setErrorMsg(
            data.error || "Unable to load this form."
          );

          setFields([]);
          return;
        }

        setFields((data.fields || []) as CustomField[]);
      } catch (error) {
        console.error("Failed to load custom fields:", error);

        setErrorMsg("Unable to load this form.");
        setFields([]);
      } finally {
        setLoadingFields(false);
      }
    }

    loadCustomFields();
  }, [clientId]);

  function renderCustomField(field: CustomField) {
    const commonClass =
      "w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500";

    const label = (
      <label className="block text-sm font-medium mb-1">
        {field.field_name}
        {field.required && " *"}
      </label>
    );

    if (field.field_type === "dropdown") {
      return (
        <div key={field.id}>
          {label}

          <select
            name={`custom_${field.id}`}
            required={field.required}
            defaultValue=""
            className={commonClass}
          >
            <option value="" disabled>
              Select an option
            </option>

            {(field.options || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field.field_type === "checkbox") {
      return (
        <div key={field.id} className="flex items-center gap-3">
          <input
            name={`custom_${field.id}`}
            type="checkbox"
            required={field.required}
            className="h-4 w-4"
            value="true"
          />

          <label className="text-sm">
            {field.field_name}
            {field.required && " *"}
          </label>
        </div>
      );
    }

    if (field.field_type === "date") {
      return (
        <div key={field.id}>
          {label}

          <input
            name={`custom_${field.id}`}
            type="date"
            required={field.required}
            className={commonClass}
          />
        </div>
      );
    }

    if (field.field_type === "email") {
      return (
        <div key={field.id}>
          {label}

          <input
            name={`custom_${field.id}`}
            type="email"
            required={field.required}
            className={commonClass}
            placeholder={`Enter ${field.field_name.toLowerCase()}`}
          />
        </div>
      );
    }

    if (field.field_type === "phone") {
      return (
        <div key={field.id}>
          {label}

          <input
            name={`custom_${field.id}`}
            type="tel"
            required={field.required}
            className={commonClass}
            placeholder={`Enter ${field.field_name.toLowerCase()}`}
          />
        </div>
      );
    }

    if (field.field_type === "number") {
      return (
        <div key={field.id}>
          {label}

          <input
            name={`custom_${field.id}`}
            type="number"
            required={field.required}
            className={commonClass}
            placeholder={`Enter ${field.field_name.toLowerCase()}`}
          />
        </div>
      );
    }

    return (
      <div key={field.id}>
        {label}

        <input
          name={`custom_${field.id}`}
          type="text"
          required={field.required}
          className={commonClass}
          placeholder={`Enter ${field.field_name.toLowerCase()}`}
        />
      </div>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setStatus("loading");
    setErrorMsg("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    const customFields: Record<string, string> = {};

    fields.forEach((field) => {
      const value = formData.get(`custom_${field.id}`);

      if (value !== null && value !== "") {
        customFields[field.field_name] = String(value);
      }
    });

    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      message: formData.get("message"),
      customFields,
    };

    try {
      const res = await fetch(`/api/form/${clientId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || "Failed to submit. Please try again."
        );
      }

      setStatus("success");
      form.reset();
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(
        err.message || "Something went wrong. Please try again."
      );
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b0b12] to-[#13131f]">
      <section className="max-w-lg mx-auto px-6 py-16">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
          {status === "success" ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>

              <h2 className="text-xl font-semibold mb-2">
                Thanks — we&apos;ve got it!
              </h2>

              <p className="text-gray-400 mb-6">
                Your enquiry has been submitted successfully.
              </p>

              <button
                onClick={() => setStatus("idle")}
                className="text-brand-500 hover:underline text-sm"
              >
                Submit another enquiry
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2">
                Get in Touch
              </h1>

              <p className="text-gray-400 mb-8">
                Fill out the form below and we&apos;ll get back to you.
              </p>

              {loadingFields ? (
                <p className="text-gray-400">
                  Loading form...
                </p>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Name *
                    </label>

                    <input
                      name="name"
                      type="text"
                      required
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Jane Smith"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email *
                    </label>

                    <input
                      name="email"
                      type="email"
                      required
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="jane@company.com"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Phone (WhatsApp)
                    </label>

                    <input
                      name="phone"
                      type="tel"
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Message *
                    </label>

                    <textarea
                      name="message"
                      required
                      rows={4}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Tell us what you're looking for..."
                    />
                  </div>

                  {/* Dynamic Custom Fields */}
                  {fields.map((field) =>
                    renderCustomField(field)
                  )}

                  {status === "error" && (
                    <p className="text-red-400 text-sm">
                      {errorMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-3 transition"
                  >
                    {status === "loading"
                      ? "Submitting..."
                      : "Submit Enquiry"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}