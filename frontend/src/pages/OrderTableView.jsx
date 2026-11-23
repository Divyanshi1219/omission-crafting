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
  FileText,
  ShieldCheck,
  User,
  Users2,
  ArrowRightLeft,
  X
} from "lucide-react";
import "./OrderDashboard.css";
import { matchesEmployeeName } from "../components/BackupEmployeeWidget";

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
  const filterParam = searchParams.get('filter');
  const backupTabParam = searchParams.get('backupTab');
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isSales = currentUser?.role === "Sales Executive" || currentUser?.id?.startsWith("sales");
  const isAdmin =
    currentUser?.id === "admin" ||
    currentUser?.role === "CEO" ||
    (currentUser?.name || "").toLowerCase().startsWith("adam") ||
    (currentUser?.department || "").toLowerCase() === "ceo";

  const [backupTab, setBackupTab] = useState(() => backupTabParam || (isAdmin ? "all" : "incoming"));

  useEffect(() => {
    if (backupTabParam) {
      setBackupTab(backupTabParam);
    }
  }, [backupTabParam]);

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
        const leadBackup = (l.backupEmployee || '').toLowerCase().trim();
        const isOwner =
          (currentEmp.startsWith('divyansh') || currentId === 'sales') &&
          (leadEmp.startsWith('divyansh') || leadEmp === 'sales executive' || leadCreatedBy === 'sales');
        const isBackup = Boolean(
          leadBackup && (
            (leadBackup === currentEmp || leadBackup.includes(currentEmp) || currentEmp.includes(leadBackup)) ||
            (currentEmp.startsWith('divyansh') && leadBackup.startsWith('divyansh')) ||
            (currentEmp.startsWith('karan') && leadBackup.startsWith('karan'))
          )
        );
        return isOwner || (leadEmp && leadEmp === currentEmp) || isBackup;
      });
    }

    return valid.map(normalizeRecord);
  }, [leads, isSales, currentUser]);

  const currentEmpName = currentUser?.name || '';

  // Incoming: orders where logged-in user is assigned as backup (covering for a colleague)
  const incomingBackupOrders = useMemo(() => {
    return allOrders.filter(o => {
      const backup = (o.backupEmployee || '').trim();
      const owner = (o.employeeName || '').trim();
      if (!backup || backup.toLowerCase() === 'none') return false;
      return matchesEmployeeName(backup, currentEmpName) && !matchesEmployeeName(owner, currentEmpName);
    });
  }, [allOrders, currentEmpName]);

  // Outgoing: orders owned by logged-in user that have a backup assigned while away
  const outgoingBackupOrders = useMemo(() => {
    return allOrders.filter(o => {
      const backup = (o.backupEmployee || '').trim();
      const owner = (o.employeeName || '').trim();
      if (!backup || backup.toLowerCase() === 'none') return false;
      return matchesEmployeeName(owner, currentEmpName) && !matchesEmployeeName(backup, currentEmpName);
    });
  }, [allOrders, currentEmpName]);

  // All active backup delegations company-wide
  const allBackupOrders = useMemo(() => {
    return allOrders.filter(o => {
      const backup = (o.backupEmployee || '').trim();
      return Boolean(backup && backup.toLowerCase() !== 'none');
    });
  }, [allOrders]);

  // Stage-scoped orders (respecting filter=backup and active backupTab)
  const stageOrders = useMemo(() => {
    let base = allOrders;
    if (filterParam === 'backup') {
      if (backupTab === 'incoming') {
        base = incomingBackupOrders;
      } else if (backupTab === 'outgoing') {
        base = outgoingBackupOrders;
      } else {
        base = allBackupOrders;
      }
    }
    if (stage === 'all') return base;
    return base.filter(o => o.normStage === stage);
  }, [allOrders, stage, filterParam, backupTab, incomingBackupOrders, outgoingBackupOrders, allBackupOrders]);

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
    if (filterParam === 'backup') {
      const tabTitle = backupTab === 'incoming'
        ? 'Covering For Others'
        : (backupTab === 'outgoing' ? 'Delegated While Away' : 'All Active Delegations');
      return {
        title: `Backup Handover: ${tabTitle}`,
        color: backupTab === 'incoming' ? '#10b981' : (backupTab === 'outgoing' ? '#3b82f6' : '#8b5cf6'),
        subStages: [
          { key: 'all', label: 'All Sub-Stages' },
          { key: 'order', label: 'Review' },
          { key: 'dtf-pending', label: 'DTF Pending' },
          { key: 'stock', label: 'Stock' },
          { key: 'printing', label: 'Printing' },
          { key: 'ready-to-pick-up', label: 'Ready to Pick Up' },
          { key: 'quality-check', label: 'Quality Check' },
          { key: 'packaging', label: 'Packaging' },
          { key: 'delivery-pending', label: 'Delivery Pending' },
          { key: 'delivered', label: 'Delivered' },
          { key: 'customer-support', label: 'Customer Support' }
        ]
      };
    }
    if (stage === 'sample') {
      return {
        title: 'Sample Orders Pipeline',
        color: '#0284c7',
        subStages: [
          { key: 'all', label: 'All Sub-Stages' },
          { key: 'order', label: 'Review' },
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
          { key: 'order', label: 'Review' },
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
          { key: 'order', label: 'Review' },
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
        { key: 'order', label: 'Review' },
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

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="order-simple-dashboard" style={{ padding: '4px 0 24px 0' }}>
      {/* Top Header with Back to Dashboard button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={handleBack}
            title="Go to previous page"
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

      {/* Handover Tabs Banner when filter=backup */}
      {filterParam === 'backup' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1px solid #cbd5e1',
          borderRadius: '16px',
          padding: '12px 18px',
          marginBottom: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px' }}>
              <ShieldCheck size={17} color="#10b981" /> Handover Tabs:
            </span>
            <button
              type="button"
              onClick={() => {
                setBackupTab('incoming');
                navigate(`/orders/view/${stage}?filter=backup&backupTab=incoming`, { replace: true });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: backupTab === 'incoming' ? '1px solid #10b981' : '1px solid #cbd5e1',
                background: backupTab === 'incoming' ? '#ecfdf5' : '#ffffff',
                color: backupTab === 'incoming' ? '#065f46' : '#475569',
                boxShadow: backupTab === 'incoming' ? '0 2px 6px rgba(16, 185, 129, 0.2)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span>📥 Covering For Others</span>
              <span style={{ padding: '1px 7px', borderRadius: '10px', background: backupTab === 'incoming' ? '#10b981' : '#f1f5f9', color: backupTab === 'incoming' ? '#ffffff' : '#64748b', fontSize: '11px', fontWeight: 700 }}>
                {incomingBackupOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBackupTab('outgoing');
                navigate(`/orders/view/${stage}?filter=backup&backupTab=outgoing`, { replace: true });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: backupTab === 'outgoing' ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                background: backupTab === 'outgoing' ? '#eff6ff' : '#ffffff',
                color: backupTab === 'outgoing' ? '#1e40af' : '#475569',
                boxShadow: backupTab === 'outgoing' ? '0 2px 6px rgba(59, 130, 246, 0.2)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span>📤 Delegated While Away</span>
              <span style={{ padding: '1px 7px', borderRadius: '10px', background: backupTab === 'outgoing' ? '#3b82f6' : '#f1f5f9', color: backupTab === 'outgoing' ? '#ffffff' : '#64748b', fontSize: '11px', fontWeight: 700 }}>
                {outgoingBackupOrders.length}
              </span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setBackupTab('all');
                  navigate(`/orders/view/${stage}?filter=backup&backupTab=all`, { replace: true });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: backupTab === 'all' ? '1px solid #8b5cf6' : '1px solid #cbd5e1',
                  background: backupTab === 'all' ? '#f5f3ff' : '#ffffff',
                  color: backupTab === 'all' ? '#5b21b6' : '#475569',
                  boxShadow: backupTab === 'all' ? '0 2px 6px rgba(139, 92, 246, 0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>🏢 All Active Delegations</span>
                <span style={{ padding: '1px 7px', borderRadius: '10px', background: backupTab === 'all' ? '#8b5cf6' : '#f1f5f9', color: backupTab === 'all' ? '#ffffff' : '#64748b', fontSize: '11px', fontWeight: 700 }}>
                  {allBackupOrders.length}
                </span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate(`/orders/view/${stage}`, { replace: true })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#64748b',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 600
            }}
            title="Clear handover filter and view all pipeline orders"
          >
            <X size={13} /> View All Orders
          </button>
        </div>
      )}

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
          {/* Quick Handover Mode Pill if not currently active */}
          {filterParam !== 'backup' && (incomingBackupOrders.length > 0 || outgoingBackupOrders.length > 0 || allBackupOrders.length > 0) && (
            <button
              type="button"
              onClick={() => navigate(`/orders/view/${stage}?filter=backup&backupTab=${isSales ? (incomingBackupOrders.length > 0 ? 'incoming' : 'outgoing') : 'all'}`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #a7f3d0',
                background: '#ecfdf5',
                color: '#065f46',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Filter to orders with active backup employee delegation"
            >
              <ShieldCheck size={14} color="#059669" />
              <span>Backup Orders ({isSales ? incomingBackupOrders.length + outgoingBackupOrders.length : allBackupOrders.length})</span>
            </button>
          )}

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
                {filterParam === 'backup' && <th>Handover Assignment</th>}
                <th>Pipeline</th>
                <th>Current Sub-Stage</th>
                <th>Quantity</th>
                <th>Order Amount</th>
                <th>Delivery Date</th>
                <th>Repeat Customer</th>
              </tr>
            </thead>
            <tbody>
              {loading && filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={filterParam === 'backup' ? 10 : 9} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <Clock size={22} className="spin-animation" style={{ marginBottom: '8px' }} />
                    <div>Loading orders...</div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={filterParam === 'backup' ? 10 : 9} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                    No orders found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="table-row-hover"
                    onClick={() => navigate(`/order/create-lead?id=${order._id}&from=${encodeURIComponent(`/orders/view/${order.normStage}${filterParam === 'backup' ? `?filter=backup&backupTab=${backupTab}` : ''}`)}&stage=${order.normStage}`)}
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
                    <td>
                      <div>
                        <span>{order.companyName || '—'}</span>
                        {order.backupEmployee && (
                          <div style={{ marginTop: '2px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: '#ecfdf5',
                              color: '#065f46',
                              fontSize: '10px',
                              fontWeight: 600
                            }}>
                              <ShieldCheck size={10} color="#10b981" /> Backup: {order.backupEmployee}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    {filterParam === 'backup' && (
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0f172a', fontWeight: 600 }}>
                            <User size={12} color="#64748b" /> {order.employeeName || 'Sales Executive'}
                            <span style={{ color: '#94a3b8' }}>➔</span>
                            <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <ShieldCheck size={12} /> {order.backupEmployee}
                            </span>
                          </span>
                          <span style={{
                            fontSize: '10px',
                            color: matchesEmployeeName(order.backupEmployee, currentEmpName) ? '#059669' : '#3b82f6',
                            fontWeight: 600
                          }}>
                            {matchesEmployeeName(order.backupEmployee, currentEmpName)
                              ? '• Covering on behalf of colleague'
                              : (matchesEmployeeName(order.employeeName, currentEmpName) ? '• Covered while you are away' : '• Company Delegation')}
                          </span>
                        </div>
                      </td>
                    )}
                    <td>
                      <span className={`status-badge-pill ${order.normStage}`}>
                        {order.normStage}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {order.normSub === 'order' ? 'Review' : order.normSub.replace(/-/g, ' ')}
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

