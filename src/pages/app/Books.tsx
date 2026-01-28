import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useBooks, useUpdateBook, useDeleteBook, Book } from "@/hooks/useBooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/integrations/supabase/types";

type BookStatus = Database["public"]["Enums"]["book_status"];

const statusColors: Record<BookStatus, string> = {
  available: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  lent_out: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  reading: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  unavailable: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const statusLabels: Record<BookStatus, string> = {
  available: "Available",
  lent_out: "Lent Out",
  reading: "Reading",
  unavailable: "Unavailable",
};

export default function Books() {
  const { data: books, isLoading } = useBooks();
  const updateBook = useUpdateBook();
  const deleteBook = useDeleteBook();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookStatus | "all">("all");
  const [shareableFilter, setShareableFilter] = useState<"all" | "shareable" | "private">("all");
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Book | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editIsbn, setEditIsbn] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<BookStatus>("available");
  const [editShareable, setEditShareable] = useState(true);

  const filteredBooks = books?.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      (book.author && book.author.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || book.status === statusFilter;
    const matchesShareable =
      shareableFilter === "all" ||
      (shareableFilter === "shareable" && book.shareable) ||
      (shareableFilter === "private" && !book.shareable);
    return matchesSearch && matchesStatus && matchesShareable;
  });

  const handleStatusChange = async (bookId: string, status: BookStatus) => {
    try {
      const result = await updateBook.mutateAsync({ 
        id: bookId, 
        status,
        notifyWaitlist: status === "available",
      });
      
      // Show appropriate toast based on whether waitlist was notified
      if (status === "available") {
        toast({ 
          title: "Status updated",
          description: "The first person on the waitlist will be notified.",
        });
      } else {
        toast({ title: "Status updated" });
      }
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handleShareableToggle = async (bookId: string, shareable: boolean) => {
    try {
      await updateBook.mutateAsync({ id: bookId, shareable });
      toast({ title: shareable ? "Book is now shareable" : "Book is now private" });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const openEditDialog = (book: Book) => {
    setEditingBook(book);
    setEditTitle(book.title);
    setEditAuthor(book.author || "");
    setEditIsbn(book.isbn || "");
    setEditNotes(book.notes || "");
    setEditStatus(book.status);
    setEditShareable(book.shareable);
  };

  const handleEditSubmit = async () => {
    if (!editingBook) return;

    const wasUnavailable = editingBook.status === "lent_out" || editingBook.status === "reading";
    const becomingAvailable = editStatus === "available";

    try {
      await updateBook.mutateAsync({
        id: editingBook.id,
        title: editTitle.trim(),
        author: editAuthor.trim() || null,
        isbn: editIsbn.trim() || null,
        notes: editNotes.trim() || null,
        status: editStatus,
        shareable: editShareable,
        notifyWaitlist: wasUnavailable && becomingAvailable,
      });
      
      if (wasUnavailable && becomingAvailable) {
        toast({ 
          title: "Book updated",
          description: "The first person on the waitlist will be notified.",
        });
      } else {
        toast({ title: "Book updated" });
      }
      setEditingBook(null);
    } catch {
      toast({ title: "Failed to update book", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteBook.mutateAsync(deleteConfirm.id);
      toast({ title: "Book deleted" });
      setDeleteConfirm(null);
    } catch {
      toast({ title: "Failed to delete book", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Books</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your book collection
            </p>
          </div>
          <Button asChild>
            <Link to="/app/books/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Book
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title or author..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookStatus | "all")}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="lent_out">Lent Out</SelectItem>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
            <Select value={shareableFilter} onValueChange={(v) => setShareableFilter(v as "all" | "shareable" | "private")}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Books</SelectItem>
                <SelectItem value="shareable">Shareable</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Book List */}
        {filteredBooks && filteredBooks.length > 0 ? (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden sm:table-cell">Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Shareable</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell className="font-medium">
                        {book.title}
                        {book.author && (
                          <span className="block text-sm text-muted-foreground sm:hidden">
                            {book.author}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {book.author || "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={book.status}
                          onValueChange={(v) => handleStatusChange(book.id, v as BookStatus)}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <Badge variant="secondary" className={statusColors[book.status]}>
                              {statusLabels[book.status]}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={book.shareable}
                          onCheckedChange={(checked) => handleShareableToggle(book.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(book)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(book)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium text-foreground">
                {books?.length === 0 ? "No books yet" : "No books match your filters"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {books?.length === 0
                  ? "Add your first book to get started."
                  : "Try adjusting your search or filters."}
              </p>
              {books?.length === 0 && (
                <Button asChild className="mt-4">
                  <Link to="/app/books/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Book
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingBook} onOpenChange={(open) => !open && setEditingBook(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
            <DialogDescription>Update the book details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-author">Author</Label>
              <Input
                id="edit-author"
                value={editAuthor}
                onChange={(e) => setEditAuthor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-isbn">ISBN</Label>
              <Input
                id="edit-isbn"
                value={editIsbn}
                onChange={(e) => setEditIsbn(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as BookStatus)}>
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
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-shareable"
                checked={editShareable}
                onCheckedChange={setEditShareable}
              />
              <Label htmlFor="edit-shareable">Shareable with friends</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBook(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={updateBook.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Book</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteBook.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
