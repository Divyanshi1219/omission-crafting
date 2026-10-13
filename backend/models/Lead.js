const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  item: { type: String, default: "" },
  printingType: { type: String, default: "" },
  sublimationOption: { type: String, default: "" },
  fabric: { type: String, default: "" },
  quantity: { type: Number, default: 0 },
  size: { type: String, default: "" },
  color: { type: String, default: "" },
});

const leadSchema = new mongoose.Schema(
  {
    employeeName: {
      type: String,
      default: "Divyanshi",
      trim: true,
    },
    query: {
      type: String,
      default: "",
    },
    queryStatus: {
      type: String,
      default: "",
    },
    selectedStage: {
      type: String,
      default: "New",
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
    companyAddress: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    pincode: {
      type: String,
      default: "",
      trim: true,
    },
    phoneNumber: {
      type: String,
      default: "",
      trim: true,
    },
    scheduleDate: {
      type: String,
      default: "",
    },
    scheduleTime: {
      type: String,
      default: "",
    },
    additionalNote: {
      type: String,
      default: "",
    },
    // Order details (if query is order)
    orderId: {
      type: String,
      default: "",
    },
    logoName: {
      type: String,
      default: "",
    },
    orderStage: {
      type: String,
      default: "",
    },
    subStage: {
      type: String,
      default: "",
    },
    totalQuantity: {
      type: Number,
      default: 0,
    },
    pricePerPiece: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    gst: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      default: 0,
    },
    advanceAmount: {
      type: Number,
      default: 0,
    },
    pendingAmount: {
      type: Number,
      default: 0,
    },
    deliveryDate: {
      type: String,
      default: "",
    },
    urgency: {
      type: String,
      default: "",
    },
    modeOfDelivery: {
      type: String,
      default: "",
    },
    items: [itemSchema],
  },
  {
    collection: "leads",
    timestamps: true,
  }
);

module.exports = mongoose.model("Lead", leadSchema);
