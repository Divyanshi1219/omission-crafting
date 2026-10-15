import { useState, useMemo } from "react";
import {
  Package,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  DollarSign,
  TrendingUp,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  Trash2,
  X,
  SlidersHorizontal,
  Copy,
  Check,
  Boxes,
  Truck,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import "./InventoryManagement.css";

const INITIAL_INVENTORY = [
  {
    id: 1,
    sku: "TS-BLK-240-L",
    name: "Heavyweight 240GSM Oversized Tee",
    spec: "Vintage Washed Black • Size L",
    category: "Raw Apparel",
    currentStock: 1420,
    minThreshold: 300,
    unitCost: 7.20,
    retailPrice: 24.00,
    location: "Bay A • Shelf 02",
    supplier: "Continental Cotton Mills",
    lastRestocked: "2026-10-12",
    unitType: "pcs",
  },
  {
    id: 2,
    sku: "TS-WHT-240-M",
    name: "Heavyweight 240GSM Oversized Tee",
    spec: "Pristine White • Size M",
    category: "Raw Apparel",
    currentStock: 840,
    minThreshold: 250,
    unitCost: 6.90,
    retailPrice: 24.00,
    location: "Bay A • Shelf 03",
    supplier: "Continental Cotton Mills",
    lastRestocked: "2026-10-08",
    unitType: "pcs",
  },
  {
    id: 3,
    sku: "HD-GRY-450-XL",
    name: "Premium 450GSM French Terry Hoodie",
    spec: "Heather Grey • Size XL",
    category: "Raw Apparel",
    currentStock: 68,
    minThreshold: 120,
    unitCost: 19.50,
    retailPrice: 58.00,
    location: "Bay B • Rack 01",
    supplier: "Nordic Garments Ltd",
    lastRestocked: "2026-09-28",
    unitType: "pcs",
  },
  {
    id: 4,
    sku: "HD-BLK-450-L",
    name: "Premium 450GSM French Terry Hoodie",
    spec: "Pitch Black • Size L",
    category: "Raw Apparel",
    currentStock: 210,
    minThreshold: 150,
    unitCost: 19.50,
    retailPrice: 58.00,
    location: "Bay B • Rack 02",
    supplier: "Nordic Garments Ltd",
    lastRestocked: "2026-10-02",
    unitType: "pcs",
  },
  {
    id: 5,
    sku: "DTF-FLM-60100",
    name: "Dual-Matte DTF Transfer Film Roll",
    spec: "60cm x 100m • Hot/Cold Peel Roll",
    category: "Print Consumables",
    currentStock: 22,
    minThreshold: 10,
    unitCost: 118.00,
    retailPrice: 175.00,
    location: "Zone C • Cold Room 01",
    supplier: "Apex Color Tech",
    lastRestocked: "2026-10-10",
    unitType: "rolls",
  },
  {
    id: 6,
    sku: "DTF-INK-WHT",
    name: "Ultra-Opaque DTF Textile White Ink",
    spec: "1,000ml Bottle • Nano Pigment Formula",
    category: "Print Consumables",
    currentStock: 5,
    minThreshold: 15,
    unitCost: 48.00,
    retailPrice: 72.00,
    location: "Zone C • Shelf 04",
    supplier: "Apex Color Tech",
    lastRestocked: "2026-10-01",
    unitType: "bottles",
  },
  {
    id: 7,
    sku: "DTF-INK-CYN",
    name: "Vibrant Cyan Textile Pigment Ink",
    spec: "1,000ml Bottle • Wide Color Gamut",
    category: "Print Consumables",
    currentStock: 28,
    minThreshold: 10,
    unitCost: 42.00,
    retailPrice: 65.00,
    location: "Zone C • Shelf 04",
    supplier: "Apex Color Tech",
    lastRestocked: "2026-10-05",
    unitType: "bottles",
  },
  {
    id: 8,
    sku: "DTF-POW-MED",
    name: "TPU Hot Melt Adhesive Transfer Powder",
    spec: "5kg Sealed Bag • Medium Grain (80-200µm)",
    category: "Print Consumables",
    currentStock: 14,
    minThreshold: 8,
    unitCost: 65.00,
    retailPrice: 95.00,
    location: "Zone C • Shelf 06",
    supplier: "Apex Color Tech",
    lastRestocked: "2026-10-07",
    unitType: "bags",
  },
  {
    id: 9,
    sku: "BOX-KRF-1210",
    name: "Reinforced Kraft Corrugated Mailer Box",
    spec: '12" x 10" x 4" • Double Wall E-Flute',
    category: "Packaging",
    currentStock: 2450,
    minThreshold: 600,
    unitCost: 1.15,
    retailPrice: 2.50,
    location: "Bay D • Pallet 01",
    supplier: "EcoPack Solutions",
    lastRestocked: "2026-10-11",
    unitType: "boxes",
  },
  {
    id: 10,
    sku: "MAIL-MBLK-1013",
    name: "Biodegradable Matte Poly Mailers",
    spec: '10" x 13" • Waterproof Tear-Resistant',
    category: "Packaging",
    currentStock: 0,
    minThreshold: 500,
    unitCost: 0.42,
    retailPrice: 0.95,
    location: "Bay D • Pallet 03",
    supplier: "EcoPack Solutions",
    lastRestocked: "2026-09-15",
    unitType: "mailers",
  },
  {
    id: 11,
    sku: "TAG-WVN-DMK",
    name: "Custom High-Density Damask Woven Tags",
    spec: "Roll of 1,000 Woven Neck Labels",
    category: "Packaging",
    currentStock: 0,
    minThreshold: 5,
    unitCost: 64.00,
    retailPrice: 95.00,
    location: "Zone C • Bin 02",
    supplier: "LabelCraft Pro",
    lastRestocked: "2026-08-30",
    unitType: "rolls",
  },
  {
    id: 12,
    sku: "CAP-TWL-NVY",
    name: "6-Panel Unstructured Cotton Twill Cap",
    spec: "Navy Blue • Brass Buckle Closure",
    category: "Accessories",
    currentStock: 340,
    minThreshold: 100,
    unitCost: 5.40,
    retailPrice: 18.00,
    location: "Bay B • Shelf 05",
    supplier: "Headwear Craft Co",
    lastRestocked: "2026-10-04",
    unitType: "pcs",
  },
  {
    id: 13,
    sku: "TOT-CNV-NAT",
    name: "12oz Organic Heavy Cotton Canvas Tote",
    spec: "Natural Ecru • Reinforced Webbing Handles",
    category: "Accessories",
    currentStock: 38,
    minThreshold: 150,
    unitCost: 3.85,
    retailPrice: 14.50,
    location: "Bay B • Shelf 07",
    supplier: "Global Canvas Works",
    lastRestocked: "2026-09-22",
    unitType: "pcs",
  },
  {
    id: 14,
    sku: "POLO-PIQ-BLK",
    name: "Classic Pique Knit Short-Sleeve Polo",
    spec: "Obsidian Black • Size L • Ribbed Collar",
    category: "Raw Apparel",
    currentStock: 460,
    minThreshold: 120,
    unitCost: 9.80,
    retailPrice: 32.00,
    location: "Bay A • Shelf 08",
    supplier: "Continental Cotton Mills",
    lastRestocked: "2026-10-06",
    unitType: "pcs",
  }
];

const CATEGORIES = ["All", "Raw Apparel", "Print Consumables", "Packaging", "Accessories"];

export default function InventoryManagement() {
  const [items, setItems] = useState(INITIAL_INVENTORY);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "in-stock" | "low-stock" | "out-of-stock"
  const [sortField, setSortField] = useState("stockValue"); // "name" | "sku" | "stock" | "stockValue" | "unitCost"
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected item modal / drawer
  const [detailItem, setDetailItem] = useState(null);
  // Quick Adjust modal
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState("add"); // "add" | "set"
  // Add product modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    sku: "",
    name: "",
    spec: "",
    category: "Raw Apparel",
    currentStock: "",
    minThreshold: "",
    unitCost: "",
    retailPrice: "",
    location: "Bay A • Shelf 01",
    supplier: "",
    unitType: "pcs",
  });
  // Copied SKU feedback
  const [copiedSku, setCopiedSku] = useState(null);

  // Status helper
  const getStatus = (item) => {
    if (item.currentStock <= 0) return { key: "out-of-stock", label: "Out of Stock", class: "status-out" };
    if (item.currentStock <= item.minThreshold) return { key: "low-stock", label: "Low Stock", class: "status-low" };
    return { key: "in-stock", label: "In Stock", class: "status-ok" };
  };

  // KPI Calculations
  const stats = useMemo(() => {
    let totalSKUs = items.length;
    let totalUnits = 0;
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    items.forEach((item) => {
      totalUnits += item.currentStock;
      totalValuation += item.currentStock * item.unitCost;
      if (item.currentStock <= 0) {
        outOfStockCount++;
      } else if (item.currentStock <= item.minThreshold) {
        lowStockCount++;
      }
    });

    return {
      totalSKUs,
      totalUnits,
      totalValuation,
      lowStockCount,
      outOfStockCount,
      healthyCount: totalSKUs - lowStockCount - outOfStockCount,
    };
  }, [items]);

  // Filtering & Sorting
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Search
        const query = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query) ||
          item.supplier.toLowerCase().includes(query);

        // Category
        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;

        // Status
        const st = getStatus(item);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "in-stock" && st.key === "in-stock") ||
          (statusFilter === "low-stock" && st.key === "low-stock") ||
          (statusFilter === "out-of-stock" && st.key === "out-of-stock");

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        let valA, valB;
        if (sortField === "name") {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        } else if (sortField === "sku") {
          valA = a.sku.toLowerCase();
          valB = b.sku.toLowerCase();
        } else if (sortField === "stock") {
          valA = a.currentStock;
          valB = b.currentStock;
        } else if (sortField === "unitCost") {
          valA = a.unitCost;
          valB = b.unitCost;
        } else {
          // stockValue
          valA = a.currentStock * a.unitCost;
          valB = b.currentStock * b.unitCost;
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [items, searchTerm, selectedCategory, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedSku(text);
    setTimeout(() => setCopiedSku(null), 1800);
  };

  // Stock Adjust handler
  const handleStockAdjust = (e) => {
    e.preventDefault();
    if (!adjustItem) return;
    const num = parseInt(adjustAmount, 10);
    if (isNaN(num)) return;

    setItems((prev) =>
      prev.map((it) => {
        if (it.id === adjustItem.id) {
          const newStock = adjustType === "add" ? Math.max(0, it.currentStock + num) : Math.max(0, num);
          return {
            ...it,
            currentStock: newStock,
            lastRestocked: new Date().toISOString().split("T")[0],
          };
        }
        return it;
      })
    );
    setAdjustItem(null);
    setAdjustAmount("");
  };

  // Add Item handler
  const handleAddNewItem = (e) => {
    e.preventDefault();
    if (!newItemForm.name || !newItemForm.sku) return;

    const newItem = {
      id: Date.now(),
      sku: newItemForm.sku.toUpperCase().trim(),
      name: newItemForm.name.trim(),
      spec: newItemForm.spec.trim() || "Standard Specification",
      category: newItemForm.category,
      currentStock: parseInt(newItemForm.currentStock, 10) || 0,
      minThreshold: parseInt(newItemForm.minThreshold, 10) || 50,
      unitCost: parseFloat(newItemForm.unitCost) || 0.0,
      retailPrice: parseFloat(newItemForm.retailPrice) || 0.0,
      location: newItemForm.location.trim() || "Bay A • Shelf 01",
      supplier: newItemForm.supplier.trim() || "Internal Facility",
      lastRestocked: new Date().toISOString().split("T")[0],
      unitType: newItemForm.unitType || "pcs",
    };

    setItems((prev) => [newItem, ...prev]);
    setShowAddModal(false);
    setNewItemForm({
      sku: "",
      name: "",
      spec: "",
      category: "Raw Apparel",
      currentStock: "",
      minThreshold: "",
      unitCost: "",
      retailPrice: "",
      location: "Bay A • Shelf 01",
      supplier: "",
      unitType: "pcs",
    });
  };

  const exportCSV = () => {
    const headers = ["SKU", "Item Name", "Specification", "Category", "Current Stock", "Min Threshold", "Unit Cost", "Total Value", "Location", "Supplier", "Last Restocked"];
    const rows = filteredItems.map((i) => [
      i.sku,
      `"${i.name}"`,
      `"${i.spec}"`,
      i.category,
      i.currentStock,
      i.minThreshold,
      i.unitCost.toFixed(2),
      (i.currentStock * i.unitCost).toFixed(2),
      `"${i.location}"`,
      `"${i.supplier}"`,
      i.lastRestocked,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryClass = (cat) => {
    switch (cat) {
      case "Raw Apparel":
        return "badge-apparel";
      case "Print Consumables":
        return "badge-consumables";
      case "Packaging":
        return "badge-packaging";
      case "Accessories":
        return "badge-accessories";
      default:
        return "badge-default";
    }
  };

  return (
    <div className="inventory-dashboard-root">
      {/* Top Inventory Metrics Bar */}
      <div className="inv-metrics-grid">
        <div className="inv-metric-card primary">
          <div className="inv-mc-icon blue">
            <Boxes size={22} />
          </div>
          <div className="inv-mc-info">
            <span className="inv-mc-label">Total Inventory SKUs</span>
            <div className="inv-mc-val-row">
              <span className="inv-mc-value">{stats.totalSKUs}</span>
              <span className="inv-mc-sub">{stats.totalUnits.toLocaleString()} total units</span>
            </div>
          </div>
        </div>

        <div className="inv-metric-card">
          <div className="inv-mc-icon emerald">
            <DollarSign size={22} />
          </div>
          <div className="inv-mc-info">
            <span className="inv-mc-label">Total Stock Valuation</span>
            <div className="inv-mc-val-row">
              <span className="inv-mc-value">
                ${stats.totalValuation.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="inv-mc-pill positive">
                <TrendingUp size={12} /> Asset Value
              </span>
            </div>
          </div>
        </div>

        <div className="inv-metric-card">
          <div className="inv-mc-icon amber">
            <AlertTriangle size={22} />
          </div>
          <div className="inv-mc-info">
            <span className="inv-mc-label">Low Stock Warnings</span>
            <div className="inv-mc-val-row">
              <span className="inv-mc-value text-amber">{stats.lowStockCount}</span>
              <span className="inv-mc-sub">Below min threshold</span>
            </div>
          </div>
        </div>

        <div className="inv-metric-card">
          <div className="inv-mc-icon rose">
            <XCircle size={22} />
          </div>
          <div className="inv-mc-info">
            <span className="inv-mc-label">Out of Stock Items</span>
            <div className="inv-mc-val-row">
              <span className="inv-mc-value text-rose">{stats.outOfStockCount}</span>
              <span className="inv-mc-sub">Immediate reorder</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main List View Card */}
      <div className="inv-table-wrapper">
        {/* Controls Toolbar */}
        <div className="inv-toolbar">
          <div className="inv-toolbar-left">
            {/* Search Box */}
            <div className="inv-search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search SKU, item name, location, supplier..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <button className="clear-search-btn" onClick={() => setSearchTerm("")}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="inv-cat-pills">
              {CATEGORIES.map((cat) => {
                const count =
                  cat === "All" ? items.length : items.filter((i) => i.category === cat).length;
                return (
                  <button
                    key={cat}
                    className={`cat-pill ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCurrentPage(1);
                    }}
                  >
                    <span>{cat}</span>
                    <span className="pill-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="inv-toolbar-right">
            {/* Stock Status Filter */}
            <div className="inv-filter-dropdown">
              <Filter size={15} />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="in-stock">In Stock ({stats.healthyCount})</option>
                <option value="low-stock">Low Stock ({stats.lowStockCount})</option>
                <option value="out-of-stock">Out of Stock ({stats.outOfStockCount})</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="inv-filter-dropdown sort">
              <SlidersHorizontal size={15} />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
              >
                <option value="stockValue">Sort: Stock Value</option>
                <option value="stock">Sort: Stock Quantity</option>
                <option value="name">Sort: Product Name</option>
                <option value="sku">Sort: SKU Code</option>
                <option value="unitCost">Sort: Unit Cost</option>
              </select>
              <button
                className="sort-direction-btn"
                title={`Sort ${sortDirection === "asc" ? "Ascending" : "Descending"}`}
                onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
              >
                {sortDirection === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              </button>
            </div>

            {/* Export CSV */}
            <button className="inv-btn-secondary" onClick={exportCSV} title="Export filtered list to CSV">
              <Download size={15} />
              <span>Export</span>
            </button>

            {/* Add New Product Button */}
            <button className="inv-btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* List View Table */}
        <div className="inv-table-responsive">
          <table className="inv-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("sku")} className="sortable-th">
                  <div className="th-content">
                    <span>SKU & Product</span>
                    <ArrowUpDown size={13} />
                  </div>
                </th>
                <th>Category</th>
                <th onClick={() => handleSort("stock")} className="sortable-th">
                  <div className="th-content">
                    <span>Stock Level</span>
                    <ArrowUpDown size={13} />
                  </div>
                </th>
                <th>Status</th>
                <th onClick={() => handleSort("unitCost")} className="sortable-th">
                  <div className="th-content">
                    <span>Unit Cost</span>
                    <ArrowUpDown size={13} />
                  </div>
                </th>
                <th onClick={() => handleSort("stockValue")} className="sortable-th">
                  <div className="th-content">
                    <span>Stock Value</span>
                    <ArrowUpDown size={13} />
                  </div>
                </th>
                <th>Warehouse Location</th>
                <th>Last Restocked</th>
                <th className="th-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="9" className="inv-empty-state">
                    <div className="empty-content">
                      <div className="empty-icon-wrap">
                        <Package size={36} />
                      </div>
                      <h3>No Inventory Items Found</h3>
                      <p>Try modifying your search query or reset the filters to view all products.</p>
                      <button
                        className="inv-btn-secondary"
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedCategory("All");
                          setStatusFilter("all");
                        }}
                      >
                        <RefreshCw size={14} /> Reset Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const status = getStatus(item);
                  const stockRatio = item.minThreshold > 0 ? (item.currentStock / (item.minThreshold * 2.5)) * 100 : 100;
                  const progressPct = Math.min(100, Math.max(item.currentStock > 0 ? 8 : 0, stockRatio));
                  const isLow = status.key === "low-stock";
                  const isOut = status.key === "out-of-stock";

                  return (
                    <tr key={item.id} className="inv-table-row">
                      {/* Product & SKU */}
                      <td>
                        <div className="inv-item-cell">
                          <div className={`inv-item-avatar ${getCategoryClass(item.category)}`}>
                            <Package size={18} />
                          </div>
                          <div className="inv-item-meta">
                            <div className="inv-item-name-row">
                              <span
                                className="inv-item-name"
                                onClick={() => setDetailItem(item)}
                                title="Click to view full specs"
                              >
                                {item.name}
                              </span>
                            </div>
                            <span className="inv-item-spec">{item.spec}</span>
                            <div className="inv-sku-row">
                              <code className="inv-sku-badge">{item.sku}</code>
                              <button
                                className="inv-copy-btn"
                                title="Copy SKU"
                                onClick={() => copyToClipboard(item.sku)}
                              >
                                {copiedSku === item.sku ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span className={`inv-cat-tag ${getCategoryClass(item.category)}`}>
                          {item.category}
                        </span>
                      </td>

                      {/* Stock Level & Visual Gauge */}
                      <td>
                        <div className="inv-stock-cell">
                          <div className="inv-stock-numbers">
                            <span className={`stock-current ${isOut ? "text-rose" : isLow ? "text-amber" : ""}`}>
                              {item.currentStock.toLocaleString()}
                            </span>
                            <span className="stock-threshold">/ {item.minThreshold} min</span>
                            <span className="stock-unit-label">{item.unitType}</span>
                          </div>
                          <div className="inv-stock-track">
                            <div
                              className={`inv-stock-fill ${isOut ? "fill-rose" : isLow ? "fill-amber" : "fill-green"}`}
                              style={{ width: `${progressPct}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td>
                        <span className={`inv-status-pill ${status.class}`}>
                          <span className="status-dot"></span>
                          {status.label}
                        </span>
                      </td>

                      {/* Unit Cost */}
                      <td>
                        <div className="inv-cost-cell">
                          <span className="inv-cost-val">${item.unitCost.toFixed(2)}</span>
                          <span className="inv-retail-val">Retail: ${item.retailPrice.toFixed(2)}</span>
                        </div>
                      </td>

                      {/* Total Value */}
                      <td>
                        <span className="inv-val-strong">
                          ${(item.currentStock * item.unitCost).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Warehouse Location */}
                      <td>
                        <div className="inv-location-cell">
                          <MapPin size={13} className="loc-pin" />
                          <span>{item.location}</span>
                        </div>
                      </td>

                      {/* Last Restocked */}
                      <td>
                        <span className="inv-date-text">{item.lastRestocked}</span>
                      </td>

                      {/* Actions */}
                      <td className="td-actions">
                        <div className="inv-actions-group">
                          <button
                            className="inv-action-btn adjust"
                            title="Quick Stock Adjust"
                            onClick={() => {
                              setAdjustItem(item);
                              setAdjustAmount("");
                              setAdjustType("add");
                            }}
                          >
                            <SlidersHorizontal size={14} />
                            <span>Adjust</span>
                          </button>
                          <button
                            className="inv-action-btn view"
                            title="View Full Item Details"
                            onClick={() => setDetailItem(item)}
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer */}
        <div className="inv-footer">
          <div className="inv-footer-summary">
            Showing <strong>{filteredItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
            <strong>{Math.min(currentPage * itemsPerPage, filteredItems.length)}</strong> of{" "}
            <strong>{filteredItems.length}</strong> items
          </div>

          <div className="inv-pagination-controls">
            <button
              className="inv-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <div className="inv-page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`inv-page-num ${currentPage === page ? "active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              className="inv-page-btn"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stock Adjust Modal */}
      {adjustItem && (
        <div className="inv-modal-overlay" onClick={() => setAdjustItem(null)}>
          <div className="inv-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-header">
              <div>
                <h3 className="inv-modal-title">Adjust Inventory Stock</h3>
                <p className="inv-modal-subtitle">
                  {adjustItem.name} ({adjustItem.sku})
                </p>
              </div>
              <button className="inv-close-btn" onClick={() => setAdjustItem(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStockAdjust}>
              <div className="inv-modal-body">
                <div className="inv-current-stock-box">
                  <div>
                    <span className="cs-label">Current On-Hand:</span>
                    <strong className="cs-val">
                      {adjustItem.currentStock} {adjustItem.unitType}
                    </strong>
                  </div>
                  <div>
                    <span className="cs-label">Min Threshold:</span>
                    <strong className="cs-val">{adjustItem.minThreshold} {adjustItem.unitType}</strong>
                  </div>
                </div>

                <div className="inv-form-group">
                  <label>Adjustment Type</label>
                  <div className="inv-radio-group">
                    <label className={`radio-pill ${adjustType === "add" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="adjustType"
                        value="add"
                        checked={adjustType === "add"}
                        onChange={() => setAdjustType("add")}
                      />
                      <span>Add Stock (Restock Influx)</span>
                    </label>
                    <label className={`radio-pill ${adjustType === "set" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="adjustType"
                        value="set"
                        checked={adjustType === "set"}
                        onChange={() => setAdjustType("set")}
                      />
                      <span>Set Exact Count (Audit Correction)</span>
                    </label>
                  </div>
                </div>

                <div className="inv-form-group">
                  <label>
                    {adjustType === "add" ? "Units to Add (+)" : "New Total Stock Count"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter quantity..."
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="inv-modal-footer">
                <button type="button" className="inv-btn-secondary" onClick={() => setAdjustItem(null)}>
                  Cancel
                </button>
                <button type="submit" className="inv-btn-primary">
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="inv-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="inv-modal-box large" onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-header">
              <div>
                <h3 className="inv-modal-title">Add New Inventory Product</h3>
                <p className="inv-modal-subtitle">Register a raw apparel garment, consumable, or packaging item</p>
              </div>
              <button className="inv-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewItem}>
              <div className="inv-modal-body grid-2">
                <div className="inv-form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Vintage Heavyweight Crewneck"
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="inv-form-group">
                  <label>SKU Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. CRW-WHT-380-M"
                    value={newItemForm.sku}
                    onChange={(e) => setNewItemForm({ ...newItemForm, sku: e.target.value })}
                    required
                  />
                </div>

                <div className="inv-form-group">
                  <label>Specification / Color & Size</label>
                  <input
                    type="text"
                    placeholder="e.g. Washed Oat • Size M • 380 GSM"
                    value={newItemForm.spec}
                    onChange={(e) => setNewItemForm({ ...newItemForm, spec: e.target.value })}
                  />
                </div>

                <div className="inv-form-group">
                  <label>Category *</label>
                  <select
                    value={newItemForm.category}
                    onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                  >
                    <option value="Raw Apparel">Raw Apparel</option>
                    <option value="Print Consumables">Print Consumables</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>

                <div className="inv-form-group">
                  <label>Initial Stock Count</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newItemForm.currentStock}
                    onChange={(e) => setNewItemForm({ ...newItemForm, currentStock: e.target.value })}
                  />
                </div>

                <div className="inv-form-group">
                  <label>Minimum Reorder Threshold</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="50"
                    value={newItemForm.minThreshold}
                    onChange={(e) => setNewItemForm({ ...newItemForm, minThreshold: e.target.value })}
                  />
                </div>

                <div className="inv-form-group">
                  <label>Unit Cost ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="8.50"
                    value={newItemForm.unitCost}
                    onChange={(e) => setNewItemForm({ ...newItemForm, unitCost: e.target.value })}
                  />
                </div>

                <div className="inv-form-group">
                  <label>Retail Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="26.00"
                    value={newItemForm.retailPrice}
                    onChange={(e) => setNewItemForm({ ...newItemForm, retailPrice: e.target.value })}
                  />
                </div>

                <div className="inv-form-group">
                  <label>Warehouse Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Bay A • Shelf 04"
                    value={newItemForm.location}
                    onChange={(e) => setNewItemForm({ ...newItemForm, location: e.target.value })}
                  />
                </div>

                <div className="inv-form-group">
                  <label>Supplier / Vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. Continental Cotton Mills"
                    value={newItemForm.supplier}
                    onChange={(e) => setNewItemForm({ ...newItemForm, supplier: e.target.value })}
                  />
                </div>
              </div>

              <div className="inv-modal-footer">
                <button type="button" className="inv-btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="inv-btn-primary">
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Detail Drawer / Modal */}
      {detailItem && (
        <div className="inv-modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="inv-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-header">
              <div className="inv-detail-title-block">
                <span className={`inv-cat-tag ${getCategoryClass(detailItem.category)}`}>
                  {detailItem.category}
                </span>
                <h3 className="inv-modal-title" style={{ marginTop: 6 }}>
                  {detailItem.name}
                </h3>
                <span className="inv-item-spec">{detailItem.spec}</span>
              </div>
              <button className="inv-close-btn" onClick={() => setDetailItem(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="inv-modal-body">
              <div className="inv-detail-grid">
                <div className="detail-field">
                  <span className="df-label">SKU Code</span>
                  <div className="df-sku-val">
                    <code>{detailItem.sku}</code>
                    <button
                      className="inv-copy-btn"
                      onClick={() => copyToClipboard(detailItem.sku)}
                    >
                      {copiedSku === detailItem.sku ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <div className="detail-field">
                  <span className="df-label">Stock Status</span>
                  <div>
                    <span className={`inv-status-pill ${getStatus(detailItem).class}`}>
                      <span className="status-dot"></span>
                      {getStatus(detailItem).label}
                    </span>
                  </div>
                </div>

                <div className="detail-field">
                  <span className="df-label">Current In Stock</span>
                  <span className="df-val">
                    {detailItem.currentStock.toLocaleString()} {detailItem.unitType}
                  </span>
                </div>

                <div className="detail-field">
                  <span className="df-label">Safety Threshold</span>
                  <span className="df-val">
                    {detailItem.minThreshold} {detailItem.unitType}
                  </span>
                </div>

                <div className="detail-field">
                  <span className="df-label">Unit Acquisition Cost</span>
                  <span className="df-val">${detailItem.unitCost.toFixed(2)}</span>
                </div>

                <div className="detail-field">
                  <span className="df-label">Total Stock Valuation</span>
                  <span className="df-val text-emerald">
                    ${(detailItem.currentStock * detailItem.unitCost).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="detail-field">
                  <span className="df-label">Warehouse Storage Bin</span>
                  <span className="df-val">{detailItem.location}</span>
                </div>

                <div className="detail-field">
                  <span className="df-label">Primary Vendor</span>
                  <span className="df-val">{detailItem.supplier}</span>
                </div>

                <div className="detail-field">
                  <span className="df-label">Last Influx Date</span>
                  <span className="df-val">{detailItem.lastRestocked}</span>
                </div>
              </div>
            </div>

            <div className="inv-modal-footer">
              <button
                className="inv-btn-secondary"
                onClick={() => {
                  setAdjustItem(detailItem);
                  setDetailItem(null);
                }}
              >
                <SlidersHorizontal size={14} /> Adjust Stock
              </button>
              <button className="inv-btn-primary" onClick={() => setDetailItem(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
