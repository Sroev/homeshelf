import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Book, MapPin, Send, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

interface SharedBook {
  id: string;
  title: string;
  author: string | null;
  status: "available" | "lent_out" | "reading";
  cover_url: string | null;
}

interface SharedLibraryData {
  library_id: string;
  library_name: string;
  owner_name: string;
  owner_city: string | null;
  books: SharedBook[];
}

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  lent_out: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  reading: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export default function SharedLibrary() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const { t } = useLanguage();

  const statusLabels: Record<string, string> = {
    available: t.sharedLibrary.available,
    lent_out: t.sharedLibrary.lentOut,
    reading: t.sharedLibrary.reading,
  };

  const requestSchema = z.object({
    name: z.string().trim().min(1, t.profile.displayNameRequired).max(100),
    email: z.string().trim().email().max(255),
    message: z.string().trim().max(500).optional(),
  });

  const [requestingBook, setRequestingBook] = useState<SharedBook | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const [successInfo, setSuccessInfo] = useState<{
    bookTitle: string;
    ownerName: string;
    waitlistPosition: number | null;
  } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["shared-library", token],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-shared-library", {
        body: { token },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as SharedLibraryData;
    },
    enabled: !!token,
    retry: false,
  });

  const handleSubmitRequest = async () => {
    if (!requestingBook || !data) return;

    // Validate
    const result = requestSchema.safeParse({ name, email, message: message || undefined });
    if (!result.success) {
      const fieldErrors: { name?: string; email?: string; message?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof typeof fieldErrors] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const { data: responseData, error } = await supabase.functions.invoke("create-request", {
        body: {
          token,
          book_id: requestingBook.id,
          requester_name: result.data.name,
          requester_email: result.data.email,
          message: result.data.message || null,
        },
      });

      if (error) throw error;
      if (responseData.error) throw new Error(responseData.error);

      // Show success dialog with waitlist info
      setSuccessInfo({
        bookTitle: requestingBook.title,
        ownerName: data.owner_name,
        waitlistPosition: responseData.waitlist_position || null,
      });

      // Reset form
      setRequestingBook(null);
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      toast({
        title: t.sharedLibrary.requestFailed,
        description: err instanceof Error ? err.message : t.sharedLibrary.tryAgainLater,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="absolute right-4 top-4">
          <LanguageToggle />
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">{t.sharedLibrary.loading}</p>
        </div>
      </div>
    );
  }

  // Error / Not found state
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="absolute right-4 top-4">
          <LanguageToggle />
        </div>
        <Card className="max-w-md text-center">
          <CardContent className="py-12">
            <Book className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">{t.sharedLibrary.notFound}</h1>
            <p className="mt-2 text-muted-foreground">
              {t.sharedLibrary.notFoundDesc}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                <Book className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{data.library_name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{t.sharedLibrary.libraryOf} {data.owner_name}</span>
                  {data.owner_city && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {data.owner_city}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Book Grid */}
      <main className="container mx-auto px-4 py-8">
        {data.books.length > 0 ? (
          <>
            <p className="mb-6 text-muted-foreground">
              {data.books.length} {data.books.length !== 1 ? t.sharedLibrary.booksAvailablePlural : t.sharedLibrary.booksAvailable}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.books.map((book) => (
                <Card key={book.id} className="flex flex-col overflow-hidden">
                  {book.cover_url ? (
                    <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[2/3] w-full bg-muted flex items-center justify-center">
                      <Book className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  )}
                  <CardHeader className="flex-1">
                    <CardTitle className="line-clamp-2 text-lg">{book.title}</CardTitle>
                    {book.author && (
                      <CardDescription className="line-clamp-1">
                        {t.common.by} {book.author}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Badge className={statusColors[book.status]}>
                      {statusLabels[book.status]}
                    </Badge>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setRequestingBook(book)}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {t.sharedLibrary.requestThisBook}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Book className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t.sharedLibrary.noBooks}</h3>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {t.sharedLibrary.noBooksDesc}
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Request Modal */}
      <Dialog open={!!requestingBook} onOpenChange={(open) => !open && setRequestingBook(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.sharedLibrary.requestBook}</DialogTitle>
            <DialogDescription>
              {t.sharedLibrary.requestToBorrow} "{requestingBook?.title}" {t.sharedLibrary.from} {data?.owner_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {requestingBook && (requestingBook.status === "lent_out" || requestingBook.status === "reading") && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t.sharedLibrary.waitlistNotice}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="req-name">{t.sharedLibrary.yourName}</Label>
              <Input
                id="req-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.sharedLibrary.namePlaceholder}
                maxLength={100}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-email">{t.sharedLibrary.yourEmail}</Label>
              <Input
                id="req-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.sharedLibrary.emailPlaceholder}
                maxLength={255}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-message">{t.sharedLibrary.messageOptional}</Label>
              <Textarea
                id="req-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.sharedLibrary.messagePlaceholder}
                rows={3}
                maxLength={500}
              />
              {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestingBook(null)}>
              {t.sharedLibrary.cancel}
            </Button>
            <Button onClick={handleSubmitRequest} disabled={submitting}>
              {submitting ? t.sharedLibrary.sending : t.sharedLibrary.sendRequest}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog with Waitlist Info */}
      <Dialog open={!!successInfo} onOpenChange={(open) => !open && setSuccessInfo(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className="items-center">
            {successInfo?.waitlistPosition ? (
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-300" />
              </div>
            ) : (
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
            )}
            <DialogTitle>
              {successInfo?.waitlistPosition ? t.sharedLibrary.youreOnWaitlist : t.sharedLibrary.requestSent}
            </DialogTitle>
            <DialogDescription className="text-center">
              {successInfo?.waitlistPosition ? (
                  <>
                    <span className="block text-2xl font-bold text-foreground my-2">
                      #{successInfo.waitlistPosition}
                    </span>
                    <span>
                      "{successInfo?.bookTitle}" {t.sharedLibrary.currentlyUnavailable}{successInfo.waitlistPosition}{t.sharedLibrary.inWaitlist} {successInfo?.ownerName} {t.sharedLibrary.willNotify}
                    </span>
                  </>
              ) : (
                <>
                  {t.sharedLibrary.requestSentTo} "{successInfo?.bookTitle}" {t.sharedLibrary.wasSentTo} {successInfo?.ownerName}. 📬
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setSuccessInfo(null)}>
              {t.sharedLibrary.gotIt}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          {t.sharedLibrary.footerText} <span className="font-semibold text-primary">{t.appName}</span>.{" "}
          {t.sharedLibrary.footerCta}{" "}
          <a href="/login" className="font-semibold text-primary underline hover:text-primary/80">
            {t.sharedLibrary.footerCtaLink}
          </a>
          ?
        </div>
      </footer>
    </div>
  );
}
