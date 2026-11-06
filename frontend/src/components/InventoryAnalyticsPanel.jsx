import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  DollarSign
} from 'lucide-react';
import api from '../api';
import './InventoryAnalyticsPanel.css';

export default function InventoryAnalyticsPanel({
  stocks: propStocks,
  leads: propLeads,
  metrics: propMetrics
}) {
  const [internalStocks, setInternalStocks] = useState([]);
  const [internalLeads, setInternalLeads] = useState([]);
  const [hoveredSize, setHoveredSize] = useState(null);
  const [hoveredDonut, setHoveredDonut] = useState(null);

  // Fetch stocks and leads if not supplied as props
  useEffect(() => {
    if (!propStocks || propStocks.length === 0) {
      api.get('/api/stock-room')
        .then(res => {
          if (res.data?.data) setInternalStocks(res.data.data);
        })
        .catch(err => console.warn('Could not load stocks for analytics:', err.message));
    }
    if (!propLeads || propLeads.length === 0) {
      api.get('/api/leads')
        .then(res => {
          if (res.data?.data) setInternalLeads(res.data.data);
        })
        .catch(err => console.warn('Could not load leads for analytics:', err.message));
    }
  }, [propStocks, propLeads]);

  const stocks = propStocks && propStocks.length > 0 ? propStocks : internalStocks;
  const leads = propLeads && propLeads.length > 0 ? propLeads : internalLeads;

  // Format Indian Rupees currency
  const formatINR = (val, compact = false) => {
    const num = Math.round(Number(val) || 0);
    if (compact) {
      if (num >= 10000000) return `₹ ${(num / 10000000).toFixed(2)} Cr`;
      if (num >= 100000) return `₹ ${(num / 100000).toFixed(2)} L`;
      if (num >= 1000) return `₹ ${(num / 1000).toFixed(1)} K`;
      return `₹ ${num}`;
    }
    return `₹ ${num.toLocaleString('en-IN')}`;
  };

  // Comprehensive analytics calculation
  const data = useMemo(() => {
    let totalStock = 0;
    let activeReserved = 0;
    let overdueCount = 0;
    let overduePcs = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const sizesOnHand = { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
    const sizesReserved = { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 };

    const productMap = {};
    const now = new Date();

    // Default prices per piece for valuation
    const priceMap = {
      'T-Shirt': 250,
      'Relaxed Boat T-Shirt': 300,
      'Hoodie': 850,
      'Shirt': 450,
      'pants': 550,
      'Sweatshirt': 600,
      'Default': 350
    };

    // 1. Process Stock records
    stocks.forEach(s => {
      const pName = s.product || 'Other Item';
      const sSizes = s.sizes || {};

      let itemTotal = 0;
      Object.keys(sizesOnHand).forEach(sz => {
        const qty = Number(sSizes[sz]) || 0;
        sizesOnHand[sz] += qty;
        itemTotal += qty;
      });
      totalStock += itemTotal;

      let itemReserved = 0;
      (s.reservations || []).forEach(r => {
        if (r.status === 'Active') {
          const rQty = Number(r.quantity) || 0;
          itemReserved += rQty;
          activeReserved += rQty;

          const rSz = (r.size || '').toUpperCase();
          if (sizesReserved[rSz] !== undefined) {
            sizesReserved[rSz] += rQty;
          }

          // Check if reservation is overdue (> 5 days)
          if (r.createdAt) {
            const ageDays = (now.getTime() - new Date(r.createdAt).getTime()) / (1000 * 3600 * 24);
            if (ageDays > 5) {
              overdueCount += 1;
              overduePcs += rQty;
            }
          }
        }
      });

      // Low/Out alerts
      const threshold = s.lowStockThreshold || 2;
      const available = Math.max(0, itemTotal - itemReserved);
      if (itemTotal === 0 || available === 0) {
        outOfStockCount += 1;
      } else if (available <= threshold) {
        lowStockCount += 1;
      }

      // Group by Product
      if (!productMap[pName]) {
        const unitPrice = priceMap[pName] || priceMap[pName.toLowerCase()] || priceMap.Default;
        productMap[pName] = {
          product: pName,
          onHand: 0,
          reserved: 0,
          available: 0,
          orderDemand: 0,
          unitPrice,
          totalValue: 0
        };
      }
      productMap[pName].onHand += itemTotal;
      productMap[pName].reserved += itemReserved;
      productMap[pName].available += available;
      productMap[pName].totalValue += itemTotal * productMap[pName].unitPrice;
    });

    // 2. Process Order Demand from Leads
    leads.forEach(l => {
      const isRecentOrder = (l.query === 'order' || l.orderStage || l.totalQuantity);
      if (!isRecentOrder) return;

      (l.items || []).forEach(it => {
        const pRaw = it.item || it.itemType || 'Other';
        const qty = Number(it.quantity) || 0;

        const matched = Object.keys(productMap).find(k => k.toLowerCase() === pRaw.toLowerCase()) || pRaw;
        if (!productMap[matched]) {
          const unitPrice = priceMap[matched] || priceMap.Default;
          productMap[matched] = {
            product: matched,
            onHand: 0,
            reserved: 0,
            available: 0,
            orderDemand: 0,
            unitPrice,
            totalValue: 0
          };
        }
        productMap[matched].orderDemand += qty;
      });
    });

    const availableStock = Math.max(0, totalStock - activeReserved);
    const onTimeReserved = Math.max(0, activeReserved - overduePcs);
    const availablePct = totalStock > 0 ? Math.round((availableStock / totalStock) * 100) : 0;
    const reservedPct = totalStock > 0 ? Math.round((activeReserved / totalStock) * 100) : 0;
    const overduePct = totalStock > 0 ? Math.round((overduePcs / totalStock) * 100) : 0;

    // Segment lengths for SVG Donut (Circumference = 2 * PI * 62 = 389.56)
    const C = 389.56;
    let overdueLength = 0;
    let reservedLength = 0;
    let availableLength = C;

    if (totalStock > 0) {
      if (overduePcs > 0) {
        // Enforce visible stroke length for overdue so it clearly shows on the donut
        const rawOverdue = (overduePcs / totalStock) * C;
        overdueLength = Math.max(14, rawOverdue);
      }
      if (activeReserved > 0) {
        const rawReserved = (Math.max(1, activeReserved - overduePcs) / totalStock) * C;
        reservedLength = Math.max(14, rawReserved);
      }
      availableLength = Math.max(0, C - reservedLength - overdueLength);
    }

    const totalValuation = Object.values(productMap).reduce((acc, p) => acc + p.totalValue, 0);

    const productsList = Object.values(productMap)
      .filter(p => p.onHand > 0 || p.orderDemand > 0)
      .sort((a, b) => (b.onHand + b.orderDemand) - (a.onHand + a.orderDemand));

    const sizeKeys = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const sizeMax = Math.max(...sizeKeys.map(k => sizesOnHand[k]), 1);
    const sizesData = sizeKeys.map(k => {
      const onHand = sizesOnHand[k];
      const reserved = sizesReserved[k];
      const free = Math.max(0, onHand - reserved);
      const freePct = onHand > 0 ? Math.round((free / onHand) * 100) : 0;
      return {
        size: k,
        onHand,
        reserved,
        free,
        freePct,
        h: onHand > 0 ? Math.max(16, Math.round((onHand / sizeMax) * 95)) : 6
      };
    });

    return {
      totalStock,
      availableStock,
      availablePct,
      activeReserved,
      onTimeReserved,
      reservedPct,
      overdueCount,
      overduePcs,
      overduePct,
      availableLength,
      reservedLength,
      overdueLength,
      lowStockCount,
      outOfStockCount,
      totalValuation,
      productsList,
      sizesData
    };
  }, [stocks, leads]);

  return (
    <div className="inv-standalone-charts-wrapper">
      {/* ============================================================== */}
      {/* 1. STOCK ALLOCATION STATUS (Individual Standalone Card)        */}
      {/* ============================================================== */}
      <div className="inv-standalone-card">
        <div className="inv-card-header">
          <div className="inv-card-header-left">
            <span className="dot dot-indigo"></span>
            <div>
              <h3>Stock Allocation Status</h3>
              <p>Available vs reserved warehouse inventory</p>
            </div>
          </div>
          <span className="inv-card-badge indigo">{data.totalStock.toLocaleString('en-IN')} pcs Total</span>
        </div>

        <div className="allocation-spacious-body">
          {/* Interactive SVG Donut with Hover on Green, Purple & Red (Overdue) segments */}
          <div className="donut-box-large">
            <svg viewBox="0 0 160 160" className="donut-svg">
              <circle cx="80" cy="80" r="62" fill="none" stroke="#f1f5f9" strokeWidth="16" />

              {/* Green Circle - Available Stock */}
              <circle
                cx="80"
                cy="80"
                r="62"
                fill="none"
                stroke={hoveredDonut === 'available' ? '#059669' : '#10b981'}
                strokeWidth={hoveredDonut === 'available' ? 21 : 16}
                strokeDasharray={`${data.availableLength} 389.56`}
                strokeDashoffset="0"
                strokeLinecap="round"
                className="donut-segment segment-green"
                onMouseEnter={() => setHoveredDonut('available')}
                onMouseOver={() => setHoveredDonut('available')}
                onMouseLeave={() => setHoveredDonut(null)}
                onMouseOut={() => setHoveredDonut(null)}
                style={{
                  cursor: 'pointer',
                  pointerEvents: 'stroke',
                  transition: 'all 0.25s ease',
                  filter: hoveredDonut === 'available' ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.75))' : 'none'
                }}
              >
                <title>{data.availableStock.toLocaleString('en-IN')} pcs Available ({data.availablePct}%)</title>
              </circle>

              {/* Purple Circle - Reserved for Orders */}
              <circle
                cx="80"
                cy="80"
                r="62"
                fill="none"
                stroke={hoveredDonut === 'reserved' ? '#6d28d9' : '#7c3aed'}
                strokeWidth={hoveredDonut === 'reserved' ? 21 : 16}
                strokeDasharray={`${data.reservedLength} 389.56`}
                strokeDashoffset={`-${data.availableLength}`}
                strokeLinecap="round"
                className="donut-segment segment-purple"
                onMouseEnter={() => setHoveredDonut('reserved')}
                onMouseOver={() => setHoveredDonut('reserved')}
                onMouseLeave={() => setHoveredDonut(null)}
                onMouseOut={() => setHoveredDonut(null)}
                style={{
                  cursor: 'pointer',
                  pointerEvents: 'stroke',
                  transition: 'all 0.25s ease',
                  filter: hoveredDonut === 'reserved' ? 'drop-shadow(0 0 8px rgba(124, 58, 237, 0.8))' : 'none'
                }}
              >
                <title>{data.onTimeReserved > 0 ? `${data.onTimeReserved.toLocaleString('en-IN')} pcs Active Reserved` : `${data.activeReserved.toLocaleString('en-IN')} pcs Reserved`} ({data.reservedPct}%)</title>
              </circle>

              {/* Red Circle - Overdue Reservations */}
              {data.overduePcs > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="none"
                  stroke={hoveredDonut === 'overdue' ? '#b91c1c' : '#ef4444'}
                  strokeWidth={hoveredDonut === 'overdue' ? 21 : 16}
                  strokeDasharray={`${data.overdueLength} 389.56`}
                  strokeDashoffset={`-${data.availableLength + data.reservedLength}`}
                  strokeLinecap="round"
                  className="donut-segment segment-red"
                  onMouseEnter={() => setHoveredDonut('overdue')}
                  onMouseOver={() => setHoveredDonut('overdue')}
                  onMouseLeave={() => setHoveredDonut(null)}
                  onMouseOut={() => setHoveredDonut(null)}
                  style={{
                    cursor: 'pointer',
                    pointerEvents: 'stroke',
                    transition: 'all 0.25s ease',
                    filter: hoveredDonut === 'overdue' ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.85))' : 'none'
                  }}
                >
                  <title>{data.overduePcs} pcs Overdue ({data.overdueCount} order{data.overdueCount === 1 ? '' : 's'})</title>
                </circle>
              )}
            </svg>
            <div className="donut-center-label">
              <span className={`donut-val-big ${hoveredDonut ? 'is-active' : ''}`}>
                {hoveredDonut === 'available'
                  ? `${data.availableStock.toLocaleString('en-IN')}`
                  : hoveredDonut === 'reserved'
                    ? `${data.activeReserved.toLocaleString('en-IN')}`
                    : hoveredDonut === 'overdue'
                      ? `${data.overduePcs} pcs`
                      : `${data.availablePct}%`}
              </span>
              <span className={`donut-sub-big ${hoveredDonut || ''}`}>
                {hoveredDonut === 'available'
                  ? 'pcs Available'
                  : hoveredDonut === 'reserved'
                    ? 'pcs Reserved'
                    : hoveredDonut === 'overdue'
                      ? `Overdue (${data.overdueCount} ord)`
                      : 'Available'}
              </span>
            </div>
          </div>

          {/* Minimal Stat List (Less words, clean rows, no bulky tiles) */}
          <div className="alloc-minimal-list">
            <div
              className={`alloc-minimal-row ${hoveredDonut === 'available' ? 'active-row green' : ''}`}
              onMouseEnter={() => setHoveredDonut('available')}
              onMouseLeave={() => setHoveredDonut(null)}
            >
              <div className="alloc-row-left">
                <span className="dot dot-green"></span>
                <span className="alloc-row-name">Available</span>
              </div>
              <div className="alloc-row-right">
                <span className="alloc-row-count">{data.availableStock.toLocaleString('en-IN')} pcs</span>
                <span className="alloc-row-pct green">{data.availablePct}%</span>
              </div>
            </div>

            <div
              className={`alloc-minimal-row ${hoveredDonut === 'reserved' ? 'active-row purple' : ''}`}
              onMouseEnter={() => setHoveredDonut('reserved')}
              onMouseLeave={() => setHoveredDonut(null)}
            >
              <div className="alloc-row-left">
                <span className="dot dot-purple"></span>
                <span className="alloc-row-name">Reserved</span>
              </div>
              <div className="alloc-row-right">
                <span className="alloc-row-count">{data.activeReserved.toLocaleString('en-IN')} pcs</span>
                <span className="alloc-row-pct purple">{data.reservedPct}%</span>
              </div>
            </div>

            <div
              className={`alloc-minimal-row ${hoveredDonut === 'overdue' ? 'active-row red' : ''}`}
              onMouseEnter={() => setHoveredDonut('overdue')}
              onMouseLeave={() => setHoveredDonut(null)}
            >
              <div className="alloc-row-left">
                <span className="dot dot-red"></span>
                <span className="alloc-row-name">Overdue</span>
              </div>
              <div className="alloc-row-right">
                <span className="alloc-row-count">{data.overdueCount} orders</span>
                {data.overduePcs > 0 && <span className="alloc-row-dim">({data.overduePcs} pcs)</span>}
                {data.overdueCount > 0 && (
                  <span className="alloc-row-pct red">
                    {data.overduePct > 0 ? `${data.overduePct}%` : '<1%'}
                  </span>
                )}
              </div>
            </div>

            <div className="alloc-minimal-row">
              <div className="alloc-row-left">
                <span className="dot dot-amber"></span>
                <span className="alloc-row-name">Low Stock</span>
              </div>
              <div className="alloc-row-right">
                <span className="alloc-row-count">{data.lowStockCount + data.outOfStockCount} items</span>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ============================================================== */}
      {/* 3. SIZE AVAILABILITY & RESERVATION (Individual Standalone Card) */}
      {/* ============================================================== */}
      <div className="inv-standalone-card">
        <div className="inv-card-header">
          <div className="inv-card-header-left">
            <span className="dot dot-teal"></span>
            <div>
              <h3>Size Availability Matrix</h3>
              <p>Breakdown of free stock vs reservations per size</p>
            </div>
          </div>
          <span className="inv-card-badge teal">XS – XXL Breakdown</span>
        </div>

        <div className="sizes-spacious-body">
          <svg viewBox="0 0 720 160" className="sizes-svg-large">
            {data.sizesData.map((sz, i) => {
              const colW = 56;
              const spacing = 58;
              const x = 32 + i * (colW + spacing);
              const baseY = 125;
              const hTotal = Math.round((sz.h / 100) * 95);
              const yTotal = baseY - hTotal;

              const resH = sz.onHand > 0 ? Math.round((sz.reserved / sz.onHand) * hTotal) : 0;
              const freeH = Math.max(0, hTotal - resH);
              const yRes = yTotal;
              const yFree = yTotal + resH;
              const isHovered = hoveredSize?.size === sz.size;

              return (
                <g
                  key={sz.size}
                  className="size-large-col"
                  onMouseEnter={() => setHoveredSize(sz)}
                  onMouseLeave={() => setHoveredSize(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Free Stock Bar (Emerald) */}
                  <rect
                    x={x}
                    y={yFree}
                    width={colW}
                    height={freeH}
                    rx="7"
                    fill="#10b981"
                    opacity={isHovered ? 1 : 0.88}
                  />

                  {/* Reserved Overlay Bar (Amber) */}
                  {resH > 0 && (
                    <rect
                      x={x}
                      y={yRes}
                      width={colW}
                      height={resH}
                      rx="7"
                      fill="#f59e0b"
                      opacity={isHovered ? 1 : 0.92}
                    />
                  )}

                  {/* Top Total Count */}
                  <text
                    x={x + colW / 2}
                    y={yTotal - 8}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="800"
                    fill="#0f172a"
                  >
                    {sz.onHand}
                  </text>

                  {/* Size Label Below Base */}
                  <text
                    x={x + colW / 2}
                    y={baseY + 18}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="800"
                    fill="#475569"
                  >
                    {sz.size}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Legend & Sizing Details */}
          <div className="sizes-legend-banner">
            <div className="sizes-legend-item">
              <span className="dot dot-green"></span>
              <span>Free Stock ({data.sizesData.reduce((s, x) => s + x.free, 0)} pcs)</span>
            </div>
            <div className="sizes-legend-item">
              <span className="dot dot-amber"></span>
              <span>Reserved ({data.sizesData.reduce((s, x) => s + x.reserved, 0)} pcs)</span>
            </div>
            {hoveredSize && (
              <div className="sizes-active-hover-pill">
                <strong>Size {hoveredSize.size}:</strong> {hoveredSize.free} free • {hoveredSize.reserved} reserved
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. WAREHOUSE VALUATION BY CATEGORY (Individual Standalone Card) */}
      {/* ============================================================== */}
      <div className="inv-standalone-card">
        <div className="inv-card-header">
          <div className="inv-card-header-left">
            <span className="dot dot-gold"></span>
            <div>
              <h3>Stock Valuation</h3>
              <p>Total asset capital tied up in stock across categories</p>
            </div>
          </div>
          <span className="inv-card-kpi-val">{formatINR(data.totalValuation)}</span>
        </div>

        <div className="valuation-spacious-body">
          <div className="val-cards-grid">
            {data.productsList.slice(0, 4).map(p => {
              const pct = data.totalValuation > 0 ? Math.round((p.totalValue / data.totalValuation) * 100) : 0;
              return (
                <div key={p.product} className="val-card-item">
                  <div className="val-card-top">
                    <span className="val-card-name">{p.product}</span>
                    <span className="val-card-share">{pct}% Share</span>
                  </div>
                  <div className="val-card-amount">{formatINR(p.totalValue, true)}</div>
                  <div className="val-card-sub">{p.onHand.toLocaleString('en-IN')} pcs in stock</div>
                  <div className="val-progress-track">
                    <div className="val-progress-fill" style={{ width: `${Math.max(pct, 6)}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
