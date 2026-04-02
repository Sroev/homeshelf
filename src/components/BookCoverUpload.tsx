import { useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2, ScanSearch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCoverScanner } from "@/hooks/useCoverScanner";

interface BookCoverUploadProps {
  coverUrl: string | null;
  onCoverChange: (url: string | null) => void;
  onScanResult?: (title: string, author: string | null) => void;
  bookId?: string;
}

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.2, // 200KB max
  maxWidthOrHeight: 800,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

export function BookCoverUpload({ coverUrl, onCoverChange, onScanResult, bookId }: BookCoverUploadProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(coverUrl);
  const { scanCover, isScanning } = useCoverScanner();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: t.newBook.invalidFileType || "Invalid file type",
        description: t.newBook.selectImage || "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Compress the image
      const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
      
      // Generate unique filename
      const fileExt = "webp";
      const fileName = `${user.id}/${bookId || crypto.randomUUID()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("book-covers")
        .upload(fileName, compressedFile, {
          upsert: true,
          contentType: "image/webp",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("book-covers")
        .getPublicUrl(fileName);

      setPreviewUrl(publicUrl);
      onCoverChange(publicUrl);

      toast({
        title: t.newBook.coverUploaded || "Cover uploaded",
        description: t.newBook.coverUploadedDesc || "Book cover has been uploaded successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: t.newBook.uploadError || "Upload failed",
        description: t.newBook.uploadErrorDesc || "Failed to upload book cover",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleScanCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) return;

    try {
      if (!user) return;

      const compressed = await imageCompression(file, {
        maxSizeMB: 0.15,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: "image/jpeg" as const,
      });

      const scanFileName = `${user.id}/scan-${crypto.randomUUID()}.jpg`;

      const { error: scanUploadError } = await supabase.storage
        .from("book-covers")
        .upload(scanFileName, compressed, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (scanUploadError) throw scanUploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("book-covers").getPublicUrl(scanFileName);

      const result = await scanCover(publicUrl);
      if (result) {
        onScanResult?.(result.title, result.author);
        toast({
          title: t.scanner?.bookFound || "Book found!",
          description: t.scanner?.bookFoundDesc || "Details filled in automatically.",
        });
      } else {
        toast({
          title: t.scanner?.notFound || "Could not recognize",
          description: t.scanner?.scanFailed || "Could not extract book info from cover",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: t.newBook?.error || "Error",
        description: t.scanner?.scanFailed || "Cover scan failed",
        variant: "destructive",
      });
    } finally {
      if (scanInputRef.current) scanInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onCoverChange(null);
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
      <input
        ref={scanInputRef}
        type="file"
        accept="image/*"
        onChange={handleScanCover}
        className="hidden"
        disabled={isScanning}
      />

      {previewUrl ? (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Book cover preview"
            className="h-40 w-28 rounded-md object-cover border border-border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={handleRemove}
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-40 w-28 flex flex-col gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs">{t.newBook.addCover || "Add cover"}</span>
            </>
          )}
        </Button>
      )}

      {onScanResult && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => scanInputRef.current?.click()}
          disabled={isScanning || isUploading}
        >
          {isScanning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ScanSearch className="h-4 w-4" />
          )}
          {isScanning ? t.scanner?.scanning || "Scanning..." : t.scanner?.scanCover || "Scan cover"}
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        {t.newBook.coverHint || "Images are automatically compressed"}
      </p>
    </div>
  );
}
