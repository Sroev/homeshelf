import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "bg" ? "en" : "bg");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2"
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline">{t.language.switchTo}</span>
    </Button>
  );
}
