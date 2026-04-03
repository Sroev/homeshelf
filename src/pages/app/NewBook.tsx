import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateBook, useBooks } from "@/hooks/useBooks";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { BookAutocomplete } from "@/components/BookAutocomplete";
import { BookSuggestion } from "@/hooks/useBookSearch";
import { BookCoverUpload } from "@/components/BookCoverUpload";
import { BookScanner } from "@/components/BookScanner";

import { IsbnBookData } from "@/hooks/useIsbnLookup";

type BookStatus = Database["public"]["Enums"]["book_status"];

export default function NewBook() {
  const navigate = useNavigate();
  const createBook = useCreateBook();
  const { data: existingBooks } = useBooks();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { t } = useLanguage();

  const statusLabels: Record<BookStatus, string> = {
    available: t.books.available,
    lent_out: t.books.lentOut,
    reading: t.books.reading,
    unavailable: t.books.unavailable,
  };

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<BookStatus>("available");
  const [shareable, setShareable] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [titleFromScan, setTitleFromScan] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: t.newBook.validationError,
        description: t.newBook.titleRequired,
        variant: "destructive",
      });
      return;
    }

    try {
      await createBook.mutateAsync({
        title: title.trim(),
        author: author.trim() || undefined,
        isbn: isbn.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
        shareable,
        cover_url: coverUrl || undefined,
      });
      toast({
        title: t.newBook.bookAdded,
        description: `"${title}" ${t.newBook.bookAddedTo}`,
      });
      navigate("/app/books");
    } catch (error) {
      toast({
        title: t.newBook.error,
        description: t.newBook.failedToAdd,
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.newBook.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {t.newBook.addToCollection}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.newBook.bookDetails}</CardTitle>
            <CardDescription>
              {t.newBook.enterInfo}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t.scanner.scanBarcode}</Label>
                <BookScanner
                  onBookFound={(book: IsbnBookData) => {
                    setTitle(book.title);
                    setTitleFromScan(true);
                    if (book.author) setAuthor(book.author);
                    if (book.isbn) setIsbn(book.isbn);
                    if (book.coverUrl) setCoverUrl(book.coverUrl);
                    toast({
                      title: t.scanner.bookFound,
                      description: t.scanner.bookFoundDesc,
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>{t.newBook.cover}</Label>
                <BookCoverUpload
                  coverUrl={coverUrl}
                  onCoverChange={setCoverUrl}
                  onScanResult={(scannedTitle, scannedAuthor) => {
                    if (scannedTitle) {
                      setTitle(scannedTitle);
                      setTitleFromScan(true);
                    }
                    if (scannedAuthor) setAuthor(scannedAuthor);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">{t.newBook.bookTitle}</Label>
                <BookAutocomplete
                  id="title"
                  value={title}
                  onChange={(v) => { setTitle(v); setTitleFromScan(false); }}
                  skipSearch={titleFromScan}
                  onSelect={(suggestion: BookSuggestion) => {
                    setTitle(suggestion.title);
                    if (suggestion.author && !author) {
                      setAuthor(suggestion.author);
                    }
                    if (suggestion.isbn && !isbn) {
                      setIsbn(suggestion.isbn);
                    }
                  }}
                  placeholder={t.newBook.titlePlaceholder}
                  maxLength={255}
                />
                <p className="text-xs text-muted-foreground">
                  {t.newBook.autocompleteHint}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">{t.newBook.author}</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder={t.newBook.authorPlaceholder}
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isbn">{t.newBook.isbn}</Label>
                <Input
                  id="isbn"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder={t.newBook.isbnPlaceholder}
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t.newBook.notes}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.newBook.notesPlaceholder}
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div className="space-y-2">
                <Label>{t.newBook.status}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as BookStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t.newBook.statusHelp}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="shareable"
                  checked={shareable}
                  onCheckedChange={setShareable}
                />
                <Label htmlFor="shareable" className="font-normal">
                  {t.newBook.shareableWithFriends}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.newBook.shareableHelp}
              </p>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={createBook.isPending}>
                  {createBook.isPending ? t.newBook.adding : t.newBook.addBook}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/app/books")}
                >
                  {t.newBook.cancel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
