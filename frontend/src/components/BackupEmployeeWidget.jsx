import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, ShieldCheck, User, Users2, ArrowRightLeft } from 'lucide-react';
import './BackupEmployeeWidget.css';

export const matchesEmployeeName = (empA, empB) => {
  if (!empA || !empB) return false;
  const a = String(empA).toLowerCase().trim();
  const b = String(empB).toLowerCase().trim();
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  if (a.startsWith('divyansh') && b.startsWith('divyansh')) return true;
  if (a.startsWith('karan') && b.startsWith('karan')) return true;
  return false;
};

export default function BackupEmployeeWidget({
  leads = [],
  currentUser = null,
  isAdmin = false,
  className = '',
}) {
  const navigate = useNavigate();
  const currentEmpName = currentUser?.name || '';

  // Filter valid orders
  const validOrders = useMemo(() => {
    return (leads || []).filter((l) => {
      const q = (l.query || '').toLowerCase().trim();
      return q !== 'lead';
    });
  }, [leads]);

  // Compute incoming, outgoing, and company-wide delegations
  const stats = useMemo(() => {
    const incoming = validOrders.filter((l) => {
      const backup = (l.backupEmployee || '').trim();
      const owner = (l.employeeName || '').trim();
      if (!backup || backup.toLowerCase() === 'none') return false;
      return matchesEmployeeName(backup, currentEmpName) && !matchesEmployeeName(owner, currentEmpName);
    });

    const outgoing = validOrders.filter((l) => {
      const backup = (l.backupEmployee || '').trim();
      const owner = (l.employeeName || '').trim();
      if (!backup || backup.toLowerCase() === 'none') return false;
      return matchesEmployeeName(owner, currentEmpName) && !matchesEmployeeName(backup, currentEmpName);
    });

    const allActive = validOrders.filter((l) => {
      const backup = (l.backupEmployee || '').trim();
      return Boolean(backup && backup.toLowerCase() !== 'none');
    });

    // Pairings map for CEO
    const pairCountMap = {};
    allActive.forEach((o) => {
      const from = (o.employeeName || 'Unknown').trim();
      const to = (o.backupEmployee || 'Backup').trim();
      const key = `${from} ➔ ${to}`;
      pairCountMap[key] = (pairCountMap[key] || 0) + 1;
    });

    const pairings = Object.entries(pairCountMap).map(([pair, count]) => ({
      pair,
      count,
    }));

    return {
      incoming,
      outgoing,
      allActive,
      incomingCount: incoming.length,
      outgoingCount: outgoing.length,
      totalCount: allActive.length,
      pairings,
    };
  }, [validOrders, currentEmpName]);

  const activeDisplayCount = isAdmin
    ? stats.totalCount
    : stats.incomingCount + stats.outgoingCount;

  const handleOpenList = (tab = 'incoming') => {
    if (isAdmin) {
      navigate('/orders/view/all?filter=backup&backupTab=all');
    } else {
      navigate(`/orders/view/all?filter=backup&backupTab=${tab}`);
    }
  };

  return (
    <div className={`backup-flow-card ${className}`}>
      {/* Header */}
      <div className="backup-card-header">
        <div className="backup-card-header-left">
          <div className="backup-card-title-row">
            <h3>Backup Employee</h3>
            <span className="backup-live-pill">
              <span className="backup-live-dot"></span>
              Live Sync
            </span>
          </div>
          <p>
            {isAdmin
              ? 'Company-wide active order delegations'
              : 'Delegations & cover assignments while away'}
          </p>
        </div>
        <button
          className="clean-icon-btn"
          title="Open handover table"
          onClick={() => handleOpenList(isAdmin ? 'all' : (stats.incomingCount > 0 ? 'incoming' : 'outgoing'))}
        >
          <ArrowRightLeft size={16} />
        </button>
      </div>

      {/* SVG Handover Flow Graphic */}
      <div
        className="backup-graphic-wrap"
        style={{ cursor: 'pointer' }}
        onClick={() => handleOpenList(isAdmin ? 'all' : (stats.incomingCount > 0 ? 'incoming' : 'outgoing'))}
        title="Click to view full delegated orders list"
      >
        <svg viewBox="0 0 260 100" className="backup-flow-svg">
          <defs>
            <linearGradient id="backupGradIncoming" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="backupGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.25" />
            </filter>
            <filter id="backupGlowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Background subtle arc */}
          <path
            d="M 52 50 C 95 12, 165 12, 208 50"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Animated Flow Track */}
          <path
            d="M 52 50 C 95 12, 165 12, 208 50"
            fill="none"
            stroke="url(#backupGradIncoming)"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="handover-flow-line"
          />

          {/* Source Node (Original Owner) */}
          <g transform="translate(48, 50)" filter="url(#backupGlow)">
            <circle cx="0" cy="0" r="19" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="14" fill="#3b82f6" fillOpacity="0.1" />
            <foreignObject x="-10" y="-10" width="20" height="20">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#2563eb' }}>
                <User size={13} strokeWidth={2.5} />
              </div>
            </foreignObject>
            <text x="0" y="32" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600">
              {isAdmin ? 'Owner' : (stats.incomingCount > 0 ? 'Colleague' : 'You')}
            </text>
          </g>

          {/* Target Node (Backup Employee) */}
          <g transform="translate(212, 50)" filter="url(#backupGlowGreen)">
            <circle cx="0" cy="0" r="19" fill="#ecfdf5" stroke="#10b981" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="14" fill="#10b981" fillOpacity="0.15" />
            <foreignObject x="-10" y="-10" width="20" height="20">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#059669' }}>
                <ShieldCheck size={14} strokeWidth={2.5} />
              </div>
            </foreignObject>
            <text x="0" y="32" textAnchor="middle" fill="#059669" fontSize="9" fontWeight="700">
              {isAdmin ? 'Backup' : (stats.incomingCount > 0 ? 'You (Backup)' : 'Colleague')}
            </text>
          </g>

          {/* Center Counter Badge */}
          <g transform="translate(130, 42)">
            <rect
              x="-36"
              y="-18"
              width="72"
              height="36"
              rx="18"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="2"
              filter="url(#backupGlow)"
            />
            <text x="0" y="-1" textAnchor="middle" fill="#0f172a" fontSize="16" fontWeight="800">
              {activeDisplayCount}
            </text>
            <text x="0" y="11" textAnchor="middle" fill="#64748b" fontSize="7.5" fontWeight="700" letterSpacing="0.06em">
              {activeDisplayCount === 1 ? 'HANDOVER' : 'HANDOVERS'}
            </text>
          </g>
        </svg>
      </div>

      {/* Interactive Tabs / Action Pills */}
      {isAdmin ? (
        <div>
          <div className="backup-pills-row">
            <button
              type="button"
              className="backup-tab-pill master"
              onClick={() => handleOpenList('all')}
              title="Click to view all active delegations in data table"
            >
              <Users2 size={13} />
              <span>All Active Handovers</span>
              <span className="backup-pill-count">{stats.totalCount}</span>
            </button>
          </div>

          {stats.pairings.length > 0 && (
            <div className="backup-pairings-container">
              {stats.pairings.map((p, idx) => (
                <span
                  key={idx}
                  className="backup-pairing-chip"
                  onClick={() => handleOpenList('all')}
                  title={`View ${p.count} order(s) delegated from ${p.pair}`}
                >
                  {p.pair} <strong style={{ color: '#2563eb' }}>({p.count})</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="backup-pills-row">
          <button
            type="button"
            className="backup-tab-pill incoming"
            onClick={() => handleOpenList('incoming')}
            title="Click to view orders where you are covering as backup"
          >
            <ShieldCheck size={13} />
            <span>Covering for Others</span>
            <span className="backup-pill-count" style={{ color: '#065f46' }}>
              {stats.incomingCount}
            </span>
          </button>

          <button
            type="button"
            className="backup-tab-pill outgoing"
            onClick={() => handleOpenList('outgoing')}
            title="Click to view your orders assigned to colleagues while away"
          >
            <User size={13} />
            <span>Delegated Away</span>
            <span className="backup-pill-count" style={{ color: '#1e40af' }}>
              {stats.outgoingCount}
            </span>
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="backup-footer-row">
        <span className="backup-footer-desc">
          <ShieldCheck size={12} color="#10b981" />
          <span>Full execution access enabled</span>
        </span>
        <button
          type="button"
          className="backup-open-link"
          onClick={() => handleOpenList(isAdmin ? 'all' : (stats.incomingCount > 0 ? 'incoming' : 'outgoing'))}
        >
          <span>Open Table</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
