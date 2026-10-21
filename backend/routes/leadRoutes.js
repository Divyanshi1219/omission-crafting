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
        filter.query = "order";
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
    const leads = await Lead.find(filter).sort({ createdAt: -1 });
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

    if ((leadData.query === "order" || leadData.orderStage) && !leadData.orderId) {
      leadData.orderId = await getNextOrderId();
    }

    if (_id) {
      const existing = await Lead.findById(_id);
      if (existing) {
        // If this lead was referred back, resubmitting sets it back to Pending for the referred department(s)
        const isReferredBack =
          existing.approvalStatus === "Referred Back" ||
          existing.stockApproval?.status === "Referred Back" ||
          existing.productionApproval?.status === "Referred Back";

        if (isReferredBack) {
          leadData.approvalStatus = "Pending";
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
            comment: "Revisions completed by Sales team; resubmitted for manager approval.",
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

    const authorText = `${author || ""} ${role || ""} ${department || ""}`.toLowerCase();
    const isStock = authorText.includes("stock");
    const isProduction = authorText.includes("production");

    if (!lead.stockApproval) {
      lead.stockApproval = { status: "Pending", note: "", author: "", updatedAt: null };
    }
    if (!lead.productionApproval) {
      lead.productionApproval = { status: "Pending", note: "", author: "", updatedAt: null };
    }

    if (isStock) {
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
      // General manager / admin
      lead.stockApproval = {
        status,
        note: comment || "",
        author: author || "Manager",
        updatedAt: new Date(),
      };
      lead.productionApproval = {
        status,
        note: comment || "",
        author: author || "Manager",
        updatedAt: new Date(),
      };
    }

    // Determine overall approvalStatus
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

    if (comment || status) {
      if (!Array.isArray(lead.approvalComments)) {
        lead.approvalComments = [];
      }
      lead.approvalComments.push({
        author: author || "Manager",
        role: role || (isStock ? "Stock Room Manager" : isProduction ? "Production Lead" : "Manager"),
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

// DELETE /api/leads/:id - Delete lead
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Lead.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    res.json({ success: true, message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
