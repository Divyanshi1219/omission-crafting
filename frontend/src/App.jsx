import { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import AllEmployees from "./pages/AllEmployees";
import OrderManagement from "./pages/OrderManagement";
import InvoicesList from "./pages/Invoices/InvoicesList";
import CreateInvoice from "./pages/Invoices/CreateInvoice";
import TasksPage from "./pages/Tasks/TasksPage";
import Approvals from "./pages/Approvals";
import LeadApprovals from "./pages/LeadApprovals";
import Login from "./pages/Login";
import DemoIdeasPage from "./pages/DemoIdeasPage"; // TEMP demo page ideas (delete after client approves)
import { AuthProvider, useAuth } from "./context/AuthContext";

import "./App.css";

function AppContent({ darkMode, setDarkMode }) {
  const location = useLocation();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.id === "admin";
  const isSales = currentUser?.role === "Sales Executive" || currentUser?.id?.startsWith("sales");
  const isLeadManager =
    currentUser?.id === "lead_manager" ||
    Boolean(currentUser?.role && currentUser.role.toLowerCase() === "lead manager");
  const isSalesOrAdmin = isSales || currentUser?.id === "admin" || isLeadManager;
  const isTaskUser =
    currentUser?.id === "stock" ||
    currentUser?.id === "production" ||
    currentUser?.id === "admin" ||
    Boolean(currentUser?.role && (currentUser.role.toLowerCase().includes("stock") || (currentUser.role.toLowerCase().includes("production") && !currentUser.role.toLowerCase().includes("lead manager"))));
  const isLoginPage = location.pathname === "/login";

  if (isLoginPage) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<Login darkMode={darkMode} setDarkMode={setDarkMode} />}
        />
      </Routes>
    );
  }

  return (
    <div className={`app ${darkMode ? "dark" : "light"}`}>
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <div className="app-body">
        <Sidebar />

        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/employees"
              element={isAdmin ? <AllEmployees /> : <Navigate to="/" replace />}
            />

            <Route
              path="/order/*"
              element={<OrderManagement />}
            />

            <Route
              path="/invoices"
              element={isSalesOrAdmin ? <InvoicesList /> : <Navigate to="/" replace />}
            />

            <Route
              path="/invoices/create"
              element={isSalesOrAdmin ? <CreateInvoice /> : <Navigate to="/" replace />}
            />

            {/* TEMP demo page ideas (mock UI concepts — not connected to app data) */}
            <Route
              path="/demo-ideas"
              element={<DemoIdeasPage />}
            />

            <Route
              path="/tasks"
              element={isTaskUser ? <Navigate to="/tasks/all" replace /> : <Navigate to="/" replace />}
            />

            <Route
              path="/tasks/all"
              element={isTaskUser ? <Approvals /> : <Navigate to="/" replace />}
            />

            <Route
              path="/tasks/:status"
              element={isTaskUser ? <Approvals /> : <Navigate to="/" replace />}
            />

            <Route
              path="/approvals"
              element={
                (isLeadManager || isAdmin) ? (
                  <LeadApprovals />
                ) : isTaskUser ? (
                  <Navigate to="/tasks/all" replace />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/login"
              element={<Login darkMode={darkMode} setDarkMode={setDarkMode} />}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent darkMode={darkMode} setDarkMode={setDarkMode} />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;