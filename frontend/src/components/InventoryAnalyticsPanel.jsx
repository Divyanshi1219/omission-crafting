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
  IndianRupee,
  Shirt,
  RotateCcw
} from 'lucide-react';
import api from '../api';
import './InventoryAnalyticsPanel.css';
import StagingRoomAgeingChart from './StagingRoomAgeingChart';

const getColorHex = (colour) => {
  const c = (colour || '').toLowerCase().trim();
  if (c.includes('black')) return '#0f172a';
  if (c.includes('white') || c.includes('without color')) return '#cbd5e1';
  if (c.includes('navy')) return '#1e3a8a';
  if (c.includes('sky') || c.includes('light blue')) return '#38bdf8';
  if (c.includes('blue') || c.includes('royal')) return '#2563eb';
  if (c.includes('orange')) return '#ea580c';
  if (c.includes('red') || c.includes('maroon') || c.includes('burgundy')) return '#dc2626';
  if (c.includes('green') || c.includes('olive')) return '#16a34a';
  if (c.includes('grey') || c.includes('gray') || c.includes('charcoal')) return '#64748b';
  if (c.includes('yellow')) return '#eab308';
  if (c.includes('purple') || c.includes('lavender')) return '#9333ea';
  if (c.includes('pink') || c.includes('rose')) return '#ec4899';
  if (c.includes('brown') || c.includes('beige') || c.includes('tan')) return '#92400e';
  return '#6366f1';
};

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

  // Clothing dropdown state (simple & understandable - cloth selection only)
  const [selectedProduct, setSelectedProduct] = useState('all');

  const handleCategoryClick = (category) => {
    if (onSelectCategory) {
      onSelectCategory(category);
      return;
    }
    // Fallback default navigation to dedicated tables (use /dashboard/view/ for universal access)
    if (category === 'available') navigate('/dashboard/view/available');
    else if (category === 'reserved') navigate('/dashboard/view/active-reserved');
    else if (category === 'overdue') navigate('/dashboard/view/overdue-reserved');
    else if (category === 'low_stock') navigate('/dashboard/view/low-stock');
    else if (category === 'total') navigate('/dashboard/view/total');
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
      const sizeKeys = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      const hasOut = sizeKeys.some((sz) => (Number(sSizes[sz]) || 0) === 0);
      const hasLow = sizeKeys.some(
        (sz) => (Number(sSizes[sz]) || 0) > 0 && (Number(sSizes[sz]) || 0) <= threshold
      );

      if (itemTotal === 0 || available === 0) {
        outOfStockCount += 1;
      } else if (available <= threshold || hasOut || hasLow || itemTotal < 15 || s.status === 'Low stock') {
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

    const finalLowStockCount = propMetrics?.lowStockItemsCount !== undefined
      ? Number(propMetrics.lowStockItemsCount) || 0
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

  // Unique products/garments for dropdown (cloth selection only)
  const productOptions = useMemo(() => {
    const set = new Set();
    stocks.forEach(s => {
      const p = (s.product || s.productName || s.name || '').trim();
      if (p) set.add(p);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [stocks]);

  // Color breakdown for selected cloth to display on the Donut chart
  const clothColorBreakdown = useMemo(() => {
    if (selectedProduct === 'all') return [];

    const matching = stocks.filter(s => {
      const p = (s.product || s.productName || s.name || '').trim();
      return p.toLowerCase() === selectedProduct.toLowerCase();
    });

    const colorMap = {};
    const sizeKeys = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    matching.forEach(s => {
      const col = (s.colour || s.color || 'Standard').trim();
      if (!colorMap[col]) {
        colorMap[col] = {
          colour: col,
          colorHex: getColorHex(col),
          totalPcs: 0,
          availablePcs: 0,
          reservedPcs: 0,
          sizes: { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
          cuts: new Set()
        };
      }

      if (s.cut) colorMap[col].cuts.add(s.cut);

      const sSizes = s.sizes || {};
      let itemTotal = 0;
      sizeKeys.forEach(sz => {
        const q = Number(sSizes[sz]) || 0;
        colorMap[col].sizes[sz] += q;
        itemTotal += q;
      });
      colorMap[col].totalPcs += itemTotal;

      let itemRes = 0;
      (s.reservations || []).forEach(r => {
        if (r.status === 'Active') {
          itemRes += Number(r.quantity) || 0;
        }
      });
      colorMap[col].reservedPcs += itemRes;
      colorMap[col].availablePcs += Math.max(0, itemTotal - itemRes);
    });

    const list = Object.values(colorMap).sort((a, b) => b.totalPcs - a.totalPcs);
    const totalPcsAllColors = list.reduce((sum, c) => sum + c.totalPcs, 0);

    return list.map(c => ({
      ...c,
      pct: totalPcsAllColors > 0 ? Math.round((c.totalPcs / totalPcsAllColors) * 100) : 0,
      cuts: Array.from(c.cuts)
    }));
  }, [stocks, selectedProduct]);

  // Overall sizes availability (XS - XXL) for the selected cloth
  const clothOverallSizes = useMemo(() => {
    if (selectedProduct === 'all') return [];

    const sizeKeys = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const totalSizes = { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
    const resSizes = { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 };

    stocks.forEach(s => {
      const p = (s.product || s.productName || s.name || '').trim();
      if (p.toLowerCase() === selectedProduct.toLowerCase()) {
        const sSizes = s.sizes || {};
        sizeKeys.forEach(sz => {
          totalSizes[sz] += Number(sSizes[sz]) || 0;
        });
        (s.reservations || []).forEach(r => {
          if (r.status === 'Active') {
            const rSz = (r.size || '').toUpperCase();
            if (resSizes[rSz] !== undefined) {
              resSizes[rSz] += Number(r.quantity) || 0;
            }
          }
        });
      }
    });

    return sizeKeys.map(sz => ({
      size: sz,
      total: totalSizes[sz],
      reserved: resSizes[sz],
      available: Math.max(0, totalSizes[sz] - resSizes[sz])
    }));
  }, [stocks, selectedProduct]);

  // Garment category breakdown when "All Garments" is selected
  const allGarmentsBreakdown = useMemo(() => {
    const map = {};
    const sizeKeys = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    stocks.forEach(s => {
      const p = (s.product || s.productName || s.name || 'Other Item').trim();
      if (!map[p]) {
        map[p] = {
          product: p,
          totalPcs: 0,
          availablePcs: 0,
          reservedPcs: 0,
          colours: new Set(),
          sizes: { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 }
        };
      }

      const col = (s.colour || s.color || '').trim();
      if (col) map[p].colours.add(col);

      const sSizes = s.sizes || {};
      let itemTotal = 0;
      sizeKeys.forEach(sz => {
        const q = Number(sSizes[sz]) || 0;
        map[p].sizes[sz] += q;
        itemTotal += q;
      });
      map[p].totalPcs += itemTotal;

      let itemRes = 0;
      (s.reservations || []).forEach(r => {
        if (r.status === 'Active') {
          itemRes += Number(r.quantity) || 0;
        }
      });
      map[p].reservedPcs += itemRes;
      map[p].availablePcs += Math.max(0, itemTotal - itemRes);
    });

    const list = Object.values(map).sort((a, b) => b.totalPcs - a.totalPcs);
    const totalAll = list.reduce((sum, g) => sum + g.totalPcs, 0);

    const categoryPalette = [
      '#6366f1', // Indigo
      '#0d9488', // Teal
      '#f59e0b', // Amber
      '#ec4899', // Pink
      '#2563eb', // Blue
      '#8b5cf6', // Violet
      '#10b981', // Emerald
      '#f97316'  // Orange
    ];

    return list.map((g, idx) => ({
      ...g,
      colorHex: categoryPalette[idx % categoryPalette.length],
      pct: totalAll > 0 ? Math.round((g.totalPcs / totalAll) * 100) : 0,
      colours: Array.from(g.colours)
    }));
  }, [stocks]);

  // Aggregate stats for the current view
  const currentTotalPieces = useMemo(() => {
    if (selectedProduct === 'all') {
      return data.totalStock;
    }
    return clothColorBreakdown.reduce((sum, c) => sum + c.totalPcs, 0);
  }, [selectedProduct, data.totalStock, clothColorBreakdown]);

  const currentAvailablePieces = useMemo(() => {
    if (selectedProduct === 'all') {
      return data.availableStock;
    }
    return clothColorBreakdown.reduce((sum, c) => sum + c.availablePcs, 0);
  }, [selectedProduct, data.availableStock, clothColorBreakdown]);

  const currentReservedPieces = useMemo(() => {
    if (selectedProduct === 'all') {
      return data.activeReserved;
    }
    return clothColorBreakdown.reduce((sum, c) => sum + c.reservedPcs, 0);
  }, [selectedProduct, data.activeReserved, clothColorBreakdown]);

  // Donut slices: Showing ALL COLORS of the selected cloth (or all garments when "all")
  const donutSlices = useMemo(() => {
    const isClothSelected = selectedProduct !== 'all';
    const items = isClothSelected ? clothColorBreakdown : allGarmentsBreakdown;
    const totalCount = items.reduce((sum, item) => sum + item.totalPcs, 0);

    if (totalCount === 0) return [];

    const C = 427.26;
    let currentOffset = 0;

    return items.map((item) => {
      const length = (item.totalPcs / totalCount) * C;
      const key = isClothSelected ? item.colour : item.product;
      const label = isClothSelected ? item.colour : item.product;

      const slice = {
        key,
        label,
        color: item.colorHex,
        count: item.totalPcs,
        available: item.availablePcs,
        reserved: item.reservedPcs,
        pct: item.pct,
        length,
        offset: currentOffset,
        item
      };
      currentOffset += length;
      return slice;
    });
  }, [selectedProduct, clothColorBreakdown, allGarmentsBreakdown]);

  const activeSliceInfo = useMemo(() => {
    if (!hoveredDonut) return null;
    return donutSlices.find(s => s.key === hoveredDonut) || null;
  }, [hoveredDonut, donutSlices]);

  return (
    <div className="inv-standalone-charts-wrapper">
      {/* ============================================================== */}
      {/* 1. STOCK ALLOCATION STATUS (Individual Standalone Card)        */}
      {/* ============================================================== */}
      <div className="inv-standalone-card">
        <div className="inv-card-header">
          <div className="inv-card-header-left">
            <span className="dot dot-indigo"></span>
            <h3>Stock Allocation Status</h3>
          </div>

          <div className="inv-card-header-actions">
            {/* Clothing Dropdown ONLY (Clean, simple & understandable) */}
            <div className="inv-filter-select-wrapper" title="Choose garment to see all available colors and counts">
              <Shirt size={14} className="inv-filter-icon" />
              <select
                className="inv-filter-select"
                value={selectedProduct}
                onChange={(e) => {
                  setSelectedProduct(e.target.value);
                  setHoveredDonut(null);
                }}
                aria-label="Choose clothing item"
              >
                <option value="all">All Garments ({productOptions.length})</option>
                {productOptions.map((prod) => (
                  <option key={prod} value={prod}>
                    {prod}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="inv-select-chevron" />
            </div>

            {/* Reset to All Garments */}
            {selectedProduct !== 'all' && (
              <button
                type="button"
                className="inv-filter-reset-btn"
                onClick={() => {
                  setSelectedProduct('all');
                  setHoveredDonut(null);
                }}
                title="Reset to All Garments"
              >
                <RotateCcw size={12} />
                <span>All Garments</span>
              </button>
            )}

            {/* Total Count Badge */}
            <span
              className="inv-card-badge indigo clickable-badge"
              onClick={() => handleCategoryClick('total')}
              title="Click to view warehouse inventory table"
              style={{ cursor: 'pointer' }}
            >
              {currentTotalPieces.toLocaleString('en-IN')} pcs {selectedProduct !== 'all' ? selectedProduct : 'Total'}
            </span>
          </div>
        </div>

        <div className="allocation-spacious-body">
          {/* LEFT SECTION: Donut Chart Showing Available Colors & Legend */}
          <div className="allocation-chart-section">
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

                {/* Donut Slices: Available Colors of Cloth with Counts */}
                {donutSlices.map(slice => {
                  const isHovered = hoveredDonut === slice.key;
                  const gap = donutSlices.length > 1 ? 2.5 : 0;
                  const dashLen = Math.max(1, slice.length - gap);
                  const isWhite = (slice.color || '').toLowerCase() === '#cbd5e1';

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
                      onClick={() => {
                        if (selectedProduct === 'all') {
                          setSelectedProduct(slice.label);
                        }
                      }}
                      onMouseEnter={() => setHoveredDonut(slice.key)}
                      onMouseLeave={() => setHoveredDonut(null)}
                      style={{
                        strokeLinecap: 'butt',
                        cursor: 'pointer',
                        transition: 'stroke-width 0.2s ease, filter 0.2s ease',
                        filter: isHovered
                          ? `drop-shadow(0 0 6px ${slice.color}90)`
                          : isWhite
                            ? 'drop-shadow(0 0 1px rgba(0,0,0,0.3))'
                            : 'none'
                      }}
                    >
                      <title>{slice.label}: {slice.count} pcs in stock ({slice.available} available)</title>
                    </circle>
                  );
                })}
              </svg>

              {/* Center Typography: Shows hovered Color & Count or Total Cloth Count */}
              <div
                className="donut-center-label clickable-center"
                onClick={() => {
                  if (activeSliceInfo && selectedProduct === 'all') {
                    setSelectedProduct(activeSliceInfo.label);
                  } else {
                    handleCategoryClick('total');
                  }
                }}
                title={activeSliceInfo ? `${activeSliceInfo.label}: ${activeSliceInfo.count} pcs` : 'Click to view inventory table'}
                style={{ cursor: 'pointer' }}
              >
                <span className="donut-center-title">
                  {activeSliceInfo
                    ? activeSliceInfo.label
                    : selectedProduct !== 'all' ? selectedProduct : 'Total'}
                </span>
                <span className="donut-center-value">
                  {activeSliceInfo
                    ? activeSliceInfo.count.toLocaleString('en-IN')
                    : currentTotalPieces.toLocaleString('en-IN')}
                </span>
                <span className="donut-center-sub">
                  {activeSliceInfo
                    ? `${activeSliceInfo.available} free`
                    : `${currentAvailablePieces.toLocaleString('en-IN')} available`}
                </span>
              </div>
            </div>

            {/* Colors / Garments Legend List */}
            <div className="donut-legend-wrap">
              <div className="donut-legend-list custom-scrollbar">
                {donutSlices.map((slice) => {
                  const isHovered = hoveredDonut === slice.key;
                  const isWhite = (slice.color || '').toLowerCase() === '#cbd5e1';

                  return (
                    <div
                      key={slice.key}
                      className={`donut-legend-row ${isHovered ? 'is-hovered' : ''}`}
                      onMouseEnter={() => setHoveredDonut(slice.key)}
                      onMouseLeave={() => setHoveredDonut(null)}
                      onClick={() => {
                        if (selectedProduct === 'all') {
                          setSelectedProduct(slice.label);
                        }
                      }}
                      title={`${slice.label}: ${slice.count} pcs (${slice.available} available)`}
                    >
                      <div className="donut-legend-left">
                        <span
                          className="donut-legend-dot"
                          style={{
                            backgroundColor: slice.color,
                            border: isWhite ? '1px solid #94a3b8' : 'none'
                          }}
                        />
                        <span className="donut-legend-name">{slice.label}</span>
                      </div>
                      <div className="donut-legend-right">
                        <span className="donut-legend-qty">{slice.count.toLocaleString('en-IN')} pcs</span>
                        <span className="donut-legend-pct">({slice.pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Allocation Status Indicators */}
              <div className="allocation-mini-summary-pills">
                <span
                  className="mini-summary-pill green"
                  onClick={() => handleCategoryClick('available')}
                  title="Click to view available stock table"
                >
                  <span className="mini-pill-dot green" />
                  <span>{currentAvailablePieces.toLocaleString('en-IN')} Available</span>
                </span>
                <span
                  className="mini-summary-pill purple"
                  onClick={() => handleCategoryClick('reserved')}
                  title="Click to view reserved stock table"
                >
                  <span className="mini-pill-dot purple" />
                  <span>{currentReservedPieces.toLocaleString('en-IN')} Reserved</span>
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION: MAKING FULL USE OF WHITE SPACE (Sizes Matrix & Types Breakdown) */}
          <div className="allocation-variants-panel">
            <div className="variants-panel-header">
              <div className="variants-header-left">
                <span className="variants-title">
                  {selectedProduct !== 'all' ? (
                    <>
                      <strong>{selectedProduct}</strong> Size Matrix &amp; Types
                    </>
                  ) : (
                    'Garment Catalog & Sizes'
                  )}
                </span>
                <span className="variants-count-chip">
                  {selectedProduct !== 'all'
                    ? `${clothColorBreakdown.length} ${clothColorBreakdown.length === 1 ? 'color' : 'colors'}`
                    : `${allGarmentsBreakdown.length} garments`}
                </span>
              </div>
              <span className="variants-header-hint">
                {selectedProduct !== 'all'
                  ? `${currentAvailablePieces} available • ${currentReservedPieces} reserved`
                  : 'Click a garment to view colors'}
              </span>
            </div>

            {/* Overall Sizes Summary Bar for the selected cloth */}
            {selectedProduct !== 'all' && clothOverallSizes.length > 0 && (
              <div className="cloth-overall-sizes-bar">
                <span className="overall-sizes-lbl">XS – XXL Breakdown:</span>
                <div className="overall-sizes-chips">
                  {clothOverallSizes.map(s => {
                    const isLow = s.available > 0 && s.available <= 3;
                    const isZero = s.available === 0;

                    return (
                      <div
                        key={s.size}
                        className={`overall-size-chip ${isZero ? 'zero' : isLow ? 'low' : 'good'}`}
                        title={`Size ${s.size}: ${s.available} available (${s.total} total, ${s.reserved} reserved)`}
                      >
                        <span className="chip-sz">{s.size}</span>
                        <span className="chip-qty">{s.available}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variants / Colors List with Size Breakdown */}
            <div className="variants-panel-list custom-scrollbar">
              {selectedProduct !== 'all' ? (
                // SPECIFIC CLOTH SELECTED (e.g. Hoodie) - Shows every color's cuts & sizes
                clothColorBreakdown.length === 0 ? (
                  <div className="variants-empty-state">
                    No matching inventory found for {selectedProduct}.
                  </div>
                ) : (
                  clothColorBreakdown.map(c => {
                    const isHovered = hoveredDonut === c.colour;
                    const isWhite = c.colorHex.toLowerCase() === '#cbd5e1';

                    return (
                      <div
                        key={c.colour}
                        className={`variant-row-card ${isHovered ? 'highlighted' : ''}`}
                        onMouseEnter={() => setHoveredDonut(c.colour)}
                        onMouseLeave={() => setHoveredDonut(null)}
                      >
                        <div className="variant-card-top">
                          <div className="variant-color-info">
                            <span
                              className="variant-color-dot"
                              style={{
                                backgroundColor: c.colorHex,
                                border: isWhite ? '1px solid #94a3b8' : 'none'
                              }}
                              title={`Color: ${c.colour}`}
                            />
                            <span className="variant-name">{c.colour}</span>
                            {c.cuts.length > 0 && (
                              <span className="variant-cut-badge">{c.cuts.join(' • ')}</span>
                            )}
                          </div>
                          <div className="variant-stock-summary">
                            <span className="variant-total-num"><strong>{c.totalPcs}</strong> pcs</span>
                            <span className="variant-avail-num">({c.availablePcs} available)</span>
                          </div>
                        </div>

                        {/* Sizes Matrix: XS to XXL for this color */}
                        <div className="variant-sizes-matrix">
                          {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(sz => {
                            const qty = c.sizes[sz] || 0;
                            const isLow = qty > 0 && qty <= 3;
                            const isZero = qty === 0;

                            return (
                              <span
                                key={sz}
                                className={`variant-size-pill ${isZero ? 'zero' : isLow ? 'low' : 'good'}`}
                                title={`${c.colour} Size ${sz}: ${qty} pcs in stock`}
                              >
                                <span className="size-label">{sz}</span>
                                <span className="size-qty">{qty}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                // "ALL GARMENTS" SELECTED - Garment cards with 1-click drilldown
                allGarmentsBreakdown.map(g => (
                  <div
                    key={g.product}
                    className="garment-summary-card"
                    onClick={() => {
                      setSelectedProduct(g.product);
                      setHoveredDonut(null);
                    }}
                    title={`Click to view all colors and counts for ${g.product}`}
                  >
                    <div className="garment-card-header">
                      <div className="garment-title-wrap">
                        <Shirt size={13} className="garment-icon" />
                        <span className="garment-name">{g.product}</span>
                        <span className="garment-variants-badge">
                          {g.colours.length} {g.colours.length === 1 ? 'color' : 'colors'}
                        </span>
                      </div>
                      <div className="garment-card-qty">
                        <span className="garment-pcs">{g.totalPcs.toLocaleString('en-IN')} pcs</span>
                        <span className="garment-drilldown-hint">View colors &rarr;</span>
                      </div>
                    </div>

                    {/* Color Swatch Dots */}
                    <div className="garment-colors-strip">
                      {g.colours.slice(0, 7).map(col => (
                        <span
                          key={col}
                          className="garment-color-dot"
                          style={{ backgroundColor: getColorHex(col) }}
                          title={col}
                        />
                      ))}
                      {g.colours.length > 7 && (
                        <span className="garment-more-colors">+{g.colours.length - 7}</span>
                      )}
                    </div>

                    {/* Quick Size Matrix */}
                    <div className="garment-mini-sizes">
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(sz => (
                        <span key={sz} className="mini-size-item">
                          <span className="mini-sz-lbl">{sz}</span>
                          <span className="mini-sz-val">{g.sizes[sz] || 0}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
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
