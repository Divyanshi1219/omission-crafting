import { useState, useMemo, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  Users,
  Search,
  Plus,
  Trash2,
  Save,
  Check,
  X,
  SlidersHorizontal,
  LayoutDashboard,
  ShoppingCart,
  ReceiptText,
  Boxes,
  ClipboardCheck,
  CheckSquare,
  FilePlus,
  Edit3,
  Printer,
  Package,
  Layers,
  Crown,
  TrendingUp,
  Factory,
  GitCommit,
  UserCheck,
  Eye,
  Info,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { usePermissions } from "../context/PermissionContext";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import "./RoleManagement.css";

const PRESET_COLORS = [
  "#be185d", // Sales Rose
  "#047857", // Stock Emerald
  "#4338ca", // Production Indigo
  "#7e22ce", // Coordinator Purple
  "#b45309", // Lead Manager Amber
  "#2563eb", // Primary Blue
  "#0284c7", // Sky Blue
  "#dc2626", // Crimson
];

// Helper to get initials
const getInitials = (name = "") => {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "EM";
};

// Helper avatar background
const getAvatarBg = (name = "") => {
  const colors = ["#2563eb", "#7c3aed", "#db2777", "#059669", "#d97706", "#0284c7", "#4f46e5", "#e11d48"];
  return colors[(name.charCodeAt(0) || 0) % colors.length];
};

export default function RoleManagement() {
  const {
    roles,
    updateRolePermissions,
    createRole,
    deleteRole,
    assignEmployeesToRole,
    removeEmployeeFromRole,
    refreshRoles,
  } = usePermissions();

  const { profiles } = useAuth();

  // Active role selected in the UI
  const [activeSlug, setActiveSlug] = useState("sales_executive");
  const [activeTab, setActiveTab] = useState("authorities"); // "authorities" | "members" | "preview"
  const [searchRoleTerm, setSearchRoleTerm] = useState("");
  const [memberSearchTerm, setMemberSearchTerm] = useState("");

  // Editable local state for the currently active role's permissions
  const [localMenuPerms, setLocalMenuPerms] = useState({});
  const [localActionPerms, setLocalActionPerms] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  // Modals
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);

  // Add Members Modal State
  const [selectedEmployeesToAdd, setSelectedEmployeesToAdd] = useState([]);
  const [modalEmployeeSearch, setModalEmployeeSearch] = useState("");
  const [modalDeptFilter, setModalDeptFilter] = useState("all");

  // Create Role Modal State
  const [newRoleForm, setNewRoleForm] = useState({
    name: "",
    description: "",
    color: "#2563eb",
    template: "custom",
    menuPermissions: {
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
    actionPermissions: {
      canCreateLead: false,
      canEditOrder: false,
      canApproveOrder: false,
      canCreateInvoice: false,
      canRequestDTF: false,
      canManageStock: false,
      canAssignBackup: false,
    },
    assignedEmployees: [],
  });

  // Current active role object
  const activeRole = useMemo(() => {
    return roles.find((r) => r.slug === activeSlug || r._id === activeSlug) || roles[0] || null;
  }, [roles, activeSlug]);

  // When activeRole changes, sync local draft permissions
  useEffect(() => {
    if (activeRole) {
      setLocalMenuPerms(activeRole.menuPermissions || {});
      setLocalActionPerms(activeRole.actionPermissions || {});
    }
  }, [activeRole]);

  // Alert toast
  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3500);
  };

  // Compile full company employee list from AuthContext profiles + backend employees
  const allCompanyEmployees = useMemo(() => {
    const list = [];
    const seen = new Set();

    Object.values(profiles || {}).forEach((p) => {
      if (p.name && !seen.has(p.name.toLowerCase())) {
        seen.add(p.name.toLowerCase());
        list.push({
          id: p.id,
          name: p.name,
          email: p.email || "",
          department: p.department || p.role || "Sales",
          initials: p.initials || getInitials(p.name),
          avatarBg: p.avatarBg || getAvatarBg(p.name),
        });
      }
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles]);

  // Find other roles an employee holds (Multi-Role detection)
  const getOtherRolesForEmployee = (employeeName, currentRoleSlug) => {
    const nameLower = (employeeName || "").toLowerCase().trim();
    return roles
      .filter((r) => r.slug !== currentRoleSlug)
      .filter((r) =>
        (r.assignedEmployees || []).some((m) => String(m).toLowerCase().trim() === nameLower)
      )
      .map((r) => r.name);
  };

  // Filtered roles list for left sidebar
  const filteredRoles = useMemo(() => {
    const term = searchRoleTerm.toLowerCase().trim();
    if (!term) return roles;
    return roles.filter(
      (r) =>
        (r.name || "").toLowerCase().includes(term) ||
        (r.description || "").toLowerCase().includes(term)
    );
  }, [roles, searchRoleTerm]);

  // Filtered assigned members for right panel
  const assignedMembersList = useMemo(() => {
    if (!activeRole) return [];
    const members = activeRole.assignedEmployees || [];
    const term = memberSearchTerm.toLowerCase().trim();

    return members
      .filter((name) => !term || name.toLowerCase().includes(term))
      .map((name) => {
        const emp = allCompanyEmployees.find(
          (e) => e.name.toLowerCase() === name.toLowerCase()
        ) || {
          name,
          email: `${name.toLowerCase().replace(/\s+/g, ".")}@omissioncrafting.com`,
          department: activeRole.name,
          initials: getInitials(name),
          avatarBg: getAvatarBg(name),
        };
        const otherRoles = getOtherRolesForEmployee(name, activeRole.slug);
        return { ...emp, otherRoles };
      });
  }, [activeRole, memberSearchTerm, allCompanyEmployees, roles]);

  // Toggle single menu permission
  const handleToggleMenu = (key) => {
    setLocalMenuPerms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Toggle single action capability
  const handleToggleAction = (key) => {
    setLocalActionPerms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Quick Preset Handlers
  const applyPreset = (presetName) => {
    if (presetName === "full") {
      setLocalMenuPerms({
        dashboard: true,
        orders: true,
        createLead: true,
        invoices: true,
        tasks: true,
        stockRoom: true,
        approvals: true,
        employees: true,
        console: true,
      });
      setLocalActionPerms({
        canCreateLead: true,
        canEditOrder: true,
        canApproveOrder: true,
        canCreateInvoice: true,
        canRequestDTF: true,
        canManageStock: true,
        canAssignBackup: true,
      });
      triggerAlert("success", "Applied Full Operations preset.");
    } else if (presetName === "sales") {
      setLocalMenuPerms({
        dashboard: true,
        orders: true,
        createLead: true,
        invoices: true,
        tasks: false,
        stockRoom: false,
        approvals: false,
        employees: false,
        console: false,
      });
      setLocalActionPerms({
        canCreateLead: true,
        canEditOrder: true,
        canApproveOrder: false,
        canCreateInvoice: true,
        canRequestDTF: false,
        canManageStock: false,
        canAssignBackup: true,
      });
      triggerAlert("success", "Applied Standard Sales preset.");
    } else if (presetName === "floor") {
      setLocalMenuPerms({
        dashboard: true,
        orders: true,
        createLead: false,
        invoices: false,
        tasks: true,
        stockRoom: true,
        approvals: false,
        employees: false,
        console: false,
      });
      setLocalActionPerms({
        canCreateLead: false,
        canEditOrder: true,
        canApproveOrder: false,
        canCreateInvoice: false,
        canRequestDTF: true,
        canManageStock: true,
        canAssignBackup: false,
      });
      triggerAlert("success", "Applied Floor & Warehouse Operations preset.");
    } else if (presetName === "view_only") {
      setLocalMenuPerms({
        dashboard: true,
        orders: true,
        createLead: false,
        invoices: false,
        tasks: false,
        stockRoom: false,
        approvals: false,
        employees: false,
        console: false,
      });
      setLocalActionPerms({
        canCreateLead: false,
        canEditOrder: false,
        canApproveOrder: false,
        canCreateInvoice: false,
        canRequestDTF: false,
        canManageStock: false,
        canAssignBackup: false,
      });
      triggerAlert("success", "Applied View Only preset.");
    } else if (presetName === "reset") {
      if (activeRole) {
        setLocalMenuPerms(activeRole.menuPermissions || {});
        setLocalActionPerms(activeRole.actionPermissions || {});
        triggerAlert("success", "Reset to saved authorities.");
      }
    }
  };

  // Save authorities
  const handleSaveAuthorities = async () => {
    if (!activeRole) return;
    setIsSaving(true);
    try {
      await updateRolePermissions(activeRole.slug, {
        menuPermissions: localMenuPerms,
        actionPermissions: localActionPerms,
      });
      triggerAlert("success", `Updated authorities for ${activeRole.name}. Changes are active immediately!`);
    } catch (err) {
      triggerAlert("error", "Error saving authorities: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Remove member from role
  const handleRemoveMember = async (empName) => {
    if (!activeRole) return;
    if (window.confirm(`Remove ${empName} from the '${activeRole.name}' role?`)) {
      await removeEmployeeFromRole(activeRole.slug, empName);
      triggerAlert("success", `Removed ${empName} from ${activeRole.name}.`);
    }
  };

  // Bulk add members
  const handleConfirmAddMembers = async () => {
    if (!activeRole || selectedEmployeesToAdd.length === 0) return;
    await assignEmployeesToRole(activeRole.slug, selectedEmployeesToAdd, "add");
    triggerAlert(
      "success",
      `Assigned ${selectedEmployeesToAdd.length} employees to ${activeRole.name}. They inherit all role authorities!`
    );
    setSelectedEmployeesToAdd([]);
    setShowAddMembersModal(false);
  };

  // Handle template selection in Create Role modal
  const handleTemplateChange = (templateKey) => {
    let menu = { ...newRoleForm.menuPermissions };
    let actions = { ...newRoleForm.actionPermissions };

    if (templateKey === "sales") {
      menu = { dashboard: true, orders: true, createLead: true, invoices: true, tasks: false, stockRoom: false, approvals: false, employees: false, console: false };
      actions = { canCreateLead: true, canEditOrder: true, canApproveOrder: false, canCreateInvoice: true, canRequestDTF: false, canManageStock: false, canAssignBackup: true };
    } else if (templateKey === "stock") {
      menu = { dashboard: true, orders: true, createLead: false, invoices: false, tasks: true, stockRoom: true, approvals: false, employees: false, console: false };
      actions = { canCreateLead: false, canEditOrder: true, canApproveOrder: false, canCreateInvoice: false, canRequestDTF: false, canManageStock: true, canAssignBackup: false };
    } else if (templateKey === "lead_manager") {
      menu = { dashboard: true, orders: true, createLead: true, invoices: false, tasks: false, stockRoom: false, approvals: true, employees: false, console: false };
      actions = { canCreateLead: true, canEditOrder: true, canApproveOrder: true, canCreateInvoice: false, canRequestDTF: false, canManageStock: false, canAssignBackup: true };
    }

    setNewRoleForm((prev) => ({
      ...prev,
      template: templateKey,
      menuPermissions: menu,
      actionPermissions: actions,
    }));
  };

  // Create new role submission
  const handleCreateNewRoleSubmit = async (e) => {
    e.preventDefault();
    if (!newRoleForm.name.trim()) {
      triggerAlert("error", "Please provide a role name.");
      return;
    }

    try {
      const res = await createRole(newRoleForm);
      if (res.success) {
        triggerAlert("success", `Role '${newRoleForm.name}' created with custom authorities!`);
        setShowCreateRoleModal(false);
        setActiveSlug(res.role.slug);
        setNewRoleForm({
          name: "",
          description: "",
          color: "#2563eb",
          template: "custom",
          menuPermissions: {
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
          actionPermissions: {
            canCreateLead: false,
            canEditOrder: false,
            canApproveOrder: false,
            canCreateInvoice: false,
            canRequestDTF: false,
            canManageStock: false,
            canAssignBackup: false,
          },
          assignedEmployees: [],
        });
      }
    } catch (err) {
      triggerAlert("error", "Error creating role: " + err.message);
    }
  };

  // Delete custom role
  const handleDeleteRole = async () => {
    if (!activeRole || activeRole.isSystem) return;
    if (window.confirm(`Are you sure you want to permanently delete the custom role '${activeRole.name}'?`)) {
      await deleteRole(activeRole.slug);
      triggerAlert("success", `Role '${activeRole.name}' deleted.`);
      setActiveSlug("sales_executive");
    }
  };

  // Department options for employee modal filter
  const deptOptions = useMemo(() => {
    const set = new Set();
    allCompanyEmployees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [allCompanyEmployees]);

  // Modal filtered employees
  const modalFilteredEmployees = useMemo(() => {
    const term = modalEmployeeSearch.toLowerCase().trim();
    return allCompanyEmployees.filter((emp) => {
      const matchesSearch =
        !term ||
        emp.name.toLowerCase().includes(term) ||
        (emp.email && emp.email.toLowerCase().includes(term)) ||
        (emp.department && emp.department.toLowerCase().includes(term));

      const matchesDept =
        modalDeptFilter === "all" ||
        (emp.department && emp.department.toLowerCase() === modalDeptFilter.toLowerCase());

      return matchesSearch && matchesDept;
    });
  }, [allCompanyEmployees, modalEmployeeSearch, modalDeptFilter]);

  return (
    <div className="role-management-page">
      {/* Top Header */}
      <div className="role-header-container">
        <div className="role-title-group">
          <h1>Roles & Authority Management</h1>
        </div>

        <div className="role-header-actions">
          <button
            className="role-btn-primary"
            onClick={() => setShowCreateRoleModal(true)}
            title="Create a new role with custom authorities"
          >
            <Plus size={16} /> Create New Role
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div className={`role-alert ${alert.type}`}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {alert.type === "success" ? <Check size={18} /> : <Info size={18} />}
            <span>{alert.message}</span>
          </div>
          <button
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
            onClick={() => setAlert(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Master-Detail Layout */}
      <div className="role-layout-grid">
        {/* Left Column: Roles Sidebar */}
        <div className="role-sidebar-card">
          <div className="role-sidebar-header">
            <div className="role-search-box">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchRoleTerm}
                onChange={(e) => setSearchRoleTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="role-list-scroll">
            {filteredRoles.map((r) => {
              const isActive = r.slug === activeSlug || r._id === activeSlug;
              const count = (r.assignedEmployees || []).length;
              return (
                <div
                  key={r.slug || r._id}
                  className={`role-item-card ${isActive ? "active" : ""}`}
                  onClick={() => setActiveSlug(r.slug)}
                >
                  <div className="role-item-top">
                    <div className="role-badge-pill">
                      <span className="role-color-dot" style={{ background: r.color || "#2563eb" }} />
                      <span>{r.name}</span>
                    </div>
                    <span className="role-member-count">{count} {count === 1 ? "Member" : "Members"}</span>
                  </div>

                  <div className="role-item-tags">
                    {r.menuPermissions?.orders && <span className="role-mini-tag">Orders</span>}
                    {r.menuPermissions?.invoices && <span className="role-mini-tag">Invoices</span>}
                    {r.menuPermissions?.stockRoom && <span className="role-mini-tag">Stock Room</span>}
                    {r.menuPermissions?.approvals && <span className="role-mini-tag">Approvals</span>}
                    {r.menuPermissions?.tasks && <span className="role-mini-tag">Tasks</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Active Role Studio */}
        {activeRole && (
          <div className="role-studio-card">
            {/* Header */}
            <div className="role-studio-header">
              <div className="role-studio-title-area">
                <div className="role-icon-box" style={{ background: activeRole.color || "#2563eb" }}>
                  <Shield size={22} />
                </div>
                <div className="role-studio-titles">
                  <h2>{activeRole.name}</h2>
                </div>
              </div>

              <div className="role-studio-actions">
                {!activeRole.isSystem && (
                  <button
                    className="role-btn-secondary"
                    onClick={handleDeleteRole}
                    style={{ color: "#dc2626", borderColor: "#fecaca" }}
                    title="Delete custom role"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}

                <button
                  className="role-btn-primary"
                  onClick={handleSaveAuthorities}
                  disabled={isSaving}
                >
                  <Save size={16} /> {isSaving ? "Saving..." : "Save Authorities"}
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="role-tabs-bar">
              <button
                className={`role-tab-btn ${activeTab === "authorities" ? "active" : ""}`}
                onClick={() => setActiveTab("authorities")}
              >
                <SlidersHorizontal size={15} />
                Authorities & Menu Access
              </button>

              <button
                className={`role-tab-btn ${activeTab === "members" ? "active" : ""}`}
                onClick={() => setActiveTab("members")}
              >
                <Users size={15} />
                Assigned People
                <span className="role-tab-badge">{(activeRole.assignedEmployees || []).length}</span>
              </button>

              <button
                className={`role-tab-btn ${activeTab === "preview" ? "active" : ""}`}
                onClick={() => setActiveTab("preview")}
              >
                <Eye size={15} />
                Preview As Role
              </button>
            </div>

            {/* Tab 1: Authorities & Side Menu Access */}
            {activeTab === "authorities" && (
              <div className="role-tab-content">
                {/* Presets Row */}
                <div className="authority-preset-row">
                  <span className="preset-title">Quick Authority Presets:</span>
                  <div className="preset-chips">
                    <button className="preset-btn" onClick={() => applyPreset("sales")}>
                      Standard Sales
                    </button>
                    <button className="preset-btn" onClick={() => applyPreset("floor")}>
                      Floor & Stock
                    </button>
                    <button className="preset-btn" onClick={() => applyPreset("view_only")}>
                      View Only
                    </button>
                    <button className="preset-btn" onClick={() => applyPreset("full")}>
                      Full Access
                    </button>
                    <button className="preset-btn" onClick={() => applyPreset("reset")}>
                      Reset
                    </button>
                  </div>
                </div>

                {/* Section A: Side Menu Visibility */}
                <h3 className="authority-section-title">
                  <LayoutDashboard size={18} color="#2563eb" />
                  Side Menu Visibility (Navigation Access)
                </h3>

                <div className="authority-grid">
                  {/* Dashboard */}
                  <div
                    className={`authority-card ${localMenuPerms.dashboard ? "enabled" : ""}`}
                    onClick={() => handleToggleMenu("dashboard")}
                  >
                    <div className="authority-card-left">
                      <div className="authority-icon-wrap">
                        <LayoutDashboard size={17} />
                      </div>
                      <div className="authority-text">
                        <h4>Dashboard</h4>
                        <p>Access main dashboard & performance analytics</p>
                      </div>
                    </div>
                    <label className="role-toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(localMenuPerms.dashboard)}
                        onChange={() => handleToggleMenu("dashboard")}
                      />
                      <span className="role-toggle-slider"></span>
                    </label>
                  </div>

                  {/* Order Management */}
                  <div
                    className={`authority-card ${localMenuPerms.orders ? "enabled" : ""}`}
                    onClick={() => handleToggleMenu("orders")}
                  >
                    <div className="authority-card-left">
                      <div className="authority-icon-wrap">
                        <ShoppingCart size={17} />
                      </div>
                      <div className="authority-text">
                        <h4>Order Management</h4>
                        <p>Browse orders, sample/partial/complete stages</p>
                      </div>
                    </div>
                    <label className="role-toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(localMenuPerms.orders)}
                        onChange={() => handleToggleMenu("orders")}
                      />
                      <span className="role-toggle-slider"></span>
                    </label>
                  </div>

                  {/* Invoices */}
                  <div
                    className={`authority-card ${localMenuPerms.invoices ? "enabled" : ""}`}
                    onClick={() => handleToggleMenu("invoices")}
                  >
                    <div className="authority-card-left">
                      <div className="authority-icon-wrap">
                        <ReceiptText size={17} />
                      </div>
                      <div className="authority-text">
                        <h4>Invoices</h4>
                        <p>Customer invoices, billing & invoice creation</p>
                      </div>
                    </div>
                    <label className="role-toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(localMenuPerms.invoices)}
                        onChange={() => handleToggleMenu("invoices")}
                      />
                      <span className="role-toggle-slider"></span>
                    </label>
                  </div>

                  {/* Stock Room & Inventory */}
                  <div
                    className={`authority-card ${localMenuPerms.stockRoom ? "enabled" : ""}`}
                    onClick={() => handleToggleMenu("stockRoom")}
                  >
                    <div className="authority-card-left">
                      <div className="authority-icon-wrap">
                        <Boxes size={17} />
                      </div>
                      <div className="authority-text">
                        <h4>Stock Room & Inventory</h4>
                        <p>Garment stock, fabric rolls & warehouse intake</p>
                      </div>
                    </div>
                    <label className="role-toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(localMenuPerms.stockRoom)}
                        onChange={() => handleToggleMenu("stockRoom")}
                      />
                      <span className="role-toggle-slider"></span>
                    </label>
                  </div>

                  {/* Approvals */}
                  <div
                    className={`authority-card ${localMenuPerms.approvals ? "enabled" : ""}`}
                    onClick={() => handleToggleMenu("approvals")}
                  >
                    <div className="authority-card-left">
                      <div className="authority-icon-wrap">
                        <ClipboardCheck size={17} />
                      </div>
                      <div className="authority-text">
                        <h4>Approvals</h4>
                        <p>Review and verify incoming leads & order revisions</p>
                      </div>
                    </div>
                    <label className="role-toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(localMenuPerms.approvals)}
                        onChange={() => handleToggleMenu("approvals")}
                      />
                      <span className="role-toggle-slider"></span>
                    </label>
                  </div>

                  {/* Tasks */}
                  <div
                    className={`authority-card ${localMenuPerms.tasks ? "enabled" : ""}`}
                    onClick={() => handleToggleMenu("tasks")}
                  >
                    <div className="authority-card-left">
                      <div className="authority-icon-wrap">
                        <CheckSquare size={17} />
                      </div>
                      <div className="authority-text">
                        <h4>Tasks</h4>
                        <p>Printing, cutting, staging room & floor operations</p>
                      </div>
                    </div>
                    <label className="role-toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(localMenuPerms.tasks)}
                        onChange={() => handleToggleMenu("tasks")}
                      />
                      <span className="role-toggle-slider"></span>
                    </label>
                  </div>

                  {/* All Employees */}
                  <div
                    className={`authority-card ${localMenuPerms.employees ? "enabled" : ""}`}
                    onClick={() => handleToggleMenu("employees")}
                  >
                    <div className="authority-card-left">
                      <div className="authority-icon-wrap">
                        <Users size={17} />
                      </div>
                      <div className="authority-text">
                        <h4>All Employees</h4>
                        <p>Staff directory, onboarding & HR profile details</p>
                      </div>
                    </div>
                    <label className="role-toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(localMenuPerms.employees)}
                        onChange={() => handleToggleMenu("employees")}
                      />
                      <span className="role-toggle-slider"></span>
                    </label>
                  </div>

                  {/* Console */}
                  <div
                    className={`authority-card ${localMenuPerms.console ? "enabled" : ""}`}
                    onClick={() => handleToggleMenu("console")}
                  >
                    <div className="authority-card-left">
                      <div className="authority-icon-wrap">
                        <SlidersHorizontal size={17} />
                      </div>
                      <div className="authority-text">
                        <h4>Console</h4>
                        <p>Item console & role authority configuration</p>
                      </div>
                    </div>
                    <label className="role-toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(localMenuPerms.console)}
                        onChange={() => handleToggleMenu("console")}
                      />
                      <span className="role-toggle-slider"></span>
                    </label>
                  </div>
                </div>

                {/* Section B: Action Capabilities */}
                <h3 className="authority-section-title" style={{ marginTop: "32px" }}>
                  <ShieldCheck size={18} color="#059669" />
                  Action Capabilities & Operational Privileges
                </h3>

                <div className="authority-grid">
                  {/* Create Lead */}
                  <div
                    className={`authority-card ${localActionPerms.canCreateLead ? "enabled" : ""}`}
                    onClick={() => handleToggleAction("canCreateLead")}
                  >
                    <div className="authority-card-left">
                      <div className="authority-icon-wrap">
                        <FilePlus size={17} />
                      </div>
                      <div className="authority-text">
                        <h4>Create Lead & Order</h4>
                        <p>Can submit new customer leads and initiate orders</p>
                      </div>
                    </div>
                    <label className="role-toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(localActionPerms.canCreateLead)}
                        onChange={() => handleToggleAction("canCreateLead")}
                      />
                      <span className="role-toggle-slider"></span>
                    </label>
                  </div>

                  {/* Edit Order */}
                  <div
                    className={`authority-card ${localActionPerms.canEditOrder ? "enabled" : ""}`}
                    onClick={() => handleToggleAction("canEditOrder")}
                  >
                    <div className="authority-card-left">
                      <div className="authority-icon-wrap">
                        <Edit3 size={17} />
                      </div>
                      <div className="authority-text">
                        <h4>Edit Order Details</h4>
                        <p>Can modify order specs, add items & change delivery</p>
                      </div>
                    </div>
                    <label className="role-toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(localActionPerms.canEditOrder)}
                        onChange={() => handleToggleAction("canEditOrder")}
                      />
                      <span className="role-toggle-slider"></span>
                    </label>
                  </div>

                  {/* Approve Order */}
                  <div
                    className={`authority-card ${localActionPerms.canApproveOrder ? "enabled" : ""}`}
                    onClick={() => handleToggleAction("canApproveOrder")}
                  >
                    <div className="authority-card-left">
                      <div className="authority-icon-wrap">
                        <Check size={17} />
                      </div>
                      <div className="authority-text">
                        <h4>Approve Orders</h4>
                        <p>Can give managerial approval to advance order stages</p>
                      </div>
                    </div>
                    <label className="role-toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(localActionPerms.canApproveOrder)}
                        onChange={() => handleToggleAction("canApproveOrder")}
                      />
                      <span className="role-toggle-slider"></span>
                    </label>
                  </div>

                  {/* Create Invoice */}
                  <div
                    className={`authority-card ${localActionPerms.canCreateInvoice ? "enabled" : ""}`}
                    onClick={() => handleToggleAction("canCreateInvoice")}
                  >
                    <div className="authority-card-left">
                      <div className="authority-icon-wrap">
                        <ReceiptText size={17} />
                      </div>
                      <div className="authority-text">
                        <h4>Create Invoices</h4>
                        <p>Can issue formal invoices and record payments</p>
                      </div>
                    </div>
                    <label className="role-toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(localActionPerms.canCreateInvoice)}
                        onChange={() => handleToggleAction("canCreateInvoice")}
                      />
                      <span className="role-toggle-slider"></span>
                    </label>
                  </div>

                  {/* Request DTF */}
                  <div
                    className={`authority-card ${localActionPerms.canRequestDTF ? "enabled" : ""}`}
                    onClick={() => handleToggleAction("canRequestDTF")}
                  >
                    <div className="authority-card-left">
                      <div className="authority-icon-wrap">
                        <Printer size={17} />
                      </div>
                      <div className="authority-text">
                        <h4>Request DTF / Print</h4>
                        <p>Can send orders to DTF printing lines & vendors</p>
                      </div>
                    </div>
                    <label className="role-toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(localActionPerms.canRequestDTF)}
                        onChange={() => handleToggleAction("canRequestDTF")}
                      />
                      <span className="role-toggle-slider"></span>
                    </label>
                  </div>

                  {/* Manage Stock */}
                  <div
                    className={`authority-card ${localActionPerms.canManageStock ? "enabled" : ""}`}
                    onClick={() => handleToggleAction("canManageStock")}
                  >
                    <div className="authority-card-left">
                      <div className="authority-icon-wrap">
                        <Boxes size={17} />
                      </div>
                      <div className="authority-text">
                        <h4>Manage Stock Inventory</h4>
                        <p>Can adjust quantities, add garments & update racks</p>
                      </div>
                    </div>
                    <label className="role-toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(localActionPerms.canManageStock)}
                        onChange={() => handleToggleAction("canManageStock")}
                      />
                      <span className="role-toggle-slider"></span>
                    </label>
                  </div>

                  {/* Assign Backup */}
                  <div
                    className={`authority-card ${localActionPerms.canAssignBackup ? "enabled" : ""}`}
                    onClick={() => handleToggleAction("canAssignBackup")}
                  >
                    <div className="authority-card-left">
                      <div className="authority-icon-wrap">
                        <UserCheck size={17} />
                      </div>
                      <div className="authority-text">
                        <h4>Assign Backup Employees</h4>
                        <p>Can delegate orders to backup staff during sick leave</p>
                      </div>
                    </div>
                    <label className="role-toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(localActionPerms.canAssignBackup)}
                        onChange={() => handleToggleAction("canAssignBackup")}
                      />
                      <span className="role-toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Assigned People */}
            {activeTab === "members" && (
              <div className="role-tab-content">
                <div className="members-header-bar">
                  <div className="role-search-box members-search-box">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Filter assigned staff..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                    />
                  </div>

                  <button
                    className="role-btn-primary"
                    onClick={() => {
                      setSelectedEmployeesToAdd([]);
                      setShowAddMembersModal(true);
                    }}
                  >
                    <Plus size={15} /> Add Employees to Role
                  </button>
                </div>

                {assignedMembersList.length === 0 ? (
                  <div className="no-members-empty">
                    <Users size={36} style={{ color: "#cbd5e1", marginBottom: "8px" }} />
                    <p style={{ margin: "0 0 12px 0", fontWeight: 600 }}>No employees currently assigned to this role.</p>
                    <button
                      className="role-btn-secondary"
                      onClick={() => setShowAddMembersModal(true)}
                    >
                      <Plus size={14} /> Assign Employees Now
                    </button>
                  </div>
                ) : (
                  <div className="members-grid">
                    {assignedMembersList.map((emp) => (
                      <div key={emp.name} className="member-card">
                        <div className="member-card-left">
                          <div className="member-avatar" style={{ background: emp.avatarBg }}>
                            {emp.initials}
                          </div>
                          <div className="member-info">
                            <div className="member-name">{emp.name}</div>
                            <div className="member-dept">{emp.department}</div>
                            {emp.otherRoles && emp.otherRoles.length > 0 && (
                              <div className="member-other-roles">
                                {emp.otherRoles.map((roleName) => (
                                  <span key={roleName} className="multi-role-badge">
                                    +{roleName}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          className="member-remove-btn"
                          title="Remove from this role"
                          onClick={() => handleRemoveMember(emp.name)}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Preview As Role Simulator */}
            {activeTab === "preview" && (
              <div className="role-tab-content">
                <div className="preview-simulator-box">
                  <div className="preview-sim-header">
                    <h3>Simulation Preview: {activeRole.name}</h3>
                    <p>
                      This simulator demonstrates the exact side menu structure that users assigned to{" "}
                      <strong>{activeRole.name}</strong> will see in their application sidebar.
                    </p>
                  </div>

                  <div className="preview-sim-sidebar-mock">
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
                      Simulated Sidebar
                    </div>

                    <div className={`mock-sidebar-item ${localMenuPerms.dashboard ? "enabled" : "disabled"}`}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <LayoutDashboard size={15} /> Dashboard
                      </span>
                      <span>{localMenuPerms.dashboard ? "✓ Visible" : "Hidden"}</span>
                    </div>

                    <div className={`mock-sidebar-item ${localMenuPerms.orders ? "enabled" : "disabled"}`}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <ShoppingCart size={15} /> Order Management
                      </span>
                      <span>{localMenuPerms.orders ? "✓ Visible" : "Hidden"}</span>
                    </div>

                    <div className={`mock-sidebar-item ${localMenuPerms.invoices ? "enabled" : "disabled"}`}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <ReceiptText size={15} /> Invoices
                      </span>
                      <span>{localMenuPerms.invoices ? "✓ Visible" : "Hidden"}</span>
                    </div>

                    <div className={`mock-sidebar-item ${localMenuPerms.stockRoom ? "enabled" : "disabled"}`}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Boxes size={15} /> Stock Room
                      </span>
                      <span>{localMenuPerms.stockRoom ? "✓ Visible" : "Hidden"}</span>
                    </div>

                    <div className={`mock-sidebar-item ${localMenuPerms.approvals ? "enabled" : "disabled"}`}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <ClipboardCheck size={15} /> Approvals
                      </span>
                      <span>{localMenuPerms.approvals ? "✓ Visible" : "Hidden"}</span>
                    </div>

                    <div className={`mock-sidebar-item ${localMenuPerms.tasks ? "enabled" : "disabled"}`}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <CheckSquare size={15} /> Task
                      </span>
                      <span>{localMenuPerms.tasks ? "✓ Visible" : "Hidden"}</span>
                    </div>

                    <div className={`mock-sidebar-item ${localMenuPerms.employees ? "enabled" : "disabled"}`}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Users size={15} /> All Employees
                      </span>
                      <span>{localMenuPerms.employees ? "✓ Visible" : "Hidden"}</span>
                    </div>

                    <div className={`mock-sidebar-item ${localMenuPerms.console ? "enabled" : "disabled"}`}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <SlidersHorizontal size={15} /> Console
                      </span>
                      <span>{localMenuPerms.console ? "✓ Visible" : "Hidden"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Add Employees in Bulk */}
      {showAddMembersModal && activeRole && (
        <div className="role-modal-overlay" onClick={() => setShowAddMembersModal(false)}>
          <div className="role-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="role-modal-header">
              <h3>Assign Employees to {activeRole.name}</h3>
              <button className="role-modal-close" onClick={() => setShowAddMembersModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="role-modal-body">
              <div className="bulk-employee-toolbar">
                <div className="role-search-box" style={{ flex: 1 }}>
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search by employee name or email..."
                    value={modalEmployeeSearch}
                    onChange={(e) => setModalEmployeeSearch(e.target.value)}
                  />
                </div>

                <select
                  style={{ padding: "7px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  value={modalDeptFilter}
                  onChange={(e) => setModalDeptFilter(e.target.value)}
                >
                  <option value="all">All Departments</option>
                  {deptOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", fontSize: "12.5px", color: "#64748b" }}>
                <span>{modalFilteredEmployees.length} employees available</span>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 600, cursor: "pointer" }}
                  onClick={() => {
                    const allNames = modalFilteredEmployees.map((e) => e.name);
                    setSelectedEmployeesToAdd((prev) =>
                      prev.length === allNames.length ? [] : allNames
                    );
                  }}
                >
                  {selectedEmployeesToAdd.length === modalFilteredEmployees.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="bulk-employee-list">
                {modalFilteredEmployees.map((emp) => {
                  const isAlreadyInRole = (activeRole.assignedEmployees || []).some(
                    (m) => m.toLowerCase() === emp.name.toLowerCase()
                  );
                  const isSelected = selectedEmployeesToAdd.includes(emp.name);

                  return (
                    <div
                      key={emp.name}
                      className={`bulk-employee-item ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        if (isAlreadyInRole) return;
                        setSelectedEmployeesToAdd((prev) =>
                          isSelected ? prev.filter((n) => n !== emp.name) : [...prev, emp.name]
                        );
                      }}
                      style={{ opacity: isAlreadyInRole ? 0.6 : 1, cursor: isAlreadyInRole ? "not-allowed" : "pointer" }}
                    >
                      <div className="bulk-employee-left">
                        <input
                          type="checkbox"
                          className="bulk-employee-checkbox"
                          checked={isSelected || isAlreadyInRole}
                          disabled={isAlreadyInRole}
                          onChange={() => {}}
                        />
                        <div
                          className="member-avatar"
                          style={{ width: "30px", height: "30px", fontSize: "11px", background: emp.avatarBg }}
                        >
                          {emp.initials}
                        </div>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{emp.name}</div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>{emp.department}</div>
                        </div>
                      </div>

                      {isAlreadyInRole && (
                        <span style={{ fontSize: "11px", color: "#059669", fontWeight: 600, background: "#ecfdf5", padding: "2px 6px", borderRadius: "4px" }}>
                          Already in role
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="role-modal-footer">
              <button className="role-btn-secondary" onClick={() => setShowAddMembersModal(false)}>
                Cancel
              </button>
              <button
                className="role-btn-primary"
                disabled={selectedEmployeesToAdd.length === 0}
                onClick={handleConfirmAddMembers}
              >
                Assign ({selectedEmployeesToAdd.length} Employees)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Role with authorities from the start */}
      {showCreateRoleModal && (
        <div className="role-modal-overlay" onClick={() => setShowCreateRoleModal(false)}>
          <div className="role-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
            <div className="role-modal-header">
              <h3>Create New Role</h3>
              <button className="role-modal-close" onClick={() => setShowCreateRoleModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewRoleSubmit}>
              <div className="role-modal-body">
                <div className="role-form-group">
                  <label>Role Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Accountant, Dispatch Executive, Quality Inspector"
                    value={newRoleForm.name}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                  />
                </div>

                <div className="role-form-group">
                  <label>Description</label>
                  <textarea
                    rows={2}
                    placeholder="Role responsibilities and department clearance..."
                    value={newRoleForm.description}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="role-form-group">
                    <label>Starting Template</label>
                    <select
                      value={newRoleForm.template}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                    >
                      <option value="custom">Start From Scratch</option>
                      <option value="sales">Copy Sales Executive</option>
                      <option value="stock">Copy Stock Room</option>
                      <option value="lead_manager">Copy Lead Manager</option>
                    </select>
                  </div>

                  <div className="role-form-group">
                    <label>Badge Color</label>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                      {PRESET_COLORS.map((c) => (
                        <div
                          key={c}
                          onClick={() => setNewRoleForm({ ...newRoleForm, color: c })}
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: c,
                            cursor: "pointer",
                            border: newRoleForm.color === c ? "2px solid #0f172a" : "1px solid rgba(0,0,0,0.1)",
                            transform: newRoleForm.color === c ? "scale(1.15)" : "none",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Initial Menu Permissions for the new role */}
                <div style={{ marginTop: "14px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", display: "block", marginBottom: "8px" }}>
                    Configure Authorities from Start:
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(newRoleForm.menuPermissions.orders)}
                        onChange={(e) =>
                          setNewRoleForm({
                            ...newRoleForm,
                            menuPermissions: { ...newRoleForm.menuPermissions, orders: e.target.checked },
                          })
                        }
                      />
                      <span>Order Management</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(newRoleForm.menuPermissions.invoices)}
                        onChange={(e) =>
                          setNewRoleForm({
                            ...newRoleForm,
                            menuPermissions: { ...newRoleForm.menuPermissions, invoices: e.target.checked },
                          })
                        }
                      />
                      <span>Invoices</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(newRoleForm.menuPermissions.stockRoom)}
                        onChange={(e) =>
                          setNewRoleForm({
                            ...newRoleForm,
                            menuPermissions: { ...newRoleForm.menuPermissions, stockRoom: e.target.checked },
                          })
                        }
                      />
                      <span>Stock Room & Inventory</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(newRoleForm.menuPermissions.approvals)}
                        onChange={(e) =>
                          setNewRoleForm({
                            ...newRoleForm,
                            menuPermissions: { ...newRoleForm.menuPermissions, approvals: e.target.checked },
                          })
                        }
                      />
                      <span>Approvals</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(newRoleForm.menuPermissions.tasks)}
                        onChange={(e) =>
                          setNewRoleForm({
                            ...newRoleForm,
                            menuPermissions: { ...newRoleForm.menuPermissions, tasks: e.target.checked },
                          })
                        }
                      />
                      <span>Tasks</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(newRoleForm.menuPermissions.employees)}
                        onChange={(e) =>
                          setNewRoleForm({
                            ...newRoleForm,
                            menuPermissions: { ...newRoleForm.menuPermissions, employees: e.target.checked },
                          })
                        }
                      />
                      <span>All Employees</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="role-modal-footer">
                <button
                  type="button"
                  className="role-btn-secondary"
                  onClick={() => setShowCreateRoleModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="role-btn-primary">
                  Create Role & Save Authorities
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
