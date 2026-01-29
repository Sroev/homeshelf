import { Link } from "react-router-dom";
import { Book, Link2, MessageSquare, Plus, Clock } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useBooks } from "@/hooks/useBooks";
import { usePendingRequestsCount, useWaitlistCount } from "@/hooks/useRequests";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Dashboard() {
  const { data: profile } = useProfile();
  const { data: books } = useBooks();
  const { data: pendingCount } = usePendingRequestsCount();
  const { data: waitlistCount } = useWaitlistCount();
  const { t } = useLanguage();

  const bookCount = books?.length || 0;
  const availableCount = books?.filter(b => b.status === "available").length || 0;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t.dashboard.welcomeBack}, {profile?.display_name || "Book Lover"}!
          </h1>
          <p className="mt-1 text-muted-foreground">
            {t.dashboard.manageLibrary}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.dashboard.totalBooks}</CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookCount}</div>
              <p className="text-xs text-muted-foreground">
                {availableCount} {t.dashboard.available}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.dashboard.pendingRequests}</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                {t.dashboard.waitingForResponse}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.dashboard.waitlistTitle}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{waitlistCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                {t.dashboard.waitlistDesc}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.dashboard.shareStatus}</CardTitle>
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{t.dashboard.active}</div>
              <p className="text-xs text-muted-foreground">
                {t.dashboard.friendsCanBrowse}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.quickActions}</CardTitle>
            <CardDescription>{t.dashboard.commonTasks}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/app/books/new">
                <Plus className="mr-2 h-4 w-4" />
                {t.dashboard.addBook}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/share">
                <Link2 className="mr-2 h-4 w-4" />
                {t.dashboard.manageShareLink}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/requests">
                <MessageSquare className="mr-2 h-4 w-4" />
                {t.dashboard.viewRequests}
                {!!pendingCount && pendingCount > 0 && (
                  <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-xs font-semibold">
                    {pendingCount}
                  </span>
                )}
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Empty State */}
        {bookCount === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Book className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t.dashboard.noBooks}</h3>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {t.dashboard.startBuilding}
              </p>
              <Button asChild className="mt-4">
                <Link to="/app/books/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {t.dashboard.addFirstBook}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
