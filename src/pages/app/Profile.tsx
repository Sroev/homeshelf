import { useState, useEffect } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setCity(profile.city || "");
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast({
        title: t.profile.validationError,
        description: t.profile.displayNameRequired,
        variant: "destructive",
      });
      return;
    }

    try {
      await updateProfile.mutateAsync({
        display_name: displayName.trim(),
        city: city.trim() || null,
      });
      toast({
        title: t.profile.profileUpdated,
        description: t.profile.changesSaved,
      });
    } catch (error) {
      toast({
        title: t.profile.error,
        description: t.profile.failedToUpdate,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.profile.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {t.profile.manageInfo}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.profile.personalInfo}</CardTitle>
            <CardDescription>
              {t.profile.infoVisible}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">{t.profile.displayName}</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t.profile.displayNamePlaceholder}
                  required
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  {t.profile.displayNameHelp}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">{t.profile.city}</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t.profile.cityPlaceholder}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  {t.profile.cityHelp}
                </p>
              </div>

              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? t.profile.saving : t.profile.saveChanges}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
