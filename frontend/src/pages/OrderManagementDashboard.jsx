import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
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
  Package
} from "lucide-react";
import "./OrderDashboard.css";

// Exact child side menu stages from Sidebar.jsx
const SAMPLE_STAGES = [
  { key: 'order', shortLabel: 'Order', fullLabel: 'Order', path: '/order/sample/order' },
  { key: 'dtf-pending', shortLabel: 'DTF', fullLabel: 'DTF Pending', path: '/order/sample/dtf-pending' },
  { key: 'stock', shortLabel: 'Stock', fullLabel: 'Stock', path: '/order/sample/stock' },
  { key: 'printing', shortLabel: 'Printing', fullLabel: 'Printing', path: '/order/sample/printing' },
  { key: 'customer-approved', shortLabel: 'Approved', fullLabel: 'Customer Approved', path: '/order/sample/customer-approved' },
];

const PARTIAL_STAGES = [
  { key: 'order', shortLabel: 'Order', fullLabel: 'Order', path: '/order/partial/order' },
  { key: 'dtf-pending', shortLabel: 'DTF', fullLabel: 'DTF Pending', path: '/order/partial/dtf-pending' },
  { key: 'stock', shortLabel: 'Stock', fullLabel: 'Stock', path: '/order/partial/stock' },
  { key: 'printing', shortLabel: 'Printing', fullLabel: 'Printing', path: '/order/partial/printing' },
  { key: 'quality-check', shortLabel: 'QC', fullLabel: 'Quality Check', path: '/order/partial/quality-check' },
  { key: 'payment-status', shortLabel: 'Payment', fullLabel: 'Payment Status', path: '/order/partial/payment-status' },
];

const COMPLETE_STAGES = [
  { key: 'order', shortLabel: 'Order', fullLabel: 'Order', path: '/order/complete/order' },
  { key: 'dtf-pending', shortLabel: 'DTF', fullLabel: 'DTF Pending', path: '/order/complete/dtf-pending' },
  { key: 'stock', shortLabel: 'Stock', fullLabel: 'Stock', path: '/order/complete/stock' },
  { key: 'printing', shortLabel: 'Printing', fullLabel: 'Printing', path: '/order/complete/printing' },
  { key: 'quality-check', shortLabel: 'QC', fullLabel: 'Quality Check', path: '/order/complete/quality-check' },
  { key: 'packaging', shortLabel: 'Package', fullLabel: 'Packaging', path: '/order/complete/packaging' },
  { key: 'delivery-pending', shortLabel: 'Pending', fullLabel: 'Delivery Pending', path: '/order/complete/delivery-pending' },
  { key: 'delivery', shortLabel: 'Delivery', fullLabel: 'Delivery', path: '/order/complete/delivery' },
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
  return { ...lead, normStage: stage, normSub: sub };
};

