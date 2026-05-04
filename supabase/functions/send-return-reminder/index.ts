import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  const map: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    const body = await req.json().catch(() => ({}));
    const loanId = body?.loan_id;
    if (!loanId || typeof loanId !== "string") {
      return new Response(JSON.stringify({ error: "Invalid loan_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch loan record + verify ownership
    const { data: loan, error: loanErr } = await admin
      .from("loan_history")
      .select("id, borrower_name, borrower_email, due_date, library_id, book_id, returned_at")
      .eq("id", loanId)
      .maybeSingle();

    if (loanErr || !loan) {
      return new Response(JSON.stringify({ error: "Loan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (loan.returned_at) {
      return new Response(JSON.stringify({ error: "Loan already returned" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: library, error: libErr } = await admin
      .from("libraries")
      .select("id, name, owner_id, profiles(display_name)")
      .eq("id", loan.library_id)
      .maybeSingle();

    if (libErr || !library || library.owner_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!loan.borrower_email) {
      return new Response(JSON.stringify({ error: "no_email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: book } = await admin
      .from("books")
      .select("title, author")
      .eq("id", loan.book_id)
      .maybeSingle();

    const profile = Array.isArray(library.profiles) ? library.profiles[0] : library.profiles;
    const ownerName = profile?.display_name || "Book Owner";

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Runo <noreply@runo.club>";

    const dueText = loan.due_date
      ? new Date(loan.due_date).toLocaleDateString("bg-BG")
      : null;

    await resend.emails.send({
      from: fromEmail,
      to: [loan.borrower_email],
      subject: `Напомняне за връщане на „${escapeHtml(book?.title || "")}"`,
      html: `
        <p>Здравей ${escapeHtml(loan.borrower_name)},</p>
        <p>${escapeHtml(ownerName)} те моли да върнеш книгата „<strong>${escapeHtml(book?.title || "")}</strong>"${book?.author ? ` от ${escapeHtml(book.author)}` : ""}.</p>
        ${dueText ? `<p>Очаквана дата за връщане: <strong>${dueText}</strong></p>` : ""}
        <p>Благодарим ти!</p>
        <p>Runo</p>
      `,
    });

    await admin
      .from("loan_history")
      .update({ last_reminder_sent_at: new Date().toISOString() })
      .eq("id", loan.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-return-reminder error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});