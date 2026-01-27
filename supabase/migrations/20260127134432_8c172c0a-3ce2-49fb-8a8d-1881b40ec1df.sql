-- Create book_status enum
CREATE TYPE public.book_status AS ENUM ('available', 'lent_out', 'reading', 'unavailable');

-- Create request_status enum
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'declined');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create libraries table
CREATE TABLE public.libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Library',
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create books table
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT,
  notes TEXT,
  status public.book_status NOT NULL DEFAULT 'available',
  shareable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create requests table
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  message TEXT,
  status public.request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_libraries_owner_id ON public.libraries(owner_id);
CREATE INDEX idx_libraries_share_token ON public.libraries(share_token);
CREATE INDEX idx_books_library_id ON public.books(library_id);
CREATE INDEX idx_requests_library_id ON public.requests(library_id);
CREATE INDEX idx_requests_book_id ON public.requests(book_id);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Libraries RLS policies
CREATE POLICY "Owners can view their own libraries"
  ON public.libraries FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert their own libraries"
  ON public.libraries FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their own libraries"
  ON public.libraries FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their own libraries"
  ON public.libraries FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Books RLS policies
CREATE POLICY "Owners can view their own books"
  ON public.books FOR SELECT
  TO authenticated
  USING (
    library_id IN (
      SELECT id FROM public.libraries WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can insert books into their libraries"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (
    library_id IN (
      SELECT id FROM public.libraries WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their own books"
  ON public.books FOR UPDATE
  TO authenticated
  USING (
    library_id IN (
      SELECT id FROM public.libraries WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    library_id IN (
      SELECT id FROM public.libraries WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete their own books"
  ON public.books FOR DELETE
  TO authenticated
  USING (
    library_id IN (
      SELECT id FROM public.libraries WHERE owner_id = auth.uid()
    )
  );

-- Requests RLS policies
CREATE POLICY "Owners can view requests for their libraries"
  ON public.requests FOR SELECT
  TO authenticated
  USING (
    library_id IN (
      SELECT id FROM public.libraries WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update requests for their libraries"
  ON public.requests FOR UPDATE
  TO authenticated
  USING (
    library_id IN (
      SELECT id FROM public.libraries WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    library_id IN (
      SELECT id FROM public.libraries WHERE owner_id = auth.uid()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_libraries_updated_at
  BEFORE UPDATE ON public.libraries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create auto-initialization function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_profile_id UUID;
BEGIN
  -- Insert profile for the new user
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Book Lover'))
  RETURNING id INTO new_profile_id;
  
  -- Create default library for the user
  INSERT INTO public.libraries (owner_id, name)
  VALUES (new_profile_id, 'My Library');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();