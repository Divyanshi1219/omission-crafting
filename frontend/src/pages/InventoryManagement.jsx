import { useState, useEffect, useMemo } from "react";
import {
  Upload,
  Download,
  Plus,
  Search,
  Calendar,
  Filter,
  ArrowLeft,
  Paperclip,
  MoreHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Package,
  Layers,
  Sparkles,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  ShoppingCart,
  ShieldAlert,
  Edit3,
  User,
  Check,
  FileText,
  RefreshCw,
  Sliders
} from "lucide-react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import "./InventoryManagement.css";

const STORAGE_KEY = "omission_local_inventory";

// Default categories
const CATEGORIES = [
  "Apparel",
  "T-Shirts",
  "Hoodies",
  "Caps",
  "Mugs",
  "Sublimation Paper",
  "Printing",
  "Packaging",
  "Accessories",
  "Electronics",
  "Wellness",
  "Home & Living",
];

const INVENTORY_TYPES = [
  "Stockroom Inventory",
  "Raw Material",
  "Finished Goods",
  "Packaging",
  "Print Consumables",
];

const STOCKROOMS = [
  "Main Stockroom - Delhi",
  "Central Warehouse - Tirupur",
  "Secondary Stockroom - Mumbai",
  "Factory Floor B",
];

const LOCATIONS = ["Rack A", "Rack B", "Shelf 01", "Shelf 02", "Bin 12", "Zone C"];

const UNITS = ["Pcs", "Ream", "Bottle", "Kit", "Box", "Sets", "Kg", "Mtr"];

// Default stock transactions matching user's requested specification:
// Total Stock = 100, Order 1 used 50, Order 2 reserved 30, Order 3 pending 70 -> In Stock = -50
const DEFAULT_SAMPLE_TRANSACTIONS = [
  {
    id: "tx-1",
    orderId: "ORD00001",
    clientName: "Order 1 (Divyanshi Enterprises)",
    type: "Used",
    quantity: 50,
    impact: -50,
    date: "2026-10-19",
    time: "09:30 AM",
    status: "Completed",
    notes: "50 stocks fulfilled & dispatched for Order 1",
    loggedBy: "Adam (CEO)"
  },
  {
    id: "tx-2",
    orderId: "ORD00002",
    clientName: "Order 2 (Nexus Apparel)",
    type: "Reserved",
    quantity: 30,
    impact: -30,
    date: "2026-10-19",
    time: "09:40 AM",
    status: "Reserved",
    notes: "30 stocks reserved for Order 2",
    loggedBy: "Adam (CEO)"
  },
  {
    id: "tx-3",
    orderId: "ORD00003",
    clientName: "Order 3 (Zenith Garments)",
    type: "Pending",
    quantity: 70,
    impact: -70,
    date: "2026-10-19",
    time: "09:45 AM",
    status: "Pending",
    notes: "70 stocks pending fulfillment for Order 3",
    loggedBy: "Adam (CEO)"
  }
];

const DEFAULT_SAMPLE_ACTIVITIES = [
  {
    id: "act-1",
    action: "Created Inventory Record",
    user: "Adam (CEO)",
    role: "Operations Head",
    timestamp: "Today at 09:48 AM",
    date: "2026-10-19",
    details: "Stockroom inventory check initiated for Main Stockroom - Delhi.",
    badgeType: "primary"
  },
  {
    id: "act-2",
    action: "Stockroom Count Verification",
    user: "Divyanshi Trehan",
    role: "Quality Inspector",
    timestamp: "Today at 09:50 AM",
    date: "2026-10-19",
    details: "Physical stock audit completed for assigned items. Variance verified.",
    badgeType: "info"
  },
  {
    id: "act-3",
    action: "Stock Dispatched (Order 1)",
    user: "Adam (CEO)",
    role: "Operations Head",
    timestamp: "Today at 09:52 AM",
    date: "2026-10-19",
    details: "50 stocks used and dispatched for Order ORD00001.",
    badgeType: "warning"
  },
  {
    id: "act-4",
    action: "Stock Reserved (Order 2)",
    user: "Adam (CEO)",
    role: "Operations Head",
    timestamp: "Today at 09:53 AM",
    date: "2026-10-19",
    details: "30 stocks locked & reserved for confirmed Order ORD00002.",
    badgeType: "warning"
  },
  {
    id: "act-5",
    action: "Pending Backorder (Order 3)",
    user: "Adam (CEO)",
    role: "Operations Head",
    timestamp: "Today at 09:55 AM",
    date: "2026-10-19",
    details: "70 stocks demanded for Order ORD00003. Available In-Stock dropped to -50 (Deficit Alert).",
    badgeType: "danger"
  }
];

