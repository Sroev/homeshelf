import { useState } from "react";
import { BookOpen, Share2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const steps = [
    {
      icon: BookOpen,
      title: t.onboarding.step1Title,
      desc: t.onboarding.step1Desc,
    },
    {
      icon: Share2,
      title: t.onboarding.step2Title,
      desc: t.onboarding.step2Desc,
    },
    {
      icon: CheckCircle,
      title: t.onboarding.step3Title,
      desc: t.onboarding.step3Desc,
    },
  ];

  const isLastStep = step === steps.length - 1;
  const isFirstStep = step === 0;

  const handleNext = () => {
    if (!isLastStep) {
      setStep((s) => s + 1);
    }
  };

  const handleComplete = async () => {
    if (!displayName.trim() || !user) return;
    setIsSaving(true);
    await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", user.id);
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    setIsSaving(false);
    onComplete();
  };

  const CurrentIcon = steps[step].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        {/* Step indicators */}
        <div className="mb-8 flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-8 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CurrentIcon className="h-8 w-8 text-primary" />
          </div>

          <h2 className="mb-2 text-xl font-bold text-foreground">
            {steps[step].title}
          </h2>

          <p className="mb-6 text-sm text-muted-foreground">
            {steps[step].desc}
          </p>
        </div>

        {/* Name input on last step */}
        {isLastStep && (
          <div className="mb-6 space-y-2">
            <Label htmlFor="onboarding-name">{t.onboarding.nameLabel}</Label>
            <Input
              id="onboarding-name"
              placeholder={t.onboarding.namePlaceholder}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && displayName.trim()) handleComplete();
              }}
              autoFocus
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between gap-3">
          {!isFirstStep && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              {t.onboarding.back}
            </Button>
          )}
          {isLastStep ? (
            <Button
              className="ml-auto"
              onClick={handleComplete}
              disabled={!displayName.trim() || isSaving}
            >
              {isSaving ? t.onboarding.saving : t.onboarding.finish}
            </Button>
          ) : (
            <Button className="ml-auto" onClick={handleNext}>
              {t.onboarding.next}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
