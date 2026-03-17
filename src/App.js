import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdvanceProvider, useAdvance } from './contexts/AdvanceContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Sidebar from './components/Sidebar/Sidebar';
import Navbar from './components/Navbar/Navbar';
import Dashboard from './pages/Dashboard';
import Stocks from './pages/Stocks';
import Employees from './pages/Employees';
import Supervisors from './pages/Supervisors';
import Companies from './pages/Companies';
import Salary from './pages/Salary';
import Attendance from './pages/Attendance';
import MarkAttendance from './pages/MarkAttendance';
// import Forms from './pages/Forms';
import Settings from './pages/Settings';
import SalaryBilling from './pages/SalaryBilling';
import SalaryBillingDiagnostic from './pages/SalaryBillingDiagnostic';
import SalaryReports from './pages/SalaryReports';
import ErrorBoundary from './components/ErrorBoundary';
import BillingPage from "./pages/BillingPage";
import IssueItems from './pages/IssueItems';
import AdvanceManagement from './pages/AdvanceManagement';
import Events from './pages/Events';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <AuthProvider>
      <AdvanceProvider>
        <NotificationProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppRoutes />
          </Router>
        </NotificationProvider>
      </AdvanceProvider>
    </AuthProvider>
  );
}

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

// Main App Routes Component
const AppRoutes = () => {
  const { user } = useAuth();
  const { advanceData } = useAdvance();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <AdminLogin />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              <Sidebar isOpen={true} toggleSidebar={() => { }} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar toggleSidebar={() => { }} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
                  <Dashboard />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      {/* Default route redirects to login for non-authenticated users */}
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />

      <Route
        path="/stocks"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50">
              <Sidebar isOpen={true} toggleSidebar={() => { }} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar toggleSidebar={() => { }} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                  <Stocks />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employees"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50">
              <Sidebar isOpen={true} toggleSidebar={() => { }} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar toggleSidebar={() => { }} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                  <Employees />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/supervisors"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50">
              <Sidebar isOpen={true} toggleSidebar={() => { }} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar toggleSidebar={() => { }} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                  <Supervisors />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/companies"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50">
              <Sidebar isOpen={true} toggleSidebar={() => { }} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar toggleSidebar={() => { }} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                  <Companies />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/salary"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50">
              <Sidebar isOpen={true} toggleSidebar={() => { }} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar toggleSidebar={() => { }} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                  <Salary />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50">
              <Sidebar isOpen={true} toggleSidebar={() => { }} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar toggleSidebar={() => { }} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                  <Attendance />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/mark-attendance"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50">
              <Sidebar isOpen={true} toggleSidebar={() => { }} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar toggleSidebar={() => { }} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                  <MarkAttendance />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/salary-billing"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50">
              <Sidebar isOpen={true} toggleSidebar={() => { }} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar toggleSidebar={() => { }} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                  <ErrorBoundary>
                    <SalaryBilling />
                  </ErrorBoundary>
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/salary-reports"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50">
              <Sidebar isOpen={true} toggleSidebar={() => { }} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar toggleSidebar={() => { }} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                  <SalaryReports />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50">
              <Sidebar isOpen={true} toggleSidebar={() => { }} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar toggleSidebar={() => { }} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                  <BillingPage />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/issue-items"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50">
              <Sidebar isOpen={true} toggleSidebar={() => { }} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar toggleSidebar={() => { }} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                  <IssueItems />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/advance-management"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50">
              <Sidebar isOpen={true} toggleSidebar={() => { }} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar toggleSidebar={() => { }} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                  <AdvanceManagement />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/events"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50">
              <Sidebar isOpen={true} toggleSidebar={() => { }} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar toggleSidebar={() => { }} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                  <Events />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50">
              <Sidebar isOpen={true} toggleSidebar={() => { }} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar toggleSidebar={() => { }} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                  <Settings />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
