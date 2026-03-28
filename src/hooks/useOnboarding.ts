import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";

export function useOnboarding() {
  const { data: profile, isLoading } = useProfile();
  const [dismissed, setDismissed] = useState(false);

  const needsOnboarding =
    !isLoading && !dismissed && (!profile?.display_name || profile.display_name.trim() === "");

  const completeOnboarding = () => setDismissed(true);

  return { needsOnboarding, completeOnboarding, isLoading };
}
