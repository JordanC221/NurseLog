import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import LogSkill from '@/pages/LogSkill';
import Details from '@/pages/Details';
import Hours from '@/pages/Hours';
import Dashboard from '@/pages/Dashboard';
import Reports from '@/pages/Reports';
import History from '@/pages/History';
import Settings from '@/pages/Settings';
import Study from '@/pages/Study';
import StudyFlashcards from '@/pages/StudyFlashcards';
import StudyExam from '@/pages/StudyExam';
import StudyMatch from '@/pages/StudyMatch';
import StudyMaterials from '@/pages/StudyMaterials';
import StudyCases from '@/pages/StudyCases';
import CaseStudyDetail from '@/pages/CaseStudyDetail';
import Schedule from '@/pages/Schedule';
import Checklist from '@/pages/Checklist';
import { Navigate } from 'react-router-dom';
import Mfa from '@/pages/Mfa';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/log" element={<LogSkill />} />
          <Route path="/details" element={<Details />} />
          <Route path="/hours" element={<Hours />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/mfa" element={<Mfa />} />
          <Route path="/study" element={<Study />} />
          <Route path="/study/flashcards" element={<StudyFlashcards />} />
          <Route path="/study/exam" element={<StudyExam />} />
          <Route path="/study/match" element={<StudyMatch />} />
          <Route path="/study/materials" element={<StudyMaterials />} />
          <Route path="/study/cases" element={<StudyCases />} />
          <Route path="/study/cases/:id" element={<CaseStudyDetail />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/checklist" element={<Checklist />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App