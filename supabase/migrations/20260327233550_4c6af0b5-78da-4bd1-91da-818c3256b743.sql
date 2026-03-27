-- Allow admins to read all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to read all books
CREATE POLICY "Admins can view all books" ON public.books
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to read all libraries
CREATE POLICY "Admins can view all libraries" ON public.libraries
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to read all requests
CREATE POLICY "Admins can view all requests" ON public.requests
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));