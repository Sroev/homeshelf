import { Navigate } from "react-router-dom";
import { Users, Book, MessageSquare, Clock, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsAdmin, useAdminStats } from "@/hooks/useAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function Admin() {
  const { t } = useLanguage();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { data: stats, isLoading: isStatsLoading } = useAdminStats();

  // Show loading while checking admin status
  if (isAdminLoading) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Redirect non-admins
  if (!isAdmin) {
    return <Navigate to="/app" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.admin.title}</h1>
          <p className="mt-1 text-muted-foreground">{t.admin.description}</p>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.admin.totalUsers}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.overview.totalUsers || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">{t.admin.registeredUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.admin.totalBooks}</CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.overview.totalBooks || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">{t.admin.acrossAllLibraries}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.admin.totalRequests}</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.overview.totalRequests || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">{t.admin.allTimeRequests}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.admin.pendingRequests}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.overview.pendingRequests || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">{t.admin.awaitingResponse}</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t.admin.userStatistics}
            </CardTitle>
            <CardDescription>{t.admin.detailedBreakdown}</CardDescription>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.admin.user}</TableHead>
                      <TableHead className="text-center">{t.admin.joined}</TableHead>
                      <TableHead className="text-center">{t.admin.booksColumn}</TableHead>
                      <TableHead className="text-center">{t.admin.availableColumn}</TableHead>
                      <TableHead className="text-center">{t.admin.lentColumn}</TableHead>
                      <TableHead className="text-center">{t.admin.requestsColumn}</TableHead>
                      <TableHead className="text-center">{t.admin.pendingColumn}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.users.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">{user.display_name}</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {format(new Date(user.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{user.total_books}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-accent text-accent-foreground">
                            {user.available_books}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            {user.lent_out_books}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{user.total_requests}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {user.pending_requests > 0 ? (
                            <Badge className="bg-primary">{user.pending_requests}</Badge>
                          ) : (
                            <Badge variant="outline">0</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!stats?.users || stats.users.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {t.admin.noUsers}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
