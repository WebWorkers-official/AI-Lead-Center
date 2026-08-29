// Lightweight wrapper around Gemini's generateContent REST endpoint.
// No SDK needed — a plain fetch call keeps this dependency-free.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
const GEMINI_MODEL = "gemini-3.6-flash"; // fast + free-tier friendly

interface LeadScoreResult {
  score: number; // 0-100
  category: "hot" | "warm" | "cold";
  reasoning: string;
  suggested_reply: string;
}

export async function scoreLead(lead: {
  name: string;
  company?: string | null;
  budget?: string | null;
  message: string;
}): Promise<LeadScoreResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in environment variables.");
  }

  const prompt = `You are a B2B lead qualification engine for an agency that sells AI automation services.

Given this enquiry, analyze it and return ONLY a valid JSON object (no markdown, no code fences, no extra text) with this exact shape:

{
  "score": <integer 0-100, likelihood this lead converts to a paying client>,
  "category": "<hot|warm|cold>",
  "reasoning": "<one or two sentence explanation of the score>",
  "suggested_reply": "<a short, personalized 2-3 sentence email reply to send this lead>"
}

Scoring guidance:
- Budget signals matter a lot: higher budget ranges = higher score
- Urgency/specificity in the message increases score (vague one-liners score lower)
- Category: hot = 80-100, warm = 50-79, cold = 0-49

Lead details:
Name: ${lead.name}
Company: ${lead.company || "Not provided"}
Budget: ${lead.budget || "Not provided"}
Message: ${lead.message}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error("Gemini returned an empty response.");
  }

  let parsed: LeadScoreResult;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`Failed to parse Gemini response as JSON: ${rawText}`);
  }

  if (
    typeof parsed.score !== "number" ||
    parsed.score < 0 ||
    parsed.score > 100
  ) {
    throw new Error("Gemini returned an invalid score.");
  }

  return parsed;
}