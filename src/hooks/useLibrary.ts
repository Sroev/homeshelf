import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Library {
  id: string;
  owner_id: string;
  name: string;
  share_token: string;
  created_at: string;
  updated_at: string;
}

export function useLibrary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["library", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("libraries")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Library | null;
    },
    enabled: !!user,
  });
}

export function useUpdateLibrary() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ libraryId, name }: { libraryId: string; name: string }) => {
      const { data, error } = await supabase
        .from("libraries")
        .update({ name })
        .eq("id", libraryId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Library;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library", user?.id] });
    },
  });
}

export function useRegenerateShareToken() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (libraryId: string) => {
      // Generate new token
      const newToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
      
      const { data, error } = await supabase
        .from("libraries")
        .update({ share_token: newToken })
        .eq("id", libraryId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Library;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library", user?.id] });
    },
  });
}
