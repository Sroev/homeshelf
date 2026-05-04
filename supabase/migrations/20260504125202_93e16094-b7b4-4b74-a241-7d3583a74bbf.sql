-- Add borrower_email to loan_history
ALTER TABLE public.loan_history
  ADD COLUMN IF NOT EXISTS borrower_email TEXT,
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- Add due_date to requests (proposed return date by requester)
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS proposed_return_date DATE;

-- Update track_book_loan trigger to also try to copy borrower_email from latest approved request
CREATE OR REPLACE FUNCTION public.track_book_loan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email TEXT;
  v_due TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'lent_out' AND (OLD.status IS DISTINCT FROM 'lent_out') THEN
    -- Try to fetch borrower email + due date from most recent approved request
    SELECT requester_email,
           CASE WHEN proposed_return_date IS NOT NULL
                THEN (proposed_return_date::timestamp AT TIME ZONE 'UTC')
                ELSE NULL END
      INTO v_email, v_due
    FROM public.requests
    WHERE book_id = NEW.id
      AND status = 'approved'
      AND LOWER(TRIM(requester_name)) = LOWER(TRIM(COALESCE(NEW.lent_to, '')))
    ORDER BY updated_at DESC
    LIMIT 1;

    INSERT INTO public.loan_history (book_id, library_id, borrower_name, borrower_email, lent_at, due_date)
    VALUES (
      NEW.id,
      NEW.library_id,
      COALESCE(NULLIF(TRIM(NEW.lent_to), ''), 'Unknown'),
      v_email,
      now(),
      v_due
    );
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.track_book_loan_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;