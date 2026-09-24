// Lightweight wrapper around Gemini's generateContent REST endpoint.
// No SDK needed — a plain fetch call keeps this dependency-free.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
const GEMINI_MODEL = "gemini-3.6-flash"; // fast + free-tier friendly

interface LeadScoreResult {
  score: number; // 0-100
  category: "hot" | "warm" | "cold";
  reasoning: string; // one-line summary
  reasons: string[]; // 2-4 short bullet points explaining the score
  suggested_reply: string;
}

export async function scoreLead(lead: {
  name: string;
  company?: string | null;
  budget?: string | null;
  message: string;
}): Promise<LeadScoreResult> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Missing GEMINI_API_KEY in environment variables."
    );
  }

  const prompt = `You are a B2B lead qualification engine for an agency that sells AI automation services.

Given this enquiry, analyze it and return ONLY a valid JSON object (no markdown, no code fences, no extra text) with this exact shape:

{
  "score": <integer 0-100, likelihood this lead converts to a paying client>,
  "category": "<hot|warm|cold>",
  "reasoning": "<one sentence summary of the overall assessment>",
  "reasons": ["<short phrase, 3-8 words>", "<short phrase>", "<short phrase>"],
  "suggested_reply": "<a short, personalized 2-3 sentence email reply to send this lead>"
}

Score using ONLY these four signals:
1. Stated budget — a real number/range carries significant weight
2. Urgency / timeline — a stated start date or urgency increases the score
3. The message itself — specificity and clarity of what they're asking for
4. Specific need described — a concrete request beats a vague one

Do NOT factor in the company name, how established the company sounds, or company size. Many legitimate leads are brand-new startups or solo founders — do not penalize them for that. The company field is context only, never a scoring input.

Do NOT score based on message length. A short message that clearly states a budget and a specific need should score just as high as a long one with the same signals. A long message that is vague or generic should NOT score higher just because it's long.

If a signal is missing (e.g. no budget mentioned, no timeline), note that specifically in "reasons" rather than assuming it's bad — missing info is a reason to ask a follow-up question, not automatically a low score.

Category: hot = 70-100, warm = 40-69, cold = 0-39

"reasons" should be 2-4 short, specific bullet phrases (not full sentences) that together justify the score — e.g. "Clear budget stated", "No timeline mentioned", "Specific automation need described"

Lead details:
Name: ${lead.name}
Company: ${lead.company || "Not provided"}
Budget: ${lead.budget || "Not provided"}
Message: ${lead.message}`;

  // -----------------------------------
  // Gemini request with retry handling
  // -----------------------------------

  const maxAttempts = 3;

  let res: Response | null = null;
  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: "application/json",
            },
          }),
        }
      );
    } catch (error) {
      // Network / fetch failure
      lastError =
        error instanceof Error
          ? error.message
          : String(error);

      if (attempt < maxAttempts) {
        const baseDelay =
          2000 * Math.pow(2, attempt - 1);

        const jitter = Math.random() * 1000;

        const delay = Math.round(
          baseDelay + jitter
        );

        console.warn(
          `Gemini request failed. Attempt ${attempt}/${maxAttempts}. Retrying in ${delay}ms...`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, delay)
        );
      }

      continue;
    }

    // -----------------------------------
    // Success
    // -----------------------------------

    if (res.ok) {
      break;
    }

    const errText = await res.text();

    lastError = `Gemini API error (${res.status}): ${errText}`;

    // -----------------------------------
    // Daily quota exhaustion
    // -----------------------------------
    // A daily quota cannot be fixed by retrying
    // after a few seconds, so stop immediately.

    const isDailyQuotaExceeded =
      res.status === 429 &&
      (
        errText.includes("GenerateRequestsPerDay") ||
        errText.includes(
          "generate_content_free_tier_requests"
        ) ||
        errText.includes("daily quota") ||
        errText.includes("quota exceeded")
      );

    if (isDailyQuotaExceeded) {
      console.warn(
        "Gemini daily quota exhausted. Skipping unnecessary retries."
      );

      throw new Error(lastError);
    }

    // -----------------------------------
    // Temporary errors
    // -----------------------------------

    const isRetryable =
      res.status === 408 ||
      res.status === 429 ||
      res.status >= 500;

    if (!isRetryable) {
      throw new Error(lastError);
    }

    console.warn(
      `Gemini temporary error (${res.status}). Attempt ${attempt}/${maxAttempts}.`
    );

    if (attempt < maxAttempts) {
      const baseDelay =
        2000 * Math.pow(2, attempt - 1);

      const jitter = Math.random() * 1000;

      const delay = Math.round(
        baseDelay + jitter
      );

      console.log(
        `Retrying Gemini in ${delay}ms...`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );
    }
  }

  // -----------------------------------
  // All attempts failed
  // -----------------------------------

  if (!res || !res.ok) {
    throw new Error(
      lastError ||
        "Gemini request failed after retries."
    );
  }

  // -----------------------------------
  // Parse Gemini response
  // -----------------------------------

  const data = await res.json();

  const rawText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }

  let parsed: LeadScoreResult;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(
      `Failed to parse Gemini response as JSON: ${rawText}`
    );
  }

  // -----------------------------------
  // Validate score
  // -----------------------------------

  if (
    typeof parsed.score !== "number" ||
    parsed.score < 0 ||
    parsed.score > 100
  ) {
    throw new Error(
      "Gemini returned an invalid score."
    );
  }

  if (
    parsed.category !== "hot" &&
    parsed.category !== "warm" &&
    parsed.category !== "cold"
  ) {
    throw new Error(
      "Gemini returned an invalid category."
    );
  }

  if (!Array.isArray(parsed.reasons)) {
    parsed.reasons = [];
  }

  return parsed;
}