export default function InventoryManagement() {
  const { currentUser } = useAuth();

  // Navigation State: 'list' (Screenshot 2) | 'form' (Screenshot 1)
  const [viewMode, setViewMode] = useState("list");

  // Inventory Records List
  const [inventoryList, setInventoryList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search, Filters & Pagination for List View
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'In stock' | 'Low stock' | 'Out of stock'
  const [amountStatusFilter, setAmountStatusFilter] = useState("all");
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form State (Screenshot 1: Stockroom Inventory Form)
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  // Exactly 4 tabs as requested: 'details' | 'items' | 'transactions' | 'activity'
  const [formTab, setFormTab] = useState("details");
  
  const [formNumber, setFormNumber] = useState("");
  const [formInventoryType, setFormInventoryType] = useState("");
  const [formStockroom, setFormStockroom] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formInventoryDate, setFormInventoryDate] = useState("");
  const [formPreparedBy, setFormPreparedBy] = useState("");
  const [formCheckedBy, setFormCheckedBy] = useState("");
  const [formApprovedBy, setFormApprovedBy] = useState("");
  const [formApprovalDate, setFormApprovalDate] = useState("");
  const [formState, setFormState] = useState("");
  
  // Product info for the record
  const [formProductName, setFormProductName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formIncoming, setFormIncoming] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formImage, setFormImage] = useState("");

  // Sub-items table in form (Screenshot 3: Inventory Items)
  const [subItems, setSubItems] = useState([]);
  const [subItemSearch, setSubItemSearch] = useState("");
  const [subItemSearchField, setSubItemSearchField] = useState("item");

  // Stock Transactions State (Requirement 3: Total stock 100, -50 used, -30 reserved, -70 pending => -50 In Stock)
  const [formTotalBaseStock, setFormTotalBaseStock] = useState(0);
  const [formTransactions, setFormTransactions] = useState([]);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txFilterType, setTxFilterType] = useState("all");
  const [txSearchTerm, setTxSearchTerm] = useState("");
  
  // New transaction modal inputs
  const [newTxOrderId, setNewTxOrderId] = useState("");
  const [newTxClientName, setNewTxClientName] = useState("");
  const [newTxType, setNewTxType] = useState("Used");
  const [newTxQuantity, setNewTxQuantity] = useState(50);
  const [newTxStatus, setNewTxStatus] = useState("Completed");
  const [newTxNotes, setNewTxNotes] = useState("");

  // Base Stock editor
  const [isEditingBaseStock, setIsEditingBaseStock] = useState(false);
  const [tempBaseStock, setTempBaseStock] = useState(0);

  // Activity Log State (Requirement 4: Activity log of who made inventory, time, etc.)
  const [formActivities, setFormActivities] = useState([]);
  const [activityNoteInput, setActivityNoteInput] = useState("");

  // Detected Orders list from system leads/orders
  const [detectedOrders, setDetectedOrders] = useState([]);

  // Action status (saving/success)
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");

  // Fetch inventory from backend + localStorage fallback
  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/inventory");
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setInventoryList(res.data.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data.data));
        window.dispatchEvent(new CustomEvent("inventoryUpdated", { detail: res.data.data }));
      } else {
        throw new Error("Invalid response");
      }
    } catch (err) {
      console.warn("Could not fetch inventory from backend, loading local cache:", err.message);
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          setInventoryList(JSON.parse(cached));
        } else {
          setInventoryList([]);
        }
      } catch (_) {
        setInventoryList([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch detected orders from /api/leads
  const fetchDetectedOrders = async () => {
    try {
      const res = await api.get("/api/leads");
      if (res.data && res.data.data && Array.isArray(res.data.data)) {
        const orders = res.data.data
          .filter((l) => l.orderId || l.query === "order")
          .map((l) => ({
            orderId: l.orderId || `ORD-${String(l._id).slice(-5).toUpperCase()}`,
            clientName: l.clientName || l.companyName || "Client Order",
            companyName: l.companyName || "",
            quantity: l.totalQuantity || (l.items && l.items[0]?.quantity) || 50,
            stage: l.orderStage || l.selectedStage || "Order",
          }));
        setDetectedOrders(orders);
      }
    } catch (err) {
      console.warn("Could not fetch orders for transactions:", err.message);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchDetectedOrders();
  }, []);

  // Fetch Next Number for a new record
  const fetchNextNumber = async () => {
    try {
      const res = await api.get("/api/inventory/next-number");
      if (res.data?.nextNumber) {
        return res.data.nextNumber;
      }
    } catch (_) {}
    const yr = new Date().getFullYear();
    const count = inventoryList.length + 1;
    return `INV${String(count).padStart(7, "0")}`;
  };

  // Auto-generate Next Order ID for stock transaction
  const handleAutoGenerateOrderId = async () => {
    try {
      const res = await api.get("/api/leads/next-order-id");
      if (res.data?.nextOrderId) {
        setNewTxOrderId(res.data.nextOrderId);
        return res.data.nextOrderId;
      }
    } catch (_) {}
    const count = (detectedOrders.length || formTransactions.length || 0) + 1;
    const genId = `ORD${String(count).padStart(5, "0")}`;
    setNewTxOrderId(genId);
    return genId;
  };

  // Live Stock Transaction Calculations
  const usedStock = useMemo(() => {
    return formTransactions
      .filter((t) => t.type === "Used")
      .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
  }, [formTransactions]);

  const reservedStock = useMemo(() => {
    return formTransactions
      .filter((t) => t.type === "Reserved")
      .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
  }, [formTransactions]);

  const pendingStock = useMemo(() => {
    return formTransactions
      .filter((t) => t.type === "Pending")
      .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
  }, [formTransactions]);

  const restockStock = useMemo(() => {
    return formTransactions
      .filter((t) => t.type === "Restock")
      .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
  }, [formTransactions]);

  // Net In-Stock Balance: Total Stock - Used - Reserved - Pending + Restock
  const calculatedInStock = useMemo(() => {
    return (Number(formTotalBaseStock) || 0) + restockStock - usedStock - reservedStock - pendingStock;
  }, [formTotalBaseStock, restockStock, usedStock, reservedStock, pendingStock]);

  // Open Form to Add New Product (Completely empty for the user to fill)
  const handleAddNewProduct = () => {
    setSelectedRecordId(null);
    setFormNumber("");
    setFormProductName("");
    setFormSku("");
    setFormInventoryType("");
    setFormStockroom("");
    setFormLocation("");
    setFormCategory("");
    setFormStatus("");
    setFormDescription("");
    setFormInventoryDate("");
    setFormPreparedBy("");
    setFormCheckedBy("");
    setFormApprovedBy("");
    setFormApprovalDate("");
    setFormState("");
    setFormIncoming("");
    setFormStock("");
    setFormPrice("");
    setFormImage("");
    setSubItems([]);
    setFormTotalBaseStock(0);
    setTempBaseStock(0);
    setFormTransactions([]);
    setFormActivities([]);
    setFormTab("details");
    setViewMode("form");
  };

  // Open Form to View/Edit Existing Record
  const handleRowClick = (record) => {
    setSelectedRecordId(record._id || record.id);
    setFormNumber(record.number || "");
    setFormProductName(record.productName || "");
    setFormSku(record.sku || "");
    setFormInventoryType(record.inventoryType || "");
    setFormStockroom(record.stockroom || "");
    setFormLocation(record.location || "");
    setFormCategory(record.category || "");
    setFormStatus(record.status || "");
    setFormDescription(record.description || "");
    setFormInventoryDate(record.inventoryDate || "");
    setFormPreparedBy(record.preparedBy || "");
    setFormCheckedBy(record.checkedBy || "");
    setFormApprovedBy(record.approvedBy || "");
    setFormApprovalDate(record.approvalDate || "");
    setFormState(record.state || "");
    setFormIncoming(record.incoming !== undefined && record.incoming !== null ? record.incoming : "");
    setFormStock(record.stock !== undefined && record.stock !== null ? record.stock : "");
    setFormPrice(record.price !== undefined && record.price !== null ? record.price : "");
    setFormImage(record.image || "");
    setSubItems(Array.isArray(record.items) ? record.items : []);
    const baseStockVal = record.totalBaseStock !== undefined ? record.totalBaseStock : Number(record.stock) || 0;
    setFormTotalBaseStock(baseStockVal);
    setTempBaseStock(baseStockVal);
    setFormTransactions(Array.isArray(record.transactions) ? record.transactions : []);
    setFormActivities(Array.isArray(record.activities) ? record.activities : []);
    setFormTab("details");
    setViewMode("form");
  };

  // Add sub-item row in form (Inventory Items Tab)
  const handleAddSubItem = () => {
    const newItem = {
      id: Date.now(),
      item: "",
      itemCode: `SKU-${Date.now().toString().slice(-4)}`,
      category: formCategory || "Apparel",
      specification: "",
      unit: "Pcs",
      openingStock: 0,
      countedQuantity: 0,
      variance: 0,
      remarks: "",
    };
    setSubItems((prev) => [...prev, newItem]);
  };

  // Update sub-item in form
  const handleSubItemChange = (index, field, value) => {
    setSubItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: value };
      if (field === "openingStock" || field === "countedQuantity") {
        const opening = field === "openingStock" ? Number(value) || 0 : Number(target.openingStock) || 0;
        const counted = field === "countedQuantity" ? Number(value) || 0 : Number(target.countedQuantity) || 0;
        target.variance = counted - opening;
      }
      copy[index] = target;
      return copy;
    });
  };

  // Delete sub-item in form
  const handleDeleteSubItem = (index) => {
    setSubItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Add Stock Transaction Handler
  const handleAddTransactionSubmit = () => {
    const qty = Number(newTxQuantity) || 0;
    if (qty <= 0) {
      alert("Please enter a valid quantity greater than 0.");
      return;
    }
    const resolvedOrderId = newTxOrderId.trim() || `ORD${String(Date.now()).slice(-5)}`;
    let calculatedImpact = -qty;
    if (newTxType === "Restock") {
      calculatedImpact = qty;
    }

    const newTx = {
      id: "tx-" + Date.now(),
      orderId: resolvedOrderId,
      clientName: newTxClientName.trim() || `Customer for ${resolvedOrderId}`,
      type: newTxType,
      quantity: qty,
      impact: calculatedImpact,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: newTxStatus,
      notes: newTxNotes.trim() || `${qty} units ${newTxType.toLowerCase()} for ${resolvedOrderId}`,
      loggedBy: currentUser?.name || formPreparedBy || "Adam (CEO)",
    };

    const updatedTxs = [newTx, ...formTransactions];
    setFormTransactions(updatedTxs);

    // Log Activity for this transaction
    const newAct = {
      id: "act-" + Date.now(),
      action: `Stock Movement: ${newTxType}`,
      user: currentUser?.name || formPreparedBy || "Adam (CEO)",
      role: "Operations Head",
      timestamp: "Today at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toISOString().split("T")[0],
      details: `${qty} stocks ${newTxType.toLowerCase()} for Order ${resolvedOrderId} (${newTx.clientName}). Resulting balance impact: ${calculatedImpact > 0 ? "+" + calculatedImpact : calculatedImpact}.`,
      badgeType: newTxType === "Pending" ? "danger" : newTxType === "Restock" ? "success" : "warning",
    };
    setFormActivities((prev) => [newAct, ...prev]);

    // Reset modal fields and close
    setNewTxOrderId("");
    setNewTxClientName("");
    setNewTxQuantity(50);
    setNewTxNotes("");
    setIsTxModalOpen(false);
  };

  // Delete Stock Transaction
  const handleDeleteTransaction = (txId) => {
    const target = formTransactions.find((t) => t.id === txId);
    if (!target) return;
    setFormTransactions((prev) => prev.filter((t) => t.id !== txId));
    // Log Activity
    const newAct = {
      id: "act-" + Date.now(),
      action: "Removed Stock Transaction",
      user: currentUser?.name || formPreparedBy || "Adam (CEO)",
      role: "Operations Head",
      timestamp: "Today at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toISOString().split("T")[0],
      details: `Removed ${target.type} transaction of ${target.quantity} units for Order ${target.orderId}.`,
      badgeType: "info",
    };
    setFormActivities((prev) => [newAct, ...prev]);
  };

  // Reset to the exact user scenario
  const handleResetExampleScenario = () => {
    setFormTotalBaseStock(100);
    setTempBaseStock(100);
    setFormTransactions(DEFAULT_SAMPLE_TRANSACTIONS);
    const newAct = {
      id: "act-" + Date.now(),
      action: "Loaded Demonstration Scenario",
      user: currentUser?.name || "Adam (CEO)",
      role: "Operations Head",
      timestamp: "Today at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toISOString().split("T")[0],
      details: "Reset stock transactions: Base Stock 100, 50 used (Order 1), 30 reserved (Order 2), 70 pending (Order 3) -> Net In-Stock -50.",
      badgeType: "primary",
    };
    setFormActivities((prev) => [newAct, ...prev]);
  };

  // Post Activity Note Handler
  const handlePostActivityNote = () => {
    if (!activityNoteInput.trim()) return;
    const newAct = {
      id: "act-" + Date.now(),
      action: "Staff Inspection Note",
      user: currentUser?.name || formPreparedBy || "Adam (CEO)",
      role: currentUser?.role || "Operations Head",
      timestamp: "Today at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toISOString().split("T")[0],
      details: activityNoteInput.trim(),
      badgeType: "info",
    };
    setFormActivities((prev) => [newAct, ...prev]);
    setActivityNoteInput("");
  };

  // Save / Update Record
  const handleSaveRecord = async (targetState = null) => {
    setIsSaving(true);
    const calculatedStock = subItems.length > 0
      ? subItems.reduce((acc, it) => acc + (Number(it.countedQuantity) || 0), 0)
      : Number(formStock) || 0;

    let computedStatus = formStatus;
    if (!computedStatus) {
      if (calculatedInStock <= 0) computedStatus = "Out of stock";
      else if (calculatedInStock < 100) computedStatus = "Low stock";
      else computedStatus = "In stock";
    }

    const resolvedNumber = formNumber || (await fetchNextNumber());
    const finalState = targetState || formState || "Draft";

    // Activity log entry for save
    const newActivity = {
      id: "act-" + Date.now(),
      action: targetState ? `Status Changed: ${targetState}` : "Saved Inventory Record",
      user: currentUser?.name || formPreparedBy || "Adam (CEO)",
      role: currentUser?.role || "Operations Head",
      timestamp: "Today at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toISOString().split("T")[0],
      details: `Record ${resolvedNumber} updated with state "${finalState}". Available Net In-Stock: ${calculatedInStock} units.`,
      badgeType: finalState === "Approved" ? "success" : "info",
    };
    const updatedActivities = [newActivity, ...formActivities];
    setFormActivities(updatedActivities);

    const payload = {
      number: resolvedNumber,
      productName: formProductName || formDescription || "Inventory Item",
      sku: formSku || `SKU-${Date.now().toString().slice(-4)}`,
      category: formCategory || "General",
      inventoryType: formInventoryType || "Stockroom Inventory",
      stockroom: formStockroom,
      location: formLocation,
      status: computedStatus,
      state: finalState,
      incoming: Number(formIncoming) || 0,
      stock: calculatedStock,
      totalBaseStock: Number(formTotalBaseStock) || 100,
      price: Number(formPrice) || 0,
      inventoryDate: formInventoryDate || new Date().toISOString().split("T")[0],
      preparedBy: formPreparedBy,
      checkedBy: formCheckedBy,
      approvedBy: formApprovedBy,
      approvalDate: formApprovalDate,
      description: formDescription,
      image: formImage || "",
      items: subItems,
      transactions: formTransactions,
      activities: updatedActivities,
    };

    try {
      if (selectedRecordId) {
        await api.put(`/api/inventory/${selectedRecordId}`, payload);
      } else {
        await api.post("/api/inventory", payload);
      }
    } catch (err) {
      console.warn("Backend save notice:", err.message);
    }

    // Update local cache
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      let updated;
      if (selectedRecordId) {
        updated = existing.map((r) =>
          (r._id || r.id) === selectedRecordId ? { ...r, ...payload, id: selectedRecordId } : r
        );
      } else {
        updated = [{ ...payload, id: "inv_" + Date.now() }, ...existing];
      }
      setInventoryList(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("inventoryUpdated", { detail: updated }));
    } catch (_) {}

    setIsSaving(false);
    setSaveSuccessMessage("Inventory record saved successfully!");
    setTimeout(() => {
      setSaveSuccessMessage("");
      setViewMode("list");
    }, 900);
  };

  // Delete Record
  const handleDeleteRecord = async () => {
    if (!selectedRecordId) {
      setViewMode("list");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this inventory record?")) return;

    try {
      await api.delete(`/api/inventory/${selectedRecordId}`);
    } catch (err) {
      console.warn("Backend delete notice:", err.message);
    }
    const updated = inventoryList.filter((r) => (r._id || r.id) !== selectedRecordId);
    setInventoryList(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("inventoryUpdated", { detail: updated }));
    setViewMode("list");
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (inventoryList.length === 0) {
      alert("No inventory records to export.");
      return;
    }
    const headers = ["Number", "Product Name", "Category", "SKU", "Incoming", "Stock", "Status", "Price", "State"];
    const rows = inventoryList.map((r) => [
      r.number,
      `"${r.productName || ""}"`,
      r.category,
      r.sku,
      r.incoming,
      r.stock,
      r.status,
      r.price,
      r.state,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import trigger
  const handleImportClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (Array.isArray(data)) {
              setInventoryList((prev) => [...data, ...prev]);
              localStorage.setItem(STORAGE_KEY, JSON.stringify([...data, ...inventoryList]));
              alert(`Successfully imported ${data.length} inventory records!`);
            }
          } catch (_) {
            alert("File imported! Please ensure valid JSON/CSV format.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Metrics (Screenshot 2: Total Asset Value & Progress bar counts)
  const totalAssetValue = useMemo(() => {
    return inventoryList.reduce((sum, r) => {
      const p = Number(r.price) || 0;
      const s = Number(r.stock) || 0;
      return sum + p * s;
    }, 0);
  }, [inventoryList]);

  const totalProductsCount = inventoryList.length;
  const inStockCount = inventoryList.filter((r) => r.status === "In stock").length;
  const lowStockCount = inventoryList.filter((r) => r.status === "Low stock").length;
  const outOfStockCount = inventoryList.filter((r) => r.status === "Out of stock").length;

  const inStockPct = totalProductsCount ? (inStockCount / totalProductsCount) * 100 : 0;
  const lowStockPct = totalProductsCount ? (lowStockCount / totalProductsCount) * 100 : 0;
  const outOfStockPct = totalProductsCount ? (outOfStockCount / totalProductsCount) * 100 : 0;

  // Filtered List
  const filteredList = useMemo(() => {
    return inventoryList.filter((r) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (r.productName || "").toLowerCase().includes(q) ||
        (r.category || "").toLowerCase().includes(q) ||
        (r.sku || "").toLowerCase().includes(q) ||
        (r.number || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || r.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [inventoryList, searchTerm, statusFilter]);

  // Paginated List
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(paginatedList.map((r) => r._id || r.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleToggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // =========================================================================
  // RENDER: SCREENSHOT 1 FORM VIEW
  // =========================================================================
  if (viewMode === "form") {
    const filteredSubItems = subItems.filter((it) =>
      (it.item || "").toLowerCase().includes(subItemSearch.toLowerCase()) ||
      (it.itemCode || "").toLowerCase().includes(subItemSearch.toLowerCase())
    );

    return (
      <div className="stockroom-form-page">
        {/* Top Header Bar (Screenshot 1) */}
        <div className="stockroom-top-header">
          <div className="header-left-meta">
            <button
              className="back-icon-btn"
              onClick={() => setViewMode("list")}
              title="Return to inventory list"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="form-main-heading">Stockroom Inventory</h1>
              <span className="form-record-number">{formNumber}</span>
            </div>
          </div>

          <div className="header-right-actions">
            <button className="hdr-tool-btn" title="Attachments">
              <Paperclip size={16} />
            </button>
            <button className="hdr-tool-btn" title="More options">
              <MoreHorizontal size={16} />
            </button>

            <button
              className="btn-update-primary"
              onClick={() => handleSaveRecord("Approved")}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Update"}
            </button>

            <button
              className="btn-form-action"
              onClick={() => handleSaveRecord("Draft")}
              disabled={isSaving}
            >
              Save
            </button>

            <button
              className="btn-form-action"
              onClick={() => handleSaveRecord("Under Review")}
              disabled={isSaving}
            >
              Submit
            </button>

            <button
              className="btn-form-action delete"
              onClick={handleDeleteRecord}
            >
              Delete
            </button>

            <button
              className="hdr-tool-btn"
              onClick={() => setViewMode("list")}
              title="Collapse"
            >
              <ChevronUp size={16} />
            </button>
          </div>
        </div>

        {saveSuccessMessage && (
          <div className="form-save-toast">
            <CheckCircle2 size={16} />
            <span>{saveSuccessMessage}</span>
          </div>
        )}

        {/* Tab Navigation: Keeping only Details, Inventory Items, Stock Transactions, and Activity */}
        <div className="stockroom-tabs-nav">
          <button
            className={`st-tab ${formTab === "details" ? "active" : ""}`}
            onClick={() => setFormTab("details")}
            id="tab-details"
          >
            Details
          </button>
          <button
            className={`st-tab ${formTab === "items" ? "active" : ""}`}
            onClick={() => setFormTab("items")}
            id="tab-items"
          >
            Inventory Items ({subItems.length})
          </button>
          <button
            className={`st-tab ${formTab === "transactions" ? "active" : ""}`}
            onClick={() => setFormTab("transactions")}
            id="tab-transactions"
          >
            Stock Transactions ({formTransactions.length})
          </button>
          <button
            className={`st-tab ${formTab === "activity" ? "active" : ""}`}
            onClick={() => setFormTab("activity")}
            id="tab-activity"
          >
            Activity ({formActivities.length})
          </button>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: DETAILS (SCREENSHOT 2) */}
        {/* ================================================================= */}
        {formTab === "details" && (
          <div className="stockroom-form-card">
            <div className="stockroom-fields-grid">
              {/* Left Column */}
              <div className="st-col">
                {/* Number */}
                <div className="st-field-row">
                  <label className="st-label">Number</label>
                  <div className="st-control">
                    <input
                      type="text"
                      className="st-input"
                      placeholder="Auto-generated or enter number (e.g. INV0000001)..."
                      value={formNumber}
                      onChange={(e) => setFormNumber(e.target.value)}
                    />
                  </div>
                </div>

                {/* Inventory Type */}
                <div className="st-field-row">
                  <label className="st-label">Inventory Type</label>
                  <div className="st-control">
                    <select
                      className="st-select"
                      value={formInventoryType}
                      onChange={(e) => setFormInventoryType(e.target.value)}
                    >
                      <option value="">Select inventory type...</option>
                      {INVENTORY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Stockroom */}
                <div className="st-field-row">
                  <label className="st-label">Stockroom</label>
                  <div className="st-control">
                    <div className="st-input-with-actions">
                      <input
                        type="text"
                        className="st-input"
                        placeholder="Enter stockroom (e.g. Main Stockroom - Delhi)..."
                        value={formStockroom}
                        onChange={(e) => setFormStockroom(e.target.value)}
                      />
                      <div className="st-icons-cluster">
                        <Search size={14} className="st-field-icon" title="Browse stockrooms" />
                        <Info size={14} className="st-field-icon" title="Stockroom info" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="st-field-row">
                  <label className="st-label">Location</label>
                  <div className="st-control">
                    <div className="st-input-with-actions">
                      <input
                        type="text"
                        className="st-input"
                        placeholder="Enter location (e.g. Rack A)..."
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                      />
                      <div className="st-icons-cluster">
                        <Search size={14} className="st-field-icon" title="Browse location racks" />
                        <Info size={14} className="st-field-icon" title="Location details" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div className="st-field-row">
                  <label className="st-label">Category</label>
                  <div className="st-control">
                    <div className="st-input-with-actions">
                      <input
                        type="text"
                        className="st-input"
                        placeholder="Enter category (e.g. T-Shirts)..."
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                      />
                      <div className="st-icons-cluster">
                        <Search size={14} className="st-field-icon" title="Browse categories" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="st-field-row">
                  <label className="st-label">Status</label>
                  <div className="st-control">
                    <select
                      className="st-select"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                    >
                      <option value="">Select status...</option>
                      <option value="In stock">In stock</option>
                      <option value="Low stock">Low stock</option>
                      <option value="Out of stock">Out of stock</option>
                      <option value="Open">Open</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="st-field-row">
                  <label className="st-label">Description</label>
                  <div className="st-control">
                    <textarea
                      className="st-textarea"
                      rows={3}
                      placeholder="Enter description / notes..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="st-col">
                {/* Inventory Date */}
                <div className="st-field-row">
                  <label className="st-label">Inventory Date</label>
                  <div className="st-control">
                    <div className="st-input-with-actions">
                      <input
                        type="date"
                        className="st-input"
                        value={formInventoryDate}
                        onChange={(e) => setFormInventoryDate(e.target.value)}
                      />
                      <div className="st-icons-cluster">
                        <Calendar size={14} className="st-field-icon" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prepared By */}
                <div className="st-field-row">
                  <label className="st-label">Prepared By</label>
                  <div className="st-control">
                    <div className="st-input-with-actions">
                      <input
                        type="text"
                        className="st-input"
                        placeholder="Enter prepared by name..."
                        value={formPreparedBy}
                        onChange={(e) => setFormPreparedBy(e.target.value)}
                      />
                      <div className="st-icons-cluster">
                        <Search size={14} className="st-field-icon" title="Search user" />
                        <Info size={14} className="st-field-icon" title="User information" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checked By */}
                <div className="st-field-row">
                  <label className="st-label">Checked By</label>
                  <div className="st-control">
                    <div className="st-input-with-actions">
                      <input
                        type="text"
                        className="st-input"
                        placeholder="Enter checked by name..."
                        value={formCheckedBy}
                        onChange={(e) => setFormCheckedBy(e.target.value)}
                      />
                      <div className="st-icons-cluster">
                        <Search size={14} className="st-field-icon" title="Search user" />
                        <Info size={14} className="st-field-icon" title="User information" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Approved By */}
                <div className="st-field-row">
                  <label className="st-label">Approved By</label>
                  <div className="st-control">
                    <div className="st-input-with-actions">
                      <input
                        type="text"
                        className="st-input"
                        placeholder="Search approver..."
                        value={formApprovedBy}
                        onChange={(e) => setFormApprovedBy(e.target.value)}
                      />
                      <div className="st-icons-cluster">
                        <Search size={14} className="st-field-icon" title="Search approver" />
                        <Info size={14} className="st-field-icon" title="Approver information" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Approval Date */}
                <div className="st-field-row">
                  <label className="st-label">Approval Date</label>
                  <div className="st-control">
                    <div className="st-input-with-actions">
                      <input
                        type="date"
                        className="st-input"
                        value={formApprovalDate}
                        onChange={(e) => setFormApprovalDate(e.target.value)}
                      />
                      <div className="st-icons-cluster">
                        <Calendar size={14} className="st-field-icon" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* State */}
                <div className="st-field-row">
                  <label className="st-label">State</label>
                  <div className="st-control">
                    <select
                      className="st-select"
                      value={formState}
                      onChange={(e) => setFormState(e.target.value)}
                    >
                      <option value="">Select state...</option>
                      <option value="Draft">Draft</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Unit Retail Price */}
                <div className="st-field-row">
                  <label className="st-label">Item Unit Price ($)</label>
                  <div className="st-control">
                    <input
                      type="number"
                      className="st-input"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Operational Summary Banner */}
            <div className="details-summary-banner">
              <div className="details-summary-left">
                <span className="details-meta-pill">
                  <Package size={13} />
                  <span>Items: <strong>{subItems.length} items</strong></span>
                </span>
                <span className="details-meta-pill">
                  <Layers size={13} />
                  <span>Physical Base Stock: <strong>{formTotalBaseStock} units</strong></span>
                </span>
                <span className="details-meta-pill">
                  <TrendingDown size={13} />
                  <span>Net In-Stock: <strong style={{ color: calculatedInStock < 0 ? '#dc2626' : '#16a34a' }}>{calculatedInStock} units</strong></span>
                </span>
                <span className="details-meta-pill">
                  <Clock size={13} />
                  <span>State: <strong>{formState || "Draft"}</strong></span>
                </span>
              </div>
              <div className="details-summary-right">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setFormTab("transactions")}
                >
                  <span>Reconcile Stock Transactions</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: INVENTORY ITEMS (SCREENSHOT 3) */}
        {/* ================================================================= */}
        {formTab === "items" && (
          <div className="stockroom-subitems-card">
            <div className="subitems-header-bar">
              <h3 className="subitems-title">Inventory Items</h3>
            </div>

            <div className="subitems-controls-row">
              <button
                className="btn-new-item-blue"
                onClick={handleAddSubItem}
                id="btn-add-subitem"
              >
                <Plus size={14} />
                <span>New</span>
              </button>

              <div className="subitem-search-group">
                <span className="search-tag-label">Search</span>
                <select
                  className="subitem-filter-type"
                  value={subItemSearchField}
                  onChange={(e) => setSubItemSearchField(e.target.value)}
                >
                  <option value="item">Item name</option>
                  <option value="code">Item Code</option>
                </select>
                <input
                  type="text"
                  className="subitem-search-input"
                  placeholder="Search..."
                  value={subItemSearch}
                  onChange={(e) => setSubItemSearch(e.target.value)}
                />
              </div>

              <div className="subitems-pagination-mini">
                <button className="pg-arrow-btn" disabled>
                  <ChevronLeft size={14} />
                </button>
                <span className="pg-info-text">
                  to {filteredSubItems.length} of {subItems.length}
                </span>
                <button className="pg-arrow-btn" disabled>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="subitems-table-scroll">
              <table className="st-subitems-table">
                <thead>
                  <tr>
                    <th style={{ width: "30px" }}>
                      <input type="checkbox" />
                    </th>
                    <th>Item</th>
                    <th>Item Code</th>
                    <th>Category</th>
                    <th>Specification</th>
                    <th>Unit</th>
                    <th>Opening Stock</th>
                    <th>Counted Quantity</th>
                    <th>Variance</th>
                    <th>Remarks</th>
                    <th style={{ width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubItems.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="no-subitems-cell">
                        No inventory items recorded yet. Click <strong>+ New</strong> to add products to this stock check.
                      </td>
                    </tr>
                  ) : (
                    filteredSubItems.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td>
                          <input type="checkbox" />
                        </td>
                        <td>
                          <div className="st-item-cell">
                            <Info size={13} className="item-info-icon" />
                            <input
                              type="text"
                              className="inline-tbl-input bold"
                              placeholder="e.g. Plain T-Shirt (White)"
                              value={it.item}
                              onChange={(e) => handleSubItemChange(idx, "item", e.target.value)}
                            />
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="inline-tbl-input"
                            placeholder="e.g. TSH001"
                            value={it.itemCode}
                            onChange={(e) => handleSubItemChange(idx, "itemCode", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="inline-tbl-input"
                            placeholder="Category"
                            value={it.category}
                            onChange={(e) => handleSubItemChange(idx, "category", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="inline-tbl-input"
                            placeholder="Cotton / White / M"
                            value={it.specification}
                            onChange={(e) => handleSubItemChange(idx, "specification", e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="inline-tbl-select"
                            value={it.unit}
                            onChange={(e) => handleSubItemChange(idx, "unit", e.target.value)}
                          >
                            {UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="inline-tbl-input num"
                            value={it.openingStock}
                            onChange={(e) => handleSubItemChange(idx, "openingStock", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="inline-tbl-input num"
                            value={it.countedQuantity}
                            onChange={(e) => handleSubItemChange(idx, "countedQuantity", e.target.value)}
                          />
                        </td>
                        <td>
                          <span
                            className={`variance-pill ${
                              it.variance < 0 ? "negative" : it.variance > 0 ? "positive" : "zero"
                            }`}
                          >
                            {it.variance > 0 ? `+${it.variance}` : it.variance}
                          </span>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="inline-tbl-input"
                            placeholder="OK / Damage / -"
                            value={it.remarks}
                            onChange={(e) => handleSubItemChange(idx, "remarks", e.target.value)}
                          />
                        </td>
                        <td>
                          <button
                            className="subitem-trash-btn"
                            onClick={() => handleDeleteSubItem(idx)}
                            title="Remove item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: STOCK TRANSACTIONS (USER SPECIFICATION) */}
        {/* ================================================================= */}
        {formTab === "transactions" && (
          <div className="stock-tx-card">
            {/* Header with Title and Actions */}
            <div className="tx-header-banner">
              <div className="tx-header-title-box">
                <h3>Stock Transactions & Order Allocation</h3>
                <p>
                  Tracks stock movement across customer orders: dispatched stocks, reserved quantities, and pending demand.
                </p>
              </div>

              <div className="tx-header-actions">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={handleResetExampleScenario}
                  title="Reset to scenario: 100 Base, -50 Used, -30 Reserved, -70 Pending = -50 In Stock"
                >
                  <RefreshCw size={13} />
                  <span>Load User Scenario (100 - 50 - 30 - 70 = -50)</span>
                </button>

                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={() => {
                    handleAutoGenerateOrderId();
                    setIsTxModalOpen(true);
                  }}
                  id="btn-log-transaction"
                >
                  <Plus size={14} />
                  <span>Log Stock Transaction</span>
                </button>
              </div>
            </div>

            {/* KPI Cards: Total Stock (100), Used (-50), Reserved (-30), Pending (-70) => In Stock (-50) */}
            <div className="tx-kpis-wrapper">
              <div className="tx-kpi-grid">
                {/* 1. Total Base Stock */}
                <div className="tx-kpi-card base">
                  <div className="tx-kpi-card-header">
                    <span className="tx-kpi-label">Total Stock</span>
                    <div className="tx-kpi-icon-wrap" title="Total Physical Inventory">
                      <Package size={15} />
                    </div>
                  </div>
                  <div className="tx-kpi-value">{formTotalBaseStock}</div>
                  <div className="tx-kpi-subtext">
                    <span>Physical Base Inventory</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', padding: '0 4px' }}
                      onClick={() => {
                        const newStock = prompt("Enter new Total Physical Stock baseline:", formTotalBaseStock);
                        if (newStock !== null && !isNaN(Number(newStock))) {
                          setFormTotalBaseStock(Number(newStock));
                        }
                      }}
                      title="Edit base stock"
                    >
                      <Edit3 size={11} />
                    </button>
                  </div>
                </div>

                {/* 2. Used Stocks (Dispatched) */}
                <div className="tx-kpi-card used">
                  <div className="tx-kpi-card-header">
                    <span className="tx-kpi-label">Used by Orders</span>
                    <div className="tx-kpi-icon-wrap" title="Fulfilled & Dispatched">
                      <ShoppingCart size={15} />
                    </div>
                  </div>
                  <div className="tx-kpi-value">-{usedStock}</div>
                  <div className="tx-kpi-subtext">
                    <span>Fulfilled / Dispatched</span>
                  </div>
                </div>

                {/* 3. Reserved Stocks */}
                <div className="tx-kpi-card reserved">
                  <div className="tx-kpi-card-header">
                    <span className="tx-kpi-label">Reserved</span>
                    <div className="tx-kpi-icon-wrap" title="Committed for Confirmed Orders">
                      <Clock size={15} />
                    </div>
                  </div>
                  <div className="tx-kpi-value">-{reservedStock}</div>
                  <div className="tx-kpi-subtext">
                    <span>Locked for Active Orders</span>
                  </div>
                </div>

                {/* 4. Pending Demand */}
                <div className="tx-kpi-card pending">
                  <div className="tx-kpi-card-header">
                    <span className="tx-kpi-label">Pending Demand</span>
                    <div className="tx-kpi-icon-wrap" title="Awaiting Stock Fulfillment">
                      <TrendingDown size={15} />
                    </div>
                  </div>
                  <div className="tx-kpi-value">-{pendingStock}</div>
                  <div className="tx-kpi-subtext">
                    <span>Backorders Awaiting Stock</span>
                  </div>
                </div>

                {/* 5. In Stock Value (Formula Result) */}
                <div className={`tx-kpi-card instock ${calculatedInStock < 0 ? 'deficit' : ''}`}>
                  <div className="tx-kpi-card-header">
                    <span className="tx-kpi-label">In Stock Value</span>
                    <div className="tx-kpi-icon-wrap" title="Net Available Stock Balance">
                      {calculatedInStock < 0 ? <ShieldAlert size={15} /> : <CheckCircle2 size={15} />}
                    </div>
                  </div>
                  <div className="tx-kpi-value">{calculatedInStock}</div>
                  <div className="tx-kpi-subtext">
                    <span>{calculatedInStock < 0 ? 'Deficit / Reorder Needed' : 'Available for Orders'}</span>
                  </div>
                </div>
              </div>

              {/* Deficit Alert Warning Banner if In-Stock < 0 */}
              {calculatedInStock < 0 && (
                <div className="tx-deficit-alert-banner">
                  <div className="deficit-alert-left">
                    <ShieldAlert size={20} className="deficit-alert-icon" />
                    <div>
                      <div className="deficit-alert-title">
                        Stock Deficit Warning: {calculatedInStock} units in backorder
                      </div>
                      <div className="deficit-alert-desc">
                        Current pending and reserved orders exceed available inventory by {Math.abs(calculatedInStock)} units.
                        Restock or manufacturing reorder is required immediately.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-resolve-deficit"
                    onClick={() => {
                      setNewTxType("Restock");
                      setNewTxQuantity(Math.abs(calculatedInStock));
                      setNewTxNotes(`Inward restock to clear ${Math.abs(calculatedInStock)} units deficit`);
                      setIsTxModalOpen(true);
                    }}
                  >
                    + Restock Deficit (+{Math.abs(calculatedInStock)})
                  </button>
                </div>
              )}
            </div>

            {/* Filter and Search Bar for Transactions */}
            <div className="tx-table-controls-bar">
              <div className="tx-filter-pills">
                {["all", "Used", "Reserved", "Pending", "Restock"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`tx-filter-pill-btn ${txFilterType === t ? "active" : ""}`}
                    onClick={() => setTxFilterType(t)}
                  >
                    {t === "all" ? `All (${formTransactions.length})` : t}
                  </button>
                ))}
              </div>

              <div className="tx-search-box">
                <Search size={14} style={{ color: "#94a3b8" }} />
                <input
                  type="text"
                  className="tx-search-input"
                  placeholder="Filter by Order ID or Client..."
                  value={txSearchTerm}
                  onChange={(e) => setTxSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Transactions History Table */}
            <div className="tx-table-wrap">
              <table className="tx-data-table">
                <thead>
                  <tr>
                    <th>Order ID / Reference</th>
                    <th>Customer / Lead</th>
                    <th>Transaction Type</th>
                    <th>Quantity</th>
                    <th>Stock Impact</th>
                    <th>Status</th>
                    <th>Date & Time</th>
                    <th>Logged By</th>
                    <th>Notes</th>
                    <th style={{ width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="no-subitems-cell">
                        No stock transactions recorded yet. Click <strong>+ Log Stock Transaction</strong> to allocate stock, or click <strong>Load User Scenario</strong> to test the 100 - 50 - 30 - 70 = -50 calculation.
                      </td>
                    </tr>
                  ) : (
                    formTransactions
                      .filter((t) => {
                        const matchesType = txFilterType === "all" || t.type === txFilterType;
                        const q = txSearchTerm.toLowerCase();
                        const matchesSearch =
                          !q ||
                          (t.orderId || "").toLowerCase().includes(q) ||
                          (t.clientName || "").toLowerCase().includes(q) ||
                          (t.notes || "").toLowerCase().includes(q);
                        return matchesType && matchesSearch;
                      })
                      .map((tx) => (
                        <tr key={tx.id} className="tx-row">
                          <td>
                            <div className="order-badge-cell">
                              <span className="order-id-tag">
                                <Package size={11} />
                                <span>{tx.orderId}</span>
                              </span>
                            </div>
                          </td>
                          <td>
                            <strong>{tx.clientName || "Direct Order"}</strong>
                          </td>
                          <td>
                            <span
                              className={`tx-type-pill ${
                                tx.type === "Used"
                                  ? "used"
                                  : tx.type === "Reserved"
                                  ? "reserved"
                                  : tx.type === "Pending"
                                  ? "pending"
                                  : "restock"
                              }`}
                            >
                              {tx.type === "Used" && <ShoppingCart size={11} />}
                              {tx.type === "Reserved" && <Clock size={11} />}
                              {tx.type === "Pending" && <TrendingDown size={11} />}
                              {tx.type === "Restock" && <TrendingUp size={11} />}
                              <span>{tx.type}</span>
                            </span>
                          </td>
                          <td>
                            <strong>{tx.quantity} pcs</strong>
                          </td>
                          <td>
                            <span
                              className={`tx-impact-val ${
                                tx.impact < 0 ? "negative" : "positive"
                              }`}
                            >
                              {tx.impact > 0 ? `+${tx.impact}` : tx.impact}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`tx-status-pill ${
                                tx.status === "Completed"
                                  ? "completed"
                                  : tx.status === "Reserved"
                                  ? "reserved"
                                  : "pending"
                              }`}
                            >
                              {tx.status || "Completed"}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>
                              {tx.date} {tx.time ? `• ${tx.time}` : ""}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: "12px" }}>{tx.loggedBy || "Admin"}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>
                              {tx.notes || "-"}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="tx-trash-btn"
                              onClick={() => handleDeleteTransaction(tx.id)}
                              title="Delete transaction"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add Stock Transaction */}
        {isTxModalOpen && (
          <div className="tx-modal-backdrop" onClick={() => setIsTxModalOpen(false)}>
            <div className="tx-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="tx-modal-header">
                <h3>Log Stock Transaction</h3>
                <button
                  type="button"
                  className="tx-modal-close-btn"
                  onClick={() => setIsTxModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="tx-modal-body">
                {/* Order Detection & Picker */}
                <div className="tx-form-row">
                  <label className="tx-form-label">Order Number (Auto-Detected or Generated)</label>
                  <div className="tx-order-picker-row">
                    <input
                      type="text"
                      className="tx-form-input"
                      placeholder="e.g. ORD00001"
                      value={newTxOrderId}
                      onChange={(e) => setNewTxOrderId(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn-autogen-order"
                      onClick={handleAutoGenerateOrderId}
                      title="Auto-detect next sequential order number"
                    >
                      ⚡ Auto-Generate
                    </button>
                  </div>
                  {detectedOrders.length > 0 && (
                    <div style={{ marginTop: "4px" }}>
                      <select
                        className="tx-form-select"
                        onChange={(e) => {
                          const found = detectedOrders.find((o) => o.orderId === e.target.value);
                          if (found) {
                            setNewTxOrderId(found.orderId);
                            setNewTxClientName(found.clientName || found.companyName);
                            if (found.quantity) setNewTxQuantity(found.quantity);
                          }
                        }}
                      >
                        <option value="">Or pick existing order from system...</option>
                        {detectedOrders.map((o) => (
                          <option key={o.orderId} value={o.orderId}>
                            {o.orderId} — {o.clientName} ({o.quantity} pcs)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Customer / Client Name */}
                <div className="tx-form-row">
                  <label className="tx-form-label">Customer / Client Name</label>
                  <input
                    type="text"
                    className="tx-form-input"
                    placeholder="e.g. Divyanshi Enterprises"
                    value={newTxClientName}
                    onChange={(e) => setNewTxClientName(e.target.value)}
                  />
                </div>

                {/* Transaction Type */}
                <div className="tx-form-row">
                  <label className="tx-form-label">Transaction Type</label>
                  <select
                    className="tx-form-select"
                    value={newTxType}
                    onChange={(e) => setNewTxType(e.target.value)}
                  >
                    <option value="Used">Used / Dispatched (Deducts from available stock)</option>
                    <option value="Reserved">Reserved (Committed for order, blocks stock)</option>
                    <option value="Pending">Pending (Order placed, awaiting inventory)</option>
                    <option value="Restock">Restock (Inward purchase / factory arrival)</option>
                  </select>
                </div>

                {/* Quantity */}
                <div className="tx-form-row">
                  <label className="tx-form-label">Quantity (Units)</label>
                  <input
                    type="number"
                    min="1"
                    className="tx-form-input"
                    value={newTxQuantity}
                    onChange={(e) => setNewTxQuantity(e.target.value)}
                  />
                </div>

                {/* Status */}
                <div className="tx-form-row">
                  <label className="tx-form-label">Status</label>
                  <select
                    className="tx-form-select"
                    value={newTxStatus}
                    onChange={(e) => setNewTxStatus(e.target.value)}
                  >
                    <option value="Completed">Completed</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Pending">Pending Fulfillment</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="tx-form-row">
                  <label className="tx-form-label">Notes / Production Reference</label>
                  <textarea
                    className="tx-form-textarea"
                    rows={2}
                    placeholder="Enter order reference or reason..."
                    value={newTxNotes}
                    onChange={(e) => setNewTxNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="tx-modal-footer">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setIsTxModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={handleAddTransactionSubmit}
                >
                  Confirm & Apply Stock Movement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: ACTIVITY LOG (REQUIREMENT 4) */}
        {/* ================================================================= */}
        {formTab === "activity" && (
          <div className="activity-card">
            {/* Header */}
            <div className="activity-header-bar">
              <div className="activity-header-info">
                <h3>Inventory Activity & Audit Trail</h3>
                <p>
                  Traceable log showing who created the inventory, verified counts, authorized transactions, and signed off.
                </p>
              </div>
              <div className="details-meta-pill">
                <Clock size={13} />
                <span>Total Actions: <strong>{formActivities.length} logs</strong></span>
              </div>
            </div>

            {/* Feed */}
            <div className="activity-feed-wrapper">
              {formActivities.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b", fontSize: "13px" }}>
                  No activity recorded yet for this inventory record. Actions like saving, updating state, and logging stock transactions will automatically be logged here.
                </div>
              ) : (
                <div className="activity-timeline">
                  {formActivities.map((act, idx) => {
                    const initials = (act.user || "AD")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    const colorClass =
                      idx % 4 === 0
                        ? ""
                        : idx % 4 === 1
                        ? "purple"
                        : idx % 4 === 2
                        ? "amber"
                        : "emerald";

                    return (
                      <div key={act.id || idx} className="timeline-item">
                        <div className={`timeline-avatar ${colorClass}`}>
                          {initials}
                        </div>

                        <div className="timeline-content-card">
                          <div className="timeline-header-line">
                            <div className="timeline-user-meta">
                              <span className="timeline-author-name">{act.user}</span>
                              <span className="timeline-author-role">{act.role || "Staff"}</span>
                            </div>
                            <span className="timeline-time-badge">
                              <Clock size={11} />
                              <span>{act.timestamp}</span>
                            </span>
                          </div>

                          <div className="timeline-action-title">
                            <span className={`timeline-action-tag ${act.badgeType || "info"}`}>
                              {act.badgeType || "Event"}
                            </span>
                            <span className="timeline-action-text">{act.action}</span>
                          </div>

                          <p className="timeline-details-text">{act.details}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Activity Note Box */}
              <div className="activity-post-container">
                <div className="activity-post-box">
                  <textarea
                    className="activity-post-textarea"
                    placeholder="Add an inspection note, verification log, or stock audit comment..."
                    value={activityNoteInput}
                    onChange={(e) => setActivityNoteInput(e.target.value)}
                  />
                  <div className="activity-post-footer">
                    <span className="post-as-label">
                      Posting as <strong>{currentUser?.name || formPreparedBy || "Adam (CEO)"}</strong>
                    </span>
                    <button
                      type="button"
                      className="btn-primary-action"
                      onClick={handlePostActivityNote}
                      disabled={!activityNoteInput.trim()}
                    >
                      Post Activity Note
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER: SCREENSHOT 2 INVENTORY LIST VIEW
  // =========================================================================
  return (
    <div className="erp-inventory-view">
      {/* Top Header Row (Screenshot 2: Inventory Title + Import, Export, + Add Product) */}
      <div className="erp-inv-header">
        <h1 className="erp-inv-title">Inventory</h1>

        <div className="erp-inv-header-actions">
          <button
            className="btn-outline-action"
            onClick={handleImportClick}
            title="Import inventory data"
          >
            <Upload size={15} />
            <span>Import</span>
          </button>

          <button
            className="btn-outline-action"
            onClick={handleExportCSV}
            title="Export CSV"
          >
            <Download size={15} />
            <span>Export</span>
          </button>

          <button
            className="btn-add-product-purple"
            onClick={handleAddNewProduct}
            id="btn-add-product"
          >
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner (Screenshot 2: Total Asset Value & Segmented Progress Bar) */}
      <div className="erp-metric-banner-card">
        {/* Total Asset Value */}
        <div className="metric-asset-block">
          <span className="metric-card-label">Total Asset Value</span>
          <div className="metric-asset-digits">
            ${totalAssetValue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* Total Products & Colored Segmented Bar */}
        <div className="metric-products-block">
          <div className="products-headline">
            <span className="products-count-number">{totalProductsCount}</span>
            <span className="products-count-unit">Product</span>
          </div>

          {/* Segmented Color Bar (Green / Yellow / Red) */}
          <div className="segmented-stock-bar">
            <div
              className="stock-bar-seg in-stock"
              style={{ width: `${inStockPct}%` }}
              title={`In stock: ${inStockCount}`}
            ></div>
            <div
              className="stock-bar-seg low-stock"
              style={{ width: `${lowStockPct}%` }}
              title={`Low stock: ${lowStockCount}`}
            ></div>
            <div
              className="stock-bar-seg out-stock"
              style={{ width: `${outOfStockPct}%` }}
              title={`Out of stock: ${outOfStockCount}`}
            ></div>
          </div>

          {/* Legend Counters below bar */}
          <div className="stock-legend-row">
            <div className="legend-item">
              <span className="legend-dot in-stock"></span>
              <span>In stock: <strong>{inStockCount}</strong></span>
            </div>
            <div className="legend-item">
              <span className="legend-dot low-stock"></span>
              <span>Low stock: <strong>{lowStockCount}</strong></span>
            </div>
            <div className="legend-item">
              <span className="legend-dot out-stock"></span>
              <span>Out of stock: <strong>{outOfStockCount}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card (Screenshot 2) */}
      <div className="erp-table-card">
        {/* Toolbar: Search, Date Range, Filters */}
        <div className="erp-toolbar-row">
          <div className="erp-search-field">
            <Search size={16} className="search-lens" />
            <input
              type="text"
              placeholder="Search by product name, category, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="erp-toolbar-filters">
            {/* Date Range Selector */}
            <div className="filter-dropdown-pill">
              <Calendar size={14} />
              <span>12 Sep - 28 Oct 2026</span>
              <ChevronDown size={14} />
            </div>

            {/* Amount Status Dropdown */}
            <select
              className="filter-select-pill"
              value={amountStatusFilter}
              onChange={(e) => setAmountStatusFilter(e.target.value)}
            >
              <option value="all">Amount Status</option>
              <option value="high">High Value ($1000+)</option>
              <option value="standard">Standard</option>
            </select>

            {/* Status Dropdown */}
            <select
              className="filter-select-pill"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Status</option>
              <option value="In stock">In stock</option>
              <option value="Low stock">Low stock</option>
              <option value="Out of stock">Out of stock</option>
            </select>

            {/* Filter Button */}
            <button
              className="filter-btn-compact"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              title="Reset filters"
            >
              <Filter size={14} />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Data Table (Screenshot 2) */}
        {isLoading ? (
          <div className="erp-loading-state">
            <div className="erp-spinner"></div>
            <span>Loading inventory records...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="erp-empty-inventory-box">
            <div className="empty-icon-circle">
              <Package size={44} />
            </div>
            <h3>No Inventory Products Found</h3>
            <p>
              {searchTerm || statusFilter !== "all"
                ? "No products match your search or filter criteria."
                : "Your inventory list is currently empty. Click the button below to add your first product."}
            </p>
            <button
              className="btn-add-product-purple center"
              onClick={handleAddNewProduct}
            >
              <Plus size={16} />
              <span>Add First Product</span>
            </button>
          </div>
        ) : (
          <div className="erp-table-scroll">
            <table className="erp-products-table">
              <thead>
                <tr>
                  <th style={{ width: "35px" }}>
                    <input
                      type="checkbox"
                      checked={
                        selectedItems.length === paginatedList.length &&
                        paginatedList.length > 0
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>SKU</th>
                  <th>Incoming</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th style={{ textAlign: "right", width: "40px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((row) => {
                  const id = row._id || row.id;
                  const isChecked = selectedItems.includes(id);
                  const isLow = row.status === "Low stock";
                  const isOut = row.status === "Out of stock";

                  return (
                    <tr
                      key={id}
                      className="erp-product-row"
                      onClick={() => handleRowClick(row)}
                    >
                      <td onClick={(e) => handleToggleSelect(id, e)}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                        />
                      </td>

                      {/* Product Name with Thumbnail Image */}
                      <td>
                        <div className="product-identity-cell">
                          <div className="product-thumbnail-box">
                            {row.image ? (
                              <img src={row.image} alt="" className="thumb-img" />
                            ) : (
                              <Package size={18} className="thumb-fallback-icon" />
                            )}
                          </div>
                          <span className="product-cell-name">
                            {row.productName || row.description || "Inventory Item"}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span className="category-cell-text">{row.category}</span>
                      </td>

                      {/* SKU */}
                      <td>
                        <span className="sku-cell-text">{row.sku}</span>
                      </td>

                      {/* Incoming */}
                      <td>
                        <span className="qty-cell-text">{row.incoming}</span>
                      </td>

                      {/* Stock */}
                      <td>
                        <span className="qty-cell-text bold">{row.stock}</span>
                      </td>

                      {/* Status (In stock / Low stock / Out of stock) */}
                      <td>
                        <span
                          className={`stock-badge ${
                            isOut ? "out" : isLow ? "low" : "in"
                          }`}
                        >
                          <span className="badge-status-dot"></span>
                          <span>{row.status}</span>
                        </span>
                      </td>

                      {/* Price */}
                      <td>
                        <span className="price-cell-text">
                          ${Number(row.price || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Action */}
                      <td
                        style={{ textAlign: "right" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="row-dots-action-btn"
                          onClick={() => handleRowClick(row)}
                          title="View / Edit record"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Pagination Footer (Screenshot 2) */}
        {filteredList.length > 0 && (
          <div className="erp-table-pagination-footer">
            <div className="pagination-left-info">
              <span>
                Result {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, filteredList.length)} of{" "}
                {filteredList.length}
              </span>

              <div className="per-page-select-wrap">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="per-page-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <ChevronDown size={12} className="select-arrow" />
              </div>
            </div>

            <div className="pagination-right-nav">
              <button
                className="nav-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <div className="numeric-pages">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    className={`num-pg-btn ${currentPage === pg ? "active" : ""}`}
                    onClick={() => setCurrentPage(pg)}
                  >
                    {pg}
                  </button>
                ))}
                {totalPages > 5 && (
                  <>
                    <span className="pg-ellipsis">...</span>
                    <button
                      className={`num-pg-btn ${currentPage === totalPages ? "active" : ""}`}
                      onClick={() => setCurrentPage(totalPages)}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                className="nav-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
