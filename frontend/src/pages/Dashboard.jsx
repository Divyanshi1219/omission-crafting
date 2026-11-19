import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { 
  LayoutGrid, 
  FileText, 
  Users, 
  Calendar, 
  UserCheck, 
  UserX, 
  Clock, 
  Calendar as CalendarIcon, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight, 
  ArrowRight, 
  X, 
  MapPin, 
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  HelpCircle,
  Layers,
  Flame,
  Radio,
  Package,
  Boxes,
  Warehouse,
  AlertTriangle,
  CheckCircle2,
  IndianRupee,
  BarChart3,
  Plus,
  Archive,
  BookmarkCheck,
  Filter,
  Timer,
  Search,
  Truck,
  ShieldCheck,
  CreditCard
} from "lucide-react";
import "./EmployeeCards.css";
import "./OverviewDashboard.css";
import "./StockRoom/StockRoom.css";
import OrderManagementDashboard from "./OrderManagementDashboard";
import InventoryManagement from "./InventoryManagement";
import StockRoom from "./StockRoom/StockRoom";
import DeliveryDashboard from "./DeliveryDashboard";
import ComplianceDashboard from "./ComplianceDashboard";
import { useAuth } from "../context/AuthContext";

const defaultEmployees = [
  { id: 1, name: "Noah Castell", initials: "NC", role: "Project Lead", department: "Management", openTasks: 0, completedTasks: 48, workload: 64, avatarBg: "#ffedd5", status: "online" },
  { id: 2, name: "Priya Raman", initials: "PR", role: "Product Designer", department: "Design", openTasks: 1, completedTasks: 35, workload: 72, avatarBg: "#e2e8f0", status: "online" },
  { id: 3, name: "Mateo Silva", initials: "MS", role: "Backend Engineer", department: "Engineering", openTasks: 2, completedTasks: 51, workload: 88, avatarBg: "#d1fae5", status: "online" },
  { id: 4, name: "Hana Kobayashi", initials: "HK", role: "Frontend Engineer", department: "Engineering", openTasks: 1, completedTasks: 33, workload: 56, avatarBg: "#e0e7ff", status: "away" },
  { id: 5, name: "Owen Mercer", initials: "OM", role: "Frontend Engineer", department: "Engineering", openTasks: 2, completedTasks: 42, workload: 79, avatarBg: "#fef08a", status: "online" },
  { id: 6, name: "Sofia Sato", initials: "SS", role: "QA Engineer", department: "Engineering", openTasks: 1, completedTasks: 27, workload: 41, avatarBg: "#f3e8ff", status: "away" },
  { id: 7, name: "Maya Kovac", initials: "MK", role: "Brand Designer", department: "Design", openTasks: 2, completedTasks: 24, workload: 50, avatarBg: "#dbeafe", status: "away" },
  { id: 8, name: "Liam Reyes", initials: "LR", role: "Marketing Lead", department: "Marketing", openTasks: 1, completedTasks: 30, workload: 67, avatarBg: "#ffedd5", status: "away" }
];

const getWorkloadColor = (workload) => {
  if (workload > 80) return "#d97706";
  return "#059669";
};

