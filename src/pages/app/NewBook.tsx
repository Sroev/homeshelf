import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateBook } from "@/hooks/useBooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type BookStatus = Database["public"]["Enums"]["book_status"];

const statusLabels: Record<BookStatus, string> = {
  available: "Available",
  lent_out: "Lent Out",
  reading: "Reading",
  unavailable: "Unavailable",
};

export default function NewBook() {
  const navigate = useNavigate();
  const createBook = useCreateBook();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<BookStatus>("available");
  const [shareable, setShareable] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required.",
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
      });
      toast({
        title: "Book added",
        description: `"${title}" has been added to your library.`,
      });
      navigate("/app/books");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add book. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add New Book</h1>
          <p className="mt-1 text-muted-foreground">
            Add a book to your library collection
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Book Details</CardTitle>
            <CardDescription>
              Enter the information about your book
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter book title"
                  required
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Enter author name"
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isbn">ISBN</Label>
                <Input
                  id="isbn"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="Enter ISBN (optional)"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about this book (condition, edition, etc.)"
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
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
                  Set the current availability status of this book
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="shareable"
                  checked={shareable}
                  onCheckedChange={setShareable}
                />
                <Label htmlFor="shareable" className="font-normal">
                  Shareable with friends
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, this book will be visible on your shared library page
              </p>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={createBook.isPending}>
                  {createBook.isPending ? "Adding..." : "Add Book"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/app/books")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
