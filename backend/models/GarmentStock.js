const mongoose = require("mongoose");

const stockReservationSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    trim: true,
  },
  clientName: {
    type: String,
    default: "",
    trim: true,
  },
  size: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  notes: {
    type: String,
    default: "",
    trim: true,
  },
  reservedBy: {
    type: String,
    default: "Elena Rostova (Stock Room Manager)",
    trim: true,
  },
  status: {
    type: String,
    enum: ["Active", "Fulfilled", "Released"],
    default: "Active",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const stockTransactionSchema = new mongoose.Schema({
  date: {
    type: String,
    default: () => new Date().toISOString().split("T")[0],
  },
  time: {
    type: String,
    default: () =>
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  },
  type: {
    type: String,
    enum: ["Inward / Restock", "Used", "Reserved", "Adjustment", "Transfer"],
    default: "Inward / Restock",
  },
  size: {
    type: String,
    default: "",
    trim: true,
  },
  quantity: {
    type: Number,
    default: 0,
  },
  impact: {
    type: Number,
    default: 0,
  },
  orderId: {
    type: String,
    default: "",
    trim: true,
  },
  clientName: {
    type: String,
    default: "",
    trim: true,
  },
  notes: {
    type: String,
    default: "",
    trim: true,
  },
  loggedBy: {
    type: String,
    default: "Elena Rostova (Stock Room Manager)",
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const garmentStockSchema = new mongoose.Schema(
  {
    product: {
      type: String,
      required: true,
      trim: true,
    },
    colour: {
      type: String,
      required: true,
      trim: true,
    },
    cut: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      default: "Main Stockroom",
      trim: true,
    },
    type: {
      type: String,
      default: "Stock",
      trim: true,
    },
    sizes: {
      XS: { type: Number, default: 0, min: 0 },
      S: { type: Number, default: 0, min: 0 },
      M: { type: Number, default: 0, min: 0 },
      L: { type: Number, default: 0, min: 0 },
      XL: { type: Number, default: 0, min: 0 },
      XXL: { type: Number, default: 0, min: 0 },
    },
    lowStockThreshold: {
      type: Number,
      default: 2,
    },
    reservations: [stockReservationSchema],
    transactions: [stockTransactionSchema],
  },
  {
    timestamps: true,
  }
);

// Helpful index to quickly lookup and prevent duplicates for the same product, colour, cut, and location
garmentStockSchema.index(
  { product: 1, colour: 1, cut: 1, location: 1 },
  { unique: true }
);

module.exports = mongoose.model("GarmentStock", garmentStockSchema);

