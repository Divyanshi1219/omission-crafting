const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory");

// GET /api/inventory - Fetch all inventory items
router.get("/", async (req, res) => {
  try {
    const items = await Inventory.find().sort({ createdAt: -1 });
    res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/inventory/next-number - Auto-generate next inventory number (e.g. INV0001234)
router.get("/next-number", async (req, res) => {
  try {
    const items = await Inventory.find({}, "number").lean();
    let maxNum = 1000;
    const regex = /^INV(\d+)$/i;

    items.forEach((it) => {
      if (it.number) {
        const match = it.number.match(regex);
        if (match) {
          const n = parseInt(match[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    });

    const nextNumber = `INV${String(maxNum + 1).padStart(7, "0")}`;
    res.json({ success: true, nextNumber });
  } catch (error) {
    console.error("Error generating inventory number:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/inventory/:id - Fetch single inventory record
router.get("/:id", async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory record not found" });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/inventory - Create new inventory record
router.post("/", async (req, res) => {
  try {
    let data = { ...req.body };
    if (!data.number) {
      const count = await Inventory.countDocuments();
      data.number = `INV${String(1001 + count).padStart(7, "0")}`;
    }

    const newRecord = new Inventory(data);
    const saved = await newRecord.save();
    res.status(201).json({ success: true, message: "Inventory record created", data: saved });
  } catch (error) {
    console.error("Error creating inventory record:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "An inventory record with this Number already exists.",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/inventory/:id - Update inventory record
router.put("/:id", async (req, res) => {
  try {
    const updated = await Inventory.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Inventory record not found" });
    }
    res.json({ success: true, message: "Inventory record updated", data: updated });
  } catch (error) {
    console.error("Error updating inventory record:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/inventory/:id - Delete inventory record
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Inventory.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Inventory record not found" });
    }
    res.json({ success: true, message: "Inventory record deleted" });
  } catch (error) {
    console.error("Error deleting inventory record:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
