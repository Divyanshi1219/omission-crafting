import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
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
  CheckSquare,
  Paperclip
} from "lucide-react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import "./Approvals.css";
import "./Tasks/TasksPage.css";

export default function Approvals({ defaultTab = "all" }) {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { status } = useParams();
  const currentTaskTab = (status || "all").toLowerCase();

  // Helper to map route status param to internal statusTab
  const getTabFromParam = (paramVal) => {
    if (!paramVal) return defaultTab || "all";
    if (paramVal === "approve" || paramVal === "pending") return "pending";
    if (paramVal === "refer-back" || paramVal === "referred-back") return "referred-back";
    if (paramVal === "approved") return "approved";
    return "all";
  };

  // Role identity detection
  const isStockProfile =
    currentUser?.id === "stock" ||
    Boolean(currentUser?.role && currentUser.role.toLowerCase().includes("stock"));
  const isProdProfile =
    currentUser?.id === "production" ||
    Boolean(currentUser?.role && currentUser.role.toLowerCase().includes("production"));
  const isAdminProfile = currentUser?.id === "admin" || (!isStockProfile && !isProdProfile);

  // Submenus based on profile
  const taskSubMenus = useMemo(() => {
    if (isStockProfile) {
      return [
        { key: "all", label: "ALL", path: "/tasks/all" },
        { key: "verification", label: "Verification", path: "/tasks/verification" },
        { key: "ready-to-pick", label: "Ready to Pick", path: "/tasks/ready-to-pick" },
        { key: "staging-room", label: "Staging Room", path: "/tasks/staging-room" },
      ];
    }
    if (isProdProfile) {
      return [
        { key: "all", label: "ALL", path: "/tasks/all" },
        { key: "logo-cutting", label: "Logo Cutting", path: "/tasks/logo-cutting" },
      ];
    }
    return [
      { key: "all", label: "ALL", path: "/tasks/all" },
      { key: "verification", label: "Verification", path: "/tasks/verification" },
      { key: "ready-to-pick", label: "Ready to Pick", path: "/tasks/ready-to-pick" },
      { key: "staging-room", label: "Staging Room", path: "/tasks/staging-room" },
      { key: "logo-cutting", label: "Logo Cutting", path: "/tasks/logo-cutting" },
    ];
  }, [isStockProfile, isProdProfile]);

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
  const [taskCounts, setTaskCounts] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [managerComment, setManagerComment] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusTab, setStatusTab] = useState(() => getTabFromParam(status)); // 'all' | 'pending' | 'referred-back' | 'approved'
  const [toast, setToast] = useState(null);

  // Action Modal State for Ready to Pick, Staging Room, and Logo Cutting
  const [taskActionModal, setTaskActionModal] = useState({
    isOpen: false,
    order: null,
    actionType: "submit", // "submit" | "refer_back"
    taskType: "ready_to_pick", // "ready_to_pick" | "staging_room" | "logo_cutting"
    note: "",
    isStockAvailable: true,
    sampleDeduction: 0,
    notInStockCount: 0,
    stockDepreciation: "",
    receivedCount: 0,
    pendingCount: 0,
    logosPrinted: 100,
    logosCutGiven: 100,
    sampleLogosCount: 0,
  });

  const handleOpenTaskModal = (order, actionType, taskType) => {
    const totalQty = order.totalQuantity || order.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 100;
    const sampleQty = order.stockTaskData?.sampleDeduction !== undefined ? Number(order.stockTaskData.sampleDeduction) : 0;

    setTaskActionModal({
      isOpen: true,
      order,
      actionType,
      taskType,
      note: "",
      isStockAvailable: order.stockTaskData?.isStockAvailable !== false,
      sampleDeduction: sampleQty,
      notInStockCount: 0,
      stockDepreciation: order.stockTaskData?.stockDepreciation || (sampleQty > 0 ? `Giving ${sampleQty} for sample. Remaining: ${Math.max(0, totalQty - sampleQty)} in stock.` : ""),
      receivedCount: order.stockTaskData?.receivedCount !== undefined ? Number(order.stockTaskData.receivedCount) : sampleQty,
      pendingCount: order.stockTaskData?.pendingCount || 0,
      logosPrinted: order.productionTaskData?.logosPrinted || totalQty,
      logosCutGiven: order.productionTaskData?.logosCutGiven || totalQty,
      sampleLogosCount: order.productionTaskData?.sampleLogosCount !== undefined ? Number(order.productionTaskData.sampleLogosCount) : sampleQty,
    });
  };

  const handleCloseTaskModal = () => {
    setTaskActionModal(prev => ({ ...prev, isOpen: false, order: null }));
  };

  // Production Room Form State (on-page form instead of modal)
  const [prodForm, setProdForm] = useState({
    logosPrinted: 100,
    logosCutGiven: 100,
    sampleLogosCount: 0,
    note: "",
  });

  useEffect(() => {
    if (selectedOrder) {
      const totalQty = selectedOrder.totalQuantity || selectedOrder.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 100;
      const sampleQty = selectedOrder.productionTaskData?.sampleLogosCount !== undefined ? Number(selectedOrder.productionTaskData.sampleLogosCount) : 0;
      setProdForm({
        logosPrinted: selectedOrder.productionTaskData?.logosPrinted ?? totalQty,
        logosCutGiven: selectedOrder.productionTaskData?.logosCutGiven ?? totalQty,
        sampleLogosCount: selectedOrder.productionTaskData?.sampleLogosCount ?? sampleQty,
        note: "",
      });
    }
  }, [selectedOrder]);

  // Stock Room Form State (on-page form instead of modal)
  const [stockForm, setStockForm] = useState({
    isStockAvailable: true,
    notInStockCount: "",
    sampleDeduction: 0,
    stockDepreciation: "",
    receivedCount: 0,
    pendingCount: 0,
    note: "",
  });

  useEffect(() => {
    if (selectedOrder) {
      const totalQty = selectedOrder.totalQuantity || selectedOrder.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 100;
      const sampleDeduction = selectedOrder.stockTaskData?.sampleDeduction !== undefined ? Number(selectedOrder.stockTaskData.sampleDeduction) : 0;
      const isAvail = selectedOrder.stockTaskData?.isStockAvailable !== false;
      const remaining = Math.max(0, totalQty - sampleDeduction);
      const defaultDeprec = selectedOrder.stockTaskData?.stockDepreciation || (sampleDeduction > 0 ? `Giving ${sampleDeduction} for sample. Remaining: ${remaining} in stock.` : "");

      setStockForm({
        isStockAvailable: isAvail,
        notInStockCount: selectedOrder.stockTaskData?.notInStockCount || "",
        sampleDeduction: sampleDeduction,
        stockDepreciation: defaultDeprec,
        receivedCount: selectedOrder.stockTaskData?.receivedCount !== undefined ? Number(selectedOrder.stockTaskData.receivedCount) : sampleDeduction,
        pendingCount: selectedOrder.stockTaskData?.pendingCount ?? 0,
        note: "",
      });
    }
  }, [selectedOrder]);

  const handleExecutePageAction = async (actionType) => {
    if (!selectedOrder) return;
    const orderId = selectedOrder._id || selectedOrder.id;

    if (roleView === "production" || currentTaskTab === "logo-cutting") {
      if (actionType === "refer_back" && !prodForm.note.trim()) {
        alert("Please provide production remarks/feedback explaining why this order is being referred back.");
        return;
      }

      setSubmittingAction(true);
      try {
        const payload = {
          action: actionType,
          comment: prodForm.note.trim(),
          author: currentUser?.name || "Marcus Vance",
          productionTaskData: {
            logosPrinted: Number(prodForm.logosPrinted) || selectedOrder.totalQuantity || 100,
            logosCutGiven: Number(prodForm.logosCutGiven) || selectedOrder.totalQuantity || 100,
            sampleLogosCount: Number(prodForm.sampleLogosCount) || 5,
          }
        };

        const res = await api.patch(`/api/leads/${orderId}/production-task`, payload);
        if (res.data?.success) {
          showToast(
            actionType === "submit"
              ? `Order #${selectedOrder.orderId || "Order"} logo cutting approved!`
              : `Order #${selectedOrder.orderId || "Order"} referred back.`
          );
          setSelectedOrder(null);
          setManagerComment("");
          setSearchParams({});
          navigate("/tasks/all");
          fetchOrders();
        }
      } catch (err) {
        console.error("Error executing production action:", err);
        showToast(err.response?.data?.message || "Failed to update production task", "error");
      } finally {
        setSubmittingAction(false);
      }
      return;
    }

    // For stock room:
    if (roleView === "stock" || currentTaskTab === "ready-to-pick" || currentTaskTab === "staging-room") {
      const isStaging = currentTaskTab === "staging-room" || selectedOrder.stockTaskStage === "staging_room";
      const stage = isStaging ? "staging_room" : "ready_to_pick";

      if (actionType === "refer_back" && !stockForm.note.trim()) {
        alert("Please provide correction notes explaining why this order is being referred back.");
        return;
      }

      setSubmittingAction(true);
      try {
        let payload;
        if (stage === "ready_to_pick") {
          payload = {
            action: actionType,
            stage: "ready_to_pick",
            comment: stockForm.note.trim(),
            author: currentUser?.name || "Elena Rostova",
            stockTaskData: {
              isStockAvailable: stockForm.isStockAvailable,
              sampleDeduction: Number(stockForm.sampleDeduction) >= 0 ? Number(stockForm.sampleDeduction) : 0,
              stockDepreciation: stockForm.stockDepreciation.trim() || (stockForm.isStockAvailable ? "Full stock available" : "Low stock"),
              notInStockCount: Number(stockForm.notInStockCount) || 0,
            }
          };
        } else {
          payload = {
            action: actionType,
            stage: "staging_room",
            comment: stockForm.note.trim(),
            author: currentUser?.name || "Elena Rostova",
            stockTaskData: {
              receivedCount: Number(stockForm.receivedCount) >= 0 ? Number(stockForm.receivedCount) : 0,
              pendingCount: Number(stockForm.pendingCount) || 0,
              sampleDeduction: Number(stockForm.sampleDeduction) >= 0 ? Number(stockForm.sampleDeduction) : 0,
            }
          };
        }

        const res = await api.patch(`/api/leads/${orderId}/stock-task`, payload);
        if (res.data?.success) {
          if (stage === "ready_to_pick") {
            showToast(
              actionType === "submit"
                ? `Order #${selectedOrder.orderId || "Order"} moved to Staging Room!`
                : `Order #${selectedOrder.orderId || "Order"} referred back.`
            );
            setSelectedOrder(null);
            setManagerComment("");
            setSearchParams({});
            navigate("/tasks/staging-room");
            fetchOrders();
          } else {
            showToast(
              actionType === "submit"
                ? `Order #${selectedOrder.orderId || "Order"} stock clearance approved!`
                : `Order #${selectedOrder.orderId || "Order"} referred back to Ready to Pick.`
            );
            setSelectedOrder(null);
            setManagerComment("");
            setSearchParams({});
            navigate("/tasks/all");
            fetchOrders();
          }
        }
      } catch (err) {
        console.error("Error executing stock action:", err);
        showToast(err.response?.data?.message || "Failed to update stock task", "error");
      } finally {
        setSubmittingAction(false);
      }
      return;
    }
  };

  const handleConfirmTaskModal = async () => {
    if (!taskActionModal.order) return;
    const { actionType, taskType, order, note, isStockAvailable, sampleDeduction, stockDepreciation, receivedCount, pendingCount, logosPrinted, logosCutGiven, sampleLogosCount } = taskActionModal;

    if (actionType === "refer_back" && !note.trim()) {
      alert("Please provide correction notes explaining why this order is being referred back.");
      return;
    }

    setSubmittingAction(true);
    try {
      const orderId = order._id || order.id;
      if (taskType === "ready_to_pick") {
        const payload = {
          action: actionType,
          stage: "ready_to_pick",
          comment: note.trim(),
          author: currentUser?.name || "Elena Rostova",
          stockTaskData: {
            isStockAvailable,
            sampleDeduction: Number(sampleDeduction) >= 0 ? Number(sampleDeduction) : 0,
            stockDepreciation: stockDepreciation.trim() || (isStockAvailable ? "Full stock available" : "Low stock"),
          }
        };
        const res = await api.patch(`/api/leads/${orderId}/stock-task`, payload);
        if (res.data?.success) {
          showToast(actionType === "submit" ? `Order #${order.orderId || "Order"} moved to Staging Room!` : `Order #${order.orderId || "Order"} referred back.`);
          handleCloseTaskModal();
          if (selectedOrder) {
            handleBackToList();
          } else {
            fetchOrders();
          }
        }
      } else if (taskType === "staging_room") {
        const payload = {
          action: actionType,
          stage: "staging_room",
          comment: note.trim(),
          author: currentUser?.name || "Elena Rostova",
          stockTaskData: {
            receivedCount: Number(receivedCount) >= 0 ? Number(receivedCount) : 0,
            pendingCount: Number(pendingCount) || 0,
          }
        };
        const res = await api.patch(`/api/leads/${orderId}/stock-task`, payload);
        if (res.data?.success) {
          showToast(actionType === "submit" ? `Order #${order.orderId || "Order"} stock clearance approved!` : `Order #${order.orderId || "Order"} referred back to Ready to Pick.`);
          handleCloseTaskModal();
          if (selectedOrder) {
            handleBackToList();
          } else {
            fetchOrders();
          }
        }
      } else if (taskType === "logo_cutting") {
        const payload = {
          action: actionType,
          comment: note.trim(),
          author: currentUser?.name || "Marcus Vance",
          productionTaskData: {
            logosPrinted: Number(logosPrinted) || order.totalQuantity || 100,
            logosCutGiven: Number(logosCutGiven) || order.totalQuantity || 100,
            sampleLogosCount: Number(sampleLogosCount) || 5,
          }
        };
        const res = await api.patch(`/api/leads/${orderId}/production-task`, payload);
        if (res.data?.success) {
          showToast(actionType === "submit" ? `Order #${order.orderId || "Order"} logo cutting approved!` : `Order #${order.orderId || "Order"} referred back.`);
          handleCloseTaskModal();
          setSelectedOrder(null);
          setManagerComment("");
          setSearchParams({});
          navigate("/tasks/all");
          fetchOrders();
        }
      }
    } catch (err) {
      console.error("Error confirming task action:", err);
      showToast(err.response?.data?.message || "Failed to update task", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  useEffect(() => {
    setStatusTab(getTabFromParam(status));
  }, [status, defaultTab]);

  useEffect(() => {
    api.get("/api/tasks")
      .then((res) => {
        if (res.data?.counts) {
          setTaskCounts(res.data.counts);
        }
      })
      .catch(() => {});
  }, []);

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
    if (currentTaskTab === "logo-cutting" || isProdProfile) {
      setRoleView("production");
    } else if (currentTaskTab === "verification" || currentTaskTab === "ready-to-pick" || currentTaskTab === "staging-room" || isStockProfile) {
      setRoleView("stock");
    }
    setSelectedOrder(order);
    setManagerComment("");
    setSearchParams({ id: order._id || order.id });
    try {
      const res = await api.get(`/api/leads/${order._id || order.id}`);
      if (res.data?.data) {
        setSelectedOrder(res.data.data);
      }
    } catch (_) { }
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

  const isAllView = currentTaskTab === "all";

  // Helper to get role-specific task approval status
  const getOrderTaskStatus = (order) => {
    if (!order) return "Pending";
    if (roleView === "production" || isProdProfile) {
      if (order.productionApproval?.status) return order.productionApproval.status;
      if (order.productionTaskStage === "completed") return "Approved";
      return "Pending";
    }
    if (roleView === "stock" || isStockProfile) {
      if (order.stockApproval?.status) return order.stockApproval.status;
      if (order.stockTaskStage === "completed") return "Approved";
      return "Pending";
    }
    return order.approvalStatus || "Pending";
  };

  // Visible orders for current role (Stock Room and Production only see leads approved by Lead Manager)
  const visibleOrders = useMemo(() => {
    if (isStockProfile || isProdProfile) {
      return orders.filter(
        (o) =>
          o.orderStage === "partial" ||
          o.orderStage === "complete" ||
          o.leadApproval?.status === "Approved" ||
          (!o.leadApproval && o.approvalStatus === "Approved")
      );
    }
    return orders;
  }, [orders, isStockProfile, isProdProfile]);

  // Filtered orders for the active task tab
  const filteredOrders = useMemo(() => {
    return visibleOrders.filter((order) => {
      // Role & tab-specific filtering
      if (currentTaskTab === "verification") {
        return false;
      } else if (currentTaskTab === "ready-to-pick") {
        if (order.stockTaskStage === "completed" || order.stockTaskStage === "staging_room") return false;
      } else if (currentTaskTab === "staging-room") {
        if (order.stockTaskStage !== "staging_room") return false;
      } else if (currentTaskTab === "logo-cutting") {
        if (order.productionTaskStage === "completed") return false;
      } else if (currentTaskTab === "all") {
        const orderStatus = getOrderTaskStatus(order).toLowerCase();
        // Tab filter within 'all' view
        if (statusTab === "pending" && orderStatus !== "pending") return false;
        if (statusTab === "referred-back" && orderStatus !== "referred back") return false;
        if (statusTab === "approved" && orderStatus !== "approved") return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const taskId = (order.taskId || (order.orderId ? `TSK-${order.orderId.replace(/^ORD-?/i, "")}` : "")).toLowerCase();
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
          taskId.includes(term) ||
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
  }, [visibleOrders, currentTaskTab, statusTab, searchTerm, roleView, isProdProfile, isStockProfile]);

  // Statistics
  const stats = useMemo(() => {
    let pending = 0;
    let referredBack = 0;
    let approved = 0;
    visibleOrders.forEach((o) => {
      const st = getOrderTaskStatus(o).toLowerCase();
      if (st === "pending") pending++;
      else if (st === "referred back") referredBack++;
      else if (st === "approved") approved++;
    });
    return { total: visibleOrders.length, pending, referredBack, approved };
  }, [visibleOrders, roleView, isProdProfile, isStockProfile]);

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
          {/* Top Bar with Search */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>

            <div className="search-box" style={{ width: "320px", maxWidth: "100%" }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder={
                  currentTaskTab === "verification"
                    ? "Search verification tasks..."
                    : currentTaskTab === "ready-to-pick"
                    ? "Search Order ID, employee, company, item..."
                    : currentTaskTab === "staging-room"
                      ? "Search Order ID, company..."
                      : currentTaskTab === "logo-cutting"
                        ? "Search Order ID, logo, employee..."
                        : "Search tasks & orders..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="table-card">
            <div className="table-responsive">
              <table className="approvals-table">
                <thead>
                  {/* VERIFICATION TABLE HEADERS */}
                  {currentTaskTab === "verification" && (
                    <tr>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Company Name</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  )}

                  {/* READY TO PICK TABLE HEADERS */}
                  {currentTaskTab === "ready-to-pick" && (
                    <tr>
                      <th>Is Stock Available?</th>
                      <th>Total Stock</th>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Company Name</th>
                      <th>Add Item's Items</th>
                      <th>Date</th>
                      <th>Stock Depreciation / Sample</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  )}

                  {/* STAGING ROOM TABLE HEADERS */}
                  {currentTaskTab === "staging-room" && (
                    <tr>
                      <th>Order ID</th>
                      <th>Company Name</th>
                      <th>Date</th>
                      <th>Stock Status</th>
                      <th>Given for Sample</th>
                      <th>Received Count</th>
                      <th>Order Count Breakdown</th>
                      <th>Pending</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  )}

                  {/* LOGO CUTTING TABLE HEADERS */}
                  {currentTaskTab === "logo-cutting" && (
                    <tr>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Date</th>
                      <th>Logo Name</th>
                      <th>Attachment</th>
                      <th>Company Name</th>
                      <th>Logos Needed</th>
                      <th>Logos Printed</th>
                      <th>Logos Cut / Given</th>
                      <th>Giving for Sample</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  )}

                  {/* ALL VIEW HEADERS */}
                  {currentTaskTab === "all" && roleView === "stock" && (
                    <tr>
                      <th>Task ID</th>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Company Name</th>
                      <th>Date Created</th>
                      <th>Items of "Add Items"</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  )}

                  {currentTaskTab === "all" && roleView === "production" && (
                    <tr>
                      <th>Task ID</th>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Company Name</th>
                      <th>Date Created</th>
                      <th>Attachment & Logo</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  )}

                  {currentTaskTab === "all" && roleView === "all" && (
                    <tr>
                      <th>Task ID</th>
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
                  {loading ? (
                    <tr>
                      <td
                        colSpan={10}
                        style={{
                          textAlign: "center",
                          padding: "60px 20px",
                          color: "#64748b",
                        }}
                      >
                        <Clock size={36} className="spinning" style={{ display: "inline-block", marginBottom: "8px" }} />
                        <p style={{ margin: 0 }}>Loading tasks...</p>
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        style={{
                          textAlign: "center",
                          padding: "60px 20px",
                          color: "#64748b",
                        }}
                      >
                        <ClipboardCheck size={40} color="#94a3b8" style={{ marginBottom: "10px", display: "inline-block" }} />
                        <div style={{ fontWeight: 600, fontSize: "15px", color: "#334155" }}>
                          No Orders in {currentTaskTab.replace(/-/g, " ").toUpperCase()}
                        </div>
                        <div style={{ fontSize: "13px", marginTop: "4px", color: "#94a3b8" }}>
                          There are currently no orders waiting in this stage.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const st = order.approvalStatus || "Pending";
                      const dateStr = formatLeadDate(order.createdAt);
                      const itemsList = Array.isArray(order.items) ? order.items : [];
                      const totalItemsCount = itemsList.length;
                      const totalStockQty = order.totalQuantity || itemsList.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;
                      const taskIdDisplay = order.taskId || (order.orderId ? `TSK-${order.orderId.replace(/^ORD-?/i, "")}` : `TSK-${String(order._id || order.id).slice(-5).toUpperCase()}`);

                      /* =========================================================================
                         1. READY TO PICK (Stock Room Manager Task)
                         ========================================================================= */
                      if (currentTaskTab === "ready-to-pick") {
                        const isAvail = order.stockTaskData?.isStockAvailable !== false;
                        const sampleDeduction = order.stockTaskData?.sampleDeduction !== undefined ? Number(order.stockTaskData.sampleDeduction) : 0;
                        const remaining = Math.max(0, totalStockQty - sampleDeduction);

                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                            style={{ cursor: "pointer" }}
                            title="Click to view full order details"
                          >
                            <td>
                              <span style={{ color: isAvail ? "#059669" : "#dc2626", fontWeight: 600, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                {isAvail ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                                {isAvail ? "In Stock (Yes)" : "Not in Stock"}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px", fontWeight: 600 }}>
                                {totalStockQty} pcs
                              </span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: "#0f172a", fontFamily: "monospace", fontSize: "13px" }}>
                                {order.orderId || "Pending ID"}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px" }}>{order.employeeName || "Sales Executive"}</span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                                {order.companyName || order.clientName || "-"}
                              </span>
                            </td>
                            <td>
                              <div className="items-summary-cell">
                                <span className="items-preview-text">
                                  {itemsList.length > 0
                                    ? itemsList
                                      .map((it) => `${it.item || it.enterItem || "Apparel"} (${it.quantity || 0} pcs${it.fabric ? `, ${it.fabric}` : ""})`)
                                      .join(", ")
                                    : "No items"}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="date-value">{dateStr}</span>
                            </td>
                            <td>
                              <div style={{ fontSize: "12px", color: "#334155", display: "flex", flexDirection: "column", gap: "2px" }}>
                                <span>Giving for Sample: <strong>{sampleDeduction} pcs</strong></span>
                                <span style={{ color: "#059669", fontSize: "11px" }}>
                                  {order.stockTaskData?.stockDepreciation || `Stock remaining: ${remaining} pcs`}
                                </span>
                              </div>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className="task-action-btn-group">
                                <button
                                  type="button"
                                  className="action-btn view-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOrder(order);
                                  }}
                                  title="Open full order details"
                                >
                                  <Eye size={13} />
                                  View
                                </button>
                                <button
                                  type="button"
                                  className="action-btn refer-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOrder(order);
                                  }}
                                  title="Open order details to refer back"
                                >
                                  <RotateCcw size={13} />
                                  Refer Back
                                </button>
                                <button
                                  type="button"
                                  className="action-btn submit-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOrder(order);
                                  }}
                                  title="Open order details to review and submit"
                                >
                                  <CheckCircle size={13} />
                                  Submit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      /* =========================================================================
                         2. STAGING ROOM (Stock Room Manager Task)
                         ========================================================================= */
                      if (currentTaskTab === "staging-room") {
                        const sampleDeduction = order.stockTaskData?.sampleDeduction !== undefined ? Number(order.stockTaskData.sampleDeduction) : 0;
                        const receivedCount = order.stockTaskData?.receivedCount !== undefined ? Number(order.stockTaskData.receivedCount) : sampleDeduction;
                        const pendingCount = order.stockTaskData?.pendingCount || 0;
                        const breakdown = itemsList.length > 0
                          ? itemsList.map((it) => `${it.quantity || 0} ${it.color ? it.color + " " : ""}${it.item || it.enterItem || "pcs"}`).join(", ")
                          : `${totalStockQty} pcs total`;

                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                            style={{ cursor: "pointer" }}
                            title="Click to view full order details"
                          >
                            <td>
                              <span style={{ fontWeight: 600, color: "#0f172a", fontFamily: "monospace", fontSize: "13px" }}>
                                {order.orderId || "Pending ID"}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                                {order.companyName || order.clientName || "-"}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#64748b", fontSize: "13px" }}>{dateStr}</span>
                            </td>
                            <td>
                              <span style={{ color: "#059669", fontWeight: 600, fontSize: "13px" }}>
                                In Stock ({totalStockQty} pcs)
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px" }}>
                                {sampleDeduction} pcs
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px" }}>
                                {receivedCount} pcs
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "13px", color: "#334155" }}>
                                {breakdown}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: pendingCount > 0 ? "#b45309" : "#059669", fontSize: "13px", fontWeight: 600 }}>
                                {pendingCount} pcs
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className="task-action-btn-group">
                                <button
                                  type="button"
                                  className="action-btn view-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOrder(order);
                                  }}
                                  title="Open full order details"
                                >
                                  <Eye size={13} />
                                  View
                                </button>
                                <button
                                  type="button"
                                  className="action-btn refer-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOrder(order);
                                  }}
                                  title="Open order details to refer back"
                                >
                                  <RotateCcw size={13} />
                                  Refer Back
                                </button>
                                <button
                                  type="button"
                                  className="action-btn submit-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOrder(order);
                                  }}
                                  title="Open order details to review and submit"
                                >
                                  <CheckCircle size={13} />
                                  Submit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      /* =========================================================================
                         3. LOGO CUTTING (Production Lead Task)
                         ========================================================================= */
                      if (currentTaskTab === "logo-cutting") {
                        const logosPrinted = order.productionTaskData?.logosPrinted || totalStockQty;
                        const logosCutGiven = order.productionTaskData?.logosCutGiven || totalStockQty;
                        const sampleLogos = order.productionTaskData?.sampleLogosCount || 5;

                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                            style={{ cursor: "pointer" }}
                            title="Click to view full order details"
                          >
                            <td>
                              <span style={{ fontWeight: 600, color: "#0f172a", fontFamily: "monospace", fontSize: "13px" }}>
                                {order.orderId || "Pending ID"}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155" }}>{order.employeeName || "Sales Executive"}</span>
                            </td>
                            <td>
                              <span style={{ color: "#64748b", fontSize: "13px" }}>{dateStr}</span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px" }}>
                                {order.logoName || "Plain / No Logo"}
                              </span>
                            </td>
                            <td>
                              {order.attachment ? (
                                <a
                                  href={order.attachment}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={order.attachmentName || "artwork-attachment"}
                                  onClick={(e) => e.stopPropagation()}
                                  title={order.attachmentName || "Download Artwork Attachment"}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    color: "#2563eb",
                                    fontSize: "12.5px",
                                    textDecoration: "underline",
                                    maxWidth: "140px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                  }}
                                >
                                  <Paperclip size={12} style={{ flexShrink: 0 }} />
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {order.attachmentName || "Artwork"}
                                  </span>
                                </a>
                              ) : (
                                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                                  No Artwork
                                </span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                                {order.companyName || order.clientName || "-"}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px" }}>
                                {totalStockQty} pcs
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px" }}>{logosPrinted} pcs</span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px" }}>{logosCutGiven} pcs</span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px" }}>
                                {sampleLogos} pcs
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className="task-action-btn-group">
                                <button
                                  type="button"
                                  className="action-btn view-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOrder(order);
                                  }}
                                  title="Open full order details"
                                >
                                  <Eye size={13} />
                                  View
                                </button>
                                <button
                                  type="button"
                                  className="action-btn refer-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOrder(order);
                                  }}
                                  title="Open order specifications to refer back"
                                >
                                  <RotateCcw size={13} />
                                  Refer Back
                                </button>
                                <button
                                  type="button"
                                  className="action-btn submit-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOrder(order);
                                  }}
                                  title="Open order specifications to review and submit"
                                >
                                  <CheckCircle size={13} />
                                  Submit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      /* =========================================================================
                         4. ALL VIEW (Role-Based Ledger Overview)
                         ========================================================================= */
                      if (roleView === "stock") {
                        const stockStatus = getOrderTaskStatus(order);
                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                            style={{ cursor: "pointer" }}
                          >
                            <td>
                              <span style={{ fontFamily: "monospace", fontSize: "12.5px", color: "#64748b" }} title="Auto-generated, non-editable Task ID">
                                {taskIdDisplay}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: "#0f172a", fontFamily: "monospace", fontSize: "13px" }}>
                                {order.orderId || "Pending ID"}
                              </span>
                            </td>
                            <td>
                              <div className="user-cell">
                                <span className="rep-name bold">
                                  {order.employeeName || "Sales Executive"}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                                {order.companyName || order.clientName || "-"}
                              </span>
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
                                    {itemsList
                                      .map(
                                        (it) =>
                                          `${it.item || it.enterItem || it.itemType || "Apparel"} (${it.quantity || 0} pcs)`
                                      )
                                      .join(", ")}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`status-pill ${
                                  stockStatus === "Approved"
                                    ? "approved"
                                    : stockStatus === "Referred Back"
                                    ? "referred"
                                    : "pending"
                                }`}
                              >
                                <span className="status-dot"></span>
                                {stockStatus}
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
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      if (roleView === "production") {
                        const prodStatus = getOrderTaskStatus(order);
                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                            style={{ cursor: "pointer" }}
                          >
                            <td>
                              <span style={{ fontFamily: "monospace", fontSize: "12.5px", color: "#64748b" }}>
                                {taskIdDisplay}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: "#0f172a", fontFamily: "monospace", fontSize: "13px" }}>
                                {order.orderId || "Pending ID"}
                              </span>
                            </td>
                            <td>
                              <div className="user-cell">
                                <span style={{ color: "#334155" }}>
                                  {order.employeeName || "Sales Executive"}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                                {order.companyName || order.clientName || "-"}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#64748b", fontSize: "13px" }}>{dateStr}</span>
                            </td>
                            <td>
                              <div className="logo-attachment-cell" style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                                {order.attachment ? (
                                  <a
                                    href={order.attachment}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={order.attachmentName || "artwork-attachment"}
                                    onClick={(e) => e.stopPropagation()}
                                    title={order.attachmentName || "Download Artwork Attachment"}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      color: "#2563eb",
                                      fontSize: "12.5px",
                                      textDecoration: "underline",
                                      maxWidth: "180px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap"
                                    }}
                                  >
                                    <Paperclip size={12} style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {order.attachmentName || "Attachment"}
                                    </span>
                                  </a>
                                ) : (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      fontSize: "12px",
                                      color: "#94a3b8"
                                    }}
                                  >
                                    <Paperclip size={11} /> No Attachment
                                  </span>
                                )}
                                <span style={{ color: "#334155", fontSize: "12.5px" }}>
                                  {order.logoName || "Plain / No Logo"}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span
                                className={`status-pill ${
                                  prodStatus === "Approved"
                                    ? "approved"
                                    : prodStatus === "Referred Back"
                                    ? "referred"
                                    : "pending"
                                }`}
                              >
                                <span className="status-dot"></span>
                                {prodStatus}
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
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      /* MASTER ALL ROWS */
                      return (
                        <tr
                          key={order._id || order.id}
                          onClick={() => handleSelectOrder(order)}
                        >
                          <td>
                            <span style={{ fontFamily: "monospace", fontSize: "12.5px", color: "#64748b" }} title="Auto-generated, non-editable Task ID">
                              {taskIdDisplay}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: "#0f172a", fontFamily: "monospace", fontSize: "13px" }}>
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
                              {order.employeeName || "Sales Executive"}
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
                              className={`status-pill ${st === "Approved"
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: ROLE-SPECIFIC REVIEW & APPROVAL FORM */
        <div className="approvals-container">
          {/* Top Navigation & Action Header */}
          <div className="review-top-bar">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <button type="button" onClick={handleBackToList} className="back-link-btn">
                <ArrowLeft size={18} />
                <span>Back to Tasks</span>
              </button>

              {!isAdminProfile && (
                <div className="review-action-buttons">
                  {roleView === "production" && (selectedOrder.productionApproval?.status === "Approved" || selectedOrder.productionTaskStage === "completed") && (
                    <span className="status-pill approved" style={{ padding: "6px 14px", fontSize: "13px" }}>
                      <span className="status-dot"></span>
                      Approved
                    </span>
                  )}
                  {roleView === "stock" && (selectedOrder.stockApproval?.status === "Approved" || selectedOrder.stockTaskStage === "completed") && (
                    <span className="status-pill approved" style={{ padding: "6px 14px", fontSize: "13px" }}>
                      <span className="status-dot"></span>
                      Approved
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn-refer-back"
                    onClick={() => handleExecutePageAction("refer_back")}
                    disabled={submittingAction}
                  >
                    <RotateCcw size={15} />
                    <span>Refer Back</span>
                  </button>
                  <button
                    type="button"
                    className="btn-approve"
                    onClick={() => handleExecutePageAction("submit")}
                    disabled={submittingAction}
                  >
                    <CheckCircle size={15} />
                    <span>
                      {(roleView === "production" && (selectedOrder.productionApproval?.status === "Approved" || selectedOrder.productionTaskStage === "completed")) ||
                      (roleView === "stock" && (selectedOrder.stockApproval?.status === "Approved" || selectedOrder.stockTaskStage === "completed"))
                        ? "Update & Submit"
                        : "Submit"}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {isAdminProfile && (
              <div className="review-header-content">
                <div className="review-title-group">
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
                        className={`role-pill-btn production ${roleView === "production" ? "active" : ""
                          }`}
                        onClick={() => setRoleView("production")}
                      >
                        <Cpu size={13} />
                        <span>Production Room</span>
                      </button>
                      <button
                        type="button"
                        className={`role-pill-btn admin ${roleView === "all" ? "active" : ""}`}
                        onClick={() => setRoleView("all")}
                      >
                        <Layers size={13} />
                        <span>All</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS ON TOP (Only Admin can approve; Refer Back is removed completely) */}
                <div className="review-action-buttons">
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
            )}
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

              {/* SINGLE UNIFIED FORM CARD */}
              <div className="form-card">
                <div className="form-card-header">
                  <Package size={18} />
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
                    {currentTaskTab === "staging-room" || selectedOrder.stockTaskStage === "staging_room"
                      ? "Staging Room"
                      : "Ready to Pick"}
                  </h3>
                </div>

                {/* 1. ORDER & LEAD DETAILS */}
                <div className="form-grid-4" style={{ marginBottom: "20px" }}>
                  {/* 1. Order ID */}
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Order ID</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.orderId || "Pending Order ID"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>

                  {/* 2. Employee Name */}
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Employee Name (Sales Rep)</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.employeeName || "Sales Executive"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>

                  {/* 3. Company Name */}
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Company Name</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.companyName || selectedOrder.clientName || "-"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>

                  {/* 4. Date when the lead was created */}
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Date When Lead Was Created</label>
                    <input
                      type="text"
                      readOnly
                      value={formatLeadDate(selectedOrder.createdAt)}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                </div>

                {/* 2. ITEMS ATTACHED TABLE WITH STOCK CLEARANCE FIELDS IN FRONT OF COLOR */}
                <div className="table-responsive">
                  <table className="items-review-table stock-review-table">
                    <thead>
                      <tr>
                        <th style={{ width: "32px", textAlign: "center", padding: "10px 6px", fontSize: "12.5px" }}>#</th>
                        <th style={{ minWidth: "90px", padding: "10px 8px", fontSize: "12.5px" }}>Item Description</th>
                        <th style={{ minWidth: "75px", padding: "10px 8px", fontSize: "12.5px" }}>Printing Type</th>
                        <th style={{ minWidth: "65px", padding: "10px 8px", fontSize: "12.5px" }}>Sublimation</th>
                        <th style={{ minWidth: "65px", padding: "10px 8px", fontSize: "12.5px" }}>Fabric</th>
                        <th style={{ minWidth: "65px", padding: "10px 8px", fontSize: "12.5px" }}>Quantity</th>
                        <th style={{ minWidth: "40px", padding: "10px 8px", fontSize: "12.5px" }}>Size</th>
                        <th style={{ minWidth: "55px", padding: "10px 8px", fontSize: "12.5px" }}>Color</th>
                        {!(currentTaskTab === "staging-room" || selectedOrder.stockTaskStage === "staging_room") ? (
                          <>
                            <th style={{ minWidth: "130px", padding: "10px 8px", fontSize: "12.5px" }}>Is stock available?</th>
                            <th style={{ minWidth: "90px", padding: "10px 8px", fontSize: "12.5px" }}>How many giving for sample? (pcs)</th>
                            <th style={{ minWidth: "160px", padding: "10px 8px", fontSize: "12.5px" }}>Stock Depreciation</th>
                          </>
                        ) : (
                          <>
                            <th style={{ minWidth: "90px", padding: "10px 8px", fontSize: "12.5px" }}>Given for Sample (pcs)</th>
                            <th style={{ minWidth: "105px", padding: "10px 8px", fontSize: "12.5px" }}>Received at Staging (pcs)</th>
                            <th style={{ minWidth: "85px", padding: "10px 8px", fontSize: "12.5px" }}>Pending (pcs)</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(!selectedOrder.items || selectedOrder.items.length === 0) ? (
                        <tr>
                          <td style={{ textAlign: "center", padding: "9px 6px", fontSize: "13.5px" }}>1</td>
                          <td className="item-name-cell" style={{ padding: "9px 8px", fontSize: "13.5px" }}>{selectedOrder.item || "Apparel Item"}</td>
                          <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>Standard</td>
                          <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>-</td>
                          <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>Standard</td>
                          <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{selectedOrder.totalQuantity || 0} pcs</td>
                          <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>-</td>
                          <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>-</td>
                          {!(currentTaskTab === "staging-room" || selectedOrder.stockTaskStage === "staging_room") ? (
                            <>
                              <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                <select
                                  value={stockForm.isStockAvailable ? "yes" : "no"}
                                  onChange={(e) => {
                                    const isAvail = e.target.value === "yes";
                                    const totalQty = selectedOrder.totalQuantity || 100;
                                    const sampleDeduction = Number(stockForm.sampleDeduction) >= 0 ? Number(stockForm.sampleDeduction) : 0;
                                    const remaining = Math.max(0, totalQty - sampleDeduction);
                                    setStockForm(prev => ({
                                      ...prev,
                                      isStockAvailable: isAvail,
                                      stockDepreciation: isAvail
                                        ? (sampleDeduction > 0 ? `Giving ${sampleDeduction} for sample. Remaining: ${remaining} in stock.` : "Full stock available")
                                        : `Deficit in stock. Giving ${sampleDeduction} for sample.`
                                    }));
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "7px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "13.5px",
                                    fontWeight: 500,
                                    color: "#1e293b",
                                    backgroundColor: "#ffffff",
                                    outline: "none",
                                    boxSizing: "border-box"
                                  }}
                                >
                                  <option value="yes">Yes, in stock</option>
                                  <option value="no">No, deficit</option>
                                </select>
                                {!stockForm.isStockAvailable && (
                                  <div style={{ marginTop: "6px" }}>
                                    <input
                                      type="number"
                                      min="1"
                                      placeholder="Deficit pcs"
                                      value={stockForm.notInStockCount}
                                      onChange={(e) => setStockForm({ ...stockForm, notInStockCount: e.target.value })}
                                      style={{
                                        width: "100%",
                                        padding: "6px 8px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13px",
                                        color: "#1e293b",
                                        backgroundColor: "#ffffff",
                                        outline: "none",
                                        boxSizing: "border-box"
                                      }}
                                    />
                                  </div>
                                )}
                              </td>
                              <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={stockForm.sampleDeduction}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const totalQty = selectedOrder.totalQuantity || 100;
                                    const sampleNum = Number(val) >= 0 ? Number(val) : 0;
                                    const remaining = Math.max(0, totalQty - sampleNum);
                                    setStockForm(prev => ({
                                      ...prev,
                                      sampleDeduction: val,
                                      stockDepreciation: prev.isStockAvailable
                                        ? (sampleNum > 0 ? `Giving ${sampleNum} for sample. Remaining: ${remaining} in stock.` : "Full stock available")
                                        : `Deficit in stock. Giving ${sampleNum} for sample.`
                                    }));
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "7px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "13.5px",
                                    fontWeight: 600,
                                    color: "#1e293b",
                                    backgroundColor: "#ffffff",
                                    outline: "none",
                                    textAlign: "center",
                                    boxSizing: "border-box"
                                  }}
                                />
                              </td>
                              <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                <input
                                  type="text"
                                  value={stockForm.stockDepreciation}
                                  onChange={(e) => setStockForm({ ...stockForm, stockDepreciation: e.target.value })}
                                  placeholder="e.g. Giving 5 for sample. Remaining: 95 in stock."
                                  style={{
                                    width: "100%",
                                    padding: "7px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "13.5px",
                                    fontWeight: 500,
                                    color: "#1e293b",
                                    backgroundColor: "#ffffff",
                                    outline: "none",
                                    boxSizing: "border-box"
                                  }}
                                />
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={stockForm.sampleDeduction}
                                  onChange={(e) => setStockForm({ ...stockForm, sampleDeduction: e.target.value })}
                                  style={{
                                    width: "100%",
                                    padding: "7px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "13.5px",
                                    fontWeight: 600,
                                    color: "#1e293b",
                                    backgroundColor: "#ffffff",
                                    outline: "none",
                                    textAlign: "center",
                                    boxSizing: "border-box"
                                  }}
                                />
                              </td>
                              <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={stockForm.receivedCount}
                                  onChange={(e) => setStockForm({ ...stockForm, receivedCount: e.target.value })}
                                  style={{
                                    width: "100%",
                                    padding: "7px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "13.5px",
                                    fontWeight: 600,
                                    color: "#1e293b",
                                    backgroundColor: "#ffffff",
                                    outline: "none",
                                    textAlign: "center",
                                    boxSizing: "border-box"
                                  }}
                                />
                              </td>
                              <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={stockForm.pendingCount}
                                  onChange={(e) => setStockForm({ ...stockForm, pendingCount: e.target.value })}
                                  style={{
                                    width: "100%",
                                    padding: "7px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "13.5px",
                                    fontWeight: 600,
                                    color: "#1e293b",
                                    backgroundColor: "#ffffff",
                                    outline: "none",
                                    textAlign: "center",
                                    boxSizing: "border-box"
                                  }}
                                />
                              </td>
                            </>
                          )}
                        </tr>
                      ) : (
                        selectedOrder.items.map((it, idx) => (
                          <tr key={it.id || it._id || idx}>
                            <td style={{ textAlign: "center", padding: "9px 6px", fontSize: "13.5px" }}>{idx + 1}</td>
                            <td className="item-name-cell" style={{ padding: "9px 8px", fontSize: "13.5px" }}>
                              {it.item || it.enterItem || it.itemType || "Apparel Item"}
                            </td>
                            <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.printingType || "Standard"}</td>
                            <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.sublimationOption || "-"}</td>
                            <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.fabric || "Standard Fabric"}</td>
                            <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.quantity ? `${it.quantity} pcs` : "0 pcs"}</td>
                            <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.size || "M"}</td>
                            <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.color || "-"}</td>

                            {/* STOCK CLEARANCE FIELDS IN FRONT OF COLOR */}
                            {idx === 0 && (
                              !(currentTaskTab === "staging-room" || selectedOrder.stockTaskStage === "staging_room") ? (
                                <>
                                  <td rowSpan={selectedOrder.items.length} style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                    <select
                                      value={stockForm.isStockAvailable ? "yes" : "no"}
                                      onChange={(e) => {
                                        const isAvail = e.target.value === "yes";
                                        const totalQty = selectedOrder.totalQuantity || selectedOrder.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 100;
                                        const sampleDeduction = Number(stockForm.sampleDeduction) >= 0 ? Number(stockForm.sampleDeduction) : 0;
                                        const remaining = Math.max(0, totalQty - sampleDeduction);
                                        setStockForm(prev => ({
                                          ...prev,
                                          isStockAvailable: isAvail,
                                          stockDepreciation: isAvail
                                            ? (sampleDeduction > 0 ? `Giving ${sampleDeduction} for sample. Remaining: ${remaining} in stock.` : "Full stock available")
                                            : `Deficit in stock. Giving ${sampleDeduction} for sample.`
                                        }));
                                      }}
                                      style={{
                                        width: "100%",
                                        padding: "7px 10px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13.5px",
                                        fontWeight: 500,
                                        color: "#1e293b",
                                        backgroundColor: "#ffffff",
                                        outline: "none",
                                        boxSizing: "border-box"
                                      }}
                                    >
                                      <option value="yes">Yes, in stock</option>
                                      <option value="no">No, deficit</option>
                                    </select>
                                    {!stockForm.isStockAvailable && (
                                      <div style={{ marginTop: "6px" }}>
                                        <input
                                          type="number"
                                          min="1"
                                          placeholder="Deficit pcs"
                                          value={stockForm.notInStockCount}
                                          onChange={(e) => setStockForm({ ...stockForm, notInStockCount: e.target.value })}
                                          style={{
                                            width: "100%",
                                            padding: "6px 8px",
                                            borderRadius: "6px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px",
                                            color: "#1e293b",
                                            backgroundColor: "#ffffff",
                                            outline: "none",
                                            boxSizing: "border-box"
                                          }}
                                        />
                                      </div>
                                    )}
                                  </td>
                                  <td rowSpan={selectedOrder.items.length} style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                    <input
                                      type="number"
                                      min="0"
                                      value={stockForm.sampleDeduction}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const totalQty = selectedOrder.totalQuantity || selectedOrder.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 100;
                                        const sampleNum = Number(val) >= 0 ? Number(val) : 0;
                                        const remaining = Math.max(0, totalQty - sampleNum);
                                        setStockForm(prev => ({
                                          ...prev,
                                          sampleDeduction: val,
                                          stockDepreciation: prev.isStockAvailable
                                            ? (sampleNum > 0 ? `Giving ${sampleNum} for sample. Remaining: ${remaining} in stock.` : "Full stock available")
                                            : `Deficit in stock. Giving ${sampleNum} for sample.`
                                        }));
                                      }}
                                      style={{
                                        width: "100%",
                                        padding: "7px 8px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13.5px",
                                        fontWeight: 600,
                                        color: "#1e293b",
                                        backgroundColor: "#ffffff",
                                        outline: "none",
                                        textAlign: "center",
                                        boxSizing: "border-box"
                                      }}
                                    />
                                  </td>
                                  <td rowSpan={selectedOrder.items.length} style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                    <input
                                      type="text"
                                      value={stockForm.stockDepreciation}
                                      onChange={(e) => setStockForm({ ...stockForm, stockDepreciation: e.target.value })}
                                      placeholder="e.g. Giving 5 for sample. Remaining: 95 in stock."
                                      style={{
                                        width: "100%",
                                        padding: "7px 10px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13.5px",
                                        fontWeight: 500,
                                        color: "#1e293b",
                                        backgroundColor: "#ffffff",
                                        outline: "none",
                                        boxSizing: "border-box"
                                      }}
                                    />
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td rowSpan={selectedOrder.items.length} style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                    <input
                                      type="number"
                                      min="0"
                                      value={stockForm.sampleDeduction}
                                      onChange={(e) => setStockForm({ ...stockForm, sampleDeduction: e.target.value })}
                                      style={{
                                        width: "100%",
                                        padding: "7px 8px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13.5px",
                                        fontWeight: 600,
                                        color: "#1e293b",
                                        backgroundColor: "#ffffff",
                                        outline: "none",
                                        textAlign: "center",
                                        boxSizing: "border-box"
                                      }}
                                    />
                                  </td>
                                  <td rowSpan={selectedOrder.items.length} style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                    <input
                                      type="number"
                                      min="0"
                                      value={stockForm.receivedCount}
                                      onChange={(e) => setStockForm({ ...stockForm, receivedCount: e.target.value })}
                                      style={{
                                        width: "100%",
                                        padding: "7px 8px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13.5px",
                                        fontWeight: 600,
                                        color: "#1e293b",
                                        backgroundColor: "#ffffff",
                                        outline: "none",
                                        textAlign: "center",
                                        boxSizing: "border-box"
                                      }}
                                    />
                                  </td>
                                  <td rowSpan={selectedOrder.items.length} style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                    <input
                                      type="number"
                                      min="0"
                                      value={stockForm.pendingCount}
                                      onChange={(e) => setStockForm({ ...stockForm, pendingCount: e.target.value })}
                                      style={{
                                        width: "100%",
                                        padding: "7px 8px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13.5px",
                                        fontWeight: 600,
                                        color: "#1e293b",
                                        backgroundColor: "#ffffff",
                                        outline: "none",
                                        textAlign: "center",
                                        boxSizing: "border-box"
                                      }}
                                    />
                                  </td>
                                </>
                              )
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 3. CORRECTION NOTES / REMARKS (UNDERNEATH TABLE) */}
                <div style={{ marginTop: "18px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    {currentTaskTab === "staging-room" || selectedOrder.stockTaskStage === "staging_room"
                      ? "Staging Room Remarks / Correction Notes (Mandatory if referring back):"
                      : "Correction Notes / Remarks (Mandatory if referring back to Sales):"}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={currentTaskTab === "staging-room" || selectedOrder.stockTaskStage === "staging_room"
                      ? "Add staging remarks or correction reasons if referring back..."
                      : "Add stock notes, shortages or reasons if referring back..."}
                    value={stockForm.note}
                    onChange={(e) => setStockForm({ ...stockForm, note: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13.5px",
                      color: "#1e293b",
                      backgroundColor: "#ffffff",
                      outline: "none",
                      resize: "vertical",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              {/* Audit Trail / History */}
              {selectedOrder.approvalComments && selectedOrder.approvalComments.length > 0 && (
                <div className="comment-history-list" style={{ marginTop: "20px" }}>
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
          )}

          {/* =========================================================================
              CASE 2: PRODUCTION ROOM MANAGER VIEW
              Fields:
              - Order ID
              - Employee Name
              - Company Name
              - Date of created lead
              - Attachment & Logo Name
              - Logos Needed, Printed, Cut / Given, Sample
              - Remarks / Feedback
             ========================================================================= */}
          {roleView === "production" && (
            <div className="review-form-wrapper">

              {/* SINGLE UNIFIED FORM CARD */}
              <div className="form-card">
                <div className="form-card-header">
                  <Cpu size={18} />
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
                    Logo Cutting
                  </h3>
                </div>

                {/* 1. ORDER & LEAD DETAILS */}
                <div className="form-grid-4" style={{ marginBottom: "20px" }}>
                  {/* 1. Order ID */}
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Order ID</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.orderId || "Pending Order ID"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>

                  {/* 2. Employee Name */}
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Employee Name (Sales Rep)</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.employeeName || "Sales Executive"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>

                  {/* 3. Company Name */}
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Company Name</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.companyName || selectedOrder.clientName || "-"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>

                  {/* 4. Date when the lead was created */}
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Date When Lead Was Created</label>
                    <input
                      type="text"
                      readOnly
                      value={formatLeadDate(selectedOrder.createdAt)}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                </div>

                {/* 2. ARTWORK & LOGO SPECIFICATIONS */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                  {/* Attachment */}
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                      Attachment (Artwork / Design File)
                    </label>
                    <div style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#f8fafc",
                      minHeight: "42px",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      {selectedOrder.attachment ? (
                        <a
                          href={selectedOrder.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={selectedOrder.attachmentName || "logo-artwork"}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "#2563eb",
                            fontSize: "13.5px",
                            fontWeight: 600,
                            textDecoration: "underline"
                          }}
                        >
                          <Paperclip size={15} />
                          <span>{selectedOrder.attachmentName || "Download Logo Attachment"}</span>
                        </a>
                      ) : (
                        <span style={{ fontSize: "13.5px", color: "#94a3b8" }}>
                          No file attachment uploaded for this lead
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Logo Name */}
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                      Logo Name
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.logoName || "Plain / No Logo"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                </div>

                {/* 3. LOGO CUTTING PRODUCTION DATA (4 COLUMNS) */}
                <div className="form-grid-4" style={{ marginBottom: "20px" }}>
                  {/* Field 1: Logos Needed by Client */}
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                      Logos Needed by Client
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${selectedOrder.totalQuantity || selectedOrder.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0} pcs`}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>

                  {/* Field 2: How many logos printed? */}
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                      Logos Printed (pcs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={prodForm.logosPrinted}
                      onChange={(e) => setProdForm({ ...prodForm, logosPrinted: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1e293b",
                        backgroundColor: "#ffffff",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  {/* Field 3: How many cut or given? */}
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                      Logos Cut / Given (pcs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={prodForm.logosCutGiven}
                      onChange={(e) => setProdForm({ ...prodForm, logosCutGiven: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1e293b",
                        backgroundColor: "#ffffff",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  {/* Field 4: How many giving for sample? */}
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                      Giving for Sample (pcs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={prodForm.sampleLogosCount}
                      onChange={(e) => setProdForm({ ...prodForm, sampleLogosCount: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1e293b",
                        backgroundColor: "#ffffff",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                {/* 4. CORRECTION NOTES / REMARKS (UNDERNEATH) */}
                <div style={{ marginTop: "18px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Production Remarks / Feedback (Mandatory if referring back):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add production notes or correction reasons if referring back to sales..."
                    value={prodForm.note}
                    onChange={(e) => setProdForm({ ...prodForm, note: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13.5px",
                      color: "#1e293b",
                      backgroundColor: "#ffffff",
                      outline: "none",
                      resize: "vertical",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              {/* Audit Trail / History */}
              {selectedOrder.approvalComments && selectedOrder.approvalComments.length > 0 && (
                <div className="comment-history-list" style={{ marginTop: "20px" }}>
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
                              {entry.author || "Production Manager"}
                            </span>
                            <span className="timeline-role">({entry.role || "Production"})</span>
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
          )}

          {/* =========================================================================
              CASE 3: ALL FIELDS (ADMIN MASTER VIEW)
             ========================================================================= */}
          {roleView === "all" && (
            <div className="review-form-wrapper">

              {/* SINGLE UNIFIED FORM CARD */}
              <div className="form-card">
                <div className="form-card-header">
                  <Layers size={18} />
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
                    Order Details & Approval
                  </h3>
                </div>

                {/* 1. ORDER & LEAD DETAILS (4 COLUMNS) */}
                <div className="form-grid-4" style={{ marginBottom: "20px" }}>
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Order ID</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.orderId || "-"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Sales Representative</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.employeeName || "Sales Executive"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Company Name</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.companyName || "-"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Client Name</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.clientName || "-"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Phone Number</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.phoneNumber || "-"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Lead Created Date</label>
                    <input
                      type="text"
                      readOnly
                      value={formatLeadDate(selectedOrder.createdAt)}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Order Stage</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.orderStage || "-"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Total Quantity</label>
                    <input
                      type="text"
                      readOnly
                      value={`${selectedOrder.totalQuantity || 0} pcs`}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Net Amount</label>
                    <input
                      type="text"
                      readOnly
                      value={`₹${Number(selectedOrder.netAmount || 0).toLocaleString()}`}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Delivery Date</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.deliveryDate || "-"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Logo Name / Branding</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.logoName || "-"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Company Address</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.companyAddress || "-"}
                      className="read-only-input bold"
                      style={{ fontSize: "14px" }}
                    />
                  </div>
                </div>

                {/* 2. ORDERED ITEMS TABLE */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>
                    Ordered Items ({selectedOrder.items?.length || 0})
                  </label>
                  {!selectedOrder.items || selectedOrder.items.length === 0 ? (
                    <p className="no-items-text" style={{ fontSize: "13.5px" }}>No detailed items attached.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="items-review-table stock-review-table">
                        <thead>
                          <tr>
                            <th style={{ width: "32px", textAlign: "center", padding: "10px 6px", fontSize: "12.5px" }}>#</th>
                            <th style={{ padding: "10px 8px", fontSize: "12.5px" }}>Item Description</th>
                            <th style={{ padding: "10px 8px", fontSize: "12.5px" }}>Printing Type</th>
                            <th style={{ padding: "10px 8px", fontSize: "12.5px" }}>Sublimation</th>
                            <th style={{ padding: "10px 8px", fontSize: "12.5px" }}>Fabric</th>
                            <th style={{ padding: "10px 8px", fontSize: "12.5px" }}>Quantity</th>
                            <th style={{ padding: "10px 8px", fontSize: "12.5px" }}>Size</th>
                            <th style={{ padding: "10px 8px", fontSize: "12.5px" }}>Color</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items.map((it, idx) => (
                            <tr key={it.id || idx}>
                              <td style={{ textAlign: "center", padding: "9px 6px", fontSize: "13.5px" }}>{idx + 1}</td>
                              <td className="item-name-cell" style={{ padding: "9px 8px", fontSize: "13.5px" }}>
                                {it.item || it.enterItem || it.itemType || "Apparel Item"}
                              </td>
                              <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.printingType || "-"}</td>
                              <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.sublimationOption || "-"}</td>
                              <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.fabric || "-"}</td>
                              <td style={{ padding: "9px 8px", fontSize: "13.5px", fontWeight: 600 }}>{it.quantity || 0}</td>
                              <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.size || "-"}</td>
                              <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.color || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 3. MANAGER FEEDBACK & CORRECTION NOTES */}
                <div style={{ marginTop: "18px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Manager Feedback & Correction Notes:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter instructions, adjustments, or reasons if referring back..."
                    value={managerComment}
                    onChange={(e) => setManagerComment(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13.5px",
                      color: "#1e293b",
                      backgroundColor: "#ffffff",
                      outline: "none",
                      resize: "vertical",
                      boxSizing: "border-box"
                    }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", color: "#64748b", fontSize: "12.5px" }}>
                    <User size={14} />
                    <span>
                      Reviewing as: <strong>{currentUser?.name || "Manager"}</strong> ({currentUser?.role || "Reviewer"})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TASK ACTION CONFIRMATION MODAL (Ready to Pick, Staging Room, Logo Cutting) */}
      {taskActionModal.isOpen && (
        <div className="task-modal-overlay" onClick={handleCloseTaskModal}>
          <div className="task-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal-header">
              <h3>
                {taskActionModal.actionType === "submit" ? (
                  <CheckCircle size={18} color="#10b981" />
                ) : (
                  <RotateCcw size={18} color="#ef4444" />
                )}
                {taskActionModal.taskType === "ready_to_pick" &&
                  (taskActionModal.actionType === "submit"
                    ? `Ready to Pick: Stock Clearance #${taskActionModal.order?.orderId || ""}`
                    : `Ready to Pick: Refer Back #${taskActionModal.order?.orderId || ""}`)}
                {taskActionModal.taskType === "staging_room" &&
                  (taskActionModal.actionType === "submit"
                    ? `Staging Room: Stock Approval #${taskActionModal.order?.orderId || ""}`
                    : `Staging Room: Return to Ready to Pick #${taskActionModal.order?.orderId || ""}`)}
                {taskActionModal.taskType === "logo_cutting" &&
                  (taskActionModal.actionType === "submit"
                    ? `Logo Cutting: Production Approval #${taskActionModal.order?.orderId || ""}`
                    : `Logo Cutting: Refer Back #${taskActionModal.order?.orderId || ""}`)}
              </h3>
              <button
                type="button"
                onClick={handleCloseTaskModal}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            <div className="task-modal-body">
              {/* READY TO PICK SUBMIT FIELDS */}
              {taskActionModal.taskType === "ready_to_pick" && taskActionModal.actionType === "submit" && (
                <>
                  <div className="task-modal-field">
                    <label>Is stock available?</label>
                    <select
                      value={taskActionModal.isStockAvailable ? "yes" : "no"}
                      onChange={(e) =>
                        setTaskActionModal({
                          ...taskActionModal,
                          isStockAvailable: e.target.value === "yes",
                        })
                      }
                    >
                      <option value="yes">Yes, in stock</option>
                      <option value="no">No, not enough stock</option>
                    </select>
                  </div>

                  {!taskActionModal.isStockAvailable && (
                    <div className="task-modal-field">
                      <label>How many pieces are missing? (Shortage pcs)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 20"
                        value={taskActionModal.notInStockCount || ""}
                        onChange={(e) =>
                          setTaskActionModal({
                            ...taskActionModal,
                            notInStockCount: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  <div className="task-modal-field">
                    <label>Sample pieces to give (pcs)</label>
                    <input
                      type="number"
                      min="0"
                      value={taskActionModal.sampleDeduction}
                      onChange={(e) =>
                        setTaskActionModal({
                          ...taskActionModal,
                          sampleDeduction: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="task-modal-field">
                    <label>Stock Notes / Items Taken Out</label>
                    <input
                      type="text"
                      placeholder="e.g. 5 pcs taken from stock for sample"
                      value={taskActionModal.stockDepreciation}
                      onChange={(e) =>
                        setTaskActionModal({
                          ...taskActionModal,
                          stockDepreciation: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}

              {/* STAGING ROOM SUBMIT FIELDS */}
              {taskActionModal.taskType === "staging_room" && taskActionModal.actionType === "submit" && (
                <>
                  <div className="task-modal-field">
                    <label>Given for Sample (pcs)</label>
                    <input
                      type="number"
                      value={taskActionModal.sampleDeduction}
                      onChange={(e) =>
                        setTaskActionModal({
                          ...taskActionModal,
                          sampleDeduction: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="task-modal-field">
                    <label>How many received at staging? (pcs)</label>
                    <input
                      type="number"
                      min="0"
                      value={taskActionModal.receivedCount}
                      onChange={(e) =>
                        setTaskActionModal({
                          ...taskActionModal,
                          receivedCount: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="task-modal-field">
                    <label>Pending if any (pcs)</label>
                    <input
                      type="number"
                      min="0"
                      value={taskActionModal.pendingCount}
                      onChange={(e) =>
                        setTaskActionModal({
                          ...taskActionModal,
                          pendingCount: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}

              {/* LOGO CUTTING SUBMIT FIELDS */}
              {taskActionModal.taskType === "logo_cutting" && taskActionModal.actionType === "submit" && (
                <>
                  <div className="task-modal-field">
                    <label>How many logos printed? (pcs)</label>
                    <input
                      type="number"
                      min="0"
                      value={taskActionModal.logosPrinted}
                      onChange={(e) =>
                        setTaskActionModal({
                          ...taskActionModal,
                          logosPrinted: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="task-modal-field">
                    <label>How many cut or given? (pcs)</label>
                    <input
                      type="number"
                      min="0"
                      value={taskActionModal.logosCutGiven}
                      onChange={(e) =>
                        setTaskActionModal({
                          ...taskActionModal,
                          logosCutGiven: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="task-modal-field">
                    <label>How many giving for sample? (pcs)</label>
                    <input
                      type="number"
                      min="1"
                      value={taskActionModal.sampleLogosCount}
                      onChange={(e) =>
                        setTaskActionModal({
                          ...taskActionModal,
                          sampleLogosCount: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}

              {/* REFER BACK NOTES (Required for all refer-backs) */}
              {taskActionModal.actionType === "refer_back" && (
                <div className="task-modal-field">
                  <label>Mandatory Correction / Refer Back Notes *</label>
                  <textarea
                    rows={4}
                    placeholder="Provide specific notes and details on why this order is being referred back..."
                    value={taskActionModal.note}
                    onChange={(e) =>
                      setTaskActionModal({
                        ...taskActionModal,
                        note: e.target.value,
                      })
                    }
                  />
                </div>
              )}
            </div>

            <div className="task-modal-footer">
              <button
                type="button"
                onClick={handleCloseTaskModal}
                style={{
                  background: "#e2e8f0",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "#475569",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTaskModal}
                disabled={submittingAction}
                style={{
                  background: taskActionModal.actionType === "submit" ? "#10b981" : "#ef4444",
                  border: "none",
                  padding: "8px 20px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "#ffffff",
                }}
              >
                {submittingAction
                  ? "Processing..."
                  : taskActionModal.actionType === "submit"
                    ? "Confirm & Submit"
                    : "Confirm Refer Back"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

