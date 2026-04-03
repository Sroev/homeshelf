import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit, Trash2, BookCopy } from "lucide-react";
import { useBooks, useUpdateBook, useDeleteBook, Book } from "@/hooks/useBooks";
import { useLanguage } from "@/contexts/LanguageContext";
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
import { BulkAddBooks } from "@/components/BulkAddBooks";

type BookStatus = Database["public"]["Enums"]["book_status"];

const statusColors: Record<BookStatus, string> = {
  available: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  lent_out: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  reading: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  unavailable: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function Books() {
  const { data: books, isLoading } = useBooks();
  const updateBook = useUpdateBook();
  const deleteBook = useDeleteBook();
  const { toast } = useToast();
  const { t } = useLanguage();

  const statusLabels: Record<BookStatus, string> = {
    available: t.books.available,
    lent_out: t.books.lentOut,
    reading: t.books.reading,
    unavailable: t.books.unavailable,
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookStatus | "all">("all");
  const [shareableFilter, setShareableFilter] = useState<"all" | "shareable" | "private">("all");
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Book | null>(null);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editIsbn, setEditIsbn] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<BookStatus>("available");
  const [editShareable, setEditShareable] = useState(true);
  const [editLentTo, setEditLentTo] = useState("");

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
      await updateBook.mutateAsync({ 
        id: bookId, 
        status,
        notifyWaitlist: status === "available",
      });
      
      if (status === "available") {
        toast({ 
          title: t.books.statusUpdated,
          description: t.books.waitlistNotified,
        });
      } else {
        toast({ title: t.books.statusUpdated });
      }
    } catch {
      toast({ title: t.books.failedToUpdateStatus, variant: "destructive" });
    }
  };

  const handleShareableToggle = async (bookId: string, shareable: boolean) => {
    try {
      await updateBook.mutateAsync({ id: bookId, shareable });
      toast({ title: shareable ? t.books.bookNowShareable : t.books.bookNowPrivate });
    } catch {
      toast({ title: t.books.failedToUpdate, variant: "destructive" });
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
    setEditLentTo(book.lent_to || "");
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
        lent_to: editStatus === "lent_out" ? (editLentTo.trim() || null) : null,
        notifyWaitlist: wasUnavailable && becomingAvailable,
      });
      
      if (wasUnavailable && becomingAvailable) {
        toast({ 
          title: t.books.bookUpdated,
          description: t.books.waitlistNotified,
        });
      } else {
        toast({ title: t.books.bookUpdated });
      }
      setEditingBook(null);
    } catch {
      toast({ title: t.books.failedToUpdate, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteBook.mutateAsync(deleteConfirm.id);
      toast({ title: t.books.bookDeleted });
      setDeleteConfirm(null);
    } catch {
      toast({ title: t.books.failedToDelete, variant: "destructive" });
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
            <h1 className="text-3xl font-bold text-foreground">{t.books.title}</h1>
            <p className="mt-1 text-muted-foreground">
              {t.books.manageCollection}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkAddOpen(true)}>
              <BookCopy className="mr-2 h-4 w-4" />
              {t.bulkAdd?.bulkAddButton || "Add from photo"}
            </Button>
            <Button asChild>
              <Link to="/app/books/new">
                <Plus className="mr-2 h-4 w-4" />
                {t.dashboard.addBook}
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t.books.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookStatus | "all")}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t.books.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.books.allStatuses}</SelectItem>
                <SelectItem value="available">{t.books.available}</SelectItem>
                <SelectItem value="lent_out">{t.books.lentOut}</SelectItem>
                <SelectItem value="reading">{t.books.reading}</SelectItem>
                <SelectItem value="unavailable">{t.books.unavailable}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={shareableFilter} onValueChange={(v) => setShareableFilter(v as "all" | "shareable" | "private")}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.books.allBooks}</SelectItem>
                <SelectItem value="shareable">{t.books.shareable}</SelectItem>
                <SelectItem value="private">{t.books.private}</SelectItem>
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
                    <TableHead>{t.books.titleColumn}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t.books.authorColumn}</TableHead>
                    <TableHead>{t.books.status}</TableHead>
                    <TableHead className="hidden md:table-cell">{t.books.lentToColumn}</TableHead>
                    <TableHead className="text-center">{t.books.shareableColumn}</TableHead>
                    <TableHead className="text-right">{t.books.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredBooks.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {book.cover_url ? (
                            <img
                              src={book.cover_url}
                              alt={book.title}
                              className="h-12 w-9 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="h-12 w-9 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-muted-foreground">📚</span>
                            </div>
                          )}
                          <div>
                            {book.title}
                            {book.author && (
                              <span className="block text-sm text-muted-foreground sm:hidden">
                                {book.author}
                              </span>
                            )}
                          </div>
                        </div>
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
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {book.status === "lent_out" && book.lent_to ? book.lent_to : "—"}
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
                {books?.length === 0 ? t.books.noBooks : t.books.noBooksMatch}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {books?.length === 0
                  ? t.dashboard.startBuilding
                  : t.books.adjustFilters}
              </p>
              {books?.length === 0 && (
                <Button asChild className="mt-4">
                  <Link to="/app/books/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {t.books.addFirstBook}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingBook} onOpenChange={(open) => !open && setEditingBook(null)}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t.common.editBook}</DialogTitle>
            <DialogDescription>{t.common.updateBookDetails}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title">{t.common.title}</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-author">{t.common.author}</Label>
              <Input
                id="edit-author"
                value={editAuthor}
                onChange={(e) => setEditAuthor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-isbn">{t.common.isbn}</Label>
              <Input
                id="edit-isbn"
                value={editIsbn}
                onChange={(e) => setEditIsbn(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">{t.common.notes}</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.common.status}</Label>
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
            {editStatus === "lent_out" && (
              <div className="space-y-2">
                <Label htmlFor="edit-lent-to">{t.books.lentToColumn}</Label>
                <Input
                  id="edit-lent-to"
                  value={editLentTo}
                  onChange={(e) => setEditLentTo(e.target.value)}
                  placeholder={t.common.lentToPlaceholder}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="edit-shareable"
                checked={editShareable}
                onCheckedChange={setEditShareable}
              />
              <Label htmlFor="edit-shareable">{t.common.shareableWithFriends}</Label>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditingBook(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleEditSubmit} disabled={updateBook.isPending}>
              {t.common.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.common.deleteBook}</DialogTitle>
            <DialogDescription>
              {t.common.deleteBookConfirm} "{deleteConfirm?.title}"? {t.common.cannotBeUndone}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              {t.common.cancel}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteBook.isPending}>
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
