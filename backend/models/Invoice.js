const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema({
  itemName: { type: String, default: "" },
  quantity: { type: Number, default: 1 },
  unit: { type: String, default: "Pcs" },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    companyName: {
      type: String,
      default: "Omission Crafting",
      trim: true,
    },
    companyAddress: {
      type: String,
      default: "12/4 Industrial Area, Tirupur, Tamil Nadu - 641602",
      trim: true,
    },
    companyGstin: {
      type: String,
      default: "33AAEC01234F1Z5",
      trim: true,
    },
    companyLogo: {
      type: String,
      default: "",
    },
    themeColor: {
      type: String,
      default: "#be185d", // Sales Executive Rose/Crimson accent default
    },
    currency: {
      type: String,
      default: "INR",
    },
    invoiceDate: {
      type: String,
      default: "",
    },
    dueDate: {
      type: String,
      default: "",
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerAddress: {
      type: String,
      default: "",
      trim: true,
    },
    customerGstin: {
      type: String,
      default: "",
      trim: true,
    },
    customerPhone: {
      type: String,
      default: "",
      trim: true,
    },
    customerEmail: {
      type: String,
      default: "",
      trim: true,
    },
    items: [invoiceItemSchema],
    includeTax: {
      type: Boolean,
      default: true,
    },
    taxRate: {
      type: Number,
      default: 18,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      default: "flat",
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
    },
    amountInWords: {
      type: String,
      default: "",
    },
    termsAndConditions: {
      type: String,
      default: "1. Payment is due within specified due date.\n2. Goods once sold are not returnable without authorization.\n3. Thank you for your business!",
    },
    paymentDetails: {
      bankName: { type: String, default: "HDFC Bank" },
      accountNumber: { type: String, default: "50200012345678" },
      ifsc: { type: String, default: "HDFC0001234" },
      upiId: { type: String, default: "omission@hdfcbank" },
    },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Paid", "Overdue"],
      default: "Sent",
    },
    createdBy: {
      type: String,
      default: "Divyanshi (Sales Executive)",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
