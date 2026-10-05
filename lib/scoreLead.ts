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
  message: string;
  customFields?: Record<string, string>;
}): Promise<LeadScoreResult> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Missing GEMINI_API_KEY in environment variables."
    );
  }

  const customFieldsText =
    lead.customFields &&
    Object.keys(lead.customFields).length > 0
      ? Object.entries(lead.customFields)
          .map(([fieldName, value]) => `${fieldName}: ${value}`)
          .join("\n")
      : "No custom fields provided.";

  const prompt = `You are a general-purpose lead qualification engine for a CRM system.

Your job is to evaluate the quality, intent, readiness, and potential of a lead based ONLY on the information provided.

The lead may belong to ANY type of business or industry, including real estate, roofing, recruitment, agencies, healthcare, finance, e-commerce, professional services, or other businesses.

IMPORTANT:
- Do NOT assume the business is RaveWebs.
- Do NOT assume the business sells AI automation.
- Do NOT assume a particular industry.
- Do NOT reject or downgrade a lead because the business type is unknown.
- Do NOT invent the client's products, services, prices, policies, or capabilities.
- Evaluate the lead based on the information actually provided.

Given this enquiry, analyze it and return ONLY a valid JSON object (no markdown, no code fences, no extra text) with this exact shape:

{
  "score": <integer 0-100, likelihood this lead represents a meaningful sales opportunity>,
  "category": "<hot|warm|cold>",
  "reasoning": "<one sentence summary of the overall assessment>",
  "reasons": ["<short phrase, 3-8 words>", "<short phrase>", "<short phrase>"],
  "suggested_reply": "<a short, personalized 2-3 sentence email reply to send this lead>"
}

Evaluate the lead using these qualification signals:

1. Intent / buying interest
   - Look for evidence that the person genuinely wants the product, service, property, solution, appointment, or outcome they are enquiring about.
   - Clear interest in taking the next step is a strong signal.
   - Questions showing genuine purchase or project intent can indicate a meaningful opportunity.

2. Urgency / timeline
   - A stated start date, deadline, appointment date, preferred date, or clear urgency can increase the score.
   - A requested site visit, consultation, demo, meeting, appointment, or similar next step can indicate stronger intent.
   - If no timeline is provided, do not automatically treat that as negative.

3. Specificity and clarity
   - Consider how clearly the lead explains what they want.
   - Specific requirements are stronger than vague enquiries.
   - Do NOT score based on message length.

4. Custom Fields
   - Custom Fields are client-defined information collected through the lead form.
   - Field names and values can be completely different for different clients.
   - Understand each field according to its name and value.
   - Use relevant custom fields as qualification evidence when they provide useful information about intent, readiness, requirements, timeline, budget, preferences, or next steps.
   - Do NOT assume every custom field has equal importance.
   - Do NOT assume a missing custom field means the lead is low quality.
   - Do NOT invent the meaning of an ambiguous field.
   - If a custom field clearly indicates strong intent or readiness, it may meaningfully increase the score.
   - If a custom field provides useful context but does not indicate buying intent, use it as supporting information rather than automatically increasing the score.

5. Overall opportunity
   - Consider all available information together.
   - Strong signals across multiple areas should produce a higher score.
   - Weak or vague signals should produce a lower score.
   - Do not let one field determine the entire score by itself.
   - Do not invent missing information.
   - Do not penalize the lead simply because certain information was not provided.

Important scoring principles:

- A lead with clear intent, specific requirements, and a concrete next step can be highly qualified.
- A lead with useful Custom Fields but weak intent should not automatically be classified as hot.
- A lead with a specific message but no timeline can still be valuable.
- A lead with a timeline or date but no clear intent should not automatically be classified as hot.
- Budget information can be useful when provided, but budget alone does not determine lead quality.
- Dates, appointments, site visits, demos, consultations, or other concrete next steps can be strong intent signals.
- Do not score based on message length.
- Do not assume industry-specific information that is not provided.
- Keep the score between 0 and 100.

Category:
- hot = 70-100
- warm = 40-69
- cold = 0-39

"reasons" should contain 2-4 short, specific phrases (not full sentences) that directly explain the score.

Good examples:
- "Clear purchase intent"
- "Specific requirement provided"
- "Site visit requested"
- "Preferred date provided"
- "Budget information provided"
- "Detailed project requirements"
- "No clear timeline"
- "Vague enquiry"
- "Next step not specified"

Avoid generic reasons such as:
- "Good lead"
- "Bad lead"
- "Seems interested"

Suggested reply rules:

- Write the reply as if it is being sent by the business that received the enquiry.
- Do NOT mention RaveWebs.
- Do NOT claim what the business sells or provides unless that information is explicitly available in the lead information.
- Do NOT invent prices, availability, features, locations, guarantees, or policies.
- Naturally acknowledge useful information from the message or Custom Fields.
- Do not repeat every Custom Field.
- If the lead provided a date, budget, property type, project type, appointment request, site visit request, or similar useful information, acknowledge it naturally when relevant.
- If important information is missing, ask a useful follow-up question.
- Keep the reply professional, natural, and concise.
- Return a 2-3 sentence reply.
- Do not use placeholders.

Lead details:

Name: ${lead.name}

Message:
${lead.message}

Custom Fields:
${customFieldsText}`;

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