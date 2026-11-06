import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import {
  Layers,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  Clock,
  CheckCircle2,
  PieChart,
  ChevronRight,
  ArrowUpRight,
  Package,
  HelpCircle,
  Sparkles,
  Radio,
  X,
  Plus,
  ReceiptText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Phone,
  Building2,
  User,
  Users,
  Filter
} from "lucide-react";
import "./OrderDashboard.css";
import "./OverviewDashboard.css";

// Exact child side menu stages from Sidebar.jsx
const SAMPLE_STAGES = [
  { key: 'order', shortLabel: 'Order', fullLabel: 'Order', path: '/orders/view/sample?sub=order' },
  { key: 'dtf-pending', shortLabel: 'DTF', fullLabel: 'DTF Pending', path: '/orders/view/sample?sub=dtf-pending' },
  { key: 'stock', shortLabel: 'Stock', fullLabel: 'Stock', path: '/orders/view/sample?sub=stock' },
  { key: 'printing', shortLabel: 'Printing', fullLabel: 'Printing', path: '/orders/view/sample?sub=printing' },
  { key: 'ready-to-pick-up', shortLabel: 'Pickup', fullLabel: 'Ready to Pick Up', path: '/orders/view/sample?sub=ready-to-pick-up' },
  { key: 'staging-ground', shortLabel: 'Staging', fullLabel: 'Staging Ground', path: '/orders/view/sample?sub=staging-ground' },
  { key: 'customer-approval-awaiting', shortLabel: 'Approved', fullLabel: 'Customer Approval Awaiting', path: '/orders/view/sample?sub=customer-approval-awaiting' },
];

const PARTIAL_STAGES = [
  { key: 'order', shortLabel: 'Order', fullLabel: 'Order', path: '/orders/view/partial?sub=order' },
  { key: 'dtf-pending', shortLabel: 'DTF', fullLabel: 'DTF Pending', path: '/orders/view/partial?sub=dtf-pending' },
  { key: 'stock', shortLabel: 'Stock', fullLabel: 'Stock', path: '/orders/view/partial?sub=stock' },
  { key: 'printing', shortLabel: 'Printing', fullLabel: 'Printing', path: '/orders/view/partial?sub=printing' },
  { key: 'quality-check', shortLabel: 'QC', fullLabel: 'Quality Check', path: '/orders/view/partial?sub=quality-check' },
  { key: 'packaging', shortLabel: 'Package', fullLabel: 'Packaging', path: '/orders/view/partial?sub=packaging' },
  { key: 'staging-room', shortLabel: 'Staging', fullLabel: 'Staging Room', path: '/orders/view/partial?sub=staging-room' },
  { key: 'payment-confirmation', shortLabel: 'Payment', fullLabel: 'Payment Confirmation', path: '/orders/view/partial?sub=payment-confirmation' },
];

const COMPLETE_STAGES = [
  { key: 'order', shortLabel: 'Order', fullLabel: 'Order', path: '/orders/view/complete?sub=order' },
  { key: 'dtf-pending', shortLabel: 'DTF', fullLabel: 'DTF Pending', path: '/orders/view/complete?sub=dtf-pending' },
  { key: 'stock', shortLabel: 'Stock', fullLabel: 'Stock', path: '/orders/view/complete?sub=stock' },
  { key: 'printing', shortLabel: 'Printing', fullLabel: 'Printing', path: '/orders/view/complete?sub=printing' },
  { key: 'quality-check', shortLabel: 'QC', fullLabel: 'Quality Check', path: '/orders/view/complete?sub=quality-check' },
  { key: 'packaging', shortLabel: 'Package', fullLabel: 'Packaging', path: '/orders/view/complete?sub=packaging' },
  { key: 'delivery-pending', shortLabel: 'Pending', fullLabel: 'Delivery Pending', path: '/orders/view/complete?sub=delivery-pending' },
  { key: 'delivered', shortLabel: 'Delivered', fullLabel: 'Delivered', path: '/orders/view/complete?sub=delivered' },
  { key: 'customer-support', shortLabel: 'Support', fullLabel: 'Customer Support', path: '/orders/view/complete?sub=customer-support' },
];

// Helper to normalize stage and subStage from database records
const normalizeRecord = (lead) => {
  let stage = (lead.orderStage || 'sample').toLowerCase().trim();
  if (!['sample', 'partial', 'complete'].includes(stage)) {
    stage = 'sample';
  }
  let sub = (lead.subStage || 'order').toLowerCase().trim().replace(/_/g, '-').replace(/\s+/g, '-');
  if (sub === 'new' || sub === 'leads' || !sub) {
    sub = 'order';
  }
  if (stage === 'sample') {
    if (sub === 'staging-room') sub = 'staging-ground';
    if (sub === 'customer-approved' || sub === 'approved') sub = 'customer-approval-awaiting';
  } else if (stage === 'partial') {
    if (sub === 'payment-status') sub = 'payment-confirmation';
  } else if (stage === 'complete') {
    if (sub === 'delivery') sub = 'delivered';
    if (sub === 'support' || sub === 'archived') sub = 'customer-support';
  }
  return { ...lead, normStage: stage, normSub: sub };
};

