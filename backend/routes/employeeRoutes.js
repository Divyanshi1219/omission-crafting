const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Employee = require("../models/Employee");

// GET /api/employees - list all employees
router.get("/", async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/employees/:id - single employee
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/employees - create (or update if _id provided)
router.post("/", async (req, res) => {
  try {
    const { _id, ...data } = req.body;
    if (_id) {
      const updated = await Employee.findByIdAndUpdate(_id, data, {
        new: true,
        runValidators: true,
      });
      return res.json({ success: true, message: "Employee updated", data: updated });
    }
    const saved = await new Employee(data).save();
    res.status(201).json({ success: true, message: "Employee created", data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/employees/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Employee.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    res.json({ success: true, message: "Employee deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
