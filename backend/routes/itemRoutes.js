const express = require("express");
const router = express.Router();
const Item = require("../models/Item");

// Helper: clean and trim array of strings
const cleanArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
};

// GET /api/items - Fetch all items (auto-seeds default if empty)
router.get("/", async (req, res) => {
  try {
    let items = await Item.find().sort({ createdAt: 1 });

    // Auto-seed default item "T-Shirt" if collection is empty
    if (items.length === 0) {
      const defaultItem = await Item.create({
        name: "T-Shirt",
        description: "Default standard T-Shirt item",
        fabrics: [
          "Cotton",
          "100% Cotton",
          "Polyester",
          "Poly-Cotton",
          "Dry-Fit",
          "Lycra",
          "Fleece",
          "Denim",
        ],
        sizes: ["S", "M", "L", "XL", "XXL", "XXXL"],
        colors: ["White", "Black", "Grey", "Navy", "Red", "Blue"],
        createdBy: "System",
      });
      items = [defaultItem];
    }

    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching items: " + error.message,
    });
  }
});

// POST /api/items - Add a new item
router.post("/", async (req, res) => {
  try {
    const { name, description, fabrics, sizes, colors, createdBy } = req.body;
    const trimmedName = (name || "").trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: "Item name is required.",
      });
    }

    // Check case-insensitive duplicate
    const existing = await Item.findOne({
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Item "${trimmedName}" already exists.`,
      });
    }

    const newItem = await Item.create({
      name: trimmedName,
      description: (description || "").trim(),
      fabrics: cleanArray(fabrics),
      sizes: cleanArray(sizes),
      colors: cleanArray(colors),
      createdBy: createdBy || "CEO",
    });

    res.status(201).json({
      success: true,
      message: `Item "${newItem.name}" added successfully.`,
      data: newItem,
    });
  } catch (error) {
    console.error("Error adding item:", error);
    res.status(500).json({
      success: false,
      message: "Server error adding item: " + error.message,
    });
  }
});

// PUT /api/items/:id - Update item
router.put("/:id", async (req, res) => {
  try {
    const { name, description, isActive, fabrics, sizes, colors } = req.body;
    const updateData = {};

    if (name !== undefined) {
      const trimmedName = (name || "").trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: "Item name cannot be empty.",
        });
      }

      // Duplicate check
      const existing = await Item.findOne({
        _id: { $ne: req.params.id },
        name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Item name "${trimmedName}" already in use.`,
        });
      }
      updateData.name = trimmedName;
    }

    if (description !== undefined) updateData.description = description.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (fabrics !== undefined) updateData.fabrics = cleanArray(fabrics);
    if (sizes !== undefined) updateData.sizes = cleanArray(sizes);
    if (colors !== undefined) updateData.colors = cleanArray(colors);

    const updated = await Item.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: 'after' }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Item not found.",
      });
    }

    res.json({
      success: true,
      message: "Item updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating item: " + error.message,
    });
  }
});

// DELETE /api/items/:id - Delete item
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Item.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Item not found.",
      });
    }

    res.json({
      success: true,
      message: `Item "${deleted.name}" deleted successfully.`,
      data: deleted,
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting item: " + error.message,
    });
  }
});

module.exports = router;
