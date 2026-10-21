const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");

// GET /api/invoices - Fetch all invoices
router.get("/", async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json({ success: true, count: invoices.length, data: invoices });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/invoices/next-number - Get next sequential invoice number
router.get("/next-number", async (req, res) => {
  try {
    const invoices = await Invoice.find({}, "invoiceNumber").lean();
    let maxNum = 0;
    const year = new Date().getFullYear();
    const regex = new RegExp(`^INV-${year}-(\\d+)$`, "i");

    invoices.forEach((inv) => {
      if (inv.invoiceNumber) {
        const match = inv.invoiceNumber.match(regex);
        if (match) {
          const n = parseInt(match[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    });

    const nextInvoiceNumber = `INV-${year}-${String(maxNum + 1).padStart(3, "0")}`;
    res.json({ success: true, nextInvoiceNumber });
  } catch (error) {
    console.error("Error generating invoice number:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/invoices/:id - Get invoice by ID
router.get("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/invoices - Create new invoice
router.post("/", async (req, res) => {
  try {
    let invoiceData = { ...req.body };

    // Guarantee unique sequential invoiceNumber
    const year = new Date().getFullYear();
    const existing = invoiceData.invoiceNumber
      ? await Invoice.findOne({ invoiceNumber: invoiceData.invoiceNumber })
      : null;

    if (!invoiceData.invoiceNumber || existing) {
      const invoices = await Invoice.find({}, "invoiceNumber").lean();
      let maxNum = 0;
      const regex = new RegExp(`^INV-${year}-(\\d+)$`, "i");

      invoices.forEach((inv) => {
        if (inv.invoiceNumber) {
          const match = String(inv.invoiceNumber).match(regex);
          if (match) {
            const n = parseInt(match[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
      });

      invoiceData.invoiceNumber = `INV-${year}-${String(maxNum + 1).padStart(3, "0")}`;
    }

    const newInvoice = new Invoice(invoiceData);
    const saved = await newInvoice.save();
    res.status(201).json({ success: true, message: "Invoice created successfully", data: saved });
  } catch (error) {
    console.error("Error creating invoice:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "An invoice with this invoice number already exists.",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/invoices/:id - Update invoice
router.put("/:id", async (req, res) => {
  try {
    const updated = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    res.json({ success: true, message: "Invoice updated successfully", data: updated });
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/invoices/:id - Delete invoice
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Invoice.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    res.json({ success: true, message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
