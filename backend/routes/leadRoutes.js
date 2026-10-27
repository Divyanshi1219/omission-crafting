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
    // Option A (photo-safe): the Approvals page fetches with ?query=order and renders
    // direct artwork download links, so it gets the full attachment. Every other list
    // caller (orders/leads tables, dashboard, inventory, invoices) never reads the photo,
    // so we skip the heavy base64 `attachment` field there. Detail view (GET /:id) is
    // untouched and always returns the full photo. Nothing is lost or hidden in the DB.
    const includesAttachment = req.query.query === "order";
    const leads = await Lead.find(
      filter,
      includesAttachment ? undefined : { attachment: 0 }
    ).sort({ createdAt: -1 });
    // Fast check: only run update if any orders are actually missing a taskId
    const missingTaskLeads = leads.filter(l => !l.taskId && (l.query === "order" || l.orderId || l.orderStage));
    if (missingTaskLeads.length > 0) {
      await Promise.all(
        missingTaskLeads.map(async (l) => {
          const derivedTaskId = l.orderId
            ? `TSK-${l.orderId.replace(/^ORD-?/i, "")}`
            : await getNextTaskId();
          l.taskId = derivedTaskId;
          await Lead.updateOne({ _id: l._id }, { $set: { taskId: derivedTaskId } });
        })
      );
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
    if (modified) {
      await lead.save();
    }
    res.json({ success: true, data: lead });
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/leads - Create new lead (or update if _id provided)
router.post("/", async (req, res) => {
  try {
    const { _id, ...leadData } = req.body;

    // Normalize subStage: real orders must always sit in the 'order' sub-stage.
    // Prevents "" / "new" / "leads" values on order records, which previously
    // made the list show "Leads" while the detail view treated them as 'order'.
    if (leadData.query === "order") {
      const ss = String(leadData.subStage || "").toLowerCase().trim();
      if (!ss || ss === "new" || ss === "leads") {
        leadData.subStage = "order";
      }
    }

    if ((leadData.query === "order" || leadData.orderStage) && !leadData.orderId) {
      leadData.orderId = await getNextOrderId();
    }

    if ((leadData.query === "order" || leadData.orderStage || leadData.orderId) && !leadData.taskId) {
      if (leadData.orderId) {
        leadData.taskId = `TSK-${leadData.orderId.replace(/^ORD-?/i, "")}`;
      } else {
        leadData.taskId = await getNextTaskId();
      }
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
      }

      const updated = await Lead.findByIdAndUpdate(_id, leadData, {
        new: true,
        runValidators: true,
      });
      return res.json({ success: true, message: "Lead updated successfully", data: updated });
    }

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
    const updated = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
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
      } else if (status === "Approved") {
        lead.stockTaskStage = "ready_to_pick";
        lead.productionTaskStage = "logo_cutting";
        if (!lead.stockApproval || lead.stockApproval.status !== "Approved") {
          lead.stockApproval = { status: "Pending", note: "", author: "Elena Rostova", updatedAt: null };
        }
        if (!lead.productionApproval || lead.productionApproval.status !== "Approved") {
          lead.productionApproval = { status: "Pending", note: "", author: "Marcus Vance", updatedAt: null };
        }
        if (lead.stockApproval?.status === "Approved" && lead.productionApproval?.status === "Approved") {
          lead.approvalStatus = "Approved";
        } else {
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
    }

    // Determine overall approvalStatus
    if (!isLeadManager) {
      if (
        lead.stockApproval.status === "Referred Back" ||
        lead.productionApproval.status === "Referred Back"
      ) {
        lead.approvalStatus = "Referred Back";
      } else if (
        lead.stockApproval.status === "Approved" &&
        lead.productionApproval.status === "Approved"
      ) {
        lead.approvalStatus = "Approved";
      } else {
        lead.approvalStatus = "Pending";
      }
    }

    if (comment || status) {
      if (!Array.isArray(lead.approvalComments)) {
        lead.approvalComments = [];
      }
      lead.approvalComments.push({
        author: author || "Manager",
        role: role || (isLeadManager ? "Lead Manager" : isStock ? "Stock Room Manager" : isProduction ? "Production Lead" : "Manager"),
        comment: comment || (status === "Approved" ? "Approved" : "Referred Back"),
        status,
        createdAt: new Date(),
      });
    }

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
      lead.markModified("stockTaskData");
    }

    if (action === "submit") {
      if (stage === "ready_to_pick") {
        lead.stockTaskStage = "staging_room";
      } else if (stage === "staging_room") {
        lead.stockTaskStage = "completed";
        lead.stockApproval = {
          status: "Approved",
          note: comment || "Approved by Stock Room",
          author: author || "Elena Rostova",
          updatedAt: new Date(),
        };

        // If Production Room has also approved, advance to Printing of the active major stage!
        if (lead.productionApproval?.status === "Approved") {
          lead.approvalStatus = "Approved";
          if (!lead.orderStage) lead.orderStage = "sample";
          lead.subStage = "printing";
        }
      }
    } else if (action === "refer_back") {
      if (stage === "staging_room") {
        lead.stockTaskStage = "ready_to_pick";
      } else {
        // Return to sales executive
        lead.stockApproval = {
          status: "Referred Back",
          note: comment || "Stock Room referred back for revision",
          author: author || "Elena Rostova",
          updatedAt: new Date(),
        };
        lead.approvalStatus = "Referred Back";
      }
    }

    if (comment) {
      if (!Array.isArray(lead.approvalComments)) lead.approvalComments = [];
      lead.approvalComments.push({
        author: author || "Elena Rostova",
        role: "Stock Room Manager",
        comment,
        status: action === "submit" ? "Approved" : "Referred Back",
        createdAt: new Date(),
      });
    }

    await lead.save();
    res.json({ success: true, data: lead });
  } catch (err) {
    console.error("Error in stock-task:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/leads/:id/production-task - Advance or refer back Production Room task
router.patch("/:id/production-task", async (req, res) => {
  try {
    const { action, productionTaskData, comment, author } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    if (productionTaskData) {
      lead.productionTaskData = { ...(lead.productionTaskData || {}), ...productionTaskData };
      lead.markModified("productionTaskData");
    }

    if (action === "submit") {
      lead.productionTaskStage = "completed";
      lead.productionApproval = {
        status: "Approved",
        note: comment || "Approved by Production Lead",
        author: author || "Marcus Vance",
        updatedAt: new Date(),
      };

      // If Stock Room has also approved, advance to Printing of the active major stage!
      if (lead.stockApproval?.status === "Approved") {
        lead.approvalStatus = "Approved";
        if (!lead.orderStage) lead.orderStage = "sample";
        lead.subStage = "printing";
      }
    } else if (action === "refer_back") {
      lead.productionApproval = {
        status: "Referred Back",
        note: comment || "Production referred back for revision",
        author: author || "Marcus Vance",
        updatedAt: new Date(),
      };
      lead.approvalStatus = "Referred Back";
    }

    if (comment) {
      if (!Array.isArray(lead.approvalComments)) lead.approvalComments = [];
      lead.approvalComments.push({
        author: author || "Marcus Vance",
        role: "Production Lead",
        comment,
        status: action === "submit" ? "Approved" : "Referred Back",
        createdAt: new Date(),
      });
    }

    await lead.save();
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
        if (fromSubStage === "staging-ground" || toSubStage === "staging-ground") {
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

    // Default stage updates
    if (toStage) lead.orderStage = toStage;
    if (toSubStage) lead.subStage = toSubStage;
    lead.query = "order";

    // Transition 1: Customer Approval submitted in Sample -> Move to Partial & trigger Stock and Production tasks!
    if (activeStage === "sample" && fromSubStage === "customer-approval-awaiting" && action === "submit") {
      lead.orderStage = "partial";
      lead.subStage = "order";
      lead.approvalStatus = "Pending";
      lead.stockApproval = {
        status: "Pending",
        note: comment || "Partial stage stock allocation required",
        author: "Stock Room",
        updatedAt: null,
      };
      lead.stockTaskStage = "ready_to_pick";
      lead.productionApproval = {
        status: "Pending",
        note: comment || "Partial stage logo printing required",
        author: "Production Lead",
        updatedAt: null,
      };
      lead.productionTaskStage = "logo_cutting";
    }

    // Transition 2: Payment Confirmation submitted in Partial -> Move to Complete & trigger Stock and Production tasks!
    if (activeStage === "partial" && fromSubStage === "payment-confirmation" && action === "submit") {
      lead.orderStage = "complete";
      lead.subStage = "order";
      lead.approvalStatus = "Pending";
      lead.stockApproval = {
        status: "Pending",
        note: comment || "Complete stage bulk stock allocation required",
        author: "Stock Room",
        updatedAt: null,
      };
      lead.stockTaskStage = "ready_to_pick";
      lead.productionApproval = {
        status: "Pending",
        note: comment || "Complete stage final logo cutting required",
        author: "Production Lead",
        updatedAt: null,
      };
      lead.productionTaskStage = "logo_cutting";
    }

    // Transition 3: Final step of Complete (Customer Support) completed -> Mark order as Completed!
    if (activeStage === "complete" && fromSubStage === "customer-support" && action === "submit") {
      lead.orderStage = "complete";
      lead.subStage = "customer-support";
      lead.approvalStatus = "Completed";
      lead.isCompleted = true;
    }

    // If referring back from printing: resets tasks for Stock & Production so corrections can be made
    if (fromSubStage === "printing" && action === "refer_back") {
      lead.subStage = "order";
      lead.approvalStatus = "Pending";
      lead.stockApproval = {
        status: "Pending",
        note: comment || `${lead.orderStage || "Order"} printing requested stock corrections`,
        author: "Stock Room",
        updatedAt: new Date(),
      };
      lead.stockTaskStage = "ready_to_pick";
      lead.productionApproval = {
        status: "Pending",
        note: comment || `${lead.orderStage || "Order"} printing requested production corrections`,
        author: "Production Lead",
        updatedAt: new Date(),
      };
      lead.productionTaskStage = "logo_cutting";
    }

    if (comment) {
      if (!Array.isArray(lead.approvalComments)) lead.approvalComments = [];
      lead.approvalComments.push({
        author: author || "Operator",
        role: role || "Manager",
        comment,
        status: action === "submit" ? "Approved" : "Referred Back",
        createdAt: new Date(),
      });
    }

    await lead.save();
    res.json({ success: true, data: lead });
  } catch (err) {
    console.error("Error in stage-transition:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
