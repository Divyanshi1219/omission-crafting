import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckSquare,
  Search,
  Filter,
  Clock,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  PauseCircle,
  Inbox,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  Eye,
  X,
  Building,
  Calendar,
  Layers,
  User,
  Check,
  ChevronDown,
  Sparkles,
  Tag
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import "./TasksPage.css";

const STATUS_CONFIG = {
  all: {
    label: "ALL",
    title: "All Tasks",
    subtitle: "Complete operational workflow of approved leads and factory tasks.",
    icon: CheckSquare,
    badgeColor: "#64748b",
    badgeBg: "#f1f5f9",
  },
  open: {
    label: "Open",
    title: "Open Tasks",
    subtitle: "Newly approved leads awaiting floor execution and scheduling.",
    icon: AlertCircle,
    badgeColor: "#2563eb",
    badgeBg: "#eff6ff",
  },
  "work-in-progress": {
    label: "Work in Progress",
    title: "Work In Progress Tasks",
    subtitle: "Tasks currently being executed on the floor or in stock.",
    icon: Hourglass,
    badgeColor: "#d97706",
    badgeBg: "#fffbeb",
  },
  "on-hold": {
    label: "On Hold",
    title: "On Hold Tasks",
    subtitle: "Tasks temporarily paused pending raw materials or customer review.",
    icon: PauseCircle,
    badgeColor: "#ea580c",
    badgeBg: "#fff7ed",
  },
  resolved: {
    label: "Resolved",
    title: "Resolved Tasks",
    subtitle: "Tasks finished and verified by production or stock lead.",
    icon: CheckCircle2,
    badgeColor: "#059669",
    badgeBg: "#ecfdf5",
  },
  closed: {
    label: "Closed",
    title: "Closed Tasks",
    subtitle: "Archived and fully cleared operational tasks.",
    icon: Clock,
    badgeColor: "#475569",
    badgeBg: "#f8fafc",
  },
};

