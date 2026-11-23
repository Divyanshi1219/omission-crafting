const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Role = require("../models/Role");

// Default initial system roles
const DEFAULT_ROLES = [
  {
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

// Seed default roles if none exist
const seedRolesIfEmpty = async () => {
  const count = await Role.countDocuments();
  if (count === 0) {
    console.log("Seeding initial default roles...");
    await Role.insertMany(DEFAULT_ROLES);
  }
};

// GET /api/roles - list all roles
router.get("/", async (req, res) => {
  try {
    await seedRolesIfEmpty();
    const roles = await Role.find().sort({ isSystem: -1, createdAt: 1 });
    res.json({ success: true, count: roles.length, data: roles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/roles/:id - get single role by _id or slug
router.get("/:id", async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId ? { _id: req.params.id } : { slug: req.params.id.toLowerCase() };
    const role = await Role.findOne(query);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }
    res.json({ success: true, data: role });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/roles - create a new custom role with authorities from the start
router.post("/", async (req, res) => {
  try {
    const { name, slug, description, color, icon, dashboardView, menuPermissions, actionPermissions, assignedEmployees } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Role name is required" });
    }

    const generatedSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const existing = await Role.findOne({ slug: generatedSlug });
    if (existing) {
      return res.status(400).json({ success: false, message: `Role with identifier '${generatedSlug}' already exists` });
    }

    const newRole = new Role({
      name: name.trim(),
      slug: generatedSlug,
      description: description || "",
      color: color || "#2563eb",
      icon: icon || "Shield",
      isSystem: false,
      dashboardView: dashboardView || "default",
      menuPermissions: menuPermissions || {
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
      actionPermissions: actionPermissions || {
        canCreateLead: false,
        canEditOrder: false,
        canApproveOrder: false,
        canCreateInvoice: false,
        canRequestDTF: false,
        canManageStock: false,
        canAssignBackup: false,
      },
      assignedEmployees: Array.isArray(assignedEmployees) ? assignedEmployees : [],
    });

    const saved = await newRole.save();
    res.status(201).json({ success: true, message: "Role created successfully", data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/roles/:id - update permissions, authorities, or metadata of a role
router.put("/:id", async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId ? { _id: req.params.id } : { slug: req.params.id.toLowerCase() };

    const role = await Role.findOne(query);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    const {
      name,
      description,
      color,
      icon,
      dashboardView,
      menuPermissions,
      actionPermissions,
      assignedEmployees,
    } = req.body;

    if (name && !role.isSystem) role.name = name.trim();
    if (description !== undefined) role.description = description;
    if (color !== undefined) role.color = color;
    if (icon !== undefined) role.icon = icon;
    if (dashboardView !== undefined) role.dashboardView = dashboardView;

    if (menuPermissions) {
      role.menuPermissions = { ...role.menuPermissions, ...menuPermissions };
    }
    if (actionPermissions) {
      role.actionPermissions = { ...role.actionPermissions, ...actionPermissions };
    }
    if (Array.isArray(assignedEmployees)) {
      role.assignedEmployees = assignedEmployees;
    }

    const updated = await role.save();
    res.json({ success: true, message: "Role updated successfully", data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/roles/:id/members - bulk add, remove, or set assigned employees (Multi-Role)
router.post("/:id/members", async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId ? { _id: req.params.id } : { slug: req.params.id.toLowerCase() };

    const role = await Role.findOne(query);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    const { action, members } = req.body; // action: 'add' | 'remove' | 'set', members: string[]
    if (!Array.isArray(members)) {
      return res.status(400).json({ success: false, message: "Members array is required" });
    }

    const currentSet = new Set(role.assignedEmployees || []);

    if (action === "add") {
      members.forEach((m) => {
        if (m && typeof m === "string") currentSet.add(m.trim());
      });
    } else if (action === "remove") {
      members.forEach((m) => {
        if (m && typeof m === "string") currentSet.delete(m.trim());
      });
    } else {
      // 'set' replaces the whole list
      currentSet.clear();
      members.forEach((m) => {
        if (m && typeof m === "string") currentSet.add(m.trim());
      });
    }

    role.assignedEmployees = Array.from(currentSet);
    const updated = await role.save();

    res.json({
      success: true,
      message: `Updated members for role ${role.name}`,
      count: role.assignedEmployees.length,
      data: updated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/roles/:id - delete a custom role
router.delete("/:id", async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId ? { _id: req.params.id } : { slug: req.params.id.toLowerCase() };

    const role = await Role.findOne(query);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    if (role.isSystem) {
      return res.status(403).json({ success: false, message: "System core roles cannot be deleted" });
    }

    await Role.deleteOne(query);
    res.json({ success: true, message: `Role '${role.name}' deleted successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
