import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import AllEmployees from "./pages/AllEmployees";
import OrderManagement from "./pages/OrderManagement";

import "./App.css";

function App() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <BrowserRouter>

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

            </Routes>

          </main>

        </div>

      </div>

    </BrowserRouter>
  );
}

export default App;