const mongoose = require("mongoose");

const inventorySubItemSchema = new mongoose.Schema({
  item: { type: String, default: "" },
  itemCode: { type: String, default: "" },
  category: { type: String, default: "" },
  specification: { type: String, default: "" },
  unit: { type: String, default: "Pcs" },
  openingStock: { type: Number, default: 0 },
  countedQuantity: { type: Number, default: 0 },
  variance: { type: Number, default: 0 },
  remarks: { type: String, default: "-" },
});

const inventoryTransactionSchema = new mongoose.Schema({
  orderId: { type: String, default: "" },
  clientName: { type: String, default: "" },
  type: {
    type: String,
    enum: ["Used", "Reserved", "Pending", "Restock", "Adjustment"],
    default: "Used",
  },
  quantity: { type: Number, default: 0 },
  date: { type: String, default: "" },
  status: { type: String, default: "Completed" },
  impact: { type: Number, default: 0 },
  notes: { type: String, default: "" },
  loggedBy: { type: String, default: "Admin" },
  createdAt: { type: Date, default: Date.now },
});

const inventoryActivitySchema = new mongoose.Schema({
  action: { type: String, default: "" },
  user: { type: String, default: "Adam (CEO)" },
  role: { type: String, default: "Manager" },
  timestamp: { type: String, default: "" },
  details: { type: String, default: "" },
  badgeType: { type: String, default: "info" },
  createdAt: { type: Date, default: Date.now },
});

const inventorySchema = new mongoose.Schema(
  {
    number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    productName: {
      type: String,
      default: "",
      trim: true,
    },
    sku: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      default: "Apparel",
      trim: true,
    },
    inventoryType: {
      type: String,
      default: "Stockroom Inventory",
    },
    stockroom: {
      type: String,
      default: "Main Stockroom - Delhi",
    },
    location: {
      type: String,
      default: "Rack A",
    },
    status: {
      type: String,
      default: "In stock", // "In stock" | "Low stock" | "Out of stock" | "Open"
    },
    state: {
      type: String,
      default: "Draft", // "Draft" | "Under Review" | "Approved"
    },
    incoming: {
      type: Number,
      default: 0,
    },
    stock: {
      type: Number,
      default: 0,
    },
    totalBaseStock: {
      type: Number,
      default: 100,
    },
    price: {
      type: Number,
      default: 0,
    },
    inventoryDate: {
      type: String,
      default: "",
    },
    preparedBy: {
      type: String,
      default: "",
    },
    checkedBy: {
      type: String,
      default: "",
    },
    approvedBy: {
      type: String,
      default: "",
    },
    approvalDate: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    items: [inventorySubItemSchema],
    transactions: [inventoryTransactionSchema],
    activities: [inventoryActivitySchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Inventory", inventorySchema);
