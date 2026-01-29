import { useState, useEffect, useCallback } from "react";

export interface BookSuggestion {
  title: string;
  author: string | null;
  isbn: string | null;
  key: string;
}

interface OpenLibraryDoc {
  title: string;
  author_name?: string[];
  isbn?: string[];
  key: string;
}

export function useBookSearch(query: string, debounceMs = 300) {
  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchBooks = useCallback(async (searchQuery: string, signal: AbortSignal) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://openlibrary.org/search.json?title=${encodeURIComponent(searchQuery)}&limit=8&fields=title,author_name,isbn,key`,
        { signal }
      );
      
      if (!response.ok) throw new Error("Search failed");
      
      const data = await response.json();
      const docs: OpenLibraryDoc[] = data.docs || [];
      
      const results: BookSuggestion[] = docs.map((doc) => ({
        title: doc.title,
        author: doc.author_name?.[0] || null,
        isbn: doc.isbn?.[0] || null,
        key: doc.key,
      }));
      
      setSuggestions(results);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Book search error:", error);
        setSuggestions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      searchBooks(query, controller.signal);
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query, debounceMs, searchBooks]);

  return { suggestions, isLoading };
}
