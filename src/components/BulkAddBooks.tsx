import { useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCreateBook, useBooks } from "@/hooks/useBooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, BookCopy, ImagePlus, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DetectedBook {
  title: string;
  author: string | null;
  selected: boolean;
}

interface BulkAddBooksProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkAddBooks({ open, onOpenChange }: BulkAddBooksProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const createBook = useCreateBook();
  const { data: existingBooks } = useBooks();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "review" | "adding">("upload");
  const [isScanning, setIsScanning] = useState(false);
  const [detectedBooks, setDetectedBooks] = useState<DetectedBook[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return;

    setIsScanning(true);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: "image/jpeg" as const,
      });

      const fileName = `${user.id}/shelf-${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("book-covers")
        .upload(fileName, compressed, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("book-covers")
        .getPublicUrl(fileName);

      const { data, error } = await supabase.functions.invoke("scan-bookshelf", {
        body: { imageUrl: publicUrl },
      });

      if (error) throw error;

      if (data?.books?.length > 0) {
        setDetectedBooks(
          data.books.map((b: { title: string; author: string | null }) => ({
            ...b,
            selected: true,
          }))
        );
        setStep("review");
      } else {
        toast({
          title: t.bulkAdd?.noBooksFound || "No books found",
          description: t.bulkAdd?.noBooksFoundDesc || "Could not detect any books in the image",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Bulk scan error:", err);
      toast({
        title: t.bulkAdd?.scanError || "Scan failed",
        description: t.bulkAdd?.scanErrorDesc || "Failed to scan the bookshelf photo",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleBook = (index: number) => {
    setDetectedBooks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, selected: !b.selected } : b))
    );
  };

  const isDuplicate = (bookTitle: string) => {
    if (!existingBooks) return false;
    const normalized = bookTitle.trim().toLowerCase();
    return existingBooks.some((b) => b.title.toLowerCase() === normalized);
  };

  const toggleAll = () => {
    const allSelected = detectedBooks.every((b) => b.selected);
    setDetectedBooks((prev) => prev.map((b) => ({ ...b, selected: !allSelected })));
  };

  const handleAddSelected = async () => {
    const selected = detectedBooks.filter((b) => b.selected);
    if (selected.length === 0) return;

    setIsAdding(true);
    let added = 0;

    try {
      for (const book of selected) {
        await createBook.mutateAsync({
          title: book.title,
          author: book.author || undefined,
        });
        added++;
      }

      toast({
        title: t.bulkAdd?.booksAdded || "Books added!",
        description: (t.bulkAdd?.booksAddedDesc || "{count} books added to your library").replace("{count}", String(added)),
      });

      handleClose();
    } catch (err) {
      console.error("Bulk add error:", err);
      toast({
        title: t.bulkAdd?.addError || "Error adding books",
        description: (t.bulkAdd?.addedPartial || "Added {count} books before the error").replace("{count}", String(added)),
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setDetectedBooks([]);
    setPreviewUrl(null);
    setIsScanning(false);
    setIsAdding(false);
    onOpenChange(false);
  };

  const selectedCount = detectedBooks.filter((b) => b.selected).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookCopy className="h-5 w-5" />
            {t.bulkAdd?.title || "Add books from photo"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload"
              ? (t.bulkAdd?.uploadDesc || "Take a photo of your bookshelf and we'll detect the books")
              : (t.bulkAdd?.reviewDesc || "Select which books to add to your library")}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-6">
            {isScanning ? (
              <>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Bookshelf"
                    className="max-h-48 rounded-lg object-contain border border-border"
                  />
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t.bulkAdd?.scanning || "Analyzing bookshelf..."}</span>
                </div>
              </>
            ) : (
              <Button
                variant="outline"
                className="h-32 w-full flex flex-col gap-3"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-8 w-8" />
                <span>{t.bulkAdd?.selectPhoto || "Select bookshelf photo"}</span>
              </Button>
            )}
          </div>
        )}

        {step === "review" && (
          <>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Checkbox
                  checked={detectedBooks.every((b) => b.selected)}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm font-medium">
                  {t.bulkAdd?.selectAll || "Select all"} ({detectedBooks.length})
                </span>
              </div>

              {detectedBooks.map((book, i) => (
                <label
                  key={i}
                  className="flex items-start gap-3 py-2 px-1 rounded-md hover:bg-accent/50 cursor-pointer"
                >
                  <Checkbox
                    checked={book.selected}
                    onCheckedChange={() => toggleBook(i)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{book.title}</p>
                    {book.author && (
                      <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <DialogFooter className="mt-4 flex-row gap-2 sm:justify-between">
              <Button variant="outline" onClick={handleClose} disabled={isAdding}>
                {t.bulkAdd?.cancel || "Cancel"}
              </Button>
              <Button
                onClick={handleAddSelected}
                disabled={selectedCount === 0 || isAdding}
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {isAdding
                  ? (t.bulkAdd?.adding || "Adding...")
                  : (t.bulkAdd?.addSelected || "Add selected").replace("{count}", String(selectedCount)) + ` (${selectedCount})`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
