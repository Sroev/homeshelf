
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_profile_id UUID;
  supabase_url TEXT;
  service_role_key TEXT;
  user_email TEXT;
  user_display_name TEXT;
BEGIN
  user_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', 'Book Lover');
  user_email := COALESCE(NEW.email, '');

  -- Insert profile for the new user
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, user_display_name)
  RETURNING id INTO new_profile_id;
  
  -- Create default library for the user
  INSERT INTO public.libraries (owner_id, name)
  VALUES (new_profile_id, 'My Library');

  -- Notify admin via edge function
  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;

  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/notify-new-user',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.id,
        'display_name', user_display_name,
        'email', user_email
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
