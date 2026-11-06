import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Package,
  Layers,
  Calendar,
  AlertTriangle,
  FileText
} from "lucide-react";
import "./OrderDashboard.css";

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

export default function OrderTableView() {
  const { stage: rawStage } = useParams();
  const [searchParams] = useSearchParams();
  const subParam = searchParams.get('sub');
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isSales = currentUser?.role === "Sales Executive" || currentUser?.id?.startsWith("sales");

  const stage = (rawStage || 'all').toLowerCase();

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
  const [searchQuery, setSearchQuery] = useState("");
  const [subStageFilter, setSubStageFilter] = useState(() => subParam || "all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [repeatFilter, setRepeatFilter] = useState("all");

  useEffect(() => {
    if (subParam) {
      setSubStageFilter(subParam);
    } else {
      setSubStageFilter("all");
    }
  }, [subParam]);

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
      console.error('Failed to load orders for table view:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Filter leads to valid orders (and isolate by sales executive if logged in as sales)
  const allOrders = useMemo(() => {
    let valid = leads.filter(l => l.query === 'order' || l.orderStage || l.totalQuantity);

    if (isSales && currentUser?.name) {
      const currentEmp = currentUser.name.toLowerCase().trim();
      const currentId = (currentUser?.id || '').toLowerCase();
      valid = valid.filter(l => {
        const leadEmp = (l.employeeName || '').toLowerCase().trim();
        const leadCreatedBy = (l.createdBy || '').toLowerCase();
        const isOwner =
          (currentEmp.startsWith('divyansh') || currentId === 'sales') &&
          (leadEmp.startsWith('divyansh') || leadEmp === 'sales executive' || leadCreatedBy === 'sales');
        return isOwner || (leadEmp && leadEmp === currentEmp);
      });
    }

    return valid.map(normalizeRecord);
  }, [leads, isSales, currentUser]);

  // Stage-scoped orders
  const stageOrders = useMemo(() => {
    if (stage === 'all') return allOrders;
    return allOrders.filter(o => o.normStage === stage);
  }, [allOrders, stage]);

  // Apply search and sub-stage filters
  const filteredOrders = useMemo(() => {
    return stageOrders.filter(o => {
      // Sub-stage filter
      if (subStageFilter !== 'all') {
        const target = subStageFilter.toLowerCase();
        const oSub = (o.normSub || '').toLowerCase();
        const isMatch =
          oSub === target ||
          (target === 'customer-approval-awaiting' && (oSub === 'customer-approved' || oSub === 'approved')) ||
          (target === 'customer-approved' && (oSub === 'customer-approval-awaiting' || oSub === 'approved')) ||
          (target === 'staging-ground' && oSub === 'staging-room') ||
          (target === 'staging-room' && oSub === 'staging-ground') ||
          (target === 'payment-confirmation' && oSub === 'payment-status') ||
          (target === 'payment-status' && oSub === 'payment-confirmation') ||
          (target === 'delivered' && oSub === 'delivery') ||
          (target === 'delivery' && oSub === 'delivered') ||
          (target === 'customer-support' && (oSub === 'support' || oSub === 'archived')) ||
          (target === 'support' && (oSub === 'customer-support' || oSub === 'archived')) ||
          (target === 'order' && (!oSub || oSub === 'order' || oSub === 'new' || oSub === 'leads'));

        if (!isMatch) return false;
      }
      // Urgency filter
      if (urgencyFilter === 'urgent') {
        const urg = (o.urgency || '').toLowerCase();
        if (urg !== 'yes' && urg !== 'urgent') return false;
      }
      // Repeat customer filter
      if (repeatFilter === 'repeat') {
        if ((o.repeatedOrder || '').toLowerCase().trim() !== 'yes') return false;
      } else if (repeatFilter === 'first_time') {
        if ((o.repeatedOrder || '').toLowerCase().trim() === 'yes') return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchClient = (o.clientName || '').toLowerCase().includes(q);
        const matchCompany = (o.companyName || '').toLowerCase().includes(q);
        const matchOrder = (o.orderId || '').toLowerCase().includes(q);
        const matchPhone = (o.phoneNumber || '').toLowerCase().includes(q);
        return matchClient || matchCompany || matchOrder || matchPhone;
      }
      return true;
    });
  }, [stageOrders, subStageFilter, urgencyFilter, repeatFilter, searchQuery]);

  const totalPieces = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (Number(o.totalQuantity) || 0), 0);
  }, [filteredOrders]);

  // Stage titles and theme colors
  const stageMeta = useMemo(() => {
    if (stage === 'sample') {
      return {
        title: 'Sample Orders Pipeline',
        color: '#0284c7',
        subStages: [
          { key: 'all', label: 'All Sub-Stages' },
          { key: 'order', label: 'Order' },
          { key: 'dtf-pending', label: 'DTF Pending' },
          { key: 'stock', label: 'Stock' },
          { key: 'printing', label: 'Printing' },
          { key: 'ready-to-pick-up', label: 'Ready to Pick Up' },
          { key: 'staging-ground', label: 'Staging Ground' },
          { key: 'customer-approval-awaiting', label: 'Customer Approved' }
        ]
      };
    }
    if (stage === 'partial') {
      return {
        title: 'Partial Orders Pipeline',
        color: '#7c3aed',
        subStages: [
          { key: 'all', label: 'All Sub-Stages' },
          { key: 'order', label: 'Order' },
          { key: 'dtf-pending', label: 'DTF Pending' },
          { key: 'stock', label: 'Stock' },
          { key: 'printing', label: 'Printing' },
          { key: 'quality-check', label: 'Quality Check' },
          { key: 'packaging', label: 'Packaging' },
          { key: 'staging-room', label: 'Staging Room' },
          { key: 'payment-confirmation', label: 'Payment Confirmation' }
        ]
      };
    }
    if (stage === 'complete') {
      return {
        title: 'Complete Orders Pipeline',
        color: '#059669',
        subStages: [
          { key: 'all', label: 'All Sub-Stages' },
          { key: 'order', label: 'Order' },
          { key: 'dtf-pending', label: 'DTF Pending' },
          { key: 'stock', label: 'Stock' },
          { key: 'printing', label: 'Printing' },
          { key: 'quality-check', label: 'Quality Check' },
          { key: 'packaging', label: 'Packaging' },
          { key: 'delivery-pending', label: 'Delivery Pending' },
          { key: 'delivered', label: 'Delivered' },
          { key: 'customer-support', label: 'Customer Support' }
        ]
      };
    }
    return {
      title: 'All Orders Pipeline',
      color: '#2563eb',
      subStages: [
        { key: 'all', label: 'All Sub-Stages' },
        { key: 'order', label: 'Order' },
        { key: 'dtf-pending', label: 'DTF Pending' },
        { key: 'stock', label: 'Stock' },
        { key: 'printing', label: 'Printing' },
        { key: 'quality-check', label: 'Quality Check' },
        { key: 'packaging', label: 'Packaging' },
        { key: 'delivery', label: 'Delivery' },
        { key: 'customer-support', label: 'Customer Support' }
      ]
    };
  }, [stage]);

  return (
    <div className="order-simple-dashboard" style={{ padding: '4px 0 24px 0' }}>
      {/* Top Header with Back to Dashboard button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="donut-dot-marker" style={{ background: stageMeta.color, width: '12px', height: '12px', borderRadius: '50%' }}></span>
              {stageMeta.title}
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Showing {filteredOrders.length} orders • {totalPieces.toLocaleString('en-IN')} pcs total in pipeline
            </p>
          </div>
        </div>

        {/* Refresh button */}
        <button
          className="clean-icon-btn"
          onClick={fetchLeads}
          title="Refresh database"
          style={{ padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', cursor: 'pointer' }}
        >
          <RefreshCw size={14} className={loading ? "spin-animation" : ""} /> Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 14px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', minWidth: '260px', flex: '1 1 280px' }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by client, order ID, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: '#0f172a' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '12px' }}>
              ✕
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Sub-stage filter */}
          <select
            value={subStageFilter}
            onChange={(e) => setSubStageFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '13px', color: '#334155', outline: 'none', cursor: 'pointer' }}
          >
            {stageMeta.subStages.map(sub => (
              <option key={sub.key} value={sub.key}>{sub.label}</option>
            ))}
          </select>

          {/* Urgency filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '13px', color: '#334155', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">All Urgencies</option>
            <option value="urgent">Urgent Only</option>
          </select>

          {/* Repeat Order filter */}
          <select
            value={repeatFilter}
            onChange={(e) => setRepeatFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '13px', color: '#334155', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">All Customers</option>
            <option value="repeat">Repeat Orders Only</option>
            <option value="first_time">First-Time Orders</option>
          </select>
        </div>
      </div>

      {/* Main Orders Data Table Card */}
      <div className="order-chart-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="clean-orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Client Name</th>
                <th>Company</th>
                <th>Pipeline</th>
                <th>Current Sub-Stage</th>
                <th>Quantity</th>
                <th>Order Amount</th>
                <th>Delivery Date</th>
                <th>Repeat Customer</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <Clock size={22} className="spin-animation" style={{ marginBottom: '8px' }} />
                    <div>Loading orders...</div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                    No orders found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="table-row-hover"
                    onClick={() => navigate(`/order/create-lead?id=${order._id}&from=${encodeURIComponent(`/order/${order.normStage}/${order.normSub}`)}&stage=${order.normStage}`)}
                    title="Click to open and edit order"
                  >
                    <td>
                      <span style={{ fontWeight: 700, color: '#2563eb' }}>
                        {order.orderId || 'ORD-NEW'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {order.clientName || 'Unnamed Client'}
                      </span>
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
                      {order.totalQuantity ? `${Number(order.totalQuantity).toLocaleString('en-IN')} pcs` : '—'}
                    </td>
                    <td style={{ fontWeight: 600, color: '#059669' }}>
                      {order.totalAmount ? `₹${Number(order.totalAmount).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td>
                      {order.deliveryDate ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                          <Calendar size={12} color="#64748b" />
                          {order.deliveryDate}
                        </span>
                      ) : (
                        '—'
                      )}
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
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#2563eb',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        View <ArrowUpRight size={13} />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

