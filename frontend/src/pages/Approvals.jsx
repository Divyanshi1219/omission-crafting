import { useState, useEffect, useMemo, useRef } from "react";
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
  X,
  Settings
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
  const [activeActivityTab, setActiveActivityTab] = useState("department");
  const [managerComment, setManagerComment] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusTab, setStatusTab] = useState(() => getTabFromParam(status)); // 'all' | 'pending' | 'referred-back' | 'approved'
  const [toast, setToast] = useState(null);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const columnSettingsRef = useRef(null);
  const [extraColumns, setExtraColumns] = useState({
    clientName: false,
    phoneNumber: false,
    companyAddress: false,
    state: false,
    pincode: false,
    repeatedOrder: false,
    additionalNote: false,
    orderStage: false,
    subStage: false,
    logoName: false,
    totalQuantity: false,
    pricePerPiece: false,
    totalAmount: false,
    gst: false,
    netAmount: false,
    advanceAmount: false,
    pendingAmount: false,
    urgency: false,
    deliveryDate: false,
    modeOfDelivery: false,
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (columnSettingsRef.current && !columnSettingsRef.current.contains(e.target)) {
        setShowColumnSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const EXTRA_COLUMN_DEFS = [
    { key: "clientName", label: "Client Name" },
    { key: "phoneNumber", label: "Phone Number" },
    { key: "companyAddress", label: "Company Address" },
    { key: "state", label: "State" },
    { key: "pincode", label: "Pincode" },
    { key: "repeatedOrder", label: "Repeated Order" },
    { key: "additionalNote", label: "Additional Note" },
    { key: "orderStage", label: "Order Stage" },
    { key: "subStage", label: "Sub Stage" },
    { key: "logoName", label: "Logo Name" },
    { key: "totalQuantity", label: "Total Quantity" },
    { key: "pricePerPiece", label: "Price Per Piece" },
    { key: "totalAmount", label: "Total Amount" },
    { key: "gst", label: "GST (%)" },
    { key: "netAmount", label: "Net Amount" },
    { key: "advanceAmount", label: "Advance Amount" },
    { key: "pendingAmount", label: "Pending Amount" },
    { key: "urgency", label: "Urgency" },
    { key: "deliveryDate", label: "Delivery Date" },
    { key: "modeOfDelivery", label: "Mode of Delivery" },
  ];

  const renderExtraHeaders = () =>
    EXTRA_COLUMN_DEFS.filter((col) => extraColumns[col.key]).map((col) => (
      <th key={col.key}>{col.label}</th>
    ));

  const renderExtraCells = (order) =>
    EXTRA_COLUMN_DEFS.filter((col) => extraColumns[col.key]).map((col) => {
      let val = order[col.key];
      if (col.key === "totalQuantity") val = val ? `${val} pcs` : "—";
      else if (["pricePerPiece", "totalAmount", "netAmount", "advanceAmount", "pendingAmount"].includes(col.key))
        val = val !== undefined && val !== "" ? `₹${val}` : "—";
      else if (col.key === "gst") val = val ? `${val}%` : "—";
      else if (col.key === "deliveryDate")
        val = val ? (String(val).includes("T") ? String(val).split("T")[0] : val) : "—";
      return (
        <td key={col.key} style={{ color: "#475569", fontSize: "13px", whiteSpace: "nowrap" }}>
          {val || "—"}
        </td>
      );
    });

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
    logosPrinted: "",
    logosCutGiven: "",
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
      logosPrinted: (order.productionTaskData?.printingSubmitted && order.productionTaskData?.logosPrinted !== undefined && order.productionTaskData?.logosPrinted !== null) ? order.productionTaskData.logosPrinted : "",
      logosCutGiven: (order.productionTaskData?.printingSubmitted && (order.productionTaskData?.logosCutGiven !== undefined || order.productionTaskData?.logosGivenForCutting !== undefined)) ? (order.productionTaskData.logosGivenForCutting ?? order.productionTaskData.logosCutGiven) : "",
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
      const isPartial = selectedOrder.orderStage === "partial";
      const isComplete = selectedOrder.orderStage === "complete";
      const defaultBatchQty = selectedOrder.productionTaskData?.batchQuantity ||
        (isPartial
          ? (Number(selectedOrder.customerApprovalData?.partialQuantity) || Math.floor((selectedOrder.totalQuantity || 100) / 2))
          : isComplete
          ? Math.max(0, (selectedOrder.totalQuantity || 100) - (Number(selectedOrder.customerApprovalData?.partialQuantity) || 0))
          : (selectedOrder.totalQuantity || 100));

      const printed = (isSubmitted && prevData.logosPrinted !== undefined && prevData.logosPrinted !== null && prevData.logosPrinted !== "")
        ? prevData.logosPrinted
        : "";
      const givenForCut = (isSubmitted && ((prevData.logosGivenForCutting !== undefined && prevData.logosGivenForCutting !== null && prevData.logosGivenForCutting !== "") || (prevData.logosCutGiven !== undefined && prevData.logosCutGiven !== null && prevData.logosCutGiven !== "")))
        ? (prevData.logosGivenForCutting ?? prevData.logosCutGiven)
        : "";
      const recForCut = prevData.logosReceivedForCutting !== undefined && prevData.logosReceivedForCutting !== null && prevData.logosReceivedForCutting !== ""
        ? prevData.logosReceivedForCutting
        : (givenForCut || (isPartial || isComplete ? defaultBatchQty : ""));
      const forPrint = prevData.logosForPrinting !== undefined && prevData.logosForPrinting !== null ? prevData.logosForPrinting : "";
      const sampleCount = prevData.sampleLogosCount !== undefined && prevData.sampleLogosCount !== null && prevData.sampleLogosCount !== ""
        ? prevData.sampleLogosCount
        : (isPartial || isComplete ? defaultBatchQty : 0);
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
      const partialItemsList = selectedOrder.stockTaskData?.partialItemsStockData || [];

      const isPartial = selectedOrder.orderStage === "partial" || String(selectedOrder.currentStageId || selectedOrder.stageId || "").startsWith("PRT");
      const isComplete = selectedOrder.orderStage === "complete" || String(selectedOrder.currentStageId || selectedOrder.stageId || "").startsWith("CMP");
      const totalStockQty = selectedOrder.totalQuantity || items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 100;
      const explicitBatch = Number(selectedOrder.stockTaskData?.batchQuantity) || Number(selectedOrder.customerApprovalData?.partialQuantity);
      const targetBatch = explicitBatch > 0
        ? explicitBatch
        : (isPartial
          ? Math.floor(totalStockQty / 2)
          : isComplete
          ? Math.max(0, totalStockQty - (Number(selectedOrder.customerApprovalData?.partialQuantity) || 0))
          : 5);

      const getPartialDeduction = (it, idx) => {
        const pItem = partialItemsList.find(
          (p, i) => (p.id && (p.id === it.id || p.id === it._id)) || i === idx
        ) || partialItemsList[idx] || (isComplete && !selectedOrder.stockTaskData?.verificationSubmitted ? prevItemsStockData[idx] : null);

        if (pItem && pItem.sampleDeduction !== undefined && pItem.sampleDeduction !== "") {
          return Number(pItem.sampleDeduction) || 0;
        }
        const partialQty = Number(selectedOrder.customerApprovalData?.partialQuantity) || 0;
        if (partialQty > 0) {
          return idx === 0 ? Math.min(Number(it.quantity) || 0, partialQty) : 0;
        }
        return 0;
      };

      const isNewBatchRun = (isPartial || isComplete) && (!selectedOrder.stockTaskData?.verificationSubmitted);

      let allocatedRunning = 0;
      const initializedItemsData = items.map((it, idx) => {
        const saved = prevItemsStockData[idx] || {};
        const isAvail = saved.isStockAvailable !== undefined ? saved.isStockAvailable : (selectedOrder.stockTaskData?.isStockAvailable !== false);
        const qty = Number(it.quantity) || 0;
        const partialDed = getPartialDeduction(it, idx);
        const remainingToComplete = Math.max(0, qty - partialDed);

        let sampleCount;
        if (isComplete) {
          if (isNewBatchRun) {
            sampleCount = remainingToComplete;
          } else if (saved.sampleDeduction !== undefined) {
            sampleCount = Number(saved.sampleDeduction) || 0;
          } else {
            sampleCount = remainingToComplete;
          }
        } else if (isPartial) {
          if (isNewBatchRun) {
            const neededRemaining = Math.max(0, targetBatch - allocatedRunning);
            sampleCount = Math.min(qty, neededRemaining);
            allocatedRunning += sampleCount;
          } else if (saved.sampleDeduction !== undefined) {
            sampleCount = Number(saved.sampleDeduction) || 0;
          } else {
            sampleCount = idx === 0 ? Math.min(qty, targetBatch) : 0;
          }
        } else {
          sampleCount = saved.sampleDeduction !== undefined ? Number(saved.sampleDeduction) : (idx === 0 ? 5 : 0);
        }

        const deficitCount = saved.notInStockCount !== undefined ? saved.notInStockCount : (selectedOrder.stockTaskData?.notInStockCount || "");
        const deficitNum = Number(deficitCount) || 0;

        let rem;
        let defaultDeprec;
        if (isComplete) {
          rem = Math.max(0, remainingToComplete - sampleCount);
          defaultDeprec = `${rem} pcs`;
        } else {
          rem = isAvail ? Math.max(0, qty - sampleCount) : Math.max(0, qty - deficitNum - sampleCount);
          defaultDeprec = saved.stockDepreciation;
          if (!defaultDeprec || /full\s*stock|deficit|giving|available/i.test(defaultDeprec) || isNewBatchRun) {
            defaultDeprec = `${rem} pcs`;
          }
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
          partialDeduction: partialDed,
          remainingToComplete: remainingToComplete,
        };
      });

      setItemsStockData(initializedItemsData);

      // Ready to Pick state
      setReadyToPickReceived(selectedOrder.stockTaskData?.readyToPickReceived === false ? "no" : "yes");

      let initialReadyAttachments = [];
      if (isPartial) {
        const sampleNames = new Set([
          "bestseller-banne.png",
          "bestseller-banner.png",
          ...(selectedOrder.stockTaskData?.sampleReadyToPickAttachments || []).map(a => a?.name || a?.filename || String(a))
        ]);

        const rawPartial = Array.isArray(selectedOrder.stockTaskData?.partialReadyToPickAttachments)
          ? selectedOrder.stockTaskData.partialReadyToPickAttachments
          : [];

        // Exclude sample files so stock room manager gets a clean upload state for the partial order
        initialReadyAttachments = rawPartial.filter(a => {
          const name = (a?.name || a?.filename || String(a)).toLowerCase();
          return !sampleNames.has(name) && !name.includes("bestseller");
        });
      } else if (isComplete) {
        const prevNames = new Set([
          "bestseller-banne.png",
          "bestseller-banner.png",
          ...(selectedOrder.stockTaskData?.sampleReadyToPickAttachments || []).map(a => a?.name || a?.filename || String(a)),
          ...(selectedOrder.stockTaskData?.partialReadyToPickAttachments || []).map(a => a?.name || a?.filename || String(a))
        ]);

        const rawComplete = Array.isArray(selectedOrder.stockTaskData?.completeReadyToPickAttachments)
          ? selectedOrder.stockTaskData.completeReadyToPickAttachments
          : [];

        initialReadyAttachments = rawComplete.filter(a => {
          const name = (a?.name || a?.filename || String(a)).toLowerCase();
          return !prevNames.has(name) && !name.includes("bestseller");
        });
      } else {
        initialReadyAttachments = selectedOrder.stockTaskData?.readyToPickAttachments || [];
      }

      setReadyToPickAttachments(initialReadyAttachments);
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
      // Compress image files to avoid exceeding MongoDB 16MB document limit
      if (file.type && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1400;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            const compressedUrl = canvas.toDataURL("image/jpeg", 0.82);
            const approxKb = Math.round((compressedUrl.length * 3) / 4 / 1024);

            setReadyToPickAttachments((prev) => [
              ...prev,
              {
                name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                url: compressedUrl,
                size: (approxKb > 0 ? approxKb : (file.size / 1024).toFixed(1)) + " KB",
                type: "image/jpeg",
              },
            ]);
          };
          img.onerror = () => {
            setReadyToPickAttachments((prev) => [
              ...prev,
              {
                name: file.name,
                url: evt.target.result,
                size: (file.size / 1024).toFixed(1) + " KB",
                type: file.type,
              },
            ]);
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      } else {
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
      }
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

      const isPartialStage = selectedOrder?.orderStage === "partial" || String(selectedOrder?.currentStageId || selectedOrder?.stageId || "").startsWith("PRT");
      const isCompleteStage = selectedOrder?.orderStage === "complete" || String(selectedOrder?.currentStageId || selectedOrder?.stageId || "").startsWith("CMP");
      const totalStockQty = selectedOrder?.totalQuantity || selectedOrder?.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;
      const partialBatchQty = Number(selectedOrder?.customerApprovalData?.partialQuantity) || Math.floor(totalStockQty / 2);
      const remainingCompleteQty = Math.max(0, totalStockQty - partialBatchQty);

      const targetBatchLimit = isCompleteStage
        ? (Number(selectedOrder?.productionTaskData?.batchQuantity) || remainingCompleteQty || totalStockQty)
        : isPartialStage
        ? (Number(selectedOrder?.productionTaskData?.batchQuantity) || partialBatchQty || Math.floor(totalStockQty / 2))
        : (Number(selectedOrder?.productionTaskData?.batchQuantity) || totalStockQty);

      if (actionType === "submit" && activeProdStage === "logo_printing") {
        if (prodForm.logosPrinted === "" || prodForm.logosGivenForCutting === "") {
          alert("Please fill in Printed (pcs) and For Cutting (pcs) before submitting.");
          return;
        }
        if (Number(prodForm.logosPrinted) > targetBatchLimit) {
          alert(`Printed logos (${prodForm.logosPrinted} pcs) cannot exceed the needed limit of ${targetBatchLimit} pcs.`);
          return;
        }
        if (Number(prodForm.logosGivenForCutting) > targetBatchLimit) {
          alert(`Logos for cutting (${prodForm.logosGivenForCutting} pcs) cannot exceed the needed limit of ${targetBatchLimit} pcs.`);
          return;
        }
        if (Number(prodForm.logosGivenForCutting) > Number(prodForm.logosPrinted)) {
          alert(`Logos for cutting (${prodForm.logosGivenForCutting} pcs) cannot exceed printed logos (${prodForm.logosPrinted} pcs).`);
          return;
        }
      }

      if (actionType === "submit" && activeProdStage === "logo_cutting") {
        if (prodForm.receivedNoOfLogos === "no") {
          alert("Logos marked as not received. Please refer back to Logo Printing.");
          return;
        }
        if (prodForm.logosReceivedForCutting !== "" && Number(prodForm.logosReceivedForCutting) > targetBatchLimit) {
          alert(`Logos received for cutting (${prodForm.logosReceivedForCutting} pcs) cannot exceed the limit of ${targetBatchLimit} pcs.`);
          return;
        }
        if (prodForm.sampleLogosCount !== "" && Number(prodForm.sampleLogosCount) > targetBatchLimit) {
          alert(`Logos cut for batch (${prodForm.sampleLogosCount} pcs) cannot exceed the limit of ${targetBatchLimit} pcs.`);
          return;
        }
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

          const isPartial = selectedOrder?.orderStage === "partial" || String(selectedOrder?.currentStageId || selectedOrder?.stageId || "").startsWith("PRT");
          const isComplete = selectedOrder?.orderStage === "complete" || String(selectedOrder?.currentStageId || selectedOrder?.stageId || "").startsWith("CMP");
          payload = {
            action: actionType,
            stage: "ready_to_pick",
            comment: stockNote.trim(),
            author: currentUser?.name || "Elena Rostova",
            stockTaskData: {
              readyToPickReceived: readyToPickReceived === "yes",
              readyToPickAttachments: readyToPickReceived === "yes" ? readyToPickAttachments : [],
              ...(isPartial ? { partialReadyToPickAttachments: readyToPickReceived === "yes" ? readyToPickAttachments : [] } : {}),
              ...(isComplete ? { completeReadyToPickAttachments: readyToPickReceived === "yes" ? readyToPickAttachments : [] } : {}),
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
                ? "Submitted"
                : `Order #${selectedOrder.orderId || "Order"} referred back to Verification.`
            );
            setSelectedOrder(null);
            setSearchParams({});
            if (actionType !== "submit") navigate("/tasks/verification");
            fetchOrders();
          } else {
            showToast(
              actionType === "submit"
                ? "Submitted"
                : `Order #${selectedOrder.orderId || "Order"} referred back to Ready to Pick.`
            );
            setSelectedOrder(null);
            setSearchParams({});
            if (actionType !== "submit") navigate("/tasks/ready-to-pick");
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
          showToast(actionType === "submit" ? "Submitted" : `Order #${order.orderId || "Order"} referred back.`);
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
          showToast(actionType === "submit" ? "Submitted" : `Order #${order.orderId || "Order"} referred back to Ready to Pick.`);
          handleCloseTaskModal();
          if (selectedOrder) {
            handleBackToList();
          } else {
            fetchOrders();
          }
        }
      } else if (taskType === "logo_cutting") {
        if (actionType === "submit") {
          const mIsPartial = order.orderStage === "partial" || String(order.currentStageId || order.stageId || "").startsWith("PRT");
          const mIsComplete = order.orderStage === "complete" || String(order.currentStageId || order.stageId || "").startsWith("CMP");
          const mTotalQty = order.totalQuantity || order.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;
          const mPartialQty = Number(order.customerApprovalData?.partialQuantity) || Math.floor(mTotalQty / 2);
          const mRemainingQty = Math.max(0, mTotalQty - mPartialQty);
          const mTargetQty = mIsComplete
            ? (Number(order.productionTaskData?.batchQuantity) || mRemainingQty || mTotalQty)
            : mIsPartial
            ? (Number(order.productionTaskData?.batchQuantity) || mPartialQty || Math.floor(mTotalQty / 2))
            : (Number(order.productionTaskData?.batchQuantity) || mTotalQty);

          if (Number(logosPrinted) > mTargetQty) {
            alert(`Logos printed (${logosPrinted} pcs) cannot exceed the limit of ${mTargetQty} pcs.`);
            return;
          }
          if (Number(logosCutGiven) > mTargetQty) {
            alert(`Logos cut or given (${logosCutGiven} pcs) cannot exceed the limit of ${mTargetQty} pcs.`);
            return;
          }
          if (Number(sampleLogosCount) > mTargetQty) {
            alert(`Logos giving (${sampleLogosCount} pcs) cannot exceed the limit of ${mTargetQty} pcs.`);
            return;
          }
        }
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

  // Helper: Derive stage-specific ID (SMP-00001, PRT-00001, CMP-00001)
  const getStageId = (order) => {
    if (!order) return "";
    const stage = (order.orderStage || "sample").toLowerCase();
    const rawNum = (order.orderId || (order._id ? String(order._id).slice(-5) : "00001")).replace(/^ORD-?/i, "");
    const numPart = rawNum || "00001";
    if (stage === "complete") return order.completeId || `CMP-${numPart}`;
    if (stage === "partial") return order.partialId || `PRT-${numPart}`;
    return order.sampleId || `SMP-${numPart}`;
  };

  // Helper: Stage badge styling and label (clean neutral styling, no color grading)
  const getStageBadgeData = (order) => {
    const stage = (order?.orderStage || "sample").toLowerCase();
    const stageId = getStageId(order);
    return {
      stage,
      label: stage === "complete" ? "Complete Run" : stage === "partial" ? "Partial Batch" : "Sample Stage",
      stageId,
      color: "#0f172a",
      bg: "#f8fafc",
      border: "#cbd5e1",
    };
  };

  // Helper: Payment status information for Stock & Production profiles (clean neutral styling, no color grading)
  const getPaymentDisplayInfo = (order) => {
    if (!order) {
      return {
        status: "pending",
        label: "Pending",
        amountReceived: 0,
        balanceRemaining: 0,
        mode: "-",
        refId: "",
        color: "#64748b",
        bg: "#f8fafc",
        border: "#cbd5e1",
        detail: "Payment verification pending",
      };
    }

    const stage = (order.orderStage || "sample").toLowerCase();
    const cust = order.customerApprovalData || {};
    const stock = order.stockTaskData || {};
    const prod = order.productionTaskData || {};

    const paymentStatus =
      cust.paymentStatus ||
      stock.paymentStatus ||
      prod.paymentStatus ||
      (stage === "complete" ? "fully_received" : stage === "partial" ? "partial_received" : "");

    const mode =
      cust.paymentMode ||
      order.paymentDetails?.paymentMethod ||
      order.paymentMethod ||
      "-";

    const refId =
      cust.transactionRef ||
      cust.referenceId ||
      order.paymentDetails?.referenceId ||
      "";

    const recAmount = Number(
      cust.amountReceived ??
      cust.remainingAmountReceived ??
      stock.amountReceived ??
      prod.amountReceived ??
      (stage === "complete" ? (order.netAmount || order.totalAmount) : 0)
    ) || 0;

    const balAmount = Number(
      cust.balanceRemaining ??
      stock.balanceRemaining ??
      prod.balanceRemaining ??
      0
    ) || 0;

    if (paymentStatus === "fully_received" || stage === "complete") {
      const finalAmount = recAmount || Number(order.netAmount || order.totalAmount || 0);
      return {
        status: "fully_received",
        label: "Fully Received",
        amountReceived: finalAmount,
        balanceRemaining: 0,
        mode,
        refId,
        color: "#15803d",
        bg: "#f8fafc",
        border: "#cbd5e1",
        detail: `₹${finalAmount.toLocaleString()} full cleared${mode !== "-" ? ` via ${mode}` : ""}${refId ? ` (Ref: ${refId})` : ""}`,
      };
    }

    if (paymentStatus === "partial_received" || stage === "partial") {
      return {
        status: "partial_received",
        label: "Partially Received",
        amountReceived: recAmount,
        balanceRemaining: balAmount,
        mode,
        refId,
        color: "#b45309",
        bg: "#f8fafc",
        border: "#cbd5e1",
        detail: `₹${recAmount.toLocaleString()} rec. (₹${balAmount.toLocaleString()} bal.)${mode !== "-" ? ` via ${mode}` : ""}${refId ? ` (Ref: ${refId})` : ""}`,
      };
    }

    const adv = Number(order.paymentDetails?.advanceAmount) || 0;
    if (adv > 0) {
      return {
        status: "advance_received",
        label: "Advance Received",
        amountReceived: adv,
        balanceRemaining: Math.max(0, (Number(order.netAmount || order.totalAmount) || 0) - adv),
        mode,
        refId,
        color: "#334155",
        bg: "#f8fafc",
        border: "#cbd5e1",
        detail: `₹${adv.toLocaleString()} advance paid${mode !== "-" ? ` via ${mode}` : ""}`,
      };
    }

    return {
      status: "sample",
      label: "Sample Stage",
      amountReceived: 0,
      balanceRemaining: Number(order.netAmount || order.totalAmount || 0),
      mode: "-",
      refId: "",
      color: "#475569",
      bg: "#f8fafc",
      border: "#cbd5e1",
      detail: "Sample verification in progress",
    };
  };

  // Fetch all orders
  const fetchOrders = async (showSpinner = false) => {
    if (showSpinner || orders.length === 0) setLoading(true);
    try {
      const res = await api.get("/api/leads?query=order");
      if (res.data && res.data.data) {
        const sorted = [...res.data.data].sort(
          (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
        );
        setOrders(sorted);
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
        if (getStockStage(order) === "verification") return false;
      } else if (currentTaskTab === "staging-room") {
        const stg = getStockStage(order);
        if (stg !== "staging_room" && stg !== "completed") return false;
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
        const stageId = getStageId(order).toLowerCase();
        const paymentDisplay = getPaymentDisplayInfo(order);
        const paymentTerm = `${paymentDisplay.label} ${paymentDisplay.mode} ${paymentDisplay.detail}`.toLowerCase();
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
          stageId.includes(term) ||
          paymentTerm.includes(term) ||
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
    }).sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
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
          {/* Top Bar with Search & Column Settings */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px", position: "relative" }} ref={columnSettingsRef}>

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

            <button
              type="button"
              onClick={() => setShowColumnSettings((prev) => !prev)}
              title="Customize Table Columns"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "9px 11px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: showColumnSettings ? "#eff6ff" : "#ffffff",
                color: showColumnSettings ? "#2563eb" : "#475569",
                cursor: "pointer",
              }}
            >
              <Settings size={17} />
            </button>

            {showColumnSettings && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  width: "240px",
                  maxHeight: "340px",
                  overflowY: "auto",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.12)",
                  padding: "10px 12px",
                  zIndex: 50,
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid #f1f5f9" }}>
                  Additional Columns
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {EXTRA_COLUMN_DEFS.map((col) => (
                    <label
                      key={col.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "12.5px",
                        color: "#334155",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(extraColumns[col.key])}
                        onChange={() =>
                          setExtraColumns((prev) => ({
                            ...prev,
                            [col.key]: !prev[col.key],
                          }))
                        }
                        style={{ width: "14px", height: "14px", accentColor: "#2563eb", cursor: "pointer", margin: 0 }}
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Orders Table */}
          <div className="table-card">
            <div className="table-responsive">
              <table className="approvals-table">
                <thead>
                  {/* VERIFICATION TABLE HEADERS */}
                  {currentTaskTab === "verification" && (
                    <tr>
                      <th>Stage ID</th>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Company Name</th>
                      <th>Payment Status</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Status</th>
                      {renderExtraHeaders()}
                    </tr>
                  )}

                  {/* READY TO PICK TABLE HEADERS */}
                  {currentTaskTab === "ready-to-pick" && (
                    <tr>
                      <th>Stage ID</th>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Company Name</th>
                      <th>Payment Status</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Status</th>
                      {renderExtraHeaders()}
                    </tr>
                  )}

                  {/* STAGING ROOM TABLE HEADERS */}
                  {currentTaskTab === "staging-room" && (
                    <tr>
                      <th>Stage ID</th>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Company Name</th>
                      <th>Payment Status</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Status</th>
                      {renderExtraHeaders()}
                    </tr>
                  )}

                  {/* LOGO PRINTING TABLE HEADERS */}
                  {currentTaskTab === "logo-printing" && (
                    <tr>
                      <th>Stage ID</th>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Company Name</th>
                      <th>Payment Status</th>
                      <th>Status</th>
                      {renderExtraHeaders()}
                    </tr>
                  )}

                  {/* LOGO CUTTING TABLE HEADERS */}
                  {currentTaskTab === "logo-cutting" && (
                    <tr>
                      <th>Stage ID</th>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Company Name</th>
                      <th>Payment Status</th>
                      <th>Date</th>
                      <th>Attachments</th>
                      <th>Status</th>
                      {renderExtraHeaders()}
                    </tr>
                  )}

                  {/* ALL VIEW HEADERS */}
                  {currentTaskTab === "all" && roleView === "stock" && (
                    <tr>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Company Name</th>
                      <th>Payment Status</th>
                      <th>Stage</th>
                      <th>Status</th>
                      {renderExtraHeaders()}
                    </tr>
                  )}

                  {currentTaskTab === "all" && roleView === "production" && (
                    <tr>
                      <th>Stage ID</th>
                      <th>Order ID</th>
                      <th>Employee Name</th>
                      <th>Company Name</th>
                      <th>Payment Status</th>
                      <th>Stage</th>
                      <th>Status</th>
                      {renderExtraHeaders()}
                    </tr>
                  )}

                  {currentTaskTab === "all" && roleView === "all" && (
                    <tr>
                      <th>Task ID</th>
                      <th>Stage ID</th>
                      <th>Order ID</th>
                      <th>Client / Company</th>
                      <th>Sales Rep</th>
                      <th>Payment Status</th>
                      <th>Stage</th>
                      <th>Quantity</th>
                      <th>Net Amount</th>
                      <th>Date Created</th>
                      <th>Status</th>
                      {renderExtraHeaders()}
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={12}
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
                        colSpan={12}
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
                      const stageData = getStageBadgeData(order);
                      const payInfo = getPaymentDisplayInfo(order);

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
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "2px 7px",
                                  borderRadius: "5px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  fontFamily: "monospace",
                                  backgroundColor: stageData.bg,
                                  color: stageData.color,
                                  border: `1px solid ${stageData.border}`,
                                  width: "fit-content",
                                }}
                              >
                                {stageData.stageId}
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
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  backgroundColor: payInfo.bg,
                                  color: payInfo.color,
                                  border: `1px solid ${payInfo.border}`,
                                  width: "fit-content",
                                }}
                                title={payInfo.detail}
                              >
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: payInfo.color,
                                  }}
                                />
                                {payInfo.label}
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
                            {renderExtraCells(order)}
                          </tr>
                        );
                      }

                      /* =========================================================================
                         2. READY TO PICK (Stock Room Manager Task)
                         ========================================================================= */
                      if (currentTaskTab === "ready-to-pick") {
                        const isAvail = order.stockTaskData?.isStockAvailable !== false;
                        const isReadyToPickSubmitted = order.stockTaskStage === "staging_room" || order.stockTaskStage === "completed" || order.stockTaskData?.readyToPickSubmitted || order.stockApproval?.status === "Approved";
                        const isPartialOrComplete = order.orderStage === "partial" || order.orderStage === "complete";
                        const targetBatch = order.stockTaskData?.batchQuantity ||
                          (order.orderStage === "partial"
                            ? (Number(order.customerApprovalData?.partialQuantity) || Math.floor((order.totalQuantity || 100) / 2))
                            : order.orderStage === "complete"
                            ? Math.max(0, (order.totalQuantity || 100) - (Number(order.customerApprovalData?.partialQuantity) || 0))
                            : (order.stockTaskData?.sampleDeduction || 5));
                        const sampleDeduction = isPartialOrComplete ? targetBatch : (order.stockTaskData?.sampleDeduction !== undefined ? Number(order.stockTaskData.sampleDeduction) : 0);

                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                            style={{ cursor: "pointer" }}
                            title="Click to view ready to pick details"
                          >
                            <td>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "2px 7px",
                                  borderRadius: "5px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  fontFamily: "monospace",
                                  backgroundColor: stageData.bg,
                                  color: stageData.color,
                                  border: `1px solid ${stageData.border}`,
                                  width: "fit-content",
                                }}
                              >
                                {stageData.stageId}
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
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  backgroundColor: payInfo.bg,
                                  color: payInfo.color,
                                  border: `1px solid ${payInfo.border}`,
                                  width: "fit-content",
                                }}
                                title={payInfo.detail}
                              >
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: payInfo.color,
                                  }}
                                />
                                {payInfo.label}
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
                              <span className={`status-pill ${isReadyToPickSubmitted ? "approved" : st.toLowerCase().replace(/\s+/g, "-")}`}>
                                <span className="status-dot"></span>
                                {isReadyToPickSubmitted ? "Submitted" : st}
                              </span>
                            </td>
                            {renderExtraCells(order)}
                          </tr>
                        );
                      }

                      /* =========================================================================
                         3. STAGING ROOM (Stock Room Manager Task)
                         ========================================================================= */
                      if (currentTaskTab === "staging-room") {
                        const isPartialOrComplete = order.orderStage === "partial" || order.orderStage === "complete";
                        const targetBatch = order.stockTaskData?.batchQuantity ||
                          (order.orderStage === "partial"
                            ? (Number(order.customerApprovalData?.partialQuantity) || Math.floor((order.totalQuantity || 100) / 2))
                            : order.orderStage === "complete"
                            ? Math.max(0, (order.totalQuantity || 100) - (Number(order.customerApprovalData?.partialQuantity) || 0))
                            : (order.stockTaskData?.sampleDeduction || 5));
                        const sampleDeduction = isPartialOrComplete ? targetBatch : (order.stockTaskData?.sampleDeduction !== undefined ? Number(order.stockTaskData.sampleDeduction) : 0);
                        const sampleReceived = order.stockTaskData?.readyToPickReceived !== false;
                        const isOrderPartial = order.orderStage === "partial" || String(order.currentStageId || order.stageId || "").startsWith("PRT");
                        const isOrderComplete = order.orderStage === "complete" || String(order.currentStageId || order.stageId || "").startsWith("CMP");
                        const attCount = isOrderPartial
                          ? (order.stockTaskData?.partialReadyToPickAttachments?.length || 0)
                          : isOrderComplete
                          ? (order.stockTaskData?.completeReadyToPickAttachments?.length || 0)
                          : (order.stockTaskData?.readyToPickAttachments?.length || 0);
                        const isStagingSubmitted = order.stockTaskStage === "completed" || order.stockTaskData?.stagingSubmitted || order.stockApproval?.status === "Approved";

                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                            style={{ cursor: "pointer" }}
                            title="Click to view staging details"
                          >
                            <td>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "2px 7px",
                                  borderRadius: "5px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  fontFamily: "monospace",
                                  backgroundColor: stageData.bg,
                                  color: stageData.color,
                                  border: `1px solid ${stageData.border}`,
                                  width: "fit-content",
                                }}
                              >
                                {stageData.stageId}
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
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  backgroundColor: payInfo.bg,
                                  color: payInfo.color,
                                  border: `1px solid ${payInfo.border}`,
                                  width: "fit-content",
                                }}
                                title={payInfo.detail}
                              >
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: payInfo.color,
                                  }}
                                />
                                {payInfo.label}
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
                              <span className={`status-pill ${isStagingSubmitted ? "approved" : st.toLowerCase().replace(/\s+/g, "-")}`}>
                                <span className="status-dot"></span>
                                {isStagingSubmitted ? "Submitted" : st}
                              </span>
                            </td>
                            {renderExtraCells(order)}
                          </tr>
                        );
                      }

                      /* =========================================================================
                         3. LOGO PRINTING (Production Lead Task)
                         ========================================================================= */
                      if (currentTaskTab === "logo-printing") {
                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                            style={{ cursor: "pointer" }}
                            title="Click to review and print logos"
                          >
                            <td>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "2px 7px",
                                  borderRadius: "5px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  fontFamily: "monospace",
                                  backgroundColor: stageData.bg,
                                  color: stageData.color,
                                  border: `1px solid ${stageData.border}`,
                                  width: "fit-content",
                                }}
                              >
                                {stageData.stageId}
                              </span>
                            </td>
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
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  backgroundColor: payInfo.bg,
                                  color: payInfo.color,
                                  border: `1px solid ${payInfo.border}`,
                                  width: "fit-content",
                                }}
                                title={payInfo.detail}
                              >
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: payInfo.color,
                                  }}
                                />
                                {payInfo.label}
                              </span>
                            </td>
                            <td>
                              <span className={`status-pill ${st.toLowerCase().replace(/\s+/g, "-")}`}>
                                <span className="status-dot"></span>
                                {st}
                              </span>
                            </td>
                            {renderExtraCells(order)}
                          </tr>
                        );
                      }

                      /* =========================================================================
                         4. LOGO CUTTING (Production Lead Task)
                         ========================================================================= */
                      if (currentTaskTab === "logo-cutting") {
                        const logoDesignFile = order.logoDesign || order.attachment;
                        const logoDesignName = order.logoDesignName || order.attachmentName || "";
                        const digitalDesignFile = order.digitalDesign;
                        const digitalDesignName = order.digitalDesignName || "";

                        return (
                          <tr
                            key={order._id || order.id}
                            onClick={() => handleSelectOrder(order)}
                            style={{ cursor: "pointer" }}
                            title="Click to review and cut logos"
                          >
                            <td>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "2px 7px",
                                  borderRadius: "5px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  fontFamily: "monospace",
                                  backgroundColor: stageData.bg,
                                  color: stageData.color,
                                  border: `1px solid ${stageData.border}`,
                                  width: "fit-content",
                                }}
                              >
                                {stageData.stageId}
                              </span>
                            </td>
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
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  backgroundColor: payInfo.bg,
                                  color: payInfo.color,
                                  border: `1px solid ${payInfo.border}`,
                                  width: "fit-content",
                                }}
                                title={payInfo.detail}
                              >
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: payInfo.color,
                                  }}
                                />
                                {payInfo.label}
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
                                    download={logoDesignName || "Logo Design"}
                                    onClick={(e) => e.stopPropagation()}
                                    title={logoDesignName || "Logo Design"}
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
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{logoDesignName || "Logo Design"}</span>
                                  </a>
                                ) : logoDesignName ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      color: "#2563eb",
                                      fontSize: "12px",
                                      maxWidth: "130px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap"
                                    }}
                                    title={logoDesignName}
                                  >
                                    <Paperclip size={11} style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{logoDesignName}</span>
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>No file</span>
                                )}

                                {digitalDesignFile ? (
                                  <a
                                    href={digitalDesignFile}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={digitalDesignName || "Digital Design"}
                                    onClick={(e) => e.stopPropagation()}
                                    title={digitalDesignName || "Digital Design"}
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
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{digitalDesignName || "Digital Design"}</span>
                                  </a>
                                ) : digitalDesignName ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      color: "#2563eb",
                                      fontSize: "12px",
                                      maxWidth: "130px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap"
                                    }}
                                    title={digitalDesignName}
                                  >
                                    <Paperclip size={11} style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{digitalDesignName}</span>
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>No file</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`status-pill ${st.toLowerCase().replace(/\s+/g, "-")}`}>
                                <span className="status-dot"></span>
                                {st}
                              </span>
                            </td>
                            {renderExtraCells(order)}
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
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  backgroundColor: payInfo.bg,
                                  color: payInfo.color,
                                  border: `1px solid ${payInfo.border}`,
                                  width: "fit-content",
                                }}
                                title={payInfo.detail}
                              >
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: payInfo.color,
                                  }}
                                />
                                {payInfo.label}
                              </span>
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
                            {renderExtraCells(order)}
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
                            title="Click to view order details"
                          >
                            <td>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "2px 7px",
                                  borderRadius: "5px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  fontFamily: "monospace",
                                  backgroundColor: stageData.bg,
                                  color: stageData.color,
                                  border: `1px solid ${stageData.border}`,
                                  width: "fit-content",
                                }}
                              >
                                {stageData.stageId}
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
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  backgroundColor: payInfo.bg,
                                  color: payInfo.color,
                                  border: `1px solid ${payInfo.border}`,
                                  width: "fit-content",
                                }}
                                title={payInfo.detail}
                              >
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: payInfo.color,
                                  }}
                                />
                                {payInfo.label}
                              </span>
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
                            {renderExtraCells(order)}
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
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "2px 7px",
                                borderRadius: "5px",
                                fontSize: "12px",
                                fontWeight: 700,
                                fontFamily: "monospace",
                                backgroundColor: stageData.bg,
                                color: stageData.color,
                                border: `1px solid ${stageData.border}`,
                                width: "fit-content",
                              }}
                            >
                              {stageData.stageId}
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
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "11.5px",
                                fontWeight: 600,
                                backgroundColor: payInfo.bg,
                                color: payInfo.color,
                                border: `1px solid ${payInfo.border}`,
                                width: "fit-content",
                              }}
                              title={payInfo.detail}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  backgroundColor: payInfo.color,
                                }}
                              />
                              {payInfo.label}
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
                          {renderExtraCells(order)}
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
                  {roleView === "stock" && (
                    currentTaskTab === "ready-to-pick"
                      ? (selectedOrder.stockTaskStage === "staging_room" || selectedOrder.stockTaskStage === "completed" || selectedOrder.stockApproval?.status === "Approved")
                      : (selectedOrder.stockApproval?.status === "Approved" || selectedOrder.stockTaskStage === "completed")
                  ) && (
                    <span className="status-pill approved" style={{ padding: "6px 14px", fontSize: "13px" }}>
                      <span className="status-dot"></span>
                      Submitted
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
                      {(() => {
                        const isReadyToPickNotReceived =
                          (currentTaskTab === "ready-to-pick" || getStockStage(selectedOrder) === "ready_to_pick") &&
                          readyToPickReceived === "no";
                        const isStagingNotCorrect =
                          (currentTaskTab === "staging-room" || getStockStage(selectedOrder) === "staging_room") &&
                          stagingSampleCorrect === "no";
                        const isLogoCuttingNotReceived =
                          (currentTaskTab === "logo-cutting" || getProductionStage(selectedOrder) === "logo_cutting") &&
                          prodForm.receivedNoOfLogos === "no";

                        const isPartialStage = selectedOrder?.orderStage === "partial" || String(selectedOrder?.currentStageId || selectedOrder?.stageId || "").startsWith("PRT");
                        const isCompleteStage = selectedOrder?.orderStage === "complete" || String(selectedOrder?.currentStageId || selectedOrder?.stageId || "").startsWith("CMP");
                        const totalStockQty = selectedOrder?.totalQuantity || selectedOrder?.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;
                        const partialBatchQty = Number(selectedOrder?.customerApprovalData?.partialQuantity) || Math.floor(totalStockQty / 2);
                        const remainingCompleteQty = Math.max(0, totalStockQty - partialBatchQty);

                        const targetBatchLimit = isCompleteStage
                          ? (Number(selectedOrder?.productionTaskData?.batchQuantity) || remainingCompleteQty || totalStockQty)
                          : isPartialStage
                          ? (Number(selectedOrder?.productionTaskData?.batchQuantity) || partialBatchQty || Math.floor(totalStockQty / 2))
                          : (Number(selectedOrder?.productionTaskData?.batchQuantity) || totalStockQty);

                        const isPrintedExceeded =
                          (currentTaskTab === "logo-printing" || getProductionStage(selectedOrder) === "logo_printing") &&
                          prodForm.logosPrinted !== "" &&
                          Number(prodForm.logosPrinted) > targetBatchLimit;

                        const isForCuttingExceeded =
                          (currentTaskTab === "logo-printing" || getProductionStage(selectedOrder) === "logo_printing") &&
                          prodForm.logosGivenForCutting !== "" &&
                          Number(prodForm.logosGivenForCutting) > targetBatchLimit;

                        const isCuttingGreaterThanPrinted =
                          (currentTaskTab === "logo-printing" || getProductionStage(selectedOrder) === "logo_printing") &&
                          prodForm.logosGivenForCutting !== "" &&
                          prodForm.logosPrinted !== "" &&
                          Number(prodForm.logosGivenForCutting) > Number(prodForm.logosPrinted);

                        const isCuttingReceivedExceeded =
                          (currentTaskTab === "logo-cutting" || getProductionStage(selectedOrder) === "logo_cutting") &&
                          prodForm.logosReceivedForCutting !== "" &&
                          Number(prodForm.logosReceivedForCutting) > targetBatchLimit;

                        const isCuttingSampleExceeded =
                          (currentTaskTab === "logo-cutting" || getProductionStage(selectedOrder) === "logo_cutting") &&
                          prodForm.sampleLogosCount !== "" &&
                          Number(prodForm.sampleLogosCount) > targetBatchLimit;

                        const isSubmitBlocked =
                          Boolean(
                            (roleView === "stock" && (isReadyToPickNotReceived || isStagingNotCorrect)) ||
                            (roleView === "production" && (
                              isLogoCuttingNotReceived ||
                              isPrintedExceeded ||
                              isForCuttingExceeded ||
                              isCuttingGreaterThanPrinted ||
                              isCuttingReceivedExceeded ||
                              isCuttingSampleExceeded
                            ))
                          );

                        return (
                          <button
                            type="button"
                            className="btn-approve"
                            onClick={isSubmitBlocked ? undefined : () => handleExecutePageAction("submit")}
                            disabled={submittingAction || isSubmitBlocked}
                            style={
                              isSubmitBlocked
                                ? {
                                    background: "#94a3b8",
                                    borderColor: "#94a3b8",
                                    cursor: "not-allowed",
                                    opacity: 0.55,
                                    boxShadow: "none",
                                    pointerEvents: "none",
                                  }
                                : undefined
                            }
                            title={
                              isSubmitBlocked
                                ? isPrintedExceeded
                                  ? `Printed logos (${prodForm.logosPrinted} pcs) cannot exceed the needed limit of ${targetBatchLimit} pcs. Submit is disabled.`
                                  : isForCuttingExceeded
                                  ? `Logos for cutting (${prodForm.logosGivenForCutting} pcs) cannot exceed the needed limit of ${targetBatchLimit} pcs. Submit is disabled.`
                                  : isCuttingGreaterThanPrinted
                                  ? `Logos for cutting (${prodForm.logosGivenForCutting} pcs) cannot exceed printed logos (${prodForm.logosPrinted} pcs). Submit is disabled.`
                                  : isCuttingReceivedExceeded || isCuttingSampleExceeded
                                  ? `Logos count cannot exceed the batch limit of ${targetBatchLimit} pcs. Submit is disabled.`
                                  : isReadyToPickNotReceived || isStagingNotCorrect || isLogoCuttingNotReceived
                                  ? "Sample/Logos marked as not received or incorrect. Submit is not clickable; only Save and Refer Back are available."
                                  : "Cannot submit with current entries."
                                : undefined
                            }
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
                        );
                      })()}
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
                const isPartial = selectedOrder?.orderStage === "partial" || String(selectedOrder?.currentStageId || selectedOrder?.stageId || "").startsWith("PRT");
                const isComplete = selectedOrder?.orderStage === "complete" || String(selectedOrder?.currentStageId || selectedOrder?.stageId || "").startsWith("CMP");
                const totalStockQty = selectedOrder?.totalQuantity || selectedOrder?.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;
                const explicitBatchQty = Number(selectedOrder?.stockTaskData?.batchQuantity) || Number(selectedOrder?.customerApprovalData?.partialQuantity);
                const targetBatchQty = explicitBatchQty > 0
                  ? explicitBatchQty
                  : isPartial
                  ? Math.floor(totalStockQty / 2)
                  : isComplete
                  ? Math.max(0, totalStockQty - (Number(selectedOrder?.customerApprovalData?.partialQuantity) || 0))
                  : totalStockQty;
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

                const totalAllocatedBatch = itemsToRender.reduce((sum, it) => sum + (Number(it.sampleDeduction) || 0), 0);
                const allocationDiff = targetBatchQty - totalAllocatedBatch;

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
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                      <div className="form-field">
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Stage ID</label>
                        <input
                          type="text"
                          readOnly
                          value={getStageId(selectedOrder) || "Pending Stage ID"}
                          className="read-only-input bold"
                          style={{ fontSize: "14px", fontFamily: "monospace" }}
                        />
                      </div>

                      <div className="form-field">
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Base Order ID</label>
                        <input
                          type="text"
                          readOnly
                          value={selectedOrder.orderId || "Pending Order ID"}
                          className="read-only-input bold"
                          style={{ fontSize: "14px", fontFamily: "monospace" }}
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

                    {/* BATCH ALLOCATION SUMMARY BANNER (For Partial & Complete Runs) */}
                    {(isPartial || isComplete) && (
                      <div
                        style={{
                          marginBottom: "16px",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          backgroundColor: allocationDiff === 0 ? "#f0fdf4" : allocationDiff > 0 ? "#fffbeb" : "#fef2f2",
                          border: `1px solid ${allocationDiff === 0 ? "#bbf7d0" : allocationDiff > 0 ? "#fde68a" : "#fecaca"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <Package size={17} color={allocationDiff === 0 ? "#15803d" : allocationDiff > 0 ? "#b45309" : "#dc2626"} />
                          <div>
                            <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#1e293b" }}>
                              {isPartial ? "Partial Batch Garment Allocation:" : "Remaining Complete Batch Garment Allocation:"}
                            </span>
                            <span style={{ fontSize: "13px", marginLeft: "8px", color: "#334155" }}>
                              Target: <strong>{targetBatchQty} pcs</strong> (matching Logo Printing &amp; Cutting) &nbsp;|&nbsp;
                              Currently Allocated: <strong style={{ color: allocationDiff === 0 ? "#15803d" : allocationDiff > 0 ? "#b45309" : "#dc2626" }}>{totalAllocatedBatch} pcs</strong>
                            </span>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            padding: "4px 12px",
                            borderRadius: "6px",
                            backgroundColor: allocationDiff === 0 ? "#dcfce7" : allocationDiff > 0 ? "#fef3c7" : "#fee2e2",
                            color: allocationDiff === 0 ? "#15803d" : allocationDiff > 0 ? "#b45309" : "#dc2626",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          {allocationDiff === 0
                            ? "✓ Fully Allocated (Ready to Pick)"
                            : allocationDiff > 0
                            ? `⚠ ${allocationDiff} pcs remaining to allocate across items`
                            : `⚠ ${Math.abs(allocationDiff)} pcs over target`}
                        </span>
                      </div>
                    )}

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
                              <th style={{ minWidth: "110px", padding: "10px 8px", fontSize: "12.5px" }}>{isPartial ? "For Partial (pcs)" : isComplete ? "For Remaining (pcs)" : "For Sample (pcs)"}</th>
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
                              <th style={{ width: "10%", padding: "7px 5px", fontSize: "11.5px" }}>{isPartial ? "For Partial" : isComplete ? "For Remaining" : "For Sample"}</th>
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
                              <th style={{ minWidth: "100px", padding: "10px 8px", fontSize: "12.5px" }}>{isPartial ? "For Partial" : isComplete ? "For Remaining" : "For Sample"}</th>
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

                            const partialDed = it.partialDeduction !== undefined
                              ? Number(it.partialDeduction)
                              : (isComplete ? (selectedOrder.customerApprovalData?.partialQuantity ? (idx === 0 ? Number(selectedOrder.customerApprovalData.partialQuantity) : 0) : 0) : 0);

                            const remainingToComplete = it.remainingToComplete !== undefined
                              ? Number(it.remainingToComplete)
                              : (isComplete ? Math.max(0, (Number(it.quantity) || 0) - partialDed) : (Number(it.quantity) || 0));

                            const isYetToBeCompleted = isComplete
                              ? (remainingToComplete > 0 || samplePcs > 0)
                              : isPartial
                              ? (samplePcs > 0)
                              : true;

                            const rem = isAvail ? Math.max(0, (Number(it.quantity) || 0) - samplePcs) : Math.max(0, (Number(it.quantity) || 0) - deficitNum - samplePcs);
                            const rawDeprec = it.stockDepreciation;
                            const deprecNote = (!rawDeprec || /full\s*stock|deficit|giving|available/i.test(rawDeprec))
                              ? `${rem} pcs`
                              : rawDeprec;

                            return (
                              <tr
                                key={it.id || idx}
                                style={{
                                  borderBottom: "1px solid #e2e8f0",
                                  backgroundColor: isYetToBeCompleted ? "#f0fdf4" : "#f8fafc",
                                  borderLeft: isYetToBeCompleted ? "4px solid #10b981" : "4px solid #cbd5e1",
                                  opacity: isYetToBeCompleted ? 1 : 0.65,
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <td style={{ textAlign: "center", padding: "10px 6px", fontSize: "13.5px", color: isYetToBeCompleted ? "#0f172a" : "#94a3b8", fontWeight: isYetToBeCompleted ? 700 : 500 }}>
                                  {idx + 1}
                                </td>
                                <td className="item-name-cell" style={{ padding: "10px 8px", fontSize: "13.5px", color: isYetToBeCompleted ? "#0f172a" : "#64748b", fontWeight: isYetToBeCompleted ? 700 : 500 }}>
                                  <span>{it.item || it.enterItem || it.itemType || "Apparel Item"}</span>
                                  {isComplete && (
                                    isYetToBeCompleted ? (
                                      <span style={{ marginLeft: "8px", display: "inline-block", padding: "2px 7px", borderRadius: "4px", background: "#dcfce7", border: "1px solid #86efac", color: "#15803d", fontSize: "11px", fontWeight: 700 }}>
                                        ● To Verify ({remainingToComplete} pcs)
                                      </span>
                                    ) : (
                                      <span style={{ marginLeft: "8px", display: "inline-block", padding: "2px 7px", borderRadius: "4px", background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#64748b", fontSize: "11px", fontWeight: 600 }}>
                                        ✓ Completed in Partial ({partialDed} pcs)
                                      </span>
                                    )
                                  )}
                                  {isPartial && (
                                    isYetToBeCompleted ? (
                                      <span style={{ marginLeft: "8px", display: "inline-block", padding: "2px 7px", borderRadius: "4px", background: "#dcfce7", border: "1px solid #86efac", color: "#15803d", fontSize: "11px", fontWeight: 700 }}>
                                        ● For Partial ({samplePcs} pcs)
                                      </span>
                                    ) : (
                                      <span style={{ marginLeft: "8px", display: "inline-block", padding: "2px 7px", borderRadius: "4px", background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#94a3b8", fontSize: "11px", fontWeight: 500 }}>
                                        0 pcs (In Complete Stage)
                                      </span>
                                    )
                                  )}
                                </td>
                                <td style={{ padding: "9px 8px", fontSize: "13.5px", color: isYetToBeCompleted ? "#334155" : "#94a3b8" }}>{formatPrintingType(it.printingType)}</td>
                                {hasSublimation && (
                                  <td style={{ padding: "9px 8px", fontSize: "13.5px", color: isYetToBeCompleted ? "#334155" : "#94a3b8" }}>{it.sublimationOption || it.sublimation || "-"}</td>
                                )}
                                <td style={{ padding: "9px 8px", fontSize: "13.5px", color: isYetToBeCompleted ? "#334155" : "#94a3b8" }}>{it.fabric || "-"}</td>
                                <td style={{ padding: "9px 8px", fontSize: "13.5px", fontWeight: isYetToBeCompleted ? 700 : 500, color: isYetToBeCompleted ? "#0f172a" : "#94a3b8" }}>{it.quantity ? `${it.quantity} pcs` : "0 pcs"}</td>
                                <td style={{ padding: "9px 8px", fontSize: "13.5px", color: isYetToBeCompleted ? "#334155" : "#94a3b8" }}>{it.size || "M"}</td>
                                <td style={{ padding: "9px 8px", fontSize: "13.5px", color: isYetToBeCompleted ? "#334155" : "#94a3b8" }}>{it.color || "-"}</td>

                                {activeStockStage === "verification" ? (
                                  <>
                                    {/* Stock Available */}
                                    <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                      {!isYetToBeCompleted ? (
                                        <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: "5px", background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
                                          {isComplete ? "Already Fulfilled" : "In Complete Stage"}
                                        </span>
                                      ) : isViewOnlyStock ? (
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
                                      {!isYetToBeCompleted ? (
                                        <span style={{ color: "#94a3b8", fontSize: "13px" }}>-</span>
                                      ) : isAvail ? (
                                        <span style={{ color: "#475569", fontSize: "13px", fontWeight: 500 }}>
                                          Full ({isComplete ? remainingToComplete : (it.quantity || 0)} pcs)
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

                                    {/* How many given for sample / batch */}
                                    <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                      {!isYetToBeCompleted ? (
                                        <span style={{ fontWeight: 600, fontSize: "13px", color: "#94a3b8" }}>
                                          0 pcs
                                        </span>
                                      ) : isViewOnlyStock ? (
                                        <span style={{ fontWeight: 600, fontSize: "13.5px", color: "#1e293b" }}>
                                          {samplePcs} pcs
                                        </span>
                                      ) : (
                                        <input
                                          type="number"
                                          min="0"
                                          max={isComplete ? remainingToComplete : (Number(it.quantity) || 0)}
                                          value={it.sampleDeduction ?? 0}
                                          onChange={(e) => handleItemStockChange(idx, "sampleDeduction", e.target.value)}
                                          style={{
                                            width: "100%",
                                            maxWidth: "80px",
                                            padding: "7px 8px",
                                            borderRadius: "6px",
                                            border: "1px solid #86efac",
                                            fontSize: "13.5px",
                                            fontWeight: 700,
                                            color: "#15803d",
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
                                      {!isYetToBeCompleted ? (
                                        <span style={{ fontSize: "12.5px", color: "#94a3b8" }}>
                                          {isComplete ? "0 pcs (Fulfilled in Partial)" : `${it.quantity || 0} pcs (In Complete Stage)`}
                                        </span>
                                      ) : isViewOnlyStock ? (
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
                                      {!isYetToBeCompleted ? (
                                        <span style={{ color: "#94a3b8", fontSize: "11.5px" }}>Fulfilled in Partial</span>
                                      ) : (
                                        <span style={{ color: "#1e293b", fontWeight: 600 }}>
                                          {isAvail ? "In Stock" : `Deficit (${deficitPcs || "0"})`}
                                        </span>
                                      )}
                                    </td>

                                    {/* Given for Sample / Batch */}
                                    <td style={{ verticalAlign: "middle", padding: "7px 5px", fontSize: "12px" }}>
                                      {!isYetToBeCompleted ? (
                                        <span style={{ color: "#94a3b8" }}>0 pcs</span>
                                      ) : (
                                        <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: "4px", background: "#dcfce7", color: "#15803d", fontWeight: 700 }}>
                                          {samplePcs} pcs
                                        </span>
                                      )}
                                    </td>

                                    {/* Depreciation Note */}
                                    <td style={{ verticalAlign: "middle", padding: "7px 5px", fontSize: "12px", wordBreak: "break-word" }}>
                                      {!isYetToBeCompleted ? (
                                        <span style={{ color: "#94a3b8" }}>-</span>
                                      ) : (
                                        <span style={{ color: "#1e293b", fontWeight: 500 }}>
                                          {deprecNote}
                                        </span>
                                      )}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    {/* Stock Status */}
                                    <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                      {!isYetToBeCompleted ? (
                                        <span style={{ color: "#94a3b8", fontSize: "12px" }}>Fulfilled in Partial</span>
                                      ) : (
                                        <span style={{ color: "#1e293b", fontWeight: 600, fontSize: "13px" }}>
                                          {isAvail ? "In Stock" : `Deficit (${deficitPcs || 0} pcs)`}
                                        </span>
                                      )}
                                    </td>

                                    {/* Given for Sample / Batch */}
                                    <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                      {!isYetToBeCompleted ? (
                                        <span style={{ color: "#94a3b8" }}>0 pcs</span>
                                      ) : (
                                        <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: "4px", background: "#dcfce7", color: "#15803d", fontWeight: 700, fontSize: "13px" }}>
                                          {samplePcs} pcs
                                        </span>
                                      )}
                                    </td>

                                    {/* Ready to Pick Status */}
                                    <td style={{ verticalAlign: "middle", padding: "9px 8px" }}>
                                      {!isYetToBeCompleted ? (
                                        <span style={{ color: "#94a3b8" }}>-</span>
                                      ) : (
                                        <span style={{ color: "#1e293b", fontWeight: 600, fontSize: "13px" }}>
                                          {selectedOrder.stockTaskData?.readyToPickReceived !== false
                                            ? "Received"
                                            : `Deficit (${selectedOrder.stockTaskData?.readyToPickNotReceivedCount || 0} pcs)`}
                                        </span>
                                      )}
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
                            {isPartial ? `Partial Batch Received? (${targetBatchQty} pcs)` : isComplete ? `Remaining Batch Received? (${targetBatchQty} pcs)` : "Sample Received?"}
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
                              {isPartial ? "Partial Batch Attachments:" : isComplete ? "Complete Batch Attachments:" : "Sample Attachments:"}
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
                        {/* Attachments */}
                        <div>
                          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>
                            {isPartial ? "Partial Batch Attachments:" : isComplete ? "Complete Batch Attachments:" : "Sample Attachments:"}
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
                              {isPartial ? `Partial Batch Received Correct? (${targetBatchQty} pcs)` : isComplete ? `Remaining Batch Received Correct? (${targetBatchQty} pcs)` : "Sample Received Correct?"}
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
                const isPartial = selectedOrder?.orderStage === "partial" || String(selectedOrder?.currentStageId || selectedOrder?.stageId || "").startsWith("PRT");
                const isComplete = selectedOrder?.orderStage === "complete" || String(selectedOrder?.currentStageId || selectedOrder?.stageId || "").startsWith("CMP");
                const totalStockQty = selectedOrder?.totalQuantity || selectedOrder?.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;
                const explicitBatchQty = Number(selectedOrder?.productionTaskData?.batchQuantity) || Number(selectedOrder?.customerApprovalData?.partialQuantity);
                const targetBatchQty = explicitBatchQty > 0
                  ? explicitBatchQty
                  : isPartial
                  ? Math.floor(totalStockQty / 2)
                  : isComplete
                  ? Math.max(0, totalStockQty - (Number(selectedOrder?.customerApprovalData?.partialQuantity) || 0))
                  : totalStockQty;

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
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                      <div className="form-field">
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Stage ID</label>
                        <input
                          type="text"
                          readOnly
                          value={getStageId(selectedOrder) || "Pending Stage ID"}
                          className="read-only-input bold"
                          style={{ fontSize: "14px", fontFamily: "monospace" }}
                        />
                      </div>

                      <div className="form-field">
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Base Order ID</label>
                        <input
                          type="text"
                          readOnly
                          value={selectedOrder.orderId || "Pending Order ID"}
                          className="read-only-input bold"
                          style={{ fontSize: "14px", fontFamily: "monospace" }}
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
                            {isPartial ? "Logos Needed (Partial Batch)" : isComplete ? "Logos Needed (Remaining Batch)" : "Logos Needed"}
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={`${targetBatchQty} pcs`}
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
                            <div>
                              <input
                                type="number"
                                min="0"
                                max={targetBatchQty}
                                placeholder={`Enter printed... (max ${targetBatchQty})`}
                                value={prodForm.logosPrinted}
                                onChange={(e) => setProdForm({ ...prodForm, logosPrinted: e.target.value })}
                                onBlur={(e) => {
                                  const val = Number(e.target.value);
                                  if (e.target.value !== "" && val > targetBatchQty) {
                                    setProdForm((prev) => ({ ...prev, logosPrinted: targetBatchQty }));
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  border: (prodForm.logosPrinted !== "" && Number(prodForm.logosPrinted) > targetBatchQty) ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                                  fontSize: "14px",
                                  fontWeight: 600,
                                  color: "#1e293b",
                                  backgroundColor: (prodForm.logosPrinted !== "" && Number(prodForm.logosPrinted) > targetBatchQty) ? "#fef2f2" : "#ffffff",
                                  outline: "none",
                                  boxSizing: "border-box"
                                }}
                              />
                              {prodForm.logosPrinted !== "" && Number(prodForm.logosPrinted) > targetBatchQty && (
                                <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#dc2626", fontWeight: 600 }}>
                                  ⚠️ Cannot exceed needed limit ({targetBatchQty} pcs)
                                </p>
                              )}
                            </div>
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
                            <div>
                              <input
                                type="number"
                                min="0"
                                max={targetBatchQty}
                                placeholder={`Enter for cutting... (max ${targetBatchQty})`}
                                value={prodForm.logosGivenForCutting}
                                onChange={(e) => setProdForm({ ...prodForm, logosGivenForCutting: e.target.value })}
                                onBlur={(e) => {
                                  const val = Number(e.target.value);
                                  if (e.target.value !== "" && val > targetBatchQty) {
                                    setProdForm((prev) => ({ ...prev, logosGivenForCutting: targetBatchQty }));
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  border: ((prodForm.logosGivenForCutting !== "" && Number(prodForm.logosGivenForCutting) > targetBatchQty) || (prodForm.logosGivenForCutting !== "" && prodForm.logosPrinted !== "" && Number(prodForm.logosGivenForCutting) > Number(prodForm.logosPrinted))) ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                                  fontSize: "14px",
                                  fontWeight: 600,
                                  color: "#1e293b",
                                  backgroundColor: ((prodForm.logosGivenForCutting !== "" && Number(prodForm.logosGivenForCutting) > targetBatchQty) || (prodForm.logosGivenForCutting !== "" && prodForm.logosPrinted !== "" && Number(prodForm.logosGivenForCutting) > Number(prodForm.logosPrinted))) ? "#fef2f2" : "#ffffff",
                                  outline: "none",
                                  boxSizing: "border-box"
                                }}
                              />
                              {prodForm.logosGivenForCutting !== "" && Number(prodForm.logosGivenForCutting) > targetBatchQty ? (
                                <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#dc2626", fontWeight: 600 }}>
                                  ⚠️ Cannot exceed needed limit ({targetBatchQty} pcs)
                                </p>
                              ) : prodForm.logosGivenForCutting !== "" && prodForm.logosPrinted !== "" && Number(prodForm.logosGivenForCutting) > Number(prodForm.logosPrinted) ? (
                                <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#dc2626", fontWeight: 600 }}>
                                  ⚠️ Cannot exceed printed logos ({prodForm.logosPrinted} pcs)
                                </p>
                              ) : null}
                            </div>
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

                        {/* Cutting Fields: Received for Cutting, Giving for Sample */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                          {/* How many logo received for cutting */}
                          <div className="form-field">
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                              {isPartial ? "Received for Cutting (Partial Batch)" : isComplete ? "Received for Cutting (Remaining Batch)" : "Received for Cutting (pcs)"}
                            </label>
                            {isViewOnlyProd || activeProdStage !== "logo_cutting" ? (
                              <input
                                type="text"
                                readOnly
                                value={`${prodForm.logosReceivedForCutting || prodForm.logosGivenForCutting || targetBatchQty} pcs`}
                                className="read-only-input bold"
                                style={{ fontSize: "14px" }}
                              />
                            ) : (
                              <div>
                                <input
                                  type="number"
                                  min="0"
                                  max={targetBatchQty}
                                  value={prodForm.logosReceivedForCutting}
                                  onChange={(e) => setProdForm({ ...prodForm, logosReceivedForCutting: e.target.value })}
                                  onBlur={(e) => {
                                    const val = Number(e.target.value);
                                    if (e.target.value !== "" && val > targetBatchQty) {
                                      setProdForm((prev) => ({ ...prev, logosReceivedForCutting: targetBatchQty }));
                                    }
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    border: (prodForm.logosReceivedForCutting !== "" && Number(prodForm.logosReceivedForCutting) > targetBatchQty) ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "#1e293b",
                                    backgroundColor: (prodForm.logosReceivedForCutting !== "" && Number(prodForm.logosReceivedForCutting) > targetBatchQty) ? "#fef2f2" : "#ffffff",
                                    outline: "none",
                                    boxSizing: "border-box"
                                  }}
                                />
                                {prodForm.logosReceivedForCutting !== "" && Number(prodForm.logosReceivedForCutting) > targetBatchQty && (
                                  <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#dc2626", fontWeight: 600 }}>
                                    ⚠️ Cannot exceed needed limit ({targetBatchQty} pcs)
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* How many giving for sample / batch */}
                          <div className="form-field">
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                              {isPartial ? "For Partial Batch (pcs)" : isComplete ? "For Complete Batch (pcs)" : "For Sample (pcs)"}
                            </label>
                            {isViewOnlyProd || activeProdStage !== "logo_cutting" ? (
                              <input
                                type="text"
                                readOnly
                                value={`${prodForm.sampleLogosCount !== "" && prodForm.sampleLogosCount !== undefined ? prodForm.sampleLogosCount : targetBatchQty} pcs`}
                                className="read-only-input bold"
                                style={{ fontSize: "14px" }}
                              />
                            ) : (
                              <div>
                                <input
                                  type="number"
                                  min="0"
                                  max={targetBatchQty}
                                  value={prodForm.sampleLogosCount}
                                  onChange={(e) => setProdForm({ ...prodForm, sampleLogosCount: e.target.value })}
                                  onBlur={(e) => {
                                    const val = Number(e.target.value);
                                    if (e.target.value !== "" && val > targetBatchQty) {
                                      setProdForm((prev) => ({ ...prev, sampleLogosCount: targetBatchQty }));
                                    }
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    border: (prodForm.sampleLogosCount !== "" && Number(prodForm.sampleLogosCount) > targetBatchQty) ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "#1e293b",
                                    backgroundColor: (prodForm.sampleLogosCount !== "" && Number(prodForm.sampleLogosCount) > targetBatchQty) ? "#fef2f2" : "#ffffff",
                                    outline: "none",
                                    boxSizing: "border-box"
                                  }}
                                />
                                {prodForm.sampleLogosCount !== "" && Number(prodForm.sampleLogosCount) > targetBatchQty && (
                                  <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#dc2626", fontWeight: 600 }}>
                                    ⚠️ Cannot exceed needed limit ({targetBatchQty} pcs)
                                  </p>
                                )}
                              </div>
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

          {/* ACTIVITY LOG SECTION (Department Log, Application Log, Inventory Log) */}
          {selectedOrder && (() => {
            const leadAppr = selectedOrder.leadApproval?.status
              ? selectedOrder.leadApproval
              : {
                  status: selectedOrder.approvalStatus === "Referred Back" ? "Referred Back" : (selectedOrder.approvalStatus || "Pending"),
                  note: "",
                  author: "Sarah Jenkins",
                };
            const stockAppr = selectedOrder.stockApproval?.status
              ? selectedOrder.stockApproval
              : { status: "Pending", note: "", author: "Elena Rostova" };
            const prodAppr = selectedOrder.productionApproval?.status
              ? selectedOrder.productionApproval
              : { status: "Pending", note: "", author: "Marcus Vance" };

            return (
              <div
                style={{
                  marginTop: "20px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "18px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid #e2e8f0",
                    marginBottom: "14px",
                  }}
                >
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                    Activity Log
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      background: "#f1f5f9",
                      padding: "3px",
                      borderRadius: "8px",
                      gap: "4px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {[
                      { key: "department", label: "Department Log" },
                      { key: "application", label: "Application Log" },
                      { key: "inventory", label: "Inventory Log" },
                    ].map((tab) => {
                      const isActive = activeActivityTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setActiveActivityTab(tab.key)}
                          style={{
                            border: "none",
                            background: isActive ? "#ffffff" : "transparent",
                            color: isActive ? "#2563eb" : "#475569",
                            fontWeight: isActive ? 700 : 600,
                            fontSize: "12.5px",
                            padding: "6px 14px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            boxShadow: isActive ? "0 1px 2px rgba(15, 23, 42, 0.08)" : "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MINI TAB 1: DEPARTMENT LOG */}
                {activeActivityTab === "department" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {[
                      {
                        title: "Task 0 - Lead Manager Clearance",
                        sub: `${leadAppr.author || "Sarah Jenkins"} (Lead Manager)`,
                        status: leadAppr.status || "Pending",
                        noteLabel: "Lead Manager Notes",
                        note: leadAppr.note,
                        defaultNote: leadAppr.status === "Approved" ? "Approved by Lead Manager" : "Awaiting Review",
                      },
                      {
                        title: "Task 1 - Stock Room",
                        sub: "Elena Rostova (Stock Room Manager)",
                        status: stockAppr.status || "Pending",
                        noteLabel: "Stock Room Notes",
                        note: stockAppr.note,
                        defaultNote: stockAppr.status === "Approved" ? "Approved by Stock Room" : "Awaiting Review",
                      },
                      {
                        title: "Task 2 - Production Room",
                        sub: "Marcus Vance (Production Lead)",
                        status: prodAppr.status || "Pending",
                        noteLabel: "Production Notes",
                        note: prodAppr.note,
                        defaultNote: prodAppr.status === "Approved" ? "Approved by Production" : "Awaiting Review",
                      },
                    ].map((t, tIdx) => {
                      const pillBg = t.status === "Approved" ? "#d1fae5" : t.status === "Referred Back" ? "#fee2e2" : "#fef3c7";
                      const pillColor = t.status === "Approved" ? "#065f46" : t.status === "Referred Back" ? "#b91c1c" : "#b45309";
                      return (
                        <div
                          key={tIdx}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1.2fr 150px 1.4fr",
                            alignItems: "center",
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "9px",
                            padding: "10px 16px",
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a", lineHeight: 1.25 }}>{t.title}</div>
                            <div style={{ fontSize: "11.5px", color: "#64748b", lineHeight: 1.2 }}>{t.sub}</div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                            <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#64748b", lineHeight: 1.1 }}>Status</span>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "3px 12px",
                                borderRadius: "20px",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                minWidth: "88px",
                                background: pillBg,
                                color: pillColor,
                              }}
                            >
                              {t.status}
                            </span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right", gap: "2px" }}>
                            <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#64748b", lineHeight: 1.1 }}>{t.noteLabel}</span>
                            {t.note ? (
                              <div style={{ fontSize: "12px", fontWeight: 600, color: t.status === "Referred Back" ? "#dc2626" : "#0f172a", lineHeight: 1.25 }}>
                                {t.note}
                              </div>
                            ) : (
                              <div style={{ fontSize: "11.5px", color: "#94a3b8", fontStyle: "italic", lineHeight: 1.2 }}>{t.defaultNote}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* MINI TAB 2: APPLICATION LOG */}
                {activeActivityTab === "application" && (() => {
                  const d = selectedOrder || {};
                  const rawLogs = Array.isArray(d.activityLogs) ? d.activityLogs : [];
                  const combinedLogs = [];

                  const normStage = (d.orderStage || "sample").toLowerCase().trim();
                  const normSub = (d.subStage || "order").toLowerCase().trim().replace(/\s+/g, "-");
                  const isOrd = (d.query || "order").toLowerCase().trim() === "order";
                  const sampleSubOrder = ["order", "dtf-pending", "stock", "printing", "ready-to-pick-up", "staging-ground", "customer-approval-awaiting"];
                  const curSampleIdx = normStage === "sample" ? (normSub === "staging-room" ? 5 : sampleSubOrder.indexOf(normSub)) : sampleSubOrder.length;

                  const hasLogMatching = (regex) =>
                    rawLogs.some((l) => regex.test(`${l.action || ""} ${l.stage || ""} ${l.details || ""}`));

                  // 1. Creation Log
                  if (!hasLogMatching(/created/i)) {
                    const initChanges = [];
                    if (d.orderId) initChanges.push(`Order ID: ${d.orderId}`);
                    if (d.employeeName) initChanges.push(`Employee Name: ${d.employeeName}`);
                    if (d.companyName) initChanges.push(`Company Name: ${d.companyName}`);
                    if (d.clientName) initChanges.push(`Client Name: ${d.clientName}`);
                    if (d.phoneNumber) initChanges.push(`Phone Number: ${d.phoneNumber}`);
                    if (d.totalQuantity) initChanges.push(`Total Quantity: ${d.totalQuantity} pcs`);
                    if (d.totalAmount) initChanges.push(`Total Amount: ₹${d.totalAmount}`);
                    if (d.netAmount) initChanges.push(`Net Amount: ₹${d.netAmount}`);
                    if (Array.isArray(d.items) && d.items.length > 0) {
                      d.items.forEach((it, idx) => {
                        const name = it.item || it.enterItem || it.itemType || "Item";
                        initChanges.push(
                          `Item #${idx + 1} (${name}): Printing: ${it.printingType || "-"}, Fabric: ${it.fabric || "-"}, Qty: ${it.quantity || 0} pcs, Size: ${it.size || "-"}, Color: ${it.color || "-"}`
                        );
                      });
                    }
                    combinedLogs.push({
                      action: "Order Created & Submitted",
                      stage: "Sample → Order",
                      performedBy: d.employeeName || "Sales Executive",
                      role: "Sales Executive",
                      details: `Application (${d.orderId || "Order"}) created and submitted by ${d.employeeName || "Sales Executive"}. Sent to Sample → Order for Lead Manager Clearance.`,
                      changes: initChanges,
                      timestamp: d.createdAt,
                    });
                  }

                  // 2. Task 0 - Lead Manager Clearance & Move to DTF Pending
                  const leadManagerApproved =
                    d.leadApproval?.status === "Approved" ||
                    curSampleIdx >= 1 ||
                    normStage === "partial" ||
                    normStage === "complete" ||
                    (Array.isArray(d.approvalComments) && d.approvalComments.some((c) => /lead manager/i.test(c.role || "") && c.status === "Approved"));

                  if (isOrd && leadManagerApproved && !hasLogMatching(/Task 0|Lead Manager Approved/i)) {
                    const lmComment = Array.isArray(d.approvalComments)
                      ? d.approvalComments.find((c) => /lead manager/i.test(c.role || "") && c.status === "Approved")
                      : null;
                    const lmAuthor = d.leadApproval?.author || lmComment?.author || "Sarah Jenkins";
                    const lmNote = d.leadApproval?.note || lmComment?.comment || "Approved by Lead Manager";
                    combinedLogs.push({
                      action: "Task 0 - Approved by Lead Manager (Moved to DTF Pending)",
                      stage: "Sample → DTF Pending",
                      performedBy: lmAuthor,
                      role: "Lead Manager",
                      details: `Task 0 (Lead Manager Clearance) approved by ${lmAuthor} (Lead Manager). Application moved from Sample → Order to Sample → DTF Pending, and assigned to Stock Room Manager (Elena Rostova) & Production Room (Marcus Vance).`,
                      changes: [
                        "From Stage: Sample → Order",
                        "To Stage: Sample → DTF Pending",
                        "Task 0 (Lead Manager Clearance): Approved",
                        "Assigned Task 1: Stock Room Clearance (Elena Rostova — Verification)",
                        "Assigned Task 2: Production Room Clearance (Marcus Vance — Logo Printing)",
                        ...(lmNote ? [`Lead Manager Note: "${lmNote}"`] : []),
                      ],
                      timestamp: d.leadApproval?.updatedAt || lmComment?.createdAt || d.createdAt,
                    });
                  }

                  // 3. Stock Room Manager Flow (Verification -> Ready to Pick -> Staging Room -> Task 1 Approved)
                  const stStage = (d.stockTaskStage || "").toLowerCase();
                  const stData = d.stockTaskData || {};
                  const isStockVerified =
                    stData.verificationSubmitted ||
                    ["ready_to_pick", "staging_room", "completed"].includes(stStage) ||
                    d.stockApproval?.status === "Approved";
                  const isStockReadyToPickDone =
                    stData.readyToPickSubmitted ||
                    ["staging_room", "completed"].includes(stStage) ||
                    d.stockApproval?.status === "Approved";
                  const isStockApproved =
                    stStage === "completed" || d.stockApproval?.status === "Approved";

                  if (isOrd && isStockVerified && !hasLogMatching(/Stock Task - Verification|Verification Submitted|Verification Completed/i)) {
                    const sampleQty = stData.sampleDeduction !== undefined ? stData.sampleDeduction : 1;
                    const stockChanges = [
                      "From: Sample → DTF Pending / Task 1 Stock Room (Verification)",
                      "To: Stock Room → Ready to Pick",
                      `Stock Availability Verified: ${stData.isStockAvailable === false ? "Partial / Deficit Noted" : "Yes (In Stock)"}`,
                      `Sample Quantity Allocated: ${sampleQty} pcs`,
                    ];
                    if (stData.stockDepreciation) {
                      stockChanges.push(`Remaining Stock After Sample Deduction: ${stData.stockDepreciation}`);
                    }
                    combinedLogs.push({
                      action: "Stock Room Manager - Verification Completed (Moved to Ready to Pick)",
                      stage: "Stock Room → Ready to Pick",
                      performedBy: d.stockApproval?.author || "Elena Rostova",
                      role: "Stock Room Manager",
                      details: `Stock Room inventory verification completed by ${d.stockApproval?.author || "Elena Rostova"} (Stock Room Manager). Application moved from Stock Verification to Ready to Pick.`,
                      changes: stockChanges,
                      timestamp: stData.verifiedAt || d.stockApproval?.updatedAt || d.updatedAt || d.createdAt,
                    });
                  }

                  if (isOrd && isStockReadyToPickDone && !hasLogMatching(/Stock Task - Ready To Pick|Ready to Pick Submitted|Ready to Pick Completed/i)) {
                    combinedLogs.push({
                      action: "Stock Room Manager - Ready to Pick Completed (Moved to Staging Room)",
                      stage: "Stock Room → Staging Room",
                      performedBy: d.stockApproval?.author || "Elena Rostova",
                      role: "Stock Room Manager",
                      details: `Sample items picked and verified in Ready to Pick by ${d.stockApproval?.author || "Elena Rostova"} (Stock Room Manager). Application moved from Ready to Pick to Staging Room.`,
                      changes: [
                        "From: Stock Room → Ready to Pick",
                        "To: Stock Room → Staging Room",
                        `Sample Received in Ready to Pick: ${stData.readyToPickReceived === false ? "No" : "Yes"}`,
                      ],
                      timestamp: stData.readyToPickAt || d.stockApproval?.updatedAt || d.updatedAt || d.createdAt,
                    });
                  }

                  if (isOrd && isStockApproved && !hasLogMatching(/Task 1 - Stock Room Approved/i)) {
                    const stAuthor = d.stockApproval?.author || "Elena Rostova";
                    const stNote = d.stockApproval?.note || "Approved by Stock Room";
                    combinedLogs.push({
                      action: "Task 1 - Stock Room Clearance Approved",
                      stage: "Stock Room → Approved",
                      performedBy: stAuthor,
                      role: "Stock Room Manager",
                      details: `Staging Room verification completed and Task 1 (Stock Room Clearance) approved by ${stAuthor} (Stock Room Manager). Stock items released to Sample → Stock / Printing.`,
                      changes: [
                        "From: Stock Room → Staging Room",
                        "To: Task 1 Stock Room Clearance Approved (Released to Sample → Stock / Printing)",
                        "Task 1 Status: Approved",
                        `Sample Quantity Released: ${stData.sampleDeduction !== undefined ? stData.sampleDeduction : 1} pcs`,
                        ...(stNote ? [`Stock Room Note: "${stNote}"`] : []),
                      ],
                      timestamp: stData.stagingApprovedAt || d.stockApproval?.updatedAt || d.updatedAt || d.createdAt,
                    });
                  }

                  // 4. Production Room Flow (Logo Printing -> Logo Cutting -> Task 2 Approved)
                  const prStage = (d.productionTaskStage || "").toLowerCase();
                  const prData = d.productionTaskData || {};
                  const isLogoPrintingDone =
                    prData.printingSubmitted ||
                    ["logo_cutting", "completed"].includes(prStage) ||
                    d.productionApproval?.status === "Approved";
                  const isProdApproved =
                    prStage === "completed" || d.productionApproval?.status === "Approved";

                  if (isOrd && isLogoPrintingDone && !hasLogMatching(/Logo Printing Submitted|Logo Printing Completed/i)) {
                    const prChanges = [
                      "From: Sample → DTF Pending / Task 2 Production Room (Logo Printing)",
                      "To: Production Room → Logo Cutting",
                    ];
                    if (prData.logosPrinted !== undefined && prData.logosPrinted !== "") {
                      prChanges.push(`Logos Printed: ${prData.logosPrinted} pcs`);
                    }
                    if (prData.logosGivenForCutting !== undefined && prData.logosGivenForCutting !== "") {
                      prChanges.push(`Logos Given for Cutting: ${prData.logosGivenForCutting} pcs`);
                    }
                    combinedLogs.push({
                      action: "Production Room - Logo Printing Completed (Moved to Logo Cutting)",
                      stage: "Production Room → Logo Cutting",
                      performedBy: d.productionApproval?.author || "Marcus Vance",
                      role: "Production Lead",
                      details: `DTF / Logo Printing completed in Production Room by ${d.productionApproval?.author || "Marcus Vance"} (Production Lead). Application moved from Logo Printing to Logo Cutting.`,
                      changes: prChanges,
                      timestamp: d.productionApproval?.updatedAt || d.updatedAt || d.createdAt,
                    });
                  }

                  if (isOrd && isProdApproved && !hasLogMatching(/Task 2 - Production Approved|Task 2 - Production Room Approved/i)) {
                    const prAuthor = d.productionApproval?.author || "Marcus Vance";
                    const prNote = d.productionApproval?.note || "Approved by Production Lead";
                    const prApproveChanges = [
                      "From: Production Room → Logo Cutting",
                      "To: Task 2 Production Room Clearance Approved (Released to Sample → Stock / Printing)",
                      "Task 2 Status: Approved",
                    ];
                    if (prData.logosForPrinting !== undefined && prData.logosForPrinting !== "") {
                      prApproveChanges.push(`Logos for Printing: ${prData.logosForPrinting} pcs`);
                    }
                    if (prData.sampleLogosCount !== undefined && prData.sampleLogosCount !== "") {
                      prApproveChanges.push(`Sample Logos Released: ${prData.sampleLogosCount} pcs`);
                    }
                    if (prNote) {
                      prApproveChanges.push(`Production Note: "${prNote}"`);
                    }
                    combinedLogs.push({
                      action: "Task 2 - Production Room Clearance Approved",
                      stage: "Production Room → Approved",
                      performedBy: prAuthor,
                      role: "Production Lead",
                      details: `Logo Cutting completed and Task 2 (Production Room Clearance) approved by ${prAuthor} (Production Lead). DTF / Logo samples released to Sample → Stock / Printing.`,
                      changes: prApproveChanges,
                      timestamp: d.productionApproval?.updatedAt || d.updatedAt || d.createdAt,
                    });
                  }

                  // 5. How Application Came to Sample -> Stock
                  if (isOrd && curSampleIdx >= 2 && !hasLogMatching(/Moved from DTF Pending to Sample → Stock|Moved to Sample → Stock/i)) {
                    combinedLogs.push({
                      action: "Moved to Sample → Stock (From DTF Pending & Department Clearance)",
                      stage: "Sample → Stock",
                      performedBy: d.employeeName || "Sales / Operations",
                      role: "Order Workflow",
                      details: `Application moved from Sample → DTF Pending (and Stock Room / Production Room processing) to Sample → Stock for physical inventory & stock allocation verification.`,
                      changes: [
                        "From Stage: Sample → DTF Pending (after Task 0 Lead Manager Clearance)",
                        "To Stage: Sample → Stock",
                        "DTF Film Preparation: Prepared, printed, and verified in DTF Pending",
                        `Stock Room Status (Task 1 - Elena Rostova): ${d.stockApproval?.status || (isStockVerified ? "In Progress" : "Pending")}`,
                        `Production Room Status (Task 2 - Marcus Vance): ${d.productionApproval?.status || (isLogoPrintingDone ? "In Progress" : "Pending")}`,
                      ],
                      timestamp: d.updatedAt || d.createdAt,
                    });
                  }

                  // 6. How Application Came to Sample -> Printing
                  if (isOrd && curSampleIdx >= 3 && !hasLogMatching(/Moved to Printing|Moved from Stock to Sample → Printing|Moved to Sample → Printing/i)) {
                    combinedLogs.push({
                      action: "Moved to Sample → Printing (From Sample → Stock & Department Clearances)",
                      stage: "Sample → Printing",
                      performedBy:
                        d.stockApproval?.author && d.productionApproval?.author
                          ? `${d.stockApproval.author} & ${d.productionApproval.author}`
                          : d.employeeName || "Operations",
                      role: "Stock & Production Clearance",
                      details: `Application moved to Sample → Printing after Sample → Stock verification and both Task 1 (Stock Room Manager - Elena Rostova) & Task 2 (Production Lead - Marcus Vance) clearances were approved.`,
                      changes: [
                        "From Stage: Sample → Stock (with Stock Room & Production Room Clearances Approved)",
                        "To Stage: Sample → Printing",
                        "Stock Allocation: Verified and allocated for Printing stage",
                        `Stock Sample Released (Elena Rostova): ${stData.sampleDeduction !== undefined ? stData.sampleDeduction : 1} pcs`,
                        `Production Logo Sample Released (Marcus Vance): ${prData.sampleLogosCount !== undefined ? prData.sampleLogosCount : 1} pcs`,
                      ],
                      timestamp: d.productionApproval?.updatedAt || d.stockApproval?.updatedAt || d.updatedAt || d.createdAt,
                    });
                  }

                  // 7. How Application Came to Sample -> Ready to Pick Up
                  if (isOrd && curSampleIdx >= 4 && !hasLogMatching(/Moved from Printing to Sample → Ready To Pick Up|Moved to Sample → Ready to Pick Up/i)) {
                    const pData = d.printingStageData || {};
                    combinedLogs.push({
                      action: "Moved to Sample → Ready to Pick Up (From Sample → Printing)",
                      stage: "Sample → Ready to Pick Up",
                      performedBy: d.employeeName || "Printing Operator",
                      role: "Printing Stage",
                      details: `Sample Printing completed and verified. Application moved from Sample → Printing to Sample → Ready to Pick Up.`,
                      changes: [
                        "From Stage: Sample → Printing",
                        "To Stage: Sample → Ready to Pick Up",
                        `Stock Sample Received in Printing: ${pData.stockSampleReceived === "no" ? "No" : "Yes"}`,
                        `Production Logo Received in Printing: ${pData.prodSampleReceived === "no" ? "No" : "Yes"}`,
                        `Printed Count: ${pData.printedCount ?? 1} pcs`,
                        `Ready to Pick Up Count: ${pData.readyToPickupCount ?? 1} pcs`,
                      ],
                      timestamp: d.updatedAt || d.createdAt,
                    });
                  }

                  // 8. How Application Came to Sample -> Staging Ground
                  if (isOrd && curSampleIdx >= 5 && !hasLogMatching(/Moved from Ready To Pick Up to Sample → Staging Ground|Moved to Sample → Staging Ground/i)) {
                    const rtpData = d.sampleReadyToPickUpData || {};
                    combinedLogs.push({
                      action: "Moved to Sample → Staging Ground (From Sample → Ready to Pick Up)",
                      stage: "Sample → Staging Ground",
                      performedBy: d.employeeName || "Staging Operator",
                      role: "Ready to Pick Up Stage",
                      details: `Sample received from Printing in Ready to Pick Up and verified against client specifications. Application moved from Sample → Ready to Pick Up to Sample → Staging Ground.`,
                      changes: [
                        "From Stage: Sample → Ready to Pick Up",
                        "To Stage: Sample → Staging Ground",
                        "Sample Received from Printing: Yes",
                        `Final Samples for Staging Room: ${rtpData.stagingCount ?? rtpData.readyToPickupCount ?? 1} pcs`,
                      ],
                      timestamp: d.updatedAt || d.createdAt,
                    });
                  }

                  // 9. How Application Came to Sample -> Customer Approval Awaiting
                  if (isOrd && curSampleIdx >= 6 && !hasLogMatching(/Moved from Staging Ground to Sample → Customer Approval Awaiting|Moved to Sample → Customer Approval Awaiting/i)) {
                    const sgData = d.sampleStagingGroundData || {};
                    combinedLogs.push({
                      action: "Moved to Sample → Customer Approval Awaiting (From Sample → Staging Ground)",
                      stage: "Sample → Customer Approval Awaiting",
                      performedBy: d.employeeName || "Staging Operator",
                      role: "Staging Ground Stage",
                      details: `Sample verified in Staging Ground${sgData.rackNo ? ` (Rack No: ${sgData.rackNo})` : ""}. Application moved from Sample → Staging Ground to Sample → Customer Approval Awaiting.`,
                      changes: [
                        "From Stage: Sample → Staging Ground",
                        "To Stage: Sample → Customer Approval Awaiting",
                        "Items Received from Ready to Pick: Yes",
                        ...(sgData.rackNo ? [`Staged on Rack No.: ${sgData.rackNo}`] : []),
                      ],
                      timestamp: d.updatedAt || d.createdAt,
                    });
                  }

                  // 10. Transition to Partial / Complete
                  if (isOrd && (normStage === "partial" || normStage === "complete") && !hasLogMatching(/Partial →/i)) {
                    const caData = d.customerApprovalData || {};
                    combinedLogs.push({
                      action: "Customer Sample Approved — Moved to Partial Stage",
                      stage: "Partial → Order",
                      performedBy: d.employeeName || "Sales Executive",
                      role: "Sales Executive",
                      details: `Customer approved the sample in Sample → Customer Approval Awaiting. Application advanced from Sample stage to Partial → Order.`,
                      changes: [
                        "From Stage: Sample → Customer Approval Awaiting",
                        "To Stage: Partial → Order",
                        "Customer Approved Sample: Yes",
                        ...(caData.paymentStatus ? [`Payment Status: ${String(caData.paymentStatus).replace(/_/g, " ")}`] : []),
                        ...(caData.amountReceived !== undefined ? [`Amount Received: ₹${caData.amountReceived}`] : []),
                      ],
                      timestamp: d.updatedAt || d.createdAt,
                    });
                  }

                  if (isOrd && normStage === "complete" && !hasLogMatching(/Complete →/i)) {
                    combinedLogs.push({
                      action: "Partial Payment Confirmed — Moved to Complete Stage",
                      stage: "Complete → Order",
                      performedBy: d.employeeName || "Sales Executive",
                      role: "Sales Executive",
                      details: `Partial stage payment confirmation completed. Application advanced from Partial → Payment Confirmation to Complete → Order.`,
                      changes: [
                        "From Stage: Partial → Payment Confirmation",
                        "To Stage: Complete → Order",
                      ],
                      timestamp: d.updatedAt || d.createdAt,
                    });
                  }

                  // 11. Include any approvalComments not already covered
                  if (Array.isArray(d.approvalComments) && d.approvalComments.length > 0) {
                    d.approvalComments.forEach((c) => {
                      const commentText = (c.comment || "").trim();
                      const isAlreadyCovered =
                        combinedLogs.some((l) => (l.changes || []).some((ch) => commentText && ch.includes(commentText))) ||
                        rawLogs.some((l) => (l.changes || []).some((ch) => commentText && ch.includes(commentText))) ||
                        (/lead manager/i.test(c.role || "") && c.status === "Approved") ||
                        (/stock/i.test(c.role || "") && c.status === "Approved" && isStockApproved) ||
                        (/production/i.test(c.role || "") && c.status === "Approved" && isProdApproved);

                      if (!isAlreadyCovered) {
                        combinedLogs.push({
                          action: `${c.role || "Department"} - ${c.status || "Update"}`,
                          stage: d.orderStage ? `${d.orderStage.toUpperCase()} → ${(d.subStage || "order").replace(/-/g, " ").toUpperCase()}` : "Sample → Order",
                          performedBy: c.author || "Manager",
                          role: c.role || "Manager",
                          details: c.comment || `Application ${c.status || "updated"} by ${c.author || "Manager"}.`,
                          changes: c.comment ? [`Note: "${c.comment}"`] : [],
                          timestamp: c.createdAt || d.updatedAt || d.createdAt,
                        });
                      }
                    });
                  }

                  // 12. Append all recorded activityLogs
                  rawLogs.forEach((l) => combinedLogs.push(l));

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {combinedLogs.map((logItem, idx) => {
                        const timeStr = logItem.timestamp
                          ? new Date(logItem.timestamp).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: true,
                            })
                          : "—";
                        const isReferBack = /refer/i.test(logItem.action || "");
                        const isEdit = /edit/i.test(logItem.action || "");
                        const badgeBg = isReferBack ? "#fef2f2" : isEdit ? "#eff6ff" : "#ecfdf5";
                        const badgeColor = isReferBack ? "#dc2626" : isEdit ? "#2563eb" : "#059669";
                        const badgeBorder = isReferBack ? "#fecaca" : isEdit ? "#bfdbfe" : "#a7f3d0";

                        return (
                          <div
                            key={logItem._id || idx}
                            style={{
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderLeft: `4px solid ${badgeColor}`,
                              borderRadius: "10px",
                              padding: "14px 18px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                                <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "5px", background: "#e2e8f0", color: "#334155" }}>
                                  #{idx + 1}
                                </span>
                                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                                  {logItem.action || "Application Activity"}
                                </span>
                                {logItem.stage && (
                                  <span style={{ fontSize: "11.5px", fontWeight: 600, padding: "2px 9px", borderRadius: "999px", background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}` }}>
                                    Stage: {logItem.stage}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                                  By: <strong style={{ color: "#0f172a" }}>{logItem.performedBy || "User"}</strong>
                                  {logItem.role ? ` (${logItem.role})` : ""}
                                </span>
                                <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b", background: "#ffffff", padding: "3px 9px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                  {timeStr}
                                </span>
                              </div>
                            </div>
                            {logItem.details && (
                              <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.45 }}>
                                {logItem.details}
                              </div>
                            )}
                            {Array.isArray(logItem.changes) && logItem.changes.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "9px 12px" }}>
                                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                                  Process Flow &amp; Captured Changes
                                </div>
                                {logItem.changes.map((chg, cIdx) => (
                                  <div key={cIdx} style={{ fontSize: "12.5px", color: "#1e293b", fontWeight: 500, display: "flex", alignItems: "flex-start", gap: "6px" }}>
                                    <span style={{ color: "#2563eb", fontWeight: 700 }}>•</span>
                                    <span>{chg}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* MINI TAB 3: INVENTORY LOG (Kept empty as requested) */}
                {activeActivityTab === "inventory" && (
                  <div
                    style={{
                      minHeight: "100px",
                      background: "#f8fafc",
                      border: "1px dashed #cbd5e1",
                      borderRadius: "10px",
                    }}
                  />
                )}
              </div>
            );
          })()}
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
              {taskActionModal.taskType === "logo_cutting" && taskActionModal.actionType === "submit" && (() => {
                const modalOrder = taskActionModal.order;
                const mIsPartial = modalOrder?.orderStage === "partial" || String(modalOrder?.currentStageId || modalOrder?.stageId || "").startsWith("PRT");
                const mIsComplete = modalOrder?.orderStage === "complete" || String(modalOrder?.currentStageId || modalOrder?.stageId || "").startsWith("CMP");
                const mTotalQty = modalOrder?.totalQuantity || modalOrder?.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;
                const mPartialQty = Number(modalOrder?.customerApprovalData?.partialQuantity) || Math.floor(mTotalQty / 2);
                const mRemainingQty = Math.max(0, mTotalQty - mPartialQty);
                const mTargetQty = mIsComplete
                  ? (Number(modalOrder?.productionTaskData?.batchQuantity) || mRemainingQty || mTotalQty)
                  : mIsPartial
                  ? (Number(modalOrder?.productionTaskData?.batchQuantity) || mPartialQty || Math.floor(mTotalQty / 2))
                  : (Number(modalOrder?.productionTaskData?.batchQuantity) || mTotalQty);

                return (
                  <>
                    <div className="task-modal-field">
                      <label>How many logos printed? (pcs) {mTargetQty ? `(max ${mTargetQty})` : ""}</label>
                      <input
                        type="number"
                        min="0"
                        max={mTargetQty}
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
                      <label>How many cut or given? (pcs) {mTargetQty ? `(max ${mTargetQty})` : ""}</label>
                      <input
                        type="number"
                        min="0"
                        max={mTargetQty}
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
                      <label>How many giving for sample / batch? (pcs) {mTargetQty ? `(max ${mTargetQty})` : ""}</label>
                      <input
                        type="number"
                        min="1"
                        max={mTargetQty}
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
                );
              })()}

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

