import { useState, useCallback } from "react";

export interface IsbnBookData {
  title: string;
  author: string | null;
  isbn: string;
  coverUrl: string | null;
}

export function useIsbnLookup() {
  const [isLoading, setIsLoading] = useState(false);

  const lookupIsbn = useCallback(async (isbn: string): Promise<IsbnBookData | null> => {
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, "");
    if (cleanIsbn.length !== 10 && cleanIsbn.length !== 13) return null;

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`
      );
      if (!response.ok) throw new Error("Lookup failed");

      const data = await response.json();
      const bookData = data[`ISBN:${cleanIsbn}`];
      if (!bookData) return null;

      return {
        title: bookData.title || "",
        author: bookData.authors?.[0]?.name || null,
        isbn: cleanIsbn,
        coverUrl: bookData.cover?.medium || bookData.cover?.large || null,
      };
    } catch (error) {
      console.error("ISBN lookup error:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { lookupIsbn, isLoading };
}
