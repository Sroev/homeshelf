import { useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import imageCompression from "browser-image-compression";
import { ScanLine, Loader2, AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { DetectedBook, lookupIsbn, looksLikeIsbn } from "@/hooks/useIsbnLookup";

export type { DetectedBook };

type ScanStage =
  | "idle"
  | "scanning"
  | "vision"
  | "enriching"
  | "success"
  | "error";

interface ScanState {
  stage: ScanStage;
  errorKey: string | null;
  previewObjectUrl: string | null;
  result: DetectedBook | null;
}

interface BookScannerProps {
  onBookDetected: (book: DetectedBook) => void;
}

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip the "data:image/...;base64," prefix
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const INITIAL_STATE: ScanState = {
  stage: "idle",
  errorKey: null,
  previewObjectUrl: null,
  result: null,
};

export function BookScanner({ onBookDetected }: BookScannerProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ScanState>(INITIAL_STATE);

  const setStage = (stage: ScanStage) =>
    setState((prev) => ({ ...prev, stage }));

  const handleDialogOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Clean up object URL and reset state when dialog closes
      if (state.previewObjectUrl) URL.revokeObjectURL(state.previewObjectUrl);
      setState(INITIAL_STATE);
    }
  };

  const handleReset = () => {
    if (state.previewObjectUrl) URL.revokeObjectURL(state.previewObjectUrl);
    setState(INITIAL_STATE);
  };

  const handleUseBook = () => {
    if (state.result) {
      onBookDetected(state.result);
      toast({
        title: state.result.title,
        description: state.result.author ?? undefined,
      });
      handleDialogOpenChange(false);
    }
  };

  const runScan = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setState({
      stage: "scanning",
      errorKey: null,
      previewObjectUrl: objectUrl,
      result: null,
    });

    let detectedIsbn: string | null = null;
    let detectedTitle: string | null = null;
    let detectedAuthor: string | null = null;

    // ── Stage 1: Barcode scan ──────────────────────────────────────────────
    try {
      const reader = new BrowserMultiFormatReader();
      const barcodeResult = await reader.decodeFromImageUrl(objectUrl);
      const raw = barcodeResult.getText();
      if (looksLikeIsbn(raw)) {
        detectedIsbn = raw.replace(/[^0-9X]/gi, "");
      }
    } catch (err) {
      if (!(err instanceof NotFoundException)) {
        // Unexpected barcode error — log and fall through to Vision
        console.warn("Barcode reader error:", err);
      }
      // NotFoundException = no barcode found, which is expected — continue to Stage 2
    }

    // ── Stage 2: Vision AI (if no barcode found) ──────────────────────────
    if (!detectedIsbn) {
      setStage("vision");
      try {
        // Compress before sending to keep the payload manageable
        const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
        const base64 = await fileToBase64(compressed);

        const { data, error } = await supabase.functions.invoke("scan-book", {
          body: { imageBase64: base64, mimeType: file.type },
        });

        if (error) throw error;

        if (!data || (!data.title && !data.author && !data.isbn)) {
          setState((prev) => ({
            ...prev,
            stage: "error",
            errorKey: "errorNotRecognized",
          }));
          return;
        }

        detectedIsbn = data.isbn ?? null;
        detectedTitle = data.title ?? null;
        detectedAuthor = data.author ?? null;
      } catch (err) {
        console.error("Vision AI error:", err);
        const isNetwork =
          err instanceof TypeError && err.message.includes("fetch");
        setState((prev) => ({
          ...prev,
          stage: "error",
          errorKey: isNetwork ? "errorNetwork" : "errorGeneric",
        }));
        return;
      }
    }

    // ── Stage 3: Enrich with Open Library ─────────────────────────────────
    if (detectedIsbn) {
      setStage("enriching");
      const bookData = await lookupIsbn(detectedIsbn);

      if (bookData) {
        setState((prev) => ({
          ...prev,
          stage: "success",
          result: bookData,
        }));
        return;
      }

      // Open Library didn't find the ISBN — use whatever we already have
      if (detectedTitle || detectedAuthor) {
        setState((prev) => ({
          ...prev,
          stage: "success",
          result: {
            title: detectedTitle ?? "",
            author: detectedAuthor,
            isbn: detectedIsbn,
            coverUrl: null,
          },
        }));
        return;
      }
    }

    // No ISBN but we still have title/author from Vision AI
    if (detectedTitle || detectedAuthor) {
      setState((prev) => ({
        ...prev,
        stage: "success",
        result: {
          title: detectedTitle ?? "",
          author: detectedAuthor,
          isbn: null,
          coverUrl: null,
        },
      }));
      return;
    }

    // Nothing found at all
    setState((prev) => ({
      ...prev,
      stage: "error",
      errorKey: "errorNotRecognized",
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be re-selected after a reset
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      setState((prev) => ({
        ...prev,
        stage: "error",
        errorKey: "errorInvalidFile",
      }));
      return;
    }

    await runScan(file);
  };

  const { stage, errorKey, previewObjectUrl, result } = state;
  const isProcessing =
    stage === "scanning" || stage === "vision" || stage === "enriching";

  const stageLabel =
    stage === "scanning"
      ? t.scanner.stageBarcode
      : stage === "vision"
      ? t.scanner.stageVision
      : stage === "enriching"
      ? t.scanner.stageLookup
      : "";

  const errorMessage = errorKey ? t.scanner[errorKey as keyof typeof t.scanner] : "";

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" size="sm">
          <ScanLine className="h-4 w-4 mr-2" />
          {t.scanner.scanPhoto}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.scanner.title}</DialogTitle>
          <DialogDescription>{t.scanner.description}</DialogDescription>
        </DialogHeader>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isProcessing}
        />

        <div className="py-2 space-y-4">
          {/* ── IDLE: upload zone ── */}
          {stage === "idle" && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 transition-colors p-10 flex flex-col items-center gap-3 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Upload className="h-10 w-10" />
              <span className="text-sm text-center">{t.scanner.uploadPrompt}</span>
            </button>
          )}

          {/* ── PROCESSING: thumbnail + spinner + label ── */}
          {isProcessing && (
            <div className="flex items-center gap-4">
              {previewObjectUrl && (
                <img
                  src={previewObjectUrl}
                  alt="Book photo preview"
                  className="h-20 w-14 rounded object-cover border border-border flex-shrink-0"
                />
              )}
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">{stageLabel}</span>
              </div>
            </div>
          )}

          {/* ── SUCCESS: result preview ── */}
          {stage === "success" && result && (
            <div className="flex items-start gap-4">
              {result.coverUrl ? (
                <img
                  src={result.coverUrl}
                  alt="Book cover"
                  className="h-24 w-16 rounded object-cover border border-border flex-shrink-0"
                />
              ) : (
                previewObjectUrl && (
                  <img
                    src={previewObjectUrl}
                    alt="Book photo preview"
                    className="h-20 w-14 rounded object-cover border border-border flex-shrink-0 opacity-50"
                  />
                )
              )}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="font-semibold text-sm truncate">{result.title}</span>
                </div>
                {result.author && (
                  <span className="text-xs text-muted-foreground truncate">{result.author}</span>
                )}
                {result.isbn && (
                  <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded w-fit">
                    ISBN {result.isbn}
                  </span>
                )}
                <span className="text-xs text-muted-foreground mt-1">{t.scanner.successNote}</span>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {stage === "error" && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <span className="text-sm text-destructive">{errorMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {stage === "idle" && (
            <>
              <Button
                type="button"
                variant="default"
                onClick={() => fileInputRef.current?.click()}
              >
                {t.scanner.choosePhoto}
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleDialogOpenChange(false)}>
                {t.common.cancel}
              </Button>
            </>
          )}

          {stage === "success" && (
            <>
              <Button type="button" onClick={handleUseBook}>
                {t.scanner.useThisBook}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                {t.scanner.scanAnother}
              </Button>
            </>
          )}

          {stage === "error" && (
            <>
              <Button type="button" onClick={handleReset}>
                {t.scanner.tryAgain}
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleDialogOpenChange(false)}>
                {t.common.cancel}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
