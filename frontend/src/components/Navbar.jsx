import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Sun,
  Moon,
  Settings,
  Bell,
  ChevronDown,
  LogOut,
  LogIn,
  Check,
  ShieldCheck,
} from "lucide-react";
import logoImg from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";

function Navbar({ darkMode, setDarkMode }) {
  const navigate = useNavigate();
  const { currentUser, profiles, switchProfile, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleProfileSwitch = (profileId) => {
    switchProfile(profileId);
    setShowDropdown(false);
  };

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    navigate("/login");
  };

  const handleGoToLogin = () => {
    setShowDropdown(false);
    navigate("/login");
  };

  return (
    <header className="navbar">
      {/* Left Side */}
      <div className="navbar-left">
        <div
          className="navbar-logo"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          <img
            src={logoImg}
            alt="Omission Crafting Logo"
            style={{ height: "55px", objectFit: "contain" }}
          />
        </div>
      </div>

      {/* Center Side */}
      <div className="navbar-center">
        <div className="navbar-search">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Search anything..." />
        </div>
      </div>

      {/* Right Side */}
      <div className="navbar-right">
        {/* Theme */}
        <button
          className={`navbar-icon ${darkMode ? "theme-active" : ""}`}
          title="Change Theme"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Settings */}
        <button className="navbar-icon" title="Settings">
          <Settings size={20} />
        </button>

        {/* Notifications */}
        <button className="navbar-icon notification-button" title="Notifications">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>

        {/* User Profile & Dropdown */}
        <div className="navbar-user-wrapper" ref={dropdownRef}>
          <div
            className="navbar-user"
            onClick={() => setShowDropdown(!showDropdown)}
            title="Click to switch profile or log out"
          >
            <div
              className="user-avatar"
              style={{
                backgroundColor: currentUser.avatarBg,
                color: currentUser.avatarColor,
              }}
            >
              {currentUser.initials}
            </div>

            <div className="user-details">
              <span className="user-name">{currentUser.name}</span>
              <span className="user-role">{currentUser.role}</span>
            </div>

            <ChevronDown
              size={14}
              className={`user-chevron ${showDropdown ? "open" : ""}`}
            />
          </div>

          {/* Interactive Profile Switcher & Login Popover */}
          {showDropdown && (
            <div className="navbar-user-dropdown">
              <div className="dropdown-header">
                <div
                  className="dropdown-avatar"
                  style={{
                    backgroundColor: currentUser.avatarBg,
                    color: currentUser.avatarColor,
                  }}
                >
                  {currentUser.initials}
                </div>
                <div className="dropdown-user-info">
                  <div className="dropdown-user-name">{currentUser.name}</div>
                  <div className="dropdown-user-role">
                    <span className="status-dot-active"></span>
                    <span>{currentUser.role} • Active</span>
                  </div>
                </div>
              </div>

              <div className="dropdown-section-title">Switch Workspace Profile</div>

              <div className="dropdown-profile-list">
                {Object.values(profiles).map((prof) => {
                  const isActive = prof.id === currentUser.id;
                  return (
                    <button
                      key={prof.id}
                      className={`dropdown-profile-item ${isActive ? "active" : ""}`}
                      onClick={() => handleProfileSwitch(prof.id)}
                    >
                      <div className="dropdown-profile-left">
                        <div
                          className="dropdown-mini-avatar"
                          style={{
                            backgroundColor: prof.avatarBg,
                            color: prof.avatarColor,
                          }}
                        >
                          {prof.initials}
                        </div>
                        <div className="dropdown-profile-meta">
                          <h5>{prof.name}</h5>
                          <span>{prof.role}</span>
                        </div>
                      </div>
                      {isActive && (
                        <Check size={14} style={{ color: "#f59e0b" }} />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="dropdown-divider"></div>

              <button
                className="dropdown-action-btn"
                onClick={handleGoToLogin}
              >
                <LogIn size={15} />
                <span>Switch Account / Login Portal</span>
              </button>

              <button
                className="dropdown-action-btn logout"
                onClick={handleLogout}
              >
                <LogOut size={15} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;