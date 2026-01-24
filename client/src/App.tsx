import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { CustomCursor } from "@/components/custom-cursor";
import { ParticleBackground } from "@/components/particle-background";
import { Navigation } from "@/components/navigation";
import { InteractiveTerminal } from "@/components/terminal";
import { EasterEggs } from "@/components/easter-eggs";
import { CustomContextMenu } from "@/components/custom-context-menu";
import Home from "@/pages/home";

const AdminLayout = lazy(() => import("@/components/admin-layout").then((m) => ({ default: m.AdminLayout })));
const AdminLogin = lazy(() => import("@/pages/admin/login"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminLeads = lazy(() => import("@/pages/admin/leads"));
const AdminAnalytics = lazy(() => import("@/pages/admin/analytics"));
const AdminProjects = lazy(() => import("@/pages/admin/projects"));
const NotFound = lazy(() => import("@/pages/not-found"));

function RouteFallback() {
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin/login">
        <Suspense fallback={<RouteFallback />}>
          <AdminLogin />
        </Suspense>
      </Route>
      <Route path="/admin">
        <Suspense fallback={<RouteFallback />}>
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </Suspense>
      </Route>
      <Route path="/admin/leads">
        <Suspense fallback={<RouteFallback />}>
          <AdminLayout>
            <AdminLeads />
          </AdminLayout>
        </Suspense>
      </Route>
      <Route path="/admin/analytics">
        <Suspense fallback={<RouteFallback />}>
          <AdminLayout>
            <AdminAnalytics />
          </AdminLayout>
        </Suspense>
      </Route>
      <Route path="/admin/projects">
        <Suspense fallback={<RouteFallback />}>
          <AdminLayout>
            <AdminProjects />
          </AdminLayout>
        </Suspense>
      </Route>
      <Route>
        <Suspense fallback={<RouteFallback />}>
          <NotFound />
        </Suspense>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Switch>
            <Route path="/admin/:rest*">
              <Router />
              <Toaster />
            </Route>
            <Route>
              <CustomCursor />
              <ParticleBackground />
              <Navigation />
              <main className="relative">
                <Router />
              </main>
              <InteractiveTerminal />
              <EasterEggs />
              <CustomContextMenu />
              <Toaster />
            </Route>
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
