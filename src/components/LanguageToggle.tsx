import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  variant?: "default" | "compact";
  className?: string;
}

export function LanguageToggle({ variant = "default", className }: LanguageToggleProps) {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "bg" ? "en" : "bg");
  };

  if (variant === "compact") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLanguage}
        className={cn("gap-1.5 text-xs", className)}
      >
        <Globe className="h-3.5 w-3.5" />
        {t.language.switchTo}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={toggleLanguage}
      className={cn("w-full justify-start gap-3 px-3", className)}
    >
      <Globe className="h-4 w-4" />
      {t.language.switchTo}
    </Button>
  );
}
