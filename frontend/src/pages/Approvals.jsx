import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  CheckCircle,
  RotateCcw,
  ArrowLeft,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  MessageSquare,
  Building,
  User,
  Phone,
  Calendar,
  Layers,
  DollarSign,
  Package,
  FileText,
  Send,
  Sparkles,
  Cpu,
  Boxes,
  ShieldCheck,
  Tag,
  SlidersHorizontal,
  Check,
  Paperclip
} from "lucide-react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import "./Approvals.css";

export default function Approvals() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Role identity detection
  const isStockProfile =
    currentUser?.id === "stock" ||
    Boolean(currentUser?.role && currentUser.role.toLowerCase().includes("stock"));
  const isProdProfile =
    currentUser?.id === "production" ||
    Boolean(currentUser?.role && currentUser.role.toLowerCase().includes("production"));
  const isAdminProfile = currentUser?.id === "admin" || (!isStockProfile && !isProdProfile);

  // Active Role View perspective: "stock" (Case 1) | "production" (Case 2) | "all" (Admin Master)
  const [roleView, setRoleView] = useState(() => {
    if (isProdProfile) return "production";
    if (isStockProfile) return "stock";
    return "stock"; // Default view
  });

  // Sync role view when user switches profile
  useEffect(() => {
    if (isProdProfile) {
      setRoleView("production");
    } else if (isStockProfile) {
      setRoleView("stock");
    }
  }, [currentUser?.id, isProdProfile, isStockProfile]);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [managerComment, setManagerComment] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusTab, setStatusTab] = useState("all"); // 'all' | 'pending' | 'referred-back' | 'approved'
  const [toast, setToast] = useState(null);

  const selectedIdFromUrl = searchParams.get("id");

  // Show Toast Helper
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Helper date formatter
  const formatLeadDate = (dateVal) => {
    if (!dateVal) return "Recent";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (_) {
      return String(dateVal);
    }
  };

  // Fetch all orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/leads?query=order");
      if (res.data && res.data.data) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching approval orders:", err);
      showToast("Failed to load approval orders", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Fetch single order when selectedIdFromUrl changes
  useEffect(() => {
    if (selectedIdFromUrl) {
      api
        .get(`/api/leads/${selectedIdFromUrl}`)
        .then((res) => {
          if (res.data?.data) {
            setSelectedOrder(res.data.data);
          }
        })
        .catch((err) => {
          console.error("Error fetching selected order:", err);
        });
    } else {
      setSelectedOrder(null);
    }
  }, [selectedIdFromUrl]);

  // Select an order to review
  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);
    setManagerComment("");
    setSearchParams({ id: order._id || order.id });
    try {
      const res = await api.get(`/api/leads/${order._id || order.id}`);
      if (res.data?.data) {
        setSelectedOrder(res.data.data);
      }
    } catch (_) {}
  };

  // Return to list view
  const handleBackToList = () => {
    setSelectedOrder(null);
    setManagerComment("");
    setSearchParams({});
    fetchOrders();
  };

  // Handle Approve or Refer Back Action
  const handleApprovalAction = async (status) => {
    if (!selectedOrder) return;

    if (status === "Referred Back" && !managerComment.trim()) {
      alert(
        "Please provide correction notes in the comment box so the sales team knows what needs to be changed."
      );
      return;
    }

    setSubmittingAction(true);
    try {
      const orderId = selectedOrder._id || selectedOrder.id;
      const authorName =
        currentUser?.name ||
        (roleView === "stock"
          ? "Elena Rostova"
          : roleView === "production"
          ? "Marcus Vance"
          : "Manager");
      const authorRole =
        currentUser?.role ||
        (roleView === "stock"
          ? "Stock Room Manager"
          : roleView === "production"
          ? "Production Lead"
          : "Manager");

      const payload = {
        status,
        department: roleView === "stock" ? "stock" : roleView === "production" ? "production" : "admin",
        comment:
          managerComment.trim() ||
          (status === "Approved"
            ? `Approved by ${authorRole}`
            : `Referred back for corrections by ${authorRole}`),
        author: authorName,
        role: authorRole,
      };

      const res = await api.patch(`/api/leads/${orderId}/approval`, payload);
      if (res.data && res.data.success) {
        const updatedLead = res.data.data;
        setSelectedOrder(updatedLead);
        setManagerComment("");
        showToast(
          status === "Approved"
            ? `Order #${updatedLead.orderId || "Order"} has been Approved! Task created in Task -> ALL.`
            : `Order #${updatedLead.orderId || "Order"} has been Referred Back to sales.`,
          status === "Approved" ? "success" : "info"
        );
        fetchOrders();
      }
    } catch (err) {
      console.error("Error submitting approval action:", err);
      showToast(err.response?.data?.message || "Failed to update order status", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const currentStatus = (order.approvalStatus || "Pending").toLowerCase();
      // Tab filter
      if (statusTab === "pending" && currentStatus !== "pending") return false;
      if (statusTab === "referred-back" && currentStatus !== "referred back") return false;
      if (statusTab === "approved" && currentStatus !== "approved") return false;

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const orderId = (order.orderId || "").toLowerCase();
        const client = (order.clientName || "").toLowerCase();
        const company = (order.companyName || "").toLowerCase();
        const employee = (order.employeeName || "").toLowerCase();
        const logoName = (order.logoName || "").toLowerCase();
        const itemsMatch = Array.isArray(order.items)
          ? order.items.some(
              (it) =>
                (it.item || "").toLowerCase().includes(term) ||
                (it.fabric || "").toLowerCase().includes(term) ||
                (it.printingType || "").toLowerCase().includes(term)
            )
          : false;

        return (
          orderId.includes(term) ||
          employee.includes(term) ||
          logoName.includes(term) ||
          client.includes(term) ||
          company.includes(term) ||
          itemsMatch
        );
      }
      return true;
    });
  }, [orders, statusTab, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    let pending = 0;
    let referredBack = 0;
    let approved = 0;
    orders.forEach((o) => {
      const st = (o.approvalStatus || "Pending").toLowerCase();
      if (st === "pending") pending++;
      else if (st === "referred back") referredBack++;
      else if (st === "approved") approved++;
    });
    return { total: orders.length, pending, referredBack, approved };
  }, [orders]);

  const currentApprovalStatus = selectedOrder?.approvalStatus || "Pending";

  return (
    <div className="approvals-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`approvals-toast ${toast.type}`}>
          {toast.type === "success" && <CheckCircle size={18} />}
          {toast.type === "info" && <RotateCcw size={18} />}
          {toast.type === "error" && <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* VIEW MODE 1: LIST VIEW */}
      {!selectedOrder ? (
        <div className="approvals-container">
          {/* Header */}
          <div className="approvals-header">
            <div className="approvals-header-top">
              <div>
                <div className="approvals-title-badge">
                  <ClipboardCheck size={18} className="title-icon" />
                  <span>Approval Center</span>
                </div>
                <h1 className="approvals-title">Order Approvals</h1>
                <p className="approvals-subtitle">
                  Incoming leads awaiting review and verification before entering the production queue.
                </p>
              </div>

              {/* Perspective Selector for Stock Room vs Production Room vs Admin */}
              <div className="role-perspective-card">
                <span className="perspective-hint">
                  <SlidersHorizontal size={14} /> Active Role View:
                </span>
                <div className="role-perspective-pills">
                  <button
                    type="button"
                    className={`role-pill-btn stock ${roleView === "stock" ? "active" : ""}`}
                    onClick={() => setRoleView("stock")}
                    title="Case 1: Stock Room Manager View"
                  >
                    <Boxes size={15} />
                    <span>Stock Room Manager</span>
                    {roleView === "stock" && <Check size={13} className="pill-check" />}
                  </button>

                  <button
                    type="button"
                    className={`role-pill-btn production ${
                      roleView === "production" ? "active" : ""
                    }`}
                    onClick={() => setRoleView("production")}
                    title="Case 2: Production Room Manager View"
                  >
                    <Cpu size={15} />
                    <span>Production Room Manager</span>
                    {roleView === "production" && <Check size={13} className="pill-check" />}
                  </button>

                  {isAdminProfile && (
                    <button
                      type="button"
                      className={`role-pill-btn admin ${roleView === "all" ? "active" : ""}`}
                      onClick={() => setRoleView("all")}
                      title="Admin Master View (All Fields)"
                    >
                      <Layers size={15} />
                      <span>Master View</span>
                      {roleView === "all" && <Check size={13} className="pill-check" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Role Context Notification Bar */}
            <div className={`role-context-banner ${roleView}`}>
              {roleView === "stock" && (
                <>
                  <Boxes size={18} className="banner-role-icon stock" />
                  <div className="banner-role-text">
                    <strong>Case 1: Stock Room Manager Table & Approval View.</strong> Displaying
                    Order ID, Employee Name, Lead Creation Date, and Apparel Items in Order.
                  </div>
                </>
              )}
              {roleView === "production" && (
                <>
                  <Cpu size={18} className="banner-role-icon production" />
                  <div className="banner-role-text">
                    <strong>Case 2: Production Room Manager Table & Approval View.</strong>{" "}
                    Displaying Employee Name, Lead Creation Date, Order ID, and Logo Name.
                  </div>
                </>
              )}
              {roleView === "all" && (
                <>
                  <ShieldCheck size={18} className="banner-role-icon admin" />
                  <div className="banner-role-text">
                    <strong>Admin Master View:</strong> Displaying all order fields, financials, and
                    operational specifications.
                  </div>
                </>
              )}
            </div>
          </div>

          {/* KPI Stat Cards */}
          <div className="approvals-stats-grid">
            <div
              className={`stat-card ${statusTab === "all" ? "active" : ""}`}
              onClick={() => setStatusTab("all")}
            >
              <div className="stat-icon-wrapper total">
                <Layers size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Orders</span>
                <span className="stat-value">{stats.total}</span>
              </div>
            </div>

            <div
              className={`stat-card pending ${statusTab === "pending" ? "active" : ""}`}
              onClick={() => setStatusTab("pending")}
            >
              <div className="stat-icon-wrapper pending">
                <Clock size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Pending Approval</span>
                <span className="stat-value">{stats.pending}</span>
              </div>
            </div>

            <div
              className={`stat-card referred ${statusTab === "referred-back" ? "active" : ""}`}
              onClick={() => setStatusTab("referred-back")}
            >
              <div className="stat-icon-wrapper referred">
                <RotateCcw size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Referred Back</span>
                <span className="stat-value">{stats.referredBack}</span>
              </div>
            </div>

            <div
              className={`stat-card approved ${statusTab === "approved" ? "active" : ""}`}
              onClick={() => setStatusTab("approved")}
            >
              <div className="stat-icon-wrapper approved">
                <CheckCircle2 size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Approved Orders</span>
                <span className="stat-value">{stats.approved}</span>
              </div>
            </div>
          </div>

          {/* Toolbar: Search and Filter Tabs */}
          <div className="approvals-toolbar">
            <div className="filter-tabs">
              <button
                className={`tab-btn ${statusTab === "all" ? "active" : ""}`}
                onClick={() => setStatusTab("all")}
              >
                All Orders ({stats.total})
              </button>
              <button
                className={`tab-btn ${statusTab === "pending" ? "active" : ""}`}
                onClick={() => setStatusTab("pending")}
              >
                Pending ({stats.pending})
              </button>
              <button
                className={`tab-btn ${statusTab === "referred-back" ? "active" : ""}`}
                onClick={() => setStatusTab("referred-back")}
              >
                Referred Back ({stats.referredBack})
              </button>
              <button
                className={`tab-btn ${statusTab === "approved" ? "active" : ""}`}
                onClick={() => setStatusTab("approved")}
              >
                Approved ({stats.approved})
              </button>
            </div>

            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder={
                  roleView === "stock"
                    ? "Search Order ID, employee, item..."
                    : roleView === "production"
                    ? "Search Order ID, employee, logo..."
                    : "Search order ID, client, company..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="table-card">
            {loading ? (
              <div className="empty-state">
                <Clock size={36} className="spinning" />
                <p>Loading approval orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="empty-state">
                <ClipboardCheck size={48} color="#94a3b8" />
                <h3>No Orders Found</h3>
                <p>There are no orders matching the selected filter criteria.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="approvals-table">
                  <thead>
                    {/* CASE 1: STOCK ROOM MANAGER TABLE HEADERS */}
                    {roleView === "stock" && (
                      <tr>
                        <th>Order ID</th>
                        <th>Employee Name</th>
                        <th>Date Created</th>
                        <th>Items in Lead</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Action</th>
                      </tr>
                    )}

                    {/* CASE 2: PRODUCTION ROOM MANAGER TABLE HEADERS */}
                    {roleView === "production" && (
                      <tr>
                        <th>Order ID</th>
                        <th>Employee Name</th>
                        <th>Date Created</th>
                        <th>Logo Name</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Action</th>
                      </tr>
                    )}

                    {/* MASTER ADMIN TABLE HEADERS */}
                    {roleView === "all" && (
                      <tr>
                        <th>Order ID</th>
                        <th>Client / Company</th>
                        <th>Sales Rep</th>
                        <th>Stage</th>
                        <th>Quantity</th>
                        <th>Net Amount</th>
                        <th>Date Created</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Action</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const st = order.approvalStatus || "Pending";
                      const dateStr = formatLeadDate(order.createdAt);
                      const itemsList = Array.isArray(order.items) ? order.items : [];
                      const totalItemsCount = itemsList.length;

                      /* CASE 1: STOCK ROOM ROW */
                      if (roleView === "stock") {
                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                          >
                            <td>
                              <span className="order-id-badge stock-theme">
                                {order.orderId || "Pending ID"}
                              </span>
                            </td>
                            <td>
                              <div className="user-cell">
                                <span className="rep-name bold">
                                  {order.employeeName || "Divyanshi"}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="date-value">{dateStr}</span>
                            </td>
                            <td>
                              <div className="items-summary-cell">
                                <span className="items-count-pill">
                                  <Package size={13} /> {totalItemsCount} Item
                                  {totalItemsCount !== 1 ? "s" : ""}
                                </span>
                                {totalItemsCount > 0 && (
                                  <span className="items-preview-text">
                                    {itemsList[0]?.item ||
                                      itemsList[0]?.enterItem ||
                                      itemsList[0]?.itemType ||
                                      "Apparel"}
                                    {totalItemsCount > 1 && ` (+${totalItemsCount - 1} more)`}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`status-pill ${
                                  st === "Approved"
                                    ? "approved"
                                    : st === "Referred Back"
                                    ? "referred"
                                    : "pending"
                                }`}
                              >
                                <span className="status-dot"></span>
                                {st}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                className="review-btn stock"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectOrder(order);
                                }}
                              >
                                <Eye size={15} />
                                Review
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      /* CASE 2: PRODUCTION ROOM ROW */
                      if (roleView === "production") {
                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                          >
                            <td>
                              <span className="order-id-badge prod-theme">
                                {order.orderId || "Pending ID"}
                              </span>
                            </td>
                            <td>
                              <div className="user-cell">
                                <span className="rep-name bold">
                                  {order.employeeName || "Divyanshi"}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="date-value">{dateStr}</span>
                            </td>
                            <td>
                              <span
                                className={`logo-tag ${
                                  order.logoName ? "has-logo" : "no-logo"
                                }`}
                              >
                                <Tag size={13} />
                                {order.logoName || "Plain / No Logo"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`status-pill ${
                                  st === "Approved"
                                    ? "approved"
                                    : st === "Referred Back"
                                    ? "referred"
                                    : "pending"
                                }`}
                              >
                                <span className="status-dot"></span>
                                {st}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                className="review-btn production"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectOrder(order);
                                }}
                              >
                                <Eye size={15} />
                                Review
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      /* CASE 3: ALL FIELDS MASTER ROW */
                      return (
                        <tr
                          key={order._id || order.id}
                          onClick={() => handleSelectOrder(order)}
                        >
                          <td>
                            <span className="order-id-badge">
                              {order.orderId || "Pending ID"}
                            </span>
                          </td>
                          <td>
                            <div className="client-cell">
                              <span className="client-name">
                                {order.clientName || "Unnamed Client"}
                              </span>
                              <span className="company-sub">
                                {order.companyName || "No Company"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="rep-name">
                              {order.employeeName || "Divyanshi"}
                            </span>
                          </td>
                          <td>
                            <div className="stage-cell">
                              <span className="stage-tag">{order.orderStage || "Sample"}</span>
                              {order.subStage && (
                                <span className="substage-tag">{order.subStage}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="qty-value">{order.totalQuantity || 0} pcs</span>
                          </td>
                          <td>
                            <span className="amount-value">
                              ₹
                              {order.netAmount
                                ? Number(order.netAmount).toLocaleString()
                                : order.totalAmount || 0}
                            </span>
                          </td>
                          <td>
                            <span className="date-value">{dateStr}</span>
                          </td>
                          <td>
                            <span
                              className={`status-pill ${
                                st === "Approved"
                                  ? "approved"
                                  : st === "Referred Back"
                                  ? "referred"
                                  : "pending"
                              }`}
                            >
                              <span className="status-dot"></span>
                              {st}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="review-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectOrder(order);
                              }}
                            >
                              <Eye size={15} />
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: ROLE-SPECIFIC REVIEW & APPROVAL FORM */
        <div className="approvals-container">
          {/* Top Navigation & Action Header */}
          <div className="review-top-bar">
            <button type="button" onClick={handleBackToList} className="back-link-btn">
              <ArrowLeft size={18} />
              <span>Back to Approvals</span>
            </button>

            <div className="review-header-content">
              <div className="review-title-group">
                <span className="review-order-number">
                  {selectedOrder.orderId || "Order Review"}
                </span>
                <span
                  className={`status-pill ${
                    currentApprovalStatus === "Approved"
                      ? "approved"
                      : currentApprovalStatus === "Referred Back"
                      ? "referred"
                      : "pending"
                  }`}
                >
                  <span className="status-dot"></span>
                  {currentApprovalStatus}
                </span>

                {/* Role View Indicator */}
                <div className="detail-role-toggle">
                  <span className="detail-role-label">Viewing As:</span>
                  <div className="role-perspective-pills mini">
                    <button
                      type="button"
                      className={`role-pill-btn stock ${roleView === "stock" ? "active" : ""}`}
                      onClick={() => setRoleView("stock")}
                    >
                      <Boxes size={13} />
                      <span>Stock Room</span>
                    </button>
                    <button
                      type="button"
                      className={`role-pill-btn production ${
                        roleView === "production" ? "active" : ""
                      }`}
                      onClick={() => setRoleView("production")}
                    >
                      <Cpu size={13} />
                      <span>Production Room</span>
                    </button>
                    {isAdminProfile && (
                      <button
                        type="button"
                        className={`role-pill-btn admin ${roleView === "all" ? "active" : ""}`}
                        onClick={() => setRoleView("all")}
                      >
                        <Layers size={13} />
                        <span>All</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS ON TOP */}
              <div className="review-action-buttons">
                <button
                  type="button"
                  className="btn-refer-back"
                  onClick={() => handleApprovalAction("Referred Back")}
                  disabled={submittingAction}
                >
                  <RotateCcw size={16} />
                  <span>{submittingAction ? "Processing..." : "Refer Back"}</span>
                </button>

                <button
                  type="button"
                  className="btn-approve"
                  onClick={() => handleApprovalAction("Approved")}
                  disabled={submittingAction}
                >
                  <CheckCircle size={16} />
                  <span>{submittingAction ? "Processing..." : "Approve"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CASE 1: STOCK ROOM MANAGER VIEW
              Fields:
              - Order ID
              - Employee Name
              - Date when the lead was created
              - All the items that are in the "Add Item" field in the create lead form
              - Refer Back and Approve buttons
             ========================================================================= */}
          {roleView === "stock" && (
            <div className="review-form-wrapper">
              {/* Informational Role Banner */}
              <div className="read-only-banner stock-banner">
                <Boxes size={20} className="banner-icon stock" />
                <div>
                  <strong>Case 1: Stock Room Manager Approval View:</strong> Verify the{" "}
                  <strong>Order ID</strong>, <strong>Employee Name</strong>,{" "}
                  <strong>Lead Creation Date</strong>, and all material specifications in the{" "}
                  <strong>Add Item</strong> field. Use the comment box below for any inventory notes
                  and click <strong>Approve</strong> or <strong>Refer Back</strong>.
                </div>
              </div>

              {/* SECTION 1: LEAD & ORDER IDENTIFICATION (Stock Room Fields) */}
              <div className="form-card highlight-stock">
                <div className="form-card-header">
                  <Package size={18} />
                  <h3>Order & Lead Details</h3>
                  <span className="card-tag stock">Stock Verification</span>
                </div>

                <div className="form-grid-3">
                  {/* 1. Order ID */}
                  <div className="form-field">
                    <label>Order ID</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.orderId || "Pending Order ID"}
                      className="read-only-input bold-accent"
                    />
                  </div>

                  {/* 2. Employee Name */}
                  <div className="form-field">
                    <label>Employee Name (Sales Rep)</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.employeeName || "Divyanshi"}
                      className="read-only-input bold"
                    />
                  </div>

                  {/* 3. Date when the lead was created */}
                  <div className="form-field">
                    <label>Date When Lead Was Created</label>
                    <input
                      type="text"
                      readOnly
                      value={formatLeadDate(selectedOrder.createdAt)}
                      className="read-only-input bold"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: ALL ITEMS FROM "ADD ITEM" FIELD IN CREATE LEAD */}
              <div className="form-card">
                <div className="form-card-header">
                  <Layers size={18} />
                  <div>
                    <h3>All Items Attached in Lead (Add Item Field)</h3>
                    <span className="card-subtitle">
                      Verify material, fabric, printing, and sizing specifications for inventory
                      requisition.
                    </span>
                  </div>
                  <span className="count-badge">
                    {selectedOrder.items?.length || 0} Item
                    {(selectedOrder.items?.length || 0) !== 1 ? "s" : ""}
                  </span>
                </div>

                {!selectedOrder.items || selectedOrder.items.length === 0 ? (
                  <div className="no-items-box">
                    <AlertCircle size={20} color="#f59e0b" />
                    <p>No items were entered in the "Add Item" section of this lead.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="items-review-table stock-items-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Item Description</th>
                          <th>Printing Type</th>
                          <th>Sublimation</th>
                          <th>Fabric</th>
                          <th>Quantity</th>
                          <th>Size</th>
                          <th>Color</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((it, idx) => (
                          <tr key={it.id || it._id || idx}>
                            <td>{idx + 1}</td>
                            <td className="item-name-cell">
                              <span className="item-name-highlight">
                                {it.item || it.enterItem || it.itemType || "Apparel Item"}
                              </span>
                            </td>
                            <td>
                              <span className="spec-badge">
                                {it.printingType || "Standard"}
                              </span>
                            </td>
                            <td>{it.sublimationOption || "-"}</td>
                            <td>
                              <span className="fabric-pill">{it.fabric || "Standard Fabric"}</span>
                            </td>
                            <td>
                              <span className="qty-tag">{it.quantity || 0} pcs</span>
                            </td>
                            <td>
                              <span className="size-pill">{it.size || "M"}</span>
                            </td>
                            <td>
                              <span className="color-spec">{it.color || "-"}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION 3: MANAGER FEEDBACK & CORRECTION NOTES */}
              <div className="form-card comment-section-card">
                <div className="form-card-header">
                  <MessageSquare size={18} />
                  <div>
                    <h3>Stock Room Manager Feedback & Notes</h3>
                    <span className="card-subtitle">
                      Provide stock allocation comments, inventory notes, or correction notes if
                      referring back.
                    </span>
                  </div>
                </div>

                <div className="comment-box-container">
                  <textarea
                    className="manager-textarea"
                    rows={4}
                    placeholder="Enter stock availability confirmation or correction notes for sales (e.g. 'Fabric in stock, ready for cutting' or 'Requested 50XL requires stock procurement, refer back')..."
                    value={managerComment}
                    onChange={(e) => setManagerComment(e.target.value)}
                  />

                  <div className="comment-actions-footer">
                    <div className="reviewer-info">
                      <User size={15} />
                      <span>
                        Acting as:{" "}
                        <strong>{currentUser?.name || "Elena Rostova"}</strong> (
                        {currentUser?.role || "Stock Room Manager"})
                      </span>
                    </div>

                    <div className="bottom-action-buttons">
                      <button
                        type="button"
                        className="btn-refer-back"
                        onClick={() => handleApprovalAction("Referred Back")}
                        disabled={submittingAction}
                      >
                        <RotateCcw size={15} />
                        <span>Refer Back</span>
                      </button>

                      <button
                        type="button"
                        className="btn-approve"
                        onClick={() => handleApprovalAction("Approved")}
                        disabled={submittingAction}
                      >
                        <CheckCircle size={15} />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Audit Trail / History */}
                {selectedOrder.approvalComments && selectedOrder.approvalComments.length > 0 && (
                  <div className="comment-history-list">
                    <h4 className="history-title">Activity & Review History</h4>
                    <div className="timeline-items">
                      {selectedOrder.approvalComments.map((entry, idx) => (
                        <div key={idx} className="timeline-item">
                          <div
                            className={`timeline-indicator ${
                              entry.status === "Approved" ? "approved" : "referred"
                            }`}
                          >
                            {entry.status === "Approved" ? (
                              <CheckCircle size={14} />
                            ) : (
                              <RotateCcw size={14} />
                            )}
                          </div>
                          <div className="timeline-body">
                            <div className="timeline-header">
                              <span className="timeline-author">
                                {entry.author || "Stock Manager"}
                              </span>
                              <span className="timeline-role">({entry.role || "Stock Room"})</span>
                              <span
                                className={`timeline-action-tag ${
                                  entry.status === "Approved" ? "approved" : "referred"
                                }`}
                              >
                                {entry.status}
                              </span>
                              <span className="timeline-time">
                                {entry.createdAt
                                  ? new Date(entry.createdAt).toLocaleString()
                                  : "Recently"}
                              </span>
                            </div>
                            <p className="timeline-comment-text">{entry.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              CASE 2: PRODUCTION ROOM MANAGER VIEW
              Fields:
              - Employee Name
              - Date when the lead is created
              - Order ID
              - Logo Name
              - Both Approve button and Refer Back button
             ========================================================================= */}
          {roleView === "production" && (
            <div className="review-form-wrapper">
              {/* Informational Role Banner */}
              <div className="read-only-banner prod-banner">
                <Cpu size={20} className="banner-icon production" />
                <div>
                  <strong>Case 2: Production Room Manager Approval View:</strong> Verify the{" "}
                  <strong>Employee Name</strong>, <strong>Date Created</strong>,{" "}
                  <strong>Order ID</strong>, and <strong>Logo Name</strong> for production lineup.
                  Click <strong>Approve</strong> to release or <strong>Refer Back</strong> to
                  request sales revision.
                </div>
              </div>

              {/* EXACT 4 FIELDS SPECIFIED BY USER */}
              <div className="form-card highlight-production">
                <div className="form-card-header">
                  <Cpu size={18} />
                  <h3>Production Room Approval Details</h3>
                  <span className="card-tag production">Production Verification</span>
                </div>

                <div className="production-focused-grid">
                  {/* Field 1: Employee Name */}
                  <div className="prod-field-card">
                    <div className="prod-field-header">
                      <User size={16} />
                      <span>Employee Name</span>
                    </div>
                    <div className="prod-field-value">
                      {selectedOrder.employeeName || "Divyanshi"}
                    </div>
                    <span className="prod-field-note">Sales Representative</span>
                  </div>

                  {/* Field 2: Date when the lead was created */}
                  <div className="prod-field-card">
                    <div className="prod-field-header">
                      <Calendar size={16} />
                      <span>Date Created</span>
                    </div>
                    <div className="prod-field-value">
                      {formatLeadDate(selectedOrder.createdAt)}
                    </div>
                    <span className="prod-field-note">Lead Submission Timestamp</span>
                  </div>

                  {/* Field 3: Order ID */}
                  <div className="prod-field-card highlight-accent">
                    <div className="prod-field-header">
                      <Package size={16} />
                      <span>Order ID</span>
                    </div>
                    <div className="prod-field-value accent">
                      {selectedOrder.orderId || "Pending Order ID"}
                    </div>
                    <span className="prod-field-note">Unique Order Identifier</span>
                  </div>

                  {/* Field 4: Logo Name */}
                  <div className="prod-field-card highlight-brand">
                    <div className="prod-field-header">
                      <Tag size={16} />
                      <span>Logo Name</span>
                    </div>
                    <div className="prod-field-value brand">
                      {selectedOrder.logoName || "None / Plain (No Logo)"}
                    </div>
                    {selectedOrder.attachment ? (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Paperclip size={13} style={{ color: '#2563eb', flexShrink: 0 }} />
                        <a
                          href={selectedOrder.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={selectedOrder.attachmentName || 'logo-artwork'}
                          style={{
                            fontSize: '12px',
                            color: '#2563eb',
                            fontWeight: 600,
                            textDecoration: 'underline',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '180px'
                          }}
                          title={selectedOrder.attachmentName}
                        >
                          {selectedOrder.attachmentName || 'Download Artwork'}
                        </a>
                      </div>
                    ) : (
                      <span className="prod-field-note">Branding & Print Artwork</span>
                    )}
                  </div>
                </div>
              </div>

              {/* MANAGER FEEDBACK & CORRECTION NOTES */}
              <div className="form-card comment-section-card">
                <div className="form-card-header">
                  <MessageSquare size={18} />
                  <div>
                    <h3>Production Room Feedback & Instructions</h3>
                    <span className="card-subtitle">
                      Provide DTF line comments, artwork instructions, or reasons if referring
                      back.
                    </span>
                  </div>
                </div>

                <div className="comment-box-container">
                  <textarea
                    className="manager-textarea"
                    rows={4}
                    placeholder="Enter production notes or revision requests (e.g., 'Artwork resolution verified, schedule on DTF line 2' or 'Logo name artwork vector file missing, please re-upload')..."
                    value={managerComment}
                    onChange={(e) => setManagerComment(e.target.value)}
                  />

                  <div className="comment-actions-footer">
                    <div className="reviewer-info">
                      <User size={15} />
                      <span>
                        Acting as:{" "}
                        <strong>{currentUser?.name || "Marcus Vance"}</strong> (
                        {currentUser?.role || "Production Lead"})
                      </span>
                    </div>

                    <div className="bottom-action-buttons">
                      <button
                        type="button"
                        className="btn-refer-back"
                        onClick={() => handleApprovalAction("Referred Back")}
                        disabled={submittingAction}
                      >
                        <RotateCcw size={15} />
                        <span>Refer Back</span>
                      </button>

                      <button
                        type="button"
                        className="btn-approve"
                        onClick={() => handleApprovalAction("Approved")}
                        disabled={submittingAction}
                      >
                        <CheckCircle size={15} />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Audit Trail / History */}
                {selectedOrder.approvalComments && selectedOrder.approvalComments.length > 0 && (
                  <div className="comment-history-list">
                    <h4 className="history-title">Activity & Review History</h4>
                    <div className="timeline-items">
                      {selectedOrder.approvalComments.map((entry, idx) => (
                        <div key={idx} className="timeline-item">
                          <div
                            className={`timeline-indicator ${
                              entry.status === "Approved" ? "approved" : "referred"
                            }`}
                          >
                            {entry.status === "Approved" ? (
                              <CheckCircle size={14} />
                            ) : (
                              <RotateCcw size={14} />
                            )}
                          </div>
                          <div className="timeline-body">
                            <div className="timeline-header">
                              <span className="timeline-author">
                                {entry.author || "Production Lead"}
                              </span>
                              <span className="timeline-role">
                                ({entry.role || "Production"})
                              </span>
                              <span
                                className={`timeline-action-tag ${
                                  entry.status === "Approved" ? "approved" : "referred"
                                }`}
                              >
                                {entry.status}
                              </span>
                              <span className="timeline-time">
                                {entry.createdAt
                                  ? new Date(entry.createdAt).toLocaleString()
                                  : "Recently"}
                              </span>
                            </div>
                            <p className="timeline-comment-text">{entry.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              CASE 3: ALL FIELDS (ADMIN MASTER VIEW)
             ========================================================================= */}
          {roleView === "all" && (
            <div className="review-form-wrapper">
              <div className="read-only-banner">
                <AlertCircle size={18} className="banner-icon" />
                <div>
                  <strong>Admin Master Review Mode:</strong> All order fields, financial figures,
                  and item specifications are displayed.
                </div>
              </div>

              {/* SECTION 1: LEAD DETAILS */}
              <div className="form-card">
                <div className="form-card-header">
                  <User size={18} />
                  <h3>Lead Details (Created by Sales)</h3>
                </div>

                <div className="form-grid-3">
                  <div className="form-field">
                    <label>Sales Representative</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.employeeName || "Divyanshi"}
                      className="read-only-input"
                    />
                  </div>
                  <div className="form-field">
                    <label>Lead Created Date</label>
                    <input
                      type="text"
                      readOnly
                      value={formatLeadDate(selectedOrder.createdAt)}
                      className="read-only-input"
                    />
                  </div>
                  <div className="form-field">
                    <label>Company Name</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.companyName || "-"}
                      className="read-only-input"
                    />
                  </div>
                  <div className="form-field">
                    <label>Client Name</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.clientName || "-"}
                      className="read-only-input"
                    />
                  </div>
                  <div className="form-field">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.phoneNumber || "-"}
                      className="read-only-input"
                    />
                  </div>
                  <div className="form-field">
                    <label>Company Address</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.companyAddress || "-"}
                      className="read-only-input"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: ORDER INFO */}
              <div className="form-card">
                <div className="form-card-header">
                  <Package size={18} />
                  <h3>Order Information & Financials</h3>
                </div>

                <div className="form-grid-3">
                  <div className="form-field">
                    <label>Order ID</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.orderId || "-"}
                      className="read-only-input bold-accent"
                    />
                  </div>
                  <div className="form-field">
                    <label>Logo Name / Branding</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.logoName || "-"}
                      className="read-only-input"
                    />
                  </div>
                  <div className="form-field">
                    <label>Order Stage</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.orderStage || "-"}
                      className="read-only-input bold"
                    />
                  </div>
                  <div className="form-field">
                    <label>Total Quantity</label>
                    <input
                      type="text"
                      readOnly
                      value={`${selectedOrder.totalQuantity || 0} pcs`}
                      className="read-only-input bold"
                    />
                  </div>
                  <div className="form-field">
                    <label>Net Amount</label>
                    <input
                      type="text"
                      readOnly
                      value={`₹${Number(selectedOrder.netAmount || 0).toLocaleString()}`}
                      className="read-only-input bold-green"
                    />
                  </div>
                  <div className="form-field">
                    <label>Delivery Date</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.deliveryDate || "-"}
                      className="read-only-input"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: ITEMS */}
              <div className="form-card">
                <div className="form-card-header">
                  <Layers size={18} />
                  <h3>Ordered Items ({selectedOrder.items?.length || 0})</h3>
                </div>

                {!selectedOrder.items || selectedOrder.items.length === 0 ? (
                  <p className="no-items-text">No detailed items attached.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="items-review-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Item Description</th>
                          <th>Printing Type</th>
                          <th>Sublimation</th>
                          <th>Fabric</th>
                          <th>Quantity</th>
                          <th>Size</th>
                          <th>Color</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((it, idx) => (
                          <tr key={it.id || idx}>
                            <td>{idx + 1}</td>
                            <td className="item-name-cell">
                              {it.item || it.enterItem || it.itemType || "Apparel Item"}
                            </td>
                            <td>{it.printingType || "-"}</td>
                            <td>{it.sublimationOption || "-"}</td>
                            <td>{it.fabric || "-"}</td>
                            <td className="bold">{it.quantity || 0}</td>
                            <td>{it.size || "-"}</td>
                            <td>{it.color || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION 4: MANAGER COMMENT */}
              <div className="form-card comment-section-card">
                <div className="form-card-header">
                  <MessageSquare size={18} />
                  <div>
                    <h3>Manager Feedback & Correction Notes</h3>
                  </div>
                </div>

                <div className="comment-box-container">
                  <textarea
                    className="manager-textarea"
                    rows={4}
                    placeholder="Enter instructions, adjustments, or reasons if referring back..."
                    value={managerComment}
                    onChange={(e) => setManagerComment(e.target.value)}
                  />

                  <div className="comment-actions-footer">
                    <div className="reviewer-info">
                      <User size={15} />
                      <span>
                        Reviewing as: <strong>{currentUser?.name || "Manager"}</strong> (
                        {currentUser?.role || "Reviewer"})
                      </span>
                    </div>

                    <div className="bottom-action-buttons">
                      <button
                        type="button"
                        className="btn-refer-back"
                        onClick={() => handleApprovalAction("Referred Back")}
                        disabled={submittingAction}
                      >
                        <RotateCcw size={15} />
                        <span>Refer Back</span>
                      </button>

                      <button
                        type="button"
                        className="btn-approve"
                        onClick={() => handleApprovalAction("Approved")}
                        disabled={submittingAction}
                      >
                        <CheckCircle size={15} />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
