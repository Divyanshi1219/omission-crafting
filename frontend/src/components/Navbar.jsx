import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
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
import { usePermissions } from "../context/PermissionContext";

function Navbar({ darkMode, setDarkMode }) {
  const navigate = useNavigate();
  const { currentUser, profiles, switchProfile, logout } = useAuth();
  const { getUserRoles, roles } = usePermissions();
  const [showDropdown, setShowDropdown] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");
  const dropdownRef = useRef(null);

  // Dynamically resolve profile's assigned role display
  const getProfileRoleDisplay = (prof) => {
    if (!prof) return "";
    const userRolesList = getUserRoles(prof);
    if (userRolesList && userRolesList.length > 0) {
      return userRolesList.map((r) => r.name).join(", ");
    }
    return prof.department || prof.role || "Member";
  };

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

  // Include staff profiles and any custom roles as workspace personas
  const combinedProfiles = useMemo(() => {
    const list = [...Object.values(profiles)];

    (roles || []).forEach((role) => {
      if (!role.isSystem) {
        const customId = "role_" + role.slug;
        const alreadyExists = list.some((p) => p.id === customId || p.id === role.slug);
        if (!alreadyExists) {
          list.push({
            id: customId,
            name: role.name,
            role: role.name,
            department: "Role Persona",
            initials: role.name
              .split(" ")
              .filter(Boolean)
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "RP",
            avatarBg: role.color || "#2563eb",
            avatarColor: "#ffffff",
            isRolePersona: true,
          });
        }
      }
    });

    return list;
  }, [profiles, roles]);

  const handleProfileSwitch = (prof) => {
    try {
      sessionStorage.removeItem("dashboard_active_tab");
    } catch (_) {}
    if (prof.isRolePersona) {
      switchProfile(prof.id, prof);
    } else {
      switchProfile(prof.id);
    }
    setShowDropdown(false);
    navigate("/");
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("dashboard_active_tab");
    } catch (_) {}
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
              <span className="user-role">{getProfileRoleDisplay(currentUser)}</span>
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
                    <span>{getProfileRoleDisplay(currentUser)} • Active</span>
                  </div>
                </div>
              </div>

              <div className="dropdown-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Switch Workspace Profile</span>
                <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#64748b" }}>
                  {combinedProfiles.length} Profiles
                </span>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <input
                  type="text"
                  placeholder="Search employee by name or dept..."
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    boxSizing: "border-box",
                    background: darkMode ? "rgba(255,255,255,0.05)" : "#f8fafc",
                    color: "inherit",
                  }}
                />
              </div>

              <div className="dropdown-profile-list" style={{ maxHeight: "250px", overflowY: "auto", paddingRight: "2px" }}>
                {combinedProfiles
                  .filter((prof) => {
                    if (!profileSearch.trim()) return true;
                    const q = profileSearch.toLowerCase();
                    const roleStr = getProfileRoleDisplay(prof).toLowerCase();
                    return (
                      (prof.name || "").toLowerCase().includes(q) ||
                      (prof.department || "").toLowerCase().includes(q) ||
                      (prof.role || "").toLowerCase().includes(q) ||
                      roleStr.includes(q)
                    );
                  })
                  .map((prof) => {
                    const isActive = prof.id === currentUser.id;
                    return (
                      <button
                        key={prof.id}
                        className={`dropdown-profile-item ${isActive ? "active" : ""}`}
                        onClick={() => handleProfileSwitch(prof)}
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
                            <span>{getProfileRoleDisplay(prof)}</span>
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