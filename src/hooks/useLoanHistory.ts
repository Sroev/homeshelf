import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LoanRecord {
  id: string;
  book_id: string;
  library_id: string;
  borrower_name: string;
  lent_at: string;
  returned_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useLoanHistory(bookId: string | undefined) {
  return useQuery({
    queryKey: ["loan_history", bookId],
    queryFn: async () => {
      if (!bookId) return [];
      const { data, error } = await supabase
        .from("loan_history")
        .select("*")
        .eq("book_id", bookId)
        .order("lent_at", { ascending: false });
      if (error) throw error;
      return data as LoanRecord[];
    },
    enabled: !!bookId,
  });
}

export function useCreateLoanRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      book_id: string;
      library_id: string;
      borrower_name: string;
      lent_at: string;
      returned_at?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("loan_history")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as LoanRecord;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["loan_history", vars.book_id] });
    },
  });
}

export function useUpdateLoanRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, book_id, ...updates }: Partial<LoanRecord> & { id: string; book_id: string }) => {
      const { data, error } = await supabase
        .from("loan_history")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as LoanRecord;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["loan_history", vars.book_id] });
    },
  });
}

export function useDeleteLoanRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; book_id: string }) => {
      const { error } = await supabase.from("loan_history").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["loan_history", vars.book_id] });
    },
  });
}