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

    const resendFromEnv = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev";
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

    const resend = new Resend(resendApiKey);
    const bookTitle = request.books?.title || "the book";
    const bookAuthor = request.books?.author;
    const profile = Array.isArray(request.libraries?.profiles) 
      ? request.libraries.profiles[0] 
      : request.libraries?.profiles;
    const ownerName = profile?.display_name || "the library owner";

    let subject: string;
    let htmlContent: string;

    if (status === "approved") {
      subject = `Good news! Your request for "${escapeHtml(bookTitle)}" was approved`;
      htmlContent = `
        <h1>Request Approved! 🎉</h1>
        <p>Great news, <strong>${escapeHtml(request.requester_name)}</strong>!</p>
        <p>${escapeHtml(ownerName)} has approved your request to borrow:</p>
        <h2>${escapeHtml(bookTitle)}</h2>
        ${bookAuthor ? `<p>by ${escapeHtml(bookAuthor)}</p>` : ""}
        <p>They will contact you at <strong>${escapeHtml(request.requester_email)}</strong> to arrange the pickup or delivery.</p>
        <p>Thank you for using Runo!</p>
      `;
    } else {
      subject = `Update on your request for "${escapeHtml(bookTitle)}"`;
      htmlContent = `
        <h1>Request Update</h1>
        <p>Hi <strong>${escapeHtml(request.requester_name)}</strong>,</p>
        <p>Unfortunately, your request to borrow <strong>${escapeHtml(bookTitle)}</strong> was declined.</p>
        <p>The book may not be available at this time. Feel free to check out other books in the library!</p>
        <p>Thank you for using Runo.</p>
      `;
    }

    try {
      console.log(
        "Sending request notification email",
        JSON.stringify({ request_id, status, to: request.requester_email, subject })
      );

      const emailResponse: any = await resend.emails.send({
        from: resendFrom,
        to: [request.requester_email],
        subject,
        html: htmlContent,
      });

      // Resend SDKs may return either { id } or { data: { id }, error }
      const resendId = emailResponse?.id ?? emailResponse?.data?.id;
      const resendError = emailResponse?.error;

      console.log(
        "Resend send response",
        JSON.stringify({ resendId, hasError: !!resendError })
      );

      if (resendError) {
        console.error("Resend API error:", resendError);
        return new Response(
          JSON.stringify({
            success: true,
            email_sent: false,
            error: "Resend API error",
            resend_status: resendError?.statusCode,
            resend_message: resendError?.message,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!resendId) {
        console.error("Resend response missing id:", emailResponse);
        return new Response(
          JSON.stringify({
            success: true,
            email_sent: false,
            error: "Resend response missing id",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, email_sent: true, resend_id: resendId }),
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
