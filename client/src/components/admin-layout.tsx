import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  FolderOpen, 
  LogOut, 
  Menu,
  X
} from "lucide-react";
import { isAuthenticated, removeAuthToken } from "@/lib/auth";
import { AdminNotifications } from "@/components/admin-notifications";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  // Check authentication on mount and when location changes
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsAuth(authenticated);
      
      if (!authenticated && location !== "/admin/login") {
        setLocation("/admin/login");
      }
    };

    checkAuth();
    
    // Also check on storage changes (e.g., token removed in another tab)
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [location, setLocation]);

  const handleLogout = () => {
    removeAuthToken();
    setIsAuth(false);
    setLocation("/admin/login");
  };

  // Show loading while checking auth
  if (isAuth === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuth) {
    return null;
  }

  const navItems = [
    { href: "/admin/dashboard", label: "Дашборд", icon: LayoutDashboard },
    { href: "/admin/leads", label: "Заявки", icon: Users },
    { href: "/admin/analytics", label: "Аналитика", icon: BarChart3 },
    { href: "/admin/projects", label: "Портфолио", icon: FolderOpen },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b p-4 flex items-center justify-between">
        <h1 className="font-semibold">Админ-панель</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          data-testid="button-mobile-menu"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r transform transition-transform md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b">
          <h1 className="font-semibold text-lg">Админ-панель</h1>
          <p className="text-sm text-muted-foreground">Управление сайтом</p>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const isLeads = item.href === "/admin/leads";
            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => {
                  setLocation(item.href);
                  setSidebarOpen(false);
                }}
                data-testid={`nav-${item.href.split("/").pop()}`}
              >
                <div className="relative">
                  <item.icon className="h-4 w-4" />
                  {isLeads && (
                    <span className="absolute -top-1 -right-1">
                      <AdminNotifications />
                    </span>
                  )}
                </div>
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground mt-1"
            onClick={() => setLocation("/")}
            data-testid="button-to-site"
          >
            На сайт
          </Button>
        </div>
      </aside>

      <main className="md:ml-64 pt-16 md:pt-0">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
