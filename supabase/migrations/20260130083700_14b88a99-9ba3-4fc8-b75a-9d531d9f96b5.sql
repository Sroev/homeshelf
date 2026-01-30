-- Create storage bucket for book covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own book covers
CREATE POLICY "Users can upload book covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'book-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to view book covers (public bucket)
CREATE POLICY "Book covers are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'book-covers');

-- Allow users to update their own book covers
CREATE POLICY "Users can update their own book covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'book-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own book covers
CREATE POLICY "Users can delete their own book covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'book-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add cover_url column to books table
ALTER TABLE public.books
ADD COLUMN cover_url TEXT DEFAULT NULL;