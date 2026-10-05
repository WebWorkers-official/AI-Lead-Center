// Generates a fresh, personalized email reply for a single lead.
// Used by the "Generate AI Response" action on the Lead Details page.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
const GEMINI_MODEL = "gemini-3.6-flash";

export async function generateReply(lead: {
  name: string;
  message: string;
  customFields?: Record<string, string>;
}): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Missing GEMINI_API_KEY in environment variables."
    );
  }

  // -----------------------------------
  // Prepare custom fields
  // -----------------------------------

  const customFieldsText =
    lead.customFields &&
    Object.keys(lead.customFields).length > 0
      ? Object.entries(lead.customFields)
          .map(
            ([fieldName, value]) =>
              `${fieldName}: ${value}`
          )
          .join("\n")
      : "No custom fields provided.";

  const prompt = `You are writing a professional sales reply on behalf of the business that received this lead enquiry.

Your job is to respond naturally to the lead based ONLY on the information provided below.

Important rules:

- Do NOT assume the business is RaveWebs.
- Do NOT mention RaveWebs.
- Do NOT assume what products or services the business sells unless the lead's message or custom fields clearly provide that context.
- Do NOT reject the lead because you do not know the business type.
- Do NOT invent services, products, prices, availability, guarantees, or other facts.
- Use relevant Custom Fields to make the response more personalized.
- Do not awkwardly repeat every Custom Field.
- Mention only the information that is useful to the conversation.
- If the lead provides a date, budget, property type, project type, preferred contact method, or similar information, acknowledge it naturally when relevant.
- If the enquiry is missing important information, ask a useful follow-up question.
- Keep the response professional, warm, and concise.

Lead details:

Name: ${lead.name}

Message:
${lead.message}

Custom Fields:
${customFieldsText}

Write a warm, specific 3-4 sentence email reply.

Reference something concrete from the enquiry or relevant Custom Fields.

End with a light call to action, such as suggesting a quick call, asking for the next detail needed, or inviting the lead to continue the conversation.

Do not use placeholders like [Your Name].

Sign off simply as:

Best,
The Team

Return ONLY the email body text.
No subject line.
No markdown.
No extra commentary.`;

  // -----------------------------------
  // Gemini request with retry handling
  // -----------------------------------

  const maxAttempts = 3;

  let res: Response | null = null;
  let lastError = "";

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
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
              temperature: 0.6,
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

    lastError =
      `Gemini API error (${res.status}): ${errText}`;

    // Retry only temporary/rate-limit errors
    const isRetryable =
      res.status === 408 ||
      res.status === 429 ||
      res.status >= 500;

    // Permanent error — don't waste retries
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
        `Retrying Gemini response generation in ${delay}ms...`
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
        "Gemini response generation failed after retries."
    );
  }

  // -----------------------------------
  // Parse Gemini response
  // -----------------------------------

  const data = await res.json();

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }

  return text.trim();
}