const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Lead = require("../models/Lead");

// GET /api/leads - Fetch leads (optional filter by query, orderStage, subStage)
router.get("/", async (req, res) => {
  try {
    const filter = {};
    const q = req.query.query || req.query.status;
    if (q) {
      if (q === "order") {
        filter.$or = [
          { query: "order" },
          { orderId: { $exists: true, $ne: "" } },
          { orderStage: { $exists: true, $ne: "" } }
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
            "stockTaskData.readyToPickAttachments.url": 0,
            "stockTaskData.sampleReadyToPickAttachments.url": 0,
            "stockTaskData.partialReadyToPickAttachments.url": 0,
            "stockTaskData.completeReadyToPickAttachments.url": 0,
          }
    )
      .sort({ updatedAt: -1, createdAt: -1 })
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

    res.json({ success: true, count: leads.length, data: leads });
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
  if (str === "ready-to-pick-up" || str === "ready-to-pick") return "Ready to Pick Up";
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
    { key: "query", label: "Query Type" },
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

        const currentStageStr = isNowOrder
          ? `${formatStageLabel(leadData.orderStage || existing.orderStage || "sample")} → ${formatSubStageLabel(leadData.subStage || existing.subStage || "order")}`
          : "Leads";

        let actionTitle = logAction || (isConvertedToOrder ? "Lead Converted to Order & Submitted" : isNowOrder ? "Order Edited" : "Lead Edited");
        if (isReferredBack && !isConvertedToOrder) {
          actionTitle = "Order Edited & Resubmitted for Clearance";
        }

        let detailsText = "";
        if (isConvertedToOrder) {
          detailsText = `Lead converted to Order and submitted by ${actorName} (${actorRole}). Moved to ${currentStageStr}.`;
        } else if (isReferredBack) {
          detailsText = `Order edited and resubmitted for approval by ${actorName} (${actorRole}).`;
        } else if (isNowOrder) {
          detailsText = `Edit Order performed by ${actorName} (${actorRole}) at stage ${currentStageStr}.`;
        } else {
          detailsText = `Lead details updated and saved to Leads by ${actorName} (${actorRole}).`;
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
      return res.json({ success: true, message: "Lead updated successfully", data: updated });
    }

    const isOrder = (leadData.query || "lead").toLowerCase().trim() === "order";
    const initialStageStr = isOrder
      ? `${formatStageLabel(leadData.orderStage || "sample")} → ${formatSubStageLabel(leadData.subStage || "order")}`
      : "Leads";
    const createActionTitle = logAction || (isOrder ? "Order Created & Submitted" : "Lead Created & Saved");
    const createDetails = isOrder
      ? `New Order application (${leadData.orderId || ""}) created and submitted by ${actorName} (${actorRole}, Employee: ${leadData.employeeName || actorName}). Sent to ${initialStageStr} (Lead Manager Clearance).`
      : `New Lead application (${leadData.orderId || ""}) created and saved to Leads by ${actorName} (${actorRole}, Employee: ${leadData.employeeName || actorName}).`;

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
    const { performedBy, performedByRole, performedById, logAction, ...updateData } = req.body;
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
      details: `${isNowOrder ? "Order" : "Lead"} edited by ${actorName} (${actorRole}).`,
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
        const isEmb = isEmbroidery(lead);
        if (isEmb) {
          // For Embroidery: ONLY ONE TASK - Task 1: Stock Room (Elena Rostova). No Production task.
          lead.stockTaskStage = "verification";
          lead.stockApproval = { status: "Pending", note: "", author: "Elena Rostova", updatedAt: null };
          lead.productionApproval = { status: "Not Applicable", note: "Not required for Embroidery", author: "N/A", updatedAt: new Date() };
          lead.approvalStatus = "Pending";
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
          lead.stockApproval = { status: "Pending", note: "", author: "Elena Rostova", updatedAt: null };
          lead.productionApproval = { status: "Pending", note: "", author: "Marcus Vance", updatedAt: null };
          lead.productionTaskData = {
            ...(lead.productionTaskData || {}),
            printingSubmitted: false,
          };
          lead.approvalStatus = "Pending";
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
          assignedTo: author || (isStock ? "Elena Rostova" : "Marcus Vance"),
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
    const { action, stage, stockTaskData, comment, author } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    if (stockTaskData) {
      lead.stockTaskData = { ...(lead.stockTaskData || {}), ...stockTaskData };
      if (comment) lead.stockTaskData.note = comment;
      lead.markModified("stockTaskData");
    }

    const actorName = author || "Elena Rostova";
    let movedToPrinting = false;

    if (action === "submit") {
      if (stage === "verification") {
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
        // If Production Room has also approved (or embroidery where stock room is the only task), advance to Printing!
        if (isEmb || lead.productionApproval?.status === "Approved") {
          lead.approvalStatus = "Approved";
          if (!lead.orderStage) lead.orderStage = "sample";
          lead.subStage = "printing";
          movedToPrinting = true;
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
    if (movedToPrinting) {
      logChanges.push(`Stage Transition: Moved from Stock Room Clearance to ${formatStageLabel(lead.orderStage || "sample")} → Printing`);
    }

    lead.activityLogs.push({
      action:
        action === "save"
          ? `Stock Task - ${stockStageLabel} Saved`
          : action === "submit"
          ? stage === "staging_room"
            ? isEmb
              ? "Task 1 - Stock Room Approved (Embroidery Clearance Complete)"
              : movedToPrinting
              ? "Task 1 - Stock Room Approved (Moved to Printing)"
              : "Task 1 - Stock Room Approved"
            : `Stock Task - ${stockStageLabel} Submitted`
          : `Stock Task - Referred Back from ${stockStageLabel}`,
      stage: movedToPrinting
        ? `${formatStageLabel(lead.orderStage || "sample")} → Printing`
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
              : `Stock Room Staging Room submitted and Task 1 Clearance approved by ${actorName}.${movedToPrinting ? ` Both Stock & Production clearances completed — Application moved to ${formatStageLabel(lead.orderStage || "sample")} → Printing.` : ""}`
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
    const { action, stage, productionTaskData, comment, author } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    if (productionTaskData) {
      lead.productionTaskData = { ...(lead.productionTaskData || {}), ...productionTaskData };
      if (comment) lead.productionTaskData.note = comment;
      lead.markModified("productionTaskData");
    }

    const actorName = author || "Marcus Vance";
    let movedToPrinting = false;

    if (action === "submit") {
      const isPartial = lead.orderStage === "partial" || String(lead.currentStageId || lead.stageId || "").startsWith("PRT");
      const isComplete = lead.orderStage === "complete" || String(lead.currentStageId || lead.stageId || "").startsWith("CMP");
      const totalStockQty = lead.totalQuantity || lead.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;
      const partialBatchQty = Number(lead.customerApprovalData?.partialQuantity) || Math.floor(totalStockQty / 2);
      const remainingCompleteQty = Math.max(0, totalStockQty - partialBatchQty);

      const targetBatchQty = isComplete
        ? (Number(lead.productionTaskData?.batchQuantity) || remainingCompleteQty || totalStockQty)
        : isPartial
        ? (Number(lead.productionTaskData?.batchQuantity) || partialBatchQty || Math.floor(totalStockQty / 2))
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

        // If Stock Room has also approved, advance to Printing of the active major stage!
        if (lead.stockApproval?.status === "Approved") {
          lead.approvalStatus = "Approved";
          if (!lead.orderStage) lead.orderStage = "sample";
          lead.subStage = "printing";
          movedToPrinting = true;
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
    if (movedToPrinting) {
      logChanges.push(`Stage Transition: Moved from Stock Room & Production Clearance to ${formatStageLabel(lead.orderStage || "sample")} → Printing`);
    }

    lead.activityLogs.push({
      action:
        action === "save"
          ? `Production Task - ${prodStageLabel} Saved`
          : action === "submit"
          ? stage === "logo_printing"
            ? "Production Task - Logo Printing Submitted"
            : movedToPrinting
            ? "Task 2 - Production Approved (Moved to Printing)"
            : "Task 2 - Production Approved"
          : `Production Task - Referred Back from ${prodStageLabel}`,
      stage: movedToPrinting
        ? `${formatStageLabel(lead.orderStage || "sample")} → Printing`
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
            : `Logo Cutting & Task 2 Clearance approved by ${actorName} (Production Lead).${movedToPrinting ? ` Both Stock & Production clearances completed — Application moved to ${formatStageLabel(lead.orderStage || "sample")} → Printing.` : ""}`
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
      role
    } = req.body;

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    const activeStage = fromStage || lead.orderStage || "sample";
    const prevStageDisplay = `${formatStageLabel(activeStage)} → ${formatSubStageLabel(fromSubStage || lead.subStage || "order")}`;

    if (stageData) {
      // 1. Sample stage data mappings
      if (activeStage === "sample") {
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
        if (fromSubStage === "staging-room" || toSubStage === "staging-room") {
          lead.partialStagingRoomData = { ...(lead.partialStagingRoomData || {}), ...stageData };
          lead.markModified("partialStagingRoomData");
        }
        if (fromSubStage === "payment-confirmation" || toSubStage === "payment-confirmation") {
          lead.partialPaymentConfirmationData = { ...(lead.partialPaymentConfirmationData || {}), ...stageData };
          lead.markModified("partialPaymentConfirmationData");
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
            status: "Pending",
            note: comment || `Full payment received (₹${recAmount}). Complete stage logo printing: ${fullQty} pcs.`,
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
            batchQuantity: fullQty,
            paymentStatus: "fully_received",
            amountReceived: recAmount,
            balanceRemaining: 0,
            batchNote: `Full payment received (₹${recAmount}). Print & cut logos for full order of ${fullQty} pcs.`
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

          const partialQty = Number(stageData?.partialQuantity) || Math.floor((lead.totalQuantity || 100) / 2) || 50;
          const recAmount = Number(stageData?.amountReceived) || 0;
          const balAmount = Number(stageData?.balanceRemaining) || Math.max(0, (lead.netAmount || lead.totalAmount || 0) - recAmount);

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
            note: comment || `Partial payment received (₹${recAmount}). Partial stage logo printing: ${partialQty} pcs.`,
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
            batchQuantity: partialQty,
            paymentStatus: "partial_received",
            amountReceived: recAmount,
            balanceRemaining: balAmount,
            batchNote: `Partial payment received (₹${recAmount}). Print & cut logos for partial batch of ${partialQty} pcs.`
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
        status: "Pending",
        note: comment || `Remaining payment confirmed (₹${remAmount}). Complete stage logo printing: ${remainingQty} pcs.`,
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
        batchQuantity: remainingQty,
        paymentStatus: "fully_received",
        amountReceived: remAmount,
        balanceRemaining: 0,
        batchNote: `Remaining payment received (₹${remAmount}). Print & cut logos for remaining ${remainingQty} pcs (Partial delivered: ${partialQty} pcs).`
      };
    }

    // Transition 3: Final step of Complete (Customer Support) completed -> Mark order as Completed!
    if (action === "submit" && activeStage === "complete" && fromSubStage === "customer-support") {
      lead.orderStage = "complete";
      lead.subStage = "customer-support";
      lead.approvalStatus = "Completed";
      lead.isCompleted = true;
    }

    // If referring back from printing: resets tasks for Stock & Production so corrections can be made
    if (action === "refer_back" && fromSubStage === "printing") {
      lead.subStage = "order";
      lead.approvalStatus = "Pending";
      lead.stockApproval = {
        status: "Pending",
        note: comment || `${lead.orderStage || "Order"} printing requested stock corrections`,
        author: "Stock Room",
        updatedAt: new Date(),
      };
      lead.stockTaskStage = "verification";
      lead.productionApproval = {
        status: "Pending",
        note: comment || `${lead.orderStage || "Order"} printing requested production corrections`,
        author: "Production Lead",
        updatedAt: new Date(),
      };
      lead.productionTaskStage = "logo_printing";
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

module.exports = router;
