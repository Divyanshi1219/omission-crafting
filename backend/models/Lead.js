const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  item: { type: String, default: "" },
  itemType: { type: String, default: "" },
  enterItem: { type: String, default: "" },
  printingType: { type: String, default: "" },
  sublimationOption: { type: String, default: "" },
  collarType: { type: String, default: "" },
  neckType: { type: String, default: "" },
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
    printingType: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: {
      type: String,
      default: "",
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
    repeatedOrder: {
      type: String,
      default: "No",
    },
    // Order details (if query is order)
    taskId: {
      type: String,
      default: "",
      trim: true,
    },
    orderId: {
      type: String,
      default: "",
    },
    sampleId: {
      type: String,
      default: "",
    },
    partialId: {
      type: String,
      default: "",
    },
    completeId: {
      type: String,
      default: "",
    },
    currentStageId: {
      type: String,
      default: "",
    },
    attachment: {
      type: String,
      default: "",
    },
    attachmentName: {
      type: String,
      default: "",
    },
    logoDesign: {
      type: String,
      default: "",
    },
    logoDesignName: {
      type: String,
      default: "",
    },
    logoDesignFiles: {
      type: [{ data: String, name: String }],
      default: [],
    },
    digitalDesign: {
      type: String,
      default: "",
    },
    digitalDesignName: {
      type: String,
      default: "",
    },
    digitalDesignFiles: {
      type: [{ data: String, name: String }],
      default: [],
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
    approvalStatus: {
      type: String,
      default: "Pending", // "Pending", "Approved", "Referred Back"
    },
    leadApproval: {
      status: { type: String, default: "Pending" }, // "Pending", "Approved", "Referred Back"
      note: { type: String, default: "" },
      author: { type: String, default: "" },
      updatedAt: { type: Date, default: null },
      resubmittedAt: { type: Date, default: null },
    },
    stockApproval: {
      status: { type: String, default: "Pending" }, // "Pending", "Approved", "Referred Back"
      note: { type: String, default: "" },
      author: { type: String, default: "" },
      updatedAt: { type: Date, default: null },
      resubmittedAt: { type: Date, default: null },
    },
    productionApproval: {
      status: { type: String, default: "Pending" }, // "Pending", "Approved", "Referred Back"
      note: { type: String, default: "" },
      author: { type: String, default: "" },
      updatedAt: { type: Date, default: null },
      resubmittedAt: { type: Date, default: null },
    },
    approvalComments: [
      {
        author: { type: String, default: "" },
        role: { type: String, default: "" },
        comment: { type: String, default: "" },
        status: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    activityLogs: [
      {
        action: { type: String, default: "" },
        stage: { type: String, default: "" },
        performedBy: { type: String, default: "" },
        role: { type: String, default: "" },
        loginId: { type: String, default: "" },
        details: { type: String, default: "" },
        changes: { type: [String], default: [] },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    // Workflow tracking fields across Sample, Partial, and Complete
    stockTaskStage: {
      type: String,
      default: "verification", // "verification", "ready_to_pick", "staging_room", "completed"
    },
    stockTaskData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    productionTaskStage: {
      type: String,
      default: "logo_printing", // "logo_printing", "logo_cutting", "completed"
    },
    productionTaskData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    printingStageData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sampleReadyToPickUpData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sampleStagingGroundData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    customerApprovalData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    partialData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    partialPrintingData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    partialQualityCheckData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    partialPackagingData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    partialStagingRoomData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    partialPaymentConfirmationData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    completeData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    completePrintingData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    completeQualityCheckData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    completePackagingData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    completeDeliveryPendingData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    completeDeliveredData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    completeCustomerSupportData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: "leads",
    timestamps: true,
  }
);

leadSchema.pre("save", function () {
  // Deduplicate identical base64 strings between legacy attachment/logoDesign and logoDesignFiles
  if (this.logoDesignFiles && this.logoDesignFiles[0] && this.logoDesignFiles[0].data) {
    if (this.attachment === this.logoDesignFiles[0].data) {
      this.attachment = "";
    }
    if (this.logoDesign === this.logoDesignFiles[0].data) {
      this.logoDesign = "";
    }
  } else if (this.attachment && this.logoDesign && this.attachment === this.logoDesign) {
    this.attachment = "";
  }
  if (this.digitalDesignFiles && this.digitalDesignFiles[0] && this.digitalDesignFiles[0].data) {
    if (this.digitalDesign === this.digitalDesignFiles[0].data) {
      this.digitalDesign = "";
    }
  }

  // Keep historical attachments metadata lightweight (drop stale multi-megabyte base64 from prior stages)
  if (this.stockTaskData) {
    if (Array.isArray(this.stockTaskData.sampleReadyToPickAttachments)) {
      this.stockTaskData.sampleReadyToPickAttachments = this.stockTaskData.sampleReadyToPickAttachments.map(a => ({
        name: a?.name || "",
        size: a?.size || "",
        type: a?.type || "",
        stage: "sample"
      }));
    }
  }
});

leadSchema.index({ updatedAt: -1, createdAt: -1 });
leadSchema.index({ query: 1, updatedAt: -1, createdAt: -1 });
leadSchema.index({ orderStage: 1, subStage: 1, updatedAt: -1 });

module.exports = mongoose.model("Lead", leadSchema);
