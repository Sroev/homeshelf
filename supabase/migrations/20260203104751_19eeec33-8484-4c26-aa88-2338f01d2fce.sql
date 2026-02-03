-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
-- Only admins can view all roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only admins can insert roles
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update roles
CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete roles
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create a view for admin statistics that includes user data
-- This view is accessible only to admins via edge function
CREATE OR REPLACE FUNCTION public.get_admin_user_stats()
RETURNS TABLE (
    user_id uuid,
    display_name text,
    created_at timestamptz,
    total_books bigint,
    available_books bigint,
    lent_out_books bigint,
    reading_books bigint,
    total_requests bigint,
    pending_requests bigint,
    approved_requests bigint,
    declined_requests bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as user_id,
    p.display_name,
    p.created_at,
    COALESCE(book_stats.total_books, 0) as total_books,
    COALESCE(book_stats.available_books, 0) as available_books,
    COALESCE(book_stats.lent_out_books, 0) as lent_out_books,
    COALESCE(book_stats.reading_books, 0) as reading_books,
    COALESCE(request_stats.total_requests, 0) as total_requests,
    COALESCE(request_stats.pending_requests, 0) as pending_requests,
    COALESCE(request_stats.approved_requests, 0) as approved_requests,
    COALESCE(request_stats.declined_requests, 0) as declined_requests
  FROM public.profiles p
  LEFT JOIN (
    SELECT 
      l.owner_id,
      COUNT(b.id) as total_books,
      COUNT(b.id) FILTER (WHERE b.status = 'available') as available_books,
      COUNT(b.id) FILTER (WHERE b.status = 'lent_out') as lent_out_books,
      COUNT(b.id) FILTER (WHERE b.status = 'reading') as reading_books
    FROM public.libraries l
    LEFT JOIN public.books b ON b.library_id = l.id
    GROUP BY l.owner_id
  ) book_stats ON book_stats.owner_id = p.id
  LEFT JOIN (
    SELECT 
      l.owner_id,
      COUNT(r.id) as total_requests,
      COUNT(r.id) FILTER (WHERE r.status = 'pending') as pending_requests,
      COUNT(r.id) FILTER (WHERE r.status = 'approved') as approved_requests,
      COUNT(r.id) FILTER (WHERE r.status = 'declined') as declined_requests
    FROM public.libraries l
    LEFT JOIN public.requests r ON r.library_id = l.id
    GROUP BY l.owner_id
  ) request_stats ON request_stats.owner_id = p.id
  ORDER BY p.created_at DESC
$$;