import { useRef, useCallback } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCoverScanner, CoverScanResult } from "@/hooks/useCoverScanner";
import { useLanguage } from "@/contexts/LanguageContext";

interface BookCoverScannerProps {
  onBookFound: (book: CoverScanResult) => void;
}

export function BookCoverScanner({ onBookFound }: BookCoverScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { scanCover, isScanning, error } = useCoverScanner();
  const { t } = useLanguage();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const result = await scanCover(base64);
      if (result?.title) onBookFound(result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [scanCover, onBookFound]);

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isScanning}
        className="gap-2 w-full"
      >
        {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        {isScanning
          ? (t.scanner?.analyzingCover ?? "Анализиране...")
          : (t.scanner?.scanCover ?? "Снимай корица")}
      </Button>
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
