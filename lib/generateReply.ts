// Generates a fresh, personalized email reply for a single lead.
// Used by the "Generate AI Response" action on the Lead Details page.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
const GEMINI_MODEL = "gemini-3.6-flash";

export async function generateReply(lead: {
  name: string;
  company?: string | null;
  budget?: string | null;
  message: string;
}): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in environment variables.");
  }

  const prompt = `You are a helpful sales rep writing a short, professional, personalized email reply to a new lead.

Lead details:
Name: ${lead.name}
Company: ${lead.company || "Not provided"}
Budget: ${lead.budget || "Not provided"}
Message: ${lead.message}

Write a warm, specific 3-4 sentence email reply. Reference something concrete from their message. End with a light call to action (e.g. suggest a quick call). Do not use placeholders like [Your Name] — sign off simply as "Best,\nThe Team". Return ONLY the email body text, no subject line, no markdown, no extra commentary.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text.trim();
}