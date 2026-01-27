import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting (per IP)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(ip);
  
  if (!lastRequest || now - lastRequest > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, now);
    return false;
  }
  
  // Simple count check - in production, use proper rate limiting
  const recentRequests = Array.from(rateLimitMap.entries())
    .filter(([_, time]) => now - time < RATE_LIMIT_WINDOW)
    .filter(([key]) => key === ip);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  rateLimitMap.set(`${ip}-${now}`, now);
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    
    if (isRateLimited(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token, book_id, requester_name, requester_email, message } = await req.json();

    // Validate inputs
    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!book_id || typeof book_id !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid book_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!requester_name || typeof requester_name !== "string" || requester_name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (requester_name.length > 100) {
      return new Response(
        JSON.stringify({ error: "Name must be less than 100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!requester_email || !emailRegex.test(requester_email)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (requester_email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Email must be less than 255 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (message && message.length > 500) {
      return new Response(
        JSON.stringify({ error: "Message must be less than 500 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify library exists and get owner email
    const { data: library, error: libraryError } = await supabase
      .from("libraries")
      .select(`
        id,
        name,
        owner_id,
        profiles (
          display_name
        )
      `)
      .eq("share_token", token)
      .maybeSingle();

    if (libraryError || !library) {
      return new Response(
        JSON.stringify({ error: "Library not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify book exists, is shareable, and belongs to this library
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, title, author, shareable, status, library_id")
      .eq("id", book_id)
      .eq("library_id", library.id)
      .maybeSingle();

    if (bookError || !book) {
      return new Response(
        JSON.stringify({ error: "Book not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!book.shareable || book.status === "unavailable") {
      return new Response(
        JSON.stringify({ error: "This book is not available for requests" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the request
    const { error: insertError } = await supabase
      .from("requests")
      .insert({
        library_id: library.id,
        book_id: book.id,
        requester_name: requester_name.trim(),
        requester_email: requester_email.trim().toLowerCase(),
        message: message?.trim() || null,
        status: "pending",
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send emails if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const profile = Array.isArray(library.profiles) ? library.profiles[0] : library.profiles;
      const ownerName = profile?.display_name || "Book Owner";

      // Get owner's email from auth.users
      const { data: authUser } = await supabase.auth.admin.getUserById(library.owner_id);
      const ownerEmail = authUser?.user?.email;

      if (ownerEmail) {
        // Send notification to owner
        try {
          await resend.emails.send({
            from: "HomeShelf <noreply@resend.dev>",
            to: [ownerEmail],
            subject: `New book request: ${book.title}`,
            html: `
              <h1>New Book Request</h1>
              <p><strong>${requester_name}</strong> would like to borrow:</p>
              <h2>${book.title}</h2>
              ${book.author ? `<p>by ${book.author}</p>` : ""}
              <p><strong>Requester email:</strong> ${requester_email}</p>
              ${message ? `<p><strong>Message:</strong> ${message}</p>` : ""}
              <p>
                <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/app/requests">
                  View and respond to this request
                </a>
              </p>
            `,
          });
        } catch (emailError) {
          console.error("Owner email error:", emailError);
        }
      }

      // Send confirmation to requester
      try {
        await resend.emails.send({
          from: "HomeShelf <noreply@resend.dev>",
          to: [requester_email],
          subject: `Request received: ${book.title}`,
          html: `
            <h1>Request Received</h1>
            <p>Your request for <strong>${book.title}</strong> has been sent to ${ownerName}.</p>
            <p>They will contact you at this email address if they approve your request.</p>
            <p>Thank you for using HomeShelf!</p>
          `,
        });
      } catch (emailError) {
        console.error("Requester email error:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
