-- Loan history table
CREATE TABLE public.loan_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  library_id UUID NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  borrower_name TEXT NOT NULL,
  lent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  returned_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_loan_history_book_id ON public.loan_history(book_id);
CREATE INDEX idx_loan_history_library_id ON public.loan_history(library_id);

ALTER TABLE public.loan_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Owners can view their loan history"
ON public.loan_history FOR SELECT TO authenticated
USING (library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid()));

CREATE POLICY "Admins can view all loan history"
ON public.loan_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can insert loan history"
ON public.loan_history FOR INSERT TO authenticated
WITH CHECK (library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can update loan history"
ON public.loan_history FOR UPDATE TO authenticated
USING (library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid()))
WITH CHECK (library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can delete loan history"
ON public.loan_history FOR DELETE TO authenticated
USING (library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid()));

-- Block anonymous
CREATE POLICY "Block anonymous select on loan_history" ON public.loan_history FOR SELECT TO anon USING (false);
CREATE POLICY "Block anonymous insert on loan_history" ON public.loan_history FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Block anonymous update on loan_history" ON public.loan_history FOR UPDATE TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous delete on loan_history" ON public.loan_history FOR DELETE TO anon USING (false);

-- updated_at trigger
CREATE TRIGGER update_loan_history_updated_at
BEFORE UPDATE ON public.loan_history
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-track loans when book status changes
CREATE OR REPLACE FUNCTION public.track_book_loan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Status changed to lent_out: open a new loan record
  IF NEW.status = 'lent_out' AND (OLD.status IS DISTINCT FROM 'lent_out') THEN
    INSERT INTO public.loan_history (book_id, library_id, borrower_name, lent_at)
    VALUES (
      NEW.id,
      NEW.library_id,
      COALESCE(NULLIF(TRIM(NEW.lent_to), ''), 'Unknown'),
      now()
    );
  END IF;

  -- Status changed away from lent_out: close most recent open loan
  IF OLD.status = 'lent_out' AND NEW.status IS DISTINCT FROM 'lent_out' THEN
    UPDATE public.loan_history
    SET returned_at = now()
    WHERE id = (
      SELECT id FROM public.loan_history
      WHERE book_id = NEW.id AND returned_at IS NULL
      ORDER BY lent_at DESC LIMIT 1
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER books_track_loan
AFTER UPDATE OF status ON public.books
FOR EACH ROW EXECUTE FUNCTION public.track_book_loan();

-- Also track on insert (book created already lent)
CREATE OR REPLACE FUNCTION public.track_book_loan_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'lent_out' THEN
    INSERT INTO public.loan_history (book_id, library_id, borrower_name, lent_at)
    VALUES (
      NEW.id,
      NEW.library_id,
      COALESCE(NULLIF(TRIM(NEW.lent_to), ''), 'Unknown'),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER books_track_loan_insert
AFTER INSERT ON public.books
FOR EACH ROW EXECUTE FUNCTION public.track_book_loan_insert();