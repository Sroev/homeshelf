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
      const [
        { count: totalUsers },
        { count: totalBooks },
        { count: totalRequests },
        { count: pendingRequests },
        { count: approvedRequests },
        { count: declinedRequests },
        { count: totalLibraries },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("books").select("*", { count: "exact", head: true }),
        supabase.from("requests").select("*", { count: "exact", head: true }),
        supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "declined"),
        supabase.from("libraries").select("*", { count: "exact", head: true }),
      ]);

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
        users: [],
      } as AdminStats;
    },
    staleTime: 30000,
  });
}
