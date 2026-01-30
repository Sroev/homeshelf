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
      onClick={toggleLanguage}
      className="w-full justify-start gap-3 px-3"
    >
      <Globe className="h-4 w-4" />
      {t.language.switchTo}
    </Button>
  );
}
