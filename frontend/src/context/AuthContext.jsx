import { createContext, useContext, useState, useEffect } from "react";

export const PROFILES = {
  admin: {
    id: "admin",
    name: "Adam",
    role: "CEO",
    subtitle: "Chief Executive & System Admin",
    email: "adam.ceo@omissioncrafting.com",
    initials: "AD",
    avatarBg: "#f5f5df",
    avatarColor: "#202020",
    badge: "Executive Admin",
    badgeColor: "#b45309",
    badgeBg: "#fef3c7",
    description: "Full enterprise control, business analytics, user management, and executive oversight.",
    permissions: ["Full Governance", "Analytics & P&L", "User Management", "Order Authorizations"],
    stats: { clearance: "Level 4 (Global)", location: "Headquarters", department: "Executive Office" },
  },
  production: {
    id: "production",
    name: "Marcus Vance",
    role: "Production Lead",
    subtitle: "Manufacturing & Print Operations",
    email: "production@omissioncrafting.com",
    initials: "PR",
    avatarBg: "#e0e7ff",
    avatarColor: "#3730a3",
    badge: "Production Floor",
    badgeColor: "#4338ca",
    badgeBg: "#e0e7ff",
    description: "Direct oversight of sample queue, DTF printing lines, quality control, and order fulfillment.",
    permissions: ["Order Execution", "DTF Management", "Quality Check", "Sample Approval"],
    stats: { clearance: "Level 2 (Ops)", location: "Factory Floor B", department: "Production Division" },
  },
  stock: {
    id: "stock",
    name: "Elena Rostova",
    role: "Stock Room Manager",
    subtitle: "Inventory & Material Intake",
    email: "stockroom@omissioncrafting.com",
    initials: "SM",
    avatarBg: "#ecfdf5",
    avatarColor: "#065f46",
    badge: "Stock & Warehouse",
    badgeColor: "#047857",
    badgeBg: "#d1fae5",
    description: "Raw apparel stock tracking, inventory thresholds, supplier intake, and shipment clearance.",
    permissions: ["Stock Tracking", "Inventory Influx", "Material Allocation", "Dispatch Audits"],
    stats: { clearance: "Level 2 (Logistics)", location: "Central Warehouse", department: "Inventory & Supply" },
  },
};

const AuthContext = createContext(null);

const STORAGE_KEY = "omission_active_profile";

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && PROFILES[saved]) {
        return PROFILES[saved];
      }
    } catch (_) {}
    return PROFILES.admin;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    try {
      if (currentUser?.id) {
        localStorage.setItem(STORAGE_KEY, currentUser.id);
      }
    } catch (_) {}
  }, [currentUser]);

  const switchProfile = (profileId) => {
    const target = PROFILES[profileId];
    if (target) {
      setCurrentUser(target);
      setIsAuthenticated(true);
      return target;
    }
    return currentUser;
  };

  const login = (profileId, credentials = {}) => {
    const target = PROFILES[profileId] || PROFILES.admin;
    setCurrentUser(target);
    setIsAuthenticated(true);
    return target;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        profiles: PROFILES,
        switchProfile,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
