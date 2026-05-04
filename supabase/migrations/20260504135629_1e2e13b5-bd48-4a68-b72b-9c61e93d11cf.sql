ALTER TABLE public.books ADD COLUMN IF NOT EXISTS genre TEXT;
CREATE INDEX IF NOT EXISTS idx_books_genre ON public.books (genre);