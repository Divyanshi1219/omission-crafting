import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import api from "../api";
import { useAuth } from "./AuthContext";

const LOCAL_STORAGE_ROLES_KEY = "omission_system_roles_v1";

export const INITIAL_DEFAULT_ROLES = [
  {
    _id: "sales_executive",
    slug: "sales_executive",
    name: "Sales Executive",
    description: "Client relations, lead generation, sales pipeline, quotation management, and order placement.",
    color: "#be185d",
    icon: "TrendingUp",
    isSystem: true,
    dashboardView: "orders",
    menuPermissions: {
      dashboard: true,
      orders: true,
      createLead: true,
      invoices: true,
      tasks: false,
      stockRoom: false,
      approvals: false,
      employees: false,
      console: false,
    },
    actionPermissions: {
      canCreateLead: true,
      canEditOrder: true,
      canApproveOrder: false,
      canCreateInvoice: true,
      canRequestDTF: false,
      canManageStock: false,
      canAssignBackup: true,
    },
    assignedEmployees: [
      "Divyanshi",
      "Karan",
      "Neha Panchal",
      "Deepika",
      "Yanshika",
      "Kavita",
      "Mounika",
      "Sneha",
      "Sakshi",
      "Nandini"
    ],
  },
  {
    _id: "stock_room_manager",
    slug: "stock_room_manager",
    name: "Stock Room Manager",
    description: "Raw apparel stock tracking, inventory thresholds, supplier intake, and shipment clearance.",
    color: "#047857",
    icon: "Boxes",
    isSystem: true,
    dashboardView: "stock_inventory",
    menuPermissions: {
      dashboard: true,
      orders: true,
      createLead: false,
      invoices: false,
      tasks: true,
      stockRoom: true,
      approvals: false,
      employees: false,
      console: false,
    },
    actionPermissions: {
      canCreateLead: false,
      canEditOrder: true,
      canApproveOrder: false,
      canCreateInvoice: false,
      canRequestDTF: false,
      canManageStock: true,
      canAssignBackup: false,
    },
    assignedEmployees: ["Elena Rostova", "stock"],
  },
  {
    _id: "production_lead_manager",
    slug: "production_lead_manager",
    name: "Production Lead Manager",
    description: "Manufacturing and print operations, sample queue, DTF lines, and quality control.",
    color: "#4338ca",
    icon: "Factory",
    isSystem: true,
    dashboardView: "orders",
    menuPermissions: {
      dashboard: true,
      orders: true,
      createLead: false,
      invoices: false,
      tasks: true,
      stockRoom: false,
      approvals: false,
      employees: false,
      console: false,
    },
    actionPermissions: {
      canCreateLead: false,
      canEditOrder: true,
      canApproveOrder: false,
      canCreateInvoice: false,
      canRequestDTF: true,
      canManageStock: false,
      canAssignBackup: false,
    },
    assignedEmployees: ["Marcus Vance", "production"],
  },
  {
    _id: "coordinator",
    slug: "coordinator",
    name: "Coordinator",
    description: "Floor logistics, pickup verification, and stage transfers between departments.",
    color: "#7e22ce",
    icon: "GitCommit",
    isSystem: true,
    dashboardView: "coordinator",
    menuPermissions: {
      dashboard: true,
      orders: true,
      createLead: false,
      invoices: false,
      tasks: true,
      stockRoom: false,
      approvals: false,
      employees: false,
      console: false,
    },
    actionPermissions: {
      canCreateLead: false,
      canEditOrder: true,
      canApproveOrder: false,
      canCreateInvoice: false,
      canRequestDTF: false,
      canManageStock: false,
      canAssignBackup: false,
    },
    assignedEmployees: ["Alex Rivera", "coordinator"],
  },
  {
    _id: "lead_manager",
    slug: "lead_manager",
    name: "Lead Manager",
    description: "Lead approvals, customer order validation, and sales revision routing.",
    color: "#b45309",
    icon: "ClipboardCheck",
    isSystem: true,
    dashboardView: "default",
    menuPermissions: {
      dashboard: true,
      orders: true,
      createLead: true,
      invoices: false,
      tasks: false,
      stockRoom: false,
      approvals: true,
      employees: false,
      console: false,
    },
    actionPermissions: {
      canCreateLead: true,
      canEditOrder: true,
      canApproveOrder: true,
      canCreateInvoice: false,
      canRequestDTF: false,
      canManageStock: false,
      canAssignBackup: true,
    },
    assignedEmployees: ["Sarah Jenkins", "lead_manager"],
  },
  {
    _id: "ceo",
    slug: "ceo",
    name: "CEO / Executive Admin",
    description: "Full governance, executive analytics, user management, and company oversight.",
    color: "#b45309",
    icon: "Crown",
    isSystem: true,
    dashboardView: "executive",
    menuPermissions: {
      dashboard: true,
      orders: true,
      createLead: true,
      invoices: true,
      tasks: true,
      stockRoom: true,
      approvals: true,
      employees: true,
      console: true,
    },
    actionPermissions: {
      canCreateLead: true,
      canEditOrder: true,
      canApproveOrder: true,
      canCreateInvoice: true,
      canRequestDTF: true,
      canManageStock: true,
      canAssignBackup: true,
    },
    assignedEmployees: ["Adam", "admin"],
  },
];

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const { currentUser } = useAuth();

  const [roles, setRoles] = useState(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_ROLES_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_DEFAULT_ROLES;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync roles from backend
  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/roles");
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setRoles(res.data.data);
        localStorage.setItem(LOCAL_STORAGE_ROLES_KEY, JSON.stringify(res.data.data));
      }
    } catch (err) {
      console.warn("Backend /api/roles unavailable, using cached/default roles:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Save changes to localStorage whenever roles state changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_ROLES_KEY, JSON.stringify(roles));
    } catch (_) {}
  }, [roles]);

  // Is current user CEO / Admin?
  const isSuperAdmin = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.id === "admin" ||
      currentUser.role === "CEO" ||
      (currentUser.role && currentUser.role.toLowerCase().includes("admin")) ||
      (currentUser.name || "").toLowerCase().startsWith("adam") ||
      (currentUser.department || "").toLowerCase() === "ceo"
    );
  }, [currentUser]);

  // Find all roles assigned to an employee/user (Supports MULTI-ROLE)
  const getUserRoles = useCallback(
    (user) => {
      if (!user) return [];
      const uName = (user.name || "").toLowerCase().trim();
      const uId = (user.id || "").toLowerCase().trim();
      const uEmail = (user.email || "").toLowerCase().trim();
      const uRole = (user.role || "").toLowerCase().trim();
      const uDept = (user.department || "").toLowerCase().trim();

      return roles.filter((role) => {
        if (role.slug === "ceo" && (uId === "admin" || uRole === "ceo" || uName.startsWith("adam"))) {
          return true;
        }

        // Direct assigned employees match
        const isExplicitlyAssigned = (role.assignedEmployees || []).some((assigned) => {
          const a = String(assigned).toLowerCase().trim();
          return a === uName || a === uId || a === uEmail;
        });
        if (isExplicitlyAssigned) return true;

        // Fallback default role match
        if (role.slug === "sales_executive") {
          return uRole === "sales executive" || uId.startsWith("sales") || uDept === "sales";
        }
        if (role.slug === "stock_room_manager") {
          return uId === "stock" || uRole.includes("stock") || uDept.includes("stock");
        }
        if (role.slug === "production_lead_manager") {
          return (
            (uId === "production" || uRole.includes("production") || uDept.includes("production")) &&
            !uRole.includes("lead manager")
          );
        }
        if (role.slug === "coordinator") {
          return uId === "coordinator" || uRole.includes("coordinator") || uDept.includes("coordinator");
        }
        if (role.slug === "lead_manager") {
          return uId === "lead_manager" || uRole.includes("lead manager") || uDept.includes("lead manager");
        }

        // Custom role match by name or role_slug
        if (role.slug === uId.replace(/^role_/, "") || role.name.toLowerCase() === uRole || role.name.toLowerCase() === uName) {
          return true;
        }

        return false;
      });
    },
    [roles]
  );

  // Active roles for currentUser
  const userRoles = useMemo(() => {
    return getUserRoles(currentUser);
  }, [currentUser, getUserRoles]);

  // Check if current user has access to a side menu item (Union across multiple roles)
  const canAccessMenu = useCallback(
    (menuKey) => {
      if (isSuperAdmin) return true;
      if (!userRoles || userRoles.length === 0) {
        // Fallback safety for sales default
        if (menuKey === "dashboard" || menuKey === "orders") return true;
        return false;
      }
      // If ANY of user's roles has this menu permission enabled -> return true
      return userRoles.some((role) => Boolean(role.menuPermissions && role.menuPermissions[menuKey]));
    },
    [isSuperAdmin, userRoles]
  );

  // Check if current user can perform an action (Union across multiple roles)
  const canPerformAction = useCallback(
    (actionKey) => {
      if (isSuperAdmin) return true;
      if (!userRoles || userRoles.length === 0) return false;
      return userRoles.some((role) => Boolean(role.actionPermissions && role.actionPermissions[actionKey]));
    },
    [isSuperAdmin, userRoles]
  );

  // Update role permissions & details
  const updateRolePermissions = async (roleIdOrSlug, updatedData) => {
    // Optimistic local update
    setRoles((prev) =>
      prev.map((r) => {
        if (r._id === roleIdOrSlug || r.slug === roleIdOrSlug) {
          return {
            ...r,
            ...updatedData,
            menuPermissions: { ...r.menuPermissions, ...(updatedData.menuPermissions || {}) },
            actionPermissions: { ...r.actionPermissions, ...(updatedData.actionPermissions || {}) },
          };
        }
        return r;
      })
    );

    try {
      const res = await api.put(`/api/roles/${roleIdOrSlug}`, updatedData);
      if (res.data?.success && res.data.data) {
        setRoles((prev) =>
          prev.map((r) => (r.slug === res.data.data.slug || r._id === res.data.data._id ? res.data.data : r))
        );
      }
      return { success: true };
    } catch (err) {
      console.warn("Backend update failed, kept local change:", err.message);
      return { success: true, localOnly: true };
    }
  };

  // Create a new custom role with authorities from the start
  const createRole = async (newRoleData) => {
    const slug = (newRoleData.slug || newRoleData.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const roleObj = {
      _id: slug,
      slug,
      name: newRoleData.name.trim(),
      description: newRoleData.description || "",
      color: newRoleData.color || "#2563eb",
      icon: newRoleData.icon || "Shield",
      isSystem: false,
      dashboardView: newRoleData.dashboardView || "default",
      menuPermissions: newRoleData.menuPermissions || {
        dashboard: true,
        orders: false,
        createLead: false,
        invoices: false,
        tasks: false,
        stockRoom: false,
        approvals: false,
        employees: false,
        console: false,
      },
      actionPermissions: newRoleData.actionPermissions || {
        canCreateLead: false,
        canEditOrder: false,
        canApproveOrder: false,
        canCreateInvoice: false,
        canRequestDTF: false,
        canManageStock: false,
        canAssignBackup: false,
      },
      assignedEmployees: Array.isArray(newRoleData.assignedEmployees) ? newRoleData.assignedEmployees : [],
      createdAt: new Date().toISOString(),
    };

    // Optimistic local add
    setRoles((prev) => [...prev, roleObj]);

    try {
      const res = await api.post("/api/roles", newRoleData);
      if (res.data?.success && res.data.data) {
        setRoles((prev) => prev.map((r) => (r.slug === slug ? res.data.data : r)));
      }
      return { success: true, role: roleObj };
    } catch (err) {
      console.warn("Backend create failed, saved locally:", err.message);
      return { success: true, role: roleObj, localOnly: true };
    }
  };

  // Delete a custom role
  const deleteRole = async (roleIdOrSlug) => {
    setRoles((prev) => prev.filter((r) => r._id !== roleIdOrSlug && r.slug !== roleIdOrSlug));

    try {
      await api.delete(`/api/roles/${roleIdOrSlug}`);
      return { success: true };
    } catch (err) {
      console.warn("Backend delete failed, removed locally:", err.message);
      return { success: true, localOnly: true };
    }
  };

  // Bulk assign employees to role
  const assignEmployeesToRole = async (roleIdOrSlug, employeeNames, action = "add") => {
    if (!Array.isArray(employeeNames) || employeeNames.length === 0) return;

    setRoles((prev) =>
      prev.map((r) => {
        if (r._id === roleIdOrSlug || r.slug === roleIdOrSlug) {
          const current = new Set(r.assignedEmployees || []);
          if (action === "add") {
            employeeNames.forEach((n) => current.add(n));
          } else if (action === "remove") {
            employeeNames.forEach((n) => current.delete(n));
          } else {
            current.clear();
            employeeNames.forEach((n) => current.add(n));
          }
          return { ...r, assignedEmployees: Array.from(current) };
        }
        return r;
      })
    );

    try {
      await api.post(`/api/roles/${roleIdOrSlug}/members`, {
        action,
        members: employeeNames,
      });
    } catch (err) {
      console.warn("Backend member update failed, kept locally:", err.message);
    }
  };

  // Remove single employee from role
  const removeEmployeeFromRole = async (roleIdOrSlug, employeeName) => {
    return assignEmployeesToRole(roleIdOrSlug, [employeeName], "remove");
  };

  const value = {
    roles,
    userRoles,
    isLoading,
    isSuperAdmin,
    canAccessMenu,
    canPerformAction,
    getUserRoles,
    updateRolePermissions,
    createRole,
    deleteRole,
    assignEmployeesToRole,
    removeEmployeeFromRole,
    refreshRoles: fetchRoles,
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}
