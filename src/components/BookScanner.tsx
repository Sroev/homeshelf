import { useRef, useCallback, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsbnLookup, IsbnBookData } from "@/hooks/useIsbnLookup";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";

interface BookScannerProps {
  onBookFound: (book: IsbnBookData) => void;
}

// Decode an image File to ImageBitmap (or HTMLImageElement fallback)
async function fileToBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through
    }
  }
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function detectBarcode(
  source: ImageBitmap | HTMLImageElement
): Promise<string | null> {
  // BarcodeDetector is supported on Chrome/Android & Safari iOS 17+
  const BD = (window as unknown as { BarcodeDetector?: new (opts?: { formats?: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
  if (!BD) return null;

  try {
    const detector = new BD({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
    const results = await detector.detect(source as CanvasImageSource);
    if (results && results.length > 0) {
      return results[0].rawValue;
    }
  } catch (e) {
    console.warn("BarcodeDetector failed:", e);
  }
  return null;
}

export function BookScanner({ onBookFound }: BookScannerProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { lookupIsbn } = useIsbnLookup();

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset input so the same file can be re-selected later
      if (inputRef.current) inputRef.current.value = "";
      if (!file) return;

      setError(null);
      setIsProcessing(true);

      try {
        const bitmap = await fileToBitmap(file);
        const code = await detectBarcode(bitmap);

        if (!code) {
          setError(t.scanner.notFound);
          return;
        }

        const book = await lookupIsbn(code);
        if (book) {
          onBookFound(book);
        } else {
          setError(t.scanner.notFound);
        }
      } catch (err) {
        console.error("Scan error:", err);
        setError(t.scanner.cameraError);
      } finally {
        setIsProcessing(false);
      }
    },
    [lookupIsbn, onBookFound, t]
  );

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={isProcessing}
        className="w-full gap-2"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        {isProcessing ? t.scanner.lookingUp : t.scanner.scanBarcode}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        {t.scanner.pointCamera}
      </p>
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}