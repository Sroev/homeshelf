import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Must include all headers sent by supabase-js in browsers, otherwise CORS preflight fails
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

// In-memory rate limiting (per IP) - stores array of request timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

// Periodic cleanup to prevent memory leaks (runs every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of rateLimitMap.entries()) {
    const recent = times.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (recent.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, recent);
    }
  }
}, 300000);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];
  
  // Filter to only keep requests within the time window
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  // Check if limit exceeded
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    // Update map with cleaned entries
    rateLimitMap.set(ip, recentRequests);
    return true;
  }
  
  // Add current request timestamp and update map
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
    const { data: newRequest, error: insertError } = await supabase
      .from("requests")
      .insert({
        library_id: library.id,
        book_id: book.id,
        requester_name: requester_name.trim(),
        requester_email: requester_email.trim().toLowerCase(),
        message: message?.trim() || null,
        status: "pending",
      })
      .select("id, created_at")
      .single();

    if (insertError || !newRequest) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate waitlist position for this book (count of pending requests created before this one)
    const { count: waitlistPosition } = await supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .eq("book_id", book.id)
      .eq("status", "pending")
      .lte("created_at", newRequest.created_at);

    // Determine if the book is currently unavailable (lent out or reading)
    const isOnWaitlist = book.status === "lent_out" || book.status === "reading";

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
        // Send notification to owner (escape user-controlled data to prevent XSS)
        const appUrl = Deno.env.get("APP_URL") || "https://runo.club";
        const adminRequestsLink = `${appUrl}/app/requests`;
        try {
          await resend.emails.send({
            from: Deno.env.get("RESEND_FROM_EMAIL") || "Runo <noreply@runo.club>",
            to: [ownerEmail],
            subject: `Нова заявка за „${escapeHtml(book.title)}"`,
            html: `
              <p>Здравей,</p>
              <p>Имаш нова заявка за книга от библиотеката ти в Runo.</p>
              <p><strong>Книга:</strong> ${escapeHtml(book.title)}<br/>
              ${book.author ? `<strong>Автор:</strong> ${escapeHtml(book.author)}` : ""}</p>
              <p><strong>Заявка от:</strong> ${escapeHtml(requester_name)}<br/>
              <strong>Имейл:</strong> ${escapeHtml(requester_email)}</p>
              ${message ? `<p><strong>Съобщение:</strong><br/>„${escapeHtml(message)}"</p>` : ""}
              <p>Можеш да одобриш или откажеш заявката оттук:<br/>
              <a href="${adminRequestsLink}">${adminRequestsLink}</a></p>
              <p>Runo</p>
            `,
          });
        } catch (emailError) {
          console.error("Owner email error:", emailError);
        }
      }

      // Send confirmation to requester (escape user-controlled data to prevent XSS)
      try {
        await resend.emails.send({
          from: Deno.env.get("RESEND_FROM_EMAIL") || "Runo <noreply@runo.club>",
          to: [requester_email],
          subject: `Заявка за „${escapeHtml(book.title)}"`,
          html: `
            <p>Здравей,</p>
            <p>Заявката ти за книгата „${escapeHtml(book.title)}" беше изпратена успешно.</p>
            <p>${escapeHtml(ownerName)} ще я види и ще се свърже с теб, за да се разберете.</p>
            <p>Нищо повече не е нужно от твоя страна.</p>
            <p>Runo</p>
          `,
        });
      } catch (emailError) {
        console.error("Requester email error:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        waitlist_position: isOnWaitlist ? (waitlistPosition || 1) : null,
        book_status: book.status,
      }),
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
