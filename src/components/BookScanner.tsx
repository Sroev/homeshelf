import { useState, useRef, useCallback, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsbnLookup, IsbnBookData } from "@/hooks/useIsbnLookup";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, Loader2 } from "lucide-react";

interface BookScannerProps {
  onBookFound: (book: IsbnBookData) => void;
}

export function BookScanner({ onBookFound }: BookScannerProps) {
  const { t } = useLanguage();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { lookupIsbn, isLoading: isLookingUp } = useIsbnLookup();

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleScan = useCallback(async (decodedText: string) => {
    await stopScanner();
    setError(null);

    const book = await lookupIsbn(decodedText);
    if (book) {
      onBookFound(book);
    } else {
      setError(t.scanner.notFound);
    }
  }, [stopScanner, lookupIsbn, onBookFound, t]);

  const startScanner = useCallback(async () => {
    setError(null);
    setIsScanning(true);

    try {
      const scanner = new Html5Qrcode("book-scanner-region");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 100 },
          aspectRatio: 1.5,
        },
        handleScan,
        () => {} // ignore errors during scanning
      );
    } catch (err) {
      console.error("Scanner error:", err);
      setError(t.scanner.cameraError);
      setIsScanning(false);
    }
  }, [handleScan, t]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      {!isScanning ? (
        <Button
          type="button"
          variant="outline"
          onClick={startScanner}
          disabled={isLookingUp}
          className="w-full gap-2"
        >
          {isLookingUp ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {isLookingUp ? t.scanner.lookingUp : t.scanner.scanBarcode}
        </Button>
      ) : (
        <Card className="overflow-hidden">
          <div className="relative">
            <div id="book-scanner-region" className="w-full" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={stopScanner}
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center p-2">
            {t.scanner.pointCamera}
          </p>
        </Card>
      )}

      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
