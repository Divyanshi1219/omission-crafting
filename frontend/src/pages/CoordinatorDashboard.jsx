import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import {
  ArrowRight,
  Calendar,
  Layers,
  Warehouse,
  Flame,
  Printer,
  Package,
  RefreshCw,
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
      setTimeout(() => setLoading(false), 200);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Classify all leads into pickup opportunities grouped by stage
  const { sampleItems, partialItems, completeItems } = useMemo(() => {
    const sample = [];
    const partial = [];
    const complete = [];

    (Array.isArray(leads) ? leads : []).forEach((o) => {
      if (!o) return;
      const orderStage = (o.orderStage || "sample").toLowerCase().trim();
      const subStage = (o.subStage || "").toLowerCase().trim().replace(/\s+/g, "-");
      const stockTaskStage = (o.stockTaskStage || "").toLowerCase().trim();
      const isOrder = o.query === "order" || o.orderStage || o.orderId;
      if (!isOrder) return;

      const isProdReady =
        (o.productionTaskStage === "completed" || o.productionApproval?.status === "Approved") &&
        !o.productionHandoverComplete;

      // 1. SAMPLE STAGE
      if (orderStage === "sample") {
        if (
          subStage === "ready-to-pick" ||
          subStage === "ready-to-pickup" ||
          (stockTaskStage === "ready_to_pick" && !subStage.includes("production"))
        ) {
          sample.push({ id: `${o._id}-sample-stock`, category: "stock" });
        }
        if (isProdReady) {
          sample.push({ id: `${o._id}-sample-production`, category: "production" });
        }
        if (subStage === "ready-to-pick-up") {
          sample.push({ id: `${o._id}-sample-printing`, category: "printing" });
        }
      }

      // 2. PARTIAL STAGE
      if (orderStage === "partial") {
        if (
          subStage === "ready-to-pick" ||
          subStage === "ready-to-pickup" ||
          (stockTaskStage === "ready_to_pick" && !subStage.includes("production"))
        ) {
          partial.push({ id: `${o._id}-partial-stock`, category: "stock" });
        }
        if (isProdReady) {
          partial.push({ id: `${o._id}-partial-production`, category: "production" });
        }
        if (
          subStage === "ready-to-pick-printing" ||
          subStage === "printing" ||
          o.partialPrintingStatus === "Complete" ||
          o.printingStageData?.printingStatus === "Complete"
        ) {
          partial.push({ id: `${o._id}-partial-printing`, category: "printing" });
        }
        if (subStage === "ready-to-pick-up") {
          partial.push({ id: `${o._id}-partial-packaging`, category: "packaging" });
        }
      }

      // 3. COMPLETE STAGE
      if (orderStage === "complete") {
        if (
          subStage === "ready-to-pick" ||
          subStage === "ready-to-pickup" ||
          (stockTaskStage === "ready_to_pick" && !subStage.includes("production"))
        ) {
          complete.push({ id: `${o._id}-complete-stock`, category: "stock" });
        }
        if (isProdReady) {
          complete.push({ id: `${o._id}-complete-production`, category: "production" });
        }
        if (
          subStage === "ready-to-pick-printing" ||
          subStage === "printing" ||
          o.completePrintingStatus === "Complete" ||
          o.printingStageData?.printingStatus === "Complete"
        ) {
          complete.push({ id: `${o._id}-complete-printing`, category: "printing" });
        }
        if (subStage === "ready-to-pick-up") {
          complete.push({ id: `${o._id}-complete-packaging`, category: "packaging" });
        }
      }
    });

    return { sampleItems: sample, partialItems: partial, completeItems: complete };
  }, [leads]);

  // Stage Metrics
  const stageMetrics = useMemo(() => {
    const calc = (items) => {
      let fromStock = 0;
      let fromProduction = 0;
      let fromPrinting = 0;
      let fromPackaging = 0;

      items.forEach((p) => {
        if (p.category === "stock") fromStock++;
        else if (p.category === "production") fromProduction++;
        else if (p.category === "printing") fromPrinting++;
        else if (p.category === "packaging") fromPackaging++;
      });

      return {
        total: items.length,
        fromStock,
        fromProduction,
        fromPrinting,
        fromPackaging,
      };
    };

    return {
      sample: calc(sampleItems),
      partial: calc(partialItems),
      complete: calc(completeItems),
    };
  }, [sampleItems, partialItems, completeItems]);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  // Section Configurations
  const stageSections = [
    {
      key: "sample",
      heading: "Sample Stage",
      totalCount: stageMetrics.sample.total,
      tiles: [
        {
          key: "total",
          label: "Total Pickups",
          icon: <Layers size={16} />,
          count: stageMetrics.sample.total,
          className: "tile-total",
          targetUrl: "/order/sample/ready-to-pick",
        },
        {
          key: "stock",
          label: "From Stock",
          icon: <Warehouse size={16} />,
          count: stageMetrics.sample.fromStock,
          className: "tile-stock",
          targetUrl: "/order/sample/ready-to-pick",
        },
        {
          key: "production",
          label: "From Production",
          icon: <Flame size={16} />,
          count: stageMetrics.sample.fromProduction,
          className: "tile-production",
          targetUrl: "/order/sample/ready-to-pick-production",
        },
        {
          key: "printing",
          label: "From Printing",
          icon: <Printer size={16} />,
          count: stageMetrics.sample.fromPrinting,
          className: "tile-printing",
          targetUrl: "/order/sample/ready-to-pick-up",
        },
      ],
    },
    {
      key: "partial",
      heading: "Partial Stage",
      totalCount: stageMetrics.partial.total,
      tiles: [
        {
          key: "total",
          label: "Total Pickups",
          icon: <Layers size={16} />,
          count: stageMetrics.partial.total,
          className: "tile-total",
          targetUrl: "/order/partial/ready-to-pick",
        },
        {
          key: "stock",
          label: "From Stock",
          icon: <Warehouse size={16} />,
          count: stageMetrics.partial.fromStock,
          className: "tile-stock",
          targetUrl: "/order/partial/ready-to-pick",
        },
        {
          key: "production",
          label: "From Production",
          icon: <Flame size={16} />,
          count: stageMetrics.partial.fromProduction,
          className: "tile-production",
          targetUrl: "/order/partial/ready-to-pick-production",
        },
        {
          key: "printing",
          label: "From Printing",
          icon: <Printer size={16} />,
          count: stageMetrics.partial.fromPrinting,
          className: "tile-printing",
          targetUrl: "/order/partial/ready-to-pick-printing",
        },
        {
          key: "packaging",
          label: "From Packaging",
          icon: <Package size={16} />,
          count: stageMetrics.partial.fromPackaging,
          className: "tile-packaging",
          targetUrl: "/order/partial/ready-to-pick-up",
        },
      ],
    },
    {
      key: "complete",
      heading: "Complete Stage",
      totalCount: stageMetrics.complete.total,
      tiles: [
        {
          key: "total",
          label: "Total Pickups",
          icon: <Layers size={16} />,
          count: stageMetrics.complete.total,
          className: "tile-total",
          targetUrl: "/order/complete/ready-to-pick",
        },
        {
          key: "stock",
          label: "From Stock",
          icon: <Warehouse size={16} />,
          count: stageMetrics.complete.fromStock,
          className: "tile-stock",
          targetUrl: "/order/complete/ready-to-pick",
        },
        {
          key: "production",
          label: "From Production",
          icon: <Flame size={16} />,
          count: stageMetrics.complete.fromProduction,
          className: "tile-production",
          targetUrl: "/order/complete/ready-to-pick-production",
        },
        {
          key: "printing",
          label: "From Printing",
          icon: <Printer size={16} />,
          count: stageMetrics.complete.fromPrinting,
          className: "tile-printing",
          targetUrl: "/order/complete/ready-to-pick-printing",
        },
        {
          key: "packaging",
          label: "From Packaging",
          icon: <Package size={16} />,
          count: stageMetrics.complete.fromPackaging,
          className: "tile-packaging",
          targetUrl: "/order/complete/ready-to-pick-up",
        },
      ],
    },
  ];

  return (
    <div className="coordinator-dashboard-root">
      {/* Page Header - Keep only heading, date and refresh */}
      <div className="coordinator-page-header">
        <h1 className="coordinator-main-title">Coordinator Dashboard</h1>

        <div className="coordinator-header-actions">
          <button
            type="button"
            className="coord-refresh-btn"
            onClick={fetchLeads}
            disabled={loading}
            title="Refresh pickup queues"
          >
            <RefreshCw size={13} className={loading ? "spin-icon" : ""} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>

          <div className="coord-date-pill">
            <Calendar size={13} />
            <span>{todayStr}</span>
          </div>
        </div>
      </div>

      {/* Stage Sections: Sample, Partial, Complete */}
      {stageSections.map((section) => (
        <section key={section.key} className="coordinator-stage-section">
          {/* Section Heading - Clean heading and count */}
          <div className="coordinator-stage-header">
            <h2 className="coordinator-stage-title">{section.heading}</h2>
            <span className="coordinator-stage-count">({section.totalCount} ready)</span>
          </div>

          {/* Section Tiles Grid - Clean full-width cards */}
          <div className={`coordinator-tiles-grid grid-count-${section.tiles.length}`}>
            {section.tiles.map((tile) => (
              <div
                key={tile.key}
                className={`coordinator-tile ${tile.className}`}
                onClick={() => navigate(tile.targetUrl)}
                title={`Open ${tile.label} queue`}
                role="button"
                tabIndex={0}
              >
                <div className="coordinator-tile-header">
                  <span className="coordinator-tile-label">{tile.label}</span>
                  <div className="coordinator-tile-icon-box">{tile.icon}</div>
                </div>

                <div className="coordinator-tile-count">{tile.count}</div>

                <div className="coordinator-tile-footer">
                  <span>Open Queue</span>
                  <ArrowRight size={13} className="footer-arrow" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
