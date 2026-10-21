const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },
    orderId: {
      type: String,
      default: "",
      trim: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    companyName: {
      type: String,
      default: "",
      trim: true,
    },
    clientName: {
      type: String,
      default: "",
      trim: true,
    },
    assignedTo: {
      type: String,
      default: "Marcus Vance",
      trim: true,
    },
    department: {
      type: String,
      default: "Production", // "Production", "Stock Room", "Operations"
      trim: true,
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Normal", "Low"],
      default: "Normal",
    },
    status: {
      type: String,
      enum: ["open", "work-in-progress", "on-hold", "resolved", "closed"],
      default: "open",
    },
    dueDate: {
      type: String,
      default: "",
    },
    totalQuantity: {
      type: Number,
      default: 0,
    },
    orderStage: {
      type: String,
      default: "sample",
    },
    subStage: {
      type: String,
      default: "",
    },
    approvedBy: {
      name: { type: String, default: "" },
      role: { type: String, default: "" },
      comment: { type: String, default: "" },
      approvedAt: { type: Date, default: Date.now },
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    collection: "tasks",
    timestamps: true,
  }
);

// Index for quick queries
taskSchema.index({ status: 1 });
taskSchema.index({ department: 1 });
taskSchema.index({ leadId: 1 });

module.exports = mongoose.model("Task", taskSchema);
