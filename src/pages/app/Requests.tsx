import { useState, useMemo } from "react";
import { MessageSquare, Check, X, Users } from "lucide-react";
import { useRequests, useUpdateRequest, RequestWithBook } from "@/hooks/useRequests";
import { useUpdateBook } from "@/hooks/useBooks";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type RequestStatus = Database["public"]["Enums"]["request_status"];

const statusColors: Record<RequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  declined: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

interface WaitlistGroup {
  bookId: string;
  bookTitle: string;
  bookAuthor: string | null;
  requests: (RequestWithBook & { position: number })[];
}

export default function Requests() {
  const { data: requests, isLoading } = useRequests();
  const updateRequest = useUpdateRequest();
  const updateBook = useUpdateBook();
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const statusLabels: Record<RequestStatus, string> = {
    pending: t.requests.pending,
    approved: t.requests.approved,
    declined: t.requests.declined,
  };

  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [approveDialog, setApproveDialog] = useState<RequestWithBook | null>(null);
  const [markAsLentOut, setMarkAsLentOut] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "waitlist">("all");

  // Filter requests for "All" tab - exclude pending requests for unavailable books (those go to waitlist)
  const filteredRequests = requests?.filter((req) => {
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    
    // Hide pending requests for unavailable books - they belong in waitlist
    const isWaitlistItem = 
      req.status === "pending" && 
      (req.books.status === "lent_out" || req.books.status === "reading" || req.books.status === "unavailable");
    
    return matchesStatus && !isWaitlistItem;
  });

  // Group pending requests by book for waitlist view (only for unavailable books)
  const waitlistGroups = useMemo<WaitlistGroup[]>(() => {
    if (!requests) return [];
    
    const waitlistRequests = requests
      .filter((req) => 
        req.status === "pending" && 
        (req.books.status === "lent_out" || req.books.status === "reading" || req.books.status === "unavailable")
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const groupsMap = new Map<string, WaitlistGroup>();
    
    waitlistRequests.forEach((req) => {
      if (!groupsMap.has(req.book_id)) {
        groupsMap.set(req.book_id, {
          bookId: req.book_id,
          bookTitle: req.books.title,
          bookAuthor: req.books.author,
          requests: [],
        });
      }
      const group = groupsMap.get(req.book_id)!;
      group.requests.push({
        ...req,
        position: group.requests.length + 1,
      });
    });
    
    return Array.from(groupsMap.values());
  }, [requests]);

  const handleApprove = async () => {
    if (!approveDialog) return;

    try {
      await updateRequest.mutateAsync({ 
        id: approveDialog.id, 
        status: "approved",
        sendNotification: true,
      });
      
      if (markAsLentOut) {
        await updateBook.mutateAsync({ id: approveDialog.book_id, status: "lent_out" });
      }

      toast({
        title: t.requests.requestApproved,
        description: `"${approveDialog.books.title}" ${t.requests.requesterNotified}`,
      });
      setApproveDialog(null);
    } catch {
      toast({
        title: t.requests.failedToApprove,
        description: t.share.tryAgain,
        variant: "destructive",
      });
    }
  };

  const handleDecline = async (request: RequestWithBook) => {
    try {
      await updateRequest.mutateAsync({ id: request.id, status: "declined" });
      toast({
        title: t.requests.requestDeclined,
        description: t.requests.declinedDesc,
      });
    } catch {
      toast({
        title: t.requests.failedToDecline,
        description: t.share.tryAgain,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  const waitlistCount = waitlistGroups.reduce((sum, g) => sum + g.requests.length, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t.requests.title}</h1>
            <p className="mt-1 text-muted-foreground">
              {t.requests.manageRequests}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "waitlist")}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="all">{t.requests.allRequests}</TabsTrigger>
              <TabsTrigger value="waitlist" className="gap-2">
                <Users className="h-4 w-4" />
                {t.requests.waitlist}
                {waitlistCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                    {waitlistCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            {activeTab === "all" && (
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RequestStatus | "all")}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t.requests.filter} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.requests.allRequests}</SelectItem>
                  <SelectItem value="pending">{t.requests.pending}</SelectItem>
                  <SelectItem value="approved">{t.requests.approved}</SelectItem>
                  <SelectItem value="declined">{t.requests.declined}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* All Requests Tab */}
          <TabsContent value="all" className="mt-6">
        {filteredRequests && filteredRequests.length > 0 ? (
          <div className="grid gap-4">
            {filteredRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {request.books.title}
                      </CardTitle>
                      {request.books.author && (
                        <CardDescription>{t.common.by} {request.books.author}</CardDescription>
                      )}
                    </div>
                    <Badge className={statusColors[request.status]}>
                      {statusLabels[request.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <span className="font-medium text-muted-foreground">{t.requests.requester}</span>{" "}
                      <span className="text-foreground">{request.requester_name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">{t.requests.email}</span>{" "}
                      <a
                        href={`mailto:${request.requester_email}`}
                        className="text-primary hover:underline"
                      >
                        {request.requester_email}
                      </a>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">{t.requests.date}</span>{" "}
                      <span className="text-foreground">{formatDate(request.created_at)}</span>
                    </div>
                  </div>

                  {request.message && (
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-sm font-medium text-muted-foreground">{t.requests.message}</p>
                      <p className="mt-1 text-sm text-foreground">{request.message}</p>
                    </div>
                  )}

                  {request.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setApproveDialog(request);
                          setMarkAsLentOut(true);
                        }}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        {t.requests.approve}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecline(request)}
                        disabled={updateRequest.isPending}
                      >
                        <X className="mr-2 h-4 w-4" />
                        {t.requests.decline}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t.requests.noRequestsYet}</h3>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {requests?.length === 0
                  ? t.requests.noRequestsDesc
                  : t.requests.noRequestsMatch}
              </p>
            </CardContent>
            </Card>
          )}
          </TabsContent>

          {/* Waitlist Tab */}
          <TabsContent value="waitlist" className="mt-6">
            {waitlistGroups.length > 0 ? (
              <div className="space-y-6">
                {waitlistGroups.map((group) => (
                  <Card key={group.bookId}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{group.bookTitle}</CardTitle>
                      {group.bookAuthor && (
                        <CardDescription>{t.common.by} {group.bookAuthor}</CardDescription>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {group.requests.length} {group.requests.length === 1 ? t.requests.peopleWaiting : t.requests.peopleWaitingPlural}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {group.requests.map((request) => (
                          <div
                            key={request.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                                {request.position}
                              </div>
                              <div>
                                <p className="font-medium">{request.requester_name}</p>
                                <a
                                  href={`mailto:${request.requester_email}`}
                                  className="text-sm text-muted-foreground hover:text-primary"
                                >
                                  {request.requester_email}
                                </a>
                                <p className="text-xs text-muted-foreground">
                                  {t.requests.requested} {formatDate(request.created_at)}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setApproveDialog(request);
                                  setMarkAsLentOut(true);
                                }}
                              >
                                <Check className="mr-1 h-3 w-3" />
                                {t.requests.approve}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDecline(request)}
                                disabled={updateRequest.isPending}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">{t.requests.noWaitlists}</h3>
                  <p className="mt-1 text-center text-sm text-muted-foreground">
                    {t.requests.noWaitlistsDesc}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Dialog */}
      <Dialog open={!!approveDialog} onOpenChange={(open) => !open && setApproveDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.requests.approveRequest}</DialogTitle>
            <DialogDescription>
              {t.requests.approveRequestDesc} {approveDialog?.requester_name} {t.requests.for} "{approveDialog?.books.title}"?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-2">
            <Checkbox
              id="lent-out"
              checked={markAsLentOut}
              onCheckedChange={(checked) => setMarkAsLentOut(checked === true)}
            />
            <label htmlFor="lent-out" className="text-sm">
              {t.requests.markAsLentOut}
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleApprove} disabled={updateRequest.isPending}>
              {t.requests.approve}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
