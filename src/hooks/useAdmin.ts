import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserStats {
  user_id: string;
  display_name: string;
  created_at: string;
  total_books: number;
  available_books: number;
  lent_out_books: number;
  reading_books: number;
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  declined_requests: number;
}

export interface AdminStats {
  overview: {
    totalUsers: number;
    totalBooks: number;
    totalRequests: number;
    totalLibraries: number;
    pendingRequests: number;
  };
  requests: {
    pending: number;
    approved: number;
    declined: number;
  };
  users: UserStats[];
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      return !!data;
    },
  });
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["adminStats"],
    queryFn: async () => {
      // Fetch overview counts and user profiles in parallel
      const [
        { count: totalUsers },
        { count: totalBooks },
        { count: totalRequests },
        { count: pendingRequests },
        { count: approvedRequests },
        { count: declinedRequests },
        { count: totalLibraries },
        { data: profiles },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("books").select("*", { count: "exact", head: true }),
        supabase.from("requests").select("*", { count: "exact", head: true }),
        supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "declined"),
        supabase.from("libraries").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("id, display_name, created_at").order("created_at", { ascending: false }),
      ]);

      // Build per-user stats
      const users: UserStats[] = [];
      if (profiles) {
        // Fetch all libraries, books, and requests for mapping
        const [{ data: libraries }, { data: books }, { data: requests }] = await Promise.all([
          supabase.from("libraries").select("id, owner_id"),
          supabase.from("books").select("id, library_id, status"),
          supabase.from("requests").select("id, library_id, status"),
        ]);

        const libsByOwner = new Map<string, string[]>();
        (libraries ?? []).forEach((l) => {
          const arr = libsByOwner.get(l.owner_id) ?? [];
          arr.push(l.id);
          libsByOwner.set(l.owner_id, arr);
        });

        for (const p of profiles) {
          const userLibIds = new Set(libsByOwner.get(p.id) ?? []);
          const userBooks = (books ?? []).filter((b) => userLibIds.has(b.library_id));
          const userReqs = (requests ?? []).filter((r) => userLibIds.has(r.library_id));

          users.push({
            user_id: p.id,
            display_name: p.display_name,
            created_at: p.created_at,
            total_books: userBooks.length,
            available_books: userBooks.filter((b) => b.status === "available").length,
            lent_out_books: userBooks.filter((b) => b.status === "lent_out").length,
            reading_books: userBooks.filter((b) => b.status === "reading").length,
            total_requests: userReqs.length,
            pending_requests: userReqs.filter((r) => r.status === "pending").length,
            approved_requests: userReqs.filter((r) => r.status === "approved").length,
            declined_requests: userReqs.filter((r) => r.status === "declined").length,
          });
        }
      }

      return {
        overview: {
          totalUsers: totalUsers ?? 0,
          totalBooks: totalBooks ?? 0,
          totalRequests: totalRequests ?? 0,
          totalLibraries: totalLibraries ?? 0,
          pendingRequests: pendingRequests ?? 0,
        },
        requests: {
          pending: pendingRequests ?? 0,
          approved: approvedRequests ?? 0,
          declined: declinedRequests ?? 0,
        },
        users,
      } as AdminStats;
    },
    staleTime: 30000,
  });
}
