import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { CustomCursor } from "@/components/custom-cursor";
import { AnimatedBackground } from "@/components/animated-background";
import { ParticleBackground } from "@/components/particle-background";
import { Navigation } from "@/components/navigation";
import { InteractiveTerminal } from "@/components/terminal";
import { EasterEggs } from "@/components/easter-eggs";
import { CustomContextMenu } from "@/components/custom-context-menu";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
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
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
