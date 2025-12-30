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
import { AdminLayout } from "@/components/admin-layout";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminLeads from "@/pages/admin/leads";
import AdminAnalytics from "@/pages/admin/analytics";
import AdminProjects from "@/pages/admin/projects";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin">
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      </Route>
      <Route path="/admin/leads">
        <AdminLayout>
          <AdminLeads />
        </AdminLayout>
      </Route>
      <Route path="/admin/analytics">
        <AdminLayout>
          <AdminAnalytics />
        </AdminLayout>
      </Route>
      <Route path="/admin/projects">
        <AdminLayout>
          <AdminProjects />
        </AdminLayout>
      </Route>
      <Route component={NotFound} />
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
