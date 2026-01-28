-- Add explicit DENY policies for anonymous users on the requests table
-- This provides defense-in-depth protection. The Edge Function uses service role key
-- which bypasses RLS, so these policies won't affect legitimate functionality.

-- Block anonymous SELECT access (prevents accidental exposure of email addresses)
CREATE POLICY "Block anonymous select access" 
ON public.requests 
FOR SELECT 
TO anon 
USING (false);

-- Block anonymous INSERT access (prevents spam/abuse - inserts go through Edge Function)
CREATE POLICY "Block anonymous insert access" 
ON public.requests 
FOR INSERT 
TO anon 
WITH CHECK (false);

-- Block anonymous UPDATE access
CREATE POLICY "Block anonymous update access" 
ON public.requests 
FOR UPDATE 
TO anon 
USING (false);

-- Block anonymous DELETE access  
CREATE POLICY "Block anonymous delete access" 
ON public.requests 
FOR DELETE 
TO anon 
USING (false);