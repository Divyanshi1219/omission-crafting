import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import {
  ArrowUpDown,
  Filter,
  SlidersHorizontal,
  Search,
  Plus,
  RefreshCw,
  X,
  Layers,
  Archive,
  Package,
  CheckCircle2,
  Check,
  BookmarkCheck,
  Clock,
  AlertTriangle,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import "./StockRoom.css";
import InventoryAnalyticsPanel from "../../components/InventoryAnalyticsPanel";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export default function StockRoom({ isEmbedded = false, isTableViewOnly = false }) {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { type: routeType } = useParams();

  const isOnlyTable = isTableViewOnly || Boolean(routeType);

  const mapTypeToBox = (t) => {
    if (!t) return "total";
    if (t === "overdue-reserved" || t === "overdue") return "overdue_reserved";
    if (t === "active-reserved" || t === "reserved" || t === "reservations") return "active_reserved";
    if (t === "available") return "available";
    if (t === "low-stock" || t === "low") return "low_stock";
    return "total";
  };

  const [activeBox, setActiveBox] = useState(() => {
    if (routeType) return mapTypeToBox(routeType);
    const v = searchParams.get("view");
    const f = searchParams.get("filter");
    if (v === "reservations" && f === "overdue") return "overdue_reserved";
    if (v === "reservations") return "active_reserved";
    if (f === "low") return "low_stock";
    if (f === "available") return "available";
    return "total";
  });

  useEffect(() => {
    if (routeType) {
      setActiveBox(mapTypeToBox(routeType));
    }
  }, [routeType]);

  // Reservations toolbar & filtering states (matching Image 2)
  const [resvSearchQuery, setResvSearchQuery] = useState("");
  const [allReservationsList, setAllReservationsList] = useState([]);
  const [loadingAllReservations, setLoadingAllReservations] = useState(false);
  const [resvSortBy, setResvSortBy] = useState("aging_desc");
  const [showResvSortMenu, setShowResvSortMenu] = useState(false);
  const [showResvFilterMenu, setShowResvFilterMenu] = useState(false);
  const [showResvColumnMenu, setShowResvColumnMenu] = useState(false);
  const [resvSizeFilter, setResvSizeFilter] = useState("all");
  const [resvProductFilter, setResvProductFilter] = useState("all");
  const [resvVisibleColumns, setResvVisibleColumns] = useState({
    orderId: true,
    client: true,
    variant: true,
    size: true,
    qty: true,
    date: true,
    aging: true,
    notes: true,
    action: true,
  });

  const resvSortRef = useRef(null);
  const resvFilterRef = useRef(null);
  const resvColumnRef = useRef(null);

  // Data states
  const [stocks, setStocks] = useState([]);
  const [metrics, setMetrics] = useState({
    totalItems: 0,
    availableItems: 0,
    activeReserved: 0,
    overdueReservations: 0,
    overduePieces: 0,
    lowStockAlerts: 0,
    itemsOutOfStock: 0,
  });

  // Real-time enriched metrics computed from live stocks data
  const computedMetrics = useMemo(() => {
    let totalItems = 0;
    let lowStockAlerts = 0;
    let itemsOutOfStock = 0;
    let activeReserved = 0;
    let overdueReservations = 0;
    let overduePieces = 0;
    const now = Date.now();
    const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

    stocks.forEach((stock) => {
      SIZES.forEach((sz) => {
        const qty = Number(stock.sizes?.[sz] || 0);
        totalItems += qty;
        const threshold = stock.lowStockThreshold || 2;
        if (qty === 0) {
          itemsOutOfStock += 1;
        } else if (qty <= threshold) {
          lowStockAlerts += 1;
        }
      });

      (stock.reservations || []).forEach((r) => {
        if (r.status === "Active") {
          const rQty = Number(r.quantity) || 0;
          activeReserved += rQty;
          const createdTime = new Date(r.createdAt || stock.createdAt || now).getTime();
          if (now - createdTime >= FIVE_DAYS_MS) {
            overdueReservations += 1;
            overduePieces += rQty;
          }
        }
      });
    });

    const availableItems = Math.max(0, totalItems - activeReserved);

    return {
      totalItems,
      availableItems,
      activeReserved,
      overdueReservations,
      overduePieces,
      lowStockAlerts,
      itemsOutOfStock,
    };
  }, [stocks]);

  const displayMetrics = {
    ...metrics,
    ...computedMetrics,
  };
  const [orderAllocations, setOrderAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Search, Filter, Sort, Display states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [rowsPerPage, setRowsPerPage] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Filters (Location removed)
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedColour, setSelectedColour] = useState("all");
  const [selectedCut, setSelectedCut] = useState("all");
  const [selectedStockStatus, setSelectedStockStatus] = useState("all");

  // Popover menus state
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showRowMenu, setShowRowMenu] = useState(false);

  // Column visibility (Location removed)
  const [visibleColumns, setVisibleColumns] = useState({
    product: true,
    colour: true,
    cut: true,
    type: true,
    XS: true,
    S: true,
    M: true,
    L: true,
    XL: true,
    XXL: true,
    total: true,
    reserved: true,
    available: true,
    status: true,
    actions: true,
  });

  // Modal states
  const [selectedStockDetail, setSelectedStockDetail] = useState(null);
  const [selectedSize, setSelectedSize] = useState("M");
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Adjust / Restock inside detail modal
  const [adjustType, setAdjustType] = useState("Inward / Restock");
  const [adjustQty, setAdjustQty] = useState(10);
  const [adjustNotes, setAdjustNotes] = useState("");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // New Garment Inward Modal (Location removed)
  const [showNewGarmentModal, setShowNewGarmentModal] = useState(false);
  const [newGarmentData, setNewGarmentData] = useState({
    product: "",
    colour: "",
    cut: "",
    type: "Stock",
    sizes: { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
  });

  // Dropdown refs
  const sortRef = useRef(null);
  const filterRef = useRef(null);
  const columnRef = useRef(null);
  const rowRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortMenu(false);
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterMenu(false);
      if (columnRef.current && !columnRef.current.contains(e.target)) setShowColumnMenu(false);
      if (rowRef.current && !rowRef.current.contains(e.target)) setShowRowMenu(false);
      if (resvSortRef.current && !resvSortRef.current.contains(e.target)) setShowResvSortMenu(false);
      if (resvFilterRef.current && !resvFilterRef.current.contains(e.target)) setShowResvFilterMenu(false);
      if (resvColumnRef.current && !resvColumnRef.current.contains(e.target)) setShowResvColumnMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch stocks & metrics
  const fetchStockData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await api.get("/api/stock-room");
      if (res.data?.success) {
        setStocks(res.data.data || []);
        if (res.data.metrics) {
          setMetrics(res.data.metrics);
        }
      }

      const allocRes = await api.get("/api/stock-room/order-allocations");
      if (allocRes.data?.success) {
        setOrderAllocations(allocRes.data.data || []);
      }
    } catch (err) {
      console.error("Error loading stock room data:", err);
      showToast("Failed to load inventory data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAllReservations = async () => {
    try {
      setLoadingAllReservations(true);
      const res = await api.get("/api/stock-room/all-reservations");
      if (res.data?.success) {
        setAllReservationsList(res.data.data || []);
      }
    } catch (err) {
      console.error("Error loading all reservations:", err);
    } finally {
      setLoadingAllReservations(false);
    }
  };

  useEffect(() => {
    fetchStockData();
    fetchAllReservations();
  }, []);

  useEffect(() => {
    const pFilter = searchParams.get("filter");
    if (pFilter) {
      setResvFilterTab(pFilter);
      if (pFilter === "low") {
        setSelectedStockStatus("low");
      }
    }
    if (searchParams.get("view") === "reservations") {
      fetchAllReservations();
    }
  }, [searchParams]);

  const handleReleaseFromList = async (stockId, reservationId) => {
    await handleReleaseReservation(stockId, reservationId);
    fetchAllReservations();
  };

  // Unique lists for filters
  const uniqueProducts = useMemo(() => {
    return Array.from(new Set(stocks.map((s) => s.product).filter(Boolean))).sort();
  }, [stocks]);

  const uniqueColours = useMemo(() => {
    return Array.from(new Set(stocks.map((s) => s.colour).filter(Boolean))).sort();
  }, [stocks]);

  const uniqueCuts = useMemo(() => {
    return Array.from(new Set(stocks.map((s) => s.cut).filter(Boolean))).sort();
  }, [stocks]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedProduct !== "all") count++;
    if (selectedColour !== "all") count++;
    if (selectedCut !== "all") count++;
    if (selectedStockStatus !== "all") count++;
    return count;
  }, [selectedProduct, selectedColour, selectedCut, selectedStockStatus]);

  const handleResetFilters = () => {
    setSelectedProduct("all");
    setSelectedColour("all");
    setSelectedCut("all");
    setSelectedStockStatus("all");
  };

  // Filtered and Sorted Stocks
  const filteredAndSortedStocks = useMemo(() => {
    let result = [...stocks];

    if (activeBox === "available") {
      result = result.filter((item) => {
        const total = SIZES.reduce((acc, sz) => acc + (item.sizes?.[sz] || 0), 0);
        const resv = (item.reservations || [])
          .filter((r) => r.status === "Active")
          .reduce((a, b) => a + (b.quantity || 0), 0);
        return (total - resv) > 0;
      });
    } else if (activeBox === "low_stock") {
      result = result.filter((item) => {
        const threshold = item.lowStockThreshold || 2;
        const total = SIZES.reduce((acc, sz) => acc + (item.sizes?.[sz] || 0), 0);
        const hasOut = SIZES.some((sz) => (item.sizes?.[sz] || 0) === 0);
        const hasLow = SIZES.some(
          (sz) => (item.sizes?.[sz] || 0) > 0 && (item.sizes?.[sz] || 0) <= threshold
        );
        return total === 0 || hasOut || hasLow;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.product?.toLowerCase().includes(q) ||
          item.colour?.toLowerCase().includes(q) ||
          item.cut?.toLowerCase().includes(q)
      );
    }

    if (selectedProduct !== "all") {
      result = result.filter((item) => item.product === selectedProduct);
    }
    if (selectedColour !== "all") {
      result = result.filter((item) => item.colour === selectedColour);
    }
    if (selectedCut !== "all") {
      result = result.filter((item) => item.cut === selectedCut);
    }

    if (selectedStockStatus !== "all") {
      result = result.filter((item) => {
        const threshold = item.lowStockThreshold || 2;
        const total = SIZES.reduce((acc, sz) => acc + (item.sizes?.[sz] || 0), 0);
        const hasOut = SIZES.some((sz) => (item.sizes?.[sz] || 0) === 0);
        const hasLow = SIZES.some(
          (sz) => (item.sizes?.[sz] || 0) > 0 && (item.sizes?.[sz] || 0) <= threshold
        );

        if (selectedStockStatus === "out") return hasOut;
        if (selectedStockStatus === "low") return hasLow;
        if (selectedStockStatus === "in_stock") return total > 0 && !hasOut && !hasLow;
        return true;
      });
    }

    // Sort
    if (sortBy === "product_asc") {
      result.sort((a, b) => a.product.localeCompare(b.product));
    } else if (sortBy === "product_desc") {
      result.sort((a, b) => b.product.localeCompare(a.product));
    } else if (sortBy === "stock_high") {
      result.sort((a, b) => {
        const sumA = SIZES.reduce((acc, s) => acc + (a.sizes?.[s] || 0), 0);
        const sumB = SIZES.reduce((acc, s) => acc + (b.sizes?.[s] || 0), 0);
        return sumB - sumA;
      });
    } else if (sortBy === "stock_low") {
      result.sort((a, b) => {
        const sumA = SIZES.reduce((acc, s) => acc + (a.sizes?.[s] || 0), 0);
        const sumB = SIZES.reduce((acc, s) => acc + (b.sizes?.[s] || 0), 0);
        return sumA - sumB;
      });
    } else {
      // Default grouping: Product -> Colour -> Cut
      result.sort((a, b) => {
        const pCmp = a.product.localeCompare(b.product);
        if (pCmp !== 0) return pCmp;
        const cCmp = a.colour.localeCompare(b.colour);
        if (cCmp !== 0) return cCmp;
        return a.cut.localeCompare(b.cut);
      });
    }

    return result;
  }, [
    stocks,
    searchQuery,
    selectedProduct,
    selectedColour,
    selectedCut,
    selectedStockStatus,
    sortBy,
  ]);

  // Unique products for reservations filter
  const resvUniqueProducts = useMemo(() => {
    return Array.from(new Set(allReservationsList.map((r) => r.product).filter(Boolean))).sort();
  }, [allReservationsList]);

  const activeResvFiltersCount = useMemo(() => {
    let count = 0;
    if (resvSizeFilter !== "all") count++;
    if (resvProductFilter !== "all") count++;
    return count;
  }, [resvSizeFilter, resvProductFilter]);

  const filteredAndSortedReservations = useMemo(() => {
    let list = [...allReservationsList];

    if (activeBox === "active_reserved") {
      list = list.filter((r) => r.status === "Active");
    } else if (activeBox === "overdue_reserved") {
      list = list.filter((r) => r.isOverdue);
    }

    if (resvSizeFilter !== "all") {
      list = list.filter((r) => r.size === resvSizeFilter);
    }

    if (resvProductFilter !== "all") {
      list = list.filter((r) => r.product === resvProductFilter);
    }

    if (resvSearchQuery.trim()) {
      const q = resvSearchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.orderId || "").toLowerCase().includes(q) ||
          (r.clientName || "").toLowerCase().includes(q) ||
          (r.product || "").toLowerCase().includes(q) ||
          (r.colour || "").toLowerCase().includes(q) ||
          (r.size || "").toLowerCase().includes(q) ||
          (r.notes || "").toLowerCase().includes(q)
      );
    }

    // Sort
    if (resvSortBy === "aging_desc") {
      list.sort((a, b) => (b.daysReserved || 0) - (a.daysReserved || 0));
    } else if (resvSortBy === "date_desc") {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (resvSortBy === "date_asc") {
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (resvSortBy === "qty_desc") {
      list.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
    } else if (resvSortBy === "order_asc") {
      list.sort((a, b) => (a.orderId || "").localeCompare(b.orderId || ""));
    }

    return list;
  }, [allReservationsList, activeBox, resvSizeFilter, resvProductFilter, resvSearchQuery, resvSortBy]);

  // Pagination
  const paginatedStocks = useMemo(() => {
    if (rowsPerPage === "all") return filteredAndSortedStocks;
    const limit = parseInt(rowsPerPage, 10);
    const start = (currentPage - 1) * limit;
    return filteredAndSortedStocks.slice(start, start + limit);
  }, [filteredAndSortedStocks, rowsPerPage, currentPage]);

  const totalPages = useMemo(() => {
    if (rowsPerPage === "all") return 1;
    return Math.ceil(filteredAndSortedStocks.length / parseInt(rowsPerPage, 10)) || 1;
  }, [filteredAndSortedStocks, rowsPerPage]);

  // Click handler for size cell -> Open detail modal
  const handleOpenDetailModal = async (stockItem, sizeKey) => {
    setSelectedStockDetail(stockItem);
    setSelectedSize(sizeKey);
    setAdjustQty(10);
    setAdjustNotes("");
    setLoadingHistory(true);

    try {
      const res = await api.get(`/api/stock-room/${stockItem._id}/history?size=${sizeKey}`);
      if (res.data?.success) {
        setHistoryList(res.data.transactions || []);
      }
    } catch (err) {
      console.error("Error loading item history:", err);
      setHistoryList(stockItem.transactions || []);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Submit stock adjustment
  const handleApplyStockAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedStockDetail || !selectedSize) return;

    try {
      setIsSubmittingAdjust(true);
      const res = await api.post("/api/stock-room/adjust", {
        stockId: selectedStockDetail._id,
        size: selectedSize,
        type: adjustType,
        quantity: parseInt(adjustQty, 10) || 0,
        notes: adjustNotes || `${adjustType} of ${adjustQty} pcs (${selectedSize})`,
        loggedBy: `${currentUser?.name || "Elena Rostova"} (${currentUser?.role || "Stock Room Manager"})`,
      });

      if (res.data?.success) {
        showToast(res.data.message || "Stock updated successfully");
        const updatedItem = res.data.data;
        setStocks((prev) =>
          prev.map((s) => (s._id === updatedItem._id ? updatedItem : s))
        );
        if (res.data.metrics) {
          setMetrics(res.data.metrics);
        }
        setSelectedStockDetail(updatedItem);
        const histRes = await api.get(
          `/api/stock-room/${updatedItem._id}/history?size=${selectedSize}`
        );
        if (histRes.data?.success) {
          setHistoryList(histRes.data.transactions || []);
        }
        setAdjustNotes("");
      }
    } catch (err) {
      console.error("Error updating stock:", err);
      showToast(err.response?.data?.message || "Failed to update stock");
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Create new garment entry (No location required)
  const handleCreateNewGarment = async (e) => {
    e.preventDefault();
    if (
      !newGarmentData.product.trim() ||
      !newGarmentData.colour.trim() ||
      !newGarmentData.cut.trim()
    ) {
      showToast("Please fill all required fields (Product, Colour, Cut)");
      return;
    }

    try {
      const res = await api.post("/api/stock-room/item", newGarmentData);
      if (res.data?.success) {
        showToast("New garment record created successfully!");
        setShowNewGarmentModal(false);
        fetchStockData();
        setNewGarmentData({
          product: "",
          colour: "",
          cut: "",
          type: "Stock",
          sizes: { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
        });
      }
    } catch (err) {
      console.error("Error adding garment:", err);
      showToast(err.response?.data?.message || "Error creating garment record");
    }
  };

  // Release reservation back to stock
  const handleReleaseReservation = async (stockId, reservationId) => {
    const notes = window.prompt("Mandatory Release Notes (*): Please enter the reason for releasing this reservation back to available inventory:");
    if (notes === null) return;
    if (!notes.trim()) {
      showToast("Release notes are mandatory (*). Reservation was not released.");
      return;
    }
    try {
      const res = await api.post("/api/stock-room/release-reservation", {
        stockId,
        reservationId,
        notes: notes.trim(),
        loggedBy: `${currentUser?.name || "Elena Rostova"} (${currentUser?.role || "Stock Room Manager"})`,
      });
      if (res.data?.success) {
        showToast(res.data.message || "Reservation released successfully.");
        fetchStockData();
        if (selectedStockDetail && selectedStockDetail._id === stockId) {
          const updated = res.data.data;
          setSelectedStockDetail(updated);
        }
      }
    } catch (err) {
      console.error("Error releasing reservation:", err);
      showToast(err.response?.data?.message || "Failed to release reservation.");
    }
  };

  // Find active orders matching selected item variant
  const relevantOrderDemands = useMemo(() => {
    if (!selectedStockDetail) return [];
    const prodName = selectedStockDetail.product.toLowerCase();
    const colourName = selectedStockDetail.colour.toLowerCase();
    const matches = [];

    orderAllocations.forEach((order) => {
      (order.items || []).forEach((it) => {
        const itemProd = (it.item || it.enterItem || "").toLowerCase();
        const itemCol = (it.color || "").toLowerCase();
        const itemSz = (it.size || "").toUpperCase();

        if (
          (itemProd.includes(prodName) || prodName.includes(itemProd)) &&
          (itemSz === selectedSize || itemSz === selectedSize.toLowerCase())
        ) {
          matches.push({
            orderId: order.orderId || order.taskId || "ORD",
            clientName: order.clientName || order.companyName || "Client",
            orderStage: order.orderStage || "sample",
            subStage: order.subStage || "order",
            quantity: it.quantity || 0,
            fabric: it.fabric || "",
            color: it.color || "",
            stockStatus: order.stockApproval?.status || "Pending",
          });
        }
      });
    });

    return matches;
  }, [selectedStockDetail, selectedSize, orderAllocations]);

  return (
    <div className="stock-room-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="stock-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* If Table View Only (separate page URL), render ONLY the Back button & Table Title (NO 5 BOXES) */}
      {isOnlyTable ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              className="action-btn-outline"
              onClick={() => navigate(-1)}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 600, padding: "7px 14px", cursor: "pointer" }}
              title="Return to previous page"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <div>
              <h1 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: activeBox === "overdue_reserved" ? "#dc2626" : "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                {activeBox === "overdue_reserved" && <Clock size={20} color="#dc2626" />}
                {activeBox === "active_reserved" && <BookmarkCheck size={20} color="#2563eb" />}
                {activeBox === "total" && <Archive size={20} color="#2563eb" />}
                {activeBox === "available" && <CheckCircle2 size={20} color="#16a34a" />}
                {activeBox === "low_stock" && <AlertTriangle size={20} color="#d97706" />}
                <span>
                  {activeBox === "overdue_reserved" && "Overdue Reservations (≥ 5 Days)"}
                  {activeBox === "active_reserved" && "Active Reservations"}
                  {activeBox === "total" && "Total Warehouse Stock Inventory"}
                  {activeBox === "available" && "Available Stock"}
                  {activeBox === "low_stock" && "Low & Out of Stock"}
                </span>
                {activeBox === "overdue_reserved" && displayMetrics.overdueReservations > 0 && (
                  <span style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#dc2626",
                    background: "#fee2e2",
                    padding: "2px 8px",
                    borderRadius: "9999px"
                  }}>
                    🚨 {displayMetrics.overduePieces} pcs
                  </span>
                )}
              </h1>
              <p style={{ fontSize: "12.5px", color: "#64748b", margin: "2px 0 0" }}>
                {activeBox === "overdue_reserved" && "Orders sitting in warehouse reservation for 5 days or more — Action required"}
                {activeBox === "active_reserved" && "All active stock allocations for ongoing client orders"}
                {activeBox === "total" && "Complete warehouse inventory counts across all sizes and cuts"}
                {activeBox === "available" && "Items currently in warehouse stock ready for new orders"}
                {activeBox === "low_stock" && "Variants at or below reorder threshold or completely out of stock"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="action-btn-outline"
              onClick={() => {
                fetchStockData(true);
                fetchAllReservations();
              }}
              disabled={refreshing || loadingAllReservations}
              style={{ padding: "7px 12px", fontSize: "12.5px" }}
              title="Refresh table from database"
            >
              <RefreshCw size={14} className={(refreshing || loadingAllReservations) ? "spin-icon" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="stock-room-header" style={isEmbedded ? { marginBottom: "12px" } : {}}>
            <div className="stock-title-group">
              <h1>{isEmbedded ? "Stock Room & Warehouse Inventory" : "Stock Room"}</h1>
              <p>
                Warehouse stock inventory, size availability, and printing order allocations
              </p>
            </div>
            <div className="stock-header-actions">
              <button
                className="action-btn-outline"
                onClick={() => {
                  fetchStockData(true);
                  fetchAllReservations();
                }}
                disabled={refreshing || loadingAllReservations}
                title="Refresh stock from live database"
              >
                <RefreshCw size={15} className={(refreshing || loadingAllReservations) ? "spin-icon" : ""} />
                <span>Refresh</span>
              </button>

              <button
                className="action-btn-primary"
                onClick={() => setShowNewGarmentModal(true)}
              >
                <Plus size={16} />
                <span>New Stock Record</span>
              </button>
            </div>
          </div>

                    {/* Section 2: Five Dashboard Summary Status Cards (Same look & feel as Order Tiles, all 5 in the same row) */}
          <div className="stock-metric-cards-grid">
            {/* Card 1: Total Items in Stock */}
            <div
              className="stock-order-tile tile-sample"
              onClick={() => navigate("/stock-room/view/total")}
              title="Click to view Total Stock Table"
            >
              <div className="order-tile-header">
                <span className="order-tile-title">
                  <span className="donut-dot-marker" style={{ background: '#0284c7' }}></span>
                  Total Stock
                </span>
              </div>
              <div className="order-tile-count-row">
                <span className="order-tile-count" style={{ color: '#0284c7' }}>
                  {displayMetrics.totalItems.toLocaleString()}
                </span>
                <span className="order-tile-badge sample">All Cuts</span>
              </div>
              <div className="order-tile-sub">
                <span>On shelves</span>
                <span className="tile-action-hint">View table <ArrowRight size={13} /></span>
              </div>
            </div>

            {/* Card 2: Available to Reserve */}
            <div
              className="stock-order-tile tile-complete"
              onClick={() => navigate("/stock-room/view/available")}
              title="Click to view Available Stock Table"
            >
              <div className="order-tile-header">
                <span className="order-tile-title">
                  <span className="donut-dot-marker" style={{ background: '#059669' }}></span>
                  Available Stock
                </span>
              </div>
              <div className="order-tile-count-row">
                <span className="order-tile-count" style={{ color: '#059669' }}>
                  {displayMetrics.availableItems.toLocaleString()}
                </span>
                <span className="order-tile-badge complete">Ready</span>
              </div>
              <div className="order-tile-sub">
                <span>Free for orders</span>
                <span className="tile-action-hint">View table <ArrowRight size={13} /></span>
              </div>
            </div>

            {/* Card 3: Active Reserved */}
            <div
              className="stock-order-tile tile-partial"
              onClick={() => navigate("/stock-room/view/active-reserved")}
              title="Click to view Active Reservations Table"
            >
              <div className="order-tile-header">
                <span className="order-tile-title">
                  <span className="donut-dot-marker" style={{ background: '#7c3aed' }}></span>
                  Active Reserved
                </span>
              </div>
              <div className="order-tile-count-row">
                <span className="order-tile-count" style={{ color: '#7c3aed' }}>
                  {displayMetrics.activeReserved.toLocaleString()}
                </span>
                <span className="order-tile-badge partial">Orders</span>
              </div>
              <div className="order-tile-sub">
                <span>For orders</span>
                <span className="tile-action-hint">View table <ArrowRight size={13} /></span>
              </div>
            </div>

            {/* Card 4: Overdue Reserve (≥ 5 Days) */}
            <div
              className="stock-order-tile tile-overdue"
              onClick={() => navigate("/stock-room/view/overdue-reserved")}
              title="Click to view Overdue Reservations Table"
            >
              <div className="order-tile-header">
                <span className="order-tile-title">
                  <span className="donut-dot-marker" style={{ background: '#dc2626' }}></span>
                  Overdue Reserve
                </span>
              </div>
              <div className="order-tile-count-row">
                <span className="order-tile-count" style={{ color: '#dc2626' }}>
                  {displayMetrics.overdueReservations.toLocaleString()}
                </span>
                <span className="order-tile-badge overdue">≥ 5 Days</span>
              </div>
              <div className="order-tile-sub">
                <span>
                  {displayMetrics.overdueReservations > 0 ? `${displayMetrics.overduePieces} pcs overdue` : "All within 5d"}
                </span>
                <span className="tile-action-hint">View table <ArrowRight size={13} /></span>
              </div>
            </div>

            {/* Card 5: Low / Out of Stock */}
            <div
              className="stock-order-tile tile-low"
              onClick={() => navigate("/stock-room/view/low-stock")}
              title="Click to view Low Stock Table"
            >
              <div className="order-tile-header">
                <span className="order-tile-title">
                  <span className="donut-dot-marker" style={{ background: '#d97706' }}></span>
                  Low / Out Stock
                </span>
              </div>
              <div className="order-tile-count-row">
                <span className="order-tile-count" style={{ color: '#d97706' }}>
                  {(displayMetrics.lowStockAlerts + displayMetrics.itemsOutOfStock).toLocaleString()}
                </span>
                <span className="order-tile-badge low">Alerts</span>
              </div>
              <div className="order-tile-sub">
                <span>{displayMetrics.itemsOutOfStock} out • {displayMetrics.lowStockAlerts} low</span>
                <span className="tile-action-hint">View table <ArrowRight size={13} /></span>
              </div>
            </div>
          </div>

          {/* Live Graphical Analytics: Order Placed, In Stock, Reserved, Sizes, Valuation */} 
          <InventoryAnalyticsPanel stocks={stocks} metrics={displayMetrics} />

          {/* Overview Table Title for Stock Room page */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "18px", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Archive size={17} color="#2563eb" />
              <h3 style={{ fontSize: "14.5px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                Warehouse Stock Inventory ({filteredAndSortedStocks.length} records)
              </h3>
            </div>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Click any status card above to open dedicated table
            </span>
          </div>
        </>
      )}

      {(activeBox === "active_reserved" || activeBox === "overdue_reserved") ? (
        <div className="reservations-full-page" style={{ marginTop: "4px" }}>
          {/* Toolbar with Image 2 Controls: Sort, Filter, Columns */}
          <div className="stock-toolbar-row" style={{ marginTop: 0, marginBottom: "12px" }}>
            <div className="toolbar-left-controls">
              {/* 1. Sort Pill Button */}
              <div className="toolbar-popover-container" ref={resvSortRef}>
                <button
                  type="button"
                  className={`pill-control-btn ${showResvSortMenu ? "active" : ""}`}
                  onClick={() => setShowResvSortMenu(!showResvSortMenu)}
                >
                  <ArrowUpDown size={14} />
                  <span>Sort</span>
                </button>
                {showResvSortMenu && (
                  <div className="popover-menu sort-popover">
                    <div className="popover-title">Sort Reservations</div>
                    <button
                      className={`popover-item ${resvSortBy === "aging_desc" ? "selected" : ""}`}
                      onClick={() => { setResvSortBy("aging_desc"); setShowResvSortMenu(false); }}
                    >
                      <span>Most Days Reserved (Aging)</span>
                      {resvSortBy === "aging_desc" && <Check size={14} />}
                    </button>
                    <button
                      className={`popover-item ${resvSortBy === "date_desc" ? "selected" : ""}`}
                      onClick={() => { setResvSortBy("date_desc"); setShowResvSortMenu(false); }}
                    >
                      <span>Newest Reserved First</span>
                      {resvSortBy === "date_desc" && <Check size={14} />}
                    </button>
                    <button
                      className={`popover-item ${resvSortBy === "date_asc" ? "selected" : ""}`}
                      onClick={() => { setResvSortBy("date_asc"); setShowResvSortMenu(false); }}
                    >
                      <span>Oldest Reserved First</span>
                      {resvSortBy === "date_asc" && <Check size={14} />}
                    </button>
                    <button
                      className={`popover-item ${resvSortBy === "qty_desc" ? "selected" : ""}`}
                      onClick={() => { setResvSortBy("qty_desc"); setShowResvSortMenu(false); }}
                    >
                      <span>Quantity (High to Low)</span>
                      {resvSortBy === "qty_desc" && <Check size={14} />}
                    </button>
                    <button
                      className={`popover-item ${resvSortBy === "order_asc" ? "selected" : ""}`}
                      onClick={() => { setResvSortBy("order_asc"); setShowResvSortMenu(false); }}
                    >
                      <span>Order ID (A - Z)</span>
                      {resvSortBy === "order_asc" && <Check size={14} />}
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Filter Pill Button */}
              <div className="toolbar-popover-container" ref={resvFilterRef}>
                <button
                  type="button"
                  className={`pill-control-btn filter-btn ${activeResvFiltersCount > 0 ? "filter-active" : ""} ${showResvFilterMenu ? "active" : ""}`}
                  onClick={() => setShowResvFilterMenu(!showResvFilterMenu)}
                >
                  <Filter size={14} />
                  <span>Filter</span>
                  {activeResvFiltersCount > 0 && (
                    <span className="pill-counter-badge">{activeResvFiltersCount}</span>
                  )}
                </button>
                {showResvFilterMenu && (
                  <div className="popover-menu filter-popover">
                    <div className="popover-header-row">
                      <span className="popover-title">Filter Reservations</span>
                      {activeResvFiltersCount > 0 && (
                        <button
                          type="button"
                          className="clear-link-btn"
                          onClick={() => {
                            setResvSizeFilter("all");
                            setResvProductFilter("all");
                          }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div className="filter-group">
                      <label>Product</label>
                      <select value={resvProductFilter} onChange={(e) => setResvProductFilter(e.target.value)}>
                        <option value="all">All Products</option>
                        {resvUniqueProducts.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Garment Size</label>
                      <select value={resvSizeFilter} onChange={(e) => setResvSizeFilter(e.target.value)}>
                        <option value="all">All Sizes</option>
                        {SIZES.map((sz) => (
                          <option key={sz} value={sz}>{sz}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Columns Pill Button */}
              <div className="toolbar-popover-container" ref={resvColumnRef}>
                <button
                  type="button"
                  className={`pill-control-btn ${showResvColumnMenu ? "active" : ""}`}
                  onClick={() => setShowResvColumnMenu(!showResvColumnMenu)}
                >
                  <SlidersHorizontal size={14} />
                  <span>Columns</span>
                </button>
                {showResvColumnMenu && (
                  <div className="popover-menu column-popover">
                    <div className="popover-title">Toggle Columns</div>
                    {Object.keys(resvVisibleColumns).map((col) => (
                      <label key={col} className="column-checkbox-row">
                        <input
                          type="checkbox"
                          checked={resvVisibleColumns[col]}
                          onChange={(e) =>
                            setResvVisibleColumns((prev) => ({
                              ...prev,
                              [col]: e.target.checked,
                            }))
                          }
                        />
                        <span className="col-name">{col.toUpperCase()}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Search Input */}
            <div className="toolbar-search-box">
              <Search size={15} className="search-icon-svg" />
              <input
                type="text"
                placeholder="Search Order ID, client, product, size..."
                value={resvSearchQuery}
                onChange={(e) => setResvSearchQuery(e.target.value)}
              />
              {resvSearchQuery && (
                <button className="clear-search-btn" onClick={() => setResvSearchQuery("")}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="stock-table-card">
            <div className="table-responsive">
              <table className="stock-inventory-table">
                <thead>
                  <tr>
                    <th style={{ width: "36px", textAlign: "center" }}>#</th>
                    {resvVisibleColumns.orderId && <th style={{ minWidth: "110px" }}>Order ID</th>}
                    {resvVisibleColumns.client && <th style={{ minWidth: "130px" }}>Client</th>}
                    {resvVisibleColumns.variant && <th style={{ minWidth: "180px" }}>Item Variant</th>}
                    {resvVisibleColumns.size && <th style={{ minWidth: "60px", textAlign: "center" }}>Size</th>}
                    {resvVisibleColumns.qty && <th style={{ minWidth: "90px", textAlign: "center" }}>Reserved Qty</th>}
                    {resvVisibleColumns.date && <th style={{ minWidth: "110px" }}>Date Reserved</th>}
                    {resvVisibleColumns.aging && <th style={{ minWidth: "160px" }}>Reservation Age</th>}
                    {resvVisibleColumns.notes && <th style={{ minWidth: "160px" }}>Notes</th>}
                    {resvVisibleColumns.action && <th style={{ minWidth: "90px", textAlign: "center" }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedReservations.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: "36px 16px", color: "#64748b" }}>
                        {activeBox === "overdue_reserved"
                          ? "🎉 All clear! There are currently no overdue reservations (≥ 5 days)."
                          : "No reservations found matching the selected filter."}
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedReservations.map((r, idx) => (
                      <tr key={r._id || idx}>
                        <td style={{ textAlign: "center", color: "#94a3b8", fontSize: "12.5px" }}>{idx + 1}</td>
                        {resvVisibleColumns.orderId && (
                          <td style={{ fontWeight: 700, color: "#2563eb", fontSize: "13px" }}>
                            {r.orderId}
                          </td>
                        )}
                        {resvVisibleColumns.client && (
                          <td style={{ fontSize: "13px", color: "#1e293b" }}>
                            {r.clientName || "—"}
                          </td>
                        )}
                        {resvVisibleColumns.variant && (
                          <td>
                            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>{r.product}</div>
                            <div style={{ fontSize: "11.5px", color: "#64748b" }}>{r.colour} • {r.cut}</div>
                          </td>
                        )}
                        {resvVisibleColumns.size && (
                          <td style={{ textAlign: "center", fontWeight: 700, color: "#1e293b", fontSize: "13px" }}>
                            {r.size}
                          </td>
                        )}
                        {resvVisibleColumns.qty && (
                          <td style={{ textAlign: "center", fontSize: "13.5px" }}>
                            <strong>{r.quantity} pcs</strong>
                          </td>
                        )}
                        {resvVisibleColumns.date && (
                          <td style={{ fontSize: "12.5px", color: "#64748b" }}>
                            {new Date(r.createdAt).toLocaleDateString()}
                          </td>
                        )}
                        {resvVisibleColumns.aging && (
                          <td>
                            {r.status === "Released" ? (
                              <span style={{ fontSize: "11px", color: "#64748b", background: "#f1f5f9", padding: "2px 7px", borderRadius: "4px" }}>
                                Released
                              </span>
                            ) : r.isOverdue ? (
                              <span style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#dc2626",
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                whiteSpace: "nowrap"
                              }}>
                                🚨 Day {r.daysReserved} (Overdue ≥5d)
                              </span>
                            ) : (
                              <span style={{
                                fontSize: "11px",
                                fontWeight: 500,
                                color: "#334155",
                                background: "#f1f5f9",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                whiteSpace: "nowrap"
                              }}>
                                {r.daysReserved === 0 ? "Reserved today" : `Day ${r.daysReserved} of 5`}
                              </span>
                            )}
                          </td>
                        )}
                        {resvVisibleColumns.notes && (
                          <td style={{ fontSize: "12px", color: "#64748b", maxWidth: "200px" }}>
                            {r.notes || "—"}
                          </td>
                        )}
                        {resvVisibleColumns.action && (
                          <td style={{ textAlign: "center" }}>
                            {r.status === "Active" ? (
                              <button
                                type="button"
                                onClick={() => handleReleaseFromList(r.stockId, r._id)}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  border: "1px solid #fca5a5",
                                  background: "#fef2f2",
                                  color: "#dc2626",
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  whiteSpace: "nowrap"
                                }}
                                title="Release reservation with mandatory notes"
                              >
                                Release
                              </button>
                            ) : (
                              <span style={{ color: "#cbd5e1" }}>—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Section 3: Toolbar Controls for Garments Inventory */}
          <div className="stock-toolbar-row">
            <div className="toolbar-left-controls">
              {/* 1. Sort Pill Button */}
              <div className="toolbar-popover-container" ref={sortRef}>
                <button
                  className={`pill-control-btn ${showSortMenu ? "active" : ""}`}
                  onClick={() => setShowSortMenu(!showSortMenu)}
                >
                  <ArrowUpDown size={14} />
                  <span>Sort</span>
                </button>
                {showSortMenu && (
                  <div className="popover-menu sort-popover">
                    <div className="popover-title">Sort Stock</div>
                    <button
                      className={`popover-item ${sortBy === "default" ? "selected" : ""}`}
                      onClick={() => { setSortBy("default"); setShowSortMenu(false); }}
                    >
                      <span>Default Grouping</span>
                      {sortBy === "default" && <Check size={14} />}
                    </button>
                    <button
                      className={`popover-item ${sortBy === "product_asc" ? "selected" : ""}`}
                      onClick={() => { setSortBy("product_asc"); setShowSortMenu(false); }}
                    >
                      <span>Product Name (A - Z)</span>
                      {sortBy === "product_asc" && <Check size={14} />}
                    </button>
                    <button
                      className={`popover-item ${sortBy === "product_desc" ? "selected" : ""}`}
                      onClick={() => { setSortBy("product_desc"); setShowSortMenu(false); }}
                    >
                      <span>Product Name (Z - A)</span>
                      {sortBy === "product_desc" && <Check size={14} />}
                    </button>
                    <button
                      className={`popover-item ${sortBy === "stock_high" ? "selected" : ""}`}
                      onClick={() => { setSortBy("stock_high"); setShowSortMenu(false); }}
                    >
                      <span>Total Stock (High to Low)</span>
                      {sortBy === "stock_high" && <Check size={14} />}
                    </button>
                    <button
                      className={`popover-item ${sortBy === "stock_low" ? "selected" : ""}`}
                      onClick={() => { setSortBy("stock_low"); setShowSortMenu(false); }}
                    >
                      <span>Total Stock (Low to High)</span>
                      {sortBy === "stock_low" && <Check size={14} />}
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Filter Pill Button */}
              <div className="toolbar-popover-container" ref={filterRef}>
                <button
                  className={`pill-control-btn filter-btn ${activeFiltersCount > 0 ? "filter-active" : ""} ${showFilterMenu ? "active" : ""}`}
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                >
                  <Filter size={14} />
                  <span>Filter</span>
                  {activeFiltersCount > 0 && (
                    <span className="pill-counter-badge">{activeFiltersCount}</span>
                  )}
                </button>
                {showFilterMenu && (
                  <div className="popover-menu filter-popover">
                    <div className="popover-header-row">
                      <span className="popover-title">Filter Stock</span>
                      {activeFiltersCount > 0 && (
                        <button className="clear-link-btn" onClick={handleResetFilters}>Reset</button>
                      )}
                    </div>
                    <div className="filter-group">
                      <label>Product</label>
                      <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                        <option value="all">All Products</option>
                        {uniqueProducts.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Colour</label>
                      <select value={selectedColour} onChange={(e) => setSelectedColour(e.target.value)}>
                        <option value="all">All Colours</option>
                        {uniqueColours.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Cut / Fabric</label>
                      <select value={selectedCut} onChange={(e) => setSelectedCut(e.target.value)}>
                        <option value="all">All Cuts</option>
                        {uniqueCuts.map((cut) => (
                          <option key={cut} value={cut}>{cut}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Columns Pill Button */}
              <div className="toolbar-popover-container" ref={columnRef}>
                <button
                  className={`pill-control-btn ${showColumnMenu ? "active" : ""}`}
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                >
                  <SlidersHorizontal size={14} />
                  <span>Columns</span>
                </button>
                {showColumnMenu && (
                  <div className="popover-menu column-popover">
                    <div className="popover-title">Toggle Columns</div>
                    {Object.keys(visibleColumns).map((col) => {
                      const labels = {
                        product: "Product Name",
                        colour: "Colour",
                        cut: "Cut / Neck",
                        type: "Type",
                        XS: "Size XS",
                        S: "Size S",
                        M: "Size M",
                        L: "Size L",
                        XL: "Size XL",
                        XXL: "Size XXL",
                        total: "Total Stock",
                        reserved: "Reserved",
                        available: "Available",
                        status: "Status",
                        actions: "Actions",
                      };
                      return (
                        <label key={col} className="column-checkbox-row">
                          <input
                            type="checkbox"
                            checked={visibleColumns[col]}
                            onChange={(e) =>
                              setVisibleColumns((prev) => ({
                                ...prev,
                                [col]: e.target.checked,
                              }))
                            }
                          />
                          <span className="col-name">{labels[col] || col.toUpperCase()}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Right: Search Box */}
            <div className="toolbar-search-box">
              <Search size={15} className="search-icon-svg" />
              <input
                type="text"
                placeholder="Search by product, colour, cut..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchQuery && (
                <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Section 4: Grouped Inventory Table (Full Page Edge-to-Edge) */}
          <div className="stock-table-card">
            <div className="table-responsive">
              <table className="stock-inventory-table">
                <thead>
                  <tr>
                    <th style={{ width: "36px", textAlign: "center" }}>#</th>
                    {visibleColumns.product && <th style={{ minWidth: "120px" }}>Product Name</th>}
                    {visibleColumns.colour && <th style={{ minWidth: "75px" }}>Colour</th>}
                    {visibleColumns.cut && <th style={{ minWidth: "85px" }}>Cut / Neck</th>}
                    {visibleColumns.type && <th style={{ minWidth: "60px", textAlign: "center" }}>Type</th>}
                    {SIZES.map((sz) =>
                      visibleColumns[sz] ? (
                        <th key={sz} className="size-header-cell" style={{ textAlign: "center", minWidth: "40px" }}>
                          {sz}
                        </th>
                      ) : null
                    )}
                    {visibleColumns.total && (
                      <th style={{ minWidth: "80px", textAlign: "center" }}>
                        Total Stock
                      </th>
                    )}
                    {visibleColumns.reserved && (
                      <th style={{ minWidth: "75px", textAlign: "center" }}>
                        Reserved
                      </th>
                    )}
                    {visibleColumns.available && (
                      <th style={{ minWidth: "75px", textAlign: "center" }}>
                        Available
                      </th>
                    )}
                    {visibleColumns.status && (
                      <th style={{ minWidth: "80px", textAlign: "center" }}>
                        Status
                      </th>
                    )}
                    {visibleColumns.actions && (
                      <th style={{ minWidth: "70px", textAlign: "center" }}>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedStocks.length === 0 ? (
                    <tr>
                      <td colSpan={15} style={{ textAlign: "center", padding: "40px 16px", color: "#64748b" }}>
                        No stock items found matching your search and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedStocks.map((stock, idx) => {
                      const totalQty = SIZES.reduce((acc, sz) => acc + (stock.sizes?.[sz] || 0), 0);
                      const threshold = stock.lowStockThreshold || 2;
                      const totalReserved = (stock.reservations || [])
                        .filter((r) => r.status === "Active")
                        .reduce((acc, r) => acc + (r.quantity || 0), 0);
                      const netAvail = Math.max(0, totalQty - totalReserved);
                      const isOutOfStock = totalQty === 0;
                      const isLowStock = SIZES.some((sz) => (stock.sizes?.[sz] || 0) > 0 && (stock.sizes?.[sz] || 0) <= threshold) || totalQty < 15;

                      return (
                        <tr key={stock._id}>
                          <td style={{ textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                            {rowsPerPage === "all" ? idx + 1 : (currentPage - 1) * parseInt(rowsPerPage, 10) + idx + 1}
                          </td>
                          {visibleColumns.product && (
                            <td className="product-name-cell">
                              <strong>{stock.product}</strong>
                            </td>
                          )}
                          {visibleColumns.colour && (
                            <td>
                              <span className="colour-badge">{stock.colour}</span>
                            </td>
                          )}
                          {visibleColumns.cut && (
                            <td style={{ color: "#475569", fontSize: "13.5px" }}>{stock.cut}</td>
                          )}
                          {visibleColumns.type && (
                            <td>
                              <span className="type-pill">{stock.type || "Stock"}</span>
                            </td>
                          )}
                          {SIZES.map((sz) => {
                            if (!visibleColumns[sz]) return null;
                            const qty = Number(stock.sizes?.[sz] || 0);
                            const activeRes = (stock.reservations || [])
                              .filter((r) => r.size === sz && r.status === "Active")
                              .reduce((acc, r) => acc + (r.quantity || 0), 0);
                            const netAvailSize = Math.max(0, qty - activeRes);
                            let cellClass = "size-val-normal";
                            if (qty === 0) cellClass = "size-val-out";
                            else if (qty <= threshold) cellClass = "size-val-low";

                            return (
                              <td
                                key={sz}
                                className={`size-data-cell ${cellClass}`}
                                onClick={() => handleOpenDetailModal(stock, sz)}
                                style={{ textAlign: "center", cursor: "pointer" }}
                                title={
                                  activeRes > 0
                                    ? `Total: ${qty} pcs | Reserved: ${activeRes} pcs | Net Available: ${netAvailSize} pcs (Click to adjust)`
                                    : `Click to view history & adjust Size ${sz} (${qty} in stock)`
                                }
                              >
                                <span className="size-num-display">{qty}</span>
                                {activeRes > 0 && (
                                  <span
                                    className="reserved-chip-badge"
                                    title={`${activeRes} pcs reserved for order`}
                                  >
                                    🔖{activeRes}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          {visibleColumns.total && (
                            <td style={{ textAlign: "center", fontWeight: 700, fontSize: "14.5px", color: "#0f172a" }}>
                              {totalQty} <span style={{ fontSize: "11px", fontWeight: 400, color: "#64748b" }}>pcs</span>
                            </td>
                          )}
                          {visibleColumns.reserved && (
                            <td style={{ textAlign: "center" }}>
                              {totalReserved > 0 ? (
                                <span style={{
                                  display: "inline-block",
                                  padding: "3px 9px",
                                  borderRadius: "9999px",
                                  background: "#eff6ff",
                                  color: "#1d4ed8",
                                  fontWeight: 600,
                                  fontSize: "12.5px",
                                  border: "1px solid #bfdbfe"
                                }}>
                                  🔖 {totalReserved} pcs
                                </span>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "13px" }}>—</span>
                              )}
                            </td>
                          )}
                          {visibleColumns.available && (
                            <td style={{ textAlign: "center" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "3px 9px",
                                borderRadius: "9999px",
                                background: netAvail > 0 ? "#f0fdf4" : "#fef2f2",
                                color: netAvail > 0 ? "#15803d" : "#dc2626",
                                fontWeight: 700,
                                fontSize: "12.5px",
                                border: netAvail > 0 ? "1px solid #bbf7d0" : "1px solid #fecaca"
                              }}>
                                {netAvail} pcs
                              </span>
                            </td>
                          )}
                          {visibleColumns.status && (
                            <td style={{ textAlign: "center" }}>
                              {isOutOfStock ? (
                                <span style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  background: "#fef2f2",
                                  color: "#dc2626",
                                  fontWeight: 600,
                                  fontSize: "12px",
                                  border: "1px solid #fee2e2"
                                }}>
                                  Out of Stock
                                </span>
                              ) : isLowStock ? (
                                <span style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  background: "#fffbeb",
                                  color: "#b45309",
                                  fontWeight: 600,
                                  fontSize: "12px",
                                  border: "1px solid #fef3c7"
                                }}>
                                  Low Stock
                                </span>
                              ) : (
                                <span style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  background: "#f0fdf4",
                                  color: "#16a34a",
                                  fontWeight: 600,
                                  fontSize: "12px",
                                  border: "1px solid #dcfce7"
                                }}>
                                  In Stock
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.actions && (
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="action-btn-outline"
                                style={{ padding: "4px 10px", fontSize: "12px" }}
                                onClick={() => handleOpenDetailModal(stock, "M")}
                              >
                                Adjust
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {rowsPerPage !== "all" && totalPages > 1 && (
              <div className="stock-pagination-bar">
                <span className="pagination-info">
                  Showing {(currentPage - 1) * parseInt(rowsPerPage, 10) + 1} to{" "}
                  {Math.min(currentPage * parseInt(rowsPerPage, 10), filteredAndSortedStocks.length)} of{" "}
                  {filteredAndSortedStocks.length} records
                </span>
                <div className="pagination-nav-btns">
                  <button
                    className="page-nav-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="current-page-num">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="page-nav-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Section 5: Stock Details & Movement History Modal */}
      {selectedStockDetail && (
        <div
          className="stock-modal-backdrop"
          onClick={() => setSelectedStockDetail(null)}
        >
          <div
            className="stock-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header-row">
              <div className="modal-title-wrap">
                <h2>{selectedStockDetail.product}</h2>
                <div className="modal-subtitle-chips">
                  <span className="meta-chip">
                    Colour: {selectedStockDetail.colour}
                  </span>
                  <span className="meta-chip">
                    Cut: {selectedStockDetail.cut}
                  </span>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedStockDetail(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Size Selector Tabs */}
            <div className="modal-size-tabs">
              <span className="size-tabs-label">Active Size:</span>
              <div className="size-tabs-row">
                {SIZES.map((sz) => {
                  const qty = Number(selectedStockDetail.sizes?.[sz] || 0);
                  const isCurrent = selectedSize === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      className={`modal-size-tab ${isCurrent ? "active" : ""}`}
                      onClick={() => handleOpenDetailModal(selectedStockDetail, sz)}
                    >
                      <span className="tab-sz-name">{sz}</span>
                      <span className="tab-sz-qty">{qty}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* In-Stock vs Order Reservations Breakdown */}
            <div className="modal-stats-grid">
              <div className="mini-stat-card">
                <span className="mini-stat-label">On Hand In-Stock</span>
                <span className="mini-stat-num">
                  {selectedStockDetail.sizes?.[selectedSize] || 0} pcs
                </span>
              </div>
              <div className="mini-stat-card">
                <span className="mini-stat-label">Reserved for Orders</span>
                <span className="mini-stat-num" style={{ color: "#d97706" }}>
                  {(selectedStockDetail.reservations || [])
                    .filter((r) => r.size === selectedSize && r.status === "Active")
                    .reduce((acc, r) => acc + (r.quantity || 0), 0)}{" "}
                  pcs
                </span>
              </div>
              <div className="mini-stat-card">
                <span className="mini-stat-label">Net Available</span>
                <span className="mini-stat-num highlight">
                  {Math.max(
                    0,
                    (selectedStockDetail.sizes?.[selectedSize] || 0) -
                      (selectedStockDetail.reservations || [])
                        .filter((r) => r.size === selectedSize && r.status === "Active")
                        .reduce((acc, r) => acc + (r.quantity || 0), 0)
                  )}{" "}
                  pcs
                </span>
              </div>
            </div>

            {/* Active Order Reservations Section */}
            {((selectedStockDetail.reservations || []).filter((r) => r.size === selectedSize && r.status === "Active")).length > 0 && (
              <div className="modal-section-card" style={{ borderColor: "#bbf7d0", background: "#f0fdf4" }}>
                <h3 style={{ color: "#166534", display: "flex", alignItems: "center", gap: "6px" }}>
                  <BookmarkCheck size={16} />
                  <span>Active Order Reservations ({selectedSize})</span>
                </h3>
                <div className="orders-demand-list">
                  {(selectedStockDetail.reservations || [])
                    .filter((r) => r.size === selectedSize && r.status === "Active")
                    .map((res, i) => (
                      <div key={i} className="order-demand-item" style={{ borderColor: "#bbf7d0" }}>
                        <div className="demand-order-info">
                          <strong style={{ color: "#166534" }}>{res.orderId}</strong>
                          {res.clientName && ` — ${res.clientName}`}
                          <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                            {res.notes || "Reserved for order"} • {new Date(res.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {(() => {
                          const daysReserved = Math.floor((Date.now() - new Date(res.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                          const isOverdue = daysReserved >= 5;
                          return (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span className="demand-qty-badge" style={{ background: "#dcfce7", color: "#15803d" }}>
                                {res.quantity} pcs reserved
                              </span>
                              {isOverdue ? (
                                <span style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: "#dc2626",
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  whiteSpace: "nowrap"
                                }}>
                                  🚨 Day {daysReserved} (Overdue ≥5d)
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: "11px",
                                  fontWeight: 500,
                                  color: "#475569",
                                  background: "#f1f5f9",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  whiteSpace: "nowrap"
                                }}>
                                  {daysReserved === 0 ? "Reserved today" : `Day ${daysReserved} of 5`}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleReleaseReservation(selectedStockDetail._id, res._id)}
                                style={{
                                  border: "1px solid #fca5a5",
                                  background: "#fef2f2",
                                  color: "#dc2626",
                                  fontSize: "11px",
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                                title="Release this reservation back to available stock"
                              >
                                Release
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Active Printing Orders Demands Section */}
            {relevantOrderDemands.length > 0 && (
              <div className="modal-section-card">
                <h3>Active Printing Orders Reserved</h3>
                <div className="orders-demand-list">
                  {relevantOrderDemands.map((ord, i) => (
                    <div key={i} className="order-demand-item">
                      <div className="demand-order-info">
                        <strong>{ord.orderId}</strong> — {ord.clientName} (
                        {ord.orderStage} / {ord.subStage})
                      </div>
                      <div className="demand-qty-badge">
                        {ord.quantity} pcs ({selectedSize})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Restock / Adjustment Form */}
            <div className="modal-section-card adjust-form-section">
              <h3>Quick Inward / Stock Adjustment</h3>
              <form onSubmit={handleApplyStockAdjustment} className="adjust-form">
                <div className="adjust-form-row">
                  <div className="form-col">
                    <label>Action Type</label>
                    <select
                      value={adjustType}
                      onChange={(e) => setAdjustType(e.target.value)}
                    >
                      <option value="Inward / Restock">Inward / Restock (+)</option>
                      <option value="Used">Used / Dispatched (-)</option>
                      <option value="Adjustment">Set Exact Count (=)</option>
                    </select>
                  </div>
                  <div className="form-col">
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-col full-width">
                  <label>Audit Reason / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Supplier batch intake, cutting room delivery, audit count"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="action-btn-primary"
                  disabled={isSubmittingAdjust}
                >
                  {isSubmittingAdjust ? "Updating..." : "Save to Inventory"}
                </button>
              </form>
            </div>

            {/* Movement History / Audit Log */}
            <div className="modal-section-card">
              <h3>Movement History & Audit Log</h3>
              {loadingHistory ? (
                <div className="history-loading">Loading transaction logs...</div>
              ) : historyList.length === 0 ? (
                <div className="history-empty">
                  No stock movements recorded for this size yet.
                </div>
              ) : (
                <div className="history-timeline">
                  {historyList.map((tx, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-info">
                        <div className="timeline-header">
                          <span className="tx-type-tag">{tx.type}</span>
                          <span
                            className={`tx-impact-badge ${tx.impact > 0 ? "positive" : "negative"
                              }`}
                          >
                            {tx.impact > 0 ? `+${tx.impact}` : tx.impact} pcs
                          </span>
                          <span className="tx-date-time">
                            {tx.date} {tx.time || ""}
                          </span>
                        </div>
                        <div className="tx-notes">
                          {tx.notes || "Stock movement updated"}
                        </div>
                        <div className="tx-meta-author">
                          Logged by: {tx.loggedBy || "Elena Rostova (Stock Room Manager)"}
                          {tx.orderId && ` | Order: ${tx.orderId}`}
                          {tx.clientName && ` (${tx.clientName})`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section 6: Create New Garment Storage Record Modal */}
      {showNewGarmentModal && (
        <div
          className="stock-modal-backdrop"
          onClick={() => setShowNewGarmentModal(false)}
        >
          <div
            className="stock-modal-card new-garment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-row">
              <div className="modal-title-wrap">
                <h2>Add Stock Inventory Record</h2>
                <p>Register a product, colour, cut, and initial stock quantities</p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowNewGarmentModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewGarment} className="new-garment-form">
              <div className="form-row-2">
                <div className="form-col">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. T-Shirt, Hoodie, Shirt"
                    value={newGarmentData.product}
                    onChange={(e) =>
                      setNewGarmentData({
                        ...newGarmentData,
                        product: e.target.value,
                      })
                    }
                    required
                  />
                  <div className="product-quick-chips">
                    {["T-Shirt", "Relaxed Boat T-Shirt", "Hoodie", "Shirt"].map((prod) => (
                      <button
                        key={prod}
                        type="button"
                        className={`prod-chip-btn ${newGarmentData.product === prod ? "active" : ""}`}
                        onClick={() => {
                          const isTee = prod.toLowerCase().includes("t-shirt");
                          setNewGarmentData((prev) => ({
                            ...prev,
                            product: prod,
                            cut: isTee && !prev.cut ? "round neck" : prev.cut,
                          }));
                        }}
                      >
                        {prod}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-col">
                  <label>Colour *</label>
                  <input
                    type="text"
                    placeholder="e.g. Blue, Orange, Black, White"
                    value={newGarmentData.colour}
                    onChange={(e) =>
                      setNewGarmentData({
                        ...newGarmentData,
                        colour: e.target.value,
                      })
                    }
                    required
                  />
                  <div className="product-quick-chips">
                    {["Without Color", "Black", "White", "Navy", "Blue", "Grey", "Orange"].map((col) => (
                      <button
                        key={col}
                        type="button"
                        className={`prod-chip-btn ${newGarmentData.colour === col ? "active" : ""}`}
                        onClick={() =>
                          setNewGarmentData((prev) => ({
                            ...prev,
                            colour: col,
                          }))
                        }
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Neck Type Selection for T-Shirt OR Cut Specification */}
              {(() => {
                const isTShirt =
                  (newGarmentData.product || "").toLowerCase().includes("t-shirt") ||
                  (newGarmentData.product || "").toLowerCase().includes("tshirt") ||
                  (newGarmentData.product || "").toLowerCase().includes("tee");

                if (isTShirt) {
                  const isCollar = newGarmentData.cut.toLowerCase() === "collar" || newGarmentData.cut.toLowerCase() === "collar neck" || newGarmentData.cut.toLowerCase() === "polo neck";
                  return (
                    <div className="form-col" style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                      <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: 0 }}>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>Collar & Neck Style *</span>
                        <span style={{ fontSize: "11.5px", color: "#2563eb", fontWeight: 600 }}>T-Shirt Neckline</span>
                      </label>
                      <p style={{ fontSize: "11.5px", color: "#64748b", margin: "2px 0 8px 0" }}>
                        Choose whether this T-shirt is With Collar or Without Collar (Round / V-Neck):
                      </p>

                      <div className="neck-type-selector-grid">
                        <button
                          type="button"
                          className={`neck-type-option-btn ${newGarmentData.cut.toLowerCase() === "round neck" ? "active" : ""}`}
                          onClick={() => setNewGarmentData((prev) => ({ ...prev, cut: "round neck" }))}
                        >
                          <div className="neck-icon-badge">⭕</div>
                          <div className="neck-btn-text">
                            <strong>Round Neck</strong>
                            <small>Without Collar (Crew)</small>
                          </div>
                          {newGarmentData.cut.toLowerCase() === "round neck" && (
                            <Check size={16} className="neck-check-icon" />
                          )}
                        </button>

                        <button
                          type="button"
                          className={`neck-type-option-btn ${newGarmentData.cut.toLowerCase() === "v-neck" ? "active" : ""}`}
                          onClick={() => setNewGarmentData((prev) => ({ ...prev, cut: "v-neck" }))}
                        >
                          <div className="neck-icon-badge">🔻</div>
                          <div className="neck-btn-text">
                            <strong>V-Neck</strong>
                            <small>Without Collar (V-Cut)</small>
                          </div>
                          {newGarmentData.cut.toLowerCase() === "v-neck" && (
                            <Check size={16} className="neck-check-icon" />
                          )}
                        </button>

                        <button
                          type="button"
                          className={`neck-type-option-btn ${isCollar ? "active" : ""}`}
                          onClick={() => setNewGarmentData((prev) => ({ ...prev, cut: "collar" }))}
                        >
                          <div className="neck-icon-badge">👔</div>
                          <div className="neck-btn-text">
                            <strong>With Collar</strong>
                            <small>Polo / Turn-down</small>
                          </div>
                          {isCollar && (
                            <Check size={16} className="neck-check-icon" />
                          )}
                        </button>
                      </div>

                      <div className="neck-quick-chips">
                        <span style={{ fontSize: "11px", color: "#64748b" }}>Quick cuts:</span>
                        {["round neck", "v-neck", "collar", "polo neck", "crew neck"].map((cutOpt) => (
                          <button
                            key={cutOpt}
                            type="button"
                            className={`neck-chip-btn ${newGarmentData.cut.toLowerCase() === cutOpt ? "active" : ""}`}
                            onClick={() => setNewGarmentData((prev) => ({ ...prev, cut: cutOpt }))}
                          >
                            {cutOpt}
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="Selected cut: round neck, v-neck, or collar"
                        value={newGarmentData.cut}
                        onChange={(e) =>
                          setNewGarmentData((prev) => ({
                            ...prev,
                            cut: e.target.value,
                          }))
                        }
                        style={{ marginTop: "4px", fontSize: "12.5px" }}
                        required
                      />
                    </div>
                  );
                }

                return (
                  <div className="form-col">
                    <label>Cut / Specification *</label>
                    <input
                      type="text"
                      placeholder="e.g. round neck, v-neck, 100% Cotton, Fleece"
                      value={newGarmentData.cut}
                      onChange={(e) =>
                        setNewGarmentData((prev) => ({
                          ...prev,
                          cut: e.target.value,
                        }))
                      }
                      required
                    />
                    <div className="neck-quick-chips">
                      <span style={{ fontSize: "11px", color: "#64748b" }}>Quick select:</span>
                      {["round neck", "v-neck", "Fleece", "Cotton", "Poly-Cotton", "100% Cotton", "Lycra"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`neck-chip-btn ${newGarmentData.cut === c ? "active" : ""}`}
                          onClick={() => setNewGarmentData((prev) => ({ ...prev, cut: c }))}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="initial-sizes-section">
                <label>Initial Stock Quantities by Size</label>
                <div className="initial-sizes-grid">
                  {SIZES.map((sz) => (
                    <div key={sz} className="initial-size-col">
                      <span className="sz-label">{sz}</span>
                      <input
                        type="number"
                        min="0"
                        value={newGarmentData.sizes[sz] || 0}
                        onChange={(e) =>
                          setNewGarmentData({
                            ...newGarmentData,
                            sizes: {
                              ...newGarmentData.sizes,
                              [sz]: parseInt(e.target.value, 10) || 0,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="action-btn-outline"
                  onClick={() => setShowNewGarmentModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="action-btn-primary">
                  Create Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
