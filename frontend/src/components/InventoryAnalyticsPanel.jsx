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

  // Clothing dropdown & variant filter state
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedColour, setSelectedColour] = useState('all');
  const [selectedSize, setSelectedSize] = useState('all');

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

  // Unique products/garments for dropdown
  const productOptions = useMemo(() => {
    const set = new Set();
    stocks.forEach(s => {
      const p = (s.product || s.productName || s.name || '').trim();
      if (p) set.add(p);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [stocks]);

  // Unique colors available for the chosen garment
  const colourOptions = useMemo(() => {
    const set = new Set();
    stocks.forEach(s => {
      const p = (s.product || s.productName || s.name || '').trim();
      if (selectedProduct === 'all' || p.toLowerCase() === selectedProduct.toLowerCase()) {
        const c = (s.colour || s.color || '').trim();
        if (c) set.add(c);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [stocks, selectedProduct]);

  const isFiltered = selectedProduct !== 'all' || selectedColour !== 'all' || selectedSize !== 'all';

  // Dynamic metrics for Stock Allocation Status card (handles dropdown filtering)
  const allocationData = useMemo(() => {
    if (!isFiltered) {
      return {
        totalStock: data.totalStock,
        availableStock: data.availableStock,
        availablePct: data.availablePct,
        activeReserved: data.activeReserved,
        reservedPct: data.reservedPct,
        overdueCount: data.overdueCount,
        overduePcs: data.overduePcs,
        overduePct: data.overduePct,
        lowStockCount: data.lowStockCount,
        donutSlices: data.donutSlices,
        totalItemsCount: stocks.length
      };
    }

    const matching = stocks.filter(s => {
      const p = (s.product || s.productName || s.name || '').trim();
      if (selectedProduct !== 'all' && p.toLowerCase() !== selectedProduct.toLowerCase()) return false;
      const c = (s.colour || s.color || '').trim();
      if (selectedColour !== 'all' && c.toLowerCase() !== selectedColour.toLowerCase()) return false;
      return true;
    });

    let total = 0;
    let reserved = 0;
    let overduePcs = 0;
    let overdueCount = 0;
    let lowStockCount = 0;
    const now = new Date();
    const sizeKeys = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    matching.forEach(s => {
      const sSizes = s.sizes || {};
      let itemTotal = 0;
      let itemReserved = 0;

      if (selectedSize === 'all') {
        sizeKeys.forEach(sz => {
          itemTotal += Number(sSizes[sz]) || 0;
        });
        (s.reservations || []).forEach(r => {
          if (r.status === 'Active') {
            const q = Number(r.quantity) || 0;
            itemReserved += q;
            if (r.createdAt) {
              const ageDays = (now.getTime() - new Date(r.createdAt).getTime()) / (1000 * 3600 * 24);
              if (ageDays > 5) {
                overdueCount += 1;
                overduePcs += q;
              }
            }
          }
        });
      } else {
        itemTotal = Number(sSizes[selectedSize]) || 0;
        (s.reservations || []).forEach(r => {
          const rSz = (r.size || '').toUpperCase();
          if (r.status === 'Active' && rSz === selectedSize) {
            const q = Number(r.quantity) || 0;
            itemReserved += q;
            if (r.createdAt) {
              const ageDays = (now.getTime() - new Date(r.createdAt).getTime()) / (1000 * 3600 * 24);
              if (ageDays > 5) {
                overdueCount += 1;
                overduePcs += q;
              }
            }
          }
        });
      }

      total += itemTotal;
      reserved += itemReserved;

      const threshold = s.lowStockThreshold || 2;
      const available = Math.max(0, itemTotal - itemReserved);
      const hasOut = selectedSize === 'all'
        ? sizeKeys.some(sz => (Number(sSizes[sz]) || 0) === 0)
        : itemTotal === 0;
      const hasLow = selectedSize === 'all'
        ? sizeKeys.some(sz => (Number(sSizes[sz]) || 0) > 0 && (Number(sSizes[sz]) || 0) <= threshold)
        : (itemTotal > 0 && itemTotal <= threshold);

      if (itemTotal === 0 || available === 0 || available <= threshold || hasOut || hasLow || s.status === 'Low stock') {
        lowStockCount += 1;
      }
    });

    const availableStock = Math.max(0, total - reserved);
    const availablePct = total > 0 ? Math.round((availableStock / total) * 100) : 0;
    const reservedPct = total > 0 ? Math.round((reserved / total) * 100) : 0;
    const overduePct = total > 0 ? Math.round((overduePcs / total) * 100) : 0;

    const C = 427.26;
    const minSlice = 36;
    let overdueLength = 0;
    let reservedLength = 0;
    let availableLength = C;

    if (total > 0) {
      if (overduePcs > 0) {
        const rawOverdue = (overduePcs / total) * C;
        overdueLength = Math.max(minSlice, rawOverdue);
      }
      if (reserved > 0) {
        const onTime = Math.max(0, reserved - overduePcs);
        const rawReserved = onTime > 0 ? (onTime / total) * C : minSlice;
        reservedLength = Math.max(minSlice, rawReserved);
      }
      availableLength = Math.max(0, C - reservedLength - overdueLength);
    }

    const donutSlices = [];
    let currentOffset = 0;

    if (total > 0 && availableLength > 0) {
      donutSlices.push({
        key: 'available',
        label: 'Available',
        color: '#10b981',
        length: availableLength,
        offset: currentOffset,
        count: availableStock,
        pct: availablePct,
        displayVal: `${availableStock.toLocaleString('en-IN')} pcs`
      });
      currentOffset += availableLength;
    }

    if (total > 0 && reservedLength > 0) {
      donutSlices.push({
        key: 'reserved',
        label: 'Reserved',
        color: '#8b5cf6',
        length: reservedLength,
        offset: currentOffset,
        count: reserved,
        pct: reservedPct,
        displayVal: `${reserved.toLocaleString('en-IN')} pcs`
      });
      currentOffset += reservedLength;
    }

    if (total > 0 && overdueLength > 0) {
      donutSlices.push({
        key: 'overdue',
        label: 'Overdue',
        color: '#ef4444',
        length: overdueLength,
        offset: currentOffset,
        count: overduePcs,
        pct: overduePct,
        displayVal: `${overduePcs.toLocaleString('en-IN')} pcs`
      });
      currentOffset += overdueLength;
    }

    return {
      totalStock: total,
      availableStock,
      availablePct,
      activeReserved: reserved,
      reservedPct,
      overdueCount,
      overduePcs,
      overduePct,
      lowStockCount,
      donutSlices,
      totalItemsCount: matching.length
    };
  }, [stocks, isFiltered, selectedProduct, selectedColour, selectedSize, data]);

  // List of matching variants for the white space details matrix
  const matchingVariants = useMemo(() => {
    const matching = stocks.filter(s => {
      const p = (s.product || s.productName || s.name || '').trim();
      if (selectedProduct !== 'all' && p.toLowerCase() !== selectedProduct.toLowerCase()) return false;
      const c = (s.colour || s.color || '').trim();
      if (selectedColour !== 'all' && c.toLowerCase() !== selectedColour.toLowerCase()) return false;
      return true;
    });

    return matching.map((s, idx) => {
      const pName = (s.product || s.productName || s.name || 'Other Item').trim();
      const colour = (s.colour || s.color || 'Standard').trim();
      const cut = (s.cut || s.type || '').trim();
      const sSizes = s.sizes || {};

      let itemTotal = 0;
      const sizeKeys = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      const sizesMap = {};
      sizeKeys.forEach(sz => {
        const q = Number(sSizes[sz]) || 0;
        sizesMap[sz] = q;
        itemTotal += q;
      });

      let resTotal = 0;
      (s.reservations || []).forEach(r => {
        if (r.status === 'Active') {
          resTotal += Number(r.quantity) || 0;
        }
      });

      const avail = Math.max(0, itemTotal - resTotal);

      return {
        id: s._id || s.id || `${pName}-${colour}-${cut}-${idx}`,
        product: pName,
        colour,
        cut,
        totalPcs: itemTotal,
        availablePcs: avail,
        reservedPcs: resTotal,
        sizes: sizesMap
      };
    }).sort((a, b) => b.totalPcs - a.totalPcs);
  }, [stocks, selectedProduct, selectedColour]);

  // Overview summaries for all garments
  const garmentSummaries = useMemo(() => {
    const map = {};
    stocks.forEach(s => {
      const pName = (s.product || s.productName || s.name || 'Other Item').trim();
      if (!map[pName]) {
        map[pName] = {
          product: pName,
          totalPcs: 0,
          availablePcs: 0,
          reservedPcs: 0,
          colours: new Set(),
          variantsCount: 0,
          sizes: { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 }
        };
      }
      map[pName].variantsCount += 1;
      const col = (s.colour || s.color || '').trim();
      if (col) map[pName].colours.add(col);

      const sSizes = s.sizes || {};
      let itemTotal = 0;
      ['XS', 'S', 'M', 'L', 'XL', 'XXL'].forEach(sz => {
        const q = Number(sSizes[sz]) || 0;
        map[pName].sizes[sz] += q;
        itemTotal += q;
      });
      map[pName].totalPcs += itemTotal;

      let res = 0;
      (s.reservations || []).forEach(r => {
        if (r.status === 'Active') res += Number(r.quantity) || 0;
      });
      map[pName].reservedPcs += res;
      map[pName].availablePcs += Math.max(0, itemTotal - res);
    });

    return Object.values(map).sort((a, b) => b.totalPcs - a.totalPcs);
  }, [stocks]);

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
            {/* Clothing Dropdown */}
            <div className="inv-filter-select-wrapper" title="Select garment type to view its inventory">
              <Shirt size={14} className="inv-filter-icon" />
              <select
                className="inv-filter-select"
                value={selectedProduct}
                onChange={(e) => {
                  setSelectedProduct(e.target.value);
                  setSelectedColour('all');
                  setSelectedSize('all');
                }}
                aria-label="Filter by cloth"
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

            {/* Color Dropdown */}
            <div className="inv-filter-select-wrapper" title="Filter by color">
              <span
                className="inv-color-dot-indicator"
                style={{
                  backgroundColor: selectedColour === 'all' ? '#94a3b8' : getColorHex(selectedColour)
                }}
              />
              <select
                className="inv-filter-select"
                value={selectedColour}
                onChange={(e) => setSelectedColour(e.target.value)}
                aria-label="Filter by color"
              >
                <option value="all">All Colors {colourOptions.length > 0 ? `(${colourOptions.length})` : ''}</option>
                {colourOptions.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="inv-select-chevron" />
            </div>

            {/* Size Dropdown */}
            <div className="inv-filter-select-wrapper" title="Filter by size">
              <span className="inv-filter-tag-lbl">Size</span>
              <select
                className="inv-filter-select size-select"
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                aria-label="Filter by size"
              >
                <option value="all">All Sizes</option>
                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="inv-select-chevron" />
            </div>

            {/* Reset Filters button */}
            {isFiltered && (
              <button
                type="button"
                className="inv-filter-reset-btn"
                onClick={() => {
                  setSelectedProduct('all');
                  setSelectedColour('all');
                  setSelectedSize('all');
                }}
                title="Reset to All Garments"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}

            {/* Total Count Badge */}
            <span
              className="inv-card-badge indigo clickable-badge"
              onClick={() => handleCategoryClick('total')}
              title="Click to view total warehouse inventory table"
              style={{ cursor: 'pointer' }}
            >
              {allocationData.totalStock.toLocaleString('en-IN')} pcs {selectedProduct !== 'all' ? selectedProduct : 'Total'}
            </span>
          </div>
        </div>

        <div className="allocation-spacious-body">
          {/* LEFT SECTION: Interactive Donut & Legend */}
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

                {/* Slices with flat ends (butt) and subtle gap between segments */}
                {(allocationData.donutSlices || []).map(slice => {
                  const isHovered = hoveredDonut === slice.key;
                  const gap = (allocationData.donutSlices || []).length > 1 ? 2.5 : 0;
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

              {/* Clean Center Label: "Total" on top, large bold number below */}
              <div
                className="donut-center-label clickable-center"
                onClick={() => handleCategoryClick(hoveredDonut || 'total')}
                title={`Click to view ${hoveredDonut ? (hoveredDonut === 'available' ? 'Available' : hoveredDonut === 'reserved' ? 'Reserved' : hoveredDonut === 'overdue' ? 'Overdue' : 'Low Stock') : 'complete'} stock table`}
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
                          : selectedProduct !== 'all' ? selectedProduct : 'Total'}
                </span>
                <span className="donut-center-value">
                  {hoveredDonut === 'available'
                    ? allocationData.availableStock.toLocaleString('en-IN')
                    : hoveredDonut === 'reserved'
                      ? allocationData.activeReserved.toLocaleString('en-IN')
                      : hoveredDonut === 'overdue'
                        ? allocationData.overduePcs.toLocaleString('en-IN')
                        : hoveredDonut === 'low_stock'
                          ? allocationData.lowStockCount.toLocaleString('en-IN')
                          : allocationData.totalStock.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Clean Legend with aligned columns */}
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
                  <span className="donut-legend-qty">{allocationData.availableStock.toLocaleString('en-IN')} pcs</span>
                  <span className="donut-legend-pct">({allocationData.availablePct}%)</span>
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
                  <span className="donut-legend-qty">{allocationData.activeReserved.toLocaleString('en-IN')} pcs</span>
                  <span className="donut-legend-pct">({allocationData.reservedPct}%)</span>
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
                  {allocationData.overdueCount > 0 && (
                    <span className="donut-legend-tag">{allocationData.overdueCount} orders</span>
                  )}
                </div>
                <div className="donut-legend-right">
                  <span className="donut-legend-qty">{allocationData.overduePcs.toLocaleString('en-IN')} pcs</span>
                  <span className="donut-legend-pct">({allocationData.overduePct > 0 ? `${allocationData.overduePct}%` : '<1%'})</span>
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
                  <span className="donut-legend-qty">{allocationData.lowStockCount.toLocaleString('en-IN')} items</span>
                  <span className="donut-legend-pct">
                    ({(stocks.length > 0 ? Math.round((allocationData.lowStockCount / stocks.length) * 100) : 0)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION: MAKING USE OF WHITE SPACE (Garment Types, Colors & Sizes Matrix) */}
          <div className="allocation-variants-panel">
            <div className="variants-panel-header">
              <div className="variants-header-left">
                <span className="variants-title">
                  {selectedProduct !== 'all' ? (
                    <>
                      <strong>{selectedProduct}</strong> Types, Colors &amp; Sizes
                    </>
                  ) : (
                    'Garment Inventory Breakdown'
                  )}
                </span>
                <span className="variants-count-chip">
                  {selectedProduct !== 'all' ? `${matchingVariants.length} types` : `${garmentSummaries.length} garments`}
                </span>
              </div>
              <span className="variants-header-hint">
                {selectedProduct !== 'all'
                  ? `${allocationData.availableStock} free • ${allocationData.activeReserved} reserved`
                  : 'Click a garment to inspect'}
              </span>
            </div>

            <div className="variants-panel-list custom-scrollbar">
              {selectedProduct !== 'all' ? (
                // SPECIFIC GARMENT SELECTED (e.g. Hoodie)
                matchingVariants.length === 0 ? (
                  <div className="variants-empty-state">
                    No matching {selectedProduct} items found for the selected filter.
                  </div>
                ) : (
                  matchingVariants.map(v => (
                    <div key={v.id} className="variant-row-card">
                      <div className="variant-card-top">
                        <div className="variant-color-info">
                          <span
                            className="variant-color-dot"
                            style={{ backgroundColor: getColorHex(v.colour) }}
                            title={`Color: ${v.colour}`}
                          />
                          <span className="variant-name">{v.colour}</span>
                          {v.cut && <span className="variant-cut-badge">{v.cut}</span>}
                        </div>
                        <div className="variant-stock-summary">
                          <span className="variant-total-num"><strong>{v.totalPcs}</strong> pcs</span>
                          <span className="variant-avail-num">({v.availablePcs} free)</span>
                        </div>
                      </div>

                      {/* Sizes Matrix: XS to XXL */}
                      <div className="variant-sizes-matrix">
                        {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(sz => {
                          const qty = v.sizes[sz] || 0;
                          const isSelectedSize = selectedSize === sz;
                          const isLow = qty > 0 && qty <= 3;
                          const isZero = qty === 0;

                          return (
                            <button
                              key={sz}
                              type="button"
                              className={`variant-size-pill ${isSelectedSize ? 'active' : ''} ${isZero ? 'zero' : isLow ? 'low' : 'good'}`}
                              onClick={() => setSelectedSize(selectedSize === sz ? 'all' : sz)}
                              title={`Size ${sz}: ${qty} pcs (${isSelectedSize ? 'Click to deselect' : 'Click to filter size'})`}
                            >
                              <span className="size-label">{sz}</span>
                              <span className="size-qty">{qty}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )
              ) : (
                // "ALL GARMENTS" SELECTED: Overview cards for all clothing items
                garmentSummaries.map(g => (
                  <div
                    key={g.product}
                    className="garment-summary-card"
                    onClick={() => {
                      setSelectedProduct(g.product);
                      setSelectedColour('all');
                      setSelectedSize('all');
                    }}
                    title={`Click to filter chart to ${g.product}`}
                  >
                    <div className="garment-card-header">
                      <div className="garment-title-wrap">
                        <Shirt size={13} className="garment-icon" />
                        <span className="garment-name">{g.product}</span>
                        <span className="garment-variants-badge">
                          {g.colours.size} {g.colours.size === 1 ? 'color' : 'colors'}
                        </span>
                      </div>
                      <div className="garment-card-qty">
                        <span className="garment-pcs">{g.totalPcs.toLocaleString('en-IN')} pcs</span>
                        <span className="garment-drilldown-hint">View &rarr;</span>
                      </div>
                    </div>

                    {/* Color Swatch Dots */}
                    <div className="garment-colors-strip">
                      {Array.from(g.colours).slice(0, 7).map(col => (
                        <span
                          key={col}
                          className="garment-color-dot"
                          style={{ backgroundColor: getColorHex(col) }}
                          title={col}
                        />
                      ))}
                      {g.colours.size > 7 && (
                        <span className="garment-more-colors">+{g.colours.size - 7}</span>
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
