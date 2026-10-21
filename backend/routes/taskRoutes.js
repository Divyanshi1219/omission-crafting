const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const Lead = require("../models/Lead");

// Helper to determine department from role or author
function getDepartmentFromApprover(author = "", role = "") {
  const text = `${author} ${role}`.toLowerCase();
  if (text.includes("stock")) return "Stock Room";
  if (text.includes("production")) return "Production";
  return "Production";
}

// Helper to determine priority
function getPriorityFromLead(urgency = "") {
  const u = (urgency || "").toLowerCase();
  if (u.includes("urgent") || u.includes("high")) return "High";
  if (u.includes("medium")) return "Medium";
  return "Normal";
}

// Sync helper: ensure every approved lead has a corresponding Task
async function syncApprovedLeadsToTasks() {
  try {
    const approvedLeads = await Lead.find({ approvalStatus: "Approved" });
    for (const lead of approvedLeads) {
      const orderIdStr = lead.orderId || lead._id.toString().slice(-6).toUpperCase();
      const taskIdStr = `TSK-${orderIdStr}`;

      const existing = await Task.findOne({
        $or: [{ leadId: lead._id }, { taskId: taskIdStr }],
      });

      if (!existing) {
        const latestComment =
          Array.isArray(lead.approvalComments) && lead.approvalComments.length > 0
            ? lead.approvalComments[lead.approvalComments.length - 1]
            : null;

        const author = latestComment?.author || "Marcus Vance";
        const role = latestComment?.role || "Production Lead";
        const comment = latestComment?.comment || "Approved";
        const department = getDepartmentFromApprover(author, role);

        await Task.create({
          taskId: taskIdStr,
          leadId: lead._id,
          orderId: orderIdStr,
          title: `Order #${orderIdStr} - ${lead.companyName || lead.clientName || "Approved Order"}`,
          companyName: lead.companyName || "",
          clientName: lead.clientName || "",
          assignedTo: author,
          department,
          priority: getPriorityFromLead(lead.urgency),
          status: "open",
          dueDate: lead.deliveryDate || lead.scheduleDate || "Within 7 Days",
          totalQuantity: lead.totalQuantity || 0,
          orderStage: lead.orderStage || "sample",
          subStage: lead.subStage || "",
          approvedBy: {
            name: author,
            role,
            comment,
            approvedAt: latestComment?.createdAt || new Date(),
          },
        });
      }
    }
  } catch (err) {
    console.error("Error in syncApprovedLeadsToTasks:", err.message);
  }
}

// GET /api/tasks - List all tasks with optional filters
router.get("/", async (req, res) => {
  try {
    // Run background sync for any approved leads
    await syncApprovedLeadsToTasks();

    const { status, department, search } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status.toLowerCase();
    }

    if (department && department !== "all") {
      filter.department = new RegExp(department, "i");
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { taskId: new RegExp(term, "i") },
        { orderId: new RegExp(term, "i") },
        { title: new RegExp(term, "i") },
        { companyName: new RegExp(term, "i") },
        { clientName: new RegExp(term, "i") },
        { assignedTo: new RegExp(term, "i") },
      ];
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    // Also calculate count by status
    const allTasks = await Task.find({});
    const counts = {
      all: allTasks.length,
      open: allTasks.filter((t) => t.status === "open").length,
      "work-in-progress": allTasks.filter((t) => t.status === "work-in-progress").length,
      "on-hold": allTasks.filter((t) => t.status === "on-hold").length,
      resolved: allTasks.filter((t) => t.status === "resolved").length,
      closed: allTasks.filter((t) => t.status === "closed").length,
    };

    res.json({
      success: true,
      count: tasks.length,
      counts,
      data: tasks,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tasks/sync - Manually trigger sync
router.post("/sync", async (req, res) => {
  try {
    await syncApprovedLeadsToTasks();
    const tasks = await Task.find({}).sort({ createdAt: -1 });
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tasks/:id - Single task
router.get("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/tasks/:id - Update task (e.g. status transition)
router.patch("/:id", async (req, res) => {
  try {
    const { status, assignedTo, priority, notes } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (status) task.status = status.toLowerCase();
    if (assignedTo) task.assignedTo = assignedTo;
    if (priority) task.priority = priority;
    if (notes !== undefined) task.notes = notes;

    await task.save();
    res.json({ success: true, message: "Task updated successfully", data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
