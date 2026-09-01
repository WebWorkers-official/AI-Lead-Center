// Sends transactional email via Resend's REST API.
// No SDK needed — a plain fetch call keeps this dependency-free.

const RESEND_API_KEY = process.env.RESEND_API_KEY as string;

// Resend's shared test sender. Works immediately, but can only send to
// YOUR OWN account email until you verify a custom domain in Resend.
const FROM_ADDRESS = "AI Lead Command Center <onboarding@resend.dev>";

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  if (!RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY in environment variables.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }

  return await res.json();
}