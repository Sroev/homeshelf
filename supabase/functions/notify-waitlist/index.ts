import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// HTML escape function to prevent XSS in email templates
function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { book_id } = await req.json();

    if (!book_id || typeof book_id !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid book_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping notification");
      return new Response(
        JSON.stringify({ success: true, notified: false, reason: "Email not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendFromEnv = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev";
    const resendFrom = resendFromEnv.includes("<")
      ? resendFromEnv
      : `HomeShelf <${resendFromEnv}>`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the book details
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select(`
        id,
        title,
        author,
        library_id,
        libraries (
          id,
          owner_id,
          profiles (
            display_name
          )
        )
      `)
      .eq("id", book_id)
      .maybeSingle();

    if (bookError || !book) {
      console.error("Book not found:", bookError);
      return new Response(
        JSON.stringify({ error: "Book not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the first pending request for this book (oldest by created_at)
    const { data: firstRequest, error: requestError } = await supabase
      .from("requests")
      .select("id, requester_name, requester_email")
      .eq("book_id", book_id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (requestError) {
      console.error("Error fetching requests:", requestError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch waitlist" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!firstRequest) {
      console.log("No pending requests for this book");
      return new Response(
        JSON.stringify({ success: true, notified: false, reason: "No waitlist" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get owner name - handle various response shapes
    let ownerName = "the owner";
    try {
      const libraries = book.libraries;
      if (libraries && typeof libraries === "object") {
        const lib = Array.isArray(libraries) ? libraries[0] : libraries;
        const profiles = lib?.profiles;
        const profile = Array.isArray(profiles) ? profiles[0] : profiles;
        if (profile?.display_name) {
          ownerName = profile.display_name;
        }
      }
    } catch {
      // Keep default ownerName
    }

    // Send notification email
    const resend = new Resend(resendApiKey);

    try {
      await resend.emails.send({
        from: resendFrom,
        to: [firstRequest.requester_email],
        subject: `Good news! "${escapeHtml(book.title)}" is now available`,
        html: `
          <h1>Great News!</h1>
          <p>Hi ${escapeHtml(firstRequest.requester_name)},</p>
          <p>The book you requested is now available:</p>
          <h2>${escapeHtml(book.title)}</h2>
          ${book.author ? `<p>by ${escapeHtml(book.author)}</p>` : ""}
          <p>You were first on the waitlist, so ${escapeHtml(ownerName)} has been notified of your interest.</p>
          <p>They should be in touch soon!</p>
          <p>Thank you for using HomeShelf!</p>
        `,
      });

      console.log("Waitlist notification sent to:", firstRequest.requester_email);

      return new Response(
        JSON.stringify({
          success: true,
          notified: true,
          requester_name: firstRequest.requester_name,
          requester_email: firstRequest.requester_email,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (emailError) {
      console.error("Email send error:", emailError);
      return new Response(
        JSON.stringify({ success: true, notified: false, reason: "Email send failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
