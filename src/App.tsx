import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DemoProvider } from "@/contexts/DemoContext";

// Pages
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

// Login Pages
import StudentLogin from "./pages/login/StudentLogin";
import ParentLogin from "./pages/login/ParentLogin";
import TeacherLogin from "./pages/login/TeacherLogin";
import AdminLogin from "./pages/login/AdminLogin";

// Demo Pages
import StudentDemo from "./pages/demo/StudentDemo";
import ParentDemo from "./pages/demo/ParentDemo";
import TeacherDemo from "./pages/demo/TeacherDemo";
import AdminDemo from "./pages/demo/AdminDemo";

// Real Dashboard Pages
import StudentDashboard from "./pages/dashboards/StudentDashboard";
import ParentDashboard from "./pages/dashboards/ParentDashboard";
import TeacherDashboard from "./pages/dashboards/TeacherDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";

// Auth Components
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DemoProvider>
            <Routes>
              {/* Landing Page */}
              <Route path="/" element={<Landing />} />
              
              {/* Login Routes */}
              <Route path="/login/student" element={<StudentLogin />} />
              <Route path="/login/parent" element={<ParentLogin />} />
              <Route path="/login/teacher" element={<TeacherLogin />} />
              <Route path="/login/admin" element={<AdminLogin />} />
              
              {/* Demo Routes */}
              <Route path="/demo/student/*" element={<StudentDemo />} />
              <Route path="/demo/parent/*" element={<ParentDemo />} />
              <Route path="/demo/teacher/*" element={<TeacherDemo />} />
              <Route path="/demo/admin/*" element={<AdminDemo />} />
              
              {/* Protected Dashboard Routes */}
              <Route path="/student/*" element={
                <ProtectedRoute allowedRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              } />
              <Route path="/parent/*" element={
                <ProtectedRoute allowedRole="parent">
                  <ParentDashboard />
                </ProtectedRoute>
              } />
              <Route path="/teacher/*" element={
                <ProtectedRoute allowedRole="teacher">
                  <TeacherDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/*" element={
                <ProtectedRoute allowedRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DemoProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
