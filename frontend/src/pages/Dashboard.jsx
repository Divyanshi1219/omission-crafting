import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { 
  LayoutGrid, 
  FileText, 
  Users, 
  Calendar, 
  UserCheck, 
  Clock, 
  Calendar as CalendarIcon, 
  ChevronDown, 
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
  Filter
} from "lucide-react";
import "./EmployeeCards.css";
import "./OverviewDashboard.css";
import "./StockRoom/StockRoom.css";
import OrderManagementDashboard from "./OrderManagementDashboard";
import InventoryManagement from "./InventoryManagement";
import StockRoom from "./StockRoom/StockRoom";
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
  const isAdmin = currentUser?.id === "admin";
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
  const isOnlyOrderManagement = isSales || isProduction || isLeadManager;
  const isOnlyInventory = isStock;
  const [activeTab, setActiveTab] = useState(
    isOnlyInventory ? "inventory" : isOnlyOrderManagement ? "case" : "overview"
  );
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    if (isOnlyInventory) {
      setActiveTab("inventory");
    } else if (isOnlyOrderManagement) {
      setActiveTab("case");
    } else {
      setActiveTab("overview");
    }
  }, [currentUser?.id, isOnlyInventory, isOnlyOrderManagement]);

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

  // Live Leads and Production Data from Backend
  const [rawLeads, setRawLeads] = useState([]);
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
  const [salesTimeFrame, setSalesTimeFrame] = useState("monthly"); // "weekly" | "monthly" | "custom"
  const [customStartDate, setCustomStartDate] = useState("2026-10-01");
  const [customEndDate, setCustomEndDate] = useState("2026-11-30");
  const [hoveredSalesPoint, setHoveredSalesPoint] = useState(null);
  const [selectedStageFilter, setSelectedStageFilter] = useState("all"); // "all" | "sample" | "partial" | "complete"
  const [hoveredStack, setHoveredStack] = useState(null); // tooltip data for main chart
  const [hoveredDay, setHoveredDay] = useState(null); // tooltip data for velocity chart
  const [showRepeatDetailsModal, setShowRepeatDetailsModal] = useState(false);
  const [activeDonutHover, setActiveDonutHover] = useState({ onboarding: null, offboarding: null });

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

  // Fetch leads and check backend health on mount
  useEffect(() => {
    api.get("/api/health")
      .then((res) => console.log("Backend connected:", res.data))
      .catch((err) => console.warn("Backend health check failed:", err.message));

    api.get("/api/leads")
      .then((res) => {
        if (res.data?.data) {
          setRawLeads(res.data.data);
          setLeadsLoaded(true);
        }
      })
      .catch((err) => {
        console.warn("Leads fetch failed, using realistic baseline:", err.message);
      });

    api.get("/api/employees")
      .then((res) => {
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setEmployeesList(res.data.data);
        }
      })
      .catch((err) => {
        console.warn("Employees fetch failed, using default:", err.message);
      });
  }, []);

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

  // Clean, live aggregated sales data from actual database orders
  const salesOverviewData = useMemo(() => {
    const hasLiveLeads = isAdmin ? leads.length > 0 : leadsLoaded;
    const leadsList = hasLiveLeads ? leads : [];

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
        date: isNaN(d) ? new Date('2026-10-15') : d
      };
    };

    const cleanLeads = leadsList.map(sanitizeLead);
    const xCenters = [85, 225, 365, 505];

    let periodBuckets = [];

    if (salesTimeFrame === "weekly") {
      periodBuckets = [
        { label: "Oct W2 (11-17)", shortLabel: "Oct W2", start: new Date("2026-10-11T00:00:00"), end: new Date("2026-10-17T23:59:59") },
        { label: "Oct W3 (18-24)", shortLabel: "Oct W3", start: new Date("2026-10-18T00:00:00"), end: new Date("2026-10-24T23:59:59") },
        { label: "Oct W4 (25-31)", shortLabel: "Oct W4", start: new Date("2026-10-25T00:00:00"), end: new Date("2026-10-31T23:59:59") },
        { label: "Nov W1 (01-07)", shortLabel: "Nov W1", start: new Date("2026-11-01T00:00:00"), end: new Date("2026-11-07T23:59:59") },
      ];
      periodBuckets.forEach(b => {
        const inBucket = cleanLeads.filter(x => x.date >= b.start && x.date <= b.end);
        b.units = inBucket.reduce((s, x) => s + x.units, 0);
        b.revenue = inBucket.reduce((s, x) => s + x.revenue, 0);
        b.orders = inBucket.length;
      });
    } else if (salesTimeFrame === "custom") {
      const s = new Date(customStartDate || "2026-10-01");
      const e = new Date((customEndDate || "2026-11-30") + "T23:59:59");
      const inRange = cleanLeads.filter(x => x.date >= s && x.date <= e);

      const timeSpan = Math.max(e.getTime() - s.getTime(), 86400000 * 4);
      const step = timeSpan / 4;
      for (let i = 0; i < 4; i++) {
        const bStart = new Date(s.getTime() + i * step);
        const bEnd = new Date(s.getTime() + (i + 1) * step);
        const label = `${bStart.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${bEnd.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`;
        const shortLabel = `${bStart.toLocaleDateString('default', { month: 'numeric', day: 'numeric' })}`;
        const inB = inRange.filter(x => x.date >= bStart && (i === 3 ? x.date <= bEnd : x.date < bEnd));
        periodBuckets.push({
          label,
          shortLabel,
          units: inB.reduce((acc, x) => acc + x.units, 0),
          revenue: inB.reduce((acc, x) => acc + x.revenue, 0),
          orders: inB.length
        });
      }
    } else {
      // Monthly default (Sep, Oct, Nov, Dec)
      const months = [
        { label: "Sep 2026", shortLabel: "Sep", monthIdx: 8, year: 2026 },
        { label: "Oct 2026", shortLabel: "Oct", monthIdx: 9, year: 2026 },
        { label: "Nov 2026", shortLabel: "Nov", monthIdx: 10, year: 2026 },
        { label: "Dec 2026", shortLabel: "Dec", monthIdx: 11, year: 2026 },
      ];
      periodBuckets = months.map(m => {
        const inMonth = cleanLeads.filter(x => x.date.getMonth() === m.monthIdx && x.date.getFullYear() === m.year);
        return {
          label: m.label,
          shortLabel: m.shortLabel,
          units: inMonth.reduce((s, x) => s + x.units, 0),
          revenue: inMonth.reduce((s, x) => s + x.revenue, 0),
          orders: inMonth.length
        };
      });
    }

    const totalUnits = periodBuckets.reduce((s, b) => s + b.units, 0);
    const totalRevenue = periodBuckets.reduce((s, b) => s + b.revenue, 0);
    const totalOrders = periodBuckets.reduce((s, b) => s + b.orders, 0);

    const maxVal = Math.max(
      ...periodBuckets.map(b => (chartViewMode === "volume" ? b.units : b.revenue)),
      1
    );

    const columns = periodBuckets.map((b, i) => {
      const val = chartViewMode === "volume" ? b.units : b.revenue;
      const h = val > 0 ? Math.max(14, Math.round((val / maxVal) * 125)) : 10;
      return {
        ...b,
        xCenter: xCenters[i],
        val,
        h,
        totalLabelUnits: `${b.units.toLocaleString('en-IN')} Units`,
        totalLabelRevenue: formatINR(b.revenue, true),
        fullRevenue: formatINR(b.revenue, false)
      };
    });

    return {
      columns,
      totalUnits,
      totalRevenue,
      formattedTotalRevenue: formatINR(totalRevenue, false),
      totalOrders,
      avgUnits: periodBuckets.length ? Math.round(totalUnits / periodBuckets.length) : 0,
      avgRevenue: periodBuckets.length ? Math.round(totalRevenue / periodBuckets.length) : 0,
      formattedAvgRevenue: formatINR(periodBuckets.length ? Math.round(totalRevenue / periodBuckets.length) : 0, false),
      peakPeriod: columns.reduce((p, c) => (c.val > (p?.val || 0) ? c : p), columns[0])
    };
  }, [leads, leadsLoaded, salesTimeFrame, customStartDate, customEndDate, chartViewMode]);

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

  // Real MongoDB Workforce Normalization
  const normalizedEmployees = useMemo(() => {
    return employeesList.map((emp, idx) => {
      const displayName = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || 'Staff Member';
      const initials = emp.initials || displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'EM';
      const role = emp.jobTitle || emp.role || 'Team Member';
      const department = emp.department || 'Operations';
      const avatarColors = ['#ffedd5', '#e2e8f0', '#d1fae5', '#e0e7ff', '#fef08a'];
      const avatarBg = emp.avatarBg || avatarColors[idx % avatarColors.length];
      const status = (emp.accountStatus || 'Active').toLowerCase() === 'active' ? 'online' : 'away';

      return {
        ...emp,
        id: emp._id || emp.id || idx,
        name: displayName,
        initials,
        role,
        department,
        avatarBg,
        status,
        openTasks: emp.openTasks ?? (leads.filter(l => (l.employeeName || '').toLowerCase().includes(displayName.toLowerCase())).length),
        completedTasks: emp.completedTasks ?? 12,
        workload: emp.workload ?? 65,
      };
    });
  }, [employeesList, leads]);

  // Workforce stats from real MongoDB employees
  const totalEmployees = normalizedEmployees.length;
  const activeEmployees = normalizedEmployees.filter(e => e.status === "online").length;
  const leaveEmployees = normalizedEmployees.filter(e => e.status === "away").length;
  const activePct = totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 0;

  // Real Database Employee Lifecycle: Onboarding Breakdown
  const onboardingStats = useMemo(() => {
    const total = employeesList.length;
    const training = employeesList.filter(e => {
      const s = (e.accountStatus || '').toLowerCase();
      const t = (e.employeeType || '').toLowerCase();
      return s === 'probation' || s === 'training' || t === 'intern';
    });
    const verification = employeesList.filter(e => {
      return !training.includes(e) && (!e.email || !e.email.includes('@'));
    });
    const completed = employeesList.filter(e => !training.includes(e) && !verification.includes(e));

    const thisMonthCount = employeesList.filter(e => {
      if (!e.createdAt && !e.hireDate) return false;
      const d = new Date(e.createdAt || e.hireDate);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return {
      total,
      training: { count: training.length, pct: total > 0 ? Math.round((training.length / total) * 100) : 0 },
      verification: { count: verification.length, pct: total > 0 ? Math.round((verification.length / total) * 100) : 0 },
      completed: { count: completed.length, pct: total > 0 ? Math.round((completed.length / total) * 100) : 0 },
      thisMonthCount,
    };
  }, [employeesList]);

  // Real Database Employee Lifecycle: Offboarding Breakdown
  const offboardingStats = useMemo(() => {
    const offboarded = employeesList.filter(e => {
      const s = (e.accountStatus || '').toLowerCase();
      return s === 'inactive' || s === 'suspended' || s === 'offboarding' || s === 'terminated';
    });
    const total = offboarded.length;
    const handover = offboarded.filter(e => (e.authorizationInfo || '').toLowerCase().includes('handover'));
    const clearance = offboarded.filter(e => (e.authorizationInfo || '').toLowerCase().includes('clearance'));
    const deprovisioned = offboarded.filter(e => !handover.includes(e) && !clearance.includes(e));

    return {
      total,
      handover: { count: handover.length, pct: total > 0 ? Math.round((handover.length / total) * 100) : 0 },
      clearance: { count: clearance.length, pct: total > 0 ? Math.round((clearance.length / total) * 100) : 0 },
      deprovisioned: { count: deprovisioned.length, pct: total > 0 ? Math.round((deprovisioned.length / total) * 100) : 0 },
    };
  }, [employeesList]);

  return (
    <div className="dashboard-page">
      {!isOnlyOrderManagement && !isOnlyInventory && (
        <div className="dashboard-tabs">
          <button className={`tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
            <LayoutGrid size={18} /> Overview
          </button>
          <button className={`tab ${activeTab === "case" ? "active" : ""}`} onClick={() => setActiveTab("case")}>
            <FileText size={18} /> Order Management
          </button>
          {isAdmin && (
            <button className={`tab ${activeTab === "employee" ? "active" : ""}`} onClick={() => setActiveTab("employee")}>
              <Users size={18} /> Employee Management
            </button>
          )}
          <button className={`tab ${activeTab === "inventory" || activeTab === "leave" ? "active" : ""}`} onClick={() => setActiveTab("inventory")}>
            <Package size={18} /> Inventory Management
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
              </>
            )}
          </h1>
        </div>

        <div className="date-picker">
          <CalendarIcon size={16} />
          <span>Monday, October 5, 2026</span>
          <ChevronDown size={16} />
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="overview-container">
          {/* Top Metric Tiles */}
          <div className="overview-tiles-grid">
            {/* Tile 1: Total Workforce */}
            <div 
              className="overview-tile tile-workforce" 
              onClick={() => isAdmin && setActiveTab("employee")}
              style={!isAdmin ? { cursor: "default" } : {}}
            >
              <div className="tile-top">
                <div className="tile-icon-badge blue">
                  <Users size={22} />
                </div>
                <span className="tile-trend-pill positive">
                  <TrendingUp size={12} /> +2
                </span>
              </div>
              <div className="tile-main">
                <span className="tile-label">Total Workforce</span>
                <div className="tile-num-row">
                  <span className="tile-number">{totalEmployees}</span>
                </div>
              </div>
              <div className="tile-capacity-bar">
                <div className="tile-capacity-fill blue" style={{ width: "100%" }}></div>
              </div>
              <div className="tile-footer-action">
                <span>{isAdmin ? "View all employees" : "Workforce overview"}</span>
                {isAdmin && <ArrowRight size={14} className="arrow-icon" />}
              </div>
            </div>

            {/* Tile 2: Active on Duty */}
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
                <div className="tile-capacity-fill orange" style={{ width: `${(leaveEmployees / totalEmployees) * 100}%` }}></div>
              </div>
              <div className="tile-footer-action">
                <span>Manage leave calendar</span>
                <ArrowRight size={14} className="arrow-icon" />
              </div>
            </div>
          </div>

          {/* Middle Row: Production & Sales Overview + Repeat Customer Rate + Weekly Order Velocity */}
          <div className="overview-mid-row">
            {/* Left: Sales Overview (Weekly / Monthly / Custom) */}
            <div className="ov-card stage-chart-card">
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
                    <span className="stage-trend-pill">
                      <TrendingUp size={13} /> +18.4%
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

              {/* Time Period Filter Chips Strip (Weekly / Monthly / Custom) */}
              <div className="sales-period-strip">
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

              {/* Interactive SVG Sales Chart */}
              <div className="stage-chart-body" onMouseLeave={() => setHoveredSalesPoint(null)}>
                <svg viewBox="0 0 600 240" className="stage-chart-svg">
                  <defs>
                    <linearGradient id="salesUnitsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                    <linearGradient id="salesRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="salesFlowGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={chartViewMode === "volume" ? "#6366f1" : "#10b981"} stopOpacity="0.22" />
                      <stop offset="100%" stopColor={chartViewMode === "volume" ? "#6366f1" : "#10b981"} stopOpacity="0.08" />
                    </linearGradient>
                  </defs>

                  <line x1="40" y1="60" x2="560" y2="60" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="40" y1="125" x2="560" y2="125" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="40" y1="190" x2="560" y2="190" stroke="#e2e8f0" strokeWidth="1.5" />

                  {/* Flow ribbons between columns */}
                  {salesOverviewData.columns.map((col, i) => {
                    if (i === salesOverviewData.columns.length - 1) return null;
                    const nextCol = salesOverviewData.columns[i + 1];
                    const colWidth = 74;
                    const xA = col.xCenter + colWidth / 2;
                    const yA = 190 - col.h;
                    const xB = nextCol.xCenter - colWidth / 2;
                    const yB = 190 - nextCol.h;

                    const ribbon = `M ${xA} ${yA}
                                    C ${xA + 40} ${yA}, ${xB - 40} ${yB}, ${xB} ${yB}
                                    L ${xB} 190
                                    L ${xA} 190 Z`;
                    return (
                      <path
                        key={`ribbon-${i}`}
                        d={ribbon}
                        fill="url(#salesFlowGrad)"
                        className="chart-flow-path"
                        opacity={0.7}
                      />
                    );
                  })}

                  {/* Columns */}
                  {salesOverviewData.columns.map((col, i) => {
                    const colWidth = 74;
                    const xLeft = col.xCenter - colWidth / 2;
                    const yTop = 190 - col.h;
                    const isHovered = hoveredSalesPoint?.label === col.label;

                    return (
                      <g key={`col-${i}`}>
                        <rect
                          x={xLeft}
                          y={yTop}
                          width={colWidth}
                          height={col.h}
                          rx="10"
                          fill={chartViewMode === "volume" ? "url(#salesUnitsGrad)" : "url(#salesRevGrad)"}
                          className="chart-bar-rect"
                          style={{
                            cursor: 'pointer',
                            filter: isHovered ? 'brightness(1.15) drop-shadow(0 4px 10px rgba(0,0,0,0.15))' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={() => {
                            setHoveredSalesPoint({
                              x: col.xCenter,
                              y: yTop,
                              label: col.label,
                              units: col.units,
                              revenue: col.fullRevenue,
                              compactRev: col.totalLabelRevenue,
                              orders: col.orders
                            });
                          }}
                        />

                        {/* Top metric label */}
                        <text
                          x={col.xCenter}
                          y={yTop - 12}
                          textAnchor="middle"
                          fontSize="12"
                          fontWeight="700"
                          fill="#0f172a"
                        >
                          {chartViewMode === "volume" ? `${col.units.toLocaleString('en-IN')} Units` : col.totalLabelRevenue}
                        </text>

                        {/* Bottom period label */}
                        <text
                          x={col.xCenter}
                          y="214"
                          textAnchor="middle"
                          fontSize="12"
                          fontWeight="600"
                          fill="#64748b"
                        >
                          {col.shortLabel}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {hoveredSalesPoint && (
                  <div 
                    className="chart-floating-tooltip"
                    style={{ left: `${(hoveredSalesPoint.x / 600) * 100}%`, top: `${(hoveredSalesPoint.y / 240) * 100}%` }}
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
                  </div>
                )}
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
                <div className="sales-summary-pill">
                  <span>Peak Period:</span>
                  <strong style={{ color: '#4f46e5' }}>
                    {salesOverviewData.peakPeriod ? `${salesOverviewData.peakPeriod.shortLabel} (${chartViewMode === "volume" ? `${salesOverviewData.peakPeriod.units.toLocaleString('en-IN')} pcs` : salesOverviewData.peakPeriod.totalLabelRevenue})` : 'N/A'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Right Side: Repeat Customer Rate + Weekly Order Velocity */}
            <div className="overview-right-column">
              {/* Widget 1: Repeat Customer Rate */}
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

          {/* Bottom Row: Workforce Lifecycle (Onboarding & Offboarding) */}
          <div className="overview-bottom-row">
            {/* Onboarding Overview Card */}
            <div className="ov-card" style={{ cursor: 'pointer' }}>
              <div className="card-header-clean" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3>Onboarding</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="stage-trend-pill positive" style={{ fontSize: "11px" }}>
                    {onboardingStats.thisMonthCount > 0 ? `+${onboardingStats.thisMonthCount} this month` : `${onboardingStats.total} Staff`}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/employees'); }}
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Click to view employees data table"
                  >
                    View <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>

              <div className="lifecycle-card-body" onClick={() => navigate('/employees')}>
                <div className="donut-wrapper" style={{ cursor: 'pointer' }} onMouseLeave={() => setActiveDonutHover(prev => ({ ...prev, onboarding: null }))}>
                  <svg viewBox="0 0 100 100" className="donut-svg" style={{ overflow: 'visible' }}>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" pointerEvents="none" />
                    {(() => {
                      const total = onboardingStats.total || 1;
                      const trainingFrac = onboardingStats.training.count / total;
                      const verificationFrac = onboardingStats.verification.count / total;
                      const completedFrac = onboardingStats.completed.count / total;

                      const polarToCartesian = (cx, cy, r, angleRad) => ({
                        x: cx + r * Math.cos(angleRad),
                        y: cy + r * Math.sin(angleRad),
                      });

                      const describeArc = (cx, cy, r, startAngleRad, endAngleRad) => {
                        const start = polarToCartesian(cx, cy, r, startAngleRad);
                        const end = polarToCartesian(cx, cy, r, endAngleRad);
                        const angleDiff = endAngleRad - startAngleRad;
                        const largeArcFlag = angleDiff <= Math.PI ? 0 : 1;
                        return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
                      };

                      const a0 = -Math.PI / 2;
                      const a1 = a0 + trainingFrac * 2 * Math.PI;
                      const a2 = a1 + verificationFrac * 2 * Math.PI;
                      const a3 = a0 + 2 * Math.PI - 0.0001;

                      const trainingPath = onboardingStats.training.count > 0 ? describeArc(50, 50, 40, a0, a1) : null;
                      const verificationPath = onboardingStats.verification.count > 0 ? describeArc(50, 50, 40, a1, a2) : null;
                      const completedPath = onboardingStats.completed.count > 0 ? describeArc(50, 50, 40, a2, a3) : null;

                      return (
                        <>
                          {trainingPath && (
                            <path
                              d={trainingPath}
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth={activeDonutHover.onboarding?.label === "Training" ? 15 : 12}
                              pointerEvents="stroke"
                              style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                              onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, onboarding: { label: "Training", val: String(onboardingStats.training.count) } }))}
                              onClick={(e) => { e.stopPropagation(); navigate('/employees?filter=training'); }}
                            />
                          )}
                          {verificationPath && (
                            <path
                              d={verificationPath}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth={activeDonutHover.onboarding?.label === "Verification" ? 15 : 12}
                              pointerEvents="stroke"
                              style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                              onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, onboarding: { label: "Verification", val: String(onboardingStats.verification.count) } }))}
                              onClick={(e) => { e.stopPropagation(); navigate('/employees?filter=verification'); }}
                            />
                          )}
                          {completedPath && (
                            <path
                              d={completedPath}
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth={activeDonutHover.onboarding?.label === "Completed" ? 15 : 12}
                              pointerEvents="stroke"
                              style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                              onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, onboarding: { label: "Completed", val: String(onboardingStats.completed.count) } }))}
                              onClick={(e) => { e.stopPropagation(); navigate('/employees?filter=completed'); }}
                            />
                          )}
                        </>
                      );
                    })()}
                  </svg>
                  <div className="donut-center-info" style={{ pointerEvents: 'none' }}>
                    <span className="donut-center-label">
                      {activeDonutHover.onboarding?.label || "TOTAL"}
                    </span>
                    <span className="donut-center-val">
                      {activeDonutHover.onboarding?.val || onboardingStats.total}
                    </span>
                  </div>
                </div>

                <div className="lifecycle-breakdown-list">
                  <div className="lifecycle-item" onClick={(e) => { e.stopPropagation(); navigate('/employees?filter=training'); }} style={{ cursor: 'pointer' }}>
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#3b82f6" }}></span>
                        Training
                      </span>
                      <span className="lifecycle-item-val">{onboardingStats.training.count} ({onboardingStats.training.pct}%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: `${onboardingStats.training.pct}%`, background: "#3b82f6" }}></div>
                    </div>
                  </div>

                  <div className="lifecycle-item" onClick={(e) => { e.stopPropagation(); navigate('/employees?filter=verification'); }} style={{ cursor: 'pointer' }}>
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#10b981" }}></span>
                        Verification
                      </span>
                      <span className="lifecycle-item-val">{onboardingStats.verification.count} ({onboardingStats.verification.pct}%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: `${onboardingStats.verification.pct}%`, background: "#10b981" }}></div>
                    </div>
                  </div>

                  <div className="lifecycle-item" onClick={(e) => { e.stopPropagation(); navigate('/employees?filter=completed'); }} style={{ cursor: 'pointer' }}>
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#f59e0b" }}></span>
                        Completed
                      </span>
                      <span className="lifecycle-item-val">{onboardingStats.completed.count} ({onboardingStats.completed.pct}%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: `${onboardingStats.completed.pct}%`, background: "#f59e0b" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Offboarding Overview Card */}
            <div className="ov-card" style={{ cursor: 'pointer' }}>
              <div className="card-header-clean" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3>Offboarding</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="tile-trend-pill neutral" style={{ fontSize: "11px" }}>
                    {offboardingStats.total === 0 ? "0 Pipeline (100% Retained)" : `${offboardingStats.total} Pipeline`}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/employees?filter=offboarding'); }}
                    style={{
                      background: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Click to view employees data table"
                  >
                    View <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>

              <div className="lifecycle-card-body" onClick={() => navigate('/employees?filter=offboarding')}>
                <div className="donut-wrapper" style={{ cursor: 'pointer' }} onMouseLeave={() => setActiveDonutHover(prev => ({ ...prev, offboarding: null }))}>
                  <svg viewBox="0 0 100 100" className="donut-svg" style={{ overflow: 'visible' }}>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" pointerEvents="none" />
                    {offboardingStats.total === 0 ? (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeDasharray="4 6"
                        opacity="0.4"
                        pointerEvents="none"
                      />
                    ) : (
                      (() => {
                        const total = offboardingStats.total || 1;
                        const handoverFrac = offboardingStats.handover.count / total;
                        const clearanceFrac = offboardingStats.clearance.count / total;
                        const deprovisionedFrac = offboardingStats.deprovisioned.count / total;

                        const polarToCartesian = (cx, cy, r, angleRad) => ({
                          x: cx + r * Math.cos(angleRad),
                          y: cy + r * Math.sin(angleRad),
                        });

                        const describeArc = (cx, cy, r, startAngleRad, endAngleRad) => {
                          const start = polarToCartesian(cx, cy, r, startAngleRad);
                          const end = polarToCartesian(cx, cy, r, endAngleRad);
                          const angleDiff = endAngleRad - startAngleRad;
                          const largeArcFlag = angleDiff <= Math.PI ? 0 : 1;
                          return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
                        };

                        const a0 = -Math.PI / 2;
                        const a1 = a0 + handoverFrac * 2 * Math.PI;
                        const a2 = a1 + clearanceFrac * 2 * Math.PI;
                        const a3 = a0 + 2 * Math.PI - 0.0001;

                        const handoverPath = offboardingStats.handover.count > 0 ? describeArc(50, 50, 40, a0, a1) : null;
                        const clearancePath = offboardingStats.clearance.count > 0 ? describeArc(50, 50, 40, a1, a2) : null;
                        const deprovisionedPath = offboardingStats.deprovisioned.count > 0 ? describeArc(50, 50, 40, a2, a3) : null;

                        return (
                          <>
                            {handoverPath && (
                              <path
                                d={handoverPath}
                                fill="none"
                                stroke="#f87171"
                                strokeWidth={activeDonutHover.offboarding?.label === "Handover" ? 15 : 12}
                                pointerEvents="stroke"
                                style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                                onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, offboarding: { label: "Handover", val: String(offboardingStats.handover.count) } }))}
                                onClick={(e) => { e.stopPropagation(); navigate('/employees?filter=handover'); }}
                              />
                            )}
                            {clearancePath && (
                              <path
                                d={clearancePath}
                                fill="none"
                                stroke="#8b78f6"
                                strokeWidth={activeDonutHover.offboarding?.label === "Clearance" ? 15 : 12}
                                pointerEvents="stroke"
                                style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                                onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, offboarding: { label: "Clearance", val: String(offboardingStats.clearance.count) } }))}
                                onClick={(e) => { e.stopPropagation(); navigate('/employees?filter=clearance'); }}
                              />
                            )}
                            {deprovisionedPath && (
                              <path
                                d={deprovisionedPath}
                                fill="none"
                                stroke="#64748b"
                                strokeWidth={activeDonutHover.offboarding?.label === "Deprovisioned" ? 15 : 12}
                                pointerEvents="stroke"
                                style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                                onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, offboarding: { label: "Deprovisioned", val: String(offboardingStats.deprovisioned.count) } }))}
                                onClick={(e) => { e.stopPropagation(); navigate('/employees?filter=deprovisioned'); }}
                              />
                            )}
                          </>
                        );
                      })()
                    )}
                  </svg>
                  <div className="donut-center-info" style={{ pointerEvents: 'none' }}>
                    <span className="donut-center-label">
                      {activeDonutHover.offboarding?.label || (offboardingStats.total === 0 ? "RETAINED" : "TOTAL")}
                    </span>
                    <span className="donut-center-val">
                      {activeDonutHover.offboarding?.val || (offboardingStats.total === 0 ? "100%" : offboardingStats.total)}
                    </span>
                  </div>
                </div>

                <div className="lifecycle-breakdown-list">
                  <div className="lifecycle-item" onClick={(e) => { e.stopPropagation(); navigate('/employees?filter=handover'); }} style={{ cursor: 'pointer' }}>
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#f87171" }}></span>
                        Handover
                      </span>
                      <span className="lifecycle-item-val">{offboardingStats.handover.count} ({offboardingStats.handover.pct}%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: `${offboardingStats.handover.pct}%`, background: "#f87171" }}></div>
                    </div>
                  </div>

                  <div className="lifecycle-item" onClick={(e) => { e.stopPropagation(); navigate('/employees?filter=clearance'); }} style={{ cursor: 'pointer' }}>
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#8b78f6" }}></span>
                        Clearance
                      </span>
                      <span className="lifecycle-item-val">{offboardingStats.clearance.count} ({offboardingStats.clearance.pct}%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: `${offboardingStats.clearance.pct}%`, background: "#8b78f6" }}></div>
                    </div>
                  </div>

                  <div className="lifecycle-item" onClick={(e) => { e.stopPropagation(); navigate('/employees?filter=deprovisioned'); }} style={{ cursor: 'pointer' }}>
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#64748b" }}></span>
                        Deprovisioned
                      </span>
                      <span className="lifecycle-item-val">{offboardingStats.deprovisioned.count} ({offboardingStats.deprovisioned.pct}%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: `${offboardingStats.deprovisioned.pct}%`, background: "#64748b" }}></div>
                    </div>
                  </div>
                </div>
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
          <div className="employee-cards-grid">
            {normalizedEmployees.map((emp) => (
              <div key={emp.id} className="employee-card">
                <div className="emp-card-header">
                  <div className="emp-avatar" style={{ backgroundColor: emp.avatarBg }}>
                    {emp.initials}
                    <span className={`emp-status ${emp.status}`}></span>
                  </div>
                  <h3 className="emp-name">{emp.name}</h3>
                  <p className="emp-role">{emp.role}</p>
                  <span className="emp-badge">{emp.department}</span>
                </div>
                <div className="emp-stats">
                  <div className="emp-stat">
                    <h4>{emp.openTasks}</h4>
                    <p>Open leads</p>
                  </div>
                  <div className="emp-stat">
                    <h4>{emp.completedTasks}</h4>
                    <p>Completed</p>
                  </div>
                </div>
                <div className="emp-workload">
                  <div className="workload-header">
                    <span>Workload</span>
                    <span>{emp.workload}%</span>
                  </div>
                  <div className="workload-bar-bg">
                    <div
                      className="workload-bar-fill"
                      style={{
                        width: `${emp.workload}%`,
                        backgroundColor: getWorkloadColor(emp.workload),
                      }}
                    ></div>
                  </div>
                </div>
                <div className="emp-actions">
                  <button className="btn-msg">Message</button>
                  <button className="btn-profile" onClick={() => setSelectedEmployee(emp)}>
                    Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
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
                    <MapPin size={14} /> Lisbon
                  </span>
                  <span>
                    <Users size={14} /> {selectedEmployee.department}
                  </span>
                  <span className="sp-online-status">
                    <span className={`sp-dot ${selectedEmployee.status}`}></span>
                    {selectedEmployee.status === "online" ? "Online" : "Away"}
                  </span>
                </div>
              </div>

              <div className="sp-stats-row">
                <div className="sp-stat-box">
                  <h3>{selectedEmployee.openTasks}</h3>
                  <p>Open</p>
                </div>
                <div className="sp-stat-box">
                  <h3>{selectedEmployee.completedTasks}</h3>
                  <p>Done</p>
                </div>
                <div className="sp-stat-box">
                  <h3>{selectedEmployee.workload}%</h3>
                  <p>Load</p>
                </div>
              </div>

              <div className="sp-tasks-section">
                <h4>Assigned tasks</h4>
                <div className="sp-task-list">
                  <div className="sp-task-item">
                    <span className="task-dot in-progress"></span>
                    <span className="task-name">Design login & sign-up screens</span>
                    <span className="task-status">In progress</span>
                  </div>
                  <div className="sp-task-item">
                    <span className="task-dot done"></span>
                    <span className="task-name">Monorepo cleanup</span>
                    <span className="task-status">Done</span>
                  </div>
                  <div className="sp-task-item">
                    <span className="task-dot done"></span>
                    <span className="task-name">Dashboard analytics widgets</span>
                    <span className="task-status">Done</span>
                  </div>
                </div>
              </div>

              <div className="sp-actions">
                <button className="btn-msg">Message</button>
                <button className="btn-assign">+ Assign task</button>
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
    </div>
  );
}

export default Dashboard;
