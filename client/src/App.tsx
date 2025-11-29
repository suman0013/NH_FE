import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/AppLayout";
import ScrollToTop from "@/components/ScrollToTop";
import Dashboard from "@/pages/Dashboard";
import Namhattas from "@/pages/Namhattas";
import NamhattaDetail from "@/pages/NamhattaDetail";
import Devotees from "@/pages/Devotees";
import DevoteeDetail from "@/pages/DevoteeDetail";
import { logApiConfig } from "@/lib/api-config";

import Statuses from "@/pages/Statuses";
import Shraddhakutirs from "@/pages/Shraddhakutirs";
import NamhattaApprovals from "@/pages/NamhattaApprovals";
import Updates from "@/pages/Updates";
import Health from "@/pages/Health";
import About from "@/pages/About";
import Map from "@/pages/Map";
import More from "@/pages/More";
import Hierarchy from "@/pages/Hierarchy";
import Reports from "@/pages/Reports";
import AdminSupervisorRegistration from "@/pages/AdminSupervisorRegistration";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/namhattas" component={Namhattas} />
      <Route path="/namhattas/:id" component={NamhattaDetail} />
      <Route path="/devotees" component={Devotees} />
      <Route path="/devotees/:id" component={DevoteeDetail} />
      <Route path="/approvals" component={NamhattaApprovals} />
      <Route path="/statuses" component={Statuses} />
      <Route path="/shraddhakutirs" component={Shraddhakutirs} />
      <Route path="/updates" component={Updates} />
      <Route path="/map" component={Map} />
      <Route path="/hierarchy" component={Hierarchy} />
      <Route path="/reports" component={Reports} />
      <Route path="/admin/register-user" component={AdminSupervisorRegistration} />
      <Route path="/more" component={More} />
      <Route path="/health" component={Health} />
      <Route path="/about" component={About} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Log API configuration on app start
  logApiConfig();
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="namhatta-ui-theme">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <ProtectedRoute>
              <AppLayout>
                <ScrollToTop />
                <Router />
              </AppLayout>
            </ProtectedRoute>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
