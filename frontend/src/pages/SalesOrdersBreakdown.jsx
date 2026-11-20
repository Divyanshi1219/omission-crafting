import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import {
  ArrowLeft,
  Layers,
  Package,
  Search,
  Download,
  Filter,
  ArrowUpRight,
  Clock,
  Calendar,
  X
} from "lucide-react";
import "./SalesOrdersBreakdown.css";

export default function SalesOrdersBreakdown() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initial params passed from the Sales Overview chart or Order Ageing chart click
  const paramLabel = searchParams.get("label");
  const paramPeriod = searchParams.get("period");
  const paramStart = searchParams.get("start");
  const paramEnd = searchParams.get("end");
  const paramMonth = searchParams.get("month");
  const paramYear = searchParams.get("year");
  const paramAgeingTier = searchParams.get("ageingTier"); // "under5" | "fiveTo7" | "over7"
  const paramAgeingStatus = searchParams.get("ageingStatus"); // "completed" | "pending" | "all"

  // Leads state
  const [leads, setLeads] = useState(() => {
    try {
      const cached = sessionStorage.getItem("omission_cached_leads");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });
  const [loading, setLoading] = useState(false);

  // Active filter states
  const [activeFilterLabel, setActiveFilterLabel] = useState(() => paramLabel || null);
  const [ageingTierFilter, setAgeingTierFilter] = useState(() => paramAgeingTier || "all");
  const [ageingStatusFilter, setAgeingStatusFilter] = useState(() => paramAgeingStatus || "all");
  const [filterPreset, setFilterPreset] = useState(() => {
    if (paramStart && paramEnd) return "custom_param";
    if (paramPeriod === "monthly" && paramMonth === "9") return "october";
    if (paramPeriod === "monthly" && paramMonth === "10") return "this_month";
    if (paramPeriod === "daily") return "custom_param";
    return "all";
  });

  const [customStart, setCustomStart] = useState(() => {
    if (paramStart) {
      try {
        return new Date(paramStart).toISOString().split("T")[0];
      } catch (_) {}
    }
    return "2026-10-01";
  });

  const [customEnd, setCustomEnd] = useState(() => {
    if (paramEnd) {
      try {
        return new Date(paramEnd).toISOString().split("T")[0];
      } catch (_) {}
    }
    return "2026-11-30";
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [selectedOrderModal, setSelectedOrderModal] = useState(null);

  // Synchronize state when search parameters change in URL
  useEffect(() => {
    const tier = searchParams.get("ageingTier");
    const status = searchParams.get("ageingStatus");
    const lbl = searchParams.get("label");
    if (tier !== null) setAgeingTierFilter(tier || "all");
    if (status !== null) setAgeingStatusFilter(status || "all");
    if (lbl !== null) setActiveFilterLabel(lbl);
  }, [searchParams]);

  // Fetch leads on mount and window focus
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/leads");
      if (res.data?.data) {
        setLeads(res.data.data);
        try {
          sessionStorage.setItem("omission_cached_leads", JSON.stringify(res.data.data));
        } catch (_) {}
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    const handleFocus = () => fetchLeads();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Format currency in INR
  const formatINR = (val, compact = false) => {
    const num = Number(val) || 0;
    if (compact) {
      if (num >= 10000000) return `₹ ${(num / 10000000).toFixed(2)} Cr`;
      if (num >= 100000) return `₹ ${(num / 100000).toFixed(2)} L`;
      if (num >= 1000) return `₹ ${(num / 1000).toFixed(1)} K`;
      return `₹ ${Math.round(num)}`;
    }
    return `₹ ${Math.round(num).toLocaleString("en-IN")}`;
  };

  // Clean & normalize lead into an order record
  const normalizedOrders = useMemo(() => {
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

    const isCompleted = (item) => {
      if (item.isCompleted === true) return true;
      const sub = (item.subStage || '').toLowerCase().trim();
      const st = (item.orderStage || '').toLowerCase().trim();
      if (completedSubStages.includes(sub)) return true;
      if (st === 'complete' && !['order', 'new', 'leads', 'dtf-pending', 'stock', 'printing', 'quality-check'].includes(sub)) {
        return true;
      }
      return false;
    };

    const now = new Date();

    return leads
      .filter((l) => l.query === "order" || l.orderStage || l.totalQuantity || l.orderId)
      .map((l) => {
        const rawNet = Number(l.netAmount);
        const rawTotal = Number(l.totalAmount);
        const qty =
          Number(l.totalQuantity) ||
          (Array.isArray(l.items)
            ? l.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)
            : 0);
        const ppp = Number(l.pricePerPiece) || 0;

        let safeRev = 0;
        if (!isNaN(rawNet) && rawNet > 0 && rawNet < 50000000) safeRev = rawNet;
        else if (!isNaN(rawTotal) && rawTotal > 0 && rawTotal < 50000000) safeRev = rawTotal;
        else if (qty > 0 && ppp > 0) safeRev = qty * ppp;

        const dateStr = l.createdAt || l.deliveryDate || "2026-10-15";
        const d = new Date(dateStr);
        const validDate = isNaN(d.getTime()) ? new Date("2026-10-15") : d;

        const stage = (l.orderStage || "sample").toLowerCase().trim();
        const normStage = ["sample", "partial", "complete"].includes(stage) ? stage : "sample";

        const orderId = l.orderId || `ORD-${(l._id || "").toString().slice(-5)}`;
        const clientName = l.clientName || "Unnamed Client";
        const companyName = l.companyName || "Independent";
        const employeeName = l.employeeName || l.createdBy || "Sales Rep";

        // Ageing and fulfillment completion calculation
        const comp = isCompleted(l);
        let days = 0;
        if (comp) {
          const updated = new Date(l.updatedAt || l.createdAt || now);
          const validUpdated = isNaN(updated.getTime()) ? now : updated;
          const diffMs = Math.max(0, validUpdated.getTime() - validDate.getTime());
          days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        } else {
          const diffMs = Math.max(0, now.getTime() - validDate.getTime());
          days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        }

        let tier = "over7";
        if (days < 5) tier = "under5";
        else if (days <= 7) tier = "fiveTo7";

        // Extract products description
        const items = Array.isArray(l.items) ? l.items : [];
        const itemNames = items
          .map((it) => it.productName || it.enterItem || it.item || "Apparel")
          .filter(Boolean)
          .join(", ") || "Custom Apparel";
        const printTypes = [
          ...new Set(items.map((it) => it.printingType).filter(Boolean)),
        ].join(", ") || l.printingType || "DTF";

        return {
          ...l,
          orderId,
          clientName,
          companyName,
          units: qty,
          revenue: safeRev,
          unitPrice: ppp || (qty > 0 ? Math.round(safeRev / qty) : 0),
          date: validDate,
          normStage,
          employeeName,
          itemNames,
          printTypes,
          itemsCount: items.length || 1,
          isCompleted: comp,
          daysAge: days,
          ageingTier: tier,
          subStageName: l.subStage || (comp ? "packaging" : (normStage === "sample" ? "sample" : "order")),
        };
      });
  }, [leads]);

  // Apply Date, Period & Ageing Filters
  const periodFilteredOrders = useMemo(() => {
    if (!normalizedOrders.length) return [];

    let list = normalizedOrders;

    // Filter by Ageing Status (Completed / Pending / All)
    if (ageingStatusFilter === "completed") {
      list = list.filter((o) => o.isCompleted === true);
    } else if (ageingStatusFilter === "pending") {
      list = list.filter((o) => o.isCompleted === false);
    }

    // Filter by Ageing Tier (Under 5 / 5 to 7 / Over 7)
    if (ageingTierFilter !== "all") {
      list = list.filter((o) => o.ageingTier === ageingTierFilter);
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (filterPreset === "custom_param" && paramStart && paramEnd) {
      const s = new Date(paramStart);
      const e = new Date(paramEnd);
      return list.filter((o) => o.date >= s && o.date <= e);
    }

    if (filterPreset === "today") {
      return list.filter((o) => o.date >= todayStart && o.date <= todayEnd);
    }

    if (filterPreset === "yesterday") {
      const yStart = new Date(todayStart);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(todayEnd);
      yEnd.setDate(yEnd.getDate() - 1);
      return list.filter((o) => o.date >= yStart && o.date <= yEnd);
    }

    if (filterPreset === "past_7_days") {
      const past7 = new Date(todayStart);
      past7.setDate(past7.getDate() - 6);
      return list.filter((o) => o.date >= past7 && o.date <= todayEnd);
    }

    if (filterPreset === "this_month") {
      return list.filter(
        (o) => o.date.getMonth() === 10 && o.date.getFullYear() === 2026
      );
    }

    if (filterPreset === "october") {
      return list.filter(
        (o) => o.date.getMonth() === 9 && o.date.getFullYear() === 2026
      );
    }

    if (filterPreset === "custom") {
      const s = new Date(customStart + "T00:00:00");
      const e = new Date(customEnd + "T23:59:59");
      return list.filter((o) => o.date >= s && o.date <= e);
    }

    // Default "all"
    return list;
  }, [normalizedOrders, filterPreset, paramStart, paramEnd, customStart, customEnd, ageingTierFilter, ageingStatusFilter]);

  // Apply Search, Stage Filter & Sorting
  const displayedOrders = useMemo(() => {
    let result = periodFilteredOrders.filter((o) => {
      // Stage filter
      if (stageFilter !== "all" && o.normStage !== stageFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = (o.orderId || "").toLowerCase().includes(q);
        const matchClient = (o.clientName || "").toLowerCase().includes(q);
        const matchCompany = (o.companyName || "").toLowerCase().includes(q);
        const matchItem = (o.itemNames || "").toLowerCase().includes(q);
        const matchRep = (o.employeeName || "").toLowerCase().includes(q);
        return matchId || matchClient || matchCompany || matchItem || matchRep;
      }
      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === "date_desc") return b.date.getTime() - a.date.getTime();
      if (sortBy === "date_asc") return a.date.getTime() - b.date.getTime();
      if (sortBy === "age_desc") return b.daysAge - a.daysAge;
      if (sortBy === "age_asc") return a.daysAge - b.daysAge;
      if (sortBy === "units_desc") return b.units - a.units;
      if (sortBy === "units_asc") return a.units - b.units;
      if (sortBy === "rev_desc") return b.revenue - a.revenue;
      if (sortBy === "rev_asc") return a.revenue - b.revenue;
      if (sortBy === "order_asc") return a.orderId.localeCompare(b.orderId);
      return b.date.getTime() - a.date.getTime();
    });

    return result;
  }, [periodFilteredOrders, stageFilter, searchQuery, sortBy]);

  // Aggregate Metrics for the Current View
  const metrics = useMemo(() => {
    const totalOrders = displayedOrders.length;
    const totalUnits = displayedOrders.reduce((sum, o) => sum + o.units, 0);
    const totalRevenue = displayedOrders.reduce((sum, o) => sum + o.revenue, 0);
    const avgUnitsPerOrder = totalOrders > 0 ? Math.round(totalUnits / totalOrders) : 0;
    const avgRevenuePerOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return {
      totalOrders,
      totalUnits,
      totalRevenue,
      formattedRevenue: formatINR(totalRevenue, false),
      compactRevenue: formatINR(totalRevenue, true),
      avgUnitsPerOrder,
      avgRevenuePerOrder: formatINR(avgRevenuePerOrder, false),
    };
  }, [displayedOrders]);

  // Handle Export CSV
  const handleExportCSV = () => {
    if (!displayedOrders.length) return;
    const headers = [
      "Order ID",
      "Date",
      "Client Name",
      "Company Name",
      "Units (Qty)",
      "Unit Price (INR)",
      "Revenue (INR)",
      "Pipeline Stage",
      "Substage",
      "Age (Days)",
      "Ageing Tier",
      "Fulfillment Status",
      "Products",
      "Printing Type",
      "Assigned Rep",
    ];

    const rows = displayedOrders.map((o) => [
      `"${o.orderId}"`,
      `"${o.date.toLocaleDateString("en-IN")} ${o.date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}"`,
      `"${(o.clientName || "").replace(/"/g, '""')}"`,
      `"${(o.companyName || "").replace(/"/g, '""')}"`,
      o.units,
      o.unitPrice,
      o.revenue,
      `"${o.normStage}"`,
      `"${o.subStageName}"`,
      o.daysAge,
      `"${o.ageingTier}"`,
      `"${o.isCompleted ? 'Completed' : 'Pending'}"`,
      `"${(o.itemNames || "").replace(/"/g, '""')}"`,
      `"${(o.printTypes || "").replace(/"/g, '""')}"`,
      `"${(o.employeeName || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_orders_breakdown_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearSpecificFilter = () => {
    setActiveFilterLabel(null);
    setAgeingTierFilter("all");
    setAgeingStatusFilter("all");
    setFilterPreset("all");
    setSearchParams({});
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="sales-breakdown-page">
      {/* Top Header Card */}
      <div className="sbd-header-card">
        <div className="sbd-top-nav-row">
          <button className="sbd-back-btn" onClick={handleBack} title="Go to previous page">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <div className="sbd-header-actions">
            <button className="sbd-action-btn" onClick={fetchLeads} title="Refresh data">
              <Clock size={14} className={loading ? "spin-animation" : ""} /> Refresh
            </button>
            <button
              className="sbd-action-btn primary"
              onClick={handleExportCSV}
              disabled={displayedOrders.length === 0}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="sbd-title-block">
          <h1>
            <Layers size={24} color="#6366f1" /> Sales & Orders Breakdown
          </h1>
        </div>

        {/* Time Period Filter Chips Strip */}
        <div className="sbd-period-chips">
          <button
            className={`sbd-chip ${filterPreset === "all" ? "active" : ""}`}
            onClick={() => {
              setFilterPreset("all");
              setActiveFilterLabel(null);
            }}
          >
            All Orders ({normalizedOrders.length})
          </button>

          <button
            className={`sbd-chip ${filterPreset === "today" ? "active" : ""}`}
            onClick={() => {
              setFilterPreset("today");
              setActiveFilterLabel("Today (Monday, Nov 16)");
            }}
          >
            <Clock size={12} /> Today (Nov 16)
          </button>

          <button
            className={`sbd-chip ${filterPreset === "yesterday" ? "active" : ""}`}
            onClick={() => {
              setFilterPreset("yesterday");
              setActiveFilterLabel("Yesterday (Sun, Nov 15)");
            }}
          >
            Yesterday (Nov 15)
          </button>

          <button
            className={`sbd-chip ${filterPreset === "past_7_days" ? "active" : ""}`}
            onClick={() => {
              setFilterPreset("past_7_days");
              setActiveFilterLabel("Past 7 Days");
            }}
          >
            Past 7 Days
          </button>

          <button
            className={`sbd-chip ${filterPreset === "this_month" ? "active" : ""}`}
            onClick={() => {
              setFilterPreset("this_month");
              setActiveFilterLabel("November 2026");
            }}
          >
            November 2026
          </button>

          <button
            className={`sbd-chip ${filterPreset === "october" ? "active" : ""}`}
            onClick={() => {
              setFilterPreset("october");
              setActiveFilterLabel("October 2026");
            }}
          >
            October 2026
          </button>

          {filterPreset === "custom_param" && (
            <button className="sbd-chip active" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={12} /> {activeFilterLabel || "Selected Period"}
            </button>
          )}

          <button
            className={`sbd-chip ${filterPreset === "custom" ? "active" : ""}`}
            onClick={() => {
              setFilterPreset("custom");
              setActiveFilterLabel("Custom Date Range");
            }}
          >
            <Filter size={12} /> Custom Range
          </button>

          {filterPreset === "custom" && (
            <div className="sbd-custom-date-box">
              <span>From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="sbd-custom-date-input"
              />
              <span>To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="sbd-custom-date-input"
              />
            </div>
          )}
        </div>
      </div>

      {/* Filter & Search Controls Bar */}
      <div className="sbd-controls-bar">
        <div className="sbd-search-wrapper">
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by Order ID (ORD...), Client, Company, Product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sbd-search-input"
          />
          {searchQuery && (
            <X size={15} color="#94a3b8" style={{ cursor: "pointer" }} onClick={() => setSearchQuery("")} />
          )}
        </div>

        <div className="sbd-dropdowns-group">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sbd-select"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="age_desc">Age: Oldest (Highest Days)</option>
            <option value="age_asc">Age: Newest (Lowest Days)</option>
            <option value="units_desc">Units: High to Low</option>
            <option value="units_asc">Units: Low to High</option>
            <option value="rev_desc">Revenue: High to Low</option>
            <option value="rev_asc">Revenue: Low to High</option>
            <option value="order_asc">Order Number (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Detailed Orders Data Table */}
      <div className="sbd-table-card">
        <div className="sbd-table-wrapper">
          <table className="sbd-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Order Date</th>
                <th>Client & Company</th>
                <th>Products & Specs</th>
                <th>Units (Quantity)</th>
                <th>Unit Price</th>
                <th>Revenue (INR)</th>
                <th>Pipeline Stage</th>
                <th>Age / Turnaround</th>
                <th>Sales Rep</th>
              </tr>
            </thead>
            <tbody>
              {loading && displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "48px", color: "#64748b" }}>
                    <Clock size={24} className="spin-animation" style={{ marginBottom: "8px" }} />
                    <div>Loading orders breakdown...</div>
                  </td>
                </tr>
              ) : displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "48px", color: "#94a3b8" }}>
                    <Package size={28} style={{ opacity: 0.5, marginBottom: "8px" }} />
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#475569" }}>No orders found matching your criteria.</div>
                    <p style={{ margin: "4px 0 12px 0", fontSize: "12px" }}>Try selecting "All Orders" or changing search keywords.</p>
                    <button className="sbd-chip" onClick={clearSpecificFilter}>Reset All Filters</button>
                  </td>
                </tr>
              ) : (
                displayedOrders.map((o) => (
                  <tr
                    key={o._id || o.orderId}
                    className="sbd-row"
                    onClick={() => setSelectedOrderModal(o)}
                    title="Click to view full order details"
                  >
                    <td>
                      <span className="sbd-order-badge">
                        {o.orderId}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "#334155" }}>
                        {o.date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {o.date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td>
                      <span className="sbd-client-name">{o.clientName}</span>
                      <span className="sbd-company-name">{o.companyName}</span>
                    </td>
                    <td style={{ maxWidth: "220px" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {o.itemNames}
                      </div>
                      <div style={{ fontSize: "11px", color: "#6366f1" }}>
                        {o.printTypes}
                      </div>
                    </td>
                    <td>
                      <span className="sbd-units-pill">
                        <Package size={12} /> {o.units.toLocaleString("en-IN")} pcs
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: "#475569" }}>
                      ₹ {o.unitPrice.toLocaleString("en-IN")}
                    </td>
                    <td>
                      <span className="sbd-revenue-text">
                        ₹ {o.revenue.toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td>
                      <span className={`sbd-stage-badge ${o.normStage}`}>
                        {o.normStage}
                      </span>
                    </td>
                    <td>
                      <div className={`sbd-ageing-pill ${o.ageingTier}`}>
                        <span className="sbd-ageing-dot"></span>
                        <span className="sbd-ageing-days">{o.daysAge}d</span>
                        <span className="sbd-ageing-status">{o.isCompleted ? '✓ Completed' : 'Pending'}</span>
                      </div>
                      <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px", textTransform: "capitalize" }}>
                        Substage: <strong>{o.subStageName}</strong>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>
                        {o.employeeName}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Order Details Modal */}
      {selectedOrderModal && (
        <div className="sbd-modal-overlay" onClick={() => setSelectedOrderModal(null)}>
          <div className="sbd-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sbd-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span className="sbd-order-badge" style={{ fontSize: "15px" }}>
                  {selectedOrderModal.orderId}
                </span>
                <span className={`sbd-stage-badge ${selectedOrderModal.normStage}`}>
                  {selectedOrderModal.normStage}
                </span>
                <span className={`sbd-ageing-pill ${selectedOrderModal.ageingTier}`}>
                  <span className="sbd-ageing-dot"></span>
                  {selectedOrderModal.daysAge}d • {selectedOrderModal.isCompleted ? "Completed" : "Pending"}
                </span>
              </div>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                onClick={() => setSelectedOrderModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="sbd-modal-body">
              {/* Financial & Volume Highlights */}
              <div className="sbd-specs-grid">
                <div className="sbd-spec-item">
                  <div className="label">Total Units Sold</div>
                  <div className="value" style={{ color: "#4f46e5" }}>
                    {selectedOrderModal.units.toLocaleString("en-IN")} Units (pcs)
                  </div>
                </div>
                <div className="sbd-spec-item">
                  <div className="label">Total Revenue (Net)</div>
                  <div className="value" style={{ color: "#059669" }}>
                    ₹ {selectedOrderModal.revenue.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="sbd-spec-item">
                  <div className="label">Unit Price (PPP)</div>
                  <div className="value">₹ {selectedOrderModal.unitPrice.toLocaleString("en-IN")} / piece</div>
                </div>
                <div className="sbd-spec-item">
                  <div className="label">Fulfillment & Ageing</div>
                  <div className="value" style={{ textTransform: "capitalize" }}>
                    {selectedOrderModal.subStageName} ({selectedOrderModal.daysAge} {selectedOrderModal.daysAge === 1 ? 'day' : 'days'})
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {selectedOrderModal.isCompleted ? "Completed (Packaging & Beyond)" : "Pending (Pre-Packaging)"}
                  </div>
                </div>
              </div>

              {/* Client & Logistics Details */}
              <div className="sbd-specs-grid">
                <div className="sbd-spec-item">
                  <div className="label">Client & Company</div>
                  <div className="value">{selectedOrderModal.clientName}</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>{selectedOrderModal.companyName}</div>
                </div>
                <div className="sbd-spec-item">
                  <div className="label">Assigned Representative</div>
                  <div className="value">{selectedOrderModal.employeeName}</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Created by: {selectedOrderModal.createdBy || "sales"}</div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              {Array.isArray(selectedOrderModal.items) && selectedOrderModal.items.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    Products & Sizes Breakdown ({selectedOrderModal.items.length} items)
                  </h4>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
                    <table className="sbd-table" style={{ fontSize: "12px" }}>
                      <thead>
                        <tr>
                          <th>Item / Product</th>
                          <th>Printing Type</th>
                          <th>Color</th>
                          <th>Quantity</th>
                          <th>Rate</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrderModal.items.map((it, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{it.productName || it.enterItem || it.item || "Apparel"}</td>
                            <td>{it.printingType || selectedOrderModal.printingType || "DTF"}</td>
                            <td>{it.color || "Standard"}</td>
                            <td style={{ fontWeight: 700 }}>{it.quantity || selectedOrderModal.units} pcs</td>
                            <td>₹ {it.rate || selectedOrderModal.unitPrice}</td>
                            <td style={{ fontWeight: 700, color: "#059669" }}>
                              ₹ {(it.amount || ((it.quantity || selectedOrderModal.units) * (it.rate || selectedOrderModal.unitPrice))).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="sbd-modal-footer">
              <button
                className="sbd-action-btn"
                onClick={() => setSelectedOrderModal(null)}
              >
                Close
              </button>
              <button
                className="sbd-action-btn primary"
                onClick={() => {
                  const o = selectedOrderModal;
                  navigate(
                    `/order/create-lead?id=${o._id}&from=${encodeURIComponent("/sales/orders")}&stage=${o.normStage}`
                  );
                }}
              >
                Open Full Order Form <ArrowUpRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
