export interface DetectedBook {
  title: string;
  author: string | null;
  isbn: string | null;
  coverUrl: string | null;
}

interface OpenLibraryBookData {
  title?: string;
  authors?: Array<{ name: string; url: string }>;
  cover?: {
    small?: string;
    medium?: string;
    large?: string;
  };
}

interface OpenLibraryBooksResponse {
  [bibkey: string]: OpenLibraryBookData;
}

/**
 * Look up a book by ISBN using the Open Library /api/books endpoint.
 * Returns null if the book is not found or the request fails.
 */
export async function lookupIsbn(isbn: string): Promise<DetectedBook | null> {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, "");
  const bibkey = `ISBN:${cleanIsbn}`;
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(bibkey)}&jscmd=data&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data: OpenLibraryBooksResponse = await response.json();
    const bookData = data[bibkey];

    // Open Library returns an empty object {} when not found
    if (!bookData || !bookData.title) return null;

    const author = bookData.authors?.[0]?.name ?? null;

    // Prefer the cover URL from the response; fall back to the ISBN-based cover shortcut
    const coverUrl =
      bookData.cover?.medium ??
      bookData.cover?.large ??
      bookData.cover?.small ??
      `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`;

    return {
      title: bookData.title,
      author,
      isbn: cleanIsbn,
      coverUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Returns true if the string looks like a valid ISBN-10 or ISBN-13.
 */
export function looksLikeIsbn(value: string): boolean {
  const clean = value.replace(/[^0-9X]/gi, "");
  if (clean.length === 13) return /^\d+$/.test(clean);
  if (clean.length === 10) return /^\d{9}[\dX]$/i.test(clean);
  return false;
}
