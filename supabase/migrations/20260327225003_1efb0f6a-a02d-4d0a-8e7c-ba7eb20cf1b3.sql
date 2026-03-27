
-- Fix 1: Convert requests table anon block policies from PERMISSIVE to RESTRICTIVE
DROP POLICY IF EXISTS "Block anonymous delete access" ON public.requests;
DROP POLICY IF EXISTS "Block anonymous insert access" ON public.requests;
DROP POLICY IF EXISTS "Block anonymous select access" ON public.requests;
DROP POLICY IF EXISTS "Block anonymous update access" ON public.requests;

CREATE POLICY "Block anonymous select access" ON public.requests FOR SELECT TO anon USING (false);
CREATE POLICY "Block anonymous insert access" ON public.requests FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Block anonymous update access" ON public.requests FOR UPDATE TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous delete access" ON public.requests FOR DELETE TO anon USING (false);

-- Fix 2: Add RESTRICTIVE anon block policies on user_roles
CREATE POLICY "Block anonymous select on user_roles" ON public.user_roles FOR SELECT TO anon USING (false);
CREATE POLICY "Block anonymous insert on user_roles" ON public.user_roles FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Block anonymous update on user_roles" ON public.user_roles FOR UPDATE TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous delete on user_roles" ON public.user_roles FOR DELETE TO anon USING (false);

-- Fix 3: Prevent privilege escalation - non-admin authenticated users must not insert roles
-- The existing "Admins can insert user roles" PERMISSIVE policy only grants access to admins.
-- In PostgreSQL RLS, if NO permissive policy matches, access is denied (default deny).
-- However, to be explicit and future-proof, we add a RESTRICTIVE policy that ensures
-- only admins can insert. This way even if a permissive policy is accidentally added later,
-- non-admins are still blocked.
CREATE POLICY "Only admins can insert user roles" ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
