import { useState, useEffect } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useLibrary, useUpdateLibrary } from "@/hooks/useLibrary";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: library, isLoading: libraryLoading } = useLibrary();
  const updateProfile = useUpdateProfile();
  const updateLibrary = useUpdateLibrary();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [displayName, setDisplayName] = useState("");
  const [libraryName, setLibraryName] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  useEffect(() => {
    if (library) {
      setLibraryName(library.name);
    }
  }, [library]);

  const isLoading = profileLoading || libraryLoading;

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

    if (!libraryName.trim()) {
      toast({
        title: t.profile.validationError,
        description: t.profile.libraryNameRequired,
        variant: "destructive",
      });
      return;
    }

    try {
      await updateProfile.mutateAsync({
        display_name: displayName.trim(),
      });

      if (library) {
        await updateLibrary.mutateAsync({
          libraryId: library.id,
          name: libraryName.trim(),
        });
      }

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

  const isPending = updateProfile.isPending || updateLibrary.isPending;

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
                <Label htmlFor="libraryName">{t.profile.libraryName}</Label>
                <Input
                  id="libraryName"
                  value={libraryName}
                  onChange={(e) => setLibraryName(e.target.value)}
                  placeholder={t.profile.libraryNamePlaceholder}
                  required
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  {t.profile.libraryNameHelp}
                </p>
              </div>

              <Button type="submit" disabled={isPending}>
                {isPending ? t.profile.saving : t.profile.saveChanges}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
