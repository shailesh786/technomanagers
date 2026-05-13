import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { QuestionAccessProvider } from "@/contexts/QuestionAccessContext";
import SignInGateModal from "@/components/questions/SignInGateModal";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Home from "./pages/Home";
import { AdminRoute } from "@/components/auth/ProtectedRoute";

// Lazy-load non-home routes to reduce initial JS bundle size
const Questions = lazy(() => import("./pages/Questions"));
const QuestionDetail = lazy(() => import("./pages/QuestionDetail"));
const Courses = lazy(() => import("./pages/Courses"));
const Coaching = lazy(() => import("./pages/Coaching"));
const Events = lazy(() => import("./pages/Events"));
const Cohort = lazy(() => import("./pages/Cohort"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <AuthProvider>
      <QuestionAccessProvider>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">
            <Suspense
              fallback={
                <div className="container py-10 space-y-4 animate-pulse">
                  <div className="h-8 w-1/3 bg-muted rounded" />
                  <div className="h-4 w-2/3 bg-muted rounded" />
                  <div className="h-64 w-full bg-muted rounded-xl" />
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/questions" element={<Questions />} />
                <Route path="/questions/:id" element={<QuestionDetail />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/coaching" element={<Coaching />} />
                <Route path="/events" element={<Events />} />
                <Route path="/cohort" element={<Cohort />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin/*" element={<AdminRoute><Admin /></AdminRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
          {!isAdminRoute && <Footer />}
          <SignInGateModal />
        </div>
      </QuestionAccessProvider>
    </AuthProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
