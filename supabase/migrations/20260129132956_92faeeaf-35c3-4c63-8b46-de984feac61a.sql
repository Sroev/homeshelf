-- Add lent_to column to track who the book is lent to
ALTER TABLE public.books 
ADD COLUMN lent_to text NULL;