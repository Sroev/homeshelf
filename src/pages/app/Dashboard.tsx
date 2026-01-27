import { Link } from "react-router-dom";
import { Book, Link2, MessageSquare, Plus } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useBooks } from "@/hooks/useBooks";
import { usePendingRequestsCount } from "@/hooks/useRequests";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Dashboard() {
  const { data: profile } = useProfile();
  const { data: books } = useBooks();
  const { data: pendingCount } = usePendingRequestsCount();

  const bookCount = books?.length || 0;
  const availableCount = books?.filter(b => b.status === "available").length || 0;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {profile?.display_name || "Book Lover"}!
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your personal library and share it with friends.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Books</CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookCount}</div>
              <p className="text-xs text-muted-foreground">
                {availableCount} available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Waiting for your response
              </p>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Share Status</CardTitle>
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground">
                Friends can browse your library
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to manage your library</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/app/books/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Book
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/share">
                <Link2 className="mr-2 h-4 w-4" />
                Manage Share Link
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/requests">
                <MessageSquare className="mr-2 h-4 w-4" />
                View Requests
                {pendingCount && pendingCount > 0 && (
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
              <h3 className="mt-4 text-lg font-semibold">No books yet</h3>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                Start building your library by adding your first book.
              </p>
              <Button asChild className="mt-4">
                <Link to="/app/books/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Book
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
