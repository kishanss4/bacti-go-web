import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/app/DashboardPage";
import PatientsPage from "./pages/app/PatientsPage";
import NewPatientPage from "./pages/app/NewPatientPage";
import PatientDetailPage from "./pages/app/PatientDetailPage";
import EditPatientPage from "./pages/app/EditPatientPage";
import LabReportsPage from "./pages/app/LabReportsPage";
import NewLabReportPage from "./pages/app/NewLabReportPage";
import LabReportDetailPage from "./pages/app/LabReportDetailPage";
import PrescriptionsPage from "./pages/app/PrescriptionsPage";
import NewPrescriptionPage from "./pages/app/NewPrescriptionPage";
import PrescriptionDetailPage from "./pages/app/PrescriptionDetailPage";
import GuidelinesPage from "./pages/app/GuidelinesPage";
import AdminPage from "./pages/app/AdminPage";
import AnalyticsPage from "./pages/app/AnalyticsPage";
import ProfilePage from "./pages/app/ProfilePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Auth is now the landing page */}
          <Route path="/" element={<Auth />} />
          
          {/* Redirect /auth to / for backwards compatibility */}
          <Route path="/auth" element={<Navigate to="/" replace />} />
          
          {/* Protected App Routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/new" element={<NewPatientPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />
            <Route path="/patients/:id/edit" element={<EditPatientPage />} />
            <Route path="/lab-reports" element={<LabReportsPage />} />
            <Route path="/lab-reports/new" element={<NewLabReportPage />} />
            <Route path="/lab-reports/:id" element={<LabReportDetailPage />} />
            <Route path="/prescriptions" element={<PrescriptionsPage />} />
            <Route path="/prescriptions/new" element={<NewPrescriptionPage />} />
            <Route path="/prescriptions/:id" element={<PrescriptionDetailPage />} />
            <Route path="/guidelines" element={<GuidelinesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
