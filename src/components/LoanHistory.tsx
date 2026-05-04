import { useState } from "react";
import { Plus, Trash2, Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLoanHistory, useCreateLoanRecord, useUpdateLoanRecord, useDeleteLoanRecord, LoanRecord } from "@/hooks/useLoanHistory";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  bookId: string;
  libraryId: string;
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function fromDateInput(date: string): string {
  return new Date(date + "T12:00:00").toISOString();
}

export function LoanHistory({ bookId, libraryId }: Props) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { data: records, isLoading } = useLoanHistory(bookId);
  const createRec = useCreateLoanRecord();
  const updateRec = useUpdateLoanRecord();
  const deleteRec = useDeleteLoanRecord();

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [borrower, setBorrower] = useState("");
  const [lentAt, setLentAt] = useState(toDateInput(new Date().toISOString()));
  const [returnedAt, setReturnedAt] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setBorrower("");
    setLentAt(toDateInput(new Date().toISOString()));
    setReturnedAt("");
    setNotes("");
  };

  const startAdd = () => {
    resetForm();
    setEditingId(null);
    setAdding(true);
  };

  const startEdit = (r: LoanRecord) => {
    setBorrower(r.borrower_name);
    setLentAt(toDateInput(r.lent_at));
    setReturnedAt(toDateInput(r.returned_at));
    setNotes(r.notes || "");
    setEditingId(r.id);
    setAdding(false);
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    resetForm();
  };

  const save = async () => {
    if (!borrower.trim() || !lentAt) {
      toast({ title: t.loanHistory.borrowerAndDateRequired, variant: "destructive" });
      return;
    }
    try {
      if (editingId) {
        await updateRec.mutateAsync({
          id: editingId,
          book_id: bookId,
          borrower_name: borrower.trim(),
          lent_at: fromDateInput(lentAt),
          returned_at: returnedAt ? fromDateInput(returnedAt) : null,
          notes: notes.trim() || null,
        });
      } else {
        await createRec.mutateAsync({
          book_id: bookId,
          library_id: libraryId,
          borrower_name: borrower.trim(),
          lent_at: fromDateInput(lentAt),
          returned_at: returnedAt ? fromDateInput(returnedAt) : null,
          notes: notes.trim() || null,
        });
      }
      cancel();
      toast({ title: t.loanHistory.saved });
    } catch {
      toast({ title: t.loanHistory.saveFailed, variant: "destructive" });
    }
  };

  const markReturned = async (r: LoanRecord) => {
    try {
      await updateRec.mutateAsync({
        id: r.id,
        book_id: bookId,
        returned_at: new Date().toISOString(),
      });
      toast({ title: t.loanHistory.markedReturned });
    } catch {
      toast({ title: t.loanHistory.saveFailed, variant: "destructive" });
    }
  };

  const remove = async (r: LoanRecord) => {
    try {
      await deleteRec.mutateAsync({ id: r.id, book_id: bookId });
      toast({ title: t.loanHistory.deleted });
    } catch {
      toast({ title: t.loanHistory.saveFailed, variant: "destructive" });
    }
  };

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US") : "—";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base">{t.loanHistory.title}</Label>
        {!adding && !editingId && (
          <Button type="button" size="sm" variant="outline" onClick={startAdd}>
            <Plus className="mr-1 h-3 w-3" /> {t.loanHistory.addEntry}
          </Button>
        )}
      </div>

      {(adding || editingId) && (
        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="space-y-1">
            <Label htmlFor="lh-borrower" className="text-xs">{t.loanHistory.borrower}</Label>
            <Input id="lh-borrower" value={borrower} onChange={(e) => setBorrower(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="lh-lent" className="text-xs">{t.loanHistory.lentAt}</Label>
              <Input id="lh-lent" type="date" value={lentAt} onChange={(e) => setLentAt(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lh-ret" className="text-xs">{t.loanHistory.returnedAt}</Label>
              <Input id="lh-ret" type="date" value={returnedAt} onChange={(e) => setReturnedAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="lh-notes" className="text-xs">{t.loanHistory.notes}</Label>
            <Textarea id="lh-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={cancel}>{t.loanHistory.cancel}</Button>
            <Button type="button" size="sm" onClick={save}>{t.loanHistory.save}</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t.loanHistory.loading}</p>
      ) : !records || records.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.loanHistory.empty}</p>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => (
            <li key={r.id} className="rounded-md border border-border bg-card p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.borrower_name}</span>
                    {r.returned_at ? (
                      <Badge variant="secondary">{t.loanHistory.returned}</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        {t.loanHistory.active}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {fmt(r.lent_at)} → {fmt(r.returned_at)}
                  </div>
                  {r.notes && <div className="mt-1 text-xs text-muted-foreground">{r.notes}</div>}
                </div>
                <div className="flex shrink-0 gap-1">
                  {!r.returned_at && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => markReturned(r)} title={t.loanHistory.markReturned}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(r)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LoanHistory;