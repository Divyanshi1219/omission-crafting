import { createContext, useContext, useState, useEffect } from "react";

export const PROFILES = {
  admin: {
    id: "admin",
    name: "Adam",
    role: "CEO",
    department: "CEO",
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
    stats: { clearance: "Level 4 (Global)", location: "Headquarters", department: "CEO" },
  },
  production: {
    id: "production",
    name: "Marcus Vance",
    role: "Production Lead Manager",
    department: "Production Lead Manager",
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
    stats: { clearance: "Level 2 (Ops)", location: "Factory Floor B", department: "Production Lead Manager" },
  },
  stock: {
    id: "stock",
    name: "Elena Rostova",
    role: "Stock Room Manager",
    department: "Stock Room Manager",
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
    stats: { clearance: "Level 2 (Logistics)", location: "Central Warehouse", department: "Stock Room Manager" },
  },
  sales: {
    id: "sales",
    name: "Divyanshi",
    role: "Sales Executive",
    department: "Sales Executive",
    subtitle: "Client Relations & Sales Pipeline",
    email: "divyanshi.sales@omissioncrafting.com",
    initials: "DS",
    avatarBg: "#fdf2f8",
    avatarColor: "#be185d",
    badge: "Sales & Accounts",
    badgeColor: "#be185d",
    badgeBg: "#fce7f3",
    description: "Client acquisition, customer inquiries, order quotations, and sales pipeline tracking.",
    permissions: ["Client Inquiries", "Quotation Management", "Lead Tracking", "Order Placement"],
    stats: { clearance: "Level 2 (Commercial)", location: "Sales Suite", department: "Sales Executive" },
  },
  sales_karan: {
    id: "sales_karan",
    name: "Karan",
    role: "Sales Executive",
    department: "Sales Executive",
    subtitle: "Client Relations & Sales Pipeline",
    email: "karan.sales@omissioncrafting.com",
    initials: "KS",
    avatarBg: "#e0f2fe",
    avatarColor: "#0369a1",
    badge: "Sales & Accounts",
    badgeColor: "#0284c7",
    badgeBg: "#e0f2fe",
    description: "Client acquisition, customer inquiries, order quotations, and sales pipeline tracking.",
    permissions: ["Client Inquiries", "Quotation Management", "Lead Tracking", "Order Placement"],
    stats: { clearance: "Level 2 (Commercial)", location: "Sales Suite", department: "Sales Executive" },
  },
  lead_manager: {
    id: "lead_manager",
    name: "Sarah Jenkins",
    role: "Lead Manager",
    department: "Lead Manager",
    subtitle: "Sales Lead & Order Approvals",
    email: "leadmanager@omissioncrafting.com",
    initials: "LM",
    avatarBg: "#fef3c7",
    avatarColor: "#b45309",
    badge: "Lead & Approvals",
    badgeColor: "#b45309",
    badgeBg: "#fef3c7",
    description: "Initial approval and revision routing for all sales leads and customer orders before factory clearance.",
    permissions: ["Lead Approvals", "Order Validation", "Invoice Oversight", "Sales Review"],
    stats: { clearance: "Level 3 (Management)", location: "HQ Sales Ops", department: "Lead Manager" },
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
