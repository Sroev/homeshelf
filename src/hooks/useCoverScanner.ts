import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CoverScanResult {
  title: string;
  author: string | null;
}

export function useCoverScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanCover = useCallback(async (imageSource: string): Promise<CoverScanResult | null> => {
    setIsScanning(true);
    setError(null);

    try {
      const body = imageSource.startsWith("http")
        ? { imageUrl: imageSource }
        : { imageBase64: imageSource };

      const { data, error: fnError } = await supabase.functions.invoke("scan-book-cover", {
        body,
      });

      if (fnError) throw new Error(fnError.message);
      if (!data || !data.title) throw new Error("Could not extract book info");

      return { title: data.title, author: data.author ?? null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scan failed";
      setError(msg);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  return { scanCover, isScanning, error };
}
