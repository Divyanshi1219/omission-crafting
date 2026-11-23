import { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import CoordinatorDashboard from "./pages/CoordinatorDashboard";
import AllEmployees from "./pages/AllEmployees";
import OrderManagement from "./pages/OrderManagement";
import InvoicesList from "./pages/Invoices/InvoicesList";
import CreateInvoice from "./pages/Invoices/CreateInvoice";
import Approvals from "./pages/Approvals";
import LeadApprovals from "./pages/LeadApprovals";
import ItemConsole from "./pages/ItemConsole";
import RoleManagement from "./pages/RoleManagement";
import StockRoom from "./pages/StockRoom/StockRoom";
import OrderTableView from "./pages/OrderTableView";
import SalesOrdersBreakdown from "./pages/SalesOrdersBreakdown";
import PendingPaymentsPage from "./pages/PendingPaymentsPage";
import Login from "./pages/Login";
import DemoIdeasPage from "./pages/DemoIdeasPage"; // TEMP demo page ideas (delete after client approves)
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PermissionProvider, usePermissions } from "./context/PermissionContext";

import "./App.css";

function AppContent({ darkMode, setDarkMode }) {
  const location = useLocation();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.id === "admin";
  const isSales =
    currentUser?.role === "Sales Executive" ||
    currentUser?.id?.startsWith("sales") ||
    (currentUser?.department || "").toLowerCase().includes("sales");
  const isLeadManager =
    currentUser?.id === "lead_manager" ||
    Boolean(currentUser?.role && currentUser.role.toLowerCase() === "lead manager") ||
    Boolean(currentUser?.department && currentUser.department.toLowerCase() === "lead manager");
  const isCoordinator =
    currentUser?.id === "coordinator" ||
    Boolean(currentUser?.role && currentUser.role.toLowerCase() === "coordinator") ||
    Boolean(currentUser?.department && currentUser.department.toLowerCase() === "coordinator");
  const isSalesOrAdmin = isSales || currentUser?.id === "admin" || isLeadManager;
  const isTaskUser =
    currentUser?.id === "stock" ||
    currentUser?.id === "production" ||
    currentUser?.id === "admin" ||
    isCoordinator ||
    Boolean(
      currentUser?.role &&
        (currentUser.role.toLowerCase().includes("stock") ||
          (currentUser.role.toLowerCase().includes("production") && !currentUser.role.toLowerCase().includes("lead manager")))
    ) ||
    Boolean(
      currentUser?.department &&
        (currentUser.department.toLowerCase().includes("stock") ||
          (currentUser.department.toLowerCase().includes("production") && !currentUser.department.toLowerCase().includes("lead manager")))
    );
  const isOnlyStockRoomUser =
    (currentUser?.id === "stock" ||
      currentUser?.role === "Stock Room Manager" ||
      Boolean(currentUser?.role && currentUser.role.toLowerCase().includes("stock"))) &&
    currentUser?.id !== "admin" &&
    currentUser?.role !== "CEO";

  const { canAccessMenu, isSuperAdmin } = usePermissions();
  const canAccessInvoices = isSalesOrAdmin || canAccessMenu('invoices');
  const canAccessStock = isOnlyStockRoomUser || isAdmin || canAccessMenu('stockRoom');
  const canAccessApprovals = isLeadManager || isAdmin || canAccessMenu('approvals');
  const canAccessEmployees = isAdmin || canAccessMenu('employees');
  const canAccessTasks = isTaskUser || canAccessMenu('tasks');
  const canAccessConsole = isSuperAdmin || canAccessMenu('console');

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
              element={isCoordinator ? <CoordinatorDashboard /> : <Dashboard key={currentUser?.id || "default"} />}
            />

            <Route
              path="/coordinator"
              element={<CoordinatorDashboard />}
            />

            <Route
              path="/employees"
              element={canAccessEmployees ? <AllEmployees /> : <Navigate to="/" replace />}
            />

            <Route
              path="/console"
              element={canAccessConsole ? <ItemConsole /> : <Navigate to="/" replace />}
            />

            <Route
              path="/console/items"
              element={canAccessConsole ? <ItemConsole /> : <Navigate to="/" replace />}
            />

            <Route
              path="/console/roles"
              element={canAccessConsole ? <RoleManagement /> : <Navigate to="/" replace />}
            />

            <Route
              path="/console/role"
              element={canAccessConsole ? <RoleManagement /> : <Navigate to="/" replace />}
            />

            <Route
              path="/stock-room"
              element={canAccessStock ? <StockRoom /> : <Navigate to="/" replace />}
            />

            <Route
              path="/stock-room/view/:type"
              element={<StockRoom isTableViewOnly={true} />}
            />

            <Route
              path="/dashboard/view/:type"
              element={<StockRoom isTableViewOnly={true} />}
            />

            <Route
              path="/orders/view/:stage"
              element={<OrderTableView />}
            />

            <Route
              path="/dashboard/orders/view/:stage"
              element={<OrderTableView />}
            />

            <Route
              path="/sales/orders"
              element={<SalesOrdersBreakdown />}
            />

            <Route
              path="/sales-breakdown"
              element={<SalesOrdersBreakdown />}
            />

            <Route
              path="/dashboard/sales-breakdown"
              element={<SalesOrdersBreakdown />}
            />

            <Route
              path="/pending-payments"
              element={<PendingPaymentsPage />}
            />

            <Route
              path="/order/*"
              element={<OrderManagement />}
            />

            <Route
              path="/invoices"
              element={canAccessInvoices ? <InvoicesList /> : <Navigate to="/" replace />}
            />

            <Route
              path="/invoices/create"
              element={canAccessInvoices ? <CreateInvoice /> : <Navigate to="/" replace />}
            />

            {/* TEMP demo page ideas (mock UI concepts — not connected to app data) */}
            <Route
              path="/demo-ideas"
              element={<DemoIdeasPage />}
            />

            <Route
              path="/tasks"
              element={canAccessTasks ? <Navigate to="/tasks/all" replace /> : <Navigate to="/" replace />}
            />

            <Route
              path="/tasks/all"
              element={canAccessTasks ? <Approvals /> : <Navigate to="/" replace />}
            />

            <Route
              path="/tasks/:status"
              element={canAccessTasks ? <Approvals /> : <Navigate to="/" replace />}
            />

            <Route
              path="/tasks/embroidery/:status"
              element={canAccessTasks ? <Approvals /> : <Navigate to="/" replace />}
            />

            <Route
              path="/approvals"
              element={
                canAccessApprovals ? (
                  <LeadApprovals />
                ) : canAccessTasks ? (
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
      <PermissionProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <AppContent darkMode={darkMode} setDarkMode={setDarkMode} />
          </ErrorBoundary>
        </BrowserRouter>
      </PermissionProvider>
    </AuthProvider>
  );
}

export default App;
