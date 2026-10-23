import { useState, useEffect, useMemo } from "react";
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
  DollarSign,
  BarChart3,
  Plus
} from "lucide-react";
import "./EmployeeCards.css";
import "./OverviewDashboard.css";
import OrderManagementDashboard from "./OrderManagementDashboard";
import InventoryManagement from "./InventoryManagement";
import { useAuth } from "../context/AuthContext";

const employees = [
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
      if (activeTab !== "inventory") setActiveTab("inventory");
    } else if (isOnlyOrderManagement) {
      if (activeTab !== "case") setActiveTab("case");
    } else if (!isAdmin && activeTab === "employee") {
      setActiveTab("overview");
    }
  }, [isAdmin, isOnlyOrderManagement, isOnlyInventory, activeTab]);

  // Live Leads and Production Data from Backend
  const [leads, setLeads] = useState([]);

  // UI Interactive States
  const [chartViewMode, setChartViewMode] = useState("volume"); // "volume" | "revenue"
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
          setLeads(res.data.data);
        }
      })
      .catch((err) => {
        console.warn("Leads fetch failed, using realistic baseline:", err.message);
      });
  }, []);

  // Compute live repeat customer rate linked to lead form field `repeatedOrder`
  const repeatCustomerStats = useMemo(() => {
    const hasLiveLeads = leads.length > 0;
    const totalCount = hasLiveLeads ? leads.length : 25;
    
    // Count leads where repeatedOrder === "Yes" (matching create lead form radio value)
    const repeatLeads = hasLiveLeads
      ? leads.filter(l => (l.repeatedOrder || "").toLowerCase().trim() === "yes")
      : [
          { clientName: "Acme Apparel", orderStage: "complete", netAmount: 1850, repeatedOrder: "Yes", createdAt: "2026-10-02" },
          { clientName: "Vortex Athletics", orderStage: "partial", netAmount: 2400, repeatedOrder: "Yes", createdAt: "2026-10-04" },
          { clientName: "Summit Brand Studio", orderStage: "sample", netAmount: 650, repeatedOrder: "Yes", createdAt: "2026-10-05" },
          { clientName: "Urban Stitch Co", orderStage: "complete", netAmount: 3100, repeatedOrder: "Yes", createdAt: "2026-09-28" },
          { clientName: "Prime Uniforms", orderStage: "partial", netAmount: 1450, repeatedOrder: "Yes", createdAt: "2026-09-24" },
        ];
    
    const repeatCount = hasLiveLeads ? repeatLeads.length : 17;
    const firstTimeCount = totalCount - repeatCount;
    const rate = Math.round((repeatCount / totalCount) * 100);
    const target = 80;

    return {
      totalCount,
      repeatCount,
      firstTimeCount,
      rate,
      target,
      isLive: hasLiveLeads,
      repeatLeads
    };
  }, [leads]);

  // Compute live stage counts for Sample, Partial, Complete
  const stageStats = useMemo(() => {
    const hasLiveLeads = leads.length > 0;
    
    const sampleLeads = leads.filter(l => (l.orderStage || "sample").toLowerCase().trim() === "sample");
    const partialLeads = leads.filter(l => (l.orderStage || "").toLowerCase().trim() === "partial");
    const completeLeads = leads.filter(l => (l.orderStage || "").toLowerCase().trim() === "complete");

    const sampleCount = hasLiveLeads ? (sampleLeads.length || 1) : 28;
    const partialCount = hasLiveLeads ? (partialLeads.length || 1) : 46;
    const completeCount = hasLiveLeads ? (completeLeads.length || 1) : 41;
    const total = sampleCount + partialCount + completeCount;

    return {
      sample: { count: sampleCount, pct: Math.round((sampleCount / total) * 100) },
      partial: { count: partialCount, pct: Math.round((partialCount / total) * 100) },
      complete: { count: completeCount, pct: 100 - Math.round((sampleCount / total) * 100) - Math.round((partialCount / total) * 100) },
      total
    };
  }, [leads]);

  // Monthly dataset for the Sample / Partial / Complete Production & Orders Overview
  const monthlyStageData = useMemo(() => {
    return [
      {
        month: "Oct",
        totalLabelUnits: "340 Units",
        totalLabelRevenue: "$ 2,988.20",
        stages: {
          sample: { count: 85, revenue: "$ 740.00", pct: 25, h: 26, color: "#6366f1" },
          partial: { count: 125, revenue: "$ 1,120.00", pct: 37, h: 36, color: "#f59e0b" },
          complete: { count: 130, revenue: "$ 1,128.20", pct: 38, h: 38, color: "#10b981" },
        }
      },
      {
        month: "Nov",
        totalLabelUnits: "280 Units",
        totalLabelRevenue: "$ 1,765.09",
        stages: {
          sample: { count: 60, revenue: "$ 480.00", pct: 21, h: 20, color: "#6366f1" },
          partial: { count: 110, revenue: "$ 690.00", pct: 39, h: 30, color: "#f59e0b" },
          complete: { count: 110, revenue: "$ 595.09", pct: 40, h: 30, color: "#10b981" },
        }
      },
      {
        month: "Dec",
        totalLabelUnits: "460 Units",
        totalLabelRevenue: "$ 4,504.22",
        stages: {
          sample: { count: 110, revenue: "$ 1,120.00", pct: 24, h: 34, color: "#6366f1" },
          partial: { count: 180, revenue: "$ 1,780.00", pct: 39, h: 48, color: "#f59e0b" },
          complete: { count: 170, revenue: "$ 1,604.22", pct: 37, h: 48, color: "#10b981" },
        }
      }
    ];
  }, []);

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

  // Workforce stats from employees array
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === "online").length;
  const leaveEmployees = employees.filter(e => e.status === "away").length;
  const activePct = Math.round((activeEmployees / totalEmployees) * 100);

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
            {/* Left: Sales & Stage Overview (Sample, Partial, Complete) */}
            <div className="ov-card stage-chart-card">
              <div className="stage-chart-header">
                <div className="stage-chart-title-group">
                  <h3>
                    <Layers size={18} color="#6366f1" /> Production & Sales Overview
                  </h3>
                  <div className="stage-chart-metrics-row">
                    <span className="stage-primary-kpi">
                      {chartViewMode === "volume" ? "1,080 Units" : "$ 9,257.51"}
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
                    Revenue ($)
                  </button>
                </div>
              </div>

              {/* Stage Quick Filter Chips */}
              <div className="stage-chips-strip">
                <button 
                  className={`stage-chip ${selectedStageFilter === "all" ? "active" : ""}`}
                  onClick={() => setSelectedStageFilter("all")}
                >
                  All Stages <span className="stage-chip-count">{stageStats.total}</span>
                </button>
                <button 
                  className={`stage-chip chip-sample ${selectedStageFilter === "sample" ? "active" : ""}`}
                  onClick={() => setSelectedStageFilter(selectedStageFilter === "sample" ? "all" : "sample")}
                >
                  <span className="stage-chip-dot sample"></span>
                  Sample <span className="stage-chip-count">{stageStats.sample.count} ({stageStats.sample.pct}%)</span>
                </button>
                <button 
                  className={`stage-chip chip-partial ${selectedStageFilter === "partial" ? "active" : ""}`}
                  onClick={() => setSelectedStageFilter(selectedStageFilter === "partial" ? "all" : "partial")}
                >
                  <span className="stage-chip-dot partial"></span>
                  Partial <span className="stage-chip-count">{stageStats.partial.count} ({stageStats.partial.pct}%)</span>
                </button>
                <button 
                  className={`stage-chip chip-complete ${selectedStageFilter === "complete" ? "active" : ""}`}
                  onClick={() => setSelectedStageFilter(selectedStageFilter === "complete" ? "all" : "complete")}
                >
                  <span className="stage-chip-dot complete"></span>
                  Complete <span className="stage-chip-count">{stageStats.complete.count} ({stageStats.complete.pct}%)</span>
                </button>
              </div>

              {/* Interactive SVG Stacked Stage Chart */}
              <div className="stage-chart-body" onMouseLeave={() => setHoveredStack(null)}>
                <svg viewBox="0 0 600 240" className="stage-chart-svg">
                  <defs>
                    <linearGradient id="sampleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                    <linearGradient id="partialGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <linearGradient id="completeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>

                    <linearGradient id="flowSample" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.14" />
                    </linearGradient>
                    <linearGradient id="flowPartial" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.12" />
                    </linearGradient>
                    <linearGradient id="flowComplete" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.14" />
                    </linearGradient>
                  </defs>

                  <line x1="40" y1="50" x2="560" y2="50" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="40" y1="120" x2="560" y2="120" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="40" y1="190" x2="560" y2="190" stroke="#f1f5f9" strokeWidth="1" />

                  {(() => {
                    const colWidth = 84;
                    const gap = 5;
                    const xCenters = [110, 300, 490];
                    const elements = [];

                    const columnsData = monthlyStageData.map((d, i) => {
                      let currentY = 190;
                      const xLeft = xCenters[i] - colWidth / 2;

                      const keys = ["complete", "partial", "sample"];
                      const stacks = keys.map((k) => {
                        const stageInfo = d.stages[k];
                        const h = stageInfo.h;
                        const yTop = currentY - h;
                        currentY = yTop - gap;

                        const isDimmed = selectedStageFilter !== "all" && selectedStageFilter !== k;

                        return {
                          key: k,
                          xLeft,
                          yTop,
                          h,
                          color: stageInfo.color,
                          gradient: k === "sample" ? "url(#sampleGrad)" : k === "partial" ? "url(#partialGrad)" : "url(#completeGrad)",
                          info: stageInfo,
                          month: d.month,
                          totalUnits: d.totalLabelUnits,
                          totalRevenue: d.totalLabelRevenue,
                          isDimmed
                        };
                      });

                      return { xCenter: xCenters[i], stacks, month: d.month, totalRevenue: d.totalLabelRevenue, totalUnits: d.totalLabelUnits };
                    });

                    // Flow ribbons
                    for (let i = 0; i < columnsData.length - 1; i++) {
                      const colA = columnsData[i];
                      const colB = columnsData[i + 1];

                      colA.stacks.forEach((stackA, sIdx) => {
                        const stackB = colB.stacks[sIdx];
                        const isDimmed = selectedStageFilter !== "all" && selectedStageFilter !== stackA.key;
                        const flowGrad = stackA.key === "sample" ? "url(#flowSample)" : stackA.key === "partial" ? "url(#flowPartial)" : "url(#flowComplete)";

                        const path = `M ${stackA.xLeft + colWidth} ${stackA.yTop} 
                                      C ${stackA.xLeft + colWidth + 50} ${stackA.yTop}, ${stackB.xLeft - 50} ${stackB.yTop}, ${stackB.xLeft} ${stackB.yTop} 
                                      L ${stackB.xLeft} ${stackB.yTop + stackB.h} 
                                      C ${stackB.xLeft - 50} ${stackB.yTop + stackB.h}, ${stackA.xLeft + colWidth + 50} ${stackA.yTop + stackA.h}, ${stackA.xLeft + colWidth} ${stackA.yTop + stackA.h} Z`;

                        elements.push(
                          <path
                            key={`flow-${i}-${stackA.key}`}
                            d={path}
                            fill={flowGrad}
                            className="chart-flow-path"
                            opacity={isDimmed ? 0.05 : 0.85}
                          />
                        );
                      });
                    }

                    // Rectangles and labels
                    columnsData.forEach((col, i) => {
                      col.stacks.forEach((stack) => {
                        elements.push(
                          <rect
                            key={`rect-${i}-${stack.key}`}
                            x={stack.xLeft}
                            y={stack.yTop}
                            width={colWidth}
                            height={stack.h}
                            rx="8"
                            fill={stack.gradient}
                            opacity={stack.isDimmed ? 0.2 : 1}
                            className="chart-bar-rect"
                            onMouseEnter={() => {
                              setHoveredStack({
                                x: stack.xLeft + colWidth / 2,
                                y: stack.yTop,
                                month: col.month,
                                stageKey: stack.key,
                                count: stack.info.count,
                                revenue: stack.info.revenue,
                                pct: stack.info.pct,
                                totalRevenue: col.totalRevenue,
                                totalUnits: col.totalUnits
                              });
                            }}
                          />
                        );
                      });

                      const topStack = col.stacks[col.stacks.length - 1];
                      elements.push(
                        <text
                          key={`top-total-${i}`}
                          x={col.xCenter}
                          y={topStack.yTop - 12}
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="700"
                          fill="#0f172a"
                        >
                          {chartViewMode === "volume" ? col.totalUnits : col.totalRevenue}
                        </text>
                      );

                      elements.push(
                        <text
                          key={`label-${i}`}
                          x={col.xCenter}
                          y="215"
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="600"
                          fill="#64748b"
                        >
                          {col.month} 2026
                        </text>
                      );
                    });

                    return elements;
                  })()}
                </svg>

                {hoveredStack && (
                  <div 
                    className="chart-floating-tooltip"
                    style={{ left: `${(hoveredStack.x / 600) * 100}%`, top: `${(hoveredStack.y / 240) * 100}%` }}
                  >
                    <div className="tooltip-header">
                      <span>{hoveredStack.month} Breakdown</span>
                      <span style={{ textTransform: "capitalize", color: hoveredStack.stageKey === "sample" ? "#818cf8" : hoveredStack.stageKey === "partial" ? "#fbbf24" : "#34d399" }}>
                        {hoveredStack.stageKey}
                      </span>
                    </div>
                    <div className="tooltip-row">
                      <span>Stage Volume:</span>
                      <strong>{hoveredStack.count} Units ({hoveredStack.pct}%)</strong>
                    </div>
                    <div className="tooltip-row">
                      <span>Stage Value:</span>
                      <strong>{hoveredStack.revenue}</strong>
                    </div>
                    <div className="tooltip-row" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "4px", marginTop: "4px" }}>
                      <span>Month Total:</span>
                      <span style={{ color: "#cbd5e1" }}>{chartViewMode === "volume" ? hoveredStack.totalUnits : hoveredStack.totalRevenue}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chart Legend */}
              <div className="stage-chart-legend">
                <div 
                  className="stage-legend-item" 
                  onClick={() => setSelectedStageFilter(selectedStageFilter === "sample" ? "all" : "sample")}
                >
                  <span className="stage-legend-dot" style={{ background: "#6366f1" }}></span>
                  <span>Sample</span>
                  <span className="stage-legend-val">({stageStats.sample.count} · {stageStats.sample.pct}%)</span>
                </div>
                <div 
                  className="stage-legend-item" 
                  onClick={() => setSelectedStageFilter(selectedStageFilter === "partial" ? "all" : "partial")}
                >
                  <span className="stage-legend-dot" style={{ background: "#f59e0b" }}></span>
                  <span>Partial</span>
                  <span className="stage-legend-val">({stageStats.partial.count} · {stageStats.partial.pct}%)</span>
                </div>
                <div 
                  className="stage-legend-item" 
                  onClick={() => setSelectedStageFilter(selectedStageFilter === "complete" ? "all" : "complete")}
                >
                  <span className="stage-legend-dot" style={{ background: "#10b981" }}></span>
                  <span>Complete</span>
                  <span className="stage-legend-val">({stageStats.complete.count} · {stageStats.complete.pct}%)</span>
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
                      : `$${Math.round(inventoryStats.totalValuation).toLocaleString()}`}
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
                      $
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
                              : `$${Math.round(item.valuation).toLocaleString()}`}
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
                          : `$${Math.round(hoveredStockItem.valuation).toLocaleString()}`}
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
            <div className="ov-card">
              <div className="card-header-clean">
                <div>
                  <h3>Onboarding</h3>
                </div>
                <span className="stage-trend-pill positive" style={{ fontSize: "11px" }}>
                  +12 this month
                </span>
              </div>

              <div className="lifecycle-card-body">
                <div className="donut-wrapper">
                  <svg viewBox="0 0 100 100" className="donut-svg">
                    <circle cx="50" cy="50" r="40" className="donut-ring-track" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="donut-segment"
                      stroke="#3b82f6"
                      strokeDasharray="138.2 251.3"
                      strokeDashoffset="0"
                      onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, onboarding: { label: "In Progress", val: "68" } }))}
                      onMouseLeave={() => setActiveDonutHover(prev => ({ ...prev, onboarding: null }))}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="donut-segment"
                      stroke="#10b981"
                      strokeDasharray="72.8 251.3"
                      strokeDashoffset="-138.2"
                      onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, onboarding: { label: "Verification", val: "36" } }))}
                      onMouseLeave={() => setActiveDonutHover(prev => ({ ...prev, onboarding: null }))}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="donut-segment"
                      stroke="#f59e0b"
                      strokeDasharray="40.3 251.3"
                      strokeDashoffset="-211"
                      onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, onboarding: { label: "Completed", val: "20" } }))}
                      onMouseLeave={() => setActiveDonutHover(prev => ({ ...prev, onboarding: null }))}
                    />
                  </svg>
                  <div className="donut-center-info">
                    <span className="donut-center-label">
                      {activeDonutHover.onboarding?.label || "Total"}
                    </span>
                    <span className="donut-center-val">
                      {activeDonutHover.onboarding?.val || "124"}
                    </span>
                  </div>
                </div>

                <div className="lifecycle-breakdown-list">
                  <div className="lifecycle-item">
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#3b82f6" }}></span>
                        Training
                      </span>
                      <span className="lifecycle-item-val">68 (55%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: "55%", background: "#3b82f6" }}></div>
                    </div>
                  </div>

                  <div className="lifecycle-item">
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#10b981" }}></span>
                        Verification
                      </span>
                      <span className="lifecycle-item-val">36 (29%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: "29%", background: "#10b981" }}></div>
                    </div>
                  </div>

                  <div className="lifecycle-item">
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#f59e0b" }}></span>
                        Completed
                      </span>
                      <span className="lifecycle-item-val">20 (16%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: "16%", background: "#f59e0b" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Offboarding Overview Card */}
            <div className="ov-card">
              <div className="card-header-clean">
                <div>
                  <h3>Offboarding</h3>
                </div>
                <span className="tile-trend-pill neutral" style={{ fontSize: "11px" }}>
                  45 Pipeline
                </span>
              </div>

              <div className="lifecycle-card-body">
                <div className="donut-wrapper">
                  <svg viewBox="0 0 100 100" className="donut-svg">
                    <circle cx="50" cy="50" r="40" className="donut-ring-track" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="donut-segment"
                      stroke="#f87171"
                      strokeDasharray="155.8 251.3"
                      strokeDashoffset="0"
                      onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, offboarding: { label: "Handover", val: "28" } }))}
                      onMouseLeave={() => setActiveDonutHover(prev => ({ ...prev, offboarding: null }))}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="donut-segment"
                      stroke="#8b78f6"
                      strokeDasharray="67.8 251.3"
                      strokeDashoffset="-155.8"
                      onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, offboarding: { label: "Clearance", val: "12" } }))}
                      onMouseLeave={() => setActiveDonutHover(prev => ({ ...prev, offboarding: null }))}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="donut-segment"
                      stroke="#64748b"
                      strokeDasharray="27.7 251.3"
                      strokeDashoffset="-223.6"
                      onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, offboarding: { label: "Deprovision", val: "5" } }))}
                      onMouseLeave={() => setActiveDonutHover(prev => ({ ...prev, offboarding: null }))}
                    />
                  </svg>
                  <div className="donut-center-info">
                    <span className="donut-center-label">
                      {activeDonutHover.offboarding?.label || "Total"}
                    </span>
                    <span className="donut-center-val">
                      {activeDonutHover.offboarding?.val || "45"}
                    </span>
                  </div>
                </div>

                <div className="lifecycle-breakdown-list">
                  <div className="lifecycle-item">
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#f87171" }}></span>
                        Handover
                      </span>
                      <span className="lifecycle-item-val">28 (62%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: "62%", background: "#f87171" }}></div>
                    </div>
                  </div>

                  <div className="lifecycle-item">
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#8b78f6" }}></span>
                        Clearance
                      </span>
                      <span className="lifecycle-item-val">12 (27%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: "27%", background: "#8b78f6" }}></div>
                    </div>
                  </div>

                  <div className="lifecycle-item">
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#64748b" }}></span>
                        Deprovisioned
                      </span>
                      <span className="lifecycle-item-val">5 (11%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: "11%", background: "#64748b" }}></div>
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
                                <td>${lead.netAmount || lead.totalAmount || "1,200.00"}</td>
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
            {employees.map((emp) => (
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
          <InventoryManagement />
        </div>
      )}
    </div>
  );
}

export default Dashboard;
