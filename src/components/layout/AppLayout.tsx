import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Link2, MessageSquare, User, LogOut, Menu, Book } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfile } from "@/hooks/useProfile";
import { usePendingRequestsCount } from "@/hooks/useRequests";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const { data: pendingCount } = usePendingRequestsCount();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/app", label: t.nav.dashboard, icon: Home },
    { href: "/app/books", label: t.nav.books, icon: Book },
    { href: "/app/share", label: t.nav.shareLink, icon: Link2 },
    { href: "/app/requests", label: t.nav.requests, icon: MessageSquare },
    { href: "/app/profile", label: t.nav.profile, icon: User },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const NavContent = () => (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        const Icon = item.icon;
        const showBadge = item.href === "/app/requests" && !!pendingCount && pendingCount > 0;
        
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
            {showBadge && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-sidebar p-4 md:flex">
        <div className="mb-6 px-3">
          <Link to="/app">
            <span className="text-3xl font-semibold text-foreground" style={{ fontFamily: "'Source Serif 4', serif" }}>Runo</span>
          </Link>
        </div>
        
        <NavContent />
        
        <div className="mt-auto space-y-4 pt-4">
          {profile && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium text-foreground">{profile.display_name}</p>
              {profile.city && (
                <p className="text-xs text-muted-foreground">{profile.city}</p>
              )}
            </div>
          )}
          <LanguageToggle />
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            {t.nav.signOut}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-sidebar px-4 md:hidden">
          <Link to="/app" className="flex items-center">
            <span className="text-xl font-semibold text-foreground" style={{ fontFamily: "'Source Serif 4', serif" }}>Runo</span>
          </Link>
          
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 bg-sidebar p-4">
              <div className="mb-6">
                <span className="text-lg font-bold text-foreground">{t.nav.menu}</span>
              </div>
              
              <NavContent />
              
              <div className="mt-8 space-y-4">
                {profile && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm font-medium text-foreground">{profile.display_name}</p>
                    {profile.city && (
                      <p className="text-xs text-muted-foreground">{profile.city}</p>
                    )}
                  </div>
                )}
                <LanguageToggle />
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  {t.nav.signOut}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
