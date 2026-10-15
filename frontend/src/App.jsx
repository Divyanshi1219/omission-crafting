import { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import AllEmployees from "./pages/AllEmployees";
import OrderManagement from "./pages/OrderManagement";
import Login from "./pages/Login";
import { AuthProvider } from "./context/AuthContext";

import "./App.css";

function AppContent({ darkMode, setDarkMode }) {
  const location = useLocation();
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
              element={<AllEmployees />}
            />

            <Route
              path="/order/*"
              element={<OrderManagement />}
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