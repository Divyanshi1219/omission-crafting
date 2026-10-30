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
  Paperclip,
  Upload,
  Printer,
  Scissors,
  Save,
  X
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
        { key: "logo-printing", label: "Logo Printing", path: "/tasks/logo-printing" },
        { key: "logo-cutting", label: "Logo Cutting", path: "/tasks/logo-cutting" },
      ];
    }
    return [
      { key: "all", label: "ALL", path: "/tasks/all" },
      { key: "verification", label: "Verification", path: "/tasks/verification" },
      { key: "ready-to-pick", label: "Ready to Pick", path: "/tasks/ready-to-pick" },
      { key: "staging-room", label: "Staging Room", path: "/tasks/staging-room" },
      { key: "logo-printing", label: "Logo Printing", path: "/tasks/logo-printing" },
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
      stockDepreciation: order.stockTaskData?.stockDepreciation || `${Math.max(0, totalQty - sampleQty)} pcs`,
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
    receivedNoOfLogos: "yes",
    logosPrinted: "",
    logosGivenForCutting: "",
    logosReceivedForCutting: "",
    logosForPrinting: "",
    sampleLogosCount: 0,
    note: "",
  });

  useEffect(() => {
    if (selectedOrder) {
      const prevData = selectedOrder.productionTaskData || {};
      const isSubmitted = Boolean(prevData.printingSubmitted);
      const printed = (isSubmitted && prevData.logosPrinted !== undefined && prevData.logosPrinted !== null && prevData.logosPrinted !== "")
        ? prevData.logosPrinted
        : "";
      const givenForCut = (isSubmitted && (prevData.logosGivenForCutting !== undefined || prevData.logosCutGiven !== undefined))
        ? (prevData.logosGivenForCutting ?? prevData.logosCutGiven)
        : "";
      const recForCut = prevData.logosReceivedForCutting !== undefined && prevData.logosReceivedForCutting !== null ? prevData.logosReceivedForCutting : "";
      const forPrint = prevData.logosForPrinting !== undefined && prevData.logosForPrinting !== null ? prevData.logosForPrinting : "";
      const sampleCount = prevData.sampleLogosCount !== undefined && prevData.sampleLogosCount !== null ? prevData.sampleLogosCount : 0;
      const recLogos = prevData.receivedNoOfLogos !== undefined ? (prevData.receivedNoOfLogos === false || prevData.receivedNoOfLogos === "no" ? "no" : "yes") : "yes";

      setProdForm({
        receivedNoOfLogos: recLogos,
        logosPrinted: printed,
        logosGivenForCutting: givenForCut,
        logosReceivedForCutting: recForCut,
        logosForPrinting: forPrint,
        sampleLogosCount: sampleCount,
        note: prevData.note || "",
      });
    }
  }, [selectedOrder]);

  // Per-item stock verification state (for Verification & previous stage review)
  const [itemsStockData, setItemsStockData] = useState([]);

  // Ready to pick state
  const [readyToPickReceived, setReadyToPickReceived] = useState("yes"); // "yes" | "no"
  const [readyToPickAttachments, setReadyToPickAttachments] = useState([]); // [{ name, url, size, type }]
  const [readyToPickNotReceivedCount, setReadyToPickNotReceivedCount] = useState("");

  // Staging room state
  const [stagingSampleCorrect, setStagingSampleCorrect] = useState("yes"); // "yes" | "no"
  const [stagingNotReceivedCount, setStagingNotReceivedCount] = useState("");

  // Stock note for remarks / feedback
  const [stockNote, setStockNote] = useState("");

  // Helper to determine exact stock stage of an order
  const getStockStage = (order) => {
    if (!order) return "verification";
    if (order.stockTaskStage === "completed") return "completed";
    if (order.stockTaskStage === "staging_room") return "staging_room";
    if (
      order.stockTaskStage === "ready_to_pick" ||
      order.stockTaskData?.verificationSubmitted === true
    ) {
      return "ready_to_pick";
    }
    return "verification";
  };

  // Helper for stock ALL view stage badges
  const getStageBadgeInfo = (order) => {
    const stage = getStockStage(order);
    if (stage === "completed") return { label: "Completed", color: "#059669", bg: "#f8fafc", border: "#cbd5e1" };
    if (stage === "staging_room") return { label: "Staging Room", color: "#334155", bg: "#f8fafc", border: "#cbd5e1" };
    if (stage === "ready_to_pick") return { label: "Ready to Pick", color: "#334155", bg: "#f8fafc", border: "#cbd5e1" };
    return { label: "Verification", color: "#334155", bg: "#f8fafc", border: "#cbd5e1" };
  };

  // Helper to determine exact production stage of an order
  const getProductionStage = (order) => {
    if (!order) return "logo_printing";
    if (order.productionTaskStage === "completed") {
      return "completed";
    }

    // Only move to logo_cutting if logo printing has been submitted or stage is logo_cutting
    if (
      order.productionTaskStage === "logo_cutting" ||
      order.productionTaskData?.printingSubmitted === true ||
      order.productionTaskData?.submittedToLogoCutting === true
    ) {
      return "logo_cutting";
    }

    // Default starting stage for production is ALWAYS logo_printing
    return "logo_printing";
  };

  // Helper for production ALL view stage badges
  const getProductionStageBadgeInfo = (order) => {
    const stage = getProductionStage(order);
    if (stage === "completed") return { label: "Completed", color: "#059669", bg: "#f8fafc", border: "#cbd5e1" };
    if (stage === "logo_cutting") return { label: "Logo Cutting", color: "#334155", bg: "#f8fafc", border: "#cbd5e1" };
    return { label: "Logo Printing", color: "#334155", bg: "#f8fafc", border: "#cbd5e1" };
  };

  useEffect(() => {
    if (selectedOrder) {
      const items = Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0
        ? selectedOrder.items
        : [{ item: selectedOrder.item || "Apparel Item", quantity: selectedOrder.totalQuantity || 100 }];

      const prevItemsStockData = selectedOrder.stockTaskData?.itemsStockData || [];

      const initializedItemsData = items.map((it, idx) => {
        const saved = prevItemsStockData[idx] || {};
        const isAvail = saved.isStockAvailable !== undefined ? saved.isStockAvailable : (selectedOrder.stockTaskData?.isStockAvailable !== false);
        const sampleCount = saved.sampleDeduction !== undefined ? Number(saved.sampleDeduction) || 0 : (idx === 0 ? (Number(selectedOrder.stockTaskData?.sampleDeduction) || 0) : 0);
        const deficitCount = saved.notInStockCount !== undefined ? saved.notInStockCount : (selectedOrder.stockTaskData?.notInStockCount || "");
        const qty = Number(it.quantity) || 0;
        const deficitNum = Number(deficitCount) || 0;
        const rem = isAvail ? Math.max(0, qty - sampleCount) : Math.max(0, qty - deficitNum - sampleCount);

        let defaultDeprec = saved.stockDepreciation;
        if (!defaultDeprec || /full\s*stock|deficit|giving|available/i.test(defaultDeprec)) {
          defaultDeprec = `${rem} pcs`;
        }

        return {
          id: it.id || it._id || idx,
          item: it.item || it.enterItem || it.itemType || "Apparel Item",
          printingType: it.printingType || "",
          sublimationOption: it.sublimationOption || it.sublimation || "",
          fabric: it.fabric || "-",
          quantity: it.quantity || 0,
          size: it.size || "M",
          color: it.color || "-",
          isStockAvailable: isAvail,
          notInStockCount: deficitCount,
          sampleDeduction: sampleCount,
          stockDepreciation: defaultDeprec,
        };
      });

      setItemsStockData(initializedItemsData);

      // Ready to Pick state
      setReadyToPickReceived(selectedOrder.stockTaskData?.readyToPickReceived === false ? "no" : "yes");
      setReadyToPickAttachments(selectedOrder.stockTaskData?.readyToPickAttachments || []);
      setReadyToPickNotReceivedCount(selectedOrder.stockTaskData?.readyToPickNotReceivedCount || "");

      // Staging Room state
      setStagingSampleCorrect(selectedOrder.stockTaskData?.stagingSampleCorrect === false ? "no" : "yes");
      setStagingNotReceivedCount(selectedOrder.stockTaskData?.stagingNotReceivedCount || "");

      // Reset stockNote
      setStockNote("");
    }
  }, [selectedOrder]);

  const handleItemStockChange = (idx, field, value) => {
    setItemsStockData((prev) => {
      const copy = [...prev];
      const current = { ...copy[idx], [field]: value };

      if (field !== "stockDepreciation") {
        const qty = Number(current.quantity) || 0;
        const sample = Number(field === "sampleDeduction" ? value : current.sampleDeduction) || 0;
        const isAvail = field === "isStockAvailable" ? (value === true || value === "yes") : (current.isStockAvailable !== false);
        const deficit = field === "notInStockCount" ? value : current.notInStockCount;
        const deficitNum = Number(deficit) || 0;

        current.isStockAvailable = isAvail;
        if (isAvail) {
          current.notInStockCount = "";
          const rem = Math.max(0, qty - sample);
          current.stockDepreciation = `${rem} pcs`;
        } else {
          current.notInStockCount = deficit;
          const rem = Math.max(0, qty - deficitNum - sample);
          current.stockDepreciation = `${rem} pcs`;
        }
      }

      copy[idx] = current;
      return copy;
    });
  };

  const handleMultiFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setReadyToPickAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            url: reader.result,
            size: (file.size / 1024).toFixed(1) + " KB",
            type: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveReadyToPickAttachment = (idxToRemove) => {
    setReadyToPickAttachments((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleExecutePageAction = async (actionType) => {
    if (!selectedOrder) return;
    const orderId = selectedOrder._id || selectedOrder.id;

    if (roleView === "production" || currentTaskTab === "logo-printing" || currentTaskTab === "logo-cutting") {
      if (currentTaskTab === "all") {
        alert("Cannot submit or refer back from ALL view. Please select Logo Printing or Logo Cutting.");
        return;
      }

      const activeProdStage = currentTaskTab === "logo-printing"
        ? "logo_printing"
        : "logo_cutting";

      if (actionType === "submit" && activeProdStage === "logo_printing") {
        if (prodForm.logosPrinted === "" || prodForm.logosGivenForCutting === "") {
          alert("Please fill in Printed (pcs) and For Cutting (pcs) before submitting.");
          return;
        }
      }

      if (actionType === "submit" && activeProdStage === "logo_cutting" && prodForm.receivedNoOfLogos === "no") {
        alert("Logos marked as not received. Please refer back to Logo Printing.");
        return;
      }

      if (actionType === "refer_back" && !prodForm.note.trim()) {
        alert(
          activeProdStage === "logo_printing"
            ? "Please provide production remarks/feedback explaining why this order is being referred back to Sales."
            : "Please provide production remarks/feedback explaining why this order is being referred back to Logo Printing."
        );
        return;
      }

      setSubmittingAction(true);
      try {
        const payload = {
          action: actionType,
          stage: activeProdStage,
          comment: prodForm.note.trim(),
          author: currentUser?.name || "Marcus Vance",
          productionTaskData: {
            printingSubmitted: activeProdStage === "logo_printing" ? (actionType === "submit") : true,
            receivedNoOfLogos: prodForm.receivedNoOfLogos !== "no",
            logosPrinted: prodForm.logosPrinted !== "" ? Number(prodForm.logosPrinted) : "",
            logosGivenForCutting: prodForm.logosGivenForCutting !== "" ? Number(prodForm.logosGivenForCutting) : "",
            logosCutGiven: prodForm.logosGivenForCutting !== "" ? Number(prodForm.logosGivenForCutting) : "",
            logosReceivedForCutting: Number(prodForm.logosReceivedForCutting) || Number(prodForm.logosGivenForCutting) || 0,
            logosForPrinting: Number(prodForm.logosForPrinting) || 0,
            sampleLogosCount: Number(prodForm.sampleLogosCount) || 0,
            note: prodForm.note.trim(),
          }
        };

        const res = await api.patch(`/api/leads/${orderId}/production-task`, payload);
        if (res.data?.success) {
          if (actionType === "save") {
            showToast(`Order #${selectedOrder.orderId || "Order"} production task saved successfully!`);
            if (res.data.data) {
              setSelectedOrder(res.data.data);
            }
            fetchOrders();
            return;
          }
          showToast(
            actionType === "submit"
              ? (activeProdStage === "logo_printing"
                  ? `Order #${selectedOrder.orderId || "Order"} submitted to Logo Cutting!`
                  : `Order #${selectedOrder.orderId || "Order"} logo cutting cleared & approved!`)
              : (activeProdStage === "logo_cutting"
                  ? `Order #${selectedOrder.orderId || "Order"} referred back to Logo Printing.`
                  : `Order #${selectedOrder.orderId || "Order"} referred back to Sales.`)
          );
          setSelectedOrder(null);
          setManagerComment("");
          setSearchParams({});
          navigate(activeProdStage === "logo_printing" && actionType === "submit" ? "/tasks/logo-cutting" : "/tasks/all");
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
    if (roleView === "stock" || isStockProfile) {
      if (currentTaskTab === "all") {
        alert("Cannot submit or refer back from ALL view. Please select the specific stage (Verification, Ready to Pick, or Staging Room).");
        return;
      }

      const activeStage = currentTaskTab === "verification"
        ? "verification"
        : currentTaskTab === "ready-to-pick"
        ? "ready_to_pick"
        : "staging_room";

      setSubmittingAction(true);
      try {
        let payload;

        if (activeStage === "verification") {
          if (actionType === "refer_back" && !stockNote.trim()) {
            alert("Please provide correction notes explaining why this order is being referred back to Sales.");
            setSubmittingAction(false);
            return;
          }

          const totalQty = itemsStockData.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
          const totalDeficit = itemsStockData.reduce((s, it) => s + (it.isStockAvailable === false ? (Number(it.notInStockCount) || 0) : 0), 0);
          const totalSample = itemsStockData.reduce((s, it) => s + (Number(it.sampleDeduction) || 0), 0);
          const allAvailable = itemsStockData.every(it => it.isStockAvailable !== false);
          const totalRem = Math.max(0, totalQty - totalDeficit - totalSample);
          const overallDeprec = `${totalRem} pcs`;

          payload = {
            action: actionType,
            stage: "verification",
            comment: stockNote.trim(),
            author: currentUser?.name || "Elena Rostova",
            stockTaskData: {
              itemsStockData,
              isStockAvailable: allAvailable,
              sampleDeduction: totalSample,
              stockDepreciation: overallDeprec,
              verificationSubmitted: actionType === "submit",
              verifiedAt: new Date(),
            }
          };
        } else if (activeStage === "ready_to_pick") {
          if (actionType === "submit" && readyToPickReceived === "no") {
            alert("Sample is marked as not received. Please refer back to Verification or mark sample as received before submitting to Staging Room.");
            setSubmittingAction(false);
            return;
          }
          if (actionType === "refer_back" && !stockNote.trim()) {
            alert("Please provide correction notes explaining why this order is being referred back to Verification.");
            setSubmittingAction(false);
            return;
          }

          payload = {
            action: actionType,
            stage: "ready_to_pick",
            comment: stockNote.trim(),
            author: currentUser?.name || "Elena Rostova",
            stockTaskData: {
              readyToPickReceived: readyToPickReceived === "yes",
              readyToPickAttachments: readyToPickReceived === "yes" ? readyToPickAttachments : [],
              readyToPickNotReceivedCount: readyToPickReceived === "no" ? (Number(readyToPickNotReceivedCount) || 0) : 0,
              readyToPickSubmitted: actionType === "submit",
              readyToPickAt: new Date(),
            }
          };
        } else if (activeStage === "staging_room") {
          if (actionType === "submit" && stagingSampleCorrect === "no") {
            alert("Sample count is marked as incorrect. Please refer back to Ready to Pick or verify sample count before submitting clearance.");
            setSubmittingAction(false);
            return;
          }
          if (actionType === "refer_back" && !stockNote.trim()) {
            alert("Please provide correction notes explaining why this order is being referred back to Ready to Pick.");
            setSubmittingAction(false);
            return;
          }

          payload = {
            action: actionType,
            stage: "staging_room",
            comment: stockNote.trim(),
            author: currentUser?.name || "Elena Rostova",
            stockTaskData: {
              stagingSampleCorrect: stagingSampleCorrect === "yes",
              stagingNotReceivedCount: stagingSampleCorrect === "no" ? (Number(stagingNotReceivedCount) || 0) : 0,
              stagingSubmitted: actionType === "submit",
              stagingApprovedAt: new Date(),
            }
          };
        }

        const res = await api.patch(`/api/leads/${orderId}/stock-task`, payload);
        if (res.data?.success) {
          if (actionType === "save") {
            showToast(`Order #${selectedOrder.orderId || "Order"} stock task saved successfully!`);
            if (res.data.data) {
              setSelectedOrder(res.data.data);
            }
            fetchOrders();
            return;
          }
          if (activeStage === "verification") {
            showToast(
              actionType === "submit"
                ? `Order #${selectedOrder.orderId || "Order"} verified and moved to Ready to Pick!`
                : `Order #${selectedOrder.orderId || "Order"} referred back to Sales.`
            );
            setSelectedOrder(null);
            setSearchParams({});
            navigate(actionType === "submit" ? "/tasks/ready-to-pick" : "/tasks/all");
            fetchOrders();
          } else if (activeStage === "ready_to_pick") {
            showToast(
              actionType === "submit"
                ? `Order #${selectedOrder.orderId || "Order"} moved to Staging Room!`
                : `Order #${selectedOrder.orderId || "Order"} referred back to Verification.`
            );
            setSelectedOrder(null);
            setSearchParams({});
            navigate(actionType === "submit" ? "/tasks/staging-room" : "/tasks/verification");
            fetchOrders();
          } else {
            showToast(
              actionType === "submit"
                ? `Order #${selectedOrder.orderId || "Order"} stock clearance approved!`
                : `Order #${selectedOrder.orderId || "Order"} referred back to Ready to Pick.`
            );
            setSelectedOrder(null);
            setSearchParams({});
            navigate(actionType === "submit" ? "/tasks/all" : "/tasks/ready-to-pick");
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
          const totalQty = order.totalQuantity || order.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 100;
          const rem = Math.max(0, totalQty - (Number(sampleDeduction) || 0));
          const payload = {
            action: actionType,
            stage: "ready_to_pick",
            comment: note.trim(),
            author: currentUser?.name || "Elena Rostova",
            stockTaskData: {
              isStockAvailable,
              sampleDeduction: Number(sampleDeduction) >= 0 ? Number(sampleDeduction) : 0,
              stockDepreciation: stockDepreciation.trim() || `${rem} pcs`,
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

  const formatPrintingType = (pt) => {
    if (!pt) return "-";
    const s = String(pt).trim();
    if (s.toLowerCase() === "dtf") return "DTF";
    if (s.toLowerCase() === "sublimation") return "Sublimation";
    if (s.toLowerCase() === "embroidery") return "Embroidery";
    return s;
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
    if (currentTaskTab === "logo-printing" || currentTaskTab === "logo-cutting" || isProdProfile) {
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
      if (order.productionApproval?.status === "Referred Back") return "Referred Back";
      // Production is ONLY approved once productionTaskStage is completed
      if (order.productionTaskStage === "completed") return "Approved";
      return "Pending";
    }
    if (roleView === "stock" || isStockProfile) {
      if (order.stockApproval?.status === "Referred Back") return "Referred Back";
      // Stock is ONLY approved once stockTaskStage is completed
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
          (!o.leadApproval && o.approvalStatus === "Approved") ||
          o.subStage === "dtf-pending" ||
          o.subStage === "printing" ||
          o.approvalComments?.some((c) => c.role === "Lead Manager" && c.status === "Approved")
      );
    }
    return orders;
  }, [orders, isStockProfile, isProdProfile]);

  // Filtered orders for the active task tab
  const filteredOrders = useMemo(() => {
    return visibleOrders.filter((order) => {
      // Direct tab-specific matching
      if (currentTaskTab === "logo-printing") {
        if (getProductionStage(order) !== "logo_printing") return false;
      } else if (currentTaskTab === "logo-cutting") {
        if (getProductionStage(order) !== "logo_cutting") return false;
      } else if (currentTaskTab === "verification") {
        if (getStockStage(order) !== "verification") return false;
      } else if (currentTaskTab === "ready-to-pick") {
        if (getStockStage(order) !== "ready_to_pick") return false;
      } else if (currentTaskTab === "staging-room") {
        if (getStockStage(order) !== "staging_room") return false;
      } else if (currentTaskTab === "all") {
        const orderStatus = getOrderTaskStatus(order).toLowerCase();
        if (isProdProfile || roleView === "production") {
          const prodStage = getProductionStage(order);
          if (statusTab === "pending" && (prodStage === "completed" || orderStatus !== "pending")) return false;
          if (statusTab === "referred-back" && orderStatus !== "referred back") return false;
          if (statusTab === "approved" && (prodStage !== "completed" && orderStatus !== "approved")) return false;
        } else if (isStockProfile || roleView === "stock") {
          const stockStage = getStockStage(order);
          if (statusTab === "pending" && (stockStage === "completed" || orderStatus !== "pending")) return false;
          if (statusTab === "referred-back" && orderStatus !== "referred back") return false;
          if (statusTab === "approved" && (stockStage !== "completed" && orderStatus !== "approved")) return false;
        } else {
          // Admin Master View
          if (statusTab === "pending" && orderStatus !== "pending") return false;
          if (statusTab === "referred-back" && orderStatus !== "referred back") return false;
          if (statusTab === "approved" && orderStatus !== "approved") return false;
        }
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
                    ? "Search verification..."
                    : currentTaskTab === "ready-to-pick"
                    ? "Search ready to pick..."
                    : currentTaskTab === "staging-room"
                      ? "Search staging room..."
                      : currentTaskTab === "logo-printing"
                        ? "Search logo printing..."
                        : currentTaskTab === "logo-cutting"
                          ? "Search logo cutting..."
                          : "Search tasks..."
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
                      <th>Items</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  )}

                  {/* READY TO PICK TABLE HEADERS */}
                  {currentTaskTab === "ready-to-pick" && (
                    <tr>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Company Name</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Stock Status</th>
                      <th>For Sample</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  )}

                  {/* STAGING ROOM TABLE HEADERS */}
                  {currentTaskTab === "staging-room" && (
                    <tr>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Company Name</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>For Sample</th>
                      <th>Sample Received</th>
                      <th>Sample Files</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  )}

                  {/* LOGO PRINTING TABLE HEADERS */}
                  {currentTaskTab === "logo-printing" && (
                    <tr>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Company Name</th>
                      <th>Date</th>
                      <th>Attachments</th>
                      <th>Logo Name</th>
                      <th>Needed</th>
                      <th>Printed</th>
                      <th>For Cutting</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  )}

                  {/* LOGO CUTTING TABLE HEADERS */}
                  {currentTaskTab === "logo-cutting" && (
                    <tr>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Company Name</th>
                      <th>Date</th>
                      <th>Attachments</th>
                      <th>Logo Name</th>
                      <th>Printed</th>
                      <th>For Cutting</th>
                      <th>Received</th>
                      <th>For Printing</th>
                      <th>For Sample</th>
                      <th>Status</th>
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
                      <th>Date</th>
                      <th>Stage</th>
                      <th>Items</th>
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
                      <th>Date</th>
                      <th>Stage</th>
                      <th>Logo Name</th>
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
                        <ClipboardCheck size={36} color="#94a3b8" style={{ marginBottom: "8px", display: "inline-block" }} />
                        <div style={{ fontWeight: 600, fontSize: "14px", color: "#64748b" }}>
                          No Orders Found
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
                         1. VERIFICATION (Stock Room Manager Task)
                         ========================================================================= */
                      if (currentTaskTab === "verification") {
                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                            style={{ cursor: "pointer" }}
                            title="Click to view and verify stock"
                          >
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
                              <span style={{ color: "#64748b", fontSize: "13px" }}>{dateStr}</span>
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
                              <span className={`status-pill ${st.toLowerCase().replace(/\s+/g, "-")}`}>
                                <span className="status-dot"></span>
                                {st}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className="task-action-btn-group">
                                <button
                                  type="button"
                                  className="action-btn submit-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOrder(order);
                                  }}
                                  title="Verify Stock"
                                >
                                  <CheckSquare size={13} />
                                  Verify
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      /* =========================================================================
                         2. READY TO PICK (Stock Room Manager Task)
                         ========================================================================= */
                      if (currentTaskTab === "ready-to-pick") {
                        const isAvail = order.stockTaskData?.isStockAvailable !== false;
                        const sampleDeduction = order.stockTaskData?.sampleDeduction !== undefined ? Number(order.stockTaskData.sampleDeduction) : 0;

                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                            style={{ cursor: "pointer" }}
                            title="Click to view ready to pick details"
                          >
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
                              <span style={{ color: "#64748b", fontSize: "13px" }}>{dateStr}</span>
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
                              <span style={{ color: isAvail ? "#059669" : "#dc2626", fontWeight: 600, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                {isAvail ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                                {isAvail ? "In Stock (Yes)" : `Deficit (${order.stockTaskData?.notInStockCount || "0"} pcs)`}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px", fontWeight: 600 }}>
                                {sampleDeduction} pcs
                              </span>
                            </td>
                            <td>
                              <span className={`status-pill ${st.toLowerCase().replace(/\s+/g, "-")}`}>
                                <span className="status-dot"></span>
                                {st}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className="task-action-btn-group">
                                <button
                                  type="button"
                                  className="action-btn submit-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOrder(order);
                                  }}
                                  title="Pick & Attach Sample"
                                >
                                  <Package size={13} />
                                  Pick
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      /* =========================================================================
                         3. STAGING ROOM (Stock Room Manager Task)
                         ========================================================================= */
                      if (currentTaskTab === "staging-room") {
                        const sampleDeduction = order.stockTaskData?.sampleDeduction !== undefined ? Number(order.stockTaskData.sampleDeduction) : 0;
                        const sampleReceived = order.stockTaskData?.readyToPickReceived !== false;
                        const attCount = order.stockTaskData?.readyToPickAttachments?.length || 0;

                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                            style={{ cursor: "pointer" }}
                            title="Click to view staging details"
                          >
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
                              <span style={{ color: "#64748b", fontSize: "13px" }}>{dateStr}</span>
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
                              <span style={{ color: "#334155", fontSize: "13px", fontWeight: 600 }}>
                                {sampleDeduction} pcs
                              </span>
                            </td>
                            <td>
                              <span style={{ color: sampleReceived ? "#059669" : "#dc2626", fontSize: "13px", fontWeight: 600 }}>
                                {sampleReceived ? "Yes, Received" : "Not Received"}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#2563eb", fontSize: "12.5px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Paperclip size={12} /> {attCount} file{attCount === 1 ? "" : "s"}
                              </span>
                            </td>
                            <td>
                              <span className={`status-pill ${st.toLowerCase().replace(/\s+/g, "-")}`}>
                                <span className="status-dot"></span>
                                {st}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className="task-action-btn-group">
                                <button
                                  type="button"
                                  className="action-btn submit-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOrder(order);
                                  }}
                                  title="Check & Verify Sample"
                                >
                                  <Boxes size={13} />
                                  Check
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      /* =========================================================================
                         3. LOGO PRINTING (Production Lead Task)
                         ========================================================================= */
                      if (currentTaskTab === "logo-printing") {
                        const hasPrinted = order.productionTaskData?.logosPrinted !== undefined && order.productionTaskData?.logosPrinted !== "" && order.productionTaskData?.logosPrinted !== null;
                        const logosPrinted = hasPrinted ? `${order.productionTaskData.logosPrinted} pcs` : "-";

                        const hasCutting = (order.productionTaskData?.logosGivenForCutting !== undefined && order.productionTaskData?.logosGivenForCutting !== "" && order.productionTaskData?.logosGivenForCutting !== null)
                          || (order.productionTaskData?.logosCutGiven !== undefined && order.productionTaskData?.logosCutGiven !== "" && order.productionTaskData?.logosCutGiven !== null);
                        const cuttingVal = order.productionTaskData?.logosGivenForCutting ?? order.productionTaskData?.logosCutGiven;
                        const logosGivenForCutting = hasCutting ? `${cuttingVal} pcs` : "-";
                        const logoDesignFile = order.logoDesign || order.attachment;
                        const logoDesignName = order.logoDesignName || order.attachmentName || "Logo Design";
                        const digitalDesignFile = order.digitalDesign;
                        const digitalDesignName = order.digitalDesignName || "Digital Design";

                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                            style={{ cursor: "pointer" }}
                            title="Click to review and print logos"
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
                              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                                {order.companyName || order.clientName || "-"}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#64748b", fontSize: "13px" }}>{dateStr}</span>
                            </td>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                {logoDesignFile ? (
                                  <a
                                    href={logoDesignFile}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={logoDesignName}
                                    onClick={(e) => e.stopPropagation()}
                                    title={logoDesignName}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      color: "#2563eb",
                                      fontSize: "12px",
                                      textDecoration: "underline",
                                      maxWidth: "140px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap"
                                    }}
                                  >
                                    <Paperclip size={11} style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{logoDesignName}</span>
                                  </a>
                                ) : (
                                  <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>No file</span>
                                )}

                                {digitalDesignFile ? (
                                  <a
                                    href={digitalDesignFile}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={digitalDesignName}
                                    onClick={(e) => e.stopPropagation()}
                                    title={digitalDesignName}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      color: "#2563eb",
                                      fontSize: "12px",
                                      textDecoration: "underline",
                                      maxWidth: "140px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap"
                                    }}
                                  >
                                    <Paperclip size={11} style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{digitalDesignName}</span>
                                  </a>
                                ) : (
                                  <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>No file</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px" }}>
                                {order.logoName || "Plain / No Logo"}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px" }}>
                                {totalStockQty} pcs
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px", fontWeight: 600 }}>
                                {logosPrinted}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px", fontWeight: 600 }}>
                                {logosGivenForCutting}
                              </span>
                            </td>
                            <td>
                              <span className={`status-pill ${st.toLowerCase().replace(/\s+/g, "-")}`}>
                                <span className="status-dot"></span>
                                {st}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className="task-action-btn-group">
                                <button
                                  type="button"
                                  className="action-btn submit-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOrder(order);
                                  }}
                                  title="Review & Print Logos"
                                >
                                  <Printer size={13} />
                                  Review
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      /* =========================================================================
                         4. LOGO CUTTING (Production Lead Task)
                         ========================================================================= */
                      if (currentTaskTab === "logo-cutting") {
                        const hasPrinted = order.productionTaskData?.logosPrinted !== undefined && order.productionTaskData?.logosPrinted !== "" && order.productionTaskData?.logosPrinted !== null;
                        const logosPrinted = hasPrinted ? `${order.productionTaskData.logosPrinted} pcs` : "-";

                        const hasCutting = (order.productionTaskData?.logosGivenForCutting !== undefined && order.productionTaskData?.logosGivenForCutting !== "" && order.productionTaskData?.logosGivenForCutting !== null)
                          || (order.productionTaskData?.logosCutGiven !== undefined && order.productionTaskData?.logosCutGiven !== "" && order.productionTaskData?.logosCutGiven !== null);
                        const cuttingVal = order.productionTaskData?.logosGivenForCutting ?? order.productionTaskData?.logosCutGiven;
                        const logosGivenForCutting = hasCutting ? `${cuttingVal} pcs` : "-";

                        const hasReceived = order.productionTaskData?.logosReceivedForCutting !== undefined && order.productionTaskData?.logosReceivedForCutting !== "";
                        const logosReceivedForCutting = hasReceived ? `${order.productionTaskData.logosReceivedForCutting} pcs` : logosGivenForCutting;
                        const forPrintingLogo = order.productionTaskData?.logosForPrinting || 0;
                        const sampleLogos = order.productionTaskData?.sampleLogosCount !== undefined ? order.productionTaskData.sampleLogosCount : 0;
                        const logoDesignFile = order.logoDesign || order.attachment;
                        const logoDesignName = order.logoDesignName || order.attachmentName || "Logo Design";
                        const digitalDesignFile = order.digitalDesign;
                        const digitalDesignName = order.digitalDesignName || "Digital Design";

                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                            style={{ cursor: "pointer" }}
                            title="Click to review and cut logos"
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
                              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                                {order.companyName || order.clientName || "-"}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#64748b", fontSize: "13px" }}>{dateStr}</span>
                            </td>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                {logoDesignFile ? (
                                  <a
                                    href={logoDesignFile}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={logoDesignName}
                                    onClick={(e) => e.stopPropagation()}
                                    title={logoDesignName}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      color: "#2563eb",
                                      fontSize: "12px",
                                      textDecoration: "underline",
                                      maxWidth: "130px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap"
                                    }}
                                  >
                                    <Paperclip size={11} style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{logoDesignName}</span>
                                  </a>
                                ) : (
                                  <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>No file</span>
                                )}

                                {digitalDesignFile ? (
                                  <a
                                    href={digitalDesignFile}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={digitalDesignName}
                                    onClick={(e) => e.stopPropagation()}
                                    title={digitalDesignName}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      color: "#2563eb",
                                      fontSize: "12px",
                                      textDecoration: "underline",
                                      maxWidth: "130px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap"
                                    }}
                                  >
                                    <Paperclip size={11} style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{digitalDesignName}</span>
                                  </a>
                                ) : (
                                  <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>No file</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px" }}>
                                {order.logoName || "Plain / No Logo"}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px", fontWeight: 600 }}>
                                {logosPrinted}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px", fontWeight: 600 }}>
                                {logosGivenForCutting}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px", fontWeight: 600 }}>
                                {logosReceivedForCutting}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px" }}>
                                {forPrintingLogo} pcs
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px" }}>
                                {sampleLogos} pcs
                              </span>
                            </td>
                            <td>
                              <span className={`status-pill ${st.toLowerCase().replace(/\s+/g, "-")}`}>
                                <span className="status-dot"></span>
                                {st}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className="task-action-btn-group">
                                <button
                                  type="button"
                                  className="action-btn submit-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOrder(order);
                                  }}
                                  title="Review & Cut Logos"
                                >
                                  <Scissors size={13} />
                                  Review
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
                        const stageInfo = getStageBadgeInfo(order);
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
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  backgroundColor: stageInfo.bg,
                                  color: stageInfo.color,
                                  border: `1px solid ${stageInfo.border}`,
                                }}
                              >
                                {stageInfo.label}
                              </span>
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
                                className="action-btn view-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectOrder(order);
                                }}
                                title="View order details (read-only in ALL)"
                              >
                                <Eye size={13} />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      if (roleView === "production") {
                        const prodStatus = getOrderTaskStatus(order);
                        const stageInfo = getProductionStageBadgeInfo(order);
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
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  backgroundColor: stageInfo.bg,
                                  color: stageInfo.color,
                                  border: `1px solid ${stageInfo.border}`,
                                }}
                              >
                                {stageInfo.label}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#334155", fontSize: "13px" }}>
                                {order.logoName || "Plain / No Logo"}
                              </span>
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
                                className="action-btn view-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectOrder(order);
                                }}
                                title="View order details (read-only in ALL)"
                              >
                                <Eye size={13} />
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
                <span>Back</span>
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
                  {((roleView === "stock" || roleView === "production") && currentTaskTab === "all") ? (
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#475569",
                        fontWeight: 600,
                        padding: "7px 14px",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Eye size={15} color="#64748b" /> View Only ({roleView === "production" ? getProductionStageBadgeInfo(selectedOrder).label : getStageBadgeInfo(selectedOrder).label})
                    </span>
                  ) : (
                    <>
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
                        className="btn-save-task"
                        onClick={() => handleExecutePageAction("save")}
                        disabled={submittingAction}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#ffffff",
                          color: "#0f172a",
                          border: "1px solid #cbd5e1",
                          padding: "8px 18px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: submittingAction ? "not-allowed" : "pointer",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Save size={15} />
                        <span>{submittingAction ? "Saving..." : "Save"}</span>
                      </button>
                      {!(roleView === "production" && (currentTaskTab === "logo-cutting" || getProductionStage(selectedOrder) === "logo_cutting") && prodForm.receivedNoOfLogos === "no") && (
                        <button
                          type="button"
                          className="btn-approve"
                          onClick={() => handleExecutePageAction("submit")}
                          disabled={submittingAction}
                        >
                          <CheckCircle size={15} />
                          <span>
                            {roleView === "stock"
                              ? (currentTaskTab === "verification"
                                ? "Submit to Ready to Pick"
                                : currentTaskTab === "ready-to-pick"
                                ? "Submit to Staging Room"
                                : currentTaskTab === "staging-room"
                                ? "Submit Clearance"
                                : "Submit")
                              : (currentTaskTab === "logo-printing"
                                ? "Submit to Logo Cutting"
                                : currentTaskTab === "logo-cutting"
                                ? "Submit Clearance"
                                : (selectedOrder.productionApproval?.status === "Approved" || selectedOrder.productionTaskStage === "completed")
                                ? "Update & Submit"
                                : "Submit")}
                          </span>
                        </button>
                      )}
                    </>
                  )}
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
              {(() => {
                const activeStockStage = currentTaskTab === "all"
                  ? getStockStage(selectedOrder)
                  : (currentTaskTab === "verification" ? "verification" : currentTaskTab === "ready-to-pick" ? "ready_to_pick" : "staging_room");
                const isViewOnlyStock = currentTaskTab === "all" || getStockStage(selectedOrder) === "completed";
                const stageBadge = getStageBadgeInfo(selectedOrder);
                const itemsToRender = itemsStockData.length > 0
                  ? itemsStockData
                  : (Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0
                    ? selectedOrder.items.map((it, idx) => ({
                        id: it.id || it._id || idx,
                        item: it.item || it.enterItem || it.itemType || "Apparel Item",
                        printingType: it.printingType || "",
                        sublimationOption: it.sublimationOption || it.sublimation || "",
                        fabric: it.fabric || "-",
                        quantity: it.quantity || 0,
                        size: it.size || "M",
                        color: it.color || "-",
                        isStockAvailable: true,
                        notInStockCount: "",
                        sampleDeduction: 0,
                        stockDepreciation: `${it.quantity || 0} pcs`,
                      }))
                    : [{
                        id: 0,
                        item: selectedOrder.item || "Apparel Item",
                        printingType: selectedOrder.printingType || "",
                        sublimationOption: selectedOrder.sublimationOption || selectedOrder.sublimation || "",
                        fabric: selectedOrder.fabric || "-",
                        quantity: selectedOrder.totalQuantity || 100,
                        size: "M",
                        color: "-",
                        isStockAvailable: true,
                        notInStockCount: "",
                        sampleDeduction: 0,
                        stockDepreciation: `${selectedOrder.totalQuantity || 100} pcs`,
                      }]);

                const hasSublimation = itemsToRender.some(
                  (it) =>
                    String(it.printingType || "").toLowerCase().trim() === "sublimation" ||
                    (it.sublimationOption && it.sublimationOption !== "-" && it.sublimationOption !== "") ||
                    (it.sublimation && it.sublimation !== "-" && it.sublimation !== "")
                );

                return (
                  <div className="form-card">
                    {/* Header */}
                    <div className="form-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Package size={18} />
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
                          {currentTaskTab === "verification"
                            ? "Verification"
                            : currentTaskTab === "ready-to-pick"
                            ? "Ready to Pick"
                            : currentTaskTab === "staging-room"
                            ? "Staging Room"
                            : `Overview (${stageBadge.label})`}
                        </h3>
                      </div>
                      {currentTaskTab === "all" && (
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            padding: "4px 10px",
                            borderRadius: "6px",
                            backgroundColor: "#f8fafc",
                            color: "#334155",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          Stage: {stageBadge.label}
                        </span>
                      )}
                    </div>

                    {/* 1. ORDER & LEAD DETAILS */}
                    <div className="form-grid-4" style={{ marginBottom: "20px" }}>
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

                      <div className="form-field">
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Employee Name</label>
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
                          value={selectedOrder.companyName || selectedOrder.clientName || "-"}
                          className="read-only-input bold"
                          style={{ fontSize: "14px" }}
                        />
                      </div>

                      <div className="form-field">
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Date</label>
                        <input
                          type="text"
                          readOnly
                          value={formatLeadDate(selectedOrder.createdAt)}
                          className="read-only-input bold"
                          style={{ fontSize: "14px" }}
                        />
                      </div>
                    </div>

                    {/* 2. ITEMS ATTACHED TABLE (Stage-Specific Columns) */}
                    <div className="table-responsive" style={activeStockStage === "ready_to_pick" ? { overflowX: "hidden", width: "100%" } : {}}>
                      <table className="items-review-table stock-review-table" style={activeStockStage === "ready_to_pick" ? { width: "100%", tableLayout: "fixed" } : {}}>
                        <thead>
                          {activeStockStage === "verification" ? (
                            <tr>
                              <th style={{ minWidth: "36px", textAlign: "center", padding: "10px 6px", fontSize: "12.5px" }}>S.N</th>
                              <th style={{ minWidth: "90px", padding: "10px 8px", fontSize: "12.5px" }}>Item</th>
                              <th style={{ minWidth: "75px", padding: "10px 8px", fontSize: "12.5px" }}>Printing Type</th>
                              {hasSublimation && (
                                <th style={{ minWidth: "65px", padding: "10px 8px", fontSize: "12.5px" }}>Sublimation</th>
                              )}
                              <th style={{ minWidth: "65px", padding: "10px 8px", fontSize: "12.5px" }}>Fabric</th>
                              <th style={{ minWidth: "65px", padding: "10px 8px", fontSize: "12.5px" }}>Quantity</th>
                              <th style={{ minWidth: "40px", padding: "10px 8px", fontSize: "12.5px" }}>Size</th>
                              <th style={{ minWidth: "55px", padding: "10px 8px", fontSize: "12.5px" }}>Color</th>
                              <th style={{ minWidth: "120px", padding: "10px 8px", fontSize: "12.5px" }}>Stock Available</th>
                              <th style={{ minWidth: "100px", padding: "10px 8px", fontSize: "12.5px" }}>Deficit</th>
                              <th style={{ minWidth: "110px", padding: "10px 8px", fontSize: "12.5px" }}>For Sample (pcs)</th>
                              <th style={{ minWidth: "160px", padding: "10px 8px", fontSize: "12.5px" }}>Depreciation Note</th>
                            </tr>
                          ) : activeStockStage === "ready_to_pick" ? (
                            <tr>
                              <th style={{ width: "4%", textAlign: "center", padding: "7px 3px", fontSize: "11.5px" }}>S.N</th>
                              <th style={{ width: "18%", padding: "7px 6px", fontSize: "11.5px" }}>Item</th>
                              <th style={{ width: hasSublimation ? "11%" : "14%", padding: "7px 6px", fontSize: "11.5px" }}>Printing Type</th>
                              {hasSublimation && (
                                <th style={{ width: "9%", padding: "7px 5px", fontSize: "11.5px" }}>Sublimation</th>
                              )}
                              <th style={{ width: "10%", padding: "7px 5px", fontSize: "11.5px" }}>Fabric</th>
                              <th style={{ width: "8%", padding: "7px 5px", fontSize: "11.5px" }}>Qty</th>
                              <th style={{ width: "6%", padding: "7px 4px", fontSize: "11.5px" }}>Size</th>
                              <th style={{ width: "7%", padding: "7px 5px", fontSize: "11.5px" }}>Color</th>
                              <th style={{ width: "12%", padding: "7px 5px", fontSize: "11.5px" }}>Stock Status</th>
                              <th style={{ width: "10%", padding: "7px 5px", fontSize: "11.5px" }}>For Sample</th>
                              <th style={{ width: "12%", padding: "7px 5px", fontSize: "11.5px" }}>Depreciation</th>
                            </tr>
                          ) : (
                            <tr>
                              <th style={{ minWidth: "36px", textAlign: "center", padding: "10px 6px", fontSize: "12.5px" }}>S.N</th>
                              <th style={{ minWidth: "90px", padding: "10px 8px", fontSize: "12.5px" }}>Item</th>
                              <th style={{ minWidth: "75px", padding: "10px 8px", fontSize: "12.5px" }}>Printing Type</th>
                              {hasSublimation && (
                                <th style={{ minWidth: "65px", padding: "10px 8px", fontSize: "12.5px" }}>Sublimation</th>
                              )}
                              <th style={{ minWidth: "65px", padding: "10px 8px", fontSize: "12.5px" }}>Fabric</th>
                              <th style={{ minWidth: "65px", padding: "10px 8px", fontSize: "12.5px" }}>Quantity</th>
                              <th style={{ minWidth: "40px", padding: "10px 8px", fontSize: "12.5px" }}>Size</th>
                              <th style={{ minWidth: "55px", padding: "10px 8px", fontSize: "12.5px" }}>Color</th>
                              <th style={{ minWidth: "120px", padding: "10px 8px", fontSize: "12.5px" }}>Stock Status</th>
                              <th style={{ minWidth: "100px", padding: "10px 8px", fontSize: "12.5px" }}>For Sample</th>
                              <th style={{ minWidth: "130px", padding: "10px 8px", fontSize: "12.5px" }}>Pickup Status</th>
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          {itemsToRender.map((it, idx) => {
                            const isAvail = it.isStockAvailable !== false;
                            const samplePcs = Number(it.sampleDeduction) || 0;
                            const deficitPcs = it.notInStockCount || "";
                            const deficitNum = Number(deficitPcs) || 0;
                            const rem = isAvail ? Math.max(0, (Number(it.quantity) || 0) - samplePcs) : Math.max(0, (Number(it.quantity) || 0) - deficitNum - samplePcs);
                            const rawDeprec = it.stockDepreciation;
                            const deprecNote = (!rawDeprec || /full\s*stock|deficit|giving|available/i.test(rawDeprec))
                              ? `${rem} pcs`
                              : rawDeprec;

                            return (
                              <tr key={it.id || idx}>
                                <td style={{ textAlign: "center", padding: "9px 6px", fontSize: "13.5px" }}>{idx + 1}</td>
                                <td className="item-name-cell" style={{ padding: "9px 8px", fontSize: "13.5px" }}>
                                  {it.item || it.enterItem || it.itemType || "Apparel Item"}
                                </td>
                                <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{formatPrintingType(it.printingType)}</td>
                                {hasSublimation && (
                                  <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.sublimationOption || it.sublimation || "-"}</td>
                                )}
                                <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.fabric || "-"}</td>
                                <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.quantity ? `${it.quantity} pcs` : "0 pcs"}</td>
                                <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.size || "M"}</td>
                                <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.color || "-"}</td>

                                {activeStockStage === "verification" ? (
                                  <>
                                    {/* Stock Available */}
                                    <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                      {isViewOnlyStock ? (
                                        <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "13px" }}>
                                          {isAvail ? "In Stock" : "Deficit"}
                                        </span>
                                      ) : (
                                        <select
                                          value={isAvail ? "yes" : "no"}
                                          onChange={(e) => handleItemStockChange(idx, "isStockAvailable", e.target.value === "yes")}
                                          style={{
                                            padding: "7px 10px",
                                            borderRadius: "6px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13.5px",
                                            fontWeight: 500,
                                            color: "#1e293b",
                                            backgroundColor: "#ffffff",
                                            outline: "none",
                                            width: "100%",
                                            minWidth: "115px",
                                            boxSizing: "border-box"
                                          }}
                                        >
                                          <option value="yes">In Stock</option>
                                          <option value="no">Deficit</option>
                                        </select>
                                      )}
                                    </td>

                                    {/* Depreciation / Deficit */}
                                    <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                      {isAvail ? (
                                        <span style={{ color: "#475569", fontSize: "13px", fontWeight: 500 }}>
                                          Full ({it.quantity || 0} pcs)
                                        </span>
                                      ) : (
                                        isViewOnlyStock ? (
                                          <span style={{ color: "#1e293b", fontWeight: 600, fontSize: "13px" }}>
                                            {deficitPcs ? `${deficitPcs} pcs` : "Deficit"}
                                          </span>
                                        ) : (
                                          <input
                                            type="number"
                                            min="1"
                                            placeholder="Deficit"
                                            value={deficitPcs}
                                            onChange={(e) => handleItemStockChange(idx, "notInStockCount", e.target.value)}
                                            style={{
                                              width: "100%",
                                              padding: "7px 10px",
                                              borderRadius: "6px",
                                              border: "1px solid #cbd5e1",
                                              backgroundColor: "#ffffff",
                                              fontSize: "13.5px",
                                              fontWeight: 500,
                                              color: "#1e293b",
                                              outline: "none",
                                              boxSizing: "border-box"
                                            }}
                                          />
                                        )
                                      )}
                                    </td>

                                    {/* How many given for sample */}
                                    <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                      {isViewOnlyStock ? (
                                        <span style={{ fontWeight: 600, fontSize: "13.5px", color: "#1e293b" }}>
                                          {samplePcs} pcs
                                        </span>
                                      ) : (
                                        <input
                                          type="number"
                                          min="0"
                                          value={it.sampleDeduction ?? 0}
                                          onChange={(e) => handleItemStockChange(idx, "sampleDeduction", e.target.value)}
                                          style={{
                                            width: "100%",
                                            maxWidth: "80px",
                                            padding: "7px 8px",
                                            borderRadius: "6px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13.5px",
                                            fontWeight: 500,
                                            color: "#1e293b",
                                            backgroundColor: "#ffffff",
                                            outline: "none",
                                            textAlign: "center",
                                            boxSizing: "border-box"
                                          }}
                                        />
                                      )}
                                    </td>

                                    {/* Stock Depreciation Note */}
                                    <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                      {isViewOnlyStock ? (
                                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                                          {deprecNote}
                                        </span>
                                      ) : (
                                        <input
                                          type="text"
                                          value={deprecNote}
                                          onChange={(e) => handleItemStockChange(idx, "stockDepreciation", e.target.value)}
                                          placeholder={`${rem} pcs`}
                                          style={{
                                            width: "100%",
                                            minWidth: "130px",
                                            padding: "7px 10px",
                                            borderRadius: "6px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13.5px",
                                            fontWeight: 600,
                                            color: "#1e293b",
                                            backgroundColor: "#ffffff",
                                            outline: "none",
                                            boxSizing: "border-box"
                                          }}
                                        />
                                      )}
                                    </td>
                                  </>
                                ) : activeStockStage === "ready_to_pick" ? (
                                  <>
                                    {/* Stock Status from Verification */}
                                    <td style={{ verticalAlign: "middle", padding: "7px 5px", fontSize: "12px" }}>
                                      <span style={{ color: "#1e293b", fontWeight: 600 }}>
                                        {isAvail ? "In Stock" : `Deficit (${deficitPcs || "0"})`}
                                      </span>
                                    </td>

                                    {/* Given for Sample */}
                                    <td style={{ verticalAlign: "middle", padding: "7px 5px", fontSize: "12px" }}>
                                      <span style={{ color: "#1e293b", fontWeight: 600 }}>
                                        {samplePcs} pcs
                                      </span>
                                    </td>

                                    {/* Depreciation Note */}
                                    <td style={{ verticalAlign: "middle", padding: "7px 5px", fontSize: "12px", wordBreak: "break-word" }}>
                                      <span style={{ color: "#1e293b", fontWeight: 500 }}>
                                        {deprecNote}
                                      </span>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    {/* Stock Status */}
                                    <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                      <span style={{ color: "#1e293b", fontWeight: 600, fontSize: "13px" }}>
                                        {isAvail ? "In Stock" : `Deficit (${deficitPcs || 0} pcs)`}
                                      </span>
                                    </td>

                                    {/* Given for Sample */}
                                    <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                      <span style={{ color: "#1e293b", fontWeight: 600, fontSize: "13.5px" }}>
                                        {samplePcs} pcs
                                      </span>
                                    </td>

                                    {/* Ready to Pick Status */}
                                    <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                      <span style={{ color: "#1e293b", fontWeight: 600, fontSize: "13px" }}>
                                        {selectedOrder.stockTaskData?.readyToPickReceived !== false
                                          ? "Received"
                                          : `Deficit (${selectedOrder.stockTaskData?.readyToPickNotReceivedCount || 0} pcs)`}
                                      </span>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* READY TO PICK CLEARANCE & MULTI-FILE ATTACHMENT */}
                    {activeStockStage === "ready_to_pick" && (
                      <div
                        style={{
                          marginTop: "14px",
                          paddingTop: "12px",
                          borderTop: "1px solid #e2e8f0"
                        }}
                      >

                        {/* Question: Sample Received? */}
                        <div style={{ marginBottom: "16px" }}>
                          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>
                            Sample Received?
                          </label>
                          {isViewOnlyStock ? (
                            <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "13.5px" }}>
                              {readyToPickReceived === "yes" ? "Yes" : `No (${readyToPickNotReceivedCount || 0} pcs)`}
                            </span>
                          ) : (
                            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => setReadyToPickReceived("yes")}
                                style={{
                                  padding: "8px 18px",
                                  borderRadius: "6px",
                                  fontSize: "13.5px",
                                  fontWeight: 600,
                                  border: readyToPickReceived === "yes" ? "2px solid #0f172a" : "1px solid #cbd5e1",
                                  background: "#ffffff",
                                  color: "#0f172a",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px"
                                }}
                              >
                                <CheckCircle size={15} />
                                Yes
                              </button>

                              <button
                                type="button"
                                onClick={() => setReadyToPickReceived("no")}
                                style={{
                                  padding: "8px 18px",
                                  borderRadius: "6px",
                                  fontSize: "13.5px",
                                  fontWeight: 600,
                                  border: readyToPickReceived === "no" ? "2px solid #0f172a" : "1px solid #cbd5e1",
                                  background: "#ffffff",
                                  color: "#0f172a",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px"
                                }}
                              >
                                <AlertCircle size={15} />
                                No
                              </button>
                            </div>
                          )}
                        </div>

                        {/* IF YES: Multi-file attachment option */}
                        {readyToPickReceived === "yes" && (
                          <div style={{ marginTop: "16px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>
                              Sample Attachments:
                            </label>
                            {!isViewOnlyStock && (
                              <div style={{ marginBottom: "12px" }}>
                                <input
                                  type="file"
                                  id="multiSampleUploadInput"
                                  multiple
                                  onChange={handleMultiFileUpload}
                                  style={{ display: "none" }}
                                />
                                <label
                                  htmlFor="multiSampleUploadInput"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    color: "#0f172a",
                                    fontSize: "13.5px",
                                    fontWeight: 500,
                                    cursor: "pointer"
                                  }}
                                >
                                  <Upload size={15} />
                                  Upload Files
                                </label>
                              </div>
                            )}

                            {/* Render Attached Files */}
                            {readyToPickAttachments.length > 0 ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                                {readyToPickAttachments.map((file, fIdx) => (
                                  <div
                                    key={fIdx}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      padding: "6px 12px",
                                      borderRadius: "6px",
                                      background: "#ffffff",
                                      border: "1px solid #cbd5e1",
                                      fontSize: "13px",
                                      color: "#1e293b"
                                    }}
                                  >
                                    <Paperclip size={14} color="#64748b" />
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      download={file.name}
                                      style={{ color: "#0f172a", textDecoration: "none", fontWeight: 500, maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                      title={file.name}
                                    >
                                      {file.name}
                                    </a>
                                    <span style={{ color: "#94a3b8", fontSize: "11.5px" }}>({file.size})</span>
                                    {!isViewOnlyStock && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveReadyToPickAttachment(fIdx)}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          padding: "2px",
                                          cursor: "pointer",
                                          color: "#94a3b8",
                                          display: "flex",
                                          alignItems: "center"
                                        }}
                                        title="Remove file"
                                      >
                                        <X size={14} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                                No files attached.
                              </span>
                            )}
                          </div>
                        )}

                        {/* IF NO: How many not received */}
                        {readyToPickReceived === "no" && (
                          <div style={{ marginTop: "16px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                              Quantity Not Received:
                            </label>
                            {isViewOnlyStock ? (
                              <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "14px" }}>
                                {readyToPickNotReceivedCount || 0} pcs
                              </span>
                            ) : (
                              <div style={{ maxWidth: "240px" }}>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Quantity"
                                  value={readyToPickNotReceivedCount}
                                  onChange={(e) => setReadyToPickNotReceivedCount(e.target.value)}
                                  style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "13.5px",
                                    fontWeight: 500,
                                    color: "#1e293b",
                                    background: "#ffffff",
                                    outline: "none"
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* STAGING ROOM CLEARANCE & VERIFICATION */}
                    {activeStockStage === "staging_room" && (
                      <div
                        style={{
                          marginTop: "24px",
                          paddingTop: "20px",
                          borderTop: "1px solid #e2e8f0",
                          display: "flex",
                          flexDirection: "column",
                          gap: "18px"
                        }}
                      >
                        {/* Sample Attachments */}
                        <div>
                          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>
                            Sample Attachments:
                          </label>
                          {readyToPickAttachments.length > 0 ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                              {readyToPickAttachments.map((file, fIdx) => (
                                <a
                                  key={fIdx}
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={file.name}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    background: "#ffffff",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "13px",
                                    color: "#0f172a",
                                    textDecoration: "none",
                                    fontWeight: 500
                                  }}
                                  title={file.name}
                                >
                                  <Paperclip size={14} color="#64748b" />
                                  <span style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {file.name}
                                  </span>
                                  <span style={{ color: "#94a3b8", fontSize: "11.5px" }}>({file.size})</span>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                              No sample attachments.
                            </span>
                          )}
                        </div>

                        {/* Staging Room Verification Box */}
                        <div>
                          <h4
                            style={{
                              margin: "0 0 14px 0",
                              fontSize: "15px",
                              fontWeight: 600,
                              color: "#1e293b",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px"
                            }}
                          >
                            <Boxes size={17} />
                            Staging Verification
                          </h4>

                          {/* Question: Sample Received Correct? */}
                          <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>
                              Sample Received Correct?
                            </label>
                            {isViewOnlyStock ? (
                              <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "13.5px" }}>
                                {stagingSampleCorrect === "yes" ? "Yes" : `No (${stagingNotReceivedCount || 0} pcs)`}
                              </span>
                            ) : (
                              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => setStagingSampleCorrect("yes")}
                                  style={{
                                    padding: "8px 18px",
                                    borderRadius: "6px",
                                    fontSize: "13.5px",
                                    fontWeight: 600,
                                    border: stagingSampleCorrect === "yes" ? "2px solid #0f172a" : "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    color: "#0f172a",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px"
                                  }}
                                >
                                  <CheckCircle size={15} />
                                  Yes
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setStagingSampleCorrect("no")}
                                  style={{
                                    padding: "8px 18px",
                                    borderRadius: "6px",
                                    fontSize: "13.5px",
                                    fontWeight: 600,
                                    border: stagingSampleCorrect === "no" ? "2px solid #0f172a" : "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    color: "#0f172a",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px"
                                  }}
                                >
                                  <AlertCircle size={15} />
                                  No
                                </button>
                              </div>
                            )}
                          </div>

                          {/* IF NO: How many not received */}
                          {stagingSampleCorrect === "no" && (
                            <div style={{ marginTop: "16px" }}>
                              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                                Quantity Not Received:
                              </label>
                              {isViewOnlyStock ? (
                                <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "14px" }}>
                                  {stagingNotReceivedCount || 0} pcs
                                </span>
                              ) : (
                                <div style={{ maxWidth: "240px" }}>
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="Quantity"
                                    value={stagingNotReceivedCount}
                                    onChange={(e) => setStagingNotReceivedCount(e.target.value)}
                                    style={{
                                      width: "100%",
                                      padding: "8px 12px",
                                      borderRadius: "6px",
                                      border: "1px solid #cbd5e1",
                                      fontSize: "13.5px",
                                      fontWeight: 500,
                                      color: "#1e293b",
                                      background: "#ffffff",
                                      outline: "none"
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* REMARKS */}
                    <div style={{ marginTop: "22px" }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                        Remarks:
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Enter remarks..."
                        value={stockNote}
                        onChange={(e) => setStockNote(e.target.value)}
                        disabled={isViewOnlyStock}
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
                );
              })()}

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
              {(() => {
                const activeProdStage = currentTaskTab === "all"
                  ? getProductionStage(selectedOrder)
                  : (currentTaskTab === "logo-printing" ? "logo_printing" : "logo_cutting");
                const isViewOnlyProd = currentTaskTab === "all" || getProductionStage(selectedOrder) === "completed";
                const stageBadge = getProductionStageBadgeInfo(selectedOrder);
                const totalStockQty = selectedOrder.totalQuantity || selectedOrder.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;

                const logoDesignFile = selectedOrder.logoDesign || selectedOrder.attachment;
                const logoDesignName = selectedOrder.logoDesignName || selectedOrder.attachmentName || "Logo Design";
                const digitalDesignFile = selectedOrder.digitalDesign;
                const digitalDesignName = selectedOrder.digitalDesignName || "Digital Design";

                return (
                  <div className="form-card">
                    {/* Header */}
                    <div className="form-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Cpu size={18} />
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
                          {currentTaskTab === "logo-printing"
                            ? "Logo Printing"
                            : currentTaskTab === "logo-cutting"
                            ? "Logo Cutting"
                            : `Production (${stageBadge.label})`}
                        </h3>
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: "6px",
                          background: "#f8fafc",
                          color: "#334155",
                          border: "1px solid #cbd5e1"
                        }}
                      >
                        Stage: {stageBadge.label}
                      </span>
                    </div>

                    {/* 1. ORDER & LEAD DETAILS */}
                    <div className="form-grid-4" style={{ marginBottom: "20px" }}>
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
                      <div className="form-field">
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Employee Name</label>
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
                          value={selectedOrder.companyName || selectedOrder.clientName || "-"}
                          className="read-only-input bold"
                          style={{ fontSize: "14px" }}
                        />
                      </div>
                      <div className="form-field">
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Date</label>
                        <input
                          type="text"
                          readOnly
                          value={formatLeadDate(selectedOrder.createdAt)}
                          className="read-only-input bold"
                          style={{ fontSize: "14px" }}
                        />
                      </div>
                    </div>

                    {/* STAGE 1: LOGO PRINTING FIELDS */}
                    <div style={{ marginBottom: "20px", borderTop: "1px solid #e2e8f0", paddingTop: "18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                        <Printer size={16} color="#334155" />
                        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                          {currentTaskTab === "logo-cutting" || activeProdStage === "logo_cutting"
                            ? "Data from Logo Printing"
                            : "Logo Printing"}
                        </h4>
                      </div>

                      {/* Attachments: Both Logo Design and Digital Design */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                        {/* Logo Design Attachment */}
                        <div className="form-field">
                          <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                            Logo Design
                          </label>
                          <div
                            style={{
                              padding: "8px 12px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              backgroundColor: "#ffffff",
                              minHeight: "42px",
                              display: "flex",
                              alignItems: "center"
                            }}
                          >
                            {logoDesignFile ? (
                              <a
                                href={logoDesignFile}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={logoDesignName}
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
                                <span>{logoDesignName}</span>
                              </a>
                            ) : (
                              <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                                No file
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Digital Design Attachment */}
                        <div className="form-field">
                          <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                            Digital Design
                          </label>
                          <div
                            style={{
                              padding: "8px 12px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              backgroundColor: "#ffffff",
                              minHeight: "42px",
                              display: "flex",
                              alignItems: "center"
                            }}
                          >
                            {digitalDesignFile ? (
                              <a
                                href={digitalDesignFile}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={digitalDesignName}
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
                                <span>{digitalDesignName}</span>
                              </a>
                            ) : (
                              <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                                No file
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Logo Name, Needs by Client, Printed, Giving for Cutting */}
                      <div className="form-grid-4">
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

                        {/* Logo Needs by Client */}
                        <div className="form-field">
                          <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                            Logos Needed
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={`${totalStockQty} pcs`}
                            className="read-only-input bold"
                            style={{ fontSize: "14px" }}
                          />
                        </div>

                        {/* Logo Printed */}
                        <div className="form-field">
                          <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                            Printed (pcs)
                          </label>
                          {isViewOnlyProd || activeProdStage !== "logo_printing" ? (
                            <input
                              type="text"
                              readOnly
                              value={prodForm.logosPrinted !== "" && prodForm.logosPrinted !== undefined && prodForm.logosPrinted !== null ? `${prodForm.logosPrinted} pcs` : "-"}
                              className="read-only-input bold"
                              style={{ fontSize: "14px" }}
                            />
                          ) : (
                            <input
                              type="number"
                              min="0"
                              placeholder="Enter printed..."
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
                          )}
                        </div>

                        {/* Logo Giving for Cutting */}
                        <div className="form-field">
                          <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                            For Cutting (pcs)
                          </label>
                          {isViewOnlyProd || activeProdStage !== "logo_printing" ? (
                            <input
                              type="text"
                              readOnly
                              value={prodForm.logosGivenForCutting !== "" && prodForm.logosGivenForCutting !== undefined && prodForm.logosGivenForCutting !== null ? `${prodForm.logosGivenForCutting} pcs` : "-"}
                              className="read-only-input bold"
                              style={{ fontSize: "14px" }}
                            />
                          ) : (
                            <input
                              type="number"
                              min="0"
                              placeholder="Enter for cutting..."
                              value={prodForm.logosGivenForCutting}
                              onChange={(e) => setProdForm({ ...prodForm, logosGivenForCutting: e.target.value })}
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
                          )}
                        </div>
                      </div>
                    </div>

                    {/* STAGE 2: LOGO CUTTING SECTION */}
                    {(activeProdStage === "logo_cutting" || currentTaskTab === "logo-cutting" || (currentTaskTab === "all" && (selectedOrder.productionTaskStage === "logo_cutting" || selectedOrder.productionTaskStage === "completed"))) && (
                      <div style={{ marginBottom: "20px", borderTop: "1px solid #e2e8f0", paddingTop: "18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                          <Scissors size={16} color="#334155" />
                          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                            Logo Cutting
                          </h4>
                        </div>

                        {/* Received No. of Logos: Yes or No */}
                        <div style={{ marginBottom: "16px", background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>
                            Received No. of Logos?
                          </label>
                          {isViewOnlyProd || activeProdStage !== "logo_cutting" ? (
                            <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "13.5px" }}>
                              {prodForm.receivedNoOfLogos === "no" ? "No" : "Yes"}
                            </span>
                          ) : (
                            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                              <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13.5px", fontWeight: 600, color: "#1e293b" }}>
                                <input
                                  type="radio"
                                  name="receivedNoOfLogos"
                                  value="yes"
                                  checked={prodForm.receivedNoOfLogos !== "no"}
                                  onChange={() => setProdForm((prev) => ({ ...prev, receivedNoOfLogos: "yes" }))}
                                  style={{ accentColor: "#2563eb", cursor: "pointer" }}
                                />
                                <span>Yes</span>
                              </label>
                              <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13.5px", fontWeight: 600, color: "#1e293b" }}>
                                <input
                                  type="radio"
                                  name="receivedNoOfLogos"
                                  value="no"
                                  checked={prodForm.receivedNoOfLogos === "no"}
                                  onChange={() => setProdForm((prev) => ({ ...prev, receivedNoOfLogos: "no" }))}
                                  style={{ accentColor: "#2563eb", cursor: "pointer" }}
                                />
                                <span>No</span>
                              </label>
                            </div>
                          )}
                          {prodForm.receivedNoOfLogos === "no" && !isViewOnlyProd && (
                            <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "6px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "12.5px", fontWeight: 500 }}>
                              Logos marked as not received. Please provide remarks below and click <strong>Refer Back</strong> to send this order back to Logo Printing.
                            </div>
                          )}
                        </div>

                        {/* Cutting Fields: Received for Cutting, For Printing Logo, Giving for Sample */}
                        <div className="form-grid-3">
                          {/* How many logo received for cutting */}
                          <div className="form-field">
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                              Received for Cutting (pcs)
                            </label>
                            {isViewOnlyProd || activeProdStage !== "logo_cutting" ? (
                              <input
                                type="text"
                                readOnly
                                value={`${prodForm.logosReceivedForCutting || prodForm.logosGivenForCutting || totalStockQty} pcs`}
                                className="read-only-input bold"
                                style={{ fontSize: "14px" }}
                              />
                            ) : (
                              <input
                                type="number"
                                min="0"
                                value={prodForm.logosReceivedForCutting}
                                onChange={(e) => setProdForm({ ...prodForm, logosReceivedForCutting: e.target.value })}
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
                            )}
                          </div>

                          {/* How many for printing logo */}
                          <div className="form-field">
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                              For Printing (pcs)
                            </label>
                            {isViewOnlyProd || activeProdStage !== "logo_cutting" ? (
                              <input
                                type="text"
                                readOnly
                                value={`${prodForm.logosForPrinting || 0} pcs`}
                                className="read-only-input bold"
                                style={{ fontSize: "14px" }}
                              />
                            ) : (
                              <input
                                type="number"
                                min="0"
                                value={prodForm.logosForPrinting}
                                onChange={(e) => setProdForm({ ...prodForm, logosForPrinting: e.target.value })}
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
                            )}
                          </div>

                          {/* How many giving for sample */}
                          <div className="form-field">
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                              For Sample (pcs)
                            </label>
                            {isViewOnlyProd || activeProdStage !== "logo_cutting" ? (
                              <input
                                type="text"
                                readOnly
                                value={`${prodForm.sampleLogosCount || 0} pcs`}
                                className="read-only-input bold"
                                style={{ fontSize: "14px" }}
                              />
                            ) : (
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
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CORRECTION NOTES / REMARKS (UNDERNEATH) */}
                    <div style={{ marginTop: "18px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                        Remarks:
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Enter remarks..."
                        value={prodForm.note}
                        onChange={(e) => setProdForm({ ...prodForm, note: e.target.value })}
                        disabled={isViewOnlyProd}
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
                );
              })()}

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
                  ) : (() => {
                      const hasSublimation = selectedOrder.items.some(
                        (it) =>
                          String(it.printingType || "").toLowerCase().trim() === "sublimation" ||
                          (it.sublimationOption && it.sublimationOption !== "-" && it.sublimationOption !== "") ||
                          (it.sublimation && it.sublimation !== "-" && it.sublimation !== "")
                      );

                      return (
                        <div className="table-responsive">
                          <table className="items-review-table stock-review-table">
                            <thead>
                              <tr>
                                <th style={{ minWidth: "36px", textAlign: "center", padding: "10px 6px", fontSize: "12.5px" }}>S.N</th>
                                <th style={{ padding: "10px 8px", fontSize: "12.5px" }}>Item Description</th>
                                <th style={{ padding: "10px 8px", fontSize: "12.5px" }}>Printing Type</th>
                                {hasSublimation && (
                                  <th style={{ padding: "10px 8px", fontSize: "12.5px" }}>Sublimation</th>
                                )}
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
                                  <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{formatPrintingType(it.printingType)}</td>
                                  {hasSublimation && (
                                    <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.sublimationOption || it.sublimation || "-"}</td>
                                  )}
                                  <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.fabric || "-"}</td>
                                  <td style={{ padding: "9px 8px", fontSize: "13.5px", fontWeight: 600 }}>{it.quantity || 0}</td>
                                  <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.size || "-"}</td>
                                  <td style={{ padding: "9px 8px", fontSize: "13.5px" }}>{it.color || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
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

