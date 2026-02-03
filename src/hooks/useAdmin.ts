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
    pendingRequests: number;
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("get-admin-stats");
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to fetch admin stats");
      }

      return response.data as AdminStats;
    },
    staleTime: 30000, // 30 seconds
  });
}
