import {
  Search,
  Sun,
  Moon,
  Settings,
  Bell
} from "lucide-react";
import logoImg from "../assets/logo.png";

function Navbar({ darkMode, setDarkMode }) {
  return (
    <header className="navbar">

      {/* Left Side */}
      <div className="navbar-left">
        <div className="navbar-logo">
          <img src={logoImg} alt="Omission Crafting Logo" style={{ height: '55px', objectFit: 'contain' }} />
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
          {darkMode ? (
            <Sun size={20} />
          ) : (
            <Moon size={20} />
          )}
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

        {/* User */}
        <div className="navbar-user">

          <div className="user-avatar">
            AD
          </div>

          <div className="user-details">
            <span className="user-name">Adam</span>
            <span className="user-role">CEO</span>
          </div>

        </div>

      </div>

    </header>
  );
}

export default Navbar;