function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [employeesList, setEmployeesList] = useState(defaultEmployees);

  const [stockRoomMetrics, setStockRoomMetrics] = useState({
    totalItems: 0,
    availableItems: 0,
    activeReserved: 0,
    overdueReservations: 0,
    overduePieces: 0,
    lowStockAlerts: 0,
    itemsOutOfStock: 0,
  });
  const isAdmin =
    currentUser?.id === "admin" ||
    currentUser?.role === "CEO" ||
    (currentUser?.role && currentUser.role.toLowerCase().includes("admin")) ||
    (currentUser?.name || "").toLowerCase().startsWith("adam") ||
    (currentUser?.department || "").toLowerCase() === "ceo";
  const isSales = currentUser?.role === "Sales Executive" || currentUser?.id?.startsWith("sales");
  const isProduction =
    currentUser?.id === "production" ||
    Boolean(currentUser?.role && currentUser.role.toLowerCase().includes("production"));
  const isStock =
    currentUser?.id === "stock" ||
    Boolean(currentUser?.role && currentUser.role.toLowerCase().includes("stock"));
  const isLeadManager =
    currentUser?.id === "lead_manager" ||
    Boolean(currentUser?.role && currentUser.role.toLowerCase() === "lead manager");
  const isCoordinator =
    currentUser?.id === "coordinator" ||
    Boolean(currentUser?.role && currentUser.role.toLowerCase() === "coordinator") ||
    Boolean(currentUser?.department && currentUser.department.toLowerCase() === "coordinator");

  const isOnlyOrderManagement = isSales || isProduction || isLeadManager;
  const isOnlyInventory = isStock;

  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get("tab");

  const getValidDashboardTab = (targetTab) => {
    if (isOnlyInventory) return "inventory";
    if (isOnlyOrderManagement) return "case";
    const validTabs = ["overview", "case", "inventory", "leave", "delivery", "compliance"];
    if (isAdmin) validTabs.push("employee");
    if (targetTab && validTabs.includes(targetTab)) {
      return targetTab;
    }
    return null;
  };

  const [activeTab, setActiveTab] = useState(() => {
    if (isOnlyInventory) return "inventory";
    if (isOnlyOrderManagement) return "case";
    if (queryTab) {
      const valid = getValidDashboardTab(queryTab);
      if (valid) return valid;
    }
    try {
      const saved = sessionStorage.getItem("dashboard_active_tab");
      const valid = getValidDashboardTab(saved);
      if (valid) return valid;
    } catch (_) {}
    return "overview";
  });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSearchInput, setEmployeeSearchInput] = useState("");
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");

  // Persist active tab so returning to Dashboard restores the last visited tab (e.g. Order Management)
  useEffect(() => {
    if (activeTab) {
      try {
        sessionStorage.setItem("dashboard_active_tab", activeTab);
      } catch (_) {}
    }
  }, [activeTab]);

  useEffect(() => {
    if (isOnlyInventory) {
      setActiveTab("inventory");
    } else if (isOnlyOrderManagement) {
      setActiveTab("case");
    } else {
      if (queryTab) {
        const valid = getValidDashboardTab(queryTab);
        if (valid) {
          setActiveTab(valid);
          return;
        }
      }
      try {
        const saved = sessionStorage.getItem("dashboard_active_tab");
        const valid = getValidDashboardTab(saved);
        if (valid) {
          setActiveTab(valid);
          return;
        }
      } catch (_) {}
      setActiveTab("overview");
    }
  }, [currentUser?.id, isOnlyInventory, isOnlyOrderManagement, isAdmin, queryTab]);

  // Fetch live Stock Room metrics for Stock Room Manager dashboard
  useEffect(() => {
    if (isStock || isAdmin) {
      api.get("/api/stock-room")
        .then((res) => {
          if (res.data?.metrics) {
            setStockRoomMetrics(res.data.metrics);
          }
        })
        .catch((err) => console.warn("Could not load stock metrics on dashboard:", err.message));
    }
  }, [isStock, isAdmin]);

  // Live Leads and Production Data from Backend (cached first for zero delay)
  const [rawLeads, setRawLeads] = useState(() => {
    try {
      const cached = sessionStorage.getItem("omission_cached_leads");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });
  // True once the leads fetch succeeded — lets profiles with zero orders
  // display their real (0) numbers instead of the demo baseline data.
  const [leadsLoaded, setLeadsLoaded] = useState(false);

  // Profile-specific reactive leads filtering
  const leads = useMemo(() => {
    if (!rawLeads || rawLeads.length === 0) return [];
    if (isAdmin) return rawLeads;
    const myName = (currentUser?.name || "").toLowerCase().trim();
    const myId = (currentUser?.id || "").toLowerCase();
    return rawLeads.filter((l) => {
      const itemEmp = (l.employeeName || "").toLowerCase().trim();
      const itemCreatedBy = (l.createdBy || "").toLowerCase();
      const itemLeadApprover = (l.leadApproval?.author || "").toLowerCase();
      const itemStockApprover = (l.stockApproval?.author || "").toLowerCase();
      const itemProdApprover = (l.productionApproval?.author || "").toLowerCase();
      return (
        (myName && itemEmp && itemEmp === myName) ||
        (myName && itemEmp && (itemEmp.startsWith(myName) || myName.startsWith(itemEmp))) ||
        (myId && itemCreatedBy && itemCreatedBy.includes(myId)) ||
        (myName && [itemLeadApprover, itemStockApprover, itemProdApprover].some((a) => a.includes(myName)))
      );
    });
  }, [rawLeads, currentUser, isAdmin]);

  // UI Interactive States
  const [chartViewMode, setChartViewMode] = useState("volume"); // "volume" | "revenue"
  const [salesTimeFrame, setSalesTimeFrame] = useState("daily"); // "daily" | "weekly" | "monthly" | "custom"
  const [customStartDate, setCustomStartDate] = useState("2026-10-01");
  const [customEndDate, setCustomEndDate] = useState("2026-11-30");
  const [hoveredSalesPoint, setHoveredSalesPoint] = useState(null);
  const chartScrollRef = useRef(null);

  useEffect(() => {
    if (chartScrollRef.current) {
      const timer = setTimeout(() => {
        if (chartScrollRef.current) {
          chartScrollRef.current.scrollLeft = chartScrollRef.current.scrollWidth;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [salesTimeFrame, customStartDate, customEndDate, chartViewMode]);
  const [selectedStageFilter, setSelectedStageFilter] = useState("all"); // "all" | "sample" | "partial" | "complete"
  const [hoveredStack, setHoveredStack] = useState(null); // tooltip data for main chart
  const [hoveredDay, setHoveredDay] = useState(null); // tooltip data for velocity chart
  const [showRepeatDetailsModal, setShowRepeatDetailsModal] = useState(false);
  const [hoveredCompletedSegment, setHoveredCompletedSegment] = useState(null);
  const [hoveredPendingSegment, setHoveredPendingSegment] = useState(null);

  // Live Inventory Overview State & Synchronization
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [invGraphMetric, setInvGraphMetric] = useState("units"); // "units" | "value"
  const [invGraphGroupBy, setInvGraphGroupBy] = useState("category"); // "category" | "stockroom"
  const [hoveredFlowSegment, setHoveredFlowSegment] = useState(null);
  const [hoveredStockItem, setHoveredStockItem] = useState(null);

  const fetchInventoryData = async () => {
    try {
      const res = await api.get("/api/inventory");
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setInventoryItems(res.data.data);
        localStorage.setItem("omission_local_inventory", JSON.stringify(res.data.data));
        setInventoryLoading(false);
        return;
      }
    } catch (_) {}
    try {
      const cached = localStorage.getItem("omission_local_inventory") || localStorage.getItem("omission_inventory_items");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setInventoryItems(parsed);
          setInventoryLoading(false);
          return;
        }
      }
      setInventoryItems([]);
    } catch (_) {
      setInventoryItems([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();

    const handleCustomUpdate = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setInventoryItems(e.detail);
      } else {
        fetchInventoryData();
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === "omission_local_inventory" || e.key === "omission_inventory_items") {
        try {
          if (e.newValue) setInventoryItems(JSON.parse(e.newValue));
        } catch (_) {}
      }
    };

    window.addEventListener("inventoryUpdated", handleCustomUpdate);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", fetchInventoryData);

    return () => {
      window.removeEventListener("inventoryUpdated", handleCustomUpdate);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", fetchInventoryData);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "overview") {
      fetchInventoryData();
    }
  }, [activeTab]);

  const inventoryStats = useMemo(() => {
    const items = Array.isArray(inventoryItems) ? inventoryItems : [];
    const hasLiveRecords = items.length > 0;

    let totalUnits = 0;
    let totalValuation = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    let inStockUnits = 0;
    let inStockValuation = 0;
    let lowStockUnits = 0;
    let lowStockValuation = 0;
    let outOfStockUnits = 0;
    let outOfStockValuation = 0;

    let txUsedStock = 0;
    let txReservedStock = 0;
    let txPendingStock = 0;
    let txTotalBaseStock = 0;

    const categoryMap = {};
    const stockroomMap = {};

    items.forEach((item) => {
      let stock = Number(item.stock) || 0;
      if (Array.isArray(item.items) && item.items.length > 0) {
        stock = item.items.reduce((acc, sub) => acc + (Number(sub.countedQuantity) || 0), 0);
      }
      const price = Number(item.price) || 0;
      const valuation = stock * price;
      const incoming = Number(item.incoming) || 0;

      totalUnits += stock;
      totalValuation += valuation;

      const baseStock = Number(item.totalBaseStock) || stock || 0;
      txTotalBaseStock += baseStock;

      if (Array.isArray(item.transactions)) {
        item.transactions.forEach((tx) => {
          const qty = Math.abs(Number(tx.quantity) || 0);
          const type = (tx.type || "").toLowerCase();
          if (type === "used") txUsedStock += qty;
          else if (type === "reserved") txReservedStock += qty;
          else if (type === "pending") txPendingStock += qty;
        });
      }

      const status = (item.status || "In stock").toLowerCase();
      if (status.includes("out") || stock === 0) {
        outOfStockCount++;
        outOfStockUnits += stock;
        outOfStockValuation += valuation;
      } else if (status.includes("low") || stock < 100) {
        lowStockCount++;
        lowStockUnits += stock;
        lowStockValuation += valuation;
      } else {
        inStockCount++;
        inStockUnits += stock;
        inStockValuation += valuation;
      }

      const cat = (item.category && item.category.trim()) || "General";
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          name: cat,
          units: 0,
          incoming: 0,
          valuation: 0,
          count: 0,
          inStock: 0,
          lowStock: 0,
          outOfStock: 0,
        };
      }
      categoryMap[cat].units += stock;
      categoryMap[cat].incoming += incoming;
      categoryMap[cat].valuation += valuation;
      categoryMap[cat].count += 1;
      if (status.includes("out") || stock === 0) categoryMap[cat].outOfStock += 1;
      else if (status.includes("low") || stock < 100) categoryMap[cat].lowStock += 1;
      else categoryMap[cat].inStock += 1;

      const room = (item.stockroom && item.stockroom.trim()) || "Main Stockroom - Delhi";
      if (!stockroomMap[room]) {
        stockroomMap[room] = {
          name: room,
          units: 0,
          incoming: 0,
          valuation: 0,
          count: 0,
          inStock: 0,
          lowStock: 0,
          outOfStock: 0,
        };
      }
      stockroomMap[room].units += stock;
      stockroomMap[room].incoming += incoming;
      stockroomMap[room].valuation += valuation;
      stockroomMap[room].count += 1;
      if (status.includes("out") || stock === 0) stockroomMap[room].outOfStock += 1;
      else if (status.includes("low") || stock < 100) stockroomMap[room].lowStock += 1;
      else stockroomMap[room].inStock += 1;
    });

    let categoryList = Object.values(categoryMap).sort((a, b) => b.units - a.units);
    let stockroomList = Object.values(stockroomMap).sort((a, b) => b.units - a.units);

    // If no custom records logged yet in DB, display calibrated apparel inventory baseline categories so graphs are always live
    if (!hasLiveRecords) {
      categoryList = [
        { name: "T-Shirts", units: 1250, valuation: 31250, count: 6, inStock: 5, lowStock: 1, outOfStock: 0 },
        { name: "Hoodies", units: 820, valuation: 28700, count: 4, inStock: 3, lowStock: 1, outOfStock: 0 },
        { name: "Fabrics", units: 960, valuation: 14400, count: 5, inStock: 4, lowStock: 0, outOfStock: 1 },
        { name: "Polos", units: 640, valuation: 16000, count: 3, inStock: 3, lowStock: 0, outOfStock: 0 },
        { name: "Caps", units: 480, valuation: 7200, count: 2, inStock: 2, lowStock: 0, outOfStock: 0 },
        { name: "Accessories", units: 350, valuation: 5250, count: 2, inStock: 1, lowStock: 1, outOfStock: 0 },
      ];
      stockroomList = [
        { name: "Main Stockroom - Delhi", units: 2600, valuation: 61500, count: 12, inStock: 10, lowStock: 2, outOfStock: 0 },
        { name: "Warehouse B - Noida", units: 1300, valuation: 27800, count: 6, inStock: 5, lowStock: 1, outOfStock: 0 },
        { name: "Rack A (Apparel)", units: 600, valuation: 13500, count: 4, inStock: 3, lowStock: 0, outOfStock: 1 },
      ];
      totalUnits = categoryList.reduce((acc, c) => acc + c.units, 0);
      totalValuation = categoryList.reduce((acc, c) => acc + c.valuation, 0);
      inStockCount = 18;
      lowStockCount = 3;
      outOfStockCount = 1;
      txTotalBaseStock = 100;
      txUsedStock = 50;
      txReservedStock = 30;
      txPendingStock = 70;
    }

    const totalCount = hasLiveRecords ? items.length : 22;
    const optimalPct = Math.round((inStockCount / (totalCount || 1)) * 100);
    const lowStockPct = Math.round((lowStockCount / (totalCount || 1)) * 100);
    const outOfStockPct = Math.max(0, 100 - optimalPct - lowStockPct);
    const netInStock = txTotalBaseStock - txUsedStock - txReservedStock - txPendingStock;

    return {
      hasLiveRecords,
      totalCount,
      totalUnits,
      totalValuation,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      inStockUnits,
      inStockValuation,
      lowStockUnits,
      lowStockValuation,
      outOfStockUnits,
      outOfStockValuation,
      optimalPct,
      lowStockPct,
      outOfStockPct,
      categoryList,
      stockroomList,
      txTotalBaseStock,
      txUsedStock,
      txReservedStock,
      txPendingStock,
      netInStock,
    };
  }, [inventoryItems]);

  // Unified single stock flow metrics (Available vs Used vs Low/Out of Stock)
  const stockFlowStats = useMemo(() => {
    const total = inventoryStats.totalUnits || 4500;
    const valuation = inventoryStats.totalValuation || 103600;
    
    const txUsed = inventoryStats.txUsedStock || 0;
    const txReserved = inventoryStats.txReservedStock || 0;
    const allocatedUnits = txUsed + txReserved;

    const inStockPct = inventoryStats.optimalPct || 82;
    const lowStockPct = inventoryStats.lowStockPct || 14;
    const outStockPct = inventoryStats.outOfStockPct || 4;

    // Segment ratios for the master flow bar (always sums up to 100%)
    const allocatedPct = Math.min(25, Math.round((allocatedUnits / (total || 1)) * 100)) || 10;
    const healthyPct = Math.max(10, Math.round(inStockPct * (1 - allocatedPct / 100)));
    const lowPct = Math.min(20, Math.round(lowStockPct * (1 - allocatedPct / 100))) || 6;
    const outPct = Math.max(2, 100 - healthyPct - allocatedPct - lowPct);

    const healthyUnits = Math.round(total * (healthyPct / 100));
    const allocUnits = Math.round(total * (allocatedPct / 100));
    const lowUnits = Math.round(total * (lowPct / 100));
    const outUnits = Math.max(0, total - healthyUnits - allocUnits - lowUnits);

    return {
      total,
      valuation,
      healthyPct,
      allocatedPct,
      lowPct,
      outPct,
      healthyUnits,
      allocUnits,
      lowUnits,
      outUnits,
      itemCount: inventoryStats.totalCount,
      inStockCount: inventoryStats.inStockCount,
      lowStockCount: inventoryStats.lowStockCount,
      outOfStockCount: inventoryStats.outOfStockCount,
    };
  }, [inventoryStats]);

  // Fetch leads and check backend health on mount and tab switch
  useEffect(() => {
    api.get("/api/health")
      .then((res) => console.log("Backend connected:", res.data))
      .catch((err) => console.warn("Backend health check failed:", err.message));

    const fetchLeads = () => {
      api.get("/api/leads")
        .then((res) => {
          if (res.data?.data) {
            setRawLeads(res.data.data);
            setLeadsLoaded(true);
            try {
              sessionStorage.setItem("omission_cached_leads", JSON.stringify(res.data.data));
            } catch (_) {}
          }
        })
        .catch((err) => {
          console.warn("Leads fetch failed, using realistic baseline:", err.message);
        });
    };

    fetchLeads();

    api.get("/api/employees")
      .then((res) => {
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setEmployeesList(res.data.data);
        }
      })
      .catch((err) => {
        console.warn("Employees fetch failed, using default:", err.message);
      });

    const handleFocus = () => fetchLeads();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [activeTab]);

  // Compute live repeat customer rate linked to lead form field `repeatedOrder`
  const repeatCustomerStats = useMemo(() => {
    const ordersList = leads.filter(l => l.query === 'order' || l.orderStage || l.totalQuantity);
    const hasLiveOrders = isAdmin ? ordersList.length > 0 : (leadsLoaded && ordersList.length > 0);
    const totalCount = hasLiveOrders ? ordersList.length : (leads.length || 25);
    
    // Count orders where repeatedOrder === "Yes" (matching create lead form radio value)
    const repeatLeads = (hasLiveOrders ? ordersList : leads).filter(l => (l.repeatedOrder || "").toLowerCase().trim() === "yes");
    const repeatCount = hasLiveOrders ? repeatLeads.length : (hasLiveOrders ? 0 : 7);
    const firstTimeCount = Math.max(0, totalCount - repeatCount);
    // Zero-division safe
    const rate = totalCount > 0 ? Math.round((repeatCount / totalCount) * 100) : 0;
    const target = 30;

    return {
      totalCount,
      repeatCount,
      firstTimeCount,
      rate,
      target,
      isLive: hasLiveOrders,
      repeatLeads
    };
  }, [leads, leadsLoaded, isAdmin]);

  // Compute live stage counts for Sample, Partial, Complete
  const stageStats = useMemo(() => {
    const hasLiveLeads = isAdmin ? leads.length > 0 : leadsLoaded;

    const sampleLeads = leads.filter(l => {
      const s = (l.orderStage || "sample").toLowerCase().trim();
      return s === "sample" || (s !== "partial" && s !== "complete");
    });
    const partialLeads = leads.filter(l => (l.orderStage || "").toLowerCase().trim() === "partial");
    const completeLeads = leads.filter(l => (l.orderStage || "").toLowerCase().trim() === "complete");

    const sampleCount = hasLiveLeads ? sampleLeads.length : 28;
    const partialCount = hasLiveLeads ? partialLeads.length : 46;
    const completeCount = hasLiveLeads ? completeLeads.length : 41;
    const total = sampleCount + partialCount + completeCount;

    // Zero-division safe (only reachable for profiles with 0 orders)
    const pctOf = (count) => (total > 0 ? Math.round((count / total) * 100) : 0);

    return {
      sample: { count: sampleCount, pct: pctOf(sampleCount) },
      partial: { count: partialCount, pct: pctOf(partialCount) },
      complete: { count: completeCount, pct: Math.max(0, 100 - pctOf(sampleCount) - pctOf(partialCount)) },
      total
    };
  }, [leads, leadsLoaded, isAdmin]);

  // Live Order Ageing Analytics (Packaging & beyond = Completed, Pre-Packaging = Pending)
  const orderAgeingStats = useMemo(() => {
    const leadsList = (rawLeads && rawLeads.length > 0)
      ? rawLeads
      : (leads && leads.length > 0)
        ? leads
        : [];

    const orders = leadsList.filter(l => l.query === 'order' || l.orderStage || l.totalQuantity || l.orderId);

    const completedSubStages = [
      'packaging',
      'delivery-pending',
      'delivery pending',
      'delivered',
      'delivery',
      'customer-support',
      'customer support',
      'support',
      'archived',
      'staging-room',
      'staging room',
      'payment-confirmation',
      'payment confirmation',
      'payment status'
    ];

    const isCompleted = (o) => {
      if (o.isCompleted === true) return true;
      const sub = (o.subStage || '').toLowerCase().trim();
      const stage = (o.orderStage || '').toLowerCase().trim();
      if (completedSubStages.includes(sub)) return true;
      if (stage === 'complete' && !['order', 'new', 'leads', 'dtf-pending', 'stock', 'printing', 'quality-check'].includes(sub)) {
        return true;
      }
      return false;
    };

    const now = new Date();

    const categorized = orders.map(o => {
      const completed = isCompleted(o);
      const created = new Date(o.createdAt || o.deliveryDate || '2026-10-15');
      const validCreated = isNaN(created.getTime()) ? new Date('2026-10-15') : created;

      let days = 0;
      if (completed) {
        const updated = new Date(o.updatedAt || o.createdAt || now);
        const validUpdated = isNaN(updated.getTime()) ? now : updated;
        const diffMs = Math.max(0, validUpdated.getTime() - validCreated.getTime());
        days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      } else {
        const diffMs = Math.max(0, now.getTime() - validCreated.getTime());
        days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      }

      let tier = "over7";
      if (days < 5) tier = "under5";
      else if (days <= 7) tier = "fiveTo7";

      return {
        ...o,
        isCompleted: completed,
        days,
        tier
      };
    });

    const completedOrders = categorized.filter(o => o.isCompleted);
    const pendingOrders = categorized.filter(o => !o.isCompleted);

    const calcTierStats = (list) => {
      const total = list.length;
      const under5Count = list.filter(o => o.tier === "under5").length;
      const fiveTo7Count = list.filter(o => o.tier === "fiveTo7").length;
      const over7Count = list.filter(o => o.tier === "over7").length;

      const under5Pct = total > 0 ? Math.round((under5Count / total) * 100) : 0;
      const fiveTo7Pct = total > 0 ? Math.round((fiveTo7Count / total) * 100) : 0;
      const over7Pct = total > 0 ? Math.max(0, 100 - under5Pct - fiveTo7Pct) : 0;

      const avgDays = total > 0
        ? (list.reduce((sum, o) => sum + o.days, 0) / total).toFixed(1)
        : "0.0";

      return {
        total,
        under5: { count: under5Count, pct: under5Pct, label: "Under 5 Days" },
        fiveTo7: { count: fiveTo7Count, pct: fiveTo7Pct, label: "5 to 7 Days" },
        over7: { count: over7Count, pct: over7Pct, label: "Over 7 Days (Aged)" },
        avgDays,
        list
      };
    };

    return {
      completed: calcTierStats(completedOrders),
      pending: calcTierStats(pendingOrders),
      allTotal: categorized.length
    };
  }, [rawLeads, leads]);

  // Currency formatter for INR
  const formatINR = (val, compact = false) => {
    const num = Number(val) || 0;
    if (compact) {
      if (num >= 10000000) return `₹ ${(num / 10000000).toFixed(2)} Cr`;
      if (num >= 100000) return `₹ ${(num / 100000).toFixed(2)} L`;
      if (num >= 1000) return `₹ ${(num / 1000).toFixed(1)} K`;
      return `₹ ${Math.round(num)}`;
    }
    return `₹ ${Math.round(num).toLocaleString('en-IN')}`;
  };

  // Open dedicated Sales Orders Ledger breakdown for a selected period
  const handleOpenSalesBreakdown = (col) => {
    if (!col) {
      navigate("/sales/orders");
      return;
    }
    let url = `/sales/orders?label=${encodeURIComponent(col.label || col.shortLabel || "")}`;
    if (col.start && col.end) {
      url += `&period=${salesTimeFrame}&start=${col.start.toISOString()}&end=${col.end.toISOString()}`;
      if (salesTimeFrame === "monthly") {
        url += `&month=${col.monthIdx}&year=${col.year}`;
      }
    } else if (salesTimeFrame === "monthly") {
      url += `&period=monthly&month=${col.monthIdx}&year=${col.year}`;
    } else if (salesTimeFrame === "custom") {
      url += `&period=custom&start=${customStartDate}&end=${customEndDate}`;
    }
    navigate(url);
  };

  // Open Sales Orders Ledger breakdown filtered by Order Ageing
  const handleOpenAgeingOrders = (tier = "all", status = "all") => {
    const params = new URLSearchParams();
    if (status && status !== "all") {
      params.set("ageingStatus", status);
    }
    if (tier && tier !== "all") {
      params.set("ageingTier", tier);
    }
    const statusLabel = status === "completed" ? "Completed Orders" : status === "pending" ? "Pending Orders" : "All Orders";
    const tierLabel = tier === "under5" ? "Under 5 Days" : tier === "fiveTo7" ? "5 to 7 Days" : tier === "over7" ? "Over 7 Days (Aged)" : "All Tiers";
    params.set("label", `${tierLabel} • ${statusLabel}`);
    navigate(`/sales/orders?${params.toString()}`);
  };

  // Clean, live aggregated sales data from actual database orders
  const salesOverviewData = useMemo(() => {
    // For executive company sales overview, prioritize full real leads
    const leadsList = (rawLeads && rawLeads.length > 0)
      ? rawLeads
      : (leads && leads.length > 0)
        ? leads
        : [];

    const sanitizeLead = (l) => {
      const rawNet = Number(l.netAmount);
      const rawTotal = Number(l.totalAmount);
      const qty = Number(l.totalQuantity) || (Array.isArray(l.items) ? l.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 0);
      const ppp = Number(l.pricePerPiece) || 0;
      let safeRev = 0;
      if (!isNaN(rawNet) && rawNet > 0 && rawNet < 50000000) safeRev = rawNet;
      else if (!isNaN(rawTotal) && rawTotal > 0 && rawTotal < 50000000) safeRev = rawTotal;
      else if (qty > 0 && ppp > 0) safeRev = qty * ppp;

      const dateStr = l.createdAt || l.deliveryDate || '2026-10-15';
      const d = new Date(dateStr);
      return {
        id: l.orderId || l._id,
        units: qty,
        revenue: safeRev,
        date: isNaN(d.getTime()) ? new Date('2026-10-15') : d
      };
    };

    const cleanLeads = leadsList.map(sanitizeLead);
    let periodBuckets = [];

    // Dynamic reference date ending on today or latest order date
    const now = new Date();
    const latestLeadTs = cleanLeads.length > 0 ? Math.max(...cleanLeads.map(x => x.date.getTime())) : now.getTime();
    const refDate = new Date(Math.max(now.getTime(), latestLeadTs));

    if (salesTimeFrame === "daily") {
      // Dynamic recent 7 days ending on today (or latest order date)
      const baseDate = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());

      periodBuckets = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);

        const endD = new Date(d);
        endD.setHours(23, 59, 59, 999);

        const shortDay = d.toLocaleDateString("en-US", { weekday: "short" });
        const shortDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const fullDate = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

        const inDay = cleanLeads.filter(x => x.date >= d && x.date <= endD);
        periodBuckets.push({
          label: fullDate,
          shortLabel: shortDay,
          subLabel: shortDate,
          start: d,
          end: endD,
          units: inDay.reduce((s, x) => s + x.units, 0),
          revenue: inDay.reduce((s, x) => s + x.revenue, 0),
          orders: inDay.length,
        });
      }
    } else if (salesTimeFrame === "weekly") {
      // 6 weeks of weekly data ending on current week (no scrolling needed)
      const dayOfWeek = refDate.getDay();
      const daysUntilEndOfWeek = (7 - dayOfWeek) % 7;
      const endOfCurrentWeek = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + daysUntilEndOfWeek, 23, 59, 59, 999);

      periodBuckets = [];
      for (let i = 5; i >= 0; i--) {
        const wEnd = new Date(endOfCurrentWeek.getTime() - i * 7 * 86400000);
        wEnd.setHours(23, 59, 59, 999);
        const wStart = new Date(wEnd.getTime() - 6 * 86400000);
        wStart.setHours(0, 0, 0, 0);

        const startM = wStart.toLocaleDateString("en-US", { month: "short" });
        const endM = wEnd.toLocaleDateString("en-US", { month: "short" });
        const startD = wStart.getDate();
        const endD = wEnd.getDate();

        const label = `Week: ${startM} ${startD} – ${startM === endM ? "" : endM + " "}${endD}, ${wEnd.getFullYear()}`;
        const weekNum = Math.min(5, Math.ceil(startD / 7));
        const shortLabel = `${startM} W${weekNum}`;
        const subLabel = `${startD}-${endD} ${startM === endM ? "" : endM}`;

        const inBucket = cleanLeads.filter(x => x.date >= wStart && x.date <= wEnd);
        periodBuckets.push({
          label,
          shortLabel,
          subLabel,
          start: wStart,
          end: wEnd,
          units: inBucket.reduce((s, x) => s + x.units, 0),
          revenue: inBucket.reduce((s, x) => s + x.revenue, 0),
          orders: inBucket.length,
        });
      }
    } else if (salesTimeFrame === "monthly") {
      // 6 months of monthly data ending on refDate month
      periodBuckets = [];
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
        const y = targetDate.getFullYear();
        const m = targetDate.getMonth();
        const mStart = new Date(y, m, 1, 0, 0, 0, 0);
        const mEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);

        const monthShort = mStart.toLocaleDateString("en-US", { month: "short" });
        const monthFull = mStart.toLocaleDateString("en-US", { month: "long" });

        const inMonth = cleanLeads.filter(x => x.date >= mStart && x.date <= mEnd);
        periodBuckets.push({
          label: `${monthFull} ${y}`,
          shortLabel: monthShort,
          subLabel: `${y}`,
          monthIdx: m,
          year: y,
          start: mStart,
          end: mEnd,
          units: inMonth.reduce((s, x) => s + x.units, 0),
          revenue: inMonth.reduce((s, x) => s + x.revenue, 0),
          orders: inMonth.length,
        });
      }
    } else if (salesTimeFrame === "custom") {
      // In custom data: show every single day in detail
      const s = new Date(customStartDate || "2026-10-01");
      const e = new Date((customEndDate || "2026-11-30") + "T23:59:59.999");

      const startMs = isNaN(s.getTime()) ? new Date("2026-10-01").getTime() : s.getTime();
      const endMs = isNaN(e.getTime()) ? new Date("2026-11-30T23:59:59.999").getTime() : e.getTime();
      const actualStart = new Date(Math.min(startMs, endMs));
      const actualEnd = new Date(Math.max(startMs, endMs));
      actualStart.setHours(0, 0, 0, 0);
      actualEnd.setHours(23, 59, 59, 999);

      periodBuckets = [];
      const curr = new Date(actualStart);
      let dayCount = 0;
      while (curr <= actualEnd && dayCount < 366) {
        const dStart = new Date(curr);
        dStart.setHours(0, 0, 0, 0);
        const dEnd = new Date(curr);
        dEnd.setHours(23, 59, 59, 999);

        const shortDay = dStart.toLocaleDateString("en-US", { weekday: "short" });
        const shortDate = dStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const fullDate = dStart.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

        const inDay = cleanLeads.filter(x => x.date >= dStart && x.date <= dEnd);
        periodBuckets.push({
          label: fullDate,
          shortLabel: shortDate,
          subLabel: shortDay,
          start: dStart,
          end: dEnd,
          units: inDay.reduce((acc, x) => acc + x.units, 0),
          revenue: inDay.reduce((acc, x) => acc + x.revenue, 0),
          orders: inDay.length,
        });

        curr.setDate(curr.getDate() + 1);
        dayCount++;
      }
    }

    const totalUnits = periodBuckets.reduce((s, b) => s + b.units, 0);
    const totalRevenue = periodBuckets.reduce((s, b) => s + b.revenue, 0);
    const totalOrders = periodBuckets.reduce((s, b) => s + b.orders, 0);

    const maxVal = Math.max(
      ...periodBuckets.map(b => (chartViewMode === "volume" ? b.units : b.revenue)),
      1
    );

    const numCols = periodBuckets.length;
    // Only scroll in Custom Range when there are multiple days (> 7). Day (7), Week (6), Month (6) fit cleanly without scrolling.
    const isScrollable = salesTimeFrame === "custom" && numCols > 7;
    const pointSpacing = numCols > 25 ? 52 : numCols > 12 ? 60 : 70;
    const paddingX = isScrollable ? 44 : (numCols > 5 ? 50 : 80);
    const chartSvgWidth = isScrollable
      ? Math.max(680, paddingX * 2 + (numCols - 1) * pointSpacing)
      : 600;

    const usableWidth = chartSvgWidth - paddingX * 2;
    const xStep = numCols > 1 ? usableWidth / (numCols - 1) : 0;
    const xCenters = periodBuckets.map((_, i) => Math.round(paddingX + i * xStep));

    const columns = periodBuckets.map((b, i) => {
      const val = chartViewMode === "volume" ? b.units : b.revenue;
      const y = val > 0 ? Math.round(190 - (val / maxVal) * 135) : 190;
      const x = xCenters[i];
      return {
        ...b,
        xCenter: x,
        x,
        y,
        val,
        totalLabelUnits: `${b.units.toLocaleString('en-IN')} Units`,
        totalLabelRevenue: formatINR(b.revenue, true),
        fullRevenue: formatINR(b.revenue, false)
      };
    });

    const buildSmoothSpline = (pts) => {
      if (!pts || pts.length === 0) return "";
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = i > 0 ? pts[i - 1] : pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = i + 2 < pts.length ? pts[i + 2] : p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        let cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        let cp2y = p2.y - (p3.y - p1.y) / 6;

        cp1y = Math.min(190, Math.max(45, cp1y));
        cp2y = Math.min(190, Math.max(45, cp2y));

        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return d;
    };

    const linePath = buildSmoothSpline(columns);
    const areaPath = columns.length > 0
      ? `${linePath} L ${columns[columns.length - 1].x} 190 L ${columns[0].x} 190 Z`
      : "";

    const peakPeriod = columns.reduce((p, c) => (c.val > (p?.val || 0) ? c : p), columns[0]);

    return {
      columns,
      linePath,
      areaPath,
      chartSvgWidth,
      isScrollable,
      maxVal,
      totalUnits,
      totalRevenue,
      formattedTotalRevenue: formatINR(totalRevenue, false),
      totalOrders,
      avgUnits: periodBuckets.length ? Math.round(totalUnits / periodBuckets.length) : 0,
      avgRevenue: periodBuckets.length ? Math.round(totalRevenue / periodBuckets.length) : 0,
      formattedAvgRevenue: formatINR(periodBuckets.length ? Math.round(totalRevenue / periodBuckets.length) : 0, false),
      peakPeriod,
      peakVal: peakPeriod ? peakPeriod.val : 0
    };
  }, [rawLeads, leads, salesTimeFrame, customStartDate, customEndDate, chartViewMode]);

  // Weekly Order Velocity Data
  const weeklyVelocityData = [
    { day: "Mon", standard: 10, urgent: 4, total: 14, isPeak: false },
    { day: "Tue", standard: 13, urgent: 5, total: 18, isPeak: true },
    { day: "Wed", standard: 9, urgent: 3, total: 12, isPeak: false },
    { day: "Thu", standard: 7, urgent: 2, total: 9, isPeak: false },
    { day: "Fri", standard: 11, urgent: 4, total: 15, isPeak: false },
    { day: "Sat", standard: 6, urgent: 2, total: 8, isPeak: false },
    { day: "Sun", standard: 4, urgent: 1, total: 5, isPeak: false },
  ];

  // Helper to determine inactive employees based on form selection (e.g., 'Inactive (Disabled)')
  const isEmployeeInactive = (emp) => {
    if (!emp) return false;
    const s = (emp.accountStatus || "").toLowerCase().trim();
    return (
      s.includes("inactive") ||
      s.includes("disabled") ||
      s === "suspended" ||
      s === "offboarding" ||
      s === "terminated"
    );
  };

  // Deterministic dummy info generator for leaves and salary deduction
  const getDummyEmployeeData = (emp, idx = 0) => {
    const nameStr = emp.displayName || emp.name || `emp-${idx}`;
    let hash = 0;
    for (let i = 0; i < nameStr.length; i++) {
      hash = (hash << 5) - hash + nameStr.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash) + idx;

    // Total leaves taken between 1 and 6 days
    const totalLeavesTaken = (seed % 6) + 1;
    const annualLeaveAllowance = 18;
    const remainingLeaves = Math.max(0, annualLeaveAllowance - totalLeavesTaken);

    // Casual and sick leaves breakdown
    const sickLeaves = Math.min(totalLeavesTaken, (seed % 3) + 1);
    const casualLeaves = totalLeavesTaken - sickLeaves;

    // Salary deduction: approx 1 in 3 has a deduction
    const hasDeduction = seed % 3 === 0;
    const deductionDays = hasDeduction ? (seed % 2) + 1 : 0;
    const salaryDeduction = deductionDays * 1250; // ₹1,250 or ₹2,500

    const baseSalary = 32000 + (seed % 5) * 4500; // ₹32,000 to ₹50,000
    const netSalary = baseSalary - salaryDeduction;

    return {
      totalLeavesTaken,
      annualLeaveAllowance,
      remainingLeaves,
      sickLeaves,
      casualLeaves,
      hasDeduction,
      deductionDays,
      salaryDeduction,
      baseSalary,
      netSalary,
      deductionReason: hasDeduction
        ? `${deductionDays} day(s) Unpaid / LOP deduction`
        : "None (All leaves within paid allowance)",
    };
  };

  // Real MongoDB Workforce Normalization
  const normalizedEmployees = useMemo(() => {
    return employeesList.map((emp, idx) => {
      const displayName = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || 'Staff Member';
      const initials = emp.initials || displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'EM';
      const role = emp.jobTitle || emp.role || 'Team Member';
      const department = emp.department || 'Operations';
      const avatarColors = ['#ffedd5', '#e2e8f0', '#d1fae5', '#e0e7ff', '#fef08a'];
      const avatarBg = emp.avatarBg || avatarColors[idx % avatarColors.length];
      const isInactive = isEmployeeInactive(emp);
      const status = isInactive ? 'inactive' : (emp.accountStatus || 'Active').toLowerCase() === 'active' ? 'online' : 'away';
      const dummy = getDummyEmployeeData(emp, idx);

      return {
        ...emp,
        id: emp._id || emp.id || idx,
        name: displayName,
        initials,
        role,
        department,
        avatarBg,
        status,
        isInactive,
        openTasks: emp.openTasks ?? (leads.filter(l => (l.employeeName || '').toLowerCase().includes(displayName.toLowerCase())).length),
        completedTasks: emp.completedTasks ?? 12,
        workload: emp.workload ?? 65,
        dummy,
      };
    });
  }, [employeesList, leads]);

  const filteredEmployeeCards = useMemo(() => {
    const q = (employeeSearchQuery || "").toLowerCase().trim();
    if (!q) return normalizedEmployees;
    return normalizedEmployees.filter((emp) => {
      const name = (emp.name || "").toLowerCase();
      const role = (emp.role || "").toLowerCase();
      const dept = (emp.department || "").toLowerCase();
      const empId = (emp.employeeId || "").toLowerCase();
      const email = (emp.email || "").toLowerCase();
      return (
        name.includes(q) ||
        role.includes(q) ||
        dept.includes(q) ||
        empId.includes(q) ||
        email.includes(q)
      );
    });
  }, [normalizedEmployees, employeeSearchQuery]);

  // Workforce stats from real MongoDB employees
  const totalEmployees = normalizedEmployees.length;
  const inactiveEmployees = normalizedEmployees.filter(e => e.isInactive).length;
  const activeEmployees = normalizedEmployees.filter(e => !e.isInactive).length;
  const leaveEmployees = normalizedEmployees.filter(e => e.status === "away" && !e.isInactive).length;
  const activePct = totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 0;
  const inactivePct = totalEmployees > 0 ? Math.round((inactiveEmployees / totalEmployees) * 100) : 0;

  // Pending Payment Ageing & Days Passed (from DTF Partial / All Orders)
  const pendingPaymentAgeing = useMemo(() => {
    const now = new Date().getTime();
    const allLeadsList = rawLeads && rawLeads.length > 0 ? rawLeads : leads || [];

    const calculateTierStats = (list) => {
      let totalAmount = 0;
      let count = 0;
      const tier0to3 = { count: 0, amount: 0, label: "0-3 Days", color: "#10b981", orders: [] };
      const tier4to7 = { count: 0, amount: 0, label: "4-7 Days", color: "#f59e0b", orders: [] };
      const tierOver7 = { count: 0, amount: 0, label: "Over 7 Days", color: "#ef4444", orders: [] };

      list.forEach((l) => {
        const netVal = Number(l.netAmount) || 0;
        const subTotal = Number(l.totalAmount) || 0;
        const tot = netVal > 0 ? netVal : subTotal;
        const adv = Number(l.customerApprovalData?.amountReceived) ||
          Number(l.customerApprovalData?.amountPaid) ||
          Number(l.advanceAmount) || 0;

        let pend;
        if (l.customerApprovalData?.paymentStatus === "fully_received" || l.partialPaymentConfirmationData?.paymentStatus === "fully_received" || l.isCompleted) {
          pend = 0;
        } else if (l.customerApprovalData?.balanceRemaining !== undefined && !isNaN(Number(l.customerApprovalData.balanceRemaining))) {
          pend = Number(l.customerApprovalData.balanceRemaining);
        } else if (l.pendingAmount !== undefined && !isNaN(Number(l.pendingAmount))) {
          pend = Number(l.pendingAmount);
        } else {
          pend = Math.max(0, tot - adv);
        }

        // Sanitize unrealistic spam values
        if (isNaN(pend) || pend < 0 || (tot > 0 && pend > tot * 2) || pend > 50000000) {
          pend = tot > adv ? tot - adv : 0;
        }

        const isDtfPartial = (l.orderStage || "").toLowerCase().trim() === "partial" &&
          ((l.subStage || "").toLowerCase().includes("payment") || l.subStage === "payment-confirmation");

        if (pend > 0 || isDtfPartial) {
          const dateStr = l.updatedAt || l.createdAt || l.date;
          const orderDate = dateStr ? new Date(dateStr).getTime() : now;
          const daysPassed = Math.max(0, Math.floor((now - orderDate) / (1000 * 60 * 60 * 24)));

          const orderItem = {
            id: l._id,
            orderId: l.orderId || l.orderNo || `ORD-${l._id?.slice(-4)}`,
            clientName: l.clientName || l.customerName || "Customer",
            companyName: l.companyName || "",
            pendingAmount: pend,
            totalAmount: tot,
            daysPassed,
            orderStage: l.orderStage || "partial",
            subStage: l.subStage || "order",
          };

          totalAmount += pend;
          count++;

          if (daysPassed <= 3) {
            tier0to3.count++;
            tier0to3.amount += pend;
            tier0to3.orders.push(orderItem);
          } else if (daysPassed <= 7) {
            tier4to7.count++;
            tier4to7.amount += pend;
            tier4to7.orders.push(orderItem);
          } else {
            tierOver7.count++;
            tierOver7.amount += pend;
            tierOver7.orders.push(orderItem);
          }
        }
      });

      return {
        totalAmount,
        count,
        tiers: [tier0to3, tier4to7, tierOver7],
        allOrders: [...tier0to3.orders, ...tier4to7.orders, ...tierOver7.orders].sort(
          (a, b) => b.daysPassed - a.daysPassed
        ),
      };
    };

    // Helper to identify Embroidery orders (excluded from DTF stage views)
    const isEmbroideryOrder = (order) => {
      if (!order) return false;
      if (String(order.printingType || "").toLowerCase().trim() === "embroidery") return true;
      if (Array.isArray(order.items) && order.items.some((it) => String(it?.printingType || "").toLowerCase().trim() === "embroidery")) return true;
      return false;
    };

    // Filter DTF Partial leads matching sidebar photo (excluding Embroidery and Referred Back orders)
    const dtfPartialLeads = allLeadsList.filter((l) => {
      if (isEmbroideryOrder(l)) return false;
      if (l.approvalStatus === "Referred Back") return false;
      const stage = (l.orderStage || "").toLowerCase().trim();
      const sub = (l.subStage || "").toLowerCase().trim().replace(/_/g, "-");
      return (
        stage === "partial" &&
        (sub.includes("payment") || sub === "payment-confirmation" || sub === "payment status")
      );
    });

    return {
      dtfPartial: calculateTierStats(dtfPartialLeads),
      allOrders: calculateTierStats(allLeadsList),
    };
  }, [rawLeads, leads]);

  // Render Compact Order Ageing Subgraph for Completed or Pending
  const renderAgeingSubgraph = (statusType, title, stats, hoveredSegment, setHoveredSegment) => {
    const total = stats?.total || 0;
    const r = 68;
    const C = 2 * Math.PI * r; // ~427.26
    const nonZeroCount = [stats?.under5?.count || 0, stats?.fiveTo7?.count || 0, stats?.over7?.count || 0].filter(c => c > 0).length;
    const gap = nonZeroCount > 1 ? 5 : 0;

    const lenG = total > 0 ? ((stats?.under5?.count || 0) / total) * C : 0;
    const lenY = total > 0 ? ((stats?.fiveTo7?.count || 0) / total) * C : 0;
    const lenR = total > 0 ? ((stats?.over7?.count || 0) / total) * C : 0;

    const dashG = Math.max(0, lenG - gap);
    const dashY = Math.max(0, lenY - gap);
    const dashR = Math.max(0, lenR - gap);

    const offsetG = -gap / 2;
    const offsetY = -(lenG + gap / 2);
    const offsetR = -(lenG + lenY + gap / 2);

    return (
      <div className="ageing-subgraph-col">
        <div className="ageing-subgraph-header">
          <span className={`ageing-subgraph-title ${statusType}`}>
            <span className={`ageing-status-dot ${statusType}`} />
            {title}
          </span>
          <span className="ageing-subgraph-count">{total} orders</span>
        </div>

        {/* Donut Visual */}
        <div 
          className="ageing-donut-visual-container compact"
          onMouseLeave={() => setHoveredSegment(null)}
        >
          <svg viewBox="0 0 180 180" className="ageing-donut-svg">
            <circle
              cx="90"
              cy="90"
              r="68"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="16"
            />
            {total > 0 && (
              <g transform="rotate(-90 90 90)">
                {(stats?.under5?.count || 0) > 0 && (
                  <circle
                    cx="90"
                    cy="90"
                    r="68"
                    fill="none"
                    stroke="url(#ageingGreenGrad)"
                    strokeWidth={hoveredSegment === "under5" ? "20" : "16"}
                    strokeDasharray={`${dashG} ${C - dashG}`}
                    strokeDashoffset={offsetG}
                    className="ageing-donut-segment"
                    onMouseEnter={() => setHoveredSegment("under5")}
                    onClick={() => handleOpenAgeingOrders("under5", statusType)}
                    style={{ cursor: "pointer" }}
                  />
                )}
                {(stats?.fiveTo7?.count || 0) > 0 && (
                  <circle
                    cx="90"
                    cy="90"
                    r="68"
                    fill="none"
                    stroke="url(#ageingYellowGrad)"
                    strokeWidth={hoveredSegment === "fiveTo7" ? "20" : "16"}
                    strokeDasharray={`${dashY} ${C - dashY}`}
                    strokeDashoffset={offsetY}
                    className="ageing-donut-segment"
                    onMouseEnter={() => setHoveredSegment("fiveTo7")}
                    onClick={() => handleOpenAgeingOrders("fiveTo7", statusType)}
                    style={{ cursor: "pointer" }}
                  />
                )}
                {(stats?.over7?.count || 0) > 0 && (
                  <circle
                    cx="90"
                    cy="90"
                    r="68"
                    fill="none"
                    stroke="url(#ageingRedGrad)"
                    strokeWidth={hoveredSegment === "over7" ? "20" : "16"}
                    strokeDasharray={`${dashR} ${C - dashR}`}
                    strokeDashoffset={offsetR}
                    className="ageing-donut-segment"
                    onMouseEnter={() => setHoveredSegment("over7")}
                    onClick={() => handleOpenAgeingOrders("over7", statusType)}
                    style={{ cursor: "pointer" }}
                  />
                )}
              </g>
            )}
          </svg>

          {/* Donut Center Overlay - NO ARROWS & NO % */}
          <div 
            className="ageing-donut-center-info compact"
            onClick={() => handleOpenAgeingOrders(hoveredSegment || "all", statusType)}
            title={`Click to view ${hoveredSegment ? (hoveredSegment === 'under5' ? 'Under 5 Days' : hoveredSegment === 'fiveTo7' ? '5 to 7 Days' : 'Over 7 Days') : (statusType === 'completed' ? 'Completed' : 'Pending')} orders`}
            style={{ cursor: "pointer" }}
          >
            {hoveredSegment === "under5" ? (
              <>
                <span className="ageing-center-val compact" style={{ color: "#059669" }}>
                  {stats?.under5?.count || 0}
                </span>
                <span className="ageing-center-label compact">
                  Orders
                </span>
                <span className="ageing-center-pill compact" style={{ background: "#dcfce7", color: "#15803d" }}>
                  Under 5d
                </span>
              </>
            ) : hoveredSegment === "fiveTo7" ? (
              <>
                <span className="ageing-center-val compact" style={{ color: "#d97706" }}>
                  {stats?.fiveTo7?.count || 0}
                </span>
                <span className="ageing-center-label compact">
                  Orders
                </span>
                <span className="ageing-center-pill compact" style={{ background: "#fef3c7", color: "#b45309" }}>
                  5 to 7d
                </span>
              </>
            ) : hoveredSegment === "over7" ? (
              <>
                <span className="ageing-center-val compact" style={{ color: "#dc2626" }}>
                  {stats?.over7?.count || 0}
                </span>
                <span className="ageing-center-label compact">
                  Orders
                </span>
                <span className="ageing-center-pill compact" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                  Over 7d
                </span>
              </>
            ) : (
              <>
                <span className="ageing-center-val compact">
                  {stats?.total || 0}
                </span>
                <span className="ageing-center-label compact">
                  {statusType === "completed" ? "Completed" : "Pending"}
                </span>
                <span className="ageing-center-pill compact">
                  Avg: {stats?.avgDays}d
                </span>
              </>
            )}
          </div>
        </div>

        {/* Compact Tiers List - NO ARROWS & NO % */}
        <div className="ageing-compact-tiers-list">
          <div 
            className={`ageing-compact-tier-row ${hoveredSegment === "under5" ? "active" : ""}`}
            onMouseEnter={() => setHoveredSegment("under5")}
            onMouseLeave={() => setHoveredSegment(null)}
            onClick={() => handleOpenAgeingOrders("under5", statusType)}
            title={`Click to view Under 5 Days ${statusType} orders`}
          >
            <div className="ageing-tier-left">
              <span className="ageing-tier-dot green" />
              <span className="ageing-compact-tier-name">Under 5 Days</span>
            </div>
            <div className="ageing-tier-right">
              <span className="ageing-tier-count">{stats?.under5?.count || 0} orders</span>
            </div>
          </div>

          <div 
            className={`ageing-compact-tier-row ${hoveredSegment === "fiveTo7" ? "active" : ""}`}
            onMouseEnter={() => setHoveredSegment("fiveTo7")}
            onMouseLeave={() => setHoveredSegment(null)}
            onClick={() => handleOpenAgeingOrders("fiveTo7", statusType)}
            title={`Click to view 5 to 7 Days ${statusType} orders`}
          >
            <div className="ageing-tier-left">
              <span className="ageing-tier-dot yellow" />
              <span className="ageing-compact-tier-name">5 to 7 Days</span>
            </div>
            <div className="ageing-tier-right">
              <span className="ageing-tier-count">{stats?.fiveTo7?.count || 0} orders</span>
            </div>
          </div>

          <div 
            className={`ageing-compact-tier-row ${hoveredSegment === "over7" ? "active" : ""}`}
            onMouseEnter={() => setHoveredSegment("over7")}
            onMouseLeave={() => setHoveredSegment(null)}
            onClick={() => handleOpenAgeingOrders("over7", statusType)}
            title={`Click to view Over 7 Days ${statusType} orders`}
          >
            <div className="ageing-tier-left">
              <span className="ageing-tier-dot red" />
              <span className="ageing-compact-tier-name">Over 7 Days</span>
            </div>
            <div className="ageing-tier-right">
              <span className="ageing-tier-count">{stats?.over7?.count || 0} orders</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-page">
      {!isOnlyOrderManagement && !isOnlyInventory && (
        <div className="dashboard-tabs">
          <button className={`tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
            <LayoutGrid size={18} />
            <span>Overview</span>
          </button>
          <button className={`tab ${activeTab === "case" ? "active" : ""}`} onClick={() => setActiveTab("case")}>
            <FileText size={18} />
            <span>Order Management</span>
          </button>
          {isAdmin && (
            <button className={`tab ${activeTab === "employee" ? "active" : ""}`} onClick={() => setActiveTab("employee")}>
              <Users size={18} />
              <span>Employee Management</span>
            </button>
          )}
          <button className={`tab ${activeTab === "inventory" || activeTab === "leave" ? "active" : ""}`} onClick={() => setActiveTab("inventory")}>
            <Package size={18} />
            <span>Inventory Management</span>
          </button>
          <button className={`tab ${activeTab === "delivery" ? "active" : ""}`} onClick={() => setActiveTab("delivery")}>
            <Truck size={18} />
            <span>Delivery</span>
          </button>
          <button className={`tab ${activeTab === "compliance" ? "active" : ""}`} onClick={() => setActiveTab("compliance")}>
            <ShieldCheck size={18} />
            <span>Compliance</span>
          </button>
        </div>
      )}

      <div className="page-header dashboard-header">
        <div>
          <h1>
            {isOnlyOrderManagement || isOnlyInventory ? (
              "Dashboard"
            ) : (
              <>
                {activeTab === "overview" && "Overview"}
                {activeTab === "case" && "Order Management"}
                {activeTab === "employee" && isAdmin && "Employee Management"}
                {(activeTab === "inventory" || activeTab === "leave") && "Inventory Management"}
                {activeTab === "delivery" && "Delivery"}
                {activeTab === "compliance" && "Compliance"}
              </>
            )}
          </h1>
        </div>

        {activeTab === "employee" && isAdmin && (
          <div className="emp-header-search-wrap">
            <div className="emp-search-input-box">
              <Search size={16} className="emp-search-icon" />
              <input
                type="text"
                placeholder="Search employee by name, role, dept..."
                value={employeeSearchInput}
                onChange={(e) => {
                  setEmployeeSearchInput(e.target.value);
                  setEmployeeSearchQuery(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEmployeeSearchQuery(employeeSearchInput);
                  }
                }}
              />
              {employeeSearchInput && (
                <button
                  type="button"
                  className="emp-search-clear-btn"
                  onClick={() => {
                    setEmployeeSearchInput("");
                    setEmployeeSearchQuery("");
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {activeTab === "overview" && (
        <div className="overview-container">
          {/* Top Metric Tiles */}
          <div className="overview-tiles-grid">
            {/* Tile 1: Active Employees */}
            <div 
              className="overview-tile tile-active" 
              onClick={() => isAdmin && setActiveTab("employee")}
              style={!isAdmin ? { cursor: "default" } : {}}
            >
              <div className="tile-top">
                <div className="tile-icon-badge green">
                  <UserCheck size={22} />
                </div>
                <span className="tile-trend-pill live">
                  {activePct}% on duty
                </span>
              </div>
              <div className="tile-main">
                <span className="tile-label">Active Employees</span>
                <div className="tile-num-row">
                  <span className="tile-number">{activeEmployees}</span>
                </div>
              </div>
              <div className="tile-capacity-bar">
                <div className="tile-capacity-fill green" style={{ width: `${activePct}%` }}></div>
              </div>
              <div className="tile-footer-action">
                <span>{isAdmin ? "View online roster" : "Active on duty"}</span>
                {isAdmin && <ArrowRight size={14} className="arrow-icon" />}
              </div>
            </div>

            {/* Tile 2: Inactive Employees */}
            <div 
              className="overview-tile tile-inactive" 
              onClick={() => navigate('/employees?filter=inactive')}
              style={{ cursor: "pointer" }}
            >
              <div className="tile-top">
                <div className="tile-icon-badge red">
                  <UserX size={22} />
                </div>
                <span className={`tile-trend-pill ${inactiveEmployees > 0 ? "danger" : "neutral"}`}>
                  {inactiveEmployees} inactive
                </span>
              </div>
              <div className="tile-main">
                <span className="tile-label">Inactive Employees</span>
                <div className="tile-num-row">
                  <span className="tile-number">{inactiveEmployees}</span>
                </div>
              </div>
              <div className="tile-capacity-bar">
                <div className="tile-capacity-fill red" style={{ width: `${totalEmployees > 0 ? (inactiveEmployees / totalEmployees) * 100 : 0}%` }}></div>
              </div>
              <div className="tile-footer-action">
                <span>View inactive employees</span>
                <ArrowRight size={14} className="arrow-icon" />
              </div>
            </div>

            {/* Tile 3: On Leave Today */}
            <div className="overview-tile tile-leave" onClick={() => setActiveTab("inventory")}>
              <div className="tile-top">
                <div className="tile-icon-badge orange">
                  <Clock size={22} />
                </div>
                <span className="tile-trend-pill neutral">
                  88% coverage
                </span>
              </div>
              <div className="tile-main">
                <span className="tile-label">On Leave Today</span>
                <div className="tile-num-row">
                  <span className="tile-number">{leaveEmployees}</span>
                </div>
              </div>
              <div className="tile-capacity-bar">
                <div className="tile-capacity-fill orange" style={{ width: `${totalEmployees > 0 ? (leaveEmployees / totalEmployees) * 100 : 0}%` }}></div>
              </div>
              <div className="tile-footer-action">
                <span>Manage leave calendar</span>
                <ArrowRight size={14} className="arrow-icon" />
              </div>
            </div>

            {/* Tile 4: Pending Payment (Minimal & Super Clean) */}
            {(() => {
              const currentStats = pendingPaymentAgeing.dtfPartial;

              return (
                <div 
                  className="overview-tile tile-pending-payment" 
                  onClick={() => navigate('/pending-payments', { state: { leads: rawLeads } })}
                  style={{ cursor: "pointer" }}
                  title="Click to view all details on a new page"
                >
                  <div className="tile-top">
                    <div className="tile-icon-badge orange">
                      <CreditCard size={22} />
                    </div>
                    <span className="tile-trend-pill warning">
                      {currentStats.count} {currentStats.count === 1 ? "Order" : "Orders"}
                    </span>
                  </div>

                  <div className="tile-main">
                    <span className="tile-label">Pending Payment</span>
                    <div className="tile-num-row">
                      <span className="tile-number">
                        ₹{Math.round(currentStats.totalAmount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Minimal 6px Ageing Micro-Bar */}
                  <div className="tile-capacity-bar" style={{ display: "flex", gap: "2px" }}>
                    {currentStats.tiers.map((tier) => {
                      const pct = currentStats.count > 0 ? (tier.count / currentStats.count) * 100 : 0;
                      if (pct === 0) return null;
                      return (
                        <div
                          key={tier.label}
                          style={{
                            width: `${pct}%`,
                            backgroundColor: tier.color,
                            height: "100%",
                            borderRadius: "999px"
                          }}
                          title={`${tier.label}: ${tier.count} orders`}
                        />
                      );
                    })}
                  </div>

                  <div className="tile-footer-action">
                    <span>View all details</span>
                    <ArrowRight size={14} className="arrow-icon" />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Middle Row: Production & Sales Overview + Repeat Customer Rate + Weekly Order Velocity */}
          <div className="overview-mid-row">
            {/* Left: Sales Overview (Weekly / Monthly / Custom) */}
            <div className="ov-card stage-chart-card" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
              <div className="stage-chart-header">
                <div className="stage-chart-title-group">
                  <h3>
                    <Layers size={18} color="#6366f1" /> Sales Overview
                  </h3>
                  <div className="stage-chart-metrics-row">
                    <span className="stage-primary-kpi">
                      {chartViewMode === "volume"
                        ? `${salesOverviewData.totalUnits.toLocaleString('en-IN')} Units`
                        : salesOverviewData.formattedTotalRevenue}
                    </span>
                  </div>
                </div>

                <div className="chart-view-toggle">
                  <button 
                    className={`chart-toggle-btn ${chartViewMode === "volume" ? "active" : ""}`}
                    onClick={() => setChartViewMode("volume")}
                  >
                    Units
                  </button>
                  <button 
                    className={`chart-toggle-btn ${chartViewMode === "revenue" ? "active" : ""}`}
                    onClick={() => setChartViewMode("revenue")}
                  >
                    Revenue (₹)
                  </button>
                </div>
              </div>

              {/* Time Period Filter Chips Strip (Daily / Weekly / Monthly / Custom) */}
              <div className="sales-period-strip">
                <button 
                  className={`sales-period-chip ${salesTimeFrame === "daily" ? "active" : ""}`}
                  onClick={() => setSalesTimeFrame("daily")}
                >
                  <Clock size={13} /> Daily Sales
                </button>
                <button 
                  className={`sales-period-chip ${salesTimeFrame === "weekly" ? "active" : ""}`}
                  onClick={() => setSalesTimeFrame("weekly")}
                >
                  <Calendar size={13} /> Weekly Sales
                </button>
                <button 
                  className={`sales-period-chip ${salesTimeFrame === "monthly" ? "active" : ""}`}
                  onClick={() => setSalesTimeFrame("monthly")}
                >
                  <Calendar size={13} /> Monthly Sales
                </button>
                <button 
                  className={`sales-period-chip ${salesTimeFrame === "custom" ? "active" : ""}`}
                  onClick={() => setSalesTimeFrame("custom")}
                >
                  <Filter size={13} /> Custom Range
                </button>

                {salesTimeFrame === "custom" && (
                  <div className="custom-date-box">
                    <span>From:</span>
                    <input 
                      type="date" 
                      value={customStartDate} 
                      onChange={(e) => setCustomStartDate(e.target.value)} 
                      className="custom-date-input"
                    />
                    <span>To:</span>
                    <input 
                      type="date" 
                      value={customEndDate} 
                      onChange={(e) => setCustomEndDate(e.target.value)} 
                      className="custom-date-input"
                    />
                  </div>
                )}
              </div>

              {/* Interactive SVG Sales Line Graph */}
              <div 
                className="stage-chart-body" 
                onMouseLeave={() => setHoveredSalesPoint(null)}
                style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}
              >
                {salesOverviewData.isScrollable && (
                  <div className="chart-scroll-hint-bar">
                    <span className="scroll-hint-text">
                      ↔ Scroll or use arrows to view all {salesOverviewData.columns.length} days of custom range
                    </span>
                    <div className="chart-scroll-arrows">
                      <button 
                        type="button"
                        className="chart-scroll-arrow-btn"
                        onClick={() => chartScrollRef.current && (chartScrollRef.current.scrollLeft -= 260)}
                        title="Scroll left"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button 
                        type="button"
                        className="chart-scroll-arrow-btn"
                        onClick={() => chartScrollRef.current && (chartScrollRef.current.scrollLeft += 260)}
                        title="Scroll right"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                <div 
                  className="stage-chart-scroll-wrapper"
                  ref={chartScrollRef}
                  style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'auto', overflowY: 'hidden' }}
                >
                  <div 
                    className="stage-chart-canvas-container"
                    style={{ 
                      width: `${salesOverviewData.chartSvgWidth}px`,
                      minWidth: '100%',
                      position: 'relative',
                      height: '240px'
                    }}
                  >
                    <svg 
                      viewBox={`0 0 ${salesOverviewData.chartSvgWidth} 240`} 
                      className="stage-chart-svg"
                      style={{ width: `${salesOverviewData.chartSvgWidth}px`, minWidth: '100%', height: '240px' }}
                    >
                      <defs>
                        <linearGradient id="salesLineGradUnits" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="50%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                        <linearGradient id="salesLineGradRev" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="50%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>

                        <linearGradient id="salesAreaGradUnits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.28" />
                          <stop offset="50%" stopColor="#818cf8" stopOpacity="0.10" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="salesAreaGradRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                          <stop offset="50%" stopColor="#34d399" stopOpacity="0.10" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                        <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={chartViewMode === "volume" ? "#6366f1" : "#10b981"} floodOpacity="0.25" />
                        </filter>
                      </defs>

                      {/* Horizontal Gridlines */}
                      <line x1="16" y1="55" x2={salesOverviewData.chartSvgWidth - 16} y2="55" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                      <line x1="16" y1="100" x2={salesOverviewData.chartSvgWidth - 16} y2="100" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                      <line x1="16" y1="145" x2={salesOverviewData.chartSvgWidth - 16} y2="145" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                      <line x1="16" y1="190" x2={salesOverviewData.chartSvgWidth - 16} y2="190" stroke="#e2e8f0" strokeWidth="1.5" />

                      {/* Area Fill Under Line */}
                      {salesOverviewData.areaPath && (
                        <path
                          d={salesOverviewData.areaPath}
                          fill={chartViewMode === "volume" ? "url(#salesAreaGradUnits)" : "url(#salesAreaGradRev)"}
                          className="chart-area-path"
                        />
                      )}

                      {/* Smooth Curved Line Graph */}
                      {salesOverviewData.linePath && (
                        <path
                          d={salesOverviewData.linePath}
                          fill="none"
                          stroke={chartViewMode === "volume" ? "url(#salesLineGradUnits)" : "url(#salesLineGradRev)"}
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter="url(#lineGlow)"
                          className="chart-line-stroke"
                        />
                      )}

                      {/* Hover Vertical Guide Line */}
                      {hoveredSalesPoint && (
                        <line
                          x1={hoveredSalesPoint.x}
                          y1="40"
                          x2={hoveredSalesPoint.x}
                          y2="190"
                          stroke={chartViewMode === "volume" ? "#818cf8" : "#34d399"}
                          strokeDasharray="3 3"
                          strokeWidth="1.5"
                          opacity="0.8"
                        />
                      )}

                      {/* Data Points, Hit Areas and Labels */}
                      {salesOverviewData.columns.map((col, i) => {
                        const isHovered = hoveredSalesPoint?.label === col.label;
                        const showValueLabel = salesOverviewData.columns.length <= 7 || col.val > 0 || isHovered;
                        const sliceWidth = salesOverviewData.chartSvgWidth / salesOverviewData.columns.length;

                        return (
                          <g 
                            key={`col-${i}`}
                            onClick={() => handleOpenSalesBreakdown(col)}
                            style={{ cursor: 'pointer' }}
                            title={`Click to view orders for ${col.label}`}
                          >
                            {/* Full vertical slice hit area */}
                            <rect
                              x={col.x - sliceWidth / 2}
                              y="30"
                              width={sliceWidth}
                              height="210"
                              fill="transparent"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => {
                                setHoveredSalesPoint({
                                  x: col.x,
                                  y: col.y,
                                  label: col.label,
                                  units: col.units,
                                  revenue: col.fullRevenue,
                                  compactRev: col.totalLabelRevenue,
                                  orders: col.orders,
                                  colData: col
                                });
                              }}
                            />

                            {/* Node Aura when hovered */}
                            {isHovered && (
                              <circle
                                cx={col.x}
                                cy={col.y}
                                r="13"
                                fill={chartViewMode === "volume" ? "rgba(99, 102, 241, 0.22)" : "rgba(16, 185, 129, 0.22)"}
                              />
                            )}

                            {/* Node Dot on Line */}
                            <circle
                              cx={col.x}
                              cy={col.y}
                              r={isHovered ? "6" : col.val > 0 ? "4.5" : "3"}
                              fill="#ffffff"
                              stroke={
                                isHovered
                                  ? (chartViewMode === "volume" ? "#4f46e5" : "#059669")
                                  : col.val > 0
                                    ? (chartViewMode === "volume" ? "#6366f1" : "#10b981")
                                    : "#cbd5e1"
                              }
                              strokeWidth={isHovered ? "3" : col.val > 0 ? "2.5" : "1.5"}
                              style={{
                                transition: 'all 0.2s ease',
                                filter: isHovered ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : 'none'
                              }}
                            />

                            {/* Top Value Label */}
                            {showValueLabel && (
                              <text
                                x={col.x}
                                y={Math.max(22, col.y - 10)}
                                textAnchor="middle"
                                fontSize={salesOverviewData.columns.length > 15 ? "10" : "11"}
                                fontWeight={isHovered ? "700" : "600"}
                                fill={isHovered ? "#4f46e5" : col.val > 0 ? "#0f172a" : "#94a3b8"}
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                              >
                                {chartViewMode === "volume"
                                  ? `${col.units.toLocaleString('en-IN')}${salesOverviewData.columns.length > 12 ? " u" : " Units"}`
                                  : col.totalLabelRevenue}
                              </text>
                            )}

                            {/* Bottom Primary Short Label */}
                            <text
                              x={col.x}
                              y="212"
                              textAnchor="middle"
                              fontSize={salesOverviewData.columns.length > 20 ? "10" : "11"}
                              fontWeight={isHovered ? "700" : "600"}
                              fill={isHovered ? "#4f46e5" : "#64748b"}
                              style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                              {col.shortLabel}
                            </text>

                            {/* Bottom Sub-label */}
                            {col.subLabel && (
                              <text
                                x={col.x}
                                y="226"
                                textAnchor="middle"
                                fontSize="9"
                                fontWeight="500"
                                fill={isHovered ? "#6366f1" : "#94a3b8"}
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                              >
                                {col.subLabel}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* Floating Interactive Tooltip */}
                    {hoveredSalesPoint && (
                      <div 
                        className="chart-floating-tooltip"
                        style={{ 
                          left: `${hoveredSalesPoint.x}px`, 
                          top: hoveredSalesPoint.y < 105 ? `${hoveredSalesPoint.y + 16}px` : `${hoveredSalesPoint.y}px`,
                          transform: hoveredSalesPoint.y < 105 ? 'translate(-50%, 0)' : 'translate(-50%, -110%)'
                        }}
                        onClick={() => handleOpenSalesBreakdown(hoveredSalesPoint.colData)}
                        title="Click to view detailed orders list"
                      >
                        <div className="tooltip-header">
                          <span>{hoveredSalesPoint.label}</span>
                          <span style={{ color: chartViewMode === "volume" ? "#818cf8" : "#34d399", fontWeight: 700 }}>
                            {hoveredSalesPoint.orders} Orders
                          </span>
                        </div>
                        <div className="tooltip-row">
                          <span>Volume Sold:</span>
                          <strong>{hoveredSalesPoint.units.toLocaleString('en-IN')} Units</strong>
                        </div>
                        <div className="tooltip-row">
                          <span>Total Revenue (INR):</span>
                          <strong style={{ color: '#34d399' }}>{hoveredSalesPoint.revenue}</strong>
                        </div>
                        <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.15)', fontSize: '11px', color: '#a5b4fc', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>Click to view orders</span>
                          <ArrowUpRight size={12} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Summary Strip (Replaces old stage legend) */}
              <div className="sales-summary-strip">
                <div className="sales-summary-pill">
                  <span>Total Orders:</span>
                  <strong>{salesOverviewData.totalOrders} Orders</strong>
                </div>
                <div className="sales-summary-pill">
                  <span>Average / Period:</span>
                  <strong>
                    {chartViewMode === "volume"
                      ? `${salesOverviewData.avgUnits.toLocaleString('en-IN')} Units`
                      : salesOverviewData.formattedAvgRevenue}
                  </strong>
                </div>
              </div>
            </div>

            {/* Right: Repeat Customer Rate */}
            <div className="ov-card repeat-rate-card">
              <div className="card-header-clean">
                <div>
                  <h3>Repeat Customer Rate</h3>
                </div>
                <button 
                  className="clean-icon-btn" 
                  title="Live calculated from leads" 
                  onClick={() => setShowRepeatDetailsModal(true)}
                >
                  <HelpCircle size={17} />
                </button>
              </div>

              <div className="repeat-gauge-body">
                <svg viewBox="0 0 200 115" className="repeat-gauge-svg">
                  <defs>
                    <linearGradient id="gaugeActiveGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>

                  {Array.from({ length: 40 }).map((_, i) => {
                    const totalTicks = 40;
                    const activeTicks = Math.round(totalTicks * (repeatCustomerStats.rate / 100));
                    const angle = Math.PI - (i / (totalTicks - 1)) * Math.PI;
                    const radius = 76;
                    const cx = 100;
                    const cy = 96;

                    const x1 = cx + (radius - 10) * Math.cos(angle);
                    const y1 = cy - (radius - 10) * Math.sin(angle);
                    const x2 = cx + (radius + 8) * Math.cos(angle);
                    const y2 = cy - (radius + 8) * Math.sin(angle);

                    const isActive = i < activeTicks;
                    const isTargetMark = i === Math.round(totalTicks * (repeatCustomerStats.target / 100));

                    return (
                      <g key={i}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={isActive ? "url(#gaugeActiveGrad)" : "#e2e8f0"}
                          strokeWidth={isTargetMark ? "4" : "3"}
                          strokeLinecap="round"
                          className={`repeat-tick ${isActive ? "repeat-tick-active" : ""}`}
                        />
                        {isTargetMark && (
                          <circle
                            cx={cx + (radius + 16) * Math.cos(angle)}
                            cy={cy - (radius + 16) * Math.sin(angle)}
                            r="2.5"
                            fill="#f59e0b"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                <div className="repeat-gauge-center">
                  <span className="repeat-percentage">{repeatCustomerStats.rate}%</span>
                  <span className="repeat-target-status">
                    <Sparkles size={13} />
                    {repeatCustomerStats.rate >= repeatCustomerStats.target
                      ? `Target exceeded (+${repeatCustomerStats.rate - repeatCustomerStats.target}%)`
                      : `Target ${repeatCustomerStats.target}%`}
                  </span>
                  <span className="repeat-sync-source">
                    <Radio size={11} color="#10b981" />
                    {repeatCustomerStats.repeatCount} / {repeatCustomerStats.totalCount} orders
                  </span>
                </div>
              </div>

              <div className="repeat-footer-stats">
                <div className="repeat-stat-col">
                  <span className="repeat-stat-label">Repeat</span>
                  <span className="repeat-stat-val" style={{ color: "#059669" }}>
                    {repeatCustomerStats.repeatCount} ({repeatCustomerStats.rate}%)
                  </span>
                </div>
                <div className="repeat-stat-col">
                  <span className="repeat-stat-label">First-Time</span>
                  <span className="repeat-stat-val" style={{ color: "#64748b" }}>
                    {repeatCustomerStats.firstTimeCount} ({100 - repeatCustomerStats.rate}%)
                  </span>
                </div>
                <button 
                  className="repeat-details-btn"
                  onClick={() => setShowRepeatDetailsModal(true)}
                >
                  Details <ArrowUpRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Sub-Mid Row: Order Ageing & Weekly Activity */}
          <div className="overview-sub-mid-row">
            {/* Widget 1: Order Ageing Donut Charts (Completed & Pending) */}
            <div className="ov-card ageing-donut-card">
              <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
                <defs>
                  <linearGradient id="ageingGreenGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="ageingYellowGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <linearGradient id="ageingRedGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="ageing-header-top">
                <div className="ageing-title-group">
                  <h3>
                    <Timer size={18} color="#f59e0b" /> Order Ageing
                  </h3>
                </div>
              </div>

              {/* Two Separate Compact Graphs: Completed and Pending */}
              <div className="ageing-two-graphs-grid">
                {renderAgeingSubgraph("completed", "Completed", orderAgeingStats.completed, hoveredCompletedSegment, setHoveredCompletedSegment)}
                {renderAgeingSubgraph("pending", "Pending", orderAgeingStats.pending, hoveredPendingSegment, setHoveredPendingSegment)}
              </div>
            </div>

            {/* Widget 2: Weekly Order Velocity */}
            <div className="ov-card velocity-card">
                <div className="card-header-clean">
                  <div>
                    <h3>Weekly Activity</h3>
                  </div>
                  <div className="velocity-header-tags">
                    <span className="peak-day-badge">
                      <Flame size={12} color="#f97316" /> Peak: Tue
                    </span>
                  </div>
                </div>

                <div className="velocity-chart-wrapper" onMouseLeave={() => setHoveredDay(null)}>
                  <svg viewBox="0 0 300 130" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                    <defs>
                      <linearGradient id="stdBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                      <linearGradient id="urgentBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                      <linearGradient id="peakGlowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#4f46e5" />
                      </linearGradient>
                    </defs>

                    <line x1="10" y1="105" x2="290" y2="105" stroke="#f1f5f9" strokeWidth="1" />

                    {(() => {
                      const maxTotal = 20;
                      const colW = 20;
                      const spacing = (300 - (7 * colW)) / 8;

                      return weeklyVelocityData.map((item, i) => {
                        const x = spacing + i * (colW + spacing);
                        const totalH = (item.total / maxTotal) * 85;
                        const urgentH = (item.urgent / maxTotal) * 85;
                        const stdH = totalH - urgentH;

                        const yBase = 105;
                        const yStd = yBase - stdH;
                        const yUrgent = yStd - urgentH;

                        return (
                          <g 
                            key={item.day} 
                            id={`velocity-bar-${item.day.toLowerCase()}`}
                            data-testid={`velocity-bar-${item.day.toLowerCase()}`}
                            className="velocity-bar-group"
                            onMouseEnter={() => setHoveredDay(item)}
                          >
                            {/* Full-height hit area for smooth hover response */}
                            <rect
                              x={x - 6}
                              y="0"
                              width={colW + 12}
                              height="130"
                              fill="transparent"
                              style={{ cursor: "pointer" }}
                            />
                            {hoveredDay && hoveredDay.day === item.day && (
                              <rect
                                x={x - 4}
                                y={item.isPeak ? yUrgent - 24 : yUrgent - 6}
                                width={colW + 8}
                                height={yBase - (item.isPeak ? yUrgent - 24 : yUrgent - 6) + 4}
                                rx="8"
                                fill="rgba(59, 130, 246, 0.08)"
                              />
                            )}
                            <rect
                              x={x}
                              y={yStd}
                              width={colW}
                              height={stdH}
                              rx="5"
                              fill={item.isPeak ? "url(#peakGlowGrad)" : "url(#stdBarGrad)"}
                              className="velocity-bar-rect"
                            />
                            <rect
                              x={x}
                              y={yUrgent}
                              width={colW}
                              height={urgentH}
                              rx="5"
                              fill="url(#urgentBarGrad)"
                              className="velocity-bar-rect"
                            />

                            {item.isPeak && (
                              <g>
                                <rect
                                  x={x - 8}
                                  y={yUrgent - 20}
                                  width={colW + 16}
                                  height="16"
                                  rx="8"
                                  fill="#0f172a"
                                />
                                <text
                                  x={x + colW / 2}
                                  y={yUrgent - 8}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fontWeight="700"
                                  fill="#ffffff"
                                >
                                  {item.total}
                                </text>
                              </g>
                            )}

                            <text
                              x={x + colW / 2}
                              y="122"
                              textAnchor="middle"
                              fontSize="12"
                              fontWeight={item.isPeak ? "700" : "500"}
                              fill={item.isPeak ? "#2563eb" : "#64748b"}
                            >
                              {item.day}
                            </text>
                          </g>
                        );
                      });
                    })()}
                  </svg>

                  {hoveredDay && (
                    <div className="velocity-floating-tooltip">
                      <span className="vel-tip-day">{hoveredDay.day}</span>
                      <span className="vel-tip-sep">•</span>
                      <span className="vel-tip-total">{hoveredDay.total} orders</span>
                      <span className="vel-tip-divider">|</span>
                      <span className="vel-tip-stat std">
                        <span className="vel-tip-dot std"></span>
                        {hoveredDay.standard} Std
                      </span>
                      <span className="vel-tip-stat urg">
                        <span className="vel-tip-dot urg"></span>
                        {hoveredDay.urgent} Urg
                      </span>
                    </div>
                  )}
                </div>

                <div className="velocity-legend">
                  <div className="velocity-legend-items">
                    <span className="vel-legend-item">
                      <span className="vel-dot standard"></span> Standard
                    </span>
                    <span className="vel-legend-item">
                      <span className="vel-dot urgent"></span> Urgent
                    </span>
                  </div>
                  <span className="vel-meta-stat">
                    Avg: 3.2 Days
                  </span>
                </div>
              </div>
            </div>

          {/* Pure Graphical Single Inventory Chart */}
          <div className="overview-inventory-section">
            <div className="ov-card inv-pure-graph-card">
              {/* Ultra-Clean Header: minimal text */}
              <div className="inv-pure-header">
                <div className="inv-pure-title-group">
                  <div className="inv-pure-badge">
                    <Boxes size={18} />
                  </div>
                  <h3>Inventory Stock</h3>
                  <span className="inv-pure-total-pill">
                    {invGraphMetric === "units"
                      ? `${inventoryStats.totalUnits.toLocaleString()} Units`
                      : `₹${Math.round(inventoryStats.totalValuation).toLocaleString('en-IN')}`}
                  </span>
                </div>

                <div className="inv-pure-controls">
                  <div className="inv-pure-toggle">
                    <button
                      className={invGraphGroupBy === "category" ? "active" : ""}
                      onClick={() => setInvGraphGroupBy("category")}
                    >
                      Category
                    </button>
                    <button
                      className={invGraphGroupBy === "stockroom" ? "active" : ""}
                      onClick={() => setInvGraphGroupBy("stockroom")}
                    >
                      Stockroom
                    </button>
                  </div>

                  <div className="inv-pure-toggle">
                    <button
                      className={invGraphMetric === "units" ? "active" : ""}
                      onClick={() => setInvGraphMetric("units")}
                    >
                      Units
                    </button>
                    <button
                      className={invGraphMetric === "value" ? "active" : ""}
                      onClick={() => setInvGraphMetric("value")}
                    >
                      ₹
                    </button>
                  </div>

                  <button
                    className="inv-pure-link"
                    onClick={() => setActiveTab("inventory")}
                    title="Open Inventory Management"
                  >
                    <span>Manage</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* The Single Graphical Chart: Stacked Bar Chart */}
              <div className="inv-pure-chart-wrapper" onMouseLeave={() => setHoveredStockItem(null)}>
                <svg viewBox="0 0 740 220" className="inv-pure-svg">
                  <defs>
                    <linearGradient id="invPureInGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="invPureLowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient id="invPureOutGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>

                  {/* Minimal subtle grid lines */}
                  <line x1="30" y1="40" x2="710" y2="40" stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="30" y1="105" x2="710" y2="105" stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="30" y1="170" x2="710" y2="170" stroke="#e2e8f0" strokeWidth="1.2" />

                  {(() => {
                    const items =
                      invGraphGroupBy === "category"
                        ? inventoryStats.categoryList.slice(0, 6)
                        : inventoryStats.stockroomList.slice(0, 5);

                    if (!items || items.length === 0) return null;

                    const maxVal = Math.max(
                      ...items.map((d) => (invGraphMetric === "units" ? d.units : d.valuation)),
                      1
                    );

                    const totalCols = items.length;
                    const availableW = 660;
                    const colW = Math.max(38, Math.min(64, Math.floor(availableW / totalCols - 24)));
                    const gap = (availableW - totalCols * colW) / (totalCols + 1);

                    return items.map((item, i) => {
                      const x = 40 + gap + i * (colW + gap);
                      const totalVal = invGraphMetric === "units" ? item.units : item.valuation;
                      const maxH = 120;
                      const totalH = Math.max(14, (totalVal / maxVal) * maxH);

                      const totalC = (item.inStock || 0) + (item.lowStock || 0) + (item.outOfStock || 0) || 1;
                      const inRatio = (item.inStock || 0) / totalC;
                      const lowRatio = (item.lowStock || 0) / totalC;
                      const outRatio = Math.max(0, 1 - inRatio - lowRatio);

                      const hIn = totalH * inRatio;
                      const hLow = totalH * lowRatio;
                      const hOut = totalH * outRatio;

                      const yBase = 170;
                      const yIn = yBase - hIn;
                      const yLow = yIn - hLow;
                      const yOut = yLow - hOut;

                      const isHovered = hoveredStockItem && hoveredStockItem.name === item.name;

                      return (
                        <g
                          key={item.name + i}
                          className="inv-pure-col-group"
                          onClick={() => setActiveTab("inventory")}
                          onMouseEnter={() =>
                            setHoveredStockItem({
                              name: item.name,
                              units: item.units,
                              valuation: item.valuation,
                              inStock: item.inStock || 0,
                              lowStock: item.lowStock || 0,
                              outOfStock: item.outOfStock || 0,
                              x: x + colW / 2,
                              y: yOut,
                            })
                          }
                          style={{ cursor: "pointer" }}
                        >
                          {/* Full height hover background */}
                          <rect
                            x={x - 6}
                            y="15"
                            width={colW + 12}
                            height="180"
                            fill={isHovered ? "rgba(2, 132, 199, 0.06)" : "transparent"}
                            rx="8"
                          />

                          {/* Base / In-Stock Segment */}
                          {hIn > 0 && (
                            <rect
                              x={x}
                              y={yIn}
                              width={colW}
                              height={hIn}
                              rx={hLow === 0 && hOut === 0 ? "6" : "0"}
                              fill="url(#invPureInGrad)"
                              className="inv-pure-rect in"
                            />
                          )}

                          {/* Low-Stock Segment */}
                          {hLow > 0 && (
                            <rect
                              x={x}
                              y={yLow}
                              width={colW}
                              height={hLow}
                              rx={hOut === 0 ? "6" : "0"}
                              fill="url(#invPureLowGrad)"
                              className="inv-pure-rect low"
                            />
                          )}

                          {/* Out-of-Stock Segment */}
                          {hOut > 0 && (
                            <rect
                              x={x}
                              y={yOut}
                              width={colW}
                              height={hOut}
                              rx="6"
                              fill="url(#invPureOutGrad)"
                              className="inv-pure-rect out"
                            />
                          )}

                          {/* Top Value label */}
                          <text
                            x={x + colW / 2}
                            y={yOut - 7}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="700"
                            fill="#0f172a"
                            className="inv-pure-top-val"
                          >
                            {invGraphMetric === "units"
                              ? item.units.toLocaleString()
                              : `₹${Math.round(item.valuation).toLocaleString('en-IN')}`}
                          </text>

                          {/* Category / Stockroom Name */}
                          <text
                            x={x + colW / 2}
                            y="192"
                            textAnchor="middle"
                            fontSize="11.5"
                            fontWeight="600"
                            fill={isHovered ? "#0284c7" : "#64748b"}
                            className="inv-pure-label"
                          >
                            {item.name.length > 13 ? `${item.name.slice(0, 11)}...` : item.name}
                          </text>
                        </g>
                      );
                    });
                  })()}
                </svg>

                {/* Minimal Hover Tooltip */}
                {hoveredStockItem && (
                  <div
                    className="inv-pure-tooltip"
                    style={{
                      left: `${(hoveredStockItem.x / 740) * 100}%`,
                      top: `${Math.max(10, (hoveredStockItem.y / 220) * 100 - 18)}%`,
                    }}
                  >
                    <div className="inv-pure-tt-title">{hoveredStockItem.name}</div>
                    <div className="inv-pure-tt-row">
                      <span>Total:</span>
                      <strong>
                        {invGraphMetric === "units"
                          ? `${hoveredStockItem.units.toLocaleString()} Units`
                          : `₹${Math.round(hoveredStockItem.valuation).toLocaleString('en-IN')}`}
                      </strong>
                    </div>
                    <div className="inv-pure-tt-tags">
                      <span className="tt-tag green">{hoveredStockItem.inStock} In Stock</span>
                      {hoveredStockItem.lowStock > 0 && (
                        <span className="tt-tag amber">{hoveredStockItem.lowStock} Low</span>
                      )}
                      {hoveredStockItem.outOfStock > 0 && (
                        <span className="tt-tag red">{hoveredStockItem.outOfStock} Out</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Ultra-Minimal Bottom Legend: Just 3 dots and labels */}
              <div className="inv-pure-legend">
                <span className="inv-pure-leg-item">
                  <span className="leg-dot green"></span> In Stock ({inventoryStats.optimalPct}%)
                </span>
                <span className="inv-pure-leg-item">
                  <span className="leg-dot amber"></span> Low Stock ({inventoryStats.lowStockPct}%)
                </span>
                <span className="inv-pure-leg-item">
                  <span className="leg-dot red"></span> Out of Stock ({inventoryStats.outOfStockPct}%)
                </span>
              </div>

            </div>
          </div>

          {/* Repeat Customer Details Modal */}
          {showRepeatDetailsModal && (
            <div className="repeat-modal-backdrop" onClick={() => setShowRepeatDetailsModal(false)}>
              <div className="repeat-modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="repeat-modal-header">
                  <h2>Repeat Customer Analytics</h2>
                  <button className="clean-icon-btn" onClick={() => setShowRepeatDetailsModal(false)}>
                    <X size={20} />
                  </button>
                </div>

                <div className="repeat-modal-body">
                  <div className="repeat-modal-metrics">
                    <div className="repeat-modal-metric-card">
                      <h4 style={{ color: "#059669" }}>{repeatCustomerStats.rate}%</h4>
                      <p>Repeat Rate</p>
                    </div>
                    <div className="repeat-modal-metric-card">
                      <h4>{repeatCustomerStats.repeatCount}</h4>
                      <p>Repeat Orders</p>
                    </div>
                    <div className="repeat-modal-metric-card">
                      <h4 style={{ color: "#2563eb" }}>{repeatCustomerStats.totalCount}</h4>
                      <p>Total Leads</p>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px 0", color: "#0f172a" }}>
                      Recent Repeat Customer Accounts
                    </h4>
                    <div className="repeat-leads-table-wrapper">
                      <table className="repeat-leads-table">
                        <thead>
                          <tr>
                            <th>Client / Account</th>
                            <th>Stage</th>
                            <th>Order Value</th>
                            <th>Repeat Order</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repeatCustomerStats.repeatLeads.length === 0 ? (
                            <tr>
                              <td colSpan="4" style={{ textAlign: "center", color: "#64748b", padding: "24px 16px" }}>
                                No repeat orders logged yet. Mark &quot;Repeated Order: Yes&quot; in the Create Lead form to track repeat accounts here.
                              </td>
                            </tr>
                          ) : (
                            repeatCustomerStats.repeatLeads.slice(0, 5).map((lead, idx) => (
                              <tr key={idx}>
                                <td><strong>{lead.clientName || lead.companyName || lead.name || `Client #${idx + 1}`}</strong></td>
                                <td style={{ textTransform: "capitalize" }}>{lead.orderStage || "Sample"}</td>
                                <td>₹{lead.netAmount || lead.totalAmount || "1,200.00"}</td>
                                <td><span className="repeat-tag yes">Yes</span></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="repeat-modal-footer">
                  <button className="btn-secondary" onClick={() => setShowRepeatDetailsModal(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "case" && (
        <div className="dashboard-content">
          <OrderManagementDashboard />
        </div>
      )}

      {activeTab === "employee" && isAdmin && (
        <div className="dashboard-content">
          <div className="emp-grid-toolbar">
            <span className="emp-results-count">
              Showing <strong>{filteredEmployeeCards.length}</strong> of {normalizedEmployees.length} employees
              {employeeSearchQuery && (
                <span className="emp-filter-tag">
                  matching &ldquo;{employeeSearchQuery}&rdquo;
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeSearchInput("");
                      setEmployeeSearchQuery("");
                    }}
                    title="Clear filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </span>
          </div>

          {filteredEmployeeCards.length === 0 ? (
            <div className="emp-no-results">
              <Users size={36} color="#94a3b8" />
              <h3>No employees found</h3>
              <p>No employee matches &ldquo;{employeeSearchQuery}&rdquo;. Try another search term.</p>
              <button
                type="button"
                className="btn-clear-filter"
                onClick={() => {
                  setEmployeeSearchInput("");
                  setEmployeeSearchQuery("");
                }}
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="employee-cards-grid">
              {filteredEmployeeCards.map((emp) => (
                <div key={emp.id} className="employee-card square-card">
                  <div className="emp-card-top">
                    <div className="emp-avatar" style={{ backgroundColor: emp.avatarBg }}>
                      {emp.initials}
                      <span className={`emp-status ${emp.status}`}></span>
                    </div>
                    <h3 className="emp-name" title={emp.name}>{emp.name}</h3>
                    <p className="emp-role" title={emp.role}>{emp.role}</p>
                    <div className="emp-badges-row">
                      <span className="emp-badge">{emp.department}</span>
                      {emp.isInactive && (
                        <span className="emp-badge inactive-badge">Inactive</span>
                      )}
                    </div>
                  </div>

                  <div className="emp-dummy-summary">
                    <div className="dummy-metric-pill" title="Total Leave Taken (Dummy Info)">
                      <span className="metric-label">Leaves:</span>
                      <span className="metric-val">{emp.dummy?.totalLeavesTaken ?? 0}d</span>
                    </div>
                    <div className="dummy-metric-pill" title="Salary Deduction (Dummy Info)">
                      <span className="metric-label">Ded:</span>
                      <span className={`metric-val ${emp.dummy?.salaryDeduction > 0 ? "ded-active" : "ded-zero"}`}>
                        {emp.dummy?.salaryDeduction > 0 ? `₹${emp.dummy.salaryDeduction.toLocaleString()}` : "₹0"}
                      </span>
                    </div>
                  </div>

                  <div className="emp-actions">
                    <button
                      type="button"
                      className="btn-profile"
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Side Panel Overlay */}
      {activeTab === "employee" && isAdmin && (
        <div
          className={`side-panel-overlay ${selectedEmployee ? "open" : ""}`}
          onClick={() => setSelectedEmployee(null)}
        ></div>
      )}

      {/* Side Panel */}
      {activeTab === "employee" && isAdmin && (
        <div className={`side-panel ${selectedEmployee ? "open" : ""}`}>
          {selectedEmployee && (
            <div className="side-panel-content">
              <button
                className="close-panel-btn"
                onClick={() => setSelectedEmployee(null)}
                title="Close"
              >
                <X size={20} />
              </button>

              <div className="sp-header">
                <div
                  className="sp-avatar"
                  style={{ backgroundColor: selectedEmployee.avatarBg }}
                >
                  {selectedEmployee.initials}
                </div>
                <h2>{selectedEmployee.name}</h2>
                <p>{selectedEmployee.role}</p>

                <div className="sp-meta">
                  <span>
                    <Users size={14} /> {selectedEmployee.department}
                  </span>
                  <span className="sp-online-status">
                    <span className={`sp-dot ${selectedEmployee.status}`}></span>
                    {selectedEmployee.status === "online"
                      ? "Active"
                      : selectedEmployee.status === "inactive"
                      ? "Inactive"
                      : "Away"}
                  </span>
                </div>
              </div>

              {/* Attendance & Leaves Section */}
              <div className="sp-detail-card">
                <div className="sp-detail-card-header">
                  <div className="sp-card-icon leave-icon">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h4>Attendance & Leaves</h4>
                    <span className="dummy-tag">Dummy Info</span>
                  </div>
                </div>
                <div className="sp-main-metric">
                  <span className="sp-metric-number">
                    {selectedEmployee.dummy?.totalLeavesTaken ?? 3}
                  </span>
                  <span className="sp-metric-unit">Days Taken</span>
                </div>
                <div className="sp-leave-quota-bar">
                  <div className="quota-header">
                    <span>Leave Quota Used</span>
                    <span>
                      {selectedEmployee.dummy?.totalLeavesTaken ?? 3} /{" "}
                      {selectedEmployee.dummy?.annualLeaveAllowance ?? 18} Days
                    </span>
                  </div>
                  <div className="quota-bar-bg">
                    <div
                      className="quota-bar-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          (((selectedEmployee.dummy?.totalLeavesTaken ?? 3) /
                            (selectedEmployee.dummy?.annualLeaveAllowance ?? 18)) *
                            100)
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="sp-mini-stats-grid">
                  <div className="sp-mini-stat">
                    <span className="stat-label">Sick Leaves</span>
                    <span className="stat-val">
                      {selectedEmployee.dummy?.sickLeaves ?? 1} Days
                    </span>
                  </div>
                  <div className="sp-mini-stat">
                    <span className="stat-label">Casual Leaves</span>
                    <span className="stat-val">
                      {selectedEmployee.dummy?.casualLeaves ?? 2} Days
                    </span>
                  </div>
                  <div className="sp-mini-stat">
                    <span className="stat-label">Remaining</span>
                    <span className="stat-val highlight">
                      {selectedEmployee.dummy?.remainingLeaves ?? 15} Days
                    </span>
                  </div>
                </div>
              </div>

              {/* Salary & Payroll Deduction Section */}
              <div className="sp-detail-card">
                <div className="sp-detail-card-header">
                  <div className="sp-card-icon salary-icon">
                    <IndianRupee size={18} />
                  </div>
                  <div>
                    <h4>Salary & Deductions</h4>
                    <span className="dummy-tag">Dummy Info</span>
                  </div>
                </div>
                <div className="sp-main-metric">
                  <span
                    className={`sp-metric-number ${
                      (selectedEmployee.dummy?.salaryDeduction ?? 0) > 0
                        ? "deduction-alert"
                        : "deduction-clean"
                    }`}
                  >
                    ₹
                    {(
                      selectedEmployee.dummy?.salaryDeduction ?? 0
                    ).toLocaleString()}
                  </span>
                  <span className="sp-metric-unit">Total Deduction</span>
                </div>
                <p className="sp-deduction-reason">
                  <strong>Status: </strong>
                  {selectedEmployee.dummy?.deductionReason ||
                    "Within paid leave allowance"}
                </p>
                <div className="sp-mini-stats-grid">
                  <div className="sp-mini-stat">
                    <span className="stat-label">Base Salary</span>
                    <span className="stat-val">
                      ₹
                      {(
                        selectedEmployee.dummy?.baseSalary ?? 40000
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="sp-mini-stat">
                    <span className="stat-label">Net Payable</span>
                    <span className="stat-val highlight">
                      ₹
                      {(
                        selectedEmployee.dummy?.netSalary ?? 40000
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Meta Section */}
              <div className="sp-info-list">
                {selectedEmployee.employeeId && (
                  <div className="sp-info-row">
                    <span className="info-key">Employee ID:</span>
                    <span className="info-val">{selectedEmployee.employeeId}</span>
                  </div>
                )}
                {selectedEmployee.email && (
                  <div className="sp-info-row">
                    <span className="info-key">Email:</span>
                    <span className="info-val">{selectedEmployee.email}</span>
                  </div>
                )}
                {selectedEmployee.shiftStartTime && selectedEmployee.shiftEndTime && (
                  <div className="sp-info-row">
                    <span className="info-key">Shift Hours:</span>
                    <span className="info-val">
                      {selectedEmployee.shiftStartTime} - {selectedEmployee.shiftEndTime}
                    </span>
                  </div>
                )}
              </div>

              <div className="sp-actions">
                <button
                  type="button"
                  className="btn-profile-close"
                  onClick={() => setSelectedEmployee(null)}
                >
                  Close Profile
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(activeTab === "inventory" || activeTab === "leave") && (
        <div className="dashboard-content">
          {isStock ? (
            <StockRoom isEmbedded={true} />
          ) : (
            <InventoryManagement />
          )}
        </div>
      )}

      {activeTab === "delivery" && (
        <div className="dashboard-content">
          <DeliveryDashboard leads={rawLeads} />
        </div>
      )}

      {activeTab === "compliance" && (
        <div className="dashboard-content">
          <ComplianceDashboard />
        </div>
      )}
    </div>
  );
}

export default Dashboard;
