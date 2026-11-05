const express = require("express");
const router = express.Router();
const Fabric = require("../models/Fabric");

const DEFAULT_FABRICS = [
  "Cotton",
  "100% Cotton",
  "Polyester",
  "Poly-Cotton",
  "Dry-Fit",
  "Lycra",
  "Fleece",
  "Denim",
];

// GET /api/fabrics - Fetch all fabrics (auto-seeds defaults if empty)
router.get("/", async (req, res) => {
  try {
    let fabrics = await Fabric.find().sort({ createdAt: 1 });

    if (fabrics.length === 0) {
      await Fabric.insertMany(
        DEFAULT_FABRICS.map((name) => ({
          name,
          createdBy: "System",
        }))
      );
      fabrics = await Fabric.find().sort({ createdAt: 1 });
    }

    res.json({
      success: true,
      count: fabrics.length,
      data: fabrics,
    });
  } catch (error) {
    console.error("Error fetching fabrics:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching fabrics: " + error.message,
    });
  }
});

// POST /api/fabrics - Add a new fabric
router.post("/", async (req, res) => {
  try {
    const { name, createdBy } = req.body;
    const trimmedName = (name || "").trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: "Fabric name is required.",
      });
    }

    // Check duplicate
    const existing = await Fabric.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Fabric "${trimmedName}" already exists.`,
      });
    }

    const newFabric = await Fabric.create({
      name: trimmedName,
      createdBy: createdBy || "CEO",
    });

    res.status(201).json({
      success: true,
      message: `Fabric "${newFabric.name}" added.`,
      data: newFabric,
    });
  } catch (error) {
    console.error("Error adding fabric:", error);
    res.status(500).json({
      success: false,
      message: "Server error adding fabric: " + error.message,
    });
  }
});

// DELETE /api/fabrics/:id - Delete a fabric
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Fabric.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Fabric not found.",
      });
    }

    res.json({
      success: true,
      message: `Fabric "${deleted.name}" deleted.`,
      data: deleted,
    });
  } catch (error) {
    console.error("Error deleting fabric:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting fabric: " + error.message,
    });
  }
});

module.exports = router;

