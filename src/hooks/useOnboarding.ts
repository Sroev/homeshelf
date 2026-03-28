import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";

export function useOnboarding() {
  const { data: profile, isLoading } = useProfile();
  const [dismissed, setDismissed] = useState(false);

  const needsOnboarding =
    !isLoading && !dismissed && !!profile && 
    (!profile.display_name || profile.display_name.trim() === "" || profile.display_name === "Book Lover");

  const completeOnboarding = () => setDismissed(true);

  return { needsOnboarding, completeOnboarding, isLoading };
}