export default function OrderManagementDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isSales = currentUser?.role === "Sales Executive" || currentUser?.id?.startsWith("sales");
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
  const [hoveredBar, setHoveredBar] = useState(null);
  const [showRepeatDetailsModal, setShowRepeatDetailsModal] = useState(false);
  const [tableTab, setTableTab] = useState("orders"); // "orders" | "inquiries"
  const [hoveredSlice, setHoveredSlice] = useState(null); // 'sample' | 'partial' | 'complete' | null
  const [stageTimeFrame, setStageTimeFrame] = useState("all"); // "all" | "weekly" | "monthly" | "custom"
  const [stageCustomStart, setStageCustomStart] = useState("2026-10-01");
  const [stageCustomEnd, setStageCustomEnd] = useState("2026-11-30");

  // Fetch real leads data from backend
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/leads');
      if (res.data?.data) {
        setLeads(res.data.data);
        try {
          sessionStorage.setItem("omission_cached_leads", JSON.stringify(res.data.data));
        } catch (_) {}
      }
    } catch (err) {
      console.error('Failed to load orders for dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Filter leads by sales executive ownership
  const salesAllLeads = useMemo(() => {
    if (!isSales) return leads;
    const currentEmp = (currentUser?.name || '').toLowerCase().trim();
    const currentId = (currentUser?.id || '').toLowerCase();
    return leads.filter(l => {
      const leadEmp = (l.employeeName || '').toLowerCase().trim();
      const leadCreatedBy = (l.createdBy || '').toLowerCase();
      const isOwner =
        (currentEmp.startsWith('divyansh') || currentId === 'sales') &&
        (leadEmp.startsWith('divyansh') || leadEmp === 'sales executive' || leadCreatedBy === 'sales');
      return isOwner || (leadEmp && leadEmp === currentEmp);
    });
  }, [leads, isSales, currentUser]);

  // Orders
  const orders = useMemo(() => {
    const list = isSales ? salesAllLeads : leads;
    const valid = list.filter(l => l.query === 'order' || l.orderStage || l.totalQuantity);
    return valid.map(normalizeRecord);
  }, [leads, salesAllLeads, isSales]);

  // Open inquiries (leads not yet converted into orders)
  const inquiries = useMemo(() => {
    const list = isSales ? salesAllLeads : leads;
    return list.filter(l => (l.query || '').toLowerCase() !== 'order' && !l.orderStage && !l.totalQuantity);
  }, [leads, salesAllLeads, isSales]);

  // Commercial financial metrics for sales executive
  const salesFinancials = useMemo(() => {
    let totalRevenue = 0;
    let pendingPayment = 0;
    let advancePayment = 0;

    orders.forEach(o => {
      const tot = Number(o.totalAmount) || Number(o.netAmount) || 0;
      const adv = Number(o.advanceAmount) || 0;
      const pend = Number(o.pendingAmount) || Math.max(tot - adv, 0);
      totalRevenue += tot;
      advancePayment += adv;
      pendingPayment += pend;
    });

    const totalLeadsCount = salesAllLeads.length || orders.length;
    const conversionRate = totalLeadsCount > 0 ? Math.round((orders.length / totalLeadsCount) * 100) : 0;

    return {
      totalRevenue,
      pendingPayment,
      advancePayment,
      conversionRate,
      inquiriesCount: inquiries.length,
    };
  }, [orders, salesAllLeads, inquiries]);

  // Urgent Orders & Upcoming Deliveries
  const urgentOrders = useMemo(() => {
    return orders
      .filter(o => (o.urgency || '').toLowerCase() === 'yes' || (o.urgency || '').toLowerCase() === 'urgent' || o.deliveryDate)
      .slice(0, 5);
  }, [orders]);

  // Open Inquiries List for Sales Widget
  const activeInquiriesList = useMemo(() => {
    return inquiries.slice(0, 5);
  }, [inquiries]);

  // Compute live repeat customer rate linked to lead form field `repeatedOrder`
  const repeatCustomerStats = useMemo(() => {
    const totalCount = orders.length;
    const repeatLeads = orders.filter(l => (l.repeatedOrder || "").toLowerCase().trim() === "yes");
    const repeatCount = repeatLeads.length;
    const firstTimeCount = Math.max(totalCount - repeatCount, 0);
    const rate = totalCount > 0 ? Math.round((repeatCount / totalCount) * 100) : 0;
    const target = 30; // Target repeat rate: 30%

    return {
      rate,
      target,
      totalCount,
      repeatCount,
      firstTimeCount,
      repeatLeads
    };
  }, [orders]);

  // Totals for top 3 cards (All Time pipeline counts)
  const sampleOrders = useMemo(() => orders.filter(o => o.normStage === 'sample'), [orders]);
  const partialOrders = useMemo(() => orders.filter(o => o.normStage === 'partial'), [orders]);
  const completeOrders = useMemo(() => orders.filter(o => o.normStage === 'complete'), [orders]);

  const sampleCardOrders = sampleOrders;
  const partialCardOrders = partialOrders;
  const completeCardOrders = completeOrders;

  // Time-filtered orders for the 3 visual stage charts
  const timeFilteredOrders = useMemo(() => {
    if (stageTimeFrame === "all") return orders;

    const maxDate = orders.reduce((max, o) => {
      const d = new Date(o.createdAt || o.deliveryDate || '2026-10-15');
      return d > max ? d : max;
    }, new Date('2026-11-05T23:59:59'));

    if (stageTimeFrame === "weekly") {
      const weekStart = new Date(maxDate.getTime() - 7 * 86400000);
      return orders.filter(o => {
        const d = new Date(o.createdAt || o.deliveryDate || '2026-10-15');
        return d >= weekStart && d <= maxDate;
      });
    }

    if (stageTimeFrame === "monthly") {
      const monthStart = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
      const monthEnd = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0, 23, 59, 59);
      return orders.filter(o => {
        const d = new Date(o.createdAt || o.deliveryDate || '2026-10-15');
        return d >= monthStart && d <= monthEnd;
      });
    }

    if (stageTimeFrame === "custom") {
      const s = new Date(stageCustomStart || "2026-10-01");
      const e = new Date((stageCustomEnd || "2026-11-30") + "T23:59:59");
      return orders.filter(o => {
        const d = new Date(o.createdAt || o.deliveryDate || '2026-10-15');
        return d >= s && d <= e;
      });
    }

    return orders;
  }, [orders, stageTimeFrame, stageCustomStart, stageCustomEnd]);

  // Stage chart filtered orders
  const stageSampleOrders = useMemo(() => timeFilteredOrders.filter(o => o.normStage === 'sample'), [timeFilteredOrders]);
  const stagePartialOrders = useMemo(() => timeFilteredOrders.filter(o => o.normStage === 'partial'), [timeFilteredOrders]);
  const stageCompleteOrders = useMemo(() => timeFilteredOrders.filter(o => o.normStage === 'complete'), [timeFilteredOrders]);

  // Stage counts for each pipeline with quantity sums
  const sampleCounts = useMemo(() => {
    const keys = SAMPLE_STAGES.map(s => s.key);
    return SAMPLE_STAGES.map(s => {
      const matched = stageSampleOrders.filter(o => {
        if (o.normSub === s.key) return true;
        if (s.key === 'order' && !keys.includes(o.normSub)) return true;
        return false;
      });
      return {
        ...s,
        count: matched.length,
        quantity: matched.reduce((sum, o) => sum + (Number(o.totalQuantity) || 0), 0),
      };
    });
  }, [stageSampleOrders]);

  const partialCounts = useMemo(() => {
    const keys = PARTIAL_STAGES.map(s => s.key);
    return PARTIAL_STAGES.map(s => {
      const matched = stagePartialOrders.filter(o => {
        if (o.normSub === s.key) return true;
        if (s.key === 'order' && !keys.includes(o.normSub)) return true;
        return false;
      });
      return {
        ...s,
        count: matched.length,
        quantity: matched.reduce((sum, o) => sum + (Number(o.totalQuantity) || 0), 0),
      };
    });
  }, [stagePartialOrders]);

  const completeCounts = useMemo(() => {
    const keys = COMPLETE_STAGES.map(s => s.key);
    return COMPLETE_STAGES.map(s => {
      const matched = stageCompleteOrders.filter(o => {
        if (o.normSub === s.key) return true;
        if (s.key === 'order' && !keys.includes(o.normSub)) return true;
        return false;
      });
      return {
        ...s,
        count: matched.length,
        quantity: matched.reduce((sum, o) => sum + (Number(o.totalQuantity) || 0), 0),
      };
    });
  }, [stageCompleteOrders]);

  // Clean Reusable Bar Chart
  const renderBarChart = (data, barColor, pipelineKey, totalWidth = 360, colWidth = 28) => {
    const maxVal = Math.max(...data.map(d => d.count), 1);
    const chartHeight = 85;
    const baselineY = 105;
    const count = data.length;
    const spacing = (totalWidth - (count * colWidth)) / (count + 1);

    return (
      <div className="bar-chart-svg-container">
        <svg viewBox={`0 0 ${totalWidth} 135`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          {data.map((item, i) => {
            const hasData = item.count > 0;
            const barH = hasData ? Math.max((item.count / maxVal) * chartHeight, 14) : 4;
            const x = spacing + i * (colWidth + spacing);
            const y = baselineY - barH;
            const isHovered = hoveredBar && hoveredBar.pipeline === pipelineKey && hoveredBar.key === item.key;
            const safeRadius = Math.min(6, Math.max(1, barH / 2));

            return (
              <g
                key={item.key}
                className="chart-bar-group"
                onClick={() => navigate(item.path)}
                onMouseEnter={() => setHoveredBar({ ...item, pipeline: pipelineKey })}
                onMouseLeave={() => setHoveredBar(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Full-column transparent hit-area prevents mouse oscillation & freezing on small/zero bars */}
                <rect
                  x={x - 2}
                  y={0}
                  width={colWidth + 4}
                  height={135}
                  fill="transparent"
                  style={{ pointerEvents: 'all' }}
                />

                {/* Number above the bar */}
                <text
                  x={x + colWidth / 2}
                  y={hasData ? y - 6 : baselineY - 10}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill={isHovered ? barColor : (hasData ? "#0f172a" : "#94a3b8")}
                  style={{ pointerEvents: 'none' }}
                >
                  {item.count}
                </text>

                {/* Vertical Bar */}
                <rect
                  className="visual-bar"
                  x={x}
                  y={y}
                  width={colWidth}
                  height={barH}
                  rx={safeRadius}
                  fill={hasData ? barColor : "#e2e8f0"}
                  style={{
                    opacity: isHovered ? 1 : (hasData ? 0.9 : 0.6),
                    filter: isHovered ? `drop-shadow(0 4px 8px ${barColor}66)` : 'none',
                    pointerEvents: 'none'
                  }}
                />

                {/* Label under the bar */}
                <text
                  x={x + colWidth / 2}
                  y="126"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered || hasData ? "600" : "500"}
                  fill={isHovered ? barColor : (hasData ? "#334155" : "#94a3b8")}
                  style={{ pointerEvents: 'none' }}
                >
                  {item.shortLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const totalOrdersCount = sampleCardOrders.length + partialCardOrders.length + completeCardOrders.length;
  const samplePct = totalOrdersCount > 0 ? Math.round((sampleCardOrders.length / totalOrdersCount) * 100) : 0;
  const partialPct = totalOrdersCount > 0 ? Math.round((partialCardOrders.length / totalOrdersCount) * 100) : 0;
  const completePct = totalOrdersCount > 0 ? Math.max(0, 100 - samplePct - partialPct) : 0;

  return (
    <div className="order-simple-dashboard">
      {/* 1. TOP 3 BIG SUMMARY CARDS */}
      <div className="order-summary-tiles">
        {/* Sample Card */}
        <div
          className="order-tile tile-sample"
          onClick={() => navigate('/orders/view/sample')}
          title="Click to view Sample Orders Table"
        >
          <div className="order-tile-header">
            <span className="order-tile-title">
              <span className="donut-dot-marker" style={{ background: '#0284c7' }}></span>
              Sample Orders
            </span>
            <span className="order-tile-badge sample">7 Stages</span>
          </div>
          <div className="order-tile-count" style={{ color: '#0284c7' }}>
            {sampleCardOrders.length}
          </div>
          <div className="order-tile-sub">
            <span>{sampleCardOrders.reduce((sum, o) => sum + (Number(o.totalQuantity) || 0), 0)} pcs in pipeline</span>
            <span className="tile-action-hint">View table <ArrowRight size={13} /></span>
          </div>
        </div>

        {/* Partial Card */}
        <div
          className="order-tile tile-partial"
          onClick={() => navigate('/orders/view/partial')}
          title="Click to view Partial Orders Table"
        >
          <div className="order-tile-header">
            <span className="order-tile-title">
              <span className="donut-dot-marker" style={{ background: '#7c3aed' }}></span>
              Partial Orders
            </span>
            <span className="order-tile-badge partial">8 Stages</span>
          </div>
          <div className="order-tile-count" style={{ color: '#7c3aed' }}>
            {partialCardOrders.length}
          </div>
          <div className="order-tile-sub">
            <span>{partialCardOrders.reduce((sum, o) => sum + (Number(o.totalQuantity) || 0), 0)} pcs in production</span>
            <span className="tile-action-hint">View table <ArrowRight size={13} /></span>
          </div>
        </div>

        {/* Complete Card */}
        <div
          className="order-tile tile-complete"
          onClick={() => navigate('/orders/view/complete')}
          title="Click to view Complete Orders Table"
        >
          <div className="order-tile-header">
            <span className="order-tile-title">
              <span className="donut-dot-marker" style={{ background: '#059669' }}></span>
              Complete Orders
            </span>
            <span className="order-tile-badge complete">9 Stages</span>
          </div>
          <div className="order-tile-count" style={{ color: '#059669' }}>
            {completeCardOrders.length}
          </div>
          <div className="order-tile-sub">
            <span>{completeCardOrders.reduce((sum, o) => sum + (Number(o.totalQuantity) || 0), 0)} pcs fulfilled</span>
            <span className="tile-action-hint">View table <ArrowRight size={13} /></span>
          </div>
        </div>
      </div>

      {/* 2. THREE DEDICATED VISUAL BAR CHARTS FOR CHILD STAGES */}
      <div className="order-charts-section-header">
        <div className="order-charts-title-group">
          <h3>
            <Layers size={17} color="#4f46e5" /> Pipeline Stage Distribution
          </h3>
          <p>
            {stageTimeFrame === 'weekly' ? 'Showing orders from past 7 days (Weekly)' : stageTimeFrame === 'monthly' ? 'Showing orders from current month (Monthly)' : stageTimeFrame === 'custom' ? `Showing orders between ${stageCustomStart} and ${stageCustomEnd}` : 'Showing all-time orders across workflow stages'}
          </p>
        </div>

        <div className="sales-period-strip" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
          <button
            className={`sales-period-chip ${stageTimeFrame === "all" ? "active" : ""}`}
            onClick={() => setStageTimeFrame("all")}
          >
            All Time
          </button>
          <button
            className={`sales-period-chip ${stageTimeFrame === "weekly" ? "active" : ""}`}
            onClick={() => setStageTimeFrame("weekly")}
          >
            <Calendar size={13} /> Weekly
          </button>
          <button
            className={`sales-period-chip ${stageTimeFrame === "monthly" ? "active" : ""}`}
            onClick={() => setStageTimeFrame("monthly")}
          >
            <Calendar size={13} /> Monthly
          </button>
          <button
            className={`sales-period-chip ${stageTimeFrame === "custom" ? "active" : ""}`}
            onClick={() => setStageTimeFrame("custom")}
          >
            <Filter size={13} /> Custom Range
          </button>

          {stageTimeFrame === "custom" && (
            <div className="custom-date-box">
              <span>From:</span>
              <input
                type="date"
                value={stageCustomStart}
                onChange={(e) => setStageCustomStart(e.target.value)}
                className="custom-date-input"
              />
              <span>To:</span>
              <input
                type="date"
                value={stageCustomEnd}
                onChange={(e) => setStageCustomEnd(e.target.value)}
                className="custom-date-input"
              />
            </div>
          )}
        </div>
      </div>

      <div className="order-charts-grid">
        {/* Chart 1: Sample Child Stages */}
        <div className="order-chart-card">
          <div className="order-chart-header">
            <div>
              <h3>
                <span className="donut-dot-marker" style={{ background: '#0284c7' }}></span>
                Sample Stages
              </h3>
              <p>
                {hoveredBar && hoveredBar.pipeline === 'sample' ? (
                  <span style={{ color: '#0284c7', fontWeight: 700 }}>
                    {hoveredBar.fullLabel}: {hoveredBar.count || 0} order{(hoveredBar.count || 0) === 1 ? '' : 's'} ({hoveredBar.quantity || 0} pcs)
                  </span>
                ) : (
                  'Orders across 7 stages'
                )}
              </p>
            </div>
            <span className="order-chart-badge">{stageSampleOrders.length} total</span>
          </div>

          {renderBarChart(sampleCounts, '#0284c7', 'sample', 380, 26)}

          <div className="order-chart-footer">
            <button className="order-open-link" onClick={() => navigate('/orders/view/sample')}>
              <span>Open Sample</span> <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Chart 2: Partial Child Stages */}
        <div className="order-chart-card">
          <div className="order-chart-header">
            <div>
              <h3>
                <span className="donut-dot-marker" style={{ background: '#7c3aed' }}></span>
                Partial Stages
              </h3>
              <p>
                {hoveredBar && hoveredBar.pipeline === 'partial' ? (
                  <span style={{ color: '#7c3aed', fontWeight: 700 }}>
                    {hoveredBar.fullLabel}: {hoveredBar.count || 0} order{(hoveredBar.count || 0) === 1 ? '' : 's'} ({hoveredBar.quantity || 0} pcs)
                  </span>
                ) : (
                  'Orders across 8 stages'
                )}
              </p>
            </div>
            <span className="order-chart-badge">{stagePartialOrders.length} total</span>
          </div>

          {renderBarChart(partialCounts, '#7c3aed', 'partial', 400, 24)}

          <div className="order-chart-footer">
            <button className="order-open-link" onClick={() => navigate('/orders/view/partial')}>
              <span>Open Partial</span> <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Chart 3: Complete Child Stages */}
        <div className="order-chart-card">
          <div className="order-chart-header">
            <div>
              <h3>
                <span className="donut-dot-marker" style={{ background: '#059669' }}></span>
                Complete Stages
              </h3>
              <p>
                {hoveredBar && hoveredBar.pipeline === 'complete' ? (
                  <span style={{ color: '#059669', fontWeight: 700 }}>
                    {hoveredBar.fullLabel}: {hoveredBar.count || 0} order{(hoveredBar.count || 0) === 1 ? '' : 's'} ({hoveredBar.quantity || 0} pcs)
                  </span>
                ) : (
                  'Orders across 9 stages'
                )}
              </p>
            </div>
            <span className="order-chart-badge">{stageCompleteOrders.length} total</span>
          </div>

          {renderBarChart(completeCounts, '#059669', 'complete', 440, 22)}

          <div className="order-chart-footer">
            <button className="order-open-link" onClick={() => navigate('/orders/view/complete')}>
              <span>Open Complete</span> <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* SALES EXECUTIVE FOCUS: PRIORITY & DELIVERY WATCHLIST */}
      {isSales && (
        <div className="sales-focus-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="sales-focus-header">
            <div>
              <h3>
                <AlertTriangle size={18} color="#dc2626" />
                Priority & Delivery Watchlist
              </h3>
              <p>Orders requiring urgent attention or approaching delivery</p>
            </div>
            <span className="order-chart-badge">{urgentOrders.length} orders</span>
          </div>

          <div className="sales-focus-list">
            {urgentOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8", fontSize: "13px" }}>
                No urgent delivery deadlines at this time.
              </div>
            ) : (
              urgentOrders.map(order => (
                <div
                  key={order._id}
                  className="sales-focus-item"
                  onClick={() => navigate(`/order/create-lead?id=${order._id}&from=${encodeURIComponent(`/order/${order.normStage}/${order.normSub}`)}&stage=${order.normStage}`)}
                  title="Click to open order"
                >
                  <div className="sales-focus-item-left">
                    <span className="sales-focus-item-title">
                      {order.clientName || order.companyName || "Client Order"}
                      <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "6px" }}>({order.orderId || "ORD-NEW"})</span>
                    </span>
                    <span className="sales-focus-item-meta">
                      <Calendar size={12} /> Delivery: {order.deliveryDate || "Not set"} • {order.totalQuantity ? `${order.totalQuantity} pcs` : ""}
                    </span>
                  </div>
                  <div className="sales-focus-item-right">
                    {(order.urgency || '').toLowerCase() === 'yes' && (
                      <span className="badge-urgent-tag">Urgent</span>
                    )}
                    <span className={`status-badge-pill ${order.normStage}`}>
                      {order.normStage} ({order.normSub.replace(/-/g, ' ')})
                    </span>
                    <ArrowUpRight size={14} color="#94a3b8" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. BOTTOM ANALYTICS ROW: OVERALL DISTRIBUTION + REPEAT CUSTOMER RATE */}
      <div className="order-analytics-grid">
        {/* Simple Donut Breakdown */}
        <div className="order-chart-card">
          <div className="order-chart-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3>Overall Distribution</h3>
              <p>Sample vs Partial vs Complete</p>
            </div>
            <button
              className="order-open-link"
              onClick={() => navigate('/orders/view/all')}
              title="Click to view all orders data table"
            >
              <span>View Table</span> <ChevronRight size={14} />
            </button>
          </div>

          <div
            style={{ position: 'relative', width: '160px', height: '160px', margin: '8px auto 14px auto', cursor: 'pointer' }}
            onMouseLeave={() => setHoveredSlice(null)}
            onClick={() => {
              if (hoveredSlice) {
                navigate(`/orders/view/${hoveredSlice}`);
              } else {
                navigate('/orders/view/all');
              }
            }}
            title="Click to view orders table"
          >
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {/* Outer track */}
              <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="16" pointerEvents="none" />

              {/* Inner clickable center circle */}
              <circle
                cx="50"
                cy="50"
                r="28"
                fill="#ffffff"
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/orders/view/all');
                }}
              />

              {(() => {
                const total = totalOrdersCount || 1;
                const sampleFrac = sampleCardOrders.length / total;
                const partialFrac = partialCardOrders.length / total;
                const completeFrac = completeCardOrders.length / total;

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
                const a1 = a0 + sampleFrac * 2 * Math.PI;
                const a2 = a1 + partialFrac * 2 * Math.PI;
                const a3 = a0 + 2 * Math.PI - 0.0001;

                const samplePath = sampleCardOrders.length > 0 ? describeArc(50, 50, 38, a0, a1) : null;
                const partialPath = partialCardOrders.length > 0 ? describeArc(50, 50, 38, a1, a2) : null;
                const completePath = completeCardOrders.length > 0 ? describeArc(50, 50, 38, a2, a3) : null;

                return (
                  <>
                    {samplePath && (
                      <path
                        d={samplePath}
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth={hoveredSlice === 'sample' ? 20 : 16}
                        className="donut-slice"
                        pointerEvents="stroke"
                        style={{
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          filter: hoveredSlice === 'sample' ? 'drop-shadow(0 4px 10px rgba(2, 132, 199, 0.5))' : 'none',
                          opacity: hoveredSlice && hoveredSlice !== 'sample' ? 0.45 : 1,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/orders/view/sample');
                        }}
                        onMouseEnter={() => setHoveredSlice('sample')}
                      />
                    )}
                    {partialPath && (
                      <path
                        d={partialPath}
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth={hoveredSlice === 'partial' ? 20 : 16}
                        className="donut-slice"
                        pointerEvents="stroke"
                        style={{
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          filter: hoveredSlice === 'partial' ? 'drop-shadow(0 4px 10px rgba(124, 58, 237, 0.5))' : 'none',
                          opacity: hoveredSlice && hoveredSlice !== 'partial' ? 0.45 : 1,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/orders/view/partial');
                        }}
                        onMouseEnter={() => setHoveredSlice('partial')}
                      />
                    )}
                    {completePath && (
                      <path
                        d={completePath}
                        fill="none"
                        stroke="#059669"
                        strokeWidth={hoveredSlice === 'complete' ? 20 : 16}
                        className="donut-slice"
                        pointerEvents="stroke"
                        style={{
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          filter: hoveredSlice === 'complete' ? 'drop-shadow(0 4px 10px rgba(5, 150, 105, 0.5))' : 'none',
                          opacity: hoveredSlice && hoveredSlice !== 'complete' ? 0.45 : 1,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/orders/view/complete');
                        }}
                        onMouseEnter={() => setHoveredSlice('complete')}
                      />
                    )}
                  </>
                );
              })()}
            </svg>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                userSelect: 'none',
                zIndex: 2,
              }}
            >
              {hoveredSlice === 'sample' ? (
                <>
                  <span style={{ fontSize: '10px', color: '#0284c7', fontWeight: 800, letterSpacing: '0.5px' }}>SAMPLE</span>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#0284c7', lineHeight: 1.1 }}>{sampleCardOrders.length}</span>
                  <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600 }}>{samplePct}%</span>
                </>
              ) : hoveredSlice === 'partial' ? (
                <>
                  <span style={{ fontSize: '10px', color: '#7c3aed', fontWeight: 800, letterSpacing: '0.5px' }}>PARTIAL</span>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#7c3aed', lineHeight: 1.1 }}>{partialCardOrders.length}</span>
                  <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 600 }}>{partialPct}%</span>
                </>
              ) : hoveredSlice === 'complete' ? (
                <>
                  <span style={{ fontSize: '10px', color: '#059669', fontWeight: 800, letterSpacing: '0.5px' }}>COMPLETE</span>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#059669', lineHeight: 1.1 }}>{completeCardOrders.length}</span>
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>{completePct}%</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>TOTAL</span>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{totalOrdersCount}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Orders</span>
                </>
              )}
            </div>
          </div>

          <div className="donut-legend-simple">
            <div
              className={`donut-legend-row ${hoveredSlice === 'sample' ? 'active-hover' : ''}`}
              onClick={() => navigate('/orders/view/sample')}
              onMouseEnter={() => setHoveredSlice('sample')}
              onMouseLeave={() => setHoveredSlice(null)}
              style={{ cursor: 'pointer' }}
              title="Click to view Sample Orders Table"
            >
              <span className="donut-legend-left">
                <span className="donut-dot-marker" style={{ background: '#0284c7' }}></span> Sample
              </span>
              <span className="donut-legend-right">
                {sampleCardOrders.length} ({samplePct}%) <ChevronRight size={12} color="#94a3b8" style={{ marginLeft: '4px' }} />
              </span>
            </div>

            <div
              className={`donut-legend-row ${hoveredSlice === 'partial' ? 'active-hover' : ''}`}
              onClick={() => navigate('/orders/view/partial')}
              onMouseEnter={() => setHoveredSlice('partial')}
              onMouseLeave={() => setHoveredSlice(null)}
              style={{ cursor: 'pointer' }}
              title="Click to view Partial Orders Table"
            >
              <span className="donut-legend-left">
                <span className="donut-dot-marker" style={{ background: '#7c3aed' }}></span> Partial
              </span>
              <span className="donut-legend-right">
                {partialCardOrders.length} ({partialPct}%) <ChevronRight size={12} color="#94a3b8" style={{ marginLeft: '4px' }} />
              </span>
            </div>

            <div
              className={`donut-legend-row ${hoveredSlice === 'complete' ? 'active-hover' : ''}`}
              onClick={() => navigate('/orders/view/complete')}
              onMouseEnter={() => setHoveredSlice('complete')}
              onMouseLeave={() => setHoveredSlice(null)}
              style={{ cursor: 'pointer' }}
              title="Click to view Complete Orders Table"
            >
              <span className="donut-legend-left">
                <span className="donut-dot-marker" style={{ background: '#059669' }}></span> Complete
              </span>
              <span className="donut-legend-right">
                {completeCardOrders.length} ({completePct}%) <ChevronRight size={12} color="#94a3b8" style={{ marginLeft: '4px' }} />
              </span>
            </div>
          </div>

          <div className="order-chart-footer" style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Click slice or row to view data table</span>
            <button className="order-open-link" onClick={() => navigate('/orders/view/all')}>
              <span>Open Table</span> <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Repeat Customer Rate Widget */}
        <div className="order-chart-card repeat-rate-card">
          <div className="card-header-clean">
            <div>
              <h3>Repeat Customer Rate</h3>
              <p>Live calculated from leads</p>
            </div>
            <button 
              className="clean-icon-btn" 
              title="Click to view details" 
              onClick={() => setShowRepeatDetailsModal(true)}
            >
              <HelpCircle size={17} />
            </button>
          </div>

          <div className="repeat-gauge-body">
            <svg viewBox="0 0 200 115" className="repeat-gauge-svg">
              <defs>
                <linearGradient id="orderGaugeActiveGrad" x1="0" y1="0" x2="1" y2="0">
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
                      stroke={isActive ? "url(#orderGaugeActiveGrad)" : "#e2e8f0"}
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

      {/* 4. RECENT ORDERS & INQUIRIES TABLE */}
      <div className="order-chart-card" style={{ marginTop: '4px' }}>
        <div className="order-chart-header">
          {isSales ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                className={`table-tab-btn ${tableTab === "orders" ? "active" : ""}`}
                onClick={() => setTableTab("orders")}
              >
                Confirmed Orders ({orders.length})
              </button>
              <button
                className={`table-tab-btn ${tableTab === "inquiries" ? "active" : ""}`}
                onClick={() => setTableTab("inquiries")}
              >
                Open Inquiries ({inquiries.length})
              </button>
            </div>
          ) : (
            <div>
              <h3>Recent Orders</h3>
              <p>Click any row to open and edit order</p>
            </div>
          )}
          <button
            className="order-open-link"
            onClick={fetchLeads}
            title="Refresh database"
            style={{ fontSize: '12px' }}
          >
            <RefreshCw size={13} className={loading ? "spin-animation" : ""} /> Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {tableTab === "orders" ? (
            <table className="clean-orders-table">
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Company</th>
                  <th>Pipeline</th>
                  <th>Current Stage</th>
                  <th>Quantity</th>
                  <th>Repeat Customer</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      No orders found yet.
                    </td>
                  </tr>
                ) : (
                  orders.slice(0, 10).map((order) => (
                    <tr
                      key={order._id}
                      className="table-row-hover"
                      onClick={() => navigate(`/order/create-lead?id=${order._id}&from=${encodeURIComponent(`/order/${order.normStage}/${order.normSub}`)}&stage=${order.normStage}`)}
                      title="Click to open and edit this order"
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700 }}>
                            {order.clientName || 'Unnamed Client'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {order.orderId || 'ORD-NEW'}
                          </span>
                        </div>
                      </td>
                      <td>{order.companyName || '—'}</td>
                      <td>
                        <span className={`status-badge-pill ${order.normStage}`}>
                          {order.normStage}
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {order.normSub.replace(/-/g, ' ')}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {order.totalQuantity ? `${order.totalQuantity} pcs` : '—'}
                      </td>
                      <td>
                        {(order.repeatedOrder || '').toLowerCase().trim() === 'yes' ? (
                          <span className="repeat-tag yes" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                            Repeat
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>First-time</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', color: '#94a3b8' }}>
                        <ArrowUpRight size={15} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="clean-orders-table">
              <thead>
                <tr>
                  <th>Client / Prospect</th>
                  <th>Company</th>
                  <th>Phone Number</th>
                  <th>Scheduled Date</th>
                  <th>Note / Requirement</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      No active inquiries right now.
                    </td>
                  </tr>
                ) : (
                  inquiries.slice(0, 10).map((inq) => (
                    <tr
                      key={inq._id}
                      className="table-row-hover"
                      onClick={() => navigate(`/order/create-lead?id=${inq._id}`)}
                      title="Click to open and convert inquiry"
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700 }}>
                            {inq.clientName || 'Unnamed Prospect'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#2563eb' }}>
                            Inquiry Lead
                          </span>
                        </div>
                      </td>
                      <td>{inq.companyName || '—'}</td>
                      <td>{inq.phoneNumber || '—'}</td>
                      <td>{inq.scheduleDate ? `${inq.scheduleDate} ${inq.scheduleTime || ''}` : 'Flexible'}</td>
                      <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inq.additionalNote || inq.queryStatus || 'New prospect inquiry'}
                      </td>
                      <td>
                        <span className="badge-lead-tag" style={{ cursor: "pointer" }}>
                          Open Lead <ArrowUpRight size={12} style={{ display: "inline" }} />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
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
                  <p>Total Orders</p>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px 0", color: "#0f172a" }}>
                  Repeat Customer Accounts ({repeatCustomerStats.repeatLeads.length})
                </h4>
                <div className="repeat-leads-table-wrapper">
                  <table className="repeat-leads-table">
                    <thead>
                      <tr>
                        <th>Client / Account</th>
                        <th>Stage</th>
                        <th>Quantity</th>
                        <th>Repeat Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repeatCustomerStats.repeatLeads.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: "center", color: "#64748b", padding: "24px 16px" }}>
                            No repeat orders found for this profile. When creating leads, select &quot;Repeated Order: Yes&quot; to track them here.
                          </td>
                        </tr>
                      ) : (
                        repeatCustomerStats.repeatLeads.map((lead, idx) => (
                          <tr key={lead._id || idx}>
                            <td>
                              <strong>{lead.clientName || lead.companyName || `Client #${idx + 1}`}</strong>
                              {lead.orderId && (
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{lead.orderId}</div>
                              )}
                            </td>
                            <td style={{ textTransform: "capitalize" }}>{lead.normStage || lead.orderStage || "Sample"}</td>
                            <td>{lead.totalQuantity ? `${lead.totalQuantity} pcs` : "—"}</td>
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
  );
}
