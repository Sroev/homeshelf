import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLibrary } from "./useLibrary";
import { Database } from "@/integrations/supabase/types";

type RequestStatus = Database["public"]["Enums"]["request_status"];

export interface Request {
  id: string;
  library_id: string;
  book_id: string;
  requester_name: string;
  requester_email: string;
  message: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export interface RequestWithBook extends Request {
  books: {
    id: string;
    title: string;
    author: string | null;
  };
}

export function useRequests() {
  const { data: library } = useLibrary();

  return useQuery({
    queryKey: ["requests", library?.id],
    queryFn: async () => {
      if (!library) return [];
      
      const { data, error } = await supabase
        .from("requests")
        .select(`
          *,
          books (
            id,
            title,
            author
          )
        `)
        .eq("library_id", library.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as RequestWithBook[];
    },
    enabled: !!library,
  });
}

export function usePendingRequestsCount() {
  const { data: library } = useLibrary();

  return useQuery({
    queryKey: ["requests-count", library?.id],
    queryFn: async () => {
      if (!library) return 0;
      
      const { count, error } = await supabase
        .from("requests")
        .select("*", { count: "exact", head: true })
        .eq("library_id", library.id)
        .eq("status", "pending");
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!library,
  });
}

export function useUpdateRequest() {
  const queryClient = useQueryClient();
  const { data: library } = useLibrary();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RequestStatus }) => {
      const { data, error } = await supabase
        .from("requests")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests", library?.id] });
      queryClient.invalidateQueries({ queryKey: ["requests-count", library?.id] });
    },
  });
}
