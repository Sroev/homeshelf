const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ~8MB base64 limit (prevents oversized payloads)
const MAX_BASE64_LENGTH = 8 * 1024 * 1024;
const VALID_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    // --- Validation ---
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return new Response(
        JSON.stringify({ error: "Image too large" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitise mimeType — default to image/jpeg if unknown
    const safeMimeType: string = VALID_MIME_TYPES.includes(mimeType) ? mimeType : "image/jpeg";

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "Service not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Call Anthropic Vision API ---
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: safeMimeType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `Look at this image of a book. Extract the following information if visible:
1. Book title
2. Author name(s)
3. ISBN (if visible on cover or spine — usually 13 digits starting with 978 or 979)

Respond in JSON only, no explanation. Use this exact format:
{"title": "...", "author": "...", "isbn": "..."}

If a field is not visible or not found, use null for that field.
Do not include any text outside the JSON object.`,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Anthropic API error:", anthropicResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const rawText: string =
      anthropicData.content?.find((c: { type: string }) => c.type === "text")?.text ?? "";

    // Strip markdown code fences if Claude wraps the JSON
    const jsonText = rawText
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    let parsed: { title?: string | null; author?: string | null; isbn?: string | null };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("Failed to parse Claude response:", rawText);
      return new Response(
        JSON.stringify({ error: "Could not parse book data from image" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const title = typeof parsed.title === "string" ? parsed.title.trim() : null;
    const author = typeof parsed.author === "string" ? parsed.author.trim() : null;
    const isbn = typeof parsed.isbn === "string" ? parsed.isbn.replace(/[^0-9X]/gi, "") : null;

    // If Claude returned nothing useful, signal unrecognised
    if (!title && !author && !isbn) {
      return new Response(
        JSON.stringify({ error: "Could not identify a book in this image" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ title, author, isbn }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("scan-book error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
