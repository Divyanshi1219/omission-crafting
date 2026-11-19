import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  IndianRupee
} from 'lucide-react';
import api from '../api';
import './InventoryAnalyticsPanel.css';
import StagingRoomAgeingChart from './StagingRoomAgeingChart';

export default function InventoryAnalyticsPanel({
  stocks: propStocks,
  leads: propLeads,
  metrics: propMetrics,
  onSelectCategory
}) {
  const navigate = useNavigate();
  const [internalStocks, setInternalStocks] = useState([]);
  const [internalLeads, setInternalLeads] = useState([]);
  const [hoveredSize, setHoveredSize] = useState(null);
  const [hoveredDonut, setHoveredDonut] = useState(null);

  const handleCategoryClick = (category) => {
    if (onSelectCategory) {
      onSelectCategory(category);
      return;
    }
    // Fallback default navigation to dedicated tables
    if (category === 'available') navigate('/stock-room/view/available');
    else if (category === 'reserved') navigate('/stock-room/view/active-reserved');
    else if (category === 'overdue') navigate('/stock-room/view/overdue-reserved');
    else if (category === 'low_stock') navigate('/stock-room/view/low-stock');
    else if (category === 'total') navigate('/stock-room/view/total');
  };

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

    // Reconcile with propMetrics when provided (e.g. from StockRoom page) for 100% data sync
    const finalTotalStock = propMetrics?.totalItems !== undefined
      ? Number(propMetrics.totalItems) || 0
      : totalStock;

    const finalActiveReserved = propMetrics?.activeReserved !== undefined
      ? Number(propMetrics.activeReserved) || 0
      : activeReserved;

    const finalOverdueCount = propMetrics?.overdueReservations !== undefined
      ? Number(propMetrics.overdueReservations) || 0
      : overdueCount;

    const finalOverduePcs = propMetrics?.overduePieces !== undefined
      ? Number(propMetrics.overduePieces) || 0
      : overduePcs;

    const finalAvailableStock = propMetrics?.availableItems !== undefined
      ? Number(propMetrics.availableItems) || 0
      : Math.max(0, finalTotalStock - finalActiveReserved);

    const finalLowStockCount = (propMetrics?.lowStockAlerts !== undefined || propMetrics?.itemsOutOfStock !== undefined)
      ? ((Number(propMetrics.lowStockAlerts) || 0) + (Number(propMetrics.itemsOutOfStock) || 0))
      : (lowStockCount + outOfStockCount);

    const onTimeReserved = Math.max(0, finalActiveReserved - finalOverduePcs);
    const availablePct = finalTotalStock > 0 ? Math.round((finalAvailableStock / finalTotalStock) * 100) : 0;
    const reservedPct = finalTotalStock > 0 ? Math.round((finalActiveReserved / finalTotalStock) * 100) : 0;
    const overduePct = finalTotalStock > 0 ? Math.round((finalOverduePcs / finalTotalStock) * 100) : 0;

    // Donut chart segment math (Radius = 68, Circumference = 2 * PI * 68 = 427.26)
    const C = 427.26;
    // Generous minimum slice width so slices are distinct and substantial (matching reference donut)
    const minSlice = 36;
    let overdueLength = 0;
    let reservedLength = 0;
    let availableLength = C;

    if (finalTotalStock > 0) {
      if (finalOverduePcs > 0) {
        const rawOverdue = (finalOverduePcs / finalTotalStock) * C;
        overdueLength = Math.max(minSlice, rawOverdue);
      }
      if (finalActiveReserved > 0) {
        const onTime = Math.max(0, finalActiveReserved - finalOverduePcs);
        const rawReserved = onTime > 0 ? (onTime / finalTotalStock) * C : minSlice;
        reservedLength = Math.max(minSlice, rawReserved);
      }
      availableLength = Math.max(0, C - reservedLength - overdueLength);
    }

    const donutSlices = [];
    let currentOffset = 0;

    if (finalTotalStock > 0 && availableLength > 0) {
      donutSlices.push({
        key: 'available',
        label: 'Available',
        color: '#10b981',
        length: availableLength,
        offset: currentOffset,
        count: finalAvailableStock,
        pct: availablePct,
        displayVal: `${finalAvailableStock.toLocaleString('en-IN')} pcs`
      });
      currentOffset += availableLength;
    }

    if (finalTotalStock > 0 && reservedLength > 0) {
      donutSlices.push({
        key: 'reserved',
        label: 'Reserved',
        color: '#8b5cf6',
        length: reservedLength,
        offset: currentOffset,
        count: finalActiveReserved,
        pct: reservedPct,
        displayVal: `${finalActiveReserved.toLocaleString('en-IN')} pcs`
      });
      currentOffset += reservedLength;
    }

    if (finalTotalStock > 0 && overdueLength > 0) {
      donutSlices.push({
        key: 'overdue',
        label: 'Overdue',
        color: '#ef4444',
        length: overdueLength,
        offset: currentOffset,
        count: finalOverduePcs,
        pct: overduePct,
        displayVal: `${finalOverduePcs} pcs`
      });
      currentOffset += overdueLength;
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
      totalStock: finalTotalStock,
      availableStock: finalAvailableStock,
      availablePct,
      activeReserved: finalActiveReserved,
      onTimeReserved,
      reservedPct,
      overdueCount: finalOverdueCount,
      overduePcs: finalOverduePcs,
      overduePct,
      availableLength,
      reservedLength,
      overdueLength,
      donutSlices,
      lowStockCount: finalLowStockCount,
      outOfStockCount,
      totalValuation,
      productsList,
      sizesData
    };
  }, [stocks, leads, propMetrics]);

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
          <span
            className="inv-card-badge indigo clickable-badge"
            onClick={() => handleCategoryClick('total')}
            title="Click to view total warehouse inventory table"
            style={{ cursor: 'pointer' }}
          >
            {data.totalStock.toLocaleString('en-IN')} pcs Total
          </span>
        </div>

        <div className="allocation-spacious-body">
          {/* Interactive Donut with clean geometry matching Image 2 */}
          <div className="donut-box-large">
            <svg viewBox="0 0 200 200" className="donut-svg">
              {/* Background circular track */}
              <circle
                cx="100"
                cy="100"
                r="68"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="26"
                className="donut-track"
              />

              {/* Slices with flat ends (butt) and subtle gap between segments */}
              {(data.donutSlices || []).map(slice => {
                const isHovered = hoveredDonut === slice.key;
                const gap = (data.donutSlices || []).length > 1 ? 2.5 : 0;
                const dashLen = Math.max(1, slice.length - gap);

                return (
                  <circle
                    key={slice.key}
                    cx="100"
                    cy="100"
                    r="68"
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isHovered ? 29 : 26}
                    strokeDasharray={`${dashLen} 427.26`}
                    strokeDashoffset={-slice.offset}
                    strokeLinecap="butt"
                    className={`inv-donut-slice segment-${slice.key}`}
                    onClick={() => handleCategoryClick(slice.key)}
                    onMouseEnter={() => setHoveredDonut(slice.key)}
                    onMouseLeave={() => setHoveredDonut(null)}
                    style={{
                      strokeLinecap: 'butt',
                      cursor: 'pointer',
                      transition: 'stroke-width 0.2s ease, filter 0.2s ease',
                      filter: isHovered ? `drop-shadow(0 0 6px ${slice.color}90)` : 'none'
                    }}
                  >
                    <title>Click to view {slice.label} items in table ({slice.displayVal})</title>
                  </circle>
                );
              })}
            </svg>

            {/* Clean Center Label: "Total" on top, large bold number below (Image 2 style) */}
            <div
              className="donut-center-label clickable-center"
              onClick={() => handleCategoryClick('total')}
              title="Click to view complete stock inventory table"
              style={{ cursor: 'pointer' }}
            >
              <span className="donut-center-title">
                {hoveredDonut === 'available'
                  ? 'Available'
                  : hoveredDonut === 'reserved'
                    ? 'Reserved'
                    : hoveredDonut === 'overdue'
                      ? 'Overdue'
                      : hoveredDonut === 'low_stock'
                        ? 'Low Stock'
                        : 'Total'}
              </span>
              <span className="donut-center-value">
                {hoveredDonut === 'available'
                  ? data.availableStock.toLocaleString('en-IN')
                  : hoveredDonut === 'reserved'
                    ? data.activeReserved.toLocaleString('en-IN')
                    : hoveredDonut === 'overdue'
                      ? data.overduePcs.toLocaleString('en-IN')
                      : hoveredDonut === 'low_stock'
                        ? data.lowStockCount.toLocaleString('en-IN')
                        : data.totalStock.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Clean Legend with aligned columns matching Image 2 reference */}
          <div className="donut-legend-list">
            <div
              className={`donut-legend-row ${hoveredDonut === 'available' ? 'is-hovered' : ''}`}
              onClick={() => handleCategoryClick('available')}
              onMouseEnter={() => setHoveredDonut('available')}
              onMouseLeave={() => setHoveredDonut(null)}
              title="Click to view Available stock table"
            >
              <div className="donut-legend-left">
                <span className="donut-legend-dot" style={{ backgroundColor: '#10b981' }} />
                <span className="donut-legend-name">Available</span>
              </div>
              <div className="donut-legend-right">
                <span className="donut-legend-qty">{data.availableStock.toLocaleString('en-IN')} pcs</span>
                <span className="donut-legend-pct">({data.availablePct}%)</span>
              </div>
            </div>

            <div
              className={`donut-legend-row ${hoveredDonut === 'reserved' ? 'is-hovered' : ''}`}
              onClick={() => handleCategoryClick('reserved')}
              onMouseEnter={() => setHoveredDonut('reserved')}
              onMouseLeave={() => setHoveredDonut(null)}
              title="Click to view Active Reservations table"
            >
              <div className="donut-legend-left">
                <span className="donut-legend-dot" style={{ backgroundColor: '#8b5cf6' }} />
                <span className="donut-legend-name">Reserved</span>
              </div>
              <div className="donut-legend-right">
                <span className="donut-legend-qty">{data.activeReserved.toLocaleString('en-IN')} pcs</span>
                <span className="donut-legend-pct">({data.reservedPct}%)</span>
              </div>
            </div>

            <div
              className={`donut-legend-row ${hoveredDonut === 'overdue' ? 'is-hovered' : ''}`}
              onClick={() => handleCategoryClick('overdue')}
              onMouseEnter={() => setHoveredDonut('overdue')}
              onMouseLeave={() => setHoveredDonut(null)}
              title="Click to view Overdue Reservations table"
            >
              <div className="donut-legend-left">
                <span className="donut-legend-dot" style={{ backgroundColor: '#ef4444' }} />
                <span className="donut-legend-name">Overdue</span>
                {data.overdueCount > 0 && (
                  <span className="donut-legend-tag">{data.overdueCount} orders</span>
                )}
              </div>
              <div className="donut-legend-right">
                <span className="donut-legend-qty">{data.overduePcs.toLocaleString('en-IN')} pcs</span>
                <span className="donut-legend-pct">({data.overduePct > 0 ? `${data.overduePct}%` : '<1%'})</span>
              </div>
            </div>

            <div
              className={`donut-legend-row ${hoveredDonut === 'low_stock' ? 'is-hovered' : ''}`}
              onClick={() => handleCategoryClick('low_stock')}
              onMouseEnter={() => setHoveredDonut('low_stock')}
              onMouseLeave={() => setHoveredDonut(null)}
              title="Click to view Low & Out of Stock table"
            >
              <div className="donut-legend-left">
                <span className="donut-legend-dot" style={{ backgroundColor: '#f59e0b' }} />
                <span className="donut-legend-name">Low Stock</span>
              </div>
              <div className="donut-legend-right">
                <span className="donut-legend-qty">{data.lowStockCount.toLocaleString('en-IN')} items</span>
                <span className="donut-legend-pct">
                  ({data.totalStock > 0 ? Math.round((data.lowStockCount / data.totalStock) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. ORDERS > PARTIAL > STAGING ROOM AGEING & RETURN MONITOR     */}
      {/* ============================================================== */}
      <StagingRoomAgeingChart leads={leads} />

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
