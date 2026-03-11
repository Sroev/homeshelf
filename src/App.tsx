import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/app/Dashboard";
import Profile from "./pages/app/Profile";
import Books from "./pages/app/Books";
import NewBook from "./pages/app/NewBook";
import Share from "./pages/app/Share";
import Requests from "./pages/app/Requests";
import SharedLibrary from "./pages/SharedLibrary";
import Admin from "./pages/app/Admin";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/s/:token" element={<SharedLibrary />} />
            
            {/* Protected app routes */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/books"
              element={
                <ProtectedRoute>
                  <Books />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/books/new"
              element={
                <ProtectedRoute>
                  <NewBook />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/share"
              element={
                <ProtectedRoute>
                  <Share />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/requests"
              element={
                <ProtectedRoute>
                  <Requests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            
            {/* Redirects */}
            <Route path="/" element={<Landing />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
