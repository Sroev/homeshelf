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
    status: Database["public"]["Enums"]["book_status"];
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
            author,
            status
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
      
      // Get pending requests for books that are available (not on waitlist)
      const { data, error } = await supabase
        .from("requests")
        .select(`
          id,
          books!inner (
            status
          )
        `)
        .eq("library_id", library.id)
        .eq("status", "pending");
      
      if (error) throw error;
      
      // Filter to only count requests for available books
      const availableRequests = data?.filter(r => r.books?.status === "available") || [];
      return availableRequests.length;
    },
    enabled: !!library,
  });
}

export function useWaitlistCount() {
  const { data: library } = useLibrary();

  return useQuery({
    queryKey: ["waitlist-count", library?.id],
    queryFn: async () => {
      if (!library) return 0;
      
      // Get pending requests for books that are NOT available (waitlist items)
      const { data, error } = await supabase
        .from("requests")
        .select(`
          id,
          books!inner (
            status
          )
        `)
        .eq("library_id", library.id)
        .eq("status", "pending");
      
      if (error) throw error;
      
      // Filter to only count requests for unavailable books (waitlist)
      const waitlistRequests = data?.filter(r => 
        r.books?.status === "lent_out" || r.books?.status === "reading"
      ) || [];
      return waitlistRequests.length;
    },
    enabled: !!library,
  });
}

export function useUpdateRequest() {
  const queryClient = useQueryClient();
  const { data: library } = useLibrary();

  return useMutation({
    mutationFn: async ({ id, status, sendNotification = false }: { 
      id: string; 
      status: RequestStatus;
      sendNotification?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("requests")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;

      // Send notification email if requested
      if (sendNotification && (status === "approved" || status === "declined")) {
        try {
          await supabase.functions.invoke("send-request-notification", {
            body: { request_id: id, status },
          });
        } catch (emailError) {
          console.error("Failed to send notification email:", emailError);
          // Don't throw - the request was updated successfully
        }
      }

      return data as Request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests", library?.id] });
      queryClient.invalidateQueries({ queryKey: ["requests-count", library?.id] });
    },
  });
}
