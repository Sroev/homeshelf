import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Must include all headers sent by supabase-js in browsers, otherwise CORS preflight fails
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find library by share token
    const { data: library, error: libraryError } = await supabase
      .from("libraries")
      .select(`
        id,
        name,
        owner_id,
        profiles (
          display_name,
          city
        )
      `)
      .eq("share_token", token)
      .maybeSingle();

    if (libraryError) {
      console.error("Library fetch error:", libraryError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch library" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!library) {
      return new Response(
        JSON.stringify({ error: "Library not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get shareable books (not unavailable)
    const { data: books, error: booksError } = await supabase
      .from("books")
      .select("id, title, author, status")
      .eq("library_id", library.id)
      .eq("shareable", true)
      .neq("status", "unavailable")
      .order("title", { ascending: true });

    if (booksError) {
      console.error("Books fetch error:", booksError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch books" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profile = Array.isArray(library.profiles) ? library.profiles[0] : library.profiles;

    return new Response(
      JSON.stringify({
        library_id: library.id,
        library_name: library.name,
        owner_name: profile?.display_name || "Book Lover",
        owner_city: profile?.city || null,
        books: books || [],
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
