import { createContext, useContext, useState, useEffect } from "react";
import api from "../api";

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

export const SALES_EMPLOYEE_NAMES = [
  "Neha Panchal", "Deepika", "Yanshika", "Kavita", "Mounika", "Sneha", "Sakshi",
  "Anju", "Rinki", "Mahank", "Ranjeeta", "Kirtika", "Nandita", "Bharti",
  "Ismiti", "Manju", "Shweta", "Nishu", "Kirti", "Tina", "Khushboo",
  "Gungun", "Smita", "Sonali", "Shalini", "Komal", "Bindiya", "Janvi",
  "Ankita", "Rekha", "Palak", "Swati", "Pihu", "Sakshi Rai", "Nisha",
  "Lakshmi", "Nandini", "Vanshika", "Pooja", "Jyoti", "Maya", "Tanu",
  "Diksha", "Leena", "Anshu", "Khushi", "Rashmi", "Vani", "Anisha"
];

const PRE_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#059669", "#d97706", "#0284c7", "#4f46e5", "#e11d48"];

SALES_EMPLOYEE_NAMES.forEach((name) => {
  const key = "sales_" + name.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const fName = name.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const bg = PRE_COLORS[(name.charCodeAt(0) || 0) % PRE_COLORS.length];

  if (!PROFILES[key]) {
    PROFILES[key] = {
      id: key,
      name,
      role: "Sales Executive",
      department: "Sales",
      subtitle: "Sales • Omission Crafting",
      email: `${fName}.sales@omissioncrafting.com`,
      initials,
      avatarBg: bg,
      avatarColor: "#ffffff",
      badge: "Sales",
      badgeColor: "#0284c7",
      badgeBg: "#e0f2fe",
      description: "Client inquiries, quotation management, lead tracking, and order placement.",
      permissions: ["Client Inquiries", "Quotation Management", "Lead Tracking", "Order Placement"],
      stats: { clearance: "Level 2 (Commercial)", location: "Sales Suite", department: "Sales" },
    };
  }
});

const AuthContext = createContext(null);

const STORAGE_KEY = "omission_active_profile";

const AVATAR_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#059669", "#d97706", "#0284c7", "#4f46e5", "#e11d48"];
const getEmployeeAvatarBg = (name = "") => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export function AuthProvider({ children }) {
  const [profiles, setProfiles] = useState(PROFILES);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        if (PROFILES[saved]) return PROFILES[saved];
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.name) return parsed;
        } catch (_) {}
      }
    } catch (_) {}
    return PROFILES.admin;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Fetch dynamic employees from database and merge into profiles
  useEffect(() => {
    api
      .get("/api/employees")
      .then((res) => {
        const payload = res?.data;
        if (payload?.success && Array.isArray(payload.data)) {
          const merged = { ...PROFILES };
          payload.data.forEach((emp) => {
            const id = emp._id ? String(emp._id) : (emp.displayName || "").toLowerCase().replace(/\s+/g, "_");
            const name = emp.displayName || "Employee";
            const firstName = (emp.firstName || name.split(" ")[0] || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const dept = emp.department || "Sales";
            const deptClean = dept.toLowerCase().replace(/[^a-z0-9]/g, "");
            const email = emp.email || `${firstName}.${deptClean}@omissioncrafting.com`;

            // If name already matches a core preset (Adam, Marcus Vance, Elena Rostova, Sarah Jenkins, Divyanshi, Karan)
            const isCoreManager = Object.values(PROFILES).some((p) => (p.name || "").toLowerCase() === name.toLowerCase());
            if (isCoreManager) return;

            const initials =
              name
                .split(" ")
                .filter(Boolean)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "EM";

            merged[id] = {
              id,
              name,
              role: emp.jobTitle || (dept.toLowerCase().includes("sales") ? "Sales Executive" : dept),
              department: dept,
              subtitle: `${dept} • Omission Crafting`,
              email,
              initials,
              avatarBg: getEmployeeAvatarBg(name),
              avatarColor: "#ffffff",
              badge: dept,
              badgeColor: "#0284c7",
              badgeBg: "#e0f2fe",
              description: `${dept} team member`,
              permissions: ["Lead Tracking", "Order Placement"],
              stats: { clearance: "Level 1", location: "Sales Suite", department: dept },
            };
          });

          setProfiles(merged);
        }
      })
      .catch((err) => console.error("Error loading dynamic profiles in AuthContext:", err));
  }, []);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
      }
    } catch (_) {}
  }, [currentUser]);

  const switchProfile = (profileId) => {
    const target = profiles[profileId] || PROFILES[profileId];
    if (target) {
      setCurrentUser(target);
      setIsAuthenticated(true);
      return target;
    }
    return currentUser;
  };

  const login = (profileId, credentials = {}) => {
    let target = profiles[profileId] || PROFILES[profileId];
    if (!target && credentials.email) {
      const emailTrim = credentials.email.toLowerCase().trim();
      target = Object.values(profiles).find((p) => (p.email || "").toLowerCase().trim() === emailTrim);
    }
    target = target || PROFILES.admin;
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
        profiles,
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
