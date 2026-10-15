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
