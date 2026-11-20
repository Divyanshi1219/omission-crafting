import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import {
  Layers,
  Warehouse,
  Scissors,
  Printer,
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
    } catch (_) { }
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
        } catch (_) { }
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

  // Stage Metrics calculation
  const stageMetrics = useMemo(() => {
    const calc = (stageKey) => {
      let verificationToStaging = 0;
      let stagingToPrinting = 0;
      let logoCuttingToPrinting = 0;
      let printingToStaging = 0;

      (Array.isArray(leads) ? leads : []).forEach((o) => {
        if (!o) return;
        const isOrder = o.query === "order" || o.orderStage || o.orderId;
        if (!isOrder) return;

        const orderStage = (o.orderStage || "sample").toLowerCase().trim();
        if (orderStage !== stageKey) return;

        const subStage = (o.subStage || "").toLowerCase().trim().replace(/\s+/g, "-");
        const stockTaskStage = (o.stockTaskStage || "").toLowerCase().trim();
        const prodTaskStage = (o.productionTaskStage || "").toLowerCase().trim();
        const isProdReady =
          (prodTaskStage === "completed" || prodTaskStage === "logo_cutting" || o.productionApproval?.status === "Approved") &&
          !o.productionHandoverComplete;

        // 1. Stock: From Verification to Staging Room
        if (
          stockTaskStage === "ready_to_pick" ||
          subStage === "ready-to-pick" ||
          subStage === "ready-to-pickup" ||
          o.stockTaskData?.verificationSubmitted === true
        ) {
          verificationToStaging++;
        }

        // 2. Stock: From Staging Room to Printing
        if (
          stockTaskStage === "staging_room" ||
          subStage === "staging-room" ||
          subStage === "staging-ground" ||
          Boolean(o.sampleStagingGroundData?.stagedRackNumber) ||
          Boolean(o.partialStagingRoomData?.stagedRackNumber)
        ) {
          stagingToPrinting++;
        }

        // 3. From Logo Cutting to Printing
        if (
          isProdReady ||
          prodTaskStage === "logo_cutting" ||
          prodTaskStage === "completed" ||
          o.productionTaskData?.submittedToLogoCutting === true
        ) {
          logoCuttingToPrinting++;
        }

        // 4. From Printing to Staging Room
        if (
          subStage === "ready-to-pick-up" ||
          subStage === "ready-to-pick-printing" ||
          o.printingStageData?.printingStatus === "Complete" ||
          o.samplePrintingStatus === "Complete" ||
          o.partialPrintingStatus === "Complete" ||
          o.completePrintingStatus === "Complete"
        ) {
          printingToStaging++;
        }
      });

      const fromStockTotal = verificationToStaging + stagingToPrinting;
      const total = fromStockTotal + logoCuttingToPrinting + printingToStaging;

      return {
        total,
        fromStockTotal,
        verificationToStaging,
        stagingToPrinting,
        logoCuttingToPrinting,
        printingToStaging,
      };
    };

    return {
      sample: calc("sample"),
      partial: calc("partial"),
      complete: calc("complete"),
    };
  }, [leads]);

  // Section Configurations
  const stageSections = [
    {
      key: "sample",
      heading: "Sample Stage",
      metrics: stageMetrics.sample,
      totalTargetUrl: "/order/sample/ready-to-pick",
      stockVerificationTargetUrl: "/order/sample/ready-to-pick",
      stockStagingTargetUrl: "/order/sample/staging-room",
      logoCuttingTargetUrl: "/order/sample/ready-to-pick-production",
      printingToStagingTargetUrl: "/order/sample/ready-to-pick-up",
    },
    {
      key: "partial",
      heading: "Partial Stage",
      metrics: stageMetrics.partial,
      totalTargetUrl: "/order/partial/ready-to-pick",
      stockVerificationTargetUrl: "/order/partial/ready-to-pick",
      stockStagingTargetUrl: "/order/partial/staging-room",
      logoCuttingTargetUrl: "/order/partial/ready-to-pick-production",
      printingToStagingTargetUrl: "/order/partial/ready-to-pick-up",
    },
    {
      key: "complete",
      heading: "Complete Stage",
      metrics: stageMetrics.complete,
      totalTargetUrl: "/order/complete/ready-to-pick",
      stockVerificationTargetUrl: "/order/complete/ready-to-pick",
      stockStagingTargetUrl: "/order/complete/staging-room",
      logoCuttingTargetUrl: "/order/complete/ready-to-pick-production",
      printingToStagingTargetUrl: "/order/complete/ready-to-pick-up",
    },
  ];

  return (
    <div className="coordinator-dashboard-root">
      {/* Page Header */}
      <div className="coordinator-page-header">
        <h1 className="coordinator-main-title">Coordinator Dashboard</h1>
      </div>

      {/* Stage Sections: Sample, Partial, Complete */}
      {stageSections.map((section) => (
        <section key={section.key} className="coordinator-stage-section">
          {/* Section Heading */}
          <div className="coordinator-stage-header">
            <h2 className="coordinator-stage-title">{section.heading}</h2>
            <span className="coordinator-stage-count">({section.metrics.total} ready)</span>
          </div>

          {/* Section Tiles Grid */}
          <div className="coordinator-tiles-grid">
            {/* Tile 1: Total Pick Ups */}
            <div
              className="coordinator-tile tile-total"
              onClick={() => navigate(section.totalTargetUrl)}
              role="button"
              tabIndex={0}
              title={`${section.heading} - Total Pickups`}
            >
              <div className="coordinator-tile-header">
                <span className="coordinator-tile-label">Total Pick Ups</span>
                <div className="coordinator-tile-icon-box">
                  <Layers size={16} />
                </div>
              </div>
              <div className="coordinator-tile-count">{section.metrics.total}</div>
            </div>

            {/* Tile 2: From Stock (Divided into two sub-tiles) */}
            <div className="coordinator-tile tile-stock tile-compound">
              <div className="coordinator-tile-header" style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div className="coordinator-tile-icon-box">
                    <Warehouse size={16} />
                  </div>
                  <span className="coordinator-tile-label" style={{ fontSize: "14px", fontWeight: 700 }}>
                    From Stock
                  </span>
                </div>
                <span className="coord-subtotal-badge">
                  {section.metrics.fromStockTotal} Total Ready
                </span>
              </div>

              {/* Two sub-tiles */}
              <div className="coord-subtiles-container">
                {/* Sub-tile 1: From Verification to Staging Room */}
                <div
                  className="coord-subtile"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(section.stockVerificationTargetUrl);
                  }}
                  role="button"
                  tabIndex={0}
                  title="From Verification to Staging Room"
                >
                  <div className="coord-subtile-header">
                    <span className="coord-subtile-label">From Verification to Staging Room</span>
                  </div>
                  <div className="coord-subtile-count">{section.metrics.verificationToStaging}</div>
                </div>

                {/* Sub-tile 2: From Staging Room to Printing */}
                <div
                  className="coord-subtile"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(section.stockStagingTargetUrl);
                  }}
                  role="button"
                  tabIndex={0}
                  title="From Staging Room to Printing"
                >
                  <div className="coord-subtile-header">
                    <span className="coord-subtile-label">From Staging Room to Printing</span>
                  </div>
                  <div className="coord-subtile-count">{section.metrics.stagingToPrinting}</div>
                </div>
              </div>
            </div>

            {/* Tile 3: From Logo Cutting to Printing */}
            <div
              className="coordinator-tile tile-production"
              onClick={() => navigate(section.logoCuttingTargetUrl)}
              role="button"
              tabIndex={0}
              title="From Logo Cutting to Printing"
            >
              <div className="coordinator-tile-header">
                <span className="coordinator-tile-label">From Logo Cutting to Printing</span>
                <div className="coordinator-tile-icon-box">
                  <Scissors size={16} />
                </div>
              </div>
              <div className="coordinator-tile-count">{section.metrics.logoCuttingToPrinting}</div>
            </div>

            {/* Tile 4: From Printing to Staging Room */}
            <div
              className="coordinator-tile tile-printing"
              onClick={() => navigate(section.printingToStagingTargetUrl)}
              role="button"
              tabIndex={0}
              title="From Printing to Staging Room"
            >
              <div className="coordinator-tile-header">
                <span className="coordinator-tile-label">From Printing to Staging Room</span>
                <div className="coordinator-tile-icon-box">
                  <Printer size={16} />
                </div>
              </div>
              <div className="coordinator-tile-count">{section.metrics.printingToStaging}</div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
