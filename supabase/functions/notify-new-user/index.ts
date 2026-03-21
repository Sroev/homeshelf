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
    const { user_id, display_name, email } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id" }),
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

    // Admin email - hardcoded since there's one admin
    const adminEmail = "stoyan.roev@gmail.com";
    const resend = new Resend(resendApiKey);

    const userName = escapeHtml(display_name || "Нов потребител");
    const userEmail = escapeHtml(email || "неизвестен");

    const subject = `Нов потребител в Runo: ${userName}`;
    const html = `
      <p>Здравей,</p>
      <p>Имаш нов регистриран потребител в Runo.</p>
      <p><strong>Име:</strong> ${userName}<br/>
      <strong>Имейл:</strong> ${userEmail}</p>
      <p>Можеш да видиш всички потребители в админ панела:</p>
      <p><a href="https://runo.club/app/admin">Отвори админ панела</a></p>
      <p>Runo</p>
    `;

    try {
      const emailResponse: any = await resend.emails.send({
        from: "Runo <noreply@runo.club>",
        to: [adminEmail],
        subject,
        html,
      });

      const resendId = emailResponse?.id ?? emailResponse?.data?.id;
      console.log("Admin notification sent for new user:", { user_id, resendId });

      return new Response(
        JSON.stringify({ success: true, email_sent: !!resendId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (emailError) {
      console.error("Email send error:", emailError);
      return new Response(
        JSON.stringify({ success: true, email_sent: false, error: "Email sending failed" }),
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
