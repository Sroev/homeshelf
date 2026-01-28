import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLibrary } from "./useLibrary";
import { Database } from "@/integrations/supabase/types";

type BookStatus = Database["public"]["Enums"]["book_status"];

export interface Book {
  id: string;
  library_id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  notes: string | null;
  status: BookStatus;
  shareable: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBookInput {
  title: string;
  author?: string;
  isbn?: string;
  notes?: string;
  status?: BookStatus;
  shareable?: boolean;
}

export function useBooks() {
  const { data: library } = useLibrary();

  return useQuery({
    queryKey: ["books", library?.id],
    queryFn: async () => {
      if (!library) return [];
      
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("library_id", library.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Book[];
    },
    enabled: !!library,
  });
}

export function useBook(bookId: string | undefined) {
  return useQuery({
    queryKey: ["book", bookId],
    queryFn: async () => {
      if (!bookId) return null;
      
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", bookId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Book | null;
    },
    enabled: !!bookId,
  });
}

export function useCreateBook() {
  const queryClient = useQueryClient();
  const { data: library } = useLibrary();

  return useMutation({
    mutationFn: async (input: CreateBookInput) => {
      if (!library) throw new Error("No library found");
      
      const { data, error } = await supabase
        .from("books")
        .insert({
          library_id: library.id,
          title: input.title,
          author: input.author || null,
          isbn: input.isbn || null,
          notes: input.notes || null,
          status: input.status || "available",
          shareable: input.shareable ?? true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Book;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books", library?.id] });
    },
  });
}

export function useUpdateBook() {
  const queryClient = useQueryClient();
  const { data: library } = useLibrary();

  return useMutation({
    mutationFn: async ({ 
      id, 
      notifyWaitlist = false, 
      ...updates 
    }: Partial<Book> & { id: string; notifyWaitlist?: boolean }) => {
      // Get current book status before updating
      let previousStatus: BookStatus | null = null;
      if (notifyWaitlist && updates.status === "available") {
        const { data: currentBook } = await supabase
          .from("books")
          .select("status")
          .eq("id", id)
          .maybeSingle();
        previousStatus = currentBook?.status || null;
      }

      const { data, error } = await supabase
        .from("books")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;

      // If book became available and was previously lent out, notify waitlist
      if (
        notifyWaitlist &&
        updates.status === "available" &&
        previousStatus &&
        (previousStatus === "lent_out" || previousStatus === "reading")
      ) {
        try {
          await supabase.functions.invoke("notify-waitlist", {
            body: { book_id: id },
          });
        } catch (notifyError) {
          console.error("Failed to notify waitlist:", notifyError);
          // Don't throw - the book was updated successfully
        }
      }

      return data as Book;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["books", library?.id] });
      queryClient.invalidateQueries({ queryKey: ["book", data.id] });
    },
  });
}

export function useDeleteBook() {
  const queryClient = useQueryClient();
  const { data: library } = useLibrary();

  return useMutation({
    mutationFn: async (bookId: string) => {
      const { error } = await supabase
        .from("books")
        .delete()
        .eq("id", bookId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books", library?.id] });
    },
  });
}