const SUB_MENUS = [
  { key: "all", label: "ALL" },
  { key: "open", label: "Open" },
  { key: "work-in-progress", label: "Work in progress" },
  { key: "on-hold", label: "On hold" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
];

function TasksPage() {
  const { status = "all" } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    open: 0,
    "work-in-progress": 0,
    "on-hold": 0,
    resolved: 0,
    closed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // newest | priority | dueDate
  const [selectedTask, setSelectedTask] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const currentConfig = STATUS_CONFIG[status.toLowerCase()] || STATUS_CONFIG.all;
  const StatusIcon = currentConfig.icon;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/tasks");
      if (res.data?.success) {
        setTasks(res.data.data || []);
        if (res.data.counts) {
          setCounts(res.data.counts);
        }
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Handle status update for a task
  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      setUpdatingTaskId(taskId);
      const res = await api.patch(`/api/tasks/${taskId}`, { status: newStatus });
      if (res.data?.success) {
        const updated = res.data.data;
        setTasks((prev) => prev.map((t) => (t._id === taskId ? updated : t)));
        // Also update selectedTask if modal open
        if (selectedTask && selectedTask._id === taskId) {
          setSelectedTask(updated);
        }
        showToast(`Task status updated to "${newStatus.replace("-", " ")}"`);
        // Refresh counts
        const refreshRes = await api.get("/api/tasks");
        if (refreshRes.data?.counts) {
          setCounts(refreshRes.data.counts);
        }
      }
    } catch (err) {
      console.error("Error updating status:", err);
      showToast("Failed to update task status");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        // Status filter
        const currentTab = status.toLowerCase();
        if (currentTab !== "all" && task.status !== currentTab) {
          return false;
        }

        // Department filter
        if (departmentFilter !== "all") {
          if (
            !task.department ||
            !task.department.toLowerCase().includes(departmentFilter.toLowerCase())
          ) {
            return false;
          }
        }

        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTaskId = task.taskId?.toLowerCase().includes(q);
          const matchOrderId = task.orderId?.toLowerCase().includes(q);
          const matchTitle = task.title?.toLowerCase().includes(q);
          const matchCompany = task.companyName?.toLowerCase().includes(q);
          const matchClient = task.clientName?.toLowerCase().includes(q);
          const matchAssignee = task.assignedTo?.toLowerCase().includes(q);
          if (
            !matchTaskId &&
            !matchOrderId &&
            !matchTitle &&
            !matchCompany &&
            !matchClient &&
            !matchAssignee
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "priority") {
          const priorityOrder = { High: 3, Medium: 2, Normal: 1, Low: 0 };
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        }
        if (sortBy === "dueDate") {
          return (a.dueDate || "").localeCompare(b.dueDate || "");
        }
        // Default: newest
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [tasks, status, departmentFilter, searchTerm, sortBy]);

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "High":
        return { color: "#991b1b", bg: "#fef2f2", border: "#fecaca" };
      case "Medium":
        return { color: "#92400e", bg: "#fffbeb", border: "#fde68a" };
      default:
        return { color: "#334155", bg: "#f1f5f9", border: "#cbd5e1" };
    }
  };

  const getDepartmentStyle = (dept = "") => {
    return { color: "#334155", bg: "#f1f5f9", border: "#cbd5e1" };
  };

  return (
    <div className="tasks-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="tasks-toast-banner">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="tasks-header-row">
        <div>
          <div className="tasks-breadcrumb">
            <span>Workflow Operations</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-link" onClick={() => navigate("/tasks/all")}>
              Task
            </span>
            <span className="crumb-sep">/</span>
            <span className="crumb-active">{currentConfig.label}</span>
          </div>
          <div className="tasks-title-wrap">
            <h1 className="tasks-page-title">{currentConfig.title}</h1>
            <span
              className="tasks-status-pill"
              style={{
                color: currentConfig.badgeColor,
                backgroundColor: currentConfig.badgeBg,
              }}
            >
              <StatusIcon size={13} />
              <span>{currentConfig.label}</span>
            </span>
          </div>
          <p className="tasks-page-subtitle">{currentConfig.subtitle}</p>
        </div>

        {/* Assigned Profile Badge & Quick Refresh */}
        <div className="tasks-header-actions">
          <button
            className="tasks-refresh-btn"
            onClick={fetchTasks}
            disabled={loading}
            title="Refresh tasks"
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Sync</span>
          </button>
          <div className="tasks-current-user-badge">
            <div
              className="user-dot"
              style={{ backgroundColor: currentUser?.avatarColor || "#2563eb" }}
            ></div>
            <span>
              {currentUser?.name} ({currentUser?.role})
            </span>
          </div>
        </div>
      </div>

      {/* Quick Category Filter Pills with Live Counts */}
      <div className="tasks-category-pills">
        {SUB_MENUS.map((menu) => {
          const isActive = status.toLowerCase() === menu.key;
          const count = counts[menu.key] || 0;
          return (
            <button
              key={menu.key}
              className={`task-tab-pill ${isActive ? "active" : ""}`}
              onClick={() => navigate(`/tasks/${menu.key}`)}
            >
              <span>{menu.label}</span>
              <span className={`task-tab-badge ${isActive ? "active" : ""}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Table Container */}
      <div className="tasks-card-container">
        {/* Controls Bar */}
        <div className="tasks-controls-bar">
          <div className="tasks-search-input">
            <Search size={16} />
            <input
              type="text"
              placeholder={`Search in ${currentConfig.label} tasks (Order ID, Company, Assignee)...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="tasks-controls-actions">
            {/* Department Filter */}
            <div className="tasks-filter-select-wrap">
              <Filter size={14} />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="tasks-select-control"
              >
                <option value="all">All Departments</option>
                <option value="Production">Production</option>
                <option value="Stock Room">Stock Room</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="tasks-filter-select-wrap">
              <ArrowUpDown size={14} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="tasks-select-control"
              >
                <option value="newest">Sort: Newest</option>
                <option value="priority">Sort: High Priority</option>
                <option value="dueDate">Sort: Due Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="tasks-table-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th style={{ width: "130px" }}>ORDER ID</th>
                <th>TASK TITLE & ORDER</th>
                <th>ASSIGNED TO</th>
                <th>DEPARTMENT</th>
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th>DUE DATE</th>
                <th style={{ textAlign: "center", width: "110px" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const priorityStyle = getPriorityStyle(task.priority);
                const deptStyle = getDepartmentStyle(task.department);
                const statusStyle = STATUS_CONFIG[task.status] || STATUS_CONFIG.open;

                return (
                  <tr key={task._id} className="task-table-row">
                    {/* Task ID */}
                    <td>
                      <div
                        className="task-id-badge"
                        onClick={() => setSelectedTask(task)}
                        title="Click to view task details"
                      >
                        <Tag size={12} />
                        <span>{task.orderId ? task.orderId : task.taskId}</span>
                      </div>
                    </td>

                    {/* Task Title & Order Details */}
                    <td>
                      <div className="task-title-cell">
                        <span
                          className="task-main-title"
                          onClick={() => setSelectedTask(task)}
                        >
                          {task.title || `Order #${task.orderId}`}
                        </span>
                        <div className="task-sub-meta">
                          {task.companyName && (
                            <span className="task-company-tag">
                              <Building size={11} />
                              {task.companyName}
                            </span>
                          )}
                          {task.totalQuantity > 0 && (
                            <span className="task-qty-tag">
                              <Layers size={11} />
                              {task.totalQuantity} pcs
                            </span>
                          )}
                          {task.orderStage && (
                            <span className="task-stage-tag">{task.orderStage}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Assigned To */}
                    <td>
                      <div className="task-assignee-cell">
                        <div className="task-avatar-circle">
                          {(task.assignedTo || "MV")
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <span className="task-assignee-name">
                          {task.assignedTo || "Unassigned"}
                        </span>
                      </div>
                    </td>

                    {/* Department */}
                    <td>
                      <span
                        className="task-dept-badge"
                        style={{
                          color: deptStyle.color,
                          backgroundColor: deptStyle.bg,
                          borderColor: deptStyle.border,
                        }}
                      >
                        {task.department || "Production"}
                      </span>
                    </td>

                    {/* Priority */}
                    <td>
                      <span
                        className="task-priority-badge"
                        style={{
                          color: priorityStyle.color,
                          backgroundColor: priorityStyle.bg,
                          borderColor: priorityStyle.border,
                        }}
                      >
                        <span
                          className="priority-dot"
                          style={{ backgroundColor: priorityStyle.color }}
                        ></span>
                        {task.priority || "Normal"}
                      </span>
                    </td>

                    {/* Status Dropdown */}
                    <td>
                      <div className="task-status-selector-wrap">
                        <select
                          className="task-status-dropdown"
                          value={task.status}
                          disabled={updatingTaskId === task._id}
                          onChange={(e) =>
                            handleUpdateStatus(task._id, e.target.value)
                          }
                          style={{
                            color: statusStyle.badgeColor,
                            backgroundColor: statusStyle.badgeBg,
                            borderColor: statusStyle.badgeColor + "40",
                          }}
                        >
                          <option value="open">Open</option>
                          <option value="work-in-progress">Work in progress</option>
                          <option value="on-hold">On hold</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                        <ChevronDown size={12} className="status-dropdown-chevron" />
                      </div>
                    </td>

                    {/* Due Date */}
                    <td>
                      <div className="task-due-date-cell">
                        <Calendar size={12} />
                        <span>{task.dueDate || "Standard"}</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="task-action-view-btn"
                        onClick={() => setSelectedTask(task)}
                        title="View Full Task & Order Details"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty State when no tasks match */}
          {filteredTasks.length === 0 && !loading && (
            <div className="tasks-empty-state-box">
              <div className="tasks-empty-icon-circle">
                <Inbox size={38} />
              </div>
              <h3 className="tasks-empty-title">No Tasks Found</h3>
              <p className="tasks-empty-desc">
                {searchTerm || departmentFilter !== "all"
                  ? "No tasks match your current search or department filter."
                  : `There are currently no tasks listed under "${currentConfig.label}". When an order is approved by Production or Stock Room managers, it automatically reflects here.`}
              </p>
              {currentConfig.label !== "ALL" && (
                <button
                  className="tasks-empty-action-btn"
                  onClick={() => navigate("/tasks/all")}
                >
                  View All Tasks ({counts.all})
                </button>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="tasks-loading-box">
              <RefreshCw size={24} className="spin" />
              <span>Loading workflow tasks...</span>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="task-modal-overlay" onClick={() => setSelectedTask(null)}>
          <div
            className="task-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="task-modal-header">
              <div className="modal-title-left">
                <div className="modal-task-badge">
                  <Tag size={13} />
                  <span>{selectedTask.taskId}</span>
                </div>
                <h2 className="modal-heading">
                  {selectedTask.title || `Order #${selectedTask.orderId}`}
                </h2>
              </div>
              <button
                className="task-modal-close-btn"
                onClick={() => setSelectedTask(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="task-modal-body">
              {/* Order Info Grid */}
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <span className="modal-info-label">Order ID</span>
                  <span className="modal-info-value highlight">
                    {selectedTask.orderId || "N/A"}
                  </span>
                </div>

                <div className="modal-info-item">
                  <span className="modal-info-label">Company Name</span>
                  <span className="modal-info-value">
                    {selectedTask.companyName || "N/A"}
                  </span>
                </div>

                <div className="modal-info-item">
                  <span className="modal-info-label">Client Name</span>
                  <span className="modal-info-value">
                    {selectedTask.clientName || "N/A"}
                  </span>
                </div>

                <div className="modal-info-item">
                  <span className="modal-info-label">Department</span>
                  <span className="modal-info-value">
                    <span
                      className="task-dept-badge"
                      style={getDepartmentStyle(selectedTask.department)}
                    >
                      {selectedTask.department}
                    </span>
                  </span>
                </div>

                <div className="modal-info-item">
                  <span className="modal-info-label">Assigned Manager</span>
                  <span className="modal-info-value">
                    {selectedTask.assignedTo || "Marcus Vance"}
                  </span>
                </div>

                <div className="modal-info-item">
                  <span className="modal-info-label">Priority</span>
                  <span className="modal-info-value">
                    <span
                      className="task-priority-badge"
                      style={getPriorityStyle(selectedTask.priority)}
                    >
                      {selectedTask.priority}
                    </span>
                  </span>
                </div>

                <div className="modal-info-item">
                  <span className="modal-info-label">Stage & Quantity</span>
                  <span className="modal-info-value">
                    {selectedTask.orderStage} ({selectedTask.totalQuantity} pcs)
                  </span>
                </div>

                <div className="modal-info-item">
                  <span className="modal-info-label">Due Date</span>
                  <span className="modal-info-value">
                    {selectedTask.dueDate || "Within 7 Days"}
                  </span>
                </div>
              </div>

              {/* Approval Details Box */}
              {selectedTask.approvedBy && (
                <div className="modal-approval-box">
                  <div className="modal-approval-header">
                    <CheckCircle2 size={16} color="#059669" />
                    <strong>Approval Verification</strong>
                  </div>
                  <p className="modal-approval-text">
                    Approved by{" "}
                    <strong>{selectedTask.approvedBy.name || "Manager"}</strong>
                    {selectedTask.approvedBy.role
                      ? ` (${selectedTask.approvedBy.role})`
                      : ""}{" "}
                    on{" "}
                    {new Date(
                      selectedTask.approvedBy.approvedAt || selectedTask.createdAt
                    ).toLocaleDateString()}
                    .
                  </p>
                  {selectedTask.approvedBy.comment && (
                    <div className="modal-comment-quote">
                      "{selectedTask.approvedBy.comment}"
                    </div>
                  )}
                </div>
              )}

              {/* Status Update Control Inside Modal */}
              <div className="modal-status-update-row">
                <span className="modal-status-label">Update Task Workflow Status:</span>
                <div className="modal-status-buttons">
                  {["open", "work-in-progress", "on-hold", "resolved", "closed"].map(
                    (st) => {
                      const cfg = STATUS_CONFIG[st];
                      const isCurrent = selectedTask.status === st;
                      return (
                        <button
                          key={st}
                          className={`modal-st-btn ${isCurrent ? "active" : ""}`}
                          onClick={() => handleUpdateStatus(selectedTask._id, st)}
                          style={
                            isCurrent
                              ? {
                                backgroundColor: cfg.badgeBg,
                                color: cfg.badgeColor,
                                borderColor: cfg.badgeColor,
                              }
                              : {}
                          }
                        >
                          {isCurrent && <Check size={13} />}
                          <span>{cfg.label}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="task-modal-footer">
              <button
                className="modal-secondary-btn"
                onClick={() => setSelectedTask(null)}
              >
                Close
              </button>
              {selectedTask.leadId && (
                <button
                  className="modal-primary-btn"
                  onClick={() => {
                    navigate(`/approvals?id=${selectedTask.leadId}`);
                    setSelectedTask(null);
                  }}
                >
                  <ExternalLink size={14} />
                  <span>View Original Lead Review</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TasksPage;
