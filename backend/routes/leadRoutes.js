const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Lead = require("../models/Lead");

// Lightweight in-memory cache for fast dashboard & list queries (invalidated on any write)
const leadsCache = new Map();
const CACHE_TTL_MS = 6000; // 6 seconds

const clearLeadsCache = () => {
  leadsCache.clear();
};

// Automatically bust cache whenever any write/update/delete operation is performed
router.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    clearLeadsCache();
  }
  next();
});

// GET /api/leads - Fetch leads (optional filter by query, orderStage, subStage)
router.get("/", async (req, res) => {
  try {
    const cacheKey = req.originalUrl || JSON.stringify(req.query);
    const cached = leadsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return res.json(cached.data);
    }

    const filter = {};
    const q = req.query.query || req.query.status;
    if (q) {
      if (q === "order") {
        filter.$and = [
          { query: { $nin: ["lead", "leads"] } },
          {
            $or: [
              { query: "order" },
              { orderStage: { $in: ["sample", "partial", "complete"] } },
              { orderId: { $exists: true, $ne: "" } }
            ]
          }
        ];
      } else if (q === "lead" || q === "leads") {
        filter.query = { $ne: "order" };
      }
    }
    if (req.query.orderStage) {
      filter.orderStage = new RegExp(`^${req.query.orderStage}$`, "i");
    }
    if (req.query.subStage) {
      const ss = req.query.subStage.toLowerCase();
      if (ss === "leads" || ss === "new") {
        filter.$or = [
          { subStage: { $regex: /^new$/i } },
          { subStage: { $regex: /^leads$/i } },
          { subStage: "" },
          { subStage: null },
          { subStage: { $exists: false } }
        ];
      } else {
        filter.subStage = new RegExp(`^${req.query.subStage.replace(/-/g, "[ -]")}$`, "i");
      }
    }
    if (req.query.approvalStatus) {
      if (req.query.approvalStatus.toLowerCase() === "pending") {
        filter.$or = [
          { approvalStatus: "Pending" },
          { approvalStatus: "" },
          { approvalStatus: null },
          { approvalStatus: { $exists: false } },
        ];
      } else {
        filter.approvalStatus = new RegExp(`^${req.query.approvalStatus}$`, "i");
      }
    }
    if (req.query.employeeName) {
      filter.employeeName = new RegExp(`^${req.query.employeeName.trim()}$`, "i");
    }
    // Exclude heavy base64 file payloads from list queries unless explicitly requested (?includeFiles=true).
    // Detail view (GET /:id) and file download endpoints return the full base64 data on demand.
    const includesAttachment = req.query.includeFiles === "true";
    const leads = await Lead.find(
      filter,
      includesAttachment
        ? undefined
        : {
            attachment: 0,
            logoDesign: 0,
            digitalDesign: 0,
            logoDesignFiles: 0,
            digitalDesignFiles: 0,
            "stockTaskData.readyToPickAttachments": 0,
            "stockTaskData.sampleReadyToPickAttachments": 0,
            "stockTaskData.partialReadyToPickAttachments": 0,
            "stockTaskData.completeReadyToPickAttachments": 0,
            "printingStageData.attachments": 0,
            "sampleReadyToPickUpData.attachments": 0,
            "sampleStagingGroundData.attachments": 0,
            "sampleStagingGroundData.stagingAttachments": 0,
            "customerApprovalData.attachments": 0,
            "customerApprovalData.stagingAttachments": 0,
            "partialPrintingData.attachments": 0,
            "partialQualityCheckData.attachments": 0,
            "partialPackagingData.attachments": 0,
            "completePrintingData.attachments": 0,
            "completeQualityCheckData.attachments": 0,
            "completePackagingData.attachments": 0,
          }
    )
      .sort({ updatedAt: -1, createdAt: -1 })
      .allowDiskUse(true)
      .lean();

    // Clean up contaminated approvals and ensure starting stage (batched in bulkWrite)
    const bulkOps = [];
    for (const l of leads) {
      let needsUpdate = false;
      const updates = {};

      // Ensure Stage IDs (sampleId, partialId, completeId, currentStageId)
      if (l.orderId || l.query === "order" || l.orderStage) {
        const rawNum = (l.orderId || l._id.toString().slice(-5)).replace(/^ORD-?/i, "");
        if (!l.sampleId) {
          l.sampleId = `SMP-${rawNum}`;
          updates.sampleId = l.sampleId;
          needsUpdate = true;
        }
        if (!l.partialId) {
          l.partialId = `PRT-${rawNum}`;
          updates.partialId = l.partialId;
          needsUpdate = true;
        }
        if (!l.completeId) {
          l.completeId = `CMP-${rawNum}`;
          updates.completeId = l.completeId;
          needsUpdate = true;
        }
        const expectedStageId =
          (l.orderStage === "complete")
            ? l.completeId
            : (l.orderStage === "partial")
            ? l.partialId
            : l.sampleId;
        if (l.currentStageId !== expectedStageId) {
          l.currentStageId = expectedStageId;
          updates.currentStageId = expectedStageId;
          needsUpdate = true;
        }
      }

      if (
        l.productionApproval &&
        (l.productionApproval.note === "Approved by Lead Manager" ||
          l.productionApproval.author === "Sarah Jenkins")
      ) {
        l.productionApproval = { status: "Pending", note: "", author: "Marcus Vance", updatedAt: null };
        updates.productionApproval = l.productionApproval;
        needsUpdate = true;
      }

      if (
        l.stockApproval &&
        (l.stockApproval.note === "Approved by Lead Manager" ||
          l.stockApproval.author === "Sarah Jenkins")
      ) {
        l.stockApproval = { status: "Pending", note: "", author: "Elena Rostova", updatedAt: null };
        updates.stockApproval = l.stockApproval;
        needsUpdate = true;
      }

      const isLeadApproved =
        l.leadApproval?.status === "Approved" ||
        l.subStage === "dtf-pending" ||
        l.orderStage === "partial" ||
        l.orderStage === "complete";

      if (isLeadApproved) {
        if (!l.stockTaskStage) {
          l.stockTaskStage = "verification";
          updates.stockTaskStage = "verification";
          needsUpdate = true;
        }
        // If printingSubmitted is true, but cutting not completed: stage is logo_cutting
        if (l.productionTaskData?.printingSubmitted === true && l.productionTaskStage !== "completed") {
          if (l.productionTaskStage !== "logo_cutting") {
            l.productionTaskStage = "logo_cutting";
            updates.productionTaskStage = "logo_cutting";
            needsUpdate = true;
          }
          if (l.productionApproval?.status !== "Pending") {
            l.productionApproval = { status: "Pending", note: "", author: "Marcus Vance", updatedAt: new Date() };
            updates.productionApproval = l.productionApproval;
            needsUpdate = true;
          }
        } else if (l.productionTaskStage !== "completed" && !l.productionTaskData?.printingSubmitted) {
          if (l.productionTaskStage !== "logo_printing") {
            l.productionTaskStage = "logo_printing";
            updates.productionTaskStage = "logo_printing";
            needsUpdate = true;
          }
          if (l.productionApproval?.status !== "Pending") {
            l.productionApproval = { status: "Pending", note: "", author: "Marcus Vance", updatedAt: null };
            updates.productionApproval = l.productionApproval;
            needsUpdate = true;
          }
        }
      }

      if (!l.taskId && (l.query === "order" || l.orderId || l.orderStage)) {
        const derivedTaskId = l.orderId
          ? `TSK-${l.orderId.replace(/^ORD-?/i, "")}`
          : `TSK-${String(l._id).slice(-5).toUpperCase()}`;
        l.taskId = derivedTaskId;
        updates.taskId = derivedTaskId;
        needsUpdate = true;
      }

      if (needsUpdate) {
        bulkOps.push({
          updateOne: {
            filter: { _id: l._id },
            update: { $set: updates },
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      Lead.bulkWrite(bulkOps).catch((err) => console.error("Background bulkWrite error:", err));
    }

    const responsePayload = { success: true, count: leads.length, data: leads };
    leadsCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });
    res.json(responsePayload);
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper: Generate next sequential order ID (e.g. ORD00001, ORD00002)
const getNextOrderId = async () => {
  const leads = await Lead.find({ orderId: { $regex: /^ORD\d+$/i } }, "orderId");
  let maxNumber = 0;
  leads.forEach((l) => {
    if (l.orderId) {
      const match = l.orderId.match(/^ORD(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  });
  return `ORD${String(maxNumber + 1).padStart(5, "0")}`;
};

// Helper: Generate next sequential task ID (e.g. TSK-00001, TSK-00002)
const getNextTaskId = async () => {
  const leads = await Lead.find({ taskId: { $regex: /^TSK-?\d+$/i } }, "taskId");
  let maxNumber = 0;
  leads.forEach((l) => {
    if (l.taskId) {
      const match = l.taskId.match(/^TSK-?(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  });
  return `TSK-${String(maxNumber + 1).padStart(5, "0")}`;
};

const formatStageLabel = (s) => {
  if (!s) return "Lead";
  const str = String(s).trim().toLowerCase();
  if (str === "sample") return "Sample";
  if (str === "partial") return "Partial";
  if (str === "complete") return "Complete";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatSubStageLabel = (s) => {
  if (!s) return "Order";
  const str = String(s).trim().toLowerCase().replace(/_/g, "-");
  if (str === "dtf-pending") return "DTF Pending";
  if (str === "ready-to-pick") return "From Stock";
  if (str === "ready-to-pick-up") return "From Printing";
  if (str === "ready-to-pick-production") return "From Production";
  if (str === "staging-ground") return "Staging Ground";
  if (str === "staging-room") return "Staging Room";
  if (str === "customer-approval-awaiting") return "Customer Approval Awaiting";
  if (str === "quality-check") return "Quality Check";
  if (str === "payment-confirmation") return "Payment Confirmation";
  if (str === "delivery-pending") return "Delivery Pending";
  if (str === "customer-support") return "Customer Support";
  if (str === "logo-printing") return "Logo Printing";
  if (str === "logo-cutting") return "Logo Cutting";
  return str
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const isEmbroidery = (lead) => {
  if (!lead) return false;
  if (String(lead.printingType || "").toLowerCase().trim() === "embroidery") return true;
  if (Array.isArray(lead.items) && lead.items.some((it) => String(it?.printingType || "").toLowerCase().trim() === "embroidery")) return true;
  return false;
};

const getItemDisplayName = (it) => {
  if (!it) return "Item";
  const raw = (it.item || it.enterItem || it.itemType || "").trim();
  if (!raw) return "Item";
  if (raw.toLowerCase() === "t-shirt" || raw.toLowerCase() === "tshirt") return "T-Shirt";
  return raw;
};

const deduplicateAndSanitizeAttachments = (docData) => {
  if (!docData) return docData;
  if (Array.isArray(docData.logoDesignFiles) && docData.logoDesignFiles.length > 0 && docData.logoDesignFiles[0]?.data) {
    docData.logoDesign = "";
    docData.attachment = "";
  }
  if (Array.isArray(docData.digitalDesignFiles) && docData.digitalDesignFiles.length > 0 && docData.digitalDesignFiles[0]?.data) {
    docData.digitalDesign = "";
  }
  return docData;
};

const computeLeadChanges = (existing, incoming) => {
  const changes = [];
  const fieldDefs = [
    { key: "employeeName", label: "Employee Name" },
    { key: "assignedTo", label: "Assigned To" },
    { key: "query", label: "Query Type" },
    { key: "orderStage", label: "Order Stage" },
    { key: "subStage", label: "Sub Stage" },
    { key: "employeeName", label: "Order Owner" },
    { key: "backupEmployee", label: "Backup Employee" },
    { key: "source", label: "Source" },
    { key: "companyName", label: "Company Name" },
    { key: "clientName", label: "Client Name" },
    { key: "companyAddress", label: "Company Address" },
    { key: "state", label: "State" },
    { key: "pincode", label: "Pincode" },
    { key: "phoneNumber", label: "Phone Number" },
    { key: "repeatedOrder", label: "Repeated Order" },
    { key: "scheduleDate", label: "Schedule Date" },
    { key: "scheduleTime", label: "Schedule Time" },
    { key: "additionalNote", label: "Additional Note" },
    { key: "logoName", label: "Logo Name" },
    { key: "totalQuantity", label: "Total Quantity (pcs)" },
    { key: "pricePerPiece", label: "Price Per Piece (₹)" },
    { key: "totalAmount", label: "Total Amount (₹)" },
    { key: "gst", label: "GST (%)" },
    { key: "netAmount", label: "Net Amount (₹)" },
    { key: "advanceAmount", label: "Advance Amount (₹)" },
    { key: "pendingAmount", label: "Pending Amount (₹)" },
    { key: "urgency", label: "Urgency" },
    { key: "deliveryDate", label: "Delivery Date" },
    { key: "modeOfDelivery", label: "Mode of Delivery" },
  ];

  for (const { key, label } of fieldDefs) {
    if (incoming[key] === undefined) continue;
    let oldVal = existing[key] !== undefined && existing[key] !== null ? String(existing[key]).trim() : "";
    let newVal = incoming[key] !== undefined && incoming[key] !== null ? String(incoming[key]).trim() : "";
    if (key === "deliveryDate") {
      if (oldVal.includes("T")) oldVal = oldVal.split("T")[0];
      if (newVal.includes("T")) newVal = newVal.split("T")[0];
    }
    if (["totalQuantity", "pricePerPiece", "totalAmount", "gst", "netAmount", "advanceAmount", "pendingAmount"].includes(key)) {
      const oldNum = oldVal === "" ? 0 : Number(oldVal);
      const newNum = newVal === "" ? 0 : Number(newVal);
      if (!isNaN(oldNum) && !isNaN(newNum) && oldNum === newNum) continue;
    }
    if (oldVal !== newVal) {
      changes.push(`${label}: "${oldVal || "Empty"}" → "${newVal || "Empty"}"`);
    }
  }

  if (Array.isArray(incoming.logoDesignFiles)) {
    const oldNames = (Array.isArray(existing.logoDesignFiles) ? existing.logoDesignFiles : [])
      .map((f) => f?.name || "")
      .filter(Boolean)
      .join(", ");
    const newNames = incoming.logoDesignFiles
      .map((f) => f?.name || "")
      .filter(Boolean)
      .join(", ");
    if (oldNames !== newNames) {
      changes.push(`Logo Design Files: "${oldNames || "None"}" → "${newNames || "None"}"`);
    }
  }

  if (Array.isArray(incoming.digitalDesignFiles)) {
    const oldNames = (Array.isArray(existing.digitalDesignFiles) ? existing.digitalDesignFiles : [])
      .map((f) => f?.name || "")
      .filter(Boolean)
      .join(", ");
    const newNames = incoming.digitalDesignFiles
      .map((f) => f?.name || "")
      .filter(Boolean)
      .join(", ");
    if (oldNames !== newNames) {
      changes.push(`Digital Design Files: "${oldNames || "None"}" → "${newNames || "None"}"`);
    }
  }

  if (Array.isArray(incoming.items)) {
    const oldItems = Array.isArray(existing.items) ? existing.items : [];
    const newItems = incoming.items;
    const maxLen = Math.max(oldItems.length, newItems.length);

    for (let i = 0; i < maxLen; i++) {
      const oldIt = oldItems[i];
      const newIt = newItems[i];

      if (!oldIt && newIt) {
        const name = getItemDisplayName(newIt);
        const parts = [];
        if (newIt.printingType) parts.push(`Printing: ${newIt.printingType}`);
        if (newIt.sublimationOption) parts.push(`Option: ${newIt.sublimationOption}`);
        if (newIt.fabric) parts.push(`Fabric: ${newIt.fabric}`);
        if (newIt.quantity) parts.push(`Qty: ${newIt.quantity} pcs`);
        if (newIt.size) parts.push(`Size: ${newIt.size}`);
        if (newIt.color) parts.push(`Color: ${newIt.color}`);
        changes.push(`Added Item #${i + 1} (${name}): ${parts.join(", ") || "Added"}`);
      } else if (oldIt && !newIt) {
        const name = getItemDisplayName(oldIt);
        changes.push(
          `Removed Item #${i + 1} (${name} - Fabric: ${oldIt.fabric || "-"}, Qty: ${oldIt.quantity || 0} pcs, Size: ${oldIt.size || "-"}, Color: ${oldIt.color || "-"})`
        );
      } else if (oldIt && newIt) {
        const oldName = getItemDisplayName(oldIt);
        const newName = getItemDisplayName(newIt);
        const itemChanges = [];

        if (oldName.toLowerCase() !== newName.toLowerCase()) {
          itemChanges.push(`Item changed from "${oldName}" to "${newName}"`);
        }
        const oldPrint = String(oldIt.printingType || "").trim();
        const newPrint = String(newIt.printingType || "").trim();
        if (oldPrint !== newPrint) {
          itemChanges.push(`Printing Type changed from "${oldPrint || "None"}" to "${newPrint || "None"}"`);
        }
        const oldSub = String(oldIt.sublimationOption || "").trim();
        const newSub = String(newIt.sublimationOption || "").trim();
        if (oldSub !== newSub) {
          itemChanges.push(`Sublimation Option changed from "${oldSub || "None"}" to "${newSub || "None"}"`);
        }
        const oldFabric = String(oldIt.fabric || "").trim();
        const newFabric = String(newIt.fabric || "").trim();
        if (oldFabric !== newFabric) {
          itemChanges.push(`Fabric changed from "${oldFabric || "None"}" to "${newFabric || "None"}"`);
        }
        const oldQty = Number(oldIt.quantity) || 0;
        const newQty = Number(newIt.quantity) || 0;
        if (oldQty !== newQty) {
          itemChanges.push(`Quantity changed from "${oldQty} pcs" to "${newQty} pcs"`);
        }
        const oldSize = String(oldIt.size || "").trim();
        const newSize = String(newIt.size || "").trim();
        if (oldSize !== newSize) {
          itemChanges.push(`Size changed from "${oldSize || "None"}" to "${newSize || "None"}"`);
        }
        const oldColor = String(oldIt.color || "").trim();
        const newColor = String(newIt.color || "").trim();
        if (oldColor !== newColor) {
          itemChanges.push(`Color changed from "${oldColor || "None"}" to "${newColor || "None"}"`);
        }

        if (itemChanges.length > 0) {
          changes.push(`Item #${i + 1} (${newName}): ${itemChanges.join("; ")}`);
        }
      }
    }
  }

  return changes;
};

const buildInitialCreationSummary = (leadData) => {
  const summary = [];
  if (leadData.orderId) summary.push(`Order ID: ${leadData.orderId}`);
  if (leadData.employeeName) summary.push(`Employee Name: ${leadData.employeeName}`);
  if (leadData.query) summary.push(`Query Type: ${leadData.query}`);
  if (leadData.companyName) summary.push(`Company Name: ${leadData.companyName}`);
  if (leadData.clientName) summary.push(`Client Name: ${leadData.clientName}`);
  if (leadData.phoneNumber) summary.push(`Phone Number: ${leadData.phoneNumber}`);
  if (leadData.query === "order") {
    if (leadData.totalQuantity) summary.push(`Total Quantity: ${leadData.totalQuantity} pcs`);
    if (leadData.pricePerPiece) summary.push(`Price Per Piece: ₹${leadData.pricePerPiece}`);
    if (leadData.totalAmount) summary.push(`Total Amount: ₹${leadData.totalAmount}`);
    if (leadData.netAmount) summary.push(`Net Amount: ₹${leadData.netAmount}`);
    if (leadData.advanceAmount !== undefined && leadData.advanceAmount !== "")
      summary.push(`Advance Amount: ₹${leadData.advanceAmount}`);
    if (leadData.pendingAmount !== undefined && leadData.pendingAmount !== "")
      summary.push(`Pending Amount: ₹${leadData.pendingAmount}`);
    if (Array.isArray(leadData.items) && leadData.items.length > 0) {
      leadData.items.forEach((it, idx) => {
        const name = getItemDisplayName(it);
        const parts = [];
        if (it.printingType) parts.push(`Printing: ${it.printingType}`);
        if (it.fabric) parts.push(`Fabric: ${it.fabric}`);
        if (it.quantity) parts.push(`Qty: ${it.quantity} pcs`);
        if (it.size) parts.push(`Size: ${it.size}`);
        if (it.color) parts.push(`Color: ${it.color}`);
        summary.push(`Item #${idx + 1} (${name}): ${parts.join(", ")}`);
      });
    }
  }
  return summary;
};

// GET /api/leads/next-order-id - Get next auto-generated orderId
router.get("/next-order-id", async (req, res) => {
  try {
    const nextOrderId = await getNextOrderId();
    res.json({ success: true, nextOrderId });
  } catch (error) {
    console.error("Error generating next order ID:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/leads/next-task-id - Get next auto-generated taskId
router.get("/next-task-id", async (req, res) => {
  try {
    const nextTaskId = await getNextTaskId();
    res.json({ success: true, nextTaskId });
  } catch (error) {
    console.error("Error generating next task ID:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/leads/:id - Fetch single lead by id
// GET /api/leads/:id/attachment - Download or stream lead attachment on demand
router.get("/:id/attachment", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).send("Invalid ID");
    }
    const lead = await Lead.findById(req.params.id).select(
      "attachment logoDesign logoDesignFiles digitalDesign digitalDesignFiles attachmentName logoDesignName"
    );
    if (!lead) return res.status(404).send("Not found");
    const fileData =
      lead.attachment ||
      lead.logoDesign ||
      lead.digitalDesign ||
      (Array.isArray(lead.logoDesignFiles) && lead.logoDesignFiles[0]?.data) ||
      (Array.isArray(lead.digitalDesignFiles) && lead.digitalDesignFiles[0]?.data) ||
      "";
    if (!fileData) return res.status(404).send("No attachment found");

    const fileName = lead.logoDesignName || lead.attachmentName || "download";
    const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches) {
      const mime = matches[1];
      const buffer = Buffer.from(matches[2], "base64");
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      return res.send(buffer);
    }
    if (fileData.startsWith("http://") || fileData.startsWith("https://")) {
      return res.redirect(fileData);
    }
    const buffer = Buffer.from(fileData, "base64");
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.send(buffer);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    // Clean up if stock or production was contaminated with "Approved by Lead Manager"
    let modified = false;
    if (
      lead.stockApproval &&
      (lead.stockApproval.note === "Approved by Lead Manager" ||
        lead.stockApproval.author === "Sarah Jenkins")
    ) {
      lead.stockApproval = { status: "Pending", note: "", author: "Elena Rostova", updatedAt: null };
      modified = true;
    }
    if (
      lead.productionApproval &&
      (lead.productionApproval.note === "Approved by Lead Manager" ||
        lead.productionApproval.author === "Sarah Jenkins")
    ) {
      lead.productionApproval = { status: "Pending", note: "", author: "Marcus Vance", updatedAt: null };
      modified = true;
    }
    if (
      lead.stockApproval?.status === "Approved" &&
      lead.productionApproval?.status === "Approved" &&
      (!lead.subStage || lead.subStage === "order" || lead.subStage === "leads" || lead.subStage === "new")
    ) {
      lead.subStage = "printing";
      lead.approvalStatus = "Approved";
      modified = true;
    }

    // Clean up sample attachments for partial orders so Elena Rostova can upload clean partial pictures
    const isPartialLead = lead.orderStage === "partial" || String(lead.currentStageId || lead.stageId || "").startsWith("PRT");
    if (isPartialLead && lead.stockTaskData) {
      const isSampleAttachment = (name) => /(^|[\s_-])bestseller/i.test(name || "");
      const sampleFiles = (lead.stockTaskData.readyToPickAttachments || []).filter(a => isSampleAttachment(a?.name));
      if (sampleFiles.length > 0 && (!lead.stockTaskData.sampleReadyToPickAttachments || lead.stockTaskData.sampleReadyToPickAttachments.length === 0)) {
        lead.stockTaskData.sampleReadyToPickAttachments = sampleFiles;
        modified = true;
      }
      if ((lead.stockTaskData.readyToPickAttachments || []).some(a => isSampleAttachment(a?.name))) {
        lead.stockTaskData.readyToPickAttachments = (lead.stockTaskData.readyToPickAttachments || []).filter(a => !isSampleAttachment(a?.name));
        modified = true;
      }
      if ((lead.stockTaskData.partialReadyToPickAttachments || []).some(a => isSampleAttachment(a?.name))) {
        lead.stockTaskData.partialReadyToPickAttachments = (lead.stockTaskData.partialReadyToPickAttachments || []).filter(a => !isSampleAttachment(a?.name));
        modified = true;
      }
      if (modified) {
        lead.markModified("stockTaskData");
      }
    }
    if (modified) {
      await lead.save();
    }

    const leadObj = lead.toObject ? lead.toObject() : lead;
    if (!leadObj.logoDesign && leadObj.logoDesignFiles?.[0]?.data) {
      leadObj.logoDesign = leadObj.logoDesignFiles[0].data;
    }
    if (!leadObj.digitalDesign && leadObj.digitalDesignFiles?.[0]?.data) {
      leadObj.digitalDesign = leadObj.digitalDesignFiles[0].data;
    }
    if (!leadObj.attachment && leadObj.logoDesign) {
      leadObj.attachment = leadObj.logoDesign;
    }

    res.json({ success: true, data: leadObj });
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/leads - Create new lead (or update if _id provided)
router.post("/", async (req, res) => {
  try {
    const { _id, performedBy, performedByRole, performedById, logAction, ...leadData } = req.body;

    // Normalize subStage: real orders must always sit in the 'order' sub-stage.
    // Prevents "" / "new" / "leads" values on order records, which previously
    // made the list show "Leads" while the detail view treated them as 'order'.
    if (leadData.query === "order") {
      const ss = String(leadData.subStage || "").toLowerCase().trim();
      if (!ss || ss === "new" || ss === "leads") {
        leadData.subStage = "order";
      }
    }

    if (!leadData.orderId) {
      leadData.orderId = await getNextOrderId();
    }

    if ((leadData.query === "order" || leadData.orderStage || leadData.orderId) && !leadData.taskId) {
      if (leadData.orderId) {
        leadData.taskId = `TSK-${leadData.orderId.replace(/^ORD-?/i, "")}`;
      } else {
        leadData.taskId = await getNextTaskId();
      }
    }

    if (Array.isArray(leadData.items) && leadData.items.length > 0) {
      const embItem = leadData.items.find((it) => String(it?.printingType || "").toLowerCase().trim() === "embroidery");
      if (embItem) {
        leadData.printingType = "Embroidery";
      } else if (!leadData.printingType) {
        leadData.printingType = leadData.items[0]?.printingType || "DTF";
      }
    }

    const actorName = performedBy || leadData.employeeName || "Sales Executive";
    const actorRole = performedByRole || "Sales Executive";
    const actorLogin = performedById || leadData.createdBy || "sales";

    if (leadData.orderId) {
      const rawNum = leadData.orderId.replace(/^ORD-?/i, "");
      if (!leadData.sampleId) leadData.sampleId = `SMP-${rawNum}`;
      if (!leadData.partialId) leadData.partialId = `PRT-${rawNum}`;
      if (!leadData.completeId) leadData.completeId = `CMP-${rawNum}`;
      leadData.currentStageId =
        (leadData.orderStage === "complete")
          ? leadData.completeId
          : (leadData.orderStage === "partial")
          ? leadData.partialId
          : leadData.sampleId;
    }

    if (_id) {
      const existing = await Lead.findById(_id);
      if (existing) {
        // Enforce that taskId is strictly non-editable once generated
        if (existing.taskId) {
          leadData.taskId = existing.taskId;
        }
        // If this lead was referred back, resubmitting sets it back to Pending for the referred department(s)
        const isReferredBack =
          existing.approvalStatus === "Referred Back" ||
          existing.leadApproval?.status === "Referred Back" ||
          existing.stockApproval?.status === "Referred Back" ||
          existing.productionApproval?.status === "Referred Back";

        if (isReferredBack) {
          leadData.approvalStatus = "Pending";
          leadData.leadApproval = {
            status: "Pending",
            note: existing.leadApproval?.note || "",
            author: existing.leadApproval?.author || "",
            resubmittedAt: new Date(),
          };
          leadData.stockApproval = {
            status: existing.stockApproval?.status === "Referred Back" ? "Pending" : (existing.stockApproval?.status || "Pending"),
            note: existing.stockApproval?.note || "",
            author: existing.stockApproval?.author || "",
            resubmittedAt: new Date(),
          };
          leadData.productionApproval = {
            status: existing.productionApproval?.status === "Referred Back" ? "Pending" : (existing.productionApproval?.status || "Pending"),
            note: existing.productionApproval?.note || "",
            author: existing.productionApproval?.author || "",
            resubmittedAt: new Date(),
          };

          if (!Array.isArray(leadData.approvalComments)) {
            leadData.approvalComments = existing.approvalComments || [];
          }
          leadData.approvalComments.push({
            author: leadData.employeeName || "Sales Team",
            role: "Sales",
            comment: "Revisions completed by Sales team; resubmitted for Lead Manager approval.",
            status: "Pending",
            createdAt: new Date(),
          });
        }

        // Compute field & item diffs for Activity Log
        const fieldChanges = computeLeadChanges(existing, leadData);
        const wasLead = (existing.query || "lead").toLowerCase().trim() !== "order";
        const isNowOrder = (leadData.query || existing.query || "lead").toLowerCase().trim() === "order";
        const isConvertedToOrder = wasLead && isNowOrder;
        const isDraftSave = isNowOrder && (
          req.body.action === "save" ||
          req.body.isDraft === true ||
          leadData.approvalStatus === "Draft" ||
          (existing.approvalStatus === "Draft" && req.body.action !== "submit")
        );

        if (!isNowOrder) {
          leadData.approvalStatus = "Lead";
          leadData.leadApproval = { status: "Not Applicable", note: "", author: "" };
          leadData.stockApproval = { status: "Not Applicable", note: "", author: "" };
          leadData.productionApproval = { status: "Not Applicable", note: "", author: "" };
          leadData.orderStage = "";
          leadData.subStage = "leads";
        } else if (isConvertedToOrder) {
          if (isDraftSave) {
            leadData.approvalStatus = "Draft";
            leadData.leadApproval = { status: "Draft", note: "", author: "" };
            leadData.isDraft = true;
          } else {
            leadData.approvalStatus = "Pending";
            leadData.leadApproval = {
              status: "Pending",
              note: "",
              author: "",
              resubmittedAt: new Date(),
            };
            leadData.isDraft = false;
          }
        } else if (isDraftSave) {
          leadData.approvalStatus = "Draft";
          leadData.leadApproval = { status: "Draft", note: "", author: "" };
          leadData.isDraft = true;
        }

        const currentStageStr = isNowOrder
          ? `${formatStageLabel(leadData.orderStage || existing.orderStage || "sample")} → ${formatSubStageLabel(leadData.subStage || existing.subStage || "order")}`
          : "Leads";

        const wasDraft = (existing.approvalStatus === "Draft" || existing.isDraft === true || existing.leadApproval?.status === "Draft");
        const isSubmittingOrder = isNowOrder && (req.body.action === "submit" || (typeof logAction === "string" && logAction.toLowerCase().includes("submitted")));

        let actionTitle = logAction;
        if (!actionTitle) {
          if (isConvertedToOrder) {
            actionTitle = isDraftSave ? "Lead Converted to Order & Saved (Draft)" : "Order Submitted for Clearance";
          } else if (isDraftSave) {
            actionTitle = "Order Edited & Saved (Draft)";
          } else if (isSubmittingOrder) {
            actionTitle = "Order Submitted for Clearance";
          } else if (isReferredBack) {
            actionTitle = "Order Edited & Resubmitted for Clearance";
          } else if (isNowOrder) {
            actionTitle = "Order Edited";
          } else {
            actionTitle = "Lead Edited";
          }
        }

        let detailsText = req.body.logDetails || "";
        if (!detailsText) {
          if (isConvertedToOrder) {
            detailsText = isDraftSave
              ? `Lead converted to Order and saved as Draft by ${actorName} (${actorRole}). Pending submission by Sales Executive.`
              : `Order submitted by ${actorName} (${actorRole}). Sent to Lead Manager for clearance.`;
          } else if (isDraftSave) {
            detailsText = `Order details updated and saved as Draft by ${actorName} (${actorRole}). Pending submission by Sales Executive.`;
          } else if (isSubmittingOrder) {
            detailsText = `Order submitted by ${actorName} (${actorRole}). Sent to Lead Manager for clearance.`;
          } else if (isReferredBack) {
            detailsText = `Order edited and resubmitted for clearance by ${actorName} (${actorRole}). Sent to Lead Manager for clearance.`;
          } else if (isNowOrder) {
            detailsText = `Order details updated by ${actorName} (${actorRole}) at stage ${currentStageStr}.`;
          } else {
            detailsText = `Lead details updated and saved to Leads by ${actorName} (${actorRole}).`;
          }
        }

        const existingLogs = Array.isArray(existing.activityLogs) ? [...existing.activityLogs] : [];
        existingLogs.push({
          action: actionTitle,
          stage: currentStageStr,
          performedBy: actorName,
          role: actorRole,
          loginId: actorLogin,
          details: detailsText,
          changes: fieldChanges.length > 0 ? fieldChanges : ["Saved without field modifications"],
          timestamp: new Date(),
        });
        leadData.activityLogs = existingLogs;
      }

      deduplicateAndSanitizeAttachments(leadData);
      const updated = await Lead.findByIdAndUpdate(_id, leadData, {
        new: true,
        runValidators: true,
      });

      try {
        const Task = require("../models/Task");
        const orderIdStr = updated.orderId || updated._id.toString().slice(-6).toUpperCase();
        const taskIdStr = `TSK-${orderIdStr}`;
        await Task.findOneAndUpdate(
          { $or: [{ leadId: updated._id }, { taskId: taskIdStr }] },
          {
            orderStage: updated.orderStage || "sample",
            subStage: updated.subStage || "",
            status: "In Progress",
            ...(updated.assignedTo ? { assignedTo: updated.assignedTo } : {}),
          }
        );
      } catch (e) {
        console.warn("Could not sync Task model on lead update:", e.message);
      }

      return res.json({ success: true, message: "Lead updated successfully", data: updated });
    }

    const isOrder = (leadData.query || "lead").toLowerCase().trim() === "order";
    const initialStageStr = isOrder
      ? `${formatStageLabel(leadData.orderStage || "sample")} → ${formatSubStageLabel(leadData.subStage || "order")}`
      : "Leads";

    const isDraftOrder = isOrder && (
      req.body.action === "save" ||
      req.body.isDraft === true ||
      leadData.approvalStatus === "Draft" ||
      leadData.leadApproval?.status === "Draft" ||
      (typeof logAction === "string" && logAction.toLowerCase().includes("saved"))
    );

    let createActionTitle = logAction;
    let createDetails = "";

    if (!isOrder) {
      createActionTitle = logAction || "Lead Created & Saved";
      createDetails = `New Lead application (${leadData.orderId || ""}) created and saved to Leads by ${actorName} (${actorRole}, Employee: ${leadData.employeeName || actorName}).`;
      leadData.approvalStatus = "Lead";
      leadData.leadApproval = { status: "Not Applicable", note: "", author: "" };
      leadData.stockApproval = { status: "Not Applicable", note: "", author: "" };
      leadData.productionApproval = { status: "Not Applicable", note: "", author: "" };
      leadData.orderStage = "";
      leadData.subStage = "leads";
    } else if (isDraftOrder) {
      createActionTitle = logAction || "Order Created & Saved (Draft)";
      createDetails = `New Order application (${leadData.orderId || ""}) created and saved as Draft by ${actorName} (${actorRole}, Employee: ${leadData.employeeName || actorName}). Pending submission by Sales Executive.`;
      leadData.approvalStatus = "Draft";
      leadData.leadApproval = { status: "Draft", note: "", author: "", updatedAt: null };
      leadData.stockApproval = { status: "Draft", note: "", author: "", updatedAt: null };
      leadData.productionApproval = { status: "Draft", note: "", author: "", updatedAt: null };
      leadData.isDraft = true;
    } else {
      createActionTitle = logAction || "Order Created & Submitted";
      createDetails = `New Order application (${leadData.orderId || ""}) created and submitted by ${actorName} (${actorRole}, Employee: ${leadData.employeeName || actorName}). Sent to Lead Manager for clearance.`;
      leadData.approvalStatus = "Pending";
      leadData.leadApproval = { status: "Pending", note: "", author: "", updatedAt: null };
      leadData.isDraft = false;
    }

    leadData.activityLogs = [
      ...(Array.isArray(leadData.activityLogs) ? leadData.activityLogs : []),
      {
        action: createActionTitle,
        stage: initialStageStr,
        performedBy: actorName,
        role: actorRole,
        loginId: actorLogin,
        details: createDetails,
        changes: buildInitialCreationSummary(leadData),
        timestamp: new Date(),
      },
    ];

    deduplicateAndSanitizeAttachments(leadData);
    const newLead = new Lead(leadData);
    const saved = await newLead.save();
    res.status(201).json({ success: true, message: "Lead created successfully", data: saved });
  } catch (error) {
    console.error("Error creating/updating lead:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/leads/:id - Update lead
router.put("/:id", async (req, res) => {
  try {
    const existing = await Lead.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    const { performedBy, performedByRole, performedById, logAction, logDetails, ...updateData } = req.body;
    const changes = computeLeadChanges(existing, updateData);
    const isNowOrder = (updateData.query || existing.query || "lead").toLowerCase().trim() === "order";
    const stageStr = isNowOrder
      ? `${formatStageLabel(updateData.orderStage || existing.orderStage || "sample")} → ${formatSubStageLabel(updateData.subStage || existing.subStage || "order")}`
      : "Leads";
    const actorName = performedBy || updateData.employeeName || existing.employeeName || "Sales Executive";
    const actorRole = performedByRole || "Sales Executive";

    const logs = Array.isArray(existing.activityLogs) ? [...existing.activityLogs] : [];
    logs.push({
      action: logAction || (isNowOrder ? "Order Edited" : "Lead Edited"),
      stage: stageStr,
      performedBy: actorName,
      role: actorRole,
      loginId: performedById || existing.createdBy || "sales",
      details: logDetails || `${isNowOrder ? "Order" : "Lead"} edited by ${actorName} (${actorRole}).`,
      changes: changes.length > 0 ? changes : ["Updated application details"],
      timestamp: new Date(),
    });
    updateData.activityLogs = logs;

    deduplicateAndSanitizeAttachments(updateData);
    const updated = await Lead.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    res.json({ success: true, message: "Lead updated successfully", data: updated });
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/leads/:id/approval - Approve or Refer back with comments
router.patch("/:id/approval", async (req, res) => {
  try {
    const { status, comment, author, role, department } = req.body;
    if (!["Approved", "Referred Back", "Pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    if (status === "Referred Back" && (!comment || !comment.trim())) {
      return res.status(400).json({
        success: false,
        message: "Additional note is mandatory with every refer back.",
      });
    }

    const authorText = `${author || ""} ${role || ""} ${department || ""}`.toLowerCase();
    const isLeadManager =
      authorText.includes("lead manager") ||
      (role && role.toLowerCase() === "lead manager") ||
      department === "lead_manager";
    const isStock = !isLeadManager && authorText.includes("stock");
    const isProduction = !isLeadManager && authorText.includes("production");

    if (!lead.leadApproval) {
      lead.leadApproval = { status: "Pending", note: "", author: "", updatedAt: null };
    }
    if (!lead.stockApproval) {
      lead.stockApproval = { status: "Pending", note: "", author: "", updatedAt: null };
    }
    if (!lead.productionApproval) {
      lead.productionApproval = { status: "Pending", note: "", author: "", updatedAt: null };
    }

    if (req.body.assignedTo !== undefined) {
      lead.assignedTo = req.body.assignedTo;
    }

    if (isLeadManager) {
      lead.leadApproval = {
        status,
        note: comment || "",
        author: author || "Sarah Jenkins",
        updatedAt: new Date(),
      };
      if (status === "Referred Back") {
        lead.approvalStatus = "Referred Back";
        lead.subStage = "order";
      } else if (status === "Approved") {
        lead.approvalStatus = "Approved";
        const isEmb = isEmbroidery(lead);
        if (isEmb) {
          // For Embroidery: ONLY ONE TASK - Task 1: Stock Room (Elena Rostova). No Production task.
          lead.stockTaskStage = "verification";
          lead.stockApproval = { status: "Pending", note: "", author: "Elena Rostova", updatedAt: null };
          lead.productionApproval = { status: "Not Applicable", note: "Not required for Embroidery", author: "N/A", updatedAt: new Date() };
          if (!lead.subStage || lead.subStage === "order" || lead.subStage === "leads" || lead.subStage === "new") {
            lead.subStage = "order";
          }
        } else {
          // Advance from order stage to next stage (dtf-pending)
          if (!lead.subStage || lead.subStage === "order" || lead.subStage === "leads" || lead.subStage === "new") {
            lead.subStage = "dtf-pending";
          }
          lead.stockTaskStage = "verification";
          lead.productionTaskStage = "logo_printing";
          lead.stockHandoverComplete = false;
          lead.productionHandoverComplete = false;
          lead.printingHandoverComplete = false;
          lead.stockApproval = { status: "Pending", note: "", author: "Elena Rostova", updatedAt: null };
          lead.productionApproval = { status: "Pending", note: "", author: "Marcus Vance", updatedAt: null };
          lead.productionTaskData = {
            ...(lead.productionTaskData || {}),
            printingSubmitted: false,
          };
        }
      }
    } else if (isStock) {
      lead.stockApproval = {
        status,
        note: comment || "",
        author: author || "Elena Rostova",
        updatedAt: new Date(),
      };
    } else if (isProduction) {
      lead.productionApproval = {
        status,
        note: comment || "",
        author: author || "Marcus Vance",
        updatedAt: new Date(),
      };
    } else {
      // General manager / admin - only update lead approval, don't overwrite stock or production
      lead.leadApproval = {
        status,
        note: comment || "",
        author: author || "Manager",
        updatedAt: new Date(),
      };
      if (status === "Referred Back") {
        lead.approvalStatus = "Referred Back";
        lead.subStage = "order";
      } else if (status === "Approved") {
        lead.approvalStatus = "Approved";
        if (!isEmbroidery(lead)) {
          if (!lead.subStage || lead.subStage === "order" || lead.subStage === "leads" || lead.subStage === "new") {
            lead.subStage = "dtf-pending";
          }
        }
      }
    }

    // Determine overall approvalStatus
    if (!isLeadManager) {
      const isEmb = isEmbroidery(lead);
      if (
        lead.stockApproval.status === "Referred Back" ||
        (!isEmb && lead.productionApproval.status === "Referred Back")
      ) {
        lead.approvalStatus = "Referred Back";
      } else if (
        lead.stockApproval.status === "Approved" &&
        (isEmb || lead.productionApproval.status === "Approved")
      ) {
        lead.approvalStatus = "Approved";
      } else {
        lead.approvalStatus = "Pending";
      }
    }

    const resolvedRole = role || (isLeadManager ? "Lead Manager" : isStock ? "Stock Room Manager" : isProduction ? "Production Lead" : "Manager");
    const resolvedAuthor = author || (isLeadManager ? "Sarah Jenkins" : isStock ? "Elena Rostova" : isProduction ? "Marcus Vance" : "Manager");

    if (comment || status) {
      if (!Array.isArray(lead.approvalComments)) {
        lead.approvalComments = [];
      }
      lead.approvalComments.push({
        author: resolvedAuthor,
        role: resolvedRole,
        comment: comment || (status === "Approved" ? "Approved" : "Referred Back"),
        status,
        createdAt: new Date(),
      });
    }

    // Record in Activity Logs
    if (!Array.isArray(lead.activityLogs)) lead.activityLogs = [];
    const currentStageStr = `${formatStageLabel(lead.orderStage || "sample")} → ${formatSubStageLabel(lead.subStage || "order")}`;
    let logActionTitle = "";
    let logDetails = "";
    const logChanges = [];

    if (isLeadManager) {
      if (status === "Approved") {
        const isEmb = isEmbroidery(lead);
        if (isEmb) {
          logActionTitle = "Task 0 - Lead Manager Approved (Assigned to Stock Room - Embroidery)";
          logDetails = `Order approved by ${resolvedAuthor} (${resolvedRole}). Application assigned to Stock Room Manager (Elena Rostova) for Embroidery Task.`;
          logChanges.push(`Task 0 Status: Approved`);
          logChanges.push(`Workflow: Embroidery (Single Task: Stock Room)`);
          logChanges.push(`Assigned To: Task 1 - Stock Room (Verification)`);
        } else {
          logActionTitle = "Task 0 - Lead Manager Approved (Moved to DTF Pending)";
          logDetails = `Order approved by ${resolvedAuthor} (${resolvedRole}). Application moved from ${formatStageLabel(lead.orderStage || "sample")} → Order to ${currentStageStr} and assigned to Stock Room Manager & Production Room.`;
          logChanges.push(`From Stage: ${formatStageLabel(lead.orderStage || "sample")} → Order`);
          logChanges.push(`To Stage: ${currentStageStr}`);
          logChanges.push(`Task 0 Status: Approved`);
          logChanges.push(`Assigned To: Task 1 - Stock Room (Verification) & Task 2 - Production Room (Logo Printing)`);
        }
      } else {
        logActionTitle = "Task 0 - Referred Back by Lead Manager";
        logDetails = `Order referred back to Sales Executive (${formatStageLabel(lead.orderStage || "sample")} → Order) by ${resolvedAuthor} (${resolvedRole}).`;
        logChanges.push(`Task 0 Status: Referred Back`);
      }
    } else if (isStock) {
      logActionTitle = `Task 1 - Stock Room ${status}`;
      logDetails = `Stock Room clearance ${status.toLowerCase()} by ${resolvedAuthor} (${resolvedRole}).`;
      logChanges.push(`Task 1 Status: ${status}`);
      logChanges.push(`Current Stage: ${currentStageStr}`);
    } else if (isProduction) {
      logActionTitle = `Task 2 - Production Room ${status}`;
      logDetails = `Production Room clearance ${status.toLowerCase()} by ${resolvedAuthor} (${resolvedRole}).`;
      logChanges.push(`Task 2 Status: ${status}`);
      logChanges.push(`Current Stage: ${currentStageStr}`);
    } else {
      logActionTitle = `Order ${status} by ${resolvedRole}`;
      logDetails = `Order ${status.toLowerCase()} by ${resolvedAuthor} (${resolvedRole}). Current stage: ${currentStageStr}.`;
      logChanges.push(`Status: ${status}`);
    }
    if (comment) {
      logChanges.push(`Note: "${comment}"`);
    }

    lead.activityLogs.push({
      action: logActionTitle,
      stage: currentStageStr,
      performedBy: resolvedAuthor,
      role: resolvedRole,
      loginId: department || "",
      details: logDetails,
      changes: logChanges,
      timestamp: new Date(),
    });

    await lead.save();

    let createdTask = null;
    if (status === "Approved") {
      const Task = require("../models/Task");
      const orderIdStr = lead.orderId || lead._id.toString().slice(-6).toUpperCase();
      const taskIdStr = `TSK-${orderIdStr}`;

      const deptName = isStock ? "Stock Room" : "Production";

      const urgencyStr = (lead.urgency || "").toLowerCase();
      const priority =
        urgencyStr.includes("urgent") || urgencyStr.includes("high")
          ? "High"
          : urgencyStr.includes("medium")
          ? "Medium"
          : "Normal";

      createdTask = await Task.findOneAndUpdate(
        { $or: [{ leadId: lead._id }, { taskId: taskIdStr }] },
        {
          taskId: taskIdStr,
          leadId: lead._id,
          orderId: orderIdStr,
          title: `Order #${orderIdStr} - ${lead.companyName || lead.clientName || "Approved Order"}`,
          companyName: lead.companyName || "",
          clientName: lead.clientName || "",
          assignedTo: lead.assignedTo || author || (isStock ? "Elena Rostova" : "Marcus Vance"),
          department: deptName,
          priority,
          status: "open",
          dueDate: lead.deliveryDate || lead.scheduleDate || "Within 7 Days",
          totalQuantity: lead.totalQuantity || 0,
          orderStage: lead.orderStage || "sample",
          subStage: lead.subStage || "",
          approvedBy: {
            name: author || "Manager",
            role: role || "",
            comment: comment || "Approved",
            approvedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    res.json({
      success: true,
      message: `Order ${status.toLowerCase()} successfully`,
      data: lead,
      task: createdTask,
    });
  } catch (error) {
    console.error("Error updating approval:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/leads/:id/stock-task - Advance or refer back Stock Room task
router.patch("/:id/stock-task", async (req, res) => {
  try {
    const { action, stage, stockTaskData, comment, author, assignedTo } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    const targetAssignedTo = assignedTo !== undefined ? assignedTo : stockTaskData?.assignedTo;
    if (targetAssignedTo !== undefined) {
      lead.assignedTo = targetAssignedTo;
    }

    if (stockTaskData) {
      lead.stockTaskData = { ...(lead.stockTaskData || {}), ...stockTaskData };
      if (targetAssignedTo !== undefined) {
        lead.stockTaskData.assignedTo = targetAssignedTo;
      }
      if (comment) lead.stockTaskData.note = comment;
      lead.markModified("stockTaskData");
    }

    const actorName = author || "Elena Rostova";
    let movedToPrinting = false;
    let movedToFromStock = false;

    if (action === "submit") {
      if (stage === "verification") {
        const normOrderStage = (lead.orderStage || "").toLowerCase().trim();
        const currStageId = String(lead.currentStageId || lead.stageId || "");
        const isPartialStage = normOrderStage === "partial" || currStageId.startsWith("PRT");
        const isCompleteStage = normOrderStage === "complete" || currStageId.startsWith("CMP");
        if ((isPartialStage || isCompleteStage) && stockTaskData && Array.isArray(stockTaskData.itemsStockData)) {
          const totalQty = lead.totalQuantity || lead.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;
          const partialQty = Number(lead.customerApprovalData?.partialQuantity) || Math.floor(totalQty / 2);
          const batchLimit = isCompleteStage
            ? (Number(lead.stockTaskData?.batchQuantity) || Math.max(0, totalQty - partialQty) || totalQty)
            : (Number(lead.stockTaskData?.batchQuantity) || partialQty);
          const batchLabel = isCompleteStage ? "Complete" : "Partial";
          const totalAllocated = stockTaskData.itemsStockData.reduce((s, it) => s + (Number(it.sampleDeduction) || 0), 0);
          if (totalAllocated > batchLimit) {
            return res.status(400).json({
              success: false,
              message: `Total allocated for ${batchLabel} (${totalAllocated} pcs) cannot exceed the ${batchLabel} batch limit of ${batchLimit} pcs.`,
            });
          }
          if (totalAllocated !== batchLimit) {
            return res.status(400).json({
              success: false,
              message: `Please allocate exactly ${batchLimit} pcs across items for this ${batchLabel} batch (currently ${totalAllocated} pcs).`,
            });
          }
        }
        lead.stockTaskStage = "ready_to_pick";
        if (lead.stockApproval) lead.stockApproval.status = "Pending";
      } else if (stage === "ready_to_pick") {
        lead.stockTaskStage = "staging_room";
        if (lead.stockApproval) lead.stockApproval.status = "Pending";
      } else if (stage === "staging_room") {
        lead.stockTaskStage = "completed";
        lead.stockApproval = {
          status: "Approved",
          note: comment || "Approved by Stock Room",
          author: actorName,
          updatedAt: new Date(),
        };

        const isEmb = isEmbroidery(lead);
        const normStage = (lead.orderStage || "sample").toLowerCase().trim();
        const isSampleOrPartialOrder = normStage === "sample" || normStage === "partial";
        // For Sample & Partial DTF, Stock Staging approval sends the order to Coordinator ("From Staging Room to Printing")
        if (isEmb) {
          lead.approvalStatus = "Approved";
          if (!lead.orderStage) lead.orderStage = "sample";
          lead.subStage = "printing";
          movedToPrinting = true;
        } else if (isSampleOrPartialOrder) {
          lead.stockHandoverComplete = false;
        } else if (lead.productionApproval?.status === "Approved") {
          lead.approvalStatus = "Approved";
          if (!lead.orderStage) lead.orderStage = "sample";
          lead.subStage = "ready-to-pick";
          movedToFromStock = true;
        }
      }
    } else if (action === "refer_back") {
      if (stage === "staging_room") {
        lead.stockTaskStage = "ready_to_pick";
      } else if (stage === "ready_to_pick") {
        lead.stockTaskStage = "verification";
      } else {
        // Return to sales executive (from verification)
        lead.stockApproval = {
          status: "Referred Back",
          note: comment || "Stock Room referred back for revision",
          author: actorName,
          updatedAt: new Date(),
        };
        lead.approvalStatus = "Referred Back";
      }
    }

    if (comment && action !== "save") {
      if (!Array.isArray(lead.approvalComments)) lead.approvalComments = [];
      lead.approvalComments.push({
        author: actorName,
        role: "Stock Room Manager",
        comment,
        status: action === "submit" ? "Approved" : "Referred Back",
        createdAt: new Date(),
      });
    }

    // Record in Activity Logs
    if (!Array.isArray(lead.activityLogs)) lead.activityLogs = [];
    const isEmb = isEmbroidery(lead);
    const stockStageLabel = stage === "staging_room" && isEmb ? "Embroidery Staging Room" : formatSubStageLabel(stage || "verification");
    const nextStockLabel = lead.stockTaskStage === "staging_room" && isEmb ? "Embroidery Staging Room" : formatSubStageLabel(lead.stockTaskStage || "completed");
    const logChanges = [
      `From: Stock Room → ${stockStageLabel}`,
      movedToPrinting
        ? isEmb
          ? `To: ${formatStageLabel(lead.orderStage || "sample")} → Printing (Embroidery Stock Clearance Approved)`
          : `To: ${formatStageLabel(lead.orderStage || "sample")} → Printing (Task 1 & Task 2 Clearances Approved)`
        : movedToFromStock
        ? `To: ${formatStageLabel(lead.orderStage || "sample")} → From Stock (Task 1 & Task 2 Clearances Approved)`
        : `To: Stock Room → ${nextStockLabel}`,
    ];
    if (stockTaskData?.isStockAvailable !== undefined) {
      logChanges.push(`Stock Available: ${stockTaskData.isStockAvailable ? "Yes (In Stock)" : "No / Partial"}`);
    }
    if (stockTaskData?.sampleDeduction !== undefined) {
      logChanges.push(`Sample Quantity: ${stockTaskData.sampleDeduction} pcs`);
    }
    if (stockTaskData?.stockDepreciation) {
      logChanges.push(`Remaining Stock After Deduction: ${stockTaskData.stockDepreciation}`);
    }
    if (stockTaskData?.receivedCount !== undefined) {
      logChanges.push(`Received Count: ${stockTaskData.receivedCount} pcs`);
    }
    if (comment) {
      logChanges.push(`Note: "${comment}"`);
    }
    if (targetAssignedTo) {
      logChanges.push(`Assigned To: ${targetAssignedTo}`);
    }
    if (movedToPrinting) {
      logChanges.push(`Stage Transition: Moved from Stock Room Clearance to ${formatStageLabel(lead.orderStage || "sample")} → Printing`);
    } else if (movedToFromStock) {
      logChanges.push(`Stage Transition: Moved from Stock Room & Production Clearances to ${formatStageLabel(lead.orderStage || "sample")} → From Stock (Ready for Coordinator Handover)`);
    }

    lead.activityLogs.push({
      action:
        action === "save"
          ? `Stock Task - ${stockStageLabel} Saved`
          : action === "submit"
          ? stage === "staging_room"
            ? isEmb
              ? "Task 1 - Stock Room Approved (Embroidery Clearance Complete)"
              : movedToFromStock
              ? "Task 1 & Task 2 Approved (Moved to From Stock)"
              : movedToPrinting
              ? "Task 1 - Stock Room Approved (Moved to Printing)"
              : "Task 1 - Stock Room Approved"
            : `Stock Task - ${stockStageLabel} Submitted`
          : `Stock Task - Referred Back from ${stockStageLabel}`,
      stage: movedToPrinting
        ? `${formatStageLabel(lead.orderStage || "sample")} → Printing`
        : movedToFromStock
        ? `${formatStageLabel(lead.orderStage || "sample")} → From Stock`
        : `Stock Task → ${nextStockLabel}`,
      performedBy: actorName,
      role: "Stock Room Manager",
      loginId: "stock",
      details:
        action === "save"
          ? `Stock Room ${stockStageLabel} draft saved by ${actorName}.`
          : action === "submit"
          ? stage === "staging_room"
            ? isEmb
              ? `Stock Room Embroidery Staging Room completed and Task 1 Clearance approved by ${actorName}. Application moved to ${formatStageLabel(lead.orderStage || "sample")} → Printing.`
              : `Stock Room Staging Room submitted and Task 1 Clearance approved by ${actorName}.${movedToFromStock ? ` Both Stock & Production clearances completed — Application moved to ${formatStageLabel(lead.orderStage || "sample")} → From Stock for Coordinator handover.` : movedToPrinting ? ` Both Stock & Production clearances completed — Application moved to ${formatStageLabel(lead.orderStage || "sample")} → Printing.` : ""}`
            : `Stock Room ${stockStageLabel} completed by ${actorName}. Advanced to ${nextStockLabel}.`
          : `Stock Room referred back from ${stockStageLabel} by ${actorName}.`,
      changes: logChanges,
      timestamp: new Date(),
    });

    await lead.save();

    try {
      const Task = require("../models/Task");
      const orderIdStr = lead.orderId || lead._id.toString().slice(-6).toUpperCase();
      const taskIdStr = `TSK-${orderIdStr}`;
      await Task.findOneAndUpdate(
        { $or: [{ leadId: lead._id }, { taskId: taskIdStr }] },
        {
          orderStage: lead.orderStage || "sample",
          subStage: lead.subStage || "",
          notes: lead.stockTaskData?.batchNote || lead.productionTaskData?.batchNote || "",
          ...(lead.assignedTo ? { assignedTo: lead.assignedTo } : {}),
        }
      );
    } catch (e) {
      console.warn("Could not sync Task model on stage-transition:", e.message);
    }

    res.json({ success: true, data: lead });
  } catch (err) {
    console.error("Error in stock-task:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/leads/:id/production-task - Advance or refer back Production Room task
router.patch("/:id/production-task", async (req, res) => {
  try {
    const { action, stage, productionTaskData, comment, author, assignedTo } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    const targetAssignedTo = assignedTo !== undefined ? assignedTo : productionTaskData?.assignedTo;
    if (targetAssignedTo !== undefined) {
      lead.assignedTo = targetAssignedTo;
    }

    if (productionTaskData) {
      lead.productionTaskData = { ...(lead.productionTaskData || {}), ...productionTaskData };
      if (targetAssignedTo !== undefined) {
        lead.productionTaskData.assignedTo = targetAssignedTo;
      }
      if (comment) lead.productionTaskData.note = comment;
      lead.markModified("productionTaskData");
    }

    const actorName = author || "Marcus Vance";
    let movedToPrinting = false;
    let movedToFromStock = false;

    if (action === "submit") {
      const isPartial = lead.orderStage === "partial" || String(lead.currentStageId || lead.stageId || "").startsWith("PRT");
      const isComplete = lead.orderStage === "complete" || String(lead.currentStageId || lead.stageId || "").startsWith("CMP");
      const totalStockQty = lead.totalQuantity || lead.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;
      const partialBatchQty = Number(lead.customerApprovalData?.partialQuantity) || Math.floor(totalStockQty / 2);
      const remainingCompleteQty = Math.max(0, totalStockQty - partialBatchQty);

      const targetBatchQty = isComplete
        ? (Number(lead.productionTaskData?.batchQuantity) || remainingCompleteQty || totalStockQty)
        : isPartial
        ? totalStockQty
        : (Number(lead.productionTaskData?.batchQuantity) || totalStockQty);

      if (stage === "logo_printing" && productionTaskData) {
        if (productionTaskData.logosPrinted !== undefined && productionTaskData.logosPrinted !== "" && Number(productionTaskData.logosPrinted) > targetBatchQty) {
          return res.status(400).json({ success: false, message: `Logos printed (${productionTaskData.logosPrinted} pcs) cannot exceed the limit of ${targetBatchQty} pcs.` });
        }
        if (productionTaskData.logosGivenForCutting !== undefined && productionTaskData.logosGivenForCutting !== "" && Number(productionTaskData.logosGivenForCutting) > targetBatchQty) {
          return res.status(400).json({ success: false, message: `Logos for cutting (${productionTaskData.logosGivenForCutting} pcs) cannot exceed the limit of ${targetBatchQty} pcs.` });
        }
        if (productionTaskData.logosGivenForCutting !== undefined && productionTaskData.logosPrinted !== undefined &&
            productionTaskData.logosGivenForCutting !== "" && productionTaskData.logosPrinted !== "" &&
            Number(productionTaskData.logosGivenForCutting) > Number(productionTaskData.logosPrinted)) {
          return res.status(400).json({ success: false, message: `Logos for cutting (${productionTaskData.logosGivenForCutting} pcs) cannot exceed the printed logos count (${productionTaskData.logosPrinted} pcs).` });
        }
      }

      if (stage === "logo_cutting" && productionTaskData) {
        if (productionTaskData.sampleLogosCount !== undefined && productionTaskData.sampleLogosCount !== "" && Number(productionTaskData.sampleLogosCount) > targetBatchQty) {
          return res.status(400).json({ success: false, message: `Logos cut (${productionTaskData.sampleLogosCount} pcs) cannot exceed the limit of ${targetBatchQty} pcs.` });
        }
      }

      if (stage === "logo_printing") {
        lead.productionTaskStage = "logo_cutting";
        lead.productionApproval = {
          status: "Pending",
          note: "",
          author: actorName,
          updatedAt: new Date(),
        };
        lead.markModified("productionApproval");
      } else if (stage === "logo_cutting" || !stage) {
        lead.productionTaskStage = "completed";
        lead.productionApproval = {
          status: "Approved",
          note: comment || "Approved by Production Lead",
          author: actorName,
          updatedAt: new Date(),
        };
        lead.markModified("productionApproval");

        const normStage = (lead.orderStage || "sample").toLowerCase().trim();
        const isSampleOrPartialOrder = normStage === "sample" || normStage === "partial";
        if (isSampleOrPartialOrder) {
          // For Sample & Partial DTF, Logo Cutting approval sends the order to Coordinator ("From Logo Cutting to Printing")
          lead.productionHandoverComplete = false;
        } else if (lead.stockApproval?.status === "Approved") {
          // If Stock Room has also approved (Complete), advance to From Stock for Coordinator handover!
          lead.approvalStatus = "Approved";
          if (!lead.orderStage) lead.orderStage = "sample";
          lead.subStage = "ready-to-pick";
          movedToFromStock = true;
        }
      }
    } else if (action === "refer_back") {
      if (stage === "logo_cutting") {
        lead.productionTaskStage = "logo_printing";
        if (lead.productionApproval) {
          lead.productionApproval.status = "Pending";
        } else {
          lead.productionApproval = { status: "Pending", note: "", author: actorName, updatedAt: new Date() };
        }
      } else {
        // Return to sales executive / lead manager (from logo_printing)
        lead.productionApproval = {
          status: "Referred Back",
          note: comment || "Production referred back for revision",
          author: actorName,
          updatedAt: new Date(),
        };
        lead.approvalStatus = "Referred Back";
      }
    }

    if (comment && action !== "save") {
      if (!Array.isArray(lead.approvalComments)) lead.approvalComments = [];
      lead.approvalComments.push({
        author: actorName,
        role: "Production Lead",
        comment,
        status: action === "submit" ? "Approved" : "Referred Back",
        createdAt: new Date(),
      });
    }

    // Record in Activity Logs
    if (!Array.isArray(lead.activityLogs)) lead.activityLogs = [];
    const prodStageLabel = formatSubStageLabel(stage || "logo_cutting");
    const nextProdLabel = formatSubStageLabel(lead.productionTaskStage || "completed");
    const logChanges = [
      `From: Production Room → ${prodStageLabel}`,
      movedToPrinting
        ? `To: ${formatStageLabel(lead.orderStage || "sample")} → Printing (Task 1 & Task 2 Clearances Approved)`
        : movedToFromStock
        ? `To: ${formatStageLabel(lead.orderStage || "sample")} → From Stock (Task 1 & Task 2 Clearances Approved)`
        : `To: Production Room → ${nextProdLabel}`,
    ];
    if (productionTaskData?.logosPrinted !== undefined && productionTaskData.logosPrinted !== "") {
      logChanges.push(`Logos Printed: ${productionTaskData.logosPrinted} pcs`);
    }
    if (productionTaskData?.logosGivenForCutting !== undefined && productionTaskData.logosGivenForCutting !== "") {
      logChanges.push(`For Cutting: ${productionTaskData.logosGivenForCutting} pcs`);
    }
    if (productionTaskData?.logosForPrinting !== undefined && productionTaskData.logosForPrinting !== "") {
      logChanges.push(`For Printing: ${productionTaskData.logosForPrinting} pcs`);
    }
    if (productionTaskData?.sampleLogosCount !== undefined && productionTaskData.sampleLogosCount !== "") {
      logChanges.push(`For Sample: ${productionTaskData.sampleLogosCount} pcs`);
    }
    if (comment) {
      logChanges.push(`Note: "${comment}"`);
    }
    if (targetAssignedTo) {
      logChanges.push(`Assigned To: ${targetAssignedTo}`);
    }
    if (movedToPrinting) {
      logChanges.push(`Stage Transition: Moved from Stock Room & Production Clearance to ${formatStageLabel(lead.orderStage || "sample")} → Printing`);
    } else if (movedToFromStock) {
      logChanges.push(`Stage Transition: Moved from Stock Room & Production Clearances to ${formatStageLabel(lead.orderStage || "sample")} → From Stock (Ready for Coordinator Handover)`);
    }

    lead.activityLogs.push({
      action:
        action === "save"
          ? `Production Task - ${prodStageLabel} Saved`
          : action === "submit"
          ? stage === "logo_printing"
            ? "Production Task - Logo Printing Submitted"
            : movedToFromStock
            ? "Task 1 & Task 2 Approved (Moved to From Stock)"
            : movedToPrinting
            ? "Task 2 - Production Approved (Moved to Printing)"
            : "Task 2 - Production Approved"
          : `Production Task - Referred Back from ${prodStageLabel}`,
      stage: movedToPrinting
        ? `${formatStageLabel(lead.orderStage || "sample")} → Printing`
        : movedToFromStock
        ? `${formatStageLabel(lead.orderStage || "sample")} → From Stock`
        : `Production Task → ${nextProdLabel}`,
      performedBy: actorName,
      role: "Production Lead",
      loginId: "production",
      details:
        action === "save"
          ? `Production ${prodStageLabel} draft saved by ${actorName} (Production Lead).`
          : action === "submit"
          ? stage === "logo_printing"
            ? `Logo Printing completed by ${actorName} (Production Lead). Advanced to Logo Cutting.`
            : `Logo Cutting & Task 2 Clearance approved by ${actorName} (Production Lead).${movedToFromStock ? ` Both Stock & Production clearances completed — Application moved to ${formatStageLabel(lead.orderStage || "sample")} → From Stock for Coordinator handover.` : movedToPrinting ? ` Both Stock & Production clearances completed — Application moved to ${formatStageLabel(lead.orderStage || "sample")} → Printing.` : ""}`
          : `Production referred back from ${prodStageLabel} by ${actorName}.`,
      changes: logChanges,
      timestamp: new Date(),
    });

    await lead.save();

    try {
      const Task = require("../models/Task");
      const orderIdStr = lead.orderId || lead._id.toString().slice(-6).toUpperCase();
      const taskIdStr = `TSK-${orderIdStr}`;
      await Task.findOneAndUpdate(
        { $or: [{ leadId: lead._id }, { taskId: taskIdStr }] },
        {
          orderStage: lead.orderStage || "sample",
          subStage: lead.subStage || "",
          notes: lead.stockTaskData?.batchNote || lead.productionTaskData?.batchNote || "",
          ...(lead.assignedTo ? { assignedTo: lead.assignedTo } : {}),
        }
      );
    } catch (e) {
      console.warn("Could not sync Task model on stage-transition:", e.message);
    }

    res.json({ success: true, data: lead });
  } catch (err) {
    console.error("Error in production-task:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/leads/:id/stage-transition - Advance or refer back through Sample, Partial & Complete
router.patch("/:id/stage-transition", async (req, res) => {
  try {
    const {
      fromStage,
      toStage,
      fromSubStage,
      toSubStage,
      action,
      stageData,
      comment,
      author,
      role,
      assignedTo
    } = req.body;

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    const targetAssignedTo = assignedTo !== undefined ? assignedTo : stageData?.assignedTo;
    if (targetAssignedTo !== undefined) {
      lead.assignedTo = targetAssignedTo;
    }

    const activeStage = fromStage || lead.orderStage || "sample";
    const prevStageDisplay = `${formatStageLabel(activeStage)} → ${formatSubStageLabel(fromSubStage || lead.subStage || "order")}`;

    if (stageData) {
      // 1. Sample stage data mappings
      if (activeStage === "sample") {
        if (fromSubStage === "ready-to-pick" || toSubStage === "ready-to-pick") {
          lead.sampleReadyToPickData = { ...(lead.sampleReadyToPickData || {}), ...stageData };
          lead.markModified("sampleReadyToPickData");
          if (stageData?.stockHandoverComplete || toSubStage === "printing") {
            lead.stockHandoverComplete = true;
            lead.stockHandoverAt = new Date();
            lead.stockHandoverBy = stageData?.stockHandoverBy || author || "Alex Rivera (Coordinator)";
          }
        }
        if (fromSubStage === "printing" || toSubStage === "printing") {
          lead.printingStageData = { ...(lead.printingStageData || {}), ...stageData };
          lead.markModified("printingStageData");
        }
        if (fromSubStage === "ready-to-pick-up" || toSubStage === "ready-to-pick-up") {
          lead.sampleReadyToPickUpData = { ...(lead.sampleReadyToPickUpData || {}), ...stageData };
          lead.markModified("sampleReadyToPickUpData");
        }
        if (fromSubStage === "staging-ground" || toSubStage === "staging-ground" || fromSubStage === "staging-room" || toSubStage === "staging-room") {
          lead.sampleStagingGroundData = { ...(lead.sampleStagingGroundData || {}), ...stageData };
          lead.markModified("sampleStagingGroundData");
        }
        if (fromSubStage === "customer-approval-awaiting" || toSubStage === "customer-approval-awaiting") {
          lead.customerApprovalData = { ...(lead.customerApprovalData || {}), ...stageData };
          lead.markModified("customerApprovalData");
          if (stageData?.balanceRemaining !== undefined && !isNaN(Number(stageData.balanceRemaining))) {
            lead.pendingAmount = Number(stageData.balanceRemaining);
          }
          if (stageData?.amountReceived !== undefined && !isNaN(Number(stageData.amountReceived))) {
            lead.advanceAmount = Number(stageData.amountReceived);
          }
        }
      }

      // 2. Partial stage data mappings
      if (activeStage === "partial" || toStage === "partial") {
        lead.partialData = { ...(lead.partialData || {}), ...stageData };
        lead.markModified("partialData");

        if (fromSubStage === "printing" || toSubStage === "printing") {
          lead.partialPrintingData = { ...(lead.partialPrintingData || {}), ...stageData };
          lead.markModified("partialPrintingData");
        }
        if (fromSubStage === "quality-check" || toSubStage === "quality-check") {
          lead.partialQualityCheckData = { ...(lead.partialQualityCheckData || {}), ...stageData };
          lead.markModified("partialQualityCheckData");
        }
        if (fromSubStage === "packaging" || toSubStage === "packaging") {
          lead.partialPackagingData = { ...(lead.partialPackagingData || {}), ...stageData };
          lead.markModified("partialPackagingData");
        }
        if (fromSubStage === "ready-to-pick-up" || toSubStage === "ready-to-pick-up") {
          lead.partialReadyToPickUpData = { ...(lead.partialReadyToPickUpData || {}), ...stageData };
          lead.markModified("partialReadyToPickUpData");
        }
        if (fromSubStage === "staging-room" || toSubStage === "staging-room") {
          lead.partialStagingRoomData = { ...(lead.partialStagingRoomData || {}), ...stageData };
          lead.markModified("partialStagingRoomData");
        }
        if (fromSubStage === "payment-confirmation" || toSubStage === "payment-confirmation") {
          lead.partialPaymentConfirmationData = { ...(lead.partialPaymentConfirmationData || {}), ...stageData };
          lead.markModified("partialPaymentConfirmationData");
          if (stageData?.balancePending !== undefined && !isNaN(Number(stageData.balancePending))) {
            lead.pendingAmount = Number(stageData.balancePending);
          }
        }
      }

      // 3. Complete stage data mappings
      if (activeStage === "complete" || toStage === "complete") {
        lead.completeData = { ...(lead.completeData || {}), ...stageData };
        lead.markModified("completeData");

        if (fromSubStage === "printing" || toSubStage === "printing") {
          lead.completePrintingData = { ...(lead.completePrintingData || {}), ...stageData };
          lead.markModified("completePrintingData");
        }
        if (fromSubStage === "quality-check" || toSubStage === "quality-check") {
          lead.completeQualityCheckData = { ...(lead.completeQualityCheckData || {}), ...stageData };
          lead.markModified("completeQualityCheckData");
        }
        if (fromSubStage === "packaging" || toSubStage === "packaging") {
          lead.completePackagingData = { ...(lead.completePackagingData || {}), ...stageData };
          lead.markModified("completePackagingData");
        }
        if (fromSubStage === "ready-to-pick-up" || toSubStage === "ready-to-pick-up") {
          lead.completeReadyToPickUpData = { ...(lead.completeReadyToPickUpData || {}), ...stageData };
          lead.markModified("completeReadyToPickUpData");
        }
        if (fromSubStage === "staging-room" || toSubStage === "staging-room" || fromSubStage === "staging-ground" || toSubStage === "staging-ground") {
          lead.completeStagingRoomData = { ...(lead.completeStagingRoomData || {}), ...stageData };
          lead.markModified("completeStagingRoomData");
        }
        if (fromSubStage === "delivery-pending" || toSubStage === "delivery-pending") {
          lead.completeDeliveryPendingData = { ...(lead.completeDeliveryPendingData || {}), ...stageData };
          lead.markModified("completeDeliveryPendingData");
        }
        if (fromSubStage === "delivered" || toSubStage === "delivered") {
          lead.completeDeliveredData = { ...(lead.completeDeliveredData || {}), ...stageData };
          lead.markModified("completeDeliveredData");
        }
        if (fromSubStage === "customer-support" || toSubStage === "customer-support") {
          lead.completeCustomerSupportData = { ...(lead.completeCustomerSupportData || {}), ...stageData };
          lead.markModified("completeCustomerSupportData");
        }
      }
    }

    // Default stage updates (only if not saving draft)
    if (action !== "save") {
      if (toStage) lead.orderStage = toStage;
      if (toSubStage) lead.subStage = toSubStage;
      lead.query = "order";
    }

    // Transition 1: Customer Approval in Sample -> Move to Partial if partially paid, Move to Complete if complete paid, otherwise back to Sample -> Order!
    if (action === "submit" && activeStage === "sample" && fromSubStage === "customer-approval-awaiting") {
      const isApproved = stageData?.customerApproved === "yes" || stageData?.customerApproved === true;
      if (isApproved) {
        const paymentStatus = stageData?.paymentStatus;
        if (paymentStatus === "fully_received") {
          // Direct to COMPLETE stage! Skip Partial!
          lead.orderStage = "complete";
          lead.subStage = "order";
          lead.approvalStatus = "Pending";
          const rawNum = (lead.orderId || lead._id.toString().slice(-5)).replace(/^ORD-?/i, "");
          lead.sampleId = lead.sampleId || `SMP-${rawNum}`;
          lead.partialId = lead.partialId || `PRT-${rawNum}`;
          lead.completeId = lead.completeId || `CMP-${rawNum}`;
          lead.currentStageId = lead.completeId;

          const fullQty = lead.totalQuantity || 100;
          const recAmount = Number(stageData?.amountReceived) || Number(lead.netAmount || lead.totalAmount) || 0;

          lead.pendingAmount = 0;
          lead.advanceAmount = recAmount;
          lead.stockHandoverComplete = false;
          lead.productionHandoverComplete = true;
          lead.printingHandoverComplete = false;

          lead.stockApproval = {
            status: "Pending",
            note: comment || `Full payment received (₹${recAmount}). Complete stage bulk allocation: ${fullQty} pcs.`,
            author: "Elena Rostova",
            updatedAt: null,
          };
          lead.stockTaskStage = "verification";
          lead.stockTaskData = {
            ...(lead.stockTaskData || {}),
            verificationSubmitted: false,
            readyToPickSubmitted: false,
            stagingSubmitted: false,
            readyToPickReceived: "yes",
            stagingSampleCorrect: "yes",
            batchQuantity: fullQty,
            paymentStatus: "fully_received",
            amountReceived: recAmount,
            balanceRemaining: 0,
            batchNote: `Full payment received (₹${recAmount}). Allocate & verify full order of ${fullQty} pcs.`
          };

          lead.productionApproval = {
            status: "Approved",
            note: comment || "Complete stage skips Production Room & Logo Cutting (only Stock Room clearance required).",
            author: "System",
            updatedAt: new Date(),
          };
          lead.productionTaskStage = "completed";
          lead.productionTaskData = {
            ...(lead.productionTaskData || {}),
            printingSubmitted: true,
            submittedToLogoCutting: true,
            skippedForComplete: true,
            receivedNoOfLogos: "yes",
            batchQuantity: fullQty,
            paymentStatus: "fully_received",
            amountReceived: recAmount,
            balanceRemaining: 0,
            batchNote: `Full payment received (₹${recAmount}). Production Room skipped for Complete stage.`
          };
        } else {
          // Partially paid -> Move to Partial stage!
          lead.orderStage = "partial";
          lead.subStage = "order";
          lead.approvalStatus = "Pending";
          const rawNum = (lead.orderId || lead._id.toString().slice(-5)).replace(/^ORD-?/i, "");
          lead.sampleId = lead.sampleId || `SMP-${rawNum}`;
          lead.partialId = lead.partialId || `PRT-${rawNum}`;
          lead.completeId = lead.completeId || `CMP-${rawNum}`;
          lead.currentStageId = lead.partialId;

          const fullOrderQty = Number(lead.totalQuantity) || (Array.isArray(lead.items) ? lead.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 0) || 100;
          const partialQty = Number(stageData?.partialQuantity) || Math.floor(fullOrderQty / 2) || 50;
          const recAmount = Number(stageData?.amountReceived) || 0;
          const balAmount = Number(stageData?.balanceRemaining) || Math.max(0, (lead.netAmount || lead.totalAmount || 0) - recAmount);

          lead.pendingAmount = balAmount;
          lead.advanceAmount = recAmount;
          lead.stockHandoverComplete = false;
          lead.productionHandoverComplete = false;
          lead.printingHandoverComplete = false;

          lead.stockApproval = {
            status: "Pending",
            note: comment || `Partial payment received (₹${recAmount}). Partial stage allocation: ${partialQty} pcs.`,
            author: "Elena Rostova",
            updatedAt: null,
          };
          lead.stockTaskStage = "verification";
          lead.stockTaskData = {
            ...(lead.stockTaskData || {}),
            sampleReadyToPickAttachments: lead.stockTaskData?.readyToPickAttachments || [],
            readyToPickAttachments: [],
            partialReadyToPickAttachments: [],
            verificationSubmitted: false,
            readyToPickSubmitted: false,
            stagingSubmitted: false,
            readyToPickReceived: "yes",
            stagingSampleCorrect: "yes",
            batchQuantity: partialQty,
            paymentStatus: "partial_received",
            amountReceived: recAmount,
            balanceRemaining: balAmount,
            batchNote: `Partial payment received (₹${recAmount}). Allocate & verify partial batch of ${partialQty} pcs.`
          };

          lead.productionApproval = {
            status: "Pending",
            note: comment || `Partial payment received (₹${recAmount}). Full order logo printing: ${fullOrderQty} pcs.`,
            author: "Marcus Vance",
            updatedAt: null,
          };
          lead.productionTaskStage = "logo_printing";
          lead.productionTaskData = {
            ...(lead.productionTaskData || {}),
            printingSubmitted: false,
            submittedToLogoCutting: false,
            receivedNoOfLogos: "yes",
            logosPrinted: "",
            logosGivenForCutting: "",
            logosReceivedForCutting: "",
            batchQuantity: fullOrderQty,
            paymentStatus: "partial_received",
            amountReceived: recAmount,
            balanceRemaining: balAmount,
            batchNote: `Partial payment received (₹${recAmount}). Print & cut full order logos of ${fullOrderQty} pcs.`
          };
        }
      } else {
        // Customer not approved -> move back to sample -> order
        lead.orderStage = "sample";
        lead.subStage = "order";
        lead.approvalStatus = "Pending";
      }
    } else if (action === "refer_back" && activeStage === "sample" && fromSubStage === "customer-approval-awaiting") {
      lead.orderStage = "sample";
      lead.subStage = "order";
      lead.approvalStatus = "Pending";
    }

    // Transition 2: Payment Confirmation submitted in Partial -> Move to Complete & trigger Stock and Production tasks!
    if (action === "submit" && activeStage === "partial" && fromSubStage === "payment-confirmation") {
      lead.orderStage = "complete";
      lead.subStage = "order";
      lead.approvalStatus = "Pending";
      const rawNum = (lead.orderId || lead._id.toString().slice(-5)).replace(/^ORD-?/i, "");
      lead.sampleId = lead.sampleId || `SMP-${rawNum}`;
      lead.partialId = lead.partialId || `PRT-${rawNum}`;
      lead.completeId = lead.completeId || `CMP-${rawNum}`;
      lead.currentStageId = lead.completeId;

      const totalQty = lead.totalQuantity || 100;
      const partialQty = Number(lead.customerApprovalData?.partialQuantity) || Number(lead.stockTaskData?.batchQuantity) || Math.floor(totalQty / 2);
      const remainingQty = Math.max(0, totalQty - partialQty);
      const remAmount = Number(stageData?.remainingAmountReceived) || Number(stageData?.partialAmountReceived) || Number(lead.customerApprovalData?.balanceRemaining) || 0;

      lead.pendingAmount = 0;
      lead.advanceAmount = Number(lead.netAmount || lead.totalAmount || 0);
      lead.stockHandoverComplete = false;
      lead.productionHandoverComplete = true;
      lead.printingHandoverComplete = false;

      lead.stockApproval = {
        status: "Pending",
        note: comment || `Remaining payment confirmed (₹${remAmount}). Complete stage bulk allocation: ${remainingQty} pcs.`,
        author: "Elena Rostova",
        updatedAt: null,
      };
      lead.stockTaskStage = "verification";
      lead.stockTaskData = {
        ...(lead.stockTaskData || {}),
        partialItemsStockData: lead.stockTaskData?.itemsStockData || [],
        partialReadyToPickAttachments: lead.stockTaskData?.readyToPickAttachments || [],
        readyToPickAttachments: [],
        completeReadyToPickAttachments: [],
        verificationSubmitted: false,
        readyToPickSubmitted: false,
        stagingSubmitted: false,
        readyToPickReceived: "yes",
        stagingSampleCorrect: "yes",
        batchQuantity: remainingQty,
        paymentStatus: "fully_received",
        amountReceived: remAmount,
        balanceRemaining: 0,
        batchNote: `Remaining payment received (₹${remAmount}). This is remaining to give for order to complete: ${remainingQty} pcs (Partial delivered: ${partialQty} pcs).`
      };

      lead.productionApproval = {
        status: "Approved",
        note: comment || "Logos already printed & cut in Partial stage — Production Room skipped for Complete stage.",
        author: "System",
        updatedAt: new Date(),
      };
      lead.productionTaskStage = "completed";
      lead.productionTaskData = {
        ...(lead.productionTaskData || {}),
        printingSubmitted: true,
        submittedToLogoCutting: true,
        skippedForComplete: true,
        receivedNoOfLogos: "yes",
        batchQuantity: remainingQty,
        paymentStatus: "fully_received",
        amountReceived: remAmount,
        balanceRemaining: 0,
        batchNote: `Remaining payment received (₹${remAmount}). Production Room skipped (full logos printed in Partial).`
      };
    }

    // Transition 3: Final step of Complete (Customer Support) completed -> Mark order as Completed!
    if (action === "submit" && activeStage === "complete" && fromSubStage === "customer-support") {
      lead.orderStage = "complete";
      lead.subStage = "customer-support";
      lead.approvalStatus = "Completed";
      lead.isCompleted = true;
    }

    // Coordinator Sample Handover Endpoint
    // Handles: verification-to-staging, staging-to-printing, logo-cutting-to-printing
    // (Note: printing-to-staging uses /stage-transition on ready-to-pick-up -> staging-room)
    // See PATCH /api/leads/:id/coordinator-handover below

    // If referring back from printing: resets tasks for Stock & Production so corrections can be made
    if (action === "refer_back" && fromSubStage === "printing") {
      const isCompleteOrderRef = (lead.orderStage || "").toLowerCase().trim() === "complete";
      lead.subStage = "order";
      lead.approvalStatus = "Pending";
      lead.stockHandoverComplete = false;
      lead.productionHandoverComplete = isCompleteOrderRef;
      lead.printingHandoverComplete = false;
      lead.stockApproval = {
        status: "Pending",
        note: comment || `${lead.orderStage || "Order"} printing requested stock corrections`,
        author: "Stock Room",
        updatedAt: new Date(),
      };
      lead.stockTaskStage = "verification";
      if (!isCompleteOrderRef) {
        lead.productionApproval = {
          status: "Pending",
          note: comment || `${lead.orderStage || "Order"} printing requested production corrections`,
          author: "Production Lead",
          updatedAt: new Date(),
        };
        lead.productionTaskStage = "logo_printing";
      }
    }

    // Track Coordinator handover completion for Sample (From Printing to Staging Room), Partial (From Packaging to Staging Room), and Complete (From Packaging to Ready to Deliver)
    if (["sample", "partial", "complete"].includes(activeStage) && fromSubStage === "ready-to-pick-up" && action === "submit") {
      lead.printingHandoverComplete = true;
      lead.printingHandoverAt = new Date();
      lead.printingHandoverBy = author || "Alex Rivera (Coordinator)";
    }
    if (["sample", "partial", "complete"].includes(activeStage) && (fromSubStage === "staging-room" || fromSubStage === "staging-ground") && action === "refer_back") {
      lead.printingHandoverComplete = false;
    }

    if (comment && action !== "save") {
      if (!Array.isArray(lead.approvalComments)) lead.approvalComments = [];
      lead.approvalComments.push({
        author: author || "Operator",
        role: role || "Manager",
        comment,
        status: action === "submit" ? "Approved" : "Referred Back",
        createdAt: new Date(),
      });
    }

    // Record in Activity Logs
    if (!Array.isArray(lead.activityLogs)) lead.activityLogs = [];
    const nextStageDisplay = `${formatStageLabel(lead.orderStage || "sample")} → ${formatSubStageLabel(lead.subStage || "order")}`;
    const stageChanges = [
      `From Stage: ${prevStageDisplay}`,
      `To Stage: ${nextStageDisplay}`,
      `Stage Transition: ${prevStageDisplay} → ${nextStageDisplay}`,
    ];
    if (stageData) {
      if (stageData.stockHandoverComplete || (fromSubStage === "ready-to-pick" && toSubStage === "printing")) {
        stageChanges.push(`Coordinator Delivery: Stock items collected & delivered to Printing Floor by ${author || "Coordinator"}`);
      }
      if (stageData.dtfVerified) stageChanges.push(`DTF Film Verification: Prepared, printed, and verified in DTF Pending`);
      if (stageData.stockVerified) stageChanges.push(`Stock Verification: Physical inventory verified & allocated in Stock stage`);
      if (stageData.stockSampleReceived) stageChanges.push(`Stock Sample Received in Printing: ${stageData.stockSampleReceived === "yes" ? "Yes" : "No"}`);
      if (stageData.prodSampleReceived) stageChanges.push(`Production Logo Received in Printing: ${stageData.prodSampleReceived === "yes" ? "Yes" : "No"}`);
      if (stageData.printingStatus) stageChanges.push(`Printing Status: ${stageData.printingStatus}`);
      if (stageData.printedCount !== undefined) stageChanges.push(`Printed Count: ${stageData.printedCount} pcs`);
      if (stageData.readyToPickupCount !== undefined) stageChanges.push(`Ready to Pick Up Count: ${stageData.readyToPickupCount} pcs`);
      if (stageData.printingSampleReceived) stageChanges.push(`Sample Received from Printing: ${stageData.printingSampleReceived === "yes" ? "Yes" : "No"}`);
      if (stageData.readyToPickSampleReceived) stageChanges.push(`Items Received from Ready to Pick: ${stageData.readyToPickSampleReceived === "yes" ? "Yes" : "No"}`);
      if (stageData.rackNo) stageChanges.push(`Rack Number: ${stageData.rackNo}`);
      if (stageData.customerApproved !== undefined) stageChanges.push(`Customer Approved: ${stageData.customerApproved}`);
      if (stageData.paymentStatus) stageChanges.push(`Payment Status: ${String(stageData.paymentStatus).replace(/_/g, " ")}`);
      if (stageData.amountReceived !== undefined && stageData.amountReceived !== "") stageChanges.push(`Amount Received: ₹${stageData.amountReceived}`);
      if (stageData.balanceRemaining !== undefined && stageData.balanceRemaining !== "") stageChanges.push(`Balance Remaining: ₹${stageData.balanceRemaining}`);
      if (stageData.passedCount !== undefined) stageChanges.push(`QC Passed: ${stageData.passedCount} pcs`);
      if (stageData.packedCount !== undefined) stageChanges.push(`Packed Count: ${stageData.packedCount} pcs`);
      if (stageData.trackingNumber) stageChanges.push(`Tracking Number: ${stageData.trackingNumber}`);
      if (stageData.deliveredDate) stageChanges.push(`Delivered Date: ${stageData.deliveredDate}`);
    }
    if (comment) {
      stageChanges.push(`Note: "${comment}"`);
    }
    if (targetAssignedTo) {
      stageChanges.push(`Assigned To: ${targetAssignedTo}`);
    }

    lead.activityLogs.push({
      action:
        action === "save"
          ? `Stage Saved (${prevStageDisplay})`
          : action === "refer_back"
          ? `Referred Back from ${formatSubStageLabel(fromSubStage)} to ${formatSubStageLabel(lead.subStage)}`
          : lead.isCompleted
          ? "Order Completed & Fulfilled"
          : `Moved from ${formatSubStageLabel(fromSubStage)} to ${nextStageDisplay}`,
      stage: nextStageDisplay,
      performedBy: author || lead.employeeName || "Sales Executive",
      role: role || "Sales Executive",
      loginId: "",
      details:
        action === "save"
          ? `Stage ${prevStageDisplay} draft saved by ${author || "Operator"} (${role || "Sales Executive"}).`
          : action === "refer_back"
          ? `Application referred back from ${prevStageDisplay} to ${nextStageDisplay} by ${author || "Operator"} (${role || "Manager"}).`
          : `Stage ${prevStageDisplay} submitted by ${author || "Operator"} (${role || "Sales Executive"}). Application moved to ${nextStageDisplay}.`,
      changes: stageChanges,
      timestamp: new Date(),
    });

    await lead.save();

    try {
      const Task = require("../models/Task");
      const orderIdStr = lead.orderId || lead._id.toString().slice(-6).toUpperCase();
      const taskIdStr = `TSK-${orderIdStr}`;
      await Task.findOneAndUpdate(
        { $or: [{ leadId: lead._id }, { taskId: taskIdStr }] },
        {
          orderStage: lead.orderStage || "sample",
          subStage: lead.subStage || "",
          notes: lead.stockTaskData?.batchNote || lead.productionTaskData?.batchNote || "",
          ...(lead.assignedTo ? { assignedTo: lead.assignedTo } : {}),
        }
      );
    } catch (e) {
      console.warn("Could not sync Task model on stage-transition:", e.message);
    }

    res.json({ success: true, data: lead });
  } catch (err) {
    console.error("Error in stage-transition:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/leads/:id/coordinator-handover - Coordinator Sample handover actions
router.patch("/:id/coordinator-handover", async (req, res) => {
  try {
    const { route, action, handoverData, comment, author, assignedTo } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    if (action === "refer_back" && (!comment || !comment.trim())) {
      return res.status(400).json({ success: false, message: "Correction note is mandatory when referring back." });
    }

    const actorName = author || "Alex Rivera (Coordinator)";
    const activeStageLabel = formatStageLabel(lead.orderStage || "sample");
    const targetAssignedTo = assignedTo !== undefined ? assignedTo : handoverData?.assignedTo;
    if (targetAssignedTo !== undefined) {
      lead.assignedTo = targetAssignedTo;
    }

    if (!Array.isArray(lead.activityLogs)) lead.activityLogs = [];
    if (!Array.isArray(lead.approvalComments)) lead.approvalComments = [];

    let movedToPrinting = false;
    let logActionTitle = "";
    let logStageLabel = `${activeStageLabel} → ${formatSubStageLabel(lead.subStage || "dtf-pending")}`;
    let logDetails = "";
    const logChanges = [];

    if (route === "verification-to-staging") {
      const normCoordOrderStage = (lead.orderStage || "").toLowerCase().trim();
      const isPartialOrd = normCoordOrderStage === "partial";
      const isCompleteOrd = normCoordOrderStage === "complete";
      lead.stockTaskData = {
        ...(lead.stockTaskData || {}),
        ...(handoverData || {}),
        ...(isPartialOrd && Array.isArray(handoverData?.readyToPickAttachments) ? { partialReadyToPickAttachments: handoverData.readyToPickAttachments } : {}),
        ...(isCompleteOrd && Array.isArray(handoverData?.readyToPickAttachments) ? { completeReadyToPickAttachments: handoverData.readyToPickAttachments } : {}),
        ...(targetAssignedTo !== undefined ? { assignedTo: targetAssignedTo } : {}),
        ...(comment ? { note: comment } : {}),
      };
      lead.markModified("stockTaskData");

      lead.stockHandoverData = {
        ...(lead.stockHandoverData || {}),
        verificationToStaging: {
          ...(lead.stockHandoverData?.verificationToStaging || {}),
          ...(handoverData || {}),
          note: comment || handoverData?.note || "",
          updatedAt: new Date(),
        },
      };
      lead.markModified("stockHandoverData");

      if (action === "submit") {
        lead.stockTaskStage = "staging_room";
        if (lead.stockApproval) lead.stockApproval.status = "Pending";
        lead.stockTaskData.readyToPickSubmitted = true;
        lead.stockTaskData.readyToPickAt = new Date();
        lead.markModified("stockTaskData");

        logActionTitle = "Coordinator Handover: From Verification to Staging Room";
        logStageLabel = "Stock Task → Staging Room";
        logDetails = `Coordinator (${actorName}) picked up verified stock garments and delivered to Stock Staging Room.`;
        logChanges.push("From: Coordinator → From Verification to Staging Room");
        logChanges.push("To: Stock Room → Staging Room");
      } else if (action === "refer_back") {
        lead.stockTaskStage = "verification";
        logActionTitle = "Coordinator Referred Back to Stock Verification";
        logStageLabel = "Stock Task → Verification";
        logDetails = `Coordinator (${actorName}) referred order back from From Verification to Staging Room to Stock Verification.`;
        logChanges.push("From: Coordinator → From Verification to Staging Room");
        logChanges.push("To: Stock Room → Verification");
      } else {
        logActionTitle = "Coordinator Saved: From Verification to Staging Room";
        logDetails = `Coordinator (${actorName}) saved handover draft for From Verification to Staging Room.`;
      }
    } else if (route === "staging-to-printing") {
      const existingStagingHandover = lead.stockHandoverData?.stagingToPrinting || {};
      lead.stockHandoverData = {
        ...(lead.stockHandoverData || {}),
        stagingToPrinting: {
          ...existingStagingHandover,
          ...(handoverData || {}),
          note: comment || handoverData?.note || existingStagingHandover.note || "",
          updatedAt: new Date(),
        },
      };
      lead.markModified("stockHandoverData");

      if (action === "submit") {
        lead.stockHandoverComplete = true;
        lead.stockHandoverAt = new Date();
        lead.stockHandoverBy = actorName;

        const isCompleteOrder = (lead.orderStage || "").toLowerCase().trim() === "complete";
        if (lead.productionHandoverComplete === true || isCompleteOrder) {
          if (isCompleteOrder) {
            lead.productionHandoverComplete = true;
          }
          lead.approvalStatus = "Approved";
          if (!lead.orderStage) lead.orderStage = "sample";
          lead.subStage = "printing";
          movedToPrinting = true;
        }

        logActionTitle = movedToPrinting
          ? `Coordinator Handover: From Staging Room to Printing (Moved to ${activeStageLabel} → Printing)`
          : "Coordinator Handover: From Staging Room to Printing (Awaiting Logo Cutting Handover)";
        logStageLabel = movedToPrinting ? `${activeStageLabel} → Printing` : "Awaiting Production Logo Handover";
        logDetails = movedToPrinting
          ? (isCompleteOrder
            ? `Coordinator (${actorName}) delivered stock garments from Staging Room to Printing. Production Room skipped for Complete — order moved directly to ${activeStageLabel} → Printing.`
            : `Coordinator (${actorName}) delivered stock garments from Staging Room to Printing. Both Stock & Production handovers are complete — order moved to ${activeStageLabel} → Printing.`)
          : `Coordinator (${actorName}) delivered stock garments from Staging Room to Printing. Order will move to ${activeStageLabel} → Printing once Logo Cutting handover is also approved.`;
        logChanges.push("From: Coordinator → From Staging Room to Printing");
        logChanges.push(movedToPrinting ? `To: ${activeStageLabel} → Printing` : "Status: Stock Handover Complete (Waiting for Production Logo Handover)");
      } else if (action === "refer_back") {
        lead.stockTaskStage = "staging_room";
        lead.stockApproval = {
          status: "Pending",
          note: comment,
          author: actorName,
          updatedAt: new Date(),
        };
        lead.stockHandoverComplete = false;
        logActionTitle = "Coordinator Referred Back to Stock Staging Room";
        logStageLabel = "Stock Task → Staging Room";
        logDetails = `Coordinator (${actorName}) referred order back from From Staging Room to Printing to Stock Room Staging Room.`;
        logChanges.push("From: Coordinator → From Staging Room to Printing");
        logChanges.push("To: Stock Room → Staging Room");
      } else {
        logActionTitle = "Coordinator Saved: From Staging Room to Printing";
        logDetails = `Coordinator (${actorName}) saved handover draft for From Staging Room to Printing.`;
      }
    } else if (route === "logo-cutting-to-printing") {
      lead.productionHandoverData = {
        ...(lead.productionHandoverData || {}),
        ...(handoverData || {}),
        ...(targetAssignedTo !== undefined ? { assignedTo: targetAssignedTo } : {}),
        note: comment || handoverData?.note || lead.productionHandoverData?.note || "",
        updatedAt: new Date(),
      };
      lead.markModified("productionHandoverData");

      if (action === "submit") {
        lead.productionHandoverComplete = true;
        lead.productionHandoverAt = new Date();
        lead.productionHandoverBy = actorName;

        if (lead.stockHandoverComplete === true) {
          lead.approvalStatus = "Approved";
          if (!lead.orderStage) lead.orderStage = "sample";
          lead.subStage = "printing";
          movedToPrinting = true;
        }

        logActionTitle = movedToPrinting
          ? `Coordinator Handover: From Logo Cutting to Printing (Moved to ${activeStageLabel} → Printing)`
          : "Coordinator Handover: From Logo Cutting to Printing (Awaiting Stock Handover)";
        logStageLabel = movedToPrinting ? `${activeStageLabel} → Printing` : "Awaiting Stock Staging Handover";
        logDetails = movedToPrinting
          ? `Coordinator (${actorName}) delivered cut logos from Production Logo Cutting to Printing. Both Stock & Production handovers are complete — order moved to ${activeStageLabel} → Printing.`
          : `Coordinator (${actorName}) delivered cut logos from Production Logo Cutting to Printing. Order will move to ${activeStageLabel} → Printing once Stock Staging handover is also approved.`;
        logChanges.push("From: Coordinator → From Logo Cutting to Printing");
        logChanges.push(movedToPrinting ? `To: ${activeStageLabel} → Printing` : "Status: Production Handover Complete (Waiting for Stock Staging Handover)");
      } else if (action === "refer_back") {
        lead.productionTaskStage = "logo_cutting";
        lead.productionApproval = {
          status: "Pending",
          note: comment,
          author: actorName,
          updatedAt: new Date(),
        };
        lead.productionHandoverComplete = false;
        logActionTitle = "Coordinator Referred Back to Production Logo Cutting";
        logStageLabel = "Production Task → Logo Cutting";
        logDetails = `Coordinator (${actorName}) referred order back from From Logo Cutting to Printing to Production Logo Cutting.`;
        logChanges.push("From: Coordinator → From Logo Cutting to Printing");
        logChanges.push("To: Production Room → Logo Cutting");
      } else {
        logActionTitle = "Coordinator Saved: From Logo Cutting to Printing";
        logDetails = `Coordinator (${actorName}) saved handover draft for From Logo Cutting to Printing.`;
      }
    } else {
      return res.status(400).json({ success: false, message: `Unsupported coordinator handover route: ${route}` });
    }

    if (comment) logChanges.push(`Note: "${comment}"`);
    if (targetAssignedTo) logChanges.push(`Assigned To: ${targetAssignedTo}`);

    if (comment && action !== "save") {
      lead.approvalComments.push({
        author: actorName,
        role: "Coordinator",
        comment,
        status: action === "submit" ? "Approved" : "Referred Back",
        createdAt: new Date(),
      });
    }

    lead.activityLogs.push({
      action: logActionTitle,
      stage: logStageLabel,
      performedBy: actorName,
      role: "Coordinator",
      loginId: "coordinator",
      details: logDetails,
      changes: logChanges,
      timestamp: new Date(),
    });

    await lead.save();

    try {
      const Task = require("../models/Task");
      const orderIdStr = lead.orderId || lead._id.toString().slice(-6).toUpperCase();
      const taskIdStr = `TSK-${orderIdStr}`;
      await Task.findOneAndUpdate(
        { $or: [{ leadId: lead._id }, { taskId: taskIdStr }] },
        {
          orderStage: lead.orderStage || "sample",
          subStage: lead.subStage || "",
          ...(lead.assignedTo ? { assignedTo: lead.assignedTo } : {}),
        }
      );
    } catch (e) {
      console.warn("Could not sync Task model on coordinator-handover:", e.message);
    }

    res.json({ success: true, data: lead, movedToPrinting });
  } catch (err) {
    console.error("Error in coordinator-handover:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
