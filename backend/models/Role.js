const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    color: {
      type: String,
      default: "#2563eb",
    },
    icon: {
      type: String,
      default: "Shield",
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    dashboardView: {
      type: String,
      default: "default", // "orders" | "stock_inventory" | "production" | "coordinator" | "executive" | "default"
    },
    menuPermissions: {
      dashboard: { type: Boolean, default: true },
      orders: { type: Boolean, default: false },
      createLead: { type: Boolean, default: false },
      invoices: { type: Boolean, default: false },
      tasks: { type: Boolean, default: false },
      stockRoom: { type: Boolean, default: false },
      approvals: { type: Boolean, default: false },
      employees: { type: Boolean, default: false },
      console: { type: Boolean, default: false },
    },
    actionPermissions: {
      canCreateLead: { type: Boolean, default: false },
      canEditOrder: { type: Boolean, default: false },
      canApproveOrder: { type: Boolean, default: false },
      canCreateInvoice: { type: Boolean, default: false },
      canRequestDTF: { type: Boolean, default: false },
      canManageStock: { type: Boolean, default: false },
      canAssignBackup: { type: Boolean, default: false },
    },
    assignedEmployees: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    collection: "roles",
    timestamps: true,
  }
);

module.exports = mongoose.model("Role", roleSchema);