export default function OrderManagementDashboard() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState(null);

  // Fetch real leads data from backend
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/leads');
      if (res.data?.data) {
        setLeads(res.data.data);
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

  // Filter leads to valid orders
  const orders = useMemo(() => {
    return leads
      .filter(l => l.query === 'order' || l.orderStage || l.totalQuantity)
      .map(normalizeRecord);
  }, [leads]);

  // Totals for top 3 cards
  const sampleOrders = useMemo(() => orders.filter(o => o.normStage === 'sample'), [orders]);
  const partialOrders = useMemo(() => orders.filter(o => o.normStage === 'partial'), [orders]);
  const completeOrders = useMemo(() => orders.filter(o => o.normStage === 'complete'), [orders]);

  // Stage counts for each pipeline with quantity sums
  const sampleCounts = useMemo(() => {
    return SAMPLE_STAGES.map(s => {
      const matched = sampleOrders.filter(o => o.normSub === s.key);
      return {
        ...s,
        count: matched.length,
        quantity: matched.reduce((sum, o) => sum + (Number(o.totalQuantity) || 0), 0),
      };
    });
  }, [sampleOrders]);

  const partialCounts = useMemo(() => {
    return PARTIAL_STAGES.map(s => {
      const matched = partialOrders.filter(o => o.normSub === s.key);
      return {
        ...s,
        count: matched.length,
        quantity: matched.reduce((sum, o) => sum + (Number(o.totalQuantity) || 0), 0),
      };
    });
  }, [partialOrders]);

  const completeCounts = useMemo(() => {
    return COMPLETE_STAGES.map(s => {
      const matched = completeOrders.filter(o => o.normSub === s.key);
      return {
        ...s,
        count: matched.length,
        quantity: matched.reduce((sum, o) => sum + (Number(o.totalQuantity) || 0), 0),
      };
    });
  }, [completeOrders]);

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

            return (
              <g
                key={item.key}
                className="chart-bar-group"
                onClick={() => navigate(item.path)}
                onMouseEnter={() => setHoveredBar({ ...item, pipeline: pipelineKey })}
                onMouseLeave={() => setHoveredBar(null)}
                title={`${item.fullLabel}: ${item.count} order${item.count === 1 ? '' : 's'} (${item.quantity} pcs) - Click to open`}
              >
                {/* Number above the bar */}
                <text
                  x={x + colWidth / 2}
                  y={hasData ? y - 6 : baselineY - 10}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill={isHovered ? barColor : (hasData ? "#0f172a" : "#94a3b8")}
                >
                  {item.count}
                </text>

                {/* Vertical Bar */}
                <rect
                  x={x}
                  y={y}
                  width={colWidth}
                  height={barH}
                  rx="6"
                  fill={hasData ? barColor : "#e2e8f0"}
                  style={{
                    opacity: isHovered ? 1 : (hasData ? 0.9 : 0.6),
                    filter: isHovered ? `drop-shadow(0 4px 8px ${barColor}66)` : 'none'
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

  const totalOrdersCount = orders.length;
  const samplePct = totalOrdersCount > 0 ? Math.round((sampleOrders.length / totalOrdersCount) * 100) : 0;
  const partialPct = totalOrdersCount > 0 ? Math.round((partialOrders.length / totalOrdersCount) * 100) : 0;
  const completePct = totalOrdersCount > 0 ? Math.round((completeOrders.length / totalOrdersCount) * 100) : 0;

  return (
    <div className="order-simple-dashboard">
      {/* 1. TOP 3 BIG SUMMARY CARDS */}
      <div className="order-summary-tiles">
        {/* Sample Card */}
        <div
          className="order-tile tile-sample"
          onClick={() => navigate('/order/sample/order')}
          title="Click to open Sample Orders"
        >
          <div className="order-tile-header">
            <span className="order-tile-title">
              <span className="donut-dot-marker" style={{ background: '#0284c7' }}></span>
              Sample Orders
            </span>
            <span className="order-tile-badge sample">5 Stages</span>
          </div>
          <div className="order-tile-count" style={{ color: '#0284c7' }}>
            {sampleOrders.length}
          </div>
          <div className="order-tile-sub">
            <span>{sampleOrders.reduce((sum, o) => sum + (Number(o.totalQuantity) || 0), 0)} pcs in pipeline</span>
            <span className="tile-action-hint">View all <ArrowRight size={13} /></span>
          </div>
        </div>

        {/* Partial Card */}
        <div
          className="order-tile tile-partial"
          onClick={() => navigate('/order/partial/order')}
          title="Click to open Partial Orders"
        >
          <div className="order-tile-header">
            <span className="order-tile-title">
              <span className="donut-dot-marker" style={{ background: '#7c3aed' }}></span>
              Partial Orders
            </span>
            <span className="order-tile-badge partial">6 Stages</span>
          </div>
          <div className="order-tile-count" style={{ color: '#7c3aed' }}>
            {partialOrders.length}
          </div>
          <div className="order-tile-sub">
            <span>{partialOrders.reduce((sum, o) => sum + (Number(o.totalQuantity) || 0), 0)} pcs in production</span>
            <span className="tile-action-hint">View all <ArrowRight size={13} /></span>
          </div>
        </div>

        {/* Complete Card */}
        <div
          className="order-tile tile-complete"
          onClick={() => navigate('/order/complete/order')}
          title="Click to open Complete Orders"
        >
          <div className="order-tile-header">
            <span className="order-tile-title">
              <span className="donut-dot-marker" style={{ background: '#059669' }}></span>
              Complete Orders
            </span>
            <span className="order-tile-badge complete">8 Stages</span>
          </div>
          <div className="order-tile-count" style={{ color: '#059669' }}>
            {completeOrders.length}
          </div>
          <div className="order-tile-sub">
            <span>{completeOrders.reduce((sum, o) => sum + (Number(o.totalQuantity) || 0), 0)} pcs fulfilled</span>
            <span className="tile-action-hint">View all <ArrowRight size={13} /></span>
          </div>
        </div>
      </div>

      {/* 2. THREE DEDICATED VISUAL BAR CHARTS FOR CHILD STAGES */}
      <div className="order-charts-grid">
        {/* Chart 1: Sample Child Side Menu Stages */}
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
                    {hoveredBar.fullLabel}: {hoveredBar.count} order{hoveredBar.count === 1 ? '' : 's'} ({hoveredBar.quantity} pcs)
                  </span>
                ) : (
                  'Orders across 5 side menu stages'
                )}
              </p>
            </div>
            <span className="order-chart-badge">{sampleOrders.length} total</span>
          </div>

          {renderBarChart(sampleCounts, "#0284c7", 'sample', 340, 32)}

          <div className="order-chart-footer">
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Click bar to open stage</span>
            <button className="order-open-link" onClick={() => navigate('/order/sample/order')}>
              <span>Open Sample</span> <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Chart 2: Partial Child Side Menu Stages */}
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
                    {hoveredBar.fullLabel}: {hoveredBar.count} order{hoveredBar.count === 1 ? '' : 's'} ({hoveredBar.quantity} pcs)
                  </span>
                ) : (
                  'Orders across 6 side menu stages'
                )}
              </p>
            </div>
            <span className="order-chart-badge">{partialOrders.length} total</span>
          </div>

          {renderBarChart(partialCounts, "#7c3aed", 'partial', 360, 28)}

          <div className="order-chart-footer">
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Click bar to open stage</span>
            <button className="order-open-link" onClick={() => navigate('/order/partial/order')}>
              <span>Open Partial</span> <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Chart 3: Complete Child Side Menu Stages */}
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
                    {hoveredBar.fullLabel}: {hoveredBar.count} order{hoveredBar.count === 1 ? '' : 's'} ({hoveredBar.quantity} pcs)
                  </span>
                ) : (
                  'Orders across 8 side menu stages'
                )}
              </p>
            </div>
            <span className="order-chart-badge">{completeOrders.length} total</span>
          </div>

          {renderBarChart(completeCounts, "#059669", 'complete', 420, 24)}

          <div className="order-chart-footer">
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Click bar to open stage</span>
            <button className="order-open-link" onClick={() => navigate('/order/complete/order')}>
              <span>Open Complete</span> <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SECTION: OVERALL BREAKDOWN & RECENT ORDERS TABLE */}
      <div className="order-bottom-grid">
        {/* Simple Donut Breakdown */}
        <div className="order-chart-card">
          <div className="order-chart-header">
            <div>
              <h3>Overall Distribution</h3>
              <p>Sample vs Partial vs Complete</p>
            </div>
          </div>

          <div style={{ position: 'relative', width: '160px', height: '160px', margin: '8px auto 14px auto' }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
              {(() => {
                const total = totalOrdersCount || 1;
                const circumference = 2 * Math.PI * 38;
                const sampleArc = (sampleOrders.length / total) * circumference;
                const partialArc = (partialOrders.length / total) * circumference;
                const completeArc = (completeOrders.length / total) * circumference;

                return (
                  <>
                    {sampleOrders.length > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#0284c7"
                        strokeWidth="16"
                        strokeDasharray={`${sampleArc} ${circumference - sampleArc}`}
                        strokeDashoffset="0"
                      />
                    )}
                    {partialOrders.length > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#7c3aed"
                        strokeWidth="16"
                        strokeDasharray={`${partialArc} ${circumference - partialArc}`}
                        strokeDashoffset={-sampleArc}
                      />
                    )}
                    {completeOrders.length > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#059669"
                        strokeWidth="16"
                        strokeDasharray={`${completeArc} ${circumference - completeArc}`}
                        strokeDashoffset={-(sampleArc + partialArc)}
                      />
                    )}
                  </>
                );
              })()}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>TOTAL</span>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{totalOrdersCount}</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Orders</span>
            </div>
          </div>

          <div className="donut-legend-simple">
            <div
              className="donut-legend-row"
              onClick={() => navigate('/order/sample/order')}
              title="Click to view Sample Orders"
            >
              <span className="donut-legend-left">
                <span className="donut-dot-marker" style={{ background: '#0284c7' }}></span> Sample
              </span>
              <span className="donut-legend-right">
                {sampleOrders.length} ({samplePct}%)
              </span>
            </div>

            <div
              className="donut-legend-row"
              onClick={() => navigate('/order/partial/order')}
              title="Click to view Partial Orders"
            >
              <span className="donut-legend-left">
                <span className="donut-dot-marker" style={{ background: '#7c3aed' }}></span> Partial
              </span>
              <span className="donut-legend-right">
                {partialOrders.length} ({partialPct}%)
              </span>
            </div>

            <div
              className="donut-legend-row"
              onClick={() => navigate('/order/complete/order')}
              title="Click to view Complete Orders"
            >
              <span className="donut-legend-left">
                <span className="donut-dot-marker" style={{ background: '#059669' }}></span> Complete
              </span>
              <span className="donut-legend-right">
                {completeOrders.length} ({completePct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Clean Orders List */}
        <div className="order-chart-card">
          <div className="order-chart-header">
            <div>
              <h3>Recent Orders</h3>
              <p>Click any row to open and edit order</p>
            </div>
            <button
              className="order-open-link"
              onClick={fetchLeads}
              title="Refresh order database"
              style={{ fontSize: '12px' }}
            >
              <RefreshCw size={13} className={loading ? "spin-animation" : ""} /> Refresh
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="clean-orders-table">
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Company</th>
                  <th>Pipeline</th>
                  <th>Current Stage</th>
                  <th>Quantity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      No orders found yet.
                    </td>
                  </tr>
                ) : (
                  orders.slice(0, 7).map((order) => (
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
                      <td style={{ textAlign: 'right', color: '#94a3b8' }}>
                        <ArrowUpRight size={15} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
