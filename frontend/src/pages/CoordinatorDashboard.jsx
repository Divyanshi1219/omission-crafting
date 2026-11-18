import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import {
  ArrowRight,
  Search,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import "./CoordinatorDashboard.css";

export default function CoordinatorDashboard() {
  const navigate = useNavigate();
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
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'stock', 'printing', 'packaging', 'tasks'

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/leads");
      if (res.data?.data) {
        setLeads(res.data.data);
        try {
          sessionStorage.setItem("omission_cached_leads", JSON.stringify(res.data.data));
        } catch (_) {}
      }
    } catch (err) {
      console.warn("Coordinator fetch leads warning:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Classify all leads into pickup opportunities
  const pickupItems = useMemo(() => {
    const list = [];

    (Array.isArray(leads) ? leads : []).forEach((o) => {
      if (!o) return;
      const orderStage = (o.orderStage || "").toLowerCase();
      const subStage = (o.subStage || "").toLowerCase().replace(/\s+/g, "-");
      const stockTaskStage = (o.stockTaskStage || "").toLowerCase();
      const isOrder = o.query === "order" || o.orderStage || o.orderId;
      if (!isOrder) return;

      const orderNum = o.orderId || (o._id ? `ORD${String(o._id).slice(-5).toUpperCase()}` : "ORD");
      const client = o.clientName || "Client";
      const company = o.companyName || "Direct Order";
      const qty = Number(o.totalQuantity) || (Array.isArray(o.items) ? o.items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0) : 1);
      const itemsList = Array.isArray(o.items) ? o.items : [];
      const itemSummary = itemsList.map((it) => it.item || it.enterItem || it.itemType || "Apparel").filter(Boolean).join(", ") || "Custom Apparel";

      // 1. Pipeline: Sample Post-Stock (Pick from Stock -> Give to Sample Printing)
      if (orderStage === "sample" && (subStage === "ready-to-pick" || subStage === "ready-to-pickup")) {
        list.push({
          id: `${o._id}-sample-stock`,
          leadId: o._id,
          orderId: orderNum,
          category: "stock",
          stageType: "Sample",
          stageKey: "sample",
          subStageKey: "ready-to-pick",
          pickFrom: "Stock Room",
          deliverTo: "Printing Station",
          client,
          company,
          quantity: qty,
          itemSummary,
          targetUrl: `/order/sample/ready-to-pick?id=${o._id}&from=/order/sample/ready-to-pick&stage=sample`,
          updatedAt: o.updatedAt || o.createdAt,
        });
      }

      // 2. Pipeline: Sample Post-Printing (Pick from Printing -> Give to Staging Room)
      if (orderStage === "sample" && subStage === "ready-to-pick-up") {
        list.push({
          id: `${o._id}-sample-printing`,
          leadId: o._id,
          orderId: orderNum,
          category: "printing",
          stageType: "Sample",
          stageKey: "sample",
          subStageKey: "ready-to-pick-up",
          pickFrom: "Printing Dept",
          deliverTo: "Staging Room",
          client,
          company,
          quantity: qty,
          itemSummary,
          targetUrl: `/order/sample/ready-to-pick-up?id=${o._id}&from=/order/sample/ready-to-pick-up&stage=sample`,
          updatedAt: o.updatedAt || o.createdAt,
        });
      }

      // 3. Pipeline: Partial Post-Stock (Pick from Stock -> Give to Bulk Printing)
      if (orderStage === "partial" && (subStage === "ready-to-pick" || subStage === "ready-to-pickup")) {
        list.push({
          id: `${o._id}-partial-stock`,
          leadId: o._id,
          orderId: orderNum,
          category: "stock",
          stageType: "Partial",
          stageKey: "partial",
          subStageKey: "ready-to-pick",
          pickFrom: "Stock Room",
          deliverTo: "Printing Floor",
          client,
          company,
          quantity: qty,
          itemSummary,
          targetUrl: `/order/partial/ready-to-pick?id=${o._id}&from=/order/partial/ready-to-pick&stage=partial`,
          updatedAt: o.updatedAt || o.createdAt,
        });
      }

      // 4. Pipeline: Partial Post-Packaging (Pick from Packaging -> Give to Staging Room)
      if (orderStage === "partial" && subStage === "ready-to-pick-up") {
        list.push({
          id: `${o._id}-partial-packaging`,
          leadId: o._id,
          orderId: orderNum,
          category: "packaging",
          stageType: "Partial",
          stageKey: "partial",
          subStageKey: "ready-to-pick-up",
          pickFrom: "Packaging Line",
          deliverTo: "Staging Room",
          client,
          company,
          quantity: qty,
          itemSummary,
          targetUrl: `/order/partial/ready-to-pick-up?id=${o._id}&from=/order/partial/ready-to-pick-up&stage=partial`,
          updatedAt: o.updatedAt || o.createdAt,
        });
      }

      // 5. Pipeline: Complete Post-Stock (Pick from Stock -> Give to Bulk Printing)
      if (orderStage === "complete" && (subStage === "ready-to-pick" || subStage === "ready-to-pickup")) {
        list.push({
          id: `${o._id}-complete-stock`,
          leadId: o._id,
          orderId: orderNum,
          category: "stock",
          stageType: "Complete",
          stageKey: "complete",
          subStageKey: "ready-to-pick",
          pickFrom: "Stock Room",
          deliverTo: "Printing Floor",
          client,
          company,
          quantity: qty,
          itemSummary,
          targetUrl: `/order/complete/ready-to-pick?id=${o._id}&from=/order/complete/ready-to-pick&stage=complete`,
          updatedAt: o.updatedAt || o.createdAt,
        });
      }

      // 6. Pipeline: Complete Post-Packaging (Pick from Packaging -> Give to Ready to Deliver)
      if (orderStage === "complete" && subStage === "ready-to-pick-up") {
        list.push({
          id: `${o._id}-complete-packaging`,
          leadId: o._id,
          orderId: orderNum,
          category: "packaging",
          stageType: "Complete",
          stageKey: "complete",
          subStageKey: "ready-to-pick-up",
          pickFrom: "Packaging Line",
          deliverTo: "Dispatch Bay",
          client,
          company,
          quantity: qty,
          itemSummary,
          targetUrl: `/order/complete/ready-to-pick-up?id=${o._id}&from=/order/complete/ready-to-pick-up&stage=complete`,
          updatedAt: o.updatedAt || o.createdAt,
        });
      }

      // 7. Stock Room Tasks (ready_to_pick)
      if (stockTaskStage === "ready_to_pick") {
        const isEmb = Boolean(
          o.printingType?.toLowerCase().includes("embroidery") ||
          (Array.isArray(o.items) && o.items.some((it) => (it.printingType || "").toLowerCase().includes("embroidery")))
        );
        list.push({
          id: `${o._id}-stock-task`,
          leadId: o._id,
          orderId: orderNum,
          category: "tasks",
          stageType: isEmb ? "Embroidery Task" : "DTF Task",
          stageKey: "task",
          subStageKey: isEmb ? "embroidery-ready-to-pick" : "ready-to-pick",
          pickFrom: "Stock Room",
          deliverTo: isEmb ? "Embroidery Staging" : "Production Floor",
          client,
          company,
          quantity: qty,
          itemSummary,
          targetUrl: isEmb ? `/tasks/embroidery-ready-to-pick?id=${o._id}` : `/tasks/ready-to-pick?id=${o._id}`,
          updatedAt: o.updatedAt || o.createdAt,
        });
      }
    });

    return list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }, [leads]);

  // Metric counts
  const metrics = useMemo(() => {
    let fromStock = 0;
    let fromPrinting = 0;
    let fromPackaging = 0;
    let taskCount = 0;

    pickupItems.forEach((p) => {
      if (p.category === "stock") fromStock++;
      else if (p.category === "printing") fromPrinting++;
      else if (p.category === "packaging") fromPackaging++;
      else if (p.category === "tasks") taskCount++;
    });

    return {
      total: pickupItems.length,
      fromStock,
      fromPrinting,
      fromPackaging,
      taskCount,
    };
  }, [pickupItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return pickupItems.filter((item) => {
      if (activeTab === "stock" && item.category !== "stock") return false;
      if (activeTab === "printing" && item.category !== "printing") return false;
      if (activeTab === "packaging" && item.category !== "packaging") return false;
      if (activeTab === "tasks" && item.category !== "tasks") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = String(item.orderId || "").toLowerCase().includes(q);
        const matchClient = String(item.client || "").toLowerCase().includes(q);
        const matchCompany = String(item.company || "").toLowerCase().includes(q);
        const matchItems = String(item.itemSummary || "").toLowerCase().includes(q);
        const matchFrom = String(item.pickFrom || "").toLowerCase().includes(q);
        const matchTo = String(item.deliverTo || "").toLowerCase().includes(q);
        if (!matchId && !matchClient && !matchCompany && !matchItems && !matchFrom && !matchTo) {
          return false;
        }
      }

      return true;
    });
  }, [pickupItems, activeTab, searchQuery]);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  return (
    <div className="coordinator-dashboard-root">
      {/* 1. Standard Page Header */}
      <div className="page-header dashboard-header" style={{ marginBottom: "20px" }}>
        <div>
          <h1>Dashboard</h1>
        </div>

        <div className="date-picker">
          <Calendar size={15} />
          <span>{todayStr}</span>
        </div>
      </div>

      {/* 2. Top 4 Metric Tiles */}
      <div className="coordinator-tiles-grid">
        {/* Total Pickups */}
        <div
          className={`coordinator-tile tile-total ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <div className="coordinator-tile-header">
            <span className="coordinator-tile-label">
              <span className="coord-dot amber"></span>
              Total Pickups
            </span>
          </div>
          <div className="coordinator-tile-count">{metrics.total}</div>
          <div className="coordinator-tile-sub">All ready items</div>
        </div>

        {/* From Stock */}
        <div
          className={`coordinator-tile tile-stock ${activeTab === "stock" ? "active" : ""}`}
          onClick={() => setActiveTab("stock")}
        >
          <div className="coordinator-tile-header">
            <span className="coordinator-tile-label">
              <span className="coord-dot blue"></span>
              From Stock
            </span>
          </div>
          <div className="coordinator-tile-count">{metrics.fromStock}</div>
          <div className="coordinator-tile-sub">Ready for printing</div>
        </div>

        {/* From Printing */}
        <div
          className={`coordinator-tile tile-printing ${activeTab === "printing" ? "active" : ""}`}
          onClick={() => setActiveTab("printing")}
        >
          <div className="coordinator-tile-header">
            <span className="coordinator-tile-label">
              <span className="coord-dot purple"></span>
              From Printing
            </span>
          </div>
          <div className="coordinator-tile-count">{metrics.fromPrinting}</div>
          <div className="coordinator-tile-sub">Ready for staging</div>
        </div>

        {/* From Packaging */}
        <div
          className={`coordinator-tile tile-packaging ${activeTab === "packaging" ? "active" : ""}`}
          onClick={() => setActiveTab("packaging")}
        >
          <div className="coordinator-tile-header">
            <span className="coordinator-tile-label">
              <span className="coord-dot green"></span>
              From Packaging
            </span>
          </div>
          <div className="coordinator-tile-count">{metrics.fromPackaging}</div>
          <div className="coordinator-tile-sub">Ready for dispatch</div>
        </div>
      </div>

      {/* 3. Toolbar (Segment Tabs & Search) */}
      <div className="coordinator-toolbar">
        <div className="coordinator-tabs-group">
          {[
            { key: "all", label: "All", count: metrics.total },
            { key: "stock", label: "From Stock", count: metrics.fromStock },
            { key: "printing", label: "From Printing", count: metrics.fromPrinting },
            { key: "packaging", label: "From Packaging", count: metrics.fromPackaging },
            { key: "tasks", label: "Stock Tasks", count: metrics.taskCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`coordinator-tab-btn ${activeTab === tab.key ? "active" : ""}`}
            >
              <span>{tab.label}</span>
              <span className="coordinator-tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="coordinator-search-wrapper">
          <Search size={14} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="coordinator-search-input"
          />
        </div>
      </div>

      {/* 4. Orders Queue */}
      <div className="coordinator-queue-header">
        <h2 className="coordinator-queue-title">
          <span>Pickup Queue</span>
          <span className="coordinator-queue-badge">{filteredItems.length}</span>
        </h2>
      </div>

      {filteredItems.length === 0 ? (
        <div className="coordinator-empty-state">
          <CheckCircle2 size={36} color="#10b981" style={{ margin: "0 auto 10px auto", display: "block" }} />
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>
            No Orders Awaiting Pickup
          </div>
          <div style={{ fontSize: "12.5px" }}>All items have been collected and delivered.</div>
        </div>
      ) : (
        <div className="coordinator-orders-grid">
          {filteredItems.map((item) => (
            <div key={item.id} className="coordinator-order-card">
              <div>
                {/* Top Row: Order ID & Stage */}
                <div className="coordinator-card-top" style={{ marginBottom: "10px" }}>
                  <div className="coordinator-card-id-group">
                    <span className="coordinator-card-id">{item.orderId}</span>
                    <span className={`coordinator-card-stage-pill ${item.stageKey}`}>
                      {item.stageType}
                    </span>
                  </div>
                </div>

                {/* Company & Client */}
                <div>
                  <div className="coordinator-card-company">{item.company}</div>
                  <div className="coordinator-card-client">
                    {item.client} • {item.quantity} pcs
                  </div>
                  <div className="coordinator-card-items" title={item.itemSummary}>
                    {item.itemSummary}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                className="coordinator-card-btn"
                onClick={() => navigate(item.targetUrl)}
              >
                <span>Open Order</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
