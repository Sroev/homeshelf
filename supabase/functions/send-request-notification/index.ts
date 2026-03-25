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
    const { request_id, status } = await req.json();

    if (!request_id || !status) {
      return new Response(
        JSON.stringify({ error: "Missing request_id or status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (status !== "approved" && status !== "declined") {
      return new Response(
        JSON.stringify({ error: "Status must be 'approved' or 'declined'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, email_sent: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendFromEnv = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@runo.club";
    const resendFrom = resendFromEnv.includes("<")
      ? resendFromEnv
      : `Runo <${resendFromEnv}>`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch request with book and library details
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select(`
        *,
        books (title, author),
        libraries (
          name,
          owner_id,
          profiles (display_name)
        )
      `)
      .eq("id", request_id)
      .maybeSingle();

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: "Request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get owner's email from auth.users
    const ownerId = request.libraries?.owner_id;
    let ownerEmail: string | null = null;
    if (ownerId) {
      const { data: authUser } = await supabase.auth.admin.getUserById(ownerId);
      ownerEmail = authUser?.user?.email || null;
    }

    const resend = new Resend(resendApiKey);
    const bookTitle = request.books?.title || "the book";
    const bookAuthor = request.books?.author;
    const profile = Array.isArray(request.libraries?.profiles) 
      ? request.libraries.profiles[0] 
      : request.libraries?.profiles;
    const ownerName = profile?.display_name || "the library owner";

    let requesterSubject: string;
    let requesterHtml: string;
    let ownerSubject: string | null = null;
    let ownerHtml: string | null = null;

    if (status === "approved") {
      // Email to requester
      requesterSubject = `Одобрена заявка за „${escapeHtml(bookTitle)}"`;
      requesterHtml = `
        <p>Здравей,</p>
        <p>Страхотни новини! ${escapeHtml(ownerName)} одобри заявката ти за:</p>
        <p><strong>${escapeHtml(bookTitle)}</strong>${bookAuthor ? `<br/>от ${escapeHtml(bookAuthor)}` : ""}</p>
        <p>Ще се свържат с теб на <strong>${escapeHtml(request.requester_email)}</strong>, за да уговорите предаването.</p>
        <p>Runo</p>
      `;
      
      // Email to owner (admin)
      ownerSubject = `Одобрена заявка за „${escapeHtml(bookTitle)}"`;
      ownerHtml = `
        <p>Здравей,</p>
        <p>Ти одобри заявката за книгата „${escapeHtml(bookTitle)}".</p>
        <p>Статусът на книгата вече е отбелязан като „дадена".</p>
        <p>Ако искаш, можеш по-късно да я върнеш обратно като „налична" в библиотеката си.</p>
        <p>Runo</p>
      `;
    } else {
      // Email to requester only for declined
      requesterSubject = `Относно заявката ти за „${escapeHtml(bookTitle)}"`;
      requesterHtml = `
        <p>Здравей,</p>
        <p>За съжаление, заявката ти за <strong>${escapeHtml(bookTitle)}</strong> беше отказана.</p>
        <p>Книгата може да не е налична в момента. Разгледай другите книги в библиотеката!</p>
        <p>Runo</p>
      `;
    }

    try {
      console.log(
        "Sending request notification email",
        JSON.stringify({ request_id, status, to: request.requester_email, subject: requesterSubject })
      );

      // Send email to requester
      const emailResponse: any = await resend.emails.send({
        from: resendFrom,
        to: [request.requester_email],
        subject: requesterSubject,
        html: requesterHtml,
      });

      // Resend SDKs may return either { id } or { data: { id }, error }
      const resendId = emailResponse?.id ?? emailResponse?.data?.id;
      const resendError = emailResponse?.error;

      console.log(
        "Resend send response (requester)",
        JSON.stringify({ resendId, hasError: !!resendError })
      );

      if (resendError) {
        console.error("Resend API error:", resendError);
      }

      // Send email to owner if approved
      let ownerEmailSent = false;
      if (status === "approved" && ownerEmail && ownerSubject && ownerHtml) {
        try {
          const ownerEmailResponse: any = await resend.emails.send({
            from: resendFrom,
            to: [ownerEmail],
            subject: ownerSubject,
            html: ownerHtml,
          });
          
          const ownerResendId = ownerEmailResponse?.id ?? ownerEmailResponse?.data?.id;
          if (ownerResendId) {
            ownerEmailSent = true;
            console.log("Owner notification email sent:", ownerResendId);
          }
        } catch (ownerEmailError) {
          console.error("Owner email send error:", ownerEmailError);
        }
      }

      if (!resendId) {
        console.error("Resend response missing id:", emailResponse);
        return new Response(
          JSON.stringify({
            success: true,
            email_sent: false,
            owner_email_sent: ownerEmailSent,
            error: "Resend response missing id",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, email_sent: true, owner_email_sent: ownerEmailSent, resend_id: resendId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (emailError) {
      console.error("Email send error:", emailError);
      return new Response(
        JSON.stringify({
          success: true,
          email_sent: false,
          error: "Email sending failed",
        }),
